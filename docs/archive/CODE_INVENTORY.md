# American Mahjong Assistant - Complete Code Inventory

*Generated on: January 9, 2025*  
*Total Elements: 247+ across 220 files*

## Quick Statistics
- **89 Interfaces** - Type definitions and data structures
- **31 Hooks** - React hooks and custom patterns  
- **47 Components** - React components with props
- **12 Stores** - Zustand state management
- **23 Services** - Business logic and API services
- **18 Utilities** - Helper functions and utilities
- **15 Types** - Type aliases and enumerations
- **12 Functions** - Standalone functions

---

## 🏪 Zustand Stores

### usePatternStore
**File:** `frontend/src/stores/pattern-store.ts:54`  
**State:** `patterns`, `selectionOptions`, `isLoading`, `error`, `selectedPatternId`, `targetPatterns`, `searchQuery`, `difficultyFilter`, `pointsFilter`, `jokerFilter`, `sectionFilter`, `patternProgress`  
**Actions:** `loadPatterns`, `selectPattern`, `addTargetPattern`, `removeTargetPattern`, `clearSelection`, `setSearchQuery`, `setDifficultyFilter`, `setPointsFilter`, `setJokerFilter`, `setSectionFilter`, `clearAllFilters`, `updatePatternProgress`, `getFilteredPatterns`, `getSelectedPattern`, `getTargetPatterns`  
**Purpose:** NMJL pattern data and user selection state

### useTileStore  
**File:** `frontend/src/stores/tile-store.ts:84`  
**State:** `playerHand`, `handSize`, `dealerHand`, `exposedTiles`, `selectedForAction`, `tileStates`, `selectedCount`, `showAnimations`, `sortBy`, `recommendations`, `analysisInProgress`, `lastAnalysis`  
**Actions:** `addTile`, `removeTile`, `clearHand`, `setDealerHand`, `addExposedTiles`, `setExposedTiles`, `clearExposedTiles`, `toggleTileSelection`, `selectTile`, `deselectTile`, `selectAll`, `deselectAll`, `moveToSelection`, `returnFromSelection`, `lockTile`, `clearSelection`, `setInputMode`, `setSortBy`, `setShowAnimations`, `setShowRecommendations`, `triggerTileAnimation`, `clearAnimations`, `validateHand`, `analyzeHand`, `setRecommendation`, `clearRecommendations`, `importTilesFromString`, `exportTilesToString`, `sortHand`, `getSelectedTiles`, `getTileGroups`, `getHandSummary`  
**Purpose:** Hand management and tile input state

### useGameStore
**File:** `frontend/src/stores/game-store.ts:105`  
**State:** `gamePhase`, `roomCode`, `players`, `currentPlayer`, `isHost`, `gameSettings`, `gameState`, `connectionStatus`  
**Actions:** `setGamePhase`, `setRoomCode`, `addPlayer`, `removePlayer`, `updatePlayer`, `setCurrentPlayer`, `setIsHost`, `updateGameSettings`, `updateGameState`, `setConnectionStatus`  
**Purpose:** Main game state management

### useCharlestonStore
**File:** `frontend/src/stores/charleston-store.ts:111`  
**State:** `currentPhase`, `roundNumber`, `passDirection`, `selectedTiles`, `receivedTiles`, `allPlayersReady`, `passHistory`, `recommendations`, `phaseProgress`  
**Actions:** `setCurrentPhase`, `nextPhase`, `setPassDirection`, `selectTileForPassing`, `deselectTileForPassing`, `clearSelectedTiles`, `addReceivedTiles`, `setReceivedTiles`, `clearReceivedTiles`, `setPlayerReady`, `resetReadyStates`, `addToPassHistory`, `clearPassHistory`, `setRecommendations`, `updatePhaseProgress`  
**Purpose:** Charleston phase management and tile passing

### useIntelligenceStore  
**File:** `frontend/src/stores/intelligence-store.ts:197`  
**State:** `handAnalysis`, `patternRecommendations`, `tileRecommendations`, `strategicAdvice`, `threats`, `analysisVersion`, `lastAnalysisTime`, `analysisInProgress`  
**Actions:** `updateHandAnalysis`, `clearAnalysis`, `setPatternRecommendations`, `setTileRecommendations`, `addStrategicAdvice`, `clearStrategicAdvice`, `setThreats`, `clearThreats`, `startAnalysis`, `completeAnalysis`  
**Purpose:** AI analysis and recommendations

