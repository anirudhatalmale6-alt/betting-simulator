import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getOddsApiKey } from '@/lib/settings';

export const maxDuration = 60;

const SCORES_API = 'https://api.the-odds-api.com/v4';

const GAME_DURATIONS: Record<string, number> = {
  baseball: 3.5 * 60,
  basketball: 2.5 * 60,
  americanfootball: 3.5 * 60,
  icehockey: 2.5 * 60,
  soccer: 2 * 60,
  mma: 3 * 60,
  boxing: 2.5 * 60,
  tennis: 3 * 60,
  golf: 6 * 60,
  rugbyleague: 2 * 60,
  cricket: 5 * 60,
  aussierules: 2.5 * 60,
};

function getEstimatedDuration(sportKey: string): number {
  for (const [prefix, mins] of Object.entries(GAME_DURATIONS)) {
    if (sportKey.startsWith(prefix)) return mins;
  }
  return 3 * 60;
}

function generateFinalScores(sportKey: string): { homeScore: number; awayScore: number } {
  const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

  if (sportKey.startsWith('baseball')) {
    let home = rand(1, 8);
    let away = rand(1, 8);
    if (home === away) home += rand(0, 1) === 0 ? 1 : -1;
    return { homeScore: Math.max(0, home), awayScore: Math.max(0, away) };
  }
  if (sportKey.startsWith('basketball')) {
    let home = rand(85, 115);
    let away = rand(85, 115);
    if (home === away) home += rand(1, 4);
    return { homeScore: home, awayScore: away };
  }
  if (sportKey.startsWith('americanfootball')) {
    const home = rand(2, 5) * 7 + rand(0, 2) * 3;
    const away = rand(2, 5) * 7 + rand(0, 2) * 3;
    return { homeScore: home, awayScore: away };
  }
  if (sportKey.startsWith('icehockey')) {
    let home = rand(1, 5);
    let away = rand(1, 5);
    if (home === away) away += rand(0, 1) === 0 ? 1 : -1;
    return { homeScore: Math.max(0, home), awayScore: Math.max(0, away) };
  }
  if (sportKey.startsWith('soccer')) {
    return { homeScore: rand(0, 3), awayScore: rand(0, 3) };
  }
  const homeWins = Math.random() > 0.5;
  return { homeScore: homeWins ? 1 : 0, awayScore: homeWins ? 0 : 1 };
}

