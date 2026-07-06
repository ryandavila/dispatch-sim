/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ShiftReview } from './ShiftReview';

const tally = { succeeded: 5, failed: 1, missed: 0 };

describe('ShiftReview - rank block', () => {
  it('renders nothing rank-related when the rank prop is omitted', () => {
    render(<ShiftReview tally={tally} pendingMissions={0} onNewShift={vi.fn()} />);

    expect(screen.queryByText(/Dispatcher rank/)).not.toBeInTheDocument();
  });

  it('shows the current tier, score, and a positive (amber) delta', () => {
    render(
      <ShiftReview
        tally={tally}
        pendingMissions={0}
        onNewShift={vi.fn()}
        rank={{ tierName: 'DISPATCHER III', score: 30, delta: 13, promotions: [] }}
      />
    );

    expect(screen.getByText('DISPATCHER III')).toBeInTheDocument();
    expect(screen.getByText(/RANK SCORE: 30/)).toBeInTheDocument();
    const delta = screen.getByText('+13');
    expect(delta).toHaveClass('dm-rank-delta-up');
  });

  it('shows a negative (alert) delta without a leading plus sign', () => {
    render(
      <ShiftReview
        tally={{ succeeded: 0, failed: 1, missed: 2 }}
        pendingMissions={0}
        onNewShift={vi.fn()}
        rank={{ tierName: 'PROBATIONARY', score: 0, delta: -10, promotions: [] }}
      />
    );

    const delta = screen.getByText('-10');
    expect(delta).toHaveClass('dm-rank-delta-down');
  });

  it('lists promotions with their bandage and defibrillator payouts', () => {
    render(
      <ShiftReview
        tally={tally}
        pendingMissions={0}
        onNewShift={vi.fn()}
        rank={{
          tierName: 'DISPATCHER III',
          score: 30,
          delta: 13,
          promotions: [{ name: 'DISPATCHER III', bandages: 2, defibrillators: 1 }],
        }}
      />
    );

    expect(
      screen.getByText(/PROMOTED: DISPATCHER III — \+2 BANDAGES, \+1 DEFIBRILLATOR/)
    ).toBeInTheDocument();
  });

  it('does not render the rank block while missions are still pending', () => {
    render(
      <ShiftReview
        tally={tally}
        pendingMissions={1}
        onNewShift={vi.fn()}
        rank={{ tierName: 'DISPATCHER III', score: 30, delta: 13, promotions: [] }}
      />
    );

    expect(screen.queryByText(/Dispatcher rank/)).not.toBeInTheDocument();
  });
});
