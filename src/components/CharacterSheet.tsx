import { motion } from 'framer-motion';
import { getEffectiveStats, getInjuryCount, isDowned, isInjured } from '../engine/injury';
import type { Character } from '../types/character';
import { calculateTotalAllocatedPoints } from '../types/character';
import type { PillarType } from '../types/stats';
import { PILLARS } from '../types/stats';
import { RadarChart } from './RadarChart';

interface CharacterSheetProps {
  character: Character;
  medKits: number;
  onUpdateCharacter: (character: Character) => void;
  onHealCharacter: (character: Character) => void;
}

export function CharacterSheet({
  character,
  medKits,
  onUpdateCharacter,
  onHealCharacter,
}: CharacterSheetProps) {
  const _allocatedPoints = calculateTotalAllocatedPoints(character.stats);
  const canAllocate = character.availablePoints > 0;
  const injured = isInjured(character);
  const downed = isDowned(character);
  const effectiveStats = getEffectiveStats(character);

  const handleIncreaseStat = (pillar: PillarType) => {
    if (character.availablePoints <= 0) return;

    const updatedCharacter = {
      ...character,
      stats: {
        ...character.stats,
        [pillar]: character.stats[pillar] + 1,
      },
      availablePoints: character.availablePoints - 1,
    };

    onUpdateCharacter(updatedCharacter);
  };

  return (
    <div className="character-sheet">
      <div className="character-header">
        <h2>{character.name}</h2>
        <div className="character-level">
          <span>Level {character.level}</span>
        </div>
      </div>

      {injured && (
        <div className={`injury-banner ${downed ? 'downed' : ''}`}>
          <span className="injury-status">
            {downed
              ? `⛔ Downed — cannot deploy (−${getInjuryCount(character)} to all stats)`
              : '🩹 Injured — −1 to all stats'}
          </span>
          <button
            type="button"
            className="heal-button"
            onClick={() => onHealCharacter(character)}
            disabled={medKits <= 0}
            title={medKits <= 0 ? 'No med kits left' : 'Clear all injuries'}
          >
            Use Med Kit ({medKits} left)
          </button>
        </div>
      )}

      <div className="points-info">
        <span className="available-points">
          Available Points: <strong>{character.availablePoints}</strong>
        </span>
      </div>

      <div className="character-content">
        <div className="radar-section">
          <RadarChart
            stats={effectiveStats}
            maxValue={10}
            size={400}
            onVertexClick={handleIncreaseStat}
          />
        </div>

        <div className="stats-list">
          {PILLARS.map((pillar) => (
            <motion.div
              key={pillar}
              className="stat-row"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <span className="stat-name">{pillar}</span>
              <div className="stat-controls">
                <motion.span
                  className="stat-value"
                  key={effectiveStats[pillar]}
                  initial={{ scale: 1.5, color: '#14b8a6' }}
                  animate={{ scale: 1, color: '#2a2419' }}
                  transition={{ duration: 0.3 }}
                >
                  {effectiveStats[pillar]}
                </motion.span>
                {effectiveStats[pillar] !== character.stats[pillar] && (
                  <span
                    className="stat-allocated"
                    title={`Allocated ${character.stats[pillar]}, reduced by injury`}
                  >
                    ({character.stats[pillar]})
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleIncreaseStat(pillar)}
                  disabled={!canAllocate}
                  className="stat-button increase"
                  aria-label={`Increase ${pillar}`}
                >
                  +
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
