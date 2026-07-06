import type { Mission } from '../types/mission';
import type { UserProgress } from '../types/userProgress';

interface MissionHistorySectionProps {
  userProgress: UserProgress;
  allMissions: Mission[];
}

export function MissionHistorySection({ userProgress, allMissions }: MissionHistorySectionProps) {
  if (userProgress.missionCompletions.length === 0) {
    return (
      <div className="ar-empty-state">
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
    <div className="ar-log">
      {sortedCompletions.map((completion, index) => {
        // The mission catalog can change between plays (or entries), so a
        // completion may point at an id that no longer exists — degrade to a
        // placeholder row instead of silently dropping the history entry.
        const mission = getMissionById(completion.missionId);
        const name = mission?.name ?? 'Archived Call';
        const description = mission?.description ?? 'This call is no longer in the active catalog.';

        return (
          <div key={`${completion.missionId}-${index}`} className="ar-log-row">
            <div className="ar-log-row-header">
              <h3 className="ar-log-name">{name}</h3>
              {/* Records saved before failure existed lack the flag; treat them as successes */}
              {completion.success === false ? (
                <span className="ar-log-failed">Failed</span>
              ) : (
                <span className="ar-log-xp">+{completion.experienceGained} XP</span>
              )}
            </div>
            <p className="ar-log-description">{description}</p>
            <div className="ar-log-meta sdn-readout">
              <span>{formatDate(completion.completedAt)}</span>
              <span>{completion.agents.length} agents</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
