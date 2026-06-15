'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

interface AdminUser {
  id: string;
  email: string;
  username: string;
  balance: number;
  role: string;
  createdAt: string;
  _count: { bets: number };
}

interface AdminGame {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  homeOdds: number;
  awayOdds: number;
  status: string;
  bettingLocked: boolean;
  startTime: string;
  sport: { name: string; key: string };
  _count: { bets: number };
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<'users' | 'games' | 'create' | 'settings'>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [games, setGames] = useState<AdminGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [newBalance, setNewBalance] = useState('');
  const [message, setMessage] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [currentApiKey, setCurrentApiKey] = useState('');

  const [newGame, setNewGame] = useState({
    sportKey: 'baseball_mlb', homeTeam: '', awayTeam: '', startTime: '',
    homeOdds: '2.00', awayOdds: '2.00', drawOdds: '',
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) router.push('/games');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    const fetchData = async () => {
      try {
        if (tab === 'users') {
          const data = await api.admin.getUsers();
          setUsers(data.users);
        } else if (tab === 'games') {
          const data = await api.admin.getGames();
          setGames(data.games);
        } else if (tab === 'settings') {
          const data = await api.admin.getSettings();
          setCurrentApiKey(data.settings?.odds_api_key || 'Not set');
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    setLoading(true);
    fetchData();
  }, [user, tab]);

  if (authLoading || !user || user.role !== 'admin') return null;

  const handleUpdateBalance = async (userId: string) => {
    try {
      await api.admin.updateUser({ userId, balance: Number(newBalance) });
      setEditingUser(null);
      setNewBalance('');
      setMessage('Balance updated');
      const data = await api.admin.getUsers();
      setUsers(data.users);
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('Failed to update balance');
    }
  };

  const handleToggleRole = async (userId: string, currentRole: string) => {
    try {
      await api.admin.updateUser({ userId, role: currentRole === 'admin' ? 'user' : 'admin' });
      const data = await api.admin.getUsers();
      setUsers(data.users);
    } catch {
      setMessage('Failed to update role');
    }
  };

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.admin.createGame({
        sportKey: newGame.sportKey,
        homeTeam: newGame.homeTeam,
        awayTeam: newGame.awayTeam,
        startTime: newGame.startTime,
        homeOdds: Number(newGame.homeOdds),
        awayOdds: Number(newGame.awayOdds),
        drawOdds: newGame.drawOdds ? Number(newGame.drawOdds) : undefined,
      });
      setMessage('Game created!');
      setNewGame({ sportKey: 'baseball_mlb', homeTeam: '', awayTeam: '', startTime: '', homeOdds: '2.00', awayOdds: '2.00', drawOdds: '' });
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('Failed to create game');
    }
  };

