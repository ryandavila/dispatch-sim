import { Link } from 'react-router-dom';

export function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] gap-8">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-bold">Welcome to Dispatch</h2>
        <p className="text-xl text-gray-400">Manage your team of reformed villains</p>
      </div>

      <nav className="flex flex-col gap-4">
        <Link
          to="/roster"
          className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-lg font-semibold transition-colors"
        >
          View Agent Roster
        </Link>
      </nav>
    </div>
  );
}
