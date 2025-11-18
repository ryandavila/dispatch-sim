import { describe, expect, it } from 'vitest';
import { calculateMissionProgress, createActiveMission } from './activeMission';
import type { Character } from './character';
import type { Mission } from './mission';

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

describe('createActiveMission', () => {
  it('should create an active mission with correct structure', () => {
    const activeMission = createActiveMission(
      mockMission,
      [mockAgent],
      2000, // 2s travel outbound
      4000, // 4s mission
      2000, // 2s travel return
      3000 // 3s rest
    );

    expect(activeMission.mission).toBe(mockMission);
    expect(activeMission.agents).toEqual([mockAgent]);
    expect(activeMission.travelOutboundDuration).toBe(2000);
    expect(activeMission.missionDuration).toBe(4000);
    expect(activeMission.travelReturnDuration).toBe(2000);
    expect(activeMission.restDuration).toBe(3000);
    expect(activeMission.totalDuration).toBe(11000);
    expect(activeMission.currentPhase).toBe('travel-outbound');
    expect(activeMission.id).toBeTruthy();
  });
});

describe('calculateMissionProgress', () => {
  const startTime = 1000000;
  const activeMission = createActiveMission(
    mockMission,
    [mockAgent],
    2000, // 2s travel outbound
    4000, // 4s mission
    2000, // 2s travel return
    3000 // 3s rest
  );
  activeMission.startTime = startTime;

  it('should be in travel-outbound phase at start', () => {
    const progress = calculateMissionProgress(activeMission, startTime);

    expect(progress.phase).toBe('travel-outbound');
    expect(progress.phaseProgress).toBe(0);
    expect(progress.totalProgress).toBe(0);
  });

  it('should progress through travel-outbound phase', () => {
    const currentTime = startTime + 1000; // 1 second into mission
    const progress = calculateMissionProgress(activeMission, currentTime);

    expect(progress.phase).toBe('travel-outbound');
    expect(progress.phaseProgress).toBeCloseTo(0.5); // 50% through 2s travel
    expect(progress.totalProgress).toBeCloseTo(1 / 11); // 1s out of 11s total
  });

  it('should transition to active phase after travel', () => {
    const currentTime = startTime + 2000; // After 2s travel
    const progress = calculateMissionProgress(activeMission, currentTime);

    expect(progress.phase).toBe('active');
    expect(progress.phaseProgress).toBeCloseTo(0);
  });

  it('should progress through active phase', () => {
    const currentTime = startTime + 4000; // 2s travel + 2s into mission
    const progress = calculateMissionProgress(activeMission, currentTime);

    expect(progress.phase).toBe('active');
    expect(progress.phaseProgress).toBeCloseTo(0.5); // 50% through 4s mission
  });

  it('should transition to travel-return phase after mission', () => {
    const currentTime = startTime + 6000; // 2s travel + 4s mission
    const progress = calculateMissionProgress(activeMission, currentTime);

    expect(progress.phase).toBe('travel-return');
    expect(progress.phaseProgress).toBeCloseTo(0);
  });

  it('should progress through travel-return phase', () => {
    const currentTime = startTime + 7000; // 2s + 4s + 1s into return
    const progress = calculateMissionProgress(activeMission, currentTime);

    expect(progress.phase).toBe('travel-return');
    expect(progress.phaseProgress).toBeCloseTo(0.5); // 50% through 2s return
  });

  it('should transition to resting phase after return', () => {
    const currentTime = startTime + 8000; // 2s + 4s + 2s
    const progress = calculateMissionProgress(activeMission, currentTime);

    expect(progress.phase).toBe('resting');
    expect(progress.phaseProgress).toBeCloseTo(0);
  });

  it('should progress through resting phase', () => {
    const currentTime = startTime + 9500; // Into rest phase
    const progress = calculateMissionProgress(activeMission, currentTime);

    expect(progress.phase).toBe('resting');
    expect(progress.phaseProgress).toBeCloseTo(0.5); // 50% through 3s rest
  });

  it('should transition to completed phase after rest', () => {
    const currentTime = startTime + 11000; // Full 11s
    const progress = calculateMissionProgress(activeMission, currentTime);

    expect(progress.phase).toBe('completed');
    expect(progress.phaseProgress).toBe(1);
    expect(progress.totalProgress).toBe(1);
  });

  it('should stay in completed phase after mission ends', () => {
    const currentTime = startTime + 15000; // Well past completion
    const progress = calculateMissionProgress(activeMission, currentTime);

    expect(progress.phase).toBe('completed');
    expect(progress.phaseProgress).toBe(1);
    expect(progress.totalProgress).toBe(1);
  });

  it('should calculate correct totalProgress at each phase', () => {
    // 25% through mission (2.75s)
    let progress = calculateMissionProgress(activeMission, startTime + 2750);
    expect(progress.totalProgress).toBeCloseTo(0.25);

    // 50% through mission (5.5s)
    progress = calculateMissionProgress(activeMission, startTime + 5500);
    expect(progress.totalProgress).toBeCloseTo(0.5);

    // 75% through mission (8.25s)
    progress = calculateMissionProgress(activeMission, startTime + 8250);
    expect(progress.totalProgress).toBeCloseTo(0.75);
  });

  it('should return correct elapsedSeconds', () => {
    const currentTime = startTime + 5000;
    const progress = calculateMissionProgress(activeMission, currentTime);

    expect(progress.elapsedSeconds).toBe(5);
  });
});
