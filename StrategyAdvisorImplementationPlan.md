# American Mahjong Assistant - Strategy Advisor UI Revamp
## Complete Implementation Roadmap

### Overview
Transform the recommendations UI from technical data displays into an intuitive "Strategy Advisor" interface that prioritizes immediate guidance and adapts to live physical gameplay needs. Focus on "what to do NOW" rather than technical analysis displays.

**Core UX Principles:**
- Guidance-first, not data-first
- 1-second glance understanding
- Mobile-optimized for physical gameplay
- Progressive disclosure of complexity
- Context-aware urgency

## **Architectural Framework**

### **📁 Feature-Sliced Design Organization**
```
packages/frontend/src/features/strategy-advisor/
├── components/           # UI Components
│   ├── GlanceModePanel.tsx
│   ├── ActionPatternCarousel.tsx
│   ├── UrgencyIndicator.tsx
│   ├── DisclosureManager.tsx
│   └── StrategyModeSelector.tsx
├── services/            # Business Logic (Co-located)
│   ├── strategy-advisor.service.ts      # Main coordinator
│   ├── message-generator.service.ts     # Pure message logic
│   ├── urgency-detection.service.ts     # Game phase analysis
│   ├── strategy-mode.service.ts         # Mode-specific logic
│   └── strategy-advisor-adapter.service.ts  # Integration layer
├── stores/              # Presentation State
│   └── strategy-advisor.store.ts        # UI state only
├── hooks/               # React Integration
│   ├── useStrategyAdvisor.ts            # Main hook
│   ├── useDisclosureState.ts            # Progressive disclosure
│   ├── useUrgencyDetection.ts           # Urgency awareness
│   └── useStrategyMode.ts               # Strategy selection
├── types/               # TypeScript Definitions
│   └── strategy-advisor.types.ts
└── __tests__/           # Component Tests
    ├── components/
    ├── services/
    └── hooks/
```

### **🔄 Data Flow Architecture**
```
GameModeView.tsx
     ↓ (uses hook)
useStrategyAdvisor
     ↓ (coordinates)
StrategyAdvisorService
     ↓ (adapts)
StrategyAdvisorAdapter → AnalysisEngine (existing)
     ↓ (transforms)
MessageGeneratorService → ConversationalMessage
     ↓ (updates)
StrategyAdvisorStore → UI Components
```

### **🏪 Store Separation Pattern**
```typescript
// intelligence-store.ts (UNCHANGED - analysis data only)
interface IntelligenceState {
  currentAnalysis: HandAnalysis | null
  isAnalyzing: boolean
  analysisError: string | null
  // NO UI state mixed in
}

// strategy-advisor.store.ts (NEW - presentation logic only)
interface StrategyAdvisorState {
  displayMode: 'glance' | 'details' | 'advanced'
  urgencyLevel: UrgencyLevel
  emergencyMode: boolean
  strategyMode: StrategyMode
  currentMessage: ConversationalMessage | null
  gestureState: GestureState
}
```

### **⚡ Service Layer Boundaries**
```typescript
// strategy-advisor.service.ts (Domain coordinator)
export class StrategyAdvisorService {
  generateMessage(analysis: HandAnalysis): ConversationalMessage
  detectUrgency(gameState: GameState): UrgencyLevel
  determineStrategy(mode: StrategyMode, analysis: HandAnalysis): StrategyAdvice
}

// strategy-advisor-adapter.service.ts (Integration safety)
export class StrategyAdvisorAdapter {
  constructor(
    private analysisEngine: AnalysisEngine,  // Existing system
    private messageGenerator: MessageGeneratorService
  ) {}

  async generateGuidance(analysis: HandAnalysis): Promise<StrategyGuidance> {
    // Adapter pattern - no duplication of analysis logic
    return this.messageGenerator.convertAnalysisToGuidance(analysis)
  }
}
```

### **🛡️ Integration Safety**
- **READ-ONLY** access to `intelligence-store.ts`
- **NO MODIFICATION** of existing analysis engine
- **ADAPTER PATTERN** for clean integration
- **UNIDIRECTIONAL** data flow prevents circular dependencies

---

## Phase 1: Glance Mode Interface Foundation

### AI Development Prompt
```
You are working on Phase 1: Glance Mode Interface for the American Mahjong Assistant Strategy Advisor.

ARCHITECTURAL CONTEXT:
- NEW Feature: packages/frontend/src/features/strategy-advisor/
- Follow Feature-Sliced Design: components/, services/, stores/, hooks/, types/
- INTEGRATION: Read-only access to existing intelligence-store.ts
- ADAPTER PATTERN: Use StrategyAdvisorAdapter for clean integration

TASK: Create the strategy-advisor feature foundation:
1. Set up feature directory structure following architectural framework
2. Create StrategyAdvisorStore (UI state only, separate from intelligence data)
3. Build StrategyAdvisorAdapter to safely integrate with existing analysis engine
4. Implement GlanceModePanel component with conversational messaging
5. Create useStrategyAdvisor hook for GameModeView integration

FILES TO CREATE:
- packages/frontend/src/features/strategy-advisor/stores/strategy-advisor.store.ts
- packages/frontend/src/features/strategy-advisor/services/strategy-advisor-adapter.service.ts
- packages/frontend/src/features/strategy-advisor/services/message-generator.service.ts
- packages/frontend/src/features/strategy-advisor/components/GlanceModePanel.tsx
- packages/frontend/src/features/strategy-advisor/hooks/useStrategyAdvisor.ts
- packages/frontend/src/features/strategy-advisor/types/strategy-advisor.types.ts

FILES TO EXAMINE (READ-ONLY):
- packages/frontend/src/stores/intelligence-store.ts (data source)
- packages/frontend/src/features/gameplay/GameModeView.tsx (integration point)
- packages/frontend/src/features/intelligence-panel/ (existing patterns)

ARCHITECTURAL REQUIREMENTS:
- NO modification of existing intelligence-store.ts
- Use adapter pattern for integration safety
- Unidirectional data flow: intelligence → adapter → strategy-advisor
- Service co-location within feature directory
- Type safety with centralized type definitions
```

