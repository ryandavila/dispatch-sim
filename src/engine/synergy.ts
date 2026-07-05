// Synergy rules: certain duos gain a success-probability bonus that grows
// the more often they are dispatched together. Pure and React-free — pair
// definitions live in data/synergies.json, dispatch counts are injected.

import { loadSynergies } from '../utils/dataLoader';

export type SynergyPair = [string, string];

/** Dispatches together required to gain one synergy level. */
export const DISPATCHES_PER_SYNERGY_LEVEL = 3;

export const MAX_SYNERGY_LEVEL = 3;

/** Success-probability bonus per synergy level (+5% each). */
export const SYNERGY_BONUS_PER_LEVEL = 0.05;

/** All synergy duos defined in data/synergies.json (validated at load). */
export function loadSynergyPairs(): SynergyPair[] {
  return loadSynergies().map((entry) => [entry.agents[0], entry.agents[1]]);
}

/** Canonical, order-independent persistence key for a pair of agent ids. */
export function synergyPairKey(agentIdA: string, agentIdB: string): string {
  return [agentIdA, agentIdB].sort().join('+');
}

/** Synergy level from times dispatched together: min(3, floor(n / 3)). */
export function getSynergyLevel(timesDispatchedTogether: number): number {
  return Math.min(
    MAX_SYNERGY_LEVEL,
    Math.floor(timesDispatchedTogether / DISPATCHES_PER_SYNERGY_LEVEL)
  );
}

/** Probability bonus for a synergy level: +5% / +10% / +15% at levels 1/2/3. */
export function getSynergyBonus(level: number): number {
  return level * SYNERGY_BONUS_PER_LEVEL;
}

/** Synergy pairs where both members are on the team. */
export function findSynergyPairsInTeam(
  agentIds: string[],
  pairs: SynergyPair[] = loadSynergyPairs()
): SynergyPair[] {
  return pairs.filter(([a, b]) => agentIds.includes(a) && agentIds.includes(b));
}

export interface TeamSynergy {
  pair: SynergyPair;
  level: number;
}

/**
 * Synergy pairs on a team with their current levels, given a lookup of how
 * often each pair (by synergyPairKey) has been dispatched together.
 */
export function getTeamSynergies(
  agentIds: string[],
  getDispatchCount: (pairKey: string) => number,
  pairs: SynergyPair[] = loadSynergyPairs()
): TeamSynergy[] {
  return findSynergyPairsInTeam(agentIds, pairs).map((pair) => ({
    pair,
    level: getSynergyLevel(getDispatchCount(synergyPairKey(pair[0], pair[1]))),
  }));
}
