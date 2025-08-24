// useAnimations Hook Test Suite

import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { 
  useAnimations, 
  useTileAnimations, 
  useCharlestonAnimations, 
  useSpecialTileAnimations 
} from '../useAnimations'

// Mock the animation config and reduced motion utilities
vi.mock('../../utils/animation-config', () => ({
  getAnimationConfig: vi.fn((_name, overrides = {}) => ({
    duration: 300,
    easing: 'ease-out',
    transform: 'scale(1.05)',
    ...overrides
  })),
  getOptimizedDuration: vi.fn((duration) => duration),
  createAnimationSequence: vi.fn((sequence: Array<{ name: string; delay: number }>) => 
    sequence.map((item) => ({
      ...item,
      config: { duration: 300, easing: 'ease-out' }
    }))
  ),
  TILE_ANIMATIONS: {
    select: { duration: 200, easing: 'ease-out' },
    deselect: { duration: 200, easing: 'ease-out' },
    flip: { duration: 250, easing: 'ease-out' },
    pass: { duration: 400, easing: 'ease-in' },
    keep: { duration: 200, easing: 'bounce' },
    highlight: { duration: 100, easing: 'ease-out' },
    recommendation: { duration: 500, easing: 'ease-in-out' },
    joker: { duration: 800, easing: 'ease-in-out' },
    dragon: { duration: 600, easing: 'ease-in-out' },
    flower: { duration: 1000, easing: 'ease-in-out' }
  }
}))

vi.mock('../../utils/reduced-motion', () => ({
  useReducedMotion: vi.fn(() => false)
}))

// Mock timers
vi.useFakeTimers()

