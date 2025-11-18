import type { StatPool } from './stats';
import { PILLARS } from './stats';

export interface Character {
  id: string;
  name: string;
  level: number;
  experience: number; // Current XP
  stats: StatPool;
  availablePoints: number;
  notes?: string;
  tags?: string[];
  canFly: boolean;
  isFlightLicensed: boolean;
  restTime: number; // Time units needed to rest after a mission
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

/**
 * Calculate XP required to reach a specific level (quadratic curve)
 * Formula: level² * 50
 */
export function getExperienceForLevel(level: number): number {
  return level * level * 50;
}

/**
 * Calculate XP required to level up from current level
 */
export function getExperienceForNextLevel(currentLevel: number): number {
  return getExperienceForLevel(currentLevel + 1);
}

/**
 * Calculate how much XP is needed to reach the next level from current XP
 */
export function getExperienceToNextLevel(currentLevel: number, currentXP: number): number {
  const xpForNextLevel = getExperienceForNextLevel(currentLevel);
  const xpForCurrentLevel = getExperienceForLevel(currentLevel);
  const xpIntoCurrentLevel = currentXP - xpForCurrentLevel;
  const xpNeededForLevel = xpForNextLevel - xpForCurrentLevel;
  return xpNeededForLevel - xpIntoCurrentLevel;
}

/**
 * Calculate level from total XP
 */
export function getLevelFromExperience(xp: number): number {
  // Solve: level² * 50 = xp
  // level = √(xp / 50)
  return Math.floor(Math.sqrt(xp / 50)) || 1;
}

/**
 * Apply experience to a character and handle level ups
 * Returns updated character with new level, XP, and available points
 */
export function applyExperience(character: Character, xpGained: number): Character {
  const newXP = character.experience + xpGained;
  const newLevel = getLevelFromExperience(newXP);
  const levelsGained = newLevel - character.level;

  if (levelsGained > 0) {
    return {
      ...character,
      experience: newXP,
      level: newLevel,
      availablePoints: character.availablePoints + levelsGained * POINTS_PER_LEVEL,
    };
  }

  return {
    ...character,
    experience: newXP,
  };
}

export function createCharacter(name: string, level: number = 1): Character {
  return {
    id: crypto.randomUUID(),
    name,
    level,
    experience: getExperienceForLevel(level), // Start with XP for current level
    stats: createBaseStats(),
    availablePoints: STARTING_BONUS_POINTS + (level - 1) * POINTS_PER_LEVEL,
    canFly: false,
    isFlightLicensed: false,
    restTime: 5, // Default rest time
  };
}