export async function POST() {
  try {
    const now = new Date();
    let gamesStarted = 0;
    let gamesCompleted = 0;
    let betsSettled = 0;
    let apiScoresUpdated = 0;

    // Step 0: Auto-refresh odds if stale (>6 hours since last refresh)
    const apiKey0 = await getOddsApiKey();
    if (apiKey0) {
      const lastOddsRefresh = await getSettingValue('last_odds_refresh');
      const lastRefreshTime = lastOddsRefresh ? new Date(lastOddsRefresh) : new Date(0);
      const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);

      if (lastRefreshTime < sixHoursAgo) {
        try {
          const baseUrl = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : 'https://betnow2.vercel.app';
          await fetch(`${baseUrl}/api/refresh`, {
            method: 'POST',
            signal: AbortSignal.timeout(50000),
          });
        } catch {
          // auto-refresh failed, will retry next cycle
        }
      }
    }

    // Step 1: Transition upcoming games to live
    const gamesToStart = await prisma.game.findMany({
      where: { status: 'upcoming', startTime: { lte: now } },
      select: { id: true },
    });
    const justStartedIds = gamesToStart.map(g => g.id);

    if (justStartedIds.length > 0) {
      await prisma.game.updateMany({
        where: { id: { in: justStartedIds } },
        data: { status: 'live', lastScoreUpdate: now },
      });
      gamesStarted = justStartedIds.length;
    }

    // Step 2: Lock ALL props for live games (spreads, totals, innings, game props, player props)
    const propsLocked = await prisma.propMarket.updateMany({
      where: {
        game: { status: 'live' },
        settled: false,
      },
      data: { settled: true },
    });

    // Step 3: API-based score sync (runs at most every 5 minutes)
    const apiKey = await getOddsApiKey();
    if (apiKey) {
      const lastSync = await getSettingValue('last_scores_sync');
      const lastSyncTime = lastSync ? new Date(lastSync) : new Date(0);
      const twoMinAgo = new Date(now.getTime() - 2 * 60 * 1000);

      if (lastSyncTime < twoMinAgo) {
        const liveForSync = await prisma.game.findMany({
          where: { status: 'live' },
          include: { sport: true },
        });

        const sportKeys = [...new Set(liveForSync.map(g => g.sport.key))];

        for (const sportKey of sportKeys) {
          try {
            const url = `${SCORES_API}/sports/${sportKey}/scores?apiKey=${apiKey}&daysFrom=2`;
            const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
            if (!res.ok) continue;

            const events = await res.json();
            const remaining = res.headers.get('x-requests-remaining');
            if (remaining) await saveSetting('api_credits_remaining', remaining);

            for (const event of events) {
              const game = await prisma.game.findUnique({ where: { externalId: event.id } });
              if (!game || game.status === 'completed') continue;

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const updateData: any = {};

              if (event.scores && Array.isArray(event.scores)) {
                const homeSc = event.scores.find((s: { name: string; score: string }) => s.name === event.home_team);
                const awaySc = event.scores.find((s: { name: string; score: string }) => s.name === event.away_team);
                if (homeSc) updateData.homeScore = parseInt(homeSc.score) || 0;
                if (awaySc) updateData.awayScore = parseInt(awaySc.score) || 0;
                updateData.lastScoreUpdate = now;
              }

              if (event.completed && game.status !== 'completed') {
                updateData.status = 'completed';
                updateData.bettingLocked = true;
                await prisma.game.update({ where: { id: game.id }, data: updateData });
                const settled = await settleGameBets(game.id);
                betsSettled += settled;
                gamesCompleted++;
              } else if (Object.keys(updateData).length > 0) {
                await prisma.game.update({ where: { id: game.id }, data: updateData });
              }
              apiScoresUpdated++;
            }
          } catch {
            // skip sport on error
          }
        }

        await saveSetting('last_scores_sync', now.toISOString());

        // Fetch live h2h odds from API for sports with live games (every 3 min)
        const lastLiveOddsSync = await getSettingValue('last_live_odds_sync');
        const lastLiveOddsTime = lastLiveOddsSync ? new Date(lastLiveOddsSync) : new Date(0);
        const threeMinAgo = new Date(now.getTime() - 3 * 60 * 1000);

        if (lastLiveOddsTime < threeMinAgo && sportKeys.length > 0) {
          for (const sportKey of sportKeys) {
            try {
              const oddsUrl = `${SCORES_API}/sports/${sportKey}/odds?apiKey=${apiKey}&regions=us&markets=h2h&oddsFormat=american`;
              const oddsRes = await fetch(oddsUrl, { signal: AbortSignal.timeout(8000) });
              if (!oddsRes.ok) continue;

              const oddsEvents = await oddsRes.json();
              const rem = oddsRes.headers.get('x-requests-remaining');
              if (rem) await saveSetting('api_credits_remaining', rem);

              for (const event of oddsEvents) {
                const game = await prisma.game.findUnique({ where: { externalId: event.id } });
                if (!game || game.status === 'completed') continue;

                const preferred = ['fanduel', 'draftkings'];
                const bookmaker = event.bookmakers?.find((b: { key: string }) => preferred.includes(b.key)) || event.bookmakers?.[0];
                if (!bookmaker) continue;

                const h2h = bookmaker.markets?.find((m: { key: string }) => m.key === 'h2h');
                if (!h2h) continue;

                const outcomes = h2h.outcomes || [];
                const homeOutcome = outcomes.find((o: { name: string }) => o.name === event.home_team);
                const awayOutcome = outcomes.find((o: { name: string }) => o.name === event.away_team);

                if (homeOutcome && awayOutcome) {
                  await prisma.game.update({
                    where: { id: game.id },
                    data: {
                      homeOdds: homeOutcome.price,
                      awayOdds: awayOutcome.price,
                    },
                  });
                }
              }
            } catch {
              // skip sport on error
            }
          }
          await saveSetting('last_live_odds_sync', now.toISOString());
        }
      }
    }

    // Step 4: Time-based fallback completion (for games the API might miss or when no API key)
    const liveGames = await prisma.game.findMany({
      where: {
        status: 'live',
        id: { notIn: justStartedIds },
      },
      include: { sport: true },
    });

    for (const game of liveGames) {
      const durationMins = getEstimatedDuration(game.sport.key);
      const estimatedEnd = new Date(game.startTime.getTime() + durationMins * 60 * 1000);
      const minLiveTime = new Date((game.lastScoreUpdate || game.updatedAt).getTime() + 15 * 60 * 1000);

      if (now >= estimatedEnd && now >= minLiveTime) {
        if (game.homeScore === 0 && game.awayScore === 0) {
          const scores = generateFinalScores(game.sport.key);
          await prisma.game.update({
            where: { id: game.id },
            data: {
              status: 'completed',
              bettingLocked: true,
              homeScore: scores.homeScore,
              awayScore: scores.awayScore,
            },
          });
        } else {
          await prisma.game.update({
            where: { id: game.id },
            data: { status: 'completed', bettingLocked: true },
          });
        }

        const settled = await settleGameBets(game.id);
        betsSettled += settled;
        gamesCompleted++;
      }
    }

    // Step 5: Retro-settle completed games that still have pending bets
    const completedWithPendingBets = await prisma.game.findMany({
      where: {
        status: 'completed',
        OR: [
          { bets: { some: { status: 'pending' } } },
          { parlayLegs: { some: { status: 'pending' } } },
        ],
      },
      include: { sport: true },
    });

    for (const game of completedWithPendingBets) {
      if (game.homeScore === 0 && game.awayScore === 0) {
        const scores = generateFinalScores(game.sport.key);
        await prisma.game.update({
          where: { id: game.id },
          data: { homeScore: scores.homeScore, awayScore: scores.awayScore },
        });
      }
      const settled = await settleGameBets(game.id);
      betsSettled += settled;
    }

    return NextResponse.json({
      gamesStarted,
      gamesCompleted,
      betsSettled,
      propsLocked: propsLocked.count,
      retroSettled: completedWithPendingBets.length,
      apiScoresUpdated,
    });
  } catch (error) {
    console.error('Score refresh error:', error);
    return NextResponse.json({ error: 'Failed to refresh scores' }, { status: 500 });
  }
}

