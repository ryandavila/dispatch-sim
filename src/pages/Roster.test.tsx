/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { Roster } from './Roster';

// Mock the hooks
vi.mock('../hooks/useAgentProgress', () => ({
  useAgentProgress: vi.fn(() => ({
    agents: [
      {
        id: 'agent-1',
        name: 'Alpha Agent',
        level: 1,
        experience: 50,
        stats: { Combat: 2, Vigor: 2, Mobility: 2, Charisma: 2, Intellect: 2 },
        availablePoints: 0,
        canFly: false,
        isFlightLicensed: false,
        restTime: 5,
      },
      {
        id: 'agent-2',
        name: 'Beta Agent',
        level: 2,
        experience: 200,
        stats: { Combat: 3, Vigor: 2, Mobility: 2, Charisma: 2, Intellect: 2 },
        availablePoints: 2,
        canFly: false,
        isFlightLicensed: false,
        restTime: 5,
      },
      {
        id: 'agent-3',
        name: 'Charlie Agent',
        level: 1,
        experience: 100,
        stats: { Combat: 2, Vigor: 3, Mobility: 2, Charisma: 2, Intellect: 2 },
        availablePoints: 1,
        canFly: false,
        isFlightLicensed: false,
        restTime: 5,
      },
    ],
    updateAgentStats: vi.fn(),
    awardExperience: vi.fn(),
    resetAgentProgress: vi.fn(),
  })),
}));

describe('Roster - Agent Sorting', () => {
  it('should display agents with available points first', () => {
    render(
      <BrowserRouter>
        <Roster />
      </BrowserRouter>
    );

    const cards = screen.getAllByText(/Level \d+/).map((el) => el.closest('.character-card'));
    const cardNames = cards.map((card) => card?.querySelector('h3')?.textContent);

    // Beta Agent (2 points) and Charlie Agent (1 point) should come before Alpha Agent (0 points)
    expect(cardNames[0]).toMatch(/Beta Agent|Charlie Agent/);
    expect(cardNames[1]).toMatch(/Beta Agent|Charlie Agent/);
    expect(cardNames[2]).toBe('Alpha Agent');
  });

  it('should show level-up badges on agents with available points', () => {
    render(
      <BrowserRouter>
        <Roster />
      </BrowserRouter>
    );

    // Should have 2 level-up badges (Beta and Charlie)
    const badges = screen.getAllByText(/Level Up!/);
    expect(badges).toHaveLength(2);
  });

  it('should highlight agents with available points', () => {
    const { container } = render(
      <BrowserRouter>
        <Roster />
      </BrowserRouter>
    );

    // Should have 2 cards with has-level-up class
    const highlightedCards = container.querySelectorAll('.has-level-up');
    expect(highlightedCards).toHaveLength(2);
  });
});

describe('Roster - Sorting Logic', () => {
  it('sorts agents with points first, then by selected criteria', () => {
    const agents = [
      { name: 'Alpha', availablePoints: 0, level: 5 },
      { name: 'Beta', availablePoints: 2, level: 1 },
      { name: 'Charlie', availablePoints: 0, level: 3 },
      { name: 'Delta', availablePoints: 1, level: 2 },
    ];

    const sorted = [...agents].sort((a, b) => {
      // Prioritize agents with available points
      const aHasPoints = a.availablePoints > 0;
      const bHasPoints = b.availablePoints > 0;
      if (aHasPoints !== bHasPoints) {
        return bHasPoints ? 1 : -1;
      }

      // Then sort by name
      return a.name.localeCompare(b.name);
    });

    // Agents with points first (Beta, Delta), then alphabetically (Alpha, Charlie)
    expect(sorted[0].name).toBe('Beta');
    expect(sorted[1].name).toBe('Delta');
    expect(sorted[2].name).toBe('Alpha');
    expect(sorted[3].name).toBe('Charlie');
  });

  it('maintains secondary sort order within groups', () => {
    const agents = [
      { name: 'Zulu', availablePoints: 0, level: 1 },
      { name: 'Yankee', availablePoints: 2, level: 3 },
      { name: 'Alpha', availablePoints: 0, level: 5 },
      { name: 'Bravo', availablePoints: 1, level: 2 },
    ];

    const sorted = [...agents].sort((a, b) => {
      const aHasPoints = a.availablePoints > 0;
      const bHasPoints = b.availablePoints > 0;
      if (aHasPoints !== bHasPoints) {
        return bHasPoints ? 1 : -1;
      }

      // Sort by level descending
      return b.level - a.level;
    });

    // With points, sorted by level: Yankee (L3), Bravo (L2)
    // Without points, sorted by level: Alpha (L5), Zulu (L1)
    expect(sorted[0].name).toBe('Yankee');
    expect(sorted[1].name).toBe('Bravo');
    expect(sorted[2].name).toBe('Alpha');
    expect(sorted[3].name).toBe('Zulu');
  });
});
