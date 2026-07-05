// Pure Track-2 reward core: turns an end-of-shift tally into rewards.
//
// This is the deterministic scoring half of the shift loop. `scoreShift`
// converts the counts of succeeded / failed / missed calls into concrete
// payouts (stat points, med kits, pity charges). Flawless shifts — every
// call succeeded, none failed or missed — pay the most, and otherwise the
// rewards scale with the raw success count. The only randomness in this
// module is the "hero" pick in `pickStatPointRecipient`, which chooses a
// single agent to receive a stat point; everything else is a locked formula.
//
// No React, no timers, no global state. Randomness enters solely through the
// injectable `Rng`.

import type { ShiftTally } from '../types/shift';
import type { ShiftRewards } from '../types/shiftSummary';
import type { Rng } from './rng';

/**
 * Score an end-of-shift tally into rewards. Fully deterministic — no rng.
 *
 * A shift is "flawless" when at least one call resolved and none of them
 * failed or were missed. Flawless shifts get a flat bonus on top of the
 * success-count-driven payouts. An empty shift (no calls at all) pays zeros
 * and is never flawless.
 */
export function scoreShift(tally: ShiftTally): ShiftRewards {
  const { succeeded, failed, missed } = tally;
  const total = succeeded + failed + missed;
  const flawless = total > 0 && failed === 0 && missed === 0;

  // pityCharges: flawless → 2; a clean-but-imperfect shift (no failures, but
  // it actually ran) → 1; anything with a failure → 0. The `total > 0` guard
  // keeps an empty shift (no calls at all) at 0 instead of paying the
  // no-failures charge for a shift that never happened.
  return {
    statPoints: Math.floor(succeeded / 4) + (flawless ? 1 : 0),
    medKits: Math.floor(succeeded / 6) + (flawless ? 1 : 0),
    pityCharges: flawless ? 2 : total > 0 && failed === 0 ? 1 : 0,
  };
}

/**
 * Pick a single agent to receive the shift's stat point. Returns `null` when
 * there are no eligible agents. This is the sole randomness in the module — it
 * draws exactly one rng value, and only when there is at least one candidate,
 * so callers that skip the pick don't perturb the rng stream.
 */
export function pickStatPointRecipient(eligibleAgentIds: string[], rng: Rng): string | null {
  if (eligibleAgentIds.length === 0) {
    return null;
  }
  return eligibleAgentIds[Math.floor(rng() * eligibleAgentIds.length)];
}
