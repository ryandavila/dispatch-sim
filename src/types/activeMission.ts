import type { Character } from './character';
import type { Mission } from './mission';

export type MissionPhase = 'travel-outbound' | 'active' | 'travel-return' | 'resting' | 'completed';

export interface ActiveMission {
  id: string; // Unique ID for this mission execution
  mission: Mission;
  agents: Character[];
  startTime: number; // Timestamp when mission was deployed
  currentPhase: MissionPhase;
  phaseStartTime: number; // When current phase started
  travelOutboundDuration: number; // Calculated based on slowest agent
  missionDuration: number;
  travelReturnDuration: number;
  restDuration: number; // Calculated based on slowest agent
  totalDuration: number;
}

export function createActiveMission(
  mission: Mission,
  agents: Character[],
  travelOutboundDuration: number,
  missionDuration: number,
  travelReturnDuration: number,
  restDuration: number
): ActiveMission {
  const now = Date.now();
  const totalDuration =
    travelOutboundDuration + missionDuration + travelReturnDuration + restDuration;

  return {
    id: crypto.randomUUID(),
    mission,
    agents,
    startTime: now,
    currentPhase: 'travel-outbound',
    phaseStartTime: now,
    travelOutboundDuration,
    missionDuration,
    travelReturnDuration,
    restDuration,
    totalDuration,
  };
}

/**
 * Calculate the current phase and progress of an active mission
 */
export function calculateMissionProgress(activeMission: ActiveMission, currentTime: number) {
  const elapsed = currentTime - activeMission.startTime; // Time in milliseconds

  let phase: MissionPhase = 'travel-outbound';
  let phaseProgress = 0;
  let totalProgress = 0;

  // Calculate which phase we're in
  if (elapsed >= activeMission.totalDuration) {
    phase = 'completed';
    phaseProgress = 1;
    totalProgress = 1;
  } else if (
    elapsed >=
    activeMission.travelOutboundDuration +
      activeMission.missionDuration +
      activeMission.travelReturnDuration
  ) {
    phase = 'resting';
    const phaseElapsed =
      elapsed -
      (activeMission.travelOutboundDuration +
        activeMission.missionDuration +
        activeMission.travelReturnDuration);
    phaseProgress = phaseElapsed / activeMission.restDuration;
    totalProgress = elapsed / activeMission.totalDuration;
  } else if (elapsed >= activeMission.travelOutboundDuration + activeMission.missionDuration) {
    phase = 'travel-return';
    const phaseElapsed =
      elapsed - (activeMission.travelOutboundDuration + activeMission.missionDuration);
    phaseProgress = phaseElapsed / activeMission.travelReturnDuration;
    totalProgress = elapsed / activeMission.totalDuration;
  } else if (elapsed >= activeMission.travelOutboundDuration) {
    phase = 'active';
    const phaseElapsed = elapsed - activeMission.travelOutboundDuration;
    phaseProgress = phaseElapsed / activeMission.missionDuration;
    totalProgress = elapsed / activeMission.totalDuration;
  } else {
    phase = 'travel-outbound';
    phaseProgress = elapsed / activeMission.travelOutboundDuration;
    totalProgress = elapsed / activeMission.totalDuration;
  }

  return {
    phase,
    phaseProgress: Math.min(phaseProgress, 1),
    totalProgress: Math.min(totalProgress, 1),
    elapsedSeconds: elapsed / 1000, // Convert to seconds for display
  };
}
