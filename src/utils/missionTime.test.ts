import { describe, expect, it } from 'vitest';
import type { Character } from '../types/character';
import type { Mission } from '../types/mission';
import {
  calculateAgentTravelTime,
  calculateMissionStartTime,
  calculateTotalMissionTime,
  FLIGHT_SPEED_MULTIPLIER,
  getMissionTimeBreakdown,
} from './missionTime';

// Helper function to create test agents
function createTestAgent(
  id: string,
  name: string,
  canFly: boolean,
  isFlightLicensed: boolean,
  restTime: number = 5
): Character {
  return {
    id,
    name,
    level: 1,
    stats: {
      Combat: 1,
      Vigor: 1,
      Mobility: 1,
      Charisma: 1,
      Intellect: 1,
    },
    availablePoints: 0,
    canFly,
    isFlightLicensed,
    restTime,
  };
}

// Helper function to create test mission
function createTestMission(travelTime: number, missionDuration: number): Mission {
  return {
    id: 'test-mission',
    name: 'Test Mission',
    description: 'A test mission',
    difficulty: 'Medium',
    maxAgents: 4,
    requirements: {
      Combat: 2,
      Vigor: 2,
      Mobility: 2,
      Charisma: 2,
      Intellect: 2,
    },
    travelTime,
    missionDuration,
  };
}

