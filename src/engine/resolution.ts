// Pure mission-resolution rules: team stat combination, success probability,
// and the success/failure roll. No React, no timers, no global state.

import type { Mission } from '../types/mission';
import type { StatPool } from '../types/stats';
import { createEmptyStats, PILLARS } from '../types/stats';
import { calculateSuccessProbability } from '../utils/geometry';
import type { Rng } from './rng';
import { getSynergyBonus } from './synergy';

export const MAX_STAT_VALUE = 10;

/** Hard/Extreme missions cap the geometric probability here, before synergy. */
export const HARD_CALL_CAP = 0.85;

/** Non-empty teams never drop below this probability. */
export const PROBABILITY_FLOOR = 0.15;

/** Chances above this threshold are pity-protected while charges remain. */
export const PITY_THRESHOLD = 0.76;

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

export interface ProbabilityModifierInput {
  /** Geometric (area-overlap) success probability, 0-1. */
  baseProbability: number;
  difficulty: Mission['difficulty'];
  /** Synergy level (0-3) of each synergy duo on the team. */
  synergyLevels: number[];
  /** Remaining guaranteed-success pity charges. */
  pityRemaining: number;
  teamSize: number;
}

export interface ModifiedProbability {
  /** Final probability, 0-1, after cap, synergy, and floor. */
  probability: number;
  /** Total synergy bonus that was added, 0-1. */
  synergyBonus: number;
  /** True when the final chance is above the pity threshold and charges remain. */
  pityApplies: boolean;
}

/**
 * Apply the modifier layer on top of the geometric probability, in order:
 * 1. hard-call cap — Hard/Extreme missions cap at 85% (before synergy)
 * 2. synergy bonus — +5% per synergy level of each duo, can push past the cap
 * 3. floor — anything below 15% is raised to 15% (an empty team stays 0%)
 * 4. pity — chances above 76% are guaranteed while pity charges remain
 */
export function applyProbabilityModifiers(input: ProbabilityModifierInput): ModifiedProbability {
  const { baseProbability, difficulty, synergyLevels, pityRemaining, teamSize } = input;

  if (teamSize === 0) {
    return { probability: 0, synergyBonus: 0, pityApplies: false };
  }

  // 1. Hard-call cap on the geometric probability
  const isHardCall = difficulty === 'Hard' || difficulty === 'Extreme';
  let probability = isHardCall ? Math.min(baseProbability, HARD_CALL_CAP) : baseProbability;

  // 2. Synergy bonus, applied after the cap so it can push past it
  const synergyBonus = synergyLevels.reduce((sum, level) => sum + getSynergyBonus(level), 0);
  probability = Math.min(probability + synergyBonus, 1);

  // 3. Floor for non-empty teams
  probability = Math.max(probability, PROBABILITY_FLOOR);

  // 4. Pity guarantee
  const pityApplies = probability > PITY_THRESHOLD && pityRemaining > 0;

  return { probability, synergyBonus, pityApplies };
}

export interface MissionOutcome {
  success: boolean;
  /** The chance used for the roll, 0-1. */
  probability: number;
  /** The sampled value, 0-1. Success when roll < probability. */
  roll: number;
  /**
   * True only when pity actually converted a would-be failure into a success —
   * i.e. a charge was spent to save this call. A high-probability call that
   * rolled a natural success does NOT set this (and so keeps its charge).
   */
  pityUsed?: boolean;
}

/**
 * Single Bernoulli roll deciding whether a mission succeeds. When
 * `pityApplies` is true the call is guaranteed to succeed, but a pity charge is
 * only considered *used* (`pityUsed`) when the natural roll would have failed —
 * so pity is spent only when it saves you, never on a call that would have won
 * on its own.
 */
export function resolveMissionOutcome(
  probability: number,
  rng: Rng,
  pityApplies: boolean = false
): MissionOutcome {
  const roll = rng();
  const naturalSuccess = roll < probability;
  return {
    success: naturalSuccess || pityApplies,
    probability,
    roll,
    pityUsed: pityApplies && !naturalSuccess,
  };
}
