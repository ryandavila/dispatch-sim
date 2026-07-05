import { describe, expect, it } from 'vitest';
import { createRng } from './rng';

describe('createRng', () => {
  it('should produce the same sequence for the same seed', () => {
    const rngA = createRng(42);
    const rngB = createRng(42);

    const sequenceA = Array.from({ length: 10 }, () => rngA());
    const sequenceB = Array.from({ length: 10 }, () => rngB());

    expect(sequenceA).toEqual(sequenceB);
  });

  it('should produce different sequences for different seeds', () => {
    const rngA = createRng(1);
    const rngB = createRng(2);

    const sequenceA = Array.from({ length: 10 }, () => rngA());
    const sequenceB = Array.from({ length: 10 }, () => rngB());

    expect(sequenceA).not.toEqual(sequenceB);
  });

  it('should return values in [0, 1)', () => {
    const rng = createRng(123);

    for (let i = 0; i < 1000; i++) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('should not repeat the same value continuously', () => {
    const rng = createRng(7);
    const values = new Set(Array.from({ length: 100 }, () => rng()));

    expect(values.size).toBeGreaterThan(90);
  });
});
