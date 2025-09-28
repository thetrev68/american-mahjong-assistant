# American Mahjong Assistant - Strategy Advisor UI Revamp
## Complete Implementation Roadmap

### Overview
Transform the recommendations UI from technical data displays into an intuitive "Strategy Advisor" interface that adapts to gameplay phases and supports strategic decision-making during live physical games.

---

## Phase 1: Core Conversational Interface Foundation

### AI Development Prompt
```
You are working on the American Mahjong Assistant codebase. This is a React TypeScript app that helps players during physical mahjong games by providing intelligent tile and pattern recommendations.

CONTEXT:
- Current architecture: React 18 + TypeScript + Vite + Zustand + Tailwind CSS
- Main gameplay component: packages/frontend/src/features/gameplay/GameModeView.tsx (1,458 lines)
- Intelligence system: packages/frontend/src/features/intelligence-panel/
- Current problem: Technical data displays overwhelm users during fast-paced gameplay
- Goal: Create conversational AI interface that adapts to game phases

TASK: Replace the current PrimaryAnalysisCard.tsx with a new StrategyAdvisorPanel.tsx that:
1. Converts technical metrics to natural language
2. Detects game phase (early/mid/late/defensive) based on turn count, wall state, hand completion
3. Provides contextual advice that evolves with game state
4. Maintains all existing functionality while improving UX

FILES TO EXAMINE:
- packages/frontend/src/features/intelligence-panel/PrimaryAnalysisCard.tsx
- packages/frontend/src/stores/intelligence-store.ts
- packages/frontend/src/features/gameplay/GameModeView.tsx (lines 264-308)

REQUIREMENTS:
- Keep existing TypeScript interfaces
- Maintain mobile-first responsive design
- Follow existing purple/blue design system
- Preserve all AI analysis functionality
- Add pull-to-refresh gesture (pull down to re-analyze)
- Include error handling for AI service failures
- Support keyboard navigation and ARIA roles for accessibility
```

### Technical Specifications

#### Core Type Definitions
```typescript
// Core game state types
type GamePhase = 'early' | 'mid-game' | 'late-game' | 'end-game' | 'defensive'
type StrategyMode = 'flexible' | 'quick-win' | 'high-score' | 'defensive'
```

#### New Components to Create
```typescript
// packages/frontend/src/features/intelligence-panel/StrategyAdvisorPanel.tsx
interface StrategyAdvisorPanelProps {
  analysis: HandAnalysis
  currentPattern: PatternRecommendation | null
  gamePhase: GamePhase
  onRefresh: () => Promise<void>
}

// packages/frontend/src/features/intelligence-panel/ConversationalSummary.tsx
interface ConversationalMessage {
  text: string
  confidence: number
  urgency: 'low' | 'medium' | 'high'
  type: 'insight' | 'warning' | 'suggestion' | 'defense'  // For visual treatments
  actionable: boolean
}

// packages/frontend/src/hooks/useGamePhaseDetection.ts
// Updated to accept strategy mode for more intelligent phase detection
function useGamePhaseDetection(strategyMode: StrategyMode): {
  phase: GamePhase
  confidence: number
  reasoning: string
}

// packages/frontend/src/hooks/usePullToRefresh.ts
function usePullToRefresh(onRefresh: () => Promise<void>): {
  pullDistance: number
  isRefreshing: boolean
  bindGesture: any
}

// packages/frontend/src/hooks/useReducedMotion.ts
// Accessibility hook for motion preferences
function useReducedMotion(): boolean
```

#### Store Updates (Zustand)
```typescript
// intelligence-store.ts - State additions
interface IntelligenceState {
  // Existing state...
  gamePhase: GamePhase
  strategyMode: StrategyMode
  conversationalSummary: ConversationalMessage | null
  isAnalyzing: boolean
  analysisError: string | null
}

// New Actions
generateConversationalSummary(analysis: HandAnalysis, phase: GamePhase, strategyMode: StrategyMode): ConversationalMessage
detectGamePhase(gameState: GameState, strategyMode: StrategyMode): GamePhase
setGamePhase(phase: GamePhase): void
setAnalysisError(error: string | null): void
setIsAnalyzing(loading: boolean): void

// New Selectors
const useGamePhase = () => useIntelligenceStore(state => state.gamePhase)
const useConversationalSummary = () => useIntelligenceStore(state => state.conversationalSummary)
const useAnalysisState = () => useIntelligenceStore(state => ({
  isAnalyzing: state.isAnalyzing,
  error: state.analysisError
}))
```

