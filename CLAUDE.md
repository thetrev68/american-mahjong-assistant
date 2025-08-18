# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Frontend (React 18 + Vite + TypeScript + Zustand)
```bash
cd frontend
npm run dev        # Start development server at http://localhost:5175
npm run build      # Build for production (runs TypeScript check first)
npm run lint       # Run ESLint
npm run preview    # Preview production build
```

### Backend (Node.js + Express + Socket.io + TypeScript)
```bash
cd backend
npm run dev        # Start development server with hot reload at http://localhost:5000
npm run build      # Compile TypeScript
npm start          # Run compiled JavaScript
npm run type-check # TypeScript validation only
```

### Testing (Jest + React Testing Library)
```bash
cd frontend
npm run test        # Run all tests with watch mode
npm run test:ci     # Run tests once (for CI/CD)
npm run coverage    # Generate test coverage report
```

### Full Application Setup
1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev` (in another terminal)
3. Access app at http://localhost:5175
4. Other players join via `http://[HOST_IP]:5175`

## Architecture Overview

### Project Structure
This is a **local network multiplayer web application** for assisting in-person American Mahjong games with an **intelligent co-pilot system**. It creates a digital overlay for physical gameplay with AI-powered pattern analysis and recommendations.

**Key Principle**: Players use phones as intelligent co-pilots while playing with physical tiles and boards. The architecture has been transformed from auto-pilot to co-pilot, giving players control while providing intelligent assistance.

**🏆 MVP ACHIEVED**: Complete Game Mode co-pilot interface providing real-time strategic assistance during actual gameplay, including draw/discard recommendations, call notifications, exposed tile tracking, and dynamic pattern switching.

### Core Components

#### Frontend (`/frontend`)
- **React 18** with **TypeScript** and **Vite**
- **Zustand** for modern state management with devtools
- **Tailwind CSS** for mobile-first responsive design with modern design system
- **React Router** for client-side routing
- **Feature-based architecture** with clean separation of concerns
- Progressive Web App capabilities

#### Backend (`/backend`) 
- **Express** server with **Socket.io** for WebSocket communication
- **TypeScript** with **ts-node** for development
- **In-memory storage** (no database)
- **CORS configured** for local network access

#### Intelligence Layer (`/intelligence`)
- **NMJL 2025 Pattern Data** - Authentic National Mah Jongg League patterns
- **Analysis Engines** - Pattern matching and recommendation systems
- **Preserved Legacy Code** - Working analysis engines moved to `/legacy`

### Modern Co-Pilot Architecture

The application follows a **co-pilot pattern** where AI provides intelligent assistance while users maintain full control:

#### State Management (Zustand)
- **Game Store** - Room, player, and game phase management
- **UI Store** - User preferences, themes, and tutorial state  
- **Pattern Store** - Pattern selection, filtering, and progress tracking

#### Feature-Based Organization
```
frontend/src/
├── features/              # Complete user-facing features
│   ├── landing/          # Hello Co-Pilot landing page
│   ├── pattern-selection/ # NMJL pattern browsing & selection
│   ├── tile-input/       # Hand tile input and management
│   ├── charleston/       # Charleston intelligence and strategy
│   ├── gameplay/         # 🏆 Complete Game Mode co-pilot interface
│   ├── tutorial/         # Complete onboarding system
│   └── post-game/        # Post-game analysis (Chunk 10)
├── ui-components/        # Complete design system
│   ├── Button.tsx        # Modern button with variants
│   ├── Card.tsx          # Glassmorphism cards
│   ├── Tile.tsx          # Core tile component
│   ├── tiles/            # Advanced tile components
│   │   ├── AnimatedTile.tsx # Animated tile with contextual effects
│   │   └── TileSprite.tsx   # Base tile rendering
│   ├── LoadingSpinner.tsx
│   └── layout/           # Layout components
├── stores/               # Complete Zustand state management
│   ├── game-store.ts     # Core game state
│   ├── pattern-store.ts  # Pattern selection & filtering
│   ├── intelligence-store.ts # AI analysis & recommendations
│   ├── tile-store.ts     # Hand management
│   └── charleston-store.ts # Charleston strategy
├── services/             # Data services and AI engines
├── types/                # Complete TypeScript definitions
└── utils/                # Utilities and routing
```

