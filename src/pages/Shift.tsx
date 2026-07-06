import { useEffect, useRef, useState } from 'react';
import { CallBriefing } from '../components/dispatch/CallBriefing';
import { CallReport } from '../components/dispatch/CallReport';
import { DisruptionWindow } from '../components/dispatch/DisruptionWindow';
import { RosterBar, type XpPop } from '../components/dispatch/RosterBar';
import { TorranceMap } from '../components/dispatch/TorranceMap';
import { ShiftHistorySection } from '../components/ShiftHistorySection';
import { type RankReviewInfo, ShiftReview } from '../components/ShiftReview';
import {
  type DisruptionResolution,
  recordDisruptionResolution,
  sumTeamStats,
} from '../engine/disruption';
import { isDowned } from '../engine/injury';
import {
  canUseHeroPower,
  extendCall,
  MALEVOLA_ID,
  PRISM_EXTEND_MS,
  PRISM_ID,
} from '../engine/powers';
import {
  applyRankDelta,
  RANK_TIERS,
  type RankProgress,
  rankDelta,
  tierForScore,
} from '../engine/rank';
import { applyProbabilityModifiers, calculateTeamSuccessProbability } from '../engine/resolution';
import { createRng } from '../engine/rng';
import { configForShift, missionPoolForShift } from '../engine/shiftLadder';
import { pickStatPointRecipient, scoreShift } from '../engine/shiftScore';
import { getTeamSynergies } from '../engine/synergy';
import { useAgentProgress } from '../hooks/useAgentProgress';
import { useShift } from '../hooks/useShift';
import { useUserProgress } from '../hooks/useUserProgress';
import '../styles/dispatch.css';
import { getEffectiveStats } from '../engine/injury';
import { splitXpPool } from '../engine/xp';
import type { ActiveMission } from '../types/activeMission';
import { calculateMissionProgress } from '../types/activeMission';
import type { Mission } from '../types/mission';
import type { Character } from '../types/character';
import type { ShiftState } from '../types/shift';
import type { ShiftRewards, ShiftSummary } from '../types/shiftSummary';
import { loadMissions } from '../utils/dataLoader';

const REPORTS_STORAGE_KEY = 'dispatch-sim-reports';

export interface FinalizeDeps {
  currentShiftNumber: number;
  agents: Character[];
  /** Rank progress BEFORE this shift's delta is applied. */
  rankProgress: RankProgress;
  grantAvailablePoints: (agentId: string, amount: number) => void;
  applyShiftRewards: (rewards: ShiftRewards) => void;
  applyRankProgress: (delta: number) => void;
  recordShiftSummary: (summary: ShiftSummary) => void;
}

/**
 * Score a fully-settled shift, credit its rewards, and record the summary.
 * scoreShift is pure/deterministic; the ONLY randomness is which eligible hero
 * receives the stat points — seeded off the shift seed + its success count so
 * the pick is reproducible and decorrelated from the schedule stream.
 */
export function finalizeShift(state: ShiftState, deps: FinalizeDeps): void {
  const rewards = scoreShift(state.tally);

  // If a shift earns stat points but no eligible (non-fixed-rank) hero exists,
  // they're dropped — account rewards still credit and the summary records no
  // recipient. Can't happen with the real roster (only Phenomaman is fixed).
  let statPointAgentId: string | undefined;
  if (rewards.statPoints > 0) {
    // Phenomaman (fixedRank) can't spend points, so exclude fixed-rank heroes.
    const eligibleIds = deps.agents.filter((a) => !a.fixedRank).map((a) => a.id);
    const pickRng = createRng((state.config.seed ^ (state.tally.succeeded * 2654435761)) | 0);
    statPointAgentId = pickStatPointRecipient(eligibleIds, pickRng) ?? undefined;
    if (statPointAgentId) {
      deps.grantAvailablePoints(statPointAgentId, rewards.statPoints);
    }
  }

  deps.applyShiftRewards(rewards);

  // Dispatcher rank (Track: rank meta-progression). tiersGained is recomputed
  // here with the same pure applyRankDelta the hook uses internally, so the
  // summary can persist the promotion names the hook's payout matched.
  const shiftRankDelta = rankDelta(state.tally);
  const { tiersGained } = applyRankDelta(deps.rankProgress, shiftRankDelta);
  deps.applyRankProgress(shiftRankDelta);

  deps.recordShiftSummary({
    shiftNumber: deps.currentShiftNumber,
    completedAt: Date.now(),
    tally: state.tally,
    seed: state.config.seed,
    rewards,
    statPointAgentId,
    rankDelta: shiftRankDelta,
    ...(tiersGained.length > 0 ? { promotions: tiersGained.map((t) => t.name) } : {}),
  });
}

