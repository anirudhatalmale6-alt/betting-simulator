'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { useBetSlip } from './BetSlipProvider';
import { formatAmericanOdds } from '@/lib/odds-utils';

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

export default function GameCard({ game }: { game: Game; onBetPlaced?: () => void }) {
  const { user } = useAuth();
  const { addLeg, isInSlip } = useBetSlip();
  const router = useRouter();

  const isLive = game.status === 'live';
  const isCompleted = game.status === 'completed';

  const sportEmoji: Record<string, string> = {
    americanfootball_nfl: '🏈',
    americanfootball_ncaaf: '🏈',
    baseball_mlb: '⚾',
    basketball_nba: '🏀',
    basketball_ncaab: '🏀',
    basketball_wnba: '🏀',
    icehockey_nhl: '🏒',
    soccer_epl: '⚽',
    soccer_spain_la_liga: '⚽',
    soccer_italy_serie_a: '⚽',
    soccer_germany_bundesliga: '⚽',
    soccer_france_ligue_one: '⚽',
    soccer_uefa_champs_league: '⚽',
    soccer_usa_mls: '⚽',
    mma_mixed_martial_arts: '🥊',
    boxing_boxing: '🥊',
    tennis_atp_french_open: '🎾',
    tennis_wta_french_open: '🎾',
    golf_pga_championship: '⛳',
    rugbyleague_nrl: '🏉',
    cricket_ipl: '🏏',
    aussierules_afl: '🏉',
  };

  const gameLabel = `${game.homeTeam} vs ${game.awayTeam}`;

  const handleAddToSlip = (pick: string, odds: number, label: string) => {
    addLeg({
      id: `${game.id}_${pick}`,
      gameId: game.id,
      pick,
      odds,
      label,
      gameLabel,
    });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const homeInSlip = isInSlip(`${game.id}_home`);
  const awayInSlip = isInSlip(`${game.id}_away`);
  const drawInSlip = isInSlip(`${game.id}_draw`);

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
            {(isLive || isCompleted) && (game.homeScore > 0 || game.awayScore > 0) && (
              <div className={`text-2xl font-bold mt-1 ${isLive ? 'text-emerald-400' : 'text-white'}`}>{game.homeScore}</div>
            )}
          </div>
          <div className="text-gray-500 text-sm font-medium px-4">
            {isLive ? (
              <span className="text-emerald-400 text-xs font-semibold flex flex-col items-center gap-1">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                LIVE
              </span>
            ) : 'VS'}
          </div>
          <div className="flex-1 text-center">
            <div className="font-semibold text-white text-sm">{game.awayTeam}</div>
            {(isLive || isCompleted) && (game.homeScore > 0 || game.awayScore > 0) && (
              <div className={`text-2xl font-bold mt-1 ${isLive ? 'text-emerald-400' : 'text-white'}`}>{game.awayScore}</div>
            )}
          </div>
        </div>

        {!isCompleted && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            {game.drawOdds ? (
              <div className="col-span-2 grid grid-cols-3 gap-2">
                <button
                  onClick={() => user && handleAddToSlip('home', game.homeOdds, `${game.homeTeam} ML`)}
                  disabled={game.bettingLocked || !user}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    homeInSlip ? 'bg-emerald-600 text-white ring-2 ring-emerald-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  } ${game.bettingLocked || !user ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="text-xs text-gray-400 mb-0.5">Home</div>
                  {formatAmericanOdds(game.homeOdds)}
                </button>
                <button
                  onClick={() => user && handleAddToSlip('draw', game.drawOdds!, 'Draw')}
                  disabled={game.bettingLocked || !user}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    drawInSlip ? 'bg-emerald-600 text-white ring-2 ring-emerald-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  } ${game.bettingLocked || !user ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="text-xs text-gray-400 mb-0.5">Draw</div>
                  {formatAmericanOdds(game.drawOdds)}
                </button>
                <button
                  onClick={() => user && handleAddToSlip('away', game.awayOdds, `${game.awayTeam} ML`)}
                  disabled={game.bettingLocked || !user}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    awayInSlip ? 'bg-emerald-600 text-white ring-2 ring-emerald-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  } ${game.bettingLocked || !user ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="text-xs text-gray-400 mb-0.5">Away</div>
                  {formatAmericanOdds(game.awayOdds)}
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => user && handleAddToSlip('home', game.homeOdds, `${game.homeTeam} ML`)}
                  disabled={game.bettingLocked || !user}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    homeInSlip ? 'bg-emerald-600 text-white ring-2 ring-emerald-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  } ${game.bettingLocked || !user ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="text-xs text-gray-400 mb-0.5">{game.homeTeam}</div>
                  {formatAmericanOdds(game.homeOdds)}
                </button>
                <button
                  onClick={() => user && handleAddToSlip('away', game.awayOdds, `${game.awayTeam} ML`)}
                  disabled={game.bettingLocked || !user}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    awayInSlip ? 'bg-emerald-600 text-white ring-2 ring-emerald-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  } ${game.bettingLocked || !user ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="text-xs text-gray-400 mb-0.5">{game.awayTeam}</div>
                  {formatAmericanOdds(game.awayOdds)}
                </button>
              </>
            )}
          </div>
        )}

        {!isCompleted && (
          <button
            onClick={() => router.push(`/games/${game.id}`)}
            className="w-full mt-1 py-2 text-xs text-emerald-400 hover:text-emerald-300 border border-gray-700 hover:border-emerald-500/30 rounded-lg transition-colors"
          >
            {isLive ? 'View Live Odds →' : 'View All Props & Markets →'}
          </button>
        )}
      </div>
    </div>
  );
}
