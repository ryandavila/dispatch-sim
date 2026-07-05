// Random number generation for mission resolution.
// The RNG is injectable so tests (and future replay/save features) can run
// the simulation deterministically.

/** Returns a value in [0, 1), like Math.random. */
export type Rng = () => number;

/**
 * Create a seeded PRNG (mulberry32). Same seed always produces the same
 * sequence of values in [0, 1).
 */
export function createRng(seed: number): Rng {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
