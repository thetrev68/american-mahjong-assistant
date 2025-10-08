# Technical Architecture: Mahjong Co-Pilot System

## 🎯 Architecture Principles

### **1. Clean Separation of Concerns**
- **Game State** - What's happening in the game
- **Intelligence Engine** - Analysis and recommendations  
- **Multiplayer Coordination** - Keeping everyone in sync
- **User Interface** - How players interact with the system

### **2. Intuitive Code Organization**
- **Feature-based structure** instead of technical layers
- **Clear data flow** from game events to UI updates
- **Easy debugging** when things break
- **Extensible** for new features

### **3. Performance & Scalability**
- **Real-time analysis** without blocking the UI
- **Efficient pattern matching** for 71+ NMJL hands
- **Minimal network traffic** for smooth multiplayer

---

## 🏗️ High-Level System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   FRONTEND      │    │    BACKEND      │    │   INTELLIGENCE  │
│   (React)       │◄──►│   (Node.js)     │◄──►│    ENGINE       │
│                 │    │                 │    │   (TypeScript)  │
│ • UI Components │    │ • Room Manager  │    │ • Pattern Analyzer │
│ • Game Views    │    │ • Socket Events │    │ • Probability Calc │
│ • Player Actions│    │ • State Sync    │    │ • Risk Assessment │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 📁 Proposed Folder Structure

```
/mahjong-co-pilot/
├── /shared/                    # Code used by both frontend and backend
│   ├── /types/                 # Game state, tile, pattern types
│   ├── /game-rules/            # Core mahjong rules and validation
│   └── /constants/             # Game constants, patterns, etc.
│
├── /frontend/                  # React application
│   ├── /core/                  # Core game logic
│   │   ├── /game-state/        # Local game state management
│   │   ├── /intelligence/      # Client-side analysis
│   │   └── /multiplayer/       # Socket connection management
│   │
│   ├── /features/              # Feature-based components
│   │   ├── /tutorial/          # Pre-game tutorial system
│   │   ├── /room-setup/        # Room creation and joining
│   │   ├── /tile-input/        # Hand entry and scanning
│   │   ├── /charleston/        # Charleston passing interface
│   │   ├── /gameplay/          # Main game turn management
│   │   ├── /intelligence-panel/# Co-pilot analysis display
│   │   └── /post-game/         # Review and learning
│   │
│   ├── /ui-components/         # Reusable UI components
│   │   ├── /tiles/             # Tile display and interaction
│   │   ├── /patterns/          # Pattern visualization
│   │   ├── /analysis/          # Charts, meters, progress bars
│   │   └── /layout/            # Common layout components
│   │
│   └── /utils/                 # Frontend utilities
│       ├── /formatters/        # Display formatting
│       ├── /animations/        # UI animations and transitions
│       └── /storage/           # Local storage management
│
├── /backend/                   # Node.js server
│   ├── /core/                  # Core server logic
│   │   ├── /room-manager/      # Multi-room game coordination
│   │   ├── /game-engine/       # Server-side game rules
│   │   └── /socket-handlers/   # WebSocket event management
│   │
│   ├── /features/              # Feature-specific server logic
│   │   ├── /room-lifecycle/    # Room creation, joining, cleanup
│   │   ├── /game-coordination/ # Turn management, phase transitions
│   │   └── /state-sync/        # Keeping all clients in sync
│   │
│   └── /utils/                 # Server utilities
│       ├── /validation/        # Input validation
│       ├── /logging/           # Game event logging
│       └── /cleanup/           # Resource cleanup
│
└── /intelligence/              # Analysis engine (can be shared)
    ├── /pattern-engine/        # NMJL pattern analysis
    ├── /probability-calc/      # Win probability calculations
    ├── /risk-assessment/       # Discard safety analysis
    ├── /opponent-modeling/     # Opponent hand prediction
    └── /recommendation-engine/ # Strategic advice generation
```

---

## 🔄 Data Flow Architecture

### **1. Game State Flow**
```
Physical Action → UI Event → Local State → Server Validation → Broadcast → All Clients Update
```

**Example: Player Discards a Tile**
1. Player taps tile on phone
2. UI updates locally (optimistic)
3. Send discard event to server
4. Server validates and updates game state
5. Server broadcasts to all players
6. All clients update their views
7. Intelligence engine re-analyzes

### **2. Intelligence Flow**
```
Game State Change → Pattern Analysis → Risk Assessment → UI Update
```

**Example: After Receiving Charleston Tiles**
1. New tiles added to hand
2. Pattern engine analyzes all 71 hands
3. Risk assessment for potential discards
4. UI shows updated recommendations
5. Player sees new strategic options

### **3. Multiplayer Coordination**
```
Player Action → Validation → State Update → Broadcast → Sync Confirmation
```

---

## 🧠 Intelligence Engine Design

### **Core Analysis Pipeline**
```
Hand State → Pattern Matcher → Probability Calculator → Risk Assessor → Recommendation Generator
```

### **Key Components**

