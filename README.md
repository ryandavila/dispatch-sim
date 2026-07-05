# Dispatch Simulator

A recreation of the dispatching mini-game from Dispatch by AdHoc Studios, built with React and TypeScript.

## Features

- Character stat system with five pillars: Combat, Vigor, Mobility, Charisma, and Intellect
- Pentagon radar chart visualization for character stats
- Level-up system with skill point allocation
- Mission system with stat-based success probability calculation
- Team deployment with a success roll — missions can fail

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

### Team Stats

When multiple agents deploy together, the team's stats are the per-pillar sums
across all agents, capped at 10 per pillar (see `src/engine/resolution.ts`).
Stacking agents raises the team's pentagon up to that cap.

### Success Probability

Success probability is calculated based on the overlapping area between the
combined team stats and mission requirements on the pentagon radar chart. If
the team's stats fully encompass the mission requirements, success is
guaranteed (100%).

### Deploying and Failure

The success roll happens at deploy time: a single random roll against the
team's success probability decides the outcome, which is revealed when the
mission finishes. Failed missions award no XP — to the agents or the player —
and the mission stays available for another attempt.

## Available Commands

Run `just help` (or just `just`) to see all available commands.

## License

This is a fan project for educational purposes.
