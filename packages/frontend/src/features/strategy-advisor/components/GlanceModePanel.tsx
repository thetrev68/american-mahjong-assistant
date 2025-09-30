// Glance Mode Panel - Main Strategy Advisor UI component
// Shows conversational guidance with progressive disclosure and urgency-aware styling

import React, { useMemo, useEffect, useCallback, useRef, useState } from 'react'
import { Card } from '../../../ui-components/Card'
import { useStrategyAdvisor } from '../hooks/useStrategyAdvisor'
import { useUrgencyDetection } from '../hooks/useUrgencyDetection'
import { useIntelligenceStore } from '../../../stores/intelligence-store'
import { useGameStore } from '../../../stores/game-store'
import { UrgencyIndicator } from './UrgencyIndicator'
import { DisclosureManager } from './DisclosureManager'
import { strategyModeService } from '../services/strategy-mode.service'
import { useStrategyAdvisorStore, strategyAdvisorSelectors } from '../stores/strategy-advisor.store'
import {
  getUrgencyClasses,
  shouldShowMessage,
  adaptMessageContent,
  prefersReducedMotion,
  type MessageContent
} from '../utils/urgency-themes'
import type {
  StrategyMessage,
  MessageType,
  UrgencyLevel,
  GlanceModeConfig,
  GlanceModePanelProps,
  DisclosureContent,
  DisclosureLevel,
  IntelligenceData,
  GameContext
} from '../types/strategy-advisor.types'

// Enhanced imports for Phase 6
import { ErrorBoundary } from './ErrorBoundary'
import { withErrorBoundary } from '../utils'
import { LoadingStates } from './LoadingStates'
import { SkeletonLoader } from './SkeletonLoader'
import { useMicroAnimations } from '../utils/micro-animations'
import { useErrorRecovery } from '../hooks/useErrorRecovery'
import { usePerformanceMonitoring } from '../hooks/usePerformanceMonitoring'
import { useMemoryOptimization } from '../hooks/useMemoryOptimization'
import { useErrorReporting } from '../services/error-reporting.service'

interface StrategyMessageCardProps {
  message: StrategyMessage
  isExpanded: boolean
  onExpand: () => void
  onCollapse: () => void
  onDismiss: () => void
  showConfidence: boolean
  urgencyAware?: boolean
}

