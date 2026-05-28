import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Play Chess vs AI Coach',
  description:
    'Play a full game of chess against Chester, an AI coach with personality. Adaptive difficulty by Elo rating, live move analysis, opening theory, and witty commentary on every move.',
  alternates: {
    canonical: '/play',
  },
  openGraph: {
    title: 'Play Chess vs AI Coach — Chester AI Chess',
    description:
      'Free online chess vs an AI coach. Adaptive difficulty, real-time move analysis, opening book, and engaging commentary.',
    url: 'https://chesterchess.com/play',
    type: 'website',
  },
  twitter: {
    title: 'Play Chess vs AI Coach — Chester AI Chess',
    description:
      'Free chess vs an AI coach with personality. Adaptive difficulty, move analysis, opening theory.',
  },
};

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