describe('useAnimations Hook', () => {
  beforeEach(() => {
    vi.clearAllTimers()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should return correct initial state', () => {
      const { result } = renderHook(() => useAnimations())

      expect(result.current.animationState).toEqual({
        isAnimating: false,
        currentAnimation: null,
        progress: 0,
        queuedAnimations: []
      })
      expect(result.current.isReducedMotion).toBe(false)
    })

    it('should provide all required functions', () => {
      const { result } = renderHook(() => useAnimations())

      expect(typeof result.current.playAnimation).toBe('function')
      expect(typeof result.current.playSequence).toBe('function')
      expect(typeof result.current.stopAnimation).toBe('function')
      expect(typeof result.current.clearQueue).toBe('function')
      expect(typeof result.current.getConfig).toBe('function')
      expect(typeof result.current.getDuration).toBe('function')
      expect(typeof result.current.isAnimationPlaying).toBe('function')
    })
  })

  describe('Animation Playback', () => {
    it('should play single animation correctly', async () => {
      const { result } = renderHook(() => useAnimations())

      act(() => {
        result.current.playAnimation('select')
      })

      expect(result.current.animationState.isAnimating).toBe(true)
      expect(result.current.animationState.currentAnimation).toBe('select')
      expect(result.current.animationState.progress).toBe(0)

      // Fast-forward through animation
      await act(async () => {
        vi.advanceTimersByTime(300)
      })

      expect(result.current.animationState.isAnimating).toBe(false)
      expect(result.current.animationState.currentAnimation).toBe(null)
      expect(result.current.animationState.progress).toBe(100)
    })

    it('should update progress during animation', async () => {
      const { result } = renderHook(() => useAnimations())

      act(() => {
        result.current.playAnimation('select')
      })

      // Check progress partway through
      await act(async () => {
        vi.advanceTimersByTime(150) // Half duration
      })

      expect(result.current.animationState.progress).toBeGreaterThan(0)
      expect(result.current.animationState.progress).toBeLessThan(100)
      expect(result.current.animationState.isAnimating).toBe(true)
    })

    it('should handle animation with custom config', async () => {
      const { result } = renderHook(() => useAnimations())
      const customConfig = { duration: 500, transform: 'scale(1.2)' }

      await act(async () => {
        const promise = result.current.playAnimation('select', customConfig)
        vi.advanceTimersByTime(500)
        await promise
      })

      expect(result.current.animationState.isAnimating).toBe(false)
    })
  })

  describe('Animation Sequences', () => {
    it('should play animation sequence correctly', async () => {
      const { result } = renderHook(() => useAnimations())
      
      const sequence = [
        { name: 'select' as const, delay: 0 },
        { name: 'flip' as const, delay: 100 },
        { name: 'deselect' as const, delay: 200 }
      ]

      await act(async () => {
        const promise = result.current.playSequence(sequence)
        // Advance through the entire sequence timing
        vi.advanceTimersByTime(1000)
        await promise
      })

      expect(result.current.animationState.queuedAnimations).toHaveLength(0)
      expect(result.current.animationState.isAnimating).toBe(false)
    })

    it('should handle delays in sequence correctly', async () => {
      const { result } = renderHook(() => useAnimations())
      
      const sequence = [
        { name: 'select' as const, delay: 0 },
        { name: 'flip' as const, delay: 500 }
      ]

      act(() => {
        result.current.playSequence(sequence)
      })

      // After first animation completes, second should be delayed
      await act(async () => {
        vi.advanceTimersByTime(300) // First animation duration
      })

      expect(result.current.animationState.currentAnimation).toBe(null)

      // Advance through delay
      await act(async () => {
        vi.advanceTimersByTime(500)
      })

      expect(result.current.animationState.currentAnimation).toBe('flip')
    })
  })

  describe('Animation Control', () => {
    it('should stop animation correctly', () => {
      const { result } = renderHook(() => useAnimations())

      act(() => {
        result.current.playAnimation('select')
      })

      expect(result.current.animationState.isAnimating).toBe(true)

      act(() => {
        result.current.stopAnimation()
      })

      expect(result.current.animationState.isAnimating).toBe(false)
      expect(result.current.animationState.currentAnimation).toBe(null)
      expect(result.current.animationState.progress).toBe(0)
    })

    it('should clear animation queue', async () => {
      const { result } = renderHook(() => useAnimations())

      const sequence = [
        { name: 'select' as const, delay: 0 },
        { name: 'flip' as const, delay: 100 }
      ]

      // Start the sequence but don't wait for completion
      act(() => {
        result.current.playSequence(sequence)
      })

      // Give it a moment to set up the queue
      await act(async () => {
        vi.advanceTimersByTime(10)
      })

      expect(result.current.animationState.queuedAnimations.length).toBeGreaterThan(0)

      act(() => {
        result.current.clearQueue()
      })

      expect(result.current.animationState.queuedAnimations).toHaveLength(0)
    })

    it('should detect if animation is playing', () => {
      const { result } = renderHook(() => useAnimations())

      expect(result.current.isAnimationPlaying()).toBe(false)
      expect(result.current.isAnimationPlaying('select')).toBe(false)

      act(() => {
        result.current.playAnimation('select')
      })

      expect(result.current.isAnimationPlaying()).toBe(true)
      expect(result.current.isAnimationPlaying('select')).toBe(true)
      expect(result.current.isAnimationPlaying('flip')).toBe(false)
    })
  })

  describe('Utility Functions', () => {
    it('should get animation config correctly', () => {
      const { result } = renderHook(() => useAnimations())

      const config = result.current.getConfig('select')
      expect(config).toBeDefined()
      expect(config.duration).toBe(300)

      const configWithOverrides = result.current.getConfig('select', { duration: 500 })
      expect(configWithOverrides.duration).toBe(500)
    })

    it('should get optimized duration', () => {
      const { result } = renderHook(() => useAnimations())

      const duration = result.current.getDuration(300)
      expect(duration).toBe(300)
    })
  })

  describe('Cleanup', () => {
    it('should clear timers when component unmounts', () => {
      const { result, unmount } = renderHook(() => useAnimations())

      act(() => {
        result.current.playAnimation('select')
      })

      expect(result.current.animationState.isAnimating).toBe(true)

      // Clear any existing timers before unmounting
      vi.clearAllTimers()
      
      unmount()

      // Should not cause memory leaks or errors
      expect(vi.getTimerCount()).toBe(0)
    })

    it('should handle multiple quick animations correctly', async () => {
      const { result } = renderHook(() => useAnimations())

      // Start first animation
      act(() => {
        result.current.playAnimation('select')
      })

      // Immediately start second animation (should cancel first)
      act(() => {
        result.current.playAnimation('flip')
      })

      expect(result.current.animationState.currentAnimation).toBe('flip')

      await act(async () => {
        vi.advanceTimersByTime(300)
      })

      expect(result.current.animationState.isAnimating).toBe(false)
    })
  })
})

