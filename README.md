# Chester AI Chess

A sophisticated full-stack chess application with an intelligent AI companion named Chester.

[![CI](https://github.com/Nxtvanhalen/ai-chess/actions/workflows/ci.yml/badge.svg)](https://github.com/Nxtvanhalen/ai-chess/actions/workflows/ci.yml)

## Live Demo

**Play Now**: [chesterchess.com](https://www.chesterchess.com)

## Production Metrics

| Category | Metric | Score |
|----------|--------|-------|
| **Lighthouse** | Performance | 91 |
| | Accessibility | 94 |
| | Best Practices | 100 |
| | SEO | 100 |
| **SSL/TLS** | SSL Labs Grade | A+ |
| **Security Headers** | HSTS, CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy | 6/6 |
| **Protocol** | HTTP/2 + HTTP/3 | Active |
| **Response** | Time to First Byte | 99ms |
| **Compression** | Brotli | Active |
| **HTTPS** | Enforcement | 301 + HSTS preload |

All scores verified via Lighthouse (incognito), SSL Labs, and production header inspection.

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
- **AI**: OpenAI Responses API (GPT-5 series) for Chester's commentary
- **Chess**: chess.js + react-chessboard
- **Testing**: Vitest + React Testing Library
- **Linting**: Biome (lint + format)
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry (Error tracking + Session replay)
- **Rate Limiting**: Upstash Redis

## Getting Started

### Prerequisites

- Node.js 18+
- [Bun](https://bun.sh) (package manager + runtime)
- Supabase account
- Stripe account
- OpenAI API key

### Installation

```bash
# Clone the repo
git clone https://github.com/Nxtvanhalen/ai-chess.git
cd ai-chess

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run development server
bun run dev
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
bun run dev          # Development server
bun run build        # Production build
bun run start        # Start production server
bun run lint         # Biome check
bun run lint:fix     # Biome check + autofix
bun run format       # Biome formatter
bun test             # Run tests
bun run test:watch   # Watch mode
bun run test:coverage # Coverage report
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
└── __tests__/             # Vitest tests
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

## CI/CD

GitHub Actions pipeline runs on every push and PR to `main`:

- **Lint** — Biome static analysis
- **Build** — Next.js production build
- **Test** — Vitest suite (40 tests across 6 suites)

## Testing

```bash
bun test               # Run all tests
bun run test:watch     # Watch mode
bun run test:coverage  # Coverage report
```

**40 tests** across 6 suites:
- API route validation (chat, streaming)
- LoginGate component
- UpgradeModal component
- Rate limiting middleware
- Subscription utilities
- UUID generation

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
4. Run tests: `bun test`
5. Submit a PR

## License

MIT

## Author

**Chris Bergstrom** - [GitHub](https://github.com/Nxtvanhalen)

---

Built with ❤️ and a lot of chess games against Chester.
