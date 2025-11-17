import type { ActiveMission } from '../types/activeMission';
import { calculateMissionProgress } from '../types/activeMission';
import { ActiveMissionTimeline } from './ActiveMissionTimeline';

interface ActiveMissionsSectionProps {
  activeMissions: ActiveMission[];
  currentTime: number;
}

export function ActiveMissionsSection({ activeMissions, currentTime }: ActiveMissionsSectionProps) {
  if (activeMissions.length === 0) {
    return null;
  }

  return (
    <div className="active-missions-section">
      <h3>Active Missions</h3>
      <div className="active-missions-list">
        {activeMissions.map((activeMission) => {
          const progress = calculateMissionProgress(activeMission, currentTime);
          const isCompleted = progress.phase === 'completed';

          return (
            <div
              key={activeMission.id}
              className={`active-mission-card ${isCompleted ? 'completed' : ''}`}
            >
              <div className="active-mission-header">
                <h4>{activeMission.mission.name}</h4>
                <span className={`active-mission-phase phase-${progress.phase}`}>
                  {progress.phase}
                </span>
              </div>
              <div className="active-mission-agents">
                {activeMission.agents.map((agent) => agent.name).join(', ')}
              </div>
              <ActiveMissionTimeline activeMission={activeMission} currentTime={currentTime} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
