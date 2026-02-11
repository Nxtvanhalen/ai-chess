# Chester AI Chess - Project Notes

## Supabase Direct Access

You CAN query and modify Supabase directly from the terminal using curl + the service role key. This has been tested and works. Do not tell Chris you can't access Supabase — you can.

### Credentials (from .env.local)
- **URL:** Read `NEXT_PUBLIC_SUPABASE_URL` from `.env.local`
- **Service Role Key:** Read `SUPABASE_SERVICE_ROLE_KEY` from `.env.local`

### How to Query Supabase via curl

**List all users (auth):**
```bash
curl -s "https://<URL>/auth/v1/admin/users?page=1&per_page=50" \
  -H "apikey: <SERVICE_ROLE_KEY>" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>"
```

**Query any table (REST API):**
```bash
curl -s "https://<URL>/rest/v1/<TABLE>?<FILTERS>&select=*" \
  -H "apikey: <SERVICE_ROLE_KEY>" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>"
```

**Update a record:**
```bash
curl -s -X PATCH "https://<URL>/rest/v1/<TABLE>?<FILTERS>" \
  -H "apikey: <SERVICE_ROLE_KEY>" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"column": "value"}'
```

### Common Admin Tasks

**Look up a user by email:**
1. Call the auth admin users endpoint (above)
2. Parse the JSON to find the user by email
3. Extract their `id` (UUID)

**Add moves to a user:**
1. Look up user ID by email (see above)
2. GET their current balance: `GET /rest/v1/subscriptions?user_id=eq.<UUID>&select=ai_moves_balance`
3. PATCH with new balance: `PATCH /rest/v1/subscriptions?user_id=eq.<UUID>` with `{"ai_moves_balance": <current + amount>}`

**Check/update a user's rating:**
- Table: `user_profiles`, column: `rating`
- `GET /rest/v1/user_profiles?id=eq.<UUID>&select=rating,avatar_url`

**Set a user to unlimited moves:**
- `PATCH /rest/v1/subscriptions?user_id=eq.<UUID>` with `{"ai_moves_balance": -1}`
- A balance of `-1` means unlimited

## Key Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `subscriptions` | Stripe billing + usage balances | `user_id`, `plan_type`, `ai_moves_balance`, `chat_messages_balance`, `status` |
| `user_profiles` | Player profile data | `id` (= user_id), `rating`, `avatar_url` |
| `games` | Game records | `id`, `user_id`, `status`, `result` |
| `conversations` | Chat sessions | `id`, `game_id` |
| `messages` | Chat messages | `conversation_id`, `role`, `content` |

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

## Build & Deploy

- `bun install` (NOT npm — Render uses bun with frozen lockfile)
- `bun run build` or `npx next build`
- Render auto-deploys from `main` branch on GitHub (`Nxtvanhalen/ai-chess`)
- If adding npm packages, always run `bun install` after to update `bun.lock`, then commit both `package.json` and `bun.lock`

## Storage (Supabase)

- `avatars` bucket: public, 10MB limit, stores at `{userId}/avatar.webp`
- RLS policies ensure users can only upload/update/delete their own avatar
