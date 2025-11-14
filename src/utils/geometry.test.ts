import { describe, expect, it } from 'vitest';
import type { StatPool } from '../types/stats';
import {
  calculatePentagonVertices,
  calculatePolygonArea,
  calculateSuccessProbability,
  combineStats,
  fullyEncompasses,
} from './geometry';

describe('Geometry Utilities', () => {
  describe('calculatePentagonVertices', () => {
    it('should calculate 5 vertices for a pentagon', () => {
      const stats: StatPool = {
        Combat: 5,
        Vigor: 5,
        Mobility: 5,
        Charisma: 5,
        Intellect: 5,
      };

      const vertices = calculatePentagonVertices(stats, 10, 100);
      expect(vertices).toHaveLength(5);
    });

    it('should place vertices at center for zero stats', () => {
      const stats: StatPool = {
        Combat: 0,
        Vigor: 0,
        Mobility: 0,
        Charisma: 0,
        Intellect: 0,
      };

      const vertices = calculatePentagonVertices(stats, 10, 100);
      vertices.forEach((vertex) => {
        expect(vertex.x).toBeCloseTo(0, 5);
        expect(vertex.y).toBeCloseTo(0, 5);
      });
    });

    it('should place first vertex at top (negative y)', () => {
      const stats: StatPool = {
        Combat: 10,
        Vigor: 0,
        Mobility: 0,
        Charisma: 0,
        Intellect: 0,
      };

      const vertices = calculatePentagonVertices(stats, 10, 100);
      // First vertex should be at top (0, -100)
      expect(vertices[0].x).toBeCloseTo(0, 5);
      expect(vertices[0].y).toBeCloseTo(-100, 5);
    });
  });

  describe('calculatePolygonArea', () => {
    it('should return 0 for degenerate polygon', () => {
      const vertices = [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 },
      ];

      const area = calculatePolygonArea(vertices);
      expect(area).toBe(0);
    });

    it('should calculate area of a square correctly', () => {
      const vertices = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ];

      const area = calculatePolygonArea(vertices);
      expect(area).toBe(100);
    });

    it('should calculate area of a triangle correctly', () => {
      const vertices = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 5, y: 10 },
      ];

      const area = calculatePolygonArea(vertices);
      expect(area).toBe(50);
    });
  });

  describe('fullyEncompasses', () => {
    it('should return true when all stats meet or exceed requirements', () => {
      const characterStats: StatPool = {
        Combat: 5,
        Vigor: 5,
        Mobility: 5,
        Charisma: 5,
        Intellect: 5,
      };

      const missionRequirements: StatPool = {
        Combat: 3,
        Vigor: 3,
        Mobility: 3,
        Charisma: 3,
        Intellect: 3,
      };

      expect(fullyEncompasses(characterStats, missionRequirements)).toBe(true);
    });

    it('should return false when any stat is below requirements', () => {
      const characterStats: StatPool = {
        Combat: 5,
        Vigor: 5,
        Mobility: 2, // Below requirement
        Charisma: 5,
        Intellect: 5,
      };

      const missionRequirements: StatPool = {
        Combat: 3,
        Vigor: 3,
        Mobility: 3,
        Charisma: 3,
        Intellect: 3,
      };

      expect(fullyEncompasses(characterStats, missionRequirements)).toBe(false);
    });

    it('should return true when stats exactly match requirements', () => {
      const stats: StatPool = {
        Combat: 3,
        Vigor: 3,
        Mobility: 3,
        Charisma: 3,
        Intellect: 3,
      };

      expect(fullyEncompasses(stats, stats)).toBe(true);
    });
  });

  describe('combineStats', () => {
    it('should take max of each pillar from multiple stat pools', () => {
      const stats1: StatPool = {
        Combat: 5,
        Vigor: 2,
        Mobility: 8,
        Charisma: 3,
        Intellect: 1,
      };

      const stats2: StatPool = {
        Combat: 3,
        Vigor: 7,
        Mobility: 4,
        Charisma: 6,
        Intellect: 2,
      };

      const combined = combineStats(stats1, stats2);

      expect(combined.Combat).toBe(5);
      expect(combined.Vigor).toBe(7);
      expect(combined.Mobility).toBe(8);
      expect(combined.Charisma).toBe(6);
      expect(combined.Intellect).toBe(2);
    });

    it('should handle empty array by returning zero stats', () => {
      const combined = combineStats();

      expect(combined.Combat).toBe(0);
      expect(combined.Vigor).toBe(0);
      expect(combined.Mobility).toBe(0);
      expect(combined.Charisma).toBe(0);
      expect(combined.Intellect).toBe(0);
    });

    it('should work with single stat pool', () => {
      const stats: StatPool = {
        Combat: 5,
        Vigor: 5,
        Mobility: 5,
        Charisma: 5,
        Intellect: 5,
      };

      const combined = combineStats(stats);
      expect(combined).toEqual(stats);
    });
  });

  describe('calculateSuccessProbability', () => {
    it('should return 100% when character fully encompasses mission', () => {
      const characterStats: StatPool = {
        Combat: 8,
        Vigor: 8,
        Mobility: 8,
        Charisma: 8,
        Intellect: 8,
      };

      const missionRequirements: StatPool = {
        Combat: 5,
        Vigor: 5,
        Mobility: 5,
        Charisma: 5,
        Intellect: 5,
      };

      const probability = calculateSuccessProbability(characterStats, missionRequirements);
      expect(probability).toBe(1.0);
    });

    it('should return 100% for zero mission requirements', () => {
      const characterStats: StatPool = {
        Combat: 3,
        Vigor: 3,
        Mobility: 3,
        Charisma: 3,
        Intellect: 3,
      };

      const missionRequirements: StatPool = {
        Combat: 0,
        Vigor: 0,
        Mobility: 0,
        Charisma: 0,
        Intellect: 0,
      };

      const probability = calculateSuccessProbability(characterStats, missionRequirements);
      expect(probability).toBe(1.0);
    });

    it('should return partial probability when only some stats meet requirements', () => {
      const characterStats: StatPool = {
        Combat: 5,
        Vigor: 5,
        Mobility: 2,
        Charisma: 2,
        Intellect: 2,
      };

      const missionRequirements: StatPool = {
        Combat: 5,
        Vigor: 5,
        Mobility: 5,
        Charisma: 5,
        Intellect: 5,
      };

      const probability = calculateSuccessProbability(characterStats, missionRequirements);
      expect(probability).toBeGreaterThan(0);
      expect(probability).toBeLessThan(1.0);
    });

    it('should never exceed 100% probability', () => {
      const characterStats: StatPool = {
        Combat: 10,
        Vigor: 10,
        Mobility: 10,
        Charisma: 10,
        Intellect: 10,
      };

      const missionRequirements: StatPool = {
        Combat: 1,
        Vigor: 1,
        Mobility: 1,
        Charisma: 1,
        Intellect: 1,
      };

      const probability = calculateSuccessProbability(characterStats, missionRequirements);
      expect(probability).toBeLessThanOrEqual(1.0);
    });

    it('should handle matching stats giving 100% success', () => {
      const stats: StatPool = {
        Combat: 5,
        Vigor: 5,
        Mobility: 5,
        Charisma: 5,
        Intellect: 5,
      };

      const probability = calculateSuccessProbability(stats, stats);
      expect(probability).toBe(1.0);
    });
  });
});
