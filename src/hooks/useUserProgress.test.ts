/**
 * @vitest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

    expect(result.current.userProgress).toMatchObject(savedProgress);
  });

  it('should fill in defaults for fields missing from older saves', () => {
    // Save from before med kits/synergy/pity existed
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        completedMissionIds: [],
        missionCompletions: [],
        totalExperience: 50,
      })
    );

    const { result } = renderHook(() => useUserProgress());

    expect(result.current.userProgress.totalExperience).toBe(50);
    expect(result.current.userProgress.medKits).toBe(3);
    expect(result.current.userProgress.synergyDispatchCounts).toEqual({});
    expect(result.current.userProgress.pityRemaining).toBe(3);
    expect(result.current.userProgress.shiftSummaries).toEqual([]);
  });

  it('records shift summaries in order (source of truth for shift number)', () => {
    const { result } = renderHook(() => useUserProgress());

    act(() => {
      result.current.recordShiftSummary({
        shiftNumber: 1,
        completedAt: 1000,
        tally: { succeeded: 9, failed: 2, missed: 1 },
        seed: 1,
        rewards: { medKits: 1, pityCharges: 0, statPoints: 2 },
      });
    });
    act(() => {
      result.current.recordShiftSummary({
        shiftNumber: 2,
        completedAt: 2000,
        tally: { succeeded: 12, failed: 0, missed: 0 },
        seed: 2,
        rewards: { medKits: 3, pityCharges: 2, statPoints: 4 },
        statPointAgentId: 'hero-1',
      });
    });

    const { shiftSummaries } = result.current.userProgress;
    expect(shiftSummaries).toHaveLength(2);
    expect(shiftSummaries.map((s) => s.shiftNumber)).toEqual([1, 2]);
    expect(shiftSummaries[1].statPointAgentId).toBe('hero-1');
    // Length + 1 is the next shift number.
    expect(shiftSummaries.length + 1).toBe(3);
  });

  it('credits med kits and pity charges from shift rewards', () => {
    const { result } = renderHook(() => useUserProgress());
    const startMedKits = result.current.userProgress.medKits; // 3
    const startPity = result.current.userProgress.pityRemaining; // 3

    act(() => {
      result.current.applyShiftRewards({ medKits: 2, pityCharges: 1, statPoints: 4 });
    });

    expect(result.current.userProgress.medKits).toBe(startMedKits + 2);
    expect(result.current.userProgress.pityRemaining).toBe(startPity + 1);
  });

  it('applyShiftRewards is a no-op when no med kits or pity are earned', () => {
    const { result } = renderHook(() => useUserProgress());
    const before = result.current.userProgress;

    act(() => {
      result.current.applyShiftRewards({ medKits: 0, pityCharges: 0, statPoints: 3 });
    });

    // Stat-point-only rewards don't touch account resources.
    expect(result.current.userProgress.medKits).toBe(before.medKits);
    expect(result.current.userProgress.pityRemaining).toBe(before.pityRemaining);
  });

  it('should add mission completion and update total XP', () => {
    const { result } = renderHook(() => useUserProgress());

    act(() => {
      result.current.addMissionCompletion({
        missionId: 'mission-1',
        completedAt: Date.now(),
        agents: ['agent-1', 'agent-2'],
        experienceGained: 100,
        success: true,
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
        success: true,
      });
    });

    act(() => {
      result.current.addMissionCompletion({
        missionId: 'mission-2',
        completedAt: Date.now(),
        agents: ['agent-2'],
        experienceGained: 250,
        success: true,
      });
    });

    expect(result.current.userProgress.totalExperience).toBe(350);
    expect(result.current.userProgress.completedMissionIds).toEqual(['mission-1', 'mission-2']);
  });

  it('should record failed attempts without marking the mission completed', () => {
    const { result } = renderHook(() => useUserProgress());

    act(() => {
      result.current.addMissionCompletion({
        missionId: 'mission-1',
        completedAt: Date.now(),
        agents: ['agent-1'],
        experienceGained: 0,
        success: false,
      });
    });

    // Failed missions stay available for another attempt
    expect(result.current.userProgress.completedMissionIds).toEqual([]);
    expect(result.current.isMissionCompleted('mission-1')).toBe(false);
    // But the attempt is still recorded in history
    expect(result.current.userProgress.missionCompletions).toHaveLength(1);
    expect(result.current.userProgress.missionCompletions[0].success).toBe(false);
    expect(result.current.userProgress.totalExperience).toBe(0);
  });

  it('should correctly identify completed missions', () => {
    const { result } = renderHook(() => useUserProgress());

    act(() => {
      result.current.addMissionCompletion({
        missionId: 'mission-1',
        completedAt: Date.now(),
        agents: ['agent-1'],
        experienceGained: 100,
        success: true,
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
        success: true,
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
        success: true,
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

  it('should start with 3 med kits', () => {
    const { result } = renderHook(() => useUserProgress());

    expect(result.current.userProgress.medKits).toBe(3);
  });

  it('should consume med kits one at a time', () => {
    const { result } = renderHook(() => useUserProgress());

    let consumed = false;
    act(() => {
      consumed = result.current.consumeMedKit();
    });

    expect(consumed).toBe(true);
    expect(result.current.userProgress.medKits).toBe(2);
  });

  it('should refuse to consume a med kit when out of stock', () => {
    const { result } = renderHook(() => useUserProgress());

    act(() => {
      result.current.consumeMedKit();
      result.current.consumeMedKit();
      result.current.consumeMedKit();
    });
    expect(result.current.userProgress.medKits).toBe(0);

    let consumed = true;
    act(() => {
      consumed = result.current.consumeMedKit();
    });

    expect(consumed).toBe(false);
    expect(result.current.userProgress.medKits).toBe(0);
  });

  it('should preserve med kits when recording mission completions', () => {
    const { result } = renderHook(() => useUserProgress());

    act(() => {
      result.current.consumeMedKit();
    });
    act(() => {
      result.current.addMissionCompletion({
        missionId: 'mission-1',
        completedAt: Date.now(),
        agents: ['agent-1'],
        experienceGained: 100,
        success: true,
      });
    });

    expect(result.current.userProgress.medKits).toBe(2);
  });

  it('should track synergy dispatch counts per pair', () => {
    const { result } = renderHook(() => useUserProgress());

    act(() => {
      result.current.recordSynergyDispatch(['malevola+sonar']);
    });
    act(() => {
      result.current.recordSynergyDispatch(['malevola+sonar', 'coupe+punch-up']);
    });

    expect(result.current.userProgress.synergyDispatchCounts).toEqual({
      'malevola+sonar': 2,
      'coupe+punch-up': 1,
    });
  });

  it('should not update state when no synergy pairs deployed', () => {
    const { result } = renderHook(() => useUserProgress());

    act(() => {
      result.current.recordSynergyDispatch([]);
    });

    expect(result.current.userProgress.synergyDispatchCounts).toEqual({});
  });

  it('should start with 3 pity charges and decrement without going negative', () => {
    const { result } = renderHook(() => useUserProgress());

    expect(result.current.userProgress.pityRemaining).toBe(3);

    for (let i = 0; i < 5; i++) {
      act(() => {
        result.current.consumePity();
      });
    }

    expect(result.current.userProgress.pityRemaining).toBe(0);
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
