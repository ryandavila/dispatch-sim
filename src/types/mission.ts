import type { PillarType, StatPool } from './stats';

/** A single stat-gated (or hero-gated) response option in a mid-mission disruption. */
export interface DisruptionOption {
  id: string;
  /** Short imperative, e.g. "Kick the door". */
  label: string;
  /**
   * Pillar checked against the capped team stat total. Omitted for hero
   * options (see `heroId`) — the schema refine enforces exactly one of
   * (`stat` + `threshold`) or `heroId`.
   */
  stat?: PillarType;
  /** Pass iff the team's capped stat total (1..10) is >= this value. */
  threshold?: number;
  /** Hero-specific option: only visible when this hero is deployed; auto-succeeds. */
  heroId?: string;
  /** Added to the mission XP pool on pass; 0 on fail. */
  xpBonus: number;
  /** One-line radio aftermath on success. */
  passText: string;
  /** One-line radio aftermath on failure. */
  failText: string;
}

/** A mid-mission radio interruption: a prompt plus a handful of response options. */
export interface Disruption {
  /** Radio interruption text, same voice as `briefing`; **keyword** highlights allowed. */
  prompt: string;
  options: DisruptionOption[];
}

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
  /** Optional mid-mission radio interruption, rolled during the 'active' phase. */
  disruption?: Disruption;
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