### Key Technical Files

#### Current Architecture (Production-Ready Co-Pilot MVP)
- `frontend/src/stores/room-store.ts` - Room setup, player management, and co-pilot mode selection
- `frontend/src/stores/game-store.ts` - Core game state with Zustand
- `frontend/src/stores/pattern-store.ts` - Pattern selection and filtering
- `frontend/src/stores/intelligence-store.ts` - AI analysis and recommendations
- `frontend/src/stores/tile-store.ts` - Hand management and tile input
- `frontend/src/stores/charleston-store.ts` - Charleston strategy and phase management
- `frontend/src/services/nmjl-service.ts` - NMJL 2025 data loading
- `frontend/src/features/room-setup/` - **Complete room setup with solo/multiplayer modes**
- `frontend/src/features/pattern-selection/` - Complete pattern selection UI
- `frontend/src/features/charleston/` - **Charleston intelligence with real data integration**
- `frontend/src/features/gameplay/GameModeView.tsx` - **Complete Game Mode co-pilot interface**
- `frontend/src/features/tile-input/` - Tile input and hand management
- `frontend/src/features/tutorial/` - Complete onboarding system
- `frontend/src/ui-components/` - Modern design system with tile components
- `frontend/src/utils/RouteGuard.tsx` - **Route protection and flow management**
- `frontend/src/utils/charleston-adapter.ts` - **Charleston data format conversion**
- `frontend/public/intelligence/nmjl-patterns/nmjl-card-2025.json` - Real NMJL data

#### Legacy Architecture (Preserved)
- `legacy/frontend/src/utils/nmjl-2025-loader.ts` - Original pattern loader
- `legacy/frontend/src/utils/enhanced-hand-analyzer.ts` - Hand analysis engine
- `legacy/frontend/src/utils/pattern-search-engine.ts` - Pattern filtering
- `legacy/frontend/src/utils/charleston-recommendation-engine.ts` - Charleston AI
- `legacy/frontend/src/components/` - Original component architecture
- `legacy/backend/` - Complete working multiplayer system

### Development Chunks & Progress

Development follows a **context-window-sized chunk approach** documented in `docs/CO_PILOT_BUILD_PLAN.md`:

#### ✅ CHUNK 1: Foundation Setup & Basic UI
- Modern React 18 + TypeScript + Vite setup
- Zustand stores with devtools and persistence  
- UI component library with modern design system
- Responsive layout components and routing
- Hello Co-Pilot landing page

#### ✅ CHUNK 2: Pattern Selection Foundation
- NMJL 2025 service with authentic pattern data
- Pattern store with selection and filtering state
- Interactive pattern cards with difficulty/points/joker indicators
- Advanced search and filtering UI
- Pattern grid with responsive layout
- Selected patterns panel with strategy tips

#### ✅ CHUNK 2+: Architecture Consolidation (COMPLETE)
- Unified NMJL type system in `/shared` as single source of truth
- Eliminated duplicate analysis engines and state management
- Simplified component hierarchy (TileSprite → Tile)
- Complete ESLint cleanup with 0 errors/warnings
- Consolidated 6,000+ lines of duplicate code
- Established clean testing foundation

#### ✅ CHUNK 8: Tile Animations & Polish (COMPLETE)
- Complete animation system with useAnimations, useHapticFeedback, usePerformance hooks
- AnimatedTile component with contextual animations and visual effects
- Integrated animations into HandDisplay and TileSelector components
- Fixed duplicate ring styling and tile removal functionality
- Performance optimizations and reduced motion support

#### ✅ CHUNK 9: Tutorial & Onboarding System (COMPLETE)
- Complete tutorial architecture with progressive learning flow
- TutorialView orchestrator with step navigation and progress tracking
- Interactive components: PatternLearning, CoPilotDemo, SkillAssessment, PreferenceSetup
- Skill-based personalization (beginner/intermediate/expert paths)
- Persistent user preferences and tutorial progress tracking
- Integration with existing animation system and tile sprites