#### Basic Pattern Priority (Phase 1 MVP)
```typescript
// packages/frontend/src/utils/pattern-priority.ts
// Simple priority logic for Phase 1 (advanced logic moved to Phase 2)
function getBasicPatternPriority(pattern: Pattern, completion: number): PatternPriority {
  if (completion >= 80) return 'pursue'    // Green - nearly complete
  if (completion >= 50) return 'backup'    // Yellow - viable option
  if (completion >= 20) return 'risky'     // Red - challenging
  return 'dead'                           // Gray - unlikely
}
```

#### Components to Replace
- Remove: `PrimaryAnalysisCard.tsx`
- Replace with: `StrategyAdvisorPanel.tsx`
- Update: `GameModeView.tsx` lines 264-308 (intelligence panel integration)

#### Test Files to Create
- `StrategyAdvisorPanel.test.tsx`
- `ConversationalSummary.test.tsx`
- `useGamePhaseDetection.test.ts`
- `pattern-priority.test.ts`

#### Error Handling Requirements
```typescript
// StrategyAdvisorPanel.tsx must handle:
- AI service timeouts/failures
- Invalid game state data
- Network connectivity issues
- Graceful degradation to basic recommendations
```

---

## Phase 2: Pattern Carousel & Visual Priority System

### AI Development Prompt
```
You are continuing work on the American Mahjong Assistant Strategy Advisor revamp.

CONTEXT:
- Phase 1 completed: Conversational interface with game phase detection
- Current focus: Replace PatternRecommendations.tsx with swipeable carousel
- Goal: Traffic light priority system (🟢🟡🔴⚫) with horizontal swipe navigation

TASK: Create a PatternCarousel component that:
1. Shows 3-5 pattern cards in horizontal swipeable layout
2. Uses color psychology for priority (green=pursue, yellow=backup, red=risky, gray=dead)
3. Calculates new "flexibility score" metric for pattern adaptability
4. Supports one-tap pattern switching
5. Shows contextual information based on game phase

FILES TO EXAMINE:
- packages/frontend/src/features/intelligence-panel/PatternRecommendations.tsx (current implementation)
- packages/frontend/src/stores/pattern-store.ts
- packages/frontend/src/ui-components/Card.tsx (design system)

REQUIREMENTS:
- Mobile-first touch interactions
- Smooth swipe animations
- Maintain existing pattern selection logic
- Add flexibility scoring algorithm
- Progressive disclosure (summary → details)
- WAI-ARIA roles and keyboard navigation support
- Focus management for screen readers
```

### Technical Specifications

#### New Components
```typescript
// packages/frontend/src/features/intelligence-panel/PatternCarousel.tsx
interface PatternCarouselProps {
  patterns: PatternCard[]
  onPatternSelect: (pattern: Pattern) => void
  onSwipe: (direction: 'left' | 'right') => void
}

// packages/frontend/src/features/intelligence-panel/PatternCard.tsx
interface PatternCard {
  pattern: Pattern
  priority: PatternPriority
  completion: number
  flexibility: number
  turnsEstimated: number
  tilesNeeded: TileRequirement[]
  conversationalAdvice: string
}

// packages/frontend/src/components/PriorityIndicator.tsx
type PatternPriority = 'pursue' | 'backup' | 'risky' | 'dead'
```

#### New Services
```typescript
// packages/frontend/src/services/FlexibilityAnalyzer.ts
function calculateFlexibilityScore(pattern: Pattern, availableTiles: Tile[]): number
function assignPatternPriority(pattern: Pattern, gameState: GameState): PatternPriority
function generateTileRequirements(pattern: Pattern, currentHand: Tile[]): TileRequirement[]

// Flexibility Score Calculation:
// Score = (number of possible tile combinations to complete pattern) / (rarity of required tiles)
// Range: 0-100, where higher scores = easier to adapt if board state changes
// Factors: tile availability in wall, alternative completion paths, joker usage efficiency
```

#### Components to Replace
- Remove: `PatternRecommendations.tsx`
- Replace with: `PatternCarousel.tsx`

---

