import { Link } from 'react-router-dom';
import { loadAgents, loadMissions } from '../utils/dataLoader';

export function Home() {
  const agents = loadAgents();
  const missions = loadMissions();

  // Calculate stats
  const totalAgents = agents.length;
  const averageLevel = agents.reduce((sum, agent) => sum + agent.level, 0) / totalAgents;
  const totalMissions = missions.length;

  // Count agents that aren't excluded from any mission
  const allExcludedAgents = new Set(
    missions.flatMap((mission) => mission.excludedAgents || [])
  );
  const availableAgents = agents.filter((agent) => !allExcludedAgents.has(agent.id)).length;

  return (
    <div className="home-page">
      <div className="home-header">
        <h2>Welcome to Dispatch</h2>
        <p>Manage your team of reformed villains</p>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-value">{totalAgents}</div>
          <div className="stat-label">Total Agents</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{averageLevel.toFixed(1)}</div>
          <div className="stat-label">Average Level</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalMissions}</div>
          <div className="stat-label">Active Missions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{availableAgents}</div>
          <div className="stat-label">Always Available</div>
        </div>
      </div>

      <nav className="home-nav">
        <Link to="/roster" className="home-nav-button">
          View Roster
        </Link>
        <Link to="/missions" className="home-nav-button">
          View Missions
        </Link>
      </nav>
    </div>
  );
}
