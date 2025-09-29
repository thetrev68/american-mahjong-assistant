// Long Press Gesture Hook - Progressive disclosure for pattern details
// Provides tap-and-hold functionality with stage-based haptic feedback

import { useState, useCallback, useRef, useEffect } from 'react'
import type {
  UseLongPress,
  LongPressState,
  LongPressConfig
} from '../types/strategy-advisor.types'
import { useHapticFeedback } from './useHapticFeedback'
import { gesturePerformanceUtils } from '../utils/gesture-performance'

interface UseLongPressOptions {
  config?: Partial<LongPressConfig>
  disabled?: boolean
  onHint?: () => void
  onDetails?: () => void
  onCancel?: () => void
}

// Default configuration optimized for pattern details
const DEFAULT_CONFIG: LongPressConfig = {
  hintThreshold: 300, // ms for initial hint
  detailsThreshold: 600, // ms for full details
  enableHaptics: true,
  enableVisualFeedback: true,
  cancelOnMove: true,
  maxMoveDistance: 10 // px before canceling
}

/**
 * Hook for long-press gesture with progressive disclosure
 * Provides stages: hint (300ms) → details (600ms) → holding
 */
export const useLongPress = ({
  config: userConfig = {},
  disabled = false,
  onHint,
  onDetails,
  onCancel
}: UseLongPressOptions = {}): UseLongPress => {
  // Merge configuration
  const config: LongPressConfig = { ...DEFAULT_CONFIG, ...userConfig }

  // State
  const [state, setState] = useState<LongPressState>({
    isPressed: false,
    startTime: 0,
    currentTime: 0,
    progress: 0,
    stage: 'none',
    position: { x: 0, y: 0 }
  })

  // Refs for performance and tracking
  const pointerIdRef = useRef<number | null>(null)
  const startPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const animationFrameRef = useRef<number | null>(null)
  const hintTriggeredRef = useRef<boolean>(false)
  const detailsTriggeredRef = useRef<boolean>(false)

  // Callbacks refs for dynamic updates
  const onHintRef = useRef<(() => void) | undefined>(onHint)
  const onDetailsRef = useRef<(() => void) | undefined>(onDetails)
  const onCancelRef = useRef<(() => void) | undefined>(onCancel)

  // Update callback refs
  useEffect(() => {
    onHintRef.current = onHint
    onDetailsRef.current = onDetails
    onCancelRef.current = onCancel
  }, [onHint, onDetails, onCancel])

  // Haptic feedback
  const {
    triggerLightFeedback,
    triggerMediumFeedback,
    triggerHeavyFeedback,
    isSupported: hapticSupported
  } = useHapticFeedback()

  // Performance-optimized state update
  const updateStateOptimized = gesturePerformanceUtils.optimizeForFrameRate(
    useCallback((newState: Partial<LongPressState>) => {
      setState(prev => ({ ...prev, ...newState }))
    }, [])
  )

  // Calculate progress and stage
  const calculateProgress = useCallback((currentTime: number, startTime: number) => {
    const elapsed = currentTime - startTime
    const hintProgress = Math.min(elapsed / config.hintThreshold, 1)
    const detailsProgress = Math.min(elapsed / config.detailsThreshold, 1)

    let stage: LongPressState['stage'] = 'none'
    let progress = 0

    if (elapsed >= config.detailsThreshold) {
      stage = 'holding'
      progress = 1
    } else if (elapsed >= config.hintThreshold) {
      stage = 'details'
      progress = detailsProgress
    } else if (elapsed > 0) {
      stage = 'hint'
      progress = hintProgress
    }

    return { elapsed, progress, stage }
  }, [config.hintThreshold, config.detailsThreshold])

  // Animation loop for progress tracking
  const updateProgress = useCallback(() => {
    if (!state.isPressed) return

    const currentTime = performance.now()
    const { elapsed, progress, stage } = calculateProgress(currentTime, state.startTime)

    // Trigger haptic feedback at stage transitions
    if (config.enableHaptics && hapticSupported) {
      if (elapsed >= config.hintThreshold && !hintTriggeredRef.current) {
        triggerLightFeedback()
        hintTriggeredRef.current = true
        onHintRef.current?.()
      }

      if (elapsed >= config.detailsThreshold && !detailsTriggeredRef.current) {
        triggerMediumFeedback()
        detailsTriggeredRef.current = true
        onDetailsRef.current?.()
      }
    }

    updateStateOptimized({
      currentTime,
      progress,
      stage
    })

    // Continue animation loop
    animationFrameRef.current = requestAnimationFrame(updateProgress)
  }, [
    state.isPressed,
    state.startTime,
    config.enableHaptics,
    config.hintThreshold,
    config.detailsThreshold,
    hapticSupported,
    triggerLightFeedback,
    triggerMediumFeedback,
    calculateProgress,
    updateStateOptimized
  ])

  // Check if pointer movement cancels the gesture
  const checkMovementCancel = useCallback((x: number, y: number): boolean => {
    if (!config.cancelOnMove) return false

    const deltaX = Math.abs(x - startPositionRef.current.x)
    const deltaY = Math.abs(y - startPositionRef.current.y)
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    return distance > config.maxMoveDistance
  }, [config.cancelOnMove, config.maxMoveDistance])

  // Pointer event handlers
  const onPointerDown = useCallback((event: React.PointerEvent) => {
    if (disabled) return

    // Capture the pointer
    event.currentTarget.setPointerCapture(event.pointerId)

    const startTime = performance.now()
    const position = { x: event.clientX, y: event.clientY }

    pointerIdRef.current = event.pointerId
    startPositionRef.current = position
    hintTriggeredRef.current = false
    detailsTriggeredRef.current = false

    updateStateOptimized({
      isPressed: true,
      startTime,
      currentTime: startTime,
      progress: 0,
      stage: 'none',
      position
    })

    // Start progress tracking
    animationFrameRef.current = requestAnimationFrame(updateProgress)

    // Initial haptic feedback
    if (config.enableHaptics && hapticSupported) {
      triggerLightFeedback()
    }
  }, [
    disabled,
    config.enableHaptics,
    hapticSupported,
    triggerLightFeedback,
    updateStateOptimized,
    updateProgress
  ])

  const onPointerMove = useCallback((event: React.PointerEvent) => {
    if (!state.isPressed || event.pointerId !== pointerIdRef.current) return

    const currentPosition = { x: event.clientX, y: event.clientY }

    // Check if movement should cancel the gesture
    if (checkMovementCancel(currentPosition.x, currentPosition.y)) {
      cancel()
      return
    }

    updateStateOptimized({
      position: currentPosition
    })
  }, [state.isPressed, checkMovementCancel, updateStateOptimized])

  const onPointerUp = useCallback((event: React.PointerEvent) => {
    if (!state.isPressed || event.pointerId !== pointerIdRef.current) return

    // Release pointer capture
    event.currentTarget.releasePointerCapture(event.pointerId)

    // Final haptic feedback based on stage reached
    if (config.enableHaptics && hapticSupported) {
      if (state.stage === 'holding') {
        triggerHeavyFeedback() // Completed long press
      } else if (state.stage === 'details') {
        triggerMediumFeedback() // Partial long press
      }
    }

    // Reset state
    pointerIdRef.current = null
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    updateStateOptimized({
      isPressed: false,
      progress: 0,
      stage: 'none'
    })
  }, [
    state.isPressed,
    state.stage,
    config.enableHaptics,
    hapticSupported,
    triggerMediumFeedback,
    triggerHeavyFeedback,
    updateStateOptimized
  ])

  const onPointerCancel = useCallback((event: React.PointerEvent) => {
    if (!state.isPressed || event.pointerId !== pointerIdRef.current) return

    cancel()
  }, [state.isPressed])

  // Cancel gesture
  const cancel = useCallback(() => {
    if (!state.isPressed) return

    // Cancel haptic feedback
    if (config.enableHaptics && hapticSupported) {
      triggerLightFeedback() // Light feedback for cancellation
    }

    // Reset state
    pointerIdRef.current = null
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    updateStateOptimized({
      isPressed: false,
      progress: 0,
      stage: 'none'
    })

    onCancelRef.current?.()
  }, [
    state.isPressed,
    config.enableHaptics,
    hapticSupported,
    triggerLightFeedback,
    updateStateOptimized
  ])

  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<LongPressConfig>) => {
    Object.assign(config, newConfig)
  }, [config])

  // Callback registration methods
  const onHintCallback = useCallback((callback: () => void) => {
    onHintRef.current = callback
  }, [])

  const onDetailsCallback = useCallback((callback: () => void) => {
    onDetailsRef.current = callback
  }, [])

  const onCancelCallback = useCallback((callback: () => void) => {
    onCancelRef.current = callback
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return {
    // State
    state,
    config,

    // Event handlers
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,

    // Actions
    cancel,
    updateConfig,

    // Callbacks registration
    onHint: onHintCallback,
    onDetails: onDetailsCallback,
    onCancel: onCancelCallback
  }
}

// Utility function for long-press pattern detection
export const isLongPressPattern = (
  startTime: number,
  endTime: number,
  threshold: number = 600
): boolean => {
  return (endTime - startTime) >= threshold
}

// Hook for pattern-specific long press with automatic details
export const usePatternLongPress = (
  patternId: string,
  onShowDetails: (patternId: string) => void,
  onHideDetails: () => void
) => {
  const longPress = useLongPress({
    config: {
      hintThreshold: 300,
      detailsThreshold: 600,
      enableHaptics: true,
      enableVisualFeedback: true
    },
    onHint: () => {
      // Visual hint that details are available
    },
    onDetails: () => {
      onShowDetails(patternId)
    },
    onCancel: () => {
      onHideDetails()
    }
  })

  return {
    ...longPress,
    isShowingHint: longPress.state.stage === 'hint',
    isShowingDetails: longPress.state.stage === 'details' || longPress.state.stage === 'holding'
  }
}