'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from './AuthProvider';

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

export default function GameCard({ game, onBetPlaced }: { game: Game; onBetPlaced?: () => void }) {
  const { user, refreshUser } = useAuth();
  const [selectedPick, setSelectedPick] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isLive = game.status === 'live';
  const isCompleted = game.status === 'completed';

  const sportEmoji: Record<string, string> = {
    baseball_mlb: '⚾',
    icehockey_nhl: '🏒',
    basketball_nba: '🏀',
    soccer_epl: '⚽',
  };

  const handlePlaceBet = async () => {
    if (!selectedPick || !amount) return;
    setPlacing(true);
    setError('');
    setSuccess('');

    try {
      const odds = selectedPick === 'home' ? game.homeOdds : selectedPick === 'away' ? game.awayOdds : game.drawOdds!;
      const potentialWin = (Number(amount) * odds).toFixed(2);
      await api.placeBet({ gameId: game.id, pick: selectedPick, amount: Number(amount) });
      setSuccess(`Bet placed! Potential win: $${potentialWin}`);
      setSelectedPick(null);
      setAmount('');
      await refreshUser();
      onBetPlaced?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place bet');
    } finally {
      setPlacing(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className={`bg-gray-800 rounded-xl border ${isLive ? 'border-emerald-500/50' : 'border-gray-700'} overflow-hidden`}>
      <div className="px-4 py-3 flex items-center justify-between bg-gray-800/50">
        <div className="flex items-center gap-2">
          <span>{sportEmoji[game.sport.key] || '🏆'}</span>
          <span className="text-sm text-gray-400">{game.sport.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {game.bettingLocked && isLive && (
            <span className="text-xs bg-amber-600/20 text-amber-400 px-2 py-0.5 rounded-full">SUSPENDED</span>
          )}
          {isLive && !game.bettingLocked && (
            <span className="text-xs bg-emerald-600/20 text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              LIVE
            </span>
          )}
          {isCompleted && (
            <span className="text-xs bg-gray-600/20 text-gray-400 px-2 py-0.5 rounded-full">FINAL</span>
          )}
          {!isLive && !isCompleted && (
            <span className="text-xs text-gray-500">{formatTime(game.startTime)}</span>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 text-center">
            <div className="font-semibold text-white text-sm">{game.homeTeam}</div>
            {(isLive || isCompleted) && (
              <div className="text-2xl font-bold text-white mt-1">{game.homeScore}</div>
            )}
          </div>
          <div className="text-gray-500 text-sm font-medium px-4">VS</div>
          <div className="flex-1 text-center">
            <div className="font-semibold text-white text-sm">{game.awayTeam}</div>
            {(isLive || isCompleted) && (
              <div className="text-2xl font-bold text-white mt-1">{game.awayScore}</div>
            )}
          </div>
        </div>

        {!isCompleted && user && (
          <>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {game.drawOdds && (
                <div className="col-span-2 grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setSelectedPick(selectedPick === 'home' ? null : 'home')}
                    disabled={game.bettingLocked}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      selectedPick === 'home'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    } ${game.bettingLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="text-xs text-gray-400 mb-0.5">Home</div>
                    {game.homeOdds.toFixed(2)}
                  </button>
                  <button
                    onClick={() => setSelectedPick(selectedPick === 'draw' ? null : 'draw')}
                    disabled={game.bettingLocked}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      selectedPick === 'draw'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    } ${game.bettingLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="text-xs text-gray-400 mb-0.5">Draw</div>
                    {game.drawOdds.toFixed(2)}
                  </button>
                  <button
                    onClick={() => setSelectedPick(selectedPick === 'away' ? null : 'away')}
                    disabled={game.bettingLocked}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      selectedPick === 'away'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    } ${game.bettingLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="text-xs text-gray-400 mb-0.5">Away</div>
                    {game.awayOdds.toFixed(2)}
                  </button>
                </div>
              )}
              {!game.drawOdds && (
                <>
                  <button
                    onClick={() => setSelectedPick(selectedPick === 'home' ? null : 'home')}
                    disabled={game.bettingLocked}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      selectedPick === 'home'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    } ${game.bettingLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="text-xs text-gray-400 mb-0.5">{game.homeTeam}</div>
                    {game.homeOdds.toFixed(2)}
                  </button>
                  <button
                    onClick={() => setSelectedPick(selectedPick === 'away' ? null : 'away')}
                    disabled={game.bettingLocked}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      selectedPick === 'away'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    } ${game.bettingLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="text-xs text-gray-400 mb-0.5">{game.awayTeam}</div>
                    {game.awayOdds.toFixed(2)}
                  </button>
                </>
              )}
            </div>

            {selectedPick && (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="Amount"
                    min="1"
                    max={user?.balance || 0}
                    className="w-full bg-gray-700 text-white pl-7 pr-3 py-2 rounded-lg text-sm border border-gray-600 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <button
                  onClick={handlePlaceBet}
                  disabled={placing || !amount || Number(amount) <= 0}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {placing ? '...' : 'Place Bet'}
                </button>
              </div>
            )}

            {selectedPick && amount && Number(amount) > 0 && (
              <div className="mt-2 text-xs text-gray-400 text-center">
                Potential win: ${(Number(amount) * (selectedPick === 'home' ? game.homeOdds : selectedPick === 'away' ? game.awayOdds : game.drawOdds!)).toFixed(2)}
              </div>
            )}
          </>
        )}

        {error && <div className="mt-2 text-xs text-red-400 text-center">{error}</div>}
        {success && <div className="mt-2 text-xs text-emerald-400 text-center">{success}</div>}
      </div>
    </div>
  );
}
