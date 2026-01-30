# Chester AI Chess

A sophisticated full-stack chess application with an intelligent AI companion named Chester.

![Production Status](https://img.shields.io/badge/status-production--ready-brightgreen)
![Grade](https://img.shields.io/badge/grade-A--blue)
![Tests](https://img.shields.io/badge/tests-36%20passing-success)

## Live Demo

🎮 **Play Now**: [chesterchess.com](https://www.chesterchess.com)

## Features

- **Play Chess**: Full chess rules with castling, en passant, and promotion
- **AI Opponent**: Intelligent minimax engine with adaptive difficulty
- **Chester AI**: Your witty chess companion who comments on moves and offers advice
- **Real-time Streaming**: Character-by-character AI responses
- **Mobile Ready**: Responsive design with PWA support
- **Subscription Tiers**: Free, Pro, and Premium plans

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Server-Sent Events
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Auth**: Supabase Auth (Email/Password + Google OAuth)
- **Payments**: Stripe (Subscriptions + Customer Portal)
- **AI**: OpenAI GPT for Chester's commentary
- **Chess**: chess.js + react-chessboard
- **Monitoring**: Sentry (Error tracking + Session replay)
- **Rate Limiting**: Upstash Redis

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Stripe account
- OpenAI API key

### Installation

```bash
# Clone the repo
git clone https://github.com/Nxtvanhalen/ai-chess.git
cd ai-chess

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run development server
npm run dev
```

### Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI
OPENAI_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Sentry (optional)
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
```

## Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint check
npm test             # Run tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
```

## Architecture

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── chess/         # Game endpoints
│   │   ├── chat/          # Chester AI endpoints
│   │   ├── stripe/        # Payment endpoints
│   │   └── subscription/  # Usage tracking
│   ├── login/             # Auth pages
│   ├── pricing/           # Subscription plans
│   └── page.tsx           # Main game page
├── components/
│   ├── auth/              # LoginGate
│   ├── chess/             # ChessBoard, ThemeSelector
│   ├── chat/              # ChatInterface
│   ├── layout/            # GameLayout
│   └── subscription/      # UsageDisplay, UpgradeModal
├── lib/
│   ├── chess/             # Engine, themes
│   ├── openai/            # AI client, prompts
│   ├── supabase/          # DB client, subscriptions
│   ├── middleware/        # Rate limiting
│   └── redis/             # Upstash client
└── __tests__/             # Jest tests
```

## Subscription Tiers

| Feature | Free | Pro ($9.99/mo) | Premium ($19.99/mo) |
|---------|------|----------------|---------------------|
| AI Moves | 10/day | 500/day | Unlimited |
| Chat Messages | 20/day | 200/day | Unlimited |
| Board Themes | Basic | All | All |

## Security

- **Authentication**: Supabase Auth with secure sessions
- **Authorization**: Row Level Security on all database tables
- **Rate Limiting**: Redis-backed sliding window algorithm
- **Input Validation**: Zod schemas on all API endpoints
- **Headers**: CSP, HSTS, X-Frame-Options, etc.
- **Payments**: Stripe webhook signature verification

## Testing

```bash
# Run all tests
npm test

# Current coverage: 36 tests across 5 suites
# - LoginGate component
# - UpgradeModal component
# - Rate limiting utilities
# - Subscription helpers
# - UUID utilities
```

## Deployment

### Render (Primary)

1. Connect GitHub repo
2. Set environment variables
3. Deploy

### Vercel (Backup)

1. Import from GitHub
2. Set environment variables
3. Auto-deploys on push

### Post-Deployment

- [ ] Configure Stripe webhook endpoint
- [ ] Set up daily cron job for `reset_daily_usage()`
- [ ] Verify Sentry is receiving events

## Contributing

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a PR

## License

MIT

## Author

**Chris Bergstrom** - [GitHub](https://github.com/Nxtvanhalen)

---

Built with ❤️ and a lot of chess games against Chester.
