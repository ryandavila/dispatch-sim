import type { ShiftSummary } from './shiftSummary';

export interface MissionCompletion {
  missionId: string;
  completedAt: number;
  agents: string[]; // agent IDs
  experienceGained: number;
  success: boolean;
}

export interface UserProgress {
  completedMissionIds: string[];
  missionCompletions: MissionCompletion[];
  totalExperience: number;
  medKits: number;
  /** Times each synergy duo has deployed together, keyed by synergyPairKey. */
  synergyDispatchCounts: Record<string, number>;
  /** Remaining guaranteed-success charges for >76% calls. */
  pityRemaining: number;
  /** Recorded, fully-settled shifts; length + 1 is the current shift number. */
  shiftSummaries: ShiftSummary[];
  /** Persistent dispatcher rank meta-progression score. Can drop, floors at 0. */
  rankScore: number;
  /** All-time-best rankScore. Never decreases — gates tier reward payouts. */
  bestRankScore: number;
  /** One-per-shift revival item, earned from rank tier promotions. */
  defibrillators: number;
  /** Shift number in which the one-per-shift defibrillator was last used. */
  defibUsedShift?: number;
  /** Hero id → shift number the hero's signature power was last used in. */
  powerUsage: Record<string, number>;
}

/** Med kits a new player starts with. */
export const STARTING_MED_KITS = 3;

/** The pity guarantee protects the first 3 high-probability (>76%) calls. */
export const INITIAL_PITY_CHARGES = 3;

export const INITIAL_USER_PROGRESS: UserProgress = {
  completedMissionIds: [],
  missionCompletions: [],
  totalExperience: 0,
  medKits: STARTING_MED_KITS,
  synergyDispatchCounts: {},
  pityRemaining: INITIAL_PITY_CHARGES,
  shiftSummaries: [],
  rankScore: 0,
  bestRankScore: 0,
  defibrillators: 0,
  powerUsage: {},
};
