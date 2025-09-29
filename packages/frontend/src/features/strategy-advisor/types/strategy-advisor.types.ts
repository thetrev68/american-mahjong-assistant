// Strategy Advisor Types - Core type definitions for the Strategy Advisor feature
// Standard ES module exports for type safety and clean organization

// Core urgency levels for strategy guidance
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical'

// Game phase for context-aware urgency calculation
export type GamePhase = 'early' | 'mid' | 'late' | 'defensive' | 'endgame'

// Decision urgency factors for adaptive UI
export interface UrgencyFactors {
  turnPressure: number // 0-1 based on turn number
  wallPressure: number // 0-1 based on tiles remaining
  opponentThreat: number // 0-1 based on opponent proximity to winning
  handCompletion: number // 0-1 based on pattern completion
  timeRemaining: number // 0-1 based on time limits (if applicable)
}

// Urgency detection context
export interface UrgencyContext {
  gamePhase: GamePhase
  urgencyLevel: UrgencyLevel
  urgencyScore: number // 0-100 overall urgency
  factors: UrgencyFactors
  isEmergencyMode: boolean // Critical defensive situations
  recommendedUITreatment: UrgencyUITreatment
}

// Visual treatment recommendations based on urgency
export interface UrgencyUITreatment {
  colorScheme: 'calm' | 'moderate' | 'urgent' | 'emergency'
  informationDensity: 'full' | 'essential' | 'minimal'
  animationIntensity: 'subtle' | 'moderate' | 'pronounced'
  messageFiltering: 'all' | 'prioritized' | 'critical-only'
  visualEmphasis: 'normal' | 'bold' | 'prominent' | 'alert'
}

// Strategy guidance categories
export type GuidanceCategory =
  | 'pattern-focus'      // Continue with current pattern
  | 'pattern-switch'     // Consider switching patterns
  | 'defensive'          // Play defensively
  | 'opportunity'        // Take advantage of opportunity
  | 'endgame'           // Endgame strategy
  | 'charleston'        // Charleston-specific guidance

// Conversational message types
export type MessageType =
  | 'encouragement'     // "Keep going with this pattern"
  | 'warning'           // "Watch out for dangerous tiles"
  | 'suggestion'        // "Consider switching patterns"
  | 'insight'           // "You're close to completion"
  | 'celebration'       // "Great progress!"

// Core strategy guidance message
export interface StrategyMessage {
    id: string
    type: MessageType
    category: GuidanceCategory
    urgency: UrgencyLevel
    title: string
    message: string
    reasoning?: string
    confidence: number // 0-100
    timestamp: number
    isActionable: boolean

    // Progressive disclosure data
    details?: {
      shortReason: string
      fullReason: string
      alternativeActions?: string[]
      riskFactors?: string[]
    }
  }

// Glance mode display configuration
export interface GlanceModeConfig {
    showConfidence: boolean
    showDetails: boolean
    autoRefresh: boolean
    refreshInterval: number // ms
    maxMessages: number
    prioritizeUrgent: boolean
  }

// Strategy advisor state
export interface StrategyAdvisorState {
    // Core data
    currentMessages: StrategyMessage[]
    isActive: boolean
    lastUpdated: number | null

    // Configuration
    config: GlanceModeConfig

    // UI state
    expandedMessageId: string | null
    isLoading: boolean
    error: string | null

    // Actions
    addMessage: (message: StrategyMessage) => void
    removeMessage: (messageId: string) => void
    clearMessages: () => void
    setExpandedMessage: (messageId: string | null) => void
    updateConfig: (config: Partial<GlanceModeConfig>) => void
    setLoading: (loading: boolean) => void
    setError: (error: string | null) => void
    setActive: (active: boolean) => void

    // Getters
    getMessagesByUrgency: (urgency: UrgencyLevel) => StrategyMessage[]
    getMessagesByCategory: (category: GuidanceCategory) => StrategyMessage[]
    getMostUrgentMessage: () => StrategyMessage | null
    getActionableMessages: () => StrategyMessage[]
  }

