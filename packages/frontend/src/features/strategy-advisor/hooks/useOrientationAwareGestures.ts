// Orientation-Aware Gestures Hook - Adaptive gesture handling for landscape/portrait
// Provides optimized gesture parameters and zones based on device orientation

import { useState, useCallback, useEffect, useRef } from 'react'
import type {
  UseOrientationAwareGestures,
  OrientationState
} from '../types/strategy-advisor.types'
import { gesturePerformanceUtils } from '../utils/gesture-performance'

/**
 * Hook for orientation-aware gesture handling
 * Adapts gesture parameters and zones based on device orientation changes
 */
export const useOrientationAwareGestures = (): UseOrientationAwareGestures => {
  // State
  const [orientation, setOrientation] = useState<OrientationState>(() => {
    return {
      orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
      isTransitioning: false,
      previousOrientation: null,
      dimensions: {
        width: window.innerWidth,
        height: window.innerHeight,
        aspectRatio: window.innerWidth / window.innerHeight
      }
    }
  })

  // Refs for callbacks and debouncing
  const orientationCallbacksRef = useRef<Set<(orientation: OrientationState) => void>>(new Set())
  const transitionCallbacksRef = useRef<Set<() => void>>(new Set())
  const transitionTimeoutRef = useRef<number | null>(null)

  // Debounced orientation change handler
  const handleOrientationChange = gesturePerformanceUtils.debounceGesture(
    useCallback(() => {
      const width = window.innerWidth
      const height = window.innerHeight
      const newOrientation = width > height ? 'landscape' : 'portrait'

      setOrientation(prev => {
        // Only update if orientation actually changed
        if (prev.orientation === newOrientation && !prev.isTransitioning) {
          return prev
        }

        const newState: OrientationState = {
          orientation: newOrientation,
          isTransitioning: prev.orientation !== newOrientation,
          previousOrientation: prev.orientation,
          dimensions: {
            width,
            height,
            aspectRatio: width / height
          }
        }

        // Notify orientation change callbacks
        orientationCallbacksRef.current.forEach(callback => {
          try {
            callback(newState)
          } catch (error) {
            console.error('Error in orientation change callback:', error)
          }
        })

        // Handle transition completion
        if (newState.isTransitioning) {
          if (transitionTimeoutRef.current) {
            clearTimeout(transitionTimeoutRef.current)
          }

          transitionTimeoutRef.current = window.setTimeout(() => {
            setOrientation(current => ({
              ...current,
              isTransitioning: false
            }))

            // Notify transition completion callbacks
            transitionCallbacksRef.current.forEach(callback => {
              try {
                callback()
              } catch (error) {
                console.error('Error in transition completion callback:', error)
              }
            })

            transitionTimeoutRef.current = null
          }, 300) // Allow 300ms for transition animations
        }

        return newState
      })
    }, []),
    150 // 150ms debounce for orientation changes
  )

  // Set up orientation change listeners
  useEffect(() => {
    // Modern approach with screen.orientation
    if ('screen' in window && 'orientation' in window.screen) {
      const handleScreenOrientationChange = () => {
        handleOrientationChange()
      }

      window.screen.orientation.addEventListener('change', handleScreenOrientationChange)

      return () => {
        window.screen.orientation.removeEventListener('change', handleScreenOrientationChange)
      }
    }

    // Fallback to resize listener
    const handleResize = () => {
      handleOrientationChange()
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [handleOrientationChange])

  // Get adaptive configuration based on orientation
  const getAdaptiveConfig = useCallback(<T>(
    portraitConfig: T,
    landscapeConfig: T
  ): T => {
    return orientation.orientation === 'landscape' ? landscapeConfig : portraitConfig
  }, [orientation.orientation])

  // Get orientation multiplier for gesture parameters
  const getOrientationMultiplier = useCallback((
    baseValue: number,
    landscapeMultiplier: number = 0.8
  ): number => {
    return orientation.orientation === 'landscape'
      ? baseValue * landscapeMultiplier
      : baseValue
  }, [orientation.orientation])

  // Register orientation change callback
  const onOrientationChange = useCallback((
    callback: (orientation: OrientationState) => void
  ) => {
    orientationCallbacksRef.current.add(callback)

    // Return cleanup function
    return () => {
      orientationCallbacksRef.current.delete(callback)
    }
  }, [])

  // Register transition completion callback
  const onTransitionComplete = useCallback((callback: () => void) => {
    transitionCallbacksRef.current.add(callback)

    // Return cleanup function
    return () => {
      transitionCallbacksRef.current.delete(callback)
    }
  }, [])

  // Calculate safe gesture zones for current orientation
  const getSafeGestureZones = useCallback((): DOMRect[] => {
    const { width, height } = orientation.dimensions
    const zones: DOMRect[] = []

    if (orientation.orientation === 'portrait') {
      // Portrait: full width, avoid top/bottom system UI areas
      zones.push(new DOMRect(0, 60, width, height - 120))
    } else {
      // Landscape: avoid side notches and system UI
      const safeWidth = width - 80 // Account for notches/system UI
      const safeHeight = height - 40
      zones.push(new DOMRect(40, 20, safeWidth, safeHeight))
    }

    return zones
  }, [orientation])

  // Calculate thumb-reachable area for one-handed use
  const getThumbReachableArea = useCallback((): DOMRect[] => {
    const { width, height } = orientation.dimensions
    const areas: DOMRect[] = []

    if (orientation.orientation === 'portrait') {
      // Portrait: bottom 2/3 of screen, slightly curved
      const reachableHeight = height * 0.67
      const reachableWidth = width * 0.85
      const offsetX = width * 0.075 // Slight offset for natural thumb arc

      areas.push(new DOMRect(
        offsetX,
        height - reachableHeight,
        reachableWidth,
        reachableHeight
      ))
    } else {
      // Landscape: side areas for left/right thumb use
      const reachableHeight = height * 0.8
      const reachableWidth = width * 0.4
      const centerY = height * 0.1

      // Left thumb area
      areas.push(new DOMRect(0, centerY, reachableWidth, reachableHeight))

      // Right thumb area
      areas.push(new DOMRect(
        width - reachableWidth,
        centerY,
        reachableWidth,
        reachableHeight
      ))
    }

    return areas
  }, [orientation])

  // Cleanup on unmount
  useEffect(() => {
    const timeoutId = transitionTimeoutRef.current
    const orientationCallbacks = orientationCallbacksRef.current
    const transitionCallbacks = transitionCallbacksRef.current

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      orientationCallbacks.clear()
      transitionCallbacks.clear()
    }
  }, [])

  return {
    // State
    orientation,

    // Adaptive configuration
    getAdaptiveConfig,
    getOrientationMultiplier,

    // Event handling
    onOrientationChange,
    onTransitionComplete,

    // Gesture zone calculations
    getSafeGestureZones,
    getThumbReachableArea
  }
}

// Utility hook for orientation-specific gesture parameters
export const useOrientationGestureParams = () => {
  const { orientation, getAdaptiveConfig, getOrientationMultiplier } = useOrientationAwareGestures()

  // Pull-to-refresh parameters
  const pullToRefreshParams = getAdaptiveConfig(
    {
      // Portrait
      threshold: 80,
      maxDistance: 120,
      sensitivity: 1.0
    },
    {
      // Landscape
      threshold: 60,
      maxDistance: 100,
      sensitivity: 0.8
    }
  )

  // Swipe gesture parameters
  const swipeParams = getAdaptiveConfig(
    {
      // Portrait
      velocityThreshold: 0.5,
      distanceThreshold: 50,
      maxCardWidth: 320
    },
    {
      // Landscape
      velocityThreshold: 0.4,
      distanceThreshold: 40,
      maxCardWidth: 280
    }
  )

  // Long-press parameters
  const longPressParams = getAdaptiveConfig(
    {
      // Portrait
      hintThreshold: 300,
      detailsThreshold: 600,
      maxMoveDistance: 10
    },
    {
      // Landscape
      hintThreshold: 250, // Faster in landscape
      detailsThreshold: 500,
      maxMoveDistance: 15 // More tolerant of movement
    }
  )

  // Touch target sizes
  const touchTargets = getAdaptiveConfig(
    {
      // Portrait
      minSize: 44,
      preferredSize: 48,
      spacing: 8
    },
    {
      // Landscape
      minSize: 40, // Slightly smaller for more content
      preferredSize: 44,
      spacing: 6
    }
  )

  return {
    orientation: orientation.orientation,
    isTransitioning: orientation.isTransitioning,
    pullToRefreshParams,
    swipeParams,
    longPressParams,
    touchTargets,
    getMultiplier: getOrientationMultiplier
  }
}

// Hook for orientation-aware layout calculations
export const useOrientationLayout = () => {
  const { orientation, getSafeGestureZones, getThumbReachableArea } = useOrientationAwareGestures()

  const layoutParams = {
    // Grid calculations
    getGridColumns: () => {
      return orientation.orientation === 'landscape' ? 2 : 1
    },

    // Pattern carousel sizing
    getCarouselCardWidth: () => {
      const baseWidth = orientation.dimensions.width * 0.85
      return orientation.orientation === 'landscape'
        ? Math.min(baseWidth / 2, 300)
        : Math.min(baseWidth, 320)
    },

    // Safe areas for UI elements
    getSafeAreas: () => {
      if (orientation.orientation === 'portrait') {
        return {
          top: 60, // Status bar + notch
          bottom: 80, // Home indicator + tab bar
          left: 0,
          right: 0
        }
      } else {
        return {
          top: 20,
          bottom: 20,
          left: 40, // Notch area
          right: 40
        }
      }
    },

    // Content spacing
    getContentSpacing: () => {
      return orientation.orientation === 'landscape' ? 16 : 24
    }
  }

  return {
    ...layoutParams,
    orientation: orientation.orientation,
    dimensions: orientation.dimensions,
    safeGestureZones: getSafeGestureZones(),
    thumbReachableAreas: getThumbReachableArea()
  }
}