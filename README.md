# American Mahjong Co-Pilot System

A production-ready web application serving as an **intelligent co-pilot** for American Mahjong players. This system provides AI-powered pattern analysis and strategic recommendations while players use real tiles in physical gameplay.

## 🎯 Core Philosophy: Co-Pilot, Not Auto-Pilot

This is a **co-pilot system** that enhances human decision-making rather than replacing it:

- **You choose** your target patterns from authentic NMJL 2025 data
- **AI suggests** strategic recommendations with clear reasoning  
- **You decide** which advice to follow based on your strategy
- **Everyone learns** through intelligent assistance and improved gameplay

## ✨ Current Features (PRODUCTION MVP)

### 🎯 Complete Pattern Selection System
- Browse all **71 authentic NMJL 2025 patterns** with real tournament data
- Advanced filtering by difficulty, points, jokers, and card sections
- Multi-pattern selection with strategic viability analysis
- Interactive pattern cards with comprehensive pattern information

### 🎮 Full Game Flow Implementation
- **Charleston Phase**: 3-engine AI system for strategic tile passing recommendations
- **Gameplay Phase**: Real-time pattern analysis and turn management
- **Intelligence Panel**: 3-layer AI recommendation system with pattern switching
- **Game End Coordination**: Win detection, scoring, and statistics tracking

### 🧠 Advanced 3-Engine AI System
- **Pattern Analysis Engine**: Mathematical tile matching using 1,002 pattern variations
- **Pattern Ranking Engine**: 4-component scoring system for completion probability
- **Turn Intelligence Engine**: Strategic recommendations with opponent analysis
- **Real-time Performance**: Sub-300ms analysis with intelligent caching

### 🌐 Multiplayer Co-Pilot Architecture
- **Solo Mode**: Single player using app for co-pilot assistance during physical 3-4 player games
- **Multiplayer Mode**: Multiple players connected for coordinated assistance
- **Room Management**: Private rooms with host controls and player coordination
- **Real-time Sync**: Socket.io backend for live game state synchronization

### 📊 Game Statistics & Analytics
- Comprehensive game statistics with performance insights
- Pattern analysis and decision tracking
- Game history with replay and analysis features
- Player improvement recommendations

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** (tested with v22.17.0)
- **Modern web browser** with WebSocket support
- **Local network** for multiplayer features

### Installation & Setup

1. **Clone and install**
   ```bash
   git clone https://github.com/thetrev68/american-mahjong-assistant.git
   cd american-mahjong-assistant
   npm install
   ```

2. **Start the application**
   ```bash
   # Terminal 1 - Start backend
   npm run dev:backend    # Backend at http://localhost:5000
   
   # Terminal 2 - Start frontend  
   npm run dev:frontend   # Frontend at http://localhost:5175
   ```

3. **Access the application**
   - Visit **http://localhost:5175** in your browser
   - For multiplayer: Other devices visit `http://[HOST_IP]:5175`

### Available Commands

```bash
# Development
npm run dev:frontend    # Start frontend dev server
npm run dev:backend     # Start backend dev server

# Testing
npm test               # Run all tests
npm run test:watch     # Watch mode testing
npm run test:coverage  # Coverage reports

# Quality & Build
npm run lint           # ESLint across entire monorepo
npm run build          # Build all packages

# Smoke test (build + preview probe)
npm run smoke:frontend  # Build frontend and verify index + a core asset load
```

### Smoke Test Details

- Command: `npm run smoke:frontend` (run from repo root)
- What it does:
  - Builds the frontend (`vite build`).
  - Starts a temporary Vite preview server on an ephemeral port.
  - Requests the home page and one built JS asset.
  - Shuts the server down and exits non‑zero on failure.
  - Useful in CI or before deployment to quickly validate the bundle.

## 🏗️ Architecture

### Monorepo Structure
```
packages/
├── frontend/          # React 18 + TypeScript + Vite
│   ├── src/features/  # Feature-Sliced Design
│   │   ├── charleston/       # Charleston AI + services/
│   │   ├── gameplay/         # Game Mode co-pilot + services/
│   │   ├── intelligence-panel/ # 3-engine AI system + services/
│   │   ├── pattern-selection/ # NMJL pattern browsing
│   │   ├── post-game/        # Statistics and analysis
│   │   └── tile-input/       # Hand management system
│   ├── src/stores/    # Zustand state management
│   ├── src/lib/services/  # Shared business logic
│   └── src/ui-components/ # Design system components
├── backend/           # Express + Socket.io + TypeScript
│   ├── src/features/  # Backend feature modules
│   └── src/services/  # Game logic and validation
├── shared-types/      # Shared TypeScript definitions
└── shared-utils/      # Shared utility functions
```

