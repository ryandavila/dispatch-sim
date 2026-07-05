import { describe, expect, it } from 'vitest';
import type { StatPool } from '../types/stats';
import {
  applyProbabilityModifiers,
  calculateTeamSuccessProbability,
  combineTeamStats,
  type ProbabilityModifierInput,
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

describe('applyProbabilityModifiers', () => {
  const baseInput = (overrides: Partial<ProbabilityModifierInput>): ProbabilityModifierInput => ({
    baseProbability: 0.5,
    difficulty: 'Easy',
    synergyLevels: [],
    pityRemaining: 0,
    teamSize: 2,
    ...overrides,
  });

  it('should leave a mid-range probability untouched with no modifiers', () => {
    const result = applyProbabilityModifiers(baseInput({ baseProbability: 0.5 }));

    expect(result.probability).toBe(0.5);
    expect(result.synergyBonus).toBe(0);
    expect(result.pityApplies).toBe(false);
  });

  it('should keep an empty team at 0% regardless of other modifiers', () => {
    const result = applyProbabilityModifiers(
      baseInput({ baseProbability: 1, synergyLevels: [3], pityRemaining: 3, teamSize: 0 })
    );

    expect(result.probability).toBe(0);
    expect(result.synergyBonus).toBe(0);
    expect(result.pityApplies).toBe(false);
  });

  it('should cap Hard and Extreme missions at 85%', () => {
    expect(
      applyProbabilityModifiers(baseInput({ baseProbability: 1, difficulty: 'Hard' })).probability
    ).toBe(0.85);
    expect(
      applyProbabilityModifiers(baseInput({ baseProbability: 0.9, difficulty: 'Extreme' }))
        .probability
    ).toBe(0.85);
  });

  it('should not cap Easy or Medium missions', () => {
    expect(
      applyProbabilityModifiers(baseInput({ baseProbability: 1, difficulty: 'Easy' })).probability
    ).toBe(1);
    expect(
      applyProbabilityModifiers(baseInput({ baseProbability: 0.95, difficulty: 'Medium' }))
        .probability
    ).toBe(0.95);
  });

  it('should add +5%/+10%/+15% synergy for levels 1/2/3', () => {
    expect(
      applyProbabilityModifiers(baseInput({ baseProbability: 0.5, synergyLevels: [1] })).probability
    ).toBeCloseTo(0.55);
    expect(
      applyProbabilityModifiers(baseInput({ baseProbability: 0.5, synergyLevels: [2] })).probability
    ).toBeCloseTo(0.6);
    expect(
      applyProbabilityModifiers(baseInput({ baseProbability: 0.5, synergyLevels: [3] })).probability
    ).toBeCloseTo(0.65);
  });

  it('should stack synergy bonuses from multiple duos', () => {
    const result = applyProbabilityModifiers(
      baseInput({ baseProbability: 0.5, synergyLevels: [1, 2], teamSize: 4 })
    );

    expect(result.synergyBonus).toBeCloseTo(0.15);
    expect(result.probability).toBeCloseTo(0.65);
  });

  it('should apply the hard-call cap before synergy so synergy pushes past it', () => {
    // Capped to 0.85, then +10% synergy = 0.95
    const result = applyProbabilityModifiers(
      baseInput({ baseProbability: 1, difficulty: 'Hard', synergyLevels: [2] })
    );

    expect(result.probability).toBeCloseTo(0.95);
  });

  it('should never exceed 100% after synergy', () => {
    const result = applyProbabilityModifiers(
      baseInput({ baseProbability: 0.98, synergyLevels: [3] })
    );

    expect(result.probability).toBe(1);
  });

  it('should raise low probabilities to the 15% floor', () => {
    expect(applyProbabilityModifiers(baseInput({ baseProbability: 0.05 })).probability).toBe(0.15);
    expect(
      applyProbabilityModifiers(baseInput({ baseProbability: 0, teamSize: 1 })).probability
    ).toBe(0.15);
  });

  it('should flag pity only above 76% with charges remaining', () => {
    expect(
      applyProbabilityModifiers(baseInput({ baseProbability: 0.8, pityRemaining: 3 })).pityApplies
    ).toBe(true);
    // Exactly 76% is not protected
    expect(
      applyProbabilityModifiers(baseInput({ baseProbability: 0.76, pityRemaining: 3 })).pityApplies
    ).toBe(false);
    // No charges left
    expect(
      applyProbabilityModifiers(baseInput({ baseProbability: 0.9, pityRemaining: 0 })).pityApplies
    ).toBe(false);
  });

  it('should evaluate pity against the final modified probability', () => {
    // 0.74 base + 5% synergy = 0.79 > 76% — pity protects it
    const result = applyProbabilityModifiers(
      baseInput({ baseProbability: 0.74, synergyLevels: [1], pityRemaining: 1 })
    );

    expect(result.probability).toBeCloseTo(0.79);
    expect(result.pityApplies).toBe(true);
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

  it('should not use pity by default', () => {
    expect(resolveMissionOutcome(0.6, () => 0.5).pityUsed).toBe(false);
  });

  it('should force success on a would-be failure when pity applies', () => {
    // roll 0.9 >= 0.8 would fail, but pity guarantees success
    const outcome = resolveMissionOutcome(0.8, () => 0.9, true);

    expect(outcome.success).toBe(true);
    expect(outcome.pityUsed).toBe(true);
    expect(outcome.roll).toBe(0.9);
  });

  it('should mark pity as used even when the roll would have succeeded', () => {
    const outcome = resolveMissionOutcome(0.8, () => 0.1, true);

    expect(outcome.success).toBe(true);
    expect(outcome.pityUsed).toBe(true);
  });
});
