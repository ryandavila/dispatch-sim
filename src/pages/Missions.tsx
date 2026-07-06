import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MissionHistorySection } from '../components/MissionHistorySection';
import { MissionList } from '../components/MissionList';
import { OverlayRadarChart } from '../components/OverlayRadarChart';
import { ShiftHistorySection } from '../components/ShiftHistorySection';
import { useAgentProgress } from '../hooks/useAgentProgress';
import { useUserProgress } from '../hooks/useUserProgress';
import '../styles/archive.css';
import type { Mission } from '../types/mission';
import { getDifficultyColor } from '../utils/colors';
import { loadMissions } from '../utils/dataLoader';

type DifficultyFilter = Mission['difficulty'] | 'All';

type MissionTab = 'available' | 'history' | 'shifts';

const DIFFICULTIES: DifficultyFilter[] = ['All', 'Easy', 'Medium', 'Hard', 'Extreme'];

/**
 * Read-only mission catalog + completion history — the SDN call archive.
 * Deploying heroes happens on a Shift (see /shift); this page is for browsing
 * call types and past results, so unlike the live briefing, requirement
 * graphs are fully declassified here.
 */
export function Missions() {
  const missions = loadMissions();
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('All');
  const [activeTab, setActiveTab] = useState<MissionTab>('available');
  const { userProgress } = useUserProgress();
  const { agents } = useAgentProgress();

  // Every call type in the catalog (calls repeat across shifts), optionally
  // narrowed by difficulty.
  const filteredMissions = useMemo(() => {
    if (difficultyFilter === 'All') {
      return missions;
    }
    return missions.filter((mission) => mission.difficulty === difficultyFilter);
  }, [missions, difficultyFilter]);

  return (
    <div className="ar-page">
      <div className="ar-window sdn-window">
        <div className="sdn-window-title">
          CALL.ARCHIVE
          <span className="sdn-window-title-spacer" />
          <span className="ar-xp sdn-readout">TOTAL XP: {userProgress.totalExperience}</span>
        </div>
        <div className="sdn-window-body">
          <p className="ar-note">
            Browse call types and your history here. To deploy heroes, respond to calls on a{' '}
            <Link to="/shift" className="ar-inline-link">
              Shift
            </Link>
            .
          </p>

          <div className="ar-tabs">
            <button
              type="button"
              onClick={() => setActiveTab('available')}
              className={`sdn-tab ar-tab ${activeTab === 'available' ? 'active' : ''}`}
            >
              <span className="sdn-tab-star">★</span>
              Calls ({filteredMissions.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`sdn-tab ar-tab ${activeTab === 'history' ? 'active' : ''}`}
            >
              <span className="sdn-tab-star">★</span>
              History ({userProgress.missionCompletions.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('shifts')}
              className={`sdn-tab ar-tab ${activeTab === 'shifts' ? 'active' : ''}`}
            >
              <span className="sdn-tab-star">★</span>
              Shifts ({userProgress.shiftSummaries.length})
            </button>
          </div>

          <div className="ar-tab-panel">
            {activeTab === 'available' ? (
              <>
                <div className="ar-filters">
                  <span className="ar-filter-label">Filter by difficulty</span>
                  <div className="ar-difficulty-filters">
                    {DIFFICULTIES.map((difficulty) => (
                      <button
                        key={difficulty}
                        type="button"
                        onClick={() => setDifficultyFilter(difficulty)}
                        className={`sdn-chip ar-difficulty-filter ${difficultyFilter === difficulty ? 'active' : ''}`}
                      >
                        {difficulty}
                      </button>
                    ))}
                  </div>
                </div>

                <MissionList
                  missions={filteredMissions}
                  selectedMission={selectedMission}
                  onMissionSelect={setSelectedMission}
                />

                {selectedMission && (
                  <div className="ar-details">
                    <div className="ar-details-header">
                      <h3 className="ar-details-name">{selectedMission.name}</h3>
                      <span
                        className="ar-difficulty-chip"
                        style={{ backgroundColor: getDifficultyColor(selectedMission.difficulty) }}
                      >
                        {selectedMission.difficulty}
                      </span>
                    </div>
                    {selectedMission.location && (
                      <div className="ar-details-loc sdn-readout">
                        LOC: {selectedMission.location.name}
                      </div>
                    )}
                    {selectedMission.description && (
                      <p className="ar-details-description">{selectedMission.description}</p>
                    )}
                    <div className="ar-details-chart">
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
                      <div className="ar-details-reward">
                        Reward: {selectedMission.rewards.experience} XP
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : activeTab === 'history' ? (
              <MissionHistorySection userProgress={userProgress} allMissions={missions} />
            ) : (
              <ShiftHistorySection summaries={userProgress.shiftSummaries} allAgents={agents} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
