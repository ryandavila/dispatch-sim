import type { CompletedMission } from '../hooks/useActiveMissions';

interface CompletedMissionsSectionProps {
  completedMissions: CompletedMission[];
}

export function CompletedMissionsSection({ completedMissions }: CompletedMissionsSectionProps) {
  if (completedMissions.length === 0) {
    return null;
  }

  return (
    <div className="completed-missions-section">
      <h3>Mission Complete!</h3>
      <div className="completed-missions-list">
        {completedMissions.map((mission) => (
          <div key={mission.id} className="completed-mission-card">
            <div className="completed-mission-header">
              <h4>{mission.mission.name}</h4>
              <span className="completion-badge">Success</span>
            </div>
            <div className="completed-mission-agents">
              Team: {mission.agents.map((agent) => agent.name).join(', ')}
            </div>
            {mission.mission.rewards && (
              <div className="mission-rewards">
                <span className="reward-label">Rewards:</span>
                <span className="reward-xp">+{mission.mission.rewards.experience} XP</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
