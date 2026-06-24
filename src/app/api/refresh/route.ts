import { NextResponse } from 'next/server';
import axios from 'axios';
import prisma from '@/lib/prisma';
import { getOddsApiKey } from '@/lib/settings';
import { generateMockProps } from '@/lib/props';

const BASE_URL = 'https://api.the-odds-api.com/v4';

const SPORT_KEYS = [
  { key: 'americanfootball_nfl', name: 'NFL Football' },
  { key: 'americanfootball_ncaaf', name: 'NCAAF Football' },
  { key: 'baseball_mlb', name: 'MLB Baseball' },
  { key: 'basketball_wnba', name: 'WNBA Basketball' },
  { key: 'mma_mixed_martial_arts', name: 'MMA / UFC' },
  { key: 'boxing_boxing', name: 'Boxing' },
];

const PLAYER_PROP_MARKETS: Record<string, string[]> = {
  baseball_mlb: ['pitcher_strikeouts', 'pitcher_outs', 'batter_home_runs', 'batter_hits', 'batter_total_bases', 'batter_rbis', 'batter_runs_scored'],
  basketball_wnba: ['player_points', 'player_rebounds', 'player_assists'],
  americanfootball_nfl: ['player_pass_yds', 'player_pass_tds', 'player_rush_yds', 'player_reception_yds'],
  americanfootball_ncaaf: ['player_pass_yds', 'player_rush_yds'],
  mma_mixed_martial_arts: [],
  boxing_boxing: [],
};

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'odds';

    const apiKey = await getOddsApiKey();
    if (!apiKey) {
      return NextResponse.json({ error: 'No API key configured' }, { status: 400 });
    }

    if (mode === 'lock-stale') {
      return handleLockStale();
    }

    if (mode === 'props') {
      return handlePlayerProps(apiKey);
    }

    return handleOddsRefresh(apiKey);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}