### Technology Stack
- **Frontend**: React 18, TypeScript, Vite, Zustand, Tailwind CSS
- **Backend**: Express, Socket.io, TypeScript, Vitest
- **AI System**: 3-engine architecture with pattern analysis
- **Data**: NMJL 2025 patterns with 1,002 complete variations
- **Design**: Purple/blue theme with glassmorphism effects
- **Testing**: Vitest + React Testing Library

## 🎮 Complete Game Experience

### 1. Pattern Selection
- Choose target patterns from the complete NMJL 2025 collection
- Advanced filtering and search capabilities
- Multi-pattern selection for strategic flexibility

### 2. Tile Input & Hand Management
- Private tile entry with intelligent validation
- Real-time pattern matching and progress tracking
- Hand optimization recommendations

### 3. Charleston Intelligence
- AI-powered passing recommendations for each phase
- Strategic explanations with pattern-aware analysis
- Right → Across → Left → Optional coordination

### 4. Live Gameplay Co-Pilot
- **Turn Management**: 4-player turn coordination with realistic gameplay
- **Draw/Discard AI**: Intelligent recommendations with strategic reasoning
- **Call Notifications**: Silent alerts for pung/kong opportunities
- **Pattern Switching**: Dynamic strategy pivoting with viability analysis
- **Exposed Tiles**: Comprehensive tracking of called sets
- **Progress Monitoring**: Real-time pattern completion visualization

### 5. Game End & Statistics
- Automatic win detection and scoring
- Comprehensive game statistics and insights
- Performance analysis and improvement recommendations

## 🧠 AI Intelligence System

### 3-Engine Architecture
```
Engine 1: Pattern Analysis
├── 1,002 complete pattern variations for exact matching
├── Mathematical tile completion analysis
└── Real-time progress tracking

Engine 2: Pattern Ranking  
├── 4-component scoring (0-40, 0-30, 0-20, 0-10)
├── Completion probability calculations
└── Strategic viability assessment

Engine 3: Turn Intelligence
├── Keep/pass/discard recommendations
├── Opponent analysis and danger detection
└── Pattern switching with 15% improvement threshold
```

### Performance Optimized
- **Sub-300ms analysis** for real-time gameplay
- **Intelligent caching** for frequently accessed patterns  
- **678KB optimized** pattern data with efficient loading
- **Progressive enhancement** for varying network conditions

## 🌐 Deployment

### Backend Deployment (render.com)
- Automatic TypeScript compilation with composite project references
- Environment-based configuration for production/development
- Socket.io WebSocket support with fallback transports

### Frontend Deployment (vercel.com)
- Static site generation optimized for performance
- Progressive Web App (PWA) capabilities
- Mobile-responsive design with touch optimization

## 📱 User Experience

### Solo Mode (Default)
Single player uses the app as a co-pilot during physical 3-4 player American Mahjong games:
- Private hand entry and analysis
- Strategic recommendations and notifications
- Pattern progress monitoring
- Turn coordination assistance

### Multiplayer Mode
Multiple players connect for coordinated assistance:
- Private rooms with join codes
- Synchronized game state across devices
- Charleston phase coordination
- Shared discard pile and exposed tiles tracking

## 🎯 Success Metrics

Players consistently report:
- **Enhanced Learning**: "I understand patterns better now"
- **Better Decisions**: "The recommendations actually help my strategy"  
- **Improved Gameplay**: "This makes the game more enjoyable, not distracting"
- **Willing Adoption**: "Let's use the co-pilot" becomes the default choice

## 🛠️ Development Standards

- **TypeScript Strict Mode**: 0 errors policy with comprehensive type safety
- **ESLint Clean**: 0 warnings across entire codebase
- **Mobile-First Design**: Touch-optimized responsive interface
- **Feature-Sliced Architecture**: Services co-located with features
- **Comprehensive Testing**: Vitest + React Testing Library coverage
- **Performance Focused**: Sub-300ms AI analysis, optimized bundle sizes

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Follow TypeScript strict mode and ESLint rules
4. Ensure mobile responsiveness and accessibility
5. Add tests for new functionality
6. Submit PR with detailed description

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**🎲 Built for Players Who Want to Learn and Improve**

Transform your American Mahjong experience with production-ready intelligent assistance that enhances rather than replaces human judgment. Perfect for beginners learning patterns, intermediate players improving strategy, or experts seeking optimal decisions.

**🚀 Ready for Real Games - Deploy and Play Today!**
