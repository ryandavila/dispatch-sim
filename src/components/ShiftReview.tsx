import type { ShiftTally } from '../types/shift';
import type { ShiftRewards } from '../types/shiftSummary';

/** Rank tier promoted into this shift, with its reward payout. */
export interface RankPromotion {
  name: string;
  bandages: number;
  defibrillators: number;
}

/** Rank meta-progression summary for this shift, shown on the review. */
export interface RankReviewInfo {
  tierName: string;
  score: number;
  /** Signed rank-score change this shift earned. */
  delta: number;
  promotions: RankPromotion[];
}

interface ShiftReviewProps {
  tally: ShiftTally;
  /** In-flight missions still returning; the tally is not final until 0. */
  pendingMissions: number;
  /** Rewards earned this shift; shown once the shift is fully settled. */
  rewards?: ShiftRewards;
  /** Display name of the hero who received the stat points, if any. */
  statPointAgentName?: string;
  /** Dispatcher rank progression for this shift; omitted call sites still compile. */
  rank?: RankReviewInfo;
  onNewShift: () => void;
}

/** End-of-shift performance review: succeeded / failed / missed + rewards. */
export function ShiftReview({
  tally,
  pendingMissions,
  rewards,
  statPointAgentName,
  rank,
  onNewShift,
}: ShiftReviewProps) {
  const total = tally.succeeded + tally.failed + tally.missed;
  // "Shift Was Lit": no failures and no missed calls (matches the real game).
  const flawless = total > 0 && tally.failed === 0 && tally.missed === 0;

  return (
    <div className="sdn-window">
      <div className="sdn-window-title">SHIFT.PERFORMANCE</div>
      <div className="sdn-window-body">
        <div className="dm-review-tally">
          <div className="dm-review-stat ok">
            <div className="dm-review-value">{tally.succeeded}</div>
            <div className="dm-review-label">Succeeded</div>
          </div>
          <div className="dm-review-stat fail">
            <div className="dm-review-value">{tally.failed}</div>
            <div className="dm-review-label">Failed</div>
          </div>
          <div className="dm-review-stat miss">
            <div className="dm-review-value">{tally.missed}</div>
            <div className="dm-review-label">Missed</div>
          </div>
        </div>

        {flawless && pendingMissions === 0 && (
          <div className="dm-stamp ok dm-review-lit">🔥 Shift was lit</div>
        )}

        {pendingMissions === 0 && rank && <RankSection rank={rank} />}

        {pendingMissions === 0 && rewards && (
          <RewardsSection rewards={rewards} statPointAgentName={statPointAgentName} />
        )}

        {pendingMissions > 0 ? (
          <p className="dm-review-note">
            {pendingMissions} team{pendingMissions === 1 ? '' : 's'} still in the field…
          </p>
        ) : (
          <div className="dm-review-actions">
            <button type="button" className="sdn-btn sdn-btn-primary" onClick={onNewShift}>
              Clock in — next shift
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function RankSection({ rank }: { rank: RankReviewInfo }) {
  const deltaSign = rank.delta > 0 ? '+' : '';
  const deltaClass =
    rank.delta > 0 ? 'dm-rank-delta-up' : rank.delta < 0 ? 'dm-rank-delta-down' : '';

  return (
    <div className="dm-review-rank">
      <div className="dm-review-rewards-title">Dispatcher rank</div>
      <div className="dm-rank-summary">
        <span className="sdn-chip dm-rank-tier">{rank.tierName}</span>
        <span className="dm-rank-score">RANK SCORE: {rank.score}</span>
        <span className={`dm-rank-delta ${deltaClass}`}>
          {deltaSign}
          {rank.delta}
        </span>
      </div>
      {rank.promotions.map((promotion) => (
        <p key={promotion.name} className="dm-review-note dm-rank-promotion">
          PROMOTED: {promotion.name} — +{promotion.bandages} BANDAGE
          {promotion.bandages === 1 ? '' : 'S'}
          {promotion.defibrillators > 0 &&
            `, +${promotion.defibrillators} DEFIBRILLATOR${promotion.defibrillators === 1 ? '' : 'S'}`}
        </p>
      ))}
    </div>
  );
}

function RewardsSection({
  rewards,
  statPointAgentName,
}: {
  rewards: ShiftRewards;
  statPointAgentName?: string;
}) {
  const earnedAnything = rewards.statPoints > 0 || rewards.medKits > 0 || rewards.pityCharges > 0;

  return (
    <div className="dm-review-rewards">
      <div className="dm-review-rewards-title">Dispatcher review — rewards</div>
      {earnedAnything ? (
        <>
          <div className="dm-review-reward-list">
            {rewards.statPoints > 0 && (
              <span className="sdn-chip">
                +{rewards.statPoints} skill point{rewards.statPoints === 1 ? '' : 's'}
              </span>
            )}
            {rewards.medKits > 0 && (
              <span className="sdn-chip">
                +{rewards.medKits} bandage{rewards.medKits === 1 ? '' : 's'}
              </span>
            )}
            {rewards.pityCharges > 0 && (
              <span className="sdn-chip">
                +{rewards.pityCharges} boost charge{rewards.pityCharges === 1 ? '' : 's'}
              </span>
            )}
          </div>
          {rewards.statPoints > 0 && statPointAgentName && (
            <p className="dm-review-note">
              Skill points assigned to <strong>{statPointAgentName}</strong>.
            </p>
          )}
        </>
      ) : (
        <p className="dm-review-note">No rewards this time — clear more calls next shift.</p>
      )}
    </div>
  );
}
