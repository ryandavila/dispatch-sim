import { useState } from 'react';
import './App.css';
import { CharacterSheet } from './components/CharacterSheet';
import type { Character } from './types/character';
import { createCharacter } from './types/character';

function App() {
  const [character, setCharacter] = useState<Character>(createCharacter('Agent Silva', 1));

  return (
    <div className="app">
      <header className="app-header">
        <h1>Dispatch Simulator</h1>
      </header>
      <main className="app-main">
        <CharacterSheet character={character} onUpdateCharacter={setCharacter} />
      </main>
    </div>
  );
}

export default App;
