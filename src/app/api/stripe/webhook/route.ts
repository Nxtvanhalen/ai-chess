import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getLimitsFromPlan, getPlanFromPriceId, getStripeClient } from '@/lib/stripe/config';

// Type alias for service role client
type ServiceRoleClient = SupabaseClient;

// =============================================================================
// STRIPE WEBHOOK HANDLER - Chester AI Chess
// =============================================================================
// Processes Stripe webhook events to update subscription status
// =============================================================================

// Use service role client for webhook (bypasses RLS)
function getServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables for service role');
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[Stripe Webhook] Missing STRIPE_WEBHOOK_SECRET');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  let event: Stripe.Event;
  const stripe = getStripeClient();

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Stripe Webhook] Signature verification failed:', message);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 },
    );
  }

  const supabase = getServiceRoleClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(supabase, stripe, session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(supabase, subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCanceled(supabase, subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(supabase, invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(supabase, invoice);
        break;
      }

      default:
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook] Handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// EVENT HANDLERS
// -----------------------------------------------------------------------------

async function handleCheckoutCompleted(
  supabase: ServiceRoleClient,
  stripe: Stripe,
  session: Stripe.Checkout.Session,
) {
  const userId = session.metadata?.supabase_user_id;
  if (!userId) {
    console.error('[Stripe Webhook] Missing user ID in checkout session');
    return;
  }

  // Get subscription details
  const subscriptionId = session.subscription as string;
  const subscription = (await stripe.subscriptions.retrieve(subscriptionId)) as Stripe.Subscription;
  const subscriptionItem = subscription.items.data[0];
  const priceId = subscriptionItem?.price.id;
  const plan = getPlanFromPriceId(priceId);
  const limits = getLimitsFromPlan(plan);

  // Get period dates from the first subscription item (Stripe SDK v20)
  const periodStart = subscriptionItem?.current_period_start;
  const periodEnd = subscriptionItem?.current_period_end;

  // Update subscription in database
  const { error } = await supabase
    .from('subscriptions')
    .update({
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: subscriptionId,
      stripe_price_id: priceId,
      status: 'active',
      plan_type: plan,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      ...limits,
    })
    .eq('user_id', userId);

  if (error) {
    console.error('[Stripe Webhook] Failed to update subscription:', error);
    return;
  }

  // Update user profile subscription tier
  await supabase.from('user_profiles').update({ subscription_tier: plan }).eq('id', userId);

}

async function handleSubscriptionUpdate(
  supabase: ServiceRoleClient,
  subscription: Stripe.Subscription,
) {
  const userId = subscription.metadata?.supabase_user_id;
  if (!userId) {
    // Try to find user by customer ID
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscription.id)
      .single();

    if (!existingSub?.user_id) {
      console.error('[Stripe Webhook] Could not find user for subscription update');
      return;
    }
  }

  const subscriptionItem = subscription.items.data[0];
  const priceId = subscriptionItem?.price.id;
  const plan = getPlanFromPriceId(priceId);
  const limits = getLimitsFromPlan(plan);

  // Get period dates from the first subscription item (Stripe SDK v20)
  const periodStart = subscriptionItem?.current_period_start;
  const periodEnd = subscriptionItem?.current_period_end;

  // Map Stripe status to our status
  let status: string = subscription.status;
  if (subscription.status === 'incomplete' || subscription.status === 'incomplete_expired') {
    status = 'inactive';
  }

  const { error } = await supabase
    .from('subscriptions')
    .update({
      stripe_price_id: priceId,
      status,
      plan_type: plan,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
      ...limits,
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('[Stripe Webhook] Failed to update subscription:', error);
    return;
  }

  // Update user profile
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (sub?.user_id) {
    await supabase.from('user_profiles').update({ subscription_tier: plan }).eq('id', sub.user_id);
  }

}

async function handleSubscriptionCanceled(
  supabase: ServiceRoleClient,
  subscription: Stripe.Subscription,
) {
  // Reset to free tier
  const freeLimits = getLimitsFromPlan('free');

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      plan_type: 'free',
      canceled_at: new Date().toISOString(),
      ...freeLimits,
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('[Stripe Webhook] Failed to cancel subscription:', error);
    return;
  }

  // Update user profile
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (sub?.user_id) {
    await supabase
      .from('user_profiles')
      .update({ subscription_tier: 'free' })
      .eq('id', sub.user_id);
  }

}

async function handlePaymentSucceeded(supabase: ServiceRoleClient, invoice: Stripe.Invoice) {
  // In Stripe SDK v20, subscription is accessed via parent.subscription_details
  const subscriptionId = getSubscriptionIdFromInvoice(invoice);
  if (!subscriptionId) return;

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      last_payment_date: new Date().toISOString(),
      last_payment_amount: invoice.amount_paid,
    })
    .eq('stripe_subscription_id', subscriptionId);

  if (error) {
    console.error('[Stripe Webhook] Failed to record payment:', error);
  }

}

async function handlePaymentFailed(supabase: ServiceRoleClient, invoice: Stripe.Invoice) {
  const subscriptionId = getSubscriptionIdFromInvoice(invoice);
  if (!subscriptionId) return;

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
    })
    .eq('stripe_subscription_id', subscriptionId);

  if (error) {
    console.error('[Stripe Webhook] Failed to update payment failure:', error);
  }

}

/**
 * Extract subscription ID from invoice (Stripe SDK v20 compatibility)
 */
function getSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  // Try the new v20 path first
  const subDetails = invoice.parent?.subscription_details;
  if (subDetails?.subscription) {
    return typeof subDetails.subscription === 'string'
      ? subDetails.subscription
      : subDetails.subscription.id;
  }

  // Fallback for compatibility
  return null;
}
