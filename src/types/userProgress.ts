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
}

/** Med kits a new player starts with. */
export const STARTING_MED_KITS = 3;

export const INITIAL_USER_PROGRESS: UserProgress = {
  completedMissionIds: [],
  missionCompletions: [],
  totalExperience: 0,
  medKits: STARTING_MED_KITS,
};
