import { useState } from 'react';
import { ActiveMissionsSection } from '../components/ActiveMissionsSection';
import { MissionDetailsSection } from '../components/MissionDetailsSection';
import { ShiftCallCard } from '../components/ShiftCallCard';
import { ShiftReview } from '../components/ShiftReview';
import { getEffectiveStats, isDowned } from '../engine/injury';
import { applyProbabilityModifiers, calculateTeamSuccessProbability } from '../engine/resolution';
import { getTeamSynergies } from '../engine/synergy';
import { useAgentProgress } from '../hooks/useAgentProgress';
import { useShift } from '../hooks/useShift';
import { useUserProgress } from '../hooks/useUserProgress';
import type { ActiveMission } from '../types/activeMission';
import type { Character } from '../types/character';
import { loadMissions } from '../utils/dataLoader';
import { getMissionTimeBreakdown } from '../utils/missionTime';

export function Shift() {
  const missions = loadMissions();
  const { agents, awardExperience, applyInjuries } = useAgentProgress();
  const { userProgress, addMissionCompletion, recordSynergyDispatch, consumePity } =
    useUserProgress();

  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [selectedAgents, setSelectedAgents] = useState<Character[]>([]);

  // Same completion handling as the at-will Missions page: XP on success,
  // injuries on failure, and a recorded completion either way.
  const handleMissionComplete = (activeMission: ActiveMission) => {
    const { success } = activeMission.outcome;
    const experienceGained = success ? (activeMission.mission.rewards?.experience ?? 0) : 0;
    const agentIds = activeMission.agents.map((a) => a.id);

    addMissionCompletion({
      missionId: activeMission.mission.id,
      completedAt: Date.now(),
      agents: agentIds,
      experienceGained,
      success,
    });

    if (success) {
      awardExperience(agentIds, experienceGained);
    } else {
      applyInjuries(agentIds);
    }
  };

  const { shift, now, start, deploy, pause, resume } = useShift({
    missions,
    storageKey: 'dispatch-sim-shift',
    onMissionComplete: handleMissionComplete,
    getSynergyDispatchCount: (pairKey) => userProgress.synergyDispatchCounts[pairKey] ?? 0,
    pityRemaining: userProgress.pityRemaining,
    onDeployRolled: ({ synergyPairKeys, pityUsed }) => {
      recordSynergyDispatch(synergyPairKeys);
      if (pityUsed) {
        consumePity();
      }
    },
  });

  const openCalls = shift.calls
    .filter((call) => call.status === 'open')
    .sort((a, b) => a.expiresAt - b.expiresAt);

  const selectedCall =
    shift.calls.find((call) => call.id === selectedCallId && call.status === 'open') ?? null;
  const selectedMission = selectedCall
    ? (missions.find((m) => m.id === selectedCall.missionId) ?? null)
    : null;

  const busyAgentIds = new Set(shift.activeMissions.flatMap((m) => m.agents.map((a) => a.id)));
  const isAgentAvailable = (agentId: string) => !busyAgentIds.has(agentId);

  const handleRespond = (callId: string) => {
    setSelectedCallId(callId);
    setSelectedAgents([]);
    pause(); // opening a call pauses the shift clock (Decision #8)
  };

  const closePanel = () => {
    setSelectedCallId(null);
    setSelectedAgents([]);
    resume();
  };

  const toggleAgentSelection = (agent: Character) => {
    if (!selectedMission || isDowned(agent)) {
      return;
    }
    setSelectedAgents((prev) => {
      if (prev.some((a) => a.id === agent.id)) {
        return prev.filter((a) => a.id !== agent.id);
      }
      if (prev.length >= selectedMission.maxAgents) {
        return prev;
      }
      return [...prev, agent];
    });
  };

  const handleDeploy = () => {
    if (!selectedCall || selectedAgents.length === 0) {
      return;
    }
    deploy(selectedCall.id, selectedAgents);
    closePanel();
  };

  const handleNewShift = () => {
    setSelectedCallId(null);
    setSelectedAgents([]);
    start();
  };

  // Deploy-panel derived stats — identical modifier stack to the deploy roll.
  const teamSynergies = getTeamSynergies(
    selectedAgents.map((a) => a.id),
    (pairKey) => userProgress.synergyDispatchCounts[pairKey] ?? 0
  );
  const successProbability =
    selectedMission && selectedAgents.length > 0
      ? applyProbabilityModifiers({
          baseProbability: calculateTeamSuccessProbability(
            selectedAgents.map((a) => getEffectiveStats(a)),
            selectedMission.requirements
          ),
          difficulty: selectedMission.difficulty,
          synergyLevels: teamSynergies.map((synergy) => synergy.level),
          pityRemaining: userProgress.pityRemaining,
          teamSize: selectedAgents.length,
        }).probability
      : 0;
  const missionTimeBreakdown = selectedMission
    ? getMissionTimeBreakdown(selectedMission, selectedAgents)
    : null;

  if (shift.phase === 'idle') {
    return (
      <div className="shift-page">
        <div className="shift-intro">
          <h2>Start a Shift</h2>
          <p>
            Calls arrive over ~3 minutes, each with a countdown. Respond in time or they auto-fail.
            Opening a call pauses the clock so you can pick a team. Unanswered calls are{' '}
            <strong>missed</strong>; deployed calls that lose the roll are <strong>failed</strong>{' '}
            and injure a hero.
          </p>
          <button type="button" className="deploy-button" onClick={() => start()}>
            Start Shift
          </button>
        </div>
      </div>
    );
  }

  const elapsedMs = Math.max(0, now - shift.shiftStartMs);
  const spawnRemainingMs = Math.max(0, shift.config.shiftDurationMs - elapsedMs);
  const ended = shift.phase === 'ended';

  return (
    <div className="shift-page">
      <div className="shift-hud">
        <div className="shift-hud-phase">
          {ended ? 'Wrapping up' : shift.phase === 'paused' ? 'Paused' : 'On Shift'}
          {!ended && ` · ${Math.ceil(spawnRemainingMs / 1000)}s of calls left`}
        </div>
        <div className="shift-hud-tally">
          <span className="tally-succeeded">✓ {shift.tally.succeeded}</span>
          <span className="tally-failed">✗ {shift.tally.failed}</span>
          <span className="tally-missed">— {shift.tally.missed}</span>
        </div>
      </div>

      {ended && (
        <ShiftReview
          tally={shift.tally}
          pendingMissions={shift.activeMissions.length}
          onNewShift={handleNewShift}
        />
      )}

      {!ended && (
        <div className="shift-board">
          <h3>
            Open Calls ({openCalls.length}/{shift.config.maxOpenCalls})
          </h3>
          {openCalls.length === 0 ? (
            <p className="shift-board-empty">Waiting for calls…</p>
          ) : (
            <div className="shift-call-list">
              {openCalls.map((call) => (
                <ShiftCallCard
                  key={call.id}
                  call={call}
                  mission={missions.find((m) => m.id === call.missionId)}
                  now={now}
                  callTimerMs={shift.config.callTimerMs}
                  onRespond={handleRespond}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <ActiveMissionsSection activeMissions={shift.activeMissions} currentTime={now} />

      {selectedMission && selectedCall && (
        <div className="shift-deploy-panel">
          <div className="shift-deploy-header">
            <h3>Respond: {selectedMission.name}</h3>
            <button type="button" className="shift-deploy-cancel" onClick={closePanel}>
              ✕ Back
            </button>
          </div>
          <MissionDetailsSection
            mission={selectedMission}
            selectedAgents={selectedAgents}
            allAgents={agents}
            successProbability={successProbability}
            activeSynergies={teamSynergies.filter((synergy) => synergy.level > 0)}
            missionTimeBreakdown={missionTimeBreakdown}
            isAgentAvailable={isAgentAvailable}
            onToggleAgent={toggleAgentSelection}
            onDeployMission={handleDeploy}
          />
        </div>
      )}
    </div>
  );
}
