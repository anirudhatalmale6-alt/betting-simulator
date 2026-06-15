'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { useBetSlip } from '@/components/BetSlipProvider';
import { formatAmericanOdds } from '@/lib/odds-utils';

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
  const { user } = useAuth();
  const { addLeg, isInSlip } = useBetSlip();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);

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

  const isLive = game?.status === 'live';
  const isCompleted = game?.status === 'completed';
  const canBet = user && !isCompleted && !game?.bettingLocked;

  if (loading) return <div className="text-center py-20 text-gray-400">Loading game...</div>;
  if (!game) return <div className="text-center py-20 text-gray-400">Game not found</div>;

  const gameLabel = `${game.homeTeam} vs ${game.awayTeam}`;

  const handleAddToSlip = (pick: string, odds: number, label: string, propId?: string) => {
    const slipId = propId ? `${propId}_${pick}` : `${game.id}_${pick}`;
    addLeg({
      id: slipId,
      gameId: game.id,
      propId,
      pick,
      odds,
      label,
      gameLabel,
    });
  };

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
                  onClick={() => handleAddToSlip('home', game.homeOdds, `${game.homeTeam} ML`)}
                  className={`py-3 px-3 rounded-lg text-sm font-medium transition-all ${isInSlip(`${game.id}_home`) ? 'bg-emerald-600 text-white ring-2 ring-emerald-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                >
                  <div className="text-xs text-gray-400 mb-0.5">{game.homeTeam}</div>
                  {formatAmericanOdds(game.homeOdds)}
                </button>
                {game.drawOdds && (
                  <button
                    onClick={() => handleAddToSlip('draw', game.drawOdds!, 'Draw')}
                    className={`py-3 px-3 rounded-lg text-sm font-medium transition-all ${isInSlip(`${game.id}_draw`) ? 'bg-emerald-600 text-white ring-2 ring-emerald-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                  >
                    <div className="text-xs text-gray-400 mb-0.5">Draw</div>
                    {formatAmericanOdds(game.drawOdds)}
                  </button>
                )}
                <button
                  onClick={() => handleAddToSlip('away', game.awayOdds, `${game.awayTeam} ML`)}
                  className={`py-3 px-3 rounded-lg text-sm font-medium transition-all ${isInSlip(`${game.id}_away`) ? 'bg-emerald-600 text-white ring-2 ring-emerald-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
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
                                onClick={() => handleAddToSlip('over', prop.overOdds!, `${prop.description} Over ${prop.line}`, prop.id)}
                                className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${isInSlip(`${prop.id}_over`) ? 'bg-emerald-600 text-white ring-2 ring-emerald-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                              >
                                <div className="text-[10px] text-gray-400">Over</div>
                                {formatAmericanOdds(prop.overOdds)}
                              </button>
                              <button
                                onClick={() => handleAddToSlip('under', prop.underOdds!, `${prop.description} Under ${prop.line}`, prop.id)}
                                className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${isInSlip(`${prop.id}_under`) ? 'bg-emerald-600 text-white ring-2 ring-emerald-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                              >
                                <div className="text-[10px] text-gray-400">Under</div>
                                {formatAmericanOdds(prop.underOdds!)}
                              </button>
                            </>
                          )}
                          {prop.yesOdds != null && (
                            <>
                              <button
                                onClick={() => handleAddToSlip('yes', prop.yesOdds!, `${prop.description} - Yes`, prop.id)}
                                className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${isInSlip(`${prop.id}_yes`) ? 'bg-emerald-600 text-white ring-2 ring-emerald-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                              >
                                <div className="text-[10px] text-gray-400">Yes</div>
                                {formatAmericanOdds(prop.yesOdds)}
                              </button>
                              <button
                                onClick={() => handleAddToSlip('no', prop.noOdds!, `${prop.description} - No`, prop.id)}
                                className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${isInSlip(`${prop.id}_no`) ? 'bg-emerald-600 text-white ring-2 ring-emerald-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
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
    </div>
  );
}
