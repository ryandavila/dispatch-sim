/**
 * @vitest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useUserProgress } from './useUserProgress';

describe('useUserProgress', () => {
  const STORAGE_KEY = 'dispatch-sim-user-progress';

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should initialize with empty progress', () => {
    const { result } = renderHook(() => useUserProgress());

    expect(result.current.userProgress.completedMissionIds).toEqual([]);
    expect(result.current.userProgress.missionCompletions).toEqual([]);
    expect(result.current.userProgress.totalExperience).toBe(0);
  });

  it('should load progress from localStorage on initialization', () => {
    const savedProgress = {
      completedMissionIds: ['mission-1'],
      missionCompletions: [
        {
          missionId: 'mission-1',
          completedAt: Date.now(),
          agents: ['agent-1'],
          experienceGained: 100,
        },
      ],
      totalExperience: 100,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedProgress));

    const { result } = renderHook(() => useUserProgress());

    expect(result.current.userProgress).toEqual(savedProgress);
  });

  it('should add mission completion and update total XP', () => {
    const { result } = renderHook(() => useUserProgress());

    act(() => {
      result.current.addMissionCompletion({
        missionId: 'mission-1',
        completedAt: Date.now(),
        agents: ['agent-1', 'agent-2'],
        experienceGained: 100,
      });
    });

    expect(result.current.userProgress.completedMissionIds).toEqual(['mission-1']);
    expect(result.current.userProgress.missionCompletions).toHaveLength(1);
    expect(result.current.userProgress.totalExperience).toBe(100);
  });

  it('should accumulate XP from multiple completions', () => {
    const { result } = renderHook(() => useUserProgress());

    act(() => {
      result.current.addMissionCompletion({
        missionId: 'mission-1',
        completedAt: Date.now(),
        agents: ['agent-1'],
        experienceGained: 100,
      });
    });

    act(() => {
      result.current.addMissionCompletion({
        missionId: 'mission-2',
        completedAt: Date.now(),
        agents: ['agent-2'],
        experienceGained: 250,
      });
    });

    expect(result.current.userProgress.totalExperience).toBe(350);
    expect(result.current.userProgress.completedMissionIds).toEqual(['mission-1', 'mission-2']);
  });

  it('should correctly identify completed missions', () => {
    const { result } = renderHook(() => useUserProgress());

    act(() => {
      result.current.addMissionCompletion({
        missionId: 'mission-1',
        completedAt: Date.now(),
        agents: ['agent-1'],
        experienceGained: 100,
      });
    });

    expect(result.current.isMissionCompleted('mission-1')).toBe(true);
    expect(result.current.isMissionCompleted('mission-2')).toBe(false);
  });

  it('should persist progress to localStorage', () => {
    const { result } = renderHook(() => useUserProgress());

    act(() => {
      result.current.addMissionCompletion({
        missionId: 'mission-1',
        completedAt: Date.now(),
        agents: ['agent-1'],
        experienceGained: 100,
      });
    });

    const stored = localStorage.getItem(STORAGE_KEY);
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.totalExperience).toBe(100);
    expect(parsed.completedMissionIds).toEqual(['mission-1']);
  });

  it('should reset progress', () => {
    const { result } = renderHook(() => useUserProgress());

    act(() => {
      result.current.addMissionCompletion({
        missionId: 'mission-1',
        completedAt: Date.now(),
        agents: ['agent-1'],
        experienceGained: 100,
      });
    });

    expect(result.current.userProgress.totalExperience).toBe(100);

    act(() => {
      result.current.resetProgress();
    });

    expect(result.current.userProgress.totalExperience).toBe(0);
    expect(result.current.userProgress.completedMissionIds).toEqual([]);
    expect(result.current.userProgress.missionCompletions).toEqual([]);
  });

  it('should handle corrupted localStorage data gracefully', () => {
    // Suppress console.error for this test since we're intentionally triggering an error
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    localStorage.setItem(STORAGE_KEY, 'invalid json');

    const { result } = renderHook(() => useUserProgress());

    // Should fall back to initial state
    expect(result.current.userProgress.totalExperience).toBe(0);
    expect(result.current.userProgress.completedMissionIds).toEqual([]);

    // Verify error was logged
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
