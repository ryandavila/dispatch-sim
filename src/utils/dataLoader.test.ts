import { describe, expect, it } from 'vitest';
import {
  loadAgents,
  loadMissions,
  loadSynergies,
  validateAgents,
  validateMissions,
  validateSynergies,
} from './dataLoader';

const validAgent = {
  id: 'test-agent',
  name: 'Test Agent',
  level: 1,
  experience: 50,
  stats: { Combat: 2, Vigor: 2, Mobility: 2, Charisma: 2, Intellect: 2 },
  availablePoints: 0,
  canFly: false,
  isFlightLicensed: false,
  restTime: 5,
};

const validMission = {
  id: 'test-mission',
  name: 'Test Mission',
  description: 'A test mission',
  difficulty: 'Easy',
  maxAgents: 2,
  requirements: { Combat: 1, Vigor: 1, Mobility: 1, Charisma: 1, Intellect: 1 },
  rewards: { experience: 100 },
  travelTime: 2,
  missionDuration: 4,
};

describe('loadAgents / loadMissions', () => {
  it('loads and validates the real agents data file', () => {
    const agents = loadAgents();
    expect(agents.length).toBeGreaterThan(0);
    for (const agent of agents) {
      expect(agent.id).toBeTruthy();
      expect(agent.stats.Combat).toBeGreaterThanOrEqual(0);
    }
  });

  it('loads and validates the real missions data file', () => {
    const missions = loadMissions();
    expect(missions.length).toBeGreaterThan(0);
    for (const mission of missions) {
      expect(['Easy', 'Medium', 'Hard', 'Extreme']).toContain(mission.difficulty);
    }
  });

  it('preserves progression fields on validated agents', () => {
    const agents = loadAgents();
    expect(agents.some((agent) => agent.xpToLevel2 !== undefined)).toBe(true);
    expect(agents.some((agent) => agent.fixedRank === true)).toBe(true);
  });

  it('loads the real synergies data file with only known agent ids', () => {
    const synergies = loadSynergies();
    expect(synergies.length).toBeGreaterThan(0);
    const agentIds = new Set(loadAgents().map((agent) => agent.id));
    for (const { agents } of synergies) {
      expect(agentIds.has(agents[0])).toBe(true);
      expect(agentIds.has(agents[1])).toBe(true);
    }
  });
});

describe('validateAgents', () => {
  it('accepts a valid agent', () => {
    expect(validateAgents([validAgent])).toHaveLength(1);
  });

  it('rejects non-array data with a message naming the file', () => {
    expect(() => validateAgents({ nope: true })).toThrow(
      'data/agents.json: expected a JSON array of entries, got object'
    );
  });

  it('names the file, entry id, and field for an invalid agent', () => {
    const broken = { ...validAgent, stats: { ...validAgent.stats, Combat: -1 } };
    expect(() => validateAgents([broken])).toThrow(
      /data\/agents\.json.*"test-agent".*stats\.Combat/
    );
  });

  it('falls back to the entry index when there is no id', () => {
    expect(() => validateAgents([42])).toThrow(/data\/agents\.json.*index 0/);
  });

  it('rejects an agent missing a required field', () => {
    const { restTime: _restTime, ...missingRestTime } = validAgent;
    expect(() => validateAgents([missingRestTime])).toThrow(/restTime/);
  });
});

describe('validateMissions', () => {
  it('accepts a valid mission', () => {
    expect(validateMissions([validMission])).toHaveLength(1);
  });

  it('rejects an unknown difficulty, naming file and entry', () => {
    const broken = { ...validMission, difficulty: 'Impossible' };
    expect(() => validateMissions([broken])).toThrow(
      /data\/missions\.json.*"test-mission".*difficulty/
    );
  });

  it('rejects a mission with maxAgents of zero', () => {
    const broken = { ...validMission, maxAgents: 0 };
    expect(() => validateMissions([broken])).toThrow(/maxAgents/);
  });
});

