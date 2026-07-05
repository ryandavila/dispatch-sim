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
  it('shows no injury banner for a healthy agent', () => {
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
    // Allocated 4/2/2/2/2 displays as effective 3/1/1/1/1 (floor 1)
    const statValues = Array.from(container.querySelectorAll('.stat-value')).map(
      (el) => el.textContent
    );
    expect(statValues).toEqual(['3', '1', '1', '1', '1']);
    // Allocated value shown alongside the reduced one
    expect(screen.getByText('(4)')).toBeInTheDocument();
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
