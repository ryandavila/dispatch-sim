// Pure "difficulty ladder" for the shift loop: given a 1-based shift number,
// derive the shift's ShiftConfig and its weighted mission-draw pool. No React,
// no Date.now, no timers, no randomness — fully deterministic and replayable.
//
// The ladder is the only place escalation lives: later shifts get more calls
// (lower spawnEveryMs, longer shiftDurationMs), tighter timers (lower
// callTimerMs), more concurrent slots (higher maxOpenCalls), and a pool that
// skews from Easy/Medium toward Hard/Extreme. `beginShift` (in ./shift)
// consumes both outputs unchanged — no reducer change is required.

import type { Mission } from '../types/mission';
import type { ShiftConfig } from '../types/shift';

/**
 * Derive the {@link ShiftConfig} for the `shiftNumber`-th shift (1-based).
 *
 * Let `k = n - 1`. Every field is a clamped-linear curve, so escalation is
 * monotonic and then flat once it hits its cap/floor:
 *   - seed:            n            (each shift bakes a distinct schedule)
 *   - spawnEveryMs:    13500 − k·1000, floored at 6000  (calls arrive faster)
 *   - shiftDurationMs: 180000 + k·20000, capped at 360000 (longer spawn phase)
 *   - callTimerMs:     25000 − k·1500, floored at 12000  (tighter countdown)
 *   - maxOpenCalls:    4 + ⌊k/3⌋, capped at 6            (more concurrent slots)
 *
 * Shift 1 equals `DEFAULT_SHIFT_CONFIG`. `shiftNumber` is clamped to a whole
 * number ≥ 1, so 0 and negatives behave like shift 1.
 */
export function configForShift(shiftNumber: number): ShiftConfig {
  const n = Math.max(1, Math.floor(shiftNumber));
  const k = n - 1;
  return {
    seed: n,
    spawnEveryMs: Math.max(6000, 13500 - k * 1000),
    shiftDurationMs: Math.min(360000, 180000 + k * 20000),
    callTimerMs: Math.max(12000, 25000 - k * 1500),
    maxOpenCalls: Math.min(6, 4 + Math.floor(k / 3)),
  };
}

/** Per-difficulty spawn weight for the `n`-th shift (see JSDoc below). */
function weightForDifficulty(difficulty: Mission['difficulty'], n: number): number {
  switch (difficulty) {
    case 'Easy':
      return Math.max(1, 5 - n);
    case 'Medium':
      return 3;
    case 'Hard':
      return Math.min(5, n);
    case 'Extreme':
      return Math.max(0, n - 2);
  }
}

/**
 * Build the weighted mission-draw pool for the `shiftNumber`-th shift (1-based).
 *
 * Each mission's `id` is pushed into the result once per unit of its
 * difficulty weight, in the order missions are given. `beginShift` draws
 * uniformly at random from this list, so repeating an id N times gives it N×
 * the spawn odds. A difficulty whose weight is 0 contributes nothing.
 *
 * Weights (with `n` clamped to a whole number ≥ 1):
 *   - Easy:    max(1, 5 − n)  → early shifts common, ≥1 forever
 *   - Medium:  3              → constant backbone of the pool
 *   - Hard:    min(5, n)      → ramps in as shifts climb
 *   - Extreme: max(0, n − 2)  → absent for shifts 1–2, then ramps
 *
 * Net effect: early shifts skew Easy/Medium, later shifts skew Hard/Extreme —
 * with no reducer change required. Because Medium is always weight 3 and Easy
 * always ≥1, the pool is non-empty whenever `missions` contains any Easy or
 * Medium mission. An empty `missions` array returns `[]`.
 */
export function missionPoolForShift(shiftNumber: number, missions: Mission[]): string[] {
  const n = Math.max(1, Math.floor(shiftNumber));
  const pool: string[] = [];
  for (const mission of missions) {
    const weight = weightForDifficulty(mission.difficulty, n);
    for (let i = 0; i < weight; i++) {
      pool.push(mission.id);
    }
  }
  return pool;
}
