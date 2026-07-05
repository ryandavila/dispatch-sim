import { Link, Route, Routes } from 'react-router-dom';
import './App.css';
import { Home } from './pages/Home';
import { Missions } from './pages/Missions';
import { Roster } from './pages/Roster';
import { Shift } from './pages/Shift';

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
          <Route path="/shift" element={<Shift />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