async function handleOddsRefresh(apiKey: string) {
  let totalGames = 0;
  let creditsRemaining = -1;
  const errors: string[] = [];

  for (const sport of SPORT_KEYS) {
    try {
      const response = await axios.get(`${BASE_URL}/sports/${sport.key}/odds`, {
        params: { apiKey, regions: 'us', markets: 'h2h,spreads,totals', oddsFormat: 'american' },
        timeout: 8000,
      });

      creditsRemaining = parseInt(response.headers['x-requests-remaining'] || '-1');

      const sportRecord = await prisma.sport.findUnique({ where: { key: sport.key } });
      if (!sportRecord) continue;

      for (const event of response.data) {
        const preferred = ['fanduel', 'draftkings'];
        const bookmaker = event.bookmakers?.find((b: { key: string }) => preferred.includes(b.key)) || event.bookmakers?.[0];
        if (!bookmaker) continue;

        const h2h = bookmaker.markets?.find((m: { key: string }) => m.key === 'h2h');
        const totals = bookmaker.markets?.find((m: { key: string }) => m.key === 'totals');

        const outcomes = h2h?.outcomes || [];
        const homeOutcome = outcomes.find((o: { name: string }) => o.name === event.home_team);
        const awayOutcome = outcomes.find((o: { name: string }) => o.name === event.away_team);
        const drawOutcome = outcomes.find((o: { name: string }) => o.name === 'Draw');

        const isLive = !event.completed && new Date(event.commence_time) <= new Date();
        const newStatus = event.completed ? 'completed' : isLive ? 'live' : 'upcoming';

        await prisma.game.upsert({
          where: { externalId: event.id },
          update: {
            homeOdds: homeOutcome?.price || 100,
            awayOdds: awayOutcome?.price || 100,
            drawOdds: drawOutcome?.price || null,
            status: newStatus,
            ...(isLive || event.completed ? { bettingLocked: true } : {}),
            updatedAt: new Date(),
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
            status: newStatus,
            ...(isLive || event.completed ? { bettingLocked: true } : {}),
          },
        });

        const gameRecord = await prisma.game.findUnique({ where: { externalId: event.id } });
        if (gameRecord) {
          if (totals) {
            const overOutcome = totals.outcomes?.find((o: { name: string }) => o.name === 'Over');
            const underOutcome = totals.outcomes?.find((o: { name: string }) => o.name === 'Under');
            if (overOutcome && underOutcome) {
              const desc = `Total ${sport.key.startsWith('baseball') ? 'Runs' : sport.key.startsWith('soccer') ? 'Goals' : 'Points'}`;
              await prisma.propMarket.upsert({
                where: { id: `${gameRecord.id}_totals` },
                update: {
                  overOdds: overOutcome.price,
                  underOdds: underOutcome.price,
                  line: overOutcome.point,
                },
                create: {
                  id: `${gameRecord.id}_totals`,
                  gameId: gameRecord.id,
                  category: 'Game Totals',
                  description: desc,
                  overOdds: overOutcome.price,
                  underOdds: underOutcome.price,
                  line: overOutcome.point,
                },
              });
            }
          }

          const spreads = bookmaker.markets?.find((m: { key: string }) => m.key === 'spreads');
          if (spreads) {
            const homeSpread = spreads.outcomes?.find((o: { name: string }) => o.name === event.home_team);
            const awaySpread = spreads.outcomes?.find((o: { name: string }) => o.name === event.away_team);
            if (homeSpread && awaySpread) {
              await prisma.propMarket.upsert({
                where: { id: `${gameRecord.id}_spread` },
                update: {
                  overOdds: homeSpread.price,
                  underOdds: awaySpread.price,
                  line: homeSpread.point,
                },
                create: {
                  id: `${gameRecord.id}_spread`,
                  gameId: gameRecord.id,
                  category: 'Spread',
                  description: `${event.home_team} vs ${event.away_team}`,
                  overOdds: homeSpread.price,
                  underOdds: awaySpread.price,
                  line: homeSpread.point,
                },
              });
            }
          }
        }

        totalGames++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      errors.push(`${sport.key}: ${msg}`);
      if (msg.includes('401') || msg.includes('403')) {
        await saveSetting('api_credits_remaining', '0');
        break;
      }
    }
  }

  await saveSetting('last_odds_refresh', new Date().toISOString());
  if (creditsRemaining >= 0) {
    await saveSetting('api_credits_remaining', String(creditsRemaining));
  }

  return NextResponse.json({ totalGames, creditsRemaining, errors });
}

async function handlePlayerProps(apiKey: string) {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const todayGames = await prisma.game.findMany({
    where: {
      OR: [
        { startTime: { gte: now, lte: tomorrow }, status: 'upcoming' },
        { status: 'live' },
      ],
    },
    include: { sport: true },
  });

  let propsCreated = 0;
  let creditsRemaining = -1;
  const errors: string[] = [];

  for (const game of todayGames) {
    if (game.status === 'live') continue;
    const markets = PLAYER_PROP_MARKETS[game.sport.key];
    if (!markets || markets.length === 0) continue;

    try {
      const response = await axios.get(
        `${BASE_URL}/sports/${game.sport.key}/events/${game.externalId}/odds`,
        {
          params: { apiKey, regions: 'us', markets: markets.join(','), oddsFormat: 'american' },
          timeout: 8000,
        }
      );

      creditsRemaining = parseInt(response.headers['x-requests-remaining'] || '-1');

      await prisma.propMarket.deleteMany({
        where: { gameId: game.id, category: { notIn: ['Spread', 'Game Totals'] } },
      });

      const allMarketData: Record<string, { outcomes: { description: string; name: string; price: number; point: number }[] }> = {};

      const preferred = ['fanduel', 'draftkings'];
      for (const bm of response.data.bookmakers || []) {
        for (const mkt of bm.markets || []) {
          if (!allMarketData[mkt.key] || preferred.includes(bm.key)) {
            allMarketData[mkt.key] = mkt;
          }
        }
      }

      for (const [marketKey, market] of Object.entries(allMarketData)) {
        const marketName = marketKey.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

        const playerGroups: Record<string, { over?: { price: number; point: number }; under?: { price: number; point: number } }> = {};
        for (const outcome of market.outcomes || []) {
          const player = outcome.description || 'Unknown';
          if (!playerGroups[player]) playerGroups[player] = {};
          if (outcome.name === 'Over') playerGroups[player].over = { price: outcome.price, point: outcome.point };
          else if (outcome.name === 'Under') playerGroups[player].under = { price: outcome.price, point: outcome.point };
        }

        for (const [player, odds] of Object.entries(playerGroups)) {
          if (!odds.over && !odds.under) continue;
          const isPitcher = marketKey.startsWith('pitcher_');
          const isBatter = marketKey.startsWith('batter_');
          const category = isPitcher ? 'Pitcher Props' : isBatter ? 'Batter Props' : 'Player Props';
          await prisma.propMarket.create({
            data: {
              gameId: game.id,
              category,
              description: `${player} - ${marketName}`,
              overOdds: odds.over?.price || null,
              underOdds: odds.under?.price || null,
              line: odds.over?.point || odds.under?.point || null,
            },
          });
          propsCreated++;
        }
      }
    } catch (err) {
      errors.push(`${game.homeTeam} vs ${game.awayTeam}: ${err instanceof Error ? err.message : 'unknown'}`);
    }
  }

  let gamePropsGenerated = 0;
  for (const game of todayGames) {
    try {
      const hasPlayerProps = await prisma.propMarket.count({
        where: { gameId: game.id, category: { in: ['Batter Props', 'Pitcher Props', 'Player Props'] } },
      });
      const hasGameProps = await prisma.propMarket.count({
        where: { gameId: game.id, category: { in: ['Game Props', 'First/Last', 'Fight Props', 'Match Props', 'Scoring Props'] } },
      });
      if (hasGameProps === 0) {
        const skipPlayerProps = game.status === 'live' || hasPlayerProps > 0;
        await generateMockProps(game.id, game.sport.key, skipPlayerProps);
        gamePropsGenerated++;
      }
    } catch {
      // skip
    }
  }

  if (creditsRemaining >= 0) {
    await saveSetting('api_credits_remaining', String(creditsRemaining));
  }

  return NextResponse.json({ gamesChecked: todayGames.length, propsCreated, gamePropsGenerated, creditsRemaining, errors });
}

async function handleLockStale() {
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

  const staleGames = await prisma.game.updateMany({
    where: {
      status: { in: ['upcoming', 'live'] },
      updatedAt: { lt: sixHoursAgo },
      bettingLocked: false,
    },
    data: { bettingLocked: true },
  });

  return NextResponse.json({ lockedGames: staleGames.count, message: `Locked ${staleGames.count} games with stale odds (>6 hours old)` });
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
