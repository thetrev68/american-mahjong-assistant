// Tile Effects Controller - Orchestrates animations, haptics, and performance
// Provides unified interface for all tile visual and tactile feedback

import React, { useCallback, useRef, useMemo } from 'react'
import type { PlayerTile } from '../../types/tile-types'
import { useTileAnimations, useSpecialTileAnimations } from '../../hooks/useAnimations'
import { useContextualHaptics } from '../../hooks/useHapticFeedback'
import { useAdaptivePerformance } from '../../hooks/usePerformance'

export interface TileEffectsConfig {
  enableAnimations: boolean
  enableHaptics: boolean
  adaptiveQuality: boolean
  context: 'selection' | 'charleston' | 'gameplay' | 'analysis'
}

export interface TileEffectTrigger {
  tile: PlayerTile
  action: string
  intensity?: 'light' | 'medium' | 'heavy'
  priority?: 'low' | 'normal' | 'high'
}

interface TileEffectsControllerProps {
  config: TileEffectsConfig
  onEffectComplete?: (trigger: TileEffectTrigger) => void
  onPerformanceChange?: (quality: 'high' | 'medium' | 'low') => void
}

export const TileEffectsController = React.memo(({
  config,
  onEffectComplete,
  onPerformanceChange
}: TileEffectsControllerProps) => {
  const tileAnimations = useTileAnimations()
  const specialAnimations = useSpecialTileAnimations()
  const haptics = useContextualHaptics('tile')
  const performance = useAdaptivePerformance()
  
  const effectQueueRef = useRef<TileEffectTrigger[]>([])
  const processingRef = useRef(false)
  
  // Memoized effect quality settings based on performance
  const effectQuality = useMemo(() => {
    if (!config.adaptiveQuality) {
      return {
        animationDuration: 1.0,
        hapticIntensity: 1.0,
        visualEffects: true,
        concurrentLimit: 5
      }
    }
    
    const { animationQuality, enableParticleEffects, enableShadows, maxConcurrentAnimations } = performance.adaptiveSettings
    
    switch (animationQuality) {
      case 'high':
        return {
          animationDuration: 1.0,
          hapticIntensity: 1.0,
          visualEffects: enableParticleEffects && enableShadows,
          concurrentLimit: maxConcurrentAnimations
        }
      case 'medium':
        return {
          animationDuration: 0.75,
          hapticIntensity: 0.8,
          visualEffects: enableShadows,
          concurrentLimit: maxConcurrentAnimations
        }
      case 'low':
        return {
          animationDuration: 0.5,
          hapticIntensity: 0.6,
          visualEffects: false,
          concurrentLimit: maxConcurrentAnimations
        }
      default:
        return {
          animationDuration: 1.0,
          hapticIntensity: 1.0,
          visualEffects: true,
          concurrentLimit: 5
        }
    }
  }, [config.adaptiveQuality, performance.adaptiveSettings])
  
  // Effects are automatically handled by the processing system
  
  // Execute animation based on tile and action
  const executeAnimation = useCallback(async (tile: PlayerTile, action: string) => {
    // Determine if special tile
    const isJoker = tile.id === 'joker'
    const isDragon = ['red-dragon', 'green-dragon', 'white-dragon'].includes(tile.id)
    const isFlower = ['flower-1', 'flower-2', 'flower-3', 'flower-4', 'season-1', 'season-2', 'season-3', 'season-4'].includes(tile.id)
    
    // Apply duration scaling (for future use)
    // const originalDuration = performance.getDuration || ((d: number) => d)
    // const scaledDuration = (baseDuration: number) => 
    //   originalDuration(baseDuration * effectQuality.animationDuration)
    
    // Route to appropriate animation
    switch (action) {
      case 'select':
        if (isJoker) return specialAnimations.playJokerAnimation()
        if (isDragon) return specialAnimations.playDragonAnimation()
        if (isFlower) return specialAnimations.playFlowerAnimation()
        return tileAnimations.selectTile()
        
      case 'deselect':
        return tileAnimations.deselectTile()
        
      case 'flip':
        return tileAnimations.flipTile()
        
      case 'pass':
        return tileAnimations.passTile()
        
      case 'highlight':
        return tileAnimations.highlightTile()
        
      case 'recommendation':
        return tileAnimations.showRecommendation()
        
      case 'keep':
        return tileAnimations.highlightTile()
        
      case 'special':
        if (isJoker) return specialAnimations.playJokerAnimation()
        if (isDragon) return specialAnimations.playDragonAnimation()  
        if (isFlower) return specialAnimations.playFlowerAnimation()
        return tileAnimations.highlightTile()
        
      default:
        return tileAnimations.highlightTile()
    }
  }, [tileAnimations, specialAnimations])
  
  // Execute haptic feedback
  const executeHaptic = useCallback(async (action: string, intensity: string) => {
    // Intensity is adjusted within haptic system
    // const adjustedIntensity = Math.min(1.0, effectQuality.hapticIntensity)
    
    // Route to contextual haptic based on action
    switch (action) {
      case 'select':
        return haptics.contextualFeedback('select')
      case 'deselect':
        return haptics.contextualFeedback('deselect')
      case 'flip':
        return haptics.contextualFeedback('flip')
      case 'pass':
        return haptics.contextualFeedback('pass')
      case 'error':
        return haptics.contextualFeedback('error')
      case 'keep':
        return haptics.contextualFeedback('keep')
      default:
        // Use intensity-based feedback for custom actions
        switch (intensity) {
          case 'light': return haptics.triggerLight()
          case 'heavy': return haptics.triggerHeavy()
          default: return haptics.triggerMedium()
        }
    }
  }, [haptics])
  
  // Process individual effect
  const processEffect = useCallback(async (trigger: TileEffectTrigger) => {
    const { tile, action, intensity = 'medium' } = trigger
    
    try {
      // Parallel execution of animation and haptic feedback
      const promises: Promise<unknown>[] = []
      
      // Animation
      if (config.enableAnimations && !performance.shouldReduceAnimations) {
        promises.push(executeAnimation(tile, action))
      }
      
      // Haptic feedback
      if (config.enableHaptics) {
        promises.push(executeHaptic(action, intensity))
      }
      
      await Promise.allSettled(promises)
      onEffectComplete?.(trigger)
      
    } catch {
      // Tile effect processing failed silently
      onEffectComplete?.(trigger) // Still call completion callback
    }
  }, [config.enableAnimations, config.enableHaptics, performance.shouldReduceAnimations, onEffectComplete, executeAnimation, executeHaptic])
  
  // Process queued effects with concurrency control
  const processEffectQueue = useCallback(async () => {
    if (processingRef.current || effectQueueRef.current.length === 0) return
    
    processingRef.current = true
    
    try {
      // Process effects up to concurrent limit
      const currentBatch = effectQueueRef.current.splice(0, effectQuality.concurrentLimit)
      
      // Group by priority
      const highPriority = currentBatch.filter(t => t.priority === 'high')
      const normalPriority = currentBatch.filter(t => t.priority === 'normal' || !t.priority)
      const lowPriority = currentBatch.filter(t => t.priority === 'low')
      
      // Process in priority order
      for (const priorityGroup of [highPriority, normalPriority, lowPriority]) {
        if (priorityGroup.length === 0) continue
        
        // Process group concurrently
        await Promise.allSettled(
          priorityGroup.map(trigger => processEffect(trigger))
        )
      }
    } finally {
      processingRef.current = false
      
      // Continue processing if more effects are queued
      if (effectQueueRef.current.length > 0) {
        setTimeout(processEffectQueue, 16) // Next frame
      }
    }
  }, [effectQuality.concurrentLimit, processEffect])
  
  // Report performance changes
  React.useEffect(() => {
    onPerformanceChange?.(performance.adaptiveSettings.animationQuality)
  }, [performance.adaptiveSettings.animationQuality, onPerformanceChange])
  
  // Effects are handled internally by the queue processor
  // The controller component manages effects automatically
  
  // Controller component provides effects through context or props
  
  return null // This is a controller component, no UI
})

TileEffectsController.displayName = 'TileEffectsController'

// Hook is now exported from hooks/useTileEffects.ts for Fast Refresh compatibility
// export { useTileEffects } from '../../hooks/useTileEffects' - removed to fix Fast Refresh