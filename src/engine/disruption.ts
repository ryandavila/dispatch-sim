// Pure disrupted-call rules: baking a mid-mission radio interruption into a
// deployed mission's timeline, deciding which of its response options are
// visible to the current team, and resolving the option the player picks.
// No React, no timers, no global state — randomness enters solely through the
// injectable `Rng`, and the only "clock" this module ever sees is the
// `activeStartMs`/`activeEndMs` window the caller passes in.

import type { Disruption, DisruptionOption, Mission } from '../types/mission';
import type { ShiftState } from '../types/shift';
import type { StatPool } from '../types/stats';
import type { Rng } from './rng';

// `combineTeamStats` (per-pillar sum capped at MAX_STAT_VALUE=10, per the
// mechanics-spec cap) already exists and is exported from resolution.ts —
// reused here rather than duplicated. Callers of this module build the
// `teamStats` passed to `resolveDisruptionOption` with that helper.
export { combineTeamStats as sumTeamStats } from './resolution';

/** Seeded chance that a mission with authored disruption data actually fires one. */
export const DISRUPTION_CHANCE = 0.5;

/** Result of baking a mission's disruption at deploy time. */
export interface BakedDisruption {
  /** Absolute ms (shift virtual clock) at which the radio interruption fires. */
  firesAtMs: number;
}

/**
 * Bake a mission's disruption timing at deploy time, against its already-known
 * active-phase window `[activeStartMs, activeEndMs)`.
 *
 * Returns `null` when the mission has no authored disruption data, or when
 * the seeded chance roll fails. When disruption data DOES exist, this always
 * consumes exactly 2 rng draws — one for the chance roll, one for the fire
 * point — regardless of whether the roll passes, so the rng stream stays
 * stable across the whole shift and doesn't fork based on outcomes.
 *
 * The fire point is uniform in the middle half of the active window:
 * `[start + 0.25 * span, start + 0.75 * span]`, so the interruption never
 * lands right at the start or end of the mission's active phase.
 */
export function bakeDisruption(
  mission: Mission,
  activeStartMs: number,
  activeEndMs: number,
  rng: Rng
): BakedDisruption | null {
  if (!mission.disruption) {
    return null;
  }

  const chanceRoll = rng();
  const fireRoll = rng();

  if (chanceRoll >= DISRUPTION_CHANCE) {
    return null;
  }

  const span = activeEndMs - activeStartMs;
  const firesAtMs = Math.round(activeStartMs + (0.25 + fireRoll * 0.5) * span);
  return { firesAtMs };
}

/**
 * The response options visible to the current deployed team: stat-gated
 * options are always visible; hero-specific options only appear when that
 * hero is part of the deployed team.
 */
export function visibleDisruptionOptions(
  disruption: Disruption,
  deployedHeroIds: string[]
): DisruptionOption[] {
  const deployed = new Set(deployedHeroIds);
  return disruption.options.filter(
    (option) => option.heroId === undefined || deployed.has(option.heroId)
  );
}

/** The outcome of resolving a single disruption option. */
export interface DisruptionResolution {
  optionId: string;
  success: boolean;
  /** xpBonus on pass; 0 on fail. */
  xpBonus: number;
  /** passText on success, failText on failure. */
  text: string;
}

/**
 * Resolve a chosen disruption option against the team. Pure threshold check —
 * no randomness. Hero-specific options (`heroId` set) always auto-succeed
 * when that hero is deployed (schema/authoring guarantees the option is only
 * ever shown, and thus only ever chosen, while its hero is on the team).
 * Stat options pass iff the team's capped stat total meets `threshold`.
 */
export function resolveDisruptionOption(
  option: DisruptionOption,
  teamStats: StatPool,
  deployedHeroIds: string[]
): DisruptionResolution {
  const success =
    option.heroId !== undefined
      ? deployedHeroIds.includes(option.heroId)
      : option.stat !== undefined &&
        option.threshold !== undefined &&
        teamStats[option.stat] >= option.threshold;

  return {
    optionId: option.id,
    success,
    xpBonus: success ? option.xpBonus : 0,
    text: success ? option.passText : option.failText,
  };
}

/**
 * Record a resolved disruption option onto the matching active mission. Pure:
 * returns a new `ShiftState` with that mission's `disruption.resolution` set,
 * leaving every other mission (and the rest of the state) untouched. No-op
 * (returns the same reference) if no active mission with a baked disruption
 * matches `activeMissionId`.
 */
export function recordDisruptionResolution(
  state: ShiftState,
  activeMissionId: string,
  resolution: DisruptionResolution
): ShiftState {
  const idx = state.activeMissions.findIndex(
    (m) => m.id === activeMissionId && m.disruption !== undefined
  );
  if (idx === -1) {
    return state;
  }

  const activeMissions = state.activeMissions.map((m, i) =>
    i === idx && m.disruption ? { ...m, disruption: { ...m.disruption, resolution } } : m
  );
  return { ...state, activeMissions };
}
