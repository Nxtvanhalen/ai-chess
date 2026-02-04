# Chester Chess - Development Log

## 2026-02-03 - Security, Performance & Scaling Architecture

### Session Summary
Production readiness review, security hardening, performance optimization, and scaling architecture planning for 1000+ users.

---

### Changes Implemented

#### 1. Security - Attack Path Blocking (`src/proxy.ts`)
Added path-based blocking for common vulnerability scanners:

```typescript
const BLOCKED_PATHS: string[] = [
  // WordPress
  '/wp-admin', '/wp-login', '/wp-content', '/wp-includes', '/wordpress', '/xmlrpc.php',
  // PHP/CMS
  '/admin.php', '/index.php', '/config.php', '/setup-config.php', '/install.php',
  '/phpmyadmin', '/phpinfo.php',
  // Admin
  '/admin',
  // Common attack paths
  '/.env', '/.git', '/.htaccess', '/cgi-bin', '/shell', '/eval', '/cmd',
];
```

- Returns silent 404 for blocked paths (no info leakage)
- Reduces log noise from scanners

#### 2. Security - Threat Detection Verified Working
Confirmed the existing security proxy blocks:
- **Blocked IPs**: Known malicious actors
- **Blocked Subnets**: Tencent Cloud ranges (43.157.x.x, 43.131.x.x, 43.135.x.x)
- **Mobile UA Spoofing**: Datacenter IPs claiming to be mobile devices

Example blocked request from logs:
```
[SECURITY] Blocked request: {
  reason: 'Tencent 43.135.x.x - iPhone UA spoofing',
  severity: 'critical',
  ip: '43.135.148.92',
  path: '/'
}
```

#### 3. Performance - Tactical Theme Batching (`src/lib/services/GameMemoryService.ts`)
Changed from individual DB writes to batched:

**Before:** Up to 10 individual DB writes per move (one per detected theme)
**After:** Single batched write for all themes

```typescript
static async addTacticalThemes(gameId: string, themes: string[]): Promise<void> {
  // Single DB update instead of multiple
  const updatedThemes = [...memory.tactical_themes, ...newThemes];
  await supabase.from('game_memory').update({ tactical_themes: updatedThemes }).eq('game_id', gameId);
}
```

#### 4. Performance - Parallelized Database Calls
Used `Promise.all` for independent queries:

**Files modified:**
- `src/app/api/chat/route.ts` - Context fetches
- `src/app/api/chess/pre-move-analysis/route.ts` - Context fetches
- `src/lib/supabase/subscription.ts` - RPC + usage fetch
- `src/app/api/subscription/usage/route.ts` - Usage + tier queries

**Example:**
```typescript
const [rpcResult, usage] = await Promise.all([
  supabase.rpc('can_use_ai_move', { p_user_id: userId }),
  getUserUsage(userId),
]);
```

#### 5. Performance - Reduced Subscription Polling (`src/components/subscription/UsageDisplay.tsx`)
- Polling interval: 30s → 120s
- Added 60-second client-side cache
- Added window focus listener for smart refresh

```typescript
let cachedUsage: UsageData | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60000; // 60 seconds

// Refresh every 2 minutes instead of 30 seconds
const interval = setInterval(() => fetchUsage(true), 120000);
```

#### 6. Performance - Added Structured Logging
Added timing logs to monitor performance:
- `[AI-Move] Engine computation: Xms`
- `[AI-Move] Total request time: Xms`
- `[Chat] Context fetch (parallel): Xms`
- `[Subscription] canUseAIMove (parallel): Xms`
- `[Usage API] Fetched in Xms`

#### 7. Bug Fix - Mobile Portrait Keyboard (`src/hooks/useKeyboardManager.ts`, `src/components/chat/`)
Fixed keyboard causing page reload in portrait mode.

**Problem:** Viewport-based orientation detection changed when keyboard opened
**Solution:** Use `screen.orientation` API which is stable

```typescript
// Before (broken)
const isLandscape = window.innerWidth > window.innerHeight;

// After (stable)
if (window.screen?.orientation?.type) {
  isLandscapeMode = window.screen.orientation.type.includes('landscape');
} else {
  isLandscapeMode = window.screen.width > window.screen.height;
}
```

#### 8. Cleanup - Removed Unused Endpoint
Deleted `src/app/api/setup-db/route.ts` - one-time setup endpoint with no authentication.

---

### Investigation - CPU Usage Analysis

#### Finding
Single player on Render 0.5 CPU tier shows 40-60% CPU usage during chess engine calculations.

