import { describe, expect, it } from 'vitest';
import type { ActiveMission } from '../types/activeMission';
import type { Disruption, Mission } from '../types/mission';
import type { ShiftState } from '../types/shift';
import { createEmptyStats } from '../types/stats';
import {
  bakeDisruption,
  DISRUPTION_CHANCE,
  type DisruptionResolution,
  recordDisruptionResolution,
  resolveDisruptionOption,
  sumTeamStats,
  visibleDisruptionOptions,
} from './disruption';
import { createRng, type Rng } from './rng';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const STAT_OPTION = {
  id: 'opt-stat',
  label: 'Push through',
  stat: 'Combat' as const,
  threshold: 5,
  xpBonus: 20,
  passText: 'Passed.',
  failText: 'Failed.',
};

const HERO_OPTION = {
  id: 'opt-hero',
  label: 'Hero move',
  heroId: 'waterboy',
  xpBonus: 30,
  passText: 'Hero passed.',
  failText: 'Hero failed.',
};

const DISRUPTION: Disruption = {
  prompt: 'Radio crackle: **something** is happening.',
  options: [STAT_OPTION, HERO_OPTION],
};

const MISSION_WITH_DISRUPTION: Mission = {
  id: 'm-disrupt',
  name: 'Test Mission',
  description: '',
  requirements: createEmptyStats(),
  difficulty: 'Easy',
  maxAgents: 2,
  travelTime: 1,
  missionDuration: 1,
  disruption: DISRUPTION,
};

const MISSION_WITHOUT_DISRUPTION: Mission = {
  id: 'm-plain',
  name: 'Plain Mission',
  description: '',
  requirements: createEmptyStats(),
  difficulty: 'Easy',
  maxAgents: 2,
  travelTime: 1,
  missionDuration: 1,
};

function countingRng(rng: Rng): { rng: Rng; calls: () => number } {
  let count = 0;
  return {
    rng: () => {
      count++;
      return rng();
    },
    calls: () => count,
  };
}

function activeMissionWith(id: string, disruption?: ActiveMission['disruption']): ActiveMission {
  return {
    id,
    mission: MISSION_WITH_DISRUPTION,
    agents: [],
    startTime: 0,
    currentPhase: 'active',
    phaseStartTime: 0,
    travelOutboundDuration: 0,
    missionDuration: 1000,
    travelReturnDuration: 0,
    restDuration: 0,
    totalDuration: 1000,
    outcome: { success: true, probability: 1, roll: 0 },
    disruption,
  };
}

// ---------------------------------------------------------------------------
// bakeDisruption
// ---------------------------------------------------------------------------

