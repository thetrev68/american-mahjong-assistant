# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Unified Development Commands (Monorepo)
```bash
# Start development servers
npm run dev:frontend    # Start frontend at http://localhost:5175  
npm run dev:backend     # Start backend at http://localhost:5000

# Testing (Vitest across all packages)
npm test               # Run tests across all workspaces
npm run test:watch     # Watch mode for all workspaces
npm run test:coverage  # Coverage reports for all packages

# Linting (ESLint with consolidated config)
npm run lint           # Lint entire monorepo
npm run lint:fix       # Auto-fix linting issues
npm run lint:workspaces # Lint via individual workspace configs

# Building
npm run build          # Build all packages

# Type checking
cd packages/frontend && npm run type-check
cd packages/backend && npm run type-check
```

### Package-Specific Commands
```bash
# Frontend (packages/frontend)
cd packages/frontend
npm run dev        # Development server
npm run build      # Production build
npm run lint       # ESLint with React rules
npm run test       # Vitest with React Testing Library

# Backend (packages/backend) 
cd packages/backend
npm run dev        # Development server with nodemon
npm run build      # TypeScript compilation
npm run start      # Run compiled server
npm run lint       # ESLint with Node.js rules
npm run test       # Vitest with Node.js environment
```

### Full Application Setup
1. **Install dependencies**: `npm install` (installs for all workspaces)
2. **Start backend**: `npm run dev:backend` 
3. **Start frontend**: `npm run dev:frontend` (in another terminal)
4. **Access app**: http://localhost:5175
5. **Multiplayer**: Other players join via `http://[HOST_IP]:5175`

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

#### Feature-Based Organization (Feature-Sliced Design)
```
packages/
├── frontend/src/
│   ├── features/              # Complete user-facing features with co-located services
│   │   ├── landing/          # Hello Co-Pilot landing page
│   │   ├── pattern-selection/ # NMJL pattern browsing & selection
│   │   ├── tile-input/       # Hand tile input and management
│   │   ├── charleston/       # Charleston intelligence and strategy
│   │   │   └── services/     # Charleston-specific services
│   │   ├── gameplay/         # 🏆 Complete Game Mode co-pilot interface
│   │   │   └── services/     # Game actions, turn management, game end coordination
│   │   ├── intelligence-panel/ # AI analysis and recommendations
│   │   │   └── services/     # Pattern analysis, ranking, recommendation engines
│   │   ├── tutorial/         # Complete onboarding system
│   │   └── post-game/        # Post-game analysis
│   │       └── services/     # Game statistics and analysis
│   ├── lib/                  # Shared library services
│   │   └── services/         # Cross-cutting services (NMJL, tile service, network)
│   ├── ui-components/        # Complete design system
│   │   ├── Button.tsx        # Modern button with variants
│   │   ├── Card.tsx          # Glassmorphism cards
│   │   ├── Tile.tsx          # Core tile component
│   │   ├── tiles/            # Advanced tile components
│   │   │   ├── AnimatedTile.tsx # Animated tile with contextual effects
│   │   │   └── TileSprite.tsx   # Base tile rendering
│   │   ├── LoadingSpinner.tsx
│   │   └── layout/           # Layout components
│   ├── stores/               # Complete Zustand state management
│   │   ├── game-store.ts     # Core game state
│   │   ├── pattern-store.ts  # Pattern selection & filtering
│   │   ├── intelligence-store.ts # AI analysis & recommendations
│   │   ├── tile-store.ts     # Hand management
│   │   └── charleston-store.ts # Charleston strategy
│   ├── types/                # Complete TypeScript definitions
│   └── utils/                # Utilities and routing
├── backend/src/              # Node.js backend with Socket.io
└── shared-types/             # Shared TypeScript definitions
```

### Key Technical Files

