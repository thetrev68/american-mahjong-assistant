// usePerformance Hook Test Suite

import { renderHook, act, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { 
  usePerformance, 
  useAnimationPerformance, 
  useAdaptivePerformance 
} from '../usePerformance'

// Mock performance.now and requestAnimationFrame
const mockPerformanceNow = vi.fn()
const mockRequestAnimationFrame = vi.fn()
const mockCancelAnimationFrame = vi.fn()

describe('usePerformance Hook', () => {
  beforeEach(() => {
    // Mock performance.now
    Object.defineProperty(global.performance, 'now', {
      writable: true,
      value: mockPerformanceNow
    })
    
    // Mock animation frame methods
    Object.defineProperty(global, 'requestAnimationFrame', {
      writable: true,
      value: mockRequestAnimationFrame
    })
    
    Object.defineProperty(global, 'cancelAnimationFrame', {
      writable: true,
      value: mockCancelAnimationFrame
    })
    
    // Setup default mock behavior
    let time = 0
    mockPerformanceNow.mockImplementation(() => {
      time += 16.67 // Simulate 60fps
      return time
    })
    
    mockRequestAnimationFrame.mockImplementation((callback) => {
      const id = setTimeout(callback, 16.67)
      return id
    })
    
    mockCancelAnimationFrame.mockImplementation(clearTimeout)
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
  })

  describe('Initial State', () => {
    it('should return correct initial state', () => {
      const { result } = renderHook(() => usePerformance())

      expect(result.current.metrics).toEqual({
        fps: 60,
        frameTime: 16.67,
        renderTime: 0,
        animationPerformance: {
          averageFrameTime: 16.67,
          droppedFrames: 0,
          totalFrames: 0
        }
      })
      expect(result.current.isMonitoring).toBe(false)
    })

    it('should provide all required functions', () => {
      const { result } = renderHook(() => usePerformance())

      expect(typeof result.current.startMonitoring).toBe('function')
      expect(typeof result.current.stopMonitoring).toBe('function')
      expect(typeof result.current.getSnapshot).toBe('function')
      expect(typeof result.current.measureAnimation).toBe('function')
      expect(typeof result.current.trackFrameRate).toBe('function')
      expect(typeof result.current.checkRenderingCapability).toBe('function')
    })
  })

  describe('Performance Monitoring', () => {
    it('should start monitoring correctly', async () => {
      const { result } = renderHook(() => usePerformance())

      act(() => {
        result.current.startMonitoring()
      })

      expect(result.current.isMonitoring).toBe(true)
      expect(mockRequestAnimationFrame).toHaveBeenCalled()
    })

    it('should stop monitoring correctly', async () => {
      const { result } = renderHook(() => usePerformance())

      act(() => {
        result.current.startMonitoring()
      })

      act(() => {
        result.current.stopMonitoring()
      })

      expect(result.current.isMonitoring).toBe(false)
    })

    it('should not start monitoring if already monitoring', async () => {
      const { result } = renderHook(() => usePerformance())

      act(() => {
        result.current.startMonitoring()
      })

      const firstCallCount = mockRequestAnimationFrame.mock.calls.length

      act(() => {
        result.current.startMonitoring()
      })

      expect(mockRequestAnimationFrame.mock.calls.length).toBe(firstCallCount)
    })
  })

  describe('Performance Metrics', () => {
    it('should provide performance snapshot', () => {
      const { result } = renderHook(() => usePerformance())

      const snapshot = result.current.getSnapshot()

      expect(snapshot).toEqual(result.current.metrics)
      expect(snapshot).not.toBe(result.current.metrics) // Should be a copy
    })

    it('should calculate performance optimization flags', () => {
      const { result } = renderHook(() => usePerformance())

      // Initially should not reduce animations (60fps)
      expect(result.current.shouldReduceAnimations).toBe(false)
      expect(result.current.shouldSkipNonEssentialUpdates).toBe(false)
    })

    it('should get optimal frame rate based on current performance', () => {
      const { result } = renderHook(() => usePerformance())

      expect(result.current.getOptimalFrameRate()).toBe(60)
    })
  })

  describe('Animation Measurement', () => {
    it('should measure animation performance', async () => {
      const { result } = renderHook(() => usePerformance())
      
      const mockAnimation = vi.fn()
      let measureDuration: number | undefined

      await act(async () => {
        measureDuration = await result.current.measureAnimation('test-animation', mockAnimation)
      })

      expect(mockAnimation).toHaveBeenCalled()
      expect(measureDuration).toBeGreaterThan(0)
    })

    it('should handle animation errors gracefully', async () => {
      const { result } = renderHook(() => usePerformance())
      
      const mockFailingAnimation = vi.fn().mockRejectedValue(new Error('Animation failed'))
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      let measureDuration: number | undefined

      await act(async () => {
        measureDuration = await result.current.measureAnimation('failing-animation', mockFailingAnimation)
      })

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Animation "failing-animation" failed:'),
        expect.any(Error)
      )
      expect(measureDuration).toBeGreaterThan(0)

      consoleSpy.mockRestore()
    })

    it('should track frame rate for specific duration', async () => {
      vi.useFakeTimers()
      
      const { result } = renderHook(() => usePerformance())

      act(() => {
        result.current.startMonitoring()
      })

      const frameRatePromise = result.current.trackFrameRate(1000)

      // Fast forward time
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      const fps = await frameRatePromise

      expect(fps).toBeGreaterThan(0)
      
      vi.useRealTimers()
    })
  })

  describe('Rendering Capability Assessment', () => {
    it('should check rendering capability', async () => {
      vi.useFakeTimers()
      
      const { result } = renderHook(() => usePerformance())

      const capabilityPromise = result.current.checkRenderingCapability()

      act(() => {
        vi.advanceTimersByTime(2000)
      })

      const capability = await capabilityPromise

      expect(['high', 'medium', 'low']).toContain(capability)
      
      vi.useRealTimers()
    })

    it('should handle monitoring state correctly during capability check', async () => {
      vi.useFakeTimers()
      
      const { result } = renderHook(() => usePerformance())

      // Should not be monitoring initially
      expect(result.current.isMonitoring).toBe(false)

      const capabilityPromise = result.current.checkRenderingCapability()

      act(() => {
        vi.advanceTimersByTime(2000)
      })

      await capabilityPromise

      // Should not be monitoring after check if it wasn't before
      expect(result.current.isMonitoring).toBe(false)
      
      vi.useRealTimers()
    })
  })

  describe('Memory Monitoring', () => {
    it('should measure memory usage when available', () => {
      // Mock performance.memory
      Object.defineProperty(global.performance, 'memory', {
        writable: true,
        value: {
          usedJSHeapSize: 50 * 1024 * 1024 // 50MB in bytes
        }
      })

      const { result } = renderHook(() => usePerformance())

      const memoryUsage = result.current.measureMemoryUsage()

      expect(memoryUsage).toBe(50) // Should return MB
    })

    it('should return null when memory API not available', () => {
      // Remove memory API
      delete (global.performance as Record<string, unknown>).memory

      const { result } = renderHook(() => usePerformance())

      const memoryUsage = result.current.measureMemoryUsage()

      expect(memoryUsage).toBeNull()
    })

    it('should detect memory pressure correctly', () => {
      // Mock high memory usage
      Object.defineProperty(global.performance, 'memory', {
        writable: true,
        value: {
          usedJSHeapSize: 150 * 1024 * 1024 // 150MB in bytes
        }
      })

      const { result } = renderHook(() => usePerformance())

      const hasMemoryPressure = result.current.detectMemoryPressure()

      expect(hasMemoryPressure).toBe(true)
    })
  })

  describe('Cleanup', () => {
    it('should cleanup animation frames on unmount', () => {
      const { result, unmount } = renderHook(() => usePerformance())

      act(() => {
        result.current.startMonitoring()
      })

      unmount()

      // Should have called cancelAnimationFrame
      expect(mockCancelAnimationFrame).toHaveBeenCalled()
    })

    it('should stop monitoring when component unmounts', () => {
      const { result, unmount } = renderHook(() => usePerformance())

      act(() => {
        result.current.startMonitoring()
      })

      expect(result.current.isMonitoring).toBe(true)

      unmount()

      // Monitoring should be stopped
      expect(mockCancelAnimationFrame).toHaveBeenCalled()
    })
  })
})

