// Strategy Advisor Types - Core type definitions for the Strategy Advisor feature
// Standard ES module exports for type safety and clean organization

// Core urgency levels for strategy guidance
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical'

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