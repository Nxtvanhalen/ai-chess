import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing — Free, Pro & Premium Chess AI Plans',
  description:
    'Pick your Chester AI Chess plan. Free tier with daily AI moves, Pro ($9.99/mo) and Premium ($19.99/mo) with unlimited AI moves, chat coaching, and analysis.',
  alternates: {
    canonical: '/pricing',
  },
  openGraph: {
    title: 'Pricing — Chester AI Chess',
    description:
      'Free, Pro ($9.99/mo) and Premium ($19.99/mo) chess AI plans. Unlimited AI moves and coaching on paid tiers.',
    url: 'https://chesterchess.com/pricing',
    type: 'website',
  },
  twitter: {
    title: 'Pricing — Chester AI Chess',
    description:
      'Free, Pro and Premium AI chess plans. Pick what fits your training.',
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
