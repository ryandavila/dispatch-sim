import { describe, expect, it } from 'vitest';
import { loadAgents } from '../utils/dataLoader';
import {
  findSynergyPairsInTeam,
  getSynergyBonus,
  getSynergyLevel,
  getTeamSynergies,
  loadSynergyPairs,
  synergyPairKey,
} from './synergy';

describe('loadSynergyPairs', () => {
  it('should load the four synergy duos', () => {
    expect(loadSynergyPairs()).toEqual([
      ['sonar', 'malevola'],
      ['punch-up', 'coupe'],
      ['flambae', 'prism'],
      ['invisigal', 'golem'],
    ]);
  });

  it('should only reference agent ids that exist in agents.json', () => {
    const agentIds = new Set(loadAgents().map((agent) => agent.id));

    for (const [a, b] of loadSynergyPairs()) {
      expect(agentIds.has(a)).toBe(true);
      expect(agentIds.has(b)).toBe(true);
    }
  });
});

describe('synergyPairKey', () => {
  it('should be order-independent', () => {
    expect(synergyPairKey('sonar', 'malevola')).toBe(synergyPairKey('malevola', 'sonar'));
    expect(synergyPairKey('sonar', 'malevola')).toBe('malevola+sonar');
  });
});

describe('getSynergyLevel', () => {
  it('should be level 0 below 3 dispatches together', () => {
    expect(getSynergyLevel(0)).toBe(0);
    expect(getSynergyLevel(2)).toBe(0);
  });

  it('should gain a level every 3 dispatches together', () => {
    expect(getSynergyLevel(3)).toBe(1);
    expect(getSynergyLevel(5)).toBe(1);
    expect(getSynergyLevel(6)).toBe(2);
    expect(getSynergyLevel(9)).toBe(3);
  });

  it('should cap at level 3', () => {
    expect(getSynergyLevel(12)).toBe(3);
    expect(getSynergyLevel(100)).toBe(3);
  });
});

describe('getSynergyBonus', () => {
  it('should grant +5%/+10%/+15% at levels 1/2/3', () => {
    expect(getSynergyBonus(0)).toBe(0);
    expect(getSynergyBonus(1)).toBeCloseTo(0.05);
    expect(getSynergyBonus(2)).toBeCloseTo(0.1);
    expect(getSynergyBonus(3)).toBeCloseTo(0.15);
  });
});

describe('findSynergyPairsInTeam', () => {
  it('should find a duo when both members are on the team', () => {
    expect(findSynergyPairsInTeam(['sonar', 'malevola'])).toEqual([['sonar', 'malevola']]);
  });

  it('should ignore duos with only one member on the team', () => {
    expect(findSynergyPairsInTeam(['sonar', 'golem'])).toEqual([]);
  });

  it('should find multiple duos on a larger team', () => {
    expect(findSynergyPairsInTeam(['sonar', 'malevola', 'invisigal', 'golem'])).toEqual([
      ['sonar', 'malevola'],
      ['invisigal', 'golem'],
    ]);
  });

  it('should return no pairs for an empty team', () => {
    expect(findSynergyPairsInTeam([])).toEqual([]);
  });
});

describe('getTeamSynergies', () => {
  it('should resolve each pair to its level from dispatch counts', () => {
    const counts: Record<string, number> = {
      'malevola+sonar': 6,
      'golem+invisigal': 2,
    };

    const synergies = getTeamSynergies(
      ['sonar', 'malevola', 'invisigal', 'golem'],
      (pairKey) => counts[pairKey] ?? 0
    );

    expect(synergies).toEqual([
      { pair: ['sonar', 'malevola'], level: 2 },
      { pair: ['invisigal', 'golem'], level: 0 },
    ]);
  });
});
