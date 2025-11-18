import { describe, expect, it } from 'vitest';
import {
  applyExperience,
  BASE_STATS_PER_PILLAR,
  calculateTotalAllocatedPoints,
  createBaseStats,
  createCharacter,
  getExperienceForLevel,
  getExperienceForNextLevel,
  getExperienceToNextLevel,
  getLevelFromExperience,
  POINTS_PER_LEVEL,
  STARTING_BONUS_POINTS,
} from './character';
import { PILLARS } from './stats';

describe('Character System', () => {
  describe('createBaseStats', () => {
    it('should create stats with 1 point in each pillar', () => {
      const stats = createBaseStats();

      PILLARS.forEach((pillar) => {
        expect(stats[pillar]).toBe(BASE_STATS_PER_PILLAR);
      });
    });
  });

  describe('createCharacter', () => {
    it('should create a level 1 character with default stats', () => {
      const character = createCharacter('Test Agent', 1);

      expect(character.name).toBe('Test Agent');
      expect(character.level).toBe(1);
      expect(character.availablePoints).toBe(STARTING_BONUS_POINTS);

      // Check base stats
      PILLARS.forEach((pillar) => {
        expect(character.stats[pillar]).toBe(BASE_STATS_PER_PILLAR);
      });
    });

    it('should create a higher level character with correct available points', () => {
      const character = createCharacter('Veteran Agent', 5);

      expect(character.level).toBe(5);
      expect(character.availablePoints).toBe(STARTING_BONUS_POINTS + (5 - 1) * POINTS_PER_LEVEL);
    });

    it('should generate unique IDs for different characters', () => {
      const char1 = createCharacter('Agent 1');
      const char2 = createCharacter('Agent 2');

      expect(char1.id).not.toBe(char2.id);
    });
  });

  describe('calculateTotalAllocatedPoints', () => {
    it('should return 0 for base stats', () => {
      const stats = createBaseStats();
      const allocated = calculateTotalAllocatedPoints(stats);

      expect(allocated).toBe(0);
    });

    it('should correctly calculate allocated points above base', () => {
      const stats = {
        Combat: 3,
        Vigor: 2,
        Mobility: 1,
        Charisma: 4,
        Intellect: 1,
      };

      // Total: 11, Base: 5 (1 each), Allocated: 6
      const allocated = calculateTotalAllocatedPoints(stats);
      expect(allocated).toBe(6);
    });

    it('should handle stats with all points in one pillar', () => {
      const stats = {
        Combat: 10,
        Vigor: 1,
        Mobility: 1,
        Charisma: 1,
        Intellect: 1,
      };

      const allocated = calculateTotalAllocatedPoints(stats);
      expect(allocated).toBe(9);
    });
  });

  describe('Level Up System', () => {
    it('should grant correct points per level', () => {
      const level1 = createCharacter('Agent', 1);
      const level2 = createCharacter('Agent', 2);
      const level3 = createCharacter('Agent', 3);

      expect(level2.availablePoints - level1.availablePoints).toBe(POINTS_PER_LEVEL);
      expect(level3.availablePoints - level2.availablePoints).toBe(POINTS_PER_LEVEL);
    });
  });

  describe('Experience System', () => {
    describe('getExperienceForLevel', () => {
      it('should calculate XP required for each level using quadratic formula', () => {
        expect(getExperienceForLevel(1)).toBe(50); // 1² * 50 = 50
        expect(getExperienceForLevel(2)).toBe(200); // 2² * 50 = 200
        expect(getExperienceForLevel(3)).toBe(450); // 3² * 50 = 450
        expect(getExperienceForLevel(4)).toBe(800); // 4² * 50 = 800
        expect(getExperienceForLevel(5)).toBe(1250); // 5² * 50 = 1250
      });
    });

    describe('getExperienceForNextLevel', () => {
      it('should return XP needed for the next level', () => {
        expect(getExperienceForNextLevel(1)).toBe(200); // Level 2
        expect(getExperienceForNextLevel(2)).toBe(450); // Level 3
        expect(getExperienceForNextLevel(3)).toBe(800); // Level 4
      });
    });

    describe('getExperienceToNextLevel', () => {
      it('should calculate XP needed to reach next level from current XP', () => {
        // At level 1 (50 XP) with 100 XP total, need 100 more to reach level 2 (200 XP)
        expect(getExperienceToNextLevel(1, 100)).toBe(100);

        // At level 1 (50 XP) with 50 XP total (start), need 150 to reach level 2 (200 XP)
        expect(getExperienceToNextLevel(1, 50)).toBe(150);

        // At level 2 (200 XP) with 300 XP total, need 150 more to reach level 3 (450 XP)
        expect(getExperienceToNextLevel(2, 300)).toBe(150);
      });
    });

    describe('getLevelFromExperience', () => {
      it('should calculate level from total XP', () => {
        expect(getLevelFromExperience(0)).toBe(1); // Min level
        expect(getLevelFromExperience(50)).toBe(1);
        expect(getLevelFromExperience(199)).toBe(1);
        expect(getLevelFromExperience(200)).toBe(2);
        expect(getLevelFromExperience(449)).toBe(2);
        expect(getLevelFromExperience(450)).toBe(3);
        expect(getLevelFromExperience(799)).toBe(3);
        expect(getLevelFromExperience(800)).toBe(4);
      });
    });

    describe('applyExperience', () => {
      it('should add XP without leveling up', () => {
        const character = createCharacter('Test', 1);
        const updated = applyExperience(character, 50);

        expect(updated.experience).toBe(100); // 50 base + 50 gained
        expect(updated.level).toBe(1);
        expect(updated.availablePoints).toBe(character.availablePoints);
      });

      it('should level up when reaching XP threshold', () => {
        const character = createCharacter('Test', 1);
        // Need 150 more XP to reach level 2 (200 XP total)
        const updated = applyExperience(character, 150);

        expect(updated.experience).toBe(200);
        expect(updated.level).toBe(2);
        expect(updated.availablePoints).toBe(character.availablePoints + 1);
      });

      it('should level up multiple levels at once', () => {
        const character = createCharacter('Test', 1);
        // Need 400 more XP to reach level 3 (450 XP total)
        const updated = applyExperience(character, 400);

        expect(updated.experience).toBe(450);
        expect(updated.level).toBe(3);
        expect(updated.availablePoints).toBe(character.availablePoints + 2); // +1 for L2, +1 for L3
      });

      it('should preserve existing stats and properties', () => {
        const character = createCharacter('Test', 1);
        const updated = applyExperience(character, 100);

        expect(updated.name).toBe(character.name);
        expect(updated.stats).toEqual(character.stats);
        expect(updated.canFly).toBe(character.canFly);
      });

      it('should work with characters that already have levels', () => {
        const character = createCharacter('Test', 2);
        character.experience = 200; // At level 2 threshold
        // Need 250 more to reach level 3 (450 XP total)
        const updated = applyExperience(character, 250);

        expect(updated.level).toBe(3);
        expect(updated.experience).toBe(450);
        expect(updated.availablePoints).toBe(character.availablePoints + 1);
      });
    });

    describe('createCharacter with XP', () => {
      it('should initialize character with correct XP for their level', () => {
        const level1 = createCharacter('Test', 1);
        const level2 = createCharacter('Test', 2);
        const level3 = createCharacter('Test', 3);

        expect(level1.experience).toBe(50);
        expect(level2.experience).toBe(200);
        expect(level3.experience).toBe(450);
      });
    });
  });
});
