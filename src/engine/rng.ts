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

/**
 * Derive a deterministic 32-bit seed from a shift seed plus any number of
 * "key" parts (call id, purpose tag, ...). xmur3-style string hash: cheap,
 * well-mixed, and stable across platforms (no Math.random, no Date.now).
 *
 * Resume-safety rationale: a live shift's schedule (spawn timing + baked
 * disruption data) is drawn once from `createRng(seed)` at `beginShift` and
 * then persisted as part of `ShiftState` — it never needs to be re-rolled.
 * But per-deploy outcomes (`resolveMissionOutcome`, `bakeDisruption` at deploy
 * time) happen throughout the shift, potentially across a page reload. If
 * those draws came from the SAME single rng stream as the bake, a reloaded
 * session would have no way to know how many values had already been drawn
 * from that stream (the cursor isn't persisted), so it would either replay
 * old draws or diverge from what an unreloaded session would have rolled.
 *
 * Deriving a fresh, independent rng per deploy via `hashSeed(seed, callId)`
 * sidesteps this entirely: the outcome for a given call depends only on the
 * shift seed and which call it is, never on "how many other draws happened
 * first" or "was this session reloaded." A resumed shift therefore produces
 * the identical deploy outcome for the same call+team as one that was never
 * reloaded, with no rng cursor to persist. Any other mid-shift randomness
 * should key off the same pattern — add a purpose tag as an extra part, e.g.
 * `hashSeed(seed, callId, 'disruption')`, to keep independent draws from
 * colliding.
 */
export function hashSeed(...parts: Array<string | number>): number {
  const input = parts.join('|');
  // xmur3: https://github.com/bryc/code/blob/master/jshash/PRNGs.md
  let h = 1779033703 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(h ^ input.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  h ^= h >>> 16;
  return h >>> 0;
}
