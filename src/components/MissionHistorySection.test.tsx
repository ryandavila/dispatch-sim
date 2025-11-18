/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MissionHistorySection } from './MissionHistorySection';
import type { UserProgress } from '../types/userProgress';
import type { Mission } from '../types/mission';

const mockMissions: Mission[] = [
  {
    id: 'mission-1',
    name: 'Rescue Mission',
    description: 'Save the civilians',
    difficulty: 'Easy',
    maxAgents: 2,
    requirements: { Power: 5, Defense: 5, Speed: 5, Intellect: 5 },
    excludedAgents: [],
    travelTime: 2,
    missionDuration: 4,
    rewards: { experience: 100 },
  },
  {
    id: 'mission-2',
    name: 'Recon Mission',
    description: 'Gather intel',
    difficulty: 'Medium',
    maxAgents: 3,
    requirements: { Power: 3, Defense: 3, Speed: 7, Intellect: 7 },
    excludedAgents: [],
    travelTime: 3,
    missionDuration: 6,
    rewards: { experience: 250 },
  },
];

describe('MissionHistorySection', () => {
  it('should show empty state when no missions completed', () => {
    const emptyProgress: UserProgress = {
      completedMissionIds: [],
      missionCompletions: [],
      totalExperience: 0,
    };

    render(<MissionHistorySection userProgress={emptyProgress} allMissions={mockMissions} />);

    expect(screen.getByText(/no missions completed yet/i)).toBeInTheDocument();
  });

  it('should display completed mission', () => {
    const userProgress: UserProgress = {
      completedMissionIds: ['mission-1'],
      missionCompletions: [
        {
          missionId: 'mission-1',
          completedAt: Date.now(),
          agents: ['agent-1', 'agent-2'],
          experienceGained: 100,
        },
      ],
      totalExperience: 100,
    };

    render(<MissionHistorySection userProgress={userProgress} allMissions={mockMissions} />);

    expect(screen.getByText('Rescue Mission')).toBeInTheDocument();
    expect(screen.getByText('Save the civilians')).toBeInTheDocument();
    expect(screen.getByText('+100 XP')).toBeInTheDocument();
    expect(screen.getByText('2 agents')).toBeInTheDocument();
  });

  it('should display multiple completed missions', () => {
    const userProgress: UserProgress = {
      completedMissionIds: ['mission-1', 'mission-2'],
      missionCompletions: [
        {
          missionId: 'mission-1',
          completedAt: Date.now() - 1000,
          agents: ['agent-1'],
          experienceGained: 100,
        },
        {
          missionId: 'mission-2',
          completedAt: Date.now(),
          agents: ['agent-2', 'agent-3'],
          experienceGained: 250,
        },
      ],
      totalExperience: 350,
    };

    render(<MissionHistorySection userProgress={userProgress} allMissions={mockMissions} />);

    expect(screen.getByText('Rescue Mission')).toBeInTheDocument();
    expect(screen.getByText('Recon Mission')).toBeInTheDocument();
    expect(screen.getByText('+100 XP')).toBeInTheDocument();
    expect(screen.getByText('+250 XP')).toBeInTheDocument();
  });

  it('should display most recent missions first', () => {
    const userProgress: UserProgress = {
      completedMissionIds: ['mission-1', 'mission-2'],
      missionCompletions: [
        {
          missionId: 'mission-1',
          completedAt: 1000,
          agents: ['agent-1'],
          experienceGained: 100,
        },
        {
          missionId: 'mission-2',
          completedAt: 2000,
          agents: ['agent-2'],
          experienceGained: 250,
        },
      ],
      totalExperience: 350,
    };

    const { container } = render(
      <MissionHistorySection userProgress={userProgress} allMissions={mockMissions} />
    );

    const cards = container.querySelectorAll('.mission-card');
    expect(cards[0]).toHaveTextContent('Recon Mission'); // More recent
    expect(cards[1]).toHaveTextContent('Rescue Mission'); // Older
  });

  it('should format completion date correctly', () => {
    const completedAt = new Date('2025-01-15T14:30:00').getTime();
    const userProgress: UserProgress = {
      completedMissionIds: ['mission-1'],
      missionCompletions: [
        {
          missionId: 'mission-1',
          completedAt,
          agents: ['agent-1'],
          experienceGained: 100,
        },
      ],
      totalExperience: 100,
    };

    render(<MissionHistorySection userProgress={userProgress} allMissions={mockMissions} />);

    // Should show formatted date (format varies by locale, so just check it exists)
    const dateElements = screen.getAllByText(/Jan|January/i);
    expect(dateElements.length).toBeGreaterThan(0);
  });

  it('should handle missing mission data gracefully', () => {
    const userProgress: UserProgress = {
      completedMissionIds: ['mission-nonexistent'],
      missionCompletions: [
        {
          missionId: 'mission-nonexistent',
          completedAt: Date.now(),
          agents: ['agent-1'],
          experienceGained: 100,
        },
      ],
      totalExperience: 100,
    };

    const { container } = render(
      <MissionHistorySection userProgress={userProgress} allMissions={mockMissions} />
    );

    // Should not render a card for missing mission
    const cards = container.querySelectorAll('.mission-card');
    expect(cards).toHaveLength(0);
  });

  it('should display correct agent count', () => {
    const userProgress: UserProgress = {
      completedMissionIds: ['mission-1'],
      missionCompletions: [
        {
          missionId: 'mission-1',
          completedAt: Date.now(),
          agents: ['agent-1', 'agent-2', 'agent-3'],
          experienceGained: 100,
        },
      ],
      totalExperience: 100,
    };

    render(<MissionHistorySection userProgress={userProgress} allMissions={mockMissions} />);

    expect(screen.getByText('3 agents')).toBeInTheDocument();
  });
});