const StrategyMessageCard: React.FC<StrategyMessageCardProps> = ({
  message,
  isExpanded,
  onExpand,
  onCollapse,
  onDismiss,
  showConfidence,
  urgencyAware = true
}) => {
  // Get urgency context for adaptive styling
  const {
    uiTreatment,
    isEmergencyMode,
    isTransitioning
  } = useUrgencyDetection()

  // Respect user motion preferences
  const reduceMotion = prefersReducedMotion()

  // Enhanced features for Phase 6
  const cardRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isInteracting, setIsInteracting] = useState(false)
  const { startAnimation, stopAnimation } = useMicroAnimations()
  const { reportError } = useErrorReporting({
    component: 'StrategyMessageCard',
    feature: 'strategy-advisor',
    action: 'display_message'
  })

  // Get urgency-aware styling
  const urgencyClasses = useMemo(() => {
    if (!urgencyAware) {
      return {
        container: '',
        text: '',
        animation: '',
        hover: ''
      }
    }

    return getUrgencyClasses(uiTreatment, {
      respectReducedMotion: reduceMotion,
      includeHover: true,
      includeAnimations: !reduceMotion
    })
  }, [urgencyAware, uiTreatment, reduceMotion])

  // Adapt message content based on urgency
  const adaptedContent = useMemo((): MessageContent => {
    const originalContent: MessageContent = {
      title: message.title,
      message: message.message,
      showDetails: true,
      showConfidence,
      showActions: true
    }

    if (!urgencyAware) {
      return originalContent
    }

    return adaptMessageContent(originalContent, uiTreatment)
  }, [message.title, message.message, showConfidence, urgencyAware, uiTreatment])

  // Legacy urgency styling for fallback
  const getLegacyUrgencyStyles = (urgency: UrgencyLevel) => {
    switch (urgency) {
      case 'critical':
        return 'border-red-500 bg-red-50'
      case 'high':
        return 'border-orange-500 bg-orange-50'
      case 'medium':
        return 'border-blue-500 bg-blue-50'
      case 'low':
        return 'border-gray-300 bg-gray-50'
      default:
        return 'border-gray-300 bg-gray-50'
    }
  }

  // Choose styling approach
  const cardStyles = urgencyAware
    ? urgencyClasses.container
    : getLegacyUrgencyStyles(message.urgency)

  // Emergency mode enhancements
  const emergencyStyles = urgencyAware && isEmergencyMode
    ? 'ring-2 ring-red-500 ring-opacity-75'
    : ''

  // Transition effects
  const transitionStyles = urgencyAware && isTransitioning && !reduceMotion
    ? 'transform transition-all duration-300 ease-out'
    : ''

  // Entrance animation on mount
  useEffect(() => {
    if (cardRef.current && !reduceMotion) {
      startAnimation('card-entrance', cardRef.current, 'slideIn', 'up', 20, {
        duration: 300,
        delay: 50,
        onComplete: () => setIsVisible(true)
      })
    } else {
      setIsVisible(true)
    }
  }, [startAnimation, reduceMotion])

  // Handle user interactions with micro-animations
  const handleMouseEnter = useCallback(() => {
    if (cardRef.current && !reduceMotion && !isInteracting) {
      startAnimation('card-hover', cardRef.current, 'touchFeedback')
    }
  }, [startAnimation, reduceMotion, isInteracting])

  const handleMouseLeave = useCallback(() => {
    if (!isInteracting) {
      stopAnimation('card-hover')
    }
  }, [stopAnimation, isInteracting])

  const handleClick = useCallback((action: 'expand' | 'collapse' | 'dismiss') => {
    try {
      setIsInteracting(true)

      if (cardRef.current && !reduceMotion) {
        startAnimation('card-click', cardRef.current, 'touchFeedback', {
          onComplete: () => {
            setIsInteracting(false)
            // Execute the actual action after animation
            switch (action) {
              case 'expand':
                onExpand()
                break
              case 'collapse':
                onCollapse()
                break
              case 'dismiss':
                onDismiss()
                break
            }
          }
        })
      } else {
        // Execute immediately if reduced motion
        setIsInteracting(false)
        switch (action) {
          case 'expand':
            onExpand()
            break
          case 'collapse':
            onCollapse()
            break
          case 'dismiss':
            onDismiss()
            break
        }
      }
    } catch (error) {
      reportError(error instanceof Error ? error : new Error(String(error)), {
        action: `message_${action}`,
        state: { messageId: message.id, messageType: message.type }
      })
      setIsInteracting(false)
    }
  }, [startAnimation, reduceMotion, onExpand, onCollapse, onDismiss, message.id, message.type, reportError])

  // Get message type emoji
  const getMessageEmoji = (type: MessageType) => {
    switch (type) {
      case 'encouragement':
        return '💪'
      case 'warning':
        return '⚠️'
      case 'suggestion':
        return '💡'
      case 'insight':
        return '🔍'
      case 'celebration':
        return '🎉'
      default:
        return '📋'
    }
  }

  return (
    <Card
      ref={cardRef}
      variant="elevated"
      className={`
        p-3 border-l-4 cursor-pointer
        ${cardStyles}
        ${emergencyStyles}
        ${transitionStyles}
        ${urgencyAware ? urgencyClasses.animation : 'transition-all duration-200'}
        ${!isVisible ? 'opacity-0' : 'opacity-100'}
        ${isInteracting ? 'pointer-events-none' : ''}
      `}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getMessageEmoji(message.type)}</span>
            <div>
              <h4 className={`
                font-semibold text-sm
                ${urgencyAware ? urgencyClasses.text : 'text-gray-900'}
              `}>
                {adaptedContent.title}
              </h4>
              {adaptedContent.showConfidence && (
                <div className="text-xs text-gray-500">
                  {message.confidence}% confidence
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => handleClick('dismiss')}
            className="text-gray-400 hover:text-gray-600 text-sm transition-colors duration-200"
            aria-label="Dismiss message"
            disabled={isInteracting}
          >
            ✕
          </button>
        </div>

        {/* Main Message */}
        <p className={`
          text-sm leading-relaxed
          ${urgencyAware ? urgencyClasses.text : 'text-gray-700'}
        `}>
          {adaptedContent.message}
        </p>

        {/* Progressive Disclosure */}
        {message.details && adaptedContent.showDetails && (
          <div className="space-y-2">
            {!isExpanded && (
              <button
                onClick={() => handleClick('expand')}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
                disabled={isInteracting}
              >
                Why? • {message.details.shortReason}
              </button>
            )}

            {isExpanded && (
              <div className="space-y-3 pt-2 border-t border-gray-200">
                <button
                  onClick={() => handleClick('collapse')}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
                  disabled={isInteracting}
                >
                  Hide details ↑
                </button>

                {/* Full reasoning */}
                <div className="bg-white rounded p-2 text-xs">
                  <div className="font-medium text-gray-700 mb-1">Detailed Analysis:</div>
                  <p className="text-gray-600 leading-relaxed">
                    {message.details.fullReason}
                  </p>
                </div>

                {/* Alternative actions */}
                {message.details.alternativeActions && message.details.alternativeActions.length > 0 && (
                  <div className="bg-white rounded p-2 text-xs">
                    <div className="font-medium text-gray-700 mb-1">Options:</div>
                    <ul className="text-gray-600 space-y-1">
                      {message.details.alternativeActions.map((action: string, index: number) => (
                        <li key={index} className="flex items-start">
                          <span className="text-blue-500 mr-1">•</span>
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Risk factors */}
                {message.details.riskFactors && message.details.riskFactors.length > 0 && (
                  <div className="bg-yellow-50 rounded p-2 text-xs">
                    <div className="font-medium text-yellow-800 mb-1">Consider:</div>
                    <ul className="text-yellow-700 space-y-1">
                      {message.details.riskFactors.map((risk: string, index: number) => (
                        <li key={index} className="flex items-start">
                          <span className="text-yellow-600 mr-1">⚠</span>
                          {risk}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actionable indicator */}
        {message.isActionable && (
          <div className="flex items-center space-x-1 pt-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-xs text-green-600 font-medium">Actionable</span>
          </div>
        )}
      </div>
    </Card>
  )
}


export const GlanceModePanel: React.FC<GlanceModePanelProps> = ({
  className = '',
  onMessageExpand,
  onConfigChange
}) => {
  // Phase 6 enhancements
  const panelRef = useRef<HTMLDivElement>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const { startAnimation } = useMicroAnimations()

  // Performance monitoring
  const { metrics, isOptimizing } = usePerformanceMonitoring({
    componentName: 'GlanceModePanel',
    enableMemoryTracking: true,
    enableRenderTracking: true
  })

  // Memory optimization
  const { optimizeMemory, addCleanupTask } = useMemoryOptimization({
    enableAutoCleanup: true,
    maxCacheSize: 20
  })

  // Error recovery
  const { errorState, recover } = useErrorRecovery({
    maxRetries: 2,
    enableDegradedMode: true
  })

  // Error reporting
  const { reportError, addBreadcrumb } = useErrorReporting({
    component: 'GlanceModePanel',
    feature: 'strategy-advisor',
    action: 'panel_render'
  })

  // Connect to Strategy Advisor hook (hooks must be called at the top level)
  const strategyHookResult = useStrategyAdvisor()

  const {
    messages,
    isLoading,
    error,
    config,
    expandedMessageId,
    expandMessage,
    updateConfig
  } = strategyHookResult

  // Removed problematic useEffect that was causing infinite re-renders
  // The effect ran on every strategyHookResult change (which is every render)
  // causing the mount/unmount cycle

  // Get urgency context for adaptive behavior
  const {
    uiTreatment,
    isEmergencyMode,
    urgencyLevel
  } = useUrgencyDetection()

  // Get intelligence and game data for disclosure content
  const currentAnalysis = useIntelligenceStore(state => state.currentAnalysis)
  const gamePhase = useGameStore(state => state.gamePhase)
  const currentTurn = useGameStore(state => state.currentTurn)
  const wallTilesRemaining = useGameStore(state => state.wallTilesRemaining)

  // Get disclosure and strategy mode state from store
  const currentStrategyMode = useStrategyAdvisorStore(strategyAdvisorSelectors.currentStrategyMode)
  const setDisclosureLevel = useStrategyAdvisorStore(state => state.setDisclosureLevel)
  const setStrategyMode = useStrategyAdvisorStore(state => state.setStrategyMode)
  const setAllowedDisclosureLevels = useStrategyAdvisorStore(state => state.setAllowedDisclosureLevels)

  // Respect user motion preferences
  const reduceMotion = prefersReducedMotion()

  // Component initialization with entrance animation
  useEffect(() => {
    if (panelRef.current && !isInitialized && !reduceMotion) {
      startAnimation('panel-entrance', panelRef.current, 'fadeScale', 'in', 0.98, {
        duration: 400,
        delay: 100,
        onComplete: () => setIsInitialized(true)
      })
    } else {
      setIsInitialized(true)
    }

    // Add memory cleanup task
    const cleanupId = addCleanupTask({
      cleanup: () => {
        // Clean up component-specific data
        console.log('[GlanceModePanel] Component cleanup executed')
      },
      priority: 2,
      description: 'GlanceModePanel component cleanup',
      automated: true
    })

    // Add breadcrumb for component mount
    addBreadcrumb({
      type: 'user',
      category: 'component',
      message: 'GlanceModePanel mounted',
      level: 'info',
      data: { urgencyLevel, messagesCount: messages.length }
    })

    return () => {
      // Cleanup on unmount
      if (cleanupId) {
        // removeCleanupTask would be called here if available
      }
    }
  }, [panelRef, isInitialized, reduceMotion, startAnimation, addCleanupTask, addBreadcrumb, urgencyLevel, messages.length])

  // Adapt disclosure levels based on urgency
  useEffect(() => {
    try {
      const allowedLevels: DisclosureLevel[] = urgencyLevel === 'critical' ? ['glance'] :
                           urgencyLevel === 'high' ? ['glance', 'details'] :
                           ['glance', 'details', 'advanced']

      setAllowedDisclosureLevels(allowedLevels)

      // Add breadcrumb for urgency changes
      addBreadcrumb({
        type: 'user',
        category: 'urgency',
        message: `Urgency level changed to ${urgencyLevel}`,
        level: urgencyLevel === 'critical' ? 'error' : urgencyLevel === 'high' ? 'warning' : 'info',
        data: { allowedLevels }
      })
    } catch (error) {
      reportError(error instanceof Error ? error : new Error(String(error)), {
        action: 'urgency_adaptation',
        state: { urgencyLevel }
      })
    }
  }, [urgencyLevel, setAllowedDisclosureLevels, addBreadcrumb, reportError])

  // Performance optimization when memory pressure is high
  useEffect(() => {
    if (metrics.memoryUsage > 80) { // 80MB threshold
      console.log('[GlanceModePanel] High memory usage detected, optimizing...')
      optimizeMemory()
    }
  }, [metrics.memoryUsage, optimizeMemory])

  // Generate disclosure content from intelligence data
  const disclosureContent = useMemo((): DisclosureContent | null => {
    if (!currentAnalysis) return null

    // Check if we have valid analysis data
    const hasAnalysis = currentAnalysis.recommendedPatterns?.length > 0 ||
                       currentAnalysis.bestPatterns?.length > 0 ||
                       currentAnalysis.tileRecommendations?.length > 0

    if (!hasAnalysis) return null

    // Build intelligence data structure
    const intelligenceData: IntelligenceData = {
      hasAnalysis,
      isAnalyzing: false, // We'll derive this from store state if needed
      recommendedPatterns: (currentAnalysis.recommendedPatterns || []).map(rec => ({
        pattern: {
          id: rec.pattern.id,
          section: String(rec.pattern.section), // Convert to string
          line: rec.pattern.line,
          pattern: rec.pattern.pattern,
          displayName: rec.pattern.displayName
        },
        confidence: rec.confidence,
        completionPercentage: rec.completionPercentage,
        difficulty: rec.difficulty,
        reasoning: rec.reasoning,
        isPrimary: rec.isPrimary
      })),
      tileRecommendations: currentAnalysis.tileRecommendations || [],
      strategicAdvice: currentAnalysis.strategicAdvice || [],
      threats: currentAnalysis.threats || [],
      overallScore: currentAnalysis.overallScore || 0,
      lastUpdated: currentAnalysis.lastUpdated || Date.now()
    }

    // Build game context
    const gameContext: GameContext = {
      gamePhase: gamePhase === 'charleston' ? 'charleston' :
                 gamePhase === 'finished' ? 'endgame' : 'playing',
      turnsRemaining: Math.max(0, 20 - currentTurn),
      wallTilesRemaining,
      playerPosition: 'east', // Would come from actual game state
      handSize: 13, // Would come from actual hand state
      hasDrawnTile: false, // Would come from actual game state
      exposedTilesCount: 0 // Would come from actual game state
    }

    return strategyModeService.generateDisclosureContent(
      currentStrategyMode,
      intelligenceData,
      gameContext
    )
  }, [currentAnalysis, currentStrategyMode, gamePhase, currentTurn, wallTilesRemaining])

  // Filter messages based on urgency treatment
  const filteredMessages = useMemo(() => {
    return messages.filter((message: StrategyMessage) => shouldShowMessage(message.urgency, uiTreatment))
  }, [messages, uiTreatment])

  // Get urgency-aware styling for the panel
  const panelClasses = useMemo(() => {
    return getUrgencyClasses(uiTreatment, {
      respectReducedMotion: reduceMotion,
      includeHover: false,
      includeAnimations: !reduceMotion
    })
  }, [uiTreatment, reduceMotion])

  // Handle disclosure level changes
  const handleDisclosureLevelChange = useCallback((level: string) => {
    setDisclosureLevel(level as 'glance' | 'details' | 'advanced')
    onMessageExpand?.(level)
  }, [setDisclosureLevel, onMessageExpand])

  // Handle strategy mode changes
  const handleStrategyModeChange = useCallback((mode: string) => {
    setStrategyMode(mode as 'flexible' | 'quickWin' | 'defensive' | 'highScore')
  }, [setStrategyMode])

  // Handle message expansion (legacy support)
  const handleMessageExpand = (messageId: string) => {
    expandMessage(messageId)
    onMessageExpand?.(messageId)
  }

  // Handle config changes
  const handleConfigChange = (newConfig: Partial<GlanceModeConfig>) => {
    updateConfig(newConfig)
    onConfigChange?.(newConfig)
  }

  const handleCollapse = () => {
    // Note: onMessageExpand expects string, but we need to handle collapse
    // This should be updated to use proper collapse method from hook
    console.log('Collapse message')
  }

  const handleDismiss = (messageId: string) => {
    // TODO: Implement dismiss functionality in useStrategyAdvisor hook
    console.log('Dismiss message:', messageId)
  }

  // Enhanced error handling with recovery options
  if (error || errorState.hasError) {
    return (
      <ErrorBoundary
        onError={(error, _errorInfo, _errorId) => {
          reportError(error, {
            action: 'component_error',
            state: { className, messagesCount: messages.length }
          }, undefined)
        }}
        maxRetries={3}
        className={className}
      >
        <div className="space-y-3">
          <div className="text-center text-red-600 p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="text-lg mb-2">⚠️</div>
            <p className="text-sm font-medium">Strategy guidance temporarily unavailable</p>
            <p className="text-xs text-gray-600 mt-1">{error || errorState.error?.message}</p>
            {errorState.canRetry && (
              <button
                onClick={() => recover({ type: 'retry' })}
                className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </ErrorBoundary>
    )
  }

  // Enhanced loading state with skeleton loader
  if (isLoading || isOptimizing) {
    return (
      <div className={`space-y-3 ${className}`} ref={panelRef}>
        <LoadingStates
          variant="analyzing"
          compact={uiTreatment.informationDensity === 'minimal'}
          respectsReducedMotion={reduceMotion}
        />
        {messages.length > 0 && (
          <SkeletonLoader variant="message" count={2} animate={!reduceMotion} />
        )}
      </div>
    )
  }

  if (filteredMessages.length === 0) {
    return (
      <div className={`space-y-3 ${className} ${!isInitialized ? 'opacity-0' : 'opacity-100'} transition-opacity duration-400`} ref={panelRef}>
        {/* Urgency Indicator */}
        <UrgencyIndicator
          compact={true}
          showPhaseDetails={false}
          showUrgencyScore={config.showConfidence}
        />

        {/* Empty State */}
        <Card variant="elevated" className={`p-4 ${panelClasses.container}`}>
          <div className="text-center text-gray-500">
            <div className="text-lg mb-2">🧭</div>
            <p className={`text-sm font-medium ${panelClasses.text}`}>Strategy Advisor</p>
            <p className="text-xs mt-1">
              {isLoading ? "Analyzing your hand..." : "AI guidance will appear here during gameplay"}
            </p>
            {error && (
              <p className="text-xs mt-1 text-red-500">
                Error: {error}
              </p>
            )}
            {/* Emergency mode indicator */}
            {isEmergencyMode && (
              <div className="mt-2 px-2 py-1 bg-red-600 text-white text-xs font-bold rounded">
                EMERGENCY MODE ACTIVE
              </div>
            )}
          </div>
        </Card>
      </div>
    )
  }

  // If we have disclosure content, use the new DisclosureManager
  if (disclosureContent) {
    return (
      <ErrorBoundary
        onError={(error, _errorInfo, _errorId) => {
          reportError(error, {
            action: 'disclosure_content_render',
            state: { className, disclosureContentAvailable: true }
          })
        }}
        maxRetries={2}
      >
        <div className={`space-y-3 ${className} ${!isInitialized ? 'opacity-0' : 'opacity-100'} transition-opacity duration-400`} ref={panelRef}>
        {/* Urgency Indicator - Always shown */}
        <UrgencyIndicator
          compact={uiTreatment.informationDensity === 'minimal'}
          showPhaseDetails={uiTreatment.informationDensity === 'full'}
          showUrgencyScore={config.showConfidence && uiTreatment.informationDensity !== 'minimal'}
          showFactors={uiTreatment.informationDensity === 'full'}
        />

        {/* Progressive Disclosure Interface */}
        <DisclosureManager
          content={disclosureContent}
          urgencyLevel={urgencyLevel}
          strategyMode={currentStrategyMode}
          onLevelChange={handleDisclosureLevelChange}
          onModeChange={handleStrategyModeChange}
          disabled={isEmergencyMode}
        />

        {/* Legacy message cards for additional insights */}
        {filteredMessages.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">
              Additional Insights
            </div>
            {filteredMessages.slice(0, 2).map((message: StrategyMessage) => (
              <StrategyMessageCard
                key={message.id}
                message={message}
                isExpanded={expandedMessageId === message.id}
                onExpand={() => handleMessageExpand(message.id)}
                onCollapse={handleCollapse}
                onDismiss={() => handleDismiss(message.id)}
                showConfidence={config.showConfidence}
                urgencyAware={true}
              />
            ))}
          </div>
        )}
        </div>
      </ErrorBoundary>
    )
  }

  // Fallback to legacy interface when no disclosure content is available
  return (
    <ErrorBoundary
      onError={(error, _errorInfo, _errorId) => {
        reportError(error, {
          action: 'legacy_interface_render',
          state: { className, messagesCount: messages.length }
        })
      }}
      maxRetries={2}
    >
      <div className={`space-y-3 ${className} ${!isInitialized ? 'opacity-0' : 'opacity-100'} transition-opacity duration-400`} ref={panelRef}>
      {/* Urgency Indicator */}
      <UrgencyIndicator
        compact={uiTreatment.informationDensity === 'minimal'}
        showPhaseDetails={uiTreatment.informationDensity === 'full'}
        showUrgencyScore={config.showConfidence && uiTreatment.informationDensity !== 'minimal'}
        showFactors={uiTreatment.informationDensity === 'full'}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className={`
          text-sm font-semibold flex items-center
          ${panelClasses.text}
          ${isEmergencyMode ? 'animate-pulse' : ''}
        `}>
          <span className="mr-2">🧭</span>
          Strategy Advisor
          {isEmergencyMode && (
            <span className="ml-2 px-1 py-0.5 bg-red-600 text-white text-xs font-bold rounded">
              EMERGENCY
            </span>
          )}
        </h3>

        {/* Quick settings */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleConfigChange({ showConfidence: !config.showConfidence })}
            className={`text-xs px-2 py-1 rounded ${
              config.showConfidence
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            Confidence
          </button>
          <button
            onClick={() => handleConfigChange({ autoRefresh: !config.autoRefresh })}
            className={`text-xs px-2 py-1 rounded ${
              config.autoRefresh
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            Auto
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-2">
        {filteredMessages.map((message: StrategyMessage) => (
          <StrategyMessageCard
            key={message.id}
            message={message}
            isExpanded={expandedMessageId === message.id}
            onExpand={() => handleMessageExpand(message.id)}
            onCollapse={handleCollapse}
            onDismiss={() => handleDismiss(message.id)}
            showConfidence={config.showConfidence}
            urgencyAware={true}
          />
        ))}
      </div>

      {/* Footer */}
      {filteredMessages.length > 0 && (
        <div className={`
          flex items-center justify-between text-xs pt-2 border-t border-gray-200
          ${panelClasses.text || 'text-gray-500'}
        `}>
          <span>
            {filteredMessages.length} insight{filteredMessages.length !== 1 ? 's' : ''}
            {messages.length !== filteredMessages.length && (
              <span className="text-orange-600 ml-1">
                ({messages.length - filteredMessages.length} filtered)
              </span>
            )}
          </span>
          <div className="flex items-center space-x-2">
            <span>Updated just now</span>
            {urgencyLevel !== 'low' && (
              <span className={`
                px-1 py-0.5 rounded text-xs font-medium
                ${urgencyLevel === 'critical' ? 'bg-red-100 text-red-700' :
                  urgencyLevel === 'high' ? 'bg-orange-100 text-orange-700' :
                  'bg-blue-100 text-blue-700'}
              `}>
                {urgencyLevel.toUpperCase()}
              </span>
            )}
          </div>
        </div>
      )}
      </div>
    </ErrorBoundary>
  )
}

// Export enhanced component wrapped with error boundary
const GlanceModePanelWithErrorBoundary = withErrorBoundary(GlanceModePanel, {
  onError: (error, errorInfo, errorId) => {
    console.error('[GlanceModePanel] Top-level error boundary caught:', {
      error: error.message,
      errorId,
      componentStack: errorInfo.componentStack
    })
  },
  maxRetries: 1,
  showErrorDetails: process.env.NODE_ENV === 'development'
})

GlanceModePanelWithErrorBoundary.displayName = 'GlanceModePanelWithErrorBoundary'

export default GlanceModePanelWithErrorBoundary