#### 🏆 CHUNK MVP: Complete Game Mode Co-Pilot Interface (COMPLETE)
- **Core Game Mode Interface** - Real-time co-pilot assistance during actual gameplay
- **AI-Powered Draw/Discard** - Smart recommendations with visual feedback and reasoning
- **Silent Call Notifications** - 5-second timeout system with strategic pung/kong evaluation
- **Exposed Tiles Management** - Complete tracking and display of called sets (pung/kong)
- **Real-time Hand Analysis** - Pattern progress with viability scoring and exposed tile integration
- **Primary Hand Switching** - Mid-game strategic pattern pivoting with alternative recommendations
- **4-Player Turn Management** - Realistic turn order simulation with player indicators
- **Tile Confirmation System** - Error prevention for strategic decisions with smart validation

#### 🏆 INTEGRATION MILESTONE: Complete Core Game Flow Integration (COMPLETE - DEC 2024)
- **All 12 Critical Integration Issues Resolved** - Room setup → Tile input → Charleston → Game mode
- **Route Protection System** - RouteGuard component prevents access to features before proper setup
- **Real Data Integration** - Charleston now uses actual tile store data instead of mock data
- **State Management Fixes** - Consistent player IDs, proper host detection, navigation flow
- **Error Resolution** - Fixed console errors, duplicate React keys, validation issues
- **Complete User Flow Integration** - Seamless progression through all game phases

#### 🎯 MILESTONE ACHIEVED: Production-Ready American Mahjong Co-Pilot MVP
- **Complete User Flow**: Pattern Selection → Tile Input → Charleston → **Game Mode** → Post-Game
- **Real-time Intelligence**: AI provides strategic recommendations while maintaining player agency
- **Professional Gameplay**: Authentic mahjong flow with call opportunities and exposed tile tracking
- **Strategic Flexibility**: Dynamic pattern switching and intelligent alternative suggestions
- **Fully Integrated**: All components work together with proper state management
- **Ready for Production**: Comprehensive integration testing and deployment-ready codebase

#### 🚀 Future Feature Roadmap (Post-MVP Enhancement Phases)

##### **Phase 1: Enhanced Intelligence & Analytics (Q1 2025)**
- **Advanced Pattern Completion Algorithms**
  - Probability-based completion scoring with joker consideration
  - Multi-pattern optimization for flexible strategy pivoting
  - Advanced dead-end detection and recovery suggestions
- **Performance Analytics Dashboard**
  - Game statistics tracking (completion rates, average scores)
  - Pattern preference analysis and success metrics
  - Charleston effectiveness measurement and learning insights
- **Enhanced AI Reasoning**
  - Detailed explanations for all recommendations with strategic context
  - Alternative strategy suggestions with comparative analysis
  - Learning from user decisions to improve future recommendations

##### **Phase 2: Multiplayer & Social Features (Q2 2025)**
- **Real-time Multiplayer Synchronization**
  - Cross-device game state synchronization with conflict resolution
  - Shared discard pile and exposed tile tracking across all players
  - Turn management with automatic progression and timeout handling
- **Social Gaming Features**
  - Friend lists and game invitations system
  - Spectator mode for watching ongoing games
  - Game replay system with analysis and commentary
- **Tournament & League Support**
  - Tournament brackets and scheduling system
  - League play with seasonal rankings and achievements
  - Custom rule sets for different playing groups

##### **Phase 3: Advanced Learning & Personalization (Q3 2025)**
- **Adaptive AI Coaching**
  - Personalized tutorials based on play patterns and weaknesses
  - Skill-based difficulty adjustment for recommendations
  - Progressive learning system that adapts to user expertise level
- **Enhanced Charleston Intelligence**
  - Advanced Charleston optimization algorithms with opponent modeling
  - Multi-round Charleston strategy with lookahead planning
  - Pattern recognition for opponent hand reading and blocking strategies
- **Custom Pattern Support**
  - User-created pattern definitions with validation
  - Pattern sharing and community pattern libraries
  - Historical pattern analysis and trend tracking

