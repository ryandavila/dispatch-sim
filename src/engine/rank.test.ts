import { describe, expect, it } from 'vitest';
import { applyRankDelta, RANK_TIERS, rankDelta, tierForScore } from './rank';

describe('rankDelta', () => {
  it('scores succeeded/failed/missed as +3/-2/-4', () => {
    expect(rankDelta({ succeeded: 1, failed: 0, missed: 0 })).toBe(3);
    expect(rankDelta({ succeeded: 0, failed: 1, missed: 0 })).toBe(-2);
    expect(rankDelta({ succeeded: 0, failed: 0, missed: 1 })).toBe(-4);
  });

  it('missed calls punish harder than failed calls', () => {
    const failed = rankDelta({ succeeded: 0, failed: 1, missed: 0 });
    const missed = rankDelta({ succeeded: 0, failed: 0, missed: 1 });
    expect(Math.abs(missed)).toBeGreaterThan(Math.abs(failed));
  });

  it('combines counts linearly', () => {
    expect(rankDelta({ succeeded: 10, failed: 2, missed: 1 })).toBe(10 * 3 + 2 * -2 + 1 * -4);
  });

  it('an empty shift scores 0', () => {
    expect(rankDelta({ succeeded: 0, failed: 0, missed: 0 })).toBe(0);
  });
});

describe('RANK_TIERS', () => {
  it('is ordered ascending by minScore', () => {
    for (let i = 1; i < RANK_TIERS.length; i++) {
      expect(RANK_TIERS[i].minScore).toBeGreaterThan(RANK_TIERS[i - 1].minScore);
    }
  });

  it('matches the locked tier ladder', () => {
    expect(
      RANK_TIERS.map((t) => [t.name, t.minScore, t.rewards.bandages, t.rewards.defibrillators])
    ).toEqual([
      ['PROBATIONARY', 0, 0, 0],
      ['DISPATCHER III', 25, 2, 1],
      ['DISPATCHER II', 60, 2, 1],
      ['DISPATCHER I', 105, 3, 1],
      ['SENIOR DISPATCHER', 160, 3, 2],
      ['DISPATCH COMMANDER', 225, 4, 2],
    ]);
  });
});

describe('tierForScore', () => {
  it('returns PROBATIONARY below the first threshold', () => {
    expect(tierForScore(0).name).toBe('PROBATIONARY');
    expect(tierForScore(24).name).toBe('PROBATIONARY');
  });

  it('returns the exact tier at a boundary (minScore is inclusive)', () => {
    expect(tierForScore(25).name).toBe('DISPATCHER III');
    expect(tierForScore(60).name).toBe('DISPATCHER II');
    expect(tierForScore(105).name).toBe('DISPATCHER I');
    expect(tierForScore(160).name).toBe('SENIOR DISPATCHER');
    expect(tierForScore(225).name).toBe('DISPATCH COMMANDER');
  });

  it('returns the highest tier whose minScore <= score', () => {
    expect(tierForScore(59).name).toBe('DISPATCHER III');
    expect(tierForScore(1000).name).toBe('DISPATCH COMMANDER');
  });

  it('clamps negative scores to 0 before resolving a tier', () => {
    expect(tierForScore(-50).name).toBe('PROBATIONARY');
  });
});

describe('applyRankDelta', () => {
  it('adds the delta to rankScore and tracks bestRankScore', () => {
    const result = applyRankDelta({ rankScore: 10, bestRankScore: 10 }, 5);
    expect(result.rankScore).toBe(15);
    expect(result.bestRankScore).toBe(15);
  });

  it('floors rankScore at 0 on a large negative delta', () => {
    const result = applyRankDelta({ rankScore: 5, bestRankScore: 20 }, -100);
    expect(result.rankScore).toBe(0);
    expect(result.bestRankScore).toBe(20); // unaffected by a drop
  });

  it('bestRankScore never decreases even when rankScore drops', () => {
    const result = applyRankDelta({ rankScore: 30, bestRankScore: 30 }, -10);
    expect(result.rankScore).toBe(20);
    expect(result.bestRankScore).toBe(30);
  });

  it('reports tiersGained crossed by this update', () => {
    const result = applyRankDelta({ rankScore: 20, bestRankScore: 20 }, 10);
    expect(result.rankScore).toBe(30);
    expect(result.bestRankScore).toBe(30);
    expect(result.tiersGained.map((t) => t.name)).toEqual(['DISPATCHER III']);
  });

  it('reports multiple tiersGained crossed in a single large jump', () => {
    const result = applyRankDelta({ rankScore: 0, bestRankScore: 0 }, 70);
    expect(result.tiersGained.map((t) => t.name)).toEqual(['DISPATCHER III', 'DISPATCHER II']);
  });

  it('reports no tiersGained when the update does not cross a new best threshold', () => {
    const result = applyRankDelta({ rankScore: 25, bestRankScore: 25 }, 1);
    expect(result.rankScore).toBe(26);
    expect(result.tiersGained).toEqual([]);
  });

  it('never re-pays a tier crossed by an earlier best on drop-and-reclimb', () => {
    // First climb crosses DISPATCHER III (25).
    const first = applyRankDelta({ rankScore: 20, bestRankScore: 20 }, 10);
    expect(first.rankScore).toBe(30);
    expect(first.bestRankScore).toBe(30);
    expect(first.tiersGained.map((t) => t.name)).toEqual(['DISPATCHER III']);

    // Drop back below the tier's threshold.
    const dropped = applyRankDelta(first, -20);
    expect(dropped.rankScore).toBe(10);
    expect(dropped.bestRankScore).toBe(30); // best is untouched by a drop
    expect(dropped.tiersGained).toEqual([]);

    // Re-climb back past 25 — bestRankScore doesn't move past its prior peak
    // until score exceeds 30, so re-crossing 25 pays nothing again.
    const reclimbed = applyRankDelta(dropped, 10);
    expect(reclimbed.rankScore).toBe(20);
    expect(reclimbed.bestRankScore).toBe(30);
    expect(reclimbed.tiersGained).toEqual([]);

    // Only exceeding the prior best pays out again, and only for tiers past it.
    const newPeak = applyRankDelta(reclimbed, 45);
    expect(newPeak.rankScore).toBe(65);
    expect(newPeak.bestRankScore).toBe(65);
    expect(newPeak.tiersGained.map((t) => t.name)).toEqual(['DISPATCHER II']);
  });

  it('drop-and-reclimb past the old peak only pays tiers beyond the old best', () => {
    // best sits at 30 (DISPATCHER III already paid). Climbing straight to 65
    // should pay DISPATCHER II (60) but NOT DISPATCHER III again.
    const result = applyRankDelta({ rankScore: 10, bestRankScore: 30 }, 35);
    expect(result.rankScore).toBe(45);
    expect(result.bestRankScore).toBe(45);
    expect(result.tiersGained.map((t) => t.name)).toEqual([]);

    const further = applyRankDelta(result, 20);
    expect(further.bestRankScore).toBe(65);
    expect(further.tiersGained.map((t) => t.name)).toEqual(['DISPATCHER II']);
  });

  it('a zero delta produces no tiersGained', () => {
    const result = applyRankDelta({ rankScore: 25, bestRankScore: 25 }, 0);
    expect(result.tiersGained).toEqual([]);
  });
});
