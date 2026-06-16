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

type PropTab = 'batting' | 'pitching' | 'game' | 'all';

function getAvailableTabs(props: PropMarket[], sportKey: string): { key: PropTab; label: string }[] {
  const hasBatting = props.some(p => p.category === 'Batter Props');
  const hasPitching = props.some(p => p.category === 'Pitcher Props');
  const hasPlayer = props.some(p => p.category === 'Player Props');
  const hasGame = props.some(p => ['Game Props', 'First/Last', 'Fight Props', 'Match Props', 'Tournament Props', 'Matchup Props', 'Scoring Props'].includes(p.category));

  const tabs: { key: PropTab; label: string }[] = [];

  if (sportKey.startsWith('baseball')) {
    if (hasBatting) tabs.push({ key: 'batting', label: 'Batting' });
    if (hasPitching) tabs.push({ key: 'pitching', label: 'Pitching' });
  } else if (hasPlayer) {
    tabs.push({ key: 'batting', label: 'Player Props' });
  }
  if (hasGame) tabs.push({ key: 'game', label: 'Game Props' });
  if (tabs.length === 0 && props.length > 0) tabs.push({ key: 'all', label: 'All Props' });

  return tabs;
}

function getPropsForTab(props: PropMarket[], tab: PropTab): Record<string, PropMarket[]> {
  let filtered: PropMarket[];
  if (tab === 'batting') {
    filtered = props.filter(p => p.category === 'Batter Props' || p.category === 'Player Props');
  } else if (tab === 'pitching') {
    filtered = props.filter(p => p.category === 'Pitcher Props');
  } else if (tab === 'game') {
    filtered = props.filter(p => ['Game Props', 'First/Last', 'Fight Props', 'Match Props', 'Tournament Props', 'Matchup Props', 'Scoring Props'].includes(p.category));
  } else {
    filtered = props;
  }

  const groups: Record<string, PropMarket[]> = {};
  for (const p of filtered) {
    const marketType = getMarketGroup(p.description);
    if (!groups[marketType]) groups[marketType] = [];
    groups[marketType].push(p);
  }
  return groups;
}

function getMarketGroup(desc: string): string {
  const lower = desc.toLowerCase();
  if (lower.includes('home run')) return 'Player Home Runs';
  if (lower.includes('batter hits') || (lower.includes('hits') && !lower.includes('total hits'))) return 'Player Hits';
  if (lower.includes('total bases')) return 'Player Total Bases';
  if (lower.includes('rbis') || lower.includes('rbi')) return 'Player RBIs';
  if (lower.includes('runs scored') && lower.includes('batter')) return 'Player Runs Scored';
  if (lower.includes('strikeout')) return 'Strikeouts';
  if (lower.includes('pitcher out')) return 'Pitcher Outs';
  if (lower.includes('player point')) return 'Points';
  if (lower.includes('player rebound')) return 'Rebounds';
  if (lower.includes('player assist')) return 'Assists';
  if (lower.includes('run scored in')) return 'Innings - Run Scored';
  if (lower.includes('total run') || lower.includes('total point') || lower.includes('total goal')) return 'Game Total';
  if (lower.includes('extra inning') || lower.includes('overtime')) return 'Extras';
  return 'Other';
}

function getPlayerName(desc: string): string {
  const dash = desc.indexOf(' - ');
  if (dash > 0) return desc.substring(0, dash);
  return desc;
}

function getMarketLabel(desc: string): string {
  const dash = desc.indexOf(' - ');
  if (dash > 0) return desc.substring(dash + 3);
  return desc;
}

