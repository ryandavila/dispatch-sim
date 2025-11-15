import type { StatPool } from './stats';
import { PILLARS } from './stats';

export interface Character {
  id: string;
  name: string;
  level: number;
  stats: StatPool;
  availablePoints: number;
  notes?: string;
  tags?: string[];
}

// Helper functions
export const BASE_STATS_PER_PILLAR = 1;
export const STARTING_BONUS_POINTS = 2;
export const POINTS_PER_LEVEL = 1;

export function createBaseStats(): StatPool {
  return {
    Combat: BASE_STATS_PER_PILLAR,
    Vigor: BASE_STATS_PER_PILLAR,
    Mobility: BASE_STATS_PER_PILLAR,
    Charisma: BASE_STATS_PER_PILLAR,
    Intellect: BASE_STATS_PER_PILLAR,
  };
}

export function calculateAvailablePoints(level: number, allocatedPoints: number): number {
  const totalPoints = STARTING_BONUS_POINTS + (level - 1) * POINTS_PER_LEVEL;
  return totalPoints - allocatedPoints;
}

export function calculateTotalAllocatedPoints(stats: StatPool): number {
  return (
    Object.values(stats).reduce((sum, value) => sum + value, 0) -
    BASE_STATS_PER_PILLAR * PILLARS.length
  );
}

export function createCharacter(name: string, level: number = 1): Character {
  return {
    id: crypto.randomUUID(),
    name,
    level,
    stats: createBaseStats(),
    availablePoints: STARTING_BONUS_POINTS + (level - 1) * POINTS_PER_LEVEL,
  };
}