// Data from intelligence store (read-only)
export interface IntelligenceData {
    hasAnalysis: boolean
    isAnalyzing: boolean
    recommendedPatterns: Array<{
      pattern: {
        id: string
        section: string
        line: number
        pattern: string
        displayName: string
      }
      confidence: number
      completionPercentage: number
      difficulty: 'easy' | 'medium' | 'hard'
      reasoning: string
      isPrimary: boolean
    }>
    tileRecommendations: Array<{
      tileId: string
      action: 'keep' | 'pass' | 'discard' | 'neutral'
      confidence: number
      reasoning: string
      priority: number
    }>
    strategicAdvice: string[]
    threats: Array<{
      level: 'low' | 'medium' | 'high'
      description: string
      mitigation: string
    }>
    overallScore: number
    lastUpdated: number
  }

// Game state context for strategy generation
export interface GameContext {
    gamePhase: 'charleston' | 'playing' | 'endgame'
    turnsRemaining: number
    wallTilesRemaining: number
    playerPosition: 'east' | 'south' | 'west' | 'north'
    handSize: number
    hasDrawnTile: boolean
    exposedTilesCount: number
  }

// Strategy generation request
export interface StrategyGenerationRequest {
    intelligenceData: IntelligenceData
    gameContext: GameContext
    previousMessages: StrategyMessage[]
    urgencyThreshold: UrgencyLevel
  }

// Strategy generation response
export interface StrategyGenerationResponse {
    messages: StrategyMessage[]
    reasoning: string
    confidence: number
    shouldReplace: boolean // Replace all messages vs. add to existing
  }

// Hook interface for useStrategyAdvisor
export interface StrategyAdvisorHook {
    // State
    messages: StrategyMessage[]
    isActive: boolean
    isLoading: boolean
    error: string | null
    config: GlanceModeConfig
    expandedMessageId: string | null

    // Primary actions
    refresh: () => Promise<void>
    activate: () => void
    deactivate: () => void

    // Message management
    expandMessage: (messageId: string) => void
    collapseMessage: () => void
    dismissMessage: (messageId: string) => void

    // Configuration
    updateConfig: (config: Partial<GlanceModeConfig>) => void

    // Getters
    mostUrgentMessage: StrategyMessage | null
    actionableMessages: StrategyMessage[]
    hasNewInsights: boolean
  }

// Component props interfaces
export interface GlanceModePanelProps {
    className?: string
    onMessageExpand?: (messageId: string) => void
    onConfigChange?: (config: Partial<GlanceModeConfig>) => void
  }

export interface StrategyMessageCardProps {
    message: StrategyMessage
    isExpanded: boolean
    onExpand: () => void
    onCollapse: () => void
    onDismiss: () => void
    showConfidence: boolean
  }

// === PHASE 3: ACTION-FIRST PATTERN NAVIGATION TYPES ===

// Traffic light priority system for patterns
export type PatternPriority = 'pursue' | 'backup' | 'risky' | 'dead'

// Pattern priority details with action-first messaging
export interface PatternPriorityInfo {
  priority: PatternPriority
  urgencyLevel: UrgencyLevel
  completionPercentage: number
  actionMessage: string
  needsList: string[]
  riskFactors: string[]
  confidence: number
}

// Swipe navigation state
export interface SwipeGestureState {
  isDragging: boolean
  startX: number
  currentX: number
  deltaX: number
  velocity: number
  direction: 'left' | 'right' | null
}

// Carousel navigation state
export interface CarouselState {
  currentIndex: number
  totalPatterns: number
  isAnimating: boolean
  canSwipeLeft: boolean
  canSwipeRight: boolean
  snapToIndex: (index: number) => void
  nextPattern: () => void
  previousPattern: () => void
}

