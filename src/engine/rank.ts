// Pure dispatcher rank meta-progression: turns an end-of-shift tally into a
// rank-score delta, and maps a rank score onto a tier ladder that pays out
// real rewards (bandages + defibrillators) the first time it's crossed.
//
// No React, no Date.now, no randomness. Everything here is a locked formula.

import type { ShiftTally } from '../types/shift';

/** Points per outcome. Missed calls punish hardest — an unanswered call is
 * the dispatcher's own failure, worse than a hero trying and failing. */
const SUCCESS_POINTS = 3;
const FAILURE_POINTS = -2;
const MISSED_POINTS = -4;

/** Rewards granted the moment a tier is newly crossed. */
export interface RankTierRewards {
  bandages: number;
  defibrillators: number;
}

export interface RankTier {
  name: string;
  minScore: number;
  rewards: RankTierRewards;
}

/** Ordered lowest → highest. minScore is the all-time-best score required. */
export const RANK_TIERS: RankTier[] = [
  { name: 'PROBATIONARY', minScore: 0, rewards: { bandages: 0, defibrillators: 0 } },
  { name: 'DISPATCHER III', minScore: 25, rewards: { bandages: 2, defibrillators: 1 } },
  { name: 'DISPATCHER II', minScore: 60, rewards: { bandages: 2, defibrillators: 1 } },
  { name: 'DISPATCHER I', minScore: 105, rewards: { bandages: 3, defibrillators: 1 } },
  { name: 'SENIOR DISPATCHER', minScore: 160, rewards: { bandages: 3, defibrillators: 2 } },
  { name: 'DISPATCH COMMANDER', minScore: 225, rewards: { bandages: 4, defibrillators: 2 } },
];

/**
 * Score an end-of-shift tally into a signed rank-score delta:
 * succeeded*3 - failed*2 - missed*4.
 */
export function rankDelta(tally: ShiftTally): number {
  return (
    tally.succeeded * SUCCESS_POINTS + tally.failed * FAILURE_POINTS + tally.missed * MISSED_POINTS
  );
}

/**
 * The highest tier whose minScore <= score. Scores below 0 clamp to 0 first,
 * so this always resolves to at least PROBATIONARY.
 */
export function tierForScore(score: number): RankTier {
  const clamped = Math.max(0, score);
  let current = RANK_TIERS[0];
  for (const tier of RANK_TIERS) {
    if (tier.minScore <= clamped) {
      current = tier;
    }
  }
  return current;
}

export interface RankProgress {
  rankScore: number;
  bestRankScore: number;
}

export interface RankProgressResult extends RankProgress {
  /**
   * Tiers newly crossed by this update, in ascending order. Gated on
   * bestRankScore ONLY (the all-time-best), never the current (droppable)
   * rankScore — so a dispatcher who drops out of a tier and re-climbs back
   * into it is never paid the crossing reward twice. Rewards are a one-time,
   * permanent-progress payout, not a repeatable buff for holding the tier.
   */
  tiersGained: RankTier[];
}

/**
 * Apply a shift's rank delta to the current rank progress.
 *
 * - rankScore floors at 0 (a dispatcher can slide back down, but never
 *   into negative territory).
 * - bestRankScore is the running max — it never decreases.
 * - tiersGained lists every tier whose minScore sits in
 *   (previous bestRankScore, new bestRankScore] — i.e. newly reached by the
 *   all-time best, so re-crossing after a drop pays nothing.
 */
export function applyRankDelta(current: RankProgress, delta: number): RankProgressResult {
  const rankScore = Math.max(0, current.rankScore + delta);
  const bestRankScore = Math.max(current.bestRankScore, rankScore);

  const tiersGained = RANK_TIERS.filter(
    (tier) => tier.minScore > current.bestRankScore && tier.minScore <= bestRankScore
  );

  return { rankScore, bestRankScore, tiersGained };
}
