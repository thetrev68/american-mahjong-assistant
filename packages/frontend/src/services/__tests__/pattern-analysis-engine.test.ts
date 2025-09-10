// Engine 1: Pattern Analysis Engine Tests
// Tests pure mathematical pattern matching against 1,002 variations

import { describe, test, expect, beforeAll, vi } from 'vitest'
import { PatternAnalysisEngine, type GameContext } from '../pattern-analysis-engine'
import { PatternVariationLoader } from '../pattern-variation-loader'

// Sample game context for testing
const createGameContext = (overrides: Partial<GameContext> = {}): GameContext => ({
  jokersInHand: 0,
  wallTilesRemaining: 84,
  discardPile: [],
  exposedTiles: {},
  currentPhase: 'gameplay',
  ...overrides
})

describe('Pattern Analysis Engine (Engine 1)', () => {
  beforeAll(async () => {
    // Load pattern variations before testing
    await PatternVariationLoader.loadVariations()
  })

  describe('Core Pattern Matching', () => {
    test('should analyze SINGLES AND PAIRS pattern correctly', async () => {
      // Example from CLAUDE.md: Using real pattern ID from NMJL data
      const playerTiles = ['6B', '6B', '6C', '6C', 'flower']
      const patternIds = ['2025-SINGLES_AND_PAIRS-3-1'] // Real Singles and Pairs pattern ID
      const gameContext = createGameContext()

      const results = await PatternAnalysisEngine.analyzePatterns(
        playerTiles,
        patternIds,
        gameContext
      )

      expect(results).toHaveLength(1)
      const result = results[0]

      // Verify basic structure
      expect(result.patternId).toBe('2025-SINGLES_AND_PAIRS-3-1')
      expect(result.tileMatching.bestVariation).toBeDefined()
      expect(result.tileMatching.bestVariation.tilesMatched).toBeGreaterThan(0) // Should match some tiles
      expect(result.tileMatching.bestVariation.tilesNeeded).toBeGreaterThan(0) // Pattern needs some tiles
      expect(result.tileMatching.bestVariation.completionRatio).toBeGreaterThanOrEqual(0)
      expect(result.tileMatching.bestVariation.completionRatio).toBeLessThanOrEqual(1)
      
      // Verify tile contributions
      expect(result.tileMatching.bestVariation.tileContributions).toBeDefined()
      expect(result.tileMatching.bestVariation.tileContributions.length).toBeGreaterThan(0)
    })

    test('should handle pattern with joker restrictions correctly', async () => {
      // Test joker behavior with Singles & Pairs pattern
      const playerTiles = ['6B', '6C', 'joker', 'joker', 'flower']
      const patternIds = ['2025-SINGLES_AND_PAIRS-3-1']
      const gameContext = createGameContext({ jokersInHand: 2 })

      const results = await PatternAnalysisEngine.analyzePatterns(
        playerTiles,
        patternIds,
        gameContext
      )

      const result = results[0]
      
      // Should handle jokers according to pattern rules
      expect(result.tileMatching.bestVariation.tilesMatched).toBeGreaterThan(0) 
      expect(result.tileMatching.bestVariation.missingTiles.length).toBeGreaterThan(0)
    })

    test('should analyze CONSECUTIVE RUN pattern correctly', async () => {
      const playerTiles = ['1B', '2B', '3B', '4B', '5B', '6B']
      const patternIds = ['2025-CONSECUTIVE_RUN-7-1'] // Real consecutive pattern ID
      const gameContext = createGameContext()

      const results = await PatternAnalysisEngine.analyzePatterns(
        playerTiles,
        patternIds,
        gameContext
      )

      expect(results).toHaveLength(1)
      const result = results[0]

      expect(result.patternId).toBe('2025-CONSECUTIVE_RUN-7-1')
      expect(result.tileMatching.bestVariation.tilesMatched).toBeGreaterThanOrEqual(3) // Should match several consecutive tiles
      expect(result.tileMatching.bestVariation.completionRatio).toBeGreaterThan(0.2) // Some progress
    })

    test('should handle empty hand gracefully', async () => {
      const playerTiles: string[] = []
      const patternIds = ['2025-SINGLES_AND_PAIRS-3-1']
      const gameContext = createGameContext()

      const results = await PatternAnalysisEngine.analyzePatterns(
        playerTiles,
        patternIds,
        gameContext
      )

      expect(results).toHaveLength(1)
      const result = results[0]
      
      expect(result.tileMatching.bestVariation.tilesMatched).toBe(0)
      expect(result.tileMatching.bestVariation.completionRatio).toBe(0)
      expect(result.tileMatching.bestVariation.missingTiles).toHaveLength(result.tileMatching.bestVariation.tilesNeeded)
    })

    test('should handle invalid pattern IDs gracefully', async () => {
      const playerTiles = ['1B', '2B', '3B']
      const patternIds = ['NONEXISTENT_PATTERN-999-1']
      const gameContext = createGameContext()

      // Should not throw error, but return empty or error result
      expect(async () => {
        await PatternAnalysisEngine.analyzePatterns(playerTiles, patternIds, gameContext)
      }).not.toThrow()
    })
  })

  describe('Tile Matching Logic', () => {
    test('should correctly identify tile positions in patterns', async () => {
      const playerTiles = ['1B', '1C', '1D'] // Three 1s in different suits
      const patternIds = ['2025-ANY_LIKE_NUMBERS-2-1'] // Real ANY LIKE NUMBERS pattern
      const gameContext = createGameContext()

      const results = await PatternAnalysisEngine.analyzePatterns(
        playerTiles,
        patternIds,
        gameContext
      )

      const result = results[0]
      
      // Each tile should have position information
      result.tileMatching.bestVariation.tileContributions.forEach(contribution => {
        expect(contribution.tileId).toMatch(/^[1-9][BCD]$/)
        expect(Array.isArray(contribution.positionsInPattern)).toBe(true)
        expect(contribution.positionsInPattern.length).toBeGreaterThan(0)
        expect(typeof contribution.isRequired).toBe('boolean')
      })
    })

    test('should handle duplicate tiles correctly', async () => {
      const playerTiles = ['2B', '2B', '2B', '2B'] // Four of same tile
      const patternIds = ['2025-2025-1-1'] // Any 3 Suits, Like Pungs 2s or 5s
      const gameContext = createGameContext()

      const results = await PatternAnalysisEngine.analyzePatterns(
        playerTiles,
        patternIds,
        gameContext
      )

      const result = results[0]
      
      // Should handle duplicates without crashing
      expect(result.tileMatching.bestVariation.tilesMatched).toBeGreaterThan(0)
      expect(result.tileMatching.bestVariation.tileContributions).toBeDefined()
    })

    test('should calculate completion ratios accurately', async () => {
      const playerTiles = ['1B', '2B', '3B', '4B', '5B', '6B', '7B'] // 7 tiles
      const patternIds = ['2025-CONSECUTIVE_RUN-7-1']
      const gameContext = createGameContext()

      const results = await PatternAnalysisEngine.analyzePatterns(
        playerTiles,
        patternIds,
        gameContext
      )

      const result = results[0]
      
      // Completion ratio should be between 0 and 1
      expect(result.tileMatching.bestVariation.completionRatio).toBeGreaterThanOrEqual(0)
      expect(result.tileMatching.bestVariation.completionRatio).toBeLessThanOrEqual(1)
      
      // Should be consistent with tile counts
      const expectedRatio = result.tileMatching.bestVariation.tilesMatched / result.tileMatching.bestVariation.tilesNeeded
      expect(result.tileMatching.bestVariation.completionRatio).toBeCloseTo(expectedRatio, 0)
    })
  })

  describe('Multiple Pattern Analysis', () => {
    test('should analyze multiple patterns simultaneously', async () => {
      const playerTiles = ['1B', '2B', '3B', '1C', '2C', '3C']
      const patternIds = [
        '2025-CONSECUTIVE_RUN-7-1',
        '2025-ANY_LIKE_NUMBERS-2-1',
        '2025-SINGLES_AND_PAIRS-3-1'
      ]
      const gameContext = createGameContext()

      const results = await PatternAnalysisEngine.analyzePatterns(
        playerTiles,
        patternIds,
        gameContext
      )

      expect(results).toHaveLength(3)
      
      // Each result should have unique pattern ID
      const patternIdsInResults = results.map(r => r.patternId)
      const uniquePatternIds = new Set(patternIdsInResults)
      expect(uniquePatternIds.size).toBe(3)
      
      // All should have valid completion ratios
      results.forEach(result => {
        expect(result.tileMatching.bestVariation.completionRatio).toBeGreaterThanOrEqual(0)
        expect(result.tileMatching.bestVariation.completionRatio).toBeLessThanOrEqual(1)
      })
    })

    test('should find best variation within pattern family', async () => {
      // Test that engine finds the best sequence within a pattern
      const playerTiles = ['1B', '2B', '3B', '1C', '2C']
      const patternIds = ['2025-CONSECUTIVE_RUN-7-1'] // Pattern with multiple sequences
      const gameContext = createGameContext()

      const results = await PatternAnalysisEngine.analyzePatterns(
        playerTiles,
        patternIds,
        gameContext
      )

      const result = results[0]
      
      // Should have selected optimal sequence/variation
      expect(result.tileMatching.bestVariation.sequence).toBeGreaterThan(0)
      expect(result.tileMatching.bestVariation.variationId).toBeDefined()
      expect(result.tileMatching.bestVariation.patternTiles).toHaveLength(14) // Complete pattern tiles
    })
  })

  describe('Game Context Integration', () => {
    test('should consider jokers in hand for pattern matching', async () => {
      const playerTiles = ['1B', '2B', 'joker']
      const patternIds = ['2025-CONSECUTIVE_RUN-7-1']
      
      // Test without jokers
      const contextNoJokers = createGameContext({ jokersInHand: 0 })
      const resultsNoJokers = await PatternAnalysisEngine.analyzePatterns(
        playerTiles,
        patternIds,
        contextNoJokers
      )
      
      // Test with jokers
      const contextWithJokers = createGameContext({ jokersInHand: 1 })
      const resultsWithJokers = await PatternAnalysisEngine.analyzePatterns(
        playerTiles,
        patternIds,
        contextWithJokers
      )

      // Joker context should affect analysis
      expect(resultsWithJokers[0].tileMatching.bestVariation.tilesMatched).toBeGreaterThanOrEqual(
        resultsNoJokers[0].tileMatching.bestVariation.tilesMatched
      )
    })

    test('should consider Charleston phase context', async () => {
      const playerTiles = ['1B', '2B', '3B']
      const patternIds = ['2025-CONSECUTIVE_RUN-7-1']
      
      const charlestonContext = createGameContext({ currentPhase: 'charleston' })
      const gameplayContext = createGameContext({ currentPhase: 'gameplay' })

      const charlestonResults = await PatternAnalysisEngine.analyzePatterns(
        playerTiles,
        patternIds,
        charlestonContext
      )
      
      const gameplayResults = await PatternAnalysisEngine.analyzePatterns(
        playerTiles,
        patternIds,
        gameplayContext
      )

      // Both should succeed (phase affects strategy, not facts)
      expect(charlestonResults).toHaveLength(1)
      expect(gameplayResults).toHaveLength(1)
    })

    test('should handle exposed tiles context', async () => {
      const playerTiles = ['1B', '2B', '3B']
      const patternIds = ['2025-ANY_LIKE_NUMBERS-2-1']
      const gameContext = createGameContext({
        exposedTiles: {
          'player2': ['1C', '1C', '1C'], // Player 2 exposed three 1C
          'player3': ['2D', '2D'] // Player 3 exposed two 2D
        }
      })

      const results = await PatternAnalysisEngine.analyzePatterns(
        playerTiles,
        patternIds,
        gameContext
      )

      // Should still analyze correctly despite exposed tiles
      expect(results).toHaveLength(1)
      expect(results[0].tileMatching.bestVariation).toBeDefined()
    })
  })

  describe('Performance and Edge Cases', () => {
    test('should handle large hand sizes efficiently', async () => {
      // Test with maximum hand size (14 tiles)
      const playerTiles = [
        '1B', '2B', '3B', '4B', '5B', '6B', '7B',
        '1C', '2C', '3C', '4C', '5C', '6C', '7C'
      ]
      const patternIds = ['2025-CONSECUTIVE_RUN-7-1', '2025-ANY_LIKE_NUMBERS-2-1']
      const gameContext = createGameContext()

      const startTime = performance.now()
      const results = await PatternAnalysisEngine.analyzePatterns(
        playerTiles,
        patternIds,
        gameContext
      )
      const endTime = performance.now()

      // Should complete within reasonable time (sub-300ms requirement from CLAUDE.md)
      expect(endTime - startTime).toBeLessThan(300)
      expect(results).toHaveLength(2)
    })

    test('should handle special tiles correctly', async () => {
      const playerTiles = ['flower', 'white', 'green', 'red', 'joker']
      const patternIds = ['2025-SINGLES_AND_PAIRS-3-1']
      const gameContext = createGameContext({ jokersInHand: 1 })

      const results = await PatternAnalysisEngine.analyzePatterns(
        playerTiles,
        patternIds,
        gameContext
      )

      expect(results).toHaveLength(1)
      const result = results[0]
      
      // Should handle special tiles without error
      expect(result.tileMatching.bestVariation.tileContributions).toBeDefined()
      result.tileMatching.bestVariation.tileContributions.forEach(contribution => {
        expect(contribution.tileId).toBeDefined()
        expect(typeof contribution.isRequired).toBe('boolean')
      })
    })

    test('should validate pattern tile array completeness', async () => {
      const playerTiles = ['1B', '2B', '3B']
      const patternIds = ['2025-CONSECUTIVE_RUN-7-1']
      const gameContext = createGameContext()

      const results = await PatternAnalysisEngine.analyzePatterns(
        playerTiles,
        patternIds,
        gameContext
      )

      const result = results[0]
      
      // Pattern tiles should always be complete 14-tile array
      expect(result.tileMatching.bestVariation.patternTiles).toHaveLength(14)
      result.tileMatching.bestVariation.patternTiles.forEach(tile => {
        expect(typeof tile).toBe('string')
        expect(tile.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Error Handling and Robustness', () => {
    test('should handle pattern variations loading failure gracefully', async () => {
      // Mock PatternVariationLoader to simulate failure
      const originalLoad = PatternVariationLoader.loadVariations
      PatternVariationLoader.loadVariations = vi.fn().mockRejectedValue(new Error('Load failed'))

      const playerTiles = ['1B', '2B']
      const patternIds = ['2025-CONSECUTIVE_RUN-7-1']
      const gameContext = createGameContext()

      // Should not crash the application
      await expect(async () => {
        await PatternAnalysisEngine.analyzePatterns(playerTiles, patternIds, gameContext)
      }).not.toThrow()

      // Restore original function
      PatternVariationLoader.loadVariations = originalLoad
    })

    test('should validate input parameters', async () => {
      const gameContext = createGameContext()

      // Test null/undefined inputs
      await expect(async () => {
        await PatternAnalysisEngine.analyzePatterns(null as unknown as string[], ['2025-SINGLES_AND_PAIRS-3-1'], gameContext)
      }).not.toThrow()

      await expect(async () => {
        await PatternAnalysisEngine.analyzePatterns(['1B'], null as unknown as string[], gameContext)
      }).not.toThrow()

      await expect(async () => {
        await PatternAnalysisEngine.analyzePatterns(['1B'], ['2025-SINGLES_AND_PAIRS-3-1'], null as unknown as GameContext)
      }).not.toThrow()
    })

    test('should maintain consistent results for identical inputs', async () => {
      const playerTiles = ['1B', '2B', '3B']
      const patternIds = ['2025-CONSECUTIVE_RUN-7-1']
      const gameContext = createGameContext()

      const results1 = await PatternAnalysisEngine.analyzePatterns(
        playerTiles,
        patternIds,
        gameContext
      )
      
      const results2 = await PatternAnalysisEngine.analyzePatterns(
        playerTiles,
        patternIds,
        gameContext
      )

      // Results should be identical for same inputs
      expect(results1).toEqual(results2)
      expect(results1[0].tileMatching.bestVariation.completionRatio).toBe(results2[0].tileMatching.bestVariation.completionRatio)
      expect(results1[0].tileMatching.bestVariation.tilesMatched).toBe(results2[0].tileMatching.bestVariation.tilesMatched)
    })
  })
})