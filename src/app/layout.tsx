import type { Metadata, Viewport } from 'next';
import './globals.css';
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics';
import CookieConsent from '@/components/cookies/CookieConsent';
import { Providers } from '@/components/Providers';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';
import JsonLd from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NODE_ENV === 'production' ? 'https://chesterchess.com' : 'http://localhost:3000',
  ),
  title: {
    default: 'Chester AI Chess — Play, Learn & Improve with a Witty AI Coach',
    template: '%s | Chester AI Chess',
  },
  description:
    'Play free online chess against Chester, an AI coach with personality. Real-time move analysis, Elo rating, adaptive difficulty, and engaging commentary on every move.',
  applicationName: 'Chester AI Chess',
  authors: [{ name: 'Chris Lee Bergstrom' }],
  creator: 'Chris Lee Bergstrom',
  publisher: 'Chester Chess',
  keywords: [
    'chess',
    'AI chess',
    'AI chess coach',
    'play chess online',
    'free chess',
    'chess AI opponent',
    'chess analysis',
    'chess move analysis',
    'Elo rating',
    'chess training',
    'chess companion',
    'Chester chess',
    'chess opening book',
    'AI chess commentary',
    'chess for beginners',
    'chess improvement',
  ],
  category: 'games',
  alternates: {
    canonical: '/',
    languages: {
      'en-US': '/',
    },
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Chester AI Chess',
  },
  openGraph: {
    title: 'Chester AI Chess — Play, Learn & Improve with a Witty AI Coach',
    description:
      'Free online chess vs an AI coach with personality. Move analysis, Elo rating, adaptive difficulty, and Chester commentating every move.',
    url: 'https://chesterchess.com',
    siteName: 'Chester AI Chess',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Chester AI Chess — Free online chess against an AI coach with personality',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chester AI Chess — Play & Improve with an AI Coach',
    description:
      'Free online chess vs an AI coach. Move analysis, Elo rating, witty commentary, adaptive difficulty.',
    images: ['/og-image.png'],
    creator: '@chesterchess',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: [
      { url: '/icons/icon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-icon-180x180.png', sizes: '180x180', type: 'image/png' }],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'format-detection': 'telephone=no',
    HandheldFriendly: 'True',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#1a0d2e',
  minimumScale: 1,
  // Note: interactive-widget removed to fix Render deployment warnings
  // CSS-based keyboard handling works universally across all platforms
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <JsonLd />
      </head>
      <body className="antialiased">
        <GoogleAnalytics />
        <Providers>
          <ServiceWorkerRegistration />
          {children}
          <CookieConsent />
        </Providers>
      </body>
    </html>
  );
}
