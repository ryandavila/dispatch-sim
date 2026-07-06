import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CharacterSheet } from '../components/CharacterSheet';
import { HeroPortrait } from '../components/HeroPortrait';
import { isDowned, isInjured } from '../engine/injury';
import { useAgentProgress } from '../hooks/useAgentProgress';
import { useUserProgress } from '../hooks/useUserProgress';
import '../styles/roster.css';
import type { Character } from '../types/character';

export function Roster() {
  const { agents, updateAgentStats, healAgent } = useAgentProgress();
  const { userProgress, consumeMedKit, consumeDefibrillator } = useUserProgress();
  const [searchParams, setSearchParams] = useSearchParams();

  // Source of truth for "which shift am I on": next = prior summaries + 1
  // (mirrors Shift.tsx's currentShiftNumber derivation).
  const currentShiftNumber = userProgress.shiftSummaries.length + 1;

  const selectedId = searchParams.get('character');
  const selectedCharacter: Character | null = useMemo(() => {
    if (!selectedId) return agents[0] ?? null;
    return agents.find((a) => a.id === selectedId) ?? agents[0] ?? null;
  }, [selectedId, agents]);

  // Keep the URL in sync with the first agent once the roster loads, so the
  // deep-link is always present (mirrors previous back/forward behavior).
  useEffect(() => {
    if (!selectedId && agents.length > 0) {
      setSearchParams({ character: agents[0].id }, { replace: true });
    }
  }, [selectedId, agents, setSearchParams]);

  const handleSelectCharacter = (character: Character) => {
    setSearchParams({ character: character.id });
  };

  const handleUpdateCharacter = (updatedCharacter: Character) => {
    updateAgentStats(updatedCharacter);
  };

  const handleHealCharacter = (character: Character) => {
    // Healing clears all injuries and consumes one bandage (med kit)
    if (!consumeMedKit()) return;
    healAgent(character.id);
  };

  const handleDefibrillate = (character: Character) => {
    // Reviving a downed hero consumes the one-per-shift defibrillator charge
    if (!consumeDefibrillator(currentShiftNumber)) return;
    healAgent(character.id);
  };

  return (
    <div className="hs-page">
      {selectedCharacter && (
        <CharacterSheet
          character={selectedCharacter}
          medKits={userProgress.medKits}
          onUpdateCharacter={handleUpdateCharacter}
          onHealCharacter={handleHealCharacter}
          defibrillators={userProgress.defibrillators}
          defibAvailableThisShift={userProgress.defibUsedShift !== currentShiftNumber}
          onDefibrillate={handleDefibrillate}
        />
      )}

      <div className="hs-roster-bar">
        {agents.map((agent) => {
          const downed = isDowned(agent);
          const injured = isInjured(agent) && !downed;
          const isSelected = selectedCharacter?.id === agent.id;
          const hasPoints = agent.availablePoints > 0;

          return (
            <button
              key={agent.id}
              type="button"
              className={`hs-hero-tile ${isSelected ? 'hs-selected' : ''} ${downed ? 'hs-downed' : ''} ${injured ? 'hs-injured' : ''}`}
              onClick={() => handleSelectCharacter(agent)}
              aria-pressed={isSelected}
            >
              <span className="hs-hero-portrait-frame">
                <HeroPortrait heroId={agent.id} size={72} />
              </span>
              <span className="hs-hero-tile-name">{agent.name}</span>
              <span className={`hs-star-badge ${hasPoints ? 'hs-has-points' : ''}`}>★</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
