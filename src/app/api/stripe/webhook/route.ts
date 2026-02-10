import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import {
  getBalanceAllocation,
  getPlanFromPriceId,
  getStripeClient,
  isMovePack,
  PRICING,
} from '@/lib/stripe/config';

// Type alias for service role client
type ServiceRoleClient = SupabaseClient;

// =============================================================================
// STRIPE WEBHOOK HANDLER - Chester AI Chess
// =============================================================================
// Processes Stripe webhook events to update subscription status
// Balance bank model: moves are a bank that gets topped up on renewal/purchase
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

  // Check if this is a one-time move pack purchase
  if (session.mode === 'payment') {
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
    const priceId = lineItems.data[0]?.price?.id;

    if (priceId && isMovePack(priceId)) {
      await handleMovePackPurchase(supabase, userId, PRICING.movePack.moves);
      return;
    }
  }

  // Subscription checkout - set initial balance
  const subscriptionId = session.subscription as string;
  const subscription = (await stripe.subscriptions.retrieve(subscriptionId)) as Stripe.Subscription;
  const subscriptionItem = subscription.items.data[0];
  const priceId = subscriptionItem?.price.id;
  const plan = getPlanFromPriceId(priceId);
  const allocation = getBalanceAllocation(plan);

  // Get period dates from the first subscription item (Stripe SDK v20)
  const periodStart = subscriptionItem?.current_period_start;
  const periodEnd = subscriptionItem?.current_period_end;

  // Update subscription in database with initial balance
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
      ai_moves_balance: allocation.ai_moves,
      chat_messages_balance: allocation.chat_messages,
    })
    .eq('user_id', userId);

  if (error) {
    console.error('[Stripe Webhook] Failed to update subscription:', error);
    throw new Error(`Database error in handleCheckoutCompleted: ${error.message}`);
  }

  // Update user profile subscription tier
  await supabase.from('user_profiles').update({ subscription_tier: plan }).eq('id', userId);
  console.log(`[Stripe Webhook] Checkout completed: user=${userId} plan=${plan} balance=${allocation.ai_moves}`);
}

/**
 * Handle one-time move pack purchase - add moves to user's balance
 */
async function handleMovePackPurchase(
  supabase: ServiceRoleClient,
  userId: string,
  movesToAdd: number,
) {
  const { error } = await supabase.rpc('add_to_balance', {
    p_user_id: userId,
    p_ai_moves: movesToAdd,
    p_chat_messages: 0,
  });

  if (error) {
    console.error('[Stripe Webhook] Failed to add move pack balance:', error);
    throw new Error(`Database error in handleMovePackPurchase: ${error.message}`);
  }

  console.log(`[Stripe Webhook] Move pack: added ${movesToAdd} moves to user ${userId}`);
}

async function handleSubscriptionUpdate(
  supabase: ServiceRoleClient,
  subscription: Stripe.Subscription,
) {
  const userId = subscription.metadata?.supabase_user_id;
  if (!userId) {
    // Try to find user by subscription ID
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

  // Get period dates from the first subscription item (Stripe SDK v20)
  const periodStart = subscriptionItem?.current_period_start;
  const periodEnd = subscriptionItem?.current_period_end;

  // Map Stripe status to our status
  let status: string = subscription.status;
  if (subscription.status === 'incomplete' || subscription.status === 'incomplete_expired') {
    status = 'inactive';
  }

  // Build update - don't touch balance on subscription updates (balance managed via invoice.paid)
  // Exception: if upgrading to premium, set unlimited (-1)
  const updateData: Record<string, unknown> = {
    stripe_price_id: priceId,
    status,
    plan_type: plan,
    current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: subscription.cancel_at_period_end,
    canceled_at: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000).toISOString()
      : null,
  };

  // If upgrading to premium, set balance to unlimited
  if (plan === 'premium') {
    updateData.ai_moves_balance = -1;
    updateData.chat_messages_balance = -1;
  }

  const { error } = await supabase
    .from('subscriptions')
    .update(updateData)
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('[Stripe Webhook] Failed to update subscription:', error);
    throw new Error(`Database error in handleSubscriptionUpdate: ${error.message}`);
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
  console.log(`[Stripe Webhook] Subscription updated: plan=${plan} status=${status}`);
}

async function handleSubscriptionCanceled(
  supabase: ServiceRoleClient,
  subscription: Stripe.Subscription,
) {
  // Downgrade to free but KEEP existing balance (user retains banked moves)
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      plan_type: 'free',
      canceled_at: new Date().toISOString(),
      // NOTE: balance intentionally NOT reset - user keeps banked moves
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('[Stripe Webhook] Failed to cancel subscription:', error);
    throw new Error(`Database error in handleSubscriptionCanceled: ${error.message}`);
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
  console.log('[Stripe Webhook] Subscription canceled - balance preserved');
}

async function handlePaymentSucceeded(supabase: ServiceRoleClient, invoice: Stripe.Invoice) {
  // In Stripe SDK v20, subscription is accessed via parent.subscription_details
  const subscriptionId = getSubscriptionIdFromInvoice(invoice);
  if (!subscriptionId) return;

  // Get subscription to find the plan and user
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('user_id, plan_type')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (sub) {
    const allocation = getBalanceAllocation(sub.plan_type as 'free' | 'pro' | 'premium');

    if (allocation.ai_moves === -1) {
      // Premium: balance stays -1 (unlimited), nothing to add
    } else if (sub.plan_type === 'free') {
      // Free tier: non-stacking, reset to allocation amount
      await supabase.rpc('set_balance', {
        p_user_id: sub.user_id,
        p_ai_moves: allocation.ai_moves,
        p_chat_messages: allocation.chat_messages,
      });
      console.log(`[Stripe Webhook] Free tier reset: user=${sub.user_id} balance=${allocation.ai_moves}`);
    } else {
      // Paid tier: stacking, ADD allocation to existing balance
      await supabase.rpc('add_to_balance', {
        p_user_id: sub.user_id,
        p_ai_moves: allocation.ai_moves,
        p_chat_messages: allocation.chat_messages,
      });
      console.log(`[Stripe Webhook] Renewal top-up: user=${sub.user_id} +${allocation.ai_moves} moves`);
    }
  }

  // Update payment metadata
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
    throw new Error(`Database error in handlePaymentSucceeded: ${error.message}`);
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
    throw new Error(`Database error in handlePaymentFailed: ${error.message}`);
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
