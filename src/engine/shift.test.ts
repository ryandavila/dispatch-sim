import { describe, expect, it } from 'vitest';
import type { ActiveMission } from '../types/activeMission';
import type { Mission } from '../types/mission';
import type { ShiftCall, ShiftConfig, ShiftState } from '../types/shift';
import { createRng } from './rng';
import {
  advanceShift,
  assignCall,
  beginShift,
  DEFAULT_SHIFT_CONFIG,
  pauseShift,
  resumeShift,
} from './shift';

// ---------------------------------------------------------------------------
// Test helpers — hand-built calls/missions keep the reducer's inputs explicit
// and free of Date.now / crypto.randomUUID so everything is deterministic.
// ---------------------------------------------------------------------------

const MINIMAL_MISSION: Mission = {
  id: 'm',
  name: 'Test',
  description: '',
  requirements: { Combat: 0, Vigor: 0, Mobility: 0, Charisma: 0, Intellect: 0 },
  difficulty: 'Easy',
  maxAgents: 2,
  travelTime: 1,
  missionDuration: 1,
};

function pendingCall(id: string, spawnAt: number, timer = 25_000): ShiftCall {
  return { id, missionId: 'm', spawnAt, expiresAt: spawnAt + timer, status: 'pending' };
}

function stateWith(calls: ShiftCall[], overrides: Partial<ShiftState> = {}): ShiftState {
  return {
    phase: 'running',
    config: DEFAULT_SHIFT_CONFIG,
    shiftStartMs: 0,
    calls,
    activeMissions: [],
    tally: { succeeded: 0, failed: 0, missed: 0 },
    lastTickMs: -1, // so an initial advance to t=0 isn't swallowed by the idempotency guard
    ...overrides,
  };
}

/** A mission that completes exactly at `startTime + totalDuration`. */
function activeMission(
  id: string,
  startTime: number,
  totalDuration: number,
  success: boolean
): ActiveMission {
  return {
    id,
    mission: MINIMAL_MISSION,
    agents: [],
    startTime,
    currentPhase: 'travel-outbound',
    phaseStartTime: startTime,
    travelOutboundDuration: totalDuration,
    missionDuration: 0,
    travelReturnDuration: 0,
    restDuration: 0,
    totalDuration,
    outcome: { success, probability: success ? 1 : 0, roll: success ? 0 : 0.99 },
  };
}

const POOL = ['m1', 'm2', 'm3'];

// ---------------------------------------------------------------------------

describe('beginShift', () => {
  it('bakes a running state with a pending, seed-driven schedule', () => {
    const state = beginShift(DEFAULT_SHIFT_CONFIG, 0, createRng(42), POOL);

    expect(state.phase).toBe('running');
    expect(state.shiftStartMs).toBe(0);
    expect(state.lastTickMs).toBe(0);
    expect(state.calls.length).toBeGreaterThan(0);
    expect(state.calls.every((c) => c.status === 'pending')).toBe(true);
    // Schedule is strictly increasing and within the spawn phase.
    for (let i = 1; i < state.calls.length; i++) {
      expect(state.calls[i].spawnAt).toBeGreaterThan(state.calls[i - 1].spawnAt);
    }
    expect(state.calls.at(-1)?.spawnAt).toBeLessThan(DEFAULT_SHIFT_CONFIG.shiftDurationMs);
    // missionIds come from the pool.
    expect(state.calls.every((c) => POOL.includes(c.missionId))).toBe(true);
  });

  it('is fully deterministic for a given seed', () => {
    const a = beginShift(DEFAULT_SHIFT_CONFIG, 0, createRng(7), POOL);
    const b = beginShift(DEFAULT_SHIFT_CONFIG, 0, createRng(7), POOL);
    expect(a).toEqual(b);
  });

  it('produces a different schedule for a different seed', () => {
    const a = beginShift(DEFAULT_SHIFT_CONFIG, 0, createRng(1), POOL);
    const b = beginShift(DEFAULT_SHIFT_CONFIG, 0, createRng(2), POOL);
    expect(a.calls).not.toEqual(b.calls);
  });

  it('yields roughly a dozen calls with the tuned defaults', () => {
    const counts = [1, 2, 3, 4, 5].map(
      (seed) => beginShift(DEFAULT_SHIFT_CONFIG, 0, createRng(seed), POOL).calls.length
    );
    for (const n of counts) {
      expect(n).toBeGreaterThanOrEqual(8);
      expect(n).toBeLessThanOrEqual(16);
    }
  });
});

