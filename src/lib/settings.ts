import prisma from './prisma';

let cachedKey: string | null = null;
let cacheTime = 0;

export async function getOddsApiKey(): Promise<string | null> {
  if (cachedKey && Date.now() - cacheTime < 60000) return cachedKey;

  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'odds_api_key' } });
    if (setting?.value) {
      cachedKey = setting.value;
      cacheTime = Date.now();
      return setting.value;
    }
  } catch {
    // table might not exist yet
  }

  return process.env.ODDS_API_KEY || null;
}
