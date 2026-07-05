/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Character } from '../types/character';
import type { Mission } from '../types/mission';
import { MissionDetailsSection } from './MissionDetailsSection';

const mission: Mission = {
  id: 'mission-1',
  name: 'Test Mission',
  description: 'A test mission',
  difficulty: 'Easy',
  maxAgents: 2,
  requirements: { Combat: 3, Vigor: 3, Mobility: 3, Charisma: 3, Intellect: 3 },
  travelTime: 2,
  missionDuration: 4,
  rewards: { experience: 100 },
};

function makeAgent(id: string, name: string, injuryCount = 0): Character {
  return {
    id,
    name,
    level: 1,
    experience: 50,
    stats: { Combat: 2, Vigor: 2, Mobility: 2, Charisma: 2, Intellect: 2 },
    availablePoints: 0,
    canFly: false,
    isFlightLicensed: false,
    restTime: 5,
    injuryCount,
  };
}

function renderSection(allAgents: Character[], onToggleAgent = vi.fn()) {
  render(
    <MissionDetailsSection
      mission={mission}
      selectedAgents={[]}
      allAgents={allAgents}
      successProbability={0.5}
      missionTimeBreakdown={null}
      isAgentAvailable={() => true}
      onToggleAgent={onToggleAgent}
      onDeployMission={vi.fn()}
      getSuccessColor={() => '#22c55e'}
    />
  );
  return onToggleAgent;
}

describe('MissionDetailsSection - downed agents', () => {
  it('allows selecting healthy and injured agents', () => {
    const onToggleAgent = renderSection([
      makeAgent('agent-1', 'Healthy Agent'),
      makeAgent('agent-2', 'Injured Agent', 1),
    ]);

    fireEvent.click(screen.getByText('Healthy Agent').closest('button')!);
    fireEvent.click(screen.getByText('Injured Agent').closest('button')!);

    expect(onToggleAgent).toHaveBeenCalledTimes(2);
  });

  it('disables downed agents so they cannot be deployed', () => {
    const onToggleAgent = renderSection([
      makeAgent('agent-1', 'Healthy Agent'),
      makeAgent('agent-2', 'Downed Agent', 2),
    ]);

    const downedButton = screen.getByText('Downed Agent').closest('button')!;
    expect(downedButton).toBeDisabled();
    expect(screen.getByText('Downed')).toBeInTheDocument();

    fireEvent.click(downedButton);
    expect(onToggleAgent).not.toHaveBeenCalled();
  });
});