## Phase 3: Gesture System Implementation

### AI Development Prompt
```
You are implementing the gesture system for the American Mahjong Assistant Strategy Advisor.

CONTEXT:
- Phases 1-2 completed: Conversational interface + pattern carousel
- Current focus: Add comprehensive gesture interactions
- Goal: Thumb-friendly mobile gestures for live gameplay

TASK: Implement gesture system with:
1. Pull-to-refresh on main game view (re-analyze hand)
2. Swipe gestures for pattern carousel navigation
3. Long-press on tiles for quick actions (keep/pass)
4. Smooth animations and haptic feedback

FILES TO EXAMINE:
- packages/frontend/src/features/gameplay/GameScreenLayout.tsx
- packages/frontend/src/ui-components/tiles/AnimatedTile.tsx
- packages/frontend/src/hooks/useGameIntelligence.tsx

REQUIREMENTS:
- Use react-spring for animations
- Add haptic feedback for iOS/Android
- Prevent gesture conflicts with existing touch handlers
- Full keyboard navigation support as fallback
- ARIA live regions for gesture feedback
```

### Technical Specifications

#### New Gesture Components
```typescript
// packages/frontend/src/components/gestures/PullToRefreshWrapper.tsx
interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  threshold?: number
  children: React.ReactNode
}

// packages/frontend/src/hooks/useSwipeGestures.ts
function useSwipeGestures(onSwipe: (direction: SwipeDirection) => void): {
  bindGesture: any
  isAnimating: boolean
}

// packages/frontend/src/hooks/useHapticFeedback.ts
function useHapticFeedback(): {
  lightImpact: () => void
  mediumImpact: () => void
  heavyImpact: () => void
}
```

#### Integration Points
- Wrap `GameScreenLayout.tsx` with `PullToRefreshWrapper`
- Add swipe handlers to `PatternCarousel.tsx`

> **Note:** Long-press tile gestures moved to Phase 5 due to high risk of interaction conflicts with existing tile selection/dragging functionality. Focus first on non-conflicting gestures.

---

## Phase 4: Adaptive Strategy System

### AI Development Prompt
```
You are implementing the adaptive strategy system for the American Mahjong Assistant.

CONTEXT:
- Phases 1-3 completed: Conversational UI + carousel + gestures
- Current focus: Strategy modes that adapt advice to user intent
- Goal: Support different player strategies (flexible/quick-win/high-score/defensive)

TASK: Create strategy mode system with:
1. Strategy selector UI component
2. Mode-specific filtering and advice
3. Adaptive messaging based on selected strategy
4. Progressive disclosure for different information depths

FILES TO EXAMINE:
- packages/frontend/src/stores/intelligence-store.ts
- packages/frontend/src/features/gameplay/GameModeView.tsx
- Current analysis algorithms in intelligence-panel/services/

REQUIREMENTS:
- Strategy modes persist across game sessions
- Advice adapts to selected mode
- Smooth transitions between modes
- Maintain all existing analysis functionality
- Keyboard navigation with arrow keys and enter
- ARIA role="tablist" with proper focus management
```

### Technical Specifications

#### New Strategy Components
```typescript
// packages/frontend/src/features/intelligence-panel/StrategyModeSelector.tsx
type StrategyMode = 'flexible' | 'quick-win' | 'high-score' | 'defensive'

interface StrategyModeProps {
  currentMode: StrategyMode
  onModeChange: (mode: StrategyMode) => void
  gamePhase: GamePhase
}

// packages/frontend/src/services/strategy/FlexibleModeAnalyzer.ts
function analyzeFlexibleStrategy(patterns: Pattern[], gameState: GameState): StrategyAdvice

// packages/frontend/src/services/strategy/DefensiveModeAnalyzer.ts
function analyzeDefensiveOptions(gameState: GameState, opponentHands?: PartialHand[]): DefenseAdvice
```

#### Store Updates
```typescript
// intelligence-store.ts additions
interface IntelligenceState {
  strategyMode: StrategyMode
  strategyAdvice: StrategyAdvice
  defensiveOpportunities: DefenseOpportunity[]
}

// New methods
setStrategyMode(mode: StrategyMode): void
generateStrategySpecificAdvice(mode: StrategyMode, analysis: HandAnalysis): StrategyAdvice
```

---

## Phase 5: Animation & Polish

