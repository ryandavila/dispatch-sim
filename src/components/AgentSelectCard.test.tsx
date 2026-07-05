/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Character } from '../types/character';
import { AgentSelectCard } from './AgentSelectCard';

const baseAgent: Character = {
  id: 'agent-1',
  name: 'Test Agent',
  level: 1,
  experience: 50,
  stats: { Combat: 2, Vigor: 2, Mobility: 2, Charisma: 2, Intellect: 2 },
  availablePoints: 0,
  canFly: false,
  isFlightLicensed: false,
  restTime: 5,
};

describe('AgentSelectCard', () => {
  it('toggles a healthy agent on click', () => {
    const onToggle = vi.fn();
    render(
      <AgentSelectCard
        agent={baseAgent}
        isSelected={false}
        isExcluded={false}
        isDisabled={false}
        onToggle={onToggle}
      />
    );

    fireEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledWith(baseAgent);
  });

  it('shows an injured badge for an injured agent', () => {
    const onToggle = vi.fn();
    render(
      <AgentSelectCard
        agent={{ ...baseAgent, injuryCount: 1 }}
        isSelected={false}
        isExcluded={false}
        isDisabled={false}
        onToggle={onToggle}
      />
    );

    expect(screen.getByText('Injured')).toBeInTheDocument();
    expect(screen.queryByText('Downed')).not.toBeInTheDocument();
  });

  it('shows a downed badge and blocks toggling for a downed agent', () => {
    const onToggle = vi.fn();
    render(
      <AgentSelectCard
        agent={{ ...baseAgent, injuryCount: 2 }}
        isSelected={false}
        isExcluded={false}
        isDisabled={true}
        onToggle={onToggle}
      />
    );

    expect(screen.getByText('Downed')).toBeInTheDocument();
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(onToggle).not.toHaveBeenCalled();
  });
});
