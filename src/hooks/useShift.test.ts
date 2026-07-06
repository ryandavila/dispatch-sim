/**
 * @vitest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRng } from '../engine/rng';
import type { Character } from '../types/character';
import type { Mission } from '../types/mission';
import type { ShiftConfig } from '../types/shift';
import { type UseShiftOptions, useShift } from './useShift';

const MISSION: Mission = {
  id: 'm',
  name: 'Test Mission',
  description: '',
  difficulty: 'Easy',
  maxAgents: 2,
  requirements: { Combat: 1, Vigor: 1, Mobility: 1, Charisma: 1, Intellect: 1 },
  travelTime: 1,
  missionDuration: 1,
  rewards: { experience: 100 },
};

const AGENT: Character = {
  id: 'agent-1',
  name: 'Agent',
  stats: { Combat: 9, Vigor: 9, Mobility: 9, Charisma: 9, Intellect: 9 },
  canFly: false,
  isFlightLicensed: false,
  restTime: 1,
};

const CONFIG: ShiftConfig = {
  seed: 1,
  shiftDurationMs: 100_000,
  maxOpenCalls: 4,
  callTimerMs: 5000,
  spawnEveryMs: 2000,
};

/** A clock whose value the test drives directly. */
function fakeClock() {
  const ref = { value: 0 };
  return { clock: () => ref.value, set: (v: number) => (ref.value = v), ref };
}

