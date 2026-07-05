import { describe, expect, it } from 'vitest';
import type { StatPool } from '../types/stats';
import {
  addInjury,
  applyInjuryPenalty,
  DOWNED_INJURY_COUNT,
  getEffectiveStats,
  getInjuryCount,
  isDowned,
  isInjured,
} from './injury';

const stats: StatPool = { Combat: 5, Vigor: 3, Mobility: 1, Charisma: 2, Intellect: 4 };

describe('getInjuryCount', () => {
  it('treats a missing injuryCount as healthy', () => {
    expect(getInjuryCount({})).toBe(0);
    expect(getInjuryCount({ injuryCount: undefined })).toBe(0);
  });

  it('returns the stored injury count', () => {
    expect(getInjuryCount({ injuryCount: 1 })).toBe(1);
    expect(getInjuryCount({ injuryCount: 2 })).toBe(2);
  });
});

describe('isInjured / isDowned', () => {
  it('is neither injured nor downed when healthy', () => {
    expect(isInjured({ injuryCount: 0 })).toBe(false);
    expect(isDowned({ injuryCount: 0 })).toBe(false);
  });

  it('is injured but not downed after one injury', () => {
    expect(isInjured({ injuryCount: 1 })).toBe(true);
    expect(isDowned({ injuryCount: 1 })).toBe(false);
  });

  it('is downed after two injuries', () => {
    expect(isInjured({ injuryCount: 2 })).toBe(true);
    expect(isDowned({ injuryCount: 2 })).toBe(true);
  });
});

describe('addInjury', () => {
  it('increments the injury count', () => {
    expect(addInjury(0)).toBe(1);
    expect(addInjury(1)).toBe(2);
  });

  it('caps at the downed threshold', () => {
    expect(addInjury(DOWNED_INJURY_COUNT)).toBe(DOWNED_INJURY_COUNT);
  });
});

describe('applyInjuryPenalty', () => {
  it('returns stats unchanged when healthy', () => {
    expect(applyInjuryPenalty(stats, 0)).toEqual(stats);
  });

  it('subtracts one point from every pillar per injury', () => {
    expect(applyInjuryPenalty(stats, 1)).toEqual({
      Combat: 4,
      Vigor: 2,
      Mobility: 1, // floored
      Charisma: 1,
      Intellect: 3,
    });
  });

  it('floors every pillar at 1', () => {
    expect(applyInjuryPenalty(stats, 2)).toEqual({
      Combat: 3,
      Vigor: 1,
      Mobility: 1,
      Charisma: 1,
      Intellect: 2,
    });
  });

  it('does not mutate the input stats', () => {
    const input = { ...stats };
    applyInjuryPenalty(input, 2);
    expect(input).toEqual(stats);
  });
});

describe('getEffectiveStats', () => {
  it('returns allocated stats for a healthy agent', () => {
    expect(getEffectiveStats({ stats })).toEqual(stats);
    expect(getEffectiveStats({ stats, injuryCount: 0 })).toEqual(stats);
  });

  it('applies the injury penalty for an injured agent', () => {
    expect(getEffectiveStats({ stats, injuryCount: 1 }).Combat).toBe(4);
    expect(getEffectiveStats({ stats, injuryCount: 1 }).Mobility).toBe(1);
  });
});
