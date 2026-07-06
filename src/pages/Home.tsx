import { Link } from 'react-router-dom';
import { isDowned } from '../engine/injury';
import '../styles/home.css';
import { useUserProgress } from '../hooks/useUserProgress';
import { loadAgents } from '../utils/dataLoader';

/**
 * The SDN boot screen: the terminal's home base. A short in-fiction welcome
 * plus a handful of live readouts, then three launchers into the rest of the
 * app. Deploying heroes happens on a Shift — this is just the front desk.
 */
export function Home() {
  const agents = loadAgents();
  const { userProgress } = useUserProgress();

  const heroesReady = agents.filter((agent) => !isDowned(agent)).length;
  const shiftNumber = userProgress.shiftSummaries.length + 1;

  return (
    <div className="sh-page">
      <div className="sh-window sdn-window">
        <div className="sdn-window-title">SDN.HOME</div>
        <div className="sdn-window-body">
          <p className="sh-welcome">
            Superhero Dispatch Network — <strong>Torrance Branch</strong>. Z-Team is on file and the
            Phoenix Program keeps the lights on. Clock in to run a shift, or check the roster and
            call archive first.
          </p>

          <div className="sh-readouts sdn-readout">
            <span>
              » HEROES READY: {heroesReady}/{agents.length}
            </span>
            <span>» NEXT SHIFT: {shiftNumber}</span>
            <span>» BANDAGES IN STOCK: {userProgress.medKits}</span>
            <span>» BOOST CHARGES: {userProgress.pityRemaining}</span>
          </div>

          <nav className="sh-launchers">
            <Link to="/shift" className="sdn-btn sdn-btn-primary sh-launcher">
              Clock in
            </Link>
            <Link to="/roster" className="sdn-btn sh-launcher">
              Hero database
            </Link>
            <Link to="/missions" className="sdn-btn sh-launcher">
              Call archive
            </Link>
          </nav>
        </div>
      </div>
    </div>
  );
}