async function getSettingValue(key: string): Promise<string | null> {
  try {
    const setting = await prisma.setting.findUnique({ where: { key } });
    return setting?.value || null;
  } catch {
    return null;
  }
}

async function saveSetting(key: string, value: string) {
  try {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  } catch {
    // table might not exist yet
  }
}

async function settleGameBets(gameId: string): Promise<number> {
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) return 0;

  let settled = 0;

  const winner = game.homeScore > game.awayScore ? 'home'
    : game.homeScore < game.awayScore ? 'away'
    : 'draw';

  const pendingBets = await prisma.bet.findMany({
    where: { gameId, status: 'pending' },
  });

  for (const bet of pendingBets) {
    let won = false;

    if (!bet.propId) {
      won = bet.pick === winner;
    } else {
      won = Math.random() > 0.5;
    }

    const newStatus = won ? 'won' : 'lost';

    await prisma.bet.update({
      where: { id: bet.id },
      data: { status: newStatus, settledAt: new Date() },
    });

    if (won) {
      await prisma.user.update({
        where: { id: bet.userId },
        data: { balance: { increment: bet.potentialWin } },
      });
      const freshUser = await prisma.user.findUnique({ where: { id: bet.userId } });
      await prisma.transaction.create({
        data: {
          userId: bet.userId,
          type: 'win',
          amount: bet.potentialWin,
          balance: freshUser?.balance || 0,
          description: `Won bet - Payout $${bet.potentialWin.toFixed(2)}`,
        },
      });
    }

    settled++;
  }

  const pendingParlayLegs = await prisma.parlayLeg.findMany({
    where: { gameId, status: 'pending' },
  });

  for (const leg of pendingParlayLegs) {
    let won = false;

    if (!leg.propId) {
      won = leg.pick === winner;
    } else {
      won = Math.random() > 0.5;
    }

    await prisma.parlayLeg.update({
      where: { id: leg.id },
      data: { status: won ? 'won' : 'lost' },
    });
  }

  const parlayIds = [...new Set(pendingParlayLegs.map(l => l.parlayId))];
  for (const parlayId of parlayIds) {
    const parlay = await prisma.parlay.findUnique({
      where: { id: parlayId },
      include: { legs: true },
    });
    if (!parlay || parlay.status !== 'pending') continue;

    const allSettled = parlay.legs.every(l => l.status !== 'pending');
    if (!allSettled) continue;

    const allWon = parlay.legs.every(l => l.status === 'won');
    const newStatus = allWon ? 'won' : 'lost';

    await prisma.parlay.update({
      where: { id: parlayId },
      data: { status: newStatus, settledAt: new Date() },
    });

    if (allWon) {
      await prisma.user.update({
        where: { id: parlay.userId },
        data: { balance: { increment: parlay.potentialWin } },
      });
      const freshUser = await prisma.user.findUnique({ where: { id: parlay.userId } });
      await prisma.transaction.create({
        data: {
          userId: parlay.userId,
          type: 'win',
          amount: parlay.potentialWin,
          balance: freshUser?.balance || 0,
          description: `Won parlay - Payout $${parlay.potentialWin.toFixed(2)}`,
        },
      });
    }
  }

  return settled;
}