#### Current Architecture (Production-Ready Co-Pilot MVP)
- `packages/frontend/src/stores/room-store.ts` - Room setup, player management, and co-pilot mode selection
- `packages/frontend/src/stores/game-store.ts` - Core game state with Zustand
- `packages/frontend/src/stores/pattern-store.ts` - Pattern selection and filtering
- `packages/frontend/src/stores/intelligence-store.ts` - AI analysis and recommendations
- `packages/frontend/src/stores/tile-store.ts` - Hand management and tile input
- `packages/frontend/src/stores/charleston-store.ts` - Charleston strategy and phase management
- `packages/frontend/src/lib/services/nmjl-service.ts` - NMJL 2025 data loading
- `packages/frontend/src/features/room-setup/` - **Complete room setup with solo/multiplayer modes**
- `packages/frontend/src/features/pattern-selection/` - Complete pattern selection UI
- `packages/frontend/src/features/charleston/` - **Charleston intelligence with real data integration**
- `packages/frontend/src/features/gameplay/GameModeView.tsx` - **Complete Game Mode co-pilot interface**
- `packages/frontend/src/features/tile-input/` - Tile input and hand management
- `packages/frontend/src/features/tutorial/` - Complete onboarding system
- `packages/frontend/src/ui-components/` - Modern design system with tile components
- `packages/frontend/src/utils/RouteGuard.tsx` - **Route protection and flow management**
- `packages/frontend/src/utils/charleston-adapter.ts` - **Charleston data format conversion**
- `packages/frontend/public/intelligence/nmjl-patterns/nmjl-card-2025.json` - Real NMJL data

#### 🧠 **Advanced 3-Engine Intelligence System (Feature-Sliced)**
- `packages/frontend/src/features/intelligence-panel/services/pattern-analysis-engine.ts` - **Engine 1**: Pure mathematical facts using 1,002 pattern variations
- `packages/frontend/src/features/intelligence-panel/services/pattern-ranking-engine.ts` - **Engine 2**: 4-component scoring (0-40, 0-30, 0-20, 0-10)
- `packages/frontend/src/features/intelligence-panel/services/tile-recommendation-engine.ts` - **Engine 3**: Keep/pass/discard with opponent analysis
- `packages/frontend/src/features/intelligence-panel/services/pattern-variation-loader.ts` - High-performance pattern variation caching
- `packages/frontend/public/intelligence/nmjl-patterns/pattern-variations.json` - 1,002 complete tile combinations (678KB optimized)
- `packages/frontend/src/lib/services/analysis-engine.ts` - Engine coordination and interface compatibility

#### 🎮 **Feature Services Architecture**
- `packages/frontend/src/features/charleston/services/` - Charleston multiplayer and resilience services
- `packages/frontend/src/features/gameplay/services/` - Game actions, turn management, multiplayer game end
- `packages/frontend/src/features/post-game/services/` - Game statistics and performance analysis
- `packages/frontend/src/lib/services/` - Shared services (tile service, NMJL service, network resilience)

#### Legacy Architecture (Preserved)
- `legacy/frontend/src/utils/nmjl-2025-loader.ts` - Original pattern loader
- `legacy/frontend/src/utils/enhanced-hand-analyzer.ts` - Hand analysis engine
- `legacy/frontend/src/utils/pattern-search-engine.ts` - Pattern filtering
- `legacy/frontend/src/utils/charleston-recommendation-engine.ts` - Charleston AI
- `legacy/frontend/src/components/` - Original component architecture
- `legacy/backend/` - Complete working multiplayer system

### Recent Major Milestones

#### 🏆 **Production-Ready MVP Complete (2024)**
- **Complete User Flow**: Pattern Selection → Tile Input → Charleston → **Game Mode** → Post-Game
- **Real-time Intelligence**: AI provides strategic recommendations while maintaining player agency
- **Professional Gameplay**: Authentic mahjong flow with call opportunities and exposed tile tracking
- **Strategic Flexibility**: Dynamic pattern switching and intelligent alternative suggestions
- **Fully Integrated**: All components work together with proper state management

