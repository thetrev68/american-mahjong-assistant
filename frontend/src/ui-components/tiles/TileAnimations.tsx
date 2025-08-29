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

