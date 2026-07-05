// Pure mission-resolution rules: team stat combination, success probability,
// and the success/failure roll. No React, no timers, no global state.

import type { StatPool } from '../types/stats';
import { createEmptyStats, PILLARS } from '../types/stats';
import { calculateSuccessProbability } from '../utils/geometry';
import type { Rng } from './rng';

export const MAX_STAT_VALUE = 10;

/**
 * Combine team stats by summing each pillar across agents, capped at
 * MAX_STAT_VALUE per pillar — stacking agents raises the team's pentagon.
 */
export function combineTeamStats(statPools: StatPool[], cap: number = MAX_STAT_VALUE): StatPool {
  const combined = createEmptyStats();
  for (const pillar of PILLARS) {
    const total = statPools.reduce((sum, stats) => sum + stats[pillar], 0);
    combined[pillar] = Math.min(total, cap);
  }
  return combined;
}

/**
 * Success probability for a team against a mission's requirements:
 * combined team stats, then pentagon area overlap.
 */
export function calculateTeamSuccessProbability(
  teamStats: StatPool[],
  missionRequirements: StatPool,
  maxValue: number = MAX_STAT_VALUE
): number {
  if (teamStats.length === 0) {
    return 0;
  }
  const combinedStats = combineTeamStats(teamStats, maxValue);
  return calculateSuccessProbability(combinedStats, missionRequirements, maxValue);
}

export interface MissionOutcome {
  success: boolean;
  /** The chance used for the roll, 0-1. */
  probability: number;
  /** The sampled value, 0-1. Success when roll < probability. */
  roll: number;
}

/** Single Bernoulli roll deciding whether a mission succeeds. */
export function resolveMissionOutcome(probability: number, rng: Rng): MissionOutcome {
  const roll = rng();
  return {
    success: roll < probability,
    probability,
    roll,
  };
}
