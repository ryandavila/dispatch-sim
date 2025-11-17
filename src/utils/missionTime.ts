import type { Character } from '../types/character';
import type { Mission } from '../types/mission';

/**
 * Multiplier for travel time when agent can fly AND is licensed
 */
export const FLIGHT_SPEED_MULTIPLIER = 0.5;

/**
 * Calculate the travel time for a specific agent
 * @param baseTravelTime - The base travel time for the mission
 * @param agent - The agent traveling
 * @returns The actual travel time for this agent
 */
export function calculateAgentTravelTime(baseTravelTime: number, agent: Character): number {
  // If agent can fly AND is licensed, they travel faster
  if (agent.canFly && agent.isFlightLicensed) {
    return baseTravelTime * FLIGHT_SPEED_MULTIPLIER;
  }
  return baseTravelTime;
}

/**
 * Calculate the total mission time for a team
 * The mission begins once all agents arrive (slowest travel time)
 * Total time = (longest travel time * 2 for round trip) + mission duration + longest agent rest time
 *
 * @param mission - The mission being undertaken
 * @param agents - The team of agents assigned to the mission
 * @returns Total time for the mission including travel and rest
 */
export function calculateTotalMissionTime(mission: Mission, agents: Character[]): number {
  if (agents.length === 0) {
    return 0;
  }

  // Calculate travel time for each agent
  const travelTimes = agents.map((agent) => calculateAgentTravelTime(mission.travelTime, agent));

  // Mission starts when the slowest agent arrives
  const longestTravelTime = Math.max(...travelTimes);

  // Team is ready when the agent who needs the most rest is ready
  const longestRestTime = Math.max(...agents.map((agent) => agent.restTime));

  // Total time = round trip + mission duration + longest agent rest time
  return longestTravelTime * 2 + mission.missionDuration + longestRestTime;
}

/**
 * Calculate when the mission will start (based on slowest agent's arrival)
 * @param mission - The mission being undertaken
 * @param agents - The team of agents assigned to the mission
 * @returns Time until mission starts
 */
export function calculateMissionStartTime(mission: Mission, agents: Character[]): number {
  if (agents.length === 0) {
    return 0;
  }

  const travelTimes = agents.map((agent) => calculateAgentTravelTime(mission.travelTime, agent));
  return Math.max(...travelTimes);
}

/**
 * Get details about team travel and rest times for display
 * @param mission - The mission being undertaken
 * @param agents - The team of agents assigned to the mission
 * @returns Object with travel time and rest time details
 */
export function getMissionTimeBreakdown(mission: Mission, agents: Character[]) {
  if (agents.length === 0) {
    return {
      travelTimeOutbound: 0,
      travelTimeReturn: 0,
      missionDuration: mission.missionDuration,
      restTime: 0,
      totalTime: 0,
      hasFastTravelers: false,
      hasQuickRecovery: false,
      slowestTravelTime: 0,
    };
  }

  const agentTravelTimes = agents.map((agent) => ({
    agent,
    travelTime: calculateAgentTravelTime(mission.travelTime, agent),
  }));

  const slowestTravelTime = Math.max(...agentTravelTimes.map((at) => at.travelTime));
  const fastestTravelTime = Math.min(...agentTravelTimes.map((at) => at.travelTime));
  const hasFastTravelers = slowestTravelTime !== fastestTravelTime;

  // Calculate rest times
  const longestRestTime = Math.max(...agents.map((agent) => agent.restTime));
  const shortestRestTime = Math.min(...agents.map((agent) => agent.restTime));
  const hasQuickRecovery = longestRestTime !== shortestRestTime;

  return {
    travelTimeOutbound: slowestTravelTime,
    travelTimeReturn: slowestTravelTime,
    missionDuration: mission.missionDuration,
    restTime: longestRestTime,
    totalTime: slowestTravelTime * 2 + mission.missionDuration + longestRestTime,
    hasFastTravelers,
    hasQuickRecovery,
    slowestTravelTime,
    fastestTravelTime,
    agentTravelTimes,
    longestRestTime,
    shortestRestTime,
  };
}
