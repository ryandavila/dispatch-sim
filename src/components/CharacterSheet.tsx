import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { getEffectiveStats, getInjuryCount, isDowned, isInjured } from '../engine/injury';
import type { Character } from '../types/character';
import {
  getExperienceForLevel,
  getExperienceForNextLevel,
  isExperienceCapped,
} from '../types/character';
import type { StatPool } from '../types/stats';
import { HeroPortrait } from './HeroPortrait';
import { RadarChart } from './RadarChart';
import { STAT_ROW_ORDER, StatIcon } from './statIcons';

interface CharacterSheetProps {
  character: Character;
  medKits: number;
  onUpdateCharacter: (character: Character) => void;
  onHealCharacter: (character: Character) => void;
  /** Defibrillator stock; the defib action only ever shows for downed heroes. */
  defibrillators: number;
  /** False once the one-per-shift defib charge has been spent. */
  defibAvailableThisShift: boolean;
  onDefibrillate: (character: Character) => void;
}

/** Alliterative role epithet per hero, shown under the hero name (e.g. "MERCILESS MERCENARY"). */
const HERO_EPITHETS: Record<string, string> = {
  sonar: 'SNEAKY SHAPESHIFTER',
  flambae: 'FEROCIOUS FIREBRAND',
  'punch-up': 'UNBREAKABLE BRAWLER',
  prism: 'PRISMATIC PERSUADER',
  invisigal: 'INVISIBLE INFILTRATOR',
  coupe: 'MERCILESS MERCENARY',
  malevola: 'MERCIFUL MENACE',
  golem: 'STALWART STONE-SKIN',
  phenomaman: 'PEERLESS POWERHOUSE',
  waterboy: 'FLUID FIXER',
};

type TabId = 'upgrade' | 'powers' | 'info';

const TABS: { id: TabId; label: string }[] = [
  { id: 'upgrade', label: 'Upgrade' },
  { id: 'powers', label: 'Powers' },
  { id: 'info', label: 'Info' },
];

interface InjuryAlertStripProps {
  character: Character;
  downed: boolean;
  medKits: number;
  onHealCharacter: (character: Character) => void;
  defibrillators: number;
  defibAvailableThisShift: boolean;
  onDefibrillate: (character: Character) => void;
}

/** Injury banner: bandage action (disabled once downed) + defib action (downed only). */
function InjuryAlertStrip({
  character,
  downed,
  medKits,
  onHealCharacter,
  defibrillators,
  defibAvailableThisShift,
  onDefibrillate,
}: InjuryAlertStripProps) {
  const bandageTitle = downed
    ? 'Downed — needs a defibrillator'
    : medKits <= 0
      ? 'No bandages left'
      : 'Clear all injuries';
  const defibTitle =
    defibrillators <= 0
      ? 'No defibrillators left'
      : !defibAvailableThisShift
        ? 'Already used a defibrillator this shift'
        : 'Revive and clear all injuries';

  return (
    <div className="hs-alert-strip">
      <span className="hs-alert-text">
        {downed
          ? `Downed — cannot deploy (−${getInjuryCount(character)} to all stats)`
          : 'Injured — −1 to all stats'}
      </span>
      <div className="hs-alert-actions">
        <button
          type="button"
          className="sdn-btn"
          onClick={() => onHealCharacter(character)}
          disabled={downed || medKits <= 0}
          title={bandageTitle}
        >
          Use Bandage ({medKits} left)
        </button>
        {downed && (
          <button
            type="button"
            className="sdn-btn sdn-btn-danger"
            onClick={() => onDefibrillate(character)}
            disabled={defibrillators <= 0 || !defibAvailableThisShift}
            title={defibTitle}
          >
            Use Defibrillator ({defibrillators} left)
          </button>
        )}
      </div>
    </div>
  );
}

