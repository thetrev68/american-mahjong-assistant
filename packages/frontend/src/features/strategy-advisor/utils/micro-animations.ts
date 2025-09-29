// Micro-animations - Subtle animation utilities with accessibility support
// Provides delightful micro-interactions while respecting user preferences

import { easingFunctions } from './disclosure-transitions'

interface AnimationConfig {
  duration: number
  easing: string
  delay?: number
  respectsReducedMotion?: boolean
}

// Reserved for future use:
// interface SpringConfig {
//   tension: number
//   friction: number
//   mass: number
// }

interface MicroAnimationOptions {
  duration?: number
  easing?: string
  delay?: number
  respectsReducedMotion?: boolean
  onComplete?: () => void
  onStart?: () => void
}

// Reserved for future use:
// interface TransformAnimation {
//   scale?: number
//   translateX?: number
//   translateY?: number
//   rotate?: number
//   opacity?: number
// }

interface ColorAnimation {
  from: string
  to: string
  property: 'background-color' | 'color' | 'border-color'
}

// Check if user prefers reduced motion
const prefersReducedMotion = (): boolean => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

// Default animation configurations
const DEFAULT_ANIMATIONS: Record<string, AnimationConfig> = {
  subtle: {
    duration: 200,
    easing: easingFunctions.gentle,
    respectsReducedMotion: true
  },
  gentle: {
    duration: 300,
    easing: easingFunctions.spring,
    respectsReducedMotion: true
  },
  quick: {
    duration: 150,
    easing: easingFunctions.quickSpring,
    respectsReducedMotion: true
  },
  springy: {
    duration: 400,
    easing: easingFunctions.spring,
    respectsReducedMotion: true
  },
  instant: {
    duration: 0,
    easing: 'ease',
    respectsReducedMotion: false
  }
}

// Spring physics configurations (reserved for future use)
// const SPRING_PRESETS: Record<string, SpringConfig> = {
//   gentle: { tension: 120, friction: 14, mass: 1 },
//   bouncy: { tension: 180, friction: 12, mass: 1 },
//   swift: { tension: 200, friction: 15, mass: 1 },
//   slow: { tension: 100, friction: 20, mass: 1 }
// }

// Create CSS transition string
const createTransition = (
  properties: string[],
  config: AnimationConfig
): string => {
  if (config.respectsReducedMotion && prefersReducedMotion()) {
    return 'none'
  }

  return properties
    .map(prop => `${prop} ${config.duration}ms ${config.easing}`)
    .join(', ')
}

// Apply animation to element
const applyAnimation = (
  element: HTMLElement,
  properties: Record<string, string>,
  options: MicroAnimationOptions = {}
): Promise<void> => {
  return new Promise((resolve) => {
    const config = {
      duration: options.duration || DEFAULT_ANIMATIONS.gentle.duration,
      easing: options.easing || DEFAULT_ANIMATIONS.gentle.easing,
      delay: options.delay || 0,
      respectsReducedMotion: options.respectsReducedMotion ?? true
    }

    // Check for reduced motion preference
    if (config.respectsReducedMotion && prefersReducedMotion()) {
      // Apply final state immediately
      Object.entries(properties).forEach(([prop, value]) => {
        element.style.setProperty(prop, value)
      })

      options.onStart?.()
      options.onComplete?.()
      resolve()
      return
    }

    // Set up transition
    const transitionProperties = Object.keys(properties)
    element.style.transition = createTransition(transitionProperties, config)

    const handleTransitionEnd = () => {
      element.removeEventListener('transitionend', handleTransitionEnd)
      options.onComplete?.()
      resolve()
    }

    element.addEventListener('transitionend', handleTransitionEnd)

    // Apply delay if specified
    if (config.delay > 0) {
      setTimeout(() => {
        options.onStart?.()
        Object.entries(properties).forEach(([prop, value]) => {
          element.style.setProperty(prop, value)
        })
      }, config.delay)
    } else {
      options.onStart?.()
      Object.entries(properties).forEach(([prop, value]) => {
        element.style.setProperty(prop, value)
      })
    }

    // Fallback timeout
    setTimeout(() => {
      element.removeEventListener('transitionend', handleTransitionEnd)
      options.onComplete?.()
      resolve()
    }, config.duration + (config.delay || 0) + 50)
  })
}

