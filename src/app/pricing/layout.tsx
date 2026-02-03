import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing - Chester AI Chess',
  description:
    'Choose your Chester AI Chess plan. Free, Pro ($9.99/mo), or Premium ($19.99/mo) with unlimited AI moves and chat.',
  openGraph: {
    title: 'Pricing - Chester AI Chess',
    description:
      'Choose your Chester AI Chess plan. Free, Pro, or Premium with unlimited features.',
    url: 'https://chesterchess.com/pricing',
  },
  twitter: {
    title: 'Pricing - Chester AI Chess',
    description:
      'Choose your Chester AI Chess plan. Free, Pro, or Premium with unlimited features.',
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
