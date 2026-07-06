import { getEffectiveStats } from '../../engine/injury';
import { combineTeamStats } from '../../engine/resolution';
import { SYNERGY_BONUS_PER_LEVEL, type TeamSynergy } from '../../engine/synergy';
import type { Character } from '../../types/character';
import type { Mission } from '../../types/mission';
import { getDifficultyColor, getSuccessColor } from '../../utils/colors';
import { HeroPortrait } from '../HeroPortrait';
import { OverlayRadarChart } from '../OverlayRadarChart';
import { RadarChart } from '../RadarChart';

interface CallBriefingProps {
  mission: Mission;
  selectedAgents: Character[];
  successProbability: number;
  activeSynergies: TeamSynergy[];
  onRemoveAgent: (agent: Character) => void;
  onDeploy: () => void;
  onClose: () => void;
  /** Whether Prism's signature power (extend this call's countdown) is available. */
  prismAvailable?: boolean;
  onPrismExtend?: () => void;
  /** Whether Malevola's signature power (reveal the requirement pentagon) is available. */
  malevolaAvailable?: boolean;
  onMalevolaReveal?: () => void;
  /** True once Malevola's uplink has revealed this call's requirement graph. */
  requirementsRevealed?: boolean;
}

/**
 * The call briefing window: dispatcher flavor text with stat-hinting keywords
 * highlighted, the team slots, and the projected odds. As in the real game,
 * the requirement pentagon stays hidden until the post-call report.
 */
export function CallBriefing({
  mission,
  selectedAgents,
  successProbability,
  activeSynergies,
  onRemoveAgent,
  onDeploy,
  onClose,
  prismAvailable,
  onPrismExtend,
  malevolaAvailable,
  onMalevolaReveal,
  requirementsRevealed,
}: CallBriefingProps) {
  const slots = Array.from({ length: mission.maxAgents }, (_, i) => selectedAgents[i] ?? null);
  const teamStats =
    selectedAgents.length > 0
      ? combineTeamStats(selectedAgents.map((a) => getEffectiveStats(a)))
      : null;

  return (
    <section className="dm-briefing sdn-window" aria-label={`Call briefing: ${mission.name}`}>
      <div className="sdn-window-title">
        CALL.BRIEFING
        <span className="sdn-window-title-spacer" />
        <button type="button" className="sdn-btn dm-briefing-close" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="sdn-window-body">
        <div className="dm-briefing-scroll">
          <h3 className="dm-briefing-name">{mission.name}</h3>
          <div className="dm-briefing-meta">
            <span
              className="dm-difficulty"
              style={{ backgroundColor: getDifficultyColor(mission.difficulty) }}
            >
              {mission.difficulty}
            </span>
            {mission.location && (
              <span className="dm-briefing-loc">LOC: {mission.location.name}</span>
            )}
            <span className="dm-briefing-loc">REWARD: {mission.rewards?.experience ?? 0} XP</span>
          </div>

          <p className="dm-briefing-text">
            {renderBriefing(mission.briefing ?? mission.description)}
          </p>

          <div className="dm-slots">
            {slots.map((agent, i) =>
              agent ? (
                <button
                  key={agent.id}
                  type="button"
                  className="dm-slot filled"
                  onClick={() => onRemoveAgent(agent)}
                  aria-label={`Remove ${agent.name} from the team`}
                >
                  <HeroPortrait heroId={agent.id} size={52} />
                </button>
              ) : (
                <span key={`empty-${i}`} className="dm-slot" aria-hidden="true">
                  +
                </span>
              )
            )}
            <span className="dm-slot-hint">
              {selectedAgents.length === 0
                ? 'SELECT HEROES FROM THE ROSTER BELOW'
                : `${selectedAgents.length}/${mission.maxAgents} ASSIGNED`}
            </span>
          </div>

          {activeSynergies.length > 0 && (
            <div className="dm-synergy">
              {activeSynergies.map((s) => (
                <span key={s.pair.join('+')} className="sdn-chip">
                  ⚡ {formatPair(s.pair)} +{Math.round(s.level * SYNERGY_BONUS_PER_LEVEL * 100)}%
                </span>
              ))}
            </div>
          )}

          {teamStats && !requirementsRevealed && (
            <div className="dm-briefing-chart">
              <RadarChart stats={teamStats} size={190} />
            </div>
          )}

          {(onPrismExtend || onMalevolaReveal) && (
            <div className="dm-uplinks">
              <div className="dm-uplinks-label">SIGNATURE UPLINKS</div>
              <div className="dm-uplinks-row">
                {onPrismExtend && (
                  <button
                    type="button"
                    className="sdn-chip dm-uplink-chip"
                    disabled={!prismAvailable}
                    onClick={onPrismExtend}
                    title="Extend this call's countdown by 10 seconds. Once per shift."
                  >
                    {prismAvailable ? 'Prism — Extend Window +10s' : 'Prism — Used This Shift'}
                  </button>
                )}
                {onMalevolaReveal && (
                  <button
                    type="button"
                    className="sdn-chip dm-uplink-chip"
                    disabled={!malevolaAvailable}
                    onClick={onMalevolaReveal}
                    title="Reveal this call's hidden requirement graph. Once per shift."
                  >
                    {malevolaAvailable || requirementsRevealed
                      ? 'Malevola — Reveal Requirements'
                      : 'Malevola — Used This Shift'}
                  </button>
                )}
              </div>
            </div>
          )}

          {requirementsRevealed ? (
            <div className="dm-briefing-chart">
              <OverlayRadarChart
                layers={[
                  {
                    stats: mission.requirements,
                    color: 'rgba(217, 119, 6, 0.35)',
                    label: 'Required',
                    fillOpacity: 0.3,
                  },
                  ...(teamStats
                    ? [
                        {
                          stats: teamStats,
                          color: 'rgba(20, 184, 166, 0.5)',
                          label: 'Team',
                          fillOpacity: 0.3,
                        },
                      ]
                    : []),
                ]}
                size={190}
              />
              <div className="dm-briefing-classified dm-uplink-classified">
                MALEVOLA UPLINK — REQUIREMENT GRAPH
              </div>
            </div>
          ) : (
            <div className="dm-briefing-classified">
              REQUIREMENT GRAPH CLASSIFIED — REVEALED IN THE CALL REPORT
            </div>
          )}

          <div className="dm-prob-row">
            <span className="dm-prob-label">Projected success</span>
            <span
              className="dm-prob-value"
              style={{ color: getSuccessColor(successProbability) }}
              data-testid="briefing-probability"
            >
              {selectedAgents.length > 0 ? `${Math.round(successProbability * 100)}%` : '——'}
            </span>
          </div>
        </div>

        <div className="dm-briefing-actions">
          <button type="button" className="sdn-btn" onClick={onClose}>
            Stand down
          </button>
          <button
            type="button"
            className="sdn-btn sdn-btn-primary"
            onClick={onDeploy}
            disabled={selectedAgents.length === 0}
          >
            Dispatch
          </button>
        </div>
      </div>
    </section>
  );
}

/** Render `**keyword**` markers in briefing text as highlighted spans. */
function renderBriefing(text: string) {
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

function formatPair(pair: [string, string]): string {
  return pair
    .map((id) => id.replace(/-/g, ' '))
    .join(' + ')
    .toUpperCase();
}
