'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <nav className="bg-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-bold text-emerald-400 tracking-tight">
              BetNow
            </Link>
            {user && (
              <div className="hidden sm:flex items-center gap-4">
                <Link href="/games" className="text-gray-300 hover:text-white text-sm transition-colors">
                  Games
                </Link>
                <Link href="/dashboard" className="text-gray-300 hover:text-white text-sm transition-colors">
                  My Bets
                </Link>
                {user.role === 'admin' && (
                  <Link href="/admin" className="text-amber-400 hover:text-amber-300 text-sm transition-colors">
                    Admin
                  </Link>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="text-right">
                  <div className="text-sm text-gray-400">{user.username}</div>
                  <div className="text-sm font-semibold text-emerald-400">${user.balance?.toFixed(2)}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/login" className="text-sm text-gray-300 hover:text-white transition-colors">
                  Login
                </Link>
                <Link
                  href="/register"
                  className="text-sm bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
