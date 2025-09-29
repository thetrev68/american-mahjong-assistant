// Carousel Swipe Hook - High-performance swipe navigation for pattern carousel
// Provides smooth 60fps touch/mouse interactions with haptic feedback

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import type {
  UseCarouselSwipe,
  SwipeGestureState,
  CarouselState,
  ActionPatternData
} from '../types/strategy-advisor.types'
import { useHapticFeedback } from './useHapticFeedback'
import { useLongPress } from './useLongPress'
import { useGestureConflictAvoidance } from './useGestureConflictAvoidance'
import { gesturePerformanceUtils } from '../utils/gesture-performance'
import {
  calculateVelocity,
  shouldSnapToNextPattern,
  calculateAnimationDuration,
  cancelAnimationFrame,
  ANIMATION_CONFIG
} from '../utils/pattern-carousel-utils'

interface UseCarouselSwipeOptions {
  patterns: ActionPatternData[]
  initialIndex?: number
  cardWidth?: number
  enableHapticFeedback?: boolean
  enableLongPress?: boolean
  onPatternChange?: (index: number, pattern: ActionPatternData) => void
  onSwipeStart?: () => void
  onSwipeEnd?: () => void
  onPatternLongPress?: (patternId: string) => void
  onPatternDetails?: (patternId: string) => void
}

/**
 * Hook for high-performance carousel swipe navigation
 * Optimized for mobile-first touch interactions with 60fps animations
 */