describe('validateMissions — disruption blocks', () => {
  const statOption = {
    id: 'opt-1',
    label: 'Push through',
    stat: 'Combat',
    threshold: 5,
    xpBonus: 20,
    passText: 'Passed.',
    failText: 'Failed.',
  };

  const heroOption = {
    id: 'opt-2',
    label: 'Hero move',
    heroId: 'waterboy',
    xpBonus: 30,
    passText: 'Hero passed.',
    failText: 'Hero failed.',
  };

  it('accepts a mission with a stat-gated disruption option', () => {
    const mission = {
      ...validMission,
      disruption: { prompt: 'Radio: **trouble**.', options: [statOption] },
    };
    const [validated] = validateMissions([mission]);
    expect(validated.disruption?.options).toHaveLength(1);
  });

  it('accepts a mission with a hero-gated disruption option', () => {
    const mission = {
      ...validMission,
      disruption: { prompt: 'Radio: **trouble**.', options: [heroOption] },
    };
    const [validated] = validateMissions([mission]);
    expect(validated.disruption?.options[0].heroId).toBe('waterboy');
  });

  it('accepts a mission with both stat and hero options mixed', () => {
    const mission = {
      ...validMission,
      disruption: { prompt: 'Radio: **trouble**.', options: [statOption, heroOption] },
    };
    expect(() => validateMissions([mission])).not.toThrow();
  });

  it('accepts a mission with no disruption block at all', () => {
    const [validated] = validateMissions([validMission]);
    expect(validated.disruption).toBeUndefined();
  });

  it('rejects an option with neither stat+threshold nor heroId', () => {
    const badOption = {
      id: 'opt-3',
      label: 'Bad option',
      xpBonus: 10,
      passText: 'Pass',
      failText: 'Fail',
    };
    const mission = {
      ...validMission,
      disruption: { prompt: 'Radio.', options: [badOption] },
    };
    expect(() => validateMissions([mission])).toThrow(/disruption option needs exactly one/);
  });

  it('rejects an option with BOTH stat+threshold and heroId', () => {
    const badOption = { ...statOption, heroId: 'waterboy' };
    const mission = {
      ...validMission,
      disruption: { prompt: 'Radio.', options: [badOption] },
    };
    expect(() => validateMissions([mission])).toThrow(/disruption option needs exactly one/);
  });

  it('rejects a stat option missing its threshold', () => {
    const { threshold: _threshold, ...badOption } = statOption;
    const mission = {
      ...validMission,
      disruption: { prompt: 'Radio.', options: [badOption] },
    };
    expect(() => validateMissions([mission])).toThrow(/disruption option needs exactly one/);
  });

  it('rejects an unknown stat pillar', () => {
    const badOption = { ...statOption, stat: 'Luck' };
    const mission = {
      ...validMission,
      disruption: { prompt: 'Radio.', options: [badOption] },
    };
    expect(() => validateMissions([mission])).toThrow(/disruption/);
  });

  it('rejects a threshold outside 1..10', () => {
    const badOption = { ...statOption, threshold: 11 };
    const mission = {
      ...validMission,
      disruption: { prompt: 'Radio.', options: [badOption] },
    };
    expect(() => validateMissions([mission])).toThrow(/disruption/);
  });

  it('rejects a disruption with an empty options array', () => {
    const mission = { ...validMission, disruption: { prompt: 'Radio.', options: [] } };
    expect(() => validateMissions([mission])).toThrow(/disruption/);
  });

  it('rejects a disruption missing a prompt', () => {
    const mission = { ...validMission, disruption: { options: [statOption] } };
    expect(() => validateMissions([mission])).toThrow(/disruption/);
  });

  it('loads the real missions data file with valid disruption blocks', () => {
    const missions = loadMissions();
    const withDisruption = missions.filter((m) => m.disruption);
    expect(withDisruption.length).toBeGreaterThan(0);
    for (const mission of withDisruption) {
      expect(mission.disruption?.options.length).toBeGreaterThan(0);
    }
  });

  it('gives every mission in the real catalog an authored disruption block', () => {
    const missions = loadMissions();
    for (const mission of missions) {
      expect(
        mission.disruption,
        `mission "${mission.id}" is missing a disruption block`
      ).toBeDefined();
    }
  });

  it('gives every real disruption block 2 or 3 options', () => {
    const missions = loadMissions();
    for (const mission of missions) {
      const count = mission.disruption?.options.length ?? 0;
      expect(
        count,
        `mission "${mission.id}" has ${count} disruption options`
      ).toBeGreaterThanOrEqual(2);
      expect(count, `mission "${mission.id}" has ${count} disruption options`).toBeLessThanOrEqual(
        3
      );
    }
  });

  it('keeps every real stat-gated threshold within the 1..10 sum-cap range', () => {
    const missions = loadMissions();
    for (const mission of missions) {
      for (const option of mission.disruption?.options ?? []) {
        if (option.threshold === undefined) continue;
        expect(
          option.threshold,
          `mission "${mission.id}" option "${option.id}" threshold out of range`
        ).toBeGreaterThanOrEqual(1);
        expect(
          option.threshold,
          `mission "${mission.id}" option "${option.id}" threshold out of range`
        ).toBeLessThanOrEqual(10);
      }
    }
  });

  it('keeps every real xpBonus positive and sane relative to the mission XP reward', () => {
    const missions = loadMissions();
    for (const mission of missions) {
      const missionXp = mission.rewards?.experience ?? 0;
      for (const option of mission.disruption?.options ?? []) {
        expect(
          option.xpBonus,
          `mission "${mission.id}" option "${option.id}" xpBonus must be positive`
        ).toBeGreaterThan(0);
        // Disruption bonuses are a flavoring reward on top of the mission's
        // own XP, not a replacement for it — hero-specific options run up to
        // ~1.5x a stat option's bonus, so cap generously above that.
        expect(
          option.xpBonus,
          `mission "${mission.id}" option "${option.id}" xpBonus is too large relative to mission XP (${missionXp})`
        ).toBeLessThanOrEqual(missionXp);
      }
    }
  });

  it('only references valid hero ids in real disruption options', () => {
    const missions = loadMissions();
    const agentIds = new Set(loadAgents().map((agent) => agent.id));
    for (const mission of missions) {
      for (const option of mission.disruption?.options ?? []) {
        if (option.heroId === undefined) continue;
        expect(
          agentIds.has(option.heroId),
          `mission "${mission.id}" option "${option.id}" references unknown hero "${option.heroId}"`
        ).toBe(true);
      }
    }
  });

  it('spreads hero moments across a good chunk of the roster, not just one or two heroes', () => {
    const missions = loadMissions();
    const heroIds = new Set<string>();
    for (const mission of missions) {
      for (const option of mission.disruption?.options ?? []) {
        if (option.heroId !== undefined) heroIds.add(option.heroId);
      }
    }
    // 10 heroes on the roster — require most of them to have at least one
    // hero-specific disruption moment somewhere in the 14-mission catalog.
    expect(heroIds.size).toBeGreaterThanOrEqual(7);
  });
});

