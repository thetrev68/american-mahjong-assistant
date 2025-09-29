// useStrategyAdvisor Hook - Main interface for Strategy Advisor functionality
// Orchestrates data flow between intelligence store, adapter, and Strategy Advisor store

import { useCallback, useEffect, useRef, useMemo } from 'react'
import { useIntelligenceStore } from '../../../stores/intelligence-store'
import {
  useStrategyAdvisorStore,
  strategyAdvisorSelectors,
  strategyAdvisorActions
} from '../stores/strategy-advisor.store'
import { StrategyAdvisorAdapter } from '../services/strategy-advisor-adapter.service'
import type { StrategyAdvisorTypes } from '../types/strategy-advisor.types'

interface UseStrategyAdvisorOptions {
  gamePhase?: 'charleston' | 'playing' | 'endgame'
  currentTurn?: number
  wallTilesRemaining?: number
  playerPosition?: 'east' | 'south' | 'west' | 'north'
  handSize?: number
  hasDrawnTile?: boolean
  exposedTilesCount?: number
  urgencyThreshold?: StrategyAdvisorTypes.UrgencyLevel
  autoRefresh?: boolean
}

export const useStrategyAdvisor = (
  options: UseStrategyAdvisorOptions = {}
): StrategyAdvisorTypes.StrategyAdvisorHook => {
  // Default options
  const {
    gamePhase = 'playing',
    currentTurn = 1,
    wallTilesRemaining = 144,
    playerPosition = 'east',
    handSize = 13,
    hasDrawnTile = false,
    exposedTilesCount = 0,
    urgencyThreshold = 'low',
    autoRefresh = true
  } = options

  // Store subscriptions
  const intelligenceStore = useIntelligenceStore()
  const strategyStore = useStrategyAdvisorStore()

  // Adapter instance (stable reference)
  const adapterRef = useRef<StrategyAdvisorAdapter>()
  if (!adapterRef.current) {
    adapterRef.current = new StrategyAdvisorAdapter()
  }
  const adapter = adapterRef.current

  // Refs for tracking previous state
  const previousIntelligenceDataRef = useRef<StrategyAdvisorTypes.IntelligenceData | null>(null)
  const lastRefreshTimeRef = useRef<number>(0)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Memoized intelligence data adaptation
  const intelligenceData = useMemo(() => {
    return adapter.adaptIntelligenceData(
      intelligenceStore.currentAnalysis,
      intelligenceStore.isAnalyzing
    )
  }, [
    adapter,
    intelligenceStore.currentAnalysis,
    intelligenceStore.isAnalyzing
  ])

  // Memoized game context
  const gameContext = useMemo(() => {
    return adapter.createGameContext({
      gamePhase,
      currentTurn,
      wallTilesRemaining,
      playerPosition,
      handSize,
      hasDrawnTile,
      exposedTilesCount
    })
  }, [
    adapter,
    gamePhase,
    currentTurn,
    wallTilesRemaining,
    playerPosition,
    handSize,
    hasDrawnTile,
    exposedTilesCount
  ])

  // Strategy refresh function
  const refresh = useCallback(async () => {
    if (!strategyStore.isActive) return

    try {
      strategyStore.setLoading(true)
      strategyStore.setError(null)

      // Check if refresh is needed
      const shouldRefresh = adapter.shouldRefreshStrategy(
        previousIntelligenceDataRef.current,
        intelligenceData,
        lastRefreshTimeRef.current
      )

      if (!shouldRefresh) {
        strategyStore.setLoading(false)
        return
      }

      // Generate new strategy messages
      const generationResponse = adapter.generateStrategyMessages(
        intelligenceData,
        gameContext,
        strategyStore.currentMessages,
        urgencyThreshold
      )

      // Update messages based on response
      if (generationResponse.shouldReplace) {
        strategyAdvisorActions.replaceAllMessages(generationResponse.messages)
      } else {
        strategyAdvisorActions.smartUpdateMessages(generationResponse.messages)
      }

      // Update tracking refs
      previousIntelligenceDataRef.current = intelligenceData
      lastRefreshTimeRef.current = Date.now()

      strategyStore.setLoading(false)

    } catch (error) {
      console.error('Strategy refresh failed:', error)
      strategyStore.setError(
        error instanceof Error ? error.message : 'Failed to refresh strategy'
      )
    }
  }, [
    adapter,
    intelligenceData,
    gameContext,
    urgencyThreshold,
    strategyStore
  ])

  // Auto-refresh effect
  useEffect(() => {
    if (!strategyStore.isActive || !autoRefresh) {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
        refreshIntervalRef.current = null
      }
      return
    }

    const { refreshInterval } = strategyStore.config

    // Initial refresh
    refresh()

    // Set up interval
    refreshIntervalRef.current = setInterval(refresh, refreshInterval)

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
        refreshIntervalRef.current = null
      }
    }
  }, [
    strategyStore.isActive,
    strategyStore.config,
    autoRefresh,
    refresh
  ])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [])

  // Manual refresh trigger when intelligence data changes significantly
  useEffect(() => {
    if (!strategyStore.isActive) return

    const shouldRefresh = adapter.shouldRefreshStrategy(
      previousIntelligenceDataRef.current,
      intelligenceData,
      lastRefreshTimeRef.current
    )

    if (shouldRefresh && !strategyStore.isLoading) {
      // Debounce rapid updates
      const timeoutId = setTimeout(refresh, 500)
      return () => clearTimeout(timeoutId)
    }
  }, [intelligenceData, strategyStore.isActive, strategyStore.isLoading, adapter, refresh])

  // Action handlers
  const activate = useCallback(() => {
    strategyStore.setActive(true)
  }, [strategyStore])

  const deactivate = useCallback(() => {
    strategyStore.setActive(false)
  }, [strategyStore])

  const expandMessage = useCallback((messageId: string) => {
    strategyStore.setExpandedMessage(messageId)
  }, [strategyStore])

  const collapseMessage = useCallback(() => {
    strategyStore.setExpandedMessage(null)
  }, [strategyStore])

  const dismissMessage = useCallback((messageId: string) => {
    strategyStore.removeMessage(messageId)
  }, [strategyStore])

  const updateConfig = useCallback((configUpdate: Partial<StrategyAdvisorTypes.GlanceModeConfig>) => {
    strategyStore.updateConfig(configUpdate)
  }, [strategyStore])

  // Computed values
  const mostUrgentMessage = useMemo(() => {
    return strategyAdvisorSelectors.mostUrgentMessage(strategyStore)
  }, [strategyStore])

  const actionableMessages = useMemo(() => {
    return strategyAdvisorSelectors.actionableMessages(strategyStore)
  }, [strategyStore])

  const hasNewInsights = useMemo(() => {
    return strategyAdvisorSelectors.hasNewInsights(strategyStore)
  }, [strategyStore])

  return {
    // State
    messages: strategyStore.currentMessages,
    isActive: strategyStore.isActive,
    isLoading: strategyStore.isLoading,
    error: strategyStore.error,
    config: strategyStore.config,
    expandedMessageId: strategyStore.expandedMessageId,

    // Actions
    refresh,
    activate,
    deactivate,
    expandMessage,
    collapseMessage,
    dismissMessage,
    updateConfig,

    // Computed values
    mostUrgentMessage,
    actionableMessages,
    hasNewInsights
  }
}

// Convenience hook for using with specific game phases
export const useCharlestonStrategyAdvisor = (options: Omit<UseStrategyAdvisorOptions, 'gamePhase'> = {}) => {
  return useStrategyAdvisor({
    ...options,
    gamePhase: 'charleston',
    urgencyThreshold: 'medium' // Charleston guidance is generally more urgent
  })
}

export const useGameplayStrategyAdvisor = (options: Omit<UseStrategyAdvisorOptions, 'gamePhase'> = {}) => {
  return useStrategyAdvisor({
    ...options,
    gamePhase: 'playing',
    urgencyThreshold: 'low' // Allow all guidance during normal gameplay
  })
}

export const useEndgameStrategyAdvisor = (options: Omit<UseStrategyAdvisorOptions, 'gamePhase' | 'urgencyThreshold'> = {}) => {
  return useStrategyAdvisor({
    ...options,
    gamePhase: 'endgame',
    urgencyThreshold: 'medium', // Focus on more urgent guidance in endgame
    autoRefresh: true // Critical to stay updated in endgame
  })
}