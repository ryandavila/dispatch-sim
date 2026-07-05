// Pure shift-loop reducer: schedules calls, expires unanswered ones, settles
// in-flight missions, and ends the shift. No React, no Date.now, no timers.
//
// Determinism has two seams, mirroring the rest of the engine:
//   - `Rng` (mulberry32) drives all randomness (schedule baking).
//   - `nowMs` (an injected virtual clock) drives all time.
// Given the same seed + same `nowMs` sequence, a shift replays bit-for-bit.
//
// Phase 2 is additive: it never touches the resolution engine. Outcomes are
// still rolled at deploy time on `ActiveMission.outcome`; the reducer only
// *reveals* them when the mission completes.

import type { ActiveMission } from '../types/activeMission';
import { calculateMissionProgress } from '../types/activeMission';
import type {
  ShiftCall,
  ShiftConfig,
  ShiftEvent,
  ShiftState,
  ShiftStep,
  ShiftTally,
} from '../types/shift';
import type { Rng } from './rng';

/** Per-spawn jitter applied to `spawnEveryMs` (±30%). */
export const SPAWN_JITTER = 0.3;

/** Locked defaults from the Phase 2 design doc (Section 6). */
export const DEFAULT_SHIFT_CONFIG: ShiftConfig = {
  seed: 1,
  shiftDurationMs: 180_000, // ~3 min spawn phase
  maxOpenCalls: 4,
  callTimerMs: 25_000, // ~25s per-call expiry
  spawnEveryMs: 13_500, // ~1 call / 12–15s → ~12 calls per shift
};

/**
 * Pre-bake a shift's spawn schedule from the seed and return the initial
 * running state. Each call gets a jittered `spawnAt` and a missionId drawn
 * from `missionPool`; the rng stream is consumed identically regardless of
 * pool contents so replay stays stable.
 */
export function beginShift(
  config: ShiftConfig,
  startMs: number,
  rng: Rng,
  missionPool: string[]
): ShiftState {
  const calls: ShiftCall[] = [];
  const cutoff = startMs + config.shiftDurationMs;
  let t = startMs;
  let index = 0;

  while (true) {
    const jitter = 1 + (rng() * 2 - 1) * SPAWN_JITTER;
    t += config.spawnEveryMs * jitter;
    const spawnAt = Math.round(t);
    // Always draw so the stream is independent of the pool being empty.
    const pick = rng();
    if (spawnAt >= cutoff) {
      break;
    }
    const missionId =
      missionPool.length > 0 ? missionPool[Math.floor(pick * missionPool.length)] : '';
    calls.push({
      id: `call-${index}`,
      missionId,
      spawnAt,
      expiresAt: spawnAt + config.callTimerMs,
      status: 'pending',
    });
    index++;
  }

  return {
    phase: 'running',
    config,
    shiftStartMs: startMs,
    calls,
    activeMissions: [],
    tally: { succeeded: 0, failed: 0, missed: 0 },
    lastTickMs: startMs,
  };
}

/** Pause the shift clock (Decision #8). No-op unless currently running. */
export function pauseShift(state: ShiftState): ShiftState {
  return state.phase === 'running' ? { ...state, phase: 'paused' } : state;
}

/** Resume a paused shift. No-op unless currently paused. */
export function resumeShift(state: ShiftState): ShiftState {
  return state.phase === 'paused' ? { ...state, phase: 'running' } : state;
}

/**
 * Assign a deployed hero (its already-rolled `ActiveMission`) to an open call.
 * Frees the open slot so a cap-blocked pending call can open on the next tick.
 * No-op if the call is not currently open.
 */
export function assignCall(
  state: ShiftState,
  callId: string,
  activeMission: ActiveMission
): ShiftState {
  const idx = state.calls.findIndex((c) => c.id === callId && c.status === 'open');
  if (idx === -1) {
    return state;
  }
  const calls = state.calls.map((c, k) =>
    k === idx ? { ...c, status: 'assigned' as const, activeMissionId: activeMission.id } : c
  );
  return { ...state, calls, activeMissions: [...state.activeMissions, activeMission] };
}

