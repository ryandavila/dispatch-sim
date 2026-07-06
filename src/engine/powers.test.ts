import { describe, expect, it } from 'vitest';
import type { Character } from '../types/character';
import type { ShiftCall, ShiftState } from '../types/shift';
import {
  canUseHeroPower,
  extendCall,
  GOLEM_ID,
  golemStatReset,
  MALEVOLA_ID,
  PRISM_EXTEND_MS,
  PRISM_ID,
} from './powers';
import { DEFAULT_SHIFT_CONFIG } from './shift';

function makeHero(overrides: Partial<Character> = {}): Character {
  return {
    id: GOLEM_ID,
    name: 'Golem',
    level: 3,
    experience: 0,
    stats: { Combat: 5, Vigor: 4, Mobility: 2, Charisma: 1, Intellect: 3 },
    availablePoints: 0,
    canFly: false,
    isFlightLicensed: false,
    restTime: 5,
    ...overrides,
  };
}

describe('canUseHeroPower', () => {
  it('is false when the hero does not exist', () => {
    expect(canUseHeroPower(GOLEM_ID, {}, 1, undefined)).toBe(false);
  });

  it('is false when the hero is downed', () => {
    const hero = { injuryCount: 2 };
    expect(canUseHeroPower(GOLEM_ID, {}, 1, hero)).toBe(false);
  });

  it('is true for a healthy hero with no prior usage', () => {
    const hero = { injuryCount: 0 };
    expect(canUseHeroPower(GOLEM_ID, {}, 1, hero)).toBe(true);
  });

  it('is true for an injured (but not downed) hero', () => {
    const hero = { injuryCount: 1 };
    expect(canUseHeroPower(GOLEM_ID, {}, 1, hero)).toBe(true);
  });

  it('is blocked the same shift it was used in', () => {
    const hero = { injuryCount: 0 };
    const powerUsage = { [GOLEM_ID]: 3 };
    expect(canUseHeroPower(GOLEM_ID, powerUsage, 3, hero)).toBe(false);
  });

  it('re-enables on the next shift', () => {
    const hero = { injuryCount: 0 };
    const powerUsage = { [GOLEM_ID]: 3 };
    expect(canUseHeroPower(GOLEM_ID, powerUsage, 4, hero)).toBe(true);
  });

  it('gates each hero independently', () => {
    const hero = { injuryCount: 0 };
    const powerUsage = { [GOLEM_ID]: 2 };
    expect(canUseHeroPower(PRISM_ID, powerUsage, 2, hero)).toBe(true);
  });
});

describe('golemStatReset', () => {
  it('refunds allocated points and resets stats to base', () => {
    const base = makeHero({
      stats: { Combat: 1, Vigor: 1, Mobility: 1, Charisma: 1, Intellect: 1 },
      availablePoints: 0,
    });
    const current = makeHero({
      stats: { Combat: 4, Vigor: 3, Mobility: 1, Charisma: 1, Intellect: 2 },
      availablePoints: 2,
    });

    const result = golemStatReset(current, base);

    expect(result.stats).toEqual(base.stats);
    // Allocated above base: (4-1)+(3-1)+(1-1)+(1-1)+(2-1) = 3+2+0+0+1 = 6
    expect(result.availablePoints).toBe(2 + 6);
  });

  it('is a no-op on stats/points when nothing has been allocated', () => {
    const base = makeHero({
      stats: { Combat: 1, Vigor: 1, Mobility: 1, Charisma: 1, Intellect: 1 },
      availablePoints: 3,
    });
    const current = makeHero({
      stats: { Combat: 1, Vigor: 1, Mobility: 1, Charisma: 1, Intellect: 1 },
      availablePoints: 3,
    });

    const result = golemStatReset(current, base);

    expect(result.stats).toEqual(base.stats);
    expect(result.availablePoints).toBe(3);
  });

  it('conserves total points: refunded points equal what was allocated', () => {
    const base = makeHero({
      stats: { Combat: 1, Vigor: 1, Mobility: 1, Charisma: 1, Intellect: 1 },
      availablePoints: 1,
    });
    const current = makeHero({
      stats: { Combat: 2, Vigor: 2, Mobility: 3, Charisma: 1, Intellect: 1 },
      availablePoints: 0,
    });

    const totalBefore =
      Object.values(current.stats).reduce((s, v) => s + v, 0) + current.availablePoints;
    const result = golemStatReset(current, base);
    const totalAfter =
      Object.values(result.stats).reduce((s, v) => s + v, 0) + result.availablePoints;

    expect(totalAfter).toBe(totalBefore);
  });

  it('leaves level, XP, and injuries untouched', () => {
    const base = makeHero({
      stats: { Combat: 1, Vigor: 1, Mobility: 1, Charisma: 1, Intellect: 1 },
    });
    const current = makeHero({
      level: 5,
      experience: 4000,
      injuryCount: 1,
      stats: { Combat: 3, Vigor: 1, Mobility: 1, Charisma: 1, Intellect: 1 },
    });

    const result = golemStatReset(current, base);

    expect(result.level).toBe(5);
    expect(result.experience).toBe(4000);
    expect(result.injuryCount).toBe(1);
  });

  it('does not mutate the inputs', () => {
    const base = makeHero({
      stats: { Combat: 1, Vigor: 1, Mobility: 1, Charisma: 1, Intellect: 1 },
    });
    const current = makeHero({
      stats: { Combat: 3, Vigor: 2, Mobility: 1, Charisma: 1, Intellect: 1 },
    });
    const currentStatsSnapshot = { ...current.stats };

    golemStatReset(current, base);

    expect(current.stats).toEqual(currentStatsSnapshot);
  });
});

