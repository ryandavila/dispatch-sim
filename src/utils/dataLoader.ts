import agentsData from '../../data/agents.json';
import missionsData from '../../data/missions.json';
import type { Character } from '../types/character';
import type { Mission } from '../types/mission';

/**
 * Load all agents from the data file
 */
export function loadAgents(): Character[] {
  return agentsData as Character[];
}

/**
 * Load all missions from the data file
 */
export function loadMissions(): Mission[] {
  return missionsData as Mission[];
}

/**
 * Load a specific agent by ID
 */
export function loadAgentById(id: string): Character | undefined {
  const agents = loadAgents();
  return agents.find((agent) => agent.id === id);
}

/**
 * Load a specific mission by ID
 */
export function loadMissionById(id: string): Mission | undefined {
  const missions = loadMissions();
  return missions.find((mission) => mission.id === id);
}

/**
 * Load missions filtered by difficulty
 */
export function loadMissionsByDifficulty(difficulty: Mission['difficulty']): Mission[] {
  const missions = loadMissions();
  return missions.filter((mission) => mission.difficulty === difficulty);
}
