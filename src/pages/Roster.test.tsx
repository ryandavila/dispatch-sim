/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Roster } from './Roster';

const agents = [
  {
    id: 'agent-1',
    name: 'Alpha Agent',
    level: 1,
    experience: 0,
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
    experience: 1200,
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
    experience: 500,
    stats: { Combat: 2, Vigor: 3, Mobility: 2, Charisma: 2, Intellect: 2 },
    availablePoints: 1,
    canFly: false,
    isFlightLicensed: false,
    restTime: 5,
    injuryCount: 1,
  },
  {
    id: 'agent-4',
    name: 'Delta Agent',
    level: 3,
    experience: 2000,
    stats: { Combat: 2, Vigor: 2, Mobility: 2, Charisma: 2, Intellect: 2 },
    availablePoints: 0,
    canFly: false,
    isFlightLicensed: false,
    restTime: 5,
    injuryCount: 2,
  },
];

// Mock the hooks
vi.mock('../hooks/useAgentProgress', () => ({
  useAgentProgress: vi.fn(() => ({
    agents,
    updateAgentStats: vi.fn(),
    healAgent: vi.fn(),
    awardExperience: vi.fn(),
    resetAgentProgress: vi.fn(),
  })),
}));

vi.mock('../hooks/useUserProgress', () => ({
  useUserProgress: vi.fn(() => ({
    userProgress: { medKits: 2, shiftSummaries: [] },
    consumeMedKit: vi.fn(() => true),
  })),
}));

describe('Roster - hero roster bar', () => {
  it('renders a tile for every agent', () => {
    render(
      <MemoryRouter initialEntries={['/roster']}>
        <Roster />
      </MemoryRouter>
    );

    for (const agent of agents) {
      expect(screen.getAllByText(agent.name).length).toBeGreaterThan(0);
    }
  });

  it('defaults to selecting the first agent when no ?character= param is set', () => {
    render(
      <MemoryRouter initialEntries={['/roster']}>
        <Roster />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Alpha Agent' })).toBeInTheDocument();
  });

  it('selects the agent named by the ?character= query param', () => {
    render(
      <MemoryRouter initialEntries={['/roster?character=agent-2']}>
        <Roster />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Beta Agent' })).toBeInTheDocument();
  });

  it('marks the selected tile with the amber-highlight class', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/roster?character=agent-2']}>
        <Roster />
      </MemoryRouter>
    );

    const selectedTile = container.querySelector('.hs-hero-tile.hs-selected');
    expect(selectedTile?.textContent).toContain('Beta Agent');
  });

  it('switches the hero file when a different tile is clicked', () => {
    render(
      <MemoryRouter initialEntries={['/roster']}>
        <Roster />
      </MemoryRouter>
    );

    const charlieTile = screen.getByText('Charlie Agent').closest('.hs-hero-tile');
    expect(charlieTile).not.toBeNull();
    fireEvent.click(charlieTile as HTMLElement);

    expect(screen.getByRole('heading', { name: 'Charlie Agent' })).toBeInTheDocument();
  });

  it('shows a filled star badge only for agents with unspent points', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/roster']}>
        <Roster />
      </MemoryRouter>
    );

    const filledBadges = container.querySelectorAll('.hs-star-badge.hs-has-points');
    // Beta Agent (2 points) and Charlie Agent (1 point)
    expect(filledBadges).toHaveLength(2);
  });

  it('applies the downed treatment to an agent with two injuries', () => {
    render(
      <MemoryRouter initialEntries={['/roster']}>
        <Roster />
      </MemoryRouter>
    );

    const deltaTile = screen.getByText('Delta Agent').closest('.hs-hero-tile');
    expect(deltaTile).toHaveClass('hs-downed');
  });

  it('applies the injured tick to an agent with one injury', () => {
    render(
      <MemoryRouter initialEntries={['/roster']}>
        <Roster />
      </MemoryRouter>
    );

    const charlieTile = screen.getByText('Charlie Agent').closest('.hs-hero-tile');
    expect(charlieTile).toHaveClass('hs-injured');
    expect(charlieTile).not.toHaveClass('hs-downed');
  });
});
