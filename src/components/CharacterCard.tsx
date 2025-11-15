import { motion } from 'framer-motion';
import type { Character } from '../types/character';
import { RadarChart } from './RadarChart';

interface CharacterCardProps {
  character: Character;
  onClick?: () => void;
  isSelected?: boolean;
}

export function CharacterCard({ character, onClick, isSelected = false }: CharacterCardProps) {
  return (
    <motion.div
      className={`character-card ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="character-card-header">
        <h3>{character.name}</h3>
        <span className="character-level">Level {character.level}</span>
      </div>

      <div className="character-card-chart">
        <RadarChart stats={character.stats} maxValue={10} size={200} />
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