##### **Phase 4: Platform & Integration Expansion (Q4 2025)**
- **Cross-Platform Mobile Apps**
  - Native iOS and Android apps with offline capabilities
  - Apple Watch and Android Wear integration for discreet notifications
  - Voice command integration for hands-free operation
- **External Integration**
  - Integration with popular Mahjong tournament management systems
  - Export capabilities for game analysis to Excel/PDF
  - API for third-party tournament and league management tools
- **Accessibility & Internationalization**
  - Screen reader support and visual accessibility improvements
  - Multi-language support for international Mahjong variants
  - Colorblind-friendly tile and UI design options

##### **Phase 5: Advanced Features & AI Evolution (2026+)**
- **Machine Learning Enhancement**
  - Player behavior modeling for personalized strategies
  - Opponent pattern recognition and counter-strategy suggestions
  - Meta-game analysis for tournament-level strategic insights
- **AR/VR Integration**
  - Augmented reality overlay for physical tile recognition
  - VR training environments for pattern practice
  - Mixed reality support for hybrid physical-digital gameplay
- **Advanced Analytics & Insights**
  - Statistical analysis of playing patterns and trends
  - Predictive modeling for game outcomes and optimal strategies
  - Community-wide pattern effectiveness analysis and recommendations

#### 🔧 Technical Enhancement Roadmap
- **Performance Optimization**: WebAssembly integration for complex calculations
- **Advanced Caching**: Intelligent pattern and recommendation caching systems
- **Real-time Communication**: WebRTC for peer-to-peer multiplayer without server dependence
- **Progressive Web App**: Enhanced offline capabilities and app-like installation
- **Testing Infrastructure**: Comprehensive end-to-end testing suite with automation

### Important Development Patterns

#### Co-Pilot vs Auto-Pilot
- **Co-Pilot**: AI provides suggestions, user makes decisions
- **Pattern Selection**: User chooses target patterns explicitly
- **Recommendations**: AI suggests keep/pass/discard with reasoning
- **Control**: User maintains full agency over all game decisions

#### Modern State Management
- **Zustand** over Redux for simplicity and performance
- **Feature-based** stores instead of monolithic state
- **TypeScript-first** with proper type inference
- **Devtools integration** for debugging

#### Component Architecture  
- **Feature folders** group related components, stores, and logic
- **UI components** are pure, reusable building blocks
- **Mobile-first** responsive design with touch optimization
- **Accessibility** built into all interactive elements

