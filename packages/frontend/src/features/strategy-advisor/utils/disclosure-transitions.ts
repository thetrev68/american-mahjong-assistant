// Disclosure Transitions - Smooth 60fps animations for progressive disclosure
// Provides spring-based animations and performance-optimized transitions

import type {
  DisclosureLevel,
  DisclosureTransition,
  UrgencyLevel
} from '../types/strategy-advisor.types'

// Easing functions optimized for 60fps performance
export const easingFunctions = {
  // Smooth spring-like easing for organic feel
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',

  // Quick but gentle for high urgency situations
  quickSpring: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',

  // Subtle for low urgency situations
  gentle: 'cubic-bezier(0.25, 0.1, 0.25, 1)',

  // Emergency mode - immediate but not jarring
  emergency: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)'
} as const

// Animation durations adapted to urgency levels
export const getAnimationDuration = (
  urgencyLevel: UrgencyLevel,
  baseTransition: DisclosureTransition
): number => {
  const baseDuration = baseTransition.duration

  switch (urgencyLevel) {
    case 'critical':
      return Math.min(baseDuration * 0.5, 150) // Max 150ms for critical
    case 'high':
      return Math.min(baseDuration * 0.7, 200) // Max 200ms for high
    case 'medium':
      return baseDuration
    case 'low':
      return Math.min(baseDuration * 1.3, 400) // Max 400ms for low
    default:
      return baseDuration
  }
}

// Get appropriate easing for urgency level
export const getUrgencyEasing = (urgencyLevel: UrgencyLevel): string => {
  switch (urgencyLevel) {
    case 'critical':
      return easingFunctions.emergency
    case 'high':
      return easingFunctions.quickSpring
    case 'medium':
      return easingFunctions.spring
    case 'low':
      return easingFunctions.gentle
    default:
      return easingFunctions.spring
  }
}

// Default transition configurations
export const defaultTransitions: Record<string, DisclosureTransition> = {
  'glance-to-details': {
    from: 'glance',
    to: 'details',
    duration: 300,
    easing: easingFunctions.spring,
    staggerDelay: 50
  },
  'details-to-advanced': {
    from: 'details',
    to: 'advanced',
    duration: 350,
    easing: easingFunctions.spring,
    staggerDelay: 75
  },
  'advanced-to-details': {
    from: 'advanced',
    to: 'details',
    duration: 250,
    easing: easingFunctions.gentle,
    staggerDelay: 25
  },
  'details-to-glance': {
    from: 'details',
    to: 'glance',
    duration: 250,
    easing: easingFunctions.gentle,
    staggerDelay: 25
  },
  'glance-to-advanced': {
    from: 'glance',
    to: 'advanced',
    duration: 400,
    easing: easingFunctions.spring,
    staggerDelay: 100
  },
  'advanced-to-glance': {
    from: 'advanced',
    to: 'glance',
    duration: 300,
    easing: easingFunctions.gentle,
    staggerDelay: 50
  }
}

// Get transition configuration for level change
export const getTransitionConfig = (
  from: DisclosureLevel,
  to: DisclosureLevel,
  urgencyLevel: UrgencyLevel = 'medium'
): DisclosureTransition => {
  const key = `${from}-to-${to}`
  const baseTransition = defaultTransitions[key] || {
    from,
    to,
    duration: 300,
    easing: easingFunctions.spring,
    staggerDelay: 50
  }

  return {
    ...baseTransition,
    duration: getAnimationDuration(urgencyLevel, baseTransition),
    easing: getUrgencyEasing(urgencyLevel)
  }
}

// CSS transition string generator
export const createTransitionCSS = (
  properties: string[],
  transition: DisclosureTransition
): string => {
  return properties
    .map(property => `${property} ${transition.duration}ms ${transition.easing}`)
    .join(', ')
}

// Generate staggered animation delays for child elements
export const getStaggeredDelay = (
  index: number,
  staggerDelay: number,
  maxElements: number = 10
): number => {
  // Cap the delay to prevent overly long animations
  const cappedIndex = Math.min(index, maxElements - 1)
  return cappedIndex * staggerDelay
}

// Performance-optimized transform animations
export const transformAnimations = {
  // Slide animations for level transitions
  slideDown: (distance: number = 20) => ({
    initial: {
      transform: `translateY(-${distance}px)`,
      opacity: 0
    },
    animate: {
      transform: 'translateY(0px)',
      opacity: 1
    },
    exit: {
      transform: `translateY(-${distance}px)`,
      opacity: 0
    }
  }),

  slideUp: (distance: number = 20) => ({
    initial: {
      transform: `translateY(${distance}px)`,
      opacity: 0
    },
    animate: {
      transform: 'translateY(0px)',
      opacity: 1
    },
    exit: {
      transform: `translateY(${distance}px)`,
      opacity: 0
    }
  }),

  // Scale animations for emphasis
  scaleIn: (scale: number = 0.95) => ({
    initial: {
      transform: `scale(${scale})`,
      opacity: 0
    },
    animate: {
      transform: 'scale(1)',
      opacity: 1
    },
    exit: {
      transform: `scale(${scale})`,
      opacity: 0
    }
  }),

  // Fade with subtle scale for advanced content
  fadeScale: (scale: number = 0.98) => ({
    initial: {
      transform: `scale(${scale})`,
      opacity: 0,
      filter: 'blur(1px)'
    },
    animate: {
      transform: 'scale(1)',
      opacity: 1,
      filter: 'blur(0px)'
    },
    exit: {
      transform: `scale(${scale})`,
      opacity: 0,
      filter: 'blur(1px)'
    }
  })
}

