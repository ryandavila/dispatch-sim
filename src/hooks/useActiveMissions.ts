import { useEffect, useState } from 'react';
import { getEffectiveStats } from '../engine/injury';
import {
  applyProbabilityModifiers,
  calculateTeamSuccessProbability,
  resolveMissionOutcome,
} from '../engine/resolution';
import type { Rng } from '../engine/rng';
import { getTeamSynergies, synergyPairKey } from '../engine/synergy';
import type { ActiveMission } from '../types/activeMission';
import { calculateMissionProgress, createActiveMission } from '../types/activeMission';
import type { Character } from '../types/character';
import type { Mission } from '../types/mission';
import { getMissionTimeBreakdown } from '../utils/missionTime';

// Time scale: 1 real second = 1 mission time unit by default
const TIME_SCALE = 1000; // milliseconds per time unit
const COMPLETION_DISPLAY_TIME = 15000; // Show completed missions for 15 seconds

export interface CompletedMission extends ActiveMission {
  completedAt: number;
}

export interface DeployRollInfo {
  /** synergyPairKey of each synergy duo that deployed together. */
  synergyPairKeys: string[];
  /** True when the pity guarantee fired on this roll. */
  pityUsed: boolean;
}

interface UseActiveMissionsOptions {
  onMissionComplete?: (mission: ActiveMission) => void;
  rng?: Rng; // Injectable for deterministic tests
  /** Times a synergy duo (by synergyPairKey) has deployed together. */
  getSynergyDispatchCount?: (pairKey: string) => number;
  /** Remaining guaranteed-success pity charges. */
  pityRemaining?: number;
  /** Called after each deploy roll so synergy counts and pity can be persisted. */
  onDeployRolled?: (info: DeployRollInfo) => void;
}

export function useActiveMissions(options: UseActiveMissionsOptions = {}) {
  const {
    onMissionComplete,
    rng = Math.random,
    getSynergyDispatchCount,
    pityRemaining = 0,
    onDeployRolled,
  } = options;
  const [activeMissions, setActiveMissions] = useState<ActiveMission[]>([]);
  const [completedMissions, setCompletedMissions] = useState<CompletedMission[]>([]);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Move completed missions to completed list
  useEffect(() => {
    const nowCompleted = activeMissions.filter((mission) => {
      const progress = calculateMissionProgress(mission, currentTime);
      return progress.phase === 'completed';
    });

    if (nowCompleted.length > 0) {
      const completedWithTimestamp = nowCompleted.map((mission) => ({
        ...mission,
        completedAt: currentTime,
      }));

      // Call completion callback for each completed mission
      if (onMissionComplete) {
        for (const mission of nowCompleted) {
          onMissionComplete(mission);
        }
      }

      setCompletedMissions((prev) => [...prev, ...completedWithTimestamp]);
      setActiveMissions((prev) =>
        prev.filter((mission) => {
          const progress = calculateMissionProgress(mission, currentTime);
          return progress.phase !== 'completed';
        })
      );
    }
  }, [activeMissions, currentTime, onMissionComplete]);

  // Remove old completed missions
  useEffect(() => {
    if (completedMissions.length > 0) {
      const timeout = setTimeout(() => {
        setCompletedMissions((prev) =>
          prev.filter((mission) => currentTime - mission.completedAt < COMPLETION_DISPLAY_TIME)
        );
      }, 1000);

      return () => clearTimeout(timeout);
    }
  }, [completedMissions, currentTime]);

  const deployMission = (mission: Mission, agents: Character[]) => {
    const timeBreakdown = getMissionTimeBreakdown(mission, agents);

    const teamSynergies = getTeamSynergies(
      agents.map((agent) => agent.id),
      (pairKey) => getSynergyDispatchCount?.(pairKey) ?? 0
    );

    // Injuries reduce effective stats, so they also reduce the roll's odds
    const baseProbability = calculateTeamSuccessProbability(
      agents.map((agent) => getEffectiveStats(agent)),
      mission.requirements
    );
    const { probability, pityApplies } = applyProbabilityModifiers({
      baseProbability,
      difficulty: mission.difficulty,
      synergyLevels: teamSynergies.map((synergy) => synergy.level),
      pityRemaining,
      teamSize: agents.length,
    });
    const outcome = resolveMissionOutcome(probability, rng, pityApplies);

    onDeployRolled?.({
      synergyPairKeys: teamSynergies.map(({ pair }) => synergyPairKey(pair[0], pair[1])),
      pityUsed: pityApplies,
    });

    const newActiveMission = createActiveMission(
      mission,
      agents,
      timeBreakdown.travelTimeOutbound * TIME_SCALE,
      timeBreakdown.missionDuration * TIME_SCALE,
      timeBreakdown.travelTimeReturn * TIME_SCALE,
      timeBreakdown.restTime * TIME_SCALE,
      outcome
    );

    setActiveMissions((prev) => [...prev, newActiveMission]);
  };

  const isAgentAvailable = (agentId: string): boolean => {
    return !activeMissions.some((mission) => mission.agents.some((agent) => agent.id === agentId));
  };

  const removeMission = (missionId: string) => {
    setActiveMissions((prev) => prev.filter((m) => m.id !== missionId));
  };

  return {
    activeMissions,
    completedMissions,
    currentTime,
    deployMission,
    isAgentAvailable,
    removeMission,
  };
}
