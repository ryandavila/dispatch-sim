/**
 * @vitest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Character } from '../types/character';
import type { Mission } from '../types/mission';
import { useActiveMissions } from './useActiveMissions';

const mockMission: Mission = {
  id: 'mission-test',
  name: 'Test Mission',
  description: 'A test mission',
  difficulty: 'Easy',
  maxAgents: 2,
  requirements: { Combat: 5, Vigor: 5, Mobility: 5, Charisma: 5, Intellect: 5 },
  excludedAgents: [],
  travelTime: 2,
  missionDuration: 4,
  rewards: { experience: 100 },
};

const mockAgent: Character = {
  id: 'agent-test',
  name: 'Test Agent',
  stats: { Combat: 6, Vigor: 6, Mobility: 6, Charisma: 6, Intellect: 6 },
  canFly: false,
  isFlightLicensed: false,
  restTime: 3,
};

describe('useActiveMissions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should initialize with no active missions', () => {
    const { result } = renderHook(() => useActiveMissions());

    expect(result.current.activeMissions).toEqual([]);
    expect(result.current.completedMissions).toEqual([]);
  });

  it('should deploy a mission', () => {
    const { result } = renderHook(() => useActiveMissions());

    act(() => {
      result.current.deployMission(mockMission, [mockAgent]);
    });

    expect(result.current.activeMissions).toHaveLength(1);
    expect(result.current.activeMissions[0].mission.id).toBe('mission-test');
    expect(result.current.activeMissions[0].agents).toHaveLength(1);
  });

  it('should mark agents as unavailable during missions', () => {
    const { result } = renderHook(() => useActiveMissions());

    expect(result.current.isAgentAvailable('agent-test')).toBe(true);

    act(() => {
      result.current.deployMission(mockMission, [mockAgent]);
    });

    expect(result.current.isAgentAvailable('agent-test')).toBe(false);
  });

  it('should update current time every second', () => {
    const { result } = renderHook(() => useActiveMissions());
    const initialTime = result.current.currentTime;

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.currentTime).toBeGreaterThan(initialTime);
  });

  it('should move missions to completed when finished', () => {
    const onMissionComplete = vi.fn();
    const { result } = renderHook(() => useActiveMissions({ onMissionComplete }));

    act(() => {
      result.current.deployMission(mockMission, [mockAgent]);
    });

    expect(result.current.activeMissions).toHaveLength(1);
    expect(result.current.completedMissions).toHaveLength(0);

    // Mission timeline: 2s travel + 4s mission + 2s return + 3s rest = 11s total
    // Advance time to completion
    act(() => {
      vi.advanceTimersByTime(12000); // Add buffer for state updates
    });

    expect(result.current.completedMissions).toHaveLength(1);
    expect(result.current.activeMissions).toHaveLength(0);
    expect(onMissionComplete).toHaveBeenCalledTimes(1);
  });

  it('should call completion callback with mission data', () => {
    const onMissionComplete = vi.fn();
    const { result } = renderHook(() => useActiveMissions({ onMissionComplete }));

    act(() => {
      result.current.deployMission(mockMission, [mockAgent]);
    });

    // Complete the mission
    act(() => {
      vi.advanceTimersByTime(12000);
    });

    expect(onMissionComplete).toHaveBeenCalled();
    const callArg = onMissionComplete.mock.calls[0][0];
    expect(callArg.mission.id).toBe('mission-test');
    expect(callArg.agents).toHaveLength(1);
  });

  it('should remove completed missions after display time', () => {
    const { result } = renderHook(() => useActiveMissions());

    act(() => {
      result.current.deployMission(mockMission, [mockAgent]);
    });

    // Complete the mission
    act(() => {
      vi.advanceTimersByTime(12000);
    });

    expect(result.current.completedMissions).toHaveLength(1);
    const completedAt = result.current.completedMissions[0].completedAt;

    // Advance past completion display time
    // Need to advance in steps to trigger currentTime updates and cleanup effect
    act(() => {
      vi.advanceTimersByTime(16000); // 15s display time + 1s buffer
    });

    // Verify the completedAt timestamp is old enough
    const timeSinceCompletion = result.current.currentTime - completedAt;
    expect(timeSinceCompletion).toBeGreaterThanOrEqual(15000);

    // Trigger one more interval to ensure cleanup runs
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.completedMissions).toHaveLength(0);
  });

  it('should make agents available again after mission completes and is removed', () => {
    const { result } = renderHook(() => useActiveMissions());

    act(() => {
      result.current.deployMission(mockMission, [mockAgent]);
    });

    expect(result.current.isAgentAvailable('agent-test')).toBe(false);

    // Complete the mission
    act(() => {
      vi.advanceTimersByTime(12000);
    });

    expect(result.current.activeMissions).toHaveLength(0);

    // Agent should be available again
    expect(result.current.isAgentAvailable('agent-test')).toBe(true);
  });

  it('should handle multiple concurrent missions', () => {
    const { result } = renderHook(() => useActiveMissions());
    const agent2: Character = { ...mockAgent, id: 'agent-2', name: 'Agent 2' };

    act(() => {
      result.current.deployMission(mockMission, [mockAgent]);
      result.current.deployMission({ ...mockMission, id: 'mission-2' }, [agent2]);
    });

    expect(result.current.activeMissions).toHaveLength(2);
    expect(result.current.isAgentAvailable('agent-test')).toBe(false);
    expect(result.current.isAgentAvailable('agent-2')).toBe(false);
  });

  it('should roll a guaranteed success when the team fully covers requirements', () => {
    const { result } = renderHook(() => useActiveMissions());

    act(() => {
      // mockAgent has 6 in every stat vs requirements of 5 — probability 1.0
      result.current.deployMission(mockMission, [mockAgent]);
    });

    expect(result.current.activeMissions[0].outcome.success).toBe(true);
    expect(result.current.activeMissions[0].outcome.probability).toBe(1.0);
  });

  it('should roll a failure when the rng lands above the success probability', () => {
    const weakAgent: Character = {
      ...mockAgent,
      stats: { Combat: 1, Vigor: 1, Mobility: 1, Charisma: 1, Intellect: 1 },
    };
    const { result } = renderHook(() => useActiveMissions({ rng: () => 0.99 }));

    act(() => {
      result.current.deployMission(mockMission, [weakAgent]);
    });

    const { outcome } = result.current.activeMissions[0];
    expect(outcome.probability).toBeLessThan(0.99);
    expect(outcome.success).toBe(false);
    expect(outcome.roll).toBe(0.99);
  });

  it('should report the outcome on the completed mission', () => {
    const onMissionComplete = vi.fn();
    const weakAgent: Character = {
      ...mockAgent,
      stats: { Combat: 1, Vigor: 1, Mobility: 1, Charisma: 1, Intellect: 1 },
    };
    const { result } = renderHook(() => useActiveMissions({ onMissionComplete, rng: () => 0.99 }));

    act(() => {
      result.current.deployMission(mockMission, [weakAgent]);
    });

    act(() => {
      vi.advanceTimersByTime(12000);
    });

    expect(onMissionComplete).toHaveBeenCalledTimes(1);
    expect(onMissionComplete.mock.calls[0][0].outcome.success).toBe(false);
    expect(result.current.completedMissions[0].outcome.success).toBe(false);
  });

  it('should apply the floor so a weak team rolls at 15%', () => {
    const weakAgent: Character = {
      ...mockAgent,
      stats: { Combat: 1, Vigor: 1, Mobility: 1, Charisma: 1, Intellect: 1 },
    };
    const { result } = renderHook(() => useActiveMissions({ rng: () => 0.1 }));

    act(() => {
      result.current.deployMission(mockMission, [weakAgent]);
    });

    const { outcome } = result.current.activeMissions[0];
    // Geometric probability (~4%) is raised to the 15% floor
    expect(outcome.probability).toBe(0.15);
    expect(outcome.success).toBe(true); // roll 0.1 < 0.15
  });

  it('should cap Hard missions at 85% and let synergy push past the cap', () => {
    const sonar: Character = { ...mockAgent, id: 'sonar', name: 'Sonar' };
    const malevola: Character = { ...mockAgent, id: 'malevola', name: 'Malevola' };
    const onDeployRolled = vi.fn();
    const { result } = renderHook(() =>
      useActiveMissions({
        rng: () => 0.5,
        // Dispatched together 3 times — synergy level 1, +5%
        getSynergyDispatchCount: (pairKey) => (pairKey === 'malevola+sonar' ? 3 : 0),
        onDeployRolled,
      })
    );

    act(() => {
      // Full coverage (base 1.0) capped to 0.85 on Hard, then +5% synergy
      result.current.deployMission({ ...mockMission, difficulty: 'Hard' }, [sonar, malevola]);
    });

    expect(result.current.activeMissions[0].outcome.probability).toBeCloseTo(0.9);
    expect(onDeployRolled).toHaveBeenCalledWith({
      synergyPairKeys: ['malevola+sonar'],
      pityUsed: false,
    });
  });

  it('should force success via pity on a would-be failure and report it', () => {
    const strongAgent: Character = {
      ...mockAgent,
      stats: { Combat: 9, Vigor: 9, Mobility: 9, Charisma: 9, Intellect: 9 },
    };
    const highBarMission: Mission = {
      ...mockMission,
      requirements: { Combat: 10, Vigor: 10, Mobility: 10, Charisma: 10, Intellect: 10 },
    };
    const onDeployRolled = vi.fn();
    const { result } = renderHook(() =>
      useActiveMissions({ rng: () => 0.99, pityRemaining: 3, onDeployRolled })
    );

    act(() => {
      result.current.deployMission(highBarMission, [strongAgent]);
    });

    const { outcome } = result.current.activeMissions[0];
    // 81% chance (> 76%) and roll 0.99 would fail, but pity guarantees success
    expect(outcome.probability).toBeCloseTo(0.81);
    expect(outcome.success).toBe(true);
    expect(outcome.pityUsed).toBe(true);
    expect(onDeployRolled).toHaveBeenCalledWith({ synergyPairKeys: [], pityUsed: true });
  });

  it('should not use pity when no charges remain', () => {
    const strongAgent: Character = {
      ...mockAgent,
      stats: { Combat: 9, Vigor: 9, Mobility: 9, Charisma: 9, Intellect: 9 },
    };
    const highBarMission: Mission = {
      ...mockMission,
      requirements: { Combat: 10, Vigor: 10, Mobility: 10, Charisma: 10, Intellect: 10 },
    };
    const { result } = renderHook(() => useActiveMissions({ rng: () => 0.99, pityRemaining: 0 }));

    act(() => {
      result.current.deployMission(highBarMission, [strongAgent]);
    });

    const { outcome } = result.current.activeMissions[0];
    expect(outcome.success).toBe(false);
    expect(outcome.pityUsed).toBe(false);
  });

  it('should calculate correct mission duration with flight speed', () => {
    const flyingAgent: Character = {
      ...mockAgent,
      canFly: true,
      isFlightLicensed: true,
    };

    const { result } = renderHook(() => useActiveMissions());

    act(() => {
      result.current.deployMission(mockMission, [flyingAgent]);
    });

    const activeMission = result.current.activeMissions[0];
    // Flying agent: 2 * 0.5 = 1s travel each way, 4s mission, 3s rest = 9s total
    expect(activeMission.totalDuration).toBe(9000); // in milliseconds
  });
});
