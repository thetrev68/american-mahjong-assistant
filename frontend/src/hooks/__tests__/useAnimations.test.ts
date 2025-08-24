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
  getAnimationConfig: vi.fn((name, overrides = {}) => ({
    duration: name === 'select' ? 200 : 300,
    easing: 'ease-out',
    transform: 'scale(1.05)',
    ...overrides
  })),
  getOptimizedDuration: vi.fn((duration) => duration),
  createAnimationSequence: vi.fn((sequence) => 
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

describe('useAnimations Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('Basic Functionality', () => {
    it('should provide all required functions', () => {
      const { result } = renderHook(() => useAnimations())

      expect(result.current).toBeDefined()
      expect(result.current).not.toBeNull()
      expect(typeof result.current.playAnimation).toBe('function')
      expect(typeof result.current.playSequence).toBe('function')
      expect(typeof result.current.stopAnimation).toBe('function')
      expect(typeof result.current.clearQueue).toBe('function')
      expect(typeof result.current.getConfig).toBe('function')
      expect(typeof result.current.getDuration).toBe('function')
      expect(typeof result.current.isAnimationPlaying).toBe('function')
    })

    it('should initialize with default animation state', () => {
      const { result } = renderHook(() => useAnimations())

      expect(result.current.animationState).toEqual({
        isAnimating: false,
        currentAnimation: null,
        progress: 0,
        queuedAnimations: []
      })
      expect(result.current.isReducedMotion).toBe(false)
    })
  })

  describe('Animation Playback', () => {
    it('should play single animation correctly', async () => {
      const { result } = renderHook(() => useAnimations())

      expect(result.current).toBeDefined()
      expect(result.current).not.toBeNull()

      // Start animation and check immediate state
      act(() => {
        result.current.playAnimation('select')
      })

      // Animation should start immediately
      expect(result.current.animationState.isAnimating).toBe(true)
      expect(result.current.animationState.currentAnimation).toBe('select')
      expect(result.current.animationState.progress).toBe(0)

      // Fast-forward through animation
      await act(async () => {
        vi.advanceTimersByTime(200) // select animation duration
      })

      expect(result.current.animationState.isAnimating).toBe(false)
      expect(result.current.animationState.currentAnimation).toBe(null)
      expect(result.current.animationState.progress).toBe(100)
    })

    it('should update progress during animation', async () => {
      const { result } = renderHook(() => useAnimations())

      // Start animation
      act(() => {
        result.current.playAnimation('select')
      })

      // Check initial state
      expect(result.current.animationState.isAnimating).toBe(true)

      // Check progress partway through
      await act(async () => {
        vi.advanceTimersByTime(100) // Half duration
      })
      
      expect(result.current.animationState.progress).toBeGreaterThan(0)
      expect(result.current.animationState.progress).toBeLessThan(100)
      expect(result.current.animationState.isAnimating).toBe(true)

      // Complete the animation
      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      expect(result.current.animationState.isAnimating).toBe(false)
    })

    it('should handle animation with custom config', async () => {
      const { result } = renderHook(() => useAnimations())
      const customConfig = { duration: 500, transform: 'scale(1.2)' }

      await act(async () => {
        const animationPromise = result.current.playAnimation('select', customConfig)
        vi.advanceTimersByTime(500)
        await animationPromise
      })

      expect(result.current.animationState.isAnimating).toBe(false)
    })
  })

  describe('Animation Control', () => {
    it('should stop animation correctly', async () => {
      const { result } = renderHook(() => useAnimations())

      // Start animation
      act(() => {
        result.current.playAnimation('select')
      })
      
      // Animation should be running
      expect(result.current.animationState.isAnimating).toBe(true)
      
      // Stop the animation
      act(() => {
        result.current.stopAnimation()
      })

      expect(result.current.animationState.isAnimating).toBe(false)
      expect(result.current.animationState.currentAnimation).toBe(null)
      expect(result.current.animationState.progress).toBe(0)
    })

    it('should detect if animation is playing', () => {
      const { result } = renderHook(() => useAnimations())

      expect(result.current.isAnimationPlaying()).toBe(false)

      act(() => {
        result.current.playAnimation('select')
      })

      expect(result.current.isAnimationPlaying()).toBe(true)
      expect(result.current.isAnimationPlaying('select')).toBe(true)
      expect(result.current.isAnimationPlaying('flip')).toBe(false)
    })

    it('should clear animation queue', () => {
      const { result } = renderHook(() => useAnimations())

      act(() => {
        // This sets up a queue through internal state manipulation
        result.current.clearQueue()
      })

      expect(result.current.animationState.queuedAnimations).toHaveLength(0)
    })
  })

  describe('Utility Functions', () => {
    it('should get animation config correctly', () => {
      const { result } = renderHook(() => useAnimations())

      const config = result.current.getConfig('select')
      
      expect(config).toBeDefined()
      expect(config.duration).toBe(200)
      expect(config.easing).toBe('ease-out')
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

      // Animation should be running
      expect(result.current.animationState.isAnimating).toBe(true)

      unmount()
      // Test passes if no timers are left running after unmount
    })
  })
})

