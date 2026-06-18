import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const maxDuration = 30;

const GAME_DURATIONS: Record<string, number> = {
  baseball: 4.5 * 60,
  basketball: 3 * 60,
  americanfootball: 4.5 * 60,
  icehockey: 3 * 60,
  soccer: 2.5 * 60,
  mma: 4 * 60,
  boxing: 3 * 60,
  tennis: 4 * 60,
  golf: 7 * 60,
  rugbyleague: 2.5 * 60,
  cricket: 6 * 60,
  aussierules: 3 * 60,
};

function getEstimatedDuration(sportKey: string): number {
  for (const [prefix, mins] of Object.entries(GAME_DURATIONS)) {
    if (sportKey.startsWith(prefix)) return mins;
  }
  return 4 * 60;
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

    const propsLocked = await prisma.propMarket.updateMany({
      where: {
        game: { status: 'live' },
        category: { in: ['Batter Props', 'Pitcher Props', 'Player Props'] },
        settled: false,
      },
      data: { settled: true },
    });

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
      const minLiveTime = new Date((game.lastScoreUpdate || game.updatedAt).getTime() + 60 * 60 * 1000);

      if (now >= estimatedEnd && now >= minLiveTime) {
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

        const settled = await settleGameBets(game.id);
        betsSettled += settled;
        gamesCompleted++;
      }
    }

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
    });
  } catch (error) {
    console.error('Score refresh error:', error);
    return NextResponse.json({ error: 'Failed to refresh scores' }, { status: 500 });
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
