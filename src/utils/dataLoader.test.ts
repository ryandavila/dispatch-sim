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
