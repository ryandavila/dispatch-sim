import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { getEffectiveStats, isDowned, isInjured } from '../../engine/injury';
import { combineTeamStats } from '../../engine/resolution';
import { splitXpPool } from '../../engine/xp';
import type { ActiveMission } from '../../types/activeMission';
import type { Character } from '../../types/character';
import { PILLARS } from '../../types/stats';
import { OverlayRadarChart } from '../OverlayRadarChart';

const CHART_SIZE = 300;

interface CallReportProps {
  report: ActiveMission;
  /** Current roster state, for post-call condition readouts. */
  agents: Character[];
  onDismiss: () => void;
}

/**
 * The post-call performance report: the requirement pentagon (white outline)
 * finally revealed under the team's amber fill, with the game's resolution
 * theater — a marker bounces around the graph and lands on covered ground
 * (success) or exposed requirement (failure). Filing the report frees the
 * heroes for redeployment.
 */
export function CallReport({ report, agents, onDismiss }: CallReportProps) {
  const [revealed, setRevealed] = useState(false);
  const { mission, outcome } = report;
  const success = outcome.success;

  const teamStats = combineTeamStats(report.agents.map((a) => getEffectiveStats(a)));

  // Where the marker settles: dead center on success, out toward the most
  // under-covered stat's vertex on failure.
  const landing = useMemo(() => {
    if (success) {
      return { x: 0, y: 0 };
    }
    let worstIndex = 0;
    let worstGap = Number.NEGATIVE_INFINITY;
    PILLARS.forEach((pillar, i) => {
      const gap = mission.requirements[pillar] - teamStats[pillar];
      if (gap > worstGap) {
        worstGap = gap;
        worstIndex = i;
      }
    });
    const angle = -Math.PI / 2 + worstIndex * ((2 * Math.PI) / 5);
    const r = CHART_SIZE * 0.26;
    return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
  }, [success, mission.requirements, teamStats]);

  // A deterministic little tour of the graph before settling.
  const path = useMemo(() => {
    let h = 0;
    for (const c of report.id) {
      h = (h * 31 + c.charCodeAt(0)) | 0;
    }
    const rand = (i: number) => {
      const v = Math.sin(h + i * 97.13) * 43758.5453;
      return (v - Math.floor(v) - 0.5) * CHART_SIZE * 0.42;
    };
    return {
      x: [0, rand(1), rand(2), rand(3), rand(4), landing.x],
      y: [0, rand(5), rand(6), rand(7), rand(8), landing.y],
    };
  }, [report.id, landing]);

  // A handled disruption's bonus only pays when the call itself succeeded —
  // same gate as the actual credit in handleMissionComplete.
  const disruption = report.disruption?.resolution;
  const xp = (mission.rewards?.experience ?? 0) + (success ? (disruption?.xpBonus ?? 0) : 0);
  // The pool is split evenly across the deployed team (splitXpPool) — shares
  // can differ by 1 hero-to-hero, so each crew chip shows its actual share
  // rather than a shared/rounded number.
  const xpShares = splitXpPool(xp, report.agents.length);
  const crew = report.agents.map(
    (deployed) => agents.find((a) => a.id === deployed.id) ?? deployed
  );

  return (
    <div className="dm-report sdn-window" role="dialog" aria-label={`Call report: ${mission.name}`}>
      <div className="sdn-window-title">
        CALL.REPORT
        <span className="sdn-window-title-spacer" />
        <span className="dm-hud-status">{mission.location?.name ?? 'TORRANCE'}</span>
      </div>
      <div className="sdn-window-body dm-report-body">
        <h3 className="dm-briefing-name">{mission.name}</h3>

        <div className="dm-report-chart">
          <OverlayRadarChart
            layers={[
              {
                stats: mission.requirements,
                color: 'rgba(244, 237, 220, 0.12)',
                label: 'REQUIREMENT',
              },
              { stats: teamStats, color: 'rgba(221, 154, 43, 0.55)', label: 'TEAM' },
            ]}
            size={CHART_SIZE}
          />
          <motion.span
            className="dm-report-dot"
            style={{ left: CHART_SIZE / 2, top: CHART_SIZE / 2 }}
            initial={{ x: 0, y: 0 }}
            animate={{ x: path.x, y: path.y }}
            transition={{ duration: 1.4, ease: 'easeOut', times: [0, 0.2, 0.4, 0.6, 0.8, 1] }}
            onAnimationComplete={() => setRevealed(true)}
            aria-hidden="true"
          />
        </div>

        {revealed && (
          <>
            <div className={`dm-stamp ${success ? 'ok' : 'fail'}`} data-testid="report-stamp">
              {success ? 'Call complete' : 'Call failed'}
            </div>

            <div className="dm-report-lines sdn-readout">
              <span>
                ODDS {Math.round(outcome.probability * 100)}% · ROLL{' '}
                {(outcome.roll * 100).toFixed(1)}
              </span>
              {outcome.pityUsed && <span>BOOST CHARGE SPENT — GUARANTEE CONVERTED THIS CALL</span>}
              {disruption && (
                <span>
                  RADIO {disruption.success ? 'HANDLED' : 'FUMBLED'} — {disruption.text}
                  {success && disruption.xpBonus > 0 && ` (+${disruption.xpBonus} XP TO POOL)`}
                </span>
              )}
              {success ? (
                <span>
                  +{xp} XP{report.agents.length > 1 ? ` SPLIT ${report.agents.length} WAYS` : ''}
                </span>
              ) : (
                <span>TEAM INJURED IN THE FIELD — −1 ALL STATS EACH</span>
              )}
            </div>

            <div className="dm-report-crew">
              {crew.map((agent, i) => (
                <span key={agent.id} className="sdn-chip">
                  {agent.name}
                  {success && <span className="dm-condition">+{xpShares[i]} XP</span>}
                  {!success && (
                    <span className={`dm-condition ${isInjured(agent) ? 'hurt' : ''}`}>
                      {isDowned(agent) ? 'DOWNED' : isInjured(agent) ? 'INJURED' : ''}
                    </span>
                  )}
                </span>
              ))}
            </div>

            <button type="button" className="sdn-btn sdn-btn-primary" onClick={onDismiss}>
              File report
            </button>
          </>
        )}
      </div>
    </div>
  );
}
