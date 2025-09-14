import { useRef } from 'react'
import type { PlayerTile } from 'shared-types';

// Hook for using the tile effects controller
export const useTileEffects = () => {
  const controllerRef = useRef<{
    triggerEffect: (tile: PlayerTile, action: string, options?: {
      intensity?: 'light' | 'medium' | 'heavy'
      priority?: 'low' | 'normal' | 'high'
    }) => void
    clearQueue: () => void
    getQueueLength: () => number
    getPerformanceMetrics: () => unknown
  } | null>(null)

  const triggerTileEffect = (
    tile: PlayerTile, 
    action: string, 
    options?: {
      intensity?: 'light' | 'medium' | 'heavy'
      priority?: 'low' | 'normal' | 'high'
    }
  ) => {
    controllerRef.current?.triggerEffect(tile, action, options)
  }

  const clearEffectQueue = () => {
    controllerRef.current?.clearQueue()
  }

  const getEffectQueueLength = () => {
    return controllerRef.current?.getQueueLength() ?? 0
  }

  const getEffectPerformanceMetrics = () => {
    return controllerRef.current?.getPerformanceMetrics()
  }

  return {
    triggerTileEffect,
    clearEffectQueue,
    getEffectQueueLength,
    getEffectPerformanceMetrics,
    setControllerRef: (ref: typeof controllerRef.current) => {
      controllerRef.current = ref
    }
  }
}