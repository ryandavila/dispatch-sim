import { isDowned, isInjured } from '../engine/injury';
import type { Character } from '../types/character';

interface AgentSelectCardProps {
  agent: Character;
  isSelected: boolean;
  isExcluded: boolean;
  isDisabled: boolean;
  onToggle: (agent: Character) => void;
}

export function AgentSelectCard({
  agent,
  isSelected,
  isExcluded,
  isDisabled,
  onToggle,
}: AgentSelectCardProps) {
  const downed = isDowned(agent);
  const injured = isInjured(agent) && !downed;

  const handleClick = () => {
    if (!isExcluded && !downed) {
      onToggle(agent);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isExcluded && !downed && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onToggle(agent);
    }
  };

  const className = [
    'agent-select-card',
    isSelected && 'selected',
    isDisabled && 'disabled',
    isExcluded && 'excluded',
    injured && 'injured',
    downed && 'downed',
  ]
    .filter(Boolean)
    .join(' ');

  const title = downed
    ? 'This agent is downed and needs a med kit before deploying'
    : isExcluded
      ? 'This agent cannot or refuses to do this mission'
      : '';

  return (
    <button
      type="button"
      className={className}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={isExcluded || downed ? -1 : 0}
      disabled={isDisabled}
      title={title}
    >
      <div className="agent-select-info">
        <span className="agent-name">
          {agent.name}
          {agent.isFlightLicensed && (
            <span className="flight-badge" title="Licensed Flyer - Faster Travel">
              ✈️
            </span>
          )}
        </span>
        <span className="agent-level">Lvl {agent.level}</span>
        {injured && (
          <span className="injured-badge" title="Injured: -1 to all stats">
            Injured
          </span>
        )}
        {downed && (
          <span className="downed-badge" title="Downed: cannot deploy until healed">
            Downed
          </span>
        )}
      </div>
      {isSelected && <span className="checkmark">✓</span>}
      {isExcluded && <span className="excluded-badge">✗</span>}
    </button>
  );
}
