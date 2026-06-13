'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { formatAmericanOdds, calculatePayout } from '@/lib/odds-utils';

interface PropMarket {
  id: string;
  category: string;
  description: string;
  overOdds: number | null;
  underOdds: number | null;
  yesOdds: number | null;
  noOdds: number | null;
  line: number | null;
  settled: boolean;
}

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
  propMarkets: PropMarket[];
}

export default function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, refreshUser } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBet, setSelectedBet] = useState<{ type: string; propId?: string; pick: string; odds: number; label: string } | null>(null);
  const [amount, setAmount] = useState('');
  const [placing, setPlacing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchGame();
  }, [id]);

  const fetchGame = async () => {
    try {
      const data = await api.getGame(id);
      setGame(data.game);
    } catch {
      console.error('Failed to fetch game');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceBet = async () => {
    if (!selectedBet || !amount || !game) return;
    setPlacing(true);
    setMessage(null);

    try {
      await api.placeBet({
        gameId: game.id,
        pick: selectedBet.pick,
        amount: Number(amount),
        propId: selectedBet.propId,
      });
      const potentialWin = calculatePayout(Number(amount), selectedBet.odds).toFixed(2);
      setMessage({ text: `Bet placed! ${selectedBet.label} - Potential win: $${potentialWin}`, type: 'success' });
      setSelectedBet(null);
      setAmount('');
      await refreshUser();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Failed to place bet', type: 'error' });
    } finally {
      setPlacing(false);
    }
  };

  const isLive = game?.status === 'live';
  const isCompleted = game?.status === 'completed';
  const canBet = user && !isCompleted && !game?.bettingLocked;

  if (loading) return <div className="text-center py-20 text-gray-400">Loading game...</div>;
  if (!game) return <div className="text-center py-20 text-gray-400">Game not found</div>;

  const propsByCategory: Record<string, PropMarket[]> = {};
  game.propMarkets.forEach(p => {
    if (!propsByCategory[p.category]) propsByCategory[p.category] = [];
    propsByCategory[p.category].push(p);
  });

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/games" className="text-sm text-gray-400 hover:text-white mb-4 inline-block">&larr; Back to Games</Link>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden mb-6">
        <div className="px-4 py-3 flex items-center justify-between bg-gray-800/50">
          <span className="text-sm text-gray-400">{game.sport.name}</span>
          <div className="flex items-center gap-2">
            {game.bettingLocked && isLive && (
              <span className="text-xs bg-amber-600/20 text-amber-400 px-2 py-0.5 rounded-full">SUSPENDED</span>
            )}
            {isLive && !game.bettingLocked && (
              <span className="text-xs bg-emerald-600/20 text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />LIVE
              </span>
            )}
            {isCompleted && <span className="text-xs bg-gray-600/20 text-gray-400 px-2 py-0.5 rounded-full">FINAL</span>}
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1 text-center">
              <div className="font-bold text-lg text-white">{game.homeTeam}</div>
              {(isLive || isCompleted) && <div className="text-4xl font-bold text-white mt-2">{game.homeScore}</div>}
            </div>
            <div className="text-gray-500 font-medium px-6">VS</div>
            <div className="flex-1 text-center">
              <div className="font-bold text-lg text-white">{game.awayTeam}</div>
              {(isLive || isCompleted) && <div className="text-4xl font-bold text-white mt-2">{game.awayScore}</div>}
            </div>
          </div>

          {canBet && (
            <div>
              <h3 className="text-sm text-gray-400 mb-2 uppercase tracking-wide">Moneyline</h3>
              <div className={`grid ${game.drawOdds ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
                <button
                  onClick={() => setSelectedBet({ type: 'moneyline', pick: 'home', odds: game.homeOdds, label: `${game.homeTeam} to win` })}
                  className={`py-3 px-3 rounded-lg text-sm font-medium transition-all ${selectedBet?.pick === 'home' && !selectedBet?.propId ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                >
                  <div className="text-xs text-gray-400 mb-0.5">{game.homeTeam}</div>
                  {formatAmericanOdds(game.homeOdds)}
                </button>
                {game.drawOdds && (
                  <button
                    onClick={() => setSelectedBet({ type: 'moneyline', pick: 'draw', odds: game.drawOdds!, label: 'Draw' })}
                    className={`py-3 px-3 rounded-lg text-sm font-medium transition-all ${selectedBet?.pick === 'draw' && !selectedBet?.propId ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                  >
                    <div className="text-xs text-gray-400 mb-0.5">Draw</div>
                    {formatAmericanOdds(game.drawOdds)}
                  </button>
                )}
                <button
                  onClick={() => setSelectedBet({ type: 'moneyline', pick: 'away', odds: game.awayOdds, label: `${game.awayTeam} to win` })}
                  className={`py-3 px-3 rounded-lg text-sm font-medium transition-all ${selectedBet?.pick === 'away' && !selectedBet?.propId ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                >
                  <div className="text-xs text-gray-400 mb-0.5">{game.awayTeam}</div>
                  {formatAmericanOdds(game.awayOdds)}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {Object.keys(propsByCategory).length > 0 && (
        <div className="space-y-4">
          {Object.entries(propsByCategory).map(([category, props]) => (
            <div key={category} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-700">
                <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wide">{category}</h3>
              </div>
              <div className="divide-y divide-gray-700/50">
                {props.map(prop => (
                  <div key={prop.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-white">{prop.description}</span>
                        {prop.line && <span className="text-sm text-emerald-400 ml-2">{prop.line}</span>}
                      </div>
                      {canBet && (
                        <div className="flex gap-2 shrink-0">
                          {prop.overOdds != null && (
                            <>
                              <button
                                onClick={() => setSelectedBet({ type: 'prop', propId: prop.id, pick: 'over', odds: prop.overOdds!, label: `${prop.description} Over ${prop.line}` })}
                                className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${selectedBet?.propId === prop.id && selectedBet?.pick === 'over' ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                              >
                                <div className="text-[10px] text-gray-400">Over</div>
                                {formatAmericanOdds(prop.overOdds)}
                              </button>
                              <button
                                onClick={() => setSelectedBet({ type: 'prop', propId: prop.id, pick: 'under', odds: prop.underOdds!, label: `${prop.description} Under ${prop.line}` })}
                                className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${selectedBet?.propId === prop.id && selectedBet?.pick === 'under' ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                              >
                                <div className="text-[10px] text-gray-400">Under</div>
                                {formatAmericanOdds(prop.underOdds!)}
                              </button>
                            </>
                          )}
                          {prop.yesOdds != null && (
                            <>
                              <button
                                onClick={() => setSelectedBet({ type: 'prop', propId: prop.id, pick: 'yes', odds: prop.yesOdds!, label: `${prop.description} - Yes` })}
                                className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${selectedBet?.propId === prop.id && selectedBet?.pick === 'yes' ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                              >
                                <div className="text-[10px] text-gray-400">Yes</div>
                                {formatAmericanOdds(prop.yesOdds)}
                              </button>
                              <button
                                onClick={() => setSelectedBet({ type: 'prop', propId: prop.id, pick: 'no', odds: prop.noOdds!, label: `${prop.description} - No` })}
                                className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${selectedBet?.propId === prop.id && selectedBet?.pick === 'no' ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                              >
                                <div className="text-[10px] text-gray-400">No</div>
                                {formatAmericanOdds(prop.noOdds!)}
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedBet && user && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 p-4 z-50">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm font-medium text-white">{selectedBet.label}</div>
                <div className="text-xs text-emerald-400">@ {formatAmericanOdds(selectedBet.odds)}</div>
              </div>
              <button onClick={() => { setSelectedBet(null); setAmount(''); }} className="text-gray-400 hover:text-white text-sm">Cancel</button>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="Amount"
                  min="1"
                  className="w-full bg-gray-800 text-white pl-7 pr-3 py-2.5 rounded-lg text-sm border border-gray-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <button
                onClick={handlePlaceBet}
                disabled={placing || !amount || Number(amount) <= 0}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                {placing ? '...' : `Bet $${amount || '0'}`}
              </button>
            </div>
            {amount && Number(amount) > 0 && (
              <div className="text-xs text-gray-400 mt-1.5 text-center">
                Potential win: ${calculatePayout(Number(amount), selectedBet.odds).toFixed(2)}
              </div>
            )}
          </div>
        </div>
      )}

      {message && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl text-sm font-medium z-50 ${message.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-3 opacity-70 hover:opacity-100">X</button>
        </div>
      )}
    </div>
  );
}
