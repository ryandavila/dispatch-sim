import { describe, expect, it } from 'vitest';
import {
  BASE_STATS_PER_PILLAR,
  calculateTotalAllocatedPoints,
  createBaseStats,
  createCharacter,
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
});
