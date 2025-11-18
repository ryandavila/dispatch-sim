/**
 * @vitest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Character } from '../types/character';
import { useAgentProgress } from './useAgentProgress';

// Mock the dataLoader
vi.mock('../utils/dataLoader', () => ({
  loadAgents: vi.fn(() => [
    {
      id: 'agent-1',
      name: 'Test Agent 1',
      level: 1,
      experience: 50,
      stats: { Combat: 2, Vigor: 2, Mobility: 2, Charisma: 2, Intellect: 2 },
      availablePoints: 2,
      canFly: false,
      isFlightLicensed: false,
      restTime: 5,
    },
    {
      id: 'agent-2',
      name: 'Test Agent 2',
      level: 1,
      experience: 50,
      stats: { Combat: 3, Vigor: 1, Mobility: 2, Charisma: 2, Intellect: 2 },
      availablePoints: 2,
      canFly: false,
      isFlightLicensed: false,
      restTime: 5,
    },
  ]),
}));

describe('useAgentProgress', () => {
  const STORAGE_KEY = 'dispatch-sim-agent-progress';

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should initialize with base agents when no progress saved', () => {
    const { result } = renderHook(() => useAgentProgress());
    const agents = result.current.getAgentsWithProgress();

    expect(agents).toHaveLength(2);
    expect(agents[0].name).toBe('Test Agent 1');
    expect(agents[0].level).toBe(1);
    expect(agents[0].experience).toBe(50);
  });

  it('should load agent progress from localStorage', () => {
    const savedProgress = {
      'agent-1': {
        level: 2,
        experience: 200,
        availablePoints: 3,
        stats: { Combat: 3, Vigor: 2, Mobility: 2, Charisma: 2, Intellect: 2 },
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedProgress));

    const { result } = renderHook(() => useAgentProgress());
    const agents = result.current.getAgentsWithProgress();

    expect(agents[0].level).toBe(2);
    expect(agents[0].experience).toBe(200);
    expect(agents[0].availablePoints).toBe(3);
    expect(agents[0].stats.Combat).toBe(3);
  });

  it('should award experience to agents', () => {
    const { result } = renderHook(() => useAgentProgress());

    act(() => {
      result.current.awardExperience(['agent-1'], 100);
    });

    const agents = result.current.getAgentsWithProgress();
    expect(agents[0].experience).toBe(150); // 50 base + 100 awarded
  });

  it('should level up agents when they gain enough XP', () => {
    const { result } = renderHook(() => useAgentProgress());

    // Level 2 requires 200 XP (level² * 50 = 2² * 50 = 200)
    // Agent starts at 50 XP, so needs 150 more to reach level 2
    act(() => {
      result.current.awardExperience(['agent-1'], 150);
    });

    const agents = result.current.getAgentsWithProgress();
    expect(agents[0].level).toBe(2);
    expect(agents[0].experience).toBe(200);
    expect(agents[0].availablePoints).toBe(3); // 2 starting + 1 for level up
  });

  it('should level up multiple levels at once', () => {
    const { result } = renderHook(() => useAgentProgress());

    // Level 3 requires 450 XP (3² * 50 = 450)
    // Agent starts at 50 XP, so needs 400 more to reach level 3
    act(() => {
      result.current.awardExperience(['agent-1'], 400);
    });

    const agents = result.current.getAgentsWithProgress();
    expect(agents[0].level).toBe(3);
    expect(agents[0].experience).toBe(450);
    expect(agents[0].availablePoints).toBe(4); // 2 starting + 2 for 2 levels
  });

  it('should award XP to multiple agents', () => {
    const { result } = renderHook(() => useAgentProgress());

    act(() => {
      result.current.awardExperience(['agent-1', 'agent-2'], 100);
    });

    const agents = result.current.getAgentsWithProgress();
    expect(agents[0].experience).toBe(150);
    expect(agents[1].experience).toBe(150);
  });

  it('should update agent stats and persist them', () => {
    const { result } = renderHook(() => useAgentProgress());
    const agents = result.current.getAgentsWithProgress();
    const agent = agents[0];

    const updatedAgent: Character = {
      ...agent,
      stats: {
        ...agent.stats,
        Combat: agent.stats.Combat + 1,
      },
      availablePoints: agent.availablePoints - 1,
    };

    act(() => {
      result.current.updateAgentStats(updatedAgent);
    });

    const updatedAgents = result.current.getAgentsWithProgress();
    expect(updatedAgents[0].stats.Combat).toBe(3); // 2 base + 1
    expect(updatedAgents[0].availablePoints).toBe(1); // 2 - 1
  });

  it('should persist agent progress to localStorage', () => {
    const { result } = renderHook(() => useAgentProgress());

    act(() => {
      result.current.awardExperience(['agent-1'], 100);
    });

    const stored = localStorage.getItem(STORAGE_KEY);
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed['agent-1'].experience).toBe(150);
  });

  it('should reset agent progress', () => {
    const { result } = renderHook(() => useAgentProgress());

    act(() => {
      result.current.awardExperience(['agent-1'], 200);
    });

    let agents = result.current.getAgentsWithProgress();
    expect(agents[0].experience).toBe(250);

    act(() => {
      result.current.resetAgentProgress();
    });

    agents = result.current.getAgentsWithProgress();
    expect(agents[0].experience).toBe(50); // Back to base
    expect(agents[0].level).toBe(1);

    // After reset, localStorage should be removed (check is null or empty)
    const stored = localStorage.getItem(STORAGE_KEY);
    expect(stored === null || stored === '{}').toBe(true);
  });

  it('should preserve stat changes when awarding XP', () => {
    const { result } = renderHook(() => useAgentProgress());
    const agents = result.current.getAgentsWithProgress();
    const agent = agents[0];

    // First, update stats
    const updatedAgent: Character = {
      ...agent,
      stats: {
        ...agent.stats,
        Combat: agent.stats.Combat + 2,
      },
      availablePoints: agent.availablePoints - 2,
    };

    act(() => {
      result.current.updateAgentStats(updatedAgent);
    });

    // Then award XP
    act(() => {
      result.current.awardExperience(['agent-1'], 100);
    });

    const finalAgents = result.current.getAgentsWithProgress();
    expect(finalAgents[0].stats.Combat).toBe(4); // 2 + 2, preserved
    expect(finalAgents[0].experience).toBe(150);
  });
});