/**
 * Rewards + recipient name to show on the review, once the shift is fully
 * settled. scoreShift(tally) matches what was credited (same final tally); the
 * recipient comes from the just-recorded summary (the last one appended).
 */
function reviewInfo(
  shift: ShiftState,
  summaries: ShiftSummary[],
  agents: Character[],
  rankScore: number
): { rewards?: ShiftRewards; statPointAgentName?: string; rank?: RankReviewInfo } {
  if (shift.phase !== 'ended' || shift.activeMissions.length > 0) {
    return {};
  }
  const rewards = scoreShift(shift.tally);
  const last = summaries[summaries.length - 1];
  const statPointAgentName = last?.statPointAgentId
    ? agents.find((a) => a.id === last.statPointAgentId)?.name
    : undefined;
  // Rank on the review: userProgress already reflects the applied delta by the
  // time the review shows, so the current score is the post-shift score and
  // the delta/promotions come from the just-recorded summary.
  const rank: RankReviewInfo | undefined =
    last?.rankDelta === undefined
      ? undefined
      : {
          tierName: tierForScore(rankScore).name,
          score: Math.max(0, rankScore),
          delta: last.rankDelta,
          promotions: (last.promotions ?? []).flatMap((name) => {
            const tier = RANK_TIERS.find((t) => t.name === name);
            return tier ? [{ name: tier.name, ...tier.rewards }] : [];
          }),
        };
  return { rewards, statPointAgentName, rank };
}

function computeHudStatus(
  phase: ShiftState['phase'],
  showReview: boolean,
  spawnRemainingMs: number
): string {
  if (phase === 'idle') {
    return 'STANDING BY';
  }
  if (phase === 'ended') {
    return showReview ? 'SHIFT COMPLETE' : 'AWAITING REPORTS';
  }
  if (phase === 'paused') {
    return 'TIME FROZEN';
  }
  return `CALLS INBOUND — ${Math.ceil(spawnRemainingMs / 1000)}S`;
}

/**
 * Disrupted calls: when a deployed mission crosses its baked firesAtMs during
 * the 'active' phase, freeze the clock (like CALL.BRIEFING) and put the radio
 * interruption on screen. Only while running and with no other paper window
 * open — if the shift already ended (pause() would no-op) or another overlay
 * owns the pause, the disruption is skipped and simply pays no bonus.
 */
function useDisruptionWatch({
  shift,
  now,
  overlayOpen,
  pause,
  resume,
  update,
}: {
  shift: ShiftState;
  now: number;
  overlayOpen: boolean;
  pause: () => void;
  resume: () => void;
  update: (fn: (state: ShiftState) => ShiftState) => void;
}) {
  const [disruptionMissionId, setDisruptionMissionId] = useState<string | null>(null);
  const anyWindowOpen = overlayOpen || disruptionMissionId !== null;

  useEffect(() => {
    if (shift.phase !== 'running' || anyWindowOpen) {
      return;
    }
    const due = shift.activeMissions.find(
      (m) =>
        m.disruption &&
        !m.disruption.resolution &&
        now >= m.disruption.firesAtMs &&
        calculateMissionProgress(m, now).phase === 'active'
    );
    if (due) {
      pause();
      setDisruptionMissionId(due.id);
    }
  }, [shift, now, anyWindowOpen, pause]);

  const disruptionMission = disruptionMissionId
    ? (shift.activeMissions.find((m) => m.id === disruptionMissionId) ?? null)
    : null;

  const onDisruptionResolve = (resolution: DisruptionResolution) => {
    if (disruptionMissionId) {
      update((state) => recordDisruptionResolution(state, disruptionMissionId, resolution));
    }
  };

  const onDisruptionContinue = () => {
    setDisruptionMissionId(null);
    resume();
  };

  return { disruptionMission, onDisruptionResolve, onDisruptionContinue };
}