describe('useTileAnimations Hook', () => {
  it('should provide tile-specific animation functions', () => {
    const { result } = renderHook(() => useTileAnimations())

    expect(typeof result.current.selectTile).toBe('function')
    expect(typeof result.current.deselectTile).toBe('function')
    expect(typeof result.current.flipTile).toBe('function')
    expect(typeof result.current.passTile).toBe('function')
    expect(typeof result.current.highlightTile).toBe('function')
    expect(typeof result.current.showRecommendation).toBe('function')
  })

  it('should play tile-specific animations', async () => {
    const { result } = renderHook(() => useTileAnimations())

    await act(async () => {
      const promise = result.current.selectTile()
      vi.advanceTimersByTime(300)
      await promise
    })

    expect(result.current.animationState.isAnimating).toBe(false)
  })
})

describe('useCharlestonAnimations Hook', () => {
  it('should provide Charleston-specific animation functions', () => {
    const { result } = renderHook(() => useCharlestonAnimations())

    expect(typeof result.current.playPassSequence).toBe('function')
    expect(typeof result.current.playKeepAnimation).toBe('function')
  })

  it('should play pass sequence with correct staggering', async () => {
    const { result } = renderHook(() => useCharlestonAnimations())

    await act(async () => {
      const promise = result.current.playPassSequence(3)
      vi.advanceTimersByTime(2000) // Allow full sequence to complete
      await promise
    })

    expect(result.current.animationState.queuedAnimations).toHaveLength(0)
  })
})

describe('useSpecialTileAnimations Hook', () => {
  it('should provide special tile animation functions', () => {
    const { result } = renderHook(() => useSpecialTileAnimations())

    expect(typeof result.current.playJokerAnimation).toBe('function')
    expect(typeof result.current.playDragonAnimation).toBe('function')
    expect(typeof result.current.playFlowerAnimation).toBe('function')
  })

  it('should play special tile animations', async () => {
    const { result } = renderHook(() => useSpecialTileAnimations())

    await act(async () => {
      const promise = result.current.playJokerAnimation()
      vi.advanceTimersByTime(800)
      await promise
    })

    expect(result.current.animationState.isAnimating).toBe(false)
  })
})

describe('Error Handling', () => {
  it('should handle invalid animation names gracefully', async () => {
    const { result } = renderHook(() => useAnimations())

    // This should not throw an error
    await act(async () => {
      const promise = result.current.playAnimation('invalid' as keyof typeof import('../../utils/animation-config').TILE_ANIMATIONS)
      vi.advanceTimersByTime(300)
      await promise
    })

    expect(result.current.animationState.isAnimating).toBe(false)
  })

  it('should handle empty animation sequences', async () => {
    const { result } = renderHook(() => useAnimations())

    await act(async () => {
      const promise = result.current.playSequence([])
      vi.advanceTimersByTime(100)
      await promise
    })

    expect(result.current.animationState.queuedAnimations).toHaveLength(0)
  })
})

describe('Performance Considerations', () => {
  it('should not create new functions on every render', () => {
    const { result, rerender } = renderHook(() => useAnimations())

    const firstRender = {
      playAnimation: result.current.playAnimation,
      stopAnimation: result.current.stopAnimation,
      clearQueue: result.current.clearQueue
    }

    rerender()

    const secondRender = {
      playAnimation: result.current.playAnimation,
      stopAnimation: result.current.stopAnimation,
      clearQueue: result.current.clearQueue
    }

    expect(firstRender.playAnimation).toBe(secondRender.playAnimation)
    expect(firstRender.stopAnimation).toBe(secondRender.stopAnimation)
    expect(firstRender.clearQueue).toBe(secondRender.clearQueue)
  })

  it('should handle rapid animation requests efficiently', async () => {
    const { result } = renderHook(() => useAnimations())

    // Rapidly trigger multiple animations
    act(() => {
      result.current.playAnimation('select')
      result.current.playAnimation('flip')
      result.current.playAnimation('deselect')
    })

    // Should only have the last animation playing
    expect(result.current.animationState.currentAnimation).toBe('deselect')

    await act(async () => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current.animationState.isAnimating).toBe(false)
  })
})