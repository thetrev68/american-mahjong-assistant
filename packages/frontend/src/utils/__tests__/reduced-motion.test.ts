// Reduced Motion Accessibility Test Suite

import { renderHook } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  useReducedMotion,
  withReducedMotion,
  createAccessibleAnimation,
  getMotionSafeConfig,
  shouldEnableAnimation,
  createMotionQuery,
  __testing
} from '../reduced-motion'

// Mock window.matchMedia
const mockMatchMedia = vi.fn()

describe('Reduced Motion Accessibility', () => {
  beforeEach(() => {
    // Reset the motion preference cache
    __testing.resetCache()
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('useReducedMotion Hook', () => {
    it('should detect reduced motion preference', () => {
      mockMatchMedia.mockReturnValue({
        matches: true,
        media: '(prefers-reduced-motion: reduce)',
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      })

      const { result } = renderHook(() => useReducedMotion())
      
      expect(result.current).toBe(true)
      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)')
    })

    it('should detect no motion reduction preference', () => {
      mockMatchMedia.mockReturnValue({
        matches: false,
        media: '(prefers-reduced-motion: reduce)',
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      })

      const { result } = renderHook(() => useReducedMotion())
      
      expect(result.current).toBe(false)
    })

    it('should handle missing matchMedia gracefully', () => {
      Object.defineProperty(window, 'matchMedia', {
        value: undefined
      })

      const { result } = renderHook(() => useReducedMotion())
      
      expect(result.current).toBe(false)
    })
  })

  describe('withReducedMotion Higher-Order Function', () => {
    it('should apply reduced animation when motion reduced', () => {
      mockMatchMedia.mockReturnValue({ matches: true })

      const originalConfig = { duration: 500, scale: 1.2 }
      const reducedConfig = { duration: 100, scale: 1.05 }
      
      const result = withReducedMotion(originalConfig, reducedConfig)
      
      expect(result).toEqual(reducedConfig)
    })

    it('should return original animation when motion not reduced', () => {
      mockMatchMedia.mockReturnValue({ matches: false })

      const originalConfig = { duration: 500, scale: 1.2 }
      const reducedConfig = { duration: 100, scale: 1.05 }
      
      const result = withReducedMotion(originalConfig, reducedConfig)
      
      expect(result).toEqual(originalConfig)
    })

    it('should handle undefined reduced config', () => {
      mockMatchMedia.mockReturnValue({ matches: true })

      const originalConfig = { duration: 500, scale: 1.2 }
      
      const result = withReducedMotion(originalConfig)
      
      expect(result.duration).toBeLessThan(originalConfig.duration)
      expect(result.scale).toBeLessThan(originalConfig.scale)
    })
  })

  describe('createAccessibleAnimation Function', () => {
    it('should create animation with reduced motion support', () => {
      const config = {
        duration: 500,
        easing: 'ease-out',
        transform: 'scale(1.2) translateY(-10px)'
      }

      const accessibleAnim = createAccessibleAnimation(config)
      
      expect(accessibleAnim.full).toEqual(config)
      expect(accessibleAnim.reduced.duration).toBeLessThan(config.duration)
      expect(accessibleAnim.reduced.transform).toContain('scale')
      expect(accessibleAnim.current).toBeDefined()
    })

    it('should provide custom reduced variant', () => {
      const fullConfig = { duration: 500, scale: 1.5 }
      const reducedConfig = { duration: 50, scale: 1.1 }

      const accessibleAnim = createAccessibleAnimation(fullConfig, reducedConfig)
      
      expect(accessibleAnim.reduced).toEqual(reducedConfig)
    })

    it('should include accessibility metadata', () => {
      const config = { duration: 300 }
      const accessibleAnim = createAccessibleAnimation(config)
      
      expect(accessibleAnim.accessibility).toEqual({
        respectsReducedMotion: true,
        hasAlternative: true,
        type: 'decorative'
      })
    })
  })

  describe('getMotionSafeConfig Function', () => {
    it('should return safe config for reduced motion', () => {
      const config = {
        duration: 1000,
        scale: 2.0,
        rotate: 360,
        opacity: 0.5
      }

      const safeConfig = getMotionSafeConfig(config)
      
      expect(safeConfig.duration).toBeLessThanOrEqual(200) // Max safe duration
      expect(safeConfig.scale).toBeLessThanOrEqual(1.1) // Max safe scale
      expect(safeConfig.rotate).toBeUndefined() // Rotation removed
      expect(safeConfig.opacity).toBe(0.5) // Opacity preserved
    })

    it('should preserve essential animations', () => {
      const config = {
        duration: 5000,
        opacity: 0,
        essential: true
      }

      const safeConfig = getMotionSafeConfig(config)
      
      expect(safeConfig.duration).toBeGreaterThan(100) // Maintains minimum for essential
      expect(safeConfig.opacity).toBe(0) // Preserves opacity changes
    })

    it('should remove problematic animations', () => {
      const config = {
        duration: 300,
        rotate: 720,
        bounce: true,
        shake: true
      }

      const safeConfig = getMotionSafeConfig(config)
      
      expect(safeConfig.rotate).toBeUndefined()
      expect(safeConfig.bounce).toBeUndefined()
      expect(safeConfig.shake).toBeUndefined()
    })
  })

  describe('shouldEnableAnimation Function', () => {
    it('should enable essential animations even with reduced motion', () => {
      mockMatchMedia.mockReturnValue({ matches: true })

      expect(shouldEnableAnimation('essential')).toBe(true)
      expect(shouldEnableAnimation('feedback')).toBe(true)
      expect(shouldEnableAnimation('loading')).toBe(true)
    })

    it('should disable decorative animations with reduced motion', () => {
      mockMatchMedia.mockReturnValue({ matches: true })

      expect(shouldEnableAnimation('decorative')).toBe(false)
      expect(shouldEnableAnimation('flourish')).toBe(false)
      expect(shouldEnableAnimation('ambient')).toBe(false)
    })

    it('should enable all animations without motion reduction', () => {
      mockMatchMedia.mockReturnValue({ matches: false })

      expect(shouldEnableAnimation('decorative')).toBe(true)
      expect(shouldEnableAnimation('flourish')).toBe(true)
      expect(shouldEnableAnimation('essential')).toBe(true)
    })

    it('should handle custom animation types', () => {
      mockMatchMedia.mockReturnValue({ matches: true })

      expect(shouldEnableAnimation('custom')).toBe(false) // Default to disabled
      expect(shouldEnableAnimation('custom', ['custom'])).toBe(true) // Allow custom
    })
  })

  describe('createMotionQuery Function', () => {
    it('should create media query for reduced motion', () => {
      const query = createMotionQuery('reduced')
      
      expect(query).toBe('(prefers-reduced-motion: reduced)')
    })

    it('should create media query for no preference', () => {
      const query = createMotionQuery('no-preference')
      
      expect(query).toBe('(prefers-reduced-motion: no-preference)')
    })

    it('should handle custom queries', () => {
      const query = createMotionQuery('custom', 'prefers-color-scheme: dark')
      
      expect(query).toBe('prefers-color-scheme: dark')
    })
  })

  describe('Animation Categories', () => {
    it('should categorize essential animations correctly', () => {
      const essentialTypes = ['loading', 'feedback', 'state-change', 'navigation']
      
      essentialTypes.forEach(type => {
        mockMatchMedia.mockReturnValue({ matches: true })
        expect(shouldEnableAnimation(type)).toBe(true)
      })
    })

    it('should categorize decorative animations correctly', () => {
      const decorativeTypes = ['hover', 'flourish', 'ambient', 'particle']
      
      decorativeTypes.forEach(type => {
        mockMatchMedia.mockReturnValue({ matches: true })
        expect(shouldEnableAnimation(type)).toBe(false)
      })
    })

    it('should handle mixed animation contexts', () => {
      mockMatchMedia.mockReturnValue({ matches: true })

      // Should prioritize accessibility
      expect(shouldEnableAnimation('hover-feedback')).toBe(true) // Contains 'feedback'
      expect(shouldEnableAnimation('decorative-loading')).toBe(true) // Contains 'loading'
      expect(shouldEnableAnimation('purely-decorative')).toBe(false)
    })
  })

  describe('Performance Considerations', () => {
    it('should cache motion preference detection', () => {
      mockMatchMedia.mockReturnValue({
        matches: true,
        media: '(prefers-reduced-motion: reduce)',
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      })

      // Multiple calls should use cached result
      const { result: result1 } = renderHook(() => useReducedMotion())
      const { result: result2 } = renderHook(() => useReducedMotion()) 
      const { result: result3 } = renderHook(() => useReducedMotion())
      
      expect(result1.current).toBe(true)
      expect(result2.current).toBe(true)
      expect(result3.current).toBe(true)
    })

    it('should provide efficient config generation', () => {
      const config = { duration: 500, scale: 1.5 }
      
      const start = performance.now()
      getMotionSafeConfig(config)
      const end = performance.now()
      
      expect(end - start).toBeLessThan(10) // Should be very fast
    })
  })
})