### UI Wireframes

#### Glance Mode Layout (Mobile-First)
```
┌──────────────────────────────────────────┐
│ 🎢 American Mahjong Co-Pilot        │
├──────────────────────────────────────────┤
│                                          │
│  🟢 KEEP GOING WITH THIS PATTERN        │  ← Primary Action
│  "Consecutive Run - 2025"               │
│                                          │
│  🔥 Next: Discard 3-Dot                │  ← Immediate Step
│                                          │
│  🟡 Backup ready if needed            │  ← Confidence Indicator
│  "Any Like Numbers"                     │
│                                          │
│  [ Tap for details ]                   │  ← Progressive Disclosure
│                                          │
└──────────────────────────────────────────┘
```

#### Emergency Mode Layout
```
┌──────────────────────────────────────────┐
│ ⚠️  CRITICAL DECISION NEEDED            │  ← Urgent Header
├──────────────────────────────────────────┤
│                                          │
│  🔴 SWITCH TO DEFENSE MODE              │  ← High Urgency
│  Player 2 is close to winning           │
│                                          │
│  🛡️ Block: Keep 5-Bam, 6-Bam            │  ← Specific Action
│                                          │
└──────────────────────────────────────────┘
```

### Technical Specifications

#### Core Type Definitions
```typescript
// Glance Mode Message Types
type GlanceMessageType = 'primary-action' | 'backup-option' | 'immediate-step' | 'emergency'
type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical'
type ConfidenceDisplay = 'visual-only' | 'hidden' // No percentage displays
```

#### Core Type Definitions
```typescript
// packages/frontend/src/features/strategy-advisor/types/strategy-advisor.types.ts
export namespace StrategyAdvisorTypes {
  export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical'
  export type DisplayMode = 'glance' | 'details' | 'advanced'
  export type ActionType = 'continue' | 'switch' | 'defend' | 'seek-joker'
  export type GlanceMessageType = 'primary-action' | 'backup-option' | 'immediate-step' | 'emergency'

  export interface ConversationalMessage {
    readonly primaryAction: string        // "Keep going with this pattern"
    readonly immediateStep: string       // "Discard 3-Dot"
    readonly backupOption?: string       // "Backup ready if needed"
    readonly urgencyLevel: UrgencyLevel
    readonly messageType: GlanceMessageType
    readonly confidence: 'visual-only'   // No percentage displays
  }

  export interface StrategyGuidance {
    readonly message: ConversationalMessage
    readonly urgency: UrgencyLevel
    readonly emergencyMode: boolean
    readonly timestamp: number
  }
}
```

#### Service Layer Architecture
```typescript
// packages/frontend/src/features/strategy-advisor/services/strategy-advisor-adapter.service.ts
export class StrategyAdvisorAdapter {
  constructor(
    private messageGenerator: MessageGeneratorService
  ) {}

  async generateGuidance(
    analysis: HandAnalysis | null
  ): Promise<StrategyGuidance | null> {
    if (!analysis) return null

    const message = this.messageGenerator.generateGlanceMessage(analysis)
    const urgency = this.detectUrgency(analysis)

    return {
      message,
      urgency,
      emergencyMode: urgency === 'critical',
      timestamp: Date.now()
    }
  }

  private detectUrgency(analysis: HandAnalysis): UrgencyLevel {
    // Basic urgency detection for Phase 1
    // Advanced logic moves to Phase 2
    return 'medium'
  }
}

// packages/frontend/src/features/strategy-advisor/services/message-generator.service.ts
export class MessageGeneratorService {
  generateGlanceMessage(analysis: HandAnalysis): ConversationalMessage {
    return {
      primaryAction: this.generatePrimaryAction(analysis),
      immediateStep: this.generateImmediateStep(analysis),
      backupOption: this.generateBackupOption(analysis),
      urgencyLevel: 'medium', // Basic for Phase 1
      messageType: 'primary-action',
      confidence: 'visual-only'
    }
  }

  private generatePrimaryAction(analysis: HandAnalysis): string {
    const completion = analysis.bestPattern?.completion ?? 0
    const patternName = analysis.bestPattern?.name ?? 'current pattern'

    if (completion >= 80) return `Keep going with "${patternName}"`
    if (completion >= 60) return `Continue building "${patternName}"`
    if (completion >= 40) return `Stay flexible - multiple options open`
    return `Time to pivot - explore other patterns`
  }

  private generateImmediateStep(analysis: HandAnalysis): string {
    const action = analysis.recommendedAction

    if (!action) return 'Evaluate next draw'

    switch (action.type) {
      case 'discard':
        return `Discard ${action.tile?.name ?? 'suggested tile'}`
      case 'charleston':
        return `Charleston: Pass ${action.tiles?.length ?? 0} tiles`
      case 'defensive':
        return `Watch for dangerous discards`
      default:
        return 'Evaluate next draw'
    }
  }

  private generateBackupOption(analysis: HandAnalysis): string | undefined {
    const backupPattern = analysis.alternativePatterns?.[0]
    if (!backupPattern) return undefined

    return `Backup: "${backupPattern.name}" ready if needed`
  }
}
```

