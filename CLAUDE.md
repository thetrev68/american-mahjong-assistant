# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Frontend (React 18 + Vite + TypeScript + Zustand)
```bash
cd frontend
npm run dev        # Start development server at http://localhost:5173
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

### Full Application Setup
1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev` (in another terminal)
3. Access app at http://localhost:5173
4. Other players join via `http://[HOST_IP]:5173`

## Architecture Overview

### Project Structure
This is a **local network multiplayer web application** for assisting in-person American Mahjong games with an **intelligent co-pilot system**. It creates a digital overlay for physical gameplay with AI-powered pattern analysis and recommendations.

**Key Principle**: Players use phones as intelligent co-pilots while playing with physical tiles and boards.

### Core Components

#### Frontend (`/frontend`)
- **React 19** with **TypeScript** and **Vite**
- **Tailwind CSS** for mobile-first responsive design
- **Socket.io-client** for real-time communication
- **React Router** for page navigation
- Progressive Web App capabilities

#### Backend (`/backend`)
- **Express** server with **Socket.io** for WebSocket communication
- **TypeScript** with **ts-node** for development
- **In-memory storage** (no database)
- **CORS configured** for local network access

### Game Flow Architecture

The application follows a **client-server real-time architecture**:
```
User Action → Local State → Socket Emit → Server Validation → Broadcast → All Clients Update
```

#### Game Phases (State Machine)
1. **Waiting**: Players join room via room code
2. **Positioning**: Host assigns player positions (East/South/West/North)
3. **Tile Input**: Players privately input their tiles (dealer gets 14, others get 13)
4. **Charleston**: Coordinate tile passing (Right → Across → Left → Optional)
5. **Playing**: Live game with shared discard pile and private recommendations
6. **Finished**: Score calculation and game end

### State Management Architecture

#### Shared State (Server + All Clients)
- Room info and player list
- Game phase and turn tracking
- All discarded tiles (visible to everyone)
- Exposed sets when players call tiles
- Charleston coordination status

#### Private State (Individual Clients Only)
- Player's tile collection (`Player.tiles[]`)
- Strategic analysis and hand recommendations
- Charleston pass selections
- Personal statistics

### Key Technical Files

#### Core Game Logic
- `frontend/src/utils/game-state-machine.ts` - Phase transitions and validation
- `backend/src/roomManager.ts` - Room and game state management
- `frontend/src/utils/charleston-engine.ts` - Charleston passing logic
- `frontend/src/utils/tile-utils.ts` - Tile manipulation utilities

#### NMJL 2025 Pattern System
- `frontend/src/utils/nmjl-2025-loader.ts` - Real NMJL pattern data loader with indexing
- `frontend/src/utils/enhanced-hand-analyzer.ts` - Advanced hand analysis engine
- `frontend/src/utils/pattern-search-engine.ts` - Pattern filtering and search capabilities
- `frontend/src/utils/nmjl-pattern-adapter.ts` - Converts NMJL data to HandPattern format
- `frontend/src/utils/charleston-recommendation-engine.ts` - Charleston strategy using real patterns
- `frontend/src/types/nmjl-2025-types.ts` - TypeScript interfaces for NMJL data

#### Socket Communication
- `frontend/src/types/socket-events.ts` - Complete event schema and types
- `backend/src/server.ts` - Socket.io handlers and room broadcasting
- `frontend/src/hooks/useSocket.ts` - Client-side socket management

#### UI Components
- `frontend/src/components/game/` - Shared game view components
- `frontend/src/components/PrivateHandView/` - Private tile management with pattern analysis
- `frontend/src/components/charleston/` - Charleston coordination UI
- `frontend/src/components/room/` - Room creation/joining
- `frontend/src/components/PatternExplorer/` - Browse and search NMJL 2025 patterns

### Important Development Patterns

