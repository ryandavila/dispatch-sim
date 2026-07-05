// Pure injury rules: stat penalties from failed missions, the downed
// threshold, and effective-stat calculation. No React, no global state.

import type { Character } from '../types/character';
import type { StatPool } from '../types/stats';
import { createEmptyStats, PILLARS } from '../types/stats';

/** Stat points lost per injury, applied to every pillar. */
export const INJURY_STAT_PENALTY = 1;

/** Injured stats never drop below this value. */
export const INJURY_STAT_FLOOR = 1;

/** Injury count at which an agent is downed and cannot be deployed. */
export const DOWNED_INJURY_COUNT = 2;

type InjuryState = Pick<Character, 'injuryCount'>;

/** Normalized injury count — agents without the field are healthy. */
export function getInjuryCount(character: InjuryState): number {
  return character.injuryCount ?? 0;
}

export function isInjured(character: InjuryState): boolean {
  return getInjuryCount(character) > 0;
}

export function isDowned(character: InjuryState): boolean {
  return getInjuryCount(character) >= DOWNED_INJURY_COUNT;
}

/** One more injury, capped at the downed threshold. */
export function addInjury(injuryCount: number): number {
  return Math.min(injuryCount + 1, DOWNED_INJURY_COUNT);
}

/**
 * Apply injury penalties to allocated stats: −INJURY_STAT_PENALTY to every
 * pillar per injury, floored at INJURY_STAT_FLOOR. Never mutates the input.
 */
export function applyInjuryPenalty(stats: StatPool, injuryCount: number): StatPool {
  if (injuryCount <= 0) {
    return stats;
  }
  const penalized = createEmptyStats();
  for (const pillar of PILLARS) {
    penalized[pillar] = Math.max(
      INJURY_STAT_FLOOR,
      stats[pillar] - injuryCount * INJURY_STAT_PENALTY
    );
  }
  return penalized;
}

/** Effective stats: allocated stats with the agent's injury penalty applied. */
export function getEffectiveStats(character: Pick<Character, 'stats' | 'injuryCount'>): StatPool {
  return applyInjuryPenalty(character.stats, getInjuryCount(character));
}
