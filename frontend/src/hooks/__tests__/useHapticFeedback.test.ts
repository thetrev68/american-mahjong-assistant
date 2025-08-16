// useHapticFeedback Hook Test Suite

import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { 
  useHapticFeedback, 
  useHapticTester, 
  useContextualHaptics 
} from '../useHapticFeedback'

// Mock reduced motion
vi.mock('../../utils/reduced-motion', () => ({
  useReducedMotion: vi.fn(() => false)
}))

// Mock navigator and window objects
const mockVibrate = vi.fn()
const mockTapticEngine = {
  impact: vi.fn().mockResolvedValue(true),
  selection: vi.fn().mockResolvedValue(true),
  notification: vi.fn().mockResolvedValue(true)
}

describe('useHapticFeedback Hook', () => {
  beforeEach(() => {
    // Setup navigator mock
    Object.defineProperty(navigator, 'vibrate', {
      writable: true,
      value: mockVibrate
    })
    
    // Setup window mock for iOS haptics
    Object.defineProperty(window, 'TapticEngine', {
      writable: true,
      value: mockTapticEngine
    })
    
    // Setup DeviceMotionEvent for feature detection
    Object.defineProperty(window, 'DeviceMotionEvent', {
      writable: true,
      value: function DeviceMotionEvent() {}
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Feature Detection', () => {
    it('should detect haptic support correctly', () => {
      const { result } = renderHook(() => useHapticFeedback())
      
      expect(result.current.isSupported).toBe(true)
    })

    it('should handle unsupported devices gracefully', () => {
      // Mock unsupported environment
      Object.defineProperty(navigator, 'vibrate', {
        writable: true,
        value: undefined
      })
      
      Object.defineProperty(window, 'TapticEngine', {
        writable: true,
        value: undefined
      })
      
      Object.defineProperty(window, 'DeviceMotionEvent', {
        writable: true,
        value: undefined
      })
      
      const { result } = renderHook(() => useHapticFeedback())
      
      expect(result.current.isSupported).toBe(false)
    })
  })

  describe('Basic Haptic Functions', () => {
    it('should provide all required haptic functions', () => {
      const { result } = renderHook(() => useHapticFeedback())

      expect(typeof result.current.triggerHaptic).toBe('function')
      expect(typeof result.current.triggerLight).toBe('function')
      expect(typeof result.current.triggerMedium).toBe('function')
      expect(typeof result.current.triggerHeavy).toBe('function')
      expect(typeof result.current.triggerSelection).toBe('function')
      expect(typeof result.current.triggerNotification).toBe('function')
    })

    it('should trigger light haptic feedback', async () => {
      const { result } = renderHook(() => useHapticFeedback())

      await act(async () => {
        const success = await result.current.triggerLight()
        expect(success).toBe(true)
      })

      expect(mockTapticEngine.impact).toHaveBeenCalledWith({ style: 'light' })
    })

    it('should trigger medium haptic feedback', async () => {
      const { result } = renderHook(() => useHapticFeedback())

      await act(async () => {
        const success = await result.current.triggerMedium()
        expect(success).toBe(true)
      })

      expect(mockTapticEngine.impact).toHaveBeenCalledWith({ style: 'medium' })
    })

    it('should trigger heavy haptic feedback', async () => {
      const { result } = renderHook(() => useHapticFeedback())

      await act(async () => {
        const success = await result.current.triggerHeavy()
        expect(success).toBe(true)
      })

      expect(mockTapticEngine.impact).toHaveBeenCalledWith({ style: 'heavy' })
    })

    it('should trigger selection haptic feedback', async () => {
      const { result } = renderHook(() => useHapticFeedback())

      await act(async () => {
        const success = await result.current.triggerSelection()
        expect(success).toBe(true)
      })

      expect(mockTapticEngine.selection).toHaveBeenCalled()
    })

    it('should trigger notification haptic feedback', async () => {
      const { result } = renderHook(() => useHapticFeedback())

      await act(async () => {
        const success = await result.current.triggerNotification('success')
        expect(success).toBe(true)
      })

      expect(mockTapticEngine.notification).toHaveBeenCalledWith({ type: 'success' })
    })
  })

  describe('Android Vibration API', () => {
    beforeEach(() => {
      // Remove iOS haptics to test Android path
      Object.defineProperty(window, 'TapticEngine', {
        writable: true,
        value: undefined
      })
    })

    it('should use vibration API for light haptic', async () => {
      const { result } = renderHook(() => useHapticFeedback())

      await act(async () => {
        const success = await result.current.triggerLight()
        expect(success).toBe(true)
      })

      expect(mockVibrate).toHaveBeenCalledWith([10])
    })

    it('should use vibration API for medium haptic', async () => {
      const { result } = renderHook(() => useHapticFeedback())

      await act(async () => {
        const success = await result.current.triggerMedium()
        expect(success).toBe(true)
      })

      expect(mockVibrate).toHaveBeenCalledWith([25])
    })

    it('should use vibration API for heavy haptic', async () => {
      const { result } = renderHook(() => useHapticFeedback())

      await act(async () => {
        const success = await result.current.triggerHeavy()
        expect(success).toBe(true)
      })

      expect(mockVibrate).toHaveBeenCalledWith([50])
    })

    it('should handle custom vibration patterns', async () => {
      const { result } = renderHook(() => useHapticFeedback())
      const customPattern = [100, 50, 100, 50, 200]

      await act(async () => {
        const success = await result.current.triggerHaptic({ pattern: customPattern })
        expect(success).toBe(true)
      })

      expect(mockVibrate).toHaveBeenCalledWith(customPattern)
    })
  })

  describe('Tile-Specific Haptics', () => {
    it('should provide tile-specific haptic functions', () => {
      const { result } = renderHook(() => useHapticFeedback())

      expect(typeof result.current.tileSelect).toBe('function')
      expect(typeof result.current.tileDeselect).toBe('function')
      expect(typeof result.current.tileFlip).toBe('function')
      expect(typeof result.current.tilePass).toBe('function')
      expect(typeof result.current.tileError).toBe('function')
    })

    it('should trigger tile select haptic', async () => {
      const { result } = renderHook(() => useHapticFeedback())

      await act(async () => {
        const success = await result.current.tileSelect()
        expect(success).toBe(true)
      })

      expect(mockTapticEngine.selection).toHaveBeenCalled()
    })

    it('should trigger tile flip haptic', async () => {
      const { result } = renderHook(() => useHapticFeedback())

      await act(async () => {
        const success = await result.current.tileFlip()
        expect(success).toBe(true)
      })

      expect(mockTapticEngine.impact).toHaveBeenCalledWith({ style: 'medium' })
    })

    it('should trigger tile error haptic with pattern', async () => {
      // Remove iOS haptics to test vibration pattern
      Object.defineProperty(window, 'TapticEngine', {
        writable: true,
        value: undefined
      })
      
      const { result } = renderHook(() => useHapticFeedback())

      await act(async () => {
        const success = await result.current.tileError()
        expect(success).toBe(true)
      })

      expect(mockVibrate).toHaveBeenCalledWith([100, 50, 100])
    })
  })

  describe('Game-Specific Haptics', () => {
    it('should provide game-specific haptic functions', () => {
      const { result } = renderHook(() => useHapticFeedback())

      expect(typeof result.current.charlestonPass).toBe('function')
      expect(typeof result.current.jokerFound).toBe('function')
      expect(typeof result.current.patternComplete).toBe('function')
      expect(typeof result.current.gameWin).toBe('function')
    })

    it('should trigger charleston pass haptic', async () => {
      // Remove iOS haptics to test vibration pattern
      Object.defineProperty(window, 'TapticEngine', {
        writable: true,
        value: undefined
      })
      
      const { result } = renderHook(() => useHapticFeedback())

      await act(async () => {
        const success = await result.current.charlestonPass()
        expect(success).toBe(true)
      })

      expect(mockVibrate).toHaveBeenCalledWith([30, 20, 30, 20, 30])
    })

    it('should trigger joker found haptic', async () => {
      // Remove iOS haptics to test vibration pattern
      Object.defineProperty(window, 'TapticEngine', {
        writable: true,
        value: undefined
      })
      
      const { result } = renderHook(() => useHapticFeedback())

      await act(async () => {
        const success = await result.current.jokerFound()
        expect(success).toBe(true)
      })

      expect(mockVibrate).toHaveBeenCalledWith([50, 25, 50, 25, 100])
    })

    it('should trigger game win haptic', async () => {
      // Remove iOS haptics to test vibration pattern
      Object.defineProperty(window, 'TapticEngine', {
        writable: true,
        value: undefined
      })
      
      const { result } = renderHook(() => useHapticFeedback())

      await act(async () => {
        const success = await result.current.gameWin()
        expect(success).toBe(true)
      })

      expect(mockVibrate).toHaveBeenCalledWith([200, 100, 200, 100, 300])
    })
  })

  describe('Enable/Disable Control', () => {
    it('should start enabled by default', () => {
      const { result } = renderHook(() => useHapticFeedback())

      expect(result.current.isEnabled).toBe(true)
    })

    it('should allow disabling haptic feedback', async () => {
      const { result } = renderHook(() => useHapticFeedback())

      act(() => {
        result.current.setEnabled(false)
      })

      expect(result.current.isEnabled).toBe(false)

      // Should not trigger haptics when disabled
      await act(async () => {
        const success = await result.current.triggerLight()
        expect(success).toBe(false)
      })

      expect(mockTapticEngine.impact).not.toHaveBeenCalled()
      expect(mockVibrate).not.toHaveBeenCalled()
    })

    it('should allow re-enabling haptic feedback', async () => {
      const { result } = renderHook(() => useHapticFeedback())

      act(() => {
        result.current.setEnabled(false)
      })

      act(() => {
        result.current.setEnabled(true)
      })

      expect(result.current.isEnabled).toBe(true)

      // Should trigger haptics when re-enabled
      await act(async () => {
        const success = await result.current.triggerLight()
        expect(success).toBe(true)
      })

      expect(mockTapticEngine.impact).toHaveBeenCalled()
    })
  })

  describe('Reduced Motion Handling', () => {
    it('should respect reduced motion preference', async () => {
      // Mock reduced motion preference
      const { useReducedMotion } = await import('../../utils/reduced-motion')
      vi.mocked(useReducedMotion).mockReturnValue(true)
      
      const { result } = renderHook(() => useHapticFeedback())

      await act(async () => {
        const success = await result.current.triggerLight()
        expect(success).toBe(false)
      })

      expect(mockTapticEngine.impact).not.toHaveBeenCalled()
      expect(mockVibrate).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle haptic errors gracefully', async () => {
      // Mock haptic engine to throw an error
      mockTapticEngine.impact.mockRejectedValue(new Error('Haptic failed'))
      
      const { result } = renderHook(() => useHapticFeedback())

      await act(async () => {
        const success = await result.current.triggerLight()
        expect(success).toBe(false)
      })

      expect(mockTapticEngine.impact).toHaveBeenCalled()
    })

    it('should handle vibration API errors gracefully', async () => {
      // Remove iOS haptics and mock vibrate to throw
      Object.defineProperty(window, 'TapticEngine', {
        writable: true,
        value: undefined
      })
      mockVibrate.mockImplementation(() => {
        throw new Error('Vibration failed')
      })
      
      const { result } = renderHook(() => useHapticFeedback())

      await act(async () => {
        const success = await result.current.triggerLight()
        expect(success).toBe(false)
      })

      expect(mockVibrate).toHaveBeenCalled()
    })
  })
})

describe('useHapticTester Hook', () => {
  beforeEach(() => {
    // Setup mocks for testing
    Object.defineProperty(navigator, 'vibrate', {
      writable: true,
      value: mockVibrate
    })
    
    Object.defineProperty(window, 'TapticEngine', {
      writable: true,
      value: mockTapticEngine
    })
  })

  it('should provide test function', () => {
    const { result } = renderHook(() => useHapticTester())

    expect(typeof result.current.testAllHaptics).toBe('function')
  })

  it('should inherit all haptic functions', () => {
    const { result } = renderHook(() => useHapticTester())

    expect(typeof result.current.triggerLight).toBe('function')
    expect(typeof result.current.tileSelect).toBe('function')
    expect(typeof result.current.jokerFound).toBe('function')
  })
})

describe('useContextualHaptics Hook', () => {
  beforeEach(() => {
    // Setup mocks for testing
    Object.defineProperty(navigator, 'vibrate', {
      writable: true,
      value: mockVibrate
    })
    
    Object.defineProperty(window, 'TapticEngine', {
      writable: true,
      value: mockTapticEngine
    })
  })

  it('should provide contextual feedback function', () => {
    const { result } = renderHook(() => useContextualHaptics('tile'))

    expect(typeof result.current.contextualFeedback).toBe('function')
  })

  it('should handle tile context correctly', async () => {
    const { result } = renderHook(() => useContextualHaptics('tile'))

    await act(async () => {
      await result.current.contextualFeedback('select')
    })

    expect(mockTapticEngine.selection).toHaveBeenCalled()
  })

  it('should handle charleston context correctly', async () => {
    // Remove iOS haptics to test vibration pattern
    Object.defineProperty(window, 'TapticEngine', {
      writable: true,
      value: undefined
    })
    
    const { result } = renderHook(() => useContextualHaptics('charleston'))

    await act(async () => {
      await result.current.contextualFeedback('pass')
    })

    expect(mockVibrate).toHaveBeenCalledWith([30, 20, 30, 20, 30])
  })

  it('should handle game context correctly', async () => {
    // Remove iOS haptics to test vibration pattern
    Object.defineProperty(window, 'TapticEngine', {
      writable: true,
      value: undefined
    })
    
    const { result } = renderHook(() => useContextualHaptics('game'))

    await act(async () => {
      await result.current.contextualFeedback('win')
    })

    expect(mockVibrate).toHaveBeenCalledWith([200, 100, 200, 100, 300])
  })

  it('should handle navigation context correctly', async () => {
    const { result } = renderHook(() => useContextualHaptics('navigation'))

    await act(async () => {
      await result.current.contextualFeedback('navigate')
    })

    expect(mockTapticEngine.selection).toHaveBeenCalled()
  })

  it('should provide fallback for unknown actions', async () => {
    const { result } = renderHook(() => useContextualHaptics('tile'))

    await act(async () => {
      await result.current.contextualFeedback('unknown')
    })

    expect(mockTapticEngine.impact).toHaveBeenCalledWith({ style: 'light' })
  })
})

describe('Performance Considerations', () => {
  beforeEach(() => {
    // Setup mocks for testing
    Object.defineProperty(navigator, 'vibrate', {
      writable: true,
      value: mockVibrate
    })
  })

  it('should not create new functions on every render', () => {
    const { result, rerender } = renderHook(() => useHapticFeedback())

    const firstRender = {
      triggerLight: result.current.triggerLight,
      tileSelect: result.current.tileSelect,
      setEnabled: result.current.setEnabled
    }

    rerender()

    const secondRender = {
      triggerLight: result.current.triggerLight,
      tileSelect: result.current.tileSelect,
      setEnabled: result.current.setEnabled
    }

    expect(firstRender.triggerLight).toBe(secondRender.triggerLight)
    expect(firstRender.tileSelect).toBe(secondRender.tileSelect)
    expect(firstRender.setEnabled).toBe(secondRender.setEnabled)
  })

  it('should handle rapid haptic requests gracefully', async () => {
    const { result } = renderHook(() => useHapticFeedback())

    // Trigger multiple haptics rapidly
    const promises = [
      result.current.triggerLight(),
      result.current.triggerMedium(),
      result.current.triggerHeavy(),
      result.current.tileSelect(),
      result.current.tileFlip()
    ]

    await act(async () => {
      const results = await Promise.all(promises)
      results.forEach(success => expect(success).toBe(true))
    })

    // Should handle all requests without errors
    expect(mockVibrate.mock.calls.length + mockTapticEngine.impact.mock.calls.length + mockTapticEngine.selection.mock.calls.length).toBeGreaterThan(0)
  })
})