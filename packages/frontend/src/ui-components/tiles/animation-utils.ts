// Animation Utility Functions for Tiles
// Helper functions for complex tile animations and sequences

import type { PlayerTile } from 'shared-types'
import { TILE_KEYFRAMES, applyTileAnimation } from './tile-animation-constants'
import { TILE_ANIMATIONS } from '../../utils/animation-config'

export type TileAnimationContext = 'charleston' | 'gameplay' | 'analysis' | 'selection'
export type TileRecommendationType = 'keep' | 'pass' | 'discard' | 'joker'

// Determine appropriate animation based on tile properties and context
export const getContextualAnimation = (
  tile: PlayerTile,
  context: TileAnimationContext,
  recommendation?: TileRecommendationType
): keyof typeof TILE_ANIMATIONS => {
  // Special tile handling
  if (tile.id === 'joker') {
    return 'joker'
  }
  
  const isDragon = ['red-dragon', 'green-dragon', 'white-dragon'].includes(tile.id)
  if (isDragon) {
    return 'dragon'
  }
  
  const isFlower = ['flower-1', 'flower-2', 'flower-3', 'flower-4', 'season-1', 'season-2', 'season-3', 'season-4'].includes(tile.id)
  if (isFlower) {
    return 'flower'
  }
  
  // Context-based animations
  switch (context) {
    case 'charleston':
      if (recommendation === 'pass') return 'pass'
      if (recommendation === 'keep') return 'keep'
      return 'highlight'
      
    case 'gameplay':
      if (tile.isSelected) return 'select'
      return 'hover'
      
    case 'analysis':
      if (recommendation === 'discard') return 'highlight'
      if (recommendation === 'keep') return 'keep'
      return 'recommendation'
      
    case 'selection':
    default:
      return tile.isSelected ? 'select' : 'deselect'
  }
}

// Create staggered animation sequence for multiple tiles
export const createTileSequence = (
  tiles: PlayerTile[],
  baseAnimation: keyof typeof TILE_ANIMATIONS,
  staggerDelay: number = 50
) => {
  return tiles.map((tile, index) => ({
    tile,
    animation: getContextualAnimation(tile, 'selection'),
    delay: index * staggerDelay,
    duration: TILE_ANIMATIONS[baseAnimation]?.duration || 300
  }))
}

// Batch animate multiple tiles with performance optimization
export const animateTilesBatch = async (
  elements: HTMLElement[],
  animations: Array<{
    animation: keyof typeof TILE_KEYFRAMES
    delay?: number
    duration?: number
  }>,
  options: {
    maxConcurrent?: number
    respectReducedMotion?: boolean
  } = {}
) => {
  const { maxConcurrent = 5, respectReducedMotion = true } = options
  
  // Check for reduced motion preference
  if (respectReducedMotion && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return Promise.resolve()
  }
  
  // Group animations to prevent overwhelming the browser
  const batches: Array<Promise<void>[]> = []
  
  for (let i = 0; i < elements.length; i += maxConcurrent) {
    const batch = elements.slice(i, i + maxConcurrent).map((element, batchIndex) => {
      const animationConfig = animations[i + batchIndex]
      if (!animationConfig) return Promise.resolve()
      
      const { animation, delay = 0, duration = 300 } = animationConfig
      
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          applyTileAnimation(element, animation, duration)
          setTimeout(resolve, duration)
        }, delay)
      })
    })
    
    batches.push(batch)
  }
  
  // Execute batches sequentially to maintain performance
  for (const batch of batches) {
    await Promise.all(batch)
  }
}

// Charleston-specific animation utilities
export const createCharlestonPassSequence = (
  passingTiles: PlayerTile[],
  direction: 'left' | 'right' | 'across'
) => {
  const baseDelay = 100
  const directionMultiplier = {
    left: 1,
    right: 1.2,
    across: 1.5
  }
  
  return passingTiles.map((tile, index) => ({
    tile,
    animation: 'pass' as const,
    delay: index * baseDelay * directionMultiplier[direction],
    duration: 400,
    transform: getPassDirection(direction)
  }))
}

const getPassDirection = (direction: 'left' | 'right' | 'across') => {
  switch (direction) {
    case 'left': return 'translateX(-100px)'
    case 'right': return 'translateX(100px)'
    case 'across': return 'translateY(-100px)'
    default: return 'translateX(100px)'
  }
}

// Gameplay animation utilities
export const createDrawAnimation = (tile: PlayerTile, position: number) => ({
  tile,
  animation: 'draw' as const,
  delay: position * 75, // Stagger draws
  duration: 350,
  easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)' // Spring easing
})

export const createDiscardAnimation = (tile: PlayerTile) => ({
  tile,
  animation: 'discard' as const,
  delay: 0,
  duration: 300,
  easing: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)' // Ease-in
})

// Analysis animation utilities
export const createRecommendationHighlight = (
  tiles: PlayerTile[],
  recommendations: Record<string, TileRecommendationType>
) => {
  return tiles.map((tile, index) => {
    const recommendation = recommendations[tile.id]
    if (!recommendation) return null
    
    return {
      tile,
      animation: getRecommendationAnimation(recommendation),
      delay: index * 30, // Quick succession for analysis
      duration: getRecommendationDuration(recommendation)
    }
  }).filter(Boolean)
}

const getRecommendationAnimation = (type: TileRecommendationType): keyof typeof TILE_KEYFRAMES => {
  switch (type) {
    case 'keep': return 'tileKeep'
    case 'pass': return 'tilePass'
    case 'discard': return 'tileDiscard'
    case 'joker': return 'jokerGlow'
    default: return 'tileRecommendation'
  }
}

const getRecommendationDuration = (type: TileRecommendationType): number => {
  switch (type) {
    case 'keep': return 200
    case 'pass': return 400
    case 'discard': return 100
    case 'joker': return 800
    default: return 500
  }
}

// Performance monitoring for animations
export const withPerformanceTracking = <T extends unknown[]>(
  animationFn: (...args: T) => Promise<void>,
  name: string
) => {
  return async (...args: T) => {
    const startTime = performance.now()
    
    try {
      await animationFn(...args)
    } finally {
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // Log slow animations for debugging
      if (duration > 100) {
        // Slow animation detected
      }
      
      // Track in performance metrics if available
      if ('getEntriesByType' in performance) {
        performance.mark(`tile-animation-${name}-end`)
        performance.measure(
          `tile-animation-${name}`,
          `tile-animation-${name}-start`,
          `tile-animation-${name}-end`
        )
      }
    }
  }
}

// Accessibility helpers
export const announceAnimationToScreenReaders = (
  action: string,
  tile: PlayerTile,
  context?: string
) => {
  const announcement = `${action} ${tile.id}${context ? ` in ${context}` : ''}`
  
  // Create temporary element for screen reader announcement
  const announcer = document.createElement('div')
  announcer.setAttribute('aria-live', 'polite')
  announcer.setAttribute('aria-atomic', 'true')
  announcer.className = 'sr-only'
  announcer.textContent = announcement
  
  document.body.appendChild(announcer)
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcer)
  }, 1000)
}