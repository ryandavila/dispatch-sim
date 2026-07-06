import { useEffect, useState } from 'react';
import { applyRankDelta } from '../engine/rank';
import type { ShiftRewards, ShiftSummary } from '../types/shiftSummary';
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
        // Merge over defaults so saves from before a field existed stay loadable
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

  /** Record that each given synergy pair (by synergyPairKey) deployed together. */
  const recordSynergyDispatch = (pairKeys: string[]) => {
    if (pairKeys.length === 0) return;
    setUserProgress((prev) => {
      const synergyDispatchCounts = { ...prev.synergyDispatchCounts };
      for (const key of pairKeys) {
        synergyDispatchCounts[key] = (synergyDispatchCounts[key] ?? 0) + 1;
      }
      return { ...prev, synergyDispatchCounts };
    });
  };

  /**
   * Append a completed-shift summary. Its position (length before appending)
   * is the source of truth for the shift number, so summaries are only ever
   * appended, never reordered.
   */
  const recordShiftSummary = (summary: ShiftSummary) => {
    setUserProgress((prev) => ({
      ...prev,
      shiftSummaries: [...prev.shiftSummaries, summary],
    }));
  };

  /**
   * Credit the account-level rewards a completed shift earned: med kits and
   * pity charges are added to the player's stock. (Stat points go to a hero
   * via useAgentProgress, so they aren't handled here.)
   */
  const applyShiftRewards = (rewards: ShiftRewards) => {
    if (rewards.medKits <= 0 && rewards.pityCharges <= 0) {
      return;
    }
    setUserProgress((prev) => ({
      ...prev,
      medKits: prev.medKits + Math.max(0, rewards.medKits),
      pityRemaining: prev.pityRemaining + Math.max(0, rewards.pityCharges),
    }));
  };

  /** Spend one pity charge (when the pity guarantee fires on a deploy). */
  const consumePity = () => {
    setUserProgress((prev) => ({
      ...prev,
      pityRemaining: Math.max(0, prev.pityRemaining - 1),
    }));
  };

  /**
   * Apply a shift's rank-score delta and credit any tier rewards newly
   * crossed by the all-time-best score (see applyRankDelta). Bandages and
   * defibrillators are credited in the same setState as the rank update.
   */
  const applyRankProgress = (delta: number) => {
    setUserProgress((prev) => {
      const { rankScore, bestRankScore, tiersGained } = applyRankDelta(
        { rankScore: prev.rankScore, bestRankScore: prev.bestRankScore },
        delta
      );
      const bandagesEarned = tiersGained.reduce((sum, tier) => sum + tier.rewards.bandages, 0);
      const defibsEarned = tiersGained.reduce((sum, tier) => sum + tier.rewards.defibrillators, 0);
      return {
        ...prev,
        rankScore,
        bestRankScore,
        medKits: prev.medKits + bandagesEarned,
        defibrillators: prev.defibrillators + defibsEarned,
      };
    });
  };

  /**
   * Consume the one-per-shift defibrillator. Returns false (no-op) unless
   * stock is available AND it hasn't already been used this shift.
   */
  const consumeDefibrillator = (shiftNumber: number): boolean => {
    if (userProgress.defibrillators <= 0 || userProgress.defibUsedShift === shiftNumber) {
      return false;
    }
    setUserProgress((prev) => {
      if (prev.defibrillators <= 0 || prev.defibUsedShift === shiftNumber) {
        return prev;
      }
      return {
        ...prev,
        defibrillators: prev.defibrillators - 1,
        defibUsedShift: shiftNumber,
      };
    });
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
    recordSynergyDispatch,
    recordShiftSummary,
    applyShiftRewards,
    consumePity,
    applyRankProgress,
    consumeDefibrillator,
    isMissionCompleted,
    resetProgress,
  };
}
