/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mission } from '../types/mission';
import { Missions } from './Missions';

const TEST_MISSION: Mission = {
  id: 'mission-test',
  name: 'Test Mission',
  description: 'A mission for testing the catalog',
  difficulty: 'Easy',
  maxAgents: 2,
  requirements: { Combat: 1, Vigor: 1, Mobility: 1, Charisma: 1, Intellect: 1 },
  rewards: { experience: 100 },
  travelTime: 2,
  missionDuration: 4,
};

vi.mock('../utils/dataLoader', () => ({
  loadMissions: () => [TEST_MISSION],
  loadAgents: () => [],
  loadSynergies: () => [],
}));

function renderMissions() {
  render(
    <MemoryRouter>
      <Missions />
    </MemoryRouter>
  );
}

describe('Missions - catalog browse', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('is a read-only catalog that points deploys to a Shift', () => {
    renderMissions();

    expect(screen.getByText('Mission Catalog')).toBeInTheDocument();
    // The browse note links to the Shift page as the place to deploy.
    expect(screen.getByRole('link', { name: 'Shift' })).toHaveAttribute('href', '/shift');
  });

  it('shows read-only mission details on select, with no deploy UI', async () => {
    const user = userEvent.setup();
    renderMissions();

    await user.click(screen.getByText('Test Mission'));

    // Read-only details include the reward, but no team selection or deploy.
    expect(screen.getByText('Reward: 100 XP')).toBeInTheDocument();
    expect(screen.queryByText('Select Team')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /deploy/i })).not.toBeInTheDocument();
  });
});
