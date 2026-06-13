import axios from 'axios';
import prisma from './prisma';

const ODDS_API_KEY = process.env.ODDS_API_KEY;
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
  { key: 'soccer_italy_serie_a', name: 'Soccer - Serie A' },
  { key: 'soccer_germany_bundesliga', name: 'Soccer - Bundesliga' },
  { key: 'soccer_france_ligue_one', name: 'Soccer - Ligue 1' },
  { key: 'soccer_uefa_champs_league', name: 'Soccer - Champions League' },
  { key: 'soccer_usa_mls', name: 'Soccer - MLS' },
  { key: 'mma_mixed_martial_arts', name: 'MMA / UFC' },
  { key: 'boxing_boxing', name: 'Boxing' },
  { key: 'tennis_atp_french_open', name: 'Tennis - ATP' },
  { key: 'tennis_wta_french_open', name: 'Tennis - WTA' },
  { key: 'golf_pga_championship', name: 'Golf - PGA' },
  { key: 'rugbyleague_nrl', name: 'Rugby - NRL' },
  { key: 'cricket_ipl', name: 'Cricket - IPL' },
  { key: 'aussierules_afl', name: 'AFL' },
];

export async function ensureSports() {
  for (const sport of SPORT_KEYS) {
    await prisma.sport.upsert({
      where: { key: sport.key },
      update: { name: sport.name },
      create: { key: sport.key, name: sport.name },
    });
  }
}

export async function fetchUpcomingGames() {
  if (!ODDS_API_KEY || ODDS_API_KEY === 'your-odds-api-key-here') {
    return generateMockGames();
  }

  const allGames = [];
  for (const sport of SPORT_KEYS) {
    try {
      const response = await axios.get(`${BASE_URL}/sports/${sport.key}/odds`, {
        params: {
          apiKey: ODDS_API_KEY,
          regions: 'us',
          markets: 'h2h',
          oddsFormat: 'decimal',
        },
      });

      const sportRecord = await prisma.sport.findUnique({ where: { key: sport.key } });
      if (!sportRecord) continue;

      for (const event of response.data) {
        const bookmaker = event.bookmakers?.[0];
        const market = bookmaker?.markets?.find((m: { key: string }) => m.key === 'h2h');
        const outcomes = market?.outcomes || [];

        const homeOutcome = outcomes.find((o: { name: string }) => o.name === event.home_team);
        const awayOutcome = outcomes.find((o: { name: string }) => o.name === event.away_team);
        const drawOutcome = outcomes.find((o: { name: string }) => o.name === 'Draw');

        const game = await prisma.game.upsert({
          where: { externalId: event.id },
          update: {
            homeOdds: homeOutcome?.price || 2.0,
            awayOdds: awayOutcome?.price || 2.0,
            drawOdds: drawOutcome?.price || null,
            status: event.completed ? 'completed' : new Date(event.commence_time) <= new Date() ? 'live' : 'upcoming',
          },
          create: {
            externalId: event.id,
            sportId: sportRecord.id,
            homeTeam: event.home_team,
            awayTeam: event.away_team,
            startTime: new Date(event.commence_time),
            homeOdds: homeOutcome?.price || 2.0,
            awayOdds: awayOutcome?.price || 2.0,
            drawOdds: drawOutcome?.price || null,
            status: new Date(event.commence_time) <= new Date() ? 'live' : 'upcoming',
          },
        });
        allGames.push(game);
      }
    } catch (error) {
      console.error(`Error fetching ${sport.key}:`, error);
    }
  }
  return allGames;
}

