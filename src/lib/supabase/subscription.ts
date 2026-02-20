import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  PLAN_ALLOCATIONS,
  type Subscription,
  type SubscriptionTier,
  type SubscriptionUsage,
} from './types';

// =============================================================================
// SUBSCRIPTION SERVICE - Chester AI Chess
// =============================================================================
// Server-side functions for subscription management and usage (balance model)
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
 * Get user's current usage (balance model)
 */
export async function getUserUsage(userId: string): Promise<SubscriptionUsage | null> {
  const subscription = await getUserSubscription(userId);

  if (!subscription) {
    // Return free tier defaults for users without subscription record
    return {
      ai_moves: { balance: 50, unlimited: false },
      chat_messages: { balance: 20, unlimited: false },
    };
  }

  return {
    ai_moves: {
      balance: subscription.ai_moves_balance,
      unlimited: subscription.ai_moves_balance === -1,
    },
    chat_messages: {
      balance: subscription.chat_messages_balance,
      unlimited: subscription.chat_messages_balance === -1,
    },
  };
}

/**
 * Check if user can make an AI move
 */
export async function canUseAIMove(userId: string): Promise<{
  allowed: boolean;
  balance: number;
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
    return { allowed: true, balance: 0, unlimited: false };
  }

  return {
    allowed: rpcResult.data as boolean,
    balance: usage?.ai_moves.balance ?? 0,
    unlimited: usage?.ai_moves.unlimited ?? false,
  };
}

/**
 * Check if user can send a chat message
 */
export async function canUseChat(userId: string): Promise<{
  allowed: boolean;
  balance: number;
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
    return { allowed: true, balance: 0, unlimited: false };
  }

  return {
    allowed: rpcResult.data as boolean,
    balance: usage?.chat_messages.balance ?? 0,
    unlimited: usage?.chat_messages.unlimited ?? false,
  };
}

/**
 * Increment AI move usage counter (decrements balance)
 */
export async function incrementAIMoveUsage(userId: string): Promise<void> {
  const supabase = await getServerClient();

  const { error } = await supabase.rpc('increment_ai_move_usage', { p_user_id: userId });

  if (error) {
    console.error('[Subscription] Error incrementing AI move usage:', error);
  }
}

/**
 * Increment chat message usage counter (decrements balance)
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
  return PLAN_ALLOCATIONS[tier].features;
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
    balance: number;
  },
  plan: SubscriptionTier = 'free',
): {
  error: string;
  code: string;
  details: {
    type: string;
    balance: number;
    plan: string;
  };
} {
  return {
    error: type === 'ai_move' ? "You're out of AI moves." : "You're out of chat messages.",
    code: 'USAGE_LIMIT_EXCEEDED',
    details: {
      type,
      balance: usage.balance,
      plan,
    },
  };
}

/**
 * Add usage headers to response
 */
export function getUsageHeaders(
  type: 'ai_move' | 'chat',
  usage: {
    balance: number;
    unlimited: boolean;
  },
): Record<string, string> {
  const prefix = type === 'ai_move' ? 'X-AI-Moves' : 'X-Chat-Messages';

  return {
    [`${prefix}-Balance`]: usage.unlimited ? 'unlimited' : String(usage.balance),
  };
}