#### Strategy Advisor Store (Separate from Intelligence)
```typescript
// packages/frontend/src/features/strategy-advisor/stores/strategy-advisor.store.ts
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { StrategyAdvisorTypes } from '../types/strategy-advisor.types'

interface StrategyAdvisorState {
  // Display State
  displayMode: StrategyAdvisorTypes.DisplayMode
  urgencyLevel: StrategyAdvisorTypes.UrgencyLevel
  emergencyMode: boolean

  // Current Guidance
  currentGuidance: StrategyAdvisorTypes.StrategyGuidance | null
  isGeneratingGuidance: boolean
  guidanceError: string | null

  // User Preferences (persist across sessions)
  strategyMode: 'flexible' | 'quick-win' | 'defensive' | 'high-score'
  preferredDisclosureLevel: StrategyAdvisorTypes.DisplayMode
}

interface StrategyAdvisorActions {
  // Guidance Management
  setGuidance: (guidance: StrategyAdvisorTypes.StrategyGuidance | null) => void
  setGeneratingGuidance: (isGenerating: boolean) => void
  setGuidanceError: (error: string | null) => void

  // Display Control
  setDisplayMode: (mode: StrategyAdvisorTypes.DisplayMode) => void
  setUrgencyLevel: (level: StrategyAdvisorTypes.UrgencyLevel) => void
  setEmergencyMode: (enabled: boolean) => void

  // User Preferences
  setStrategyMode: (mode: StrategyAdvisorState['strategyMode']) => void
  setPreferredDisclosureLevel: (level: StrategyAdvisorTypes.DisplayMode) => void

  // Actions
  toggleDetailsView: () => void
  clearGuidance: () => void
}

export const useStrategyAdvisorStore = create<StrategyAdvisorState & StrategyAdvisorActions>()(
  subscribeWithSelector(
    (set, get) => ({
      // Initial State
      displayMode: 'glance',
      urgencyLevel: 'medium',
      emergencyMode: false,
      currentGuidance: null,
      isGeneratingGuidance: false,
      guidanceError: null,
      strategyMode: 'flexible',
      preferredDisclosureLevel: 'glance',

      // Actions
      setGuidance: (guidance) => set({ currentGuidance: guidance }),
      setGeneratingGuidance: (isGenerating) => set({ isGeneratingGuidance }),
      setGuidanceError: (error) => set({ guidanceError: error }),

      setDisplayMode: (mode) => set({ displayMode: mode }),
      setUrgencyLevel: (level) => set({ urgencyLevel: level }),
      setEmergencyMode: (enabled) => set({ emergencyMode: enabled }),

      setStrategyMode: (mode) => set({ strategyMode: mode }),
      setPreferredDisclosureLevel: (level) => set({ preferredDisclosureLevel: level }),

      toggleDetailsView: () => set((state) => ({
        displayMode: state.displayMode === 'glance' ? 'details' : 'glance'
      })),

      clearGuidance: () => set({
        currentGuidance: null,
        guidanceError: null,
        emergencyMode: false
      })
    })
  )
)

// Selector Hooks for Clean Component Usage
export const useCurrentGuidance = () => useStrategyAdvisorStore(state => state.currentGuidance)
export const useDisplayMode = () => useStrategyAdvisorStore(state => state.displayMode)
export const useUrgencyLevel = () => useStrategyAdvisorStore(state => state.urgencyLevel)
export const useEmergencyMode = () => useStrategyAdvisorStore(state => state.emergencyMode)
export const useStrategyMode = () => useStrategyAdvisorStore(state => state.strategyMode)
export const useGuidanceState = () => useStrategyAdvisorStore(state => ({
  isGenerating: state.isGeneratingGuidance,
  error: state.guidanceError
}))
```

#### React Components Architecture
```typescript
// packages/frontend/src/features/strategy-advisor/components/GlanceModePanel.tsx
import React from 'react'
import { useCurrentGuidance, useDisplayMode, useEmergencyMode } from '../stores/strategy-advisor.store'
import type { StrategyAdvisorTypes } from '../types/strategy-advisor.types'

interface GlanceModePanelProps {
  className?: string
  onExpandDetails?: () => void
}

export const GlanceModePanel: React.FC<GlanceModePanelProps> = ({
  className,
  onExpandDetails
}) => {
  const guidance = useCurrentGuidance()
  const displayMode = useDisplayMode()
  const emergencyMode = useEmergencyMode()

  if (!guidance) {
    return (
      <div className={`strategy-advisor-panel ${className}`}>
        <div className="analyzing-state">
          🔄 Analyzing your hand...
        </div>
      </div>
    )
  }

  const { message } = guidance
  const urgencyClass = emergencyMode ? 'emergency' : guidance.urgency

  return (
    <div className={`strategy-advisor-panel ${urgencyClass} ${className}`}>
      {emergencyMode && (
        <div className="emergency-header">
          🔴 CRITICAL DECISION NEEDED
        </div>
      )}

      <div className="primary-action">
        {emergencyMode ? '🛡️' : '🟢'} {message.primaryAction}
      </div>

      <div className="immediate-step">
        {emergencyMode ? '⚡' : '🔮'} {message.immediateStep}
      </div>

      {message.backupOption && !emergencyMode && (
        <div className="backup-option">
          🟡 {message.backupOption}
        </div>
      )}

      {displayMode === 'glance' && onExpandDetails && (
        <button
          className="expand-details-btn"
          onClick={onExpandDetails}
          aria-label="Show more details"
        >
          ⋯ More details
        </button>
      )}
    </div>
  )
}
```

