import { NextResponse } from 'next/server';
import { fetchLiveScores, fetchUpcomingGames } from '@/lib/odds-api';

export const maxDuration = 60;

export async function POST() {
  try {
    await fetchLiveScores();
    await fetchUpcomingGames();
    return NextResponse.json({ message: 'Scores refreshed' });
  } catch (error) {
    console.error('Score refresh error:', error);
    return NextResponse.json({ error: 'Failed to refresh scores' }, { status: 500 });
  }
}