#### Design System
- **Purple/Blue palette** (#6366F1 primary, #3B82F6 secondary) 
- **Glassmorphism effects** with backdrop blur and subtle borders
- **Modern animations** with respect for `prefers-reduced-motion`
- **Tailwind CSS** with custom utility classes and component patterns

### Development Considerations

#### Privacy & Data Flow
- **Client-side pattern analysis** - All AI processing stays local
- **Private tile data** never sent to other players
- **Shared game state** for coordination (discards, phases, etc.)
- **User preference persistence** with localStorage

#### Performance & Scalability
- **Lazy loading** of pattern data and components
- **Efficient re-renders** with proper Zustand selectors
- **Mobile optimization** for touch devices and smaller screens
- **Progressive enhancement** with graceful degradation

#### Error Handling & Recovery
- **Comprehensive error boundaries** for component failures
- **Loading states** for all async operations
- **Network resilience** with retry mechanisms
- **User feedback** for all error conditions

### NMJL 2025 Pattern Integration

#### Data Source
- **Authentic NMJL Data**: `nmjl-card-2025.json` contains all 71 official patterns
- **Complete Pattern Details**: ID, description, points, difficulty, groups, joker rules
- **Validation & Type Safety**: Full TypeScript interfaces with runtime validation

#### Pattern Selection System
- **Interactive Cards**: Touch-friendly pattern cards with visual indicators
- **Advanced Filtering**: Search by difficulty, points, jokers, sections
- **Multiple Targets**: Users can star patterns they're considering
- **Progress Tracking**: Visual completion percentage for selected patterns

#### Intelligence Features (Future)
- **Pattern Matching**: Analyze current hand against all possible patterns
- **Completion Probability**: Calculate likelihood of completing each pattern
- **Strategic Recommendations**: Suggest keep/pass based on pattern requirements
- **Charleston Integration**: Pass recommendations considering target patterns

### Configuration Files
- `frontend/postcss.config.js` - Tailwind CSS with PostCSS setup
- `frontend/tailwind.config.js` - Design system configuration
- `frontend/vite.config.ts` - Vite development and build settings
- `frontend/tsconfig.json` - TypeScript strict mode configuration
- `backend/tsconfig.json` - TypeScript compiler options for Node.js

### Testing Strategy

#### Testing Priorities (Immediate Implementation)
1. **Store Testing** - Zustand stores (pattern, intelligence, tile)
2. **Service Testing** - NMJL service, analysis engine  
3. **Component Testing** - UI components with user interactions
4. **Integration Testing** - Full user flows (pattern selection → tile input)

#### Test Structure
- `__tests__/` folders alongside source files
- `.test.tsx` for components, `.test.ts` for logic
- Focus on behavior, not implementation details
- Mock external dependencies (API calls, localStorage)

#### Testing Implementation
- **Component Testing**: React Testing Library for UI components
- **Store Testing**: Direct Zustand store testing without mocking
- **Integration Testing**: Feature-level testing with user flows
- **Manual Testing**: Cross-device testing on actual mobile devices

## Important Instructions

### Code Quality Standards
- **ESLint**: Run `npm run lint` before any commit - must show 0 errors, 0 warnings
- **TypeScript**: Strict mode compliance required - no `any` types without justification
- **Pre-commit Checks**: Always run lint + build + test before commits
- **Import Cleanup**: Remove unused imports immediately
- **Consistent Type Usage**: Use proper union types instead of `any` assertions
- **Testing**: All new features require corresponding tests

### Development Workflow
1. **Architecture First**: Understand existing patterns before adding features
2. **Quality Gates**: ESLint + TypeScript + Tests must pass
3. **Incremental Commits**: Small, focused commits with clear messages
4. **Code Review**: Use TodoWrite tool for progress tracking
5. **Consolidation**: Regular cleanup of duplicates and unused code

### Current Architecture Status (Post-Integration)
- ✅ **Type System**: Unified in `/shared/nmjl-types.ts`
- ✅ **Analysis Engine**: Single working engine in `/services/analysis-engine.ts`
- ✅ **State Management**: Clean Zustand stores with proper typing and integration
- ✅ **Component Hierarchy**: Simplified Tile → TileSprite relationship
- ✅ **Code Quality**: 0 ESLint errors/warnings, strict TypeScript
- ✅ **Integration**: Complete game flow with route protection and real data
- ✅ **Charleston Integration**: Real tile store data with proper instanceId handling
- ✅ **Navigation Flow**: RouteGuard system and automatic progression
- ✅ **Error Resolution**: Console errors fixed, duplicate keys resolved
- 🔄 **Testing**: Comprehensive test suite implementation in progress

### File Organization
- **NEVER** move files from `legacy/` - they contain working systems
- **ALWAYS** create new files in the modern architecture folders
- **PREFER** editing existing files over creating new ones
- **NEVER** create markdown documentation files unless explicitly requested
- **Co-locate tests** with source files in `__tests__/` folders

### Development Approach
- **MVP Complete**: Core integration finished, focus on enhancement phases
- **Quality First**: Maintain 0 ESLint errors/warnings and strict TypeScript compliance
- **Testing Infrastructure**: Comprehensive test suite implementation in progress
- **Test thoroughly** on mobile devices and different screen sizes
- **Use TodoWrite tool** proactively for progress tracking
- **Feature Development**: Follow the 5-phase roadmap for post-MVP enhancements
- **Performance Monitoring**: Regular performance audits and optimization

### Code Style & Quality
- **No comments** unless explicitly requested
- **Modern JavaScript/TypeScript** patterns (async/await, destructuring, etc.)
- **Functional components** with hooks over class components
- **Consistent naming** following existing patterns
- **Mobile-first** responsive design principles

This co-pilot architecture provides a solid foundation for building an intelligent American Mahjong assistant that enhances rather than replaces the social in-person gaming experience.