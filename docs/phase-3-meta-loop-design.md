# Phase 3 — Between-Shifts Meta-Loop: Design Doc

**Status:** Locked for build, 2026-07-05
**Author:** Design pass building on Phase 2 (`docs/phase-2-shift-loop-design.md`)
**Scope:** Turn an isolated shift into a campaign. Shifts are **recorded**, **reward**
the player, and **escalate**. Phases 0–2 stay as-is; Phase 3 is additive around them.

The overriding constraints from Phases 0–2 hold: game logic is **pure and React-free**
in `src/engine/`, deterministic via the injectable `Rng` (`mulberry32`) and injected
time; no `Date.now`, no timers, no `any`. Tests colocated as `*.test.ts(x)`; all three
gates (`just test`, `just check`, `bun run build`) green after every commit.

---

## 1. The three tracks

1. **Shift results in history** — a `ShiftSummary` is persisted into `useUserProgress`
   when a shift fully settles. A "Shifts" history view mirrors `MissionHistorySection`.
   `shiftSummaries.length` is the **source of truth for the current shift number**.
2. **End-of-shift rewards** — a pure `scoreShift(tally) → ShiftRewards` grades the shift.
   Flawless shifts ("Shift Was Lit") pay the most; rewards scale with success count.
   Med kits / pity charges land in `useUserProgress`; stat points go to one random
   eligible hero's `availablePoints`. Earned rewards are surfaced on `ShiftReview`.
3. **Escalating shift ladder** — a pure `configForShift(shiftNumber) → ShiftConfig` and a
   pure `missionPoolForShift(shiftNumber, missions) → string[]`. Later shifts get more
   calls, tighter timers, more concurrent slots, and a heavier Hard/Extreme mix.

---

## 2. Data model

### New type module — `src/types/shiftSummary.ts`

```ts
/** Counts of each reward a completed shift grants. Pure output of scoreShift. */
export interface ShiftRewards {
  medKits: number;
  pityCharges: number;
  statPoints: number;
}

/** A recorded, fully-settled shift. Persisted into UserProgress. */
export interface ShiftSummary {
  shiftNumber: number;        // 1-based; == prior summaries + 1 at record time
  completedAt: number;        // epoch ms (Date.now() at finalize)
  tally: ShiftTally;          // { succeeded, failed, missed } — the FINAL tally
  seed: number;               // the shift's ShiftConfig.seed (reproducibility)
  rewards: ShiftRewards;      // what scoreShift(tally) paid out
  statPointAgentId?: string;  // hero who received the stat points (undefined if none)
}
```

### `UserProgress` (extended, `src/types/userProgress.ts`)

Add `shiftSummaries: ShiftSummary[]` (INITIAL `[]`). Existing saves merge over defaults,
so the field appears empty on old saves — no migration needed.

### Reducer event (extended, `src/types/shift.ts` + `src/engine/shift.ts`)

Add a `'shift-finalized'` event type. **Why a new event:** `'shift-ended'` fires when the
spawn phase closes, but Decision #6 lets in-flight missions keep settling and mutating the
tally *after* that. Rewards must be computed on the **final** tally, so finalization is a
distinct moment: **phase is `ended` AND `activeMissions` is empty**. `advanceShift` emits
`'shift-finalized'` exactly once, on the tick where that becomes true (covers both "ends
with nothing in flight" and "ends, then the last mission settles later"). The hook stops
ticking once ended+idle, so it can never double-fire.

---

## 3. Pure engine modules

### `src/engine/shiftScore.ts` — Track 2 core (LOCKED formula)

```ts
scoreShift(tally): ShiftRewards
```

Let `s = succeeded`, `f = failed`, `m = missed`, `total = s+f+m`,
`flawless = total > 0 && f === 0 && m === 0`.

```
statPoints  = floor(s / 4) + (flawless ? 1 : 0)
medKits     = floor(s / 6) + (flawless ? 1 : 0)
pityCharges = flawless ? 2 : (f === 0 ? 1 : 0)
```

Rationale: everything scales with **success count**; the flawless bonus makes a clean shift
strictly dominate a merely-successful one. Pity charges reward not *failing* deploys (pity
protects high-prob calls); the flawless case doubles them. Worked examples:

| Shift | s | f | m | statPoints | medKits | pityCharges |
|-------|---|---|---|-----------|---------|-------------|
| Flawless 12 | 12 | 0 | 0 | 3+1=**4** | 2+1=**3** | **2** |
| Typical first (docs) | 9 | 2 | 1 | **2** | **1** | 0 (f>0) |
| Rough | 4 | 3 | 3 | **1** | 0 | 0 |
| Wipe | 0 | 4 | 4 | **0** | 0 | 0 |

`scoreShift` is **pure and deterministic** — no rng.

```ts
pickStatPointRecipient(eligibleAgentIds: string[], rng: Rng): string | null
```

Pure hero-picker (the *only* randomness in reward application). Returns
`ids[floor(rng() * ids.length)]`, or `null` if the list is empty.

### `src/engine/shiftLadder.ts` — Track 3 core (LOCKED curves)

```ts
configForShift(shiftNumber): ShiftConfig       // n is 1-based
```

Clamped-linear escalation off the Phase-2 defaults. `n' = n - 1`:

| Field | Formula | Shift 1 | Shift 5 | Cap (reached ~) |
|-------|---------|---------|---------|-----------------|
| `seed` | `n` | 1 | 5 | — (distinct per shift) |
| `spawnEveryMs` | `max(6000, 13500 − n'·1000)` | 13500 | 9500 | 6000 (n≈8) |
| `shiftDurationMs` | `min(360000, 180000 + n'·20000)` | 180000 | 260000 | 360000 (n≈10) |
| `callTimerMs` | `max(12000, 25000 − n'·1500)` | 25000 | 19000 | 12000 (n≈10) |
| `maxOpenCalls` | `min(6, 4 + floor(n'/3))` | 4 | 5 | 6 (n≥7) |

Effect: calls-per-shift ≈ `shiftDurationMs / spawnEveryMs` climbs from ~13 (n1) to ~27 (n5)
to ~49 (n8) — matching the documented "early shifts light, later drastically chaotic."

```ts
missionPoolForShift(shiftNumber, missions): string[]
```

Returns a **weighted list of mission ids** (an id repeated `w` times → `w`× spawn odds);
`beginShift` already draws uniformly from the pool it's given, so weighting needs no reducer
change. Per-difficulty weight as a function of `n`:

```
Easy:    max(1, 5 − n)     // fades out
Medium:  3                 // steady
Hard:    min(5, n)         // grows in
Extreme: max(0, n − 2)     // appears shift 3+, grows
```

Medium is always ≥1 so the pool is never empty. Early shifts skew Easy/Medium; later shifts
skew Hard/Extreme. (The catalog is small — 2 Easy / 1 Medium / 1 Hard / 1 Extreme — so this
is a gentle but real bias.) Deterministic; no rng.

---

## 4. Integration (sequential — these files conflict)

### Hook seam: `src/engine/shift.ts` + `src/hooks/useShift.ts`

- `advanceShift` emits `'shift-finalized'` per §2.
- `useShift` gains two options:
  - `onShiftFinalized?: (state: ShiftState) => void` — fired on `'shift-finalized'`; the
    hook reads the already-applied final state (`stateRef`) for tally + `config.seed`.
  - `buildPool?: (missions: Mission[]) => string[]` — how `start()` derives the schedule
    pool (default `m => m.map(x => x.id)`; the Shift page passes `missionPoolForShift`).
- `start(config?)` keeps taking an explicit config; the page passes `configForShift(n)`.

### `useUserProgress`

- Field `shiftSummaries: ShiftSummary[]`.
- `recordShiftSummary(summary)` — append.
- `applyShiftRewards({ medKits, pityCharges })` — increment `medKits` and `pityRemaining`.

### `useAgentProgress`

- `grantAvailablePoints(agentId, amount)` — add to a hero's `availablePoints` (creating a
  progress entry from the base agent if none exists). No-op for `amount <= 0`.

