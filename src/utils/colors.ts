import type { Mission } from '../types/mission';

/**
 * Color for a mission difficulty badge.
 */
export function getDifficultyColor(difficulty: Mission['difficulty']): string {
  switch (difficulty) {
    case 'Easy':
      return '#22c55e';
    case 'Medium':
      return '#f59e0b';
    case 'Hard':
      return '#d97706';
    case 'Extreme':
      return '#ef4444';
  }
}

/**
 * Color for a success probability readout (probability in 0-1).
 */
export function getSuccessColor(probability: number): string {
  if (probability >= 0.8) return '#22c55e';
  if (probability >= 0.5) return '#f59e0b';
  if (probability >= 0.3) return '#d97706';
  return '#ef4444';
}
