// Haptic Feedback Hook - Cross-platform haptic feedback system
// Provides consistent haptic feedback across mobile devices and browsers

import { useState, useCallback, useEffect, useRef } from 'react'
import type {
  HapticPattern,
  UseHapticFeedback,
  GestureType,
  PullToRefreshAction,
  LongPressAction,
  PatternSwipeAction,
  TileInteractionAction,
  GestureConflictAction
} from '../types/strategy-advisor.types'

// Extended window interface for haptic feedback capabilities
interface WindowWithHaptics extends Window {
  hapticEngine: {
    impactOccurred: (intensity: 'light' | 'medium' | 'heavy') => void
  }
}

interface WindowWithAndroidHaptics extends Window {
  AndroidHaptics: {
    vibrate: (duration: number, intensity: number) => void
  }
}

// Haptic feedback intensity mapping for different patterns
const HAPTIC_INTENSITIES: Record<HapticPattern, number> = {
  light: 1,
  medium: 50,
  heavy: 100,
  success: 25,
  warning: 75,
  error: 100,
  selection: 15
}

// Gesture-specific haptic patterns (Phase 4 enhancement)
const GESTURE_HAPTIC_PATTERNS = {
  // Pull-to-refresh gesture patterns
  'pull-to-refresh': {
    start: 'light' as HapticPattern,
    progress: 'light' as HapticPattern,
    ready: 'medium' as HapticPattern,
    trigger: 'heavy' as HapticPattern,
    success: 'success' as HapticPattern,
    cancel: 'light' as HapticPattern
  },

  // Long-press gesture patterns
  'long-press': {
    start: 'light' as HapticPattern,
    hint: 'light' as HapticPattern,
    details: 'medium' as HapticPattern,
    complete: 'heavy' as HapticPattern,
    cancel: 'light' as HapticPattern
  },

  // Pattern carousel swipe patterns
  'pattern-swipe': {
    start: 'selection' as HapticPattern,
    navigate: 'selection' as HapticPattern,
    snap: 'medium' as HapticPattern,
    edge: 'warning' as HapticPattern,
    switch: 'success' as HapticPattern
  },

  // Tile interaction patterns
  'tile-interaction': {
    select: 'selection' as HapticPattern,
    deselect: 'light' as HapticPattern,
    drag: 'light' as HapticPattern,
    drop: 'medium' as HapticPattern,
    invalid: 'warning' as HapticPattern,
    conflict: 'error' as HapticPattern
  },

  // Gesture conflict patterns
  'gesture-conflict': {
    blocked: 'warning' as HapticPattern,
    resolved: 'light' as HapticPattern,
    priority: 'medium' as HapticPattern
  }
} as const

// Haptic feedback duration mapping (in milliseconds)
const HAPTIC_DURATIONS: Record<HapticPattern, number> = {
  light: 10,
  medium: 20,
  heavy: 50,
  success: 30,
  warning: 40,
  error: 60,
  selection: 15
}

// Web Vibration API patterns
const VIBRATION_PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 50,
  medium: 100,
  heavy: 200,
  success: [50, 50, 100],
  warning: [100, 50, 100],
  error: [200, 100, 200],
  selection: 25
}

/**
 * Hook for cross-platform haptic feedback
 * Supports both native mobile haptics and web vibration API fallback
 */
