import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const payload = requireAuth(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: Record<string, unknown> = { userId: payload.userId };
    if (status) where.status = status;

    const bets = await prisma.bet.findMany({
      where,
      include: { game: { include: { sport: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ bets });
  } catch {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = requireAuth(request);
    const { gameId, pick, amount, propId } = await request.json();

    if (!gameId || !pick || !amount) {
      return NextResponse.json({ error: 'Game ID, pick, and amount are required' }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (user.balance < amount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

    if (game.status === 'completed') {
      return NextResponse.json({ error: 'Game has already ended' }, { status: 400 });
    }

    if (game.bettingLocked) {
      return NextResponse.json({ error: 'Betting is temporarily suspended for this game' }, { status: 400 });
    }

    let odds: number;
    let betDescription: string;

    if (propId) {
      const prop = await prisma.propMarket.findUnique({ where: { id: propId } });
      if (!prop) return NextResponse.json({ error: 'Prop market not found' }, { status: 404 });
      if (!['over', 'under', 'yes', 'no'].includes(pick)) {
        return NextResponse.json({ error: 'Invalid pick for prop bet' }, { status: 400 });
      }
      if (pick === 'over') odds = prop.overOdds!;
      else if (pick === 'under') odds = prop.underOdds!;
      else if (pick === 'yes') odds = prop.yesOdds!;
      else odds = prop.noOdds!;
      betDescription = `${prop.description} ${pick}${prop.line ? ` ${prop.line}` : ''} @ ${odds}`;
    } else {
      if (!['home', 'away', 'draw'].includes(pick)) {
        return NextResponse.json({ error: 'Invalid pick' }, { status: 400 });
      }
      if (pick === 'draw' && !game.drawOdds) {
        return NextResponse.json({ error: 'Draw bets not available for this sport' }, { status: 400 });
      }
      odds = pick === 'home' ? game.homeOdds : pick === 'away' ? game.awayOdds : game.drawOdds!;
      betDescription = `${pick === 'home' ? game.homeTeam : pick === 'away' ? game.awayTeam : 'Draw'} @ ${odds}`;
    }

    const potentialWin = Math.round(amount * odds * 100) / 100;
    const newBalance = user.balance - amount;

    const [bet] = await prisma.$transaction([
      prisma.bet.create({
        data: { userId: user.id, gameId: game.id, propId: propId || null, pick, odds, amount, potentialWin },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { balance: newBalance },
      }),
      prisma.transaction.create({
        data: {
          userId: user.id,
          type: 'bet',
          amount: -amount,
          balance: newBalance,
          description: `Bet on ${betDescription}`,
        },
      }),
    ]);

    return NextResponse.json({ bet, newBalance });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Not authenticated' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
