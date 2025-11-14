# Dispatch Simulator

A recreation of the dispatching mini-game from Dispatch by AdHoc Studios, built with React and TypeScript.

## Features

- Character stat system with five pillars: Combat, Vigor, Mobility, Charisma, and Intellect
- Pentagon radar chart visualization for character stats
- Level-up system with skill point allocation
- Mission system with stat-based success probability calculation
- Success probability based on area overlap between character stats and mission requirements

## Tech Stack

- React 19
- TypeScript
- Vite
- Framer Motion (animations)
- Vitest (testing)
- Biome (linting and formatting)

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- pnpm

### Installation

```bash
make install
```

### Development

```bash
make dev
```

### Building

```bash
make build
```

### Testing

```bash
make test          # Run tests
make test-ui       # Run tests with UI
make test-coverage # Run tests with coverage
```

### Linting and Formatting

```bash
make check  # Run Biome linter and formatter with auto-fix
make lint   # Run Biome linter only
make format # Run Biome formatter only
```

## Project Structure

- `/src/types` - TypeScript type definitions for characters, missions, and stats
- `/src/components` - React components including radar charts and character sheets
- `/src/utils` - Utility functions for geometry calculations and success probability
- `/src/test` - Test setup and test files

## Game Mechanics

### Character Stats

Characters start at level 1 with:

- 1 point in each pillar (5 total baseline)
- 2 additional points to distribute freely
- Each level up grants 1 additional point to allocate

### Success Probability

Success probability is calculated based on the overlapping area between character stats and mission requirements on the pentagon radar chart. If a character's stats fully encompass the mission requirements, success is guaranteed (100%).

## Available Commands

Run `make help` to see all available commands.

## License

This is a fan project for educational purposes.
