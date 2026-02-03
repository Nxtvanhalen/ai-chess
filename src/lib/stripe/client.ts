import { loadStripe, type Stripe } from '@stripe/stripe-js';

// =============================================================================
// STRIPE CLIENT-SIDE - Chester AI Chess
// =============================================================================
// Browser-safe Stripe client for checkout
// =============================================================================

let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Get Stripe client-side instance (singleton)
 */
export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    if (!publishableKey) {
      console.error('Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
      return Promise.resolve(null);
    }

    stripePromise = loadStripe(publishableKey);
  }

  return stripePromise;
}

/**
 * Redirect to Stripe Checkout via URL
 * In Stripe.js v8+, we redirect directly using the checkout session URL
 */
export async function redirectToCheckout(checkoutUrl: string): Promise<void> {
  if (!checkoutUrl) {
    throw new Error('No checkout URL provided');
  }

  // Direct redirect to Stripe Checkout
  window.location.href = checkoutUrl;
}

/**
 * Create checkout session and get the checkout URL
 */
export async function createCheckoutSession(
  priceId: string,
  successUrl?: string,
  cancelUrl?: string,
): Promise<{ sessionId: string; url: string }> {
  const response = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      priceId,
      successUrl: successUrl || `${window.location.origin}/subscription?success=true`,
      cancelUrl: cancelUrl || `${window.location.origin}/pricing?canceled=true`,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create checkout session');
  }

  const { sessionId, url } = await response.json();
  return { sessionId, url };
}

/**
 * Create checkout and immediately redirect
 */
export async function startCheckout(
  priceId: string,
  successUrl?: string,
  cancelUrl?: string,
): Promise<void> {
  const { url } = await createCheckoutSession(priceId, successUrl, cancelUrl);
  if (url) {
    window.location.href = url;
  } else {
    throw new Error('No checkout URL returned from server');
  }
}

/**
 * Redirect to customer portal for subscription management
 */
export async function redirectToCustomerPortal(): Promise<void> {
  const response = await fetch('/api/stripe/portal', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to access customer portal');
  }

  const { url } = await response.json();
  window.location.href = url;
}
