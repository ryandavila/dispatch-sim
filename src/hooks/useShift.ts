import { useCallback, useEffect, useRef, useState } from 'react';
import { bakeDisruption } from '../engine/disruption';
import { getEffectiveStats } from '../engine/injury';
import {
  applyProbabilityModifiers,
  calculateTeamSuccessProbability,
  resolveMissionOutcome,
} from '../engine/resolution';
import type { Rng } from '../engine/rng';
import {
  advanceShift,
  assignCall,
  beginShift,
  DEFAULT_SHIFT_CONFIG,
  pauseShift,
  resumeShift,
} from '../engine/shift';
import { callTimerMsForDifficulty } from '../engine/shiftLadder';
import { getTeamSynergies, synergyPairKey } from '../engine/synergy';
import type { ActiveMission } from '../types/activeMission';
import type { Character } from '../types/character';
import type { Mission } from '../types/mission';
import type { ShiftCall, ShiftConfig, ShiftEvent, ShiftState, ShiftTally } from '../types/shift';
import { getMissionTimeBreakdown } from '../utils/missionTime';

/** Wall-clock reader; the hook's only source of real time. */
export type Clock = () => number;

/** Emitted after each deploy roll so synergy counts and pity can be persisted. */
export interface DeployRollInfo {
  /** synergyPairKey of each synergy duo that deployed together. */
  synergyPairKeys: string[];
  /** True only when the pity guarantee actually converted a would-be failure. */
  pityUsed: boolean;
}

// Mirrors useActiveMissions: 1 real second = 1 mission time unit.
const TIME_SCALE = 1000;
const DEFAULT_TICK_MS = 250;

export interface UseShiftOptions {
  /** Catalog the schedule draws from and deploys resolve against. */
  missions: Mission[];
  config?: ShiftConfig;
  /** Real clock; injectable so tests can drive a fake. Default `Date.now`. */
  clock?: Clock;
  /** Shared with the schedule bake so all randomness stays on one stream. */
  rng?: Rng;
  tickMs?: number;
  onMissionComplete?: (mission: ActiveMission) => void;
  onCallMissed?: (call: ShiftCall) => void;
  onCallSpawned?: (call: ShiftCall) => void;
  onShiftEnded?: (tally: ShiftTally) => void;
  /**
   * Fired once the shift is fully settled — ended AND every in-flight mission
   * has finished (Decision #6). The tally is final at this point, so this is
   * where end-of-shift rewards are scored and the summary is recorded. Receives
   * the final `ShiftState` for its `tally` and `config.seed`.
   */
  onShiftFinalized?: (state: ShiftState) => void;
  getSynergyDispatchCount?: (pairKey: string) => number;
  pityRemaining?: number;
  onDeployRolled?: (info: DeployRollInfo) => void;
  /** ActiveMission id factory; injectable for deterministic tests. */
  createId?: () => string;
  /**
   * How `start()` derives the schedule's mission pool from the catalog. The
   * pool may repeat ids to weight spawn odds (see `missionPoolForShift`); the
   * schedule bake draws uniformly from it. Defaults to one entry per mission.
   */
  buildPool?: (missions: Mission[]) => string[];
  /**
   * localStorage key for freeze-&-resume persistence (Decision #5). When set,
   * an in-progress shift survives a refresh, resuming as if no time passed.
   * Omit to keep the shift ephemeral (the default; tests rely on this).
   */
  storageKey?: string;
}

function idleState(config: ShiftConfig): ShiftState {
  return {
    phase: 'idle',
    config,
    shiftStartMs: 0,
    calls: [],
    activeMissions: [],
    tally: { succeeded: 0, failed: 0, missed: 0 },
    lastTickMs: 0,
  };
}

interface ShiftInit {
  state: ShiftState;
  pausedAccum: number;
  pauseStart: number | null;
}

const SHIFT_PHASES: ReadonlyArray<ShiftState['phase']> = ['idle', 'running', 'paused', 'ended'];

function loadPersistedShift(storageKey: string | undefined): ShiftState | null {
  if (!storageKey) {
    return null;
  }
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<ShiftState>;
    // Minimal shape guard: a malformed blob (e.g. `{}`) would otherwise pass
    // the `phase !== 'idle'` resume check and freeze the board with a state
    // no reducer branch matches. Discarding it costs only the saved shift.
    if (
      !parsed ||
      !SHIFT_PHASES.includes(parsed.phase as ShiftState['phase']) ||
      !Array.isArray(parsed.calls) ||
      !Array.isArray(parsed.activeMissions) ||
      typeof parsed.lastTickMs !== 'number' ||
      typeof parsed.config !== 'object'
    ) {
      return null;
    }
    return parsed as ShiftState;
  } catch {
    return null;
  }
}

/**
 * Compute the hook's initial state + clock offset. If a persisted shift exists,
 * resume it: the virtual clock continues from the saved `lastTickMs`, so any
 * wall time spent away is absorbed as paused time rather than fast-forwarding
 * every timer (Decision #5). A shift saved mid-pause resumes running, since the
 * open-call panel it was paused for is gone after a reload.
 */
