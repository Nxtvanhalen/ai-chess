# Chester AI Chess - Project Notes

## Architecture Overview

- **Framework:** Next.js (App Router) deployed on Render
- **Auth + DB + Storage:** Supabase (auth, Postgres, Storage for avatars)
- **Payments:** Stripe (subscriptions + one-time move packs)
- **Chess Engine:** Custom JS engine (`EnhancedChessEngine`) — NOT Stockfish. Uses minimax with alpha-beta pruning, opening book, transposition table. Runs in Node.js on the server.
- **AI Coach (Chester):** Anthropic Claude API for chat, move analysis, coaching commentary. Streams responses.
- **Rating System:** Standard Elo (K=32). Auto-selects difficulty based on rating band:
  - < 1000 = easy (engine ~800 Elo)
  - 1000-1399 = medium (engine ~1200 Elo)
  - 1400+ = hard (engine ~1600 Elo)
- **PWA:** Service worker + manifest for mobile install

## Key Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `subscriptions` | Stripe billing + usage balances | `user_id`, `plan_type`, `ai_moves_balance`, `chat_messages_balance`, `status` |
| `user_profiles` | Player profile data | `id` (= user_id), `rating`, `avatar_url` |
| `games` | Game records | `id`, `user_id`, `status`, `result` |
| `conversations` | Chat sessions | `id`, `game_id` |
| `messages` | Chat messages | `conversation_id`, `role`, `content` |

## Build & Deploy

- `bun install` (NOT npm — Render uses bun with frozen lockfile)
- `bun run build` or `npx next build`
- Render auto-deploys from `main` branch on GitHub (`Nxtvanhalen/ai-chess`)
- If adding npm packages, always run `bun install` after to update `bun.lock`, then commit both `package.json` and `bun.lock`

## Storage (Supabase)

- `avatars` bucket: public, 10MB limit, stores at `{userId}/avatar.webp`
- RLS policies ensure users can only upload/update/delete their own avatar
