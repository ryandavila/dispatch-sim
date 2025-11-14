import { describe, expect, it } from 'vitest';
import { createMission } from './mission';

describe('Mission System', () => {
  describe('createMission', () => {
    it('should create a mission with all required fields', () => {
      const requirements = {
        Combat: 5,
        Vigor: 3,
        Mobility: 4,
        Charisma: 2,
        Intellect: 6,
      };

      const mission = createMission(
        'Rescue Operation',
        'Rescue hostages from enemy compound',
        requirements,
        'Hard'
      );

      expect(mission.name).toBe('Rescue Operation');
      expect(mission.description).toBe('Rescue hostages from enemy compound');
      expect(mission.requirements).toEqual(requirements);
      expect(mission.difficulty).toBe('Hard');
      expect(mission.id).toBeDefined();
    });

    it('should default to Medium difficulty if not specified', () => {
      const requirements = {
        Combat: 3,
        Vigor: 3,
        Mobility: 3,
        Charisma: 3,
        Intellect: 3,
      };

      const mission = createMission('Standard Mission', 'A typical assignment', requirements);

      expect(mission.difficulty).toBe('Medium');
    });

    it('should generate unique IDs for different missions', () => {
      const requirements = {
        Combat: 1,
        Vigor: 1,
        Mobility: 1,
        Charisma: 1,
        Intellect: 1,
      };

      const mission1 = createMission('Mission 1', 'Description 1', requirements);
      const mission2 = createMission('Mission 2', 'Description 2', requirements);

      expect(mission1.id).not.toBe(mission2.id);
    });

    it('should handle all difficulty levels', () => {
      const requirements = {
        Combat: 1,
        Vigor: 1,
        Mobility: 1,
        Charisma: 1,
        Intellect: 1,
      };

      const easy = createMission('Easy', 'Desc', requirements, 'Easy');
      const medium = createMission('Medium', 'Desc', requirements, 'Medium');
      const hard = createMission('Hard', 'Desc', requirements, 'Hard');
      const extreme = createMission('Extreme', 'Desc', requirements, 'Extreme');

      expect(easy.difficulty).toBe('Easy');
      expect(medium.difficulty).toBe('Medium');
      expect(hard.difficulty).toBe('Hard');
      expect(extreme.difficulty).toBe('Extreme');
    });
  });
});
