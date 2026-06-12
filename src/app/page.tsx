'use client';

import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-5xl sm:text-6xl font-bold mb-4">
        <span className="text-emerald-400">Bet</span>Sim
      </h1>
      <p className="text-xl text-gray-400 mb-2 max-w-md">
        Sports betting simulator with play money
      </p>
      <p className="text-gray-500 mb-8 max-w-lg">
        Place virtual bets on real MLB, NHL, NBA, and EPL games. Start with $1,000 and see how far you can go.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        {user ? (
          <>
            <Link
              href="/games"
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-medium text-lg transition-colors"
            >
              Browse Games
            </Link>
            <Link
              href="/dashboard"
              className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-3 rounded-xl font-medium text-lg transition-colors border border-gray-700"
            >
              My Bets
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/register"
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-medium text-lg transition-colors"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-3 rounded-xl font-medium text-lg transition-colors border border-gray-700"
            >
              Login
            </Link>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-16 text-center">
        <div>
          <div className="text-3xl mb-2">&#9918;</div>
          <div className="text-sm text-gray-400">MLB Baseball</div>
        </div>
        <div>
          <div className="text-3xl mb-2">&#127954;</div>
          <div className="text-sm text-gray-400">NHL Hockey</div>
        </div>
        <div>
          <div className="text-3xl mb-2">&#127936;</div>
          <div className="text-sm text-gray-400">NBA Basketball</div>
        </div>
        <div>
          <div className="text-3xl mb-2">&#9917;</div>
          <div className="text-sm text-gray-400">EPL Soccer</div>
        </div>
      </div>
    </div>
  );
}
