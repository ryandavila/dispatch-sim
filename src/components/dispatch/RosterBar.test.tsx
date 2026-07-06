/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Character } from '../../types/character';
import { RosterBar } from './RosterBar';

const healthyAgent: Character = {
  id: 'agent-1',
  name: 'Alpha Agent',
  level: 1,
  experience: 0,
  stats: { Combat: 2, Vigor: 2, Mobility: 2, Charisma: 2, Intellect: 2 },
  availablePoints: 0,
  canFly: false,
  isFlightLicensed: false,
  restTime: 5,
};

const downedAgent: Character = {
  ...healthyAgent,
  id: 'agent-2',
  name: 'Beta Agent',
  injuryCount: 2,
};

const baseProps = {
  activeMissions: [],
  reports: [],
  now: 0,
  selecting: false,
  selectedIds: new Set<string>(),
  canSelect: () => true,
  onToggle: vi.fn(),
  onOpenReport: vi.fn(),
  xpPops: [],
};

describe('RosterBar - defibrillator chip', () => {
  it('renders identically (no DEFIB chip) when onDefib is absent, even for a downed hero', () => {
    const { container } = render(<RosterBar agents={[downedAgent]} {...baseProps} />);

    expect(screen.queryByText('DEFIB')).not.toBeInTheDocument();
    expect(container.querySelector('.dm-hero-defib')).toBeNull();
  });

  it('does not show a DEFIB chip for a healthy hero even when onDefib is provided', () => {
    render(
      <RosterBar agents={[healthyAgent]} {...baseProps} defibAvailable={true} onDefib={vi.fn()} />
    );

    expect(screen.queryByText('DEFIB')).not.toBeInTheDocument();
  });

  it('shows a DEFIB chip on a downed hero tile when onDefib is provided', () => {
    render(
      <RosterBar agents={[downedAgent]} {...baseProps} defibAvailable={true} onDefib={vi.fn()} />
    );

    expect(screen.getByText('DEFIB')).toBeInTheDocument();
  });

  it('calls onDefib with the agent when the chip is clicked', () => {
    const onDefib = vi.fn();
    render(
      <RosterBar agents={[downedAgent]} {...baseProps} defibAvailable={true} onDefib={onDefib} />
    );

    fireEvent.click(screen.getByText('DEFIB'));
    expect(onDefib).toHaveBeenCalledWith(downedAgent);
  });

  it('disables the chip when defibAvailable is false', () => {
    const onDefib = vi.fn();
    render(
      <RosterBar agents={[downedAgent]} {...baseProps} defibAvailable={false} onDefib={onDefib} />
    );

    const chip = screen.getByText('DEFIB');
    expect(chip).toBeDisabled();
    fireEvent.click(chip);
    expect(onDefib).not.toHaveBeenCalled();
  });
});
