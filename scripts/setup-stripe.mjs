/**
 * Setup Stripe Products and Prices for Chester AI Chess
 * Run with: node scripts/setup-stripe.mjs
 */

import Stripe from 'stripe';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local manually
const envPath = join(__dirname, '../.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const stripe = new Stripe(envVars.STRIPE_SECRET_KEY, {
  apiVersion: '2026-01-28.clover',
});

async function setupStripeProducts() {
  console.log('🚀 Setting up Stripe products for Chester AI Chess...\n');

  try {
    // CREATE PRO PRODUCT
    console.log('📦 Creating Pro product...');
    const proProduct = await stripe.products.create({
      name: 'Chester AI Chess Pro',
      description: 'For dedicated chess enthusiasts - 500 AI moves/day, 200 chat messages/day, game export, detailed analysis',
      metadata: { plan: 'pro' },
    });
    console.log(`   ✓ Product created: ${proProduct.id}`);

    // Pro Monthly Price ($9.99)
    console.log('   Creating Pro Monthly price ($9.99/mo)...');
    const proMonthly = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 999,
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { plan: 'pro', interval: 'monthly' },
    });
    console.log(`   ✓ Pro Monthly: ${proMonthly.id}`);

    // Pro Yearly Price ($99.99)
    console.log('   Creating Pro Yearly price ($99.99/yr)...');
    const proYearly = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 9999,
      currency: 'usd',
      recurring: { interval: 'year' },
      metadata: { plan: 'pro', interval: 'yearly' },
    });
    console.log(`   ✓ Pro Yearly: ${proYearly.id}`);

    // CREATE PREMIUM PRODUCT
    console.log('\n📦 Creating Premium product...');
    const premiumProduct = await stripe.products.create({
      name: 'Chester AI Chess Premium',
      description: 'Unlimited chess mastery - Unlimited AI moves, unlimited chat, priority response time, custom difficulty, early access',
      metadata: { plan: 'premium' },
    });
    console.log(`   ✓ Product created: ${premiumProduct.id}`);

    // Premium Monthly Price ($19.99)
    console.log('   Creating Premium Monthly price ($19.99/mo)...');
    const premiumMonthly = await stripe.prices.create({
      product: premiumProduct.id,
      unit_amount: 1999,
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { plan: 'premium', interval: 'monthly' },
    });
    console.log(`   ✓ Premium Monthly: ${premiumMonthly.id}`);

    // Premium Yearly Price ($199.99)
    console.log('   Creating Premium Yearly price ($199.99/yr)...');
    const premiumYearly = await stripe.prices.create({
      product: premiumProduct.id,
      unit_amount: 19999,
      currency: 'usd',
      recurring: { interval: 'year' },
      metadata: { plan: 'premium', interval: 'yearly' },
    });
    console.log(`   ✓ Premium Yearly: ${premiumYearly.id}`);

    // OUTPUT
    console.log('\n' + '='.repeat(60));
    console.log('✅ Stripe products created successfully!');
    console.log('='.repeat(60));
    console.log('\nAdd these to your .env.local and Render environment:\n');
    console.log(`STRIPE_PRICE_PRO_MONTHLY=${proMonthly.id}`);
    console.log(`STRIPE_PRICE_PRO_YEARLY=${proYearly.id}`);
    console.log(`STRIPE_PRICE_PREMIUM_MONTHLY=${premiumMonthly.id}`);
    console.log(`STRIPE_PRICE_PREMIUM_YEARLY=${premiumYearly.id}`);
    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

setupStripeProducts();