export const useHapticFeedback = (): UseHapticFeedback => {
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    // Check user preferences in localStorage
    const stored = localStorage.getItem('haptic-feedback-enabled')
    return stored !== null ? JSON.parse(stored) : true
  })

  const lastFeedbackRef = useRef<number>(0)
  const feedbackQueueRef = useRef<HapticPattern[]>([])
  const isProcessingQueueRef = useRef<boolean>(false)

  // Capability detection
  const isSupported = 'vibrate' in navigator ||
    'hapticEngine' in window ||
    'DeviceMotionEvent' in window

  // Save enabled state to localStorage
  useEffect(() => {
    localStorage.setItem('haptic-feedback-enabled', JSON.stringify(isEnabled))
  }, [isEnabled])

  // Core haptic feedback implementation (declare before processQueue to avoid circular dependency)
  const performHapticFeedback = useCallback(async (pattern: HapticPattern): Promise<void> => {
    if (!isEnabled || !isSupported) {
      return
    }

    const now = Date.now()

    // Throttle rapid-fire haptics (prevent more than 20 per second)
    if (now - lastFeedbackRef.current < 50) {
      return
    }

    lastFeedbackRef.current = now

    try {
      // Try native iOS haptic feedback first (most precise)
      if ('hapticEngine' in window && typeof (window as WindowWithHaptics).hapticEngine?.impactOccurred === 'function') {
        const intensity = HAPTIC_INTENSITIES[pattern]
        if (intensity <= 25) {
          (window as WindowWithHaptics).hapticEngine.impactOccurred('light')
        } else if (intensity <= 75) {
          (window as WindowWithHaptics).hapticEngine.impactOccurred('medium')
        } else {
          (window as WindowWithHaptics).hapticEngine.impactOccurred('heavy')
        }
        return
      }

      // Try Android haptic feedback (requires special bridge)
      if ('AndroidHaptics' in window && typeof (window as WindowWithAndroidHaptics).AndroidHaptics?.vibrate === 'function') {
        const duration = HAPTIC_DURATIONS[pattern]
        const intensity = HAPTIC_INTENSITIES[pattern]
        const androidWindow = window as WindowWithAndroidHaptics
        androidWindow.AndroidHaptics.vibrate(duration, intensity)
        return
      }

      // Fallback to Web Vibration API
      if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
        const vibrationPattern = VIBRATION_PATTERNS[pattern]
        navigator.vibrate(vibrationPattern)
        return
      }

      // Last resort: audio-based tactile feedback for accessibility
      if ('AudioContext' in window) {
        const audioContext = new AudioContext()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        // Low frequency for tactile sensation
        oscillator.frequency.setValueAtTime(80, audioContext.currentTime)
        gainNode.gain.setValueAtTime(0.01, audioContext.currentTime) // Very quiet

        oscillator.start()
        oscillator.stop(audioContext.currentTime + HAPTIC_DURATIONS[pattern] / 1000)
      }

    } catch (error) {
      console.warn('Haptic feedback failed:', error)
    }
  }, [isEnabled, isSupported])

  // Process feedback queue to prevent overlapping haptics
  const processQueue = useCallback(async () => {
    if (isProcessingQueueRef.current || feedbackQueueRef.current.length === 0) {
      return
    }

    isProcessingQueueRef.current = true

    while (feedbackQueueRef.current.length > 0) {
      const pattern = feedbackQueueRef.current.shift()
      if (pattern) {
        await performHapticFeedback(pattern)
        // Small delay between haptic events
        await new Promise(resolve => setTimeout(resolve, 50))
      }
    }

    isProcessingQueueRef.current = false
  }, [performHapticFeedback])

  // Main trigger function with queuing support
  const triggerFeedback = useCallback((pattern: HapticPattern) => {
    if (!isEnabled || !isSupported) {
      return
    }

    // Add to queue if processing, otherwise execute immediately
    if (isProcessingQueueRef.current) {
      feedbackQueueRef.current.push(pattern)
    } else {
      feedbackQueueRef.current.push(pattern)
      processQueue()
    }
  }, [isEnabled, isSupported, processQueue])

  // Convenience methods for common patterns
  const triggerLightFeedback = useCallback(() => {
    triggerFeedback('light')
  }, [triggerFeedback])

  const triggerMediumFeedback = useCallback(() => {
    triggerFeedback('medium')
  }, [triggerFeedback])

  const triggerHeavyFeedback = useCallback(() => {
    triggerFeedback('heavy')
  }, [triggerFeedback])

  const triggerSuccessFeedback = useCallback(() => {
    triggerFeedback('success')
  }, [triggerFeedback])

  const triggerWarningFeedback = useCallback(() => {
    triggerFeedback('warning')
  }, [triggerFeedback])

  const triggerErrorFeedback = useCallback(() => {
    triggerFeedback('error')
  }, [triggerFeedback])

  const triggerSelectionFeedback = useCallback(() => {
    triggerFeedback('selection')
  }, [triggerFeedback])

  // Phase 4 enhancement: Gesture-specific haptic feedback
  const triggerGestureFeedback = useCallback((
    gestureType: GestureType,
    action: string
  ) => {
    const gesturePatterns = GESTURE_HAPTIC_PATTERNS[gestureType]
    if (!gesturePatterns) {
      console.warn(`Unknown gesture type: ${gestureType}`)
      return
    }

    const pattern = gesturePatterns[action as keyof typeof gesturePatterns]
    if (!pattern) {
      console.warn(`Unknown action '${action}' for gesture type '${gestureType}'`)
      return
    }

    triggerFeedback(pattern)
  }, [triggerFeedback])

  // Convenient gesture-specific methods
  const triggerPullToRefreshFeedback = useCallback((action: PullToRefreshAction) => {
    triggerGestureFeedback('pull-to-refresh', action)
  }, [triggerGestureFeedback])

  const triggerLongPressFeedback = useCallback((action: LongPressAction) => {
    triggerGestureFeedback('long-press', action)
  }, [triggerGestureFeedback])

  const triggerPatternSwipeFeedback = useCallback((action: PatternSwipeAction) => {
    triggerGestureFeedback('pattern-swipe', action)
  }, [triggerGestureFeedback])

  const triggerTileInteractionFeedback = useCallback((action: TileInteractionAction) => {
    triggerGestureFeedback('tile-interaction', action)
  }, [triggerGestureFeedback])

  const triggerGestureConflictFeedback = useCallback((action: GestureConflictAction) => {
    triggerGestureFeedback('gesture-conflict', action)
  }, [triggerGestureFeedback])

  const setEnabledWithFeedback = useCallback((enabled: boolean) => {
    setIsEnabled(enabled)

    // Provide feedback when enabling/disabling
    if (enabled && isSupported) {
      setTimeout(() => triggerSuccessFeedback(), 100)
    }
  }, [isSupported, triggerSuccessFeedback])

  return {
    // Capability detection
    isSupported,

    // Basic feedback methods
    triggerFeedback,
    triggerLightFeedback,
    triggerMediumFeedback,
    triggerHeavyFeedback,
    triggerSuccessFeedback,
    triggerWarningFeedback,
    triggerErrorFeedback,
    triggerSelectionFeedback,

    // Phase 4: Gesture-specific feedback methods
    triggerGestureFeedback,
    triggerPullToRefreshFeedback,
    triggerLongPressFeedback,
    triggerPatternSwipeFeedback,
    triggerTileInteractionFeedback,
    triggerGestureConflictFeedback,

    // Settings
    isEnabled,
    setEnabled: setEnabledWithFeedback
  }
}

