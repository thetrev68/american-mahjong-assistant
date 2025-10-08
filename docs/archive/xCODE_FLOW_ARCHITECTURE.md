# Code Flow Architecture Documentation

## Overview

This document maps the complete data flow through the American Mahjong Assistant application, from user input to AI-powered recommendations. The architecture follows a unified game interface pattern where all strategic information flows through centralized stores to provide real-time co-pilot assistance.

## High-Level Architecture

```
User Input → State Stores → Intelligence Engines → UI Components → User Interface
     ↑                                                                    ↓
     └─────────────── Feedback Loop (Re-analysis) ←─────────────────────┘
```

## Core Data Flow Paths

### 1. Tile Input Flow

**Entry Point**: `TileInputPage.tsx`

```typescript
// INPUT: User tile selections
TileSelector.onTileSelect(tileId: string) 
  ↓
// STATE: Tile management
useTileStore().addTile(tileId) 
  ↓
// VALIDATION: Hand completeness
validateHand() → isHandComplete: boolean
  ↓
// NAVIGATION: Direct to game
navigate('/game') // Bypasses old /intelligence route
```

**Key Data Structures**:
- **Input**: `tileId: string` (e.g., "1B", "joker", "east")
- **State**: `PlayerTile[]` with `{id, instanceId, isSelected, isLocked}`
- **Output**: `isHandComplete: boolean`, triggers navigation

### 2. Game Initialization Flow

**Entry Point**: `GameModeView.tsx`

```typescript
// PHASE SETUP: Auto-transition to Charleston
useEffect(() => {
  if (gameStore.gamePhase === 'tile-input') {
    gameStore.setGamePhase('charleston')
  }
}, [gameStore])

// INTELLIGENCE KICKSTART: Auto-analyze for pattern recommendations  
useEffect(() => {
  const playerHand = tileStore.playerHand
  const hasEnoughTiles = playerHand.length >= 10
  const hasNoAnalysis = !intelligenceStore.currentAnalysis
  
  if (hasEnoughTiles && hasNoAnalysis && !intelligenceStore.isAnalyzing) {
    // Trigger AI analysis with empty patterns to get recommendations
    intelligenceStore.analyzeHand(playerHand, [])
  }
}, [tileStore.playerHand, intelligenceStore])
```

**Key Data Structures**:
- **Input**: `PlayerTile[]` from tile store
- **Process**: Phase transition, analysis trigger
- **Output**: Game phase state, analysis initialization

### 3. Intelligence Analysis Flow

**Entry Point**: `intelligence-store.ts`

```typescript
// ANALYSIS PIPELINE: 3-Engine System
async analyzeHand(playerHand: PlayerTile[], selectedPatterns: PatternSelectionOption[]) {
  
  // ENGINE 1: Pattern Analysis Engine
  const facts: PatternAnalysisFacts = await AnalysisEngine.analyzePattern(
    pattern, playerTiles
  )
  ↓
  // OUTPUT: Mathematical facts about tile matching
  {
    patternId: string,
    tileMatching: {
      bestVariation: TileMatchResult,
      worstVariation: TileMatchResult, 
      averageCompletion: number
    },
    tileAvailability: {
      missingTileCounts: TileAvailability[],
      totalMissing: number
    },
    jokerAnalysis: JokerAnalysis,
    progressMetrics: ProgressMetrics
  }

  // ENGINE 2: Pattern Ranking Engine  
  const ranking: PatternRanking = PatternRankingEngine.rankPattern(
    pattern, facts, gameContext
  )
  ↓
  // OUTPUT: 4-component scoring system
  {
    totalScore: number, // 0-100
    components: {
      currentTileScore: number,    // 0-40 points
      availabilityScore: number,   // 0-50 points  
      priorityScore: number,       // 0-10 points
      confidenceScore: number      // Penalty system
    },
    isViable: boolean,
    switchRecommendation?: string
  }

  // ENGINE 3: Tile Recommendation Engine
  const recommendations: TileRecommendationSet = TileRecommendationEngine.generateRecommendations(
    facts, ranking, gamePhase
  )
  ↓
  // OUTPUT: Strategic tile actions
  {
    discardRecommendations: TileRecommendation[],
    keepRecommendations: TileRecommendation[],
    passRecommendations: TileRecommendation[], // Charleston-specific
    reasoning: string,
    confidence: number
  }
}
```

