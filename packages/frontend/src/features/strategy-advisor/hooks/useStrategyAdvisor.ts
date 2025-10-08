// useStrategyAdvisor Hook - Main interface for Strategy Advisor functionality
// Orchestrates data flow between intelligence store, adapter, and Strategy Advisor store
// Enhanced with Phase 6 performance monitoring and memory optimization

import { useCallback, useEffect, useRef, useMemo } from 'react'
import { useIntelligenceStore } from '../../../stores/useIntelligenceStore'
import {
  useStrategyAdvisorStore,
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

  // Granular store subscriptions (prevents infinite loops by only subscribing to needed properties)
  const currentAnalysis = useIntelligenceStore(state => state.currentAnalysis)
  const isIntelligenceAnalyzing = useIntelligenceStore(state => state.isAnalyzing)

  const currentMessages = useStrategyAdvisorStore(state => state.currentMessages)
  const isActive = useStrategyAdvisorStore(state => state.isActive)
  const isLoading = useStrategyAdvisorStore(state => state.isLoading)
  const error = useStrategyAdvisorStore(state => state.error)
  const config = useStrategyAdvisorStore(state => state.config)
  const expandedMessageId = useStrategyAdvisorStore(state => state.expandedMessageId)
  const refreshInterval = useStrategyAdvisorStore(state => state.config.refreshInterval)

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
  const intelligenceDataRef = useRef<StrategyAdvisorTypes.IntelligenceData | null>(null)

  // Stable intelligence data with ref-based caching to prevent infinite loops
  // Only creates new object if analysis ID actually changes
  // Note: Updates intelligenceDataRef.current which is used elsewhere
  useMemo(() => {
    const currentAnalysisId = currentAnalysis?.lastUpdated || 0

    // Return cached reference if same analysis to prevent re-render cascade
    if (currentAnalysisId === lastProcessedAnalysisIdRef.current && intelligenceDataCacheRef.current) {
      return intelligenceDataCacheRef.current
    }

    try {
      // Adapt intelligence data
      const result = adapter.adaptIntelligenceData(
        currentAnalysis,
        isIntelligenceAnalyzing
      )

      // Cache result and update ID
      intelligenceDataCacheRef.current = result
      lastProcessedAnalysisIdRef.current = currentAnalysisId
      intelligenceDataRef.current = result

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
    currentAnalysis,
    isIntelligenceAnalyzing
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

      // Check if refresh is needed - use ref to avoid dependency
      const currentIntelligenceData = intelligenceDataRef.current
      if (!currentIntelligenceData) {
        currentState.setLoading(false)
        isRefreshingRef.current = false
        return
      }

      const shouldRefresh = adapter.shouldRefreshStrategy(
        previousIntelligenceDataRef.current,
        currentIntelligenceData,
        lastRefreshTimeRef.current
      )

      if (!shouldRefresh) {
        currentState.setLoading(false)
        isRefreshingRef.current = false
        return
      }

      // Generate strategy messages (use fresh state, not stale closure)
      const generationResponse = adapter.generateStrategyMessages(
        currentIntelligenceData,
        gameContext,
        useStrategyAdvisorStore.getState().currentMessages,
        urgencyThreshold
      )

      // Update messages based on response
      if (generationResponse.shouldReplace) {
        strategyAdvisorActions.replaceAllMessages(generationResponse.messages)
      } else {
        strategyAdvisorActions.smartUpdateMessages(generationResponse.messages)
      }

      // Update tracking refs
      previousIntelligenceDataRef.current = currentIntelligenceData
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
    // intelligenceData removed - using ref instead to prevent infinite loop
    gameContext,
    urgencyThreshold
  ])

  // refreshInterval and isActive already extracted above via selectors

  // Use ref to avoid refresh in useEffect dependencies (prevents infinite loop)
  const refreshRef = useRef(refresh)
  refreshRef.current = refresh

  // Auto-refresh effect with stable dependencies
  useEffect(() => {
    // Don't start auto-refresh if not active or autoRefresh disabled
    if (!isActive || !autoRefresh) {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
        refreshIntervalRef.current = null
      }
      return
    }

    // Prevent immediate refresh on mount - only set up interval
    // Components should call refresh() manually if they want immediate update
    refreshIntervalRef.current = setInterval(() => refreshRef.current(), refreshInterval)

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
        refreshIntervalRef.current = null
      }
    }
  }, [
    isActive,
    autoRefresh,
    refreshInterval
    // refresh removed - using refreshRef instead to prevent infinite loop
  ])

  // Auto-activate on mount and cleanup on unmount
  useEffect(() => {
    // Don't auto-activate - let components activate explicitly to prevent render blocking
    // const currentState = useStrategyAdvisorStore.getState()
    // currentState.setActive(true)

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

  // Computed values - compute in useMemo to avoid infinite loops from unstable selector references
  // DO NOT use these selectors directly with useStrategyAdvisorStore - they return new arrays/objects each time
  const mostUrgentMessage = useMemo(() => {
    if (currentMessages.length === 0) return null

    // Sort by urgency priority if configured
    if (config.prioritizeUrgent) {
      const urgencyOrder: Record<StrategyAdvisorTypes.UrgencyLevel, number> = {
        'critical': 4,
        'high': 3,
        'medium': 2,
        'low': 1
      }

      const sorted = [...currentMessages].sort((a, b) => {
        const aUrgency = urgencyOrder[a.urgency] || 0
        const bUrgency = urgencyOrder[b.urgency] || 0

        if (aUrgency !== bUrgency) {
          return bUrgency - aUrgency // Higher urgency first
        }

        // If same urgency, sort by confidence (higher first)
        return b.confidence - a.confidence
      })

      return sorted[0]
    }

    // Return most recent if not prioritizing by urgency
    return currentMessages[currentMessages.length - 1]
  }, [currentMessages, config.prioritizeUrgent])

  const actionableMessages = useMemo(() => {
    return currentMessages.filter(msg => msg.isActionable)
  }, [currentMessages])

  const hasNewInsights = useMemo(() => {
    const thirtySecondsAgo = Date.now() - (30 * 1000)
    return currentMessages.some(msg => msg.timestamp > thirtySecondsAgo)
  }, [currentMessages])

  // Memoize return value to ensure stable references and prevent infinite loops
  return useMemo(() => ({
    // State
    messages: currentMessages,
    isActive: isActive,
    isLoading: isLoading,
    error: error,
    config: config,
    expandedMessageId: expandedMessageId,

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
    currentMessages,
    isActive,
    isLoading,
    error,
    config,
    expandedMessageId,
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