#### 🧠 **Advanced 3-Engine Intelligence System (2025)**
- **Sophisticated AI Architecture**: Mathematical intelligence system with 1,002 pattern variations
- **3-Engine Pipeline**: Facts → Ranking → Recommendations with 4-component scoring
- **Strategic Analysis**: Keep/pass/discard recommendations with opponent awareness
- **Performance Optimized**: Sub-300ms analysis with intelligent caching

#### 🏗️ **Architecture Modernization (2025)**
- **Feature-Sliced Design**: Services co-located with features for better organization
- **Unified Tooling**: Vitest across all packages, consolidated ESLint configuration
- **Monorepo Structure**: Clean separation between frontend, backend, and shared packages
- **Type System**: Unified TypeScript definitions in shared packages

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

#### 🧠 **Advanced Intelligence System (IMPLEMENTED)**
- **3-Engine Architecture**: Pattern Analysis → Pattern Ranking → Tile Recommendations
- **Real Pattern Variations**: 1,002 complete tile combinations for exact matching
- **Mathematical Scoring**: 4-component system (0-40, 0-30, 0-20, 0-10 points)
- **Strategic Analysis**: Keep/pass/discard recommendations with opponent awareness
- **Pattern Switch Detection**: 15% improvement threshold with viable alternatives
- **Performance Optimized**: Sub-300ms analysis with intelligent caching

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

## 🎯 PRIORITY FEATURE: Real-Time Pattern Analysis System

### **CRITICAL TODO: Complete All-Pattern Analysis Engine**

**Location**: `frontend/public/intelligence/nmjl-patterns/pattern-analysis-script.js` (initial draft)

**Requirement**: On every tile transaction (Charleston, gameplay, any player), run comprehensive analysis of all 71 NMJL patterns and display top 3 recommendations for each player.

### **Current Issues to Fix:**
1. **Joker Rule Enforcement**: 
   - Jokers CANNOT be used for Singles & Pairs patterns (only pungs/kongs)
   - Current script incorrectly counts jokers for all pattern types
   - Example: SINGLES AND PAIRS-4 should show 5/14 tiles (6B×2, 6C×2, F1), not 13/14

2. **Pattern Analysis Accuracy**:
   - Implement proper constraint handling for all 71 patterns
   - Add specialized logic for consecutive, must_match, and joker restrictions
   - Ensure tile counting matches expert manual calculations

3. **Real-Time Integration**:
   - Hook into tile store changes (add/remove/charleston)
   - Run analysis for current player's hand every transaction
   - Display top 3 viable patterns with completion %, tile count, AI score
   - Update recommendations immediately when hand changes

### **Target Output Format** (for each player):
```
🥇 1. SINGLES AND PAIRS-4: 36% (5/14 tiles) - AI Score: 45
🥈 2. ANY LIKE NUMBERS-3: 29% (4/14 tiles) - AI Score: 38  
🥉 3. CONSECUTIVE RUN-5: 21% (3/14 tiles) - AI Score: 32
```

### **Integration Points**:
- Charleston tile passing
- Gameplay draw/discard actions
- Any player's visible actions affecting wall/availability
- Pattern recommendation updates in Intelligence Panel

**Priority**: HIGH - This is core to the intelligent co-pilot experience

This co-pilot architecture provides a solid foundation for building an intelligent American Mahjong assistant that enhances rather than replaces the social in-person gaming experience.

## 🔄 PHASE 3B+ CONNECTION RESILIENCE INTEGRATION

### **CRITICAL REFACTORING NEEDED**

**Status**: Phase 3B connection resilience is **INCOMPLETE** - services built but not properly integrated.

### **Current Integration Issues**
1. **Charleston Multiplayer Service**: Completely disabled, expects raw Socket instead of resilient connection
2. **Connection Services**: Built but not triggered by React hooks lifecycle  
3. **Architecture Mismatch**: Singleton pattern conflicts with hook-based resilient architecture
4. **Missing Event Queuing**: Operations lost during disconnection, no replay mechanism

### **Phase 3B+ Integration Tasks**

