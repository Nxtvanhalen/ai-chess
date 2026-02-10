import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  PLAN_LIMITS,
  type Subscription,
  type SubscriptionTier,
  type SubscriptionUsage,
} from './types';

// =============================================================================
// SUBSCRIPTION SERVICE - Chester AI Chess
// =============================================================================
// Server-side functions for subscription management and usage limits
// =============================================================================

/**
 * Get Supabase server client
 */
async function getServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component context - cookies can't be set
          }
        },
      },
    },
  );
}

/**
 * Get user's subscription data
 */
export async function getUserSubscription(userId: string): Promise<Subscription | null> {
  const supabase = await getServerClient();

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('[Subscription] Error fetching subscription:', error);
    return null;
  }

  return data as Subscription;
}

/**
 * Get user's current usage and limits
 */
export async function getUserUsage(userId: string): Promise<SubscriptionUsage | null> {
  const subscription = await getUserSubscription(userId);

  if (!subscription) {
    // Return free tier limits for users without subscription record
    return {
      ai_moves: {
        used: 0,
        limit: PLAN_LIMITS.free.daily_ai_moves,
        remaining: PLAN_LIMITS.free.daily_ai_moves,
        unlimited: false,
      },
      chat_messages: {
        used: 0,
        limit: PLAN_LIMITS.free.daily_chat_messages,
        remaining: PLAN_LIMITS.free.daily_chat_messages,
        unlimited: false,
      },
    };
  }

  const aiUnlimited = subscription.daily_ai_moves_limit === -1;
  const chatUnlimited = subscription.daily_chat_messages_limit === -1;

  return {
    ai_moves: {
      used: subscription.daily_ai_moves_used,
      limit: subscription.daily_ai_moves_limit,
      remaining: aiUnlimited
        ? Infinity
        : Math.max(0, subscription.daily_ai_moves_limit - subscription.daily_ai_moves_used),
      unlimited: aiUnlimited,
    },
    chat_messages: {
      used: subscription.daily_chat_messages_used,
      limit: subscription.daily_chat_messages_limit,
      remaining: chatUnlimited
        ? Infinity
        : Math.max(
            0,
            subscription.daily_chat_messages_limit - subscription.daily_chat_messages_used,
          ),
      unlimited: chatUnlimited,
    },
  };
}

/**
 * Check if user can make an AI move
 */
export async function canUseAIMove(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
  unlimited: boolean;
}> {
  const start = Date.now();
  const supabase = await getServerClient();

  // Run both checks in parallel - RPC check and usage fetch are independent
  const [rpcResult, usage] = await Promise.all([
    supabase.rpc('can_use_ai_move', { p_user_id: userId }),
    getUserUsage(userId),
  ]);
  console.log(`[Subscription] canUseAIMove (parallel): ${Date.now() - start}ms`);

  if (rpcResult.error) {
    console.error('[Subscription] Error checking AI move usage:', rpcResult.error);
    // INTENTIONAL DESIGN DECISION: Fail open for UX (reviewed 2026-02-09)
    // Rationale: Monthly subscription model means brief outage windows don't
    // cause per-call cost exposure. Usage counters catch up once DB resumes.
    // Blocking users from playing during a DB hiccup is worse than a few
    // uncounted moves. Revisit if switching to per-usage billing.
    return { allowed: true, remaining: 0, limit: 0, unlimited: false };
  }

  return {
    allowed: rpcResult.data as boolean,
    remaining: usage?.ai_moves.remaining ?? 0,
    limit: usage?.ai_moves.limit ?? 0,
    unlimited: usage?.ai_moves.unlimited ?? false,
  };
}

/**
 * Check if user can send a chat message
 */
export async function canUseChat(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
  unlimited: boolean;
}> {
  const start = Date.now();
  const supabase = await getServerClient();

  // Run both checks in parallel - RPC check and usage fetch are independent
  const [rpcResult, usage] = await Promise.all([
    supabase.rpc('can_use_chat', { p_user_id: userId }),
    getUserUsage(userId),
  ]);
  console.log(`[Subscription] canUseChat (parallel): ${Date.now() - start}ms`);

  if (rpcResult.error) {
    console.error('[Subscription] Error checking chat usage:', rpcResult.error);
    // INTENTIONAL DESIGN DECISION: Fail open for UX (reviewed 2026-02-09)
    // See canUseAIMove above for full rationale.
    return { allowed: true, remaining: 0, limit: 0, unlimited: false };
  }

  return {
    allowed: rpcResult.data as boolean,
    remaining: usage?.chat_messages.remaining ?? 0,
    limit: usage?.chat_messages.limit ?? 0,
    unlimited: usage?.chat_messages.unlimited ?? false,
  };
}

/**
 * Increment AI move usage counter
 */
export async function incrementAIMoveUsage(userId: string): Promise<void> {
  const supabase = await getServerClient();

  const { error } = await supabase.rpc('increment_ai_move_usage', { p_user_id: userId });

  if (error) {
    console.error('[Subscription] Error incrementing AI move usage:', error);
  }
}

/**
 * Increment chat message usage counter
 */
export async function incrementChatUsage(userId: string): Promise<void> {
  const supabase = await getServerClient();

  const { error } = await supabase.rpc('increment_chat_usage', { p_user_id: userId });

  if (error) {
    console.error('[Subscription] Error incrementing chat usage:', error);
  }
}

/**
 * Get user's subscription tier
 */
export async function getUserTier(userId: string): Promise<SubscriptionTier> {
  const subscription = await getUserSubscription(userId);
  return subscription?.plan_type ?? 'free';
}

/**
 * Check if user has active paid subscription
 */
export async function hasPaidSubscription(userId: string): Promise<boolean> {
  const subscription = await getUserSubscription(userId);
  if (!subscription) return false;

  return (
    subscription.status === 'active' &&
    (subscription.plan_type === 'pro' || subscription.plan_type === 'premium')
  );
}

/**
 * Get features available for user's tier
 */
export async function getUserFeatures(userId: string): Promise<string[]> {
  const tier = await getUserTier(userId);
  return PLAN_LIMITS[tier].features;
}

// -----------------------------------------------------------------------------
// USAGE RESPONSE HELPERS
// -----------------------------------------------------------------------------

/**
 * Create error response for usage limit exceeded
 */
export function createUsageLimitError(
  type: 'ai_move' | 'chat',
  usage: {
    remaining: number;
    limit: number;
  },
): {
  error: string;
  code: string;
  details: {
    type: string;
    remaining: number;
    limit: number;
    resetAt: string;
  };
} {
  const resetAt = new Date();
  resetAt.setUTCHours(24, 0, 0, 0); // Midnight UTC

  return {
    error:
      type === 'ai_move'
        ? 'Daily AI move limit reached. Upgrade your plan for more moves.'
        : 'Daily chat message limit reached. Upgrade your plan for more messages.',
    code: 'USAGE_LIMIT_EXCEEDED',
    details: {
      type,
      remaining: usage.remaining,
      limit: usage.limit,
      resetAt: resetAt.toISOString(),
    },
  };
}

/**
 * Add usage headers to response
 */
export function getUsageHeaders(
  type: 'ai_move' | 'chat',
  usage: {
    remaining: number;
    limit: number;
    unlimited: boolean;
  },
): Record<string, string> {
  const prefix = type === 'ai_move' ? 'X-AI-Moves' : 'X-Chat-Messages';

  return {
    [`${prefix}-Remaining`]: usage.unlimited ? 'unlimited' : String(usage.remaining),
    [`${prefix}-Limit`]: usage.unlimited ? 'unlimited' : String(usage.limit),
  };
}