describe('validateSynergies', () => {
  it('accepts an array of two-agent pairs', () => {
    const synergies = validateSynergies([
      { agents: ['flambae', 'coupe'] },
      { agents: ['prism', 'invisigal'] },
    ]);
    expect(synergies).toHaveLength(2);
    expect(synergies[0].agents).toEqual(['flambae', 'coupe']);
  });

  it('accepts an empty array', () => {
    expect(validateSynergies([])).toEqual([]);
  });

  it('rejects non-array data with a message naming the file', () => {
    expect(() => validateSynergies('nope')).toThrow(
      'data/synergies.json: expected a JSON array of entries, got string'
    );
  });

  it('rejects a pair with fewer than two agents', () => {
    expect(() => validateSynergies([{ agents: ['flambae'] }])).toThrow(
      /data\/synergies\.json.*index 0.*agents/
    );
  });

  it('rejects a pair with more than two agents', () => {
    expect(() => validateSynergies([{ agents: ['a', 'b', 'c'] }])).toThrow(/agents/);
  });

  it('rejects a pair referencing the same agent twice', () => {
    expect(() => validateSynergies([{ agents: ['flambae', 'flambae'] }])).toThrow(
      /two different agents/
    );
  });

  it('rejects empty-string agent ids', () => {
    expect(() => validateSynergies([{ agents: ['flambae', ''] }])).toThrow(/agents/);
  });
});
