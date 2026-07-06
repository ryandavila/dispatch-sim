/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { StatPool } from '../types/stats';
import { OverlayRadarChart } from './OverlayRadarChart';

const REQUIRED_STATS: StatPool = { Combat: 6, Vigor: 2, Mobility: 3, Charisma: 1, Intellect: 4 };
const TEAM_STATS: StatPool = { Combat: 4, Vigor: 5, Mobility: 2, Charisma: 3, Intellect: 7 };

const LAYERS = [
  { stats: REQUIRED_STATS, color: 'rgba(217, 119, 6, 0.35)', label: 'Required', fillOpacity: 0.3 },
  { stats: TEAM_STATS, color: 'rgba(20, 184, 166, 0.5)', label: 'Team', fillOpacity: 0.3 },
];

describe('OverlayRadarChart hover readout', () => {
  it('shows no numeric readout before any pillar is hovered', () => {
    render(<OverlayRadarChart layers={LAYERS} size={190} />);

    expect(screen.queryByText(/REQUIRED 6/)).not.toBeInTheDocument();
    expect(screen.queryByText(/TEAM 4/)).not.toBeInTheDocument();
  });

  it('reveals both the requirement and team values for the hovered pillar', () => {
    render(<OverlayRadarChart layers={LAYERS} size={190} />);

    fireEvent.mouseEnter(screen.getByTestId('overlay-radar-hit-Combat'));

    expect(screen.getByText('REQUIRED 6')).toBeInTheDocument();
    expect(screen.getByText('TEAM 4')).toBeInTheDocument();
  });

  it('reads out a different pillar correctly when hovering elsewhere', () => {
    render(<OverlayRadarChart layers={LAYERS} size={190} />);

    fireEvent.mouseEnter(screen.getByTestId('overlay-radar-hit-Intellect'));

    expect(screen.getByText('REQUIRED 4')).toBeInTheDocument();
    expect(screen.getByText('TEAM 7')).toBeInTheDocument();
    expect(screen.queryByText('REQUIRED 6')).not.toBeInTheDocument();
  });

  it('hides the readout again once the pointer leaves the pillar', () => {
    render(<OverlayRadarChart layers={LAYERS} size={190} />);

    const hitArea = screen.getByTestId('overlay-radar-hit-Combat');
    fireEvent.mouseEnter(hitArea);
    expect(screen.getByText('REQUIRED 6')).toBeInTheDocument();

    fireEvent.mouseLeave(hitArea);
    expect(screen.queryByText('REQUIRED 6')).not.toBeInTheDocument();
    expect(screen.queryByText('TEAM 4')).not.toBeInTheDocument();
  });

  it('supports a single layer (e.g. the archive view with no team overlay)', () => {
    render(<OverlayRadarChart layers={[LAYERS[0]]} size={300} />);

    fireEvent.mouseEnter(screen.getByTestId('overlay-radar-hit-Mobility'));

    expect(screen.getByText('REQUIRED 3')).toBeInTheDocument();
  });
});
