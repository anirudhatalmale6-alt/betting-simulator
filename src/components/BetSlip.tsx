'use client';

import { useState } from 'react';
import { useBetSlip } from './BetSlipProvider';
import { useAuth } from './AuthProvider';
import { api } from '@/lib/api';
import { formatAmericanOdds, calculatePayout } from '@/lib/odds-utils';

export default function BetSlip() {
  const { legs, removeLeg, clearSlip, totalOdds, slipOpen, setSlipOpen } = useBetSlip();
  const { user, refreshUser } = useAuth();
  const [amount, setAmount] = useState('');
  const [placing, setPlacing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [mode, setMode] = useState<'parlay' | 'straight'>('parlay');

  if (!user || legs.length === 0) return null;

  const parlayPayout = amount && Number(amount) > 0 ? calculatePayout(Number(amount), totalOdds) : 0;

  const handlePlaceParlay = async () => {
    if (!amount || Number(amount) <= 0 || legs.length < 2) return;
    setPlacing(true);
    setMessage(null);

    try {
      await api.placeParlay({
        legs: legs.map(l => ({
          gameId: l.gameId,
          propId: l.propId,
          pick: l.pick,
          odds: l.odds,
          label: l.label,
        })),
        amount: Number(amount),
      });
      setMessage({ text: `Parlay placed! ${legs.length} legs @ ${formatAmericanOdds(totalOdds)} - Potential win: $${parlayPayout.toFixed(2)}`, type: 'success' });
      clearSlip();
      setAmount('');
      await refreshUser();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Failed to place parlay', type: 'error' });
    } finally {
      setPlacing(false);
    }
  };

  const handlePlaceStraights = async () => {
    if (!amount || Number(amount) <= 0) return;
    setPlacing(true);
    setMessage(null);

    try {
      let successCount = 0;
      for (const leg of legs) {
        await api.placeBet({
          gameId: leg.gameId,
          pick: leg.pick,
          amount: Number(amount),
          propId: leg.propId,
        });
        successCount++;
      }
      setMessage({ text: `${successCount} straight bet${successCount > 1 ? 's' : ''} placed!`, type: 'success' });
      clearSlip();
      setAmount('');
      await refreshUser();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Failed to place bets', type: 'error' });
    } finally {
      setPlacing(false);
    }
  };

  return (
    <>
      {message && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl text-sm font-medium z-[60] ${message.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-3 opacity-70 hover:opacity-100">X</button>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-50">
        <button
          onClick={() => setSlipOpen(!slipOpen)}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 px-4 flex items-center justify-between transition-colors"
        >
          <span className="font-medium text-sm">Bet Slip</span>
          <div className="flex items-center gap-3">
            <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">{legs.length}</span>
            <span className="text-xs">{slipOpen ? '▼' : '▲'}</span>
          </div>
        </button>

        {slipOpen && (
          <div className="bg-gray-900 border-t border-gray-700 max-h-[70vh] overflow-y-auto">
            <div className="max-w-3xl mx-auto p-4">
              {legs.length >= 2 && (
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setMode('parlay')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${mode === 'parlay' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                  >
                    Parlay ({formatAmericanOdds(totalOdds)})
                  </button>
                  <button
                    onClick={() => setMode('straight')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${mode === 'straight' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                  >
                    Straight ({legs.length} bets)
                  </button>
                </div>
              )}

              <div className="space-y-2 mb-3">
                {legs.map(leg => (
                  <div key={leg.id} className="bg-gray-800 rounded-lg px-3 py-2 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-400 truncate">{leg.gameLabel}</div>
                      <div className="text-sm text-white">{leg.label}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-medium text-emerald-400">{formatAmericanOdds(leg.odds)}</span>
                      <button
                        onClick={() => removeLeg(leg.id)}
                        className="text-gray-500 hover:text-red-400 text-xs p-1 transition-colors"
                      >
                        X
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="Wager amount"
                    min="1"
                    className="w-full bg-gray-800 text-white pl-7 pr-3 py-2.5 rounded-lg text-sm border border-gray-600 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                {mode === 'parlay' && legs.length >= 2 ? (
                  <button
                    onClick={handlePlaceParlay}
                    disabled={placing || !amount || Number(amount) <= 0}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    {placing ? '...' : `Place Parlay`}
                  </button>
                ) : (
                  <button
                    onClick={legs.length === 1 ? async () => {
                      setPlacing(true);
                      setMessage(null);
                      try {
                        const leg = legs[0];
                        await api.placeBet({ gameId: leg.gameId, pick: leg.pick, amount: Number(amount), propId: leg.propId });
                        setMessage({ text: `Bet placed! ${leg.label} @ ${formatAmericanOdds(leg.odds)}`, type: 'success' });
                        clearSlip();
                        setAmount('');
                        await refreshUser();
                      } catch (err) {
                        setMessage({ text: err instanceof Error ? err.message : 'Failed to place bet', type: 'error' });
                      } finally {
                        setPlacing(false);
                      }
                    } : handlePlaceStraights}
                    disabled={placing || !amount || Number(amount) <= 0}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    {placing ? '...' : legs.length === 1 ? 'Place Bet' : `Place ${legs.length} Bets`}
                  </button>
                )}
              </div>

              {amount && Number(amount) > 0 && (
                <div className="text-xs text-gray-400 text-center mb-2">
                  {mode === 'parlay' && legs.length >= 2 ? (
                    <>Parlay Odds: {formatAmericanOdds(totalOdds)} | Potential Win: ${parlayPayout.toFixed(2)}</>
                  ) : legs.length === 1 ? (
                    <>Potential Win: ${calculatePayout(Number(amount), legs[0].odds).toFixed(2)}</>
                  ) : (
                    <>Total wagered: ${(Number(amount) * legs.length).toFixed(2)} (${amount} each)</>
                  )}
                </div>
              )}

              <button
                onClick={clearSlip}
                className="w-full text-xs text-gray-500 hover:text-gray-300 py-1 transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
