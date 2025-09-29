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
import {
  calculateVelocity,
  shouldSnapToNextPattern,
  calculateAnimationDuration,
  throttle,
  cancelAnimationFrame,
  ANIMATION_CONFIG
} from '../utils/pattern-carousel-utils'

interface UseCarouselSwipeOptions {
  patterns: ActionPatternData[]
  initialIndex?: number
  cardWidth?: number
  enableHapticFeedback?: boolean
  onPatternChange?: (index: number, pattern: ActionPatternData) => void
  onSwipeStart?: () => void
  onSwipeEnd?: () => void
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
  onPatternChange,
  onSwipeStart,
  onSwipeEnd
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

  // Haptic feedback
  const {
    triggerSelectionFeedback,
    triggerLightFeedback,
    isSupported: hapticSupported
  } = useHapticFeedback()

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

  // Update velocity history for smooth calculations
  const updateVelocity = useCallback((currentX: number, timestamp: number) => {
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

  // Throttled velocity update for performance
  const throttledVelocityUpdate = useMemo(() =>
    throttle(updateVelocity, 16), // ~60fps
    [updateVelocity]
  )

  // Touch event handlers
  const onTouchStart = useCallback((event: React.TouchEvent) => {
    if (patterns.length <= 1) return

    const touch = event.touches[0]
    const startX = touch.clientX
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

    // Haptic feedback on touch start
    if (enableHapticFeedback && hapticSupported) {
      triggerLightFeedback()
    }

    onSwipeStart?.()
  }, [patterns.length, enableHapticFeedback, hapticSupported, triggerLightFeedback, onSwipeStart])

  const onTouchMove = useCallback((event: React.TouchEvent) => {
    if (!isDraggingRef.current || patterns.length <= 1) return

    event.preventDefault() // Prevent scrolling

    const touch = event.touches[0]
    const currentX = touch.clientX
    const timestamp = Date.now()

    throttledVelocityUpdate(currentX, timestamp)
  }, [patterns.length, throttledVelocityUpdate])

  const onTouchEnd = useCallback((_event: React.TouchEvent) => {
    if (!isDraggingRef.current || patterns.length <= 1) return

    isDraggingRef.current = false

    const { shouldSnap, direction } = shouldSnapToNextPattern(swipeState, cardWidth)

    if (shouldSnap && direction) {
      if (direction === 'left' && currentIndex < maxIndex) {
        nextPattern()
      } else if (direction === 'right' && currentIndex > minIndex) {
        previousPattern()
      } else {
        // Snap back to current position
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
  }, [swipeState, cardWidth, currentIndex, maxIndex, minIndex, onSwipeEnd])

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

  // Navigation functions
  const goToPattern = useCallback((index: number) => {
    if (index === currentIndex || isAnimating || index < 0 || index > maxIndex) {
      return
    }

    setIsAnimating(true)

    // Calculate animation duration based on distance
    const distance = Math.abs(index - currentIndex)
    const duration = calculateAnimationDuration(distance * cardWidth, 0)

    // Haptic feedback for pattern change
    if (enableHapticFeedback && hapticSupported) {
      triggerSelectionFeedback()
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
    triggerSelectionFeedback,
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
    previousPattern
  }
}