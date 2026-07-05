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
};
