import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CharacterCard } from '../components/CharacterCard';
import { CharacterSheet } from '../components/CharacterSheet';
import type { Character } from '../types/character';
import { loadAgentById, loadAgents } from '../utils/dataLoader';

export function Roster() {
  const agents = loadAgents();
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const _navigate = useNavigate();

  // Handle browser back/forward buttons
  useEffect(() => {
    const characterId = searchParams.get('character');
    if (characterId) {
      const character = loadAgentById(characterId);
      setSelectedCharacter(character || null);
    } else {
      setSelectedCharacter(null);
    }
  }, [searchParams]);

  const handleSelectCharacter = (character: Character) => {
    setSelectedCharacter(character);
    setSearchParams({ character: character.id });
  };

  const handleUpdateCharacter = (updatedCharacter: Character) => {
    setSelectedCharacter(updatedCharacter);
  };

  const handleBack = () => {
    setSelectedCharacter(null);
    setSearchParams({});
  };

  return (
    <div className="w-full">
      {selectedCharacter && (
        <div className="mb-4">
          <button type="button" onClick={handleBack} className="back-button">
            ← Back to Roster
          </button>
        </div>
      )}
      <main className={`app-main ${selectedCharacter ? 'constrained' : ''}`}>
        {selectedCharacter ? (
          <CharacterSheet character={selectedCharacter} onUpdateCharacter={handleUpdateCharacter} />
        ) : (
          <div className="character-roster">
            <h2>Agent Roster</h2>
            <div className="character-grid">
              {agents.map((agent) => (
                <CharacterCard
                  key={agent.id}
                  character={agent}
                  onClick={() => handleSelectCharacter(agent)}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