#### Integration Hook Architecture
```typescript
// packages/frontend/src/features/strategy-advisor/hooks/useStrategyAdvisor.ts
import { useEffect, useCallback } from 'react'
import { useStrategyAdvisorStore } from '../stores/strategy-advisor.store'
import { useIntelligenceStore } from '../../../stores/intelligence-store' // READ-ONLY
import { StrategyAdvisorAdapter } from '../services/strategy-advisor-adapter.service'
import { MessageGeneratorService } from '../services/message-generator.service'

// Singleton services (could be moved to DI container)
const messageGenerator = new MessageGeneratorService()
const strategyAdapter = new StrategyAdvisorAdapter(messageGenerator)

export function useStrategyAdvisor() {
  // READ-ONLY access to intelligence data
  const currentAnalysis = useIntelligenceStore(state => state.currentAnalysis)
  const isAnalyzing = useIntelligenceStore(state => state.isAnalyzing)

  // Strategy Advisor state management
  const {
    setGuidance,
    setGeneratingGuidance,
    setGuidanceError,
    toggleDetailsView,
    clearGuidance
  } = useStrategyAdvisorStore()

  // Generate guidance when analysis changes
  useEffect(() => {
    if (isAnalyzing) {
      setGeneratingGuidance(true)
      setGuidanceError(null)
      return
    }

    if (!currentAnalysis) {
      clearGuidance()
      return
    }

    // Generate guidance using adapter pattern
    strategyAdapter
      .generateGuidance(currentAnalysis)
      .then((guidance) => {
        setGuidance(guidance)
        setGeneratingGuidance(false)
      })
      .catch((error) => {
        console.error('Strategy Advisor guidance generation failed:', error)
        setGuidanceError('Unable to generate guidance. Tap to retry.')
        setGeneratingGuidance(false)
      })
  }, [currentAnalysis, isAnalyzing, setGuidance, setGeneratingGuidance, setGuidanceError, clearGuidance])

  // Public interface for components
  return {
    toggleDetailsView: useCallback(toggleDetailsView, [toggleDetailsView]),
    retryGuidance: useCallback(() => {
      if (currentAnalysis) {
        setGeneratingGuidance(true)
        setGuidanceError(null)
        strategyAdapter.generateGuidance(currentAnalysis)
          .then(setGuidance)
          .catch((error) => setGuidanceError('Retry failed. Check connection.'))
          .finally(() => setGeneratingGuidance(false))
      }
    }, [currentAnalysis, setGuidance, setGeneratingGuidance, setGuidanceError])
  }
}
```

#### GameModeView Integration (Safe Pattern)
```typescript
// packages/frontend/src/features/gameplay/GameModeView.tsx
// MINIMAL CHANGES - only add Strategy Advisor alongside existing intelligence panel

import { useStrategyAdvisor } from '../strategy-advisor/hooks/useStrategyAdvisor'
import { GlanceModePanel } from '../strategy-advisor/components/GlanceModePanel'

function GameModeView() {
  // Existing code unchanged...

  // NEW: Strategy Advisor integration
  const { toggleDetailsView, retryGuidance } = useStrategyAdvisor()

  return (
    <div className="game-mode-view">
      {/* Existing game layout... */}

      {/* REPLACE: lines 264-308 intelligence panel section */}
      <div className="intelligence-section">
        {/* NEW: Strategy Advisor */}
        <GlanceModePanel
          onExpandDetails={toggleDetailsView}
          className="strategy-advisor-integration"
        />

        {/* KEEP: Existing fallback for feature flag */}
        {!isStrategyAdvisorEnabled && (
          <PrimaryAnalysisCard /> // Existing component preserved
        )}
      </div>

      {/* Rest of existing layout... */}
    </div>
  )
}
```

#### Migration Strategy (Zero Risk)
```typescript
// Feature flag controlled rollout
interface FeatureFlags {
  useStrategyAdvisor: boolean  // Default: false
}

// Gradual migration:
// 1. Deploy Strategy Advisor feature with flag disabled
// 2. A/B test with 10% of users
// 3. Full rollout when validated
// 4. Remove old PrimaryAnalysisCard after 2 weeks
```

#### Test Files to Create
```typescript
// Unit Tests
- packages/frontend/src/features/strategy-advisor/__tests__/components/GlanceModePanel.test.tsx
- packages/frontend/src/features/strategy-advisor/__tests__/services/message-generator.service.test.ts
- packages/frontend/src/features/strategy-advisor/__tests__/services/strategy-advisor-adapter.service.test.ts
- packages/frontend/src/features/strategy-advisor/__tests__/hooks/useStrategyAdvisor.test.ts
- packages/frontend/src/features/strategy-advisor/__tests__/stores/strategy-advisor.store.test.ts

// Integration Tests
- packages/frontend/src/features/strategy-advisor/__tests__/integration/strategy-advisor-flow.test.tsx
- packages/frontend/src/features/gameplay/__tests__/GameModeView.strategy-advisor.test.tsx
```

#### Error Handling & Resilience
```typescript
// Comprehensive error boundaries
interface ErrorRecoveryStrategy {
  messageGenerationFailed: () => 'Show last known guidance with staleness indicator'
  analysisDataInvalid: () => 'Fallback to "Tap to refresh" state'
  serviceUnavailable: () => 'Graceful degradation to basic recommendations'
  emergencyDetectionFailed: () => 'Default to medium urgency, no emergency mode'
}

// Performance safeguards
interface PerformanceConstraints {
  maxMessageGenerationTime: 500  // ms
  maxStoreUpdateFrequency: 60    // Hz
  maxComponentRenderTime: 16     // ms (60fps)
}
```

