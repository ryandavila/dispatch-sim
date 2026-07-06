import { useState } from 'react';
import {
  type DisruptionResolution,
  resolveDisruptionOption,
  visibleDisruptionOptions,
} from '../../engine/disruption';
import type { Character } from '../../types/character';
import type { Disruption, DisruptionOption, Mission } from '../../types/mission';
import type { StatPool } from '../../types/stats';

interface DisruptionWindowProps {
  mission: Mission;
  disruption: Disruption;
  deployedAgents: Character[];
  teamStats: StatPool;
  onResolve: (resolution: DisruptionResolution) => void;
  onContinue: () => void;
}

/**
 * CALL.DISRUPT — the mid-mission radio interruption window. Shows the radio
 * prompt with **keyword** highlights and one button per visible option (stat
 * options always shown; hero options only when that hero is deployed). Once
 * the player picks, swaps to a PASS/FAIL stamp view with the aftermath text
 * and, on success, the XP bonus that joins the mission's pool.
 *
 * Controlled/dumb: resolution is computed locally with the pure engine
 * function and reported up via `onResolve`; the parent owns whatever
 * persistence (recordDisruptionResolution into shift state) it needs.
 */
export function DisruptionWindow({
  mission,
  disruption,
  deployedAgents,
  teamStats,
  onResolve,
  onContinue,
}: DisruptionWindowProps) {
  const [resolution, setResolution] = useState<DisruptionResolution | null>(null);
  const deployedHeroIds = deployedAgents.map((a) => a.id);
  const visibleOptions = visibleDisruptionOptions(disruption, deployedHeroIds);

  const handlePick = (option: DisruptionOption) => {
    const result = resolveDisruptionOption(option, teamStats, deployedHeroIds);
    setResolution(result);
    onResolve(result);
  };

  return (
    <div
      className="dm-disrupt sdn-window"
      role="dialog"
      aria-label={`Call disruption: ${mission.name}`}
    >
      <div className="sdn-window-title">CALL.DISRUPT — {mission.name.toUpperCase()}</div>
      <div className="sdn-window-body dm-disrupt-body">
        {resolution ? (
          <DisruptionResolutionView resolution={resolution} onContinue={onContinue} />
        ) : (
          <>
            <p className="dm-briefing-text">{renderDisruptText(disruption.prompt)}</p>
            <div className="dm-disrupt-options">
              {visibleOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="sdn-btn dm-disrupt-option"
                  onClick={() => handlePick(option)}
                >
                  <span className="dm-disrupt-option-label">{option.label}</span>
                  {option.heroId ? (
                    <span className="sdn-chip dm-disrupt-chip hero">
                      {formatHeroName(option.heroId)}
                    </span>
                  ) : (
                    <span className="sdn-chip dm-disrupt-chip">
                      {formatStatAbbrev(option.stat)} {option.threshold}+
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DisruptionResolutionView({
  resolution,
  onContinue,
}: {
  resolution: DisruptionResolution;
  onContinue: () => void;
}) {
  return (
    <>
      <div className={`dm-stamp ${resolution.success ? 'ok' : 'fail'}`} data-testid="disrupt-stamp">
        {resolution.success ? 'Pass' : 'Fail'}
      </div>
      <div className="dm-report-lines sdn-readout">
        <span>{resolution.text}</span>
        {resolution.success && <span>+{resolution.xpBonus} XP TO POOL</span>}
      </div>
      <button type="button" className="sdn-btn sdn-btn-primary" onClick={onContinue}>
        Continue
      </button>
    </>
  );
}

/** Render `**keyword**` markers in disruption text as highlighted spans (same as CallBriefing). */
function renderDisruptText(text: string) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <em key={i} className="dm-kw">
        {part}
      </em>
    ) : (
      part
    )
  );
}

const STAT_ABBREV: Record<string, string> = {
  Combat: 'CBT',
  Vigor: 'VIG',
  Mobility: 'MOB',
  Charisma: 'CHA',
  Intellect: 'INT',
};

function formatStatAbbrev(stat: DisruptionOption['stat']): string {
  return stat ? (STAT_ABBREV[stat] ?? stat.slice(0, 3).toUpperCase()) : '';
}

function formatHeroName(heroId: string): string {
  return heroId.replace(/-/g, ' ').toUpperCase();
}
