'use client';

import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-5xl sm:text-6xl font-bold mb-4">
        <span className="text-emerald-400">Bet</span>Now
      </h1>
      <p className="text-xl text-gray-400 mb-2 max-w-md">
        Sports betting simulator with play money
      </p>
      <p className="text-gray-500 mb-8 max-w-lg">
        Place virtual bets on NFL, MLB, NBA, NHL, Soccer, MMA, Tennis, Golf and more. Create an account and start betting!
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

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-4 mt-16 text-center">
        <div><div className="text-2xl mb-1">&#127944;</div><div className="text-xs text-gray-400">NFL</div></div>
        <div><div className="text-2xl mb-1">&#9918;</div><div className="text-xs text-gray-400">MLB</div></div>
        <div><div className="text-2xl mb-1">&#127936;</div><div className="text-xs text-gray-400">NBA</div></div>
        <div><div className="text-2xl mb-1">&#127954;</div><div className="text-xs text-gray-400">NHL</div></div>
        <div><div className="text-2xl mb-1">&#9917;</div><div className="text-xs text-gray-400">Soccer</div></div>
        <div><div className="text-2xl mb-1">&#129354;</div><div className="text-xs text-gray-400">MMA</div></div>
        <div><div className="text-2xl mb-1">&#127934;</div><div className="text-xs text-gray-400">Tennis</div></div>
        <div><div className="text-2xl mb-1">&#9971;</div><div className="text-xs text-gray-400">Golf</div></div>
        <div><div className="text-2xl mb-1">&#127951;</div><div className="text-xs text-gray-400">Cricket</div></div>
        <div><div className="text-2xl mb-1">&#127945;</div><div className="text-xs text-gray-400">Rugby</div></div>
      </div>
    </div>
  );
}
