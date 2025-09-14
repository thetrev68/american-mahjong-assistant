// Animation State Management Hook

import { useCallback, useRef, useState, useEffect } from 'react'
import { 
  getAnimationConfig, 
  getOptimizedDuration, 
  createAnimationSequence,
  TILE_ANIMATIONS,
  type AnimationConfig,
  type AnimationSequenceItem
} from '../utils/animation-config'
import { useReducedMotion } from '../utils/reduced-motion'

interface AnimationState {
  isAnimating: boolean
  currentAnimation: string | null
  progress: number
  queuedAnimations: string[]
}

export interface UseAnimationsReturn {
  // State
  animationState: AnimationState
  isReducedMotion: boolean
  
  // Actions
  playAnimation: (name: keyof typeof TILE_ANIMATIONS, config?: Partial<AnimationConfig>) => Promise<void>
  playSequence: (sequence: AnimationSequenceItem[]) => Promise<void>
  stopAnimation: () => void
  clearQueue: () => void
  
  // Utilities
  getConfig: (name: keyof typeof TILE_ANIMATIONS, overrides?: Partial<AnimationConfig>) => AnimationConfig
  getDuration: (baseDuration: number) => number
  isAnimationPlaying: (name?: string) => boolean
}

export function useAnimations(): UseAnimationsReturn {
  const [animationState, setAnimationState] = useState<AnimationState>({
    isAnimating: false,
    currentAnimation: null,
    progress: 0,
    queuedAnimations: []
  })
  
  const isReducedMotion = useReducedMotion()
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  const clearTimers = useCallback(() => {
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current)
      animationTimeoutRef.current = null
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
  }, [])
  
  const updateProgress = useCallback((duration: number) => {
    const interval = 16 // 60fps
    const steps = duration / interval
    let currentStep = 0
    
    progressIntervalRef.current = setInterval(() => {
      currentStep++
      const progress = Math.min(currentStep / steps, 1) * 100
      
      setAnimationState(prev => ({
        ...prev,
        progress
      }))
      
      if (progress >= 100) {
        clearInterval(progressIntervalRef.current!)
        progressIntervalRef.current = null
      }
    }, interval)
  }, [])
  
  const playAnimation = useCallback(async (
    name: keyof typeof TILE_ANIMATIONS,
    config?: Partial<AnimationConfig>
  ): Promise<void> => {
    return new Promise((resolve) => {
      // Clear any existing animation
      clearTimers()
      
      const animationConfig = getAnimationConfig(name, config)
      const duration = getOptimizedDuration(animationConfig.duration)
      
      // Update state to indicate animation is starting
      setAnimationState(prev => ({
        ...prev,
        isAnimating: true,
        currentAnimation: name,
        progress: 0,
        queuedAnimations: prev.queuedAnimations.filter(anim => anim !== name)
      }))
      
      // Start progress tracking
      updateProgress(duration)
      
      // Set timeout for animation completion
      animationTimeoutRef.current = setTimeout(() => {
        setAnimationState(prev => ({
          ...prev,
          isAnimating: false,
          currentAnimation: null,
          progress: 100
        }))
        
        clearTimers()
        resolve()
      }, duration)
    })
  }, [clearTimers, updateProgress])
  
  const playSequence = useCallback(async (sequence: AnimationSequenceItem[]): Promise<void> => {
    const processedSequence = createAnimationSequence(sequence)
    
    // Update queue with sequence names
    setAnimationState(prev => ({
      ...prev,
      queuedAnimations: [...prev.queuedAnimations, ...sequence.map(item => item.name)]
    }))
    
    // Play each animation in sequence
    for (const item of processedSequence) {
      // Wait for delay before starting this animation
      if (item.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, item.delay))
      }
      
      // Play the animation without removing from queue
      await new Promise<void>((resolve) => {
        // Clear any existing animation
        clearTimers()
        
        const animationConfig = getAnimationConfig(item.name, item.config)
        const duration = getOptimizedDuration(animationConfig.duration)
        
        // Update state to indicate animation is starting
        setAnimationState(prev => ({
          ...prev,
          isAnimating: true,
          currentAnimation: item.name,
          progress: 0
        }))
        
        // Start progress tracking
        updateProgress(duration)
        
        // Set timeout for animation completion
        animationTimeoutRef.current = setTimeout(() => {
          setAnimationState(prev => ({
            ...prev,
            isAnimating: false,
            currentAnimation: null,
            progress: 100
          }))
          
          clearTimers()
          resolve()
        }, duration)
      })
    }
    
    // Clear the queue after sequence completes
    setAnimationState(prev => ({
      ...prev,
      queuedAnimations: []
    }))
  }, [clearTimers, updateProgress])
  
  const stopAnimation = useCallback(() => {
    clearTimers()
    
    setAnimationState(prev => ({
      ...prev,
      isAnimating: false,
      currentAnimation: null,
      progress: 0
    }))
  }, [clearTimers])
  
  const clearQueue = useCallback(() => {
    setAnimationState(prev => ({
      ...prev,
      queuedAnimations: []
    }))
  }, [])
  
  const getConfig = useCallback((
    name: keyof typeof TILE_ANIMATIONS,
    overrides?: Partial<AnimationConfig>
  ): AnimationConfig => {
    return getAnimationConfig(name, overrides)
  }, [])
  
  const getDuration = useCallback((baseDuration: number): number => {
    return getOptimizedDuration(baseDuration)
  }, [])
  
  const isAnimationPlaying = useCallback((name?: string): boolean => {
    if (!animationState.isAnimating) return false
    if (!name) return true
    return animationState.currentAnimation === name
  }, [animationState.isAnimating, animationState.currentAnimation])
  
  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearTimers()
    }
  }, [clearTimers])
  
  return {
    animationState,
    isReducedMotion,
    playAnimation,
    playSequence,
    stopAnimation,
    clearQueue,
    getConfig,
    getDuration,
    isAnimationPlaying
  }
}

