// Shared inline SVG glyphs for the five stat pillars. Used by the stat rows
// on the hero-file UPGRADE tab and at each vertex of the radar/pentagon
// graphs, so the same glyph always means the same stat everywhere.

import type { ReactElement } from 'react';
import type { PillarType } from '../types/stats';

export interface StatIconProps {
  /** Rendered square size in px. Defaults to 16. */
  size?: number;
  /** Stroke/fill color. Defaults to currentColor. */
  color?: string;
}

function VigorIcon({ size = 16, color = 'currentColor' }: StatIconProps) {
  // Shield
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2.5 20 6v6c0 5-3.4 8.7-8 9.5C7.4 20.7 4 17 4 12V6l8-3.5Z"
        fill={color}
        stroke={color}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MobilityIcon({ size = 16, color = 'currentColor' }: StatIconProps) {
  // Runner
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="14.5" cy="4.5" r="2.1" fill={color} />
      <path
        d="M9 21l2.6-5.4-2-2.4.9-5.2c1.6.3 2 1.6 3.6 1.9l3.4 1-.7 2.1-3-.9-1.6 3.1L15 18l3.4 1.1-.7 2.1-4.6-1.5-1 1.3H9Z"
        fill={color}
      />
      <path d="M8 9.5 4.5 12l1.3 1.8L10 11z" fill={color} />
    </svg>
  );
}

function CharismaIcon({ size = 16, color = 'currentColor' }: StatIconProps) {
  // Speech bubble
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 5.5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H10l-4.2 3.4a.6.6 0 0 1-1-.47V16.5H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z"
        fill={color}
        stroke={color}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IntellectIcon({ size = 16, color = 'currentColor' }: StatIconProps) {
  // Brain
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9.5 3.2c-1.8 0-3.2 1.4-3.3 3.1C4.7 6.7 3.7 8 3.7 9.6c0 1 .4 1.9 1 2.5-.3.5-.5 1.1-.5 1.8 0 1.7 1.3 3.1 3 3.3.3 1.6 1.7 2.8 3.4 2.8 1 0 1.9-.4 2.5-1.1V4.9c-.6-1-1.7-1.7-3-1.7Z"
        fill={color}
      />
      <path
        d="M14.5 3.2c1.8 0 3.2 1.4 3.3 3.1 1.5.4 2.5 1.7 2.5 3.3 0 1-.4 1.9-1 2.5.3.5.5 1.1.5 1.8 0 1.7-1.3 3.1-3 3.3-.3 1.6-1.7 2.8-3.4 2.8-1 0-1.9-.4-2.5-1.1V4.9c.6-1 1.7-1.7 3-1.7Z"
        fill={color}
      />
    </svg>
  );
}

function CombatIcon({ size = 16, color = 'currentColor' }: StatIconProps) {
  // Fist
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 9.2V7.6a1.4 1.4 0 1 1 2.8 0v-.8a1.4 1.4 0 1 1 2.8 0v.4a1.4 1.4 0 1 1 2.8 0v.9a1.3 1.3 0 1 1 2.6.2v4.2c0 3.4-2.6 6-6.3 6-2.4 0-3.9-.9-5-2.4l-2.4-3.3a1.3 1.3 0 0 1 2.1-1.5l1.1 1.3V9.2a1.4 1.4 0 1 1 2.8 0Z"
        fill={color}
        stroke={color}
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Pillar → glyph component, in the game's canonical stat-row order. */
export const STAT_ICONS: Record<PillarType, (props: StatIconProps) => ReactElement> = {
  Vigor: VigorIcon,
  Mobility: MobilityIcon,
  Charisma: CharismaIcon,
  Intellect: IntellectIcon,
  Combat: CombatIcon,
};

/** Display order used throughout the hero-file screen (matches the reference game). */
export const STAT_ROW_ORDER: PillarType[] = [
  'Vigor',
  'Mobility',
  'Charisma',
  'Intellect',
  'Combat',
];

export function StatIcon({
  pillar,
  size = 16,
  color = 'currentColor',
}: { pillar: PillarType } & StatIconProps): ReactElement {
  const Icon = STAT_ICONS[pillar];
  return <Icon size={size} color={color} />;
}
