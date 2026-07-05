# Dispatch Simulator

A recreation of the dispatching mini-game from Dispatch by AdHoc Studios, built with React and TypeScript.

## Features

- Character stat system with five pillars: Combat, Vigor, Mobility, Charisma, and Intellect
- Pentagon radar chart visualization for character stats
- Level-up system with irreversible skill point allocation
- Mission system with stat-based success probability calculation
- Team deployment with a success roll — missions can fail
- Injuries on failure, synergy bonuses for recurring duos, and a pity guarantee

## Tech Stack

- React 19
- TypeScript
- Bun (runtime and package manager)
- Vite
- Framer Motion (animations)
- Vitest (testing)
- Biome (linting and formatting)
- Zod (data file validation)

## Getting Started

### Prerequisites

- Bun (v1.0 or higher recommended)
- [just](https://github.com/casey/just) (command runner)

### Installation

```bash
just install
```

### Development

```bash
just dev     # Start the Vite dev server
just preview # Preview the production build
```

### Building

```bash
just build      # Type-check and build for production
just type-check # Type-check only (tsc --noEmit)
```

### Testing

```bash
just test          # Run tests
just test-ui       # Run tests with UI
just test-coverage # Run tests with coverage
```

### Linting and Formatting

```bash
just check  # Run Biome linter and formatter with auto-fix
just lint   # Run Biome linter only
just format # Run Biome formatter only
```

### Cleaning

```bash
just clean # Remove dist and node_modules
```

## Project Structure

- `/src/types` - TypeScript type definitions for characters, missions, and stats
- `/src/engine` - Pure mission-resolution rules (team stats, success roll, seedable RNG)
- `/src/components` - React components including radar charts and character sheets
- `/src/utils` - Utility functions for geometry, colors, mission timing, and data loading
- `/src/pages` - Top-level pages (Roster, Missions)
- `/src/test` - Test setup
- `/data` - Agent and mission data files (validated with Zod at load time)

## Game Mechanics

### Character Stats

Characters start at level 1 with:

- 1 point in each pillar (5 total baseline)
- 2 additional points to distribute freely
- Each level up grants 1 additional point to allocate

Spending a skill point is **irreversible** — there is no decrement control, and
each agent can earn at most 9 skill points, after which XP no longer accrues.
The XP curve reaches level 2 at 1,000 total XP, and each subsequent level costs
300 more than the last (1,000 / 1,300 / 1,600 …). Some agents have a cheaper
curve via a `xpToLevel2` override in `data/agents.json` (e.g. Invisigal 700,
Waterboy 400), and fixed-rank agents (`fixedRank`, e.g. Phenomaman) never gain
XP or level up.

### Team Stats

When multiple agents deploy together, the team's stats are the per-pillar sums
across all agents, capped at 10 per pillar (see `src/engine/resolution.ts`).
Stacking agents raises the team's pentagon up to that cap. Injured agents
contribute their reduced (effective) stats, not their allocated stats.

### Success Probability

The base success probability is the overlapping area between the combined team
stats and the mission requirements on the pentagon radar chart. A full
encompass yields 100% on Easy/Medium calls. That base is then adjusted, in
order (see `applyProbabilityModifiers` in `src/engine/resolution.ts`):

1. **Hard-call cap** — Hard and Extreme missions are capped at 85% before
   synergy is applied.
2. **Synergy bonus** — certain duos (defined in `data/synergies.json`) gain
   +5% / +10% / +15% at synergy levels 1 / 2 / 3, where a pair's level is
   `min(3, floor(timesDispatchedTogether / 3))`. Synergy can push the chance
   back above the hard-call cap.
3. **Floor** — a non-empty team's chance is never shown below 15% (an empty
   team stays at 0%).
4. **Pity** — the first three times a call above 76% resolves, the roll is a
   guaranteed success.

### Deploying and Failure

The success roll happens at deploy time: a single random roll against the
team's success probability decides the outcome, which is revealed when the
mission finishes. Failed missions award no XP — to the agents or the player —
and the mission stays available for another attempt.

### Injuries and Healing

When a mission fails, every agent on the team is injured: −1 to all stats
(floored at 1). A second injury while already injured **downs** the agent — they
cannot be selected for missions until healed. Injuries are applied as a stat
modifier and never mutate allocated stats. The player starts with 3 med kits;
healing an agent from their character sheet clears all of their injuries and
consumes one kit.

## Available Commands

Run `just help` (or just `just`) to see all available commands.

## License

This is a fan project for educational purposes.
