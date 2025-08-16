// Simple useAnimations Hook Test

import { renderHook } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import { useAnimations } from '../useAnimations'

// Mock all dependencies
vi.mock('../../utils/animation-config', () => ({
  getAnimationConfig: vi.fn(() => ({ duration: 300, easing: 'ease-out' })),
  getOptimizedDuration: vi.fn((duration) => duration),
  createAnimationSequence: vi.fn((sequence) => sequence),
  TILE_ANIMATIONS: {
    select: { duration: 200, easing: 'ease-out' }
  }
}))

vi.mock('../../utils/reduced-motion', () => ({
  useReducedMotion: vi.fn(() => false)
}))

describe('Simple useAnimations Test', () => {
  it('should render without throwing', () => {
    const { result } = renderHook(() => useAnimations())
    
    expect(result.current).toBeDefined()
    expect(result.current).not.toBeNull()
  })
  
  it('should return initial state', () => {
    const { result } = renderHook(() => useAnimations())
    
    expect(result.current.animationState).toEqual({
      isAnimating: false,
      currentAnimation: null,
      progress: 0,
      queuedAnimations: []
    })
  })
})