  const handleGameStatus = async (gameId: string, status: string) => {
    try {
      await api.admin.updateGame({ gameId, status });
      const data = await api.admin.getGames();
      setGames(data.games);
    } catch {
      setMessage('Failed to update game');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>

      {message && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-lg p-3 mb-4">
          {message}
        </div>
      )}

      <div className="flex gap-2 mb-6">
        {(['users', 'games', 'create', 'settings'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {t === 'create' ? 'Add Game' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400">Loading...</div>
      ) : tab === 'users' ? (
        <div className="space-y-3">
          {users.map(u => (
            <div key={u.id} className="bg-gray-800 rounded-xl border border-gray-700 p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">{u.username} <span className="text-sm text-gray-400">({u.email})</span></div>
                <div className="text-sm text-gray-400 mt-1">
                  {u._count.bets} bets | Joined {new Date(u.createdAt).toLocaleDateString()}
                  {u.role === 'admin' && <span className="ml-2 text-amber-400">[ADMIN]</span>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {editingUser === u.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={newBalance}
                      onChange={e => setNewBalance(e.target.value)}
                      className="w-24 bg-gray-700 text-white px-2 py-1 rounded text-sm border border-gray-600"
                      placeholder="Amount"
                    />
                    <button onClick={() => handleUpdateBalance(u.id)} className="text-xs text-emerald-400 hover:text-emerald-300">Save</button>
                    <button onClick={() => setEditingUser(null)} className="text-xs text-gray-400 hover:text-gray-300">Cancel</button>
                  </div>
                ) : (
                  <>
                    <span className="text-emerald-400 font-medium">${u.balance.toFixed(2)}</span>
                    <button
                      onClick={() => { setEditingUser(u.id); setNewBalance(u.balance.toString()); }}
                      className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-gray-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleRole(u.id, u.role)}
                      className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-gray-300"
                    >
                      {u.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : tab === 'games' ? (
        <div className="space-y-3">
          {games.map(g => (
            <div key={g.id} className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-400">{g.sport.name}</div>
                  <div className="font-medium">{g.homeTeam} vs {g.awayTeam}</div>
                  <div className="text-sm text-gray-400 mt-1">
                    Score: {g.homeScore}-{g.awayScore} | {g._count.bets} bets | Odds: {g.homeOdds}/{g.awayOdds}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    g.status === 'live' ? 'bg-emerald-600/20 text-emerald-400' :
                    g.status === 'completed' ? 'bg-gray-600/20 text-gray-400' :
                    'bg-blue-600/20 text-blue-400'
                  }`}>{g.status}</span>
                  {g.status === 'upcoming' && (
                    <button onClick={() => handleGameStatus(g.id, 'live')} className="text-xs bg-emerald-700 hover:bg-emerald-600 px-2 py-1 rounded">Start</button>
                  )}
                  {g.status === 'live' && (
                    <button onClick={() => handleGameStatus(g.id, 'completed')} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded">End</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : tab === 'settings' ? (
        <div className="max-w-lg space-y-6">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-4">
            <h2 className="text-lg font-semibold">API Settings</h2>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Current API Key</label>
              <div className="bg-gray-700 px-3 py-2 rounded-lg text-gray-300 font-mono text-sm">{currentApiKey}</div>
            </div>
            {currentApiKey !== 'Not set' && (
              <div>
                <label className="block text-sm text-gray-400 mb-1">Credits Remaining</label>
                <div className={`bg-gray-700 px-3 py-2 rounded-lg font-mono text-sm ${
                  Number(currentApiKey) <= 50 ? 'text-red-400' : 'text-emerald-400'
                }`}>{currentApiKey}</div>
              </div>
            )}
            <div>
              <label className="block text-sm text-gray-400 mb-1">New API Key</label>
              <input
                type="text"
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
                placeholder="Paste new API key here"
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 font-mono text-sm"
              />
            </div>
            <button
              onClick={async () => {
                if (!apiKeyInput.trim()) return;
                try {
                  await api.admin.updateSetting('odds_api_key', apiKeyInput.trim());
                  setMessage('API key updated!');
                  setCurrentApiKey(apiKeyInput.slice(0, 4) + '****' + apiKeyInput.slice(-4));
                  setApiKeyInput('');
                  setTimeout(() => setMessage(''), 3000);
                } catch {
                  setMessage('Failed to update API key');
                }
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg font-medium transition-colors"
            >
              Update API Key
            </button>
            <p className="text-xs text-gray-500">
              Get your API key from the-odds-api.com. Free plan = 500/month. To swap keys, just paste a new one above.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleCreateGame} className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-lg space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Sport</label>
            <select
              value={newGame.sportKey}
              onChange={e => setNewGame({ ...newGame, sportKey: e.target.value })}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600"
            >
              <option value="baseball_mlb">MLB Baseball</option>
              <option value="icehockey_nhl">NHL Hockey</option>
              <option value="basketball_nba">NBA Basketball</option>
              <option value="soccer_epl">Soccer - EPL</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Home Team</label>
              <input type="text" value={newGame.homeTeam} onChange={e => setNewGame({ ...newGame, homeTeam: e.target.value })} required className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Away Team</label>
              <input type="text" value={newGame.awayTeam} onChange={e => setNewGame({ ...newGame, awayTeam: e.target.value })} required className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Start Time</label>
            <input type="datetime-local" value={newGame.startTime} onChange={e => setNewGame({ ...newGame, startTime: e.target.value })} required className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Home Odds</label>
              <input type="number" step="0.01" value={newGame.homeOdds} onChange={e => setNewGame({ ...newGame, homeOdds: e.target.value })} className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Away Odds</label>
              <input type="number" step="0.01" value={newGame.awayOdds} onChange={e => setNewGame({ ...newGame, awayOdds: e.target.value })} className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Draw Odds</label>
              <input type="number" step="0.01" value={newGame.drawOdds} onChange={e => setNewGame({ ...newGame, drawOdds: e.target.value })} placeholder="Soccer only" className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600" />
            </div>
          </div>
          <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg font-medium transition-colors">
            Create Game
          </button>
        </form>
      )}
    </div>
  );
}