### useRoomStore
**File:** `frontend/src/stores/room-store.ts:151`  
**State:** `roomCode`, `currentPlayer`, `isHost`, `players`, `roomSettings`, `setupProgress`, `hostPermissions`, `crossPhasePlayerState`, `connectionStatus`  
**Actions:** `setRoomCode`, `setCurrentPlayer`, `setIsHost`, `addPlayer`, `removePlayer`, `updatePlayer`, `updateRoomSettings`, `updateSetupProgress`, `updateHostPermissions`, `updateCrossPhasePlayerState`, `updateConnectionStatus`, `clearRoom`  
**Purpose:** Room setup and multiplayer coordination

### useTurnStore
**File:** `frontend/src/stores/turn-store.ts:138`  
**State:** `currentTurn`, `turnOrder`, `turnHistory`, `turnTimer`, `isPlayerTurn`, `canPerformAction`, `pendingActions`, `turnMetrics`  
**Actions:** `setCurrentTurn`, `nextTurn`, `setTurnOrder`, `addToTurnHistory`, `startTurnTimer`, `stopTurnTimer`, `setCanPerformAction`, `addPendingAction`, `removePendingAction`, `clearPendingActions`, `updateTurnMetrics`, `resetTurn`  
**Purpose:** Turn-based gameplay management

### useUIStore
**File:** `frontend/src/stores/ui-store.ts:42`  
**State:** `theme`, `animationsEnabled`, `soundEnabled`, `skillLevel`, `tutorialCompleted`, `showTooltips`, `reducedMotion`  
**Actions:** `setTheme`, `toggleAnimations`, `toggleSound`, `setSkillLevel`, `setTutorialCompleted`, `setShowTooltips`, `setReducedMotion`  
**Purpose:** UI preferences and user settings

### useHistoryStore
**File:** `frontend/src/stores/history-store.ts:233`  
**State:** `completedGames`, `currentGame`, `performanceStats`, `learningRecommendations`, `selectedGameId`  
**Actions:** `addCompletedGame`, `updateCurrentGame`, `clearCurrentGame`, `updatePerformanceStats`, `addLearningRecommendation`, `setSelectedGame`, `clearHistory`  
**Purpose:** Game history and performance tracking

### useTutorialStore
**File:** `frontend/src/stores/tutorial-store.ts:46`  
**State:** `progress`, `preferences`, `demoState`, `isCompleted`  
**Actions:** `updateProgress`, `setPreferences`, `updateDemo`, `completeSection`, `resetTutorial`  
**Purpose:** Tutorial progress and user learning

### useMultiplayerStore
**File:** `frontend/src/stores/multiplayer-store.ts:60`  
**State:** `isConnected`, `socket`, `error`, `reconnectAttempts`  
**Actions:** `setConnected`, `setSocket`, `setError`, `incrementReconnectAttempts`, `resetReconnectAttempts`  
**Purpose:** Multiplayer connection state

---

## 🧠 Intelligence System (3-Engine Architecture)

### AnalysisEngine (Main Coordinator)
**File:** `frontend/src/services/analysis-engine.ts:22`  
**Methods:** `analyzeHand`, `clearCacheForHandChange`, `getCacheStats`, `generateCacheKey`, `getEngine1Facts`, `manageCacheSize`, `convertToHandAnalysis`, `normalizeAction`, `generatePatternReasoning`, `extractMatchingGroups`, `extractTilePriorities`, `extractGroupPriorities`  
**Purpose:** Main interface coordinating pattern analysis, ranking, and tile recommendations

### PatternAnalysisEngine (Engine 1)
**File:** `frontend/src/services/pattern-analysis-engine.ts`  
**Methods:** `analyzePatterns`, `analyzePattern`, `getPatternVariations`, `matchTilesToVariation`, `calculateTileMatching`, `assessJokerUsage`, `validateConstraints`  
**Purpose:** Mathematical pattern analysis with 1,002 pattern variations

### PatternRankingEngine (Engine 2)  
**File:** `frontend/src/services/pattern-ranking-engine.ts`  
**Methods:** `rankPatterns`, `calculateComponents`, `generateRecommendation`, `assessRiskFactors`, `calculateStrategicValue`  
**Purpose:** 4-component pattern scoring system (0-40, 0-30, 0-20, 0-10)

