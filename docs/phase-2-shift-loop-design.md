# Phase 2 — Real-Time Shift Loop: Design Doc

**Status:** Draft for review (Ryan)
**Author:** Research + design pass, 2026-07-05
**Scope:** Design only. No implementation in this doc. Phases 0 & 1 (engine, resolution, injury, synergy, deploy-time rolling) are done and stay as-is; Phase 2 adds the temporal layer they lack.

---

## 1. Goal

Today the player picks any mission at will with zero time pressure. Phase 2 adds the missing **real-time shift loop**: calls spawn over the course of a shift, each with an expiry timer; a call left unanswered past its timer **auto-fails**; the shift ends after a fixed span and is scored (successes / failures / missed). This is the temporal/stateful layer the sim currently lacks.

The overriding constraint: **keep determinism.** Phase 1's engine is pure and driven by an injectable seeded RNG. Phase 2 must extend that discipline with an **injectable clock**, so an entire shift can be replayed tick-for-tick in tests.

---

## 2. Real-Game Findings (Dispatch, AdHoc Studio, 2025)

The mini-game's internals are **not fully published.** Below, each point is flagged **[DOCUMENTED]** (stated in a guide/review/wiki) or **[INFERRED]** (my read / a game-feel default). Where facts are thin I say so and propose a default rather than inventing a number.

### Shift structure & call volume
- **[DOCUMENTED]** A shift is a discrete session that ends with a **performance review tallying successful, failed, and missed calls.** One reviewer's *first* shift was **12 calls total — 9 success, 2 fail, 1 missed** — and still earned a bonus (a random stat point). [Kotaku], [GameGrin]
- **[DOCUMENTED]** Early shifts are light ("fewer calls, easy to manage"); later shifts get "drastically chaotic" with **more calls than you have heroes for**, forcing triage as timers run down. [NoobFeed], [Kotaku]
- **[INFERRED]** No fixed wall-clock shift *length* is published; shift end appears gated by "all the shift's calls have been resolved/expired" rather than a countdown. Roster is **8 heroes** per shift on the LA map. [Kotaku, DOCUMENTED for the 8 heroes]

### How calls arrive & timers
- **[DOCUMENTED]** Calls **arrive staggered throughout the shift and overlap** — not all at once. [Kotaku], [Fandom via search]
- **[DOCUMENTED]** Each call has a **countdown timer.** Clicking a call **pauses time** so you can read the briefing; you can back out and let time continue. A **small audio countdown rings before the call auto-fails.** [Kotaku], [GameGrin]
- **[DOCUMENTED]** Some calls **don't appear until dialogue finishes**, and time (heroes traveling/resting) keeps running during dialogue — i.e. the clock and the call-spawn schedule are somewhat decoupled. [IntoIndieGames]
- **[INFERRED]** Exact per-call timer durations and the max number of simultaneously-open calls are **not published.** Game-feel default below.

### Consequences of ignoring / failing
- **[DOCUMENTED]** You can ignore any call, but **missed calls detract from the end-of-shift review.** "Missed" and "Failed" are tracked separately (see the "Shift Was Lit" 0-missed/0-failed achievement). [GameGrin], [NoobFeed]
- **[DOCUMENTED]** A **failed** call (hero sent, roll lost) can **injure the hero or lower morale**, hurting later calls. A **missed** call (expired, never assigned) just counts against the review — no injury. [Kotaku], [IntoIndieGames]

### Hero cycle vs. the shift clock
- **[DOCUMENTED]** Dispatched hero cycles **busy → returning → resting**, with a draining green meter for the rest gate; **and** you must **review the result** before that hero redeploys, even after resting. Because calls overlap, your ideal hero is often unavailable. [GameGrin], [Kotaku]
- **[INFERRED]** This maps cleanly onto our existing `ActiveMission` phases (`travel-outbound → active → travel-return → resting → completed`). The "must review before redeploy" gate is a UI nicety we can skip for Phase 2.