describe('advanceShift — spawning', () => {
  it('opens a call once its spawnAt passes, stamping a fresh timer', () => {
    const state = stateWith([pendingCall('call-0', 1000)]);
    const { state: next, events } = advanceShift(state, 1000, createRng(1));

    const call = next.calls[0];
    expect(call.status).toBe('open');
    // Timer starts at the tick the call opens (here, exactly spawnAt).
    expect(call.expiresAt).toBe(1000 + DEFAULT_SHIFT_CONFIG.callTimerMs);
    expect(events).toEqual([{ type: 'call-spawned', callId: 'call-0' }]);
  });

  it('does not open a call before its spawnAt', () => {
    const state = stateWith([pendingCall('call-0', 1000)]);
    const { state: next, events } = advanceShift(state, 999, createRng(1));
    expect(next.calls[0].status).toBe('pending');
    expect(events).toEqual([]);
  });

  it('holds overflow calls pending at the concurrency cap, opening them as slots free', () => {
    const config: ShiftConfig = { ...DEFAULT_SHIFT_CONFIG, maxOpenCalls: 2 };
    const calls = [
      pendingCall('call-0', 100),
      pendingCall('call-1', 200),
      pendingCall('call-2', 300),
    ];
    const state = stateWith(calls, { config });

    // All three are due, but only two may open.
    const { state: s1 } = advanceShift(state, 400, createRng(1));
    expect(s1.calls.map((c) => c.status)).toEqual(['open', 'open', 'pending']);

    // Expire one open call to free a slot (spawn runs before expire, so the
    // freed slot is taken on the following tick, not this one).
    const { state: s2 } = advanceShift(s1, s1.calls[0].expiresAt, createRng(1));
    expect(s2.calls[0].status).toBe('missed');
    expect(s2.calls[2].status).toBe('pending');

    const { state: s3 } = advanceShift(s2, s2.lastTickMs + 1, createRng(1));
    expect(s3.calls[2].status).toBe('open');
  });
});

describe('advanceShift — expiry / auto-fail', () => {
  it('marks an unassigned open call missed with no injury side effect', () => {
    const opened = advanceShift(stateWith([pendingCall('call-0', 0)]), 0, createRng(1)).state;
    const { state: next, events } = advanceShift(opened, opened.calls[0].expiresAt, createRng(1));

    expect(next.calls[0].status).toBe('missed');
    expect(next.tally.missed).toBe(1);
    expect(next.tally.failed).toBe(0); // missed != failed
    expect(next.activeMissions).toEqual([]); // nothing deployed → no injury path
    expect(events).toEqual([{ type: 'call-missed', callId: 'call-0' }]);
  });
});

describe('advanceShift — settling in-flight missions', () => {
  it('reveals a winning deploy-time outcome on completion and tallies it', () => {
    const opened = advanceShift(stateWith([pendingCall('call-0', 0)]), 0, createRng(1)).state;
    const mission = activeMission('am-0', 0, 5000, true);
    const assigned = assignCall(opened, 'call-0', mission);

    expect(assigned.calls[0].status).toBe('assigned');
    expect(assigned.calls[0].activeMissionId).toBe('am-0');

    // Before completion: still in flight, nothing settled.
    const mid = advanceShift(assigned, 4000, createRng(1));
    expect(mid.state.activeMissions).toHaveLength(1);
    expect(mid.events).toEqual([]);

    // At completion: settled as a success.
    const done = advanceShift(mid.state, 5000, createRng(1));
    expect(done.state.calls[0].status).toBe('succeeded');
    expect(done.state.tally.succeeded).toBe(1);
    expect(done.state.activeMissions).toEqual([]);
    expect(done.events).toEqual([
      { type: 'mission-completed', callId: 'call-0', activeMissionId: 'am-0', mission },
    ]);
  });

  it('reveals a losing outcome as failed', () => {
    const opened = advanceShift(stateWith([pendingCall('call-0', 0)]), 0, createRng(1)).state;
    const mission = activeMission('am-0', 0, 5000, false);
    const assigned = assignCall(opened, 'call-0', mission);

    const done = advanceShift(assigned, 5000, createRng(1));
    expect(done.state.calls[0].status).toBe('failed');
    expect(done.state.tally.failed).toBe(1);
    expect(done.state.tally.succeeded).toBe(0);
  });
});

