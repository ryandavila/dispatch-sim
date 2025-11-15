import { useEffect, useState } from 'react';
import './App.css';
import { CharacterCard } from './components/CharacterCard';
import { CharacterSheet } from './components/CharacterSheet';
import type { Character } from './types/character';
import { loadAgentById, loadAgents } from './utils/dataLoader';

function App() {
  const agents = loadAgents();
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const characterId = event.state?.characterId;
      if (characterId) {
        const character = loadAgentById(characterId);
        setSelectedCharacter(character || null);
      } else {
        setSelectedCharacter(null);
      }
    };

    window.addEventListener('popstate', handlePopState);

    // Check initial URL on mount
    const params = new URLSearchParams(window.location.search);
    const characterId = params.get('character');
    if (characterId) {
      const character = loadAgentById(characterId);
      if (character) {
        setSelectedCharacter(character);
        // Update history state without adding new entry
        window.history.replaceState({ characterId }, '', `?character=${characterId}`);
      }
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleSelectCharacter = (character: Character) => {
    setSelectedCharacter(character);
    window.history.pushState({ characterId: character.id }, '', `?character=${character.id}`);
  };

  const handleUpdateCharacter = (updatedCharacter: Character) => {
    setSelectedCharacter(updatedCharacter);
  };

  const handleBack = () => {
    setSelectedCharacter(null);
    window.history.pushState({}, '', window.location.pathname);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Dispatch Simulator</h1>
        {selectedCharacter && (
          <button type="button" onClick={handleBack} className="back-button">
            ← Back to Roster
          </button>
        )}
      </header>
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

export default App;