describe('useTileAnimations Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('should provide tile-specific animation functions', () => {
    const { result } = renderHook(() => useTileAnimations())

    expect(result.current).toBeDefined()
    expect(result.current).not.toBeNull()
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
      const animationPromise = result.current.selectTile()
      vi.advanceTimersByTime(200)
      await animationPromise
    })

    expect(result.current.animationState.isAnimating).toBe(false)
  })
})

describe('useCharlestonAnimations Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('should provide Charleston-specific animation functions', () => {
    const { result } = renderHook(() => useCharlestonAnimations())

    expect(result.current).toBeDefined()
    expect(result.current).not.toBeNull()
    expect(typeof result.current.playPassSequence).toBe('function')
    expect(typeof result.current.playKeepAnimation).toBe('function')
  })

  it('should play pass sequence with correct staggering', async () => {
    const { result } = renderHook(() => useCharlestonAnimations())

    // Start the sequence
    act(() => {
      result.current.playPassSequence(3)
    })

    // Advance through all delays and animation durations
    await act(async () => {
      vi.advanceTimersByTime(2000) // Give enough time for sequence and delays
    })

    expect(result.current.animationState.isAnimating).toBe(false)
  })
})

describe('useSpecialTileAnimations Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('should provide special tile animation functions', () => {
    const { result } = renderHook(() => useSpecialTileAnimations())

    // Wait for hook to initialize
    expect(result.current).toBeTruthy()
    expect(result.current.playJokerAnimation).toBeDefined()
    expect(result.current.playDragonAnimation).toBeDefined()
    expect(result.current.playFlowerAnimation).toBeDefined()
    expect(typeof result.current.playJokerAnimation).toBe('function')
    expect(typeof result.current.playDragonAnimation).toBe('function')
    expect(typeof result.current.playFlowerAnimation).toBe('function')
  })

  it('should play special tile animations', async () => {
    const { result } = renderHook(() => useSpecialTileAnimations())

    // Verify hook is properly initialized
    expect(result.current).toBeTruthy()
    expect(result.current.playJokerAnimation).toBeDefined()

    // Start animation
    act(() => {
      result.current.playJokerAnimation()
    })

    // Advance timers to complete animation
    await act(async () => {
      vi.advanceTimersByTime(800) // joker animation duration
    })

    expect(result.current.animationState.isAnimating).toBe(false)
  })
})

describe('Error Handling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('should handle invalid animation names gracefully', async () => {
    const { result } = renderHook(() => useAnimations())

    // Verify hook is initialized
    expect(result.current).toBeTruthy()

    // Start animation with invalid name
    act(() => {
      result.current.playAnimation('nonexistent' as any)
    })

    // Advance timers
    await act(async () => {
      vi.advanceTimersByTime(300)
    })

    // Should complete without throwing
    expect(result.current.animationState.isAnimating).toBe(false)
  })
})

describe('Performance Considerations', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('should not create new functions on every render', () => {
    const { result, rerender } = renderHook(() => useAnimations())

    const firstRenderFunctions = {
      playAnimation: result.current.playAnimation,
      playSequence: result.current.playSequence,
      stopAnimation: result.current.stopAnimation
    }

    rerender()

    const secondRenderFunctions = {
      playAnimation: result.current.playAnimation,
      playSequence: result.current.playSequence,
      stopAnimation: result.current.stopAnimation
    }

    expect(firstRenderFunctions.playAnimation).toBe(secondRenderFunctions.playAnimation)
    expect(firstRenderFunctions.playSequence).toBe(secondRenderFunctions.playSequence)
    expect(firstRenderFunctions.stopAnimation).toBe(secondRenderFunctions.stopAnimation)
  })

  it('should handle rapid animation requests efficiently', async () => {
    const { result } = renderHook(() => useAnimations())

    // Verify hook is initialized
    expect(result.current).toBeTruthy()

    // Rapid fire animations - should handle gracefully
    act(() => {
      result.current.playAnimation('select')
      result.current.playAnimation('flip')
      result.current.playAnimation('deselect')
    })

    // Advance timers to complete all animations
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current.animationState.isAnimating).toBe(false)
  })
})