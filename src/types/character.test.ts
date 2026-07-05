import { describe, expect, it } from 'vitest';
import {
  applyExperience,
  BASE_STATS_PER_PILLAR,
  calculateTotalAllocatedPoints,
  createBaseStats,
  createCharacter,
  getExperienceCap,
  getExperienceForLevel,
  getExperienceForNextLevel,
  getExperienceToNextLevel,
  getLevelFromExperience,
  getLevelUpCost,
  isExperienceCapped,
  MAX_EARNED_SKILL_POINTS,
  MAX_LEVEL,
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

    it('should initialize character with correct XP for their level', () => {
      expect(createCharacter('Test', 1).experience).toBe(0);
      expect(createCharacter('Test', 2).experience).toBe(1000);
      expect(createCharacter('Test', 3).experience).toBe(2300);
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
    describe('getLevelUpCost', () => {
      it('should cost 1000 XP for the first level-up, +300 each subsequent level', () => {
        expect(getLevelUpCost(1)).toBe(1000);
        expect(getLevelUpCost(2)).toBe(1300);
        expect(getLevelUpCost(3)).toBe(1600);
        expect(getLevelUpCost(4)).toBe(1900);
      });

      it('should honor a per-agent base cost, still growing +300 per level', () => {
        expect(getLevelUpCost(1, 700)).toBe(700); // Invisigal
        expect(getLevelUpCost(2, 700)).toBe(1000);
        expect(getLevelUpCost(1, 400)).toBe(400); // Waterboy
        expect(getLevelUpCost(2, 400)).toBe(700);
        expect(getLevelUpCost(3, 400)).toBe(1000);
      });
    });

    describe('getExperienceForLevel', () => {
      it('should calculate total XP required for each level', () => {
        expect(getExperienceForLevel(1)).toBe(0);
        expect(getExperienceForLevel(2)).toBe(1000); // 1000
        expect(getExperienceForLevel(3)).toBe(2300); // 1000 + 1300
        expect(getExperienceForLevel(4)).toBe(3900); // + 1600
        expect(getExperienceForLevel(5)).toBe(5800); // + 1900
        expect(getExperienceForLevel(10)).toBe(19800);
      });

      it('should apply a per-agent cheaper base curve', () => {
        // Invisigal: 700 to level 2, increments still grow +300
        expect(getExperienceForLevel(2, 700)).toBe(700);
        expect(getExperienceForLevel(3, 700)).toBe(1700); // 700 + 1000
        expect(getExperienceForLevel(4, 700)).toBe(3000); // + 1300

        // Waterboy: 400 to level 2
        expect(getExperienceForLevel(2, 400)).toBe(400);
        expect(getExperienceForLevel(3, 400)).toBe(1100); // 400 + 700
        expect(getExperienceForLevel(4, 400)).toBe(2100); // + 1000
      });

      it('should return 0 for level 1 and below', () => {
        expect(getExperienceForLevel(1)).toBe(0);
        expect(getExperienceForLevel(0)).toBe(0);
      });
    });

    describe('getExperienceForNextLevel', () => {
      it('should return total XP needed for the next level', () => {
        expect(getExperienceForNextLevel(1)).toBe(1000); // Level 2
        expect(getExperienceForNextLevel(2)).toBe(2300); // Level 3
        expect(getExperienceForNextLevel(3)).toBe(3900); // Level 4
      });

      it('should honor the per-agent base cost', () => {
        expect(getExperienceForNextLevel(1, 700)).toBe(700);
        expect(getExperienceForNextLevel(1, 400)).toBe(400);
      });
    });

    describe('getExperienceToNextLevel', () => {
      it('should calculate XP needed to reach next level from current XP', () => {
        // At level 1 with 0 XP, need the full 1000
        expect(getExperienceToNextLevel(1, 0)).toBe(1000);

        // At level 1 with 600 XP, need 400 more
        expect(getExperienceToNextLevel(1, 600)).toBe(400);

        // At level 2 (1000 XP) with 1500 XP total, need 800 more to reach level 3 (2300 XP)
        expect(getExperienceToNextLevel(2, 1500)).toBe(800);
      });

      it('should honor the per-agent base cost', () => {
        expect(getExperienceToNextLevel(1, 100, 400)).toBe(300);
        expect(getExperienceToNextLevel(2, 700, 700)).toBe(1000); // level 3 at 1700
      });
    });

    describe('getLevelFromExperience', () => {
      it('should calculate level from total XP', () => {
        expect(getLevelFromExperience(0)).toBe(1);
        expect(getLevelFromExperience(999)).toBe(1);
        expect(getLevelFromExperience(1000)).toBe(2);
        expect(getLevelFromExperience(2299)).toBe(2);
        expect(getLevelFromExperience(2300)).toBe(3);
        expect(getLevelFromExperience(3899)).toBe(3);
        expect(getLevelFromExperience(3900)).toBe(4);
      });

      it('should honor the per-agent base cost', () => {
        expect(getLevelFromExperience(699, 700)).toBe(1);
        expect(getLevelFromExperience(700, 700)).toBe(2);
        expect(getLevelFromExperience(1700, 700)).toBe(3);
        expect(getLevelFromExperience(400, 400)).toBe(2);
        expect(getLevelFromExperience(1100, 400)).toBe(3);
      });

      it('should cap at MAX_LEVEL no matter how much XP', () => {
        expect(getLevelFromExperience(getExperienceCap())).toBe(MAX_LEVEL);
        expect(getLevelFromExperience(1_000_000)).toBe(MAX_LEVEL);
      });
    });

    describe('applyExperience', () => {
      it('should add XP without leveling up', () => {
        const character = createCharacter('Test', 1);
        const updated = applyExperience(character, 500);

        expect(updated.experience).toBe(500);
        expect(updated.level).toBe(1);
        expect(updated.availablePoints).toBe(character.availablePoints);
      });

      it('should level up when reaching XP threshold', () => {
        const character = createCharacter('Test', 1);
        const updated = applyExperience(character, 1000);

        expect(updated.experience).toBe(1000);
        expect(updated.level).toBe(2);
        expect(updated.availablePoints).toBe(character.availablePoints + 1);
      });

      it('should level up multiple levels at once', () => {
        const character = createCharacter('Test', 1);
        // Level 3 requires 2300 XP total
        const updated = applyExperience(character, 2300);

        expect(updated.experience).toBe(2300);
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
        expect(character.experience).toBe(1000);
        // Need 1300 more to reach level 3 (2300 XP total)
        const updated = applyExperience(character, 1300);

        expect(updated.level).toBe(3);
        expect(updated.experience).toBe(2300);
        expect(updated.availablePoints).toBe(character.availablePoints + 1);
      });

      it('should use the per-agent cheaper curve when set', () => {
        const character = { ...createCharacter('Waterboy', 1), xpToLevel2: 400 };
        const updated = applyExperience(character, 400);

        expect(updated.level).toBe(2);
        expect(updated.availablePoints).toBe(character.availablePoints + 1);

        // 700 more reaches level 3 (1100 total)
        const updated2 = applyExperience(updated, 700);
        expect(updated2.level).toBe(3);
      });

      it('should stop XP accrual once all skill points are earned', () => {
        const character = createCharacter('Test', 1);
        const capped = applyExperience(character, 1_000_000);

        expect(capped.level).toBe(MAX_LEVEL);
        expect(capped.experience).toBe(getExperienceCap());
        // Earned exactly MAX_EARNED_SKILL_POINTS from level-ups
        expect(capped.availablePoints).toBe(
          character.availablePoints + MAX_EARNED_SKILL_POINTS * POINTS_PER_LEVEL
        );

        // Further XP is ignored entirely
        const after = applyExperience(capped, 5000);
        expect(after.experience).toBe(getExperienceCap());
        expect(after.level).toBe(MAX_LEVEL);
        expect(after.availablePoints).toBe(capped.availablePoints);
      });

      it('should cap accrual using the per-agent curve cap', () => {
        const character = { ...createCharacter('Invisigal', 1), xpToLevel2: 700 };
        const capped = applyExperience(character, 1_000_000);

        expect(capped.level).toBe(MAX_LEVEL);
        expect(capped.experience).toBe(getExperienceCap(700));
      });

      it('should never gain XP or levels for fixed-rank agents', () => {
        const character = { ...createCharacter('Phenomaman', 1), fixedRank: true };
        const updated = applyExperience(character, 10_000);

        expect(updated).toBe(character); // Unchanged, same reference
        expect(updated.experience).toBe(character.experience);
        expect(updated.level).toBe(character.level);
        expect(updated.availablePoints).toBe(character.availablePoints);
      });
    });

    describe('experience cap helpers', () => {
      it('getExperienceCap should be the XP needed for MAX_LEVEL', () => {
        expect(getExperienceCap()).toBe(getExperienceForLevel(MAX_LEVEL));
        expect(getExperienceCap()).toBe(19800);
        expect(getExperienceCap(700)).toBe(getExperienceForLevel(MAX_LEVEL, 700));
      });

      it('isExperienceCapped should detect fixed-rank and maxed agents', () => {
        const fresh = createCharacter('Test', 1);
        expect(isExperienceCapped(fresh)).toBe(false);

        const fixed = { ...fresh, fixedRank: true };
        expect(isExperienceCapped(fixed)).toBe(true);

        const maxed = applyExperience(fresh, 1_000_000);
        expect(isExperienceCapped(maxed)).toBe(true);
      });
    });
  });
});
