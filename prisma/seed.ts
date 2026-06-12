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
    { key: 'baseball_mlb', name: 'MLB Baseball' },
    { key: 'icehockey_nhl', name: 'NHL Hockey' },
    { key: 'basketball_nba', name: 'NBA Basketball' },
    { key: 'soccer_epl', name: 'Soccer - EPL' },
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
