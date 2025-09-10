// Reduced Motion Accessibility Support

import { useMemo } from 'react'

// Cache for motion preference to avoid repeated queries
let motionPreferenceCache: boolean | null = null

// Export for testing purposes only
export const __testing = {
  resetCache: () => { motionPreferenceCache = null }
}

export function useReducedMotion(): boolean {
  return useMemo(() => {
    if (motionPreferenceCache !== null) {
      return motionPreferenceCache
    }

    if (typeof window === 'undefined' || !window.matchMedia) {
      motionPreferenceCache = false
      return false
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    motionPreferenceCache = mediaQuery.matches

    // Listen for changes in motion preference
    const handleChange = (e: MediaQueryListEvent) => {
      motionPreferenceCache = e.matches
    }

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange)
    }

    return motionPreferenceCache
  }, [])
}

export interface AnimationConfig {
  duration?: number
  easing?: string
  transform?: string
  scale?: number
  rotate?: number
  opacity?: number
  bounce?: boolean
  shake?: boolean
  essential?: boolean
  [key: string]: unknown
}

export function withReducedMotion<T extends AnimationConfig>(
  fullAnimation: T,
  reducedAnimation?: Partial<T>
): T {
  const shouldReduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  if (!shouldReduce) {
    return fullAnimation
  }

  if (reducedAnimation) {
    return { ...fullAnimation, ...reducedAnimation }
  }

  // Auto-generate reduced motion variant
  return createAutoReducedConfig(fullAnimation)
}

function createAutoReducedConfig<T extends AnimationConfig>(config: T): T {
  const reducedConfig = { ...config }

  // Reduce duration significantly
  if (reducedConfig.duration) {
    reducedConfig.duration = Math.min(reducedConfig.duration * 0.3, 200)
  }

  // Reduce scale effects
  if (reducedConfig.scale) {
    reducedConfig.scale = Math.min(reducedConfig.scale, 1.1)
  }

  // Remove or reduce transforms that might trigger vestibular disorders
  if (reducedConfig.transform) {
    // Remove rotation and excessive movement
    reducedConfig.transform = reducedConfig.transform
      .replace(/rotate[XYZ]?\([^)]*\)/g, '')
      .replace(/translate[XY]?\([^)]*\)/g, (match) => {
        // Reduce translation distances
        return match.replace(/(\d+)px/g, (_, num) => `${Math.min(parseInt(num), 5)}px`)
      })
      .trim()
  }

  // Remove problematic effects
  delete reducedConfig.bounce
  delete reducedConfig.shake
  delete reducedConfig.rotate

  return reducedConfig
}

export interface AccessibleAnimation<T = AnimationConfig> {
  full: T
  reduced: T
  current: T
  accessibility: {
    respectsReducedMotion: boolean
    hasAlternative: boolean
    type: 'essential' | 'decorative' | 'feedback'
  }
}

export function createAccessibleAnimation<T extends AnimationConfig>(
  fullConfig: T,
  reducedConfig?: Partial<T>,
  type: 'essential' | 'decorative' | 'feedback' = 'decorative'
): AccessibleAnimation<T> {
  const reduced = reducedConfig ? { ...fullConfig, ...reducedConfig } : createAutoReducedConfig(fullConfig)
  const shouldReduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  return {
    full: fullConfig,
    reduced,
    current: shouldReduce ? reduced : fullConfig,
    accessibility: {
      respectsReducedMotion: true,
      hasAlternative: true,
      type
    }
  }
}

