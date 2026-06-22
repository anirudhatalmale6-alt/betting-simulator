'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { formatAmericanOdds } from '@/lib/odds-utils';

interface Bet {
  id: string;
  pick: string;
  odds: number;
  amount: number;
  potentialWin: number;
  status: string;
  createdAt: string;
  settledAt: string | null;
  game: {
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    status: string;
    sport: { name: string };
  };
}

interface ParlayLeg {
  id: string;
  pick: string;
  odds: number;
  label: string;
  status: string;
  game: {
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    status: string;
    sport: { name: string };
  };
}

interface Parlay {
  id: string;
  amount: number;
  totalOdds: number;
  potentialWin: number;
  status: string;
  createdAt: string;
  legs: ParlayLeg[];
}

export default function DashboardPage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const [bets, setBets] = useState<Bet[]>([]);
  const [parlays, setParlays] = useState<Parlay[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [tab, setTab] = useState<'bets' | 'parlays'>('bets');

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        await api.refreshScores();
      } catch {
        // silent
      }
      try {
        const [betsData, parlaysData] = await Promise.all([
          api.getMyBets(filter || undefined),
          api.getParlays(),
        ]);
        setBets(betsData.bets);
        setParlays(parlaysData.parlays);
        await refreshUser();
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [user, filter, refreshUser]);

  if (authLoading || !user) return null;

  const pendingBets = bets.filter(b => b.status === 'pending');
  const wonBets = bets.filter(b => b.status === 'won');
  const lostBets = bets.filter(b => b.status === 'lost');
  const pendingParlays = parlays.filter(p => p.status === 'pending');

  const totalWagered = bets.reduce((sum, b) => sum + b.amount, 0) + parlays.reduce((sum, p) => sum + p.amount, 0);
  const totalWon = wonBets.reduce((sum, b) => sum + b.potentialWin, 0) + parlays.filter(p => p.status === 'won').reduce((sum, p) => sum + p.potentialWin, 0);
  const profit = totalWon - totalWagered;

  const pickLabel = (bet: Bet) =>
    bet.pick === 'home' ? bet.game.homeTeam : bet.pick === 'away' ? bet.game.awayTeam : 'Draw';

  const statusColor = (status: string) =>
    status === 'pending' ? 'text-amber-400' : status === 'won' ? 'text-emerald-400' : 'text-red-400';

  const filteredParlays = filter ? parlays.filter(p => p.status === filter) : parlays;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Bets</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <div className="text-sm text-gray-400 mb-1">Balance</div>
          <div className="text-xl font-bold text-emerald-400">${user.balance.toFixed(2)}</div>
        </div>
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <div className="text-sm text-gray-400 mb-1">Active Bets</div>
          <div className="text-xl font-bold text-amber-400">{pendingBets.length + pendingParlays.length}</div>
        </div>
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <div className="text-sm text-gray-400 mb-1">Win Rate</div>
          <div className="text-xl font-bold">
            {wonBets.length + lostBets.length > 0
              ? `${((wonBets.length / (wonBets.length + lostBets.length)) * 100).toFixed(0)}%`
              : '-'}
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <div className="text-sm text-gray-400 mb-1">Profit/Loss</div>
          <div className={`text-xl font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {profit >= 0 ? '+' : ''}${profit.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        <button
          onClick={() => setTab('bets')}
          className={`text-sm font-medium pb-1 border-b-2 transition-colors ${tab === 'bets' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-gray-400 hover:text-white'}`}
        >
          Straight Bets ({bets.length})
        </button>
        <button
          onClick={() => setTab('parlays')}
          className={`text-sm font-medium pb-1 border-b-2 transition-colors ${tab === 'parlays' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-gray-400 hover:text-white'}`}
        >
          Parlays ({parlays.length})
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        {['', 'pending', 'won', 'lost'].map(status => (
          <button
            key={status}
            onClick={() => { setFilter(status); setLoading(true); }}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              filter === status ? 'bg-gray-700 text-white' : 'bg-gray-800/50 text-gray-500 hover:text-gray-300'
            }`}
          >
            {status || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400">Loading...</div>
      ) : tab === 'bets' ? (
        bets.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            No bets yet. Head to <a href="/games" className="text-emerald-400 hover:underline">Games</a> to place your first bet!
          </div>
        ) : (
          <div className="space-y-3">
            {bets.map(bet => (
              <div key={bet.id} className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-400 mb-1">{bet.game.sport.name}</div>
                    <div className="font-medium">
                      {bet.game.homeTeam} vs {bet.game.awayTeam}
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      Pick: <span className="text-white">{pickLabel(bet)}</span> @ {formatAmericanOdds(bet.odds)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${statusColor(bet.status)}`}>
                      {bet.status.toUpperCase()}
                    </div>
                    <div className="text-sm text-gray-400">Bet: ${bet.amount.toFixed(2)}</div>
                    <div className={`text-sm ${bet.status === 'won' ? 'text-emerald-400' : 'text-gray-400'}`}>
                      {bet.status === 'won' ? `Won: $${bet.potentialWin.toFixed(2)}` : `To win: $${bet.potentialWin.toFixed(2)}`}
                    </div>
                  </div>
                </div>
                {bet.game.status !== 'upcoming' && (
                  <div className="mt-2 pt-2 border-t border-gray-700 text-sm text-gray-400">
                    Score: {bet.game.homeTeam} {bet.game.homeScore} - {bet.game.awayScore} {bet.game.awayTeam}
                    {bet.game.status === 'live' && <span className="ml-2 text-emerald-400">(Live)</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        filteredParlays.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            No parlays yet. Add 2+ picks to your bet slip to build a parlay!
          </div>
        ) : (
          <div className="space-y-3">
            {filteredParlays.map(parlay => (
              <div key={parlay.id} className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-sm font-medium text-white">{parlay.legs.length}-Leg Parlay</div>
                    <div className="text-xs text-gray-400">
                      {new Date(parlay.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${statusColor(parlay.status)}`}>
                      {parlay.status.toUpperCase()}
                    </div>
                    <div className="text-xs text-emerald-400">{formatAmericanOdds(parlay.totalOdds)}</div>
                  </div>
                </div>
                <div className="space-y-1.5 mb-3">
                  {parlay.legs.map(leg => (
                    <div key={leg.id} className="flex items-center justify-between text-sm bg-gray-700/30 rounded-lg px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${leg.status === 'won' ? 'bg-emerald-400' : leg.status === 'lost' ? 'bg-red-400' : 'bg-amber-400'}`} />
                        <span className="text-gray-300">{leg.label}</span>
                      </div>
                      <span className="text-gray-400 text-xs">{formatAmericanOdds(leg.odds)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-sm border-t border-gray-700 pt-2">
                  <span className="text-gray-400">Wager: ${parlay.amount.toFixed(2)}</span>
                  <span className={parlay.status === 'won' ? 'text-emerald-400' : 'text-gray-400'}>
                    {parlay.status === 'won' ? `Won: $${parlay.potentialWin.toFixed(2)}` : `To win: $${parlay.potentialWin.toFixed(2)}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
