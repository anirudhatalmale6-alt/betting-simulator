import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateMockProps } from '@/lib/props';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh') === 'true';

    const game = await prisma.game.findUnique({
      where: { id },
      include: { sport: true, propMarkets: { orderBy: { category: 'asc' } } },
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.propMarkets.length === 0 || refresh) {
      if (refresh) {
        await prisma.propMarket.deleteMany({ where: { gameId: id } });
      }
      await generateMockProps(game.id, game.sport.key);
      const updated = await prisma.game.findUnique({
        where: { id },
        include: { sport: true, propMarkets: { orderBy: { category: 'asc' } } },
      });
      return NextResponse.json({ game: updated });
    }

    return NextResponse.json({ game });
  } catch (error) {
    console.error('Game detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
