# Seeded Shifts — Determinism Contract

**Status:** Reference (describes shipped behavior, not a proposal)
**Scope:** How a shift's seed is created, how it drives every roll in that shift, and
the exhaustive list of things that change what a given seed produces. Phases 0–3 are
built (see `docs/phase-2-shift-loop-design.md`, `docs/phase-3-meta-loop-design.md`);
this doc documents the seed/replay contract those phases established, so future edits
don't silently break it.

---

## 1. Where the seed comes from, and where it lives

A shift's seed is real (non-deterministic) entropy generated exactly once, at
clock-in — `generateShiftSeed()` in `src/pages/Shift.tsx`:

```ts
function generateShiftSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) | 0;
}
```

This is the **only** place production code reaches for non-deterministic entropy.
`startShift()` bakes the result into `ShiftConfig.seed` (`configForShift(n)` supplies
every other config field, deterministically — see §3). From that point on, the seed
rides inside `ShiftConfig`, which is itself part of the persisted `ShiftState` blob
(`localStorage['dispatch-sim-shift']`, written by `useShift`'s persistence effect).

Practically: **a resumed session reuses the same seed.** `computeShiftInit` in
`useShift.ts` restores the whole `ShiftState` — including `config.seed` — so a page
reload never re-rolls anything; it just continues deriving from the same seed as
before (see §2 for why that's safe without persisting an rng cursor).

---

## 2. Two-stream design: schedule bake vs. per-deploy rolls

There are exactly two places production code turns a seed into an `Rng` (`src/engine/rng.ts`, `createRng` — mulberry32):

1. **Schedule bake** — once, in `start()` (`useShift.ts`): `createRng(cfg.seed)`, fed
   into `beginShift`. This one rng instance draws the entire spawn schedule (jittered
   `spawnAt` + mission pick per call) in one sequential pass.
2. **Per-deploy roll** — once per `deploy(callId, ...)` call: `createRng(hashSeed(state.config.seed, callId))`. This fresh, independent rng drives that call's
   `resolveMissionOutcome` and its `bakeDisruption` draws.

**Why not one shared stream for everything?** The schedule bake is drawn once and
persisted as data (the baked `calls` array), so it never needs re-rolling — that part
is safe on a single stream. But per-deploy rolls happen throughout the shift, and the
whole `ShiftState` (bake included) gets persisted and can be resumed after a reload.
If deploy rolls consumed the *same* rng stream as the bake, resuming would have no way
to know how many values had already been drawn from that stream — the cursor isn't
part of `ShiftState` — so a resumed session would either replay stale draws or diverge
from what an unreloaded session would have rolled for the same call.

Deriving a **fresh rng per deploy** from `hashSeed(seed, callId)` sidesteps this
entirely: a call's outcome depends only on the shift seed and which call it is, never
on how many other draws happened first or whether the session reloaded in between. A
resumed shift therefore deploys the identical call to the identical outcome as one that
was never reloaded, with zero rng cursor to persist.

**Purpose-tag convention.** `hashSeed` takes any number of parts, so future mid-shift
randomness that needs its own independent draw (something that isn't the deploy
outcome or bake, e.g. a new mechanic) should add a tag to stay decorrelated from
existing draws: `hashSeed(seed, callId, 'my-new-thing')`. Two existing users of this
pattern beyond the deploy roll itself:
- `bakeDisruption` draws from the *same* per-deploy rng right after the outcome roll
  (no separate tag — see §3 for why the draw count there is fixed).
- The end-of-shift stat-point recipient pick (`finalizeShift` in `Shift.tsx`) uses its
  own derivation, `seed ^ (succeeded * 2654435761)`, deliberately decorrelated from
  `hashSeed` so it doesn't collide with any call id.

---

## 3. The determinism contract

Given the same seed, the following stay **fixed** across runs (this is what "seeded
and deterministic" means in practice). Editing any of the following **changes what
every seed produces** — every past seed re-rolls to a new outcome:

- **`data/missions.json` contents** — both the mission list/order (the bake's pool is
  built from it) and each mission's authored `disruption` block.
  `bakeDisruption` (`src/engine/disruption.ts`) draws **exactly 2 rng values from the
  per-deploy stream whenever the deployed mission has a `disruption` block authored**
  — one for the chance roll, one for the fire-point roll — **regardless of whether the
  chance roll passes.** That fixed cost is deliberate: it keeps the draw count (and
  therefore the outcome roll that precedes it) independent of the disruption's own
  result. Adding/removing/editing a `disruption` block on any mission changes that
  mission's draw count and reshuffles every later draw on that call's stream.
- **`DISRUPTION_CHANCE`** (`src/engine/disruption.ts`, currently `0.3`) and any other
  engine constant a roll is compared against (e.g. `SPAWN_JITTER` in `shift.ts`,
  `DEFAULT_SHIFT_CONFIG`) — these don't change draw *count*, but they change what a
  given drawn value *means*, which is equally seed-breaking.
- **Draw order** inside `start()` / `beginShift` (jitter draw, then pool-pick draw, per
  call) and inside `deploy()` (outcome roll, then `bakeDisruption`'s two draws).
  Reordering, or inserting a new draw before/between these, shifts every subsequent
  value on that stream.
- **`hashSeed`'s implementation** (`src/engine/rng.ts`) — it's the xmur3-style string
  hash that turns `(seed, callId, ...)` into the 32-bit seed for a deploy's `createRng`.
  Any change to its mixing (or to how parts are joined) changes every derived seed.
- **`shiftLadder.ts` schedule parameters** — `configForShift` (spawn rate, shift
  duration, call timer, concurrency cap) and `missionPoolForShift`'s per-difficulty
  weights. These don't touch the rng itself, but they change the *shape* the bake
  draws against (how many calls, which missions are in the pool and how often), so
  the same seed bakes a different schedule.

**This is acceptable pre-release** — there's no external replay format to keep stable
yet, and nothing currently depends on an old seed reproducing an old schedule byte-for-
byte across a data/constant change. It becomes the thing to **version or flag** the
moment replays are shared, exported, or compared across builds (e.g. a "replay this
exact shift" feature, or a leaderboard keyed on seed) — at that point, any of the above
changes needs a version bump so old replays can be told apart from new ones rather than
silently producing different results under the same seed.

---

## 4. The injectable-rng test seam

Both `start()` and `deploy()` check `opts.rng` first (`UseShiftOptions.rng`, `useShift.ts`). When a test supplies it, that **one** rng instance drives both the
schedule bake and every deploy roll, consumed sequentially on a single stream — the
original (pre-derivation) test contract, preserved byte-for-byte. Production code never
sets this option; only when it's absent does `start`/`deploy` fall back to `createRng(cfg.seed)` / `createRng(hashSeed(seed, callId))` as described in §2.

This means engine-level tests (`shift.test.ts`, `disruption.test.ts`, etc.) can keep
driving a single scripted `Rng` directly, while hook-level tests that care about the
production derivation path (resume-safety in particular) omit `opts.rng` and let the
hook derive for real.

---

## 5. Verifying determinism

- **`src/engine/rng.test.ts`** — the `hashSeed` suite: same inputs always hash to the
  same seed; different `callId`s (or different shift seeds) hash to different seeds;
  and a call's outcome-stream seed vs. its disruption-stream seed (when tagged) diverge
  from each other.
- **`src/hooks/useShift.test.ts`** — `describe('useShift — resume-determinism ...')`:
  bakes a shift, deploys once to get a baseline outcome, then separately bakes the same
  config+seed, persists, unmounts (simulating a reload), remounts from the persisted
  blob, and deploys the same call. Asserts the baked schedule is identical and the
  resumed deploy's `outcome` and `disruption` both match the unreloaded baseline.

**Quick manual check:** start two shifts with the same `ShiftConfig.seed` (e.g. via the
`opts.rng`-free path with a fixed seed) and confirm the baked `calls` arrays are
identical — same `spawnAt`, `missionId`, and `expiresAt` for every call. If they
diverge, something on the §3 list changed.
