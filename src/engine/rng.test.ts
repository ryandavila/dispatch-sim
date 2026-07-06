import { describe, expect, it } from 'vitest';
import { createRng, hashSeed } from './rng';

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

describe('hashSeed', () => {
  it('is deterministic: same parts always produce the same seed', () => {
    expect(hashSeed(1, 'call-0')).toBe(hashSeed(1, 'call-0'));
    expect(hashSeed(42, 'call-7', 'disruption')).toBe(hashSeed(42, 'call-7', 'disruption'));
  });

  it('returns a non-negative 32-bit integer', () => {
    for (const parts of [
      [1, 'a'],
      [0, ''],
      [-5, 'x', 1],
      [123456789, 'call-99'],
    ] as const) {
      const seed = hashSeed(...parts);
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThanOrEqual(0xffffffff);
    }
  });

  it('produces different seeds for different callIds under the same shift seed', () => {
    const seeds = new Set(Array.from({ length: 20 }, (_, i) => hashSeed(1, `call-${i}`)));
    expect(seeds.size).toBe(20);
  });

  it('produces different seeds for different shift seeds under the same callId', () => {
    const seeds = new Set(Array.from({ length: 20 }, (_, i) => hashSeed(i, 'call-0')));
    expect(seeds.size).toBe(20);
  });

  it('produces independent rng streams per derived seed (no correlated draws)', () => {
    const rngA = createRng(hashSeed(1, 'call-0'));
    const rngB = createRng(hashSeed(1, 'call-1'));

    const seqA = Array.from({ length: 10 }, () => rngA());
    const seqB = Array.from({ length: 10 }, () => rngB());

    expect(seqA).not.toEqual(seqB);
  });

  it('distinguishes purpose-tagged keys (e.g. same call, different draw purpose)', () => {
    const outcomeSeed = hashSeed(1, 'call-0', 'outcome');
    const disruptionSeed = hashSeed(1, 'call-0', 'disruption');
    expect(outcomeSeed).not.toBe(disruptionSeed);
  });
});
