import type { ActiveMission } from './activeMission';

// A "call" is a scheduled instance of a mission with spawn + expiry timing.
// It moves through these states over the course of a shift:
//   pending   — baked into the schedule, not yet visible to the player
//   open      — visible with a running countdown; can be assigned or expire
//   assigned  — a hero was deployed; an ActiveMission is now in flight
//   succeeded — the deployed mission completed with a winning roll
//   failed    — the deployed mission completed with a losing roll (injures)
//   missed    — the open call expired without ever being assigned (no injury)
export type CallStatus = 'pending' | 'open' | 'assigned' | 'succeeded' | 'failed' | 'missed';

export interface ShiftCall {
  id: string;
  /** Resolves to a Mission template in the catalog. */
  missionId: string;
  /** Absolute ms (shift virtual clock) at which the call is scheduled to open. */
  spawnAt: number;
  /**
   * Absolute ms at which an open call auto-fails. Baked as `spawnAt + callTimerMs`
   * but re-stamped to `openedAt + callTimerMs` when the call actually opens, so a
   * call held back by the concurrency cap still gets a full timer. Only meaningful
   * while `status === 'open'`.
   */
  expiresAt: number;
  status: CallStatus;
  /** Set once the call is assigned/deployed. */
  activeMissionId?: string;
}

export interface ShiftConfig {
  /** Seed driving the injectable rng that bakes this shift's schedule. */
  seed: number;
  /** Wall span of the spawn phase; after this, no new calls open. */
  shiftDurationMs: number;
  /** Cap on simultaneously-open calls; overflow spawns wait as `pending`. */
  maxOpenCalls: number;
  /** Per-call countdown window (ms) once a call opens. */
  callTimerMs: number;
  /** Mean gap (ms) between scheduled spawns; jittered per-spawn from the seed. */
  spawnEveryMs: number;
}

export type ShiftPhase = 'idle' | 'running' | 'paused' | 'ended';

export interface ShiftTally {
  succeeded: number;
  failed: number;
  missed: number;
}

export interface ShiftState {
  phase: ShiftPhase;
  config: ShiftConfig;
  /** Absolute epoch (virtual clock) when the shift began. */
  shiftStartMs: number;
  /** Full queue: pending + open + resolved. */
  calls: ShiftCall[];
  /** In-flight missions the shift is waiting to settle. */
  activeMissions: ActiveMission[];
  tally: ShiftTally;
  /** Last `nowMs` the reducer advanced to; guarantees idempotent advancement. */
  lastTickMs: number;
}

export type ShiftEventType =
  | 'call-spawned'
  | 'call-missed'
  | 'mission-completed'
  | 'shift-ended'
  | 'shift-finalized';

export interface ShiftEvent {
  type: ShiftEventType;
  callId?: string;
  activeMissionId?: string;
  /**
   * Present on `mission-completed`: the settled mission, so the hook can drive
   * the existing XP / injury / med-kit paths without re-deriving it.
   */
  mission?: ActiveMission;
}

export interface ShiftStep {
  state: ShiftState;
  events: ShiftEvent[];
}