#### Root Cause
The chess engine (`src/lib/chess/engineEnhanced.ts`) uses:
- Minimax search with alpha-beta pruning (depth 2-6)
- Move ordering that does `chess.move()`/`chess.undo()` for every capture
- Position evaluation iterating 64 squares
- Transposition table with 100,000 entries

This is CPU-intensive by nature. Not Stockfish, but still significant.

#### Concern
With 1000 concurrent users, even sporadic moves would cause CPU contention and slowdowns.

---

### Future Architecture - AWS Lambda for Chess Engine

#### Decision
Offload chess engine to AWS Lambda for horizontal scaling.

#### Rationale
- Chess engine calculation is **stateless** - perfect for Lambda
- **Bursty traffic** - players think between moves, not constant load
- **Auto-scales** - 1000 concurrent calculations? Lambda handles it
- **Cost-effective** at scale:
  ```
  3 sec × 512MB = 1.5 GB-seconds per move
  Cost per move: $0.000025

  1000 users × 50 moves/day = $1.25/day ≈ $37/month
  ```

#### Proposed Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                        END USER                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    RENDER (Lightweight)                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ Next.js     │ │ Auth        │ │ Chat API    │           │
│  │ Static Pages│ │ (Supabase)  │ │ (→ Claude)  │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│  ┌─────────────┐ ┌─────────────┐                           │
│  │ Database    │ │ API Gateway │─────────┐                 │
│  │ (Supabase)  │ │ to Lambda   │         │                 │
│  └─────────────┘ └─────────────┘         │                 │
└──────────────────────────────────────────│─────────────────┘
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    AWS LAMBDA (Heavy Compute)                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Chess Engine (EnhancedChessEngine)                   │   │
│  │ - Minimax with alpha-beta pruning                    │   │
│  │ - Transposition table                                │   │
│  │ - Opening book                                       │   │
│  │ - Auto-scales to demand                              │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### Benefits
| Aspect | Current (Render Only) | With Lambda |
|--------|----------------------|-------------|
| Max concurrent games | ~10-20 | Unlimited |
| Render CPU usage | 40-60% per game | Near 0% |
| Cost at 1000 users | Need bigger tier | ~$37/month Lambda |
| Scaling | Manual tier upgrade | Automatic |
| User device impact | None | None |

#### Implementation Steps (TODO)
1. Package `engineEnhanced.ts` + dependencies for Lambda
2. Create Lambda function with API Gateway or Function URL
3. Add auth token/secret for Render ↔ Lambda calls
4. Modify `src/app/api/chess/ai-move/route.ts` to call Lambda
5. Add error handling and fallback
6. Test latency and cold starts
7. Consider provisioned concurrency for consistent performance

#### Alternatives Considered

**Client-side Web Worker:**
- Rejected: Battery drain, slow on old devices, cold start per session

**Cloudflare Workers:**
- Possible but 30s CPU limit on paid tier may be tight
- V8 isolates, not full Node.js

**Horizontal Render scaling:**
- Works but more expensive at scale
- Each instance has memory overhead

---

### Decisions Made

1. **LeakIX scanner traffic** - Leave unblocked (legitimate security research, harmless)
2. **Chess engine** - Keep current depth (2-6), don't weaken AI
3. **Scaling strategy** - AWS Lambda for engine, Render for web tier

---

### Files Modified This Session
- `src/proxy.ts` - Added BLOCKED_PATHS, added /admin
- `src/lib/services/GameMemoryService.ts` - Added batch tactical themes method
- `src/app/api/chess/move/route.ts` - Use batched tactical themes
- `src/app/api/chat/route.ts` - Parallelized context fetches
- `src/app/api/chess/pre-move-analysis/route.ts` - Parallelized context fetches
- `src/lib/supabase/subscription.ts` - Parallelized queries
- `src/app/api/subscription/usage/route.ts` - Parallelized, added caching headers
- `src/components/subscription/UsageDisplay.tsx` - Client caching, reduced polling
- `src/hooks/useKeyboardManager.ts` - screen.orientation API
- `src/components/chat/ChatInterface.tsx` - screen.orientation API
- `src/components/chat/ChatInput.tsx` - screen.orientation API
- `src/app/api/setup-db/route.ts` - DELETED

---

### Next Session TODO
- [ ] Set up AWS account if not exists
- [ ] Implement Lambda chess engine
- [ ] Test latency impact
- [ ] Monitor production metrics after today's optimizations
