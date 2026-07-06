// Pure XP-pool splitter: turns one mission's XP reward into per-hero shares.
//
// The real game pools a mission's XP reward and splits it evenly across the
// deployed team (the CALL.REPORT UI literally says "SPLIT N WAYS") — it does
// not credit the full reward to every hero. `splitXpPool` is the single source
// of truth for that split, used both when crediting XP (useAgentProgress) and
// when displaying it (CallReport, RosterBar's XP pops), so what's shown always
// matches what's earned.
//
// No React, no timers, no global state — a pure function of two integers.

/**
 * Split `total` XP into `count` shares that sum back to exactly `total`
 * (conservation — no XP is created or lost to rounding). Each share is
 * `floor(total / count)`, with the remainder distributed one-per-share to the
 * first `total % count` entries so earlier shares are never smaller than later
 * ones.
 *
 * `count <= 0` returns no shares (nobody to split among). `total <= 0` returns
 * `count` zero shares (nothing to distribute, but the shape is preserved).
 */
export function splitXpPool(total: number, count: number): number[] {
  if (count <= 0) {
    return [];
  }
  if (total <= 0) {
    return new Array(count).fill(0);
  }

  const base = Math.floor(total / count);
  const remainder = total % count;
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}
