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

// Phase 6 enhancements
import { usePerformanceMonitoring } from './usePerformanceMonitoring'
import { useMemoryOptimization } from './useMemoryOptimization'
import { useErrorRecovery } from './useErrorRecovery'
import { useErrorReporting } from '../services/error-reporting.service'

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

  // Phase 6: Performance monitoring
  const { metrics, measureRenderTime } = usePerformanceMonitoring({
    componentName: 'useStrategyAdvisor',
    enableMemoryTracking: true,
    enableRenderTracking: true,
    autoOptimize: true
  })

  // Phase 6: Memory optimization
  const { optimizeMemory, addCleanupTask, getCacheItem, setCacheItem } = useMemoryOptimization({
    enableAutoCleanup: true,
    maxCacheSize: 50,
    memoryWarningThreshold: 75
  })

  // Phase 6: Error recovery
  const { errorState, recover } = useErrorRecovery({
    maxRetries: 3,
    enableDegradedMode: true,
    autoRetry: true
  })

  // Phase 6: Error reporting
  const { reportError, addBreadcrumb } = useErrorReporting({
    component: 'useStrategyAdvisor',
    feature: 'strategy-advisor',
    action: 'hook_execution'
  })

  // Store subscriptions
  const intelligenceStore = useIntelligenceStore()
  const strategyStore = useStrategyAdvisorStore()

  // Adapter instance (stable reference with memory optimization)
  const adapterRef = useRef<StrategyAdvisorAdapter>()
  if (!adapterRef.current) {
    adapterRef.current = new StrategyAdvisorAdapter()

    // Add adapter cleanup task
    addCleanupTask({
      cleanup: () => {
        // Clean up adapter resources
        adapterRef.current = undefined
      },
      priority: 1,
      description: 'StrategyAdvisorAdapter cleanup',
      automated: true
    })
  }
  const adapter = adapterRef.current

  // Refs for tracking previous state
  const previousIntelligenceDataRef = useRef<StrategyAdvisorTypes.IntelligenceData | null>(null)
  const lastRefreshTimeRef = useRef<number>(0)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Memoized intelligence data adaptation with caching and performance monitoring
  // Only depend on actual data changes, not function references to prevent infinite loop
  const intelligenceData = useMemo(() => {
    try {
      // Check cache first
      const cacheKey = `intelligence_${intelligenceStore.currentAnalysis?.lastUpdated || 0}_${intelligenceStore.isAnalyzing}`
      const cached = getCacheItem(cacheKey)
      if (cached) {
        return cached
      }

      // Adapt intelligence data
      const result = adapter.adaptIntelligenceData(
        intelligenceStore.currentAnalysis,
        intelligenceStore.isAnalyzing
      )

      // Cache result
      setCacheItem(cacheKey, result, 30000) // 30 second TTL

      return result
    } catch (error) {
      console.error('Intelligence data adaptation failed:', error)
      // Return default data on error to prevent crash
      return {
        hasAnalysis: false,
        isAnalyzing: false,
        patterns: [],
        urgency: { level: 'none', factors: {} },
        actions: []
      }
    }
    // Only depend on actual data changes, not function references
    // Functions are stable via closure: getCacheItem, setCacheItem
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

  // Strategy refresh function with enhanced error handling and performance monitoring
  const refresh = useCallback(async () => {
    if (!strategyStore.isActive) return

    const refreshStartTime = performance.now()

    try {
      strategyStore.setLoading(true)
      strategyStore.setError(null)

      addBreadcrumb({
        type: 'user',
        category: 'strategy',
        message: 'Strategy refresh started',
        level: 'info',
        data: { gamePhase, urgencyThreshold }
      })

      // Performance check before refresh
      if (metrics.memoryUsage > 90) {
        console.warn('[useStrategyAdvisor] High memory usage, optimizing before refresh')
        await optimizeMemory()
      }

      // Check if refresh is needed
      const shouldRefresh = adapter.shouldRefreshStrategy(
        previousIntelligenceDataRef.current,
        intelligenceData,
        lastRefreshTimeRef.current
      )

      if (!shouldRefresh) {
        strategyStore.setLoading(false)
        addBreadcrumb({
          type: 'user',
          category: 'strategy',
          message: 'Strategy refresh skipped - not needed',
          level: 'info'
        })
        return
      }

      // Measure message generation performance
      const generationResponse = measureRenderTime(() => {
        return adapter.generateStrategyMessages(
          intelligenceData,
          gameContext,
          strategyStore.currentMessages,
          urgencyThreshold
        )
      }, 'generateStrategyMessages')

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

      const refreshDuration = performance.now() - refreshStartTime
      addBreadcrumb({
        type: 'user',
        category: 'performance',
        message: `Strategy refresh completed in ${refreshDuration.toFixed(2)}ms`,
        level: 'info',
        data: {
          messagesCount: generationResponse.messages.length,
          shouldReplace: generationResponse.shouldReplace,
          duration: refreshDuration
        }
      })

    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error(String(error))

      console.error('Strategy refresh failed:', errorInstance)

      // Report error and attempt recovery
      reportError(errorInstance, {
        action: 'strategy_refresh',
        state: {
          gamePhase,
          urgencyThreshold,
          hasIntelligenceData: !!intelligenceData,
          memoryUsage: metrics.memoryUsage
        }
      })

      // Attempt error recovery
      if (errorState.canRetry) {
        await recover({ type: 'retry', delay: 1000 })
      } else {
        strategyStore.setError(errorInstance.message)
      }

      strategyStore.setLoading(false)
    }
  }, [
    adapter,
    intelligenceData,
    gameContext,
    urgencyThreshold,
    strategyStore,
    measureRenderTime,
    addBreadcrumb,
    reportError,
    errorState,
    recover,
    metrics,
    optimizeMemory,
    gamePhase
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

  // Enhanced cleanup on unmount with memory optimization
  // Empty dependency array ensures this only runs once on mount/unmount
  // to prevent infinite re-render cycles from unstable function references
  useEffect(() => {
    // Add hook lifecycle breadcrumb on mount only
    addBreadcrumb({
      type: 'user',
      category: 'lifecycle',
      message: 'useStrategyAdvisor hook mounted',
      level: 'info',
      data: { gamePhase, autoRefresh, urgencyThreshold }
    })

    return () => {
      // Cleanup intervals
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
        refreshIntervalRef.current = null
      }

      // Clear cache and optimize memory
      optimizeMemory()

      // Add cleanup breadcrumb
      addBreadcrumb({
        type: 'user',
        category: 'lifecycle',
        message: 'useStrategyAdvisor hook unmounted',
        level: 'info'
      })

      console.log('[useStrategyAdvisor] Hook cleanup completed')
    }
    // Functions are stable via closure, intentionally empty to run only once
  }, [])

  // Performance monitoring effect
  useEffect(() => {
    if (metrics.memoryUsage > 80) {
      console.warn('[useStrategyAdvisor] High memory usage detected:', metrics.memoryUsage, 'MB')

      // Add warning breadcrumb
      addBreadcrumb({
        type: 'user',
        category: 'performance',
        message: `High memory usage: ${metrics.memoryUsage}MB`,
        level: 'warning',
        data: { threshold: 80, current: metrics.memoryUsage }
      })

      // Trigger memory optimization if critical
      if (metrics.memoryUsage > 100) {
        optimizeMemory()
      }
    }

    if (metrics.frameRate < 30) {
      console.warn('[useStrategyAdvisor] Low frame rate detected:', metrics.frameRate, 'fps')

      addBreadcrumb({
        type: 'user',
        category: 'performance',
        message: `Low frame rate: ${metrics.frameRate}fps`,
        level: 'warning',
        data: { target: 60, current: metrics.frameRate }
      })
    }
  }, [metrics.memoryUsage, metrics.frameRate, addBreadcrumb, optimizeMemory])

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