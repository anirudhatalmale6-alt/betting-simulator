'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import GameCard from '@/components/GameCard';

interface Game {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  homeOdds: number;
  awayOdds: number;
  drawOdds: number | null;
  status: string;
  bettingLocked: boolean;
  startTime: string;
  sport: { name: string; key: string };
}

const SPORTS = [
  { key: '', label: 'All Sports' },
  { key: 'baseball_mlb', label: 'MLB' },
  { key: 'icehockey_nhl', label: 'NHL' },
  { key: 'basketball_nba', label: 'NBA' },
  { key: 'soccer_epl', label: 'Soccer' },
];

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSport, setSelectedSport] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const fetchGames = useCallback(async () => {
    try {
      const data = await api.getGames(selectedSport || undefined, selectedStatus || undefined);
      setGames(data.games);
    } catch (error) {
      console.error('Failed to fetch games:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedSport, selectedStatus]);

  useEffect(() => {
    fetchGames();
    const interval = setInterval(async () => {
      try {
        await api.refreshScores();
        await fetchGames();
      } catch {
        // silent refresh failure
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchGames]);

  const liveGames = games.filter(g => g.status === 'live');
  const upcomingGames = games.filter(g => g.status === 'upcoming');
  const completedGames = games.filter(g => g.status === 'completed');

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Games</h1>
        <div className="flex flex-wrap gap-2">
          {SPORTS.map(sport => (
            <button
              key={sport.key}
              onClick={() => { setSelectedSport(sport.key); setLoading(true); }}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                selectedSport === sport.key
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {sport.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {['', 'live', 'upcoming', 'completed'].map(status => (
          <button
            key={status}
            onClick={() => { setSelectedStatus(status); setLoading(true); }}
            className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
              selectedStatus === status
                ? 'bg-gray-700 text-white'
                : 'bg-gray-800/50 text-gray-500 hover:text-gray-300'
            }`}
          >
            {status || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading games...</div>
      ) : games.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No games found</div>
      ) : (
        <div className="space-y-8">
          {liveGames.length > 0 && !selectedStatus && (
            <div>
              <h2 className="text-lg font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                Live Now
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {liveGames.map(game => (
                  <GameCard key={game.id} game={game} onBetPlaced={fetchGames} />
                ))}
              </div>
            </div>
          )}

          {upcomingGames.length > 0 && !selectedStatus && (
            <div>
              <h2 className="text-lg font-semibold text-gray-300 mb-3">Upcoming</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingGames.map(game => (
                  <GameCard key={game.id} game={game} onBetPlaced={fetchGames} />
                ))}
              </div>
            </div>
          )}

          {completedGames.length > 0 && !selectedStatus && (
            <div>
              <h2 className="text-lg font-semibold text-gray-500 mb-3">Completed</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedGames.map(game => (
                  <GameCard key={game.id} game={game} onBetPlaced={fetchGames} />
                ))}
              </div>
            </div>
          )}

          {selectedStatus && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {games.map(game => (
                <GameCard key={game.id} game={game} onBetPlaced={fetchGames} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
