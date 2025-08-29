// Animation constants and utility functions exported from TileAnimations
// Separated to fix React Fast Refresh issues

// Animation constants
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