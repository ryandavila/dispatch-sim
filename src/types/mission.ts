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
}

export function createMission(
  name: string,
  description: string,
  requirements: StatPool,
  difficulty: Mission['difficulty'] = 'Medium',
  maxAgents: number = 2,
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
  };
}
