import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    requireAdmin(request);
    const games = await prisma.game.findMany({
      include: { sport: true, _count: { select: { bets: true } } },
      orderBy: { startTime: 'desc' },
    });
    return NextResponse.json({ games });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    requireAdmin(request);
    const { sportKey, homeTeam, awayTeam, startTime, homeOdds, awayOdds, drawOdds } = await request.json();

    if (!sportKey || !homeTeam || !awayTeam || !startTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const sport = await prisma.sport.findUnique({ where: { key: sportKey } });
    if (!sport) return NextResponse.json({ error: 'Sport not found' }, { status: 404 });

    const game = await prisma.game.create({
      data: {
        externalId: `admin_${Date.now()}`,
        sportId: sport.id,
        homeTeam,
        awayTeam,
        startTime: new Date(startTime),
        homeOdds: homeOdds || 2.0,
        awayOdds: awayOdds || 2.0,
        drawOdds: drawOdds || null,
      },
      include: { sport: true },
    });

    return NextResponse.json({ game });
  } catch (error) {
    console.error('Create game error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    requireAdmin(request);
    const { gameId, status, homeScore, awayScore, homeOdds, awayOdds, bettingLocked } = await request.json();

    if (!gameId) return NextResponse.json({ error: 'Game ID required' }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (status) data.status = status;
    if (homeScore !== undefined) data.homeScore = Number(homeScore);
    if (awayScore !== undefined) data.awayScore = Number(awayScore);
    if (homeOdds !== undefined) data.homeOdds = Number(homeOdds);
    if (awayOdds !== undefined) data.awayOdds = Number(awayOdds);
    if (bettingLocked !== undefined) data.bettingLocked = bettingLocked;

    if (status === 'completed') {
      data.bettingLocked = true;
    }

    const game = await prisma.game.update({
      where: { id: gameId },
      data,
      include: { sport: true },
    });

    if (status === 'completed') {
      const settled = await settleGameBets(gameId, game.homeScore, game.awayScore);
      return NextResponse.json({ game, betsSettled: settled });
    }

    return NextResponse.json({ game });
  } catch (error) {
    console.error('Update game error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function settleGameBets(gameId: string, homeScore: number, awayScore: number): Promise<number> {
  const winner = homeScore > awayScore ? 'home'
    : homeScore < awayScore ? 'away'
    : 'draw';

  let settled = 0;

  const pendingBets = await prisma.bet.findMany({
    where: { gameId, status: 'pending' },
    include: { user: true },
  });

  for (const bet of pendingBets) {
    let won = false;
    if (!bet.propId) {
      won = bet.pick === winner;
    } else {
      won = Math.random() > 0.5;
    }

    await prisma.bet.update({
      where: { id: bet.id },
      data: { status: won ? 'won' : 'lost', settledAt: new Date() },
    });

    if (won) {
      const newBalance = bet.user.balance + bet.potentialWin;
      await prisma.user.update({
        where: { id: bet.userId },
        data: { balance: newBalance },
      });
      await prisma.transaction.create({
        data: {
          userId: bet.userId,
          type: 'win',
          amount: bet.potentialWin,
          balance: newBalance,
          description: `Won bet - Payout $${bet.potentialWin.toFixed(2)}`,
        },
      });
    }
    settled++;
  }

  const pendingParlayLegs = await prisma.parlayLeg.findMany({
    where: { gameId, status: 'pending' },
    include: { parlay: true },
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
      include: { legs: true, user: true },
    });
    if (!parlay || parlay.status !== 'pending') continue;

    const allSettled = parlay.legs.every(l => l.status !== 'pending');
    if (!allSettled) continue;

    const allWon = parlay.legs.every(l => l.status === 'won');
    await prisma.parlay.update({
      where: { id: parlayId },
      data: { status: allWon ? 'won' : 'lost', settledAt: new Date() },
    });

    if (allWon && parlay.user) {
      const newBalance = parlay.user.balance + parlay.potentialWin;
      await prisma.user.update({
        where: { id: parlay.user.id },
        data: { balance: newBalance },
      });
      await prisma.transaction.create({
        data: {
          userId: parlay.user.id,
          type: 'win',
          amount: parlay.potentialWin,
          balance: newBalance,
          description: `Won parlay - Payout $${parlay.potentialWin.toFixed(2)}`,
        },
      });
    }
  }

  return settled;
}