export async function fetchLiveScores() {
  if (!ODDS_API_KEY || ODDS_API_KEY === 'your-odds-api-key-here') {
    return updateMockScores();
  }

  for (const sport of SPORT_KEYS) {
    try {
      const response = await axios.get(`${BASE_URL}/sports/${sport.key}/scores`, {
        params: { apiKey: ODDS_API_KEY, daysFrom: 1 },
      });

      for (const event of response.data) {
        if (!event.scores) continue;

        const homeScore = event.scores.find((s: { name: string }) => s.name === event.home_team)?.score || 0;
        const awayScore = event.scores.find((s: { name: string }) => s.name === event.away_team)?.score || 0;

        const existingGame = await prisma.game.findUnique({ where: { externalId: event.id } });
        if (!existingGame) continue;

        const scoreChanged = existingGame.homeScore !== Number(homeScore) || existingGame.awayScore !== Number(awayScore);

        if (scoreChanged) {
          await prisma.game.update({
            where: { externalId: event.id },
            data: {
              homeScore: Number(homeScore),
              awayScore: Number(awayScore),
              bettingLocked: true,
              lastScoreUpdate: new Date(),
              status: event.completed ? 'completed' : 'live',
            },
          });

          if (!event.completed) {
            setTimeout(async () => {
              const newOdds = recalculateOdds(Number(homeScore), Number(awayScore), existingGame.homeOdds, existingGame.awayOdds);
              await prisma.game.update({
                where: { externalId: event.id },
                data: {
                  bettingLocked: false,
                  homeOdds: newOdds.home,
                  awayOdds: newOdds.away,
                },
              });
            }, 5000);
          }

          if (event.completed) {
            await settleBets(existingGame.id, Number(homeScore), Number(awayScore));
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching scores for ${sport.key}:`, error);
    }
  }
}

function recalculateOdds(homeScore: number, awayScore: number, prevHomeOdds: number, prevAwayOdds: number) {
  const scoreDiff = homeScore - awayScore;
  let homeAdj = 1.0;
  let awayAdj = 1.0;

  if (scoreDiff > 0) {
    homeAdj = 0.85;
    awayAdj = 1.2;
  } else if (scoreDiff < 0) {
    homeAdj = 1.2;
    awayAdj = 0.85;
  }

  const newHome = Math.max(1.05, Math.min(20, prevHomeOdds * homeAdj));
  const newAway = Math.max(1.05, Math.min(20, prevAwayOdds * awayAdj));

  return {
    home: Math.round(newHome * 100) / 100,
    away: Math.round(newAway * 100) / 100,
  };
}

async function settleBets(gameId: string, homeScore: number, awayScore: number) {
  const winner = homeScore > awayScore ? 'home' : homeScore < awayScore ? 'away' : 'draw';

  const pendingBets = await prisma.bet.findMany({
    where: { gameId, status: 'pending' },
    include: { user: true },
  });

  for (const bet of pendingBets) {
    const won = bet.pick === winner;
    const newStatus = won ? 'won' : 'lost';

    await prisma.bet.update({
      where: { id: bet.id },
      data: { status: newStatus, settledAt: new Date() },
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
          description: `Won bet on game - Payout $${bet.potentialWin.toFixed(2)}`,
        },
      });
    }
  }
}

async function generateMockGames() {
  await ensureSports();
  const sports = await prisma.sport.findMany();
  const teams: Record<string, string[][]> = {
    americanfootball_nfl: [['Kansas City Chiefs', 'Buffalo Bills'], ['Philadelphia Eagles', 'San Francisco 49ers'], ['Dallas Cowboys', 'New York Giants'], ['Miami Dolphins', 'Baltimore Ravens']],
    americanfootball_ncaaf: [['Alabama Crimson Tide', 'Georgia Bulldogs'], ['Ohio State Buckeyes', 'Michigan Wolverines'], ['Texas Longhorns', 'Oklahoma Sooners']],
    baseball_mlb: [['New York Yankees', 'Boston Red Sox'], ['Los Angeles Dodgers', 'San Francisco Giants'], ['Houston Astros', 'Texas Rangers'], ['Chicago Cubs', 'St. Louis Cardinals']],
    basketball_nba: [['Los Angeles Lakers', 'Golden State Warriors'], ['Boston Celtics', 'New York Knicks'], ['Milwaukee Bucks', 'Philadelphia 76ers'], ['Denver Nuggets', 'Phoenix Suns']],
    basketball_ncaab: [['Duke Blue Devils', 'North Carolina Tar Heels'], ['Kentucky Wildcats', 'Kansas Jayhawks'], ['Gonzaga Bulldogs', 'UCLA Bruins']],
    basketball_wnba: [['Las Vegas Aces', 'New York Liberty'], ['Seattle Storm', 'Connecticut Sun']],
    icehockey_nhl: [['Toronto Maple Leafs', 'Montreal Canadiens'], ['New York Rangers', 'Boston Bruins'], ['Edmonton Oilers', 'Calgary Flames'], ['Tampa Bay Lightning', 'Florida Panthers']],
    soccer_epl: [['Manchester United', 'Liverpool'], ['Arsenal', 'Chelsea'], ['Manchester City', 'Tottenham'], ['Newcastle United', 'Aston Villa']],
    soccer_spain_la_liga: [['Real Madrid', 'Barcelona'], ['Atletico Madrid', 'Sevilla'], ['Real Sociedad', 'Athletic Bilbao']],
    soccer_italy_serie_a: [['AC Milan', 'Inter Milan'], ['Juventus', 'Napoli'], ['AS Roma', 'Lazio']],
    soccer_germany_bundesliga: [['Bayern Munich', 'Borussia Dortmund'], ['RB Leipzig', 'Bayer Leverkusen'], ['Eintracht Frankfurt', 'Wolfsburg']],
    soccer_france_ligue_one: [['PSG', 'Marseille'], ['Lyon', 'Monaco'], ['Lille', 'Nice']],
    soccer_uefa_champs_league: [['Real Madrid', 'Manchester City'], ['Bayern Munich', 'PSG'], ['Inter Milan', 'Arsenal']],
    soccer_usa_mls: [['LA Galaxy', 'LAFC'], ['Inter Miami', 'Atlanta United'], ['Seattle Sounders', 'Portland Timbers']],
    mma_mixed_martial_arts: [['Fighter A', 'Fighter B'], ['Fighter C', 'Fighter D']],
    boxing_boxing: [['Boxer A', 'Boxer B'], ['Boxer C', 'Boxer D']],
    tennis_atp_french_open: [['Player A', 'Player B'], ['Player C', 'Player D']],
    tennis_wta_french_open: [['Player A', 'Player B'], ['Player C', 'Player D']],
    golf_pga_championship: [['Golfer A', 'Golfer B'], ['Golfer C', 'Golfer D']],
    rugbyleague_nrl: [['Sydney Roosters', 'Melbourne Storm'], ['Penrith Panthers', 'Brisbane Broncos']],
    cricket_ipl: [['Mumbai Indians', 'Chennai Super Kings'], ['Royal Challengers Bangalore', 'Kolkata Knight Riders']],
    aussierules_afl: [['Collingwood Magpies', 'Carlton Blues'], ['Melbourne Demons', 'Geelong Cats']],
  };

  const allGames = [];
  for (const sport of sports) {
    const matchups = teams[sport.key] || [];
    for (let i = 0; i < matchups.length; i++) {
      const [home, away] = matchups[i];
      const hoursFromNow = i * 3 + 1;
      const startTime = new Date(Date.now() + hoursFromNow * 3600000);
      const isLive = i === 0;

      const externalId = `mock_${sport.key}_${i}`;
      const homeOdds = 1.5 + Math.random() * 2;
      const awayOdds = 1.5 + Math.random() * 2;
      const drawOdds = sport.key.startsWith('soccer_') ? 2.8 + Math.random() * 1.5 : null;

      const game = await prisma.game.upsert({
        where: { externalId },
        update: {
          homeOdds: Math.round(homeOdds * 100) / 100,
          awayOdds: Math.round(awayOdds * 100) / 100,
          drawOdds: drawOdds ? Math.round(drawOdds * 100) / 100 : null,
        },
        create: {
          externalId,
          sportId: sport.id,
          homeTeam: home,
          awayTeam: away,
          startTime: isLive ? new Date(Date.now() - 3600000) : startTime,
          status: isLive ? 'live' : 'upcoming',
          homeScore: isLive ? Math.floor(Math.random() * 4) : 0,
          awayScore: isLive ? Math.floor(Math.random() * 3) : 0,
          homeOdds: Math.round(homeOdds * 100) / 100,
          awayOdds: Math.round(awayOdds * 100) / 100,
          drawOdds: drawOdds ? Math.round(drawOdds * 100) / 100 : null,
        },
      });
      allGames.push(game);
    }
  }
  return allGames;
}

async function updateMockScores() {
  const liveGames = await prisma.game.findMany({ where: { status: 'live' } });
  for (const game of liveGames) {
    if (Math.random() > 0.7) {
      const isHome = Math.random() > 0.5;
      const newHomeScore = game.homeScore + (isHome ? 1 : 0);
      const newAwayScore = game.awayScore + (!isHome ? 1 : 0);

      await prisma.game.update({
        where: { id: game.id },
        data: {
          homeScore: newHomeScore,
          awayScore: newAwayScore,
          bettingLocked: true,
          lastScoreUpdate: new Date(),
        },
      });

      setTimeout(async () => {
        const newOdds = recalculateOdds(newHomeScore, newAwayScore, game.homeOdds, game.awayOdds);
        await prisma.game.update({
          where: { id: game.id },
          data: {
            bettingLocked: false,
            homeOdds: newOdds.home,
            awayOdds: newOdds.away,
          },
        });
      }, 5000);
    }
  }
}
