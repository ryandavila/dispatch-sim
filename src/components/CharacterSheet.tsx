import { motion } from 'framer-motion';
import type { Character } from '../types/character';
import { calculateTotalAllocatedPoints, POINTS_PER_LEVEL } from '../types/character';
import type { PillarType } from '../types/stats';
import { PILLARS } from '../types/stats';
import { RadarChart } from './RadarChart';

interface CharacterSheetProps {
  character: Character;
  onUpdateCharacter: (character: Character) => void;
}

export function CharacterSheet({ character, onUpdateCharacter }: CharacterSheetProps) {
  const _allocatedPoints = calculateTotalAllocatedPoints(character.stats);
  const canAllocate = character.availablePoints > 0;

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

  const handleDecreaseStat = (pillar: PillarType) => {
    // Can't go below 1 (base stat)
    if (character.stats[pillar] <= 1) return;

    const updatedCharacter = {
      ...character,
      stats: {
        ...character.stats,
        [pillar]: character.stats[pillar] - 1,
      },
      availablePoints: character.availablePoints + 1,
    };

    onUpdateCharacter(updatedCharacter);
  };

  const handleLevelUp = () => {
    const updatedCharacter = {
      ...character,
      level: character.level + 1,
      availablePoints: character.availablePoints + POINTS_PER_LEVEL,
    };

    onUpdateCharacter(updatedCharacter);
  };

  return (
    <div className="character-sheet">
      <div className="character-header">
        <h2>{character.name}</h2>
        <div className="character-level">
          <span>Level {character.level}</span>
          <button type="button" onClick={handleLevelUp} className="level-up-btn">
            Level Up
          </button>
        </div>
      </div>

      <div className="points-info">
        <span className="available-points">
          Available Points: <strong>{character.availablePoints}</strong>
        </span>
      </div>

      <div className="character-content">
        <div className="radar-section">
          <RadarChart
            stats={character.stats}
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
                <button
                  type="button"
                  onClick={() => handleDecreaseStat(pillar)}
                  disabled={character.stats[pillar] <= 1}
                  className="stat-button decrease"
                  aria-label={`Decrease ${pillar}`}
                >
                  −
                </button>
                <motion.span
                  className="stat-value"
                  key={character.stats[pillar]}
                  initial={{ scale: 1.5, color: '#14b8a6' }}
                  animate={{ scale: 1, color: '#2a2419' }}
                  transition={{ duration: 0.3 }}
                >
                  {character.stats[pillar]}
                </motion.span>
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
