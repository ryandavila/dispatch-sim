import { motion } from 'framer-motion';
import type { Character } from '../types/character';
import { getExperienceForLevel, getExperienceForNextLevel } from '../types/character';
import { RadarChart } from './RadarChart';

interface CharacterCardProps {
  character: Character;
  onClick?: () => void;
  isSelected?: boolean;
}

export function CharacterCard({ character, onClick, isSelected = false }: CharacterCardProps) {
  const xpForCurrentLevel = getExperienceForLevel(character.level);
  const xpForNextLevel = getExperienceForNextLevel(character.level);
  const xpIntoCurrentLevel = character.experience - xpForCurrentLevel;
  const xpNeededForLevel = xpForNextLevel - xpForCurrentLevel;
  const xpProgress = (xpIntoCurrentLevel / xpNeededForLevel) * 100;
  const hasLevelUp = character.availablePoints > 0;

  return (
    <motion.div
      className={`character-card ${isSelected ? 'selected' : ''} ${hasLevelUp ? 'has-level-up' : ''}`}
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="character-card-header">
        <h3>{character.name}</h3>
        <div className="character-header-right">
          <span className="character-level">Level {character.level}</span>
          {hasLevelUp && <span className="level-up-badge">⬆ Level Up!</span>}
        </div>
      </div>

      {/* XP Progress Bar */}
      <div className="character-xp-progress">
        <div className="xp-progress-bar">
          <div className="xp-progress-fill" style={{ width: `${Math.min(100, xpProgress)}%` }} />
        </div>
        <div className="xp-progress-text">
          {xpIntoCurrentLevel} / {xpNeededForLevel} XP
        </div>
      </div>

      {character.tags && character.tags.length > 0 && (
        <div className="character-card-tags">
          {character.tags.map((tag) => (
            <span key={tag} className="agent-tag">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="character-card-chart">
        <RadarChart stats={character.stats} maxValue={10} size={380} />
      </div>

      {character.notes && (
        <div className="character-card-notes">
          <p>{character.notes}</p>
        </div>
      )}

      {character.availablePoints > 0 && (
        <div className="character-card-points">
          <span className="points-badge">{character.availablePoints} points available</span>
        </div>
      )}
    </motion.div>
  );
}
