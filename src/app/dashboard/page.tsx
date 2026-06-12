'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

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

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    const fetchBets = async () => {
      try {
        const data = await api.getMyBets(filter || undefined);
        setBets(data.bets);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchBets();
    const interval = setInterval(fetchBets, 10000);
    return () => clearInterval(interval);
  }, [user, filter]);

  if (authLoading || !user) return null;

  const pendingBets = bets.filter(b => b.status === 'pending');
  const wonBets = bets.filter(b => b.status === 'won');
  const lostBets = bets.filter(b => b.status === 'lost');

  const totalWagered = bets.reduce((sum, b) => sum + b.amount, 0);
  const totalWon = wonBets.reduce((sum, b) => sum + b.potentialWin, 0);
  const profit = totalWon - totalWagered;

  const pickLabel = (bet: Bet) =>
    bet.pick === 'home' ? bet.game.homeTeam : bet.pick === 'away' ? bet.game.awayTeam : 'Draw';

  const statusColor = (status: string) =>
    status === 'pending' ? 'text-amber-400' : status === 'won' ? 'text-emerald-400' : 'text-red-400';

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
          <div className="text-xl font-bold text-amber-400">{pendingBets.length}</div>
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

      <div className="flex gap-2 mb-6">
        {['', 'pending', 'won', 'lost'].map(status => (
          <button
            key={status}
            onClick={() => { setFilter(status); setLoading(true); }}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              filter === status ? 'bg-gray-700 text-white' : 'bg-gray-800/50 text-gray-500 hover:text-gray-300'
            }`}
          >
            {status || 'All'} {status === 'pending' && pendingBets.length > 0 && `(${pendingBets.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400">Loading bets...</div>
      ) : bets.length === 0 ? (
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
                    Pick: <span className="text-white">{pickLabel(bet)}</span> @ {bet.odds.toFixed(2)}
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
      )}
    </div>
  );
}
