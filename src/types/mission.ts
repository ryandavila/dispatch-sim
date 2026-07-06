import type { StatPool } from './stats';

export interface Mission {
  id: string;
  name: string;
  description: string;
  /**
   * Dispatcher-radio flavor text (2-3 sentences). Stat-hinting keywords are
   * wrapped in double asterisks, e.g. "someone needs to **talk them down**".
   */
  briefing?: string;
  requirements: StatPool;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Extreme';
  maxAgents: number;
  excludedAgents?: string[]; // Agent IDs who cannot or refuse to do this mission
  rewards?: {
    experience: number;
  };
  travelTime: number; // Time units for one-way travel
  missionDuration: number; // Time units for mission completion
  /** Where the call happens on the Torrance map; x/y are 0–100 (% of map). */
  location?: {
    name: string;
    x: number;
    y: number;
  };
}

export function createMission(
  name: string,
  description: string,
  requirements: StatPool,
  difficulty: Mission['difficulty'] = 'Medium',
  maxAgents: number = 2,
  travelTime: number = 5,
  missionDuration: number = 10,
  excludedAgents?: string[]
): Mission {
  return {
    id: crypto.randomUUID(),
    name,
    description,
    requirements,
    difficulty,
    maxAgents,
    excludedAgents,
    travelTime,
    missionDuration,
  };
}
