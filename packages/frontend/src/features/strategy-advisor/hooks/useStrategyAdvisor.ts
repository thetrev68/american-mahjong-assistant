// useStrategyAdvisor Hook - Main interface for Strategy Advisor functionality
// Orchestrates data flow between intelligence store, adapter, and Strategy Advisor store
// Enhanced with Phase 6 performance monitoring and memory optimization

import { useCallback, useEffect, useRef, useMemo } from 'react'
import { useIntelligenceStore } from '../../../stores/intelligence-store'
import {
  useStrategyAdvisorStore,
  strategyAdvisorSelectors,
  strategyAdvisorActions
} from '../stores/strategy-advisor.store'
import { StrategyAdvisorAdapter } from '../services/strategy-advisor-adapter.service'
import type { StrategyAdvisorTypes } from '../types/strategy-advisor.types'

// Monitoring hooks removed - they were causing infinite loops with unstable references

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

  // Monitoring hooks completely removed to prevent unstable dependency chains

  // Store subscriptions
  const intelligenceStore = useIntelligenceStore()
  const strategyStore = useStrategyAdvisorStore()

  // Adapter instance (stable reference)
  const adapterRef = useRef<StrategyAdvisorAdapter>()
  if (!adapterRef.current) {
    adapterRef.current = new StrategyAdvisorAdapter()
  }
  const adapter = adapterRef.current

  // Refs for tracking previous state and preventing infinite loops
  const previousIntelligenceDataRef = useRef<StrategyAdvisorTypes.IntelligenceData | null>(null)
  const lastRefreshTimeRef = useRef<number>(0)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastProcessedAnalysisIdRef = useRef<number>(0)
  const intelligenceDataCacheRef = useRef<StrategyAdvisorTypes.IntelligenceData | null>(null)
  const isRefreshingRef = useRef<boolean>(false)

  // Stable intelligence data with ref-based caching to prevent infinite loops
  // Only creates new object if analysis ID actually changes
  const intelligenceData = useMemo(() => {
    const currentAnalysisId = intelligenceStore.currentAnalysis?.lastUpdated || 0

    // Return cached reference if same analysis to prevent re-render cascade
    if (currentAnalysisId === lastProcessedAnalysisIdRef.current && intelligenceDataCacheRef.current) {
      return intelligenceDataCacheRef.current
    }

    try {
      // Adapt intelligence data
      const result = adapter.adaptIntelligenceData(
        intelligenceStore.currentAnalysis,
        intelligenceStore.isAnalyzing
      )

      // Cache result and update ID
      intelligenceDataCacheRef.current = result
      lastProcessedAnalysisIdRef.current = currentAnalysisId

      return result
    } catch (error) {
      console.error('Intelligence data adaptation failed:', error)
      // Return cached value if available, otherwise default
      return intelligenceDataCacheRef.current || {
        hasAnalysis: false,
        isAnalyzing: false,
        recommendedPatterns: [],
        tileRecommendations: [],
        strategicAdvice: [],
        threats: [],
        overallScore: 0,
        lastUpdated: 0
      }
    }
  }, [
    adapter,
    intelligenceStore.currentAnalysis?.lastUpdated,
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

  // Strategy refresh function - simplified to prevent infinite loops
  const refresh = useCallback(async () => {
    // Prevent concurrent refreshes
    if (isRefreshingRef.current) {
      return
    }

    // Get current store state without depending on it
    const currentState = useStrategyAdvisorStore.getState()
    if (!currentState.isActive) return

    try {
      isRefreshingRef.current = true
      currentState.setLoading(true)
      currentState.setError(null)

      // Check if refresh is needed
      const shouldRefresh = adapter.shouldRefreshStrategy(
        previousIntelligenceDataRef.current,
        intelligenceData,
        lastRefreshTimeRef.current
      )

      if (!shouldRefresh) {
        currentState.setLoading(false)
        isRefreshingRef.current = false
        return
      }

      // Generate strategy messages
      const generationResponse = adapter.generateStrategyMessages(
        intelligenceData,
        gameContext,
        currentState.currentMessages,
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

      currentState.setLoading(false)
      isRefreshingRef.current = false

    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error(String(error))
      console.error('Strategy refresh failed:', errorInstance)
      const currentState = useStrategyAdvisorStore.getState()
      currentState.setError(errorInstance.message)
      currentState.setLoading(false)
      isRefreshingRef.current = false
    }
  }, [
    adapter,
    intelligenceData,
    gameContext,
    urgencyThreshold
  ])

  // Extract stable primitive values from config
  const refreshInterval = strategyStore.config.refreshInterval
  const isActive = strategyStore.isActive

  // Auto-refresh effect with stable dependencies
  useEffect(() => {
    if (!isActive || !autoRefresh) {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
        refreshIntervalRef.current = null
      }
      return
    }

    // Initial refresh - delayed to prevent immediate loop
    const timeoutId = setTimeout(() => {
      refresh()
    }, 100)

    // Set up interval for subsequent refreshes
    refreshIntervalRef.current = setInterval(refresh, refreshInterval)

    return () => {
      clearTimeout(timeoutId)
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
        refreshIntervalRef.current = null
      }
    }
  }, [
    isActive,
    autoRefresh,
    refreshInterval,
    refresh
  ])

  // Auto-activate on mount and cleanup on unmount
  useEffect(() => {
    // Activate Strategy Advisor when hook is used
    const currentState = useStrategyAdvisorStore.getState()
    currentState.setActive(true)

    return () => {
      // Cleanup intervals on unmount
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
        refreshIntervalRef.current = null
      }
    }
  }, []) // Empty deps - only run on mount/unmount

  // Action handlers - use getState() to avoid dependency on store object
  const activate = useCallback(() => {
    useStrategyAdvisorStore.getState().setActive(true)
  }, [])

  const deactivate = useCallback(() => {
    useStrategyAdvisorStore.getState().setActive(false)
  }, [])

  const expandMessage = useCallback((messageId: string) => {
    useStrategyAdvisorStore.getState().setExpandedMessage(messageId)
  }, [])

  const collapseMessage = useCallback(() => {
    useStrategyAdvisorStore.getState().setExpandedMessage(null)
  }, [])

  const dismissMessage = useCallback((messageId: string) => {
    useStrategyAdvisorStore.getState().removeMessage(messageId)
  }, [])

  const updateConfig = useCallback((configUpdate: Partial<StrategyAdvisorTypes.GlanceModeConfig>) => {
    useStrategyAdvisorStore.getState().updateConfig(configUpdate)
  }, [])

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

  // Memoize return value to ensure stable references and prevent infinite loops
  return useMemo(() => ({
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
  }), [
    strategyStore.currentMessages,
    strategyStore.isActive,
    strategyStore.isLoading,
    strategyStore.error,
    strategyStore.config,
    strategyStore.expandedMessageId,
    refresh,
    activate,
    deactivate,
    expandMessage,
    collapseMessage,
    dismissMessage,
    updateConfig,
    mostUrgentMessage,
    actionableMessages,
    hasNewInsights
  ])
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