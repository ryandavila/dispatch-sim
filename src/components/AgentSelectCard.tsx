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
  const handleClick = () => {
    if (!isExcluded) {
      onToggle(agent);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isExcluded && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onToggle(agent);
    }
  };

  const className = [
    'agent-select-card',
    isSelected && 'selected',
    isDisabled && 'disabled',
    isExcluded && 'excluded',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={className}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={isExcluded ? -1 : 0}
      disabled={isDisabled}
      title={isExcluded ? 'This agent cannot or refuses to do this mission' : ''}
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
      </div>
      {isSelected && <span className="checkmark">✓</span>}
      {isExcluded && <span className="excluded-badge">✗</span>}
    </button>
  );
}
