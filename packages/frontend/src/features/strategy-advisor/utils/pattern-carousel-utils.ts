// Pattern Carousel Utilities - Helper functions for carousel navigation and animations
// Provides optimized calculations for smooth 60fps animations and gesture handling

import type {
  SwipeGestureState,
  PatternPriority,
  ActionPatternData
} from '../types/strategy-advisor.types'

// Animation constants for smooth 60fps performance
export const ANIMATION_CONFIG = {
  // Spring animation for snap-to-pattern
  SPRING_TENSION: 280,
  SPRING_FRICTION: 30,
  SPRING_MASS: 1,

  // Timing for CSS transitions
  TRANSITION_DURATION: 300, // ms
  EASE_CURVE: 'cubic-bezier(0.4, 0, 0.2, 1)', // Material Design standard

  // Performance thresholds
  MIN_VELOCITY_THRESHOLD: 0.3, // px/ms
  SWIPE_DISTANCE_THRESHOLD: 50, // px
  MAX_ANIMATION_DURATION: 500, // ms

  // Snap behavior
  SNAP_THRESHOLD: 0.3, // 30% of card width triggers snap
  OVERSCROLL_RESISTANCE: 0.3,
  MAX_OVERSCROLL: 100 // px
} as const

// Gesture calculation utilities

/**
 * Calculate swipe velocity from touch/mouse events
 */
export const calculateVelocity = (
  currentPosition: number,
  previousPosition: number,
  timeDelta: number
): number => {
  if (timeDelta === 0) return 0
  return (currentPosition - previousPosition) / timeDelta
}

/**
 * Calculate resistance for overscroll effect
 */
export const calculateOverscrollResistance = (
  distance: number,
  maxDistance: number = ANIMATION_CONFIG.MAX_OVERSCROLL
): number => {
  const ratio = Math.abs(distance) / maxDistance
  const resistance = 1 - (ratio * ANIMATION_CONFIG.OVERSCROLL_RESISTANCE)
  return Math.max(0.1, resistance) // Minimum 10% of original distance
}

/**
 * Determine if swipe should trigger pattern change
 */
export const shouldSnapToNextPattern = (
  swipeState: SwipeGestureState,
  cardWidth: number
): { shouldSnap: boolean; direction: 'left' | 'right' | null } => {
  const { deltaX, velocity } = swipeState

  // High velocity swipe
  if (Math.abs(velocity) > ANIMATION_CONFIG.MIN_VELOCITY_THRESHOLD) {
    return {
      shouldSnap: true,
      direction: velocity > 0 ? 'right' : 'left'
    }
  }

  // Distance-based snap
  const swipeRatio = Math.abs(deltaX) / cardWidth
  if (swipeRatio > ANIMATION_CONFIG.SNAP_THRESHOLD) {
    return {
      shouldSnap: true,
      direction: deltaX > 0 ? 'right' : 'left'
    }
  }

  return { shouldSnap: false, direction: null }
}

/**
 * Calculate optimal animation duration based on distance and velocity
 */
export const calculateAnimationDuration = (
  distance: number,
  velocity: number
): number => {
  // Base duration from distance
  const distanceDuration = Math.abs(distance) * 2 // 2ms per pixel

  // Velocity adjustment
  const velocityDuration = Math.abs(velocity) > 0
    ? Math.abs(distance / velocity)
    : distanceDuration

  // Use the shorter duration for snappier feel
  const optimalDuration = Math.min(distanceDuration, velocityDuration)

  // Clamp to reasonable bounds
  return Math.max(150, Math.min(ANIMATION_CONFIG.MAX_ANIMATION_DURATION, optimalDuration))
}

// Pattern organization utilities

/**
 * Group patterns by priority for efficient rendering
 */
export const groupPatternsByPriority = (
  patterns: ActionPatternData[]
): Record<PatternPriority, ActionPatternData[]> => {
  return patterns.reduce((groups, pattern) => {
    const priority = pattern.priorityInfo.priority
    if (!groups[priority]) {
      groups[priority] = []
    }
    groups[priority].push(pattern)
    return groups
  }, {} as Record<PatternPriority, ActionPatternData[]>)
}

/**
 * Get priority emoji for visual indication
 */
export const getPriorityEmoji = (priority: PatternPriority): string => {
  switch (priority) {
    case 'pursue': return '🟢'
    case 'backup': return '🟡'
    case 'risky': return '🔴'
    case 'dead': return '⚫'
    default: return '⚪'
  }
}

/**
 * Get priority color scheme for consistent styling
 */
