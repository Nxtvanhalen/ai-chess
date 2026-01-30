import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getStripeClient, STRIPE_PRICES } from '@/lib/stripe/config';
import { z } from 'zod';

// =============================================================================
// STRIPE CHECKOUT SESSION API - Chester AI Chess
// =============================================================================
// Creates Stripe checkout sessions for subscription purchases
// =============================================================================

const checkoutSchema = z.object({
  // Support both direct priceId or plan+interval
  priceId: z.string().min(1).optional(),
  plan: z.enum(['pro', 'premium']).optional(),
  interval: z.enum(['monthly', 'yearly']).optional(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
}).refine(
  data => data.priceId || (data.plan && data.interval),
  { message: 'Either priceId or both plan and interval are required' }
);

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
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required. Please log in to subscribe.' },
        { status: 401 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validation = checkoutSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { priceId: directPriceId, plan, interval, successUrl, cancelUrl } = validation.data;

    // Resolve price ID from plan+interval or use direct priceId
    let priceId = directPriceId;
    if (!priceId && plan && interval) {
      priceId = STRIPE_PRICES[plan][interval];
    }

    // Validate price ID is one of our configured prices
    const validPrices = [
      STRIPE_PRICES.pro.monthly,
      STRIPE_PRICES.pro.yearly,
      STRIPE_PRICES.premium.monthly,
      STRIPE_PRICES.premium.yearly,
    ];

    if (!priceId || !validPrices.includes(priceId)) {
      return NextResponse.json(
        { error: 'Invalid price ID or plan selection' },
        { status: 400 }
      );
    }

    const stripe = getStripeClient();

    // Check if user already has a Stripe customer ID
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    let customerId = subscription?.stripe_customer_id;

    // Create or retrieve Stripe customer
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;

      // Save customer ID to database
      await supabase
        .from('subscriptions')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', user.id);
    }

    // Create checkout session
    const origin = request.headers.get('origin') || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl || `${origin}/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${origin}/pricing?canceled=true`,
      metadata: {
        supabase_user_id: user.id,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
        },
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('[Stripe Checkout] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
