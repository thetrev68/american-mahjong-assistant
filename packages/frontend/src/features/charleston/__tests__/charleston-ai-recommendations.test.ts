// Charleston AI Recommendation Engine Tests
// Tests for Charleston strategic intelligence, tile selection analysis, and AI recommendations

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useCharlestonStore } from '../../../stores/charleston-store'
import { createTile, createPatternSelection } from '../../../__tests__/factories'
import type { Tile, PatternSelectionOption } from 'shared-types'

// Test utilities for creating specific tile combinations
const createSequenceTiles = (suit: 'dots' | 'bams' | 'cracks', start: number, count: number): Tile[] =>
  Array.from({ length: count }, (_, i) => createTile({
    id: `${suit}-${start + i}`,
    suit,
    value: String(start + i),
    displayName: `${start + i} ${suit.charAt(0).toUpperCase()}${suit.slice(1, -1)}`
  }))

const createSameTiles = (suit: 'dots' | 'bams' | 'cracks', value: string, count: number): Tile[] =>
  Array.from({ length: count }, (_, i) => createTile({
    id: `${suit}-${value}-${i}`,
    suit,
    value,
    displayName: `${value} ${suit.charAt(0).toUpperCase()}${suit.slice(1, -1)}`
  }))

const createHonorTiles = (type: 'winds' | 'dragons', value: string, count: number): Tile[] =>
  Array.from({ length: count }, (_, i) => createTile({
    id: `${type}-${value}-${i}`,
    suit: type,
    value,
    displayName: value
  }))

const createFlowerTiles = (count: number): Tile[] =>
  Array.from({ length: count }, (_, i) => createTile({
    id: `flower-${i}`,
    suit: 'flowers',
    value: `f${i + 1}`,
    displayName: `Flower ${i + 1}`
  }))

const createJokerTiles = (count: number): Tile[] =>
  Array.from({ length: count }, (_, i) => createTile({
    id: `joker-${i}`,
    suit: 'jokers',
    value: 'joker',
    displayName: 'Joker',
    isJoker: true
  }))

// Pattern creation utilities
const create2025Pattern = (): PatternSelectionOption => createPatternSelection({
  pattern: '2025 YEAR',
  displayName: '2025 Year Pattern',
  category: 'YEAR'
})

const createLikeNumbersPattern = (): PatternSelectionOption => createPatternSelection({
  pattern: 'LIKE NUMBERS 1111 2222 3333',
  displayName: 'Like Numbers Pattern',
  category: 'NUMBERS'
})

const createSequencePattern = (): PatternSelectionOption => createPatternSelection({
  pattern: 'SEQUENCE 123 456 789',
  displayName: 'Sequence Pattern',
  category: 'CONSECUTIVE'
})

const createDragonPattern = (): PatternSelectionOption => createPatternSelection({
  pattern: 'DRAGONS RED GREEN WHITE',
  displayName: 'Dragon Pattern',
  category: 'DRAGONS'
})

