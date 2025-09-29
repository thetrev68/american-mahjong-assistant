// Glance Mode Panel - Main Strategy Advisor UI component
// Shows conversational guidance with progressive disclosure and urgency-aware styling

import React, { useMemo, useEffect, useCallback } from 'react'
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
  IntelligenceData,
  GameContext
} from '../types/strategy-advisor.types'

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
      variant="elevated"
      className={`
        p-3 border-l-4
        ${cardStyles}
        ${emergencyStyles}
        ${transitionStyles}
        ${urgencyAware ? urgencyClasses.animation : 'transition-all duration-200'}
      `}
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
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 text-sm"
            aria-label="Dismiss message"
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
                onClick={onExpand}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Why? • {message.details.shortReason}
              </button>
            )}

            {isExpanded && (
              <div className="space-y-3 pt-2 border-t border-gray-200">
                <button
                  onClick={onCollapse}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
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
  // Connect to Strategy Advisor hook
  const {
    messages,
    isLoading,
    error,
    config,
    expandedMessageId,
    expandMessage,
    updateConfig
  } = useStrategyAdvisor()

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

  // Adapt disclosure levels based on urgency
  useEffect(() => {
    const allowedLevels = urgencyLevel === 'critical' ? ['glance'] :
                         urgencyLevel === 'high' ? ['glance', 'details'] :
                         ['glance', 'details', 'advanced']

    setAllowedDisclosureLevels(allowedLevels)
  }, [urgencyLevel, setAllowedDisclosureLevels])

  // Generate disclosure content from intelligence data
  const disclosureContent = useMemo((): DisclosureContent | null => {
    if (!currentAnalysis || !currentAnalysis.hasAnalysis) return null

    // Build intelligence data structure
    const intelligenceData: IntelligenceData = {
      hasAnalysis: currentAnalysis.hasAnalysis,
      isAnalyzing: currentAnalysis.isAnalyzing,
      recommendedPatterns: currentAnalysis.recommendedPatterns || [],
      tileRecommendations: currentAnalysis.tileRecommendations || [],
      strategicAdvice: currentAnalysis.strategicAdvice || [],
      threats: currentAnalysis.threats || [],
      overallScore: currentAnalysis.overallScore || 0,
      lastUpdated: currentAnalysis.lastUpdated || Date.now()
    }

    // Build game context
    const gameContext: GameContext = {
      gamePhase: gamePhase === 'charleston' ? 'charleston' :
                 gamePhase === 'endgame' ? 'endgame' : 'playing',
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
    return messages.filter(message => shouldShowMessage(message.urgency, uiTreatment))
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

  if (error) {
    return (
      <Card variant="elevated" className={`p-4 ${className}`}>
        <div className="text-center text-red-600">
          <div className="text-lg mb-2">⚠️</div>
          <p className="text-sm">Strategy guidance unavailable</p>
          <p className="text-xs text-gray-500 mt-1">{error}</p>
        </div>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card variant="elevated" className={`p-4 ${className}`}>
        <div className="text-center text-gray-500">
          <div className="text-lg mb-2">🤔</div>
          <p className="text-sm">Analyzing strategy...</p>
          <div className="mt-2">
            <div className="animate-pulse bg-gray-200 h-2 rounded w-3/4 mx-auto"></div>
          </div>
        </div>
      </Card>
    )
  }

  if (filteredMessages.length === 0) {
    return (
      <div className={`space-y-3 ${className}`}>
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
      <div className={`space-y-3 ${className}`}>
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
    )
  }

  // Fallback to legacy interface when no disclosure content is available
  return (
    <div className={`space-y-3 ${className}`}>
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
  )
}