#### **Task 1: Refactor Multiplayer Services for Connection Resilience**
**File**: `frontend/src/services/charleston-multiplayer.ts`
**Issues**:
- Service uses raw `Socket` instead of resilient connection manager
- No integration with `ConnectionResilienceService`
- Missing event queuing during disconnection  
- Hard-coded singleton pattern conflicts with hook lifecycle

**Solution**: Create new resilient service pattern:
```typescript
class MultiplayerResilientService {
  constructor(
    private connectionResilience: ConnectionResilienceService,
    private networkErrorHandler: NetworkErrorHandler,
    private eventQueue: EventQueue
  ) {}
  
  async executeOperation(operation: string, data: unknown): Promise<boolean> {
    if (!this.connectionResilience.isOperationSafe()) {
      return this.eventQueue.queueOperation(operation, data)
    }
    return this.executeImmediate(operation, data)
  }
}
```

#### **Task 2: Hook Lifecycle Integration**  
**File**: `frontend/src/hooks/useConnectionResilience.ts`
**Issues**:
- Connection services not triggered by socket state changes
- Missing automatic reconnection triggering
- No health monitoring integration

**Solution**: Add service orchestration to hooks:
```typescript
useEffect(() => {
  const resilience = getConnectionResilienceService()
  const networkHandler = getNetworkErrorHandler()
  
  if (!socket.isConnected) {
    resilience.startReconnection(socket)
  }
  networkHandler.startHealthMonitoring(socket)
}, [socket.isConnected])
```

#### **Task 3: Unified Multiplayer Service Manager**
**New File**: `frontend/src/services/multiplayer-service-manager.ts`  
**Purpose**: Centralized connection management for all multiplayer services
- Register/unregister services (Room, Charleston, Turn, Game)
- Coordinate connection state changes across all services
- Unified error handling and recovery

#### **Task 4: Event Queuing and Replay System**
**New File**: `frontend/src/services/multiplayer-event-queue.ts`
**Purpose**: Queue operations during disconnection, replay on reconnect
- Priority-based queuing (high/medium/low)
- Automatic replay on reconnection
- Deduplication and conflict resolution

#### **Task 5: End-to-End Integration Testing**
**Test Scenarios**:
- Phase readiness during disconnection → queue and replay
- Room host transfer with network issues → proper recovery
- Turn management with intermittent connectivity → maintain game state  
- Multiple players disconnecting/reconnecting → graceful handling

### **NAMING CORRECTION**
- ❌ "Charleston readiness" is WRONG - Charleston is just one phase
- ✅ Use "Phase readiness" or "Multiplayer readiness" for all phases

### **FILES REQUIRING INTEGRATION**
```
frontend/src/services/charleston-multiplayer.ts     - CRITICAL: completely non-functional
frontend/src/services/room-multiplayer.ts          - Needs event queuing integration
frontend/src/hooks/useConnectionResilience.ts      - Needs service orchestration
frontend/src/services/connection-resilience.ts     - Missing hook triggers
frontend/src/services/network-error-handler.ts     - Missing hook triggers
```

**PRIORITY**: HIGH - Connection resilience is currently non-functional for multiplayer features

This refactoring is essential before Phase 3B can be considered complete.

#### 🔗 **PHASE 3B+: Complete Connection Resilience Integration (SEPTEMBER 2025)**
- **Charleston Multiplayer Refactor**: Completely rebuilt Charleston service with resilient architecture and event queuing
- **Hook Lifecycle Integration**: Connection resilience services properly integrated with React hook patterns and component lifecycle
- **Unified Multiplayer Manager**: Centralized coordination of all multiplayer services with connection resilience and cross-service state sync
- **Advanced Event Queuing**: Sophisticated priority-based event queuing with dependency tracking, expiration, and automatic retry logic
- **End-to-End Testing**: Comprehensive test suite validating all connection resilience functionality with mock socket implementation
- **Production Ready**: All multiplayer services now handle disconnection/reconnection gracefully with zero data loss and seamless user experience

**STATUS**: ✅ COMPLETE - Phase 3B+ connection resilience integration successfully implemented and tested