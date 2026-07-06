/**
 * @vitest-environment jsdom
 */

import { act, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActiveMission } from '../types/activeMission';
import type { Character } from '../types/character';
import type { Mission } from '../types/mission';
import { Shift } from './Shift';

const mockMission: Mission = {
  id: 'mission-1',
  name: 'Test Mission',
  description: 'A test mission',
  difficulty: 'Easy',
  maxAgents: 2,
  requirements: { Combat: 3, Vigor: 3, Mobility: 3, Charisma: 3, Intellect: 3 },
  travelTime: 2,
  missionDuration: 4,
  rewards: { experience: 100 },
};

const mockAgents: Character[] = [
  {
    id: 'agent-1',
    name: 'Test Agent 1',
    level: 1,
    experience: 50,
    stats: { Combat: 2, Vigor: 2, Mobility: 2, Charisma: 2, Intellect: 2 },
    availablePoints: 0,
    canFly: false,
    isFlightLicensed: false,
    restTime: 5,
  },
  {
    id: 'agent-2',
    name: 'Test Agent 2',
    level: 1,
    experience: 50,
    stats: { Combat: 3, Vigor: 2, Mobility: 2, Charisma: 2, Intellect: 2 },
    availablePoints: 0,
    canFly: false,
    isFlightLicensed: false,
    restTime: 5,
  },
];

const agent3: Character = {
  id: 'agent-3',
  name: 'Test Agent 3',
  level: 1,
  experience: 50,
  stats: { Combat: 2, Vigor: 3, Mobility: 2, Charisma: 2, Intellect: 2 },
  availablePoints: 0,
  canFly: false,
  isFlightLicensed: false,
  restTime: 5,
};

vi.mock('../utils/dataLoader', () => ({
  loadAgents: vi.fn(() => [...mockAgents, agent3]),
  loadMissions: vi.fn(() => [mockMission]),
  loadSynergies: vi.fn(() => []),
}));

// Capture the completion callback Shift wires into useShift, so we can drive it
// directly without simulating a full real-time shift.
let capturedOnMissionComplete: ((mission: ActiveMission) => void) | undefined;

vi.mock('../hooks/useShift', () => ({
  useShift: (options: { onMissionComplete?: (mission: ActiveMission) => void } = {}) => {
    capturedOnMissionComplete = options.onMissionComplete;
    return {
      shift: {
        phase: 'idle',
        config: { seed: 1, shiftDurationMs: 1, maxOpenCalls: 1, callTimerMs: 1, spawnEveryMs: 1 },
        shiftStartMs: 0,
        calls: [],
        activeMissions: [],
        tally: { succeeded: 0, failed: 0, missed: 0 },
        lastTickMs: 0,
      },
      now: 0,
      start: vi.fn(),
      deploy: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
    };
  },
}));

function makeCompletedMission(success: boolean): ActiveMission {
  return {
    id: `run-${Math.random()}`,
    mission: mockMission,
    agents: mockAgents,
    startTime: Date.now(),
    currentPhase: 'completed',
    phaseStartTime: Date.now(),
    travelOutboundDuration: 0,
    missionDuration: 0,
    travelReturnDuration: 0,
    restDuration: 0,
    totalDuration: 0,
    outcome: { success, probability: 0.5, roll: success ? 0.1 : 0.9 },
  };
}

function readAgentProgress() {
  return JSON.parse(localStorage.getItem('dispatch-sim-agent-progress-v2') ?? '{}');
}

function renderShift() {
  render(
    <MemoryRouter>
      <Shift />
    </MemoryRouter>
  );
}

describe('Shift - injury/XP wiring on completion', () => {
  beforeEach(() => {
    localStorage.clear();
    capturedOnMissionComplete = undefined;
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('injures every team member when a mission fails', () => {
    renderShift();

    act(() => {
      capturedOnMissionComplete?.(makeCompletedMission(false));
    });

    const progress = readAgentProgress();
    expect(progress['agent-1'].injuryCount).toBe(1);
    expect(progress['agent-2'].injuryCount).toBe(1);
  });

  it('downs agents on a second failure', () => {
    renderShift();

    act(() => {
      capturedOnMissionComplete?.(makeCompletedMission(false));
    });
    act(() => {
      capturedOnMissionComplete?.(makeCompletedMission(false));
    });

    const progress = readAgentProgress();
    expect(progress['agent-1'].injuryCount).toBe(2);
    expect(progress['agent-2'].injuryCount).toBe(2);
  });

  it('does not injure agents and splits the pooled XP reward evenly on success', () => {
    renderShift();

    act(() => {
      capturedOnMissionComplete?.(makeCompletedMission(true));
    });

    // Mission rewards 100 XP total, pooled and split across the 2 deployed
    // agents (splitXpPool(100, 2) = [50, 50]) — not credited in full to each.
    const progress = readAgentProgress();
    expect(progress['agent-1'].injuryCount).toBe(0);
    expect(progress['agent-1'].experience).toBe(100); // 50 base + 50 share
    expect(progress['agent-2'].experience).toBe(100); // 50 base + 50 share
  });

  it('splits an uneven XP pool with the remainder going to earlier agents', () => {
    renderShift();

    const threeAgentMission: ActiveMission = {
      ...makeCompletedMission(true),
      mission: { ...mockMission, rewards: { experience: 100 } },
      agents: [...mockAgents, agent3],
    };

    act(() => {
      capturedOnMissionComplete?.(threeAgentMission);
    });

    // splitXpPool(100, 3) = [34, 33, 33]
    const progress = readAgentProgress();
    expect(progress['agent-1'].experience).toBe(84); // 50 base + 34 share
    expect(progress['agent-2'].experience).toBe(83); // 50 base + 33 share
    expect(progress['agent-3'].experience).toBe(83); // 50 base + 33 share
  });
});