export default function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const { addLeg, isInSlip } = useBetSlip();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<PropTab>('batting');

  useEffect(() => {
    fetchGame();
  }, [id]);

  const fetchGame = async () => {
    try {
      const data = await api.getGame(id);
      setGame(data.game);
      const tabs = getAvailableTabs(data.game.propMarkets, data.game.sport.key);
      if (tabs.length > 0) setActiveTab(tabs[0].key);
    } catch {
      console.error('Failed to fetch game');
    } finally {
      setLoading(false);
    }
  };

  const isLive = game?.status === 'live';
  const isCompleted = game?.status === 'completed';
  const canBet = !isCompleted && !game?.bettingLocked;
  const canPlace = user && canBet;

  if (loading) return <div className="text-center py-20 text-gray-400">Loading game...</div>;
  if (!game) return <div className="text-center py-20 text-gray-400">Game not found</div>;

  const gameLabel = `${game.homeTeam} vs ${game.awayTeam}`;
  const nonMetaProps = game.propMarkets.filter(p => p.category !== 'Spread' && p.category !== 'Game Totals');
  const tabs = getAvailableTabs(nonMetaProps, game.sport.key);
  const groupedProps = getPropsForTab(nonMetaProps, activeTab);

  const handleAddToSlip = (pick: string, odds: number, label: string, propId?: string) => {
    const slipId = propId ? `${propId}_${pick}` : `${game.id}_${pick}`;
    addLeg({ id: slipId, gameId: game.id, propId, pick, odds, label, gameLabel });
  };

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
            <div className="space-y-4">
              <div>
                <h3 className="text-sm text-gray-400 mb-2 uppercase tracking-wide">Moneyline</h3>
                <div className={`grid ${game.drawOdds ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
                  <button
                    onClick={() => canPlace && handleAddToSlip('home', game.homeOdds, `${game.homeTeam} ML`)}
                    disabled={!canPlace}
                    className={`py-3 px-3 rounded-lg text-sm font-medium transition-all ${isInSlip(`${game.id}_home`) ? 'bg-emerald-600 text-white ring-2 ring-emerald-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'} ${!canPlace ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    <div className="text-xs text-gray-400 mb-0.5">{game.homeTeam}</div>
                    {formatAmericanOdds(game.homeOdds)}
                  </button>
                  {game.drawOdds && (
                    <button
                      onClick={() => canPlace && handleAddToSlip('draw', game.drawOdds!, 'Draw')}
                      disabled={!canPlace}
                      className={`py-3 px-3 rounded-lg text-sm font-medium transition-all ${isInSlip(`${game.id}_draw`) ? 'bg-emerald-600 text-white ring-2 ring-emerald-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'} ${!canPlace ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      <div className="text-xs text-gray-400 mb-0.5">Draw</div>
                      {formatAmericanOdds(game.drawOdds)}
                    </button>
                  )}
                  <button
                    onClick={() => canPlace && handleAddToSlip('away', game.awayOdds, `${game.awayTeam} ML`)}
                    disabled={!canPlace}
                    className={`py-3 px-3 rounded-lg text-sm font-medium transition-all ${isInSlip(`${game.id}_away`) ? 'bg-emerald-600 text-white ring-2 ring-emerald-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'} ${!canPlace ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    <div className="text-xs text-gray-400 mb-0.5">{game.awayTeam}</div>
                    {formatAmericanOdds(game.awayOdds)}
                  </button>
                </div>
              </div>

              {(() => {
                const spreadProps = game.propMarkets.filter(p => p.category === 'Spread');
                if (spreadProps.length === 0) return null;
                return (
                  <div>
                    <h3 className="text-sm text-gray-400 mb-2 uppercase tracking-wide">Spread</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {spreadProps.map(sp => (
                        <div key={sp.id} className="contents">
                          <button
                            onClick={() => canPlace && handleAddToSlip('over', sp.overOdds!, `${game.homeTeam} ${(sp.line || 0) > 0 ? '+' : ''}${sp.line}`, sp.id)}
                            disabled={!canPlace}
                            className={`py-3 px-3 rounded-lg text-sm font-medium transition-all ${isInSlip(`${sp.id}_over`) ? 'bg-emerald-600 text-white ring-2 ring-emerald-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'} ${!canPlace ? 'opacity-70 cursor-not-allowed' : ''}`}
                          >
                            <div className="text-xs text-gray-400 mb-0.5">{game.homeTeam} {(sp.line || 0) > 0 ? '+' : ''}{sp.line}</div>
                            {sp.overOdds != null && formatAmericanOdds(sp.overOdds)}
                          </button>
                          <button
                            onClick={() => canPlace && handleAddToSlip('under', sp.underOdds!, `${game.awayTeam} ${(-(sp.line || 0)) > 0 ? '+' : ''}${-(sp.line || 0)}`, sp.id)}
                            disabled={!canPlace}
                            className={`py-3 px-3 rounded-lg text-sm font-medium transition-all ${isInSlip(`${sp.id}_under`) ? 'bg-emerald-600 text-white ring-2 ring-emerald-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'} ${!canPlace ? 'opacity-70 cursor-not-allowed' : ''}`}
                          >
                            <div className="text-xs text-gray-400 mb-0.5">{game.awayTeam} {(-(sp.line || 0)) > 0 ? '+' : ''}{-(sp.line || 0)}</div>
                            {sp.underOdds != null && formatAmericanOdds(sp.underOdds)}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {(() => {
                const totalProps = game.propMarkets.filter(p => p.category === 'Game Totals');
                if (totalProps.length === 0) return null;
                return (
                  <div>
                    <h3 className="text-sm text-gray-400 mb-2 uppercase tracking-wide">Total</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {totalProps.map(tp => (
                        <div key={tp.id} className="contents">
                          <button
                            onClick={() => canPlace && handleAddToSlip('over', tp.overOdds!, `Over ${tp.line}`, tp.id)}
                            disabled={!canPlace}
                            className={`py-3 px-3 rounded-lg text-sm font-medium transition-all ${isInSlip(`${tp.id}_over`) ? 'bg-emerald-600 text-white ring-2 ring-emerald-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'} ${!canPlace ? 'opacity-70 cursor-not-allowed' : ''}`}
                          >
                            <div className="text-xs text-gray-400 mb-0.5">Over {tp.line}</div>
                            {tp.overOdds != null && formatAmericanOdds(tp.overOdds)}
                          </button>
                          <button
                            onClick={() => canPlace && handleAddToSlip('under', tp.underOdds!, `Under ${tp.line}`, tp.id)}
                            disabled={!canPlace}
                            className={`py-3 px-3 rounded-lg text-sm font-medium transition-all ${isInSlip(`${tp.id}_under`) ? 'bg-emerald-600 text-white ring-2 ring-emerald-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'} ${!canPlace ? 'opacity-70 cursor-not-allowed' : ''}`}
                          >
                            <div className="text-xs text-gray-400 mb-0.5">Under {tp.line}</div>
                            {tp.underOdds != null && formatAmericanOdds(tp.underOdds)}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {!user && (
                <p className="text-xs text-gray-500 text-center">Sign in to place bets</p>
              )}
            </div>
          )}
        </div>
      </div>

      {game.propMarkets.length > 0 && (
        <>
          <div className="flex border-b border-gray-700 mb-4 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? 'text-emerald-400 border-b-2 border-emerald-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {Object.entries(groupedProps).map(([groupName, props]) => (
              <div key={groupName} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-700">
                  <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wide">{groupName}</h3>
                </div>
                <div className="divide-y divide-gray-700/50">
                  {props.map(prop => {
                    const playerName = getPlayerName(prop.description);
                    const marketLabel = getMarketLabel(prop.description);
                    const isPlayerProp = prop.description.includes(' - ');

                    return (
                      <div key={prop.id} className="px-4 py-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            {isPlayerProp ? (
                              <div>
                                <div className="text-sm font-medium text-white">{playerName}</div>
                                <div className="text-xs text-gray-400">{marketLabel}</div>
                              </div>
                            ) : (
                              <span className="text-sm text-white">{prop.description}</span>
                            )}
                          </div>
                          {canBet && (
                            <div className={`flex gap-2 shrink-0 ${!canPlace ? 'opacity-70' : ''}`}>
                              {prop.overOdds != null && (
                                <>
                                  <button
                                    onClick={() => handleAddToSlip('over', prop.overOdds!, `${playerName} Over ${prop.line}`, prop.id)}
                                    className={`py-2 px-3 rounded-lg text-xs font-medium transition-all min-w-[70px] ${isInSlip(`${prop.id}_over`) ? 'bg-emerald-600 text-white ring-2 ring-emerald-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                  >
                                    <div className="text-[10px] text-gray-400">O {prop.line}</div>
                                    {formatAmericanOdds(prop.overOdds)}
                                  </button>
                                  <button
                                    onClick={() => handleAddToSlip('under', prop.underOdds!, `${playerName} Under ${prop.line}`, prop.id)}
                                    className={`py-2 px-3 rounded-lg text-xs font-medium transition-all min-w-[70px] ${isInSlip(`${prop.id}_under`) ? 'bg-emerald-600 text-white ring-2 ring-emerald-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                  >
                                    <div className="text-[10px] text-gray-400">U {prop.line}</div>
                                    {formatAmericanOdds(prop.underOdds!)}
                                  </button>
                                </>
                              )}
                              {prop.yesOdds != null && (
                                <>
                                  <button
                                    onClick={() => handleAddToSlip('yes', prop.yesOdds!, `${prop.description} - Yes`, prop.id)}
                                    className={`py-2 px-3 rounded-lg text-xs font-medium transition-all min-w-[70px] ${isInSlip(`${prop.id}_yes`) ? 'bg-emerald-600 text-white ring-2 ring-emerald-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                  >
                                    <div className="text-[10px] text-gray-400">Yes</div>
                                    {formatAmericanOdds(prop.yesOdds)}
                                  </button>
                                  <button
                                    onClick={() => handleAddToSlip('no', prop.noOdds!, `${prop.description} - No`, prop.id)}
                                    className={`py-2 px-3 rounded-lg text-xs font-medium transition-all min-w-[70px] ${isInSlip(`${prop.id}_no`) ? 'bg-emerald-600 text-white ring-2 ring-emerald-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
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
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