describe('bakeDisruption', () => {
  it('returns null and consumes no draws when the mission has no disruption data', () => {
    const { rng, calls } = countingRng(createRng(1));
    const result = bakeDisruption(MISSION_WITHOUT_DISRUPTION, 0, 1000, rng);
    expect(result).toBeNull();
    expect(calls()).toBe(0);
  });

  it('is deterministic for a given seed', () => {
    const a = bakeDisruption(MISSION_WITH_DISRUPTION, 0, 1000, createRng(42));
    const b = bakeDisruption(MISSION_WITH_DISRUPTION, 0, 1000, createRng(42));
    expect(a).toEqual(b);
  });

  it('always consumes exactly 2 draws when disruption data exists, win or lose', () => {
    // Force a losing chance roll: first draw >= DISRUPTION_CHANCE.
    const losingRng: Rng = (() => {
      const values = [0.9, 0.5];
      let i = 0;
      return () => values[i++];
    })();
    const { rng: countedLoss, calls: lossCalls } = countingRng(losingRng);
    const lossResult = bakeDisruption(MISSION_WITH_DISRUPTION, 0, 1000, countedLoss);
    expect(lossResult).toBeNull();
    expect(lossCalls()).toBe(2);

    // Force a winning chance roll: first draw < DISRUPTION_CHANCE.
    const winningRng: Rng = (() => {
      const values = [0.1, 0.5];
      let i = 0;
      return () => values[i++];
    })();
    const { rng: countedWin, calls: winCalls } = countingRng(winningRng);
    const winResult = bakeDisruption(MISSION_WITH_DISRUPTION, 0, 1000, countedWin);
    expect(winResult).not.toBeNull();
    expect(winCalls()).toBe(2);
  });

  it('fires within the middle band [start + 0.25*span, start + 0.75*span] on a pass', () => {
    const start = 1000;
    const end = 5000; // span 4000
    const rng: Rng = (() => {
      const values = [0, 0]; // pass the chance roll, minimum fire roll
      let i = 0;
      return () => values[i++];
    })();
    const result = bakeDisruption(MISSION_WITH_DISRUPTION, start, end, rng);
    expect(result).not.toBeNull();
    expect(result?.firesAtMs).toBe(start + 0.25 * 4000); // 2000

    const rngMax: Rng = (() => {
      const values = [0, 0.999999];
      let i = 0;
      return () => values[i++];
    })();
    const resultMax = bakeDisruption(MISSION_WITH_DISRUPTION, start, end, rngMax);
    expect(resultMax?.firesAtMs).toBeLessThanOrEqual(start + 0.75 * 4000);
    expect(resultMax?.firesAtMs).toBeGreaterThan(start + 0.25 * 4000);
  });

  it('respects DISRUPTION_CHANCE as the pass/fail cutoff', () => {
    expect(DISRUPTION_CHANCE).toBe(0.5);
    const atCutoffRng: Rng = (() => {
      const values = [0.5, 0]; // exactly at cutoff — should fail (>= cutoff fails)
      let i = 0;
      return () => values[i++];
    })();
    expect(bakeDisruption(MISSION_WITH_DISRUPTION, 0, 1000, atCutoffRng)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// visibleDisruptionOptions
// ---------------------------------------------------------------------------

describe('visibleDisruptionOptions', () => {
  it('always shows stat options', () => {
    const visible = visibleDisruptionOptions(DISRUPTION, []);
    expect(visible.map((o) => o.id)).toContain('opt-stat');
  });

  it('hides hero options when the hero is not deployed', () => {
    const visible = visibleDisruptionOptions(DISRUPTION, ['flambae']);
    expect(visible.map((o) => o.id)).not.toContain('opt-hero');
  });

  it('shows hero options when the hero is deployed', () => {
    const visible = visibleDisruptionOptions(DISRUPTION, ['waterboy']);
    expect(visible.map((o) => o.id)).toContain('opt-hero');
  });
});

// ---------------------------------------------------------------------------
// resolveDisruptionOption
// ---------------------------------------------------------------------------

describe('resolveDisruptionOption', () => {
  it('passes when the team stat total meets the threshold', () => {
    const teamStats = { ...createEmptyStats(), Combat: 5 };
    const result = resolveDisruptionOption(STAT_OPTION, teamStats, []);
    expect(result).toEqual({
      optionId: 'opt-stat',
      success: true,
      xpBonus: 20,
      text: 'Passed.',
    });
  });

  it('fails when the team stat total is one below the threshold', () => {
    const teamStats = { ...createEmptyStats(), Combat: 4 };
    const result = resolveDisruptionOption(STAT_OPTION, teamStats, []);
    expect(result).toEqual({
      optionId: 'opt-stat',
      success: false,
      xpBonus: 0,
      text: 'Failed.',
    });
  });

  it('passes exactly at the threshold boundary', () => {
    const exact = resolveDisruptionOption(STAT_OPTION, { ...createEmptyStats(), Combat: 5 }, []);
    expect(exact.success).toBe(true);
    const oneUnder = resolveDisruptionOption(
      STAT_OPTION,
      { ...createEmptyStats(), Combat: 5 - 1 },
      []
    );
    expect(oneUnder.success).toBe(false);
  });

  it('auto-succeeds a hero option when that hero is deployed', () => {
    const result = resolveDisruptionOption(HERO_OPTION, createEmptyStats(), ['waterboy']);
    expect(result).toEqual({
      optionId: 'opt-hero',
      success: true,
      xpBonus: 30,
      text: 'Hero passed.',
    });
  });

  it('fails a hero option when that hero is somehow not deployed', () => {
    const result = resolveDisruptionOption(HERO_OPTION, createEmptyStats(), []);
    expect(result.success).toBe(false);
    expect(result.xpBonus).toBe(0);
    expect(result.text).toBe('Hero failed.');
  });

  it('computes nothing random — same inputs always produce the same result', () => {
    const teamStats = { ...createEmptyStats(), Combat: 7 };
    const a = resolveDisruptionOption(STAT_OPTION, teamStats, []);
    const b = resolveDisruptionOption(STAT_OPTION, teamStats, []);
    expect(a).toEqual(b);
  });
});

// ---------------------------------------------------------------------------
// sumTeamStats (re-exported combineTeamStats)
// ---------------------------------------------------------------------------

describe('sumTeamStats', () => {
  it('sums stats per pillar across the team', () => {
    const a = { ...createEmptyStats(), Combat: 3 };
    const b = { ...createEmptyStats(), Combat: 4 };
    expect(sumTeamStats([a, b]).Combat).toBe(7);
  });

  it('caps each pillar at 10', () => {
    const a = { ...createEmptyStats(), Combat: 8 };
    const b = { ...createEmptyStats(), Combat: 8 };
    expect(sumTeamStats([a, b]).Combat).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// recordDisruptionResolution
// ---------------------------------------------------------------------------

describe('recordDisruptionResolution', () => {
  const resolution: DisruptionResolution = {
    optionId: 'opt-stat',
    success: true,
    xpBonus: 20,
    text: 'Passed.',
  };

  function baseState(activeMissions: ActiveMission[]): ShiftState {
    return {
      phase: 'running',
      config: {
        seed: 1,
        shiftDurationMs: 1000,
        maxOpenCalls: 4,
        callTimerMs: 1000,
        spawnEveryMs: 1000,
      },
      shiftStartMs: 0,
      calls: [],
      activeMissions,
      tally: { succeeded: 0, failed: 0, missed: 0 },
      lastTickMs: 0,
    };
  }

  it('sets the resolution on the matching active mission without mutating the input', () => {
    const mission = activeMissionWith('am-1', { firesAtMs: 500 });
    const state = baseState([mission]);
    const next = recordDisruptionResolution(state, 'am-1', resolution);

    expect(next).not.toBe(state);
    expect(next.activeMissions[0]).not.toBe(state.activeMissions[0]);
    expect(next.activeMissions[0].disruption?.resolution).toEqual(resolution);

    // Original state and mission are untouched (immutability).
    expect(state.activeMissions[0].disruption?.resolution).toBeUndefined();
    expect(mission.disruption?.resolution).toBeUndefined();
  });

  it('leaves other active missions untouched', () => {
    const target = activeMissionWith('am-1', { firesAtMs: 500 });
    const other = activeMissionWith('am-2', { firesAtMs: 700 });
    const state = baseState([target, other]);
    const next = recordDisruptionResolution(state, 'am-1', resolution);

    expect(next.activeMissions[1]).toBe(other); // reference-equal — untouched
    expect(next.activeMissions[1].disruption?.resolution).toBeUndefined();
  });

  it('is a no-op (same reference) when no active mission matches the id', () => {
    const mission = activeMissionWith('am-1', { firesAtMs: 500 });
    const state = baseState([mission]);
    const next = recordDisruptionResolution(state, 'nonexistent', resolution);
    expect(next).toBe(state);
  });

  it('is a no-op when the matching mission has no baked disruption', () => {
    const mission = activeMissionWith('am-1', undefined);
    const state = baseState([mission]);
    const next = recordDisruptionResolution(state, 'am-1', resolution);
    expect(next).toBe(state);
  });
});
