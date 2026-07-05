import { useCallback, useEffect, useMemo, useState } from 'react';
import { addInjury } from '../engine/injury';
import type { Character } from '../types/character';
import { applyExperience } from '../types/character';
import type { StatPool } from '../types/stats';
import { loadAgents } from '../utils/dataLoader';

// v2: progression rework (real-game XP curve, XP cap, fixedRank). Progress saved
// under the old key used the quadratic curve and is incompatible, so it is wiped.
const STORAGE_KEY = 'dispatch-sim-agent-progress-v2';
const LEGACY_STORAGE_KEY = 'dispatch-sim-agent-progress';

interface AgentProgressEntry {
  level: number;
  experience: number;
  availablePoints: number;
  stats: StatPool;
  injuryCount?: number; // Absent in older saves = healthy
}

interface AgentProgressData {
  [agentId: string]: AgentProgressEntry;
}

/**
 * Hook to manage agent experience and leveling
 * Persists agent progress to localStorage
 */
export function useAgentProgress() {
  const [agentProgress, setAgentProgress] = useState<AgentProgressData>(() => {
    try {
      // Drop pre-rework saves; the old XP curve is incompatible with the new one
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to parse agent progress from localStorage:', error);
    }
    return {};
  });

  // Persist to localStorage whenever progress changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(agentProgress));
  }, [agentProgress]);

  /**
   * Memoized agents with their current progress applied
   * Only recalculates when agentProgress changes
   */
  const agents = useMemo((): Character[] => {
    const baseAgents = loadAgents();
    return baseAgents.map((agent) => {
      const progress = agentProgress[agent.id];
      if (progress) {
        return {
          ...agent,
          level: progress.level,
          experience: progress.experience,
          availablePoints: progress.availablePoints,
          stats: progress.stats || agent.stats, // Fallback to base stats if not saved
          injuryCount: progress.injuryCount ?? 0,
        };
      }
      return { ...agent, injuryCount: 0 };
    });
  }, [agentProgress]);

  /**
   * Award experience to agents and handle level ups
   */
  const awardExperience = useCallback(
    (agentIds: string[], xpAmount: number) => {
      const baseAgents = loadAgents();
      const updates: AgentProgressData = {};

      for (const agentId of agentIds) {
        const baseAgent = baseAgents.find((a) => a.id === agentId);
        if (!baseAgent) continue;

        // Get current progress or use base stats
        const currentProgress = agentProgress[agentId];
        const currentAgent: Character = currentProgress
          ? { ...baseAgent, ...currentProgress }
          : baseAgent;

        // Apply experience and get updated character.
        // Fixed-rank and XP-capped agents come back unchanged.
        const updatedAgent = applyExperience(currentAgent, xpAmount);
        if (updatedAgent === currentAgent) continue;

        // Store the progress
        updates[agentId] = {
          level: updatedAgent.level,
          experience: updatedAgent.experience,
          availablePoints: updatedAgent.availablePoints,
          stats: updatedAgent.stats,
          injuryCount: updatedAgent.injuryCount ?? 0,
        };
      }

      setAgentProgress((prev) => ({ ...prev, ...updates }));
    },
    [agentProgress]
  );

  /**
   * Update an agent's stats and available points
   */
  const updateAgentStats = useCallback((updatedAgent: Character) => {
    setAgentProgress((prev) => ({
      ...prev,
      [updatedAgent.id]: {
        level: updatedAgent.level,
        experience: updatedAgent.experience,
        availablePoints: updatedAgent.availablePoints,
        stats: updatedAgent.stats,
        injuryCount: updatedAgent.injuryCount ?? prev[updatedAgent.id]?.injuryCount ?? 0,
      },
    }));
  }, []);

  /**
   * Injure every listed agent (e.g. after a failed mission).
   * A first injury applies a stat penalty; a second downs the agent.
   * Allocated stats are never mutated — the penalty is applied when
   * effective stats are computed.
   */
  const applyInjuries = useCallback((agentIds: string[]) => {
    const baseAgents = loadAgents();
    setAgentProgress((prev) => {
      const updates: AgentProgressData = {};
      for (const agentId of agentIds) {
        const current: AgentProgressEntry | undefined = prev[agentId];
        if (current) {
          updates[agentId] = { ...current, injuryCount: addInjury(current.injuryCount ?? 0) };
          continue;
        }
        const baseAgent = baseAgents.find((a) => a.id === agentId);
        if (!baseAgent) continue;
        updates[agentId] = {
          level: baseAgent.level,
          experience: baseAgent.experience,
          availablePoints: baseAgent.availablePoints,
          stats: baseAgent.stats,
          injuryCount: addInjury(baseAgent.injuryCount ?? 0),
        };
      }
      return { ...prev, ...updates };
    });
  }, []);

  /**
   * Grant stat allocation points to a single agent (e.g. an end-of-shift
   * reward). Creates a progress entry from the base agent if none exists.
   * No-op for non-positive amounts. The points land in `availablePoints`
   * for the player to spend; stats are not mutated here.
   */
  const grantAvailablePoints = useCallback((agentId: string, amount: number) => {
    if (amount <= 0) {
      return;
    }
    const baseAgents = loadAgents();
    setAgentProgress((prev) => {
      const current = prev[agentId];
      if (current) {
        return {
          ...prev,
          [agentId]: { ...current, availablePoints: current.availablePoints + amount },
        };
      }
      const baseAgent = baseAgents.find((a) => a.id === agentId);
      if (!baseAgent) {
        return prev;
      }
      return {
        ...prev,
        [agentId]: {
          level: baseAgent.level,
          experience: baseAgent.experience,
          availablePoints: baseAgent.availablePoints + amount,
          stats: baseAgent.stats,
          injuryCount: baseAgent.injuryCount ?? 0,
        },
      };
    });
  }, []);

  /**
   * Clear all injuries on an agent (med-kit consumption is the caller's job).
   */
  const healAgent = useCallback((agentId: string) => {
    setAgentProgress((prev) => {
      const current = prev[agentId];
      if (!current?.injuryCount) {
        return prev;
      }
      return { ...prev, [agentId]: { ...current, injuryCount: 0 } };
    });
  }, []);

  /**
   * Reset all agent progress
   */
  const resetAgentProgress = useCallback(() => {
    setAgentProgress({});
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    agents,
    awardExperience,
    updateAgentStats,
    applyInjuries,
    grantAvailablePoints,
    healAgent,
    resetAgentProgress,
  };
}
