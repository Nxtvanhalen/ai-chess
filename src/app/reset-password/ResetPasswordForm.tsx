'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const { updatePassword, user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Redirect to home after success
  useEffect(() => {
    if (success) {
      const timeout = setTimeout(() => {
        router.push('/');
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [success, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const { error } = await updatePassword(password);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-dvh h-dvh flex items-center justify-center bg-gradient-to-br from-[#0d0d1a] via-[#1a1a2e] to-[#16162a] px-4 py-8 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="bg-[#1e1e3f]/80 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-purple-500/20 text-center">
            <div className="text-5xl mb-4">&#x2705;</div>
            <h2 className="text-2xl font-bold text-white mb-4">Password updated</h2>
            <p className="text-gray-400 mb-6">
              Your password has been changed successfully. Redirecting you to the game...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Still loading auth state
  if (authLoading) {
    return (
      <div className="min-h-dvh h-dvh flex items-center justify-center bg-gradient-to-br from-[#0d0d1a] via-[#1a1a2e] to-[#16162a]">
        <div className="animate-pulse text-purple-400 text-xl">Loading...</div>
      </div>
    );
  }

  // No session — user arrived without going through /auth/confirm
  if (!user) {
    return (
      <div className="min-h-dvh h-dvh flex items-center justify-center bg-gradient-to-br from-[#0d0d1a] via-[#1a1a2e] to-[#16162a] px-4 py-8 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="bg-[#1e1e3f]/80 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-purple-500/20 text-center">
            <div className="text-5xl mb-4">&#x26A0;&#xFE0F;</div>
            <h2 className="text-2xl font-bold text-white mb-4">Invalid or expired link</h2>
            <p className="text-gray-400 mb-6">
              This password reset link is no longer valid. Please request a new one.
            </p>
            <Link
              href="/forgot-password"
              className="inline-block bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200"
            >
              Request New Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh h-dvh flex items-center justify-center bg-gradient-to-br from-[#0d0d1a] via-[#1a1a2e] to-[#16162a] px-4 py-8 overflow-y-auto">
      <div className="w-full max-w-md my-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Set New Password</h1>
          <p className="text-gray-400">Choose a new password for your account</p>
        </div>

        <div className="bg-[#1e1e3f]/80 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-purple-500/20">
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                New Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-[#2a2a4a] border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-[#2a2a4a] border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Updating...
                </span>
              ) : (
                'Update Password'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