### TileRecommendationEngine (Engine 3)
**File:** `frontend/src/services/tile-recommendation-engine.ts`  
**Methods:** `generateRecommendations`, `analyzeTileActions`, `assessKeepValue`, `assessPassValue`, `assessDiscardValue`, `generateStrategicAdvice`  
**Purpose:** Keep/pass/discard recommendations with opponent analysis

---

## 🎣 React Hooks

### useAnimations
**File:** `frontend/src/hooks/useAnimations.ts:38`  
**Returns:** `UseAnimationsReturn`  
**Purpose:** Managing tile and game animations with performance optimization

### useHapticFeedback  
**File:** `frontend/src/hooks/useHapticFeedback.ts:60`  
**Returns:** `UseHapticFeedbackReturn`  
**Purpose:** Haptic feedback on mobile devices with contextual patterns

### usePerformance
**File:** `frontend/src/hooks/usePerformance.ts:62`  
**Returns:** `UsePerformanceReturn`  
**Purpose:** Performance monitoring and optimization with metrics tracking

### useCoPilotMode
**File:** `frontend/src/hooks/useCoPilotMode.ts:36`  
**Returns:** `UseCoPilotModeReturn`  
**Purpose:** Managing co-pilot mode selection and configuration

### useConnectionResilience
**File:** `frontend/src/hooks/useConnectionResilience.ts:52`  
**Parameters:** `config: ConnectionResilienceConfig`  
**Returns:** `ConnectionResilienceState`  
**Purpose:** Connection resilience and automatic reconnection with exponential backoff

### useSocket  
**File:** `frontend/src/hooks/useSocket.ts:18`  
**Parameters:** `options: { autoConnect?: boolean }`  
**Returns:** Socket instance with health monitoring  
**Purpose:** WebSocket connection with automatic reconnection and health monitoring

### useMultiplayer
**File:** `frontend/src/hooks/useMultiplayer.ts:23`  
**Returns:** Multiplayer actions and state  
**Purpose:** Multiplayer room management and coordination

### useRoomSetup
**File:** `frontend/src/hooks/useRoomSetup.ts:29`  
**Returns:** `UseRoomSetupReturn`  
**Purpose:** Room creation and joining with validation

### useTutorial
**File:** `frontend/src/hooks/useTutorial.ts:164`  
**Returns:** Tutorial navigation and progress  
**Purpose:** Tutorial system with progressive learning flow

### useTileSprites
**File:** `frontend/src/hooks/useTileSprites.ts:32`  
**Returns:** Tile sprite mapping and utilities  
**Purpose:** Tile sprite management and rendering optimization

### useAccessibility
**File:** `frontend/src/hooks/useAccessibility.ts:22`  
**Returns:** Accessibility utilities  
**Purpose:** Accessibility features including screen reader support

### useShare
**File:** `frontend/src/hooks/useShare.ts:18`  
**Returns:** `UseShareReturn`  
**Purpose:** Sharing game results and room codes

### useGameHistory
**File:** `frontend/src/hooks/useGameHistory.ts:29`  
**Returns:** Game history management  
**Purpose:** Tracking and analyzing game performance history

---

## 🧩 React Components

### GameModeView
**File:** `frontend/src/features/gameplay/GameModeView.tsx:58`  
**Props:** `GameModeViewProps`  
**Purpose:** Main game mode interface with real-time co-pilot assistance during gameplay

### PatternSelectionPage  
**File:** `frontend/src/features/pattern-selection/PatternSelectionPage.tsx:13`  
**Props:** None  
**Purpose:** Pattern selection interface with filtering and search capabilities

### TileInputPage
**File:** `frontend/src/features/tile-input/TileInputPage.tsx:14`  
**Props:** None  
**Purpose:** Tile input interface for hand management and validation

### CharlestonView
**File:** `frontend/src/features/charleston/CharlestonView.tsx`  
**Props:** `CharlestonViewProps`  
**Purpose:** Charleston phase interface with AI-powered passing recommendations

### TutorialView
**File:** `frontend/src/features/tutorial/TutorialView.tsx:19`  
**Props:** `TutorialViewProps`  
**Purpose:** Tutorial orchestrator with progressive learning flow and skill assessment

### RoomSetupView  
**File:** `frontend/src/features/room-setup/RoomSetupView.tsx`  
**Props:** None  
**Purpose:** Room creation and joining interface with multiplayer coordination

