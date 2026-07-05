/**
 * @vitest-environment jsdom
 */

import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActiveMission } from '../types/activeMission';
import type { Character } from '../types/character';
import type { Mission } from '../types/mission';
import { Missions } from './Missions';

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

vi.mock('../utils/dataLoader', () => ({
  loadAgents: vi.fn(() => mockAgents),
  loadMissions: vi.fn(() => [mockMission]),
}));

// Capture the completion callback that Missions wires into useActiveMissions
let capturedOnMissionComplete: ((mission: ActiveMission) => void) | undefined;

vi.mock('../hooks/useActiveMissions', () => ({
  useActiveMissions: (options: { onMissionComplete?: (mission: ActiveMission) => void } = {}) => {
    capturedOnMissionComplete = options.onMissionComplete;
    return {
      activeMissions: [],
      completedMissions: [],
      currentTime: Date.now(),
      deployMission: vi.fn(),
      isAgentAvailable: () => true,
      removeMission: vi.fn(),
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

describe('Missions - injury wiring on completion', () => {
  beforeEach(() => {
    localStorage.clear();
    capturedOnMissionComplete = undefined;
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('injures every team member when a mission fails', () => {
    render(<Missions />);

    act(() => {
      capturedOnMissionComplete?.(makeCompletedMission(false));
    });

    const progress = readAgentProgress();
    expect(progress['agent-1'].injuryCount).toBe(1);
    expect(progress['agent-2'].injuryCount).toBe(1);
  });

  it('downs agents on a second failure', () => {
    render(<Missions />);

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

  it('does not injure agents and awards XP when a mission succeeds', () => {
    render(<Missions />);

    act(() => {
      capturedOnMissionComplete?.(makeCompletedMission(true));
    });

    const progress = readAgentProgress();
    expect(progress['agent-1'].injuryCount).toBe(0);
    expect(progress['agent-1'].experience).toBe(150); // 50 base + 100 reward
  });
});