/** Projected odds for the briefing panel — identical modifier stack to the deploy roll. */
function briefingProbability(
  mission: Mission | null,
  team: Character[],
  synergyLevels: number[],
  pityRemaining: number
): number {
  if (!mission || team.length === 0) {
    return 0;
  }
  return applyProbabilityModifiers({
    baseProbability: calculateTeamSuccessProbability(
      team.map((a) => getEffectiveStats(a)),
      mission.requirements
    ),
    difficulty: mission.difficulty,
    synergyLevels,
    pityRemaining,
    teamSize: team.length,
  }).probability;
}

/**
 * Prism + Malevola signature uplinks on the briefing window. Each is once per
 * shift and only needs its hero not-downed — a hero out on a call can still
 * radio in. Prism stretches the selected call's countdown; Malevola reveals
 * the call's (normally hidden) requirement pentagon for as long as that
 * briefing is on screen.
 */
function useSignatureUplinks({
  agents,
  powerUsage,
  shiftNumber,
  selectedCallId,
  update,
  recordPowerUse,
}: {
  agents: Character[];
  powerUsage: Record<string, number>;
  shiftNumber: number;
  selectedCallId: string | null;
  update: (fn: (state: ShiftState) => ShiftState) => void;
  recordPowerUse: (heroId: string, shiftNumber: number) => void;
}) {
  // Keyed by call id: the reveal only applies to the briefing it was bought
  // for. Cleared on shift start (call ids repeat shift-to-shift).
  const [revealedCallId, setRevealedCallId] = useState<string | null>(null);

  const heroById = (id: string) => agents.find((a) => a.id === id);
  const prismAvailable = canUseHeroPower(PRISM_ID, powerUsage, shiftNumber, heroById(PRISM_ID));
  const malevolaAvailable = canUseHeroPower(
    MALEVOLA_ID,
    powerUsage,
    shiftNumber,
    heroById(MALEVOLA_ID)
  );

  const onPrismExtend = () => {
    if (!selectedCallId) {
      return;
    }
    // extendCall is a pure no-op if the call is no longer open.
    update((state) => extendCall(state, selectedCallId, PRISM_EXTEND_MS));
    recordPowerUse(PRISM_ID, shiftNumber);
  };

  const onMalevolaReveal = () => {
    if (!selectedCallId) {
      return;
    }
    setRevealedCallId(selectedCallId);
    recordPowerUse(MALEVOLA_ID, shiftNumber);
  };

  return {
    prismAvailable,
    malevolaAvailable,
    onPrismExtend,
    onMalevolaReveal,
    requirementsRevealed: revealedCallId !== null && revealedCallId === selectedCallId,
    resetReveals: () => setRevealedCallId(null),
  };
}

function loadStoredReports(): ActiveMission[] {
  try {
    const raw = localStorage.getItem(REPORTS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ActiveMission[]) : [];
  } catch {
    return [];
  }
}

