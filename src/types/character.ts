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
  xpToLevel2?: number; // Per-agent override for XP required to reach level 2 (cheaper curves)
  fixedRank?: boolean; // Agent never gains XP or levels (e.g. Phenomaman)
}

// Helper functions
export const BASE_STATS_PER_PILLAR = 1;
export const STARTING_BONUS_POINTS = 2;
export const POINTS_PER_LEVEL = 1;

// XP curve: level 2 costs BASE_XP_TO_LEVEL_2 (or the agent's xpToLevel2 override),
// and each subsequent level costs XP_COST_INCREMENT more than the last.
export const BASE_XP_TO_LEVEL_2 = 1000;
export const XP_COST_INCREMENT = 300;

// XP accrual stops once an agent has earned the maximum number of skill points.
export const MAX_EARNED_SKILL_POINTS = 9;
export const MAX_LEVEL = 1 + MAX_EARNED_SKILL_POINTS / POINTS_PER_LEVEL; // 10

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
 * XP cost of a single level-up from `currentLevel` to `currentLevel + 1`.
 * The first level-up costs `xpToLevel2`, each subsequent one 300 more than the last.
 */
export function getLevelUpCost(
  currentLevel: number,
  xpToLevel2: number = BASE_XP_TO_LEVEL_2
): number {
  return xpToLevel2 + (currentLevel - 1) * XP_COST_INCREMENT;
}

/**
 * Total XP required to reach a specific level.
 * Level 1 is 0 XP; level N is the sum of every level-up cost below it:
 * xpToLevel2 + (xpToLevel2 + 300) + (xpToLevel2 + 600) + ...
 */
export function getExperienceForLevel(
  level: number,
  xpToLevel2: number = BASE_XP_TO_LEVEL_2
): number {
  const levelUps = Math.max(0, level - 1);
  return levelUps * xpToLevel2 + (XP_COST_INCREMENT * levelUps * (levelUps - 1)) / 2;
}

/**
 * Total XP required to reach the next level from the current one
 */
export function getExperienceForNextLevel(
  currentLevel: number,
  xpToLevel2: number = BASE_XP_TO_LEVEL_2
): number {
  return getExperienceForLevel(currentLevel + 1, xpToLevel2);
}

/**
 * Calculate how much XP is needed to reach the next level from current XP
 */
export function getExperienceToNextLevel(
  currentLevel: number,
  currentXP: number,
  xpToLevel2: number = BASE_XP_TO_LEVEL_2
): number {
  return getExperienceForNextLevel(currentLevel, xpToLevel2) - currentXP;
}

/**
 * Calculate level from total XP (capped at MAX_LEVEL)
 */
export function getLevelFromExperience(
  xp: number,
  xpToLevel2: number = BASE_XP_TO_LEVEL_2
): number {
  let level = 1;
  while (level < MAX_LEVEL && xp >= getExperienceForLevel(level + 1, xpToLevel2)) {
    level++;
  }
  return level;
}

/**
 * Maximum XP an agent can ever accrue (the total needed to earn all skill points)
 */
export function getExperienceCap(xpToLevel2: number = BASE_XP_TO_LEVEL_2): number {
  return getExperienceForLevel(MAX_LEVEL, xpToLevel2);
}

/**
 * Whether an agent can no longer gain XP (fixed rank, or all skill points earned)
 */
export function isExperienceCapped(character: Character): boolean {
  return (
    character.fixedRank === true ||
    character.level >= MAX_LEVEL ||
    character.experience >= getExperienceCap(character.xpToLevel2)
  );
}

/**
 * Apply experience to a character and handle level ups.
 * Fixed-rank agents never gain XP or levels; everyone else stops accruing XP
 * once they have earned MAX_EARNED_SKILL_POINTS skill points (level MAX_LEVEL).
 * Returns updated character with new level, XP, and available points.
 */
export function applyExperience(character: Character, xpGained: number): Character {
  if (character.fixedRank) {
    return character;
  }

  const newXP = Math.min(character.experience + xpGained, getExperienceCap(character.xpToLevel2));
  const newLevel = getLevelFromExperience(newXP, character.xpToLevel2);
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
