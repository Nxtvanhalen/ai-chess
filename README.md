# AI Chess - CLB Chess Butler

A futuristic, AI-driven chess application featuring a sophisticated Chess Butler powered by GPT-4o, complete AI opponent, and stunning OpenAI-inspired design.

🚀 **Live Application**: https://ai-chess-cfah.onrender.com  
📂 **GitHub Repository**: https://github.com/Nxtvanhalen/ai-chess

## 🎯 Production Deployment

✅ **Successfully deployed to Render**  
✅ **Full functionality working**  
✅ **GPT-4o chat integration active**  
✅ **Supabase persistence operational**  
✅ **AI chess opponent functional**

## ✨ Current Features

🎮 **Complete Chess Experience**
- **Intelligent AI Opponent** - Advanced chess engine with minimax algorithm and proper evaluation
- **Move Highlighting Teaching Tool** - Click any piece to see all possible moves highlighted
- **Real-time Move Analysis** - GPT-4o provides concise strategic commentary
- **Chess Butler Coaching** - Brief, focused insights and tactical advice
- **Interactive Gameplay** - Drag pieces or click to move, with visual feedback
- **Persistent Game Memory** - All games and conversations saved to Supabase

🎨 **Futuristic Design**
- **Dark Purple Aesthetic** - Sleek, modern OpenAI-inspired interface
- **Enhanced Chess Board** - Individual square identifiers (a1, b2, etc.) for clarity
- **Mobile-Optimized Layout** - 60/40 split for better screen utilization
- **Smooth Typing Animation** - Character-by-character AI response rendering
- **Visual Move Indicators** - Green highlights show legal moves for selected pieces

🤖 **AI Integration**
- **GPT-4o Powered** - Advanced language model with concise, tactical responses
- **Faster AI Moves** - Reduced thinking time for quicker gameplay
- **Strategic Engine** - Proper position evaluation with mobility and center control
- **Personality-Driven** - Sharp, confident Chess Butler with minimal verbosity
- **Full Memory Persistence** - AI remembers all previous games and conversations

📱 **Mobile Experience**
- **Touch-Optimized Controls** - Seamless piece movement on mobile devices
- **Keyboard-Smart Interface** - Chat input stays visible when mobile keyboard appears
- **Responsive Sizing** - Optimized proportions for single-page mobile viewing
- **Chrome Mobile Fixes** - Enhanced compatibility and rendering improvements

## Architecture

### Tech Stack

- **Frontend**: Next.js (TypeScript), Tailwind CSS
- **Chess Engine**: chess.js + chessboard.jsx
- **AI/LLM**: OpenAI GPT-4o via Realtime API
- **Backend/Memory**: Supabase (PostgreSQL)
- **Deployment**: Render (auto-deploy from main branch)

### Core Features

1. **Chess Board Interface**
   - Responsive, touch-optimized chess board (~2/3 of viewport)
   - Full chess.js integration for move validation
   - Mobile gestures and interactions

2. **OpenAI-Style Chat**
   - Markdown support with code blocks
   - Persona header and timestamps
   - Message status indicators
   - Responsive layout (beside/below board)

3. **AI Chess Butler**
   - Single, unified AI personality
   - Persistent memory of all games and conversations
   - Chess coaching, commentary, and subtle life advice
   - Meta-aware, dignified character

4. **Persistent Memory System**
   - Supabase-powered game history
   - Full conversation logs
   - Deep memory retrieval
   - Scalable for future personas/crew

### Security & Production Standards

- All credentials via environment variables
- No secrets in code or documentation
- Secure API key management
- Production-grade error handling
- OpenAI-inspired UX patterns

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- OpenAI API key with GPT-4o access

### Environment Variables

Create a `.env.local` file:

```bash
OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Installation

```bash
# Clone the repository
git clone https://github.com/Nxtvanhalen/ai-chess.git
cd ai-chess

# Install dependencies
npm install

# Run development server
npm run dev
```

### Deployment

The project is configured for automatic deployment to Render:

1. Connect your GitHub repository to Render
2. Set environment variables in Render dashboard
3. Deploy from main branch

## Project Structure

```
ai-chess/
├── src/
│   ├── app/              # Next.js app directory
│   ├── components/       # React components
│   │   ├── chess/       # Chess board components
│   │   ├── chat/        # Chat interface components
│   │   └── layout/      # Layout components
│   ├── lib/             # Utilities and libraries
│   │   ├── openai/      # OpenAI integration
│   │   ├── supabase/    # Supabase client
│   │   └── chess/       # Chess logic helpers
│   ├── hooks/           # Custom React hooks
│   └── types/           # TypeScript definitions
├── public/              # Static assets
├── docs/               # Additional documentation
└── tests/              # Test files
```

## Development Guidelines

### Code Standards

- TypeScript strict mode enabled
- ESLint + Prettier for code formatting
- Atomic, descriptive commits
- Comprehensive error handling
- Mobile-first responsive design

### AI Integration

- All LLM operations use GPT-4o via Realtime API
- System prompts maintain Chess Butler personality
- Modular prompt engineering
- Streaming responses for better UX

### Memory Architecture

- Supabase tables for games, moves, conversations
- Efficient context retrieval
- Scalable schema for future features
- Privacy-first design (currently single-user)

## Future Enhancements

### Voice Integration (Prepared)

The architecture is designed to easily add:
- Voice input via OpenAI Whisper
- Voice output via ElevenLabs TTS
- Real-time voice conversations
- Voice command chess moves

### Planned Features

- Multiple AI personalities ("crew")
- Advanced chess analytics
- Tournament modes
- Chess puzzles and training
- Social features (when multi-user)

## Contributing

This is currently a private project for Chris (nxtvanhalen). The codebase maintains production standards for potential future open-sourcing.

## License

Private - All rights reserved

---

*Built with the vision of combining the best of AI interaction with the timeless game of chess.*