describe('useAnimationPerformance Hook', () => {
  beforeEach(() => {
    // Setup performance mocks
    Object.defineProperty(global.performance, 'now', {
      writable: true,
      value: mockPerformanceNow
    })
    
    let time = 0
    mockPerformanceNow.mockImplementation(() => {
      time += 16.67
      return time
    })
  })

  it('should provide animation-specific performance functions', () => {
    const { result } = renderHook(() => useAnimationPerformance())

    expect(typeof result.current.measureTileAnimation).toBe('function')
    expect(typeof result.current.measureCharlestonAnimation).toBe('function')
    expect(typeof result.current.getAnimationQuality).toBe('function')
    expect(typeof result.current.shouldUseReducedAnimations).toBe('function')
  })

  it('should measure tile animation performance', async () => {
    const { result } = renderHook(() => useAnimationPerformance())
    
    const mockAnimation = vi.fn()

    await act(async () => {
      const duration = await result.current.measureTileAnimation('select', mockAnimation)
      expect(duration).toBeGreaterThan(0)
    })

    expect(mockAnimation).toHaveBeenCalled()
  })

  it('should get animation quality based on FPS', () => {
    const { result } = renderHook(() => useAnimationPerformance())

    const quality = result.current.getAnimationQuality()

    expect(['high', 'medium', 'low']).toContain(quality)
  })

  it('should determine if reduced animations should be used', () => {
    const { result } = renderHook(() => useAnimationPerformance())

    const shouldReduce = result.current.shouldUseReducedAnimations()

    expect(typeof shouldReduce).toBe('boolean')
  })
})

