// Pull-to-Refresh Hook - High-performance gesture handling for hand re-analysis
// Optimized for mobile with haptic feedback and smooth 60fps animations

import { useState, useCallback, useRef, useEffect } from 'react'
import type {
  UsePullToRefresh,
  PullToRefreshState,
  PullToRefreshConfig
} from '../types/strategy-advisor.types'
import { useHapticFeedback } from './useHapticFeedback'
import { gesturePerformanceUtils } from '../utils/gesture-performance'

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>
  config?: Partial<PullToRefreshConfig>
  disabled?: boolean
}

// Default configuration optimized for mobile gameplay
const DEFAULT_CONFIG: PullToRefreshConfig = {
  threshold: 80, // px to trigger refresh
  maxDistance: 120, // max pull distance
  enableHaptics: true,
  enableAnimation: true,
  sensitivity: 1.0, // 1.0 = normal sensitivity
  resistanceAfterThreshold: 0.4 // Resistance when pulling past threshold
}

/**
 * Hook for pull-to-refresh gesture on the main game view
 * Triggers hand re-analysis when user pulls down from the top
 */
export const usePullToRefresh = ({
  onRefresh,
  config: userConfig = {},
  disabled = false
}: UsePullToRefreshOptions): UsePullToRefresh => {
  // Merge configuration
  const config: PullToRefreshConfig = { ...DEFAULT_CONFIG, ...userConfig }

  // State
  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    pullDistance: 0,
    pullProgress: 0,
    threshold: config.threshold,
    isReady: false,
    isRefreshing: false,
    maxDistance: config.maxDistance
  })

  // Refs for performance optimization
  const startYRef = useRef<number>(0)
  const currentYRef = useRef<number>(0)
  const isDraggingRef = useRef<boolean>(false)
  const lastUpdateTimeRef = useRef<number>(0)
  const refreshPromiseRef = useRef<Promise<void> | null>(null)

  // Haptic feedback
  const {
    triggerLightFeedback,
    triggerMediumFeedback,
    triggerHeavyFeedback,
    triggerSuccessFeedback,
    isSupported: hapticSupported
  } = useHapticFeedback()

  // Performance-optimized state update
  const updateStateOptimized = gesturePerformanceUtils.optimizeForFrameRate(
    useCallback((newState: Partial<PullToRefreshState>) => {
      setState(prev => ({ ...prev, ...newState }))
    }, [])
  )

  // Calculate pull progress and resistance
  const calculatePullMetrics = useCallback((pullDistance: number) => {
    const rawDistance = Math.max(0, pullDistance * config.sensitivity)
    let adjustedDistance = rawDistance

    // Apply resistance after threshold
    if (rawDistance > config.threshold) {
      const excessDistance = rawDistance - config.threshold
      const resistedExcess = excessDistance * config.resistanceAfterThreshold
      adjustedDistance = config.threshold + resistedExcess
    }

    // Cap at max distance
    adjustedDistance = Math.min(adjustedDistance, config.maxDistance)

    const progress = Math.min(adjustedDistance / config.threshold, 1)
    const isReady = adjustedDistance >= config.threshold

    return {
      adjustedDistance,
      progress,
      isReady
    }
  }, [config])

  // Touch event handlers
  const onTouchStart = useCallback((event: React.TouchEvent) => {
    if (disabled || state.isRefreshing) return

    const touch = event.touches[0]
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop

    // Only start pull-to-refresh if we're at the top of the page
    if (scrollTop > 0) return

    startYRef.current = touch.clientY
    currentYRef.current = touch.clientY
    isDraggingRef.current = true
    lastUpdateTimeRef.current = performance.now()

    updateStateOptimized({
      isPulling: true,
      pullDistance: 0,
      pullProgress: 0,
      isReady: false
    })

    // Light haptic feedback on start
    if (config.enableHaptics && hapticSupported) {
      triggerLightFeedback()
    }
  }, [disabled, state.isRefreshing, config.enableHaptics, hapticSupported, triggerLightFeedback, updateStateOptimized])

  const onTouchMove = useCallback((event: React.TouchEvent) => {
    if (!isDraggingRef.current || disabled || state.isRefreshing) return

    event.preventDefault() // Prevent page scroll

    const touch = event.touches[0]
    currentYRef.current = touch.clientY

    const rawPullDistance = currentYRef.current - startYRef.current

    // Only allow downward pulls
    if (rawPullDistance < 0) {
      return
    }

    const now = performance.now()
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current

    // Throttle updates for performance (60fps target)
    if (timeSinceLastUpdate < 16) return

    lastUpdateTimeRef.current = now

    const { adjustedDistance, progress, isReady } = calculatePullMetrics(rawPullDistance)

    // Haptic feedback at progress milestones
    if (config.enableHaptics && hapticSupported) {
      if (progress >= 0.6 && !state.isReady && isReady) {
        triggerMediumFeedback() // Ready threshold reached
      } else if (progress >= 0.3 && state.pullProgress < 0.3) {
        triggerLightFeedback() // Halfway point
      }
    }

    updateStateOptimized({
      pullDistance: adjustedDistance,
      pullProgress: progress,
      isReady
    })
  }, [
    disabled,
    state.isRefreshing,
    state.isReady,
    state.pullProgress,
    config.enableHaptics,
    hapticSupported,
    triggerLightFeedback,
    triggerMediumFeedback,
    calculatePullMetrics,
    updateStateOptimized
  ])

  const onTouchEnd = useCallback(async () => {
    if (!isDraggingRef.current) return

    isDraggingRef.current = false

    if (state.isReady && !state.isRefreshing) {
      // Trigger refresh
      updateStateOptimized({
        isRefreshing: true,
        isPulling: false
      })

      // Heavy haptic feedback for successful trigger
      if (config.enableHaptics && hapticSupported) {
        triggerHeavyFeedback()
      }

      try {
        if (!refreshPromiseRef.current) {
          refreshPromiseRef.current = onRefresh()
        }
        await refreshPromiseRef.current

        // Success haptic feedback
        if (config.enableHaptics && hapticSupported) {
          triggerSuccessFeedback()
        }
      } catch (error) {
        console.error('Pull-to-refresh failed:', error)
      } finally {
        refreshPromiseRef.current = null

        // Smooth return to initial state
        updateStateOptimized({
          isRefreshing: false,
          pullDistance: 0,
          pullProgress: 0,
          isReady: false
        })
      }
    } else {
      // Snap back to initial position
      updateStateOptimized({
        isPulling: false,
        pullDistance: 0,
        pullProgress: 0,
        isReady: false
      })
    }
  }, [
    state.isReady,
    state.isRefreshing,
    config.enableHaptics,
    hapticSupported,
    triggerHeavyFeedback,
    triggerSuccessFeedback,
    onRefresh,
    updateStateOptimized
  ])

  // Mouse event handlers (for desktop testing)
  const onMouseDown = useCallback((event: React.MouseEvent) => {
    if (disabled || state.isRefreshing) return

    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop
    if (scrollTop > 0) return

    startYRef.current = event.clientY
    currentYRef.current = event.clientY
    isDraggingRef.current = true
    lastUpdateTimeRef.current = performance.now()

    updateStateOptimized({
      isPulling: true,
      pullDistance: 0,
      pullProgress: 0,
      isReady: false
    })
  }, [disabled, state.isRefreshing, updateStateOptimized])

  const onMouseMove = useCallback((event: React.MouseEvent) => {
    if (!isDraggingRef.current || disabled || state.isRefreshing) return

    currentYRef.current = event.clientY
    const rawPullDistance = currentYRef.current - startYRef.current

    if (rawPullDistance < 0) return

    const now = performance.now()
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current

    if (timeSinceLastUpdate < 16) return

    lastUpdateTimeRef.current = now

    const { adjustedDistance, progress, isReady } = calculatePullMetrics(rawPullDistance)

    updateStateOptimized({
      pullDistance: adjustedDistance,
      pullProgress: progress,
      isReady
    })
  }, [disabled, state.isRefreshing, calculatePullMetrics, updateStateOptimized])

  const onMouseUp = useCallback(() => {
    onTouchEnd()
  }, [onTouchEnd])

  // Manual refresh trigger
  const triggerRefresh = useCallback(async () => {
    if (disabled || state.isRefreshing) return

    updateStateOptimized({
      isRefreshing: true,
      isPulling: false,
      pullDistance: 0,
      pullProgress: 0,
      isReady: false
    })

    try {
      await onRefresh()
    } finally {
      updateStateOptimized({
        isRefreshing: false
      })
    }
  }, [disabled, state.isRefreshing, onRefresh, updateStateOptimized])

  // Cancel refresh
  const cancelRefresh = useCallback(() => {
    isDraggingRef.current = false
    refreshPromiseRef.current = null

    updateStateOptimized({
      isPulling: false,
      pullDistance: 0,
      pullProgress: 0,
      isReady: false,
      isRefreshing: false
    })
  }, [updateStateOptimized])

  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<PullToRefreshConfig>) => {
    Object.assign(config, newConfig)

    updateStateOptimized({
      threshold: config.threshold,
      maxDistance: config.maxDistance
    })
  }, [config, updateStateOptimized])

  // Visual state helper
  const getVisualState = useCallback(() => {
    if (state.isRefreshing) {
      return {
        message: '🔄 Analyzing...',
        icon: '🔄',
        progress: 1,
        isAnimating: true
      }
    }

    if (state.isReady) {
      return {
        message: 'Release to refresh',
        icon: '↓',
        progress: state.pullProgress,
        isAnimating: false
      }
    }

    if (state.isPulling) {
      return {
        message: 'Pull down to re-analyze hand...',
        icon: '↓',
        progress: state.pullProgress,
        isAnimating: false
      }
    }

    return {
      message: '',
      icon: '',
      progress: 0,
      isAnimating: false
    }
  }, [state])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isDraggingRef.current = false
      refreshPromiseRef.current = null
    }
  }, [])

  return {
    // State
    state,
    config,

    // Event handlers
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onMouseDown,
    onMouseMove,
    onMouseUp,

    // Actions
    triggerRefresh,
    cancelRefresh,
    updateConfig,

    // Visual state helpers
    getVisualState
  }
}