export const getPriorityColorScheme = (priority: PatternPriority) => {
  switch (priority) {
    case 'pursue':
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-800',
        accent: 'text-green-600',
        button: 'bg-green-600 hover:bg-green-700'
      }
    case 'backup':
      return {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-800',
        accent: 'text-yellow-600',
        button: 'bg-yellow-600 hover:bg-yellow-700'
      }
    case 'risky':
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-800',
        accent: 'text-red-600',
        button: 'bg-red-600 hover:bg-red-700'
      }
    case 'dead':
      return {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-800',
        accent: 'text-gray-600',
        button: 'bg-gray-600 hover:bg-gray-700'
      }
    default:
      return {
        bg: 'bg-white',
        border: 'border-gray-200',
        text: 'text-gray-900',
        accent: 'text-gray-600',
        button: 'bg-blue-600 hover:bg-blue-700'
      }
  }
}

/**
 * Calculate carousel position for smooth transitions
 */
export const calculateCarouselTransform = (
  currentIndex: number,
  cardWidth: number,
  gap: number = 16,
  dragOffset: number = 0
): string => {
  const totalOffset = (cardWidth + gap) * currentIndex
  const finalOffset = totalOffset - dragOffset

  return `translateX(-${finalOffset}px)`
}

/**
 * Get visible pattern indices for performance optimization
 */
export const getVisiblePatternIndices = (
  currentIndex: number,
  totalPatterns: number,
  visibleCount: number = 3
): number[] => {
  const indices: number[] = []
  const halfVisible = Math.floor(visibleCount / 2)

  for (let i = -halfVisible; i <= halfVisible; i++) {
    const index = currentIndex + i
    if (index >= 0 && index < totalPatterns) {
      indices.push(index)
    }
  }

  return indices
}

// Performance optimization utilities

/**
 * Throttle function for smooth gesture handling
 */
export const throttle = <T extends (...args: unknown[]) => void>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout | null = null
  let lastExecTime = 0

  return (...args: Parameters<T>) => {
    const currentTime = Date.now()

    if (currentTime - lastExecTime > delay) {
      func(...args)
      lastExecTime = currentTime
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      timeoutId = setTimeout(() => {
        func(...args)
        lastExecTime = Date.now()
      }, delay - (currentTime - lastExecTime))
    }
  }
}

/**
 * Debounce function for event handling
 */
export const debounce = <T extends (...args: unknown[]) => void>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

/**
 * Request animation frame with fallback
 */
export const requestAnimationFrame = (
  callback: FrameRequestCallback
): number => {
  if (typeof window !== 'undefined' && window.requestAnimationFrame) {
    return window.requestAnimationFrame(callback)
  }
  // Fallback for SSR or older browsers
  return setTimeout(callback, 16) as unknown as number // ~60fps
}

/**
 * Cancel animation frame with fallback
 */
export const cancelAnimationFrame = (id: number): void => {
  if (typeof window !== 'undefined' && window.cancelAnimationFrame) {
    window.cancelAnimationFrame(id)
  } else {
    clearTimeout(id)
  }
}

// Accessibility utilities

/**
 * Generate accessible carousel announcement
 */
export const generateCarouselAnnouncement = (
  currentIndex: number,
  totalPatterns: number,
  currentPattern: ActionPatternData
): string => {
  const position = `${currentIndex + 1} of ${totalPatterns}`
  const priority = currentPattern.priorityInfo.priority
  const action = currentPattern.priorityInfo.actionMessage

  return `Pattern ${position}: ${currentPattern.name}, ${priority} priority. ${action}`
}

/**
 * Get keyboard navigation instructions
 */
export const getKeyboardInstructions = (): string => {
  return "Use left and right arrow keys to navigate patterns, Enter to select, Space to preview"
}

// Math utilities for smooth animations

/**
 * Ease out cubic function for smooth deceleration
 */
export const easeOutCubic = (t: number): number => {
  return 1 - Math.pow(1 - t, 3)
}

/**
 * Ease in out cubic function for balanced acceleration/deceleration
 */
export const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * Spring animation calculation
 */
export const calculateSpringAnimation = (
  progress: number,
  tension: number = ANIMATION_CONFIG.SPRING_TENSION,
  friction: number = ANIMATION_CONFIG.SPRING_FRICTION
): number => {
  const tension_norm = tension / 100
  const friction_norm = friction / 100

  const omega = Math.sqrt(tension_norm)
  const zeta = friction_norm / (2 * Math.sqrt(tension_norm))

  if (zeta < 1) {
    // Underdamped
    const omega_d = omega * Math.sqrt(1 - zeta * zeta)
    return 1 - Math.exp(-zeta * omega * progress) * Math.cos(omega_d * progress)
  } else {
    // Overdamped or critically damped
    return 1 - Math.exp(-omega * progress)
  }
}