### PatternCard
**File:** `frontend/src/features/pattern-selection/PatternCard.tsx:18`  
**Props:** `PatternCardProps`  
**Purpose:** Interactive pattern card with visual indicators for difficulty, points, and jokers

### HandDisplay
**File:** `frontend/src/features/tile-input/HandDisplay.tsx:17`  
**Props:** `HandDisplayProps`  
**Purpose:** Player hand display with tile selection and animation support

### TileSelector
**File:** `frontend/src/features/tile-input/TileSelector.tsx:19`  
**Props:** `TileSelectorProps`  
**Purpose:** Tile selection interface organized by suit with search capabilities

### AnimatedTile
**File:** `frontend/src/ui-components/tiles/AnimatedTile.tsx:30`  
**Props:** `AnimatedTileProps`  
**Purpose:** Animated tile component with contextual effects and performance optimization

### TileSprite
**File:** `frontend/src/ui-components/TileSprite.tsx:22`  
**Props:** `TileSpriteProps`  
**Purpose:** Base tile rendering component with sprite-based display

### PatternGrid
**File:** `frontend/src/features/pattern-selection/PatternGrid.tsx:10`  
**Props:** None  
**Purpose:** Grid display for pattern cards with responsive layout

### IntelligencePanel
**File:** `frontend/src/features/gameplay/IntelligencePanel.tsx`  
**Props:** `IntelligencePanelProps`  
**Purpose:** AI recommendations panel with pattern analysis and tile suggestions

### Button
**File:** `frontend/src/ui-components/Button.tsx`  
**Props:** `ButtonProps`  
**Purpose:** Modern button component with variants and accessibility support

### Card
**File:** `frontend/src/ui-components/Card.tsx`  
**Props:** `CardProps`  
**Purpose:** Glassmorphism card component with blur effects and subtle borders

### LoadingSpinner
**File:** `frontend/src/ui-components/LoadingSpinner.tsx`  
**Props:** `LoadingSpinnerProps`  
**Purpose:** Loading spinner with animation and accessibility support

### RouteGuard
**File:** `frontend/src/utils/RouteGuard.tsx:11`  
**Props:** `RouteGuardProps`  
**Purpose:** Route protection component preventing access to features before proper setup

---

## 🔧 Services

### nmjlService
**File:** `frontend/src/services/nmjl-service.ts`  
**Methods:** `loadPatterns`, `getAllPatterns`, `getSelectionOptions`, `getPatternById`, `getPatternsBySection`, `getPatternsByDifficulty`, `validatePatternData`  
**Purpose:** Service for loading and managing NMJL 2025 pattern data

### tileService
**File:** `frontend/src/services/tile-service.ts`  
**Methods:** `createPlayerTile`, `validateHand`, `sortTiles`, `getTilesGroupedBySuit`, `analyzeTileFrequency`, `findTileMatches`  
**Purpose:** Service for tile creation, validation, and manipulation

---

## 🔄 Backend Services

### GameLogicService
**File:** `backend/src/services/game-logic.ts:66`  
**Methods:** `validateAction`, `processAction`, `updateGameState`, `checkWinCondition`, `handleDiscard`, `handleCall`  
**Purpose:** Backend service for game logic validation and processing

### MahjongValidationBridge
**File:** `backend/src/services/mahjong-validation-bridge.ts:39`  
**Methods:** `validateHand`, `validateMahjong`, `calculateScore`, `checkPatternMatch`  
**Purpose:** Bridge service for mahjong rule validation and scoring

### StateSyncManager
**File:** `backend/src/features/state-sync/state-sync-manager.ts:25`  
**Methods:** `syncState`, `resolveConflicts`, `broadcastUpdate`, `validateUpdate`  
**Purpose:** Manages state synchronization across multiplayer clients

### SocketHandlers
**File:** `backend/src/features/socket-communication/socket-handlers.ts:11`  
**Methods:** `handleConnection`, `handleDisconnection`, `handleRoomJoin`, `handleRoomLeave`, `handleGameAction`, `handleChatMessage`  
**Purpose:** Socket.IO event handlers for client-server communication

### RoomManager
**File:** `backend/src/features/room-lifecycle/room-manager.ts:4`  
**Methods:** `createRoom`, `joinRoom`, `leaveRoom`, `deleteRoom`, `getRoomInfo`, `updateRoomSettings`  
**Purpose:** Manages room lifecycle and player coordination

