import { describe, expect, it, vi } from 'vitest';
import type { Character } from '../types/character';
import type { ShiftConfig, ShiftState, ShiftTally } from '../types/shift';
import type { ShiftSummary } from '../types/shiftSummary';
import { type FinalizeDeps, finalizeShift } from './Shift';

// finalizeShift is the reward-crediting seam pulled out of the Shift page so it
// can be unit-tested without React. It scores the shift, credits account
// rewards, grants stat points to one eligible hero, and records the summary.

const CONFIG: ShiftConfig = {
  seed: 7,
  shiftDurationMs: 180_000,
  maxOpenCalls: 4,
  callTimerMs: 25_000,
  spawnEveryMs: 13_500,
};

function stateWith(tally: ShiftTally): ShiftState {
  return {
    phase: 'ended',
    config: CONFIG,
    shiftStartMs: 0,
    calls: [],
    activeMissions: [],
    tally,
    lastTickMs: 0,
  };
}

function hero(id: string, fixedRank = false): Character {
  return {
    id,
    name: id,
    level: 1,
    experience: 0,
    stats: { Combat: 1, Vigor: 1, Mobility: 1, Charisma: 1, Intellect: 1 },
    availablePoints: 0,
    canFly: false,
    isFlightLicensed: false,
    restTime: 1,
    fixedRank,
  };
}

function deps(overrides: Partial<FinalizeDeps> = {}): FinalizeDeps {
  return {
    currentShiftNumber: 3,
    agents: [hero('alpha'), hero('beta')],
    rankProgress: { rankScore: 0, bestRankScore: 0 },
    grantAvailablePoints: vi.fn(),
    applyShiftRewards: vi.fn(),
    applyRankProgress: vi.fn(),
    recordShiftSummary: vi.fn(),
    ...overrides,
  };
}

describe('finalizeShift', () => {
  it('credits rewards, grants stat points to an eligible hero, and records the summary', () => {
    const d = deps();
    // Flawless 12/0/0 → statPoints 4, medKits 3, pityCharges 2.
    finalizeShift(stateWith({ succeeded: 12, failed: 0, missed: 0 }), d);

    expect(d.applyShiftRewards).toHaveBeenCalledWith({
      medKits: 3,
      pityCharges: 2,
      statPoints: 4,
    });

    // Exactly one hero received the 4 stat points.
    expect(d.grantAvailablePoints).toHaveBeenCalledTimes(1);
    const [recipientId, amount] = (d.grantAvailablePoints as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(['alpha', 'beta']).toContain(recipientId);
    expect(amount).toBe(4);

    const summary = (d.recordShiftSummary as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as ShiftSummary;
    expect(summary).toMatchObject({
      shiftNumber: 3,
      seed: 7,
      tally: { succeeded: 12, failed: 0, missed: 0 },
      rewards: { medKits: 3, pityCharges: 2, statPoints: 4 },
      statPointAgentId: recipientId,
    });
  });

  it('picks the recipient deterministically from the shift seed + success count', () => {
    const a = deps();
    const b = deps();
    const tally = { succeeded: 8, failed: 0, missed: 0 };
    finalizeShift(stateWith(tally), a);
    finalizeShift(stateWith(tally), b);

    const pickA = (a.grantAvailablePoints as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const pickB = (b.grantAvailablePoints as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(pickA).toBe(pickB); // same seed + tally → same hero
  });

  it('drops stat points (still crediting account rewards) when no hero is eligible', () => {
    // Every hero is fixed-rank, so there is no one to receive stat points.
    const d = deps({ agents: [hero('phenomaman', true)] });
    // 12/0/0 → statPoints 4, medKits 3, pityCharges 2.
    finalizeShift(stateWith({ succeeded: 12, failed: 0, missed: 0 }), d);

    expect(d.grantAvailablePoints).not.toHaveBeenCalled();
    // Account-level rewards are still credited.
    expect(d.applyShiftRewards).toHaveBeenCalledWith({
      medKits: 3,
      pityCharges: 2,
      statPoints: 4,
    });
    const summary = (d.recordShiftSummary as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as ShiftSummary;
    expect(summary.statPointAgentId).toBeUndefined();
  });

  it('grants nothing but still records a summary for a scoreless shift', () => {
    const d = deps();
    finalizeShift(stateWith({ succeeded: 0, failed: 3, missed: 2 }), d);

    expect(d.grantAvailablePoints).not.toHaveBeenCalled();
    expect(d.recordShiftSummary).toHaveBeenCalledTimes(1);
    const summary = (d.recordShiftSummary as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as ShiftSummary;
    expect(summary.rewards).toEqual({ medKits: 0, pityCharges: 0, statPoints: 0 });
    expect(summary.statPointAgentId).toBeUndefined();
  });

  it('applies the rank delta and records it (with promotions) on the summary', () => {
    // 24 short of DISPATCHER III; 12/0/0 → +36 crosses it.
    const d = deps({ rankProgress: { rankScore: 1, bestRankScore: 1 } });
    finalizeShift(stateWith({ succeeded: 12, failed: 0, missed: 0 }), d);

    expect(d.applyRankProgress).toHaveBeenCalledWith(36);
    const summary = (d.recordShiftSummary as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as ShiftSummary;
    expect(summary.rankDelta).toBe(36);
    expect(summary.promotions).toEqual(['DISPATCHER III']);
  });

  it('records a negative rank delta and no promotions on a bad shift', () => {
    const d = deps({ rankProgress: { rankScore: 50, bestRankScore: 80 } });
    // 0*3 - 3*2 - 2*4 = -14; bestRankScore unchanged → nothing gained.
    finalizeShift(stateWith({ succeeded: 0, failed: 3, missed: 2 }), d);

    expect(d.applyRankProgress).toHaveBeenCalledWith(-14);
    const summary = (d.recordShiftSummary as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as ShiftSummary;
    expect(summary.rankDelta).toBe(-14);
    expect(summary.promotions).toBeUndefined();
  });
});
