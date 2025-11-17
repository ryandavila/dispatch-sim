import type { Mission } from '../types/mission';
import type { UserProgress } from '../types/userProgress';

interface MissionHistorySectionProps {
  userProgress: UserProgress;
  allMissions: Mission[];
}

export function MissionHistorySection({ userProgress, allMissions }: MissionHistorySectionProps) {
  if (userProgress.missionCompletions.length === 0) {
    return (
      <div className="empty-state">
        <p>No missions completed yet. Deploy agents on missions to build your history!</p>
      </div>
    );
  }

  // Sort completions by most recent first
  const sortedCompletions = [...userProgress.missionCompletions].sort(
    (a, b) => b.completedAt - a.completedAt
  );

  const getMissionById = (missionId: string): Mission | undefined => {
    return allMissions.find((m) => m.id === missionId);
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="missions-list">
      {sortedCompletions.map((completion, index) => {
        const mission = getMissionById(completion.missionId);
        if (!mission) return null;

        return (
          <div key={`${completion.missionId}-${index}`} className="mission-card completed">
            <div className="mission-card-header">
              <h3>{mission.name}</h3>
              <span className="history-xp">+{completion.experienceGained} XP</span>
            </div>
            <p className="mission-description">{mission.description}</p>
            <div className="mission-info">
              <span className="history-date">{formatDate(completion.completedAt)}</span>
              <span className="history-agents">{completion.agents.length} agents</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