#### Socket Event Handling
All socket events are strictly typed via `SocketEventMap` in `socket-events.ts`. Events follow naming patterns:
- `create-room`, `join-room` (client → server)
- `room-created`, `room-updated` (server → client)
- `charleston-confirm-selection`, `charleston-phase-started` (Charleston flow)

#### Component Architecture
Components are organized by feature (game/, charleston/, room/) with corresponding hooks and utilities. Private vs shared data boundaries are strictly maintained.

#### Mobile-First Design
Primary interface is mobile devices. Desktop serves as host/display. All UI components are touch-optimized with large tap targets.

### Development Considerations

#### Real-Time Synchronization
State changes must broadcast to all connected clients immediately. Use `broadcastRoomUpdate()` pattern in server code.

#### Privacy Boundaries
Never send private tile data (`Player.tiles`) to other clients. Only tile counts and analysis results stay private.

#### Error Handling & Session Recovery
Socket events include comprehensive error responses. **New: Automatic session recovery** handles refresh/rejoin scenarios:
- Sessions persist in `localStorage` for 1 hour
- On refresh/reconnect, client automatically attempts to rejoin last room
- Session cleared on explicit room leave or failed rejoin attempts
- Reconnection status shown to users during rejoin process

#### Player Position Logic
- **East** = Dealer (14 tiles)
- **South/West/North** = Players (13 tiles each)
- Position assignment affects tile counts and Charleston passing directions

### Charleston Implementation Notes
Charleston phases follow American Mahjong rules:
- **Right**: Pass 3 tiles clockwise
- **Across**: Pass 3 tiles opposite (4-player only, skipped for 3-player)
- **Left**: Pass 3 tiles counter-clockwise  
- **Optional**: Host can choose to skip or continue with left passing

**New: Enhanced Skip Functionality** for real-world flexibility:
- `skipOptionalPhase()` - Skip only the optional phase (traditional)
- `skipRemainingCharleston()` - Skip all remaining Charleston phases from any point
- Host can skip Charleston entirely if group doesn't want to follow all rules
- Confirmation dialog prevents accidental skips
- All skip actions immediately advance to playing phase

Charleston tile distribution uses modular arithmetic for player targeting based on phase and player count.

### NMJL 2025 Pattern Integration

The application now uses **authentic 2025 National Mah Jongg League card data** instead of mock patterns:

#### Data Architecture
- `nmjl-card-2025.json` - Complete JSON export of all 71 official NMJL 2025 patterns
- Each pattern includes: ID, description, point value, difficulty, groups, joker allowances
- Comprehensive validation and type safety with `NMJL2025Pattern` interface
- Advanced indexing for fast lookups by ID, points, difficulty, and joker requirements

#### Pattern Analysis Pipeline
1. **Data Loading**: `NMJL2025Loader` validates and indexes all patterns with error handling
2. **Pattern Matching**: `EnhancedHandAnalyzer` analyzes player tiles against real patterns
3. **Strategic Recommendations**: Context-aware suggestions for keep/discard/charleston decisions
4. **Search & Filtering**: `PatternSearchEngine` enables pattern exploration with 10+ filter criteria

#### Key Features
- **Real Tournament Data**: All analysis based on official 2025 NMJL card patterns
- **Advanced Completion Tracking**: Precise tile-by-tile pattern completion analysis  
- **Strategic Charleston**: Pass recommendations consider pattern requirements
- **Pattern Explorer UI**: Browse, search, and filter all patterns with detailed views
- **Difficulty Assessment**: Easy/Medium/Hard classifications with strategic value scoring

#### Development Notes
- Pattern data loaded as singleton for performance
- Adapter pattern converts NMJL format to existing `HandPattern` interface
- Backward compatible with existing hand analysis systems
- All pattern analysis happens client-side for privacy

### Configuration Files
- `frontend/eslint.config.js` - TypeScript-aware ESLint with React hooks
- `frontend/tailwind.config.js` - Tailwind CSS configuration
- `frontend/vite.config.ts` - Vite development server and build settings
- `backend/tsconfig.json` - TypeScript compiler options for Node.js