function setup(overrides: Partial<UseShiftOptions> = {}) {
  const clock = fakeClock();
  const options: UseShiftOptions = {
    missions: [MISSION],
    config: CONFIG,
    clock: clock.clock,
    rng: createRng(1),
    tickMs: 100,
    createId: () => 'am-1',
    ...overrides,
  };
  const view = renderHook(() => useShift(options));
  return { ...view, clock };
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('useShift', () => {
  it('starts idle and bakes a running schedule on start', () => {
    const { result } = setup();
    expect(result.current.shift.phase).toBe('idle');

    act(() => result.current.start());

    expect(result.current.shift.phase).toBe('running');
    expect(result.current.shift.calls.length).toBeGreaterThan(0);
    expect(result.current.shift.calls.every((c) => c.status === 'pending')).toBe(true);
  });

  it('forwards wall-clock ticks into the reducer and maps call-spawned', () => {
    const onCallSpawned = vi.fn();
    const { result, clock } = setup({ onCallSpawned });
    act(() => result.current.start());

    const firstSpawn = result.current.shift.calls[0].spawnAt;
    act(() => {
      clock.set(firstSpawn);
      vi.advanceTimersByTime(100);
    });

    expect(result.current.shift.calls[0].status).toBe('open');
    expect(onCallSpawned).toHaveBeenCalledWith(
      expect.objectContaining({ id: result.current.shift.calls[0].id })
    );
  });

  it('maps an expired call to onCallMissed without injuring anyone', () => {
    const onCallMissed = vi.fn();
    const onMissionComplete = vi.fn();
    const { result, clock } = setup({ onCallMissed, onMissionComplete });
    act(() => result.current.start());

    const call = result.current.shift.calls[0];
    act(() => {
      clock.set(call.spawnAt);
      vi.advanceTimersByTime(100);
    });
    act(() => {
      clock.set(call.spawnAt + CONFIG.callTimerMs);
      vi.advanceTimersByTime(100);
    });

    expect(result.current.shift.calls[0].status).toBe('missed');
    expect(result.current.shift.tally.missed).toBe(1);
    expect(onCallMissed).toHaveBeenCalledTimes(1);
    expect(onMissionComplete).not.toHaveBeenCalled();
  });

  it('deploys against an open call and maps mission-completed to XP/injury', () => {
    const onMissionComplete = vi.fn();
    const onDeployRolled = vi.fn();
    const { result, clock } = setup({ onMissionComplete, onDeployRolled });
    act(() => result.current.start());

    const call = result.current.shift.calls[0];
    act(() => {
      clock.set(call.spawnAt);
      vi.advanceTimersByTime(100);
    });

    let deployed: ReturnType<typeof result.current.deploy> = null;
    act(() => {
      deployed = result.current.deploy(call.id, [AGENT]);
    });
    expect(deployed).not.toBeNull();
    expect(onDeployRolled).toHaveBeenCalledTimes(1);
    expect(result.current.shift.calls[0].status).toBe('assigned');

    const mission = deployed as unknown as { startTime: number; totalDuration: number };
    act(() => {
      clock.set(mission.startTime + mission.totalDuration + 1);
      vi.advanceTimersByTime(100);
    });

    expect(onMissionComplete).toHaveBeenCalledTimes(1);
    const status = result.current.shift.calls[0].status;
    expect(status === 'succeeded' || status === 'failed').toBe(true);
  });

  it('freezes on pause and resumes as if no time passed', () => {
    const onCallMissed = vi.fn();
    const { result, clock } = setup({ onCallMissed });
    act(() => result.current.start());

    const call = result.current.shift.calls[0];
    act(() => {
      clock.set(call.spawnAt);
      vi.advanceTimersByTime(100);
    });
    expect(result.current.shift.calls[0].status).toBe('open');

    // Pause, then let a long stretch of wall time pass.
    act(() => {
      result.current.pause();
      clock.set(call.spawnAt + 999_999);
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.shift.phase).toBe('paused');
    expect(result.current.shift.calls[0].status).toBe('open'); // did NOT expire
    expect(onCallMissed).not.toHaveBeenCalled();

    // Resume: the paused wall time is discounted, so the call has its full
    // timer left and only expires after another callTimerMs of running time.
    act(() => result.current.resume());
    act(() => {
      clock.set(call.spawnAt + 999_999 + CONFIG.callTimerMs);
      vi.advanceTimersByTime(100);
    });
    expect(result.current.shift.calls[0].status).toBe('missed');
    expect(onCallMissed).toHaveBeenCalledTimes(1);
  });

  it('maps shift-ended once the spawn phase drains', () => {
    const onShiftEnded = vi.fn();
    const shortConfig: ShiftConfig = { ...CONFIG, shiftDurationMs: 6000, callTimerMs: 2000 };
    const { result, clock } = setup({ onShiftEnded, config: shortConfig });
    act(() => result.current.start(shortConfig));

    // Let every open call expire and cross the spawn cutoff.
    act(() => {
      clock.set(20_000);
      vi.advanceTimersByTime(100);
    });

    expect(result.current.shift.phase).toBe('ended');
    expect(onShiftEnded).toHaveBeenCalledTimes(1);
    expect(onShiftEnded).toHaveBeenCalledWith(expect.objectContaining({ succeeded: 0, failed: 0 }));
  });

  it('fires onShiftFinalized once with the final state when nothing is in flight', () => {
    const onShiftFinalized = vi.fn();
    const shortConfig: ShiftConfig = { ...CONFIG, shiftDurationMs: 6000, callTimerMs: 2000 };
    const { result, clock } = setup({ onShiftFinalized, config: shortConfig });
    act(() => result.current.start(shortConfig));

    act(() => {
      clock.set(20_000);
      vi.advanceTimersByTime(100);
    });

    expect(result.current.shift.phase).toBe('ended');
    expect(onShiftFinalized).toHaveBeenCalledTimes(1);
    const [finalState] = onShiftFinalized.mock.calls[0];
    expect(finalState.config.seed).toBe(shortConfig.seed);
    expect(finalState.activeMissions).toHaveLength(0);

    // A further tick does not re-fire the finalize callback.
    act(() => {
      clock.set(30_000);
      vi.advanceTimersByTime(100);
    });
    expect(onShiftFinalized).toHaveBeenCalledTimes(1);
  });

  it('bakes the schedule from buildPool (weighted mission pool) when provided', () => {
    const other: Mission = { ...MISSION, id: 'm2' };
    // buildPool ignores the default one-per-mission and forces every call to m2.
    const { result } = setup({ missions: [MISSION, other], buildPool: () => ['m2'] });
    act(() => result.current.start());

    const missionIds = new Set(result.current.shift.calls.map((c) => c.missionId));
    expect(missionIds).toEqual(new Set(['m2']));
    expect(result.current.shift.calls.length).toBeGreaterThan(0);
  });
});

describe('useShift — persistence (freeze & resume)', () => {
  const STORAGE_KEY = 'test-shift-state';

  function mount(clockValue: () => number, storageKey = STORAGE_KEY) {
    const options: UseShiftOptions = {
      missions: [MISSION],
      config: CONFIG,
      clock: clockValue,
      rng: createRng(1),
      tickMs: 100,
      createId: () => 'am-1',
      storageKey,
    };
    return renderHook(() => useShift(options));
  }

  it('resumes a persisted shift without fast-forwarding timers after a long absence', () => {
    const wall = { value: 0 };
    const a = mount(() => wall.value);
    act(() => a.result.current.start());

    const call = a.result.current.shift.calls[0];
    act(() => {
      wall.value = call.spawnAt;
      vi.advanceTimersByTime(100);
    });
    expect(a.result.current.shift.calls[0].status).toBe('open');
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    a.unmount();

    // Tab closed for a very long time, then reopened.
    wall.value = call.spawnAt + 10_000_000;
    const b = mount(() => wall.value);
    expect(b.result.current.shift.phase).toBe('running');

    // Freeze held: the call did NOT expire despite the huge wall gap. A tick
    // with no further wall movement is a no-op (virtual clock resumed at save).
    act(() => vi.advanceTimersByTime(100));
    expect(b.result.current.shift.calls[0].status).toBe('open');

    // It expires only after another full callTimerMs of *running* time.
    act(() => {
      wall.value = call.spawnAt + 10_000_000 + CONFIG.callTimerMs;
      vi.advanceTimersByTime(100);
    });
    expect(b.result.current.shift.calls[0].status).toBe('missed');
  });

  it('coerces a mid-pause save back to running on reload', () => {
    const wall = { value: 0 };
    const a = mount(() => wall.value);
    act(() => a.result.current.start());
    const call = a.result.current.shift.calls[0];
    act(() => {
      wall.value = call.spawnAt;
      vi.advanceTimersByTime(100);
    });
    act(() => a.result.current.pause());
    expect(a.result.current.shift.phase).toBe('paused');
    a.unmount();

    const b = mount(() => wall.value);
    expect(b.result.current.shift.phase).toBe('running');
  });

  it('clears persisted state when the shift resets to idle', () => {
    const wall = { value: 0 };
    const { result } = mount(() => wall.value);
    act(() => result.current.start());
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();

    act(() => result.current.reset());
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('starts fresh (idle) when no persisted shift exists', () => {
    const wall = { value: 0 };
    const { result } = mount(() => wall.value, 'unused-key');
    expect(result.current.shift.phase).toBe('idle');
  });

  it('discards a malformed persisted blob instead of freezing the board', () => {
    // `{}` is valid JSON but no ShiftState: without the shape guard it would
    // pass the `phase !== 'idle'` resume check and match no reducer branch.
    localStorage.setItem(STORAGE_KEY, '{}');
    const wall = { value: 0 };
    const { result } = mount(() => wall.value);
    expect(result.current.shift.phase).toBe('idle');
  });

  it('resumes a pre-timerMs/pre-disruption save (old shape) without NaN math', () => {
    // A mid-shift save from before per-difficulty timers and disruptions:
    // calls lack `timerMs`, active missions lack `disruption`.
    const oldShape = {
      phase: 'running',
      config: CONFIG,
      shiftStartMs: 0,
      calls: [
        {
          id: 'call-0',
          missionId: MISSION.id,
          spawnAt: 1_000,
          expiresAt: 1_000 + CONFIG.callTimerMs,
          status: 'pending',
        },
      ],
      activeMissions: [],
      tally: { succeeded: 0, failed: 0, missed: 0 },
      lastTickMs: 500,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(oldShape));

    const wall = { value: 500 };
    const { result } = mount(() => wall.value);
    expect(result.current.shift.phase).toBe('running');

    // The call opens and expires on the config fallback timer — finite times.
    act(() => {
      wall.value = 1_000;
      vi.advanceTimersByTime(100);
    });
    expect(result.current.shift.calls[0].status).toBe('open');
    expect(Number.isFinite(result.current.shift.calls[0].expiresAt)).toBe(true);

    act(() => {
      wall.value = 1_000 + CONFIG.callTimerMs;
      vi.advanceTimersByTime(100);
    });
    expect(result.current.shift.calls[0].status).toBe('missed');
  });
});
