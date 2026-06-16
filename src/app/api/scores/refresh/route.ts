import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const maxDuration = 30;

const GAME_DURATIONS: Record<string, number> = {
  baseball: 3 * 60,
  basketball: 2.5 * 60,
  americanfootball: 3.5 * 60,
  icehockey: 2.5 * 60,
  soccer: 2 * 60,
  mma: 1.5 * 60,
  boxing: 1.5 * 60,
  tennis: 2.5 * 60,
  golf: 5 * 60,
  rugbyleague: 2 * 60,
  cricket: 4 * 60,
  aussierules: 2.5 * 60,
};

function getEstimatedDuration(sportKey: string): number {
  for (const [prefix, mins] of Object.entries(GAME_DURATIONS)) {
    if (sportKey.startsWith(prefix)) return mins;
  }
  return 3 * 60;
}

export async function POST() {
  try {
    const now = new Date();
    let gamesStarted = 0;
    let gamesCompleted = 0;
    let betsSettled = 0;

    const upcomingStarted = await prisma.game.updateMany({
      where: {
        status: 'upcoming',
        startTime: { lte: now },
      },
      data: { status: 'live' },
    });
    gamesStarted = upcomingStarted.count;

    const liveGames = await prisma.game.findMany({
      where: { status: 'live' },
      include: { sport: true },
    });

    for (const game of liveGames) {
      const durationMins = getEstimatedDuration(game.sport.key);
      const estimatedEnd = new Date(game.startTime.getTime() + durationMins * 60 * 1000);

      if (now >= estimatedEnd) {
        await prisma.game.update({
          where: { id: game.id },
          data: {
            status: 'completed',
            bettingLocked: true,
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
    });

    for (const game of completedWithPendingBets) {
      const settled = await settleGameBets(game.id);
      betsSettled += settled;
    }

    return NextResponse.json({
      gamesStarted,
      gamesCompleted,
      betsSettled,
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
