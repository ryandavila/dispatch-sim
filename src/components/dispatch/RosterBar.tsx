import { AnimatePresence, motion } from 'framer-motion';
import { getInjuryCount, isDowned, isInjured } from '../../engine/injury';
import type { ActiveMission } from '../../types/activeMission';
import { calculateMissionProgress } from '../../types/activeMission';
import type { Character } from '../../types/character';
import { HeroPortrait } from '../HeroPortrait';

export interface XpPop {
  agentId: string;
  amount: number;
  /** Unique per pop so repeat pops re-animate. */
  key: string;
}

interface RosterBarProps {
  agents: Character[];
  activeMissions: ActiveMission[];
  /** Settled missions whose report hasn't been reviewed — locks their heroes. */
  reports: ActiveMission[];
  now: number;
  /** True while a call briefing is open, making free heroes selectable. */
  selecting: boolean;
  selectedIds: Set<string>;
  /** Whether a free hero may currently be added to the team. */
  canSelect: (agent: Character) => boolean;
  onToggle: (agent: Character) => void;
  onOpenReport: (activeMissionId: string) => void;
  xpPops: XpPop[];
  /** Whether the DEFIB chip should be actionable (stock + one-per-shift charge). */
  defibAvailable?: boolean;
  /** Present only when a DEFIB chip should render at all, on downed tiles. */
  onDefib?: (agent: Character) => void;
}

/** The hero rail along the bottom of the dispatch terminal. */
export function RosterBar({
  agents,
  activeMissions,
  reports,
  now,
  selecting,
  selectedIds,
  canSelect,
  onToggle,
  onOpenReport,
  xpPops,
  defibAvailable,
  onDefib,
}: RosterBarProps) {
  const busyBy = new Map<string, ActiveMission>();
  for (const m of activeMissions) {
    for (const a of m.agents) {
      busyBy.set(a.id, m);
    }
  }
  const reportBy = new Map<string, ActiveMission>();
  for (const m of reports) {
    for (const a of m.agents) {
      reportBy.set(a.id, m);
    }
  }

  return (
    <div className="dm-roster" data-testid="roster-bar">
      {agents.map((agent) => {
        const downed = isDowned(agent);
        const mission = busyBy.get(agent.id);
        const report = reportBy.get(agent.id);
        const selected = selectedIds.has(agent.id);
        const selectable = selecting && !downed && !mission && !report;

        const handleClick = () => {
          if (report) {
            onOpenReport(report.id);
            return;
          }
          if (selecting && (selected || (selectable && canSelect(agent)))) {
            onToggle(agent);
          }
        };

        const showDefib = downed && !!onDefib;

        return (
          <HeroCard
            key={agent.id}
            agent={agent}
            downed={downed}
            selected={selected}
            report={report}
            dimmed={selecting && !selectable && !selected}
            meter={mission ? 1 - calculateMissionProgress(mission, now).totalProgress : null}
            disabled={downed || (!report && !selecting)}
            ariaPressed={selecting ? selected : undefined}
            ariaLabel={rosterAriaLabel(agent, { downed, busy: !!mission, report: !!report })}
            busy={!!mission}
            pops={xpPops.filter((p) => p.agentId === agent.id)}
            onClick={handleClick}
            showDefib={showDefib}
            defibDisabled={!defibAvailable}
            onDefibClick={onDefib ? () => onDefib(agent) : undefined}
          />
        );
      })}
    </div>
  );
}

interface HeroCardProps {
  agent: Character;
  downed: boolean;
  busy: boolean;
  selected: boolean;
  dimmed: boolean;
  report: ActiveMission | undefined;
  meter: number | null;
  disabled: boolean;
  ariaPressed: boolean | undefined;
  ariaLabel: string;
  pops: XpPop[];
  onClick: () => void;
  /** Renders a DEFIB action chip on this (downed) tile. */
  showDefib: boolean;
  defibDisabled: boolean;
  onDefibClick: (() => void) | undefined;
}

function HeroCard({
  agent,
  downed,
  busy,
  selected,
  dimmed,
  report,
  meter,
  disabled,
  ariaPressed,
  ariaLabel,
  pops,
  onClick,
  showDefib,
  defibDisabled,
  onDefibClick,
}: HeroCardProps) {
  const classes = [
    'dm-hero',
    selected && 'selected',
    busy && 'busy',
    report && 'report-locked',
    downed && 'downed',
    dimmed && 'dimmed',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="dm-hero-slot">
      <button
        type="button"
        className={classes}
        onClick={onClick}
        disabled={disabled}
        aria-pressed={ariaPressed}
        aria-label={ariaLabel}
      >
        {meter !== null && (
          <span className="dm-hero-meter" aria-hidden="true">
            <span className="dm-hero-meter-fill" style={{ width: `${meter * 100}%` }} />
          </span>
        )}
        <span className="dm-hero-portrait" aria-hidden="true">
          <HeroPortrait heroId={agent.id} size={88} />
        </span>
        <span className="dm-hero-name">{agent.name}</span>
        <span className="dm-hero-rank" aria-hidden="true">
          R{agent.level}
        </span>
        <span
          className={`dm-hero-star${agent.availablePoints > 0 ? ' has-points' : ''}`}
          aria-hidden="true"
        >
          ★
        </span>
        {isInjured(agent) && !downed && (
          <span className="dm-hero-injury" title={`Injured ×${getInjuryCount(agent)}`} />
        )}
        {report && <span className="dm-hero-badge">REPORT</span>}
        <AnimatePresence>
          {pops.map((pop) => (
            <motion.span
              key={pop.key}
              className="dm-hero-xp-pop"
              initial={{ opacity: 0, y: 8, scale: 0.6 }}
              animate={{ opacity: 1, y: -14, scale: 1 }}
              exit={{ opacity: 0, y: -26 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
              +{pop.amount} XP
            </motion.span>
          ))}
        </AnimatePresence>
      </button>
      {showDefib && (
        <button
          type="button"
          className="dm-hero-defib"
          onClick={onDefibClick}
          disabled={defibDisabled}
          title={defibDisabled ? 'No defibrillator charge available' : `Revive ${agent.name}`}
        >
          DEFIB
        </button>
      )}
    </div>
  );
}

function rosterAriaLabel(
  agent: Character,
  state: { downed: boolean; busy: boolean; report: boolean }
): string {
  if (state.downed) return `${agent.name} — downed`;
  if (state.report) return `${agent.name} — report pending, click to review`;
  if (state.busy) return `${agent.name} — on a call`;
  return agent.name;
}