**Key Data Structures**:
- **Input**: `PlayerTile[]`, `PatternSelectionOption[]`
- **Process**: 3-engine analysis pipeline
- **Output**: `IntelligenceAnalysis` with recommendations and pattern rankings

### 4. Pattern Selection Flow

**Entry Point**: `IntelligencePanel.tsx`

```typescript
// PATTERN INTERACTION: Click to select pattern
const handlePatternSelect = async (patternId: string) => {
  
  // STORE UPDATE: Pattern selection
  clearSelection()
  addTargetPattern(patternId)
  
  // RE-ANALYSIS: Update recommendations based on new pattern
  const pattern = currentAnalysis?.recommendedPatterns?.find(rec => rec.pattern.id === patternId)?.pattern
  if (pattern) {
    await analyzeHand(playerHand, [pattern])
  }
}
```

**Data Flow**:
```
User Click → Pattern Store Update → Intelligence Re-analysis → UI Update
```

**Key Data Structures**:
- **Input**: `patternId: string`
- **Process**: Store mutation, analysis trigger
- **Output**: Updated `currentAnalysis`, new pattern as primary

### 5. Charleston Strategy Flow

**Entry Point**: `GameScreenLayout.tsx` with `gamePhase="charleston"`

```typescript
// CHARLESTON-SPECIFIC ANALYSIS
if (gamePhase === 'charleston' && selectedPattern) {
  
  // PASS RECOMMENDATIONS: Based on pattern requirements
  const passRecommendations = analysis.recommendations.passRecommendations
  ↓
  // TILE SELECTION: User selects 3 tiles to pass
  selectedForAction.length === 3
  ↓  
  // CHARLESTON EXECUTION: Process pass
  onPass() → clearSelection() → advance to next phase
}
```

**Key Data Structures**:
- **Input**: Selected pattern, current hand
- **Process**: Charleston-specific tile recommendations
- **Output**: Tile pass suggestions with reasoning

### 6. Gameplay Flow

**Entry Point**: `GameScreenLayout.tsx` with `gamePhase="gameplay"`

```typescript
// GAMEPLAY ANALYSIS: Draw/Discard recommendations
if (gamePhase === 'gameplay') {
  
  // DRAW PHASE: AI suggests tile priority
  const drawRecommendations = analysis.recommendations.keep
  ↓
  // DISCARD PHASE: AI suggests optimal discards
  const discardRecommendations = analysis.recommendations.discard
  ↓
  // CALL OPPORTUNITIES: Pattern-based pung/kong detection
  const callOpportunities = detectCalls(exposedTiles, selectedPatterns)
  ↓
  // PATTERN SWITCHING: 15% improvement threshold detection
  if (betterPattern.score > currentPattern.score * 1.15) {
    recommendPatternSwitch(betterPattern)
  }
}
```

**Key Data Structures**:
- **Input**: Current hand, exposed tiles, discard pile
- **Process**: Real-time strategic analysis
- **Output**: Draw/discard recommendations, call opportunities

## Store Interconnections

### Zustand Store Dependencies

```typescript
// PRIMARY STORES
GameStore: {
  gamePhase: 'lobby' | 'tile-input' | 'charleston' | 'playing' | 'finished'
  currentPlayerId: string
  players: Player[]
}

TileStore: {
  playerHand: PlayerTile[]
  selectedForAction: PlayerTile[]
  dealerHand: boolean
}

PatternStore: {
  targetPatterns: PatternSelectionOption[]
  selectedPatternIds: string[]
}

IntelligenceStore: {
  currentAnalysis: IntelligenceAnalysis | null
  isAnalyzing: boolean
  autoAnalyze: boolean
}
```