// Generate CSS animation keyframes
export const generateKeyframes = (
  name: string,
  animation: ReturnType<typeof transformAnimations.slideDown>
): string => {
  const { initial, animate } = animation

  return `
    @keyframes ${name}-enter {
      from {
        transform: ${initial.transform};
        opacity: ${initial.opacity};
        ${initial.filter ? `filter: ${initial.filter};` : ''}
      }
      to {
        transform: ${animate.transform};
        opacity: ${animate.opacity};
        ${animate.filter ? `filter: ${animate.filter};` : ''}
      }
    }

    @keyframes ${name}-exit {
      from {
        transform: ${animate.transform};
        opacity: ${animate.opacity};
        ${animate.filter ? `filter: ${animate.filter};` : ''}
      }
      to {
        transform: ${animation.exit.transform};
        opacity: ${animation.exit.opacity};
        ${animation.exit.filter ? `filter: ${animation.exit.filter};` : ''}
      }
    }
  `
}

// Accessibility-aware transitions
export const getAccessibleTransition = (
  transition: DisclosureTransition,
  respectsReducedMotion: boolean = true
): DisclosureTransition => {
  if (respectsReducedMotion && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return {
      ...transition,
      duration: 0,
      easing: 'ease',
      staggerDelay: 0
    }
  }

  return transition
}

// Content visibility optimization utilities
export const contentVisibilityUtils = {
  // Show content with performance optimization
  showContent: (element: HTMLElement, _transition: DisclosureTransition) => {
    // Use content-visibility for performance with large content
    element.style.contentVisibility = 'auto'
    element.style.containIntrinsicSize = '1px 500px' // Estimated size

    // Trigger animation
    element.style.opacity = '1'
    element.style.transform = 'translateY(0)'
  },

  // Hide content with performance optimization
  hideContent: (element: HTMLElement, transition: DisclosureTransition) => {
    // Start hiding animation
    element.style.opacity = '0'
    element.style.transform = 'translateY(-10px)'

    // Optimize rendering after animation
    setTimeout(() => {
      element.style.contentVisibility = 'hidden'
    }, transition.duration)
  }
}

// Disclosure level height calculations for smooth sizing
export const getDisclosureLevelHeight = (level: DisclosureLevel): string => {
  switch (level) {
    case 'glance':
      return 'auto' // Compact, natural height
    case 'details':
      return 'auto' // Medium expanded height
    case 'advanced':
      return 'auto' // Full expanded height
    default:
      return 'auto'
  }
}

// Container animation classes
export const getContainerClasses = (
  currentLevel: DisclosureLevel,
  isTransitioning: boolean,
  urgencyLevel: UrgencyLevel = 'medium'
): string => {
  const levelClasses = {
    glance: 'max-h-32', // Compact height
    details: 'max-h-96', // Medium height
    advanced: 'max-h-[32rem]' // Large height
  }

  const urgencyClasses = {
    critical: 'transition-all duration-150',
    high: 'transition-all duration-200',
    medium: 'transition-all duration-300',
    low: 'transition-all duration-400'
  }

  return [
    urgencyClasses[urgencyLevel],
    levelClasses[currentLevel],
    isTransitioning ? 'scale-[1.01]' : '',
    'ease-spring overflow-hidden'
  ].filter(Boolean).join(' ')
}

// Performance monitoring for animations
export const performanceMonitor = {
  measureTransition: (
    transitionName: string,
    callback: () => void
  ): Promise<{ duration: number; fps: number }> => {
    return new Promise((resolve) => {
      const startTime = performance.now()
      let frameCount = 0

      const measureFrame = () => {
        frameCount++
        const currentTime = performance.now()

        if (currentTime - startTime < 1000) { // Measure for 1 second
          requestAnimationFrame(measureFrame)
        } else {
          const duration = currentTime - startTime
          const fps = Math.round((frameCount * 1000) / duration)

          resolve({ duration, fps })
        }
      }

      callback()
      requestAnimationFrame(measureFrame)
    })
  },

  optimizeForDevice: (transition: DisclosureTransition): DisclosureTransition => {
    // Check if device can handle smooth animations
    const isHighPerformanceDevice = navigator.hardwareConcurrency >= 4
    const hasGoodConnection = navigator.connection?.effectiveType === '4g'

    if (!isHighPerformanceDevice || !hasGoodConnection) {
      return {
        ...transition,
        duration: Math.min(transition.duration, 200), // Cap duration
        staggerDelay: Math.min(transition.staggerDelay, 25) // Reduce stagger
      }
    }

    return transition
  }
}

// Export transition helper functions
export const transitionHelpers = {
  getTransitionConfig,
  createTransitionCSS,
  getStaggeredDelay,
  getAccessibleTransition,
  getContainerClasses,
  transformAnimations,
  contentVisibilityUtils,
  performanceMonitor
}