export function getMotionSafeConfig(config: AnimationConfig): AnimationConfig {
  const safeConfig = { ...config }

  // Maximum safe values for reduced motion
  const MAX_SAFE_DURATION = 200
  const MAX_SAFE_SCALE = 1.1
  const MAX_SAFE_TRANSLATE = 10

  // Limit duration unless marked as essential
  if (safeConfig.duration && !safeConfig.essential) {
    safeConfig.duration = Math.min(safeConfig.duration, MAX_SAFE_DURATION)
  } else if (safeConfig.duration && safeConfig.essential) {
    // Essential animations keep minimum viable duration
    safeConfig.duration = Math.max(safeConfig.duration * 0.5, 100)
  }

  // Limit scale changes
  if (safeConfig.scale) {
    safeConfig.scale = Math.min(safeConfig.scale, MAX_SAFE_SCALE)
  }

  // Remove or limit rotations (can trigger vestibular issues)
  if (safeConfig.rotate && Math.abs(safeConfig.rotate) > 15) {
    delete safeConfig.rotate
  }

  // Process transform string
  if (safeConfig.transform) {
    safeConfig.transform = safeConfig.transform
      .replace(/rotate[XYZ]?\(([^)]*)\)/g, (match, value) => {
        const degrees = parseFloat(value)
        if (Math.abs(degrees) > 15) return ''
        return match
      })
      .replace(/translate[XY]?\(([^)]*)\)/g, (match, value) => {
        const pixels = parseFloat(value)
        if (Math.abs(pixels) > MAX_SAFE_TRANSLATE) {
          const sign = pixels >= 0 ? '' : '-'
          return match.replace(/[\d.]+/, `${sign}${MAX_SAFE_TRANSLATE}`)
        }
        return match
      })
      .replace(/scale\(([^)]*)\)/g, (match, value) => {
        const scale = parseFloat(value)
        if (scale > MAX_SAFE_SCALE) {
          return `scale(${MAX_SAFE_SCALE})`
        }
        return match
      })
      .trim()
  }

  // Remove problematic animation types
  const problematicProps = ['bounce', 'shake', 'wobble', 'spin', 'flip']
  problematicProps.forEach(prop => {
    delete safeConfig[prop]
  })

  return safeConfig
}

// Animation type categorization for accessibility
const ESSENTIAL_ANIMATION_TYPES = [
  'essential',
  'loading',
  'feedback',
  'state-change',
  'navigation',
  'progress',
  'alert',
  'focus',
  'selection'
]

export function shouldEnableAnimation(
  animationType: string,
  allowedTypes: string[] = ESSENTIAL_ANIMATION_TYPES
): boolean {
  const shouldReduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  if (!shouldReduce) {
    return true
  }

  // Check if animation type contains any essential keywords
  const isEssential = ESSENTIAL_ANIMATION_TYPES.some(essential => 
    animationType.toLowerCase().includes(essential)
  )

  if (isEssential) {
    return true
  }

  // Check custom allowed types
  return allowedTypes.some(allowed => 
    animationType.toLowerCase().includes(allowed.toLowerCase())
  )
}

export function createMotionQuery(
  preference: 'reduced' | 'no-preference' | 'custom',
  customQuery?: string
): string {
  if (preference === 'custom' && customQuery) {
    return customQuery
  }

  return `(prefers-reduced-motion: ${preference})`
}

// CSS-in-JS helper for reduced motion
export function motionSafeStyles(
  fullStyles: Record<string, unknown>,
  reducedStyles: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    ...fullStyles,
    '@media (prefers-reduced-motion: reduce)': {
      ...reducedStyles,
      // Override problematic properties
      animation: 'none',
      transition: 'none'
    }
  }
}

// Utility for conditional animation classes
export function getMotionSafeClasses(
  fullClasses: string,
  reducedClasses: string = ''
): string {
  if (typeof window === 'undefined') {
    return fullClasses
  }

  const shouldReduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  return shouldReduce ? reducedClasses : fullClasses
}

// Performance-optimized motion detection for repeated use
export class MotionPreferenceManager {
  private static instance: MotionPreferenceManager
  private preferenceCache: boolean | null = null
  private listeners: Array<(reduced: boolean) => void> = []

  static getInstance(): MotionPreferenceManager {
    if (!MotionPreferenceManager.instance) {
      MotionPreferenceManager.instance = new MotionPreferenceManager()
    }
    return MotionPreferenceManager.instance
  }

  private constructor() {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      this.preferenceCache = mediaQuery.matches

      const handleChange = (e: MediaQueryListEvent) => {
        this.preferenceCache = e.matches
        this.listeners.forEach(listener => listener(e.matches))
      }

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange)
      } else {
        mediaQuery.addListener(handleChange)
      }
    }
  }

  isReducedMotion(): boolean {
    return this.preferenceCache ?? false
  }

  subscribe(listener: (reduced: boolean) => void): () => void {
    this.listeners.push(listener)
    
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }
}