#### **1. Pattern Engine** (`/intelligence/pattern-engine/`)
```typescript
class PatternAnalyzer {
  analyzeHand(tiles: Tile[]): PatternMatch[] {
    // Match against all 71 NMJL patterns
    // Return completion percentages and missing tiles
  }
  
  trackProgress(oldHand: Tile[], newHand: Tile[]): ProgressUpdate {
    // Show how hand changed after draw/discard
  }
}
```

#### **2. Probability Calculator** (`/intelligence/probability-calc/`)
```typescript
class ProbabilityEngine {
  calculateWinOdds(hand: Tile[], visibleTiles: Tile[]): number {
    // Based on remaining tiles in wall
  }
  
  predictOpponentNeeds(discards: Tile[], exposures: Exposure[]): TileRisk[] {
    // Model what opponents might need
  }
}
```

#### **3. Recommendation Engine** (`/intelligence/recommendation-engine/`)
```typescript
class RecommendationEngine {
  generateDiscardOptions(context: GameContext): DiscardOption[] {
    // Multiple options with pros/cons
  }
  
  analyzeCharlestonPass(hand: Tile[], phase: CharlestonPhase): PassOption[] {
    // Strategic passing recommendations
  }
}
```

---

## 🎮 Feature Architecture

### **1. Tutorial System** (`/frontend/features/tutorial/`)
```
/tutorial/
├── TutorialController.tsx      # Main tutorial flow
├── PatternExplorer.tsx         # Interactive pattern learning
├── CoPilotDemo.tsx            # Show how analysis works
└── hooks/
    └── useTutorialProgress.ts  # Track completion
```

### **2. Game Coordination** (`/frontend/features/gameplay/`)
```
/gameplay/
├── GameController.tsx          # Main game orchestration
├── TurnManager.tsx            # Handle turn transitions
├── PhaseTransitions.tsx       # Charleston → Playing → End
└── hooks/
    ├── useGameState.ts        # Local game state
    ├── useIntelligence.ts     # Analysis integration
    └── useMultiplayer.ts      # Socket coordination
```

### **3. Intelligence Panel** (`/frontend/features/intelligence-panel/`)
```
/intelligence-panel/
├── IntelligenceHub.tsx        # Main analysis display
├── PatternTracker.tsx         # Live pattern progress
├── RiskMeter.tsx             # Discard safety visualization
├── OpponentMonitor.tsx        # Threat assessment
└── WhatIfMode.tsx            # Interactive analysis
```

---

## 🔧 Technical Implementation Details

### **1. State Management**
**Use React Context + useReducer for clean state:**
```typescript
// Game state context
const GameStateContext = createContext<GameState>()
const IntelligenceContext = createContext<AnalysisState>()
const MultiplayerContext = createContext<ConnectionState>()

// Clean separation of concerns
function App() {
  return (
    <GameStateProvider>
      <IntelligenceProvider>
        <MultiplayerProvider>
          <GameInterface />
        </MultiplayerProvider>
      </IntelligenceProvider>
    </GameStateProvider>
  )
}
```

### **2. Event System**
**Use typed events for all game actions:**
```typescript
type GameEvent = 
  | { type: 'TILE_DRAWN'; tile: Tile }
  | { type: 'TILE_DISCARDED'; tile: Tile; playerId: string }
  | { type: 'CHARLESTON_STARTED'; phase: CharlestonPhase }
  | { type: 'PATTERN_COMPLETED'; pattern: Pattern; playerId: string }

// Clean event handling
function gameReducer(state: GameState, event: GameEvent): GameState {
  switch (event.type) {
    case 'TILE_DISCARDED':
      return handleTileDiscard(state, event)
    // ...
  }
}
```

### **3. Intelligence Integration**
**Analysis runs in background, updates UI reactively:**
```typescript
function useIntelligence(gameState: GameState) {
  const [analysis, setAnalysis] = useState<Analysis>()
  
  useEffect(() => {
    // Re-analyze when game state changes
    const newAnalysis = analyzeGameState(gameState)
    setAnalysis(newAnalysis)
  }, [gameState])
  
  return analysis
}
```

### **4. Component Architecture**
**Feature-based components with clear responsibilities:**
```typescript
// Clean component hierarchy
<GameInterface>
  <GameHeader />
  <IntelligencePanel />
  <HandDisplay />
  <ActionArea />
  <OpponentStatus />
</GameInterface>

// Each component handles one concern
function IntelligencePanel({ analysis }: Props) {
  return (
    <LayeredUI>
      <Layer1_AlwaysVisible />
      <Layer2_OnDemand />
      <Layer3_AdvancedStats />
    </LayeredUI>
  )
}
```

---

## 🚀 **Refined Development Roadmap**

| **Phase** | **Focus** | **Deliverables** | **Risk Mitigation** |
|-----------|-----------|------------------|-------------------|
| **Week 1** | Core Foundation | • Zustand state setup<br>• Basic multiplayer<br>• Mock intelligence | Use existing patterns as fallback |
| **Week 2** | Pattern Engine | • Frontend pattern matching<br>• Analysis caching<br>• Basic UI integration | Pre-calculate test evaluations |
| **Week 3** | User Experience | • Intelligence panel<br>• Layer cake UI<br>• Charleston flow | Feature flags for incomplete components |
| **Week 4+** | Advanced Features | • Opponent modeling<br>• Solo co-pilot mode<br>• Performance optimization | Fallback to simpler logic if too slow |

