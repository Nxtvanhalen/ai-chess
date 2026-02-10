import Stripe from 'stripe';

// =============================================================================
// STRIPE CONFIGURATION - Chester AI Chess
// =============================================================================
// Server-side Stripe client and configuration
// =============================================================================

// -----------------------------------------------------------------------------
// STRIPE CLIENT
// -----------------------------------------------------------------------------

let stripeInstance: Stripe | null = null;

/**
 * Get Stripe server client (singleton)
 */
export function getStripeClient(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      throw new Error(
        'Missing STRIPE_SECRET_KEY environment variable. ' +
          'Please set it in your .env.local file.',
      );
    }

    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2026-01-28.clover',
      typescript: true,
    });
  }

  return stripeInstance;
}

/**
 * Get Stripe client safely (returns null if not configured)
 */
export function getStripeClientSafe(): Stripe | null {
  try {
    return getStripeClient();
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
// PRICE CONFIGURATION
// -----------------------------------------------------------------------------

// These should match the Price IDs from your Stripe dashboard
// After creating products in Stripe, update these values
export const STRIPE_PRICES = {
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly',
    yearly: process.env.STRIPE_PRICE_PRO_YEARLY || 'price_pro_yearly',
  },
  premium: {
    monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY || 'price_premium_monthly',
    yearly: process.env.STRIPE_PRICE_PREMIUM_YEARLY || 'price_premium_yearly',
  },
  movePack: process.env.STRIPE_PRICE_MOVE_PACK || 'price_move_pack_50',
} as const;

// Pricing display (in cents for Stripe, displayed as dollars)
export const PRICING = {
  pro: {
    monthly: 999, // $9.99/month
    yearly: 9999, // $99.99/year (save ~17%)
  },
  premium: {
    monthly: 1999, // $19.99/month
    yearly: 19999, // $199.99/year (save ~17%)
  },
  movePack: {
    amount: 100, // $1.00 one-time
    moves: 50,
  },
} as const;

// -----------------------------------------------------------------------------
// SUBSCRIPTION FEATURES
// -----------------------------------------------------------------------------

export const PLAN_FEATURES = {
  free: {
    name: 'Free',
    description: 'Perfect for casual players',
    features: [
      '50 AI moves per month',
      '20 chat messages per month',
      'Basic Chester AI personality',
      'Last 10 game history',
    ],
    limitations: ['Limited monthly usage', 'No game export', 'Standard response time'],
  },
  pro: {
    name: 'Pro',
    description: 'For dedicated chess enthusiasts',
    features: [
      '500 AI moves per month (unused moves carry over!)',
      '200 chat messages per month',
      'Advanced Chester personality',
      'Unlimited game history',
      'Export games to PGN',
      'Detailed position analysis',
    ],
    limitations: [],
  },
  premium: {
    name: 'Premium',
    description: 'Unlimited chess mastery',
    features: [
      'Unlimited AI moves',
      'Unlimited chat messages',
      'Priority AI response time',
      'Custom difficulty tuning',
      'Early access to new features',
      'All Pro features included',
    ],
    limitations: [],
  },
} as const;

// -----------------------------------------------------------------------------
// WEBHOOK CONFIGURATION
// -----------------------------------------------------------------------------

export const WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
] as const;

// Map Stripe price IDs to our plan types
export function getPlanFromPriceId(priceId: string): 'free' | 'pro' | 'premium' {
  if (priceId === STRIPE_PRICES.premium.monthly || priceId === STRIPE_PRICES.premium.yearly) {
    return 'premium';
  }
  if (priceId === STRIPE_PRICES.pro.monthly || priceId === STRIPE_PRICES.pro.yearly) {
    return 'pro';
  }
  return 'free';
}

// Get balance allocation for a plan (used for initial setup and renewals)
export function getBalanceAllocation(plan: 'free' | 'pro' | 'premium'): {
  ai_moves: number;
  chat_messages: number;
} {
  switch (plan) {
    case 'premium':
      return { ai_moves: -1, chat_messages: -1 }; // unlimited
    case 'pro':
      return { ai_moves: 500, chat_messages: 200 };
    default:
      return { ai_moves: 50, chat_messages: 20 };
  }
}

// Check if a price ID is a move pack (one-time purchase)
export function isMovePack(priceId: string): boolean {
  return priceId === STRIPE_PRICES.movePack;
}
