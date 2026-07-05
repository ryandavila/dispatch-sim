import { describe, expect, it } from 'vitest';
import type { StatPool } from '../types/stats';
import {
  calculateTeamSuccessProbability,
  combineTeamStats,
  resolveMissionOutcome,
} from './resolution';

describe('combineTeamStats', () => {
  it('should sum each pillar across stat pools', () => {
    const stats1: StatPool = {
      Combat: 5,
      Vigor: 2,
      Mobility: 3,
      Charisma: 3,
      Intellect: 1,
    };

    const stats2: StatPool = {
      Combat: 3,
      Vigor: 4,
      Mobility: 4,
      Charisma: 2,
      Intellect: 2,
    };

    const combined = combineTeamStats([stats1, stats2]);

    expect(combined.Combat).toBe(8);
    expect(combined.Vigor).toBe(6);
    expect(combined.Mobility).toBe(7);
    expect(combined.Charisma).toBe(5);
    expect(combined.Intellect).toBe(3);
  });

  it('should cap each pillar at 10', () => {
    const stats1: StatPool = {
      Combat: 7,
      Vigor: 6,
      Mobility: 5,
      Charisma: 5,
      Intellect: 9,
    };

    const stats2: StatPool = {
      Combat: 8,
      Vigor: 4,
      Mobility: 5,
      Charisma: 6,
      Intellect: 2,
    };

    const combined = combineTeamStats([stats1, stats2]);

    expect(combined.Combat).toBe(10);
    expect(combined.Vigor).toBe(10);
    expect(combined.Mobility).toBe(10);
    expect(combined.Charisma).toBe(10);
    expect(combined.Intellect).toBe(10);
  });

  it('should return the same values for a single stat pool', () => {
    const stats: StatPool = {
      Combat: 5,
      Vigor: 5,
      Mobility: 5,
      Charisma: 5,
      Intellect: 5,
    };

    expect(combineTeamStats([stats])).toEqual(stats);
  });

  it('should return zero stats for an empty team', () => {
    const combined = combineTeamStats([]);

    expect(combined.Combat).toBe(0);
    expect(combined.Vigor).toBe(0);
    expect(combined.Mobility).toBe(0);
    expect(combined.Charisma).toBe(0);
    expect(combined.Intellect).toBe(0);
  });
});

describe('calculateTeamSuccessProbability', () => {
  it('should return 0% for empty team', () => {
    const missionRequirements: StatPool = {
      Combat: 5,
      Vigor: 5,
      Mobility: 5,
      Charisma: 5,
      Intellect: 5,
    };

    expect(calculateTeamSuccessProbability([], missionRequirements)).toBe(0);
  });

  it('should return 100% when two weak agents stack to meet requirements', () => {
    const agent1: StatPool = {
      Combat: 3,
      Vigor: 2,
      Mobility: 3,
      Charisma: 2,
      Intellect: 3,
    };

    const agent2: StatPool = {
      Combat: 2,
      Vigor: 3,
      Mobility: 2,
      Charisma: 3,
      Intellect: 2,
    };

    const missionRequirements: StatPool = {
      Combat: 5,
      Vigor: 5,
      Mobility: 5,
      Charisma: 5,
      Intellect: 5,
    };

    // Sums: Combat 5, Vigor 5, Mobility 5, Charisma 5, Intellect 5 — exact match
    expect(calculateTeamSuccessProbability([agent1, agent2], missionRequirements)).toBe(1.0);
  });

  it('should return partial probability when the team falls short', () => {
    const agent: StatPool = {
      Combat: 3,
      Vigor: 2,
      Mobility: 4,
      Charisma: 1,
      Intellect: 2,
    };

    const missionRequirements: StatPool = {
      Combat: 8,
      Vigor: 8,
      Mobility: 8,
      Charisma: 8,
      Intellect: 8,
    };

    const probability = calculateTeamSuccessProbability([agent], missionRequirements);
    expect(probability).toBeGreaterThan(0);
    expect(probability).toBeLessThan(1.0);
  });

  it('should never exceed 100% probability', () => {
    const superAgent: StatPool = {
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

    expect(calculateTeamSuccessProbability([superAgent], missionRequirements)).toBeLessThanOrEqual(
      1.0
    );
  });
});

describe('resolveMissionOutcome', () => {
  it('should succeed when the roll is below the probability', () => {
    const outcome = resolveMissionOutcome(0.6, () => 0.5);

    expect(outcome.success).toBe(true);
    expect(outcome.probability).toBe(0.6);
    expect(outcome.roll).toBe(0.5);
  });

  it('should fail when the roll is at or above the probability', () => {
    const outcome = resolveMissionOutcome(0.4, () => 0.5);

    expect(outcome.success).toBe(false);
    expect(outcome.probability).toBe(0.4);
    expect(outcome.roll).toBe(0.5);
  });

  it('should always succeed at 100% probability', () => {
    // rng values are in [0, 1), so any roll is below 1.0
    expect(resolveMissionOutcome(1.0, () => 0.999999).success).toBe(true);
    expect(resolveMissionOutcome(1.0, () => 0).success).toBe(true);
  });

  it('should always fail at 0% probability', () => {
    expect(resolveMissionOutcome(0, () => 0).success).toBe(false);
    expect(resolveMissionOutcome(0, () => 0.999999).success).toBe(false);
  });
});
