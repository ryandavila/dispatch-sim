import { describe, expect, it } from 'vitest';
import { createRng } from '../engine/rng';
import type { StatPool } from '../types/stats';
import {
  calculatePentagonIntersectionArea,
  calculatePentagonVertices,
  calculatePolygonArea,
  calculateSuccessProbability,
  fullyEncompasses,
} from './geometry';

function statPool(
  combat: number,
  vigor: number,
  mobility: number,
  charisma: number,
  intellect: number
): StatPool {
  return {
    Combat: combat,
    Vigor: vigor,
    Mobility: mobility,
    Charisma: charisma,
    Intellect: intellect,
  };
}

function pentagonArea(stats: StatPool, maxValue: number = 10): number {
  return calculatePolygonArea(calculatePentagonVertices(stats, maxValue));
}

function minPillarStats(stats1: StatPool, stats2: StatPool): StatPool {
  return statPool(
    Math.min(stats1.Combat, stats2.Combat),
    Math.min(stats1.Vigor, stats2.Vigor),
    Math.min(stats1.Mobility, stats2.Mobility),
    Math.min(stats1.Charisma, stats2.Charisma),
    Math.min(stats1.Intellect, stats2.Intellect)
  );
}

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

    it('should return 0 (not NaN) for a zero-stat character against a real mission', () => {
      const probability = calculateSuccessProbability(
        statPool(0, 0, 0, 0, 0),
        statPool(3, 4, 3, 2, 4)
      );
      expect(probability).toBe(0);
      expect(Number.isNaN(probability)).toBe(false);
    });

    it('should return 100% (not NaN) for a max-stat character against a max-stat mission', () => {
      const maxStats = statPool(10, 10, 10, 10, 10);
      const probability = calculateSuccessProbability(maxStats, maxStats);
      expect(probability).toBe(1.0);
    });

    it('should not produce NaN for a degenerate single-axis mission', () => {
      // Only one nonzero requirement -> mission pentagon has zero area
      const probability = calculateSuccessProbability(
        statPool(1, 1, 1, 1, 1),
        statPool(0, 0, 5, 0, 0)
      );
      expect(Number.isNaN(probability)).toBe(false);
      expect(probability).toBe(1.0);
    });

    it('should credit overlap beyond the per-pillar minimum pentagon when edges cross', () => {
      // Character exceeds the mission on Combat/Vigor/Intellect but falls short
      // on Mobility: the character's V->MOB edge crosses the mission's, so the
      // true intersection is strictly larger than the min-pillar pentagon.
      const characterStats = statPool(3, 3, 2, 2, 3);
      const missionRequirements = statPool(1, 1, 3, 2, 2);

      const probability = calculateSuccessProbability(characterStats, missionRequirements);
      const minPillarProbability =
        pentagonArea(minPillarStats(characterStats, missionRequirements)) /
        pentagonArea(missionRequirements);

      expect(probability).toBeGreaterThan(minPillarProbability);
      expect(probability).toBeLessThan(1.0);
    });

    it('should match the real-game calibration directionally (Golem vs Coupé)', () => {
      // Steam guide 3605192282: a call requiring MOB 3 / CHA 2 gives
      // Golem (MOB2/CHA2) 82% and Coupé (MOB3/CHA1) 70%. The other three
      // requirements are unpublished, so this is directional calibration:
      // Golem in the low 80s, Coupé around 70, Golem strictly higher.
      const missionRequirements = statPool(0, 3, 3, 2, 4);
      const golem = calculateSuccessProbability(statPool(4, 4, 2, 2, 4), missionRequirements);
      const coupe = calculateSuccessProbability(statPool(4, 4, 3, 1, 4), missionRequirements);

      expect(golem).toBeGreaterThan(0.79);
      expect(golem).toBeLessThan(0.85);
      expect(coupe).toBeGreaterThan(0.66);
      expect(coupe).toBeLessThan(0.73);
      expect(golem).toBeGreaterThan(coupe);
    });
  });

  describe('calculatePentagonIntersectionArea', () => {
    const randomStatPool = (rng: () => number): StatPool =>
      statPool(
        Math.floor(rng() * 11),
        Math.floor(rng() * 11),
        Math.floor(rng() * 11),
        Math.floor(rng() * 11),
        Math.floor(rng() * 11)
      );

    it('should equal the polygon area when both pentagons are identical', () => {
      const stats = statPool(4, 7, 2, 9, 5);
      const intersection = calculatePentagonIntersectionArea(stats, stats);
      expect(intersection).toBeCloseTo(pentagonArea(stats), 6);
    });

    it('should be symmetric in its arguments', () => {
      const rng = createRng(1337);
      for (let i = 0; i < 100; i++) {
        const statsA = randomStatPool(rng);
        const statsB = randomStatPool(rng);
        expect(calculatePentagonIntersectionArea(statsA, statsB)).toBeCloseTo(
          calculatePentagonIntersectionArea(statsB, statsA),
          6
        );
      }
    });

    it('should always lie between the min-pillar pentagon area and both source areas', () => {
      const rng = createRng(42);
      for (let i = 0; i < 200; i++) {
        const statsA = randomStatPool(rng);
        const statsB = randomStatPool(rng);

        const intersection = calculatePentagonIntersectionArea(statsA, statsB);
        const minPillarArea = pentagonArea(minPillarStats(statsA, statsB));

        expect(Number.isNaN(intersection)).toBe(false);
        expect(intersection).toBeGreaterThanOrEqual(minPillarArea - 1e-6);
        expect(intersection).toBeLessThanOrEqual(pentagonArea(statsA) + 1e-6);
        expect(intersection).toBeLessThanOrEqual(pentagonArea(statsB) + 1e-6);
      }
    });

    it('should return 0 when either pentagon has zero stats everywhere', () => {
      const zero = statPool(0, 0, 0, 0, 0);
      const stats = statPool(5, 5, 5, 5, 5);
      expect(calculatePentagonIntersectionArea(zero, stats)).toBe(0);
      expect(calculatePentagonIntersectionArea(stats, zero)).toBe(0);
      expect(calculatePentagonIntersectionArea(zero, zero)).toBe(0);
    });

    it('should contribute nothing in sectors adjacent to a zero-stat axis', () => {
      // One polygon pinched to the origin on an axis has no interior in the
      // two sectors touching that axis, even when the other polygon is large.
      const pinched = statPool(0, 5, 5, 5, 5);
      const full = statPool(10, 10, 10, 10, 10);
      const intersection = calculatePentagonIntersectionArea(pinched, full);
      expect(intersection).toBeCloseTo(pentagonArea(pinched), 6);
    });
  });
});
