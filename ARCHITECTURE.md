# AI Chess - Technical Architecture

## Overview

This document outlines the technical architecture, design decisions, and implementation details for the AI Chess application.

## Design Principles

1. **Production-First**: Every component is built to production standards from day one
2. **Mobile-First**: UI/UX optimized for mobile devices, scaling up to desktop
3. **Security-First**: Credentials and sensitive data handled with industry best practices
4. **AI-Native**: OpenAI Responses API (GPT-5 series) integration is core to the experience
5. **Extensible**: Modular architecture ready for voice and future features

## System Architecture

### Frontend Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js Application                   │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────┐         ┌─────────────────────┐   │
│  │   Chess Board   │         │   Chat Interface    │   │
│  │   Component     │         │    Component        │   │
│  │                 │         │                     │   │
│  │  - chessboard.js│         │  - Markdown render  │   │
│  │  - chess.js     │         │  - Message list     │   │
│  │  - Touch events │         │  - Input handling   │   │
│  └─────────────────┘         └─────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              State Management                    │   │
│  │         (React Context + Hooks)                  │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Backend Services

```
┌─────────────────────────────────────────────────────────┐
│                    API Routes (Next.js)                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────┐         ┌─────────────────────┐   │
│  │   OpenAI        │         │    Supabase        │   │
│  │   Service       │         │    Service         │   │
│  │                 │         │                     │   │
│  │  - GPT-5 via    │         │  - Game storage    │   │
│  │    Responses API│         │  - Chat history    │   │
│  │  - Streaming    │         │  - Memory system   │   │
│  └─────────────────┘         └─────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Data Architecture

### Supabase Schema

```sql
-- Games table
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'active',
  pgn TEXT,
  fen TEXT,
  metadata JSONB
);

-- Moves table
CREATE TABLE moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  move_number INTEGER,
  move_notation VARCHAR(10),
  fen_after TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  analysis JSONB
);

-- Conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  messages JSONB[],
  summary TEXT
);

-- Memory table (for deep context)
CREATE TABLE memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  category VARCHAR(50),
  content TEXT,
  embedding VECTOR(1536), -- For semantic search
  metadata JSONB
);
```

## Component Architecture

### Chess Board Component

```typescript
interface ChessBoardProps {
  fen: string;
  onMove: (move: Move) => void;
  orientation: 'white' | 'black';
  interactive: boolean;
}

// Mobile-optimized chess board with:
// - Touch drag and drop
// - Tap-to-move
// - Pinch to zoom (disabled to prevent accidents)
// - Responsive sizing
```

### Chat Interface Component

```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    moveContext?: string;
    gameState?: string;
  };
}

// OpenAI-style chat with:
// - Markdown rendering
// - Code block syntax highlighting
// - Smooth animations
// - Message status indicators
```

## API Design

### Chess API Endpoints

```typescript
// POST /api/chess/move
{
  gameId: string;
  move: {
    from: string;
    to: string;
    promotion?: string;
  };
}

// GET /api/chess/game/:id
// Returns current game state, history, and analysis

// POST /api/chess/new
// Creates a new game with optional AI configuration
```

### AI Chat API

```typescript
// POST /api/chat
{
  gameId: string;
  message: string;
  context?: {
    recentMoves?: Move[];
    gamePhase?: 'opening' | 'middlegame' | 'endgame';
  };
}

// Streams response using Server-Sent Events
```

## Mobile-First Design Patterns

### Responsive Layout

```css
/* Mobile (default) */
.game-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.chess-board {
  flex: 0 0 66vh; /* 2/3 of viewport */
}

.chat-interface {
  flex: 1;
  overflow-y: auto;
}

/* Tablet and up */
@media (min-width: 768px) {
  .game-container {
    flex-direction: row;
  }
  
  .chess-board {
    flex: 0 0 60%;
  }
  
  .chat-interface {
    flex: 1;
  }
}
```

### Touch Optimization

- Large touch targets (44x44px minimum)
- Gesture recognition for moves
- Haptic feedback on valid moves
- Prevention of accidental zooming
- Smooth animations (60fps)

## Security Architecture

### API Security

```typescript
// Middleware for API routes
export async function validateRequest(req: Request) {
  // Rate limiting
  await rateLimiter.check(req);
  
  // API key validation
  const apiKey = req.headers.get('Authorization');
  if (!isValidApiKey(apiKey)) {
    throw new UnauthorizedError();
  }
  
  // CORS configuration
  // CSP headers
  // Input sanitization
}
```

### Environment Variables

```bash
# Production secrets (never committed)
OPENAI_API_KEY=sk-...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Public configuration
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## Performance Optimization

### Frontend Performance

- Code splitting by route
- Lazy loading for chess engine
- Image optimization
- Service worker for offline play
- Efficient re-renders with React.memo

### Backend Performance

- Edge functions for low latency
- Streaming AI responses
- Database connection pooling
- Caching strategy for game states
- CDN for static assets

## Deployment Architecture

### Render Configuration

```yaml
services:
  - type: web
    name: ai-chess
    env: node
    buildCommand: npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: OPENAI_API_KEY
        sync: false
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false
```

### CI/CD Pipeline

1. Push to main branch
2. GitHub Actions run tests
3. Build verification
4. Automatic deployment to Render
5. Health checks and monitoring

## Future Architecture Considerations

### Voice Integration Points

```typescript
interface VoiceModule {
  // Input processing
  startListening(): void;
  stopListening(): void;
  onTranscript: (text: string) => void;
  
  // Output generation
  speak(text: string, voice?: VoiceProfile): Promise<void>;
  
  // Voice commands
  parseCommand(transcript: string): ChessCommand | ChatCommand;
}
```

### Scalability Planning

- Multi-region deployment
- WebSocket support for real-time play
- Redis for session management
- PostgreSQL read replicas
- Horizontal scaling strategy

## Monitoring and Observability

- Error tracking with Sentry
- Performance monitoring
- User analytics (privacy-respecting)
- AI usage metrics
- Cost tracking for API calls

---

*This architecture is designed to evolve while maintaining production quality at every stage.*