---

## Phase 2: Context-Aware Urgency System

### AI Development Prompt
```
You are working on Phase 2: Context-Aware Urgency System for the American Mahjong Assistant.

CONTEXT:
- Phase 1 completed: Glance Mode with conversational messaging
- Current focus: Adaptive urgency based on game context
- Goal: Interface adapts visual treatment based on decision pressure

TASK: Create urgency detection and adaptive UI system:
1. Detect game phases: early-game (turns 1-8), mid-game (9-16), late-game (17+), defensive
2. Calculate decision urgency: time pressure, opponent proximity to winning, hand state
3. Adapt visual treatments: colors, sizing, animation intensity
4. Emergency mode for critical moments (opponent 1 tile away)
5. Context-aware information density (show less when pressure is high)

FILES TO EXAMINE:
- packages/frontend/src/features/intelligence-panel/GlanceModePanel.tsx (Phase 1 output)
- packages/frontend/src/stores/game-store.ts (game state data)
- packages/frontend/src/stores/intelligence-store.ts (analysis data)

REQUIREMENTS:
- Smooth urgency transitions, not jarring switches
- Maintain accessibility during high-urgency states
- Performance: urgency calculation under 50ms
- Respect reduced motion preferences
- Keyboard navigation maintained in all urgency states
```

### UI Wireframes

#### Standard Urgency (Early/Mid Game)
```
┌──────────────────────────────────────────┐
│ 🎯 Turn 12 - Mid Game               │
├──────────────────────────────────────────┤
│                                          │
│  🟢 Continue with Consecutive Run        │  ← Calm colors
│                                          │
│  🔮 Next: Look for 7-Dot               │  ← Detailed guidance
│                                          │
│  🟡 Backup: Any Like Numbers ready      │  ← Multiple options
│                                          │
└──────────────────────────────────────────┘
```

#### High Urgency (Late Game)
```
┌──────────────────────────────────────────┐
│ ⏰ Turn 19 - DECISION TIME            │  ← Urgent header
├──────────────────────────────────────────┤
│                                          │
│  🔴 COMMIT TO CONSECUTIVE RUN           │  ← Bold, larger text
│                                          │
│  ⚡ MUST FIND: 7-Dot or 8-Dot           │  ← Essential only
│                                          │
└──────────────────────────────────────────┘
```

#### Emergency Mode (Defensive)
```
┌──────────────────────────────────────────┐
│ 🔴 EMERGENCY - SOMEONE NEAR WIN         │  ← Red emergency
├──────────────────────────────────────────┤
│                                          │
│  🛡️ BLOCK: Keep all Dragons + 1-Dot      │  ← Defense only
│                                          │
└──────────────────────────────────────────┘
```

### Technical Specifications

#### Game Phase & Urgency Detection
```typescript
// packages/frontend/src/hooks/useGamePhaseDetection.ts
type GamePhase = 'early' | 'mid-game' | 'late-game' | 'defensive'
type UrgencyLevel = 'low' | 'medium' | 'high' | 'emergency'

interface GamePhaseData {
  phase: GamePhase
  urgency: UrgencyLevel
  turnNumber: number
  wallTilesRemaining: number
  opponentProximity: 'safe' | 'close' | 'dangerous' | 'critical'
}

function useGamePhaseDetection(): GamePhaseData {
  // Phase calculation:
  // early: turns 1-8, low urgency
  // mid-game: turns 9-16, medium urgency
  // late-game: turns 17+, high urgency
  // defensive: opponent close to winning, emergency urgency
}
```

#### Adaptive UI Components
```typescript
// packages/frontend/src/components/UrgencyProvider.tsx
interface UrgencyContextValue {
  urgency: UrgencyLevel
  gamePhase: GamePhase
  emergencyMode: boolean
  visualTheme: UrgencyTheme
}

// packages/frontend/src/components/AdaptiveCard.tsx
interface AdaptiveCardProps {
  urgency: UrgencyLevel
  children: React.ReactNode
  emphasize?: boolean
}

// packages/frontend/src/utils/urgency-themes.ts
interface UrgencyTheme {
  colors: {
    primary: string
    background: string
    text: string
    accent: string
  }
  spacing: 'compact' | 'normal' | 'spacious'
  animation: 'none' | 'subtle' | 'emphasis'
  fontSize: 'normal' | 'large' | 'xl'
}
```

#### Components to Update
- Modify: `GlanceModePanel.tsx` (add urgency awareness)
- Update: `PrimaryActionCard.tsx` (adaptive styling)
- Add: `UrgencyIndicator.tsx` (game phase display)

---

## Phase 3: Action-First Pattern Navigation