describe('Mission Time Calculations', () => {
  describe('calculateAgentTravelTime', () => {
    it('should return base travel time for non-flying agents', () => {
      const agent = createTestAgent('1', 'Walker', false, false);
      const travelTime = calculateAgentTravelTime(10, agent);

      expect(travelTime).toBe(10);
    });

    it('should return base travel time for unlicensed flying agents', () => {
      const agent = createTestAgent('2', 'Unlicensed Flyer', true, false);
      const travelTime = calculateAgentTravelTime(10, agent);

      expect(travelTime).toBe(10);
    });

    it('should return reduced travel time for licensed flying agents', () => {
      const agent = createTestAgent('3', 'Licensed Flyer', true, true);
      const travelTime = calculateAgentTravelTime(10, agent);

      expect(travelTime).toBe(10 * FLIGHT_SPEED_MULTIPLIER);
      expect(travelTime).toBe(5);
    });

    it('should handle zero travel time', () => {
      const agent = createTestAgent('4', 'Licensed Flyer', true, true);
      const travelTime = calculateAgentTravelTime(0, agent);

      expect(travelTime).toBe(0);
    });
  });

  describe('calculateMissionStartTime', () => {
    it('should return 0 for empty team', () => {
      const mission = createTestMission(10, 20);
      const startTime = calculateMissionStartTime(mission, []);

      expect(startTime).toBe(0);
    });

    it('should return travel time for single agent', () => {
      const mission = createTestMission(10, 20);
      const agent = createTestAgent('1', 'Solo', false, false);
      const startTime = calculateMissionStartTime(mission, [agent]);

      expect(startTime).toBe(10);
    });

    it('should return slowest travel time for mixed team', () => {
      const mission = createTestMission(10, 20);
      const slowAgent = createTestAgent('1', 'Walker', false, false);
      const fastAgent = createTestAgent('2', 'Flyer', true, true);

      const startTime = calculateMissionStartTime(mission, [slowAgent, fastAgent]);

      expect(startTime).toBe(10); // Slowest agent determines start
    });

    it('should return fast travel time when all agents are licensed flyers', () => {
      const mission = createTestMission(10, 20);
      const flyer1 = createTestAgent('1', 'Flyer 1', true, true);
      const flyer2 = createTestAgent('2', 'Flyer 2', true, true);

      const startTime = calculateMissionStartTime(mission, [flyer1, flyer2]);

      expect(startTime).toBe(5); // All fly at fast speed
    });
  });

  describe('calculateTotalMissionTime', () => {
    it('should return 0 for empty team', () => {
      const mission = createTestMission(10, 20);
      const totalTime = calculateTotalMissionTime(mission, []);

      expect(totalTime).toBe(0);
    });

    it('should calculate correct total time for single agent', () => {
      const mission = createTestMission(10, 20);
      const agent = createTestAgent('1', 'Solo', false, false);
      const totalTime = calculateTotalMissionTime(mission, [agent]);

      // 10 (outbound) + 20 (mission) + 10 (return) + 5 (rest) = 45
      expect(totalTime).toBe(45);
    });

    it('should use slowest agent time for mixed team', () => {
      const mission = createTestMission(10, 20);
      const slowAgent = createTestAgent('1', 'Walker', false, false);
      const fastAgent = createTestAgent('2', 'Flyer', true, true);

      const totalTime = calculateTotalMissionTime(mission, [slowAgent, fastAgent]);

      // 10 (slowest outbound) + 20 (mission) + 10 (slowest return) + 5 (rest) = 45
      expect(totalTime).toBe(45);
    });

    it('should calculate reduced time when all agents are licensed flyers', () => {
      const mission = createTestMission(10, 20);
      const flyer1 = createTestAgent('1', 'Flyer 1', true, true);
      const flyer2 = createTestAgent('2', 'Flyer 2', true, true);

      const totalTime = calculateTotalMissionTime(mission, [flyer1, flyer2]);

      // 5 (outbound) + 20 (mission) + 5 (return) + 5 (rest) = 35
      expect(totalTime).toBe(35);
    });

    it('should handle zero mission duration', () => {
      const mission = createTestMission(10, 0);
      const agent = createTestAgent('1', 'Agent', false, false);
      const totalTime = calculateTotalMissionTime(mission, [agent]);

      // 10 (outbound) + 0 (mission) + 10 (return) + 5 (rest) = 25
      expect(totalTime).toBe(25);
    });
  });

  describe('getMissionTimeBreakdown', () => {
    it('should return zero breakdown for empty team', () => {
      const mission = createTestMission(10, 20);
      const breakdown = getMissionTimeBreakdown(mission, []);

      expect(breakdown.travelTimeOutbound).toBe(0);
      expect(breakdown.travelTimeReturn).toBe(0);
      expect(breakdown.missionDuration).toBe(20);
      expect(breakdown.restTime).toBe(0);
      expect(breakdown.totalTime).toBe(0);
      expect(breakdown.hasFastTravelers).toBe(false);
    });

    it('should return correct breakdown for single agent', () => {
      const mission = createTestMission(10, 20);
      const agent = createTestAgent('1', 'Solo', false, false);
      const breakdown = getMissionTimeBreakdown(mission, [agent]);

      expect(breakdown.travelTimeOutbound).toBe(10);
      expect(breakdown.travelTimeReturn).toBe(10);
      expect(breakdown.missionDuration).toBe(20);
      expect(breakdown.restTime).toBe(5);
      expect(breakdown.totalTime).toBe(45);
      expect(breakdown.hasFastTravelers).toBe(false);
      expect(breakdown.slowestTravelTime).toBe(10);
      expect(breakdown.fastestTravelTime).toBe(10);
    });

    it('should detect fast travelers in mixed team', () => {
      const mission = createTestMission(10, 20);
      const slowAgent = createTestAgent('1', 'Walker', false, false);
      const fastAgent = createTestAgent('2', 'Flyer', true, true);

      const breakdown = getMissionTimeBreakdown(mission, [slowAgent, fastAgent]);

      expect(breakdown.hasFastTravelers).toBe(true);
      expect(breakdown.slowestTravelTime).toBe(10);
      expect(breakdown.fastestTravelTime).toBe(5);
      expect(breakdown.totalTime).toBe(45); // Based on slowest + rest
    });

    it('should include agent travel times in breakdown', () => {
      const mission = createTestMission(10, 20);
      const slowAgent = createTestAgent('1', 'Walker', false, false);
      const fastAgent = createTestAgent('2', 'Flyer', true, true);

      const breakdown = getMissionTimeBreakdown(mission, [slowAgent, fastAgent]);

      expect(breakdown.agentTravelTimes).toBeDefined();
      expect(breakdown.agentTravelTimes).toHaveLength(2);
      expect(breakdown.agentTravelTimes![0].agent).toBe(slowAgent);
      expect(breakdown.agentTravelTimes![0].travelTime).toBe(10);
      expect(breakdown.agentTravelTimes![1].agent).toBe(fastAgent);
      expect(breakdown.agentTravelTimes![1].travelTime).toBe(5);
    });

    it('should not detect fast travelers when all agents travel at same speed', () => {
      const mission = createTestMission(10, 20);
      const agent1 = createTestAgent('1', 'Walker 1', false, false);
      const agent2 = createTestAgent('2', 'Walker 2', false, false);

      const breakdown = getMissionTimeBreakdown(mission, [agent1, agent2]);

      expect(breakdown.hasFastTravelers).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large travel times', () => {
      const mission = createTestMission(1000, 500);
      const agent = createTestAgent('1', 'Agent', false, false);
      const totalTime = calculateTotalMissionTime(mission, [agent]);

      expect(totalTime).toBe(2505); // 1000 + 500 + 1000 + 5
    });

    it('should handle team with only unlicensed flyers', () => {
      const mission = createTestMission(10, 20);
      const flyer1 = createTestAgent('1', 'Unlicensed 1', true, false);
      const flyer2 = createTestAgent('2', 'Unlicensed 2', true, false);

      const breakdown = getMissionTimeBreakdown(mission, [flyer1, flyer2]);

      expect(breakdown.hasFastTravelers).toBe(false);
      expect(breakdown.totalTime).toBe(45); // No speed bonus, but with rest
    });

    it('should handle team with mix of licensed and unlicensed flyers', () => {
      const mission = createTestMission(10, 20);
      const licensedFlyer = createTestAgent('1', 'Licensed', true, true);
      const unlicensedFlyer = createTestAgent('2', 'Unlicensed', true, false);

      const breakdown = getMissionTimeBreakdown(mission, [licensedFlyer, unlicensedFlyer]);

      expect(breakdown.hasFastTravelers).toBe(true);
      expect(breakdown.fastestTravelTime).toBe(5);
      expect(breakdown.slowestTravelTime).toBe(10);
    });

    it('should use longest rest time when agents have different rest times', () => {
      const mission = createTestMission(10, 20);
      const fastRecovery = createTestAgent('1', 'Fast Recovery', false, false, 2); // Phenomaman-like
      const normalRecovery = createTestAgent('2', 'Normal Recovery', false, false, 5);
      const slowRecovery = createTestAgent('3', 'Slow Recovery', false, false, 6);

      const breakdown = getMissionTimeBreakdown(mission, [
        fastRecovery,
        normalRecovery,
        slowRecovery,
      ]);

      expect(breakdown.restTime).toBe(6); // Longest rest time
      expect(breakdown.hasQuickRecovery).toBe(true);
      expect(breakdown.shortestRestTime).toBe(2);
      expect(breakdown.longestRestTime).toBe(6);
      expect(breakdown.totalTime).toBe(46); // 10 + 20 + 10 + 6
    });

    it('should not flag quick recovery when all agents have same rest time', () => {
      const mission = createTestMission(10, 20);
      const agent1 = createTestAgent('1', 'Agent 1', false, false, 5);
      const agent2 = createTestAgent('2', 'Agent 2', false, false, 5);

      const breakdown = getMissionTimeBreakdown(mission, [agent1, agent2]);

      expect(breakdown.hasQuickRecovery).toBe(false);
      expect(breakdown.restTime).toBe(5);
    });
  });
});
