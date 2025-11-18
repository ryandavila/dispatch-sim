import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Character } from '../types/character';
import { applyExperience } from '../types/character';
import type { StatPool } from '../types/stats';
import { loadAgents } from '../utils/dataLoader';

const STORAGE_KEY = 'dispatch-sim-agent-progress';

interface AgentProgressData {
  [agentId: string]: {
    level: number;
    experience: number;
    availablePoints: number;
    stats: StatPool;
  };
}

/**
 * Hook to manage agent experience and leveling
 * Persists agent progress to localStorage
 */
export function useAgentProgress() {
  const [agentProgress, setAgentProgress] = useState<AgentProgressData>(() => {
    try {
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
        };
      }
      return agent;
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

        // Apply experience and get updated character
        const updatedAgent = applyExperience(currentAgent, xpAmount);

        // Store the progress
        updates[agentId] = {
          level: updatedAgent.level,
          experience: updatedAgent.experience,
          availablePoints: updatedAgent.availablePoints,
          stats: updatedAgent.stats,
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
      },
    }));
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
    resetAgentProgress,
  };
}