### AI Development Prompt
```
You are working on Phase 3: Action-First Pattern Navigation for the American Mahjong Assistant.

CONTEXT:
- Phases 1-2 completed: Glance Mode interface + urgency-aware UI
- Current focus: Pattern selection with clear action priorities
- Goal: Traffic light system (🟢🟡🔴) with immediate pattern switching

TASK: Create ActionPatternCarousel that replaces technical analysis with action priorities:
1. Traffic light priority: 🟢 Pursue, 🟡 Backup, 🔴 Risky, ⚫ Dead
2. One-tap pattern switching with immediate feedback
3. "What happens if I switch?" preview
4. Horizontal swipe navigation optimized for thumbs
5. Simplified pattern cards showing only essential information

FILES TO EXAMINE:
- packages/frontend/src/features/intelligence-panel/PatternRecommendations.tsx (current)
- packages/frontend/src/stores/pattern-store.ts (pattern switching logic)
- packages/frontend/src/features/intelligence-panel/GlanceModePanel.tsx (Phase 1 output)

REQUIREMENTS:
- Mobile-first swipe gestures with haptic feedback
- Clear visual hierarchy: action > pattern name > details
- Smooth animations between pattern switches
- Preserve existing pattern scoring underneath
- Keyboard navigation with arrow keys and enter
- ARIA roles for screen readers
```

### UI Wireframes

#### Pattern Carousel Layout (Mobile)
```
┌──────────────────────────────────────────┐
│ ◀ 🟢 PURSUE THIS PATTERN        2/3 ▶   │  ← Swipeable
├──────────────────────────────────────────┤
│                                          │
│  "Consecutive Run - 2025"                │  ← Pattern name
│                                          │
│  ✅ Almost there: Need 7-Dot, 8-Dot      │  ← Action focus
│                                          │
│  [ Switch to this ] [ Preview ]          │  ← Clear actions
│                                          │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ ◀ 🟡 BACKUP OPTION            2/3 ▶     │
├──────────────────────────────────────────┤
│                                          │
│  "Any Like Numbers"                      │
│                                          │
│  🔄 Ready to switch if needed            │
│                                          │
│  [ Keep as backup ] [ Preview ]          │
│                                          │
└──────────────────────────────────────────┘
```

### Technical Specifications

#### Action-First Components
```typescript
// packages/frontend/src/features/intelligence-panel/ActionPatternCarousel.tsx
interface ActionPatternCarouselProps {
  patterns: ActionPatternCard[]
  currentPatternId: string
  onPatternSwitch: (patternId: string) => void
  onPreview: (patternId: string) => void
}

interface ActionPatternCard {
  id: string
  pattern: Pattern
  priority: PatternPriority
  actionMessage: string      // "Almost there: Need 7-Dot"
  switchMessage: string      // "Switch to this pattern?"
  tilesNeeded: Tile[]
  turnsEstimated: number
}

type PatternPriority = 'pursue' | 'backup' | 'risky' | 'dead'

// packages/frontend/src/components/PatternPriorityIndicator.tsx
interface PriorityIndicatorProps {
  priority: PatternPriority
  size: 'small' | 'medium' | 'large'
  animated?: boolean
}

// packages/frontend/src/hooks/usePatternSwitching.ts
function usePatternSwitching() {
  return {
    switchPattern: (patternId: string) => void
    previewPattern: (patternId: string) => PatternPreview
    canSwitch: boolean
    switchCost: number  // tiles that would be wasted
  }
}
```

#### Swipe Navigation
```typescript
// packages/frontend/src/hooks/useCarouselSwipe.ts
function useCarouselSwipe(onSwipe: (direction: 'left' | 'right') => void) {
  return {
    bind: any  // react-spring gesture bindings
    currentIndex: number
    isAnimating: boolean
  }
}

// packages/frontend/src/utils/pattern-prioritizer.ts
function calculatePatternPriority(
  pattern: Pattern,
  currentHand: Tile[],
  gamePhase: GamePhase
): PatternPriority {
  // Simple logic for Phase 3
  const completion = calculateCompletion(pattern, currentHand)

  if (completion >= 80) return 'pursue'
  if (completion >= 50) return 'backup'
  if (completion >= 25) return 'risky'
  return 'dead'
}
```

#### Components to Replace
- Remove: `PatternRecommendations.tsx`
- Replace with: `ActionPatternCarousel.tsx`
- Add: `PatternPriorityIndicator.tsx`

---

## Phase 4: Mobile-Optimized Gestures

### AI Development Prompt
```
You are working on Phase 4: Mobile-Optimized Gestures for the American Mahjong Assistant.

CONTEXT:
- Phases 1-3 completed: Glance Mode + urgency awareness + pattern carousel
- Current focus: Essential mobile gestures for live gameplay
- Goal: Thumb-friendly interactions that don't conflict with existing tile handling

TASK: Implement core gesture system:
1. Pull-to-refresh on main game view (re-analyze hand)
2. Pattern carousel swipe navigation (horizontal)
3. Tap-and-hold for pattern details (progressive disclosure)
4. Haptic feedback for all gesture interactions
5. Avoid conflicts with existing tile drag/drop

FILES TO EXAMINE:
- packages/frontend/src/features/gameplay/GameModeView.tsx (main container)
- packages/frontend/src/features/intelligence-panel/ActionPatternCarousel.tsx (Phase 3 output)
- packages/frontend/src/hooks/useGameIntelligence.ts (re-analysis trigger)

REQUIREMENTS:
- Gestures work in landscape and portrait modes
- Haptic feedback on iOS/Android
- Smooth 60fps animations
- Graceful fallback for desktop/keyboard users
- No interference with tile selection/dragging
- Reduced motion respect
```

### UI Wireframes

#### Pull-to-Refresh Flow
```
┌──────────────────────────────────────────┐
│ ↓ Pull down to re-analyze hand...        │  ← Initial pull
├──────────────────────────────────────────┤
│                                          │
│  🎯 Keep going with pattern              │
│                                          │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ ↓ Release to refresh                     │  ← Ready to release
├──────────────────────────────────────────┤
│                                          │
│  🔄 Analyzing...                         │  ← Loading state
│                                          │
└──────────────────────────────────────────┘
```

