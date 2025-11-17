import type { Character } from '../types/character';
import type { Mission } from '../types/mission';
import { combineStats } from '../utils/geometry';
import type { getMissionTimeBreakdown } from '../utils/missionTime';
import { AgentSelectCard } from './AgentSelectCard';
import { MissionTimeline } from './MissionTimeline';
import { OverlayRadarChart } from './OverlayRadarChart';

interface MissionDetailsSectionProps {
  mission: Mission;
  selectedAgents: Character[];
  allAgents: Character[];
  successProbability: number;
  missionTimeBreakdown: ReturnType<typeof getMissionTimeBreakdown> | null;
  isAgentAvailable: (agentId: string) => boolean;
  onToggleAgent: (agent: Character) => void;
  onDeployMission: () => void;
  getSuccessColor: (probability: number) => string;
}

export function MissionDetailsSection({
  mission,
  selectedAgents,
  allAgents,
  successProbability,
  missionTimeBreakdown,
  isAgentAvailable,
  onToggleAgent,
  onDeployMission,
  getSuccessColor,
}: MissionDetailsSectionProps) {
  return (
    <div className="mission-details">
      <h3>Mission Requirements</h3>
      <div className="mission-chart">
        {selectedAgents.length > 0 ? (
          <OverlayRadarChart
            layers={[
              {
                stats: mission.requirements,
                color: 'rgba(217, 119, 6, 0.3)',
                label: 'Required',
                fillOpacity: 0.2,
              },
              {
                stats: combineStats(...selectedAgents.map((a) => a.stats)),
                color: 'rgba(20, 184, 166, 0.5)',
                label: 'Team',
                fillOpacity: 0.3,
              },
            ]}
            maxValue={10}
            size={300}
          />
        ) : (
          <OverlayRadarChart
            layers={[
              {
                stats: mission.requirements,
                color: 'rgba(217, 119, 6, 0.3)',
                label: 'Required',
                fillOpacity: 0.3,
              },
            ]}
            maxValue={10}
            size={300}
          />
        )}
      </div>

      {selectedAgents.length > 0 && (
        <>
          <div
            className="success-probability"
            style={{ color: getSuccessColor(successProbability) }}
          >
            Success Probability: {(successProbability * 100).toFixed(0)}%
          </div>

          {missionTimeBreakdown && missionTimeBreakdown.totalTime > 0 && (
            <>
              <MissionTimeline
                travelOutbound={missionTimeBreakdown.travelTimeOutbound}
                missionDuration={missionTimeBreakdown.missionDuration}
                travelReturn={missionTimeBreakdown.travelTimeReturn}
                restTime={missionTimeBreakdown.restTime}
                totalTime={missionTimeBreakdown.totalTime}
              />
              {(missionTimeBreakdown.hasFastTravelers || missionTimeBreakdown.hasQuickRecovery) && (
                <div className="mission-time-notes">
                  {missionTimeBreakdown.hasFastTravelers && (
                    <div className="time-note">
                      Some agents can travel faster due to flight license
                    </div>
                  )}
                  {missionTimeBreakdown.hasQuickRecovery && (
                    <div className="time-note">Some agents recover faster than others</div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      <div className="team-header">
        <h3>Select Team</h3>
        <span className="team-count">
          {selectedAgents.length}/{mission.maxAgents}
        </span>
      </div>
      {selectedAgents.length > 0 && (
        <button type="button" className="deploy-button" onClick={onDeployMission}>
          Deploy Mission
        </button>
      )}
      <div className="agent-selection">
        {allAgents.map((agent) => {
          const isSelected = selectedAgents.some((a) => a.id === agent.id);
          const isExcluded = mission.excludedAgents?.includes(agent.id) ?? false;
          const isAtLimit = selectedAgents.length >= mission.maxAgents;
          const isOnMission = !isAgentAvailable(agent.id);
          const isDisabled =
            isExcluded || (!isSelected && isAtLimit) || (isOnMission && !isSelected);
          return (
            <AgentSelectCard
              key={agent.id}
              agent={agent}
              isSelected={isSelected}
              isExcluded={isExcluded || isOnMission}
              isDisabled={isDisabled}
              onToggle={onToggleAgent}
            />
          );
        })}
      </div>
    </div>
  );
}