describe('useAdaptivePerformance Hook', () => {
  beforeEach(() => {
    // Setup performance mocks
    Object.defineProperty(global.performance, 'now', {
      writable: true,
      value: mockPerformanceNow
    })
    
    let time = 0
    mockPerformanceNow.mockImplementation(() => {
      time += 16.67
      return time
    })
    
    mockRequestAnimationFrame.mockImplementation((callback) => {
      const id = setTimeout(callback, 16.67)
      return id
    })
  })

  it('should provide adaptive settings', () => {
    const { result } = renderHook(() => useAdaptivePerformance())

    expect(result.current.adaptiveSettings).toEqual({
      animationQuality: 'high',
      enableParticleEffects: true,
      enableShadows: true,
      maxConcurrentAnimations: 5
    })
  })

  it('should allow setting adaptive settings', () => {
    const { result } = renderHook(() => useAdaptivePerformance())

    act(() => {
      result.current.setAdaptiveSettings({
        animationQuality: 'low',
        enableParticleEffects: false,
        enableShadows: false,
        maxConcurrentAnimations: 1
      })
    })

    expect(result.current.adaptiveSettings.animationQuality).toBe('low')
    expect(result.current.adaptiveSettings.enableParticleEffects).toBe(false)
  })

  it('should inherit all performance functions', () => {
    const { result } = renderHook(() => useAdaptivePerformance())

    expect(typeof result.current.startMonitoring).toBe('function')
    expect(typeof result.current.measureAnimation).toBe('function')
    expect(typeof result.current.checkRenderingCapability).toBe('function')
  })
})

describe('Performance Thresholds', () => {
  beforeEach(() => {
    // Setup performance mocks
    Object.defineProperty(global.performance, 'now', {
      writable: true,
      value: mockPerformanceNow
    })
  })

  it('should correctly identify high performance', () => {
    // Mock high FPS
    let time = 0
    mockPerformanceNow.mockImplementation(() => {
      time += 10 // Simulate >60fps
      return time
    })

    const { result } = renderHook(() => useAnimationPerformance())

    expect(result.current.getAnimationQuality()).toBe('high')
  })

  it('should correctly identify low performance', () => {
    // Mock low FPS by increasing frame time
    let time = 0
    mockPerformanceNow.mockImplementation(() => {
      time += 80 // Simulate ~12fps
      return time
    })

    const { result } = renderHook(() => useAnimationPerformance())

    expect(result.current.shouldUseReducedAnimations()).toBe(true)
  })
})

describe('Error Handling', () => {
  it('should handle performance.now errors gracefully', () => {
    // Mock performance.now to throw
    mockPerformanceNow.mockImplementation(() => {
      throw new Error('Performance API unavailable')
    })

    expect(() => {
      renderHook(() => usePerformance())
    }).not.toThrow()
  })

  it('should handle requestAnimationFrame errors gracefully', () => {
    // Mock requestAnimationFrame to be unavailable
    Object.defineProperty(global, 'requestAnimationFrame', {
      writable: true,
      value: undefined
    })

    expect(() => {
      const { result } = renderHook(() => usePerformance())
      act(() => {
        result.current.startMonitoring()
      })
    }).not.toThrow()
  })
})

describe('Performance Optimization Integration', () => {
  it('should provide consistent performance decisions', () => {
    const { result } = renderHook(() => usePerformance())

    const shouldReduce = result.current.shouldReduceAnimations
    const shouldSkip = result.current.shouldSkipNonEssentialUpdates
    const optimalFps = result.current.getOptimalFrameRate()

    // Consistency checks
    if (shouldSkip) {
      expect(shouldReduce).toBe(true)
    }

    if (optimalFps === 60) {
      expect(shouldReduce).toBe(false)
    }

    expect([15, 30, 60]).toContain(optimalFps)
  })

  it('should adapt to changing performance conditions', async () => {
    const { result, rerender } = renderHook(() => useAdaptivePerformance())

    // Start with high performance
    expect(result.current.adaptiveSettings.animationQuality).toBe('high')

    // Simulate performance monitoring
    act(() => {
      result.current.startMonitoring()
    })

    // Wait for adaptive settings to potentially update
    await waitFor(() => {
      rerender()
    })

    // Settings should remain consistent with performance
    expect(result.current.adaptiveSettings).toBeDefined()
  })
})