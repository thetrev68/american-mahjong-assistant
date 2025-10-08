# Existing Codebase Inventory

*Documentation of current american-mahjong-assistant codebase before co-pilot transformation*

---

## 📁 **Current Project Structure**

```
american-mahjong-assistant/
├── backend/                    # Node.js Express + Socket.io server
│   ├── api/
│   │   └── socket.ts           # Socket API routes
│   └── src/
│       ├── roomManager.ts      # Room/game state management
│       └── server.ts           # Express server setup
│
├── frontend/                   # React + Vite + TypeScript client
│   └── src/
│       ├── components/         # React components (current organization)
│       ├── hooks/             # Custom React hooks
│       ├── pages/             # Route-based page components
│       ├── types/             # TypeScript type definitions
│       ├── utils/             # Utility functions and engines
│       └── main.tsx           # React app entry point
│
└── docs/                      # Planning documentation
```

---

## 🔧 **Backend Components**

### Core Files
- **`server.ts`** - Express server setup with CORS and Socket.io
- **`roomManager.ts`** - Manages multiplayer rooms and game state
- **`api/socket.ts`** - Socket event handlers

### Key Classes/Functions
```typescript
// roomManager.ts
class RoomManager {
  createRoom(): string
  joinRoom(roomCode: string, player: Player): boolean
  leaveRoom(roomCode: string, playerId: string): boolean
  updateRoomState(): void
  broadcastRoomUpdate(): void
}

// server.ts
- Express app setup
- Socket.io integration
- CORS configuration
- Room event handlers
```

---

## 📱 **Frontend Components**

### Component Organization (Current)

#### **Charleston Phase Components**
```typescript
// charleston/
CharlestonHandDisplay.tsx       # Player's tiles during Charleston
CharlestonPassingArea.tsx       # Tile selection for passing
CharlestonRecommendationPanel.tsx # AI recommendations for passing
CharlestonTileSelector.tsx      # Tile picking interface
```

#### **Game Phase Components**  
```typescript
// game/
ActionButtons.tsx               # Game action buttons
DiscardPile.tsx                # Shared discard pile display
ExposedSets.tsx                # Exposed melds display
GameActions.tsx                # Turn-based actions
GameProgress.tsx               # Game phase indicators
GameTable.tsx                  # Main game table view
MyTileCounter.tsx              # Private tile counter
PlayerStatusList.tsx           # All players status
SharedGameView.tsx             # Shared game state view
TurnTimer.tsx                  # Turn timing display
```

#### **Private Hand Management**
```typescript
// PrivateHandView/
HandAnalysisPanel.tsx          # Pattern analysis display
HandTileGrid.tsx               # Private tile arrangement
PrivateHandView.tsx            # Main private hand interface
TileActionBar.tsx              # Tile manipulation actions
```

#### **Pattern System**
```typescript
// PatternExplorer/
PatternDetailView.tsx          # Individual pattern details
PatternExplorer.tsx            # Browse all NMJL patterns
```

#### **Room Management**
```typescript
// room/
PlayerPositioning.tsx          # Assign player positions
RoomCreation.tsx               # Host creates room
RoomJoining.tsx                # Players join room
```

#### **Tile System**
```typescript
// tiles/
EmptyTileSlot.tsx              # Empty tile placeholder
SpriteDebugger.tsx             # Tile sprite testing
TileComponent.tsx              # Individual tile display
TileGrid.tsx                   # Tile arrangement grid
TilePickerModal.tsx            # Tile selection modal
```

---

## 🔗 **Custom Hooks**

```typescript
// hooks/
useCharleston.ts               # Charleston phase logic
useSocket.ts                   # WebSocket connection management
useWakeLock.ts                 # Prevent screen sleep
```

### Hook Functions
```typescript
// useCharleston.ts
- useCharlestonRecommendations()
- useCharlestonState() 
- Charleston passing logic

// useSocket.ts  
- useSocket(serverUrl)
- Socket event handlers
- Connection state management

// useWakeLock.ts
- requestWakeLock()
- releaseWakeLock()
```

---

## 📄 **Page Components**

```typescript
// pages/
ActiveGamePage.tsx             # Main game interface
GameLobbyPage.tsx              # Room lobby before game
HomePage.tsx                   # Landing page
PatternExplorerDemo.tsx        # Pattern learning interface
TileInputTest.tsx              # Tile input testing
```

---

## 🎯 **Type Definitions**

```typescript
// types/
charleston-types.ts            # Charleston-specific types
index.ts                       # Core game types (Player, Tile, Room, etc.)
nmjl-2025-types.ts            # NMJL pattern system types
socket-events.ts               # WebSocket event schemas
```

### Key Types
```typescript
// Core Types (index.ts)
interface Player {
  id: string
  name: string
  position: PlayerPosition
  tiles: Tile[]
  isReady: boolean
}

interface Tile {
  id: string
  suit: TileSuit
  value: number
  isJoker: boolean
}

interface Room {
  id: string
  players: Player[]
  gameState: GameState
  phase: GamePhase
}

// NMJL Types (nmjl-2025-types.ts)
interface NMJL2025Pattern {
  "Pattern ID": string
  Hand_Pattern: string
  Year: number
  Point_Value: number
  // ... many more fields
}
```