describe('extendCall', () => {
  function stateWithCall(call: ShiftCall): ShiftState {
    return {
      phase: 'running',
      config: DEFAULT_SHIFT_CONFIG,
      shiftStartMs: 0,
      calls: [call],
      activeMissions: [],
      tally: { succeeded: 0, failed: 0, missed: 0 },
      lastTickMs: 0,
    };
  }

  it('extends the expiry of an open call', () => {
    const call: ShiftCall = {
      id: 'call-1',
      missionId: 'm',
      spawnAt: 0,
      expiresAt: 10_000,
      status: 'open',
    };
    const state = stateWithCall(call);

    const result = extendCall(state, 'call-1', PRISM_EXTEND_MS);

    expect(result.calls[0].expiresAt).toBe(10_000 + PRISM_EXTEND_MS);
  });

  it('leaves state unchanged (by reference) when the call is not open', () => {
    const call: ShiftCall = {
      id: 'call-1',
      missionId: 'm',
      spawnAt: 0,
      expiresAt: 10_000,
      status: 'assigned',
      activeMissionId: 'am-1',
    };
    const state = stateWithCall(call);

    const result = extendCall(state, 'call-1', PRISM_EXTEND_MS);

    expect(result).toBe(state);
  });

  it('leaves state unchanged when the call does not exist', () => {
    const call: ShiftCall = {
      id: 'call-1',
      missionId: 'm',
      spawnAt: 0,
      expiresAt: 10_000,
      status: 'open',
    };
    const state = stateWithCall(call);

    const result = extendCall(state, 'nonexistent', PRISM_EXTEND_MS);

    expect(result).toBe(state);
  });

  it('does not mutate the original state', () => {
    const call: ShiftCall = {
      id: 'call-1',
      missionId: 'm',
      spawnAt: 0,
      expiresAt: 10_000,
      status: 'open',
    };
    const state = stateWithCall(call);

    extendCall(state, 'call-1', PRISM_EXTEND_MS);

    expect(state.calls[0].expiresAt).toBe(10_000);
  });

  it('only touches the targeted call, leaving others untouched', () => {
    const state: ShiftState = {
      phase: 'running',
      config: DEFAULT_SHIFT_CONFIG,
      shiftStartMs: 0,
      calls: [
        { id: 'call-1', missionId: 'm', spawnAt: 0, expiresAt: 10_000, status: 'open' },
        { id: 'call-2', missionId: 'm', spawnAt: 0, expiresAt: 20_000, status: 'open' },
      ],
      activeMissions: [],
      tally: { succeeded: 0, failed: 0, missed: 0 },
      lastTickMs: 0,
    };

    const result = extendCall(state, 'call-2', PRISM_EXTEND_MS);

    expect(result.calls[0].expiresAt).toBe(10_000);
    expect(result.calls[1].expiresAt).toBe(20_000 + PRISM_EXTEND_MS);
  });
});

// Exercise the exported ids/constants so they stay used and correct.
describe('exported ids', () => {
  it('has distinct hero ids matching data/agents.json', () => {
    expect(new Set([GOLEM_ID, PRISM_ID, MALEVOLA_ID]).size).toBe(3);
    expect(GOLEM_ID).toBe('golem');
    expect(PRISM_ID).toBe('prism');
    expect(MALEVOLA_ID).toBe('malevola');
  });
});
