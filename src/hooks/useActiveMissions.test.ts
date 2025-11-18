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