### Store Communication Pattern

```typescript
// REACTIVE UPDATES: Store changes trigger re-analysis
TileStore.addTile() 
  → IntelligenceStore.analyzeHand() // Auto-trigger
  → PatternStore.getTargetPatterns() // Current selections
  → GameStore.gamePhase // Context for analysis type

// CROSS-STORE COORDINATION
PatternStore.addTargetPattern()
  → IntelligenceStore.analyzeHand() // Re-analyze with new pattern
  → TileStore.playerHand // Use current hand
  → GameStore.gamePhase // Charleston vs gameplay context
```

## Component Data Flow

### Main Game Interface

**`GameModeView.tsx`** (Orchestrator)
```typescript
// INPUTS: Store state
const gamePhase = gameStore.gamePhase
const playerHand = tileStore.playerHand  
const currentAnalysis = intelligenceStore.currentAnalysis
const selectedPatterns = patternStore.getTargetPatterns()

// PROCESSING: Local state management
const [isMyTurn, setIsMyTurn] = useState(false)
const [lastDrawnTile, setLastDrawnTile] = useState<TileType | null>(null)
const [exposedTiles, setExposedTiles] = useState([])

// OUTPUT: Unified game interface
return <GameScreenLayout {...allProps} />
```

**`GameScreenLayout.tsx`** (Layout Manager)
```typescript
// INPUTS: Props from GameModeView
interface GameScreenLayoutProps {
  gamePhase: 'charleston' | 'gameplay'
  currentAnalysis: IntelligenceAnalysis | null
  selectedPatternsCount: number
  // ... 20+ other props
}

// OUTPUT: Zone-based layout
<TopZone /> // Game state, timer, pattern count
<YourHandZone /> // Tile display, draw/discard actions  
<DiscardPileZone /> // Opponent discards
<OpponentExposedZone /> // Called sets
<IntelligencePanel /> // AI recommendations, pattern selection
```

### Intelligence Panel Component Tree

**`IntelligencePanel.tsx`** (Strategic Command Center)
```typescript
// INPUTS: Analysis and context
currentAnalysis: {
  recommendedPatterns: PatternRecommendation[]
  recommendations: {
    discard: { reasoning: string }
  }
  overallScore: number
}
gamePhase: 'charleston' | 'gameplay'

// PROCESSING: Pattern interaction logic
const handlePatternSelect = (patternId) => {
  addTargetPattern(patternId) → analyzeHand() → UI update
}

// OUTPUT: Strategic interface
{hasPatternSelected ? (
  <CharlesttonStrategy /> // Strategic tile recommendations
) : (
  <PatternRecommendations /> // Top 3 AI suggestions
)}
```

## File Dependencies & Imports

### Core Services
```typescript
// ANALYSIS ENGINES
'./services/analysis-engine.ts' // Engine coordination
'./services/pattern-analysis-engine.ts' // Engine 1: Mathematical facts  
'./services/pattern-ranking-engine.ts' // Engine 2: 4-component scoring
'./services/tile-recommendation-engine.ts' // Engine 3: Strategic recommendations

// DATA SERVICES
'./services/nmjl-service.ts' // NMJL 2025 pattern data
'./services/tile-service.ts' // Tile creation and validation
'./services/pattern-variation-loader.ts' // 1,002 pattern variations
```

### Store Architecture
```typescript
// ZUSTAND STORES
'./stores/game-store.ts' // Game phase, players, room state
'./stores/tile-store.ts' // Hand management, tile operations
'./stores/pattern-store.ts' // Pattern selection, target patterns
'./stores/intelligence-store.ts' // AI analysis, recommendations
'./stores/charleston-store.ts' // Charleston-specific state (legacy)
```

