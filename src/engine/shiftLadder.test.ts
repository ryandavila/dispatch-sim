import { describe, expect, it } from 'vitest';
import type { Mission } from '../types/mission';
import { DEFAULT_SHIFT_CONFIG } from './shift';
import { callTimerMsForDifficulty, configForShift, missionPoolForShift } from './shiftLadder';

describe('configForShift', () => {
  it('shift 1 equals the documented base config', () => {
    expect(configForShift(1)).toEqual({
      seed: 1,
      spawnEveryMs: 13500,
      shiftDurationMs: 180000,
      callTimerMs: 25000,
      maxOpenCalls: 4,
    });
  });

  it('shift 1 fully equals DEFAULT_SHIFT_CONFIG', () => {
    expect(configForShift(1)).toEqual(DEFAULT_SHIFT_CONFIG);
  });

  it('shift 5 equals the documented escalated config', () => {
    expect(configForShift(5)).toEqual({
      seed: 5,
      spawnEveryMs: 9500,
      shiftDurationMs: 260000,
      callTimerMs: 19000,
      maxOpenCalls: 5,
    });
  });

  it('escalates monotonically across shifts 1..12', () => {
    for (let n = 2; n <= 12; n++) {
      const prev = configForShift(n - 1);
      const cur = configForShift(n);
      expect(cur.spawnEveryMs).toBeLessThanOrEqual(prev.spawnEveryMs);
      expect(cur.shiftDurationMs).toBeGreaterThanOrEqual(prev.shiftDurationMs);
      expect(cur.callTimerMs).toBeLessThanOrEqual(prev.callTimerMs);
      expect(cur.maxOpenCalls).toBeGreaterThanOrEqual(prev.maxOpenCalls);
    }
  });

  it('holds every cap/floor at large n', () => {
    const cfg = configForShift(50);
    expect(cfg.spawnEveryMs).toBe(6000);
    expect(cfg.shiftDurationMs).toBe(360000);
    expect(cfg.callTimerMs).toBe(12000);
    expect(cfg.maxOpenCalls).toBe(6);
  });

  it('steps maxOpenCalls 4 → 5 → 6', () => {
    for (const n of [1, 2, 3]) {
      expect(configForShift(n).maxOpenCalls).toBe(4);
    }
    for (const n of [4, 5, 6]) {
      expect(configForShift(n).maxOpenCalls).toBe(5);
    }
    for (const n of [7, 10, 50]) {
      expect(configForShift(n).maxOpenCalls).toBe(6);
    }
  });

  it('clamps shiftNumber 0 and negatives to shift 1', () => {
    expect(configForShift(0)).toEqual(configForShift(1));
    expect(configForShift(-5)).toEqual(configForShift(1));
  });

  it('is deterministic for the same n', () => {
    for (const n of [1, 3, 7, 25]) {
      expect(configForShift(n)).toEqual(configForShift(n));
    }
  });
});

describe('missionPoolForShift', () => {
  const missions: Mission[] = [
    { difficulty: 'Easy', id: 'e1' } as Mission,
    { difficulty: 'Easy', id: 'e2' } as Mission,
    { difficulty: 'Medium', id: 'm1' } as Mission,
    { difficulty: 'Hard', id: 'h1' } as Mission,
    { difficulty: 'Extreme', id: 'x1' } as Mission,
  ];

  function counts(pool: string[]): Record<string, number> {
    const map: Record<string, number> = {};
    for (const id of pool) {
      map[id] = (map[id] ?? 0) + 1;
    }
    return map;
  }

  it('weights shift 1: Easy 4, Medium 3, Hard 1, Extreme absent', () => {
    const map = counts(missionPoolForShift(1, missions));
    expect(map.e1).toBe(4);
    expect(map.e2).toBe(4);
    expect(map.m1).toBe(3);
    expect(map.h1).toBe(1);
    expect(map.x1).toBeUndefined();
  });

  it('weights shift 5: Easy 1, Medium 3, Hard 5, Extreme 3', () => {
    const map = counts(missionPoolForShift(5, missions));
    expect(map.e1).toBe(1);
    expect(map.e2).toBe(1);
    expect(map.m1).toBe(3);
    expect(map.h1).toBe(5);
    expect(map.x1).toBe(3);
  });

  it('weights shift 8: Easy 1, Medium 3, Hard 5, Extreme 6', () => {
    const map = counts(missionPoolForShift(8, missions));
    expect(map.e1).toBe(1);
    expect(map.e2).toBe(1);
    expect(map.m1).toBe(3);
    expect(map.h1).toBe(5);
    expect(map.x1).toBe(6);
  });

  it('is never empty for shifts 1..10 with the fixture', () => {
    for (let n = 1; n <= 10; n++) {
      expect(missionPoolForShift(n, missions).length).toBeGreaterThan(0);
    }
  });

  it('returns [] for an empty missions array', () => {
    expect(missionPoolForShift(3, [])).toEqual([]);
  });

  it('groups ids in the missions input order', () => {
    const pool = missionPoolForShift(1, missions);
    // e1×4, e2×4, m1×3, h1×1, x1×0
    expect(pool).toEqual(['e1', 'e1', 'e1', 'e1', 'e2', 'e2', 'e2', 'e2', 'm1', 'm1', 'm1', 'h1']);
  });

  it('clamps shiftNumber to a whole number ≥ 1', () => {
    expect(missionPoolForShift(0, missions)).toEqual(missionPoolForShift(1, missions));
    expect(missionPoolForShift(-2, missions)).toEqual(missionPoolForShift(1, missions));
  });
});

describe('callTimerMsForDifficulty', () => {
  it('applies the documented multiplier table, rounded', () => {
    expect(callTimerMsForDifficulty('Easy', 25_000)).toBe(15_000); // ×0.6
    expect(callTimerMsForDifficulty('Medium', 25_000)).toBe(25_000); // ×1.0
    expect(callTimerMsForDifficulty('Hard', 25_000)).toBe(37_500); // ×1.5
    expect(callTimerMsForDifficulty('Extreme', 25_000)).toBe(47_500); // ×1.9
  });

  it('rounds to the nearest ms', () => {
    // 19000 * 0.6 = 11400 (exact); use a base that forces rounding.
    expect(callTimerMsForDifficulty('Extreme', 12_345)).toBe(Math.round(12_345 * 1.9));
  });

  it('orders Easy < Medium < Hard < Extreme for any positive base', () => {
    const base = 20_000;
    const easy = callTimerMsForDifficulty('Easy', base);
    const medium = callTimerMsForDifficulty('Medium', base);
    const hard = callTimerMsForDifficulty('Hard', base);
    const extreme = callTimerMsForDifficulty('Extreme', base);
    expect(easy).toBeLessThan(medium);
    expect(medium).toBeLessThan(hard);
    expect(hard).toBeLessThan(extreme);
  });
});
