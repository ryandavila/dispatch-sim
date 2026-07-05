import type { ShiftTally } from '../types/shift';
import type { ShiftRewards } from '../types/shiftSummary';

interface ShiftReviewProps {
  tally: ShiftTally;
  /** In-flight missions still returning; the tally is not final until 0. */
  pendingMissions: number;
  /** Rewards earned this shift; shown once the shift is fully settled. */
  rewards?: ShiftRewards;
  /** Display name of the hero who received the stat points, if any. */
  statPointAgentName?: string;
  onNewShift: () => void;
}

/** End-of-shift performance review: succeeded / failed / missed + rewards. */
export function ShiftReview({
  tally,
  pendingMissions,
  rewards,
  statPointAgentName,
  onNewShift,
}: ShiftReviewProps) {
  const total = tally.succeeded + tally.failed + tally.missed;
  // "Shift Was Lit": no failures and no missed calls (matches the real game).
  const flawless = total > 0 && tally.failed === 0 && tally.missed === 0;
  const earnedAnything =
    !!rewards && (rewards.statPoints > 0 || rewards.medKits > 0 || rewards.pityCharges > 0);

  return (
    <div className="shift-review">
      <h2 className="shift-review-title">Shift Review</h2>

      <div className="shift-review-tally">
        <div className="shift-review-stat succeeded">
          <div className="shift-review-value">{tally.succeeded}</div>
          <div className="shift-review-label">Succeeded</div>
        </div>
        <div className="shift-review-stat failed">
          <div className="shift-review-value">{tally.failed}</div>
          <div className="shift-review-label">Failed</div>
        </div>
        <div className="shift-review-stat missed">
          <div className="shift-review-value">{tally.missed}</div>
          <div className="shift-review-label">Missed</div>
        </div>
      </div>

      {flawless && pendingMissions === 0 && (
        <div className="shift-review-badge">🔥 Shift Was Lit — no failures, no missed calls!</div>
      )}

      {pendingMissions === 0 && rewards && (
        <div className="shift-review-rewards">
          <div className="shift-review-rewards-title">Rewards Earned</div>
          {earnedAnything ? (
            <>
              <div className="shift-review-rewards-list">
                {rewards.statPoints > 0 && (
                  <span className="shift-reward">
                    +{rewards.statPoints} stat pt{rewards.statPoints === 1 ? '' : 's'}
                  </span>
                )}
                {rewards.medKits > 0 && (
                  <span className="shift-reward">
                    +{rewards.medKits} med kit{rewards.medKits === 1 ? '' : 's'}
                  </span>
                )}
                {rewards.pityCharges > 0 && (
                  <span className="shift-reward">+{rewards.pityCharges} pity</span>
                )}
              </div>
              {rewards.statPoints > 0 && statPointAgentName && (
                <div className="shift-review-rewards-recipient">
                  Stat points went to <strong>{statPointAgentName}</strong>.
                </div>
              )}
            </>
          ) : (
            <div className="shift-review-rewards-none">
              No rewards this time — succeed on more calls next shift.
            </div>
          )}
        </div>
      )}

      {pendingMissions > 0 ? (
        <p className="shift-review-pending">
          {pendingMissions} mission{pendingMissions === 1 ? '' : 's'} still returning…
        </p>
      ) : (
        <button type="button" className="deploy-button" onClick={onNewShift}>
          Start New Shift
        </button>
      )}
    </div>
  );
}
