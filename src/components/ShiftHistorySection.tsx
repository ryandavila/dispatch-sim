import type { Character } from '../types/character';
import type { ShiftRewards, ShiftSummary } from '../types/shiftSummary';

interface ShiftHistorySectionProps {
  summaries: ShiftSummary[];
  /** Used to resolve the stat-point recipient's display name. */
  allAgents: Character[];
}

function isFlawless(summary: ShiftSummary): boolean {
  const { succeeded, failed, missed } = summary.tally;
  return succeeded + failed + missed > 0 && failed === 0 && missed === 0;
}

/** Compact "+2 med kits · +1 pity · +3 pts" line; empty when nothing was earned. */
function rewardLabel(rewards: ShiftRewards): string {
  const parts: string[] = [];
  if (rewards.statPoints > 0)
    parts.push(`+${rewards.statPoints} stat pt${rewards.statPoints === 1 ? '' : 's'}`);
  if (rewards.medKits > 0)
    parts.push(`+${rewards.medKits} med kit${rewards.medKits === 1 ? '' : 's'}`);
  if (rewards.pityCharges > 0) parts.push(`+${rewards.pityCharges} pity`);
  return parts.join(' · ');
}

/** Campaign history: one card per fully-settled shift, newest first. */
export function ShiftHistorySection({ summaries, allAgents }: ShiftHistorySectionProps) {
  if (summaries.length === 0) {
    return (
      <div className="empty-state">
        <p>No shifts completed yet. Finish a shift to build your campaign history!</p>
      </div>
    );
  }

  const sorted = [...summaries].sort((a, b) => b.shiftNumber - a.shiftNumber);

  const formatDate = (timestamp: number): string =>
    new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

  const agentName = (id: string | undefined): string | null =>
    id ? (allAgents.find((a) => a.id === id)?.name ?? id) : null;

  return (
    <div className="shift-history-list">
      {sorted.map((summary) => {
        const flawless = isFlawless(summary);
        const rewards = rewardLabel(summary.rewards);
        const recipient = agentName(summary.statPointAgentId);
        return (
          <div key={summary.shiftNumber} className="shift-history-card">
            <div className="shift-history-header">
              <h3>Shift {summary.shiftNumber}</h3>
              {flawless && <span className="shift-history-lit">🔥 Lit</span>}
            </div>
            <div className="shift-history-tally">
              <span className="tally-succeeded">✓ {summary.tally.succeeded}</span>
              <span className="tally-failed">✗ {summary.tally.failed}</span>
              <span className="tally-missed">— {summary.tally.missed}</span>
            </div>
            {rewards && <div className="shift-history-rewards">{rewards}</div>}
            {recipient && summary.rewards.statPoints > 0 && (
              <div className="shift-history-recipient">Stat points → {recipient}</div>
            )}
            <div className="shift-history-date">{formatDate(summary.completedAt)}</div>
          </div>
        );
      })}
    </div>
  );
}
