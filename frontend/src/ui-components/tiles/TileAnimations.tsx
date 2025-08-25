// Tile Animation Definitions and CSS-in-JS Keyframes
// Centralized animation definitions for tile interactions

import React from 'react'
import { useAnimations } from '../../hooks/useAnimations'
import { usePerformance } from '../../hooks/usePerformance'

interface TileAnimationWrapperProps {
  children: React.ReactNode
  animationName?: string
  trigger?: boolean
  onComplete?: () => void
}

export const TileAnimationWrapper = ({
  children,
  animationName,
  trigger = false,
  onComplete
}: TileAnimationWrapperProps) => {
  const { playAnimation, animationState } = useAnimations()
  const { shouldReduceAnimations } = usePerformance()
  
  React.useEffect(() => {
    if (trigger && animationName && !shouldReduceAnimations) {
      playAnimation(animationName as keyof typeof import('../../utils/animation-config').TILE_ANIMATIONS)
        .then(() => onComplete?.())
        .catch(() => onComplete?.()) // Still call onComplete even if animation fails
    }
  }, [trigger, animationName, playAnimation, onComplete, shouldReduceAnimations])
  
  return (
    <div
      className="tile-animation-wrapper"
      data-animating={animationState.isAnimating}
      data-animation={animationState.currentAnimation}
      data-progress={animationState.progress}
    >
      {children}
    </div>
  )
}

// Animation constants and utility functions
export const TILE_KEYFRAMES = {
  // Basic keyframe animations
  bounce: [
    { transform: 'scale(1)' },
    { transform: 'scale(1.2)' },
    { transform: 'scale(1)' }
  ],
  pulse: [
    { opacity: 1 },
    { opacity: 0.7 },
    { opacity: 1 }
  ],
  shake: [
    { transform: 'translateX(0)' },
    { transform: 'translateX(-5px)' },
    { transform: 'translateX(5px)' },
    { transform: 'translateX(0)' }
  ]
}

export const applyTileAnimation = (element: HTMLElement, animationName: string) => {
  // Simple animation application
  if (TILE_KEYFRAMES[animationName as keyof typeof TILE_KEYFRAMES]) {
    element.animate(TILE_KEYFRAMES[animationName as keyof typeof TILE_KEYFRAMES], {
      duration: 300,
      easing: 'ease-in-out'
    })
  }
}

export const createAnimationCSS = (animationName: string) => {
  // Return CSS animation string
  return `${animationName} 0.3s ease-in-out`
}

export const createSequenceCSS = (animations: string[]) => {
  // Return sequence of animations
  return animations.join(', ')
}