describe('Charleston AI Recommendation Engine', () => {
  beforeEach(() => {
    useCharlestonStore.getState().reset()
  })

  afterEach(() => {
    useCharlestonStore.getState().reset()
  })

  describe('Basic Tile Value Assessment', () => {
    it('should prioritize keeping jokers', async () => {
      const hand = [
        ...createJokerTiles(2),
        ...createFlowerTiles(4),
        ...createSequenceTiles('dots', 1, 3),
        ...createSameTiles('bams', '5', 3)
      ]

      const store = useCharlestonStore.getState()
      store.startCharleston()
      store.setPlayerTiles(hand)

      await store.generateRecommendations()

      const recommendations = store.recommendations
      expect(recommendations).not.toBeNull()
      expect(recommendations!.tilesToPass).toHaveLength(3)

      // Should not recommend passing any jokers
      const hasJoker = recommendations!.tilesToPass.some(tile => tile.isJoker)
      expect(hasJoker).toBe(false)
    })

    it('should prioritize passing flowers over other tiles', async () => {
      const hand = [
        ...createFlowerTiles(4),
        ...createSequenceTiles('dots', 1, 3),
        ...createSameTiles('bams', '5', 3),
        ...createHonorTiles('winds', 'east', 2)
      ]

      const store = useCharlestonStore.getState()
      store.startCharleston()
      store.setPlayerTiles(hand)

      await store.generateRecommendations()

      const recommendations = store.recommendations
      expect(recommendations).not.toBeNull()
      expect(recommendations!.tilesToPass).toHaveLength(3)

      // Should prefer flowers for passing
      const flowerCount = recommendations!.tilesToPass.filter(tile => tile.suit === 'flowers').length
      expect(flowerCount).toBeGreaterThan(0)
    })

    it('should keep tiles with sequence potential', async () => {
      const hand = [
        ...createSequenceTiles('dots', 1, 3), // 1-2-3 dots (good sequence)
        createTile({ id: 'dots-5', suit: 'dots', value: '5' }), // Isolated dot
        createTile({ id: 'bams-7', suit: 'bams', value: '7' }), // Isolated bam
        ...createFlowerTiles(3),
        ...createSameTiles('cracks', '9', 4)
      ]

      const store = useCharlestonStore.getState()
      store.startCharleston()
      store.setPlayerTiles(hand)

      await store.generateRecommendations()

      const recommendations = store.recommendations
      expect(recommendations).not.toBeNull()

      // Should not recommend passing the sequence tiles (1-2-3 dots)
      const sequenceIds = ['dots-1', 'dots-2', 'dots-3']
      const passedSequenceTiles = recommendations!.tilesToPass.filter(tile =>
        sequenceIds.includes(tile.id)
      )
      expect(passedSequenceTiles).toHaveLength(0)
    })

    it('should keep multiple copies of same tile', async () => {
      const hand = [
        ...createSameTiles('dots', '1', 3), // Three 1-dots
        createTile({ id: 'single-dot', suit: 'dots', value: '9' }), // Single 9-dot
        ...createFlowerTiles(3),
        ...createSequenceTiles('bams', 5, 3)
      ]

      const store = useCharlestonStore.getState()
      store.startCharleston()
      store.setPlayerTiles(hand)

      await store.generateRecommendations()

      const recommendations = store.recommendations
      expect(recommendations).not.toBeNull()

      // Should prefer to keep the three 1-dots and pass the single 9-dot
      const singleDotPassed = recommendations!.tilesToPass.some(tile => tile.id === 'single-dot')
      const multipleDotsKept = recommendations!.tilesToPass.filter(tile =>
        tile.suit === 'dots' && tile.value === '1'
      ).length === 0

      expect(multipleDotsKept || singleDotPassed).toBe(true)
    })
  })

  describe('Pattern-Based Recommendations', () => {
    it('should consider 2025 pattern when selecting tiles to pass', async () => {
      const hand = [
        createTile({ id: 'dot-2', suit: 'dots', value: '2' }),
        createTile({ id: 'bam-0', suit: 'bams', value: '0' }), // For 2025
        createTile({ id: 'crack-5', suit: 'cracks', value: '5' }),
        createTile({ id: 'dot-7', suit: 'dots', value: '7' }), // Not in 2025
        createTile({ id: 'bam-8', suit: 'bams', value: '8' }), // Not in 2025
        ...createFlowerTiles(3),
        ...createSameTiles('winds', 'east', 4)
      ]

      const store = useCharlestonStore.getState()
      store.startCharleston()
      store.setPlayerTiles(hand)
      store.setTargetPatterns([create2025Pattern()])

      await store.generateRecommendations()

      const recommendations = store.recommendations
      expect(recommendations).not.toBeNull()

      // Should preferentially keep 2, 0, 5 tiles for 2025 pattern
      const kept2025Tiles = hand.filter(tile =>
        ['2', '0', '5'].includes(tile.value) && !recommendations!.tilesToPass.some(p => p.id === tile.id)
      )
      expect(kept2025Tiles.length).toBeGreaterThan(0)

      expect(recommendations!.reasoning.some(reason =>
        reason.includes('pattern')
      )).toBe(true)
    })

    it('should consider like numbers pattern', async () => {
      const hand = [
        ...createSameTiles('dots', '1', 2), // Two 1s
        ...createSameTiles('bams', '2', 2), // Two 2s
        ...createSameTiles('cracks', '3', 1), // One 3
        createTile({ id: 'random1', suit: 'winds', value: 'north' }),
        createTile({ id: 'random2', suit: 'dragons', value: 'red' }),
        ...createFlowerTiles(4)
      ]

      const store = useCharlestonStore.getState()
      store.startCharleston()
      store.setPlayerTiles(hand)
      store.setTargetPatterns([createLikeNumbersPattern()])

      await store.generateRecommendations()

      const recommendations = store.recommendations
      expect(recommendations).not.toBeNull()

      // Should try to keep number tiles that can form like numbers
      const numberTilesKept = hand.filter(tile =>
        ['dots', 'bams', 'cracks'].includes(tile.suit) &&
        !recommendations!.tilesToPass.some(p => p.id === tile.id)
      ).length

      expect(numberTilesKept).toBeGreaterThan(0)
    })

    it('should consider dragon patterns', async () => {
      const hand = [
        ...createHonorTiles('dragons', 'red', 2),
        createHonorTiles('dragons', 'green', 1)[0],
        createHonorTiles('dragons', 'white', 1)[0],
        ...createFlowerTiles(3),
        ...createSequenceTiles('dots', 1, 5)
      ]

      const store = useCharlestonStore.getState()
      store.startCharleston()
      store.setPlayerTiles(hand)
      store.setTargetPatterns([createDragonPattern()])

      await store.generateRecommendations()

      const recommendations = store.recommendations
      expect(recommendations).not.toBeNull()

      // Should try to keep dragon tiles
      const dragonTilesKept = hand.filter(tile =>
        tile.suit === 'dragons' &&
        !recommendations!.tilesToPass.some(p => p.id === tile.id)
      ).length

      expect(dragonTilesKept).toBeGreaterThan(0)
    })

    it('should handle multiple target patterns', async () => {
      const hand = [
        createTile({ id: 'dot-2', suit: 'dots', value: '2' }), // Good for 2025
        ...createSameTiles('bams', '1', 3), // Good for like numbers
        createHonorTiles('dragons', 'red', 1)[0], // Good for dragons
        ...createFlowerTiles(4),
        ...createSequenceTiles('cracks', 6, 4)
      ]

      const store = useCharlestonStore.getState()
      store.startCharleston()
      store.setPlayerTiles(hand)
      store.setTargetPatterns([
        create2025Pattern(),
        createLikeNumbersPattern(),
        createDragonPattern()
      ])

      await store.generateRecommendations()

      const recommendations = store.recommendations
      expect(recommendations).not.toBeNull()

      expect(recommendations!.reasoning.some(reason =>
        reason.includes('pattern')
      )).toBe(true)

      expect(recommendations!.reasoning.some(reason =>
        reason.includes('3 selected')
      )).toBe(true)
    })

    it('should provide fallback recommendations without patterns', async () => {
      const hand = [
        ...createFlowerTiles(4),
        ...createSequenceTiles('dots', 1, 4),
        ...createSameTiles('winds', 'east', 4)
      ]

      const store = useCharlestonStore.getState()
      store.startCharleston()
      store.setPlayerTiles(hand)
      // No target patterns set

      await store.generateRecommendations()

      const recommendations = store.recommendations
      expect(recommendations).not.toBeNull()
      expect(recommendations!.tilesToPass).toHaveLength(3)

      expect(recommendations!.reasoning.some(reason =>
        reason.includes('No specific patterns selected')
      )).toBe(true)
    })
  })

  describe('Recommendation Quality and Confidence', () => {
    it('should provide high confidence for clear decisions', async () => {
      const hand = [
        ...createJokerTiles(2), // Definitely keep
        ...createFlowerTiles(5), // Definitely pass 3 of these
        ...createSameTiles('dots', '1', 4) // Definitely keep
      ]

      const store = useCharlestonStore.getState()
      store.startCharleston()
      store.setPlayerTiles(hand)

      await store.generateRecommendations()

      const recommendations = store.recommendations
      expect(recommendations).not.toBeNull()
      expect(recommendations!.confidence).toBeGreaterThan(0.7)
    })

    it('should provide reasonable confidence for mixed hands', async () => {
      const hand = [
        ...createSequenceTiles('dots', 1, 3),
        ...createSequenceTiles('bams', 4, 3),
        ...createHonorTiles('winds', 'east', 2),
        ...createFlowerTiles(2),
        createJokerTiles(1)[0]
      ]

      const store = useCharlestonStore.getState()
      store.startCharleston()
      store.setPlayerTiles(hand)

      await store.generateRecommendations()

      const recommendations = store.recommendations
      expect(recommendations).not.toBeNull()
      expect(recommendations!.confidence).toBeGreaterThan(0.5)
      expect(recommendations!.confidence).toBeLessThanOrEqual(1.0)
    })

    it('should provide meaningful reasoning', async () => {
      const hand = [
        ...createFlowerTiles(3),
        ...createJokerTiles(1),
        ...createSameTiles('dots', '1', 3),
        ...createSequenceTiles('bams', 2, 4)
      ]

      const store = useCharlestonStore.getState()
      store.startCharleston()
      store.setPlayerTiles(hand)
      store.setTargetPatterns([createLikeNumbersPattern()])

      await store.generateRecommendations()

      const recommendations = store.recommendations
      expect(recommendations).not.toBeNull()
      expect(recommendations!.reasoning).toHaveLength(3) // Should have 3 reasoning points

      expect(recommendations!.reasoning[0]).toContain('tiles that are least useful')
      expect(recommendations!.reasoning[1]).toContain('Charleston strategy')
      expect(recommendations!.reasoning[2]).toContain('selected pattern')
    })
  })

  describe('Edge Cases in Recommendations', () => {
    it('should handle hands with only 3 tiles', async () => {
      const hand = [
        createTile({ id: 'dot-1', suit: 'dots', value: '1' }),
        createTile({ id: 'bam-2', suit: 'bams', value: '2' }),
        createTile({ id: 'crack-3', suit: 'cracks', value: '3' })
      ]

      const store = useCharlestonStore.getState()
      store.startCharleston()
      store.setPlayerTiles(hand)

      await store.generateRecommendations()

      const recommendations = store.recommendations
      expect(recommendations).not.toBeNull()
      expect(recommendations!.tilesToPass).toHaveLength(3)
    })

    it('should handle hands with fewer than 3 non-joker tiles', async () => {
      const hand = [
        ...createJokerTiles(10), // Many jokers
        createTile({ id: 'flower-1', suit: 'flowers', value: 'f1' }),
        createTile({ id: 'dot-1', suit: 'dots', value: '1' })
      ]

      const store = useCharlestonStore.getState()
      store.startCharleston()
      store.setPlayerTiles(hand)

      await store.generateRecommendations()

      const recommendations = store.recommendations
      expect(recommendations).not.toBeNull()
      expect(recommendations!.tilesToPass).toHaveLength(2) // Only 2 non-jokers available

      // Should not recommend any jokers
      expect(recommendations!.tilesToPass.every(tile => !tile.isJoker)).toBe(true)
    })

    it('should handle hands with all same-value tiles', async () => {
      const hand = [
        ...createSameTiles('dots', '1', 5),
        ...createSameTiles('bams', '1', 4),
        ...createSameTiles('cracks', '1', 3)
      ]

      const store = useCharlestonStore.getState()
      store.startCharleston()
      store.setPlayerTiles(hand)

      await store.generateRecommendations()

      const recommendations = store.recommendations
      expect(recommendations).not.toBeNull()
      expect(recommendations!.tilesToPass).toHaveLength(3)
    })

    it('should handle analysis errors gracefully', async () => {
      const store = useCharlestonStore.getState()

      // Mock error by setting invalid state
      store.startCharleston()
      store.setPlayerTiles([]) // Empty hand to trigger edge case

      await store.generateRecommendations()

      // Should handle gracefully
      expect(store.isAnalyzing).toBe(false)
    })
  })

  describe('Performance and Optimization', () => {
    it('should handle large hands efficiently', async () => {
      const largeHand = [
        ...createSequenceTiles('dots', 1, 9),
        ...createSequenceTiles('bams', 1, 9),
        ...createSequenceTiles('cracks', 1, 9),
        ...createHonorTiles('winds', 'east', 4),
        ...createHonorTiles('dragons', 'red', 4),
        ...createFlowerTiles(8),
        ...createJokerTiles(2)
      ]

      const store = useCharlestonStore.getState()
      store.startCharleston()
      store.setPlayerTiles(largeHand)

      const startTime = Date.now()
      await store.generateRecommendations()
      const endTime = Date.now()

      const recommendations = store.recommendations
      expect(recommendations).not.toBeNull()
      expect(recommendations!.tilesToPass).toHaveLength(3)

      // Should complete in reasonable time (under 1 second)
      expect(endTime - startTime).toBeLessThan(1000)
    })

    it('should handle complex pattern combinations efficiently', async () => {
      const complexHand = [
        ...createSequenceTiles('dots', 1, 5),
        ...createSameTiles('bams', '2', 3),
        ...createHonorTiles('dragons', 'red', 2),
        ...createFlowerTiles(3),
        createJokerTiles(1)[0]
      ]

      const complexPatterns = [
        create2025Pattern(),
        createLikeNumbersPattern(),
        createSequencePattern(),
        createDragonPattern()
      ]

      const store = useCharlestonStore.getState()
      store.startCharleston()
      store.setPlayerTiles(complexHand)
      store.setTargetPatterns(complexPatterns)

      const startTime = Date.now()
      await store.generateRecommendations()
      const endTime = Date.now()

      const recommendations = store.recommendations
      expect(recommendations).not.toBeNull()

      // Should handle complex analysis efficiently
      expect(endTime - startTime).toBeLessThan(500)
    })
  })

  describe('Strategic Intelligence', () => {
    it('should understand tile synergies', async () => {
      const hand = [
        createTile({ id: 'dot-1', suit: 'dots', value: '1' }),
        createTile({ id: 'dot-2', suit: 'dots', value: '2' }), // Adjacent to dot-1
        createTile({ id: 'dot-5', suit: 'dots', value: '5' }), // Isolated
        createTile({ id: 'bam-7', suit: 'bams', value: '7' }), // Isolated
        ...createFlowerTiles(4),
        ...createJokerTiles(1),
        ...createSameTiles('winds', 'east', 3)
      ]

      const store = useCharlestonStore.getState()
      store.startCharleston()
      store.setPlayerTiles(hand)

      await store.generateRecommendations()

      const recommendations = store.recommendations
      expect(recommendations).not.toBeNull()

      // Should prefer to keep the connected dot-1 and dot-2
      const adjacentDotsKept = !recommendations!.tilesToPass.some(tile =>
        (tile.id === 'dot-1' || tile.id === 'dot-2')
      )

      // Should be more likely to pass isolated tiles
      const isolatedTilesPassed = recommendations!.tilesToPass.some(tile =>
        tile.id === 'dot-5' || tile.id === 'bam-7'
      )

      expect(adjacentDotsKept || isolatedTilesPassed).toBe(true)
    })

    it('should balance multiple strategic considerations', async () => {
      const hand = [
        ...createJokerTiles(1), // High value - keep
        ...createSameTiles('dots', '2', 3), // Pattern potential for 2025
        createTile({ id: 'flower-special', suit: 'flowers', value: 'f1' }), // Low value - pass
        ...createHonorTiles('winds', 'east', 4), // Multiple copies - keep some
        ...createSequenceTiles('bams', 4, 3) // Sequence potential - keep
      ]

      const store = useCharlestonStore.getState()
      store.startCharleston()
      store.setPlayerTiles(hand)
      store.setTargetPatterns([create2025Pattern()])

      await store.generateRecommendations()

      const recommendations = store.recommendations
      expect(recommendations).not.toBeNull()

      // Should demonstrate strategic thinking in reasoning
      expect(recommendations!.reasoning.length).toBeGreaterThan(2)
      expect(recommendations!.confidence).toBeGreaterThan(0.6)

      // Should not pass joker
      expect(recommendations!.tilesToPass.some(tile => tile.isJoker)).toBe(false)
    })
  })
})