import { NextResponse } from 'next/server';
import axios from 'axios';
import prisma from '@/lib/prisma';
import { getOddsApiKey } from '@/lib/settings';

const BASE_URL = 'https://api.the-odds-api.com/v4';

const SPORT_KEYS = [
  { key: 'americanfootball_nfl', name: 'NFL Football' },
  { key: 'americanfootball_ncaaf', name: 'NCAAF Football' },
  { key: 'baseball_mlb', name: 'MLB Baseball' },
  { key: 'basketball_nba', name: 'NBA Basketball' },
  { key: 'basketball_ncaab', name: 'NCAAB Basketball' },
  { key: 'basketball_wnba', name: 'WNBA Basketball' },
  { key: 'icehockey_nhl', name: 'NHL Hockey' },
  { key: 'soccer_epl', name: 'Soccer - EPL' },
  { key: 'soccer_spain_la_liga', name: 'Soccer - La Liga' },
  { key: 'soccer_usa_mls', name: 'Soccer - MLS' },
  { key: 'mma_mixed_martial_arts', name: 'MMA / UFC' },
  { key: 'boxing_boxing', name: 'Boxing' },
];

export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('promote');
    const secret = searchParams.get('secret');

    if (secret !== 'betnow-seed-2024') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (email) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
      await prisma.user.update({ where: { id: user.id }, data: { role: 'admin', balance: 10000 } });
      return NextResponse.json({ message: `${email} promoted to admin with $10,000 balance` });
    }

    const resetProps = searchParams.get('resetProps');
    if (resetProps === 'true') {
      const result = await prisma.propMarket.deleteMany({});
      return NextResponse.json({ message: `Deleted ${result.count} prop markets. They will regenerate with correct odds when games are viewed.` });
    }

    const apiKey = searchParams.get('setApiKey');
    if (apiKey) {
      await prisma.setting.upsert({
        where: { key: 'odds_api_key' },
        update: { value: apiKey },
        create: { key: 'odds_api_key', value: apiKey },
      });
      return NextResponse.json({ message: 'API key updated in database' });
    }

    const fixBalances = searchParams.get('fixBalances');
    if (fixBalances === 'true') {
      const users = await prisma.user.findMany();
      const results = [];
      for (const user of users) {
        const betsPlaced = await prisma.bet.aggregate({
          where: { userId: user.id },
          _sum: { amount: true },
        });
        const betsWon = await prisma.bet.aggregate({
          where: { userId: user.id, status: 'won' },
          _sum: { potentialWin: true },
        });
        const parlaysPlaced = await prisma.parlay.aggregate({
          where: { userId: user.id },
          _sum: { amount: true },
        });
        const parlaysWon = await prisma.parlay.aggregate({
          where: { userId: user.id, status: 'won' },
          _sum: { potentialWin: true },
        });

        const startBalance = 10000;
        const totalBet = (betsPlaced._sum.amount || 0) + (parlaysPlaced._sum.amount || 0);
        const totalWon = (betsWon._sum.potentialWin || 0) + (parlaysWon._sum.potentialWin || 0);
        const correctBalance = startBalance - totalBet + totalWon;

        if (Math.abs(user.balance - correctBalance) > 0.01) {
          await prisma.user.update({
            where: { id: user.id },
            data: { balance: Math.round(correctBalance * 100) / 100 },
          });
          results.push({ email: user.email, old: user.balance, new: correctBalance, diff: correctBalance - user.balance });
        }
      }
      return NextResponse.json({ message: 'Balances recalculated', fixes: results });
    }

    return NextResponse.json({ error: 'Missing action param' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sportKey = searchParams.get('sport');

    const sportsToFetch = sportKey
      ? SPORT_KEYS.filter(s => s.key === sportKey)
      : SPORT_KEYS;

    for (const sport of sportsToFetch) {
      await prisma.sport.upsert({
        where: { key: sport.key },
        update: { name: sport.name },
        create: { key: sport.key, name: sport.name },
      });
    }

    const ODDS_API_KEY = await getOddsApiKey();
    if (!ODDS_API_KEY) {
      return NextResponse.json({ error: 'No ODDS_API_KEY configured', sports: sportsToFetch.length });
    }

    let totalGames = 0;
    const errors: string[] = [];

    for (const sport of sportsToFetch) {
      try {
        const response = await axios.get(`${BASE_URL}/sports/${sport.key}/odds`, {
          params: { apiKey: ODDS_API_KEY, regions: 'us', markets: 'h2h', oddsFormat: 'american' },
          timeout: 8000,
        });

        const sportRecord = await prisma.sport.findUnique({ where: { key: sport.key } });
        if (!sportRecord) continue;

        for (const event of response.data) {
          const preferred = ['fanduel', 'draftkings'];
          const bookmaker = event.bookmakers?.find((b: { key: string }) => preferred.includes(b.key)) || event.bookmakers?.[0];
          const market = bookmaker?.markets?.find((m: { key: string }) => m.key === 'h2h');
          const outcomes = market?.outcomes || [];
          const homeOutcome = outcomes.find((o: { name: string }) => o.name === event.home_team);
          const awayOutcome = outcomes.find((o: { name: string }) => o.name === event.away_team);
          const drawOutcome = outcomes.find((o: { name: string }) => o.name === 'Draw');

          await prisma.game.upsert({
            where: { externalId: event.id },
            update: {
              homeOdds: homeOutcome?.price || 100,
              awayOdds: awayOutcome?.price || 100,
              drawOdds: drawOutcome?.price || null,
              status: event.completed ? 'completed' : new Date(event.commence_time) <= new Date() ? 'live' : 'upcoming',
            },
            create: {
              externalId: event.id,
              sportId: sportRecord.id,
              homeTeam: event.home_team,
              awayTeam: event.away_team,
              startTime: new Date(event.commence_time),
              homeOdds: homeOutcome?.price || 100,
              awayOdds: awayOutcome?.price || 100,
              drawOdds: drawOutcome?.price || null,
              status: new Date(event.commence_time) <= new Date() ? 'live' : 'upcoming',
            },
          });
          totalGames++;
        }
      } catch (err) {
        errors.push(`${sport.key}: ${err instanceof Error ? err.message : 'unknown'}`);
      }
    }

    return NextResponse.json({ totalGames, sports: sportsToFetch.length, errors });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
