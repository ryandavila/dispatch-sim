import { z } from 'zod';
import agentsData from '../../data/agents.json';
import missionsData from '../../data/missions.json';
import synergiesData from '../../data/synergies.json';
import type { Character } from '../types/character';
import type { Mission } from '../types/mission';

const statPoolSchema = z.object({
  Combat: z.number().int().nonnegative(),
  Vigor: z.number().int().nonnegative(),
  Mobility: z.number().int().nonnegative(),
  Charisma: z.number().int().nonnegative(),
  Intellect: z.number().int().nonnegative(),
});

export const agentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  level: z.number().int().positive(),
  experience: z.number().nonnegative(),
  stats: statPoolSchema,
  availablePoints: z.number().int().nonnegative(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  canFly: z.boolean(),
  isFlightLicensed: z.boolean(),
  restTime: z.number().nonnegative(),
  /** Cheaper-curve override: total XP for level 2 (default 1000). */
  xpToLevel2: z.number().int().positive().optional(),
  /** Fixed-rank agents never gain XP or level up. */
  fixedRank: z.boolean().optional(),
});

export const missionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  briefing: z.string().min(1).optional(),
  requirements: statPoolSchema,
  difficulty: z.enum(['Easy', 'Medium', 'Hard', 'Extreme']),
  maxAgents: z.number().int().positive(),
  excludedAgents: z.array(z.string()).optional(),
  rewards: z.object({ experience: z.number().nonnegative() }).optional(),
  travelTime: z.number().nonnegative(),
  missionDuration: z.number().nonnegative(),
  location: z
    .object({
      name: z.string().min(1),
      x: z.number().min(0).max(100),
      y: z.number().min(0).max(100),
    })
    .optional(),
});

export const synergySchema = z.object({
  agents: z
    .tuple([z.string().min(1), z.string().min(1)])
    .refine(([a, b]) => a !== b, { message: 'a synergy pair must reference two different agents' }),
});

export type Synergy = z.infer<typeof synergySchema>;

/**
 * Validate every entry of a data file against a schema, throwing an error
 * that names the file, the offending entry, and the failing fields.
 */
function validateDataFile<T>(schema: z.ZodType<T>, data: unknown, fileName: string): T[] {
  if (!Array.isArray(data)) {
    throw new Error(`${fileName}: expected a JSON array of entries, got ${typeof data}`);
  }

  return data.map((entry, index) => {
    const result = schema.safeParse(entry);
    if (!result.success) {
      const id =
        typeof entry === 'object' && entry !== null && 'id' in entry
          ? `"${String((entry as { id: unknown }).id)}"`
          : `index ${index}`;
      const issues = result.error.issues
        .map((issue) => `${issue.path.join('.') || '(entry)'}: ${issue.message}`)
        .join('; ');
      throw new Error(`${fileName}: invalid entry ${id} — ${issues}`);
    }
    return result.data;
  });
}

/** Validate raw agents data (exported for tests). */
export function validateAgents(data: unknown): Character[] {
  return validateDataFile(agentSchema, data, 'data/agents.json');
}

/** Validate raw missions data (exported for tests). */
export function validateMissions(data: unknown): Mission[] {
  return validateDataFile(missionSchema, data, 'data/missions.json');
}

/** Validate raw synergies data (array of `{ agents: [idA, idB] }` pairs). */
export function validateSynergies(data: unknown): Synergy[] {
  return validateDataFile(synergySchema, data, 'data/synergies.json');
}

// Validate once at first load, then reuse — the data files are static.
let validatedAgents: Character[] | undefined;
let validatedMissions: Mission[] | undefined;
let validatedSynergies: Synergy[] | undefined;

/**
 * Load all agents from the data file
 */
export function loadAgents(): Character[] {
  validatedAgents ??= validateAgents(agentsData);
  return validatedAgents;
}

/**
 * Load all missions from the data file
 */
export function loadMissions(): Mission[] {
  validatedMissions ??= validateMissions(missionsData);
  return validatedMissions;
}

/**
 * Load all synergy pairs from the data file, checking that every
 * referenced agent id actually exists in data/agents.json
 */
export function loadSynergies(): Synergy[] {
  if (!validatedSynergies) {
    const synergies = validateSynergies(synergiesData);
    const agentIds = new Set(loadAgents().map((agent) => agent.id));
    for (const { agents } of synergies) {
      for (const id of agents) {
        if (!agentIds.has(id)) {
          throw new Error(
            `data/synergies.json: unknown agent id "${id}" in pair [${agents.join(', ')}]`
          );
        }
      }
    }
    validatedSynergies = synergies;
  }
  return validatedSynergies;
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