describe('advanceShift — shift end', () => {
  it('ends once the spawn phase is over and no calls remain open', () => {
    const config: ShiftConfig = {
      ...DEFAULT_SHIFT_CONFIG,
      shiftDurationMs: 10_000,
      callTimerMs: 2000,
    };
    const state = stateWith([pendingCall('call-0', 1000, 2000)], { config });

    // Open then let the only call expire, all before the cutoff.
    const opened = advanceShift(state, 1000, createRng(1)).state;
    const drained = advanceShift(opened, opened.calls[0].expiresAt, createRng(1)).state;
    expect(drained.phase).toBe('running'); // still before cutoff

    const { state: ended, events } = advanceShift(drained, 10_000, createRng(1));
    expect(ended.phase).toBe('ended');
    expect(events).toContainEqual({ type: 'shift-ended' });
  });

  it('lets an in-flight mission finish (and fire XP/injury) after the shift ends', () => {
    const config: ShiftConfig = { ...DEFAULT_SHIFT_CONFIG, shiftDurationMs: 10_000 };
    const opened = advanceShift(
      stateWith([pendingCall('call-0', 1000)], { config }),
      1000,
      createRng(1)
    ).state;
    // Deploy a mission that outlasts the shift's spawn phase.
    const mission = activeMission('am-0', 1000, 20_000, true);
    const assigned = assignCall(opened, 'call-0', mission);

    // Cross the cutoff: shift ends even though the mission is still in flight.
    const atEnd = advanceShift(assigned, 10_000, createRng(1));
    expect(atEnd.state.phase).toBe('ended');
    expect(atEnd.state.activeMissions).toHaveLength(1);
    expect(atEnd.events).toContainEqual({ type: 'shift-ended' });

    // A later tick still settles it and emits mission-completed for XP/injury.
    const settled = advanceShift(atEnd.state, 21_000, createRng(1));
    expect(settled.state.phase).toBe('ended');
    expect(settled.state.tally.succeeded).toBe(1);
    expect(settled.events).toContainEqual(
      expect.objectContaining({ type: 'mission-completed', activeMissionId: 'am-0' })
    );
  });

  it('finalizes on the same tick when the shift ends with nothing in flight', () => {
    const config: ShiftConfig = {
      ...DEFAULT_SHIFT_CONFIG,
      shiftDurationMs: 10_000,
      callTimerMs: 2000,
    };
    const state = stateWith([pendingCall('call-0', 1000, 2000)], { config });
    const opened = advanceShift(state, 1000, createRng(1)).state;
    const drained = advanceShift(opened, opened.calls[0].expiresAt, createRng(1)).state;

    const { state: ended, events } = advanceShift(drained, 10_000, createRng(1));
    expect(ended.phase).toBe('ended');
    expect(events).toContainEqual({ type: 'shift-ended' });
    expect(events).toContainEqual({ type: 'shift-finalized' });
  });

  it('defers finalize until the last in-flight mission settles, then emits once', () => {
    const config: ShiftConfig = { ...DEFAULT_SHIFT_CONFIG, shiftDurationMs: 10_000 };
    const opened = advanceShift(
      stateWith([pendingCall('call-0', 1000)], { config }),
      1000,
      createRng(1)
    ).state;
    const mission = activeMission('am-0', 1000, 20_000, true);
    const assigned = assignCall(opened, 'call-0', mission);

    // Shift ends with the mission still returning — NOT finalized yet.
    const atEnd = advanceShift(assigned, 10_000, createRng(1));
    expect(atEnd.state.phase).toBe('ended');
    expect(atEnd.state.activeMissions).toHaveLength(1);
    expect(atEnd.events).toContainEqual({ type: 'shift-ended' });
    expect(atEnd.events).not.toContainEqual({ type: 'shift-finalized' });

    // The tick that settles the last mission emits shift-finalized.
    const settled = advanceShift(atEnd.state, 21_000, createRng(1));
    expect(settled.state.activeMissions).toHaveLength(0);
    expect(settled.events).toContainEqual({ type: 'shift-finalized' });

    // A further tick does not re-emit (already fully settled).
    const after = advanceShift(settled.state, 22_000, createRng(1));
    expect(after.events).not.toContainEqual({ type: 'shift-finalized' });
  });
});

describe('advanceShift — idempotency & pause', () => {
  it('is a no-op when advancing to lastTickMs or into the past', () => {
    const opened = advanceShift(stateWith([pendingCall('call-0', 0)]), 100, createRng(1)).state;
    expect(opened.lastTickMs).toBe(100);

    const same = advanceShift(opened, 100, createRng(1));
    expect(same.state).toBe(opened);
    expect(same.events).toEqual([]);

    const past = advanceShift(opened, 50, createRng(1));
    expect(past.state).toBe(opened);
    expect(past.events).toEqual([]);
  });

  it('replays bit-for-bit across a full scripted timeline', () => {
    const ticks = [0, 5_000, 20_000, 30_000, 60_000, 120_000, 181_000, 210_000];
    const run = () => {
      let state = beginShift(DEFAULT_SHIFT_CONFIG, 0, createRng(99), POOL);
      const rng = createRng(99);
      for (const t of ticks) {
        state = advanceShift(state, t, rng).state;
      }
      return state;
    };
    expect(run()).toEqual(run());
  });

  it('freezes while paused and resumes cleanly', () => {
    const opened = advanceShift(stateWith([pendingCall('call-0', 0)]), 0, createRng(1)).state;
    const paused = pauseShift(opened);
    expect(paused.phase).toBe('paused');

    // Advancing time while paused changes nothing.
    const frozen = advanceShift(paused, 999_999, createRng(1));
    expect(frozen.state).toBe(paused);
    expect(frozen.events).toEqual([]);

    // After resume, the call still expires normally.
    const resumed = resumeShift(paused);
    expect(resumed.phase).toBe('running');
    const { state: expired } = advanceShift(resumed, resumed.calls[0].expiresAt, createRng(1));
    expect(expired.calls[0].status).toBe('missed');
  });

  it('pause/resume are no-ops from the wrong phase', () => {
    const running = stateWith([]);
    expect(resumeShift(running)).toBe(running);
    expect(pauseShift(pauseShift(running)).phase).toBe('paused');
  });
});

describe('assignCall', () => {
  it('ignores assignment to a call that is not open', () => {
    const state = stateWith([pendingCall('call-0', 0)]); // still pending
    const result = assignCall(state, 'call-0', activeMission('am-0', 0, 1000, true));
    expect(result).toBe(state);
  });
});
