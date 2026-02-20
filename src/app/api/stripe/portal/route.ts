import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe/config';

// =============================================================================
// STRIPE CUSTOMER PORTAL API - Chester AI Chess
// =============================================================================
// Creates Stripe customer portal sessions for subscription management
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const cookieStore = await cookies();
    const supabase = createServerClient(
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
              // Server Component context
            }
          },
        },
      },
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Stripe Portal] Auth failed:', authError?.message || 'No user');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    console.log('[Stripe Portal] User:', user.id, user.email);

    // Get user's Stripe customer ID
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (subError) {
      console.error('[Stripe Portal] Subscription lookup error:', subError.message);
    }

    if (!subscription?.stripe_customer_id) {
      console.error(
        '[Stripe Portal] No stripe_customer_id for user:',
        user.id,
        'subscription:',
        subscription,
      );
      return NextResponse.json(
        { error: 'No subscription found. Please subscribe first.' },
        { status: 400 },
      );
    }

    const stripe = getStripeClient();
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_SITE_URL,
      'https://chesswithai.com',
      'https://www.chesswithai.com',
      'http://localhost:3000',
      'http://localhost:3001',
    ].filter(Boolean);
    const rawOrigin = request.headers.get('origin') || '';
    const origin = allowedOrigins.includes(rawOrigin)
      ? rawOrigin
      : allowedOrigins[0] || 'http://localhost:3000';

    // Create portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${origin}/subscription`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error('[Stripe Portal] Error:', error);
    return NextResponse.json({ error: 'Failed to access customer portal' }, { status: 500 });
  }
}
