import { useEffect, useState } from 'react';
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

interface UseActiveMissionsOptions {
  onMissionComplete?: (mission: ActiveMission) => void;
}

export function useActiveMissions(options: UseActiveMissionsOptions = {}) {
  const { onMissionComplete } = options;
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

    const newActiveMission = createActiveMission(
      mission,
      agents,
      timeBreakdown.travelTimeOutbound * TIME_SCALE,
      timeBreakdown.missionDuration * TIME_SCALE,
      timeBreakdown.travelTimeReturn * TIME_SCALE,
      timeBreakdown.restTime * TIME_SCALE
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
