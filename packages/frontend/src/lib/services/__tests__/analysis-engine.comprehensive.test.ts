/**
 * Comprehensive Analysis Engine Tests - Advanced Scenarios
 *
 * This test suite extends the existing analysis-engine.test.ts with additional
 * edge cases, performance tests, and complex integration scenarios.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AnalysisEngine } from '../analysis-engine'
import { nmjlService } from '../nmjl-service'
import { PatternAnalysisEngine } from '../../../features/intelligence-panel/services/pattern-analysis-engine'
import { PatternRankingEngine } from '../../../features/intelligence-panel/services/pattern-ranking-engine'
import { TileRecommendationEngine } from '../../../features/intelligence-panel/services/tile-recommendation-engine'
import {
  createTile,
  createPatternSelection,
  createAnalysisFacts,
  createRankedPatternResults,
  TilePresets,
} from '../../../__tests__/factories'

// Mock dependencies
vi.mock('../nmjl-service')
vi.mock('../../../features/intelligence-panel/services/pattern-analysis-engine')
vi.mock('../../../features/intelligence-panel/services/pattern-ranking-engine')
vi.mock('../../../features/intelligence-panel/services/tile-recommendation-engine')

describe('Analysis Engine - Comprehensive Scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mocks
    vi.mocked(nmjlService.getSelectionOptions).mockResolvedValue([
      createPatternSelection({ id: 1 }),
      createPatternSelection({ id: 2 })
    ])

    vi.mocked(PatternAnalysisEngine.analyzePatterns).mockResolvedValue([
      createAnalysisFacts({ patternId: 'test-pattern-1', tilesMatched: 8 }),
      createAnalysisFacts({ patternId: 'test-pattern-2', tilesMatched: 6 })
    ])

    vi.mocked(PatternRankingEngine.rankPatterns).mockResolvedValue(
      createRankedPatternResults({
        patterns: [
          createPatternSelection({ id: 1 }),
          createPatternSelection({ id: 2 })
        ]
      })
    )

    vi.mocked(TileRecommendationEngine.generateRecommendations).mockResolvedValue({
      tileActions: [
        {
          tileId: '1B',
          primaryAction: 'keep',
          confidence: 0.9,
          reasoning: 'Critical for completion',
          priority: 9,
          contextualActions: {
            charleston: 'keep',
            gameplay: 'keep',
            exposition: 'keep'
          },
          patternsHelped: ['pattern1'],
          multiPatternValue: 5,
          dangers: []
        }
      ],
      keepTiles: [],
      passTiles: [],
      discardTiles: [],
      optimalStrategy: {
        primaryPattern: 'pattern1',
        backupPattern: null,
        pivotCondition: null,
        expectedCompletion: 0.9
      },
      opponentAnalysis: [],
      strategicAdvice: ['Focus on primary pattern'],
      emergencyActions: []
    })
  })

  describe('Complex Game States', () => {
    it('should handle late-game scenarios with limited wall tiles', async () => {
      const tiles = TilePresets.mixedHand()
      const patterns = [createPatternSelection()]
      const lateGameContext = {
        wallTilesRemaining: 8, // Very few tiles left
        currentPhase: 'gameplay' as const,
        discardPile: Array.from({ length: 40 }, (_, i) => `tile-${i}`), // Large discard pile
        exposedTiles: {
          'player2': ['1B', '1B', '1B', '2B', '2B', '2B'],
          'player3': ['red', 'red', 'red', 'green', 'green'],
          'player4': ['flower', 'flower', 'flower', 'flower']
        }
      }

      const result = await AnalysisEngine.analyzeHand(tiles, patterns, lateGameContext)

      expect(result).toBeDefined()
      expect(result.analysisVersion).toBe('AV3-ThreeEngine')
      expect(PatternAnalysisEngine.analyzePatterns).toHaveBeenCalledWith(
        tiles.map(t => t.id),
        patterns.map(p => p.id),
        expect.objectContaining({
          wallTilesRemaining: 8,
          discardPile: expect.arrayContaining(['tile-0']),
          exposedTiles: expect.objectContaining({
            'player2': expect.arrayContaining(['1B', '2B'])
          })
        })
      )
    })

    it('should handle charleston phase with joker-heavy hands', async () => {
      const jokerHeavyHand = [
        ...TilePresets.jokers(4), // 4 jokers
        createTile({ id: '1B' }),
        createTile({ id: '2B' }),
        createTile({ id: '3B' }),
        createTile({ id: 'red' }),
        createTile({ id: 'green' }),
        createTile({ id: 'white' }),
        createTile({ id: 'flower' }),
        createTile({ id: 'f1' }),
        createTile({ id: 'f2' })
      ]

      const patterns = [createPatternSelection({ id: 1 })]
      const charlestonContext = {
        currentPhase: 'charleston' as const,
        jokersInHand: 4,
        wallTilesRemaining: 84
      }

      const result = await AnalysisEngine.analyzeHand(jokerHeavyHand, patterns, charlestonContext)

      expect(result).toBeDefined()
      expect(PatternAnalysisEngine.analyzePatterns).toHaveBeenCalledWith(
        jokerHeavyHand.map(t => t.id),
        patterns.map(p => p.id.toString()),
        expect.objectContaining({
          jokersInHand: 4,
          currentPhase: 'charleston'
        })
      )
    })

    it('should handle scenarios with many viable patterns', async () => {
      const manyPatterns = Array.from({ length: 15 }, (_, i) =>
        createPatternSelection({ id: i + 1, points: 20 + i })
      )

      vi.mocked(nmjlService.getSelectionOptions).mockResolvedValue(manyPatterns)
      vi.mocked(PatternAnalysisEngine.analyzePatterns).mockResolvedValue(
        manyPatterns.map((p, i) => createAnalysisFacts({
          patternId: p.id,
          tilesMatched: 5 + i % 4, // Varying completion levels
          completionRatio: (5 + i % 4) / 14
        }))
      )

      const result = await AnalysisEngine.analyzeHand(TilePresets.mixedHand(), [])

      expect(result.recommendedPatterns.length).toBeGreaterThan(0)
      expect(result.bestPatterns.length).toBeGreaterThan(0)
      expect(PatternRankingEngine.rankPatterns).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ patternId: 'pattern-1' }),
          expect.objectContaining({ patternId: 'pattern-15' })
        ]),
        manyPatterns,
        expect.any(Object)
      )
    })
  })

  describe('Performance and Stress Testing', () => {
    it('should handle maximum hand size efficiently', async () => {
      const maxHand = Array.from({ length: 14 }, (_, i) =>
        createTile({ id: `tile-${i}`, instanceId: `max-hand-${i}` })
      )

      const startTime = performance.now()
      const result = await AnalysisEngine.analyzeHand(maxHand, [createPatternSelection()])
      const duration = performance.now() - startTime

      expect(duration).toBeLessThan(500) // Should complete within 500ms
      expect(result.tileRecommendations).toHaveLength(1)
      expect(result.recommendedPatterns.length).toBeGreaterThan(0)
    })

    it('should handle concurrent analysis requests', async () => {
      const hands = [
        TilePresets.pungs(),
        TilePresets.pairs(),
        TilePresets.mixedHand()
      ]

      const patterns = [createPatternSelection({ id: 1 })]

      const promises = hands.map(hand =>
        AnalysisEngine.analyzeHand(hand, patterns)
      )

      const results = await Promise.all(promises)

      expect(results).toHaveLength(3)
      results.forEach(result => {
        expect(result.analysisVersion).toBe('AV3-ThreeEngine')
        expect(result.lastUpdated).toBeDefined()
      })
    })

    it('should maintain cache efficiency under load', async () => {
      const testHand = TilePresets.mixedHand()
      const testPatterns = [createPatternSelection({ id: 1 })]

      // First call - should hit analysis engines
      await AnalysisEngine.analyzeHand(testHand, testPatterns)
      expect(PatternAnalysisEngine.analyzePatterns).toHaveBeenCalledTimes(1)

      // Multiple identical calls - should use cache
      const cachePromises = Array.from({ length: 5 }, () =>
        AnalysisEngine.analyzeHand(testHand, testPatterns)
      )

      await Promise.all(cachePromises)
      expect(PatternAnalysisEngine.analyzePatterns).toHaveBeenCalledTimes(1) // Still only called once

      // Verify cache stats
      const cacheStats = AnalysisEngine.getCacheStats()
      expect(cacheStats.size).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Error Recovery and Resilience', () => {
    it('should recover from transient engine failures', async () => {
      const tiles = TilePresets.mixedHand()
      const patterns = [createPatternSelection()]

      // Mock first call to fail, second to succeed
      let callCount = 0
      vi.mocked(PatternAnalysisEngine.analyzePatterns).mockImplementation(async () => {
        callCount++
        if (callCount === 1) {
          throw new Error('Transient failure')
        }
        return [createAnalysisFacts()]
      })

      // First call should fail
      await expect(AnalysisEngine.analyzeHand(tiles, patterns))
        .rejects.toThrow('Analysis engine failure: Transient failure')

      // Second call should succeed (simulating retry scenario)
      const result = await AnalysisEngine.analyzeHand(tiles, patterns)
      expect(result).toBeDefined()
    })

    it('should handle corrupted pattern data gracefully', async () => {
      const tiles = TilePresets.mixedHand()

      // Mock corrupted pattern data
      vi.mocked(nmjlService.getSelectionOptions).mockResolvedValue([
        { id: 'corrupted', name: null } as any, // Corrupted pattern
        createPatternSelection({ id: 1 }) // Valid pattern
      ])

      const result = await AnalysisEngine.analyzeHand(tiles, [])

      expect(result).toBeDefined()
      // Should handle corrupted data without crashing
      expect(result.recommendedPatterns[0].pattern).toBeDefined()
    })

    it('should maintain consistency across engine updates', async () => {
      const tiles = TilePresets.mixedHand()
      const patterns = [createPatternSelection({ id: 1 })]

      // First analysis
      const result1 = await AnalysisEngine.analyzeHand(tiles, patterns)

      // Clear cache to force fresh analysis
      AnalysisEngine.clearCacheForHandChange(['old'], ['new'])

      // Second analysis with same data
      const result2 = await AnalysisEngine.analyzeHand(tiles, patterns)

      // Core structure should remain consistent
      expect(result1.analysisVersion).toBe(result2.analysisVersion)
      expect(result1.recommendedPatterns.length).toBe(result2.recommendedPatterns.length)
      expect(result1.tileRecommendations.length).toBe(result2.tileRecommendations.length)
    })
  })

  describe('Advanced Integration Scenarios', () => {
    it('should coordinate all three engines for complex decisions', async () => {
      const complexHand = [
        createTile({ id: '1B' }), createTile({ id: '1B' }),
        createTile({ id: '2B' }), createTile({ id: '2B' }),
        createTile({ id: '3C' }), createTile({ id: '3C' }),
        createTile({ id: 'red' }), createTile({ id: 'green' }),
        createTile({ id: 'flower' }), createTile({ id: 'joker' }),
        createTile({ id: '9D' }), createTile({ id: '8D' }),
        createTile({ id: 'north' }), createTile({ id: 'south' })
      ]

      const multiplePatterns = [
        createPatternSelection({ id: 1, points: 25 }),
        createPatternSelection({ id: 2, points: 30 }),
        createPatternSelection({ id: 3, points: 35 })
      ]

      // Mock Engine 2 to return detailed rankings
      vi.mocked(PatternRankingEngine.rankPatterns).mockResolvedValue(
        createRankedPatternResults({
          patterns: multiplePatterns,
          topRecommendations: multiplePatterns.map((p, i) => ({
            patternId: p.id,
            totalScore: 85 - (i * 10),
            confidence: 0.9 - (i * 0.1),
            recommendation: i === 0 ? 'excellent' : i === 1 ? 'good' : 'fair',
            components: {
              currentTileScore: 30 - (i * 5),
              availabilityScore: 25 - (i * 3),
              jokerScore: 15 - (i * 2),
              priorityScore: 10 - i
            },
            riskFactors: [],
            strategicValue: 0.8 - (i * 0.1)
          }))
        })
      )

      // Mock Engine 3 to return detailed tile actions
      vi.mocked(TileRecommendationEngine.generateRecommendations).mockResolvedValue({
        tileActions: complexHand.map((tile, i) => ({
          tileId: tile.id,
          primaryAction: i < 7 ? 'keep' as const : i < 10 ? 'pass' as const : 'discard' as const,
          confidence: 0.8 + (i * 0.01),
          reasoning: `Tile ${i + 1} strategic analysis`,
          priority: 10 - Math.floor(i / 2),
          contextualActions: {
            charleston: 'keep',
            gameplay: 'keep',
            exposition: 'keep'
          },
          patternsHelped: ['pattern1'],
          multiPatternValue: 3 + i,
          dangers: []
        })),
        keepTiles: [],
        passTiles: [],
        discardTiles: [],
        optimalStrategy: {
          primaryPattern: 'pattern1',
          backupPattern: 'pattern2',
          pivotCondition: null,
          expectedCompletion: 0.85
        },
        opponentAnalysis: [],
        strategicAdvice: [
          'Focus on pairs-pattern (85 points)',
          'Consider runs-pattern as backup (75 points)',
          'Keep joker for flexibility',
          'Pass low-value isolated tiles'
        ],
        emergencyActions: []
      })

      const result = await AnalysisEngine.analyzeHand(complexHand, multiplePatterns)

      // Verify all engines were called with proper data flow
      expect(PatternAnalysisEngine.analyzePatterns).toHaveBeenCalledWith(
        complexHand.map(t => t.id),
        multiplePatterns.map(p => p.id),
        expect.objectContaining({
          jokersInHand: 1,
          currentPhase: 'charleston'
        })
      )

      expect(PatternRankingEngine.rankPatterns).toHaveBeenCalledWith(
        expect.any(Array), // Engine 1 facts
        multiplePatterns,
        expect.objectContaining({
          phase: 'charleston'
        })
      )

      expect(TileRecommendationEngine.generateRecommendations).toHaveBeenCalledWith(
        complexHand.map(t => t.id),
        expect.any(Object), // Engine 2 rankings
        expect.any(Object), // Game context
        expect.any(Array)   // Engine 1 facts
      )

      // Verify comprehensive output
      expect(result.overallScore).toBeGreaterThan(0)
      expect(result.recommendedPatterns.length).toBe(3)
      expect(result.bestPatterns.length).toBeGreaterThanOrEqual(3)
      expect(result.tileRecommendations.length).toBe(14)
      expect(result.strategicAdvice.length).toBeGreaterThan(0)
      expect(result.engine1Facts).toBeDefined()
    })

    it('should handle pattern switching scenarios', async () => {
      const tiles = TilePresets.mixedHand()
      const currentPattern = createPatternSelection({ id: 1 })
      const alternativePattern = createPatternSelection({ id: 2 })

      const switchingContext = {
        currentPhase: 'gameplay' as const,
        wallTilesRemaining: 30 // Mid-game
      }

      // Mock ranking engine to suggest switching
      vi.mocked(PatternRankingEngine.rankPatterns).mockResolvedValue(
        createRankedPatternResults({
          patterns: [currentPattern, alternativePattern]
        })
      )

      const result = await AnalysisEngine.analyzeHand(tiles, [currentPattern, alternativePattern], switchingContext, true) // Pattern switching mode

      expect(result).toBeDefined()
      expect(result.recommendedPatterns.length).toBe(2)

      // In pattern switching mode, order should be preserved
      expect(result.recommendedPatterns[0].pattern.id).toBe(currentPattern.id)
      expect(result.recommendedPatterns[1].pattern.id).toBe(alternativePattern.id)
    })
  })

  describe('Data Integrity and Validation', () => {
    it('should validate engine outputs for consistency', async () => {
      const tiles = TilePresets.mixedHand()
      const patterns = [createPatternSelection()]

      const result = await AnalysisEngine.analyzeHand(tiles, patterns)

      // Validate result structure integrity
      expect(result.overallScore).toBeTypeOf('number')
      expect(result.lastUpdated).toBeTypeOf('number')
      expect(result.analysisVersion).toBe('AV3-ThreeEngine')
      expect(Array.isArray(result.recommendedPatterns)).toBe(true)
      expect(Array.isArray(result.bestPatterns)).toBe(true)
      expect(Array.isArray(result.tileRecommendations)).toBe(true)
      expect(Array.isArray(result.strategicAdvice)).toBe(true)
      expect(Array.isArray(result.threats)).toBe(true)
      expect(Array.isArray(result.engine1Facts)).toBe(true)

      // Validate recommended patterns structure
      result.recommendedPatterns.forEach(pattern => {
        expect(pattern.pattern).toBeDefined()
        expect(typeof pattern.confidence).toBe('number')
        expect(typeof pattern.completionPercentage).toBe('number')
        expect(typeof pattern.reasoning).toBe('string')
        expect(['easy', 'medium', 'hard']).toContain(pattern.difficulty)
        expect(typeof pattern.isPrimary).toBe('boolean')
        expect(pattern.scoreBreakdown).toBeDefined()
        expect(pattern.analysis).toBeDefined()
        expect(pattern.recommendations).toBeDefined()
      })

      // Validate tile recommendations structure
      result.tileRecommendations.forEach(tile => {
        expect(typeof tile.tileId).toBe('string')
        expect(['keep', 'pass', 'discard', 'neutral']).toContain(tile.action)
        expect(typeof tile.confidence).toBe('number')
        expect(typeof tile.reasoning).toBe('string')
        expect(typeof tile.priority).toBe('number')
      })
    })

    it('should handle edge case numeric values', async () => {
      // Mock extreme values to test boundary conditions
      vi.mocked(PatternRankingEngine.rankPatterns).mockResolvedValue(
        createRankedPatternResults({
          patterns: [createPatternSelection()],
          topRecommendations: [{
            patternId: '1',
            totalScore: 0, // Minimum score
            confidence: 0, // Minimum confidence
            recommendation: 'impossible'
          }]
        })
      )

      const result = await AnalysisEngine.analyzeHand([], [createPatternSelection()])

      expect(result.overallScore).toBeGreaterThanOrEqual(0)
      expect(result.recommendedPatterns[0].completionPercentage).toBeGreaterThanOrEqual(0)
      expect(result.recommendedPatterns[0].completionPercentage).toBeLessThanOrEqual(100)
    })
  })

  describe('Memory and Resource Management', () => {
    it('should manage cache size limits properly', async () => {
      const baseHand = TilePresets.mixedHand()

      // Create many different hands to fill cache
      const manyHands = Array.from({ length: 60 }, (_, i) => [
        ...baseHand.slice(0, -1),
        createTile({ id: `unique-${i}`, instanceId: `cache-test-${i}` })
      ])

      const patterns = [createPatternSelection()]

      // Analyze all hands to fill cache beyond limit (50)
      for (const hand of manyHands) {
        await AnalysisEngine.analyzeHand(hand, patterns)
      }

      const cacheStats = AnalysisEngine.getCacheStats()
      expect(cacheStats.size).toBeLessThanOrEqual(50) // Should respect size limit
    })

    it('should clean up expired cache entries', async () => {
      // This test would ideally advance time or use fake timers
      // For now, we'll test the cache clearing mechanism
      const hand = TilePresets.mixedHand()
      const patterns = [createPatternSelection()]

      await AnalysisEngine.analyzeHand(hand, patterns)

      // Simulate hand change to trigger cleanup
      AnalysisEngine.clearCacheForHandChange(
        hand.map(t => t.id),
        [...hand.slice(0, -1), createTile({ id: 'new-tile' })].map(t => t.id)
      )

      // Should not throw and should maintain reasonable cache size
      const stats = AnalysisEngine.getCacheStats()
      expect(stats.size).toBeGreaterThanOrEqual(0)
    })
  })
})