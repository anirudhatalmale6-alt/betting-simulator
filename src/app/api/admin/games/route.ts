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

    const game = await prisma.game.update({
      where: { id: gameId },
      data,
      include: { sport: true },
    });

    return NextResponse.json({ game });
  } catch (error) {
    console.error('Update game error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
