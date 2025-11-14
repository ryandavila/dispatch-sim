import { describe, expect, it } from 'vitest';
import { createEmptyStats, getTotalStats, PILLARS } from './stats';

describe('Stats System', () => {
  describe('PILLARS', () => {
    it('should have exactly 5 pillars', () => {
      expect(PILLARS).toHaveLength(5);
    });

    it('should have pillars in correct order', () => {
      expect(PILLARS[0]).toBe('Combat');
      expect(PILLARS[1]).toBe('Vigor');
      expect(PILLARS[2]).toBe('Mobility');
      expect(PILLARS[3]).toBe('Charisma');
      expect(PILLARS[4]).toBe('Intellect');
    });
  });

  describe('createEmptyStats', () => {
    it('should create stats with all zeros', () => {
      const stats = createEmptyStats();

      expect(stats.Combat).toBe(0);
      expect(stats.Vigor).toBe(0);
      expect(stats.Mobility).toBe(0);
      expect(stats.Charisma).toBe(0);
      expect(stats.Intellect).toBe(0);
    });
  });

  describe('getTotalStats', () => {
    it('should return 0 for empty stats', () => {
      const stats = createEmptyStats();
      expect(getTotalStats(stats)).toBe(0);
    });

    it('should correctly sum all stat values', () => {
      const stats = {
        Combat: 3,
        Vigor: 5,
        Mobility: 2,
        Charisma: 4,
        Intellect: 6,
      };

      expect(getTotalStats(stats)).toBe(20);
    });

    it('should handle uniform stats', () => {
      const stats = {
        Combat: 5,
        Vigor: 5,
        Mobility: 5,
        Charisma: 5,
        Intellect: 5,
      };

      expect(getTotalStats(stats)).toBe(25);
    });
  });
});
