/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Character } from '../../types/character';
import type { Disruption, Mission } from '../../types/mission';
import { createEmptyStats } from '../../types/stats';
import { DisruptionWindow } from './DisruptionWindow';

const MISSION: Mission = {
  id: 'm-1',
  name: 'Sewage Clog',
  description: '',
  requirements: createEmptyStats(),
  difficulty: 'Easy',
  maxAgents: 2,
  travelTime: 1,
  missionDuration: 1,
};

const DISRUPTION: Disruption = {
  prompt: 'The clog just shifted — **something** is about to give.',
  options: [
    {
      id: 'opt-stat',
      label: 'Muscle it free',
      stat: 'Vigor',
      threshold: 4,
      xpBonus: 20,
      passText: 'Ripped it loose clean.',
      failText: 'Knocked flat into the muck.',
    },
    {
      id: 'opt-hero',
      label: 'Bend the water around himself',
      heroId: 'waterboy',
      xpBonus: 30,
      passText: 'Waterboy handles it without a drop out of place.',
      failText: 'Not applicable.',
    },
  ],
};

function agent(id: string, stats = createEmptyStats()): Character {
  return {
    id,
    name: id,
    level: 1,
    experience: 0,
    stats,
    availablePoints: 0,
    canFly: false,
    isFlightLicensed: false,
    restTime: 5,
  };
}

describe('DisruptionWindow', () => {
  it('renders the prompt with keyword highlights', () => {
    render(
      <DisruptionWindow
        mission={MISSION}
        disruption={DISRUPTION}
        deployedAgents={[agent('coupe')]}
        teamStats={createEmptyStats()}
        onResolve={vi.fn()}
        onContinue={vi.fn()}
      />
    );
    expect(screen.getByText('something')).toHaveClass('dm-kw');
  });

  it('titles the window CALL.DISRUPT with the mission name uppercased', () => {
    render(
      <DisruptionWindow
        mission={MISSION}
        disruption={DISRUPTION}
        deployedAgents={[]}
        teamStats={createEmptyStats()}
        onResolve={vi.fn()}
        onContinue={vi.fn()}
      />
    );
    expect(screen.getByText(/CALL\.DISRUPT/)).toHaveTextContent('CALL.DISRUPT — SEWAGE CLOG');
  });

  it('always shows the stat option', () => {
    render(
      <DisruptionWindow
        mission={MISSION}
        disruption={DISRUPTION}
        deployedAgents={[agent('coupe')]}
        teamStats={createEmptyStats()}
        onResolve={vi.fn()}
        onContinue={vi.fn()}
      />
    );
    expect(screen.getByText('Muscle it free')).toBeInTheDocument();
    expect(screen.getByText('VIG 4+')).toBeInTheDocument();
  });

  it('hides the hero option when the hero is not deployed', () => {
    render(
      <DisruptionWindow
        mission={MISSION}
        disruption={DISRUPTION}
        deployedAgents={[agent('coupe')]}
        teamStats={createEmptyStats()}
        onResolve={vi.fn()}
        onContinue={vi.fn()}
      />
    );
    expect(screen.queryByText('Bend the water around himself')).not.toBeInTheDocument();
  });

  it('shows the hero option with a hero chip when the hero is deployed', () => {
    render(
      <DisruptionWindow
        mission={MISSION}
        disruption={DISRUPTION}
        deployedAgents={[agent('waterboy')]}
        teamStats={createEmptyStats()}
        onResolve={vi.fn()}
        onContinue={vi.fn()}
      />
    );
    expect(screen.getByText('Bend the water around himself')).toBeInTheDocument();
    expect(screen.getByText('WATERBOY')).toBeInTheDocument();
  });

  it('does not show percentages or MEETS/telegraphed pass indicators', () => {
    const { container } = render(
      <DisruptionWindow
        mission={MISSION}
        disruption={DISRUPTION}
        deployedAgents={[agent('coupe')]}
        teamStats={{ ...createEmptyStats(), Vigor: 8 }}
        onResolve={vi.fn()}
        onContinue={vi.fn()}
      />
    );
    expect(container.textContent).not.toMatch(/%/);
    expect(container.textContent?.toUpperCase()).not.toContain('MEETS');
  });

  it('resolves on pick, calls onResolve, and shows the PASS stamp on success', () => {
    const onResolve = vi.fn();
    render(
      <DisruptionWindow
        mission={MISSION}
        disruption={DISRUPTION}
        deployedAgents={[agent('coupe')]}
        teamStats={{ ...createEmptyStats(), Vigor: 5 }}
        onResolve={onResolve}
        onContinue={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('Muscle it free'));

    expect(onResolve).toHaveBeenCalledWith({
      optionId: 'opt-stat',
      success: true,
      xpBonus: 20,
      text: 'Ripped it loose clean.',
    });
    expect(screen.getByTestId('disrupt-stamp')).toHaveTextContent('Pass');
    expect(screen.getByText('Ripped it loose clean.')).toBeInTheDocument();
    expect(screen.getByText('+20 XP TO POOL')).toBeInTheDocument();
  });

  it('shows the FAIL stamp and no XP line on failure', () => {
    const onResolve = vi.fn();
    render(
      <DisruptionWindow
        mission={MISSION}
        disruption={DISRUPTION}
        deployedAgents={[agent('coupe')]}
        teamStats={{ ...createEmptyStats(), Vigor: 1 }}
        onResolve={onResolve}
        onContinue={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('Muscle it free'));

    expect(onResolve).toHaveBeenCalledWith({
      optionId: 'opt-stat',
      success: false,
      xpBonus: 0,
      text: 'Knocked flat into the muck.',
    });
    expect(screen.getByTestId('disrupt-stamp')).toHaveTextContent('Fail');
    expect(screen.queryByText(/XP TO POOL/)).not.toBeInTheDocument();
  });

  it('auto-succeeds a hero option and reports it via onResolve', () => {
    const onResolve = vi.fn();
    render(
      <DisruptionWindow
        mission={MISSION}
        disruption={DISRUPTION}
        deployedAgents={[agent('waterboy')]}
        teamStats={createEmptyStats()}
        onResolve={onResolve}
        onContinue={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('Bend the water around himself'));

    expect(onResolve).toHaveBeenCalledWith({
      optionId: 'opt-hero',
      success: true,
      xpBonus: 30,
      text: 'Waterboy handles it without a drop out of place.',
    });
    expect(screen.getByTestId('disrupt-stamp')).toHaveTextContent('Pass');
  });

  it('calls onContinue when the Continue button is clicked', () => {
    const onContinue = vi.fn();
    render(
      <DisruptionWindow
        mission={MISSION}
        disruption={DISRUPTION}
        deployedAgents={[agent('coupe')]}
        teamStats={{ ...createEmptyStats(), Vigor: 5 }}
        onResolve={vi.fn()}
        onContinue={onContinue}
      />
    );
    fireEvent.click(screen.getByText('Muscle it free'));
    fireEvent.click(screen.getByText('Continue'));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