---

## 🧠 **Intelligence Engine**

### Core Analysis Utils
```typescript
// utils/
charleston-engine.ts           # Charleston phase management
charleston-recommendation-engine.ts # AI Charleston advice
enhanced-hand-analyzer.ts      # Advanced hand analysis
gameplay-recommendation-engine.ts # General game advice
nmjl-2025-loader.ts           # Load NMJL pattern data
nmjl-pattern-adapter.ts       # Convert NMJL data to app format
nmjl-pattern-analyzer.ts      # Pattern matching logic
nmjl-probability-calculator.ts # Win probability calculations
strategic-advice-engine.ts    # High-level strategy advice
```

### Key Engine Classes
```typescript
// enhanced-hand-analyzer.ts
class EnhancedHandAnalyzer {
  analyzeHand(tiles: Tile[]): HandAnalysis
  findBestPatterns(tiles: Tile[]): PatternMatch[]
  calculateCompletion(tiles: Tile[], pattern: Pattern): number
}

// charleston-recommendation-engine.ts  
class CharlestonRecommendationEngine {
  generateRecommendations(hand: Tile[], phase: CharlestonPhase): CharlestonRecommendation
  analyzeTileValue(tile: Tile, context: GameContext): TileAnalysis
}

// nmjl-2025-loader.ts
class NMJL2025Loader {
  static getInstance(): NMJL2025Loader
  loadPatterns(): NMJL2025Pattern[]
  getPatternById(id: string): NMJL2025Pattern
}
```

### Utility Functions
```typescript
// tile-utils.ts
- createTileFromId(id: string): Tile
- compareTiles(a: Tile, b: Tile): number  
- groupTilesBySuit(tiles: Tile[]): TileGroup[]
- validateHandSize(tiles: Tile[]): boolean

// game-state-machine.ts
- validatePhaseTransition()
- getNextPhase()
- canAdvancePhase()

// dealer-logic.ts
- dealInitialTiles()
- assignPlayerPositions()
- rotateDealer()
```

---

## 📊 **Pattern & Analysis System**

### NMJL Integration
```typescript
// NMJL 2025 Official Patterns
nmjl-patterns-2025.ts         # Raw pattern data (71 patterns)
nmjl-2025-loader.ts           # Pattern loading and indexing
nmjl-pattern-adapter.ts       # Convert to app format
pattern-search-engine.ts      # Filter and search patterns
```

### Analysis Pipeline
```
Raw NMJL Data → Loader → Adapter → Analyzer → Recommendations
```

---

## 🚨 **Issues with Current Structure**

### Organizational Problems
1. **Mixed Concerns**: Components handle both UI and business logic
2. **Inconsistent Naming**: Some files use camelCase, others use kebab-case
3. **Deep Nesting**: Complex folder hierarchies
4. **Coupling**: High interdependence between components
5. **No Clear Architecture**: MVC vs. feature-based organization unclear

### Technical Debt
1. **Type Inconsistencies**: Multiple ways to represent same data
2. **Prop Drilling**: State passed through many component layers  
3. **Mixed Abstractions**: Utils mix low-level and high-level functions
4. **Duplicate Logic**: Pattern analysis scattered across multiple files
5. **No State Management**: Context/Redux absent, leading to prop chains

### Performance Issues
1. **Re-renders**: Components re-render unnecessarily
2. **Heavy Utils**: Large utility files without code splitting
3. **Memory Leaks**: Socket connections not always cleaned up properly
4. **Bundle Size**: All patterns loaded upfront

---

## 💡 **Reusable Assets**

### Keep & Refactor
- **NMJL Pattern Data** (`nmjl-patterns-2025.ts`) - Core data is solid
- **Tile Utilities** (`tile-utils.ts`) - Basic functions are useful
- **Socket Event Types** (`socket-events.ts`) - Well-defined schemas
- **Core Game Types** (`index.ts`) - Basic Player/Tile/Room models
- **Pattern Analysis Logic** - Core algorithms, just needs better organization

### Completely Replace
- Component organization structure
- State management approach  
- File naming conventions
- Hook architecture
- Page routing structure

---

## 🔄 **Migration Strategy Recommendation**

Based on this analysis, I recommend **creating clean co-pilot folders within the existing repo**:

```
american-mahjong-assistant/
├── legacy/                    # Move current frontend/backend here
│   ├── frontend/             # Current React app
│   └── backend/              # Current Node.js server
├── co-pilot/                 # New clean implementation
│   ├── frontend/             # New React co-pilot app
│   ├── backend/              # New Node.js co-pilot server
│   └── shared/               # Shared types and utilities
├── intelligence/             # Extracted analysis engine (reusable)
│   ├── nmjl-patterns/        # NMJL pattern system
│   ├── analyzers/           # Hand analysis engines
│   └── recommendations/      # AI recommendation engines
└── docs/                     # Keep existing documentation
```

This approach allows us to:
1. **Start clean** with proper architecture from day one
2. **Preserve working code** in legacy folder for reference  
3. **Reuse intelligence** by extracting to shared folder
4. **Clear migration path** - can delete legacy once co-pilot is complete
5. **Easy comparison** between old and new approaches

**Next steps**: Should I proceed with this folder restructure and start building the clean co-pilot architecture?