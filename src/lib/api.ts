'use client';

const API_BASE = '';

async function fetchAPI(url: string, options?: RequestInit) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${url}`, { ...options, headers: { ...headers, ...options?.headers } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  register: (data: { email: string; username: string; password: string }) =>
    fetchAPI('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    fetchAPI('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => fetchAPI('/api/auth/logout', { method: 'POST' }),
  getMe: () => fetchAPI('/api/auth/me'),
  getGames: (sport?: string, status?: string) => {
    const params = new URLSearchParams();
    if (sport) params.set('sport', sport);
    if (status) params.set('status', status);
    return fetchAPI(`/api/games?${params}`);
  },
  getGame: (id: string) => fetchAPI(`/api/games/${id}`),
  placeBet: (data: { gameId: string; pick: string; amount: number; propId?: string }) =>
    fetchAPI('/api/bets', { method: 'POST', body: JSON.stringify(data) }),
  getMyBets: (status?: string) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    return fetchAPI(`/api/bets?${params}`);
  },
  placeParlay: (data: { legs: { gameId: string; propId?: string; pick: string; odds: number; label: string }[]; amount: number }) =>
    fetchAPI('/api/parlays', { method: 'POST', body: JSON.stringify(data) }),
  getParlays: () => fetchAPI('/api/parlays'),
  refreshScores: () => fetchAPI('/api/scores/refresh', { method: 'POST' }),
  admin: {
    getUsers: () => fetchAPI('/api/admin/users'),
    updateUser: (data: { userId: string; balance?: number; role?: string }) =>
      fetchAPI('/api/admin/users', { method: 'PATCH', body: JSON.stringify(data) }),
    getGames: () => fetchAPI('/api/admin/games'),
    createGame: (data: Record<string, unknown>) =>
      fetchAPI('/api/admin/games', { method: 'POST', body: JSON.stringify(data) }),
    updateGame: (data: Record<string, unknown>) =>
      fetchAPI('/api/admin/games', { method: 'PATCH', body: JSON.stringify(data) }),
  },
};