### `src/pages/Shift.tsx`

- `currentShiftNumber = userProgress.shiftSummaries.length + 1`.
- Start (idle button + "Start New Shift") calls `start(configForShift(currentShiftNumber))`;
  passes `buildPool: (m) => missionPoolForShift(currentShiftNumber, m)`.
- `onShiftFinalized(state)`:
  1. `rewards = scoreShift(state.tally)`.
  2. eligible heroes = agents where `!fixedRank`; if `rewards.statPoints > 0`, pick one with
     `pickStatPointRecipient(eligibleIds, createRng(seedFor(state)))` where
     `seedFor = state.config.seed ^ (succeeded·2654435761)` — deterministic, decorrelated
     from the schedule seed, and the ONLY randomness in reward application.
  3. `applyShiftRewards({ medKits, pityCharges })`; if recipient, `grantAvailablePoints`.
  4. `recordShiftSummary({ shiftNumber: currentShiftNumber, completedAt: Date.now(),
     tally, seed, rewards, statPointAgentId })`.

  Finalize fires once per shift (reducer guarantee); the `optsRef` refresh means the callback
  sees the latest `userProgress`/`agents`.
- `ShiftReview` gains `rewards?: ShiftRewards` + `statPointAgentName?: string` props and shows
  the payout once `pendingMissions === 0`.

### Shifts history view — `src/components/ShiftHistorySection.tsx`

Mirrors `MissionHistorySection`: sorted newest-first, one card per summary showing shift #,
date, tally chips, "🔥 Shift Was Lit" badge when flawless, and the reward line. Surfaced via
a new tab/section (Shift page when idle, or reuse the Missions history tabs — final placement
decided in build; default: a section on the Shift idle screen so the campaign arc is visible
before starting the next shift).

---

## 5. Persistence & determinism notes

- `useShift` already persists in-progress `ShiftState` (freeze & resume). Finalization mutates
  `userProgress`/`agentProgress` (separately persisted), then the ended `ShiftState` is what's
  stored; on refresh a finalized+idle shift doesn't re-tick, so **rewards are granted exactly
  once**. Refreshing mid-settle resumes and finalizes normally.
- Breaking existing localStorage saves is acceptable (personal project). `shiftSummaries`
  simply starts empty on old saves via the defaults-merge — no break actually needed.

## 6. Locked decisions & deferrals

- **Reward formula** — §3, locked.
- **Escalation curves** — §3, locked (clamped-linear, caps by ~shift 10).
- **Difficulty mix** — shipped via `missionPoolForShift` weighting (no reducer change).
- **Per-difficulty call timers** (Easy longer / Extreme shorter) — **DEFERRED**. This needs
  each baked call to carry its difficulty and a per-difficulty timer map on `ShiftConfig`,
  i.e. a reducer/schedule change. Per the Phase 3 brief's recommendation, ship flat-timer
  escalation first; revisit as a follow-up if timer variety is wanted.
- **Hero-pick seed** — derived from the shift seed + success count (deterministic, testable).
  Not surfaced to the player beyond "Hero X gained N points."

Nothing here needs a decision I can't default; building to the above.
