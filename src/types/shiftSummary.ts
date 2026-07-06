import type { ShiftTally } from './shift';

/** Counts of each reward a completed shift grants. Pure output of scoreShift(). */
export interface ShiftRewards {
  /** Med kits added to the player's stock (healing resource). */
  medKits: number;
  /** Guaranteed-success (>76%) charges added to the pity pool. */
  pityCharges: number;
  /** Stat points granted to one random eligible hero's availablePoints. */
  statPoints: number;
}

/**
 * A recorded, fully-settled shift — persisted into UserProgress.shiftSummaries.
 * The list's length is the source of truth for "which shift number am I on":
 * the next shift's number is shiftSummaries.length + 1.
 */
export interface ShiftSummary {
  /** 1-based; equals (prior summaries + 1) at the moment it is recorded. */
  shiftNumber: number;
  /** Epoch ms when the shift fully settled (all in-flight missions done). */
  completedAt: number;
  /** The FINAL tally after in-flight missions settled (see Decision #6). */
  tally: ShiftTally;
  /** The shift's ShiftConfig.seed, for reproducibility. */
  seed: number;
  /** What scoreShift(tally) paid out. */
  rewards: ShiftRewards;
  /** Hero who received the stat points; undefined when statPoints === 0. */
  statPointAgentId?: string;
  /** rankDelta(tally) — the signed dispatcher rank-score change this shift earned. */
  rankDelta?: number;
  /**
   * Names of RANK_TIERS newly crossed by this shift's all-time-best score.
   * Persisted so the review (and history) can show the promotion payouts.
   */
  promotions?: string[];
}
