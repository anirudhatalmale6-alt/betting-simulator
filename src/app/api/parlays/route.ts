import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

function americanToDecimal(odds: number): number {
  if (odds >= 0) return (odds / 100) + 1;
  return (100 / Math.abs(odds)) + 1;
}

export async function GET(request: Request) {
  try {
    const payload = requireAuth(request);

    const parlays = await prisma.parlay.findMany({
      where: { userId: payload.userId },
      include: {
        legs: {
          include: {
            game: { include: { sport: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ parlays });
  } catch {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = requireAuth(request);
    const { legs, amount } = await request.json();

    if (!legs || !Array.isArray(legs) || legs.length < 2) {
      return NextResponse.json({ error: 'A parlay requires at least 2 legs' }, { status: 400 });
    }

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (user.balance < amount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    let decimalProduct = 1;
    const validatedLegs = [];

    for (const leg of legs) {
      const game = await prisma.game.findUnique({ where: { id: leg.gameId } });
      if (!game) return NextResponse.json({ error: `Game not found: ${leg.gameId}` }, { status: 404 });
      if (game.status === 'completed') return NextResponse.json({ error: `Game already ended: ${game.homeTeam} vs ${game.awayTeam}` }, { status: 400 });
      if (game.bettingLocked) return NextResponse.json({ error: `Betting suspended: ${game.homeTeam} vs ${game.awayTeam}` }, { status: 400 });

      let odds = leg.odds;

      if (leg.propId) {
        const prop = await prisma.propMarket.findUnique({ where: { id: leg.propId } });
        if (!prop) return NextResponse.json({ error: 'Prop market not found' }, { status: 404 });
        if (leg.pick === 'over') odds = prop.overOdds!;
        else if (leg.pick === 'under') odds = prop.underOdds!;
        else if (leg.pick === 'yes') odds = prop.yesOdds!;
        else if (leg.pick === 'no') odds = prop.noOdds!;
      } else {
        if (leg.pick === 'home') odds = game.homeOdds;
        else if (leg.pick === 'away') odds = game.awayOdds;
        else if (leg.pick === 'draw') odds = game.drawOdds || 0;
      }

      decimalProduct *= americanToDecimal(odds);
      validatedLegs.push({ ...leg, odds });
    }

    let totalAmericanOdds: number;
    if (decimalProduct >= 2) {
      totalAmericanOdds = Math.round((decimalProduct - 1) * 100);
    } else {
      totalAmericanOdds = Math.round(-100 / (decimalProduct - 1));
    }

    const potentialWin = Math.round(amount * decimalProduct * 100) / 100;
    const newBalance = user.balance - amount;

    const parlay = await prisma.$transaction(async (tx) => {
      const p = await tx.parlay.create({
        data: {
          userId: user.id,
          amount,
          totalOdds: totalAmericanOdds,
          potentialWin,
          legs: {
            create: validatedLegs.map(leg => ({
              gameId: leg.gameId,
              propId: leg.propId || null,
              pick: leg.pick,
              odds: leg.odds,
              label: leg.label,
            })),
          },
        },
        include: { legs: true },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { balance: newBalance },
      });

      await tx.transaction.create({
        data: {
          userId: user.id,
          type: 'parlay',
          amount: -amount,
          balance: newBalance,
          description: `${legs.length}-leg parlay @ ${totalAmericanOdds >= 0 ? '+' : ''}${totalAmericanOdds}`,
        },
      });

      return p;
    });

    return NextResponse.json({ parlay, newBalance });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Not authenticated' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