/**
 * Advance the shift to `nowMs`: spawn → expire → settle → shift-end check.
 * Pure and idempotent — advancing to a `nowMs <= lastTickMs`, or while idle
 * or paused, is a no-op. `rng` is reserved for future moment-of-roll changes;
 * with a pre-baked schedule and deploy-time rolls the tick needs no draws.
 */
export function advanceShift(state: ShiftState, nowMs: number, rng: Rng): ShiftStep {
  void rng; // reserved; kept for a stable, deterministic API surface
  if (state.phase === 'idle' || state.phase === 'paused' || nowMs <= state.lastTickMs) {
    return { state, events: [] };
  }

  const events: ShiftEvent[] = [];
  const calls = state.calls.map((c) => ({ ...c }));
  const tally: ShiftTally = { ...state.tally };
  const spawnCutoff = state.shiftStartMs + state.config.shiftDurationMs;

  if (state.phase === 'running') {
    spawnDueCalls(calls, nowMs, spawnCutoff, state.config, events);
  }
  expireOpenCalls(calls, nowMs, tally, events);
  const activeMissions = settleMissions(calls, state.activeMissions, nowMs, tally, events);

  let phase = state.phase;
  if (phase === 'running' && nowMs >= spawnCutoff && !calls.some((c) => c.status === 'open')) {
    phase = 'ended';
    events.push({ type: 'shift-ended' });
  }

  return {
    state: { ...state, phase, calls, activeMissions, tally, lastTickMs: nowMs },
    events,
  };
}

/**
 * Open every pending call whose `spawnAt` has passed, oldest first, until the
 * concurrency cap is hit. Skipped entirely once the spawn phase is over.
 * Mutates the (already-cloned) `calls` and pushes `call-spawned` events.
 */
function spawnDueCalls(
  calls: ShiftCall[],
  nowMs: number,
  spawnCutoff: number,
  config: ShiftConfig,
  events: ShiftEvent[]
): void {
  if (nowMs >= spawnCutoff) {
    return;
  }
  let openCount = calls.filter((c) => c.status === 'open').length;
  const due = calls
    .filter((c) => c.status === 'pending' && c.spawnAt <= nowMs)
    .sort((a, b) => a.spawnAt - b.spawnAt);

  for (const call of due) {
    if (openCount >= config.maxOpenCalls) {
      break;
    }
    call.status = 'open';
    // Timer starts when the call becomes visible, so cap-delayed calls are fair.
    call.expiresAt = nowMs + config.callTimerMs;
    events.push({ type: 'call-spawned', callId: call.id });
    openCount++;
  }
}

/** Auto-fail open calls past their timer → `missed` (no injury). */
function expireOpenCalls(
  calls: ShiftCall[],
  nowMs: number,
  tally: ShiftTally,
  events: ShiftEvent[]
): void {
  for (const call of calls) {
    if (call.status === 'open' && call.expiresAt <= nowMs) {
      call.status = 'missed';
      tally.missed++;
      events.push({ type: 'call-missed', callId: call.id });
    }
  }
}

/**
 * Reveal the deploy-time outcome of any mission that has reached `completed`,
 * updating its source call and the tally. Returns the still-in-flight missions.
 */
function settleMissions(
  calls: ShiftCall[],
  activeMissions: ActiveMission[],
  nowMs: number,
  tally: ShiftTally,
  events: ShiftEvent[]
): ActiveMission[] {
  const remaining: ActiveMission[] = [];
  for (const mission of activeMissions) {
    if (calculateMissionProgress(mission, nowMs).phase !== 'completed') {
      remaining.push(mission);
      continue;
    }
    const call = calls.find((c) => c.activeMissionId === mission.id);
    if (call && call.status === 'assigned') {
      call.status = mission.outcome.success ? 'succeeded' : 'failed';
    }
    if (mission.outcome.success) {
      tally.succeeded++;
    } else {
      tally.failed++;
    }
    events.push({
      type: 'mission-completed',
      callId: call?.id,
      activeMissionId: mission.id,
      mission,
    });
  }
  return remaining;
}
