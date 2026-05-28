export default function JsonLd() {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Chester Chess',
    url: 'https://chesterchess.com',
    logo: 'https://chesterchess.com/icons/icon-512x512.png',
    description: 'AI-powered chess companion application',
    founder: {
      '@type': 'Person',
      name: 'Chris Lee Bergstrom',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'Chrisleebergstrom@gmail.com',
      contactType: 'customer support',
    },
  };

  // VideoGame schema is more specific than SoftwareApplication for chess
  // and gives Google chess-specific signals (genre, playMode, gamePlatform).
  // Note: aggregateRating intentionally omitted — adding fabricated ratings
  // can earn a manual Google penalty. Re-add only when real user reviews exist.
  const videoGameSchema = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: 'Chester AI Chess',
    alternateName: ['Chester Chess', 'Chester AI'],
    description:
      'Play free online chess against Chester, an AI coach with personality. Real-time move analysis, Elo rating, adaptive difficulty by skill, and engaging commentary on every move.',
    url: 'https://chesterchess.com',
    image: 'https://chesterchess.com/og-image.png',
    screenshot: 'https://chesterchess.com/og-image.png',
    genre: ['Chess', 'Board Game', 'Strategy'],
    gamePlatform: ['Web Browser', 'iOS', 'Android', 'PWA'],
    playMode: 'SinglePlayer',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Web, iOS, Android',
    inLanguage: 'en-US',
    isAccessibleForFree: true,
    publisher: {
      '@type': 'Organization',
      name: 'Chester Chess',
      url: 'https://chesterchess.com',
    },
    offers: [
      {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        name: 'Free',
        description: 'Daily AI moves and chat coaching at no cost',
        availability: 'https://schema.org/InStock',
      },
      {
        '@type': 'Offer',
        price: '9.99',
        priceCurrency: 'USD',
        name: 'Pro',
        description: '500 AI moves and 200 chat messages per day',
        priceValidUntil: '2027-12-31',
        availability: 'https://schema.org/InStock',
      },
      {
        '@type': 'Offer',
        price: '19.99',
        priceCurrency: 'USD',
        name: 'Premium',
        description: 'Unlimited AI moves and chat coaching',
        priceValidUntil: '2027-12-31',
        availability: 'https://schema.org/InStock',
      },
    ],
    featureList: [
      'AI-powered chess opponent with adaptive difficulty',
      'Real-time move analysis and evaluation',
      'Live coaching commentary on every move',
      'Elo rating system with K=32 progression',
      'Opening book and transposition table',
      'Multiple difficulty levels (easy, medium, hard)',
      'Personalized AI coach (Chester) with shifting personality moods',
      'Cross-device game and theme persistence',
      'Progressive Web App (installable on iOS/Android)',
    ],
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Chester AI Chess',
    url: 'https://chesterchess.com',
    description:
      'Play free online chess against Chester, an AI coach with personality. Real-time move analysis, Elo rating, adaptive difficulty.',
    inLanguage: 'en-US',
    publisher: {
      '@type': 'Organization',
      name: 'Chester Chess',
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://chesterchess.com/play',
      'query-input': 'required name=search_term_string',
    },
  };

  // FAQ schema earns rich-result Q&A blocks in Google search results.
  // Answer text must be honest and self-contained — Google parses it literally.
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is Chester AI Chess?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: "Chester AI Chess is a free online chess game where you play against Chester, an AI coach with personality. Chester evaluates every move in real time, comments on your decisions, and adapts to your skill level using an Elo rating system.",
        },
      },
      {
        '@type': 'Question',
        name: 'Is Chester AI Chess free to play?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. The Free tier includes daily AI moves and chat coaching at no cost. Pro ($9.99/mo) and Premium ($19.99/mo) plans unlock higher daily limits and unlimited usage respectively.',
        },
      },
      {
        '@type': 'Question',
        name: 'How does the Elo rating work in Chester?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Chester uses standard Elo with a K-factor of 32. Your rating goes up when you win and down when you lose, weighted by the engine difficulty you faced. Difficulty auto-adjusts: under 1000 Elo faces an easier engine, 1000–1399 a medium engine, and 1400+ the strongest setting.',
        },
      },
      {
        '@type': 'Question',
        name: 'What engine powers Chester?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Chester runs a custom JavaScript chess engine with minimax, alpha-beta pruning, a transposition table, and an opening book. Coaching commentary and move analysis are generated by the Anthropic Claude API.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I play Chester on mobile?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. Chester AI Chess is a Progressive Web App (PWA), so you can install it on iOS and Android straight from the browser. Your games and settings sync across devices when signed in.',
        },
      },
      {
        '@type': 'Question',
        name: 'How is Chester different from chess.com or Lichess?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Chester is focused on single-player practice with an AI coach that speaks in plain English. Instead of just an engine evaluation bar, Chester commentates each move with personality, explains the reasoning, and adapts difficulty to your rating. It is complementary to multiplayer sites, not a replacement.',
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(videoGameSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}