// Micro-animation utilities
export const microAnimations = {
  // Touch feedback - subtle scale on interaction
  touchFeedback: async (element: HTMLElement, options: MicroAnimationOptions = {}) => {
    const originalTransform = element.style.transform

    // Scale down
    await applyAnimation(element, {
      transform: 'scale(0.98)'
    }, {
      duration: 100,
      easing: easingFunctions.quickSpring,
      ...options
    })

    // Scale back
    await applyAnimation(element, {
      transform: originalTransform || 'scale(1)'
    }, {
      duration: 200,
      easing: easingFunctions.spring,
      ...options
    })
  },

  // Gentle pulse for attention
  pulse: async (element: HTMLElement, options: MicroAnimationOptions = {}) => {
    const originalOpacity = element.style.opacity || '1'

    await applyAnimation(element, {
      opacity: '0.7'
    }, {
      duration: 300,
      easing: easingFunctions.gentle,
      ...options
    })

    await applyAnimation(element, {
      opacity: originalOpacity
    }, {
      duration: 300,
      easing: easingFunctions.gentle,
      ...options
    })
  },

  // Soft glow effect for highlights
  glow: async (element: HTMLElement, color: string = '#8b5cf6', options: MicroAnimationOptions = {}) => {
    const originalBoxShadow = element.style.boxShadow

    await applyAnimation(element, {
      'box-shadow': `0 0 20px ${color}40`
    }, {
      duration: 300,
      easing: easingFunctions.gentle,
      ...options
    })

    // Fade out glow
    setTimeout(() => {
      applyAnimation(element, {
        'box-shadow': originalBoxShadow || 'none'
      }, {
        duration: 500,
        easing: easingFunctions.gentle,
        ...options
      })
    }, 1000)
  },

  // Gentle shake for errors
  shake: async (element: HTMLElement, options: MicroAnimationOptions = {}) => {
    const originalTransform = element.style.transform

    const shakeSequence = [
      { transform: 'translateX(-5px)' },
      { transform: 'translateX(5px)' },
      { transform: 'translateX(-3px)' },
      { transform: 'translateX(3px)' },
      { transform: originalTransform || 'translateX(0)' }
    ]

    for (const step of shakeSequence) {
      await applyAnimation(element, step, {
        duration: 80,
        easing: easingFunctions.quickSpring,
        ...options
      })
    }
  },

  // Breathe animation for loading states
  breathe: (element: HTMLElement, options: MicroAnimationOptions = {}): () => void => {
    if (prefersReducedMotion() && options.respectsReducedMotion !== false) {
      return () => {} // Return empty cleanup function
    }

    let isAnimating = true

    const animate = async () => {
      while (isAnimating) {
        await applyAnimation(element, {
          opacity: '0.6'
        }, {
          duration: 1000,
          easing: easingFunctions.gentle,
          ...options
        })

        if (!isAnimating) break

        await applyAnimation(element, {
          opacity: '1'
        }, {
          duration: 1000,
          easing: easingFunctions.gentle,
          ...options
        })
      }
    }

    animate()

    // Return cleanup function
    return () => {
      isAnimating = false
    }
  },

  // Slide in from direction
  slideIn: async (
    element: HTMLElement,
    direction: 'left' | 'right' | 'up' | 'down' = 'up',
    distance: number = 20,
    options: MicroAnimationOptions = {}
  ) => {
    const transforms = {
      left: `translateX(-${distance}px)`,
      right: `translateX(${distance}px)`,
      up: `translateY(-${distance}px)`,
      down: `translateY(${distance}px)`
    }

    // Set initial state
    element.style.transform = transforms[direction]
    element.style.opacity = '0'

    // Animate to final state
    await applyAnimation(element, {
      transform: 'translate(0, 0)',
      opacity: '1'
    }, {
      duration: 300,
      easing: easingFunctions.spring,
      ...options
    })
  },

  // Fade with scale
  fadeScale: async (
    element: HTMLElement,
    direction: 'in' | 'out' = 'in',
    scale: number = 0.95,
    options: MicroAnimationOptions = {}
  ) => {
    if (direction === 'in') {
      // Set initial state
      element.style.transform = `scale(${scale})`
      element.style.opacity = '0'

      // Animate to final state
      await applyAnimation(element, {
        transform: 'scale(1)',
        opacity: '1'
      }, {
        duration: 250,
        easing: easingFunctions.spring,
        ...options
      })
    } else {
      // Animate to exit state
      await applyAnimation(element, {
        transform: `scale(${scale})`,
        opacity: '0'
      }, {
        duration: 200,
        easing: easingFunctions.gentle,
        ...options
      })
    }
  },

  // Stagger animation for multiple elements
  stagger: async (
    elements: HTMLElement[],
    animation: (element: HTMLElement) => Promise<void>,
    delay: number = 50,
    options: MicroAnimationOptions = {}
  ) => {
    if (prefersReducedMotion() && options.respectsReducedMotion !== false) {
      // Run all animations simultaneously for reduced motion
      await Promise.all(elements.map(animation))
      return
    }

    for (let i = 0; i < elements.length; i++) {
      setTimeout(() => {
        animation(elements[i])
      }, i * delay)
    }
  },

  // Morphing border radius
  morphRadius: async (
    element: HTMLElement,
    fromRadius: string = '0px',
    toRadius: string = '8px',
    options: MicroAnimationOptions = {}
  ) => {
    element.style.borderRadius = fromRadius

    await applyAnimation(element, {
      'border-radius': toRadius
    }, {
      duration: 400,
      easing: easingFunctions.spring,
      ...options
    })
  },

  // Color transition
  colorTransition: async (
    element: HTMLElement,
    colorConfig: ColorAnimation,
    options: MicroAnimationOptions = {}
  ) => {
    element.style.setProperty(colorConfig.property, colorConfig.from)

    await applyAnimation(element, {
      [colorConfig.property]: colorConfig.to
    }, {
      duration: 300,
      easing: easingFunctions.gentle,
      ...options
    })
  },

  // Loading dots animation
  loadingDots: (elements: HTMLElement[], options: MicroAnimationOptions = {}): () => void => {
    if (prefersReducedMotion() && options.respectsReducedMotion !== false) {
      return () => {} // Return empty cleanup function
    }

    let isAnimating = true

    const animate = async () => {
      while (isAnimating) {
        for (let i = 0; i < elements.length; i++) {
          if (!isAnimating) break

          await applyAnimation(elements[i], {
            transform: 'scale(1.2)',
            opacity: '1'
          }, {
            duration: 200,
            easing: easingFunctions.spring,
            ...options
          })

          await applyAnimation(elements[i], {
            transform: 'scale(1)',
            opacity: '0.5'
          }, {
            duration: 200,
            easing: easingFunctions.gentle,
            ...options
          })
        }

        // Pause between cycles
        await new Promise(resolve => setTimeout(resolve, 300))
      }
    }

    animate()

    // Return cleanup function
    return () => {
      isAnimating = false
    }
  }
}

