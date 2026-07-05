import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MissionHistorySection } from '../components/MissionHistorySection';
import { MissionList } from '../components/MissionList';
import { OverlayRadarChart } from '../components/OverlayRadarChart';
import { useUserProgress } from '../hooks/useUserProgress';
import type { Mission } from '../types/mission';
import { getDifficultyColor } from '../utils/colors';
import { loadMissions } from '../utils/dataLoader';

type DifficultyFilter = Mission['difficulty'] | 'All';

type MissionTab = 'available' | 'history';

const DIFFICULTIES: DifficultyFilter[] = ['All', 'Easy', 'Medium', 'Hard', 'Extreme'];

/**
 * Read-only mission catalog + completion history. Deploying heroes happens on a
 * Shift (see /shift); this page is for browsing mission types and past results.
 */
export function Missions() {
  const missions = loadMissions();
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('All');
  const [activeTab, setActiveTab] = useState<MissionTab>('available');
  const { userProgress, isMissionCompleted } = useUserProgress();

  // Not-yet-cleared missions, optionally narrowed by difficulty.
  const filteredMissions = useMemo(() => {
    let filtered = missions.filter((mission) => !isMissionCompleted(mission.id));
    if (difficultyFilter !== 'All') {
      filtered = filtered.filter((mission) => mission.difficulty === difficultyFilter);
    }
    return filtered;
  }, [missions, difficultyFilter, isMissionCompleted]);

  return (
    <div className="missions-page">
      <div className="missions-page-header">
        <h2 className="missions-header">Mission Catalog</h2>
        <div className="user-xp">
          <span className="xp-label">Total XP:</span>
          <span className="xp-value">{userProgress.totalExperience}</span>
        </div>
      </div>

      <p className="missions-browse-note">
        Browse mission types and your history here. To deploy heroes, respond to calls on a{' '}
        <Link to="/shift" className="inline-link">
          Shift
        </Link>
        .
      </p>

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
          <div className="mission-filters">
            <div className="filter-group">
              <span className="filter-label">Filter by Difficulty:</span>
              <div className="difficulty-filters">
                {DIFFICULTIES.map((difficulty) => (
                  <button
                    key={difficulty}
                    type="button"
                    onClick={() => setDifficultyFilter(difficulty)}
                    className={`difficulty-filter-button ${difficultyFilter === difficulty ? 'active' : ''}`}
                  >
                    {difficulty}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <MissionList
            missions={filteredMissions}
            selectedMission={selectedMission}
            onMissionSelect={setSelectedMission}
          />

          {selectedMission && (
            <div className="mission-details">
              <div className="mission-browse-header">
                <h3>{selectedMission.name}</h3>
                <span
                  className="mission-difficulty"
                  style={{ color: getDifficultyColor(selectedMission.difficulty) }}
                >
                  {selectedMission.difficulty}
                </span>
              </div>
              {selectedMission.description && (
                <p className="mission-browse-description">{selectedMission.description}</p>
              )}
              <div className="mission-chart">
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
              </div>
              {selectedMission.rewards && (
                <div className="mission-browse-reward">
                  Reward: {selectedMission.rewards.experience} XP
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <MissionHistorySection userProgress={userProgress} allMissions={missions} />
      )}
    </div>
  );
}
