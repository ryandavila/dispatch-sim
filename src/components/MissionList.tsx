import type { Mission } from '../types/mission';

interface MissionListProps {
  missions: Mission[];
  selectedMission: Mission | null;
  onMissionSelect: (mission: Mission) => void;
  getDifficultyColor: (difficulty: Mission['difficulty']) => string;
}

export function MissionList({
  missions,
  selectedMission,
  onMissionSelect,
  getDifficultyColor,
}: MissionListProps) {
  return (
    <div className="missions-list">
      {missions.map((mission) => (
        // biome-ignore lint/a11y/useSemanticElements: Card component, not a semantic button
        <div
          key={mission.id}
          className={`mission-card ${selectedMission?.id === mission.id ? 'selected' : ''}`}
          onClick={() => onMissionSelect(mission)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onMissionSelect(mission);
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div className="mission-card-header">
            <h3>{mission.name}</h3>
            <span
              className="mission-difficulty"
              style={{ color: getDifficultyColor(mission.difficulty) }}
            >
              {mission.difficulty}
            </span>
          </div>
          <p className="mission-description">{mission.description}</p>
          <div className="mission-info">
            <span className="mission-agents">Max Agents: {mission.maxAgents}</span>
            {mission.rewards && <span>XP: {mission.rewards.experience}</span>}
            <span className="mission-time">
              Travel: {mission.travelTime} | Duration: {mission.missionDuration}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
