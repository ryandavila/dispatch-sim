import type { StatPool } from './stats';

export interface Mission {
  id: string;
  name: string;
  description: string;
  requirements: StatPool;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Extreme';
  maxAgents: number;
  excludedAgents?: string[]; // Agent IDs who cannot or refuse to do this mission
  rewards?: {
    experience: number;
  };
  travelTime: number; // Time units for one-way travel
  missionDuration: number; // Time units for mission completion
  restTime: number; // Time units agents need to rest after returning
}

export function createMission(
  name: string,
  description: string,
  requirements: StatPool,
  difficulty: Mission['difficulty'] = 'Medium',
  maxAgents: number = 2,
  travelTime: number = 5,
  missionDuration: number = 10,
  restTime: number = 5,
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
    restTime,
  };
}
