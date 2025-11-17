import { useMemo, useState } from 'react';
import { AgentSelectCard } from '../components/AgentSelectCard';
import { OverlayRadarChart } from '../components/OverlayRadarChart';
import type { Character } from '../types/character';
import type { Mission } from '../types/mission';
import { loadAgents, loadMissions } from '../utils/dataLoader';
import { calculateTeamSuccessProbability, combineStats } from '../utils/geometry';
import { getMissionTimeBreakdown } from '../utils/missionTime';

type DifficultyFilter = Mission['difficulty'] | 'All';

export function Missions() {
  const missions = loadMissions();
  const agents = loadAgents();
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [selectedAgents, setSelectedAgents] = useState<Character[]>([]);
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('All');

  const handleMissionSelect = (mission: Mission) => {
    setSelectedMission(mission);
    setSelectedAgents([]); // Clear team when switching missions
  };

  const toggleAgentSelection = (agent: Character) => {
    if (!selectedMission) return;

    setSelectedAgents((prev) => {
      const isSelected = prev.some((a) => a.id === agent.id);
      if (isSelected) {
        return prev.filter((a) => a.id !== agent.id);
      }
      // Don't add if we've reached the limit
      if (prev.length >= selectedMission.maxAgents) {
        return prev;
      }
      return [...prev, agent];
    });
  };

  // Filter missions by difficulty
  const filteredMissions = useMemo(() => {
    if (difficultyFilter === 'All') {
      return missions;
    }
    return missions.filter((mission) => mission.difficulty === difficultyFilter);
  }, [missions, difficultyFilter]);

  const successProbability = selectedMission
    ? calculateTeamSuccessProbability(
        selectedAgents.map((a) => a.stats),
        selectedMission.requirements
      )
    : 0;

  const missionTimeBreakdown = selectedMission
    ? getMissionTimeBreakdown(selectedMission, selectedAgents)
    : null;

  const getDifficultyColor = (difficulty: Mission['difficulty']) => {
    switch (difficulty) {
      case 'Easy':
        return '#22c55e';
      case 'Medium':
        return '#f59e0b';
      case 'Hard':
        return '#d97706';
      case 'Extreme':
        return '#ef4444';
    }
  };

  const getSuccessColor = (probability: number) => {
    if (probability >= 0.8) return '#22c55e';
    if (probability >= 0.5) return '#f59e0b';
    if (probability >= 0.3) return '#d97706';
    return '#ef4444';
  };

  return (
    <div className="missions-page">
      <h2 className="missions-header">Available Missions</h2>

      {/* Difficulty Filter */}
      <div className="mission-filters">
        <div className="filter-group">
          <span className="filter-label">Filter by Difficulty:</span>
          <div className="difficulty-filters">
            <button
              type="button"
              onClick={() => setDifficultyFilter('All')}
              className={`difficulty-filter-button ${difficultyFilter === 'All' ? 'active' : ''}`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setDifficultyFilter('Easy')}
              className={`difficulty-filter-button ${difficultyFilter === 'Easy' ? 'active' : ''}`}
            >
              Easy
            </button>
            <button
              type="button"
              onClick={() => setDifficultyFilter('Medium')}
              className={`difficulty-filter-button ${difficultyFilter === 'Medium' ? 'active' : ''}`}
            >
              Medium
            </button>
            <button
              type="button"
              onClick={() => setDifficultyFilter('Hard')}
              className={`difficulty-filter-button ${difficultyFilter === 'Hard' ? 'active' : ''}`}
            >
              Hard
            </button>
            <button
              type="button"
              onClick={() => setDifficultyFilter('Extreme')}
              className={`difficulty-filter-button ${difficultyFilter === 'Extreme' ? 'active' : ''}`}
            >
              Extreme
            </button>
          </div>
        </div>
      </div>

      {/* Mission List */}
      <div className="missions-list">
        {filteredMissions.map((mission) => (
          // biome-ignore lint/a11y/useSemanticElements: Card component, not a semantic button
          <div
            key={mission.id}
            className={`mission-card ${selectedMission?.id === mission.id ? 'selected' : ''}`}
            onClick={() => handleMissionSelect(mission)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleMissionSelect(mission);
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

      {/* Mission Details & Team Selection */}
      {selectedMission && (
        <div className="mission-details">
          <h3>Mission Requirements</h3>
          <div className="mission-chart">
            {selectedAgents.length > 0 ? (
              <OverlayRadarChart
                layers={[
                  {
                    stats: selectedMission.requirements,
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
                    stats: selectedMission.requirements,
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
                <div className="mission-time-breakdown">
                  <h4>Mission Timeline</h4>
                  <div className="time-details">
                    <div className="time-row">
                      <span className="time-label">Travel (Outbound):</span>
                      <span className="time-value">{missionTimeBreakdown.travelTimeOutbound}</span>
                    </div>
                    <div className="time-row">
                      <span className="time-label">Mission Duration:</span>
                      <span className="time-value">{missionTimeBreakdown.missionDuration}</span>
                    </div>
                    <div className="time-row">
                      <span className="time-label">Travel (Return):</span>
                      <span className="time-value">{missionTimeBreakdown.travelTimeReturn}</span>
                    </div>
                    <div className="time-row">
                      <span className="time-label">Rest Time:</span>
                      <span className="time-value">{missionTimeBreakdown.restTime}</span>
                    </div>
                    <div className="time-row total-time">
                      <span className="time-label">Total Time:</span>
                      <span className="time-value">{missionTimeBreakdown.totalTime}</span>
                    </div>
                    {missionTimeBreakdown.hasFastTravelers && (
                      <div className="time-note">
                        Some agents can travel faster due to flight license
                      </div>
                    )}
                    {missionTimeBreakdown.hasQuickRecovery && (
                      <div className="time-note">💤 Some agents recover faster than others</div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="team-header">
            <h3>Select Team</h3>
            <span className="team-count">
              {selectedAgents.length}/{selectedMission.maxAgents}
            </span>
          </div>
          <div className="agent-selection">
            {agents.map((agent) => {
              const isSelected = selectedAgents.some((a) => a.id === agent.id);
              const isExcluded = selectedMission.excludedAgents?.includes(agent.id) ?? false;
              const isAtLimit = selectedAgents.length >= selectedMission.maxAgents;
              const isDisabled = isExcluded || (!isSelected && isAtLimit);
              return (
                <AgentSelectCard
                  key={agent.id}
                  agent={agent}
                  isSelected={isSelected}
                  isExcluded={isExcluded}
                  isDisabled={isDisabled}
                  onToggle={toggleAgentSelection}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
