// Animation Configuration and Utilities

export const ANIMATION_DURATIONS = {
  fast: 150,
  normal: 300,
  slow: 500,
  tile_flip: 250,
  tile_select: 200,
  tile_pass: 400,
  tile_draw: 350,
  tile_discard: 300,
  tile_highlight: 100,
  sequence_stagger: 50
} as const

export const ANIMATION_EASINGS = {
  linear: 'linear',
  ease: 'ease',
  ease_in: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
  ease_out: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  ease_in_out: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  sharp: 'cubic-bezier(0.4, 0, 0.6, 1)'
} as const

export interface AnimationConfig {
  duration: number
  easing: string
  transform?: string
  opacity?: number
  rotateY?: number
  rotateX?: number
  translateX?: string | number
  translateY?: string | number
  scale?: number
  shadow?: boolean
  glow?: boolean
  pulse?: boolean
  sparkle?: boolean
  charleston?: boolean
  game?: boolean
  analysis?: boolean
}

export const TILE_ANIMATIONS: Record<string, AnimationConfig> = {
  // Basic tile interactions
  select: {
    duration: 200,
    easing: ANIMATION_EASINGS.ease_out,
    transform: 'scale(1.05) translateY(-2px)',
    shadow: true
  },
  
  deselect: {
    duration: 200,
    easing: ANIMATION_EASINGS.ease_out,
    transform: 'scale(1) translateY(0)',
    shadow: false
  },
  
  hover: {
    duration: 150,
    easing: ANIMATION_EASINGS.ease_out,
    transform: 'scale(1.02) translateY(-1px)',
    shadow: true
  },
  
  // Tile state changes
  flip: {
    duration: 250,
    easing: ANIMATION_EASINGS.ease_out,
    rotateY: 180
  },
  
  // Charleston animations
  pass: {
    duration: 400,
    easing: ANIMATION_EASINGS.ease_in,
    translateX: '100px',
    opacity: 0,
    charleston: true
  },
  
  keep: {
    duration: 200,
    easing: ANIMATION_EASINGS.bounce,
    transform: 'scale(1.1)',
    charleston: true
  },
  
  // Game play animations
  draw: {
    duration: 350,
    easing: ANIMATION_EASINGS.spring,
    translateY: '-20px',
    opacity: 1,
    game: true
  },
  
  discard: {
    duration: 300,
    easing: ANIMATION_EASINGS.ease_in,
    translateY: '50px',
    opacity: 0,
    game: true
  },
  
  // Analysis and recommendation animations
  highlight: {
    duration: 100,
    easing: ANIMATION_EASINGS.ease_out,
    glow: true,
    analysis: true
  },
  
  recommendation: {
    duration: 500,
    easing: ANIMATION_EASINGS.ease_in_out,
    pulse: true,
    analysis: true
  },
  
  // Special tile types
  joker: {
    duration: 800,
    easing: ANIMATION_EASINGS.ease_in_out,
    glow: true,
    pulse: true
  },
  
  dragon: {
    duration: 600,
    easing: ANIMATION_EASINGS.ease_in_out,
    pulse: true,
    glow: true
  },
  
  flower: {
    duration: 1000,
    easing: ANIMATION_EASINGS.ease_in_out,
    sparkle: true
  },
  
  // Error and feedback animations
  error: {
    duration: 300,
    easing: ANIMATION_EASINGS.sharp,
    transform: 'translateX(-5px)'
  },
  
  success: {
    duration: 400,
    easing: ANIMATION_EASINGS.bounce,
    transform: 'scale(1.1)',
    glow: true
  }
}

export function getAnimationConfig(
  animationName: keyof typeof TILE_ANIMATIONS,
  overrides: Partial<AnimationConfig> = {}
): AnimationConfig {
  const baseConfig = TILE_ANIMATIONS[animationName] || { duration: 300, easing: 'ease-out' }
  return { ...baseConfig, ...overrides }
}

