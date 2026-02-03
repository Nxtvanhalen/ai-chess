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

  const softwareAppSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Chester AI Chess',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Web, iOS, Android',
    description:
      'Play chess with Chester, your witty AI companion. Features intelligent move analysis, personalized coaching, and engaging commentary.',
    url: 'https://chesterchess.com',
    screenshot: 'https://chesterchess.com/og-image.png',
    offers: [
      {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        name: 'Free',
        description: '50 AI moves per day, 20 chat messages per day',
      },
      {
        '@type': 'Offer',
        price: '9.99',
        priceCurrency: 'USD',
        name: 'Pro',
        description: '500 AI moves per day, 200 chat messages per day',
        priceValidUntil: '2027-12-31',
      },
      {
        '@type': 'Offer',
        price: '19.99',
        priceCurrency: 'USD',
        name: 'Premium',
        description: 'Unlimited AI moves and chat messages',
        priceValidUntil: '2027-12-31',
      },
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '50',
      bestRating: '5',
      worstRating: '1',
    },
    featureList: [
      'AI-powered chess opponent',
      'Real-time move analysis',
      'Personalized coaching',
      'Multiple difficulty levels',
      'Witty AI commentary',
      'Progress tracking',
    ],
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Chester AI Chess',
    url: 'https://chesterchess.com',
    description: 'Play chess with Chester, your witty AI companion',
    publisher: {
      '@type': 'Organization',
      name: 'Chester Chess',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
    </>
  );
}
