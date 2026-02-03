'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface UsageData {
  ai_moves: {
    used: number;
    limit: number;
    remaining: number;
    unlimited: boolean;
  };
  chat_messages: {
    used: number;
    limit: number;
    remaining: number;
    unlimited: boolean;
  };
  plan: string;
}

export default function UsageDisplay() {
  const { user } = useAuth();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchUsage = async () => {
      try {
        const response = await fetch('/api/subscription/usage');
        if (response.ok) {
          const data = await response.json();
          setUsage(data);
        }
      } catch (error) {
        console.error('Error fetching usage:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();

    // Refresh every 30 seconds
    const interval = setInterval(fetchUsage, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user || loading) return null;
  if (!usage) return null;

  const movesPercentage = usage.ai_moves.unlimited
    ? 100
    : Math.round((usage.ai_moves.remaining / usage.ai_moves.limit) * 100);

  const isLow = !usage.ai_moves.unlimited && usage.ai_moves.remaining <= 10;
  const isEmpty = !usage.ai_moves.unlimited && usage.ai_moves.remaining === 0;

  return (
    <div className="flex items-center gap-3 px-3 py-1 rounded-lg text-sm">
      <div className="flex items-center gap-2">
        <span className="text-gray-400">Moves:</span>
        {usage.ai_moves.unlimited ? (
          <span className="text-green-400 font-medium">Unlimited</span>
        ) : (
          <>
            <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  isEmpty ? 'bg-red-500' : isLow ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${movesPercentage}%` }}
              />
            </div>
            <span
              className={`font-medium ${
                isEmpty ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-gray-300'
              }`}
            >
              {usage.ai_moves.remaining}/{usage.ai_moves.limit}
            </span>
          </>
        )}
      </div>

      {usage.plan !== 'premium' && (
        <a
          href="/pricing"
          className="text-purple-400 hover:text-purple-300 transition-colors text-xs"
        >
          Upgrade
        </a>
      )}
    </div>
  );
}
