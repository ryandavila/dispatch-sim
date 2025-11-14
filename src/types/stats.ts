// Core stat system shared between characters, missions, etc.

export type PillarType = 'Combat' | 'Vigor' | 'Mobility' | 'Charisma' | 'Intellect';

export const PILLARS: readonly PillarType[] = [
  'Combat',
  'Vigor',
  'Mobility',
  'Charisma',
  'Intellect',
] as const;

export interface StatPool {
  Combat: number;
  Vigor: number;
  Mobility: number;
  Charisma: number;
  Intellect: number;
}

export function createEmptyStats(): StatPool {
  return {
    Combat: 0,
    Vigor: 0,
    Mobility: 0,
    Charisma: 0,
    Intellect: 0,
  };
}

export function getTotalStats(stats: StatPool): number {
  return Object.values(stats).reduce((sum, value) => sum + value, 0);
}
