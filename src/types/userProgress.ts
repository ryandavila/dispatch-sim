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
}

export const INITIAL_USER_PROGRESS: UserProgress = {
  completedMissionIds: [],
  missionCompletions: [],
  totalExperience: 0,
};