export const useCarouselSwipe = ({
  patterns,
  initialIndex = 0,
  cardWidth = 320,
  enableHapticFeedback = true,
  enableLongPress = true,
  onPatternChange,
  onSwipeStart,
  onSwipeEnd,
  onPatternLongPress: _onPatternLongPress,
  onPatternDetails
}: UseCarouselSwipeOptions): UseCarouselSwipe => {
  // State
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [isAnimating, setIsAnimating] = useState(false)

  // Swipe gesture state
  const [swipeState, setSwipeState] = useState<SwipeGestureState>({
    isDragging: false,
    startX: 0,
    currentX: 0,
    deltaX: 0,
    velocity: 0,
    direction: null
  })

  // Refs for performance optimization
  const lastPositionRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const velocityHistoryRef = useRef<number[]>([])
  const animationIdRef = useRef<number | null>(null)
  const isDraggingRef = useRef<boolean>(false)

  // Phase 4 enhancements: Enhanced haptic feedback
  const {
    triggerPatternSwipeFeedback,
    isSupported: hapticSupported
  } = useHapticFeedback()

  // Phase 4: Gesture conflict avoidance
  const conflictAvoidance = useGestureConflictAvoidance()

  // Phase 4: Long-press for pattern details
  const longPress = useLongPress({
    config: {
      hintThreshold: 300,
      detailsThreshold: 600,
      enableHaptics: enableHapticFeedback,
      enableVisualFeedback: true,
      cancelOnMove: true,
      maxMoveDistance: 15
    },
    disabled: !enableLongPress,
    onHint: () => {
      // Visual hint that details are available
      if (enableHapticFeedback && hapticSupported) {
        triggerPatternSwipeFeedback('start')
      }
    },
    onDetails: () => {
      const currentPattern = patterns[currentIndex]
      if (currentPattern) {
        onPatternDetails?.(currentPattern.id)
        if (enableHapticFeedback && hapticSupported) {
          triggerPatternSwipeFeedback('switch')
        }
      }
    },
    onCancel: () => {
      // Long press was cancelled
    }
  })

  // Constraints
  const maxIndex = patterns.length - 1
  const minIndex = 0

  // Carousel state
  const carouselState: CarouselState = useMemo(() => ({
    currentIndex,
    totalPatterns: patterns.length,
    isAnimating,
    canSwipeLeft: currentIndex > minIndex,
    canSwipeRight: currentIndex < maxIndex,
    snapToIndex: (index: number) => goToPattern(index),
    nextPattern: () => nextPattern(),
    previousPattern: () => previousPattern()
  }), [currentIndex, patterns.length, isAnimating])

  // Phase 4: Performance-optimized velocity update
  const updateVelocity = gesturePerformanceUtils.optimizeForFrameRate(
    useCallback((currentX: number, timestamp: number) => {
      const timeDelta = timestamp - lastTimeRef.current

      if (timeDelta > 0) {
        const velocity = calculateVelocity(currentX, lastPositionRef.current, timeDelta)
        velocityHistoryRef.current.push(velocity)

        // Keep only recent velocity samples for smoothing
        if (velocityHistoryRef.current.length > 5) {
          velocityHistoryRef.current.shift()
        }

        // Calculate average velocity for smoother gesture recognition
        const avgVelocity = velocityHistoryRef.current.reduce((sum, v) => sum + v, 0) / velocityHistoryRef.current.length

        setSwipeState(prev => ({
          ...prev,
          currentX,
          deltaX: currentX - prev.startX,
          velocity: avgVelocity,
          direction: avgVelocity > 0.1 ? 'right' : avgVelocity < -0.1 ? 'left' : null
        }))
      }

      lastPositionRef.current = currentX
      lastTimeRef.current = timestamp
    }, [])
  )

  // Phase 4: Enhanced throttling for smooth 60fps
  const throttledVelocityUpdate = useMemo(() =>
    gesturePerformanceUtils.throttleGesture(updateVelocity, 16), // 60fps target
    [updateVelocity]
  )

  // Phase 4: Enhanced touch event handlers with conflict avoidance
  const onTouchStart = useCallback((event: React.TouchEvent) => {
    if (patterns.length <= 1) return

    // Phase 4: Check for gesture conflicts
    if (!conflictAvoidance.canActivateGesture('pattern-swipe', {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY
    })) {
      return
    }

    const touch = event.touches[0]
    const startX = touch.clientX
    const timestamp = Date.now()

    // Phase 4: Register gesture start
    conflictAvoidance.notifyGestureStart('pattern-swipe', event.currentTarget as HTMLElement)

    isDraggingRef.current = true
    lastPositionRef.current = startX
    lastTimeRef.current = timestamp
    velocityHistoryRef.current = []

    setSwipeState({
      isDragging: true,
      startX,
      currentX: startX,
      deltaX: 0,
      velocity: 0,
      direction: null
    })

    // Phase 4: Enhanced haptic feedback
    if (enableHapticFeedback && hapticSupported) {
      triggerPatternSwipeFeedback('start')
    }

    // Phase 4: Start long-press detection
    if (enableLongPress) {
      longPress.onPointerDown({
        ...event,
        pointerId: 0,
        clientX: touch.clientX,
        clientY: touch.clientY
      } as React.PointerEvent)
    }

    onSwipeStart?.()
  }, [
    patterns.length,
    enableHapticFeedback,
    enableLongPress,
    hapticSupported,
    triggerPatternSwipeFeedback,
    conflictAvoidance,
    longPress,
    onSwipeStart
  ])

  const onTouchMove = useCallback((event: React.TouchEvent) => {
    if (!isDraggingRef.current || patterns.length <= 1) return

    event.preventDefault() // Prevent scrolling

    const touch = event.touches[0]
    const currentX = touch.clientX
    const timestamp = Date.now()

    // Phase 4: Update long-press tracking
    if (enableLongPress && longPress.state.isPressed) {
      longPress.onPointerMove({
        ...event,
        pointerId: 0,
        clientX: touch.clientX,
        clientY: touch.clientY
      } as React.PointerEvent)
    }

    throttledVelocityUpdate(currentX, timestamp)
  }, [patterns.length, enableLongPress, longPress, throttledVelocityUpdate])

  const onTouchEnd = useCallback((event: React.TouchEvent) => {
    if (!isDraggingRef.current || patterns.length <= 1) return

    isDraggingRef.current = false

    // Phase 4: End long-press tracking
    if (enableLongPress && longPress.state.isPressed) {
      longPress.onPointerUp({
        ...event,
        pointerId: 0,
        clientX: event.changedTouches[0].clientX,
        clientY: event.changedTouches[0].clientY
      } as React.PointerEvent)
    }

    // Phase 4: Notify gesture end
    conflictAvoidance.notifyGestureEnd('pattern-swipe')

    const { shouldSnap, direction } = shouldSnapToNextPattern(swipeState, cardWidth)

    if (shouldSnap && direction) {
      if (direction === 'left' && currentIndex < maxIndex) {
        // Phase 4: Enhanced haptic feedback for navigation
        if (enableHapticFeedback && hapticSupported) {
          triggerPatternSwipeFeedback('navigate')
        }
        nextPattern()
      } else if (direction === 'right' && currentIndex > minIndex) {
        if (enableHapticFeedback && hapticSupported) {
          triggerPatternSwipeFeedback('navigate')
        }
        previousPattern()
      } else {
        // Snap back to current position
        if (enableHapticFeedback && hapticSupported) {
          triggerPatternSwipeFeedback('edge')
        }
        snapToCurrentPosition()
      }
    } else {
      // Snap back to current position
      snapToCurrentPosition()
    }

    setSwipeState(prev => ({
      ...prev,
      isDragging: false,
      deltaX: 0,
      velocity: 0,
      direction: null
    }))

    onSwipeEnd?.()
  }, [
    swipeState,
    cardWidth,
    currentIndex,
    maxIndex,
    minIndex,
    enableLongPress,
    enableHapticFeedback,
    hapticSupported,
    longPress,
    conflictAvoidance,
    triggerPatternSwipeFeedback,
    onSwipeEnd
  ])

  // Mouse event handlers (for desktop testing)
  const onMouseDown = useCallback((event: React.MouseEvent) => {
    if (patterns.length <= 1) return

    const startX = event.clientX
    const timestamp = Date.now()

    isDraggingRef.current = true
    lastPositionRef.current = startX
    lastTimeRef.current = timestamp
    velocityHistoryRef.current = []

    setSwipeState({
      isDragging: true,
      startX,
      currentX: startX,
      deltaX: 0,
      velocity: 0,
      direction: null
    })

    onSwipeStart?.()
  }, [patterns.length, onSwipeStart])

  const onMouseMove = useCallback((event: React.MouseEvent) => {
    if (!isDraggingRef.current || patterns.length <= 1) return

    const currentX = event.clientX
    const timestamp = Date.now()

    throttledVelocityUpdate(currentX, timestamp)
  }, [patterns.length, throttledVelocityUpdate])

  const onMouseUp = useCallback((_event: React.MouseEvent) => {
    if (!isDraggingRef.current || patterns.length <= 1) return

    isDraggingRef.current = false

    const { shouldSnap, direction } = shouldSnapToNextPattern(swipeState, cardWidth)

    if (shouldSnap && direction) {
      if (direction === 'left' && currentIndex < maxIndex) {
        nextPattern()
      } else if (direction === 'right' && currentIndex > minIndex) {
        previousPattern()
      } else {
        snapToCurrentPosition()
      }
    } else {
      snapToCurrentPosition()
    }

    setSwipeState(prev => ({
      ...prev,
      isDragging: false,
      deltaX: 0,
      velocity: 0,
      direction: null
    }))

    onSwipeEnd?.()
  }, [swipeState, cardWidth, currentIndex, maxIndex, minIndex, onSwipeEnd])

  // Keyboard navigation
  const onKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (patterns.length <= 1) return

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault()
        previousPattern()
        break
      case 'ArrowRight':
        event.preventDefault()
        nextPattern()
        break
      case 'Home':
        event.preventDefault()
        goToPattern(0)
        break
      case 'End':
        event.preventDefault()
        goToPattern(maxIndex)
        break
    }
  }, [patterns.length, maxIndex])

  // Phase 4: Enhanced navigation functions with better haptic feedback
  const goToPattern = useCallback((index: number) => {
    if (index === currentIndex || isAnimating || index < 0 || index > maxIndex) {
      return
    }

    setIsAnimating(true)

    // Calculate animation duration based on distance
    const distance = Math.abs(index - currentIndex)
    const duration = calculateAnimationDuration(distance * cardWidth, 0)

    // Phase 4: Enhanced haptic feedback for pattern navigation
    if (enableHapticFeedback && hapticSupported) {
      triggerPatternSwipeFeedback('snap')
    }

    // Update index immediately for responsive UI
    setCurrentIndex(index)
    onPatternChange?.(index, patterns[index])

    // End animation after duration
    setTimeout(() => {
      setIsAnimating(false)
    }, duration)
  }, [
    currentIndex,
    isAnimating,
    maxIndex,
    cardWidth,
    enableHapticFeedback,
    hapticSupported,
    triggerPatternSwipeFeedback,
    onPatternChange,
    patterns
  ])

  const nextPattern = useCallback(() => {
    if (currentIndex < maxIndex) {
      goToPattern(currentIndex + 1)
    }
  }, [currentIndex, maxIndex, goToPattern])

  const previousPattern = useCallback(() => {
    if (currentIndex > minIndex) {
      goToPattern(currentIndex - 1)
    }
  }, [currentIndex, minIndex, goToPattern])

  const snapToCurrentPosition = useCallback(() => {
    setIsAnimating(true)

    // Brief animation to snap back
    setTimeout(() => {
      setIsAnimating(false)
    }, ANIMATION_CONFIG.TRANSITION_DURATION)
  }, [])

  // Handle initial index changes
  useEffect(() => {
    if (initialIndex !== currentIndex && initialIndex >= 0 && initialIndex <= maxIndex) {
      setCurrentIndex(initialIndex)
    }
  }, [initialIndex, currentIndex, maxIndex])

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
    }
  }, [])

  // Handle window resize for responsive card width updates
  useEffect(() => {
    const handleResize = () => {
      // Force re-render with new dimensions
      setSwipeState(prev => ({ ...prev, deltaX: 0 }))
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return {
    // Gesture state
    swipeState,
    carouselState,

    // Event handlers
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onMouseDown,
    onMouseMove,
    onMouseUp,

    // Keyboard navigation
    onKeyDown,

    // Manual control
    goToPattern,
    nextPattern,
    previousPattern,

    // Phase 4: Long-press state and controls
    longPressState: longPress.state,
    isShowingHint: longPress.state.stage === 'hint',
    isShowingDetails: longPress.state.stage === 'details' || longPress.state.stage === 'holding',
    cancelLongPress: longPress.cancel
  }
}