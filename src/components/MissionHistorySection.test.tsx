/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Mission } from '../types/mission';
import type { UserProgress } from '../types/userProgress';
import { MissionHistorySection } from './MissionHistorySection';

const mockMissions: Mission[] = [
  {
    id: 'mission-1',
    name: 'Rescue Mission',
    description: 'Save the civilians',
    difficulty: 'Easy',
    maxAgents: 2,
    requirements: { Combat: 5, Vigor: 5, Mobility: 5, Charisma: 5, Intellect: 5 },
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
    requirements: { Combat: 3, Vigor: 3, Mobility: 7, Charisma: 7, Intellect: 7 },
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
          success: true,
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

  it('should display failed attempts with a Failed badge instead of XP', () => {
    const userProgress: UserProgress = {
      completedMissionIds: [],
      missionCompletions: [
        {
          missionId: 'mission-1',
          completedAt: Date.now(),
          agents: ['agent-1'],
          experienceGained: 0,
          success: false,
        },
      ],
      totalExperience: 0,
    };

    render(<MissionHistorySection userProgress={userProgress} allMissions={mockMissions} />);

    expect(screen.getByText('Rescue Mission')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.queryByText(/XP/)).not.toBeInTheDocument();
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
          success: true,
        },
        {
          missionId: 'mission-2',
          completedAt: Date.now(),
          agents: ['agent-2', 'agent-3'],
          experienceGained: 250,
          success: true,
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
          success: true,
        },
        {
          missionId: 'mission-2',
          completedAt: 2000,
          agents: ['agent-2'],
          experienceGained: 250,
          success: true,
        },
      ],
      totalExperience: 350,
    };

    const { container } = render(
      <MissionHistorySection userProgress={userProgress} allMissions={mockMissions} />
    );

    const cards = container.querySelectorAll('.ar-log-row');
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
          success: true,
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
          success: true,
        },
      ],
      totalExperience: 100,
    };

    const { container } = render(
      <MissionHistorySection userProgress={userProgress} allMissions={mockMissions} />
    );

    // A stale/unknown mission id still gets a card, with a fallback name
    // instead of crashing or silently vanishing from history.
    const cards = container.querySelectorAll('.ar-log-row');
    expect(cards).toHaveLength(1);
    expect(screen.getByText('Archived Call')).toBeInTheDocument();
    expect(screen.getByText('+100 XP')).toBeInTheDocument();
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
          success: true,
        },
      ],
      totalExperience: 100,
    };

    render(<MissionHistorySection userProgress={userProgress} allMissions={mockMissions} />);

    expect(screen.getByText('3 agents')).toBeInTheDocument();
  });
});