export function shouldReduceMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return false
  }
  
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function getOptimizedDuration(
  baseDuration: number,
  reductionFactor: number = 0.33
): number {
  if (!shouldReduceMotion()) {
    return baseDuration
  }
  
  // Respect minimum duration to maintain usability
  const minDuration = 50
  const reducedDuration = Math.max(baseDuration * reductionFactor, minDuration)
  
  return Math.round(reducedDuration)
}

export interface AnimationSequenceItem {
  name: keyof typeof TILE_ANIMATIONS
  delay: number
  config?: Partial<AnimationConfig>
}

export interface ProcessedSequenceItem extends AnimationSequenceItem {
  config: AnimationConfig
}

export function createAnimationSequence(
  items: AnimationSequenceItem[]
): ProcessedSequenceItem[] {
  return items.map(item => ({
    ...item,
    config: getAnimationConfig(item.name, item.config)
  }))
}

export function validateAnimationConfig(config: Partial<AnimationConfig>): boolean {
  // Check required duration
  if (config.duration !== undefined && (config.duration < 0 || config.duration > 5000)) {
    return false
  }
  
  // Validate easing function
  if (config.easing !== undefined) {
    const validEasings = Object.values(ANIMATION_EASINGS)
    const isCubicBezier = config.easing.startsWith('cubic-bezier(')
    const isStandardEasing = ['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear'].includes(config.easing)
    
    if (!validEasings.includes(config.easing as any) && !isCubicBezier && !isStandardEasing) {
      return false
    }
  }
  
  // Validate transform syntax (basic check)
  if (config.transform !== undefined) {
    const validTransforms = ['scale', 'translate', 'rotate', 'skew']
    const hasValidTransform = validTransforms.some(transform => 
      config.transform!.includes(transform)
    )
    
    if (!hasValidTransform && config.transform !== 'none') {
      return false
    }
  }
  
  // Validate opacity range
  if (config.opacity !== undefined && (config.opacity < 0 || config.opacity > 1)) {
    return false
  }
  
  return true
}

// Performance optimization utilities
export function createOptimizedKeyframes(config: AnimationConfig): Record<string, any> {
  const keyframes: Record<string, any> = {}
  
  // Use GPU-accelerated properties
  if (config.transform) {
    keyframes.transform = config.transform
  }
  
  if (config.opacity !== undefined) {
    keyframes.opacity = config.opacity
  }
  
  // Composite transform for multiple properties
  const transforms: string[] = []
  
  if (config.translateX !== undefined) {
    const value = typeof config.translateX === 'number' ? `${config.translateX}px` : config.translateX
    transforms.push(`translateX(${value})`)
  }
  
  if (config.translateY !== undefined) {
    const value = typeof config.translateY === 'number' ? `${config.translateY}px` : config.translateY
    transforms.push(`translateY(${value})`)
  }
  
  if (config.scale !== undefined) {
    transforms.push(`scale(${config.scale})`)
  }
  
  if (config.rotateX !== undefined) {
    transforms.push(`rotateX(${config.rotateX}deg)`)
  }
  
  if (config.rotateY !== undefined) {
    transforms.push(`rotateY(${config.rotateY}deg)`)
  }
  
  if (transforms.length > 0) {
    keyframes.transform = transforms.join(' ')
  }
  
  return keyframes
}

// Animation performance monitoring
export function measureAnimationPerformance(
  animationName: string,
  callback: () => void
): Promise<number> {
  return new Promise((resolve) => {
    const startTime = performance.now()
    
    requestAnimationFrame(() => {
      callback()
      
      requestAnimationFrame(() => {
        const endTime = performance.now()
        const duration = endTime - startTime
        
        // Log performance metrics in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`Animation "${animationName}" took ${duration.toFixed(2)}ms`)
        }
        
        resolve(duration)
      })
    })
  })
}