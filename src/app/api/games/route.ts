import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { fetchUpcomingGames, ensureSports } from '@/lib/odds-api';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sportKey = searchParams.get('sport');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (sportKey) {
      const sport = await prisma.sport.findUnique({ where: { key: sportKey } });
      if (sport) where.sportId = sport.id;
    }
    if (status) where.status = status;

    let games = await prisma.game.findMany({
      where,
      include: { sport: true },
      orderBy: { startTime: 'asc' },
    });

    if (games.length === 0) {
      await ensureSports();
      await fetchUpcomingGames();
      games = await prisma.game.findMany({
        where,
        include: { sport: true },
        orderBy: { startTime: 'asc' },
      });
    }

    return NextResponse.json({ games });
  } catch (error) {
    console.error('Games fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
