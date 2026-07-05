import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CharacterCard } from '../components/CharacterCard';
import { CharacterSheet } from '../components/CharacterSheet';
import { getEffectiveStats } from '../engine/injury';
import { useAgentProgress } from '../hooks/useAgentProgress';
import { useUserProgress } from '../hooks/useUserProgress';
import type { Character } from '../types/character';

type SortOption = 'name' | 'level' | 'combat' | 'vigor' | 'mobility' | 'charisma' | 'intellect';

export function Roster() {
  const { agents, updateAgentStats, healAgent } = useAgentProgress();
  const { userProgress, consumeMedKit } = useUserProgress();
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const _navigate = useNavigate();
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Handle browser back/forward buttons
  useEffect(() => {
    const characterId = searchParams.get('character');
    if (characterId) {
      const character = agents.find((a) => a.id === characterId);
      setSelectedCharacter(character || null);
    } else {
      setSelectedCharacter(null);
    }
  }, [searchParams, agents]);

  const handleSelectCharacter = (character: Character) => {
    setSelectedCharacter(character);
    setSearchParams({ character: character.id });
  };

  const handleUpdateCharacter = (updatedCharacter: Character) => {
    // Update local state
    setSelectedCharacter(updatedCharacter);
    // Persist to agent progress
    updateAgentStats(updatedCharacter);
  };

  const handleHealCharacter = (character: Character) => {
    // Healing clears all injuries and consumes one med kit
    if (!consumeMedKit()) return;
    healAgent(character.id);
  };

  const handleBack = () => {
    setSelectedCharacter(null);
    setSearchParams({});
  };

  // Get all unique tags from agents
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const agent of agents) {
      if (agent.tags) {
        for (const tag of agent.tags) {
          tagSet.add(tag);
        }
      }
    }
    return Array.from(tagSet).sort();
  }, [agents]);

  // Filter and sort agents
  const filteredAndSortedAgents = useMemo(() => {
    let filtered = [...agents];

    // Apply tag filter
    if (selectedTag) {
      filtered = filtered.filter((agent) => agent.tags?.includes(selectedTag));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      // Always prioritize agents with available points first
      const aHasPoints = a.availablePoints > 0;
      const bHasPoints = b.availablePoints > 0;
      if (aHasPoints !== bHasPoints) {
        return bHasPoints ? 1 : -1; // Agents with points come first
      }

      // Then apply the selected sort (stats compared post-injury)
      const aStats = getEffectiveStats(a);
      const bStats = getEffectiveStats(b);
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'level':
          return b.level - a.level; // Descending
        case 'combat':
          return bStats.Combat - aStats.Combat;
        case 'vigor':
          return bStats.Vigor - aStats.Vigor;
        case 'mobility':
          return bStats.Mobility - aStats.Mobility;
        case 'charisma':
          return bStats.Charisma - aStats.Charisma;
        case 'intellect':
          return bStats.Intellect - aStats.Intellect;
        default:
          return 0;
      }
    });

    return filtered;
  }, [agents, sortBy, selectedTag]);

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
          <CharacterSheet
            character={selectedCharacter}
            medKits={userProgress.medKits}
            onUpdateCharacter={handleUpdateCharacter}
            onHealCharacter={handleHealCharacter}
          />
        ) : (
          <div className="character-roster">
            <div className="roster-header">
              <h2>Agent Roster</h2>
              <span className="med-kit-stock" title="Med kits heal all injuries on one agent">
                🩹 Med Kits: <strong>{userProgress.medKits}</strong>
              </span>
            </div>

            {/* Filters */}
            <div className="roster-filters">
              <div className="filter-group">
                <label htmlFor="sort-select" className="filter-label">
                  Sort By:
                </label>
                <select
                  id="sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="filter-select"
                >
                  <option value="name">Name (A-Z)</option>
                  <option value="level">Level (High-Low)</option>
                  <option value="combat">Combat (High-Low)</option>
                  <option value="vigor">Vigor (High-Low)</option>
                  <option value="mobility">Mobility (High-Low)</option>
                  <option value="charisma">Charisma (High-Low)</option>
                  <option value="intellect">Intellect (High-Low)</option>
                </select>
              </div>

              <div className="filter-group">
                <span className="filter-label">Filter by Tag:</span>
                <div className="tag-filters">
                  <button
                    type="button"
                    onClick={() => setSelectedTag(null)}
                    className={`tag-filter-button ${selectedTag === null ? 'active' : ''}`}
                  >
                    All
                  </button>
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSelectedTag(tag)}
                      className={`tag-filter-button ${selectedTag === tag ? 'active' : ''}`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="character-grid">
              {filteredAndSortedAgents.map((agent) => (
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