### Technical Specifications

#### Gesture Components
```typescript
// packages/frontend/src/components/gestures/PullToRefreshWrapper.tsx
interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  threshold?: number        // Default: 80px
  maxDistance?: number      // Default: 120px
  disabled?: boolean
  children: React.ReactNode
}

// packages/frontend/src/hooks/useHapticFeedback.ts
function useHapticFeedback() {
  return {
    lightTap: () => void     // Pattern navigation
    mediumTap: () => void    // Pattern switch
    heavyTap: () => void     // Pull-to-refresh trigger
    selectionStart: () => void  // Long press start
    selectionEnd: () => void    // Long press end
  }
}

// packages/frontend/src/hooks/useTouchGestures.ts
function useTouchGestures(config: GestureConfig) {
  return {
    pullToRefresh: (element: RefObject<HTMLElement>) => any
    horizontalSwipe: (onSwipe: SwipeHandler) => any
    longPress: (onLongPress: LongPressHandler) => any
  }
}
```

#### Gesture Integration Points
- Wrap `GameModeView.tsx` main container with `PullToRefreshWrapper`
- Add horizontal swipe to `ActionPatternCarousel.tsx`
- Long-press on pattern cards for details expansion

#### Performance Requirements
```typescript
// Gesture performance targets:
- Touch response time: <16ms (60fps)
- Haptic feedback delay: <5ms
- Animation smoothness: 60fps
- Memory usage: <2MB additional for gesture handling
```

---

## Phase 5: Progressive Disclosure System

### AI Development Prompt
```
You are working on Phase 5: Progressive Disclosure System for the American Mahjong Assistant.

CONTEXT:
- Phases 1-4 completed: Full glance mode with gestures
- Current focus: Information layering and strategy modes
- Goal: Glance mode as default, expand for details when needed

TASK: Create progressive disclosure system:
1. Glance Mode as default (implemented in Phase 1)
2. Details Mode: expandable technical information
3. Strategy Mode selector: flexible/quick-win/defensive/high-score
4. Advanced Mode: full analysis view for experienced players
5. Smooth transitions between disclosure levels

FILES TO EXAMINE:
- packages/frontend/src/features/intelligence-panel/GlanceModePanel.tsx (base layer)
- packages/frontend/src/features/intelligence-panel/ActionPatternCarousel.tsx (mid layer)
- packages/frontend/src/stores/intelligence-store.ts (data source)

REQUIREMENTS:
- Default to simplest view, expand on demand
- Strategy modes persist across sessions
- Keyboard navigation through disclosure levels
- Screen reader announcements for state changes
- Mobile-first: easy thumb access to expand/collapse
```

### UI Wireframes

#### Disclosure Levels
```
GLANCE MODE (Default):
┌──────────────────────────────────────────┐
│ 🟢 Keep going with this pattern          │
│ Next: Discard 3-Dot                     │
│ [ ⋯ More details ]                      │  ← Expand trigger
└──────────────────────────────────────────┘

DETAILS MODE (Expanded):
┌──────────────────────────────────────────┐
│ 🟢 Consecutive Run - 2025                │
│ Next: Discard 3-Dot                     │
│ Need: 7-Dot, 8-Dot (2 tiles)            │
│ Est. turns: 3-5                         │
│ Flexibility: High                       │
│ [ ⌄ Collapse ]                          │
└──────────────────────────────────────────┘

STRATEGY MODE SELECTOR:
┌──────────────────────────────────────────┐
│ Strategy: [ Flexible ▼ ]                │  ← Dropdown
│ ┌─────────────────────────────────────┐ │
│ │ • Flexible (current)                │ │
│ │ • Quick Win                         │ │
│ │ • High Score                        │ │
│ │ • Defensive                         │ │
│ └─────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

### Technical Specifications

#### Progressive Disclosure Components
```typescript
// packages/frontend/src/features/intelligence-panel/DisclosureManager.tsx
type DisclosureLevel = 'glance' | 'details' | 'advanced'

interface DisclosureManagerProps {
  currentLevel: DisclosureLevel
  onLevelChange: (level: DisclosureLevel) => void
  children: React.ReactNode
}

// packages/frontend/src/components/StrategyModeSelector.tsx
type StrategyMode = 'flexible' | 'quick-win' | 'high-score' | 'defensive'

interface StrategyModeSelectorProps {
  currentMode: StrategyMode
  onModeChange: (mode: StrategyMode) => void
  gamePhase: GamePhase
}

// packages/frontend/src/hooks/useDisclosureState.ts
function useDisclosureState() {
  return {
    disclosureLevel: DisclosureLevel
    strategyMode: StrategyMode
    setDisclosureLevel: (level: DisclosureLevel) => void
    setStrategyMode: (mode: StrategyMode) => void
    isExpanded: boolean
    canExpand: boolean
  }
}
```

#### Strategy Mode Logic
```typescript
// packages/frontend/src/services/strategy/strategy-advisor.ts
interface StrategyModeConfig {
  flexible: {
    prioritizeAdaptability: true
    showMultipleOptions: true
    riskTolerance: 'medium'
  }
  quickWin: {
    prioritizeSpeed: true
    showFastestPath: true
    riskTolerance: 'high'
  }
  highScore: {
    prioritizePoints: true
    showComplexPatterns: true
    riskTolerance: 'low'
  }
  defensive: {
    prioritizeBlocking: true
    showOpponentThreats: true
    riskTolerance: 'minimal'
  }
}

