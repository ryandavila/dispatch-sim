import { useCallback, useMemo, useState } from 'react';
import { ActiveMissionsSection } from '../components/ActiveMissionsSection';
import { CompletedMissionsSection } from '../components/CompletedMissionsSection';
import { MissionDetailsSection } from '../components/MissionDetailsSection';
import { MissionHistorySection } from '../components/MissionHistorySection';
import { MissionList } from '../components/MissionList';
import { useActiveMissions } from '../hooks/useActiveMissions';
import { useUserProgress } from '../hooks/useUserProgress';
import type { Character } from '../types/character';
import type { Mission } from '../types/mission';
import { loadAgents, loadMissions } from '../utils/dataLoader';
import { calculateTeamSuccessProbability } from '../utils/geometry';
import { getMissionTimeBreakdown } from '../utils/missionTime';

type DifficultyFilter = Mission['difficulty'] | 'All';

type MissionTab = 'available' | 'history';

export function Missions() {
  const missions = loadMissions();
  const agents = loadAgents();
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [selectedAgents, setSelectedAgents] = useState<Character[]>([]);
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('All');
  const [activeTab, setActiveTab] = useState<MissionTab>('available');
  const { userProgress, addMissionCompletion, isMissionCompleted } = useUserProgress();

  const handleMissionComplete = useCallback(
    (activeMission: import('../types/activeMission').ActiveMission) => {
      const experienceGained = activeMission.mission.rewards?.experience || 0;
      addMissionCompletion({
        missionId: activeMission.mission.id,
        completedAt: Date.now(),
        agents: activeMission.agents.map((a) => a.id),
        experienceGained,
      });
    },
    [addMissionCompletion]
  );

  const { activeMissions, completedMissions, currentTime, deployMission, isAgentAvailable } =
    useActiveMissions({ onMissionComplete: handleMissionComplete });

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

  const handleDeployMission = () => {
    if (!selectedMission || selectedAgents.length === 0) return;

    deployMission(selectedMission, selectedAgents);
    setSelectedAgents([]);
  };

  // Filter missions by difficulty and exclude completed missions
  const filteredMissions = useMemo(() => {
    let filtered = missions.filter((mission) => !isMissionCompleted(mission.id));

    if (difficultyFilter !== 'All') {
      filtered = filtered.filter((mission) => mission.difficulty === difficultyFilter);
    }

    return filtered;
  }, [missions, difficultyFilter, isMissionCompleted]);

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
      <div className="missions-page-header">
        <h2 className="missions-header">Missions</h2>
        <div className="user-xp">
          <span className="xp-label">Total XP:</span>
          <span className="xp-value">{userProgress.totalExperience}</span>
        </div>
      </div>

      {/* Mission Tabs */}
      <div className="mission-tabs">
        <button
          type="button"
          onClick={() => setActiveTab('available')}
          className={`mission-tab ${activeTab === 'available' ? 'active' : ''}`}
        >
          Available ({filteredMissions.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`mission-tab ${activeTab === 'history' ? 'active' : ''}`}
        >
          History ({userProgress.missionCompletions.length})
        </button>
      </div>

      {activeTab === 'available' ? (
        <>
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

          {/* Completed Missions */}
          <CompletedMissionsSection completedMissions={completedMissions} />

          {/* Active Missions */}
          <ActiveMissionsSection activeMissions={activeMissions} currentTime={currentTime} />

          {/* Mission List */}
          <MissionList
            missions={filteredMissions}
            selectedMission={selectedMission}
            onMissionSelect={handleMissionSelect}
            getDifficultyColor={getDifficultyColor}
          />

          {/* Mission Details & Team Selection */}
          {selectedMission && (
            <MissionDetailsSection
              mission={selectedMission}
              selectedAgents={selectedAgents}
              allAgents={agents}
              successProbability={successProbability}
              missionTimeBreakdown={missionTimeBreakdown}
              isAgentAvailable={isAgentAvailable}
              onToggleAgent={toggleAgentSelection}
              onDeployMission={handleDeployMission}
              getSuccessColor={getSuccessColor}
            />
          )}
        </>
      ) : (
        <MissionHistorySection userProgress={userProgress} allMissions={missions} />
      )}
    </div>
  );
}