// Specialized hooks for common animation patterns

export function useTileAnimations() {
  const animations = useAnimations()
  
  const selectTile = useCallback(async () => {
    return animations.playAnimation('select')
  }, [animations])
  
  const deselectTile = useCallback(async () => {
    return animations.playAnimation('deselect')
  }, [animations])
  
  const flipTile = useCallback(async () => {
    return animations.playAnimation('flip')
  }, [animations])
  
  const passTile = useCallback(async () => {
    return animations.playAnimation('pass')
  }, [animations])
  
  const highlightTile = useCallback(async () => {
    return animations.playAnimation('highlight')
  }, [animations])
  
  const showRecommendation = useCallback(async () => {
    return animations.playAnimation('recommendation')
  }, [animations])
  
  return {
    ...animations,
    selectTile,
    deselectTile,
    flipTile,
    passTile,
    highlightTile,
    showRecommendation
  }
}

export function useCharlestonAnimations() {
  const animations = useAnimations()
  
  const playPassSequence = useCallback(async (tileCount: number) => {
    const sequence: AnimationSequenceItem[] = []
    
    for (let i = 0; i < tileCount; i++) {
      sequence.push({
        name: 'pass',
        delay: i * 100, // Stagger the passes
        config: { translateX: `${100 + i * 20}px` }
      })
    }
    
    return animations.playSequence(sequence)
  }, [animations])
  
  const playKeepAnimation = useCallback(async () => {
    return animations.playAnimation('keep')
  }, [animations])
  
  return {
    ...animations,
    playPassSequence,
    playKeepAnimation
  }
}

export function useSpecialTileAnimations() {
  const animations = useAnimations()
  
  const playJokerAnimation = useCallback(async () => {
    return animations.playAnimation('joker')
  }, [animations])
  
  const playDragonAnimation = useCallback(async () => {
    return animations.playAnimation('dragon')
  }, [animations])
  
  const playFlowerAnimation = useCallback(async () => {
    return animations.playAnimation('flower')
  }, [animations])
  
  return {
    ...animations,
    playJokerAnimation,
    playDragonAnimation,
    playFlowerAnimation
  }
}