### **Phase 1: Clean Foundation (Week 1)**
**Goal:** Rebuild architecture without breaking existing functionality

1. **State Migration**
   ```bash
   npm install zustand @tanstack/react-query
   ```
   - Migrate existing state to Zustand stores
   - Wrap analysis in React Query
   - Keep existing components working

2. **Folder Restructure**
   - Move components to feature-based organization
   - Extract shared types and utilities
   - Set up error boundaries

3. **Delta Sync Protocol**
   - Design efficient WebSocket events
   - Implement optimistic updates
   - Add network error handling

### **Phase 2: Intelligence Hybrid (Week 2)**
**Goal:** Split analysis between frontend/backend optimally

1. **Frontend Analysis** (Instant)
   - Basic pattern matching
   - Simple discard suggestions
   - Local hand evaluation

2. **Backend Analysis** (Advanced)
   - Opponent modeling from all players' actions
   - Global game state analysis
   - Advanced probability calculations

3. **Caching Layer**
   - Memoize expensive calculations
   - Cache pattern matching results
   - Optimize for real-time performance

### **Phase 3: Co-Pilot Experience (Week 3)**
**Goal:** Deliver the intelligent assistant experience

1. **Layer Cake UI**
   - Always visible: Basic info
   - Tap for details: Analysis depth
   - Menu access: Advanced stats

2. **Feature Integration**
   - Tutorial system with existing patterns
   - Charleston intelligence panel
   - Main game co-pilot interface

3. **Solo Co-Pilot Mode**
   - Single-player analysis mode
   - Visible game state tracking only
   - Discreet operation features

### **Phase 4: Polish & Advanced Features (Week 4+)**
**Goal:** Production-ready intelligent assistant

1. **Performance Optimization**
   - Profile analysis bottlenecks
   - Optimize pattern matching algorithms
   - Implement background workers if needed

2. **Advanced Intelligence**
   - Sophisticated opponent modeling
   - Historical pattern learning
   - Adaptive difficulty recommendations

3. **Learning & Social Features**
   - Post-game analysis and replay
   - Social voting on decisions
   - Improvement suggestions

---

## ❓ Architecture Questions for You

## 🎯 **Refined Architecture Decisions**

### **1. State Management: Zustand + React Query** ✅
```typescript
// stores/game.ts - Simple, fast game state
const useGameStore = create<GameState>()((set) => ({
  tiles: [],
  phase: 'charleston',
  updateTiles: (newTiles) => set({ tiles: newTiles })
}))

// hooks/useIntelligence.ts - Async analysis with caching
const { data: analysis } = useQuery(['analysis', gameState], analyzeGameState)
```

### **2. Intelligence Engine: Hybrid Approach** ✅
| **Analysis Type** | **Location** | **Rationale** |
|------------------|--------------|---------------|
| Pattern Matching | Frontend | Instant feedback, works offline |
| Opponent Modeling | Backend | Requires global discard tracking |
| Probability Calc | Both | Fast estimates locally, precise on server |

### **3. Analysis Timing: Event-Triggered + Throttled** ✅
```typescript
// Responsive but not overwhelming
useEffect(() => {
  const handler = throttle(() => analyze(gameState), 500)
  gameEvents.on('change', handler)
  return () => gameEvents.off('change', handler)
}, [gameState])
```

### **4. Component Architecture: Feature-Driven Hierarchy** ✅
- **Feature Components:** Large (e.g., `<CharlestonManager>`)
- **UI Components:** Small (e.g., `<Tile glow="safe">`)
- **Clear separation** between business logic and presentation

---

## 🚀 **Performance Optimizations**

### **1. Network Efficiency: Delta Sync Protocol**
```typescript
// Send only changes, not full state
socket.emit('discard', { tile: '🀙', player: 'east' })
socket.emit('charleston-pass', { tiles: ['🀇', '🀈', '🀉'], from: 'east', to: 'south' })
```

### **2. Analysis Caching**
```typescript
const analyzeHand = memoize((tiles) => {
  // Expensive pattern calculations
}, { maxSize: 10 }) // Cache last 10 hand states
```

### **3. Error Isolation**
```typescript
<ErrorBoundary fallback={<BasicDiscardSuggestions />}>
  <FullIntelligencePanel />
</ErrorBoundary>
```

---

## 🔄 **Refined Data Flow**

```
Player Action → Local State Update → Intelligence Analysis (fast) → UI Update
     ↓                                                                    ↑
Socket Event → Server Validation → Global State Sync → Advanced Analysis
```

**Example: Discarding a Tile**
1. **Instant:** Local state updates, basic analysis shows
2. **Fast (100ms):** Pattern matching completes, recommendations update
3. **Background (500ms):** Server validates, broadcasts to others
4. **Advanced (1-2s):** Opponent modeling updates, risk assessment refreshes