export function Shift() {
  const missions = loadMissions();
  const { agents, awardExperience, applyInjuries, grantAvailablePoints, healAgent } =
    useAgentProgress();
  const {
    userProgress,
    addMissionCompletion,
    recordSynergyDispatch,
    recordShiftSummary,
    applyShiftRewards,
    applyRankProgress,
    consumeDefibrillator,
    consumePity,
    recordPowerUse,
  } = useUserProgress();

  // Source of truth for "which shift am I on": next = prior summaries + 1.
  const currentShiftNumber = userProgress.shiftSummaries.length + 1;

  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [selectedAgents, setSelectedAgents] = useState<Character[]>([]);

  // Report gate (as in the real game): a settled call sits checked-off on the
  // map, its heroes locked, until the player reviews and files its report.
  const [reports, setReports] = useState<ActiveMission[]>(loadStoredReports);
  const [openReportId, setOpenReportId] = useState<string | null>(null);
  const [xpPops, setXpPops] = useState<XpPop[]>([]);
  const popTimersRef = useRef<number[]>([]);

  useEffect(() => {
    localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reports));
  }, [reports]);

  useEffect(
    () => () => {
      for (const t of popTimersRef.current) {
        clearTimeout(t);
      }
    },
    []
  );

  // Same completion handling as before: XP on success, injuries on failure,
  // and a recorded completion either way. The mission then joins the report
  // queue — outcome hidden until the player opens the report.
  //
  // experienceGained recorded on the completion is the FULL pool (account-level
  // total XP counts the pool once); what's actually credited per hero is that
  // pool split evenly via splitXpPool, matching the real game's "SPLIT N WAYS".
  const handleMissionComplete = (activeMission: ActiveMission) => {
    const { success } = activeMission.outcome;
    // A handled disruption's bonus joins the pool, but only when the call
    // itself succeeds — a failed call pays nothing, radio heroics included.
    const disruptionBonus = activeMission.disruption?.resolution?.xpBonus ?? 0;
    const experienceGained = success
      ? (activeMission.mission.rewards?.experience ?? 0) + disruptionBonus
      : 0;
    const agentIds = activeMission.agents.map((a) => a.id);

    addMissionCompletion({
      missionId: activeMission.mission.id,
      completedAt: Date.now(),
      agents: agentIds,
      experienceGained,
      success,
    });

    if (success) {
      const shares = splitXpPool(experienceGained, agentIds.length);
      awardExperience(agentIds.map((agentId, i) => ({ agentId, amount: shares[i] })));
    } else {
      applyInjuries(agentIds);
    }

    setReports((prev) => [...prev, activeMission]);
  };

  // When the shift fully settles, score it, credit its rewards, and record the
  // summary (see finalizeShift above).
  const handleShiftFinalized = (state: ShiftState) => {
    finalizeShift(state, {
      currentShiftNumber,
      agents,
      rankProgress: {
        rankScore: userProgress.rankScore,
        bestRankScore: userProgress.bestRankScore,
      },
      grantAvailablePoints,
      applyShiftRewards,
      applyRankProgress,
      recordShiftSummary,
    });
  };

  const { shift, now, start, deploy, pause, resume, update } = useShift({
    missions,
    storageKey: 'dispatch-sim-shift',
    // Later shifts draw from a Hard/Extreme-weighted pool (escalation, Track 3).
    buildPool: (pool) => missionPoolForShift(currentShiftNumber, pool),
    onMissionComplete: handleMissionComplete,
    onShiftFinalized: handleShiftFinalized,
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
    .sort((a, b) => a.expiresAt - b.expiresAt)
    .flatMap((call) => {
      const mission = missions.find((m) => m.id === call.missionId);
      return mission ? [{ call, mission }] : [];
    });

  const selectedCall =
    shift.calls.find((call) => call.id === selectedCallId && call.status === 'open') ?? null;
  const selectedMission = selectedCall
    ? (missions.find((m) => m.id === selectedCall.missionId) ?? null)
    : null;

  const busyAgentIds = new Set([
    ...shift.activeMissions.flatMap((m) => m.agents.map((a) => a.id)),
    ...reports.flatMap((m) => m.agents.map((a) => a.id)),
  ]);

  const uplinks = useSignatureUplinks({
    agents,
    powerUsage: userProgress.powerUsage,
    shiftNumber: currentShiftNumber,
    selectedCallId,
    update,
    recordPowerUse,
  });

  const {
    disruptionMission,
    onDisruptionResolve: handleDisruptionResolve,
    onDisruptionContinue: handleDisruptionContinue,
  } = useDisruptionWatch({
    shift,
    now,
    overlayOpen: selectedCallId !== null || openReportId !== null,
    pause,
    resume,
    update,
  });

  const handleRespond = (callId: string) => {
    setSelectedCallId(callId);
    setSelectedAgents([]);
    pause(); // opening a call pauses the shift clock (Decision #8)
  };

  const closeBriefing = () => {
    setSelectedCallId(null);
    setSelectedAgents([]);
    resume();
  };

  const canSelectAgent = (agent: Character) =>
    !!selectedMission &&
    !isDowned(agent) &&
    !busyAgentIds.has(agent.id) &&
    !(selectedMission.excludedAgents ?? []).includes(agent.id) &&
    selectedAgents.length < selectedMission.maxAgents;

  const toggleAgentSelection = (agent: Character) => {
    if (!selectedMission) {
      return;
    }
    setSelectedAgents((prev) => {
      if (prev.some((a) => a.id === agent.id)) {
        return prev.filter((a) => a.id !== agent.id);
      }
      if (!canSelectAgent(agent)) {
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
    closeBriefing();
  };

  const handleOpenReport = (activeMissionId: string) => {
    pause();
    setOpenReportId(activeMissionId);
  };

  const handleDismissReport = () => {
    const report = reports.find((m) => m.id === openReportId);
    setOpenReportId(null);
    setReports((prev) => prev.filter((m) => m.id !== openReportId));
    resume();
    if (report?.outcome.success) {
      const xp =
        (report.mission.rewards?.experience ?? 0) + (report.disruption?.resolution?.xpBonus ?? 0);
      // Same split as the actual credit (splitXpPool), so what pops here always
      // matches what landed in useAgentProgress — shares can differ by 1
      // between heroes; no artificial min-1 floor.
      const shares = splitXpPool(xp, report.agents.length);
      const stamp = Date.now();
      setXpPops((prev) => [
        ...prev,
        ...report.agents.map((a, i) => ({
          agentId: a.id,
          amount: shares[i],
          key: `${report.id}-${a.id}`,
        })),
      ]);
      popTimersRef.current.push(
        window.setTimeout(
          () => {
            setXpPops((prev) => prev.filter((p) => !p.key.startsWith(report.id)));
          },
          1700 + (stamp % 1)
        )
      );
    }
  };

  // Escalating ladder (Track 3): shift N gets more calls on tighter timers.
  const startShift = () => {
    setSelectedCallId(null);
    setSelectedAgents([]);
    setReports([]);
    setOpenReportId(null);
    setXpPops([]);
    uplinks.resetReveals();
    start(configForShift(currentShiftNumber));
  };

  // Briefing-panel derived stats — identical modifier stack to the deploy roll.
  const teamSynergies = getTeamSynergies(
    selectedAgents.map((a) => a.id),
    (pairKey) => userProgress.synergyDispatchCounts[pairKey] ?? 0
  );
  const successProbability = briefingProbability(
    selectedMission,
    selectedAgents,
    teamSynergies.map((synergy) => synergy.level),
    userProgress.pityRemaining
  );

  const idle = shift.phase === 'idle';
  const ended = shift.phase === 'ended';
  const settled = ended && shift.activeMissions.length === 0;
  const showReview = settled && reports.length === 0;
  const openReport = reports.find((m) => m.id === openReportId) ?? null;

  const elapsedMs = Math.max(0, now - shift.shiftStartMs);
  const spawnRemainingMs = Math.max(0, shift.config.shiftDurationMs - elapsedMs);
  const hudShiftNumber = settled
    ? Math.max(1, userProgress.shiftSummaries.length)
    : currentShiftNumber;
  const {
    rewards: shiftRewards,
    statPointAgentName,
    rank: rankReview,
  } = reviewInfo(shift, userProgress.shiftSummaries, agents, userProgress.rankScore);

  const hudStatus = computeHudStatus(shift.phase, showReview, spawnRemainingMs);

  return (
    <div className="dm-page">
      <div className="dm-board sdn-window">
        <div className="sdn-window-title">
          TORRANCE.MAP
          <span className="dm-hud-shift">SHIFT {hudShiftNumber}</span>
          <span className="sdn-window-title-spacer" />
          {!idle && (
            <span className="dm-hud-tally" data-testid="hud-tally">
              <span className="dm-tally-ok">✓ {shift.tally.succeeded}</span>
              <span className="dm-tally-fail">✗ {shift.tally.failed}</span>
              <span className="dm-tally-miss">— {shift.tally.missed}</span>
            </span>
          )}
          <span className={`dm-hud-status${shift.phase === 'paused' ? ' paused' : ''}`}>
            {hudStatus}
          </span>
        </div>

        <TorranceMap
          openCalls={idle ? [] : openCalls}
          activeMissions={shift.activeMissions}
          reports={reports}
          now={now}
          callTimerMs={shift.config.callTimerMs}
          onRespond={handleRespond}
          onOpenReport={handleOpenReport}
        >
          {idle && (
            <div className="dm-overlay">
              <div className="sdn-window dm-overlay-window">
                <div className="sdn-window-title">SHIFT.START</div>
                <div className="sdn-window-body dm-start-body">
                  <div className="dm-start-number">SHIFT {currentShiftNumber}</div>
                  <p>
                    The Z-Team is on the clock. Calls land on the map with a countdown — open one to
                    freeze time and brief a team, or let it expire and eat the miss. Failed calls
                    injure heroes; review every filed report to free your people for the next call.
                  </p>
                  <div className="dm-start-hints sdn-readout">
                    <span>» BANDAGES IN STOCK: {userProgress.medKits}</span>
                    <span>» BOOST CHARGES (&gt;76% GUARANTEE): {userProgress.pityRemaining}</span>
                    <span>» LATER SHIFTS RUN HOTTER: MORE CALLS, TIGHTER TIMERS</span>
                  </div>
                  <button type="button" className="sdn-btn sdn-btn-primary" onClick={startShift}>
                    Clock in
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedMission && selectedCall && (
            <CallBriefing
              mission={selectedMission}
              selectedAgents={selectedAgents}
              successProbability={successProbability}
              activeSynergies={teamSynergies.filter((synergy) => synergy.level > 0)}
              onRemoveAgent={toggleAgentSelection}
              onDeploy={handleDeploy}
              onClose={closeBriefing}
              prismAvailable={uplinks.prismAvailable}
              onPrismExtend={uplinks.onPrismExtend}
              malevolaAvailable={uplinks.malevolaAvailable}
              onMalevolaReveal={uplinks.onMalevolaReveal}
              requirementsRevealed={uplinks.requirementsRevealed}
            />
          )}

          {disruptionMission?.mission.disruption && (
            <div className="dm-overlay">
              <DisruptionWindow
                mission={disruptionMission.mission}
                disruption={disruptionMission.mission.disruption}
                deployedAgents={disruptionMission.agents}
                teamStats={sumTeamStats(disruptionMission.agents.map((a) => getEffectiveStats(a)))}
                onResolve={handleDisruptionResolve}
                onContinue={handleDisruptionContinue}
              />
            </div>
          )}

          {openReport && (
            <div className="dm-overlay">
              <CallReport report={openReport} agents={agents} onDismiss={handleDismissReport} />
            </div>
          )}

          {showReview && (
            <div className="dm-overlay">
              <div className="dm-overlay-window">
                <ShiftReview
                  tally={shift.tally}
                  pendingMissions={shift.activeMissions.length}
                  rewards={shiftRewards}
                  statPointAgentName={statPointAgentName}
                  rank={rankReview}
                  onNewShift={startShift}
                />
              </div>
            </div>
          )}
        </TorranceMap>
      </div>

      <RosterBar
        agents={agents}
        activeMissions={shift.activeMissions}
        reports={reports}
        now={now}
        selecting={!!selectedMission}
        selectedIds={new Set(selectedAgents.map((a) => a.id))}
        canSelect={canSelectAgent}
        onToggle={toggleAgentSelection}
        onOpenReport={handleOpenReport}
        xpPops={xpPops}
        defibAvailable={
          userProgress.defibrillators > 0 && userProgress.defibUsedShift !== currentShiftNumber
        }
        onDefib={(agent) => {
          if (consumeDefibrillator(currentShiftNumber)) {
            healAgent(agent.id);
          }
        }}
      />

      {(idle || showReview) && userProgress.shiftSummaries.length > 0 && (
        <div className="dm-history sdn-window">
          <div className="sdn-window-title">SHIFT.LOG</div>
          <div className="sdn-window-body">
            <ShiftHistorySection summaries={userProgress.shiftSummaries} allAgents={agents} />
          </div>
        </div>
      )}
    </div>
  );
}
