import { describe, expect, it } from 'vitest';
import { createRng, type Rng } from './rng';
import { pickStatPointRecipient, scoreShift } from './shiftScore';

describe('scoreShift', () => {
  it('pays the most for a flawless shift (12/0/0)', () => {
    expect(scoreShift({ succeeded: 12, failed: 0, missed: 0 })).toEqual({
      statPoints: 4,
      medKits: 3,
      pityCharges: 2,
    });
  });

  it('scores a typical shift with a failure and a miss (9/2/1)', () => {
    expect(scoreShift({ succeeded: 9, failed: 2, missed: 1 })).toEqual({
      statPoints: 2,
      medKits: 1,
      pityCharges: 0,
    });
  });

  it('scores a rough shift (4/3/3)', () => {
    expect(scoreShift({ succeeded: 4, failed: 3, missed: 3 })).toEqual({
      statPoints: 1,
      medKits: 0,
      pityCharges: 0,
    });
  });

  it('pays zeros for a wipe (0/4/4)', () => {
    expect(scoreShift({ succeeded: 0, failed: 4, missed: 4 })).toEqual({
      statPoints: 0,
      medKits: 0,
      pityCharges: 0,
    });
  });

  it('pays zeros for an empty shift (0/0/0) and is NOT flawless', () => {
    expect(scoreShift({ succeeded: 0, failed: 0, missed: 0 })).toEqual({
      statPoints: 0,
      medKits: 0,
      pityCharges: 0,
    });
  });

  it('gives no pity charges when there are failures even with 0 missed', () => {
    // f > 0 → not flawless, and the f===0 pity branch does not apply.
    expect(scoreShift({ succeeded: 5, failed: 1, missed: 0 }).pityCharges).toBe(0);
  });

  it('gives 1 pity charge but is not flawless when 0 failed but some missed (6/0/2)', () => {
    expect(scoreShift({ succeeded: 6, failed: 0, missed: 2 })).toEqual({
      statPoints: 1, // floor(6/4) = 1, no flawless bonus
      medKits: 1, // floor(6/6) = 1, no flawless bonus (missed > 0 → not flawless)
      pityCharges: 1, // f===0 → 1, but missed>0 so not flawless
    });
  });

  it('covers the statPoints floor boundary at s=3 vs s=4', () => {
    // Add a miss so the shift is not flawless and only the floor drives statPoints.
    expect(scoreShift({ succeeded: 3, failed: 0, missed: 1 }).statPoints).toBe(0);
    expect(scoreShift({ succeeded: 4, failed: 0, missed: 1 }).statPoints).toBe(1);
  });

  it('covers the medKits floor boundary at s=5 vs s=6', () => {
    expect(scoreShift({ succeeded: 5, failed: 0, missed: 1 }).medKits).toBe(0);
    expect(scoreShift({ succeeded: 6, failed: 0, missed: 1 }).medKits).toBe(1);
  });
});

describe('pickStatPointRecipient', () => {
  it('returns null for an empty array and does NOT call rng', () => {
    let called = false;
    const rng: Rng = () => {
      called = true;
      return 0;
    };
    expect(pickStatPointRecipient([], rng)).toBeNull();
    expect(called).toBe(false);
  });

  it('returns the sole id for a single-element array', () => {
    const rng: Rng = () => 0.42;
    expect(pickStatPointRecipient(['solo'], rng)).toBe('solo');
  });

  it('forces the first element with an rng of 0', () => {
    const rng: Rng = () => 0;
    expect(pickStatPointRecipient(['a', 'b', 'c'], rng)).toBe('a');
  });

  it('forces the last element with an rng near 1', () => {
    const rng: Rng = () => 0.99;
    expect(pickStatPointRecipient(['a', 'b', 'c'], rng)).toBe('c');
  });

  it('is deterministic for a given seed', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const rng = createRng(1234);
    const first = rng();
    const expected = ids[Math.floor(first * ids.length)];
    // Re-seed and let the function draw the same first value.
    expect(pickStatPointRecipient(ids, createRng(1234))).toBe(expected);
  });

  it('can return every element across the rng range (distribution sanity)', () => {
    const ids = ['a', 'b', 'c'];
    const seen = new Set<string>();
    const rng = createRng(7);
    for (let i = 0; i < 200; i++) {
      const picked = pickStatPointRecipient(ids, rng);
      if (picked !== null) {
        seen.add(picked);
      }
    }
    expect(seen).toEqual(new Set(ids));
  });
});
