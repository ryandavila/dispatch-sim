/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Character } from '../types/character';
import type { Mission } from '../types/mission';
import { Missions } from './Missions';

const TEST_MISSION: Mission = {
  id: 'mission-test',
  name: 'Test Mission',
  description: 'A mission for testing the deploy flow',
  difficulty: 'Easy',
  maxAgents: 2,
  requirements: { Combat: 1, Vigor: 1, Mobility: 1, Charisma: 1, Intellect: 1 },
  rewards: { experience: 100 },
  travelTime: 2,
  missionDuration: 4,
};

const TEST_AGENTS: Character[] = [
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
    level: 1,
    experience: 50,
    stats: { Combat: 3, Vigor: 2, Mobility: 2, Charisma: 2, Intellect: 2 },
    availablePoints: 0,
    canFly: false,
    isFlightLicensed: false,
    restTime: 5,
  },
];

vi.mock('../utils/dataLoader', () => ({
  loadMissions: () => [TEST_MISSION],
  loadAgents: () => TEST_AGENTS,
  loadSynergies: () => [],
}));

vi.mock('../hooks/useAgentProgress', () => ({
  useAgentProgress: () => ({
    agents: TEST_AGENTS,
    awardExperience: vi.fn(),
    updateAgentStats: vi.fn(),
    applyInjuries: vi.fn(),
    healAgent: vi.fn(),
    resetAgentProgress: vi.fn(),
  }),
}));

describe('Missions - deploy flow', () => {
  it('deploys a mission and marks the deployed agents as unavailable', async () => {
    const user = userEvent.setup();
    const { container } = render(<Missions />);

    // No active missions before deploying
    expect(screen.queryByText('Active Missions')).not.toBeInTheDocument();

    // Select the mission from the list
    await user.click(screen.getByText('Test Mission'));
    expect(screen.getByText('Select Team')).toBeInTheDocument();

    // Select an agent for the team
    const alphaCard = screen.getByRole('button', { name: /Alpha Agent/ });
    await user.click(alphaCard);
    expect(screen.getByText('1/2')).toBeInTheDocument();

    // Deploy
    await user.click(screen.getByRole('button', { name: /Deploy Mission/i }));

    // The active mission appears with the deployed agent
    expect(screen.getByText('Active Missions')).toBeInTheDocument();
    const activeCard = container.querySelector('.active-mission-card');
    expect(activeCard).not.toBeNull();
    expect(activeCard).toHaveTextContent('Test Mission');
    expect(activeCard).toHaveTextContent('Alpha Agent');

    // The deployed agent is no longer selectable, the other agent still is
    expect(screen.getByRole('button', { name: /Alpha Agent/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Beta Agent/ })).toBeEnabled();

    // Selection was cleared by the deploy
    expect(screen.getByText('0/2')).toBeInTheDocument();
  });

  it('does not add a deployed agent back to the team when clicked', async () => {
    const user = userEvent.setup();
    render(<Missions />);

    await user.click(screen.getByText('Test Mission'));
    await user.click(screen.getByRole('button', { name: /Alpha Agent/ }));
    await user.click(screen.getByRole('button', { name: /Deploy Mission/i }));

    // Clicking the now-unavailable agent does nothing
    await user.click(screen.getByRole('button', { name: /Alpha Agent/ }));
    expect(screen.getByText('0/2')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Deploy Mission/i })).not.toBeInTheDocument();
  });
});