// Utility functions for haptic feedback patterns

/**
 * Create a sequence of haptic feedback patterns
 */
export const createHapticSequence = (patterns: HapticPattern[], delay: number = 100) => {
  return async (triggerFeedback: (pattern: HapticPattern) => void) => {
    for (let i = 0; i < patterns.length; i++) {
      triggerFeedback(patterns[i])
      if (i < patterns.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
}

/**
 * Pattern for successful pattern switch
 */
export const patternSwitchSuccessSequence = createHapticSequence(['selection', 'success'], 150)

/**
 * Pattern for failed pattern switch
 */
export const patternSwitchErrorSequence = createHapticSequence(['warning', 'error'], 100)

/**
 * Pattern for carousel navigation
 */
export const carouselNavigationSequence = createHapticSequence(['light'], 0)

/**
 * Pattern for priority indication
 */
export const priorityIndicationSequence = (priority: 'pursue' | 'backup' | 'risky' | 'dead') => {
  switch (priority) {
    case 'pursue':
      return createHapticSequence(['success'], 0)
    case 'backup':
      return createHapticSequence(['medium'], 0)
    case 'risky':
      return createHapticSequence(['warning'], 0)
    case 'dead':
      return createHapticSequence(['error'], 0)
    default:
      return createHapticSequence(['light'], 0)
  }
}