import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash('admin123', 12);
  await prisma.user.upsert({
    where: { email: 'admin@betsim.com' },
    update: {},
    create: {
      email: 'admin@betsim.com',
      username: 'admin',
      passwordHash: adminHash,
      balance: 10000,
      role: 'admin',
      emailVerified: true,
    },
  });

  const sports = [
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

  for (const sport of sports) {
    await prisma.sport.upsert({
      where: { key: sport.key },
      update: { name: sport.name },
      create: sport,
    });
  }

  console.log('Seed complete: admin user + sports created');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
