import { useEffect, useState } from 'react';
import type { MissionCompletion, UserProgress } from '../types/userProgress';
import { INITIAL_USER_PROGRESS } from '../types/userProgress';

const STORAGE_KEY = 'dispatch-sim-user-progress';

/**
 * Hook to manage user progress with localStorage.
 * When auth is added, replace localStorage calls with API calls.
 */
export function useUserProgress() {
  const [userProgress, setUserProgress] = useState<UserProgress>(() => {
    // Load from localStorage on initialization
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        // Merge over defaults so older saves pick up new fields (e.g. medKits)
        return { ...INITIAL_USER_PROGRESS, ...JSON.parse(stored) };
      } catch (error) {
        console.error('Failed to parse user progress from localStorage:', error);
        return INITIAL_USER_PROGRESS;
      }
    }
    return INITIAL_USER_PROGRESS;
  });

  // Save to localStorage whenever userProgress changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userProgress));
  }, [userProgress]);

  const addMissionCompletion = (completion: MissionCompletion) => {
    setUserProgress((prev) => ({
      ...prev,
      // Failed missions stay available for another attempt
      completedMissionIds: completion.success
        ? [...prev.completedMissionIds, completion.missionId]
        : prev.completedMissionIds,
      missionCompletions: [...prev.missionCompletions, completion],
      totalExperience: prev.totalExperience + completion.experienceGained,
    }));
  };

  /**
   * Consume one med kit. Returns false (and consumes nothing) when out of stock.
   */
  const consumeMedKit = (): boolean => {
    if (userProgress.medKits <= 0) {
      return false;
    }
    setUserProgress((prev) => ({
      ...prev,
      medKits: Math.max(0, prev.medKits - 1),
    }));
    return true;
  };

  const isMissionCompleted = (missionId: string): boolean => {
    return userProgress.completedMissionIds.includes(missionId);
  };

  const resetProgress = () => {
    setUserProgress(INITIAL_USER_PROGRESS);
  };

  return {
    userProgress,
    addMissionCompletion,
    consumeMedKit,
    isMissionCompleted,
    resetProgress,
  };
}
