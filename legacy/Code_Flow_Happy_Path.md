Charleston Hand Analysis Happy Path Walkthrough

  Here's the complete flow from game start to Charleston recommendations:

  1. Game Initialization & Tile Input Phase

  Location: backend/src/roomManager.ts:450-470
  - Players input their tiles (dealer gets 14, others get 13)
  - When all players finish tile input, updatePlayerTiles() checks if everyone is ready
  - If all players have tilesInputted: true, auto-advance to Charleston phase

  2. Charleston Phase Start (Backend)

  Location: backend/src/roomManager.ts:472 → backend/src/server.ts:180
  - Backend sets gameState.phase = 'charleston'
  - Initializes Charleston state with currentPhase: 'right'
  - Emits charleston-phase-started event to all clients

  3. Frontend Charleston Hook Initialization

  Location: frontend/src/hooks/useCharleston.ts:79-86
  - handleCharlestonPhaseStarted() receives the event
  - Sets currentPhase = 'right', clears selections, resets state
  - THIS IS WHERE ANALYSIS FIRES: Line 68 useMemo triggers

  4. Main Charleston Analysis Entry Point

  Function: getCharlestonRecommendations() in charleston-engine.ts:445
  getCharlestonRecommendations(playerTiles, 'right', 3) // Called from useMemo

  5. Charleston Engine Orchestration

  Location: charleston-engine.ts:40-50
  - Creates CharlestonAnalysisContext with player tiles, phase, and settings
  - Calls CharlestonEngine.generateRecommendations(context)
  - Advanced path: Calls CharlestonRecommendationEngine.generateRecommendations()

  6. Core Pattern Analysis

  Location: charleston-recommendation-engine.ts:41-49
  FIRST FUNCTION TO FIRE: NMJLPatternAnalyzer.analyzeAllPatterns(playerTiles, 2025, 15)

  Step-by-step analysis process:

  Step 1: Pattern Analysis (charleston-recommendation-engine.ts:49)

  const patternAnalyses = NMJLPatternAnalyzer.analyzeAllPatterns(playerTiles, 2025, 15);
  - Loads all 71 NMJL 2025 patterns
  - Matches player tiles against each pattern
  - Calculates completion percentages and missing tiles
  - Returns top 15 pattern matches sorted by completion/value

  Step 2: Pattern Requirements Analysis (charleston-recommendation-engine.ts:53)

  const patternInsights = this.analyzePatternRequirements(playerTiles, topPatterns);
  - Identifies critical tiles needed for top patterns
  - Determines tile flexibility (useful in multiple patterns)
  - Categorizes tiles as essential/useful/expendable

  Step 3: Tile Strategic Evaluation (charleston-recommendation-engine.ts:56)

  const tileValues = this.evaluateAllTilesWithRealPatterns(playerTiles, topPatterns, patternInsights, 'right');
  - Each tile gets keepValue and passValue scores
  - Based on real NMJL pattern requirements
  - Considers current Charleston phase context

  Step 4: Pass Combination Generation (charleston-recommendation-engine.ts:59)

  const passOptions = this.generatePatternAwarePassCombinations(tileValues, playerTiles, patternInsights);
  - Generates all possible 3-tile pass combinations
  - Scores each combination based on pattern optimization
  - Considers synergies and strategic implications

  Step 5: Strategic Advice Generation (charleston-recommendation-engine.ts:74-81)

  const strategicAdvice = this.generateAdvancedStrategicAdvice(playerTiles, tilesToPass, topPatterns, patternInsights, 'right', 4);
  - Creates human-readable recommendations
  - Explains why certain tiles should be passed
  - Provides strategic context for the Charleston phase

  7. Recommendation Package Creation

  Location: charleston-engine.ts:56-95
  - Wraps advanced recommendations in backward-compatible format
  - Creates pattern analysis with real point values and completion percentages
  - Generates phase-specific advice and risk assessment

  8. UI Display

  Location: charleston/CharlestonRecommendationPanel.tsx
  - Receives recommendations via props
  - Displays pattern completion percentages (now showing real values, not 0%)
  - Shows point values from NMJL data
  - Provides tile selection recommendations with reasoning

  Key Technical Flow Summary:

  Game Start → Tile Input → All Ready → Charleston Phase Start
      ↓
  useCharleston useMemo() triggers
      ↓
  getCharlestonRecommendations(tiles, 'right', 3)
      ↓
  CharlestonEngine.generateRecommendations()
      ↓
  CharlestonRecommendationEngine.generateRecommendations()
      ↓
  NMJLPatternAnalyzer.analyzeAllPatterns() [FIRST ANALYSIS FUNCTION]
      ↓
  Pattern matching → Tile evaluation → Combination generation → Strategic advice
      ↓
  Return comprehensive CharlestonRecommendation object
      ↓
  UI displays recommendations with real completion % and points

  The first function to fire when Charleston begins is NMJLPatternAnalyzer.analyzeAllPatterns() which loads the real NMJL 2025 data and performs the core
  pattern matching analysis that drives all subsequent recommendations.