### Type System
```typescript  
// SHARED TYPES
'../../../shared/nmjl-types.ts' // PatternSelectionOption, PatternGroup
'../../types/tile-types.ts' // PlayerTile, TileType
'./services/pattern-analysis-engine.ts' // TileMatchResult, TileAvailability

// COMPONENT PROPS
interface GameScreenLayoutProps // 20+ props for unified interface
interface IntelligencePanelProps // Analysis data and callbacks
```

## Performance & Optimization

### Analysis Caching
```typescript
// ENGINE 1: Pattern variation caching
PatternVariationLoader.loadVariations() // 678KB optimized JSON
  → Cache: Map<patternId, PatternVariation[]> // In-memory lookup

// ENGINE 2: Scoring component caching  
calculateScoringComponents() // Cached by pattern + hand hash
  → Cache: Map<string, ScoringComponents> // Avoids recalculation

// ENGINE 3: Recommendation memoization
TileRecommendationEngine.generateRecommendations() // Memoized by context
  → Cache: WeakMap<analysis, recommendations> // Automatic cleanup
```

### Async Flow Management  
```typescript
// ANALYSIS PIPELINE: Sequential async operations
async analyzeHand() {
  setIsAnalyzing(true)
  
  try {
    const facts = await analyzePatternFacts() // Engine 1
    const ranking = await rankPattern(facts) // Engine 2  
    const recommendations = await generateRecommendations() // Engine 3
    
    setCurrentAnalysis({ facts, ranking, recommendations })
  } finally {
    setIsAnalyzing(false) // Always cleanup
  }
}
```

## Error Handling & Fallbacks

### Analysis Error Recovery
```typescript
// INTELLIGENCE STORE: Graceful degradation
try {
  const analysis = await analyzeHand()
  setCurrentAnalysis(analysis)
} catch (error) {
  setAnalysisError(error.message)
  // UI shows retry button, falls back to basic recommendations
}
```

### Component Error Boundaries
```typescript  
// GAME LAYOUT: Error isolation
<ErrorBoundary fallback={<BasicGameInterface />}>
  <IntelligencePanel /> // Complex AI features
</ErrorBoundary>

<ErrorBoundary fallback={<StaticHandDisplay />}>
  <YourHandZone /> // Tile interactions
</ErrorBoundary>
```

## Development Hooks & Tools

### Development Flow
```typescript
// ZUSTAND DEVTOOLS: State inspection
const useGameStore = create(devtools((set, get) => ({
  // Store implementation with full state visibility
})))

// REACT DEVTOOLS: Component tree inspection
<IntelligencePanel 
  // Props clearly visible in devtools for debugging
  currentAnalysis={analysis}
  gamePhase={gamePhase}
/>
```

### Debug Information
```typescript
// DEVELOPMENT LOGGING: Analysis performance
if (process.env.NODE_ENV === 'development') {
  console.log('Pattern analysis completed:', {
    duration: analysisTime,
    patternsAnalyzed: results.length,
    cacheHits: cacheStats.hits
  })
}
```

## Future Extension Points

### Plugin Architecture Hooks
```typescript
// ANALYSIS ENGINE EXTENSION: Custom engines
interface AnalysisEngine {
  analyze(facts: PatternAnalysisFacts): Promise<AnalysisResult>
}

// RECOMMENDATION EXTENSION: Custom strategies  
interface RecommendationStrategy {
  generateRecommendations(context: GameContext): TileRecommendation[]
}
```

### Integration Points
```typescript
// EXTERNAL INTEGRATIONS: Tournament systems
interface TournamentAPI {
  submitGameResult(result: GameResult): Promise<void>
  getOpponentStats(playerId: string): Promise<PlayerStats>
}

// ANALYTICS HOOKS: Performance tracking
interface AnalyticsTracker {
  trackPatternSelection(patternId: string, context: GameContext): void
  trackRecommendationAccuracy(recommendation: TileRecommendation, outcome: boolean): void
}
```

---

This code flow documentation provides a comprehensive map of how data moves through the American Mahjong Assistant. It shows the interconnected nature of the stores, the analysis pipeline, and how user interactions trigger cascading updates through the system to provide real-time strategic assistance.