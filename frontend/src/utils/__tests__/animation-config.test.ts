// Animation Configuration Test Suite

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  ANIMATION_DURATIONS,
  ANIMATION_EASINGS,
  TILE_ANIMATIONS,
  getAnimationConfig,
  shouldReduceMotion,
  getOptimizedDuration,
  createAnimationSequence,
  validateAnimationConfig
} from '../animation-config'

// Mock window.matchMedia
const mockMatchMedia = vi.fn()

describe('Animation Configuration', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Animation Duration Constants', () => {
    it('should provide standard animation durations', () => {
      expect(ANIMATION_DURATIONS.fast).toBe(150)
      expect(ANIMATION_DURATIONS.normal).toBe(300)
      expect(ANIMATION_DURATIONS.slow).toBe(500)
      expect(ANIMATION_DURATIONS.tile_flip).toBe(250)
      expect(ANIMATION_DURATIONS.tile_select).toBe(200)
      expect(ANIMATION_DURATIONS.tile_pass).toBe(400)
    })

    it('should have durations in ascending order where appropriate', () => {
      expect(ANIMATION_DURATIONS.fast).toBeLessThan(ANIMATION_DURATIONS.normal)
      expect(ANIMATION_DURATIONS.normal).toBeLessThan(ANIMATION_DURATIONS.slow)
    })
  })

  describe('Animation Easing Constants', () => {
    it('should provide cubic-bezier easing functions', () => {
      expect(ANIMATION_EASINGS.ease_out).toBe('cubic-bezier(0.25, 0.46, 0.45, 0.94)')
      expect(ANIMATION_EASINGS.ease_in).toBe('cubic-bezier(0.55, 0.055, 0.675, 0.19)')
      expect(ANIMATION_EASINGS.bounce).toBe('cubic-bezier(0.68, -0.55, 0.265, 1.55)')
      expect(ANIMATION_EASINGS.spring).toBe('cubic-bezier(0.175, 0.885, 0.32, 1.275)')
    })

    it('should provide standard CSS easing values', () => {
      expect(ANIMATION_EASINGS.linear).toBe('linear')
      expect(ANIMATION_EASINGS.ease).toBe('ease')
    })
  })

  describe('Tile Animation Configurations', () => {
    it('should define select animation', () => {
      const selectAnim = TILE_ANIMATIONS.select
      
      expect(selectAnim.duration).toBe(200)
      expect(selectAnim.easing).toBe('cubic-bezier(0.25, 0.46, 0.45, 0.94)')
      expect(selectAnim.transform).toBe('scale(1.05) translateY(-2px)')
      expect(selectAnim.shadow).toBeTruthy()
    })

    it('should define deselect animation', () => {
      const deselectAnim = TILE_ANIMATIONS.deselect
      
      expect(deselectAnim.duration).toBe(200)
      expect(deselectAnim.transform).toBe('scale(1) translateY(0)')
      expect(deselectAnim.shadow).toBeFalsy()
    })

    it('should define flip animation', () => {
      const flipAnim = TILE_ANIMATIONS.flip
      
      expect(flipAnim.duration).toBe(250)
      expect(flipAnim.easing).toBe('cubic-bezier(0.25, 0.46, 0.45, 0.94)')
      expect(flipAnim.rotateY).toBe(180)
    })

    it('should define pass animation', () => {
      const passAnim = TILE_ANIMATIONS.pass
      
      expect(passAnim.duration).toBe(400)
      expect(passAnim.easing).toBe('cubic-bezier(0.55, 0.055, 0.675, 0.19)')
      expect(passAnim.translateX).toBeDefined()
      expect(passAnim.opacity).toBe(0)
    })

    it('should define special tile animations', () => {
      expect(TILE_ANIMATIONS.joker.glow).toBeTruthy()
      expect(TILE_ANIMATIONS.dragon.pulse).toBeTruthy()
      expect(TILE_ANIMATIONS.flower.sparkle).toBeTruthy()
    })
  })

  describe('getAnimationConfig Function', () => {
    it('should return tile animation config by name', () => {
      const selectConfig = getAnimationConfig('select')
      
      expect(selectConfig).toEqual(TILE_ANIMATIONS.select)
    })

    it('should return config with custom overrides', () => {
      const customConfig = getAnimationConfig('select', { duration: 500 })
      
      expect(customConfig.duration).toBe(500)
      expect(customConfig.easing).toBe(TILE_ANIMATIONS.select.easing) // Original value
    })

    it('should handle invalid animation names', () => {
      const invalidConfig = getAnimationConfig('invalid' as any)
      
      expect(invalidConfig).toEqual({})
    })
  })

  describe('Motion Preferences Detection', () => {
    it('should detect reduced motion preference', () => {
      mockMatchMedia.mockReturnValue({
        matches: true,
        media: '(prefers-reduced-motion: reduce)'
      })

      expect(shouldReduceMotion()).toBe(true)
    })

    it('should detect no motion reduction preference', () => {
      mockMatchMedia.mockReturnValue({
        matches: false,
        media: '(prefers-reduced-motion: reduce)'
      })

      expect(shouldReduceMotion()).toBe(false)
    })

    it('should handle missing matchMedia', () => {
      Object.defineProperty(window, 'matchMedia', {
        value: undefined
      })

      expect(shouldReduceMotion()).toBe(false)
    })
  })

  describe('Optimized Duration Calculation', () => {
    it('should return original duration when motion not reduced', () => {
      mockMatchMedia.mockReturnValue({ matches: false })

      expect(getOptimizedDuration(300)).toBe(300)
    })

    it('should return reduced duration when motion reduced', () => {
      mockMatchMedia.mockReturnValue({ matches: true })

      expect(getOptimizedDuration(300)).toBe(99) // Significantly reduced (300 * 0.33 = 99)
    })

    it('should handle minimum duration threshold', () => {
      mockMatchMedia.mockReturnValue({ matches: true })

      expect(getOptimizedDuration(50)).toBe(50) // Below minimum, unchanged
    })

    it('should accept custom reduction factor', () => {
      mockMatchMedia.mockReturnValue({ matches: true })

      expect(getOptimizedDuration(300, 0.5)).toBe(150) // 50% of original
    })
  })

  describe('Animation Sequence Creation', () => {
    it('should create sequence with multiple animations', () => {
      const sequence = createAnimationSequence([
        { name: 'select', delay: 0 },
        { name: 'flip', delay: 200 },
        { name: 'deselect', delay: 400 }
      ])

      expect(sequence).toHaveLength(3)
      expect(sequence[0].delay).toBe(0)
      expect(sequence[1].delay).toBe(200)
      expect(sequence[2].delay).toBe(400)
    })

    it('should apply custom config to sequence items', () => {
      const sequence = createAnimationSequence([
        { name: 'select', delay: 0, config: { duration: 100 } }
      ])

      expect(sequence[0].config.duration).toBe(100)
    })

    it('should calculate total sequence duration', () => {
      const sequence = createAnimationSequence([
        { name: 'select', delay: 0 },
        { name: 'flip', delay: 200 }
      ])

      const totalDuration = sequence[sequence.length - 1].delay + sequence[sequence.length - 1].config.duration
      expect(totalDuration).toBe(450) // 200 + 250 (flip duration)
    })
  })

  describe('Animation Config Validation', () => {
    it('should validate valid animation config', () => {
      const validConfig = {
        duration: 300,
        easing: 'ease-out',
        transform: 'scale(1.1)'
      }

      expect(validateAnimationConfig(validConfig)).toBe(true)
    })

    it('should reject config with invalid duration', () => {
      const invalidConfig = {
        duration: -100,
        easing: 'ease-out'
      }

      expect(validateAnimationConfig(invalidConfig)).toBe(false)
    })

    it('should reject config with invalid easing', () => {
      const invalidConfig = {
        duration: 300,
        easing: 'invalid-easing'
      }

      expect(validateAnimationConfig(invalidConfig)).toBe(false)
    })

    it('should validate complex transform values', () => {
      const validConfig = {
        duration: 300,
        transform: 'translateX(100px) rotateY(45deg) scale(1.2)'
      }

      expect(validateAnimationConfig(validConfig)).toBe(true)
    })
  })

  describe('Performance Considerations', () => {
    it('should provide GPU-accelerated transform properties', () => {
      const selectAnim = TILE_ANIMATIONS.select
      
      // Should use transform (GPU-accelerated) instead of left/top
      expect(selectAnim.transform).toContain('scale')
      expect(selectAnim.transform).toContain('translateY')
      expect(selectAnim).not.toHaveProperty('left')
      expect(selectAnim).not.toHaveProperty('top')
    })

    it('should prefer opacity over visibility changes', () => {
      const passAnim = TILE_ANIMATIONS.pass
      
      expect(passAnim.opacity).toBeDefined()
      expect(passAnim).not.toHaveProperty('visibility')
      expect(passAnim).not.toHaveProperty('display')
    })
  })

  describe('Animation Context Support', () => {
    it('should provide charleston-specific animations', () => {
      expect(TILE_ANIMATIONS.pass.charleston).toBeTruthy()
      expect(TILE_ANIMATIONS.keep.charleston).toBeTruthy()
    })

    it('should provide game-specific animations', () => {
      expect(TILE_ANIMATIONS.discard.game).toBeTruthy()
      expect(TILE_ANIMATIONS.draw.game).toBeTruthy()
    })

    it('should provide analysis-specific animations', () => {
      expect(TILE_ANIMATIONS.highlight.analysis).toBeTruthy()
      expect(TILE_ANIMATIONS.recommendation.analysis).toBeTruthy()
    })
  })
})