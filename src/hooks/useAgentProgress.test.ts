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
      experience: 0,
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
      experience: 0,
      stats: { Combat: 3, Vigor: 1, Mobility: 2, Charisma: 2, Intellect: 2 },
      availablePoints: 2,
      canFly: false,
      isFlightLicensed: false,
      restTime: 5,
    },
    {
      id: 'cheap-agent',
      name: 'Cheap Curve Agent',
      level: 1,
      experience: 0,
      stats: { Combat: 1, Vigor: 2, Mobility: 2, Charisma: 1, Intellect: 2 },
      availablePoints: 0,
      canFly: false,
      isFlightLicensed: false,
      restTime: 5,
      xpToLevel2: 400,
    },
    {
      id: 'fixed-agent',
      name: 'Fixed Rank Agent',
      level: 1,
      experience: 0,
      stats: { Combat: 7, Vigor: 7, Mobility: 6, Charisma: 2, Intellect: 1 },
      availablePoints: 0,
      canFly: true,
      isFlightLicensed: true,
      restTime: 2,
      fixedRank: true,
    },
  ]),
}));

describe('useAgentProgress', () => {
  const STORAGE_KEY = 'dispatch-sim-agent-progress-v2';
  const LEGACY_STORAGE_KEY = 'dispatch-sim-agent-progress';

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should initialize with base agents when no progress saved', () => {
    const { result } = renderHook(() => useAgentProgress());

    expect(result.current.agents).toHaveLength(4);
    expect(result.current.agents[0].name).toBe('Test Agent 1');
    expect(result.current.agents[0].level).toBe(1);
    expect(result.current.agents[0].experience).toBe(0);
  });

  it('should wipe legacy pre-rework saves on load', () => {
    const legacyProgress = {
      'agent-1': {
        level: 3,
        experience: 450,
        availablePoints: 4,
        stats: { Combat: 5, Vigor: 2, Mobility: 2, Charisma: 2, Intellect: 2 },
      },
    };
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(legacyProgress));

    const { result } = renderHook(() => useAgentProgress());

    // Legacy save is removed and agents start fresh
    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
    expect(result.current.agents[0].level).toBe(1);
    expect(result.current.agents[0].experience).toBe(0);
  });

  it('should load agent progress from localStorage', () => {
    const savedProgress = {
      'agent-1': {
        level: 2,
        experience: 1000,
        availablePoints: 3,
        stats: { Combat: 3, Vigor: 2, Mobility: 2, Charisma: 2, Intellect: 2 },
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedProgress));

    const { result } = renderHook(() => useAgentProgress());

    expect(result.current.agents[0].level).toBe(2);
    expect(result.current.agents[0].experience).toBe(1000);
    expect(result.current.agents[0].availablePoints).toBe(3);
    expect(result.current.agents[0].stats.Combat).toBe(3);
  });

  it('should award experience to agents', () => {
    const { result } = renderHook(() => useAgentProgress());

    act(() => {
      result.current.awardExperience(['agent-1'], 100);
    });

    expect(result.current.agents[0].experience).toBe(100);
  });

  it('should level up agents when they gain enough XP', () => {
    const { result } = renderHook(() => useAgentProgress());

    // Level 2 requires 1000 XP total
    act(() => {
      result.current.awardExperience(['agent-1'], 1000);
    });

    expect(result.current.agents[0].level).toBe(2);
    expect(result.current.agents[0].experience).toBe(1000);
    expect(result.current.agents[0].availablePoints).toBe(3); // 2 starting + 1 for level up
  });

  it('should level up multiple levels at once', () => {
    const { result } = renderHook(() => useAgentProgress());

    // Level 3 requires 2300 XP total (1000 + 1300)
    act(() => {
      result.current.awardExperience(['agent-1'], 2300);
    });

    expect(result.current.agents[0].level).toBe(3);
    expect(result.current.agents[0].experience).toBe(2300);
    expect(result.current.agents[0].availablePoints).toBe(4); // 2 starting + 2 for 2 levels
  });

  it('should use a cheaper per-agent XP curve when set', () => {
    const { result } = renderHook(() => useAgentProgress());

    // cheap-agent reaches level 2 at 400 XP
    act(() => {
      result.current.awardExperience(['cheap-agent'], 400);
    });

    const cheapAgent = result.current.agents.find((a) => a.id === 'cheap-agent');
    expect(cheapAgent?.level).toBe(2);
    expect(cheapAgent?.availablePoints).toBe(1);
  });

  it('should not award XP or levels to fixed-rank agents', () => {
    const { result } = renderHook(() => useAgentProgress());

    act(() => {
      result.current.awardExperience(['fixed-agent'], 10000);
    });

    const fixedAgent = result.current.agents.find((a) => a.id === 'fixed-agent');
    expect(fixedAgent?.level).toBe(1);
    expect(fixedAgent?.experience).toBe(0);
    expect(fixedAgent?.availablePoints).toBe(0);
  });

  it('should stop XP accrual at the experience cap', () => {
    const { result } = renderHook(() => useAgentProgress());

    // Cap is 19800 XP (level 10) on the default curve
    act(() => {
      result.current.awardExperience(['agent-1'], 1_000_000);
    });

    expect(result.current.agents[0].level).toBe(10);
    expect(result.current.agents[0].experience).toBe(19800);
    expect(result.current.agents[0].availablePoints).toBe(11); // 2 starting + 9 earned

    // Further awards are ignored
    act(() => {
      result.current.awardExperience(['agent-1'], 500);
    });

    expect(result.current.agents[0].experience).toBe(19800);
    expect(result.current.agents[0].availablePoints).toBe(11);
  });

  it('should award XP to multiple agents', () => {
    const { result } = renderHook(() => useAgentProgress());

    act(() => {
      result.current.awardExperience(['agent-1', 'agent-2'], 100);
    });

    expect(result.current.agents[0].experience).toBe(100);
    expect(result.current.agents[1].experience).toBe(100);
  });

  it('should update agent stats and persist them', () => {
    const { result } = renderHook(() => useAgentProgress());
    const agent = result.current.agents[0];

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

    expect(result.current.agents[0].stats.Combat).toBe(3); // 2 base + 1
    expect(result.current.agents[0].availablePoints).toBe(1); // 2 - 1
  });

  it('should persist agent progress to localStorage', () => {
    const { result } = renderHook(() => useAgentProgress());

    act(() => {
      result.current.awardExperience(['agent-1'], 100);
    });

    const stored = localStorage.getItem(STORAGE_KEY);
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed['agent-1'].experience).toBe(100);
  });

  it('should reset agent progress', () => {
    const { result } = renderHook(() => useAgentProgress());

    act(() => {
      result.current.awardExperience(['agent-1'], 200);
    });

    expect(result.current.agents[0].experience).toBe(200);

    act(() => {
      result.current.resetAgentProgress();
    });

    expect(result.current.agents[0].experience).toBe(0); // Back to base
    expect(result.current.agents[0].level).toBe(1);

    // After reset, localStorage should be removed (check is null or empty)
    const stored = localStorage.getItem(STORAGE_KEY);
    expect(stored === null || stored === '{}').toBe(true);
  });

  it('should injure agents on a failed mission', () => {
    const { result } = renderHook(() => useAgentProgress());

    act(() => {
      result.current.applyInjuries(['agent-1', 'agent-2']);
    });

    expect(result.current.agents[0].injuryCount).toBe(1);
    expect(result.current.agents[1].injuryCount).toBe(1);
    // Allocated stats are untouched — the penalty is a modifier
    expect(result.current.agents[0].stats).toEqual({
      Combat: 2,
      Vigor: 2,
      Mobility: 2,
      Charisma: 2,
      Intellect: 2,
    });
  });

  it('should down an agent on a second injury and cap the count', () => {
    const { result } = renderHook(() => useAgentProgress());

    act(() => {
      result.current.applyInjuries(['agent-1']);
    });
    act(() => {
      result.current.applyInjuries(['agent-1']);
    });

    expect(result.current.agents[0].injuryCount).toBe(2);

    // A third failure doesn't push past downed
    act(() => {
      result.current.applyInjuries(['agent-1']);
    });
    expect(result.current.agents[0].injuryCount).toBe(2);
  });

  it('should heal all injuries on an agent', () => {
    const { result } = renderHook(() => useAgentProgress());

    act(() => {
      result.current.applyInjuries(['agent-1']);
    });
    act(() => {
      result.current.applyInjuries(['agent-1']);
    });
    expect(result.current.agents[0].injuryCount).toBe(2);

    act(() => {
      result.current.healAgent('agent-1');
    });

    expect(result.current.agents[0].injuryCount).toBe(0);
  });

  it('should persist injuries to localStorage', () => {
    const { result } = renderHook(() => useAgentProgress());

    act(() => {
      result.current.applyInjuries(['agent-1']);
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored['agent-1'].injuryCount).toBe(1);
    // Level and stats carried over from the base agent
    expect(stored['agent-1'].level).toBe(1);
    expect(stored['agent-1'].stats.Combat).toBe(2);
  });

  it('should preserve injuries when awarding XP and updating stats', () => {
    const { result } = renderHook(() => useAgentProgress());

    act(() => {
      result.current.applyInjuries(['agent-1']);
    });
    act(() => {
      result.current.awardExperience(['agent-1'], 100);
    });

    expect(result.current.agents[0].injuryCount).toBe(1);
    expect(result.current.agents[0].experience).toBe(100);

    act(() => {
      result.current.updateAgentStats(result.current.agents[0]);
    });
    expect(result.current.agents[0].injuryCount).toBe(1);
  });

  it('should treat old saves without injuryCount as healthy', () => {
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

    expect(result.current.agents[0].injuryCount).toBe(0);
  });

  it('should preserve stat changes when awarding XP', () => {
    const { result } = renderHook(() => useAgentProgress());
    const agent = result.current.agents[0];

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

    expect(result.current.agents[0].stats.Combat).toBe(4); // 2 + 2, preserved
    expect(result.current.agents[0].experience).toBe(100);
  });

  describe('grantAvailablePoints', () => {
    it('adds points to an agent with no prior progress entry', () => {
      const { result } = renderHook(() => useAgentProgress());

      act(() => {
        result.current.grantAvailablePoints('agent-1', 3);
      });

      // Base availablePoints (2) + 3 granted.
      expect(result.current.agents.find((a) => a.id === 'agent-1')?.availablePoints).toBe(5);
    });

    it('adds points on top of an existing progress entry', () => {
      const { result } = renderHook(() => useAgentProgress());

      act(() => {
        result.current.grantAvailablePoints('agent-1', 1);
      });
      act(() => {
        result.current.grantAvailablePoints('agent-1', 2);
      });

      expect(result.current.agents.find((a) => a.id === 'agent-1')?.availablePoints).toBe(5);
    });

    it('is a no-op for non-positive amounts and unknown agents', () => {
      const { result } = renderHook(() => useAgentProgress());

      act(() => {
        result.current.grantAvailablePoints('agent-1', 0);
        result.current.grantAvailablePoints('agent-1', -2);
        result.current.grantAvailablePoints('nope', 5);
      });

      expect(result.current.agents.find((a) => a.id === 'agent-1')?.availablePoints).toBe(2);
    });
  });
});
