/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Character } from '../types/character';
import { CharacterCard } from './CharacterCard';

const baseCharacter: Character = {
  id: 'test-agent',
  name: 'Test Agent',
  level: 1,
  experience: 0,
  stats: { Combat: 2, Vigor: 2, Mobility: 2, Charisma: 2, Intellect: 2 },
  availablePoints: 0,
  canFly: false,
  isFlightLicensed: false,
  restTime: 5,
  tags: ['Test'],
};

describe('CharacterCard', () => {
  it('should render character name and level', () => {
    render(<CharacterCard character={baseCharacter} />);

    expect(screen.getByText('Test Agent')).toBeInTheDocument();
    expect(screen.getByText('Level 1')).toBeInTheDocument();
  });

  it('should display XP progress bar', () => {
    render(<CharacterCard character={baseCharacter} />);

    expect(screen.getByText(/0 \/ 1000 XP/)).toBeInTheDocument();
  });

  it('should not show level-up badge when no points available', () => {
    const { container } = render(<CharacterCard character={baseCharacter} />);

    expect(screen.queryByText(/Level Up!/)).not.toBeInTheDocument();
    expect(container.querySelector('.has-level-up')).not.toBeInTheDocument();
  });

  it('should show level-up badge when points are available', () => {
    const characterWithPoints = { ...baseCharacter, availablePoints: 2 };
    const { container } = render(<CharacterCard character={characterWithPoints} />);

    expect(screen.getByText(/Level Up!/)).toBeInTheDocument();
    expect(container.querySelector('.has-level-up')).toBeInTheDocument();
  });

  it('should add has-level-up class when availablePoints > 0', () => {
    const characterWithPoints = { ...baseCharacter, availablePoints: 1 };
    const { container } = render(<CharacterCard character={characterWithPoints} />);

    const card = container.querySelector('.character-card');
    expect(card?.classList.contains('has-level-up')).toBe(true);
  });

  it('should not add has-level-up class when availablePoints is 0', () => {
    const { container } = render(<CharacterCard character={baseCharacter} />);

    const card = container.querySelector('.character-card');
    expect(card?.classList.contains('has-level-up')).toBe(false);
  });

  it('should display character tags', () => {
    render(<CharacterCard character={baseCharacter} />);

    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should show available points badge when points > 0', () => {
    const characterWithPoints = { ...baseCharacter, availablePoints: 3 };
    render(<CharacterCard character={characterWithPoints} />);

    expect(screen.getByText('3 points available')).toBeInTheDocument();
  });

  it('should calculate XP progress correctly', () => {
    // Character at 400 XP, needs 1000 for level 2
    // Progress: 400 / 1000 XP
    const characterWithXP = { ...baseCharacter, experience: 400 };
    render(<CharacterCard character={characterWithXP} />);

    expect(screen.getByText(/400 \/ 1000 XP/)).toBeInTheDocument();
  });

  it('should use the per-agent XP curve when set', () => {
    // Cheaper curve: level 2 at 400 XP
    const cheapCharacter = { ...baseCharacter, experience: 100, xpToLevel2: 400 };
    render(<CharacterCard character={cheapCharacter} />);

    expect(screen.getByText(/100 \/ 400 XP/)).toBeInTheDocument();
  });

  it('should show MAX for fixed-rank agents', () => {
    const fixedCharacter = { ...baseCharacter, fixedRank: true };
    render(<CharacterCard character={fixedCharacter} />);

    expect(screen.getByText('MAX')).toBeInTheDocument();
  });

  it('should show MAX for agents at the level cap', () => {
    const maxedCharacter = { ...baseCharacter, level: 10, experience: 19800 };
    render(<CharacterCard character={maxedCharacter} />);

    expect(screen.getByText('MAX')).toBeInTheDocument();
  });

  it('should handle selected state', () => {
    const { container } = render(<CharacterCard character={baseCharacter} isSelected />);

    const card = container.querySelector('.character-card');
    expect(card?.classList.contains('selected')).toBe(true);
  });
});