function computeShiftInit(options: UseShiftOptions): ShiftInit {
  const config = options.config ?? DEFAULT_SHIFT_CONFIG;
  const restored = loadPersistedShift(options.storageKey);
  if (restored && restored.phase !== 'idle') {
    const now = (options.clock ?? Date.now)();
    const state =
      restored.phase === 'paused' ? { ...restored, phase: 'running' as const } : restored;
    return { state, pausedAccum: now - restored.lastTickMs, pauseStart: null };
  }
  return { state: idleState(config), pausedAccum: 0, pauseStart: null };
}

/**
 * The single real-clock owner for Phase 2. It holds `ShiftState`, pumps
 * `advanceShift` on a wall-clock interval, and maps the reducer's events onto
 * the existing XP / injury / med-kit callbacks. All game logic lives in the
 * pure engine; this hook only supplies time and side-effects.
 *
 * The shift runs on a *pausable virtual clock*: virtual time = wall time minus
 * accumulated paused wall time, so pausing (Decision #8) freezes both call
 * timers and in-flight missions and resumes "as if no time passed."
 */
export function useShift(options: UseShiftOptions) {
  // Compute the initial state (and any resumed clock offset) exactly once.
  const initRef = useRef<ShiftInit | null>(null);
  if (initRef.current === null) {
    initRef.current = computeShiftInit(options);
  }

  const [shift, setShift] = useState<ShiftState>(initRef.current.state);
  const stateRef = useRef(shift);
  const optsRef = useRef(options);
  const pausedAccumRef = useRef(initRef.current.pausedAccum);
  const pauseStartWallRef = useRef<number | null>(initRef.current.pauseStart);

  useEffect(() => {
    optsRef.current = options;
  });

  // Persist an in-progress shift; clear it once idle (Decision #5).
  useEffect(() => {
    const key = options.storageKey;
    if (!key) {
      return;
    }
    try {
      if (shift.phase === 'idle') {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(shift));
      }
    } catch {
      // ignore serialize / quota errors — persistence is best-effort
    }
  }, [shift, options.storageKey]);

  const applyState = useCallback((next: ShiftState) => {
    stateRef.current = next;
    setShift(next);
  }, []);

  // Virtual clock: frozen at the pause instant while paused, else wall - paused.
  const virtualNow = useCallback(() => {
    const clock = optsRef.current.clock ?? Date.now;
    const wall = pauseStartWallRef.current ?? clock();
    return wall - pausedAccumRef.current;
  }, []);

  const emit = useCallback((event: ShiftEvent) => {
    const opts = optsRef.current;
    const state = stateRef.current;
    switch (event.type) {
      case 'mission-completed':
        if (event.mission) {
          opts.onMissionComplete?.(event.mission);
        }
        break;
      case 'call-spawned': {
        const call = state.calls.find((c) => c.id === event.callId);
        if (call) {
          opts.onCallSpawned?.(call);
        }
        break;
      }
      case 'call-missed': {
        const call = state.calls.find((c) => c.id === event.callId);
        if (call) {
          opts.onCallMissed?.(call);
        }
        break;
      }
      case 'shift-ended':
        opts.onShiftEnded?.(state.tally);
        break;
      case 'shift-finalized':
        // `state` is the already-applied final state (applyState ran before
        // this emit loop), so its tally reflects every settled mission.
        opts.onShiftFinalized?.(state);
        break;
    }
  }, []);

  const tick = useCallback(() => {
    const state = stateRef.current;
    if (state.phase === 'idle' || state.phase === 'paused') {
      return;
    }
    const rng = optsRef.current.rng ?? Math.random;
    const step = advanceShift(state, virtualNow(), rng);
    if (step.state === state) {
      return; // no-op tick (nothing due)
    }
    applyState(step.state);
    for (const event of step.events) {
      emit(event);
    }
  }, [applyState, emit, virtualNow]);

  // Tick only while there is time-driven work: an active spawn phase, or
  // in-flight missions still settling after the shift ended (Decision #6).
  const isTicking =
    shift.phase === 'running' || (shift.phase === 'ended' && shift.activeMissions.length > 0);
  const tickMs = options.tickMs ?? DEFAULT_TICK_MS;

  useEffect(() => {
    if (!isTicking) {
      return;
    }
    const id = setInterval(tick, tickMs);
    return () => clearInterval(id);
  }, [isTicking, tickMs, tick]);

  const start = useCallback(
    (config?: ShiftConfig) => {
      const opts = optsRef.current;
      const clock = opts.clock ?? Date.now;
      const rng = opts.rng ?? Math.random;
      pausedAccumRef.current = 0;
      pauseStartWallRef.current = null;
      const cfg = config ?? opts.config ?? DEFAULT_SHIFT_CONFIG;
      const pool = opts.buildPool ? opts.buildPool(opts.missions) : opts.missions.map((m) => m.id);
      const callTimerFor = (missionId: string) => {
        const mission = opts.missions.find((m) => m.id === missionId);
        return mission
          ? callTimerMsForDifficulty(mission.difficulty, cfg.callTimerMs)
          : cfg.callTimerMs;
      };
      applyState(beginShift(cfg, clock(), rng, pool, callTimerFor));
    },
    [applyState]
  );

  const reset = useCallback(() => {
    pausedAccumRef.current = 0;
    pauseStartWallRef.current = null;
    applyState(idleState(optsRef.current.config ?? DEFAULT_SHIFT_CONFIG));
  }, [applyState]);

  const pause = useCallback(() => {
    const state = stateRef.current;
    if (state.phase !== 'running') {
      return;
    }
    const clock = optsRef.current.clock ?? Date.now;
    pauseStartWallRef.current = clock();
    applyState(pauseShift(state));
  }, [applyState]);

  const resume = useCallback(() => {
    const state = stateRef.current;
    if (state.phase !== 'paused') {
      return;
    }
    const clock = optsRef.current.clock ?? Date.now;
    if (pauseStartWallRef.current !== null) {
      pausedAccumRef.current += clock() - pauseStartWallRef.current;
      pauseStartWallRef.current = null;
    }
    applyState(resumeShift(state));
  }, [applyState]);

  /**
   * Roll and deploy a team against an open call. Uses the same modifier stack
   * as useActiveMissions.deployMission (resolution engine untouched); the only
   * difference is `startTime` is stamped from the virtual clock so it survives
   * pauses. Does not auto-resume — the caller closes the call panel first.
   */
  const deploy = useCallback(
    (callId: string, agents: Character[]): ActiveMission | null => {
      const opts = optsRef.current;
      const state = stateRef.current;
      const call = state.calls.find((c) => c.id === callId && c.status === 'open');
      if (!call) {
        return null;
      }
      const mission = opts.missions.find((m) => m.id === call.missionId);
      if (!mission) {
        return null;
      }

      const rng = opts.rng ?? Math.random;
      const now = virtualNow();
      const timeBreakdown = getMissionTimeBreakdown(mission, agents);
      const teamSynergies = getTeamSynergies(
        agents.map((a) => a.id),
        (pairKey) => opts.getSynergyDispatchCount?.(pairKey) ?? 0
      );
      const baseProbability = calculateTeamSuccessProbability(
        agents.map((a) => getEffectiveStats(a)),
        mission.requirements
      );
      const { probability, pityApplies } = applyProbabilityModifiers({
        baseProbability,
        difficulty: mission.difficulty,
        synergyLevels: teamSynergies.map((s) => s.level),
        pityRemaining: opts.pityRemaining ?? 0,
        teamSize: agents.length,
      });
      const outcome = resolveMissionOutcome(probability, rng, pityApplies);

      opts.onDeployRolled?.({
        synergyPairKeys: teamSynergies.map(({ pair }) => synergyPairKey(pair[0], pair[1])),
        // Only report pity as used (→ consume a charge) when it actually saved the roll.
        pityUsed: outcome.pityUsed ?? false,
      });

      const createId = opts.createId ?? (() => crypto.randomUUID());
      const travelOutboundDuration = timeBreakdown.travelTimeOutbound * TIME_SCALE;
      const missionDuration = timeBreakdown.missionDuration * TIME_SCALE;
      const travelReturnDuration = timeBreakdown.travelTimeReturn * TIME_SCALE;
      const restDuration = timeBreakdown.restTime * TIME_SCALE;

      // Disrupted calls: baked here, after the outcome roll, on the same rng
      // stream (bakeDisruption consumes a fixed 2 draws whenever the mission
      // has authored disruption data, so replay stays stable).
      const activeStartMs = now + travelOutboundDuration;
      const disruption = bakeDisruption(
        mission,
        activeStartMs,
        activeStartMs + missionDuration,
        rng
      );

      const activeMission: ActiveMission = {
        id: createId(),
        mission,
        agents,
        startTime: now,
        currentPhase: 'travel-outbound',
        phaseStartTime: now,
        travelOutboundDuration,
        missionDuration,
        travelReturnDuration,
        restDuration,
        totalDuration:
          travelOutboundDuration + missionDuration + travelReturnDuration + restDuration,
        outcome,
        ...(disruption ? { disruption } : {}),
      };

      applyState(assignCall(state, callId, activeMission));
      return activeMission;
    },
    [applyState, virtualNow]
  );

  /**
   * Apply a pure transform to the live state — the seam for player actions
   * that aren't reducer steps (disruption resolutions, hero powers). The
   * transform must be pure; a same-reference return is a no-op.
   */
  const update = useCallback(
    (fn: (state: ShiftState) => ShiftState) => {
      const next = fn(stateRef.current);
      if (next !== stateRef.current) {
        applyState(next);
      }
    },
    [applyState]
  );

  return {
    shift,
    /** Latest virtual time the reducer advanced to; use for countdown display. */
    now: shift.lastTickMs,
    start,
    deploy,
    pause,
    resume,
    reset,
    update,
  };
}
