'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import ScrollReveal from '../animations/ScrollReveal';
import StaggerChildren from '../animations/StaggerChildren';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Section from '../ui/Section';

type Interval = 'monthly' | 'yearly';

const plans = [
  {
    name: 'Free',
    price: { monthly: 0, yearly: 0 },
    description: 'Perfect for casual players',
    features: [
      '50 AI moves per month',
      '20 chat messages per month',
      'Adaptive difficulty',
      'Last 10 game history',
    ],
    cta: 'Start Playing',
    href: '/play',
    highlight: false,
  },
  {
    name: 'Pro',
    price: { monthly: 9.99, yearly: 99.99 },
    description: 'For dedicated chess enthusiasts',
    features: [
      '500 AI moves per month',
      '200 chat messages per month',
      'Unused moves carry over',
      'Unlimited game history',
      'Export games to PGN',
      'Detailed position analysis',
    ],
    cta: 'Go Pro',
    href: '/pricing',
    highlight: true,
  },
  {
    name: 'Premium',
    price: { monthly: 19.99, yearly: 199.99 },
    description: 'Unlimited chess mastery',
    features: [
      'Unlimited AI moves',
      'Unlimited chat messages',
      'Priority AI response time',
      'Custom difficulty tuning',
      'Early access to new features',
      'All Pro features included',
    ],
    cta: 'Go Premium',
    href: '/pricing',
    highlight: false,
  },
];

export default function Pricing() {
  const [interval, setInterval] = useState<Interval>('monthly');

  return (
    <Section id="pricing">
      <ScrollReveal>
        <h2 className="text-3xl md:text-5xl font-bold text-[#E8E8E8] text-center mb-4">
          Simple Pricing
        </h2>
        <p className="text-[#888888] text-center max-w-[500px] mx-auto mb-10">
          Start free. Upgrade when you&apos;re hooked.
        </p>
      </ScrollReveal>

      {/* Interval toggle */}
      <ScrollReveal>
        <div className="flex items-center justify-center gap-3 mb-14">
          <button
            onClick={() => setInterval('monthly')}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              interval === 'monthly'
                ? 'bg-[#9B7ED1]/20 text-[#9B7ED1] font-semibold'
                : 'text-[#666666] hover:text-[#888888]'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setInterval('yearly')}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              interval === 'yearly'
                ? 'bg-[#9B7ED1]/20 text-[#9B7ED1] font-semibold'
                : 'text-[#666666] hover:text-[#888888]'
            }`}
          >
            Yearly
            <span className="ml-1.5 text-xs text-green-400">Save 17%</span>
          </button>
        </div>
      </ScrollReveal>

      <StaggerChildren className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map((plan) => (
          <Card key={plan.name} highlight={plan.highlight} className="flex flex-col">
            {plan.highlight && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs font-semibold text-[#9B7ED1] uppercase tracking-wider mb-3"
              >
                Most Popular
              </motion.div>
            )}

            <h3 className="text-xl font-bold text-[#E8E8E8] mb-1">{plan.name}</h3>
            <p className="text-[#666666] text-sm mb-5">{plan.description}</p>

            <div className="mb-6">
              {plan.price[interval] === 0 ? (
                <span className="text-4xl font-bold text-[#E8E8E8]">$0</span>
              ) : (
                <>
                  <span className="text-4xl font-bold text-[#E8E8E8]">
                    ${plan.price[interval]}
                  </span>
                  <span className="text-[#666666] text-sm ml-1">
                    /{interval === 'monthly' ? 'mo' : 'yr'}
                  </span>
                </>
              )}
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-[15px]">
                  <span className="text-[#9B7ED1] mt-0.5 shrink-0">&#10003;</span>
                  <span className="text-[#888888]">{f}</span>
                </li>
              ))}
            </ul>

            <Button
              href={plan.href}
              variant={plan.highlight ? 'primary' : 'secondary'}
              className="w-full"
            >
              {plan.cta}
            </Button>
          </Card>
        ))}
      </StaggerChildren>

      <ScrollReveal>
        <p className="text-center text-[#666666] text-sm mt-10">
          Need more moves right now?{' '}
          <span className="text-[#9B7ED1]">50 moves for $1</span> — works with any plan.
        </p>
      </ScrollReveal>
    </Section>
  );
}
