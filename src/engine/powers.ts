// Pure signature-power rules: gating (once per shift, not while downed), and
// the two engine-level effects (Golem's stat reset, Prism's call extension).
// No React, no timers, no global state — mirrors engine/injury.ts.
//
// Malevola's power (reveal the hidden requirement pentagon) has no engine-side
// state of its own: it is gated the same way as the others via
// `canUseHeroPower`, but "revealed" is page-local UI state in Shift.tsx (see
// integration notes), so there is nothing further to model here.

import type { Character } from '../types/character';
import type { ShiftState } from '../types/shift';
import { PILLARS } from '../types/stats';
import { isDowned } from './injury';

/** Hero ids for the three signature powers. */
export const GOLEM_ID = 'golem';
export const PRISM_ID = 'prism';
export const MALEVOLA_ID = 'malevola';

/** How much extra time Prism's uplink adds to an open call's countdown. */
export const PRISM_EXTEND_MS = 10_000;

/**
 * Whether a hero's signature power can be used right now: the hero must
 * exist, must not be downed, and must not have already used their power
 * during this shift. `powerUsage` is keyed by hero id and stamped with the
 * shift number the power was last used in — so a fresh shift (a new
 * `shiftNumber`) automatically re-enables it. A hero out on a mission can
 * still radio in; being busy is not a gate.
 */
export function canUseHeroPower(
  heroId: string,
  powerUsage: Record<string, number>,
  shiftNumber: number,
  hero: Pick<Character, 'injuryCount'> | undefined
): boolean {
  if (!hero) {
    return false;
  }
  if (isDowned(hero)) {
    return false;
  }
  return powerUsage[heroId] !== shiftNumber;
}

/**
 * GOLEM — SIGNATURE: FACTORY RESET. The real game's one sanctioned respec:
 * refund every allocated stat point back to `availablePoints` and reset
 * `stats` to the agent's base pillar values. Level, XP, and injuries are
 * untouched — this only undoes stat allocation.
 */
export function golemStatReset(current: Character, base: Character): Character {
  const allocatedAbovebase = PILLARS.reduce(
    (sum, pillar) => sum + (current.stats[pillar] - base.stats[pillar]),
    0
  );
  return {
    ...current,
    stats: { ...base.stats },
    availablePoints: current.availablePoints + allocatedAbovebase,
  };
}

/**
 * PRISM — SIGNATURE: EXTEND WINDOW. Pushes an open call's expiry back by
 * `extraMs`. No-op (returns `state` unchanged) if the call doesn't exist or
 * isn't currently `open` — e.g. it already got assigned or expired. Lives
 * here (rather than engine/shift.ts) so the shift reducer stays untouched.
 */
export function extendCall(state: ShiftState, callId: string, extraMs: number): ShiftState {
  const idx = state.calls.findIndex((c) => c.id === callId && c.status === 'open');
  if (idx === -1) {
    return state;
  }
  const calls = state.calls.map((c, i) =>
    i === idx ? { ...c, expiresAt: c.expiresAt + extraMs } : c
  );
  return { ...state, calls };
}