export function CharacterSheet({
  character,
  medKits,
  onUpdateCharacter,
  onHealCharacter,
  defibrillators,
  defibAvailableThisShift,
  onDefibrillate,
}: CharacterSheetProps) {
  const [activeTab, setActiveTab] = useState<TabId>('upgrade');
  // Staged (pending, unconfirmed) allocation, keyed by pillar. Cleared on
  // RESET, on CONFIRM, and whenever the selected character changes.
  const [pending, setPending] = useState<StatPool>({
    Combat: 0,
    Vigor: 0,
    Mobility: 0,
    Charisma: 0,
    Intellect: 0,
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: character.id is the deliberate trigger — pending allocation resets when switching heroes
  useEffect(() => {
    setPending({ Combat: 0, Vigor: 0, Mobility: 0, Charisma: 0, Intellect: 0 });
  }, [character.id]);

  const injured = isInjured(character);
  const downed = isDowned(character);
  const effectiveStats = getEffectiveStats(character);

  const pendingTotal = Object.values(pending).reduce((sum, v) => sum + v, 0);
  const unspent = character.availablePoints - pendingTotal;

  const previewStats: StatPool = {
    Combat: effectiveStats.Combat + pending.Combat,
    Vigor: effectiveStats.Vigor + pending.Vigor,
    Mobility: effectiveStats.Mobility + pending.Mobility,
    Charisma: effectiveStats.Charisma + pending.Charisma,
    Intellect: effectiveStats.Intellect + pending.Intellect,
  };

  const handleAddPending = (pillar: keyof StatPool) => {
    if (unspent <= 0) return;
    setPending((prev) => ({ ...prev, [pillar]: prev[pillar] + 1 }));
  };

  const handleRemovePending = (pillar: keyof StatPool) => {
    setPending((prev) => {
      if (prev[pillar] <= 0) return prev;
      return { ...prev, [pillar]: prev[pillar] - 1 };
    });
  };

  const handleReset = () => {
    setPending({ Combat: 0, Vigor: 0, Mobility: 0, Charisma: 0, Intellect: 0 });
  };

  const handleConfirm = () => {
    if (pendingTotal <= 0) return;
    const updatedCharacter: Character = {
      ...character,
      stats: {
        Combat: character.stats.Combat + pending.Combat,
        Vigor: character.stats.Vigor + pending.Vigor,
        Mobility: character.stats.Mobility + pending.Mobility,
        Charisma: character.stats.Charisma + pending.Charisma,
        Intellect: character.stats.Intellect + pending.Intellect,
      },
      availablePoints: character.availablePoints - pendingTotal,
    };
    onUpdateCharacter(updatedCharacter);
    handleReset();
  };

  const epithet = HERO_EPITHETS[character.id] ?? 'FIELD AGENT';

  const xpForCurrentLevel = getExperienceForLevel(character.level, character.xpToLevel2);
  const xpForNextLevel = getExperienceForNextLevel(character.level, character.xpToLevel2);
  const xpIntoCurrentLevel = character.experience - xpForCurrentLevel;
  const xpNeededForLevel = xpForNextLevel - xpForCurrentLevel;
  const isCapped = isExperienceCapped(character);
  const xpProgress = isCapped ? 100 : (xpIntoCurrentLevel / xpNeededForLevel) * 100;

  return (
    <div className="hs-file">
      {/* LEFT: portrait panel */}
      <div className="sdn-window hs-portrait-panel">
        <div className="hs-portrait-art">
          <HeroPortrait heroId={character.id} size={260} />
        </div>
        <div>
          <h2 className="hs-hero-name">{character.name}</h2>
          <p className="hs-hero-subtitle">
            {epithet} <span aria-hidden="true">|</span>{' '}
            <span className="hs-rank">RANK {character.level}</span>
          </p>
        </div>
        {character.tags && character.tags.length > 0 && (
          <div className="hs-chip-row">
            {character.tags.map((tag) => (
              <span key={tag} className="sdn-chip">
                {tag}
              </span>
            ))}
          </div>
        )}
        {injured && (
          <InjuryAlertStrip
            character={character}
            downed={downed}
            medKits={medKits}
            onHealCharacter={onHealCharacter}
            defibrillators={defibrillators}
            defibAvailableThisShift={defibAvailableThisShift}
            onDefibrillate={onDefibrillate}
          />
        )}
      </div>

      {/* CENTER: tab strip + panel */}
      <div className="hs-center">
        <div className="hs-tabstrip">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`hs-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="hs-tab-star">★</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="hs-tab-panel">
          <AnimatePresence initial={false}>
            {activeTab === 'upgrade' && (
              <motion.div
                key="upgrade"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <div className="hs-points-strip">
                  <span className="hs-star">★</span>
                  {`SKILL POINTS UNSPENT: ${unspent}`}
                </div>
                <div className="hs-stat-rows">
                  {STAT_ROW_ORDER.map((pillar) => (
                    <div key={pillar} className="hs-stat-row">
                      <span className="hs-stat-row-icon">
                        <StatIcon pillar={pillar} size={20} />
                      </span>
                      <span className="hs-stat-row-label">{pillar}</span>
                      <div className="hs-stepper">
                        <button
                          type="button"
                          className="hs-stepper-btn"
                          onClick={() => handleRemovePending(pillar)}
                          disabled={pending[pillar] <= 0}
                          aria-label={`Remove pending ${pillar} point`}
                        >
                          −
                        </button>
                        <span className="hs-stepper-value">
                          {effectiveStats[pillar]}
                          {pending[pillar] > 0 && (
                            <span className="hs-pending"> (+{pending[pillar]})</span>
                          )}
                        </span>
                        <button
                          type="button"
                          className="hs-stepper-btn"
                          onClick={() => handleAddPending(pillar)}
                          disabled={unspent <= 0}
                          aria-label={`Increase ${pillar}`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hs-upgrade-actions">
                  <button
                    type="button"
                    className="sdn-btn"
                    onClick={handleReset}
                    disabled={pendingTotal <= 0}
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    className="sdn-btn sdn-btn-primary"
                    onClick={handleConfirm}
                    disabled={pendingTotal <= 0}
                  >
                    Confirm
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'powers' && (
              <motion.div
                key="powers"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {character.notes && <p className="hs-powers-notes">{character.notes}</p>}
                <div className="hs-powers-badges">
                  {character.canFly && <span className="sdn-chip">Flight</span>}
                  {character.isFlightLicensed && <span className="sdn-chip">Flight Licensed</span>}
                  {!character.canFly && !character.isFlightLicensed && (
                    <span className="sdn-chip">Grounded</span>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'info' && (
              <motion.div
                key="info"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <div className="hs-info-row">
                  <span className="hs-info-row-label">Level</span>
                  <span className="hs-info-row-value">{character.level}</span>
                </div>
                <div className="hs-info-row">
                  <span className="hs-info-row-label">Experience</span>
                  <span className="hs-info-row-value">
                    {isCapped
                      ? `${character.experience} XP (MAX)`
                      : `${xpIntoCurrentLevel} / ${xpNeededForLevel} XP`}
                  </span>
                </div>
                <div className="hs-xp-bar-track">
                  <div
                    className="hs-xp-bar-fill"
                    style={{ width: `${Math.min(100, Math.max(0, xpProgress))}%` }}
                  />
                </div>
                {character.fixedRank && (
                  <p className="hs-fixed-rank-note">RANK FIXED — NO FACTORING</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* RIGHT: graph window */}
      <div className="sdn-window hs-graph-window">
        <div className="sdn-window-title">{character.name}.GRAPH</div>
        <div className="sdn-window-body">
          <RadarChart
            stats={effectiveStats}
            previewStats={pendingTotal > 0 ? previewStats : undefined}
            maxValue={10}
            size={340}
          />
        </div>
      </div>
    </div>
  );
}