function getStrategySpecificAdvice(
  mode: StrategyMode,
  analysis: HandAnalysis,
  gameState: GameState
): StrategyAdvice
```

---

## Phase 6: Polish & Performance

### AI Development Prompt
```
You are working on Phase 6: Polish & Performance for the American Mahjong Assistant Strategy Advisor.

CONTEXT:
- All core functionality completed (Phases 1-5)
- Current focus: Micro-animations, error handling, and performance optimization
- Goal: Production-ready experience with 60fps performance

TASK: Add final polish:
1. Subtle micro-animations for state changes
2. Loading states with branded animations
3. Error handling with helpful recovery options
4. Performance optimization for mobile devices
5. Accessibility polish and reduced motion support

FILES TO EXAMINE:
- All components from Phases 1-5
- packages/frontend/src/ui-components/ (design system components)
- packages/frontend/src/utils/performance.ts (if exists)

REQUIREMENTS:
- Respect prefers-reduced-motion
- 60fps on mid-range mobile devices
- Graceful degradation for slow networks
- Helpful error messages, not technical jargon
- Bundle size impact under 50KB
```

### Technical Specifications

#### Animation Components
```typescript
// packages/frontend/src/components/animations/StateTransition.tsx
interface StateTransitionProps {
  from: 'glance' | 'details' | 'advanced'
  to: 'glance' | 'details' | 'advanced'
  duration?: number
  children: React.ReactNode
}

// packages/frontend/src/components/animations/PatternSwitchAnimation.tsx
interface PatternSwitchProps {
  fromPattern: Pattern
  toPattern: Pattern
  onComplete: () => void
}

// packages/frontend/src/hooks/usePerformanceOptimization.ts
function usePerformanceOptimization() {
  return {
    defer: (fn: () => void) => void      // Defer non-critical updates
    throttle: (fn: () => void, ms: number) => void
    memoizedAnalysis: HandAnalysis       // Cache expensive calculations
  }
}
```

#### Error Handling System
```typescript
// packages/frontend/src/components/ErrorBoundary.tsx
interface ErrorRecoveryProps {
  error: Error
  onRetry: () => void
  onFallback: () => void
}

// User-friendly error messages:
const ERROR_MESSAGES = {
  analysisTimeout: "Taking longer than usual... Tap to try again",
  networkError: "Connection issues. Using last known recommendations",
  invalidGameState: "Something's not right. Pull down to refresh",
  patternSwitchFailed: "Couldn't switch patterns. Your hand is unchanged"
}
```

#### Performance Targets
- Component render time: <16ms
- Animation frame rate: 60fps
- Memory usage: <10MB total
- Bundle size increase: <50KB
- Time to interactive: <3s on 3G

---

## Implementation Validation

### Phase Completion Checklist

#### Phase 1: Glance Mode Interface ✅
- [ ] Replace PrimaryAnalysisCard with GlanceModePanel
- [ ] Implement conversational messaging
- [ ] Add urgency detection hooks
- [ ] Create message generation service
- [ ] Update intelligence store
- [ ] Add comprehensive error handling
- [ ] Write unit tests for all components

#### Phase 2: Context-Aware Urgency ⏳
- [ ] Implement game phase detection
- [ ] Create adaptive UI components
- [ ] Add urgency-based visual themes
- [ ] Update UX for emergency mode
- [ ] Test urgency transitions
- [ ] Validate accessibility in all urgency states

#### Phase 3: Action-First Navigation ⏳
- [ ] Create ActionPatternCarousel
- [ ] Implement pattern priority system
- [ ] Add one-tap pattern switching
- [ ] Create swipe navigation
- [ ] Add haptic feedback
- [ ] Test on various mobile devices

#### Phase 4: Mobile Gestures ⏳
- [ ] Implement pull-to-refresh
- [ ] Add gesture conflict detection
- [ ] Create haptic feedback system
- [ ] Test gesture performance
- [ ] Validate accessibility fallbacks

#### Phase 5: Progressive Disclosure ⏳
- [ ] Create disclosure level management
- [ ] Implement strategy mode selector
- [ ] Add smooth state transitions
- [ ] Test information hierarchy
- [ ] Validate keyboard navigation

#### Phase 6: Polish & Performance ⏳
- [ ] Add micro-animations
- [ ] Implement error recovery
- [ ] Performance optimization
- [ ] Bundle size analysis
- [ ] Accessibility audit

### Success Metrics

#### User Experience Targets
- **Decision Time**: Under 30 seconds for pattern choices
- **Glance Understanding**: 1-second comprehension rate >90%
- **Mobile Usability**: SUS score >75
- **Error Recovery**: <3 taps to recover from any error state

#### Technical Performance Targets
- **60fps**: All animations and transitions
- **<16ms**: Component render times
- **<50KB**: Bundle size impact
- **<3s**: Time to interactive on 3G

#### Accessibility Compliance
- **WCAG 2.1 AA**: Full compliance
- **Screen Reader**: Complete navigation support
- **Keyboard Navigation**: All interactions accessible
- **Reduced Motion**: Respected in all states

### Migration Strategy

1. **Feature Flag Rollout**: Deploy behind feature flag
2. **Progressive Testing**: Enable for 10% → 50% → 100% users
3. **A/B Testing**: Compare new vs old interface metrics
4. **Gradual Cutover**: Maintain fallback to old system
5. **Legacy Cleanup**: Remove old components after validation

This implementation plan prioritizes UX improvements while maintaining technical rigor and provides clear guidance for multi-context implementation.