// React hook for micro-animations
import { useCallback, useEffect, useRef } from 'react'

export const useMicroAnimations = () => {
  const animationRefs = useRef<Map<string, () => void>>(new Map())

  const startAnimation = useCallback((
    animationName: string,
    element: HTMLElement | null,
    animationType: keyof typeof microAnimations,
    ...args: unknown[]
  ) => {
    if (!element) return

    // Stop any existing animation with the same name
    const existingCleanup = animationRefs.current.get(animationName)
    if (existingCleanup) {
      existingCleanup()
    }

    // Start new animation
    const animationFunction = microAnimations[animationType] as (...args: unknown[]) => (() => void) | void
    const cleanup = animationFunction(element, ...args)

    // Store cleanup function if provided
    if (typeof cleanup === 'function') {
      animationRefs.current.set(animationName, cleanup)
    }
  }, [])

  const stopAnimation = useCallback((animationName: string) => {
    const cleanup = animationRefs.current.get(animationName)
    if (cleanup) {
      cleanup()
      animationRefs.current.delete(animationName)
    }
  }, [])

  const stopAllAnimations = useCallback(() => {
    animationRefs.current.forEach(cleanup => cleanup())
    animationRefs.current.clear()
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllAnimations()
    }
  }, [stopAllAnimations])

  return {
    startAnimation,
    stopAnimation,
    stopAllAnimations,
    prefersReducedMotion: prefersReducedMotion()
  }
}

// CSS-in-JS animation utilities
export const animationStyles = {
  // Hover effect styles
  hoverScale: (scale: number = 1.02, duration: number = 200) => ({
    transition: prefersReducedMotion() ? 'none' : `transform ${duration}ms ${easingFunctions.gentle}`,
    '&:hover': {
      transform: prefersReducedMotion() ? 'none' : `scale(${scale})`
    }
  }),

  // Focus effect styles
  focusGlow: (color: string = '#8b5cf6', duration: number = 200) => ({
    transition: prefersReducedMotion() ? 'none' : `box-shadow ${duration}ms ${easingFunctions.gentle}`,
    '&:focus': {
      boxShadow: prefersReducedMotion() ? 'none' : `0 0 0 3px ${color}40`,
      outline: 'none'
    }
  }),

  // Loading pulse
  loadingPulse: (duration: number = 1500) => ({
    animation: prefersReducedMotion() ? 'none' : `pulse ${duration}ms ${easingFunctions.gentle} infinite`
  }),

  // Entrance animation
  fadeInUp: (distance: number = 20, duration: number = 300) => ({
    animation: prefersReducedMotion()
      ? 'none'
      : `fadeInUp ${duration}ms ${easingFunctions.spring} forwards`,
    opacity: 0,
    transform: `translateY(${distance}px)`
  })
}

// CSS keyframes (to be injected into stylesheet)
export const animationKeyframes = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }

  @keyframes fadeInUp {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  @keyframes bounce {
    0%, 20%, 53%, 80%, 100% { transform: translateY(0); }
    40%, 43% { transform: translateY(-10px); }
    70% { transform: translateY(-5px); }
    90% { transform: translateY(-2px); }
  }

  @keyframes wobble {
    0% { transform: translateX(0%); }
    15% { transform: translateX(-5px) rotate(-5deg); }
    30% { transform: translateX(4px) rotate(3deg); }
    45% { transform: translateX(-3px) rotate(-3deg); }
    60% { transform: translateX(2px) rotate(2deg); }
    75% { transform: translateX(-1px) rotate(-1deg); }
    100% { transform: translateX(0%); }
  }

  /* Respect reduced motion preference */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
`

export default microAnimations