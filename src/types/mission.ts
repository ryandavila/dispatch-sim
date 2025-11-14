import type { StatPool } from './stats';

export interface Mission {
  id: string;
  name: string;
  description: string;
  requirements: StatPool;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Extreme';
  rewards?: {
    experience: number;
  };
}

export function createMission(
  name: string,
  description: string,
  requirements: StatPool,
  difficulty: Mission['difficulty'] = 'Medium'
): Mission {
  return {
    id: crypto.randomUUID(),
    name,
    description,
    requirements,
    difficulty,
  };
}
