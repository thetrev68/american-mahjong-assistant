// Animated Tile Component with comprehensive animation system
// Extends the basic Tile component with contextual animations

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import type { PlayerTile } from '../../types/tile-types'
import { Tile } from '../Tile'
import { useTileAnimations, useSpecialTileAnimations } from '../../hooks/useAnimations'
import { useHapticFeedback } from '../../hooks/useHapticFeedback'
import { usePerformance } from '../../hooks/usePerformance'
import { getAnimationConfig, createOptimizedKeyframes } from '../../utils/animation-config'

interface AnimatedTileProps {
  tile: PlayerTile
  size?: 'sm' | 'md' | 'lg' | 'xl'
  interactive?: boolean
  onClick?: (tile: PlayerTile) => void
  onDoubleClick?: (tile: PlayerTile) => void
  className?: string
  children?: React.ReactNode
  
  // Animation props
  animateOnMount?: boolean
  animateOnSelect?: boolean
  animateOnRecommendation?: boolean
  enableHaptics?: boolean
  
  // Context-specific animations
  context?: 'charleston' | 'gameplay' | 'analysis' | 'selection'
  recommendationType?: 'keep' | 'pass' | 'discard' | 'joker'
}

export const AnimatedTile = ({
  tile,
  size = 'md',
  interactive = true,
  onClick,
  onDoubleClick,
  className = '',
  children,
  animateOnMount = false,
  animateOnSelect = true,
  animateOnRecommendation = true,
  enableHaptics = true,
  context = 'selection',
  recommendationType
}: AnimatedTileProps) => {
  const tileRef = useRef<HTMLDivElement>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [lastSelectedState, setLastSelectedState] = useState(tile.isSelected)
  
  // Animation hooks
  const tileAnimations = useTileAnimations()
  const specialAnimations = useSpecialTileAnimations()
  const haptics = useHapticFeedback()
  const performance = usePerformance()
  
  // Get current animation state for visual effects
  const { animationState } = tileAnimations
  
  // Determine if this is a special tile type
  const isJoker = tile.id === 'joker'
  const isDragon = ['red-dragon', 'green-dragon', 'white-dragon'].includes(tile.id)
  const isFlower = ['flower-1', 'flower-2', 'flower-3', 'flower-4', 'season-1', 'season-2', 'season-3', 'season-4'].includes(tile.id)
  
  // Helper to determine if this is a special tile
  const isSpecialTile = useCallback(() => {
    return isJoker || isDragon || isFlower
  }, [isJoker, isDragon, isFlower])
  
  // Play appropriate special tile animation
  const playSpecialTileAnimation = useCallback(async () => {
    if (performance.shouldReduceAnimations) return
    
    setIsAnimating(true)
    
    try {
      if (isJoker) {
        await specialAnimations.playJokerAnimation()
      } else if (isDragon) {
        await specialAnimations.playDragonAnimation()
      } else if (isFlower) {
        await specialAnimations.playFlowerAnimation()
      }
    } finally {
      setIsAnimating(false)
    }
  }, [isJoker, isDragon, isFlower, specialAnimations, performance.shouldReduceAnimations])
  
  // Handle select animation with haptics
  const handleSelectAnimation = useCallback(async () => {
    if (performance.shouldReduceAnimations) return
    
    setIsAnimating(true)
    
    try {
      // Play haptic feedback if enabled
      if (enableHaptics) {
        if (isSpecialTile()) {
          await haptics.triggerMedium()
        } else {
          await haptics.tileSelect()
        }
      }
      
      // Play appropriate animation based on context and tile type
      if (isSpecialTile()) {
        await playSpecialTileAnimation()
      } else {
        await tileAnimations.selectTile()
      }
    } finally {
      setIsAnimating(false)
    }
  }, [tileAnimations, haptics, enableHaptics, isSpecialTile, playSpecialTileAnimation, performance.shouldReduceAnimations])
  
  // Handle deselect animation
  const handleDeselectAnimation = useCallback(async () => {
    if (performance.shouldReduceAnimations) return
    
    setIsAnimating(true)
    
    try {
      if (enableHaptics) {
        await haptics.tileDeselect()
      }
      
      await tileAnimations.deselectTile()
    } finally {
      setIsAnimating(false)
    }
  }, [tileAnimations, haptics, enableHaptics, performance.shouldReduceAnimations])
  
  // Handle recommendation animations
  const playRecommendationAnimation = useCallback(async () => {
    if (!animateOnRecommendation || performance.shouldReduceAnimations) return
    
    setIsAnimating(true)
    
    try {
      if (enableHaptics) {
        await haptics.triggerLight()
      }
      
      switch (recommendationType) {
        case 'keep':
          await (tileAnimations.playKeepAnimation?.() || tileAnimations.highlightTile())
          break
        case 'pass':
          await tileAnimations.passTile()
          break
        case 'discard':
          await tileAnimations.highlightTile()
          break
        case 'joker':
          await specialAnimations.playJokerAnimation()
          break
        default:
          await tileAnimations.showRecommendation()
      }
    } finally {
      setIsAnimating(false)
    }
  }, [recommendationType, tileAnimations, specialAnimations, haptics, enableHaptics, animateOnRecommendation, performance.shouldReduceAnimations])
  
  // Handle click with animations
  const handleClick = useCallback(async (clickedTile: PlayerTile) => {
    // Play flip animation on click if not already selected
    if (!clickedTile.isSelected && !isAnimating) {
      await tileAnimations.flipTile()
    }
    
    onClick?.(clickedTile)
  }, [onClick, tileAnimations, isAnimating])
  
  // Handle double click with special animation
  const handleDoubleClick = useCallback(async (clickedTile: PlayerTile) => {
    if (!isAnimating) {
      if (isSpecialTile()) {
        await playSpecialTileAnimation()
      } else {
        await tileAnimations.highlightTile()
      }
    }
    
    onDoubleClick?.(clickedTile)
  }, [onDoubleClick, isSpecialTile, playSpecialTileAnimation, tileAnimations, isAnimating])
  
  // Sync animation state
  useEffect(() => {
    setIsAnimating(animationState.isAnimating)
  }, [animationState.isAnimating])
  
  // Watch for selection changes and trigger animations
  useEffect(() => {
    if (tile.isSelected !== lastSelectedState) {
      setLastSelectedState(tile.isSelected)
      if (animateOnSelect && !performance.shouldReduceAnimations) {
        if (tile.isSelected) {
          handleSelectAnimation()
        } else {
          handleDeselectAnimation()
        }
      }
    }
  }, [tile.isSelected, lastSelectedState, animateOnSelect, handleSelectAnimation, handleDeselectAnimation, performance.shouldReduceAnimations])
  
  // Generate CSS styles based on current animation state
  const getAnimationStyles = useMemo(() => {
    if (!animationState.isAnimating || !animationState.currentAnimation || performance.shouldReduceAnimations) {
      return {}
    }
    
    try {
      const config = getAnimationConfig(animationState.currentAnimation as keyof typeof import('../../utils/animation-config').TILE_ANIMATIONS)
      const keyframes = createOptimizedKeyframes(config)
      
      return {
        transform: keyframes.transform || 'none',
        opacity: keyframes.opacity !== undefined ? keyframes.opacity : 1,
        transition: `all ${config.duration}ms ${config.easing}`,
        willChange: 'transform, opacity'
      }
    } catch (error) {
      console.warn('Animation style generation failed:', error)
      return {}
    }
  }, [animationState.isAnimating, animationState.currentAnimation, performance.shouldReduceAnimations])
  
  // Generate dynamic classes based on animation state and context
  const getAnimationClasses = useCallback(() => {
    const classes = []
    
    // Base animation classes
    if (isAnimating || animationState.isAnimating) {
      classes.push('animate-pulse')
    }
    
    // Always apply transition for smooth hover effects
    classes.push('transition-all duration-200 ease-out')
    
    // Context-specific classes
    switch (context) {
      case 'charleston':
        classes.push('transition-transform duration-300 ease-in-out')
        if (recommendationType === 'pass') {
          classes.push('hover:translate-x-2')
        }
        break
      case 'gameplay':
        classes.push('transition-all duration-200 ease-out')
        break
      case 'analysis':
        if (recommendationType) {
          classes.push('ring-2 ring-offset-2')
          switch (recommendationType) {
            case 'keep':
              classes.push('ring-green-400')
              break
            case 'pass':
              classes.push('ring-yellow-400')
              break
            case 'discard':
              classes.push('ring-red-400')
              break
            case 'joker':
              classes.push('ring-purple-400 animate-pulse')
              break
          }
        }
        break
      case 'selection':
      default:
        if (tile.isSelected) {
          classes.push('transform scale-105')
        } else {
          classes.push('hover:scale-102 hover:shadow-md')
        }
        break
    }
    
    // Special tile visual effects
    if (isSpecialTile() && !performance.shouldReduceAnimations) {
      if (isJoker) {
        classes.push('drop-shadow-lg')
      } else if (isDragon) {
        classes.push('shadow-md')
      } else if (isFlower) {
        classes.push('brightness-110')
      }
    }
    
    return classes.join(' ')
  }, [isAnimating, context, recommendationType, tile.isSelected, isSpecialTile, isJoker, isDragon, isFlower, performance.shouldReduceAnimations])
  
  // Expose animation methods for external control
  React.useImperativeHandle(tileRef, () => ({
    playRecommendationAnimation,
    playSpecialAnimation: playSpecialTileAnimation,
    selectAnimation: handleSelectAnimation,
    deselectAnimation: handleDeselectAnimation,
    isAnimating: isAnimating
  }), [playRecommendationAnimation, playSpecialTileAnimation, handleSelectAnimation, handleDeselectAnimation, isAnimating])
  
  return (
    <div 
      ref={tileRef}
      className={`relative ${getAnimationClasses()} ${className}`}
      style={getAnimationStyles}
      data-context={context}
      data-special-tile={isSpecialTile()}
      data-animating={animationState.isAnimating || isAnimating}
    >
      <Tile
        tile={tile}
        size={size}
        interactive={interactive && !isAnimating}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      />
      
      {/* Animation overlay for special effects */}
      {isAnimating && !performance.shouldReduceAnimations && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Glow effect for special tiles */}
          {isSpecialTile() && (
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
          )}
          
          {/* Recommendation indicators */}
          {recommendationType && (
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-bounce">
              {recommendationType === 'keep' && <div className="w-full h-full bg-green-400 rounded-full" />}
              {recommendationType === 'pass' && <div className="w-full h-full bg-yellow-400 rounded-full" />}
              {recommendationType === 'discard' && <div className="w-full h-full bg-red-400 rounded-full" />}
              {recommendationType === 'joker' && <div className="w-full h-full bg-purple-400 rounded-full animate-spin" />}
            </div>
          )}
        </div>
      )}
      
      {children}
    </div>
  )
}