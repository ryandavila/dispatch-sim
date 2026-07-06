import '../styles/archive.css';
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

/** Campaign history: one log row per fully-settled shift, newest first. */
export function ShiftHistorySection({ summaries, allAgents }: ShiftHistorySectionProps) {
  if (summaries.length === 0) {
    return (
      <div className="ar-empty-state">
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
    <div className="ar-log">
      {sorted.map((summary) => {
        const flawless = isFlawless(summary);
        const rewards = rewardLabel(summary.rewards);
        const recipient = agentName(summary.statPointAgentId);
        return (
          <div key={summary.shiftNumber} className="ar-log-row">
            <div className="ar-log-row-header">
              <h3 className="ar-log-name">Shift {summary.shiftNumber}</h3>
              {flawless && <span className="ar-log-lit">🔥 Lit</span>}
            </div>
            <div className="ar-log-tally">
              <span className="ar-tally-ok">✓ {summary.tally.succeeded}</span>
              <span className="ar-tally-fail">✗ {summary.tally.failed}</span>
              <span className="ar-tally-miss">— {summary.tally.missed}</span>
            </div>
            {rewards && <div className="ar-log-rewards">{rewards}</div>}
            {recipient && summary.rewards.statPoints > 0 && (
              <div className="ar-log-recipient">Stat points → {recipient}</div>
            )}
            <div className="ar-log-meta sdn-readout">{formatDate(summary.completedAt)}</div>
          </div>
        );
      })}
    </div>
  );
}