### Resolution (already built, confirmed accurate)
- **[DOCUMENTED]** Success uses genuine RNG, not scripting; easy calls auto-succeed at full coverage, hard calls **cap at 85%** even with perfect stats, closable to 100% via a **level-3 synergy pair**; some calls **auto-fail if a stat is too high** (threshold). Even 85–90% calls can genuinely fail — devs confirmed this is **intentional**, not a bug. [GAMES.GG], [PCGamesN]
- This validates the existing `applyProbabilityModifiers` (85% hard-cap → synergy → 15% floor → pity) and `resolveMissionOutcome`. **Phase 2 changes none of it** — it only decides *when* the roll happens and what happens to unanswered calls.

**Sources:** [Kotaku](https://kotaku.com/dispatch-review-adhoc-studios-all-8-episodes-finale-2000644106) · [Fandom: Dispatching](https://dispatch.fandom.com/wiki/Dispatching) · [GameGrin](https://www.gamegrin.com/articles/dispatch-episode-1-and-episode-2-review-in-progress/) · [IntoIndieGames Perfect Run](https://intoindiegames.com/walkthroughs/tips-tricks/dispatch-perfect-run-guide/) · [GAMES.GG](https://games.gg/dispatch/) · [NoobFeed "Shift Was Lit"](https://www.noobfeed.com/articles/dispatch-shift-was-lit-achievement) · [PCGamesN final-shift failure rate](https://www.pcgamesn.com/dispatch/final-shift-failure-rate) · [Steam: Stats/Rank/XP guide](https://steamcommunity.com/sharedfiles/filedetails/?id=3631373838)

---

## 3. Proposed Architecture

### 3.1 The core idea: an injectable clock + a pure shift reducer

Mirror the injectable-RNG pattern. Add a new pure engine module `src/engine/shift.ts` whose heart is a **pure reducer**:

```ts
// advanceShift is pure: no Date.now(), no setInterval, no React.
// It takes the whole shift state, a time delta (ms) or absolute "now",
// and the injectable rng, and returns the next state plus any events.
function advanceShift(state: ShiftState, nowMs: number, rng: Rng): ShiftStep;
```

The React layer never contains game logic. A thin hook (`useShift`) does exactly one job: **pump wall-clock ticks into `advanceShift`.** Everything interesting — spawning calls, expiring calls, completing in-flight missions, ending the shift — happens *inside* the pure engine, driven only by `nowMs` and `rng`. Tests call `advanceShift` directly with a hand-made `nowMs` sequence and a seeded `rng`, and get bit-identical results every run.

```
wall clock (setInterval)                    tests
        │                                     │
        ▼                                     ▼
   useShift hook  ── nowMs, rng ──►  advanceShift(state, nowMs, rng)  ──► { state, events }
   (React state)                              │
                                              ├── spawns due calls (schedule + rng)
                                              ├── expires overdue open calls → auto-fail
                                              ├── advances/settles in-flight missions
                                              └── flags shift-end
```

### 3.2 Injectable clock

We do **not** need a clock *object* passed everywhere; passing `nowMs: number` into the pure reducer is enough and is the cleanest injection point (tests just pass numbers). The only place a real clock is read is the hook:

```ts
export type Clock = () => number; // ms epoch, like Date.now
// hook default: Date.now; tests of the hook can inject a fake.
```

So determinism has two seams, both already idiomatic here:
- **`Rng`** (existing `createRng` mulberry32) — all randomness.
- **`nowMs` / `Clock`** — all time.

Given the same seed + same `nowMs` sequence, a shift is fully reproducible (enables future replay/save-scrubbing too).

### 3.3 What `advanceShift` does each tick

`advanceShift` is deterministic and idempotent w.r.t. a given `nowMs`. In order:

1. **Spawn** — any call in the shift's spawn schedule whose `spawnAt <= nowMs` and not yet spawned becomes an **open call** with `expiresAt = spawnAt + timerDuration`. (Which mission/template a spawn resolves to can be pre-baked in the schedule, or drawn from `rng` at spawn — see Open Decision #7.)
2. **Expire** — any open, unassigned call with `expiresAt <= nowMs` transitions to `missed` (auto-fail; no injury). Emits a `call-missed` event.
3. **Settle in-flight missions** — for each `ActiveMission`, compute phase via the existing `calculateMissionProgress`. Any that reached `completed` since last tick emit `mission-completed` with the already-rolled `outcome`. (The roll still happens at **deploy** time via the existing `resolveMissionOutcome`; `advanceShift` only *reveals* it on completion — no new RNG draw here.)
4. **Shift-end check** — if the end condition is met (Open Decision #1), mark `phase: 'ended'` and stop spawning.

It returns `{ state, events }`; the hook maps `events` onto existing callbacks (`onMissionComplete` → XP/injury, plus new `onCallMissed`).

### 3.4 Composition with existing pieces

- **RNG:** unchanged. Deploy still rolls via `applyProbabilityModifiers` + `resolveMissionOutcome`. `advanceShift` receives the *same* `rng` instance so, if we ever move the roll to a different moment, it stays on one deterministic stream.
- **`resolveMissionOutcome` / `MissionOutcome`:** unchanged; carried on `ActiveMission.outcome` exactly as today.
- **`calculateMissionProgress`:** reused verbatim to decide completion inside step 3.
- **`missionTime.ts`:** reused verbatim to compute per-phase durations at deploy.

Net: Phase 2 is **additive**. The resolution engine is untouched; we wrap a scheduler around it.

---

## 4. Integration with the existing time / deploy model

### 4.1 Two clocks, one source of truth

Today `useActiveMissions` uses `Date.now()` deltas and `TIME_SCALE = 1000` (1 real second = 1 mission time unit). Phase 2 keeps **milliseconds of wall time as the single currency.** The shift schedule (spawn/expiry) and the mission phases both live on the same `nowMs` axis, so an in-flight mission's phases **tick in the same shift-time** as call timers. No second time system.

- Call timer durations are authored in seconds and multiplied by `TIME_SCALE` (reuse the constant), matching how travel/mission durations already scale.
- `ActiveMission` keeps its absolute `startTime`/`phaseStartTime` timestamps. That works whether time is "real" or a fake injected `nowMs`, since it's all deltas.

### 4.2 In-flight missions at shift end

Missions can outlast the shift (a hero deployed near the end is still returning/resting when the shift-end condition trips). Options in Open Decision #6; **recommended default:** the shift's *call phase* ends (no new spawns, review tallied), but in-flight missions **keep ticking to completion** and still fire XP/injury — matching the game's "review at end, heroes still return" feel. The review counts a deployed-but-not-yet-resolved call as a pending/success-in-progress, resolved when it completes.

### 4.3 Changes to existing types/hooks

Minimal and additive:
- **`ActiveMission`:** add optional `sourceCallId?: string` so a completed mission can be traced back to the call it answered (for the shift tally). No behavioral change.
- **`useActiveMissions`:** stays as the mission-execution engine. Phase 2's `useShift` **composes** it (owns the call queue + schedule; delegates deploy to `deployMission`). Alternatively fold both into `useShift` — but composition keeps the existing tests green. **Recommend composition.**
- **`Mission` type:** no change. Calls reference missions/templates by id.
- No change to `useUserProgress` shape except optionally recording a per-shift summary (Open Decision #8).

---

## 5. Data Model

New types live in `src/types/shift.ts`; the reducer in `src/engine/shift.ts`.

```ts
// A call = a scheduled instance of a mission with spawn + expiry timing.
type CallStatus = 'pending' | 'open' | 'assigned' | 'succeeded' | 'failed' | 'missed';

interface ShiftCall {
  id: string;
  missionId: string;        // resolves to a Mission template
  spawnAt: number;          // ms on the shift axis (relative to shiftStartMs)
  expiresAt: number;        // spawnAt + timerDuration; only meaningful while 'open'
  status: CallStatus;
  activeMissionId?: string; // set when assigned/deployed
}

interface ShiftConfig {
  seed: number;             // drives the injectable rng for this shift
  shiftDurationMs: number;  // wall span of the "call phase" (see Open Decision #1)
  maxOpenCalls: number;     // concurrent open-call cap (Open Decision #3)
  callTimerMs: number;      // default per-call expiry window (Open Decision #4)
  spawnEveryMs: number;     // mean gap between spawns (Open Decision #2)
}

type ShiftPhase = 'idle' | 'running' | 'paused' | 'ended';

interface ShiftState {
  phase: ShiftPhase;
  config: ShiftConfig;
  shiftStartMs: number;     // absolute epoch when the shift began
  calls: ShiftCall[];       // full queue: pending + open + resolved
  activeMissions: ActiveMission[]; // in-flight (or delegated to useActiveMissions)
  tally: { succeeded: number; failed: number; missed: number };
  lastTickMs: number;       // for idempotent advancement
}

interface ShiftEvent {
  type: 'call-spawned' | 'call-missed' | 'mission-completed' | 'shift-ended';
  callId?: string;
  activeMissionId?: string;
}

interface ShiftStep { state: ShiftState; events: ShiftEvent[]; }
```

The spawn schedule can be **pre-baked** from `seed` at shift start (deterministic list of `{spawnAt, missionId}`) or drawn lazily from `rng` in step 1. Pre-baking is simpler to reason about and test (Open Decision #7 — recommend pre-bake).

### Persistence
- Persisting `ShiftState` to localStorage is optional. **Breaking existing saves is acceptable** (personal project) — no migration needed.
- If we persist, store `shiftStartMs` + `seed` + schedule; on reload we can **replay** from `shiftStartMs` to `Date.now()` deterministically (this is where the pure reducer pays off). Whether we *want* that (offline shift keeps running) is Open Decision #5.
- Recommend: persist only the completed-shift *summary* into `useUserProgress`; treat an in-progress shift as ephemeral for v1.

---

## 6. Open Design Decisions — RESOLVED

### Decisions locked (2026-07-05)

Ryan locked all eight decisions; every one took the recommended default. Build to these:

- **Shift-end condition (#1):** fixed duration **~3 min**, after which no new calls spawn but already-open calls drain/resolve.
- **Max concurrent open calls (#3):** **4**.
- **Refresh / offline (#5):** **FREEZE** — shift pauses on tab close and resumes as if no time passed.
- **Pause-on-call-open (#8):** **YES** — opening a call pauses the shift clock; add a `paused` phase to the reducer.
- **Per-call expiry (#4):** **~25s** (accepted default).
- **Arrival rate (#2):** **~1 call / 12–15s**, ~12 calls per shift (accepted default).
- **Spawn schedule (#7):** **pre-baked** from the seed at shift start (accepted default).
- **In-flight missions at shift end (#6):** allowed to **finish and still apply XP/injury** (accepted default).

Per-item detail (tradeoffs retained for context):

1. **Shift-end condition** — countdown length vs. "all scheduled calls resolved." **RESOLVED:** fixed `shiftDurationMs` (~3 min) after which no new calls spawn; shift ends once open calls drain. *Tradeoff:* fixed length is predictable/testable; "all resolved" ties length to call count.
2. **Arrival rate** — mean gap between spawns. **RESOLVED:** ~1 call every 12–15s, jittered ±30% via `rng`, tuned so a ~3-min shift yields ~12 calls (matches the documented first-shift count). *Tradeoff:* faster = more triage stress. May be re-tuned later.
3. **Max concurrent open calls** — cap on simultaneously-open calls. **RESOLVED: 4.** *Tradeoff:* higher = more overwhelm (matches "more work than people" late-game); lower = gentler.
4. **Per-call expiry duration** — how long an open call survives. **RESOLVED:** 25s default; per-difficulty scaling (Easy longer, Extreme shorter) remains a nice-to-have. *Tradeoff:* short timers punish slow triage.
5. **Refresh / offline behavior** — keep running while the tab is closed, or freeze? **RESOLVED: freeze** — on reload, resume from saved state as if no time passed; the pure reducer keeps the "replay to now" option available later without a rewrite. *Tradeoff:* keep-running is more "real" but punishes closing the tab and is harder to reason about.
6. **In-flight missions at shift end** — cut them off, or let them finish? **RESOLVED: let them finish** and still apply XP/injury; review tallies them when they resolve. *Tradeoff:* cutting off is cleaner UI but throws away a deploy the player committed to.
7. **Spawn schedule: pre-baked vs. lazy** — bake the full `{spawnAt, missionId}` list from `seed` at shift start, or draw each spawn from `rng` on the fly. **RESOLVED: pre-bake.** *Tradeoff:* pre-bake is trivial to test/replay; lazy adapts to state but complicates determinism.
8. **Pause on call-open** — the real game pauses time when you open a call to read it. **RESOLVED: yes** — add a `paused` phase; while paused, `useShift` stops pumping ticks (pure reducer is unaffected — it just isn't advanced). *Tradeoff:* not pausing is more stressful/arcadey.

---

## 7. Implementation Phasing

This is **one cohesive stateful system** — unlike Phase 1's tracks A–E, it is **not parallelizable.** Each step builds on the last; do them sequentially:

1. **Types + config** — `src/types/shift.ts` (`ShiftCall`, `ShiftConfig`, `ShiftState`, events). No logic. Cheap to review.
2. **Pure reducer** — `src/engine/shift.ts`: `advanceShift(state, nowMs, rng)` implementing spawn → expire → settle → end. Pure, no React, no `Date.now`. Includes a `beginShift(config, startMs, rng)` that pre-bakes the schedule. Fully unit-tested against a fake `nowMs` sequence + seeded rng **before any UI exists.**
3. **Hook** — `src/hooks/useShift.ts`: owns `ShiftState` in React state, `setInterval` pumps `Clock() → advanceShift`, maps events to `onMissionComplete` / `onCallMissed`. Composes/delegates to `useActiveMissions.deployMission` for the actual roll.
4. **UI wiring** — surface open calls with countdown bars, the shift tally, and shift-start/-end in `Missions.tsx` (or a new `Shift` page). Keep the existing at-will mission list available behind a toggle if desired.
5. **Persistence + review** — write the end-of-shift summary into `useUserProgress`; decide offline behavior per Decision #5.

Ship 1–3 first (the deterministic core); 4–5 are the presentation/persistence skin.

---

## 8. Testing Strategy

Determinism is the whole point: **injectable `rng` + injected `nowMs` make the shift loop unit-testable without React, timers, or flakiness.** Tests drive `advanceShift` directly with a scripted time sequence and `createRng(seed)`.

Core scenarios (all colocated as `shift.test.ts`):

- **Call spawns on schedule** — begin a shift with seed S; advance `nowMs` past the first `spawnAt`; assert exactly the expected call is `open` with the right `expiresAt`.
- **Call expires and auto-fails** — spawn a call, advance `nowMs` past `expiresAt` without assigning; assert it becomes `missed`, a `call-missed` event fires, tally `missed` increments, and **no injury** is applied.
- **Mission completes mid-shift** — deploy at t0 (outcome pre-rolled), advance `nowMs` past `startTime + totalDuration`; assert one `mission-completed` event with the expected `outcome`, and the tally records success/fail correctly.
- **Shift ends with missions in flight** — deploy near shift end, cross `shiftDurationMs`; assert `phase: 'ended'`, no further spawns, but the in-flight mission still completes on a later tick and still fires XP/injury (per Decision #6).
- **Max-concurrent cap** — schedule spawns that would exceed `maxOpenCalls`; assert overflow spawns are held `pending` and only open as slots free up.
- **Idempotent / replay** — running the same seed + same `nowMs` sequence twice yields byte-identical `ShiftState`; re-advancing with a `nowMs` equal to `lastTickMs` is a no-op.
- **Pause** (if Decision #8 = yes) — not advancing the reducer while `paused` leaves state frozen; resuming continues cleanly.

The React hook gets a thin test with a **fake `Clock`** and fake timers to confirm it forwards ticks and maps events — but all *game logic* is covered by the pure-engine tests above.
