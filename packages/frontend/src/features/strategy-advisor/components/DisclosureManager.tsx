// DisclosureManager - Central component for progressive information layering
// Orchestrates disclosure levels, strategy modes, and smooth transitions

import React, { useEffect, useCallback, useMemo } from 'react'
import { Card } from '../../../ui-components/Card'
import { useDisclosureState } from '../hooks/useDisclosureState'
import { useStrategyMode } from '../hooks/useStrategyMode'
import { useUrgencyDetection } from '../hooks/useUrgencyDetection'
import { StrategyModeSelector } from './StrategyModeSelector'
import { DetailsMode } from './DetailsMode'
import { AdvancedMode } from './AdvancedMode'
import {
  getContainerClasses,
  createTransitionCSS,
  getAccessibleTransition
} from '../utils/disclosure-transitions'
import type {
  DisclosureManagerProps,
  DisclosureLevel,
  StrategyMode
} from '../types/strategy-advisor.types'

/**
 * DisclosureManager - Central orchestrator for progressive disclosure system
 * Manages information layering with urgency adaptation and accessibility
 */
export const DisclosureManager: React.FC<DisclosureManagerProps> = ({
  content,
  urgencyLevel,
  strategyMode,
  onLevelChange,
  onModeChange,
  className = '',
  disabled = false
}) => {
  // Disclosure state management
  const disclosure = useDisclosureState({
    respectsUrgency: true,
    keyboardNavigation: true,
    enableAutoCollapse: true,
    autoCollapseDelay: urgencyLevel === 'critical' ? 5000 : 15000
  })

  // Strategy mode management
  const modeManager = useStrategyMode(strategyMode)

  // Urgency detection for adaptive behavior
  const { isEmergencyMode } = useUrgencyDetection()

  // Adapt disclosure to urgency changes
  useEffect(() => {
    disclosure.adaptToUrgency(urgencyLevel)
  }, [urgencyLevel, disclosure.adaptToUrgency])

  // Handle level changes with callback
  const handleLevelChange = useCallback((level: DisclosureLevel) => {
    if (disabled) return

    disclosure.setLevel(level)
    onLevelChange?.(level)

    // Screen reader announcement
    const announceText = `Disclosure level changed to ${level}`
    const announcement = new SpeechSynthesisUtterance(announceText)
    announcement.volume = 0.1
    announcement.rate = 1.2
    if ('speechSynthesis' in window && disclosure.config.keyboardNavigation) {
      speechSynthesis.speak(announcement)
    }
  }, [disabled, disclosure, onLevelChange])

  // Handle mode changes with callback
  const handleModeChange = useCallback((mode: StrategyMode) => {
    if (disabled) return

    modeManager.setMode(mode)
    onModeChange?.(mode)
  }, [disabled, modeManager, onModeChange])

  // Container classes with urgency and transition awareness
  const containerClasses = useMemo(() => {
    return getContainerClasses(
      disclosure.state.currentLevel,
      disclosure.state.isTransitioning,
      urgencyLevel
    )
  }, [disclosure.state.currentLevel, disclosure.state.isTransitioning, urgencyLevel])

  // Transition styles for smooth animations
  const transitionStyles = useMemo(() => {
    const transition = getAccessibleTransition({
      from: disclosure.state.previousLevel || 'glance',
      to: disclosure.state.currentLevel,
      duration: 300,
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      staggerDelay: 50
    })

    return {
      transition: createTransitionCSS(
        ['max-height', 'opacity', 'transform'],
        transition
      )
    }
  }, [disclosure.state.currentLevel, disclosure.state.previousLevel])

  // Emergency mode overrides
  const emergencyOverrides = useMemo(() => {
    if (!isEmergencyMode) return {}

    return {
      style: {
        ...transitionStyles,
        borderColor: '#EF4444',
        boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.2)',
        animation: 'pulse 2s infinite'
      }
    }
  }, [isEmergencyMode, transitionStyles])

  // Keyboard event handler
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (disabled) return

    // Let disclosure hook handle navigation
    disclosure.onKeyDown(event)

    // Additional keyboard shortcuts for mode switching
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case '1':
          event.preventDefault()
          handleModeChange('flexible')
          break
        case '2':
          event.preventDefault()
          handleModeChange('quickWin')
          break
        case '3':
          event.preventDefault()
          handleModeChange('defensive')
          break
        case '4':
          event.preventDefault()
          handleModeChange('highScore')
          break
      }
    }
  }, [disabled, disclosure, handleModeChange])

  // Long press handler for quick advanced mode access
  const handleLongPress = useCallback(() => {
    if (
      disabled ||
      !disclosure.config.enableLongPressAdvanced ||
      !disclosure.state.allowedLevels.includes('advanced')
    ) return

    if (disclosure.state.currentLevel !== 'advanced') {
      handleLevelChange('advanced')

      // Haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 50, 100]) // Pattern: short-short-long
      }
    }
  }, [
    disabled,
    disclosure.config.enableLongPressAdvanced,
    disclosure.state.allowedLevels,
    disclosure.state.currentLevel,
    handleLevelChange
  ])

  // Touch handlers for long press detection
  const [longPressTimer, setLongPressTimer] = React.useState<NodeJS.Timeout>()

  const handleTouchStart = useCallback(() => {
    const timer = setTimeout(handleLongPress, 800) // 800ms for long press
    setLongPressTimer(timer)
  }, [handleLongPress])

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(undefined)
    }
  }, [longPressTimer])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer)
      }
    }
  }, [longPressTimer])

  return (
    <Card
      variant="elevated"
      className={`
        relative overflow-hidden
        ${containerClasses}
        ${className}
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      style={transitionStyles}
      {...emergencyOverrides}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      tabIndex={disabled ? -1 : 0}
      role="region"
      aria-label="Strategy advisor with progressive disclosure"
      aria-live="polite"
      aria-expanded={disclosure.state.currentLevel !== 'glance'}
    >
      {/* Header with Mode Selector */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{content.glance.emoji || '🧭'}</span>
          <h3 className="font-semibold text-sm">
            {content.glance.title}
          </h3>
          {content.glance.confidence && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {Math.round(content.glance.confidence)}%
            </span>
          )}
        </div>

        <StrategyModeSelector
          currentMode={strategyMode}
          availableModes={['flexible', 'quickWin', 'defensive', 'highScore']}
          onModeChange={handleModeChange}
          compact={true}
          disabled={disabled}
          showDescriptions={disclosure.state.currentLevel !== 'glance'}
        />
      </div>

      {/* Glance Mode Content (Always Visible) */}
      <div className="p-3">
        <p className="text-sm leading-relaxed text-gray-700">
          {content.glance.message}
        </p>

        {content.glance.actionNeeded && (
          <div className="mt-2 flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-blue-700">
              {content.glance.actionNeeded}
            </span>
          </div>
        )}

        {/* Expand/Collapse Controls */}
        {!disabled && disclosure.state.allowedLevels.length > 1 && (
          <div className="mt-3 flex items-center space-x-2">
            {disclosure.state.currentLevel === 'glance' && disclosure.state.allowedLevels.includes('details') && (
              <button
                onClick={() => handleLevelChange('details')}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                aria-label="Show more details"
              >
                More details ↓
              </button>
            )}

            {disclosure.state.currentLevel === 'glance' && disclosure.state.allowedLevels.includes('advanced') && (
              <button
                onClick={() => handleLevelChange('advanced')}
                className="text-xs text-purple-600 hover:text-purple-800 font-medium transition-colors"
                aria-label="Show advanced analysis"
              >
                Advanced →
              </button>
            )}

            {disclosure.state.currentLevel !== 'glance' && (
              <button
                onClick={() => handleLevelChange('glance')}
                className="text-xs text-gray-600 hover:text-gray-800 font-medium transition-colors"
                aria-label="Hide details"
              >
                Hide details ↑
              </button>
            )}
          </div>
        )}
      </div>

      {/* Details Mode Content */}
      {disclosure.state.currentLevel === 'details' && (
        <DetailsMode
          content={content.details}
          isVisible={true}
          onExpandToAdvanced={() => handleLevelChange('advanced')}
          onCollapseToGlance={() => handleLevelChange('glance')}
          strategyMode={strategyMode}
          className="border-t border-gray-200"
        />
      )}

      {/* Advanced Mode Content */}
      {disclosure.state.currentLevel === 'advanced' && (
        <AdvancedMode
          content={content.advanced}
          isVisible={true}
          onCollapseToDetails={() => handleLevelChange('details')}
          strategyMode={strategyMode}
          showProbabilityCharts={urgencyLevel === 'low'}
          className="border-t border-gray-200"
        />
      )}

      {/* Auto-collapse indicator */}
      {disclosure.state.autoCollapseTimeout && disclosure.state.currentLevel !== 'glance' && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100">
          <div
            className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
            style={{
              width: `${Math.max(0, 100 - ((Date.now() - disclosure.state.transitionStartTime) / (disclosure.config.autoCollapseDelay)) * 100)}%`
            }}
          />
        </div>
      )}

      {/* Keyboard shortcuts hint */}
      {disclosure.config.keyboardNavigation && disclosure.state.currentLevel !== 'glance' && (
        <div className="absolute top-2 right-2 text-xs text-gray-400 opacity-75">
          <span className="hidden sm:inline">Press Esc to collapse</span>
        </div>
      )}

      {/* Loading overlay for transitions */}
      {disclosure.state.isTransitioning && (
        <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      )}
    </Card>
  )
}

// Accessibility-focused variant for screen readers
export const AccessibleDisclosureManager: React.FC<DisclosureManagerProps> = (props) => {
  return (
    <div role="region" aria-label="Strategy advisor">
      <DisclosureManager {...props} />
    </div>
  )
}

// Simplified variant for high urgency situations
export const SimplifiedDisclosureManager: React.FC<Omit<DisclosureManagerProps, 'content'> & {
  title: string
  message: string
  actionNeeded?: string
}> = ({ title, message, actionNeeded, urgencyLevel, strategyMode, onLevelChange, onModeChange, className, disabled }) => {
  const simplifiedContent = {
    glance: {
      title,
      message,
      actionNeeded,
      emoji: '⚡'
    },
    details: {
      technicalAnalysis: message,
      patternRequirements: actionNeeded ? [actionNeeded] : [],
      riskFactors: [],
      estimatedTurns: 1,
      flexibility: 'low' as const
    },
    advanced: {
      probabilityAnalysis: 'Simplified mode - limited analysis',
      completionProbability: 0.8,
      expectedTurns: 1,
      turnVariance: 0.1,
      tileAvailability: [],
      alternativeStrategies: [],
      wallDepletionRisk: 'Not applicable in simplified mode'
    }
  }

  return (
    <DisclosureManager
      content={simplifiedContent}
      urgencyLevel={urgencyLevel}
      strategyMode={strategyMode}
      onLevelChange={onLevelChange}
      onModeChange={onModeChange}
      className={className}
      disabled={disabled}
    />
  )
}