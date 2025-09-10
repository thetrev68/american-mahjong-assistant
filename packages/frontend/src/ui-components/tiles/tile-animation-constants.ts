// Tile Animation Constants
// Separated from React components for Fast Refresh compatibility

// CSS Animation keyframes as JavaScript objects for dynamic application
export const TILE_KEYFRAMES = {
  // Basic interactions
  tileSelect: {
    '0%': {
      transform: 'scale(1) translateY(0)',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    '50%': {
      transform: 'scale(1.05) translateY(-2px)',
      boxShadow: '0 8px 16px rgba(0,0,0,0.15)'
    },
    '100%': {
      transform: 'scale(1.03) translateY(-1px)',
      boxShadow: '0 6px 12px rgba(0,0,0,0.12)'
    }
  },
  
  tileDeselect: {
    '0%': {
      transform: 'scale(1.03) translateY(-1px)',
      boxShadow: '0 6px 12px rgba(0,0,0,0.12)'
    },
    '100%': {
      transform: 'scale(1) translateY(0)',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }
  },
  
  tileFlip: {
    '0%': { transform: 'rotateY(0deg)' },
    '50%': { transform: 'rotateY(90deg)' },
    '100%': { transform: 'rotateY(0deg)' }
  },
  
  // Charleston animations
  tilePass: {
    '0%': {
      transform: 'translateX(0) scale(1)',
      opacity: '1'
    },
    '50%': {
      transform: 'translateX(50px) scale(0.9)',
      opacity: '0.8'
    },
    '100%': {
      transform: 'translateX(100px) scale(0.8)',
      opacity: '0'
    }
  },
  
  tileKeep: {
    '0%': { transform: 'scale(1)' },
    '25%': { transform: 'scale(1.1)' },
    '50%': { transform: 'scale(1.05)' },
    '75%': { transform: 'scale(1.08)' },
    '100%': { transform: 'scale(1)' }
  },
  
  // Game actions
  tileDraw: {
    '0%': {
      transform: 'translateY(20px) scale(0.8)',
      opacity: '0'
    },
    '50%': {
      transform: 'translateY(-5px) scale(1.05)',
      opacity: '0.8'
    },
    '100%': {
      transform: 'translateY(0) scale(1)',
      opacity: '1'
    }
  },
  
  tileDiscard: {
    '0%': {
      transform: 'translateY(0) scale(1)',
      opacity: '1'
    },
    '50%': {
      transform: 'translateY(25px) scale(0.9)',
      opacity: '0.5'
    },
    '100%': {
      transform: 'translateY(50px) scale(0.8)',
      opacity: '0'
    }
  },
  
  // Analysis and recommendations
  tileHighlight: {
    '0%': { boxShadow: '0 0 0 0 rgba(59, 130, 246, 0)' },
    '50%': { boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.5)' },
    '100%': { boxShadow: '0 0 0 0 rgba(59, 130, 246, 0)' }
  },
  
  tileRecommendation: {
    '0%': {
      transform: 'scale(1)',
      backgroundColor: 'transparent'
    },
    '25%': {
      transform: 'scale(1.02)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)'
    },
    '50%': {
      transform: 'scale(1.04)',
      backgroundColor: 'rgba(59, 130, 246, 0.2)'
    },
    '75%': {
      transform: 'scale(1.02)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)'
    },
    '100%': {
      transform: 'scale(1)',
      backgroundColor: 'transparent'
    }
  },
  
  // Special tile types
  jokerGlow: {
    '0%': {
      boxShadow: '0 0 5px rgba(147, 51, 234, 0.3)',
      filter: 'brightness(1)'
    },
    '50%': {
      boxShadow: '0 0 20px rgba(147, 51, 234, 0.8)',
      filter: 'brightness(1.2)'
    },
    '100%': {
      boxShadow: '0 0 5px rgba(147, 51, 234, 0.3)',
      filter: 'brightness(1)'
    }
  },
  
  dragonPulse: {
    '0%': {
      transform: 'scale(1)',
      boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.7)'
    },
    '50%': {
      transform: 'scale(1.05)',
      boxShadow: '0 0 0 10px rgba(239, 68, 68, 0)'
    },
    '100%': {
      transform: 'scale(1)',
      boxShadow: '0 0 0 0 rgba(239, 68, 68, 0)'
    }
  },
  
  flowerSparkle: {
    '0%': { opacity: '0.7', transform: 'rotate(0deg) scale(1)' },
    '25%': { opacity: '1', transform: 'rotate(5deg) scale(1.02)' },
    '50%': { opacity: '0.9', transform: 'rotate(0deg) scale(1.04)' },
    '75%': { opacity: '1', transform: 'rotate(-5deg) scale(1.02)' },
    '100%': { opacity: '0.7', transform: 'rotate(0deg) scale(1)' }
  }
} as const

// Performance-optimized animation application
export const applyTileAnimation = (
  element: HTMLElement | null,
  animationName: keyof typeof TILE_KEYFRAMES,
  duration: number = 300,
  easing: string = 'ease-out'
) => {
  if (!element) return Promise.resolve()
  
  return new Promise<void>((resolve) => {
    const keyframes = TILE_KEYFRAMES[animationName]
    if (!keyframes) {
      resolve()
      return
    }
    
    // Use Web Animations API for better performance
    const animation = element.animate(Object.values(keyframes), {
      duration,
      easing,
      fill: 'forwards'
    })
    
    animation.addEventListener('finish', () => resolve())
    animation.addEventListener('cancel', () => resolve())
  })
}

// Utility for creating CSS animation classes
export const createAnimationCSS = (
  animationName: keyof typeof TILE_KEYFRAMES,
  duration: string = '300ms',
  easing: string = 'ease-out',
  delay: string = '0ms'
) => {
  return {
    animation: `${animationName} ${duration} ${easing} ${delay} forwards`,
    animationFillMode: 'both'
  } as React.CSSProperties
}

// Batch animation utilities for sequences
export const createSequenceCSS = (
  animations: Array<{
    name: keyof typeof TILE_KEYFRAMES
    duration?: string
    delay?: string
    easing?: string
  }>
) => {
  const animationValues = animations.map(({ name, duration = '300ms', delay = '0ms', easing = 'ease-out' }) =>
    `${name} ${duration} ${easing} ${delay} forwards`
  ).join(', ')
  
  return {
    animation: animationValues,
    animationFillMode: 'both'
  } as React.CSSProperties
}