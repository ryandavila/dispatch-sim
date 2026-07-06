import { describe, expect, it } from 'vitest';
import { splitXpPool } from './xp';

describe('splitXpPool', () => {
  it('splits evenly when total divides cleanly', () => {
    expect(splitXpPool(250, 2)).toEqual([125, 125]);
    expect(splitXpPool(300, 3)).toEqual([100, 100, 100]);
  });

  it('gives the remainder to the first entries, one each', () => {
    // 100 / 3 = 33 each with 1 left over -> first share gets it.
    expect(splitXpPool(100, 3)).toEqual([34, 33, 33]);
    // 10 / 4 = 2 each with 2 left over -> first two shares get it.
    expect(splitXpPool(10, 4)).toEqual([3, 3, 2, 2]);
  });

  it('always conserves the total across shares, including uneven splits', () => {
    const cases: Array<[number, number]> = [
      [250, 2],
      [100, 3],
      [10, 4],
      [1, 7],
      [999, 5],
      [7, 7],
      [1_000_000, 9],
    ];
    for (const [total, count] of cases) {
      const shares = splitXpPool(total, count);
      expect(shares).toHaveLength(count);
      expect(shares.reduce((sum, s) => sum + s, 0)).toBe(total);
    }
  });

  it('gives a single recipient the whole pool', () => {
    expect(splitXpPool(250, 1)).toEqual([250]);
  });

  it('returns no shares for count <= 0', () => {
    expect(splitXpPool(100, 0)).toEqual([]);
    expect(splitXpPool(100, -3)).toEqual([]);
  });

  it('returns zero shares (preserving count) for total <= 0', () => {
    expect(splitXpPool(0, 3)).toEqual([0, 0, 0]);
    expect(splitXpPool(-50, 3)).toEqual([0, 0, 0]);
  });

  it('never gives a later share more than an earlier one', () => {
    const shares = splitXpPool(101, 10);
    for (let i = 1; i < shares.length; i++) {
      expect(shares[i]).toBeLessThanOrEqual(shares[i - 1]);
    }
  });
});
