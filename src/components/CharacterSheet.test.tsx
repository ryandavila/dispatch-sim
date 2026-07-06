/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Character } from '../types/character';
import { CharacterSheet } from './CharacterSheet';

const baseCharacter: Character = {
  id: 'agent-1',
  name: 'Test Agent',
  level: 1,
  experience: 50,
  stats: { Combat: 4, Vigor: 2, Mobility: 2, Charisma: 2, Intellect: 2 },
  availablePoints: 0,
  canFly: false,
  isFlightLicensed: false,
  restTime: 5,
};

describe('CharacterSheet - injuries and healing', () => {
  it('shows no injury alert for a healthy agent', () => {
    render(
      <CharacterSheet
        character={baseCharacter}
        medKits={3}
        onUpdateCharacter={vi.fn()}
        onHealCharacter={vi.fn()}
      />
    );

    expect(screen.queryByText(/Use Med Kit/)).not.toBeInTheDocument();
  });

  it('shows effective stats when injured', () => {
    const { container } = render(
      <CharacterSheet
        character={{ ...baseCharacter, injuryCount: 1 }}
        medKits={3}
        onUpdateCharacter={vi.fn()}
        onHealCharacter={vi.fn()}
      />
    );

    expect(screen.getByText(/Injured/)).toBeInTheDocument();
    // Allocated 4/2/2/2/2 displays as effective 3/1/1/1/1 (floor 1), in
    // Vigor/Mobility/Charisma/Intellect/Combat row order.
    const statValues = Array.from(container.querySelectorAll('.hs-stepper-value')).map((el) =>
      el.textContent?.trim()
    );
    expect(statValues).toEqual(['1', '1', '1', '1', '3']);
  });

  it('heals the agent when a med kit is used', () => {
    const onHealCharacter = vi.fn();
    const character = { ...baseCharacter, injuryCount: 2 };
    render(
      <CharacterSheet
        character={character}
        medKits={3}
        onUpdateCharacter={vi.fn()}
        onHealCharacter={onHealCharacter}
      />
    );

    expect(screen.getByText(/Downed/)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Use Med Kit \(3 left\)/));
    expect(onHealCharacter).toHaveBeenCalledWith(character);
  });

  it('disables healing when no med kits remain', () => {
    const onHealCharacter = vi.fn();
    render(
      <CharacterSheet
        character={{ ...baseCharacter, injuryCount: 1 }}
        medKits={0}
        onUpdateCharacter={vi.fn()}
        onHealCharacter={onHealCharacter}
      />
    );

    const healButton = screen.getByText(/Use Med Kit \(0 left\)/);
    expect(healButton).toBeDisabled();
    fireEvent.click(healButton);
    expect(onHealCharacter).not.toHaveBeenCalled();
  });
});

describe('CharacterSheet - staged stat allocation', () => {
  const withPoints: Character = { ...baseCharacter, availablePoints: 2 };

  it('shows unspent skill points', () => {
    render(
      <CharacterSheet
        character={withPoints}
        medKits={0}
        onUpdateCharacter={vi.fn()}
        onHealCharacter={vi.fn()}
      />
    );

    expect(screen.getByText(/SKILL POINTS UNSPENT: 2/)).toBeInTheDocument();
  });

  it('stages a point on [+] without committing it', () => {
    const onUpdateCharacter = vi.fn();
    render(
      <CharacterSheet
        character={withPoints}
        medKits={0}
        onUpdateCharacter={onUpdateCharacter}
        onHealCharacter={vi.fn()}
      />
    );

    fireEvent.click(screen.getByLabelText('Increase Vigor'));

    expect(screen.getByText(/SKILL POINTS UNSPENT: 1/)).toBeInTheDocument();
    expect(onUpdateCharacter).not.toHaveBeenCalled();
  });

  it('[−] only removes pending points, never committed ones', () => {
    render(
      <CharacterSheet
        character={withPoints}
        medKits={0}
        onUpdateCharacter={vi.fn()}
        onHealCharacter={vi.fn()}
      />
    );

    // No pending points yet, so the minus button for Vigor must be disabled.
    const decreaseButton = screen.getByLabelText('Remove pending Vigor point');
    expect(decreaseButton).toBeDisabled();
  });

  it('RESET clears all staged points', () => {
    render(
      <CharacterSheet
        character={withPoints}
        medKits={0}
        onUpdateCharacter={vi.fn()}
        onHealCharacter={vi.fn()}
      />
    );

    fireEvent.click(screen.getByLabelText('Increase Vigor'));
    fireEvent.click(screen.getByLabelText('Increase Combat'));
    expect(screen.getByText(/SKILL POINTS UNSPENT: 0/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Reset'));
    expect(screen.getByText(/SKILL POINTS UNSPENT: 2/)).toBeInTheDocument();
  });

  it('CONFIRM commits all pending points via onUpdateCharacter', () => {
    const onUpdateCharacter = vi.fn();
    render(
      <CharacterSheet
        character={withPoints}
        medKits={0}
        onUpdateCharacter={onUpdateCharacter}
        onHealCharacter={vi.fn()}
      />
    );

    fireEvent.click(screen.getByLabelText('Increase Vigor'));
    fireEvent.click(screen.getByLabelText('Increase Vigor'));
    fireEvent.click(screen.getByText('Confirm'));

    expect(onUpdateCharacter).toHaveBeenCalledWith({
      ...withPoints,
      stats: { ...withPoints.stats, Vigor: withPoints.stats.Vigor + 2 },
      availablePoints: 0,
    });
    // Pending is cleared after confirm — since the test double doesn't feed
    // the committed character back in as a new prop, unspent reverts to
    // showing the (unchanged) prop's availablePoints with no pending on top.
    expect(screen.getByText(/SKILL POINTS UNSPENT: 2/)).toBeInTheDocument();
  });

  it('cannot stage more points than are available', () => {
    const onePoint: Character = { ...baseCharacter, availablePoints: 1 };
    render(
      <CharacterSheet
        character={onePoint}
        medKits={0}
        onUpdateCharacter={vi.fn()}
        onHealCharacter={vi.fn()}
      />
    );

    fireEvent.click(screen.getByLabelText('Increase Vigor'));
    expect(screen.getByText(/SKILL POINTS UNSPENT: 0/)).toBeInTheDocument();

    // Further + clicks on other stats should have no effect once unspent hits 0.
    fireEvent.click(screen.getByLabelText('Increase Combat'));
    expect(screen.getByText(/SKILL POINTS UNSPENT: 0/)).toBeInTheDocument();
  });
});

describe('CharacterSheet - powers and info tabs', () => {
  it('shows notes and flight badges on the powers tab', () => {
    const flyer: Character = {
      ...baseCharacter,
      notes: 'Can fly very fast.',
      canFly: true,
      isFlightLicensed: true,
    };
    render(
      <CharacterSheet
        character={flyer}
        medKits={0}
        onUpdateCharacter={vi.fn()}
        onHealCharacter={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Powers'));
    expect(screen.getByText('Can fly very fast.')).toBeInTheDocument();
    expect(screen.getByText('Flight')).toBeInTheDocument();
    expect(screen.getByText('Flight Licensed')).toBeInTheDocument();
  });

  it('shows the fixed-rank note on the info tab', () => {
    const fixed: Character = { ...baseCharacter, fixedRank: true };
    render(
      <CharacterSheet
        character={fixed}
        medKits={0}
        onUpdateCharacter={vi.fn()}
        onHealCharacter={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Info'));
    expect(screen.getByText('RANK FIXED — NO FACTORING')).toBeInTheDocument();
  });
});