### AI Development Prompt
```
You are adding the final polish to the American Mahjong Assistant Strategy Advisor.

CONTEXT:
- All core functionality implemented (phases 1-4)
- Current focus: Micro-animations and interaction feedback
- Goal: Delightful, game-like experience that doesn't distract from gameplay

TASK: Add polished animations:
1. Pulse animations for high-priority tiles
2. Particle effects for successful actions
3. Smooth progress bar animations
4. Loading states with themed animations
5. Error states with helpful guidance

FILES TO EXAMINE:
- All new components from phases 1-4
- packages/frontend/src/ui-components/ (design system)
- Current animation patterns in the codebase

REQUIREMENTS:
- Respect user's reduced motion preferences
- Keep animations subtle and purposeful
- 60fps performance on mobile devices
- Consistent with existing design language
```

### Technical Specifications

#### Animation Components
```typescript
// packages/frontend/src/components/animations/PriorityPulse.tsx
// packages/frontend/src/components/animations/SuccessParticles.tsx
// packages/frontend/src/components/animations/ProgressBarAnimation.tsx
// packages/frontend/src/components/animations/LoadingThoughts.tsx
```

#### Animation Utilities
```typescript
// packages/frontend/src/utils/animation-utils.ts
function createPulseAnimation(priority: PatternPriority): SpringConfig
function generateParticleEffect(actionType: 'keep' | 'pass' | 'switch'): ParticleConfig
```

#### Focus: Micro-animations and Polish Only
> **Note:** Advanced gesture features like long-press have been moved to future phases due to implementation complexity and conflict risks. Phase 5 focuses entirely on polish and performance.

---

## Testing Strategy

### Test Categories

#### Unit Tests
```typescript
// New test files needed:
- StrategyAdvisorPanel.test.tsx
- ConversationalSummary.test.tsx
- PatternCarousel.test.tsx
- useGamePhaseDetection.test.ts
- FlexibilityAnalyzer.test.ts
- GestureHandlers.test.tsx
- StrategyModeSelector.test.tsx
```

#### Integration Tests
```typescript
// Modified test files:
- GameModeView.test.tsx (update intelligence panel tests)
- intelligence-store.test.ts (add conversational AI tests)
- pattern-store.test.ts (add flexibility scoring tests)
```

#### E2E Tests (Playwright)
```typescript
// New scenarios:
- Complete gameplay flow with new interface
- Strategy mode switching during game
- Gesture interactions on mobile devices
- Progressive disclosure navigation
// Framework: Playwright for modern web app testing with gesture support
```

### Test Utilities
```typescript
// packages/frontend/src/__tests__/utils/strategy-advisor-helpers.ts
function createMockGamePhase(phase: GamePhase): MockGameState
function createMockPatternCards(count: number): PatternCard[]
function mockSwipeGesture(direction: SwipeDirection): GestureEvent
function mockPullToRefresh(distance: number): RefreshEvent
```

---

## Migration & Rollout Plan

### Feature Flag Implementation
```typescript
// Add to existing feature flag system
interface FeatureFlags {
  useStrategyAdvisor: boolean
  enableGestures: boolean
  showConversationalAI: boolean
}
```

### Gradual Rollout Strategy
1. **Phase 1**: Deploy with feature flag disabled, hidden
2. **Phase 2**: Enable for development/testing users
3. **Phase 3**: A/B testing with subset of users
4. **Phase 4**: Full rollout with fallback to old UI
5. **Phase 5**: Remove old components after validation

### Performance Monitoring
- Track gesture response times
- Monitor carousel swipe smoothness
- Measure AI response generation speed
- Mobile device performance metrics

### Rollback Plan
- Keep old components until new system is proven
- Feature flag for instant rollback
- Database migration scripts for any new data structures
- Communication plan for user-facing changes

---

## Success Metrics

### User Experience Metrics
- Time to make pattern decision (target: <30 seconds)
- Gesture interaction success rate (target: >95%)
- User preference (new vs old interface)
- Mobile usability scores

### Technical Metrics
- Component render performance
- Animation frame rates (target: 60fps)
- Memory usage on mobile devices
- Bundle size impact

### Gameplay Metrics
- Pattern switching frequency
- Strategy mode usage patterns
- Pull-to-refresh usage
- Error/confusion rates