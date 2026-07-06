import { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes } from 'react-router-dom';
import './App.css';
import './styles/sdn.css';
import { isDowned } from './engine/injury';
import { useAgentProgress } from './hooks/useAgentProgress';
import { useUserProgress } from './hooks/useUserProgress';
import { Home } from './pages/Home';
import { Missions } from './pages/Missions';
import { Roster } from './pages/Roster';
import { Shift } from './pages/Shift';

const NAV_TABS = [
  { to: '/shift', label: 'Dispatch' },
  { to: '/roster', label: 'Roster' },
  { to: '/missions', label: 'Archive' },
] as const;

function formatUptime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Diegetic chrome: the app presents as the in-fiction SDN terminal, so the
 * status bars show live campaign data dressed up as OS telemetry.
 */
function App() {
  const { userProgress } = useUserProgress();
  const { agents } = useAgentProgress();
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setUptime((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const shiftNumber = userProgress.shiftSummaries.length + 1;
  const readyAgents = agents.filter((a) => !isDowned(a)).length;
  const totalXp = agents.reduce((sum, a) => sum + a.experience, 0);
  const completions = userProgress.missionCompletions;
  const successRate =
    completions.length > 0
      ? (completions.filter((c) => c.success !== false).length / completions.length) * 100
      : 100;

  return (
    <div className="sdn">
      <div className="sdn-screen">
        <header className="sdn-topbar">
          <Link to="/" className="sdn-logo">
            SDN
          </Link>
          <div className="sdn-topbar-telemetry">
            <span>{totalXp} cs</span>
            <span>{successRate.toFixed(2)}%</span>
            <span>{formatUptime(uptime)}</span>
            <span>{userProgress.medKits * 1024}K</span>
          </div>
          <div className="sdn-topbar-fill">
            ------------------------------------------------------- v ^ x
          </div>
          <span className="sdn-topbar-build">0.18.0-Dev (Editor) | Shift {shiftNumber}</span>
        </header>

        <nav className="sdn-tabs">
          {NAV_TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) => `sdn-tab${isActive ? ' active' : ''}`}
            >
              <span className="sdn-tab-star">★</span>
              {tab.label}
            </NavLink>
          ))}
        </nav>

        <main className="sdn-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/roster" element={<Roster />} />
            <Route path="/missions" element={<Missions />} />
            <Route path="/shift" element={<Shift />} />
          </Routes>
        </main>

        <footer className="sdn-bottombar">
          <em>Hero factoring complete</em>
          <span>
            {readyAgents}/{agents.length}
          </span>
          <span>speed: 40 mbps</span>
          <span>input detected: mouse</span>
          <span>pity charges: {userProgress.pityRemaining}</span>
          <span>battery: 100% [plugged in]</span>
          <span>volume: 30%</span>
        </footer>
      </div>
    </div>
  );
}

export default App;