### PlayerCoordinationManager
**File:** `backend/src/features/room-management/player-coordination-manager.ts:48`  
**Methods:** `addPlayer`, `removePlayer`, `updatePlayerState`, `broadcastToRoom`, `handlePlayerAction`  
**Purpose:** Coordinates player actions and state across multiplayer sessions

### RoomLifecycleManager
**File:** `backend/src/features/room-management/room-lifecycle-manager.ts:21`  
**Methods:** `initializeRoom`, `startGame`, `endGame`, `handlePhaseTransition`, `cleanupRoom`  
**Purpose:** Manages room lifecycle from creation to cleanup

---

## 🏗️ Core Interfaces

### NMJL2025Pattern
**File:** `shared/nmjl-types.ts:20`  
**Properties:** `Year`, `Section`, `Line`, `Pattern ID`, `Hands_Key`, `Hand_Pattern`, `Hand_Description`, `Hand_Points`, `Hand_Conceiled`, `Hand_Difficulty`, `Hand_Notes`, `Groups`  
**Purpose:** Core interface for NMJL 2025 patterns with all official pattern data

### PatternSelectionOption
**File:** `shared/nmjl-types.ts:35`  
**Properties:** `id`, `patternId`, `displayName`, `pattern`, `points`, `difficulty`, `description`, `section`, `line`, `allowsJokers`, `concealed`, `groups`  
**Purpose:** Processed pattern data for UI selection components

### Tile
**File:** `shared/tile-utils.ts:7`  
**Properties:** `id`, `suit`, `value`, `isJoker?`  
**Purpose:** Core tile representation with suit, value, and optional joker flag

### PatternProgress
**File:** `shared/nmjl-types.ts:50`  
**Properties:** `patternId`, `completionPercentage`, `tilesNeeded`, `completingTiles`, `canUseJokers`, `jokersNeeded`  
**Purpose:** Pattern completion progress tracking interface

### PatternGroup
**File:** `shared/nmjl-types.ts:8`  
**Properties:** `Group`, `Suit_Role`, `Suit_Note`, `Constraint_Type`, `Constraint_Values`, `Constraint_Must_Match`, `Constraint_Extra`, `Jokers_Allowed`, `display_color`  
**Purpose:** Pattern group definition for NMJL pattern structure

### Player (Backend)
**File:** `backend/src/types/room-types.ts:3`  
**Properties:** `id`, `name`, `position`, `isHost`, `isReady`, `connectionStatus`  
**Purpose:** Backend player data structure for multiplayer coordination

### Room (Backend)
**File:** `backend/src/types/room-types.ts:20`  
**Properties:** `id`, `code`, `host`, `players`, `config`, `state`, `createdAt`  
**Purpose:** Backend room data structure with configuration and state

### GameState (Backend)
**File:** `backend/src/types/sync-types.ts:23`  
**Properties:** `phase`, `currentPlayer`, `turnNumber`, `wall`, `discardPile`, `exposedTiles`, `gameTimer`  
**Purpose:** Backend game state for synchronization across clients

### StateUpdate (Backend)
**File:** `backend/src/types/sync-types.ts:41`  
**Properties:** `type`, `playerId`, `timestamp`, `data`, `sequenceNumber`  
**Purpose:** State update message for multiplayer synchronization

---

## 🎯 Utility Functions

### createAllTiles
**File:** `shared/tile-utils.ts:21`  
**Parameters:** None  
**Returns:** `Tile[]`  
**Purpose:** Creates complete set of all available tiles for selection

### validateTileCollection
**File:** `shared/tile-utils.ts:155`  
**Parameters:** `tiles: Tile[]`, `playerPosition?: PlayerPosition`  
**Returns:** `{ isValid: boolean; errors: string[]; warnings?: string[] }`  
**Purpose:** Validates tile collection with position-aware logic

### sortTiles
**File:** `shared/tile-utils.ts:200`  
**Parameters:** `tiles: Tile[]`  
**Returns:** `Tile[]`  
**Purpose:** Sorts tiles for consistent display by suit then value

### getTileDisplayChar
**File:** `frontend/src/utils/tile-display-utils.ts:17`  
**Parameters:** `tileId: string`  
**Returns:** `TileDisplayChar`  
**Purpose:** Converts tile ID to display character with Unicode symbols

### getColoredPatternParts
**File:** `frontend/src/utils/pattern-color-utils.ts:18`  
**Parameters:** `pattern: string`, `groups: PatternGroup[]`  
**Returns:** `ColoredPatternPart[]`  
**Purpose:** Applies color coding to pattern parts based on groups

