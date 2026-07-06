import type { Mission } from '../types/mission';
import { getDifficultyColor } from '../utils/colors';

interface MissionListProps {
  missions: Mission[];
  selectedMission: Mission | null;
  onMissionSelect: (mission: Mission) => void;
}

export function MissionList({ missions, selectedMission, onMissionSelect }: MissionListProps) {
  return (
    <div className="ar-call-list">
      {missions.map((mission) => (
        // biome-ignore lint/a11y/useSemanticElements: Card component, not a semantic button
        <div
          key={mission.id}
          className={`ar-call-card ${selectedMission?.id === mission.id ? 'selected' : ''}`}
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
          <div className="ar-call-card-header">
            <h3 className="ar-call-name">{mission.name}</h3>
            <span
              className="ar-difficulty-chip"
              style={{ backgroundColor: getDifficultyColor(mission.difficulty) }}
            >
              {mission.difficulty}
            </span>
          </div>
          {mission.location && (
            <div className="ar-call-loc sdn-readout">LOC: {mission.location.name}</div>
          )}
          <p className="ar-call-description">{mission.description}</p>
          <div className="ar-call-info">
            <span className="ar-call-agents">Max Agents: {mission.maxAgents}</span>
            {mission.rewards && <span>XP: {mission.rewards.experience}</span>}
            <span className="ar-call-time">
              Travel: {mission.travelTime} | Duration: {mission.missionDuration}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
