import { Routes, Route, Link } from 'react-router-dom';
import './App.css';
import { Home } from './pages/Home';
import { Roster } from './pages/Roster';
import { Missions } from './pages/Missions';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <Link to="/" className="no-underline">
          <h1>Dispatch Simulator</h1>
        </Link>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/roster" element={<Roster />} />
          <Route path="/missions" element={<Missions />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