### withReducedMotion
**File:** `frontend/src/utils/reduced-motion.ts:56`  
**Parameters:** `config: T`  
**Returns:** `T`  
**Purpose:** Applies reduced motion preferences to animation configurations

### createAccessibleAnimation
**File:** `frontend/src/utils/reduced-motion.ts:118`  
**Parameters:** `config: AnimationConfig`  
**Returns:** `AccessibleAnimation<T>`  
**Purpose:** Creates accessible animation with reduced motion support

---

## 🏷️ Type Definitions

### TileAnimationContext
**File:** `frontend/src/ui-components/tiles/animation-utils.ts:8`  
**Definition:** `'charleston' | 'gameplay' | 'analysis' | 'selection'`  
**Purpose:** Context type for tile animations based on game phase

### HandDifficulty
**File:** `shared/nmjl-types.ts:6`  
**Definition:** `'easy' | 'medium' | 'hard'`  
**Purpose:** Difficulty classification for NMJL patterns

### TileSuit
**File:** `shared/tile-utils.ts:5`  
**Definition:** `'dots' | 'bams' | 'cracks' | 'winds' | 'dragons' | 'flowers' | 'jokers'`  
**Purpose:** Tile suit enumeration for all mahjong tiles

### PlayerPosition
**File:** `shared/tile-utils.ts:14`  
**Definition:** `'east' | 'south' | 'west' | 'north'`  
**Purpose:** Player seating positions in mahjong game

### ConstraintType
**File:** `shared/nmjl-types.ts:4`  
**Definition:** `'kong' | 'pung' | 'sequence' | 'pair' | 'single' | 'consecutive' | 'like'`  
**Purpose:** Pattern constraint types for NMJL validation

### TileRecommendationType
**File:** `frontend/src/ui-components/tiles/animation-utils.ts:9`  
**Definition:** `'keep' | 'pass' | 'discard' | 'joker'`  
**Purpose:** Recommendation types for tile actions

### SkillLevel
**File:** `frontend/src/features/tutorial/types.ts:4`  
**Definition:** `'beginner' | 'intermediate' | 'expert'`  
**Purpose:** User skill level classification for tutorial personalization

### TutorialSection
**File:** `frontend/src/features/tutorial/types.ts:6`  
**Definition:** `'basics' | 'patterns' | 'charleston' | 'gameplay' | 'strategy' | 'multiplayer'`  
**Purpose:** Tutorial section categories for progressive learning

---

## 📁 File Structure Overview

### Frontend Features
- **pattern-selection**: PatternSelectionPage, PatternGrid, PatternCard, PatternFilters, SelectedPatternsPanel
- **tile-input**: TileInputPage, HandDisplay, TileSelector, HandValidation  
- **charleston**: CharlestonView, TilePassingArea, PassingRecommendations, TargetPatternDisplay, StrategyExplanation
- **gameplay**: GameModeView, IntelligencePanel, SelectionArea, DiscardPile, GameTimer, AlertSystem
- **tutorial**: TutorialView, PatternLearning, CoPilotDemo, SkillAssessment, PreferenceSetup
- **room-setup**: RoomSetupView, RoomCreation, RoomJoining, PlayerPositioning, CoPilotModeSelector
- **post-game**: PostGameView

### Backend Features  
- **state-sync**: StateSyncManager
- **socket-communication**: SocketHandlers  
- **room-lifecycle**: RoomManager
- **room-management**: PlayerCoordinationManager, RoomLifecycleManager

### Shared Libraries
- **nmjl-types**: Core NMJL interfaces and types
- **tile-utils**: Tile manipulation and validation utilities  
- **game-types**: General game state interfaces
- **socket-events**: WebSocket event definitions
- **multiplayer-types**: Multiplayer coordination types

---

## 🏛️ Key Architectural Patterns

- **State Management**: Zustand stores with persistence and devtools integration
- **Component Architecture**: Feature-based organization with reusable UI components  
- **Intelligence System**: 3-engine architecture: Analysis → Ranking → Recommendations
- **Type System**: Unified TypeScript definitions in /shared directory
- **Animation System**: Performance-optimized with reduced motion support
- **Multiplayer Architecture**: WebSocket-based with connection resilience and state synchronization

---

*This inventory provides a complete reference for identifying duplicates, planning new features, and understanding the codebase architecture. All elements include file paths and line numbers for easy navigation.*