// Pattern switching preview data
export interface PatternSwitchPreview {
  fromPattern: {
    id: string
    name: string
    priority: PatternPriority
    completionPercentage: number
  }
  toPattern: {
    id: string
    name: string
    priority: PatternPriority
    expectedCompletion: number
  }
  impactAnalysis: {
    probabilityChange: number
    riskChange: number
    tilesNeededChange: number
    timeToCompletionChange: number
  }
  recommendation: 'strongly_recommend' | 'recommend' | 'neutral' | 'caution' | 'avoid'
  reasoning: string
}

// Haptic feedback patterns
export type HapticPattern =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error'
  | 'selection'

// Enhanced pattern data for action-first interface
export interface ActionPatternData {
  id: string
  patternId: string
  name: string
  section: string
  line: number
  pattern: string
  points: number
  difficulty: 'easy' | 'medium' | 'hard'

  // Action-first priority information
  priorityInfo: PatternPriorityInfo

  // Quick action data
  actionNeeded: string
  tilesNeeded: string[]
  estimatedTurns: number

  // Visual data
  displayGroups: Array<{
    tiles: string
    color: string
    completed: boolean
  }>
}

// Action Pattern Carousel Props
export interface ActionPatternCarouselProps {
  patterns: ActionPatternData[]
  currentPatternId?: string
  onPatternSwitch: (patternId: string) => Promise<void>
  onPatternPreview: (patternId: string) => void
  urgencyLevel: UrgencyLevel
  showPreviewModal?: boolean
  enableHapticFeedback?: boolean
  className?: string
}

// Pattern Priority Indicator Props
export interface PatternPriorityIndicatorProps {
  priority: PatternPriority
  completionPercentage: number
  urgencyLevel: UrgencyLevel
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  animated?: boolean
  className?: string
}

// Pattern Preview Modal Props
export interface PatternPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  previewData: PatternSwitchPreview | null
  onConfirmSwitch: () => Promise<void>
  onCancel: () => void
  className?: string
}

// Carousel swipe hook return interface
export interface UseCarouselSwipe {
  // Gesture state
  swipeState: SwipeGestureState
  carouselState: CarouselState

  // Event handlers
  onTouchStart: (event: React.TouchEvent) => void
  onTouchMove: (event: React.TouchEvent) => void
  onTouchEnd: (event: React.TouchEvent) => void
  onMouseDown: (event: React.MouseEvent) => void
  onMouseMove: (event: React.MouseEvent) => void
  onMouseUp: (event: React.MouseEvent) => void

  // Keyboard navigation
  onKeyDown: (event: React.KeyboardEvent) => void

  // Manual control
  goToPattern: (index: number) => void
  nextPattern: () => void
  previousPattern: () => void
}

// Pattern switching hook return interface
export interface UsePatternSwitching {
  // Current state
  currentPatternId: string | null
  isLoading: boolean
  error: string | null

  // Preview state
  previewData: PatternSwitchPreview | null
  isPreviewOpen: boolean

  // Actions
  switchToPattern: (patternId: string) => Promise<void>
  generatePreview: (patternId: string) => Promise<PatternSwitchPreview>
  openPreview: (patternId: string) => void
  closePreview: () => void
  confirmSwitch: () => Promise<void>

  // Quick actions
  canSwitchToPattern: (patternId: string) => boolean
  getBestPatternRecommendation: () => string | null
}

// Haptic feedback hook return interface
export interface UseHapticFeedback {
  // Capability detection
  isSupported: boolean

  // Feedback methods
  triggerFeedback: (pattern: HapticPattern) => void
  triggerLightFeedback: () => void
  triggerMediumFeedback: () => void
  triggerHeavyFeedback: () => void
  triggerSuccessFeedback: () => void
  triggerWarningFeedback: () => void
  triggerErrorFeedback: () => void
  triggerSelectionFeedback: () => void

  // Settings
  isEnabled: boolean
  setEnabled: (enabled: boolean) => void
}

// === PHASE 4: MOBILE-OPTIMIZED GESTURES TYPES ===

// Pull-to-refresh gesture state
export interface PullToRefreshState {
  isPulling: boolean
  pullDistance: number
  pullProgress: number // 0-1 based on threshold
  threshold: number
  isReady: boolean
  isRefreshing: boolean
  maxDistance: number
}

// Pull-to-refresh configuration
export interface PullToRefreshConfig {
  threshold: number // px to trigger refresh
  maxDistance: number // max pull distance
  enableHaptics: boolean
  enableAnimation: boolean
  sensitivity: number // 0.5-2.0 gesture sensitivity multiplier
  resistanceAfterThreshold: number // 0-1 resistance when past threshold
}

// Long-press gesture state
export interface LongPressState {
  isPressed: boolean
  startTime: number
  currentTime: number
  progress: number // 0-1 based on duration thresholds
  stage: 'none' | 'hint' | 'details' | 'holding'
  position: { x: number; y: number }
}

// Long-press configuration
export interface LongPressConfig {
  hintThreshold: number // ms for initial hint
  detailsThreshold: number // ms for full details
  enableHaptics: boolean
  enableVisualFeedback: boolean
  cancelOnMove: boolean
  maxMoveDistance: number // px before canceling
}

// Gesture conflict detection state
export interface GestureConflictState {
  activeTileInteraction: boolean
  activeSwipeGesture: boolean
  activePullToRefresh: boolean
  activeLongPress: boolean
  conflictZones: DOMRect[]
  allowedGestures: Set<string>
}

// Orientation state for gesture adaptation
export interface OrientationState {
  orientation: 'portrait' | 'landscape'
  isTransitioning: boolean
  previousOrientation: 'portrait' | 'landscape' | null
  dimensions: {
    width: number
    height: number
    aspectRatio: number
  }
}

// Performance metrics for gesture optimization
export interface GesturePerformanceMetrics {
  frameRate: number
  gestureResponseTime: number
  memoryUsage: number
  cpuUsage: number
  lastMeasurement: number
  averageResponseTime: number
  missedFrames: number
}

// Gesture coordination event types
export type GestureEventType =
  | 'tile-interaction-start'
  | 'tile-interaction-end'
  | 'swipe-start'
  | 'swipe-end'
  | 'pull-to-refresh-start'
  | 'pull-to-refresh-end'
  | 'long-press-start'
  | 'long-press-end'
  | 'gesture-conflict'
  | 'gesture-resolved'

// Gesture coordination event
export interface GestureEvent {
  type: GestureEventType
  gestureId: string
  timestamp: number
  element?: HTMLElement
  position?: { x: number; y: number }
  data?: unknown
}

// Pull-to-refresh hook interface
export interface UsePullToRefresh {
  // State
  state: PullToRefreshState
  config: PullToRefreshConfig

  // Event handlers
  onTouchStart: (event: React.TouchEvent) => void
  onTouchMove: (event: React.TouchEvent) => void
  onTouchEnd: (event: React.TouchEvent) => void
  onMouseDown: (event: React.MouseEvent) => void
  onMouseMove: (event: React.MouseEvent) => void
  onMouseUp: (event: React.MouseEvent) => void

  // Actions
  triggerRefresh: () => Promise<void>
  cancelRefresh: () => void
  updateConfig: (config: Partial<PullToRefreshConfig>) => void

  // Visual state helpers
  getVisualState: () => {
    message: string
    icon: string
    progress: number
    isAnimating: boolean
  }
}

// Long-press hook interface
export interface UseLongPress {
  // State
  state: LongPressState
  config: LongPressConfig

  // Event handlers
  onPointerDown: (event: React.PointerEvent) => void
  onPointerMove: (event: React.PointerEvent) => void
  onPointerUp: (event: React.PointerEvent) => void
  onPointerCancel: (event: React.PointerEvent) => void

  // Actions
  cancel: () => void
  updateConfig: (config: Partial<LongPressConfig>) => void

  // Callbacks registration
  onHint: (callback: () => void) => void
  onDetails: (callback: () => void) => void
  onCancel: (callback: () => void) => void
}

// Gesture conflict avoidance hook interface
export interface UseGestureConflictAvoidance {
  // State
  conflictState: GestureConflictState

  // Registration
  registerGesture: (gestureId: string, element?: HTMLElement) => void
  unregisterGesture: (gestureId: string) => void
  registerConflictZone: (zone: DOMRect, zoneId: string) => void
  unregisterConflictZone: (zoneId: string) => void

  // Conflict detection
  canActivateGesture: (gestureId: string, position?: { x: number; y: number }) => boolean
  isInConflictZone: (position: { x: number; y: number }) => boolean
  hasActiveConflicts: () => boolean

  // Event handling
  notifyGestureStart: (gestureId: string, element?: HTMLElement) => void
  notifyGestureEnd: (gestureId: string) => void
}

// Orientation-aware gestures hook interface
export interface UseOrientationAwareGestures {
  // State
  orientation: OrientationState

  // Adaptive configuration
  getAdaptiveConfig: <T>(portraitConfig: T, landscapeConfig: T) => T
  getOrientationMultiplier: (baseValue: number, landscapeMultiplier?: number) => number

  // Event handling
  onOrientationChange: (callback: (orientation: OrientationState) => void) => void
  onTransitionComplete: (callback: () => void) => void

  // Gesture zone calculations
  getSafeGestureZones: () => DOMRect[]
  getThumbReachableArea: () => DOMRect[]
}

// Gesture performance utilities interface
export interface GesturePerformanceUtils {
  // Monitoring
  startPerformanceMonitoring: () => void
  stopPerformanceMonitoring: () => void
  getMetrics: () => GesturePerformanceMetrics

  // Optimization
  throttleGesture: <T extends unknown[]>(
    fn: (...args: T) => void,
    ms: number
  ) => (...args: T) => void
  debounceGesture: <T extends unknown[]>(
    fn: (...args: T) => void,
    ms: number
  ) => (...args: T) => void
  optimizeForFrameRate: <T extends unknown[]>(
    fn: (...args: T) => void
  ) => (...args: T) => void

  // Memory management
  cleanupGestureListeners: (element: HTMLElement) => void
  batchGestureUpdates: (updates: (() => void)[]) => void
}

// Gesture coordinator service interface
export interface GestureCoordinator {
  // Event system
  addEventListener: (
    type: GestureEventType,
    listener: (event: GestureEvent) => void
  ) => void
  removeEventListener: (
    type: GestureEventType,
    listener: (event: GestureEvent) => void
  ) => void
  dispatchEvent: (event: GestureEvent) => void

  // Gesture management
  registerGesture: (
    gestureId: string,
    config: {
      priority: number
      conflictsWith?: string[]
      element?: HTMLElement
    }
  ) => void
  unregisterGesture: (gestureId: string) => void

  // Conflict resolution
  resolveConflict: (gestureIds: string[]) => string | null
  setGesturePriority: (gestureId: string, priority: number) => void

  // Global state
  getActiveGestures: () => string[]
  isGestureAllowed: (gestureId: string) => boolean
  pauseAllGestures: () => void
  resumeAllGestures: () => void
}

// Component props for new gesture components
export interface PullToRefreshWrapperProps {
  children: React.ReactNode
  onRefresh: () => Promise<void>
  config?: Partial<PullToRefreshConfig>
  className?: string
  disabled?: boolean
}

export interface LongPressPatternDetailsProps {
  patternId: string
  isVisible: boolean
  onShow: () => void
  onHide: () => void
  children: React.ReactNode
  className?: string
}