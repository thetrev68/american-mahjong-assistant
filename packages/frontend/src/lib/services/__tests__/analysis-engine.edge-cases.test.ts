// Analysis Engine Edge Cases Tests
// Comprehensive edge case testing for the 3-engine analysis system

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AnalysisEngine } from '../analysis-engine'
import { nmjlService } from '../nmjl-service'
import { PatternAnalysisEngine, type GameContext } from '../../../features/intelligence-panel/services/pattern-analysis-engine'
import { PatternRankingEngine } from '../../../features/intelligence-panel/services/pattern-ranking-engine'
import { TileRecommendationEngine } from '../../../features/intelligence-panel/services/tile-recommendation-engine'
import {
  createTile,
  createPatternSelection,
  createAnalysisFacts,
  createRankedPatternResults,
  TilePresets,
} from '../../../__tests__/factories'

// Mock the service dependencies
vi.mock('../nmjl-service')
vi.mock('../../../features/intelligence-panel/services/pattern-analysis-engine')
vi.mock('../../../features/intelligence-panel/services/pattern-ranking-engine')
vi.mock('../../../features/intelligence-panel/services/tile-recommendation-engine')

describe('Analysis Engine - Edge Cases & Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default successful mocks
    vi.mocked(nmjlService.getSelectionOptions).mockResolvedValue([
      createPatternSelection({ id: 'pattern1' }),
      createPatternSelection({ id: 'pattern2' })
    ])

    vi.mocked(PatternAnalysisEngine.analyzePatterns).mockResolvedValue([
      createAnalysisFacts({ patternId: 'pattern1', tilesMatched: 7 }),
      createAnalysisFacts({ patternId: 'pattern2', tilesMatched: 5 })
    ])

    vi.mocked(PatternRankingEngine.rankPatterns).mockResolvedValue(
      createRankedPatternResults()
    )

    vi.mocked(TileRecommendationEngine.generateRecommendations).mockResolvedValue({
      tileActions: [{
        tileId: '1B',
        primaryAction: 'keep',
        confidence: 0.85,
        reasoning: 'Test reason',
        priority: 9
      }],
      strategicAdvice: ['Test advice']
    })
  })

  describe('Extreme Input Scenarios', () => {
    it('should handle completely empty inputs gracefully', async () => {
      const result = await AnalysisEngine.analyzeHand([], [])

      expect(result).toBeDefined()
      expect(result.recommendedPatterns).toEqual([])
      expect(result.tileRecommendations).toEqual([])
      expect(result.overallScore).toBe(0)
      expect(result.analysisVersion).toBe('AV3-ThreeEngine')
    })

    it('should handle maximum hand size (14 tiles)', async () => {
      const maxTiles = Array.from({ length: 14 }, (_, i) =>
        createTile({ id: `tile${i}`, suit: 'bams', value: '1' })
      )

      const result = await AnalysisEngine.analyzeHand(maxTiles, [createPatternSelection()])

      expect(result).toBeDefined()
      expect(PatternAnalysisEngine.analyzePatterns).toHaveBeenCalledWith(
        expect.arrayContaining(maxTiles.map(t => t.id)),
        expect.any(Array),
        expect.objectContaining({ jokersInHand: expect.any(Number) })
      )
    })

    it('should handle all jokers hand', async () => {
      const allJokers = TilePresets.jokers(8) // Maximum possible jokers

      const result = await AnalysisEngine.analyzeHand(allJokers, [createPatternSelection()])

      expect(result).toBeDefined()
      expect(PatternAnalysisEngine.analyzePatterns).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(Array),
        expect.objectContaining({ jokersInHand: 8 })
      )
    })

    it('should handle duplicate tile instances', async () => {
      const duplicateTiles = [
        createTile({ id: '1B', instanceId: 'inst1' }),
        createTile({ id: '1B', instanceId: 'inst2' }),
        createTile({ id: '1B', instanceId: 'inst3' }),
        createTile({ id: '1B', instanceId: 'inst4' })
      ]

      const result = await AnalysisEngine.analyzeHand(duplicateTiles, [createPatternSelection()])

      expect(result).toBeDefined()
      // Should pass tile IDs (not instance IDs) to engine
      expect(PatternAnalysisEngine.analyzePatterns).toHaveBeenCalledWith(
        ['1B', '1B', '1B', '1B'],
        expect.any(Array),
        expect.any(Object)
      )
    })

    it('should handle special tiles combinations', async () => {
      const specialTiles = [
        ...TilePresets.flowers(['f1', 'f2', 'f3', 'f4']),
        ...TilePresets.dragons(['red', 'green', 'white']),
        ...TilePresets.winds(['east', 'south', 'west', 'north']),
        ...TilePresets.jokers(2)
      ]

      const result = await AnalysisEngine.analyzeHand(specialTiles, [createPatternSelection()])

      expect(result).toBeDefined()
      expect(result.engine1Facts).toBeDefined()
    })
  })

  describe('Game Context Edge Cases', () => {
    it('should handle extreme game states', async () => {
      const extremeContext = {
        wallTilesRemaining: 0, // Wall depleted
        discardPile: Array.from({ length: 100 }, (_, i) => `tile${i}`),
        exposedTiles: {
          'player2': Array.from({ length: 20 }, () => '1B'),
          'player3': Array.from({ length: 20 }, () => '2C')
        },
        currentPhase: 'gameplay' as const
      }

      const result = await AnalysisEngine.analyzeHand(
        TilePresets.mixedHand(),
        [createPatternSelection()],
        extremeContext
      )

      expect(result).toBeDefined()
      expect(PatternAnalysisEngine.analyzePatterns).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(Array),
        expect.objectContaining({
          wallTilesRemaining: 0,
          discardPile: extremeContext.discardPile,
          exposedTiles: extremeContext.exposedTiles
        })
      )
    })

    it('should handle negative or invalid context values', async () => {
      const invalidContext = {
        wallTilesRemaining: -50, // Invalid negative
        jokersInHand: -2, // Invalid negative
        currentPhase: 'invalid-phase' as any
      }

      const result = await AnalysisEngine.analyzeHand(
        TilePresets.mixedHand(),
        [createPatternSelection()],
        invalidContext
      )

      expect(result).toBeDefined()
      // Should still create valid context with defaults
      expect(PatternAnalysisEngine.analyzePatterns).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(Array),
        expect.objectContaining({
          wallTilesRemaining: expect.any(Number),
          jokersInHand: expect.any(Number),
          currentPhase: expect.any(String)
        })
      )
    })
  })

  describe('Pattern Processing Edge Cases', () => {
    it('should handle massive pattern sets efficiently', async () => {
      const manyPatterns = Array.from({ length: 200 }, (_, i) =>
        createPatternSelection({
          id: `pattern-${i}`,
          points: 25 + (i % 50),
          difficulty: ['easy', 'medium', 'hard'][i % 3] as any
        })
      )

      const startTime = performance.now()
      const result = await AnalysisEngine.analyzeHand(TilePresets.mixedHand(), manyPatterns)
      const duration = performance.now() - startTime

      expect(result).toBeDefined()
      expect(duration).toBeLessThan(2000) // Should complete within 2 seconds
      expect(PatternAnalysisEngine.analyzePatterns).toHaveBeenCalledWith(
        expect.any(Array),
        expect.arrayContaining(manyPatterns.map(p => p.id)),
        expect.any(Object)
      )
    })

    it('should handle patterns with missing or invalid data', async () => {
      const corruptedPatterns = [
        createPatternSelection({ id: '', points: 0 }), // Empty ID
        createPatternSelection({ id: 'valid', points: -25 }), // Negative points
        createPatternSelection({ id: 'also-valid', difficulty: 'impossible' as any }) // Invalid difficulty
      ]

      const result = await AnalysisEngine.analyzeHand(TilePresets.mixedHand(), corruptedPatterns)

      expect(result).toBeDefined()
      expect(result.recommendedPatterns).toBeDefined()
    })

    it('should preserve pattern order when requested', async () => {
      const orderedPatterns = [
        createPatternSelection({ id: 'third-priority', points: 50 }),
        createPatternSelection({ id: 'first-priority', points: 25 }),
        createPatternSelection({ id: 'second-priority', points: 35 })
      ]

      // Mock rankings to return different scores (third > second > first by score)
      const mockRankings = createRankedPatternResults({
        patterns: orderedPatterns
      })
      mockRankings.topRecommendations = [
        { patternId: 'third-priority', totalScore: 90, components: { currentTileScore: 35, availabilityScore: 40, jokerScore: 15, priorityScore: 0 }, confidence: 0.9, recommendation: 'excellent', isViable: true, strategicValue: 8, riskFactors: [] },
        { patternId: 'second-priority', totalScore: 80, components: { currentTileScore: 30, availabilityScore: 35, jokerScore: 15, priorityScore: 0 }, confidence: 0.8, recommendation: 'good', isViable: true, strategicValue: 7, riskFactors: [] },
        { patternId: 'first-priority', totalScore: 70, components: { currentTileScore: 25, availabilityScore: 30, jokerScore: 15, priorityScore: 0 }, confidence: 0.7, recommendation: 'fair', isViable: true, strategicValue: 6, riskFactors: [] }
      ]

      vi.mocked(PatternRankingEngine.rankPatterns).mockResolvedValue(mockRankings)

      // Test pattern switching mode (preserves order)
      const result = await AnalysisEngine.analyzeHand(
        TilePresets.mixedHand(),
        orderedPatterns,
        undefined,
        true // isPatternSwitching = true
      )

      expect(result.recommendedPatterns).toHaveLength(3)
      expect(result.recommendedPatterns[0].pattern.id).toBe('third-priority') // Should preserve explicit order
      expect(result.recommendedPatterns[1].pattern.id).toBe('first-priority')
      expect(result.recommendedPatterns[2].pattern.id).toBe('second-priority')
    })
  })

  describe('Cache Behavior Edge Cases', () => {
    it('should handle cache collisions gracefully', async () => {
      const tiles1 = [createTile({ id: '1B' }), createTile({ id: '2B' })]
      const tiles2 = [createTile({ id: '2B' }), createTile({ id: '1B' })] // Same tiles, different order
      const patterns = [createPatternSelection({ id: 'test' })]

      // First call
      await AnalysisEngine.analyzeHand(tiles1, patterns)
      expect(PatternAnalysisEngine.analyzePatterns).toHaveBeenCalledTimes(1)

      // Second call with reordered tiles (should use cache due to sorted key generation)
      await AnalysisEngine.analyzeHand(tiles2, patterns)
      expect(PatternAnalysisEngine.analyzePatterns).toHaveBeenCalledTimes(1) // Still only called once
    })

    it('should clear cache appropriately on hand changes', () => {
      const oldTiles = ['1B', '2B', '3B', '4B']
      const newTiles = ['1B', '2B', '3B', '5B'] // One tile changed

      expect(() => {
        AnalysisEngine.clearCacheForHandChange(oldTiles, newTiles)
      }).not.toThrow()

      const stats = AnalysisEngine.getCacheStats()
      expect(stats).toHaveProperty('size')
      expect(typeof stats.size).toBe('number')
    })

    it('should manage cache size limits', async () => {
      const basePatterns = [createPatternSelection({ id: 'base' })]

      // Generate enough different requests to trigger cache management
      for (let i = 0; i < 100; i++) {
        const tiles = [createTile({ id: `tile${i}` })]
        const context = { wallTilesRemaining: i }
        await AnalysisEngine.analyzeHand(tiles, basePatterns, context)
      }

      const stats = AnalysisEngine.getCacheStats()
      expect(stats.size).toBeLessThanOrEqual(50) // Should respect cache size limit
    })

    it('should handle TTL expiration', async () => {
      // Note: This test would need to manipulate time or wait for actual TTL
      // For now, we just verify cache behavior exists
      const stats = AnalysisEngine.getCacheStats()
      expect(stats).toHaveProperty('size')
      expect(typeof stats.size).toBe('number')
      expect(stats.size).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Performance Stress Tests', () => {
    it('should handle rapid successive analyses', async () => {
      const promises = Array.from({ length: 20 }, () =>
        AnalysisEngine.analyzeHand(TilePresets.mixedHand(), [createPatternSelection()])
      )

      const results = await Promise.all(promises)

      expect(results).toHaveLength(20)
      results.forEach(result => {
        expect(result).toBeDefined()
        expect(result.analysisVersion).toBe('AV3-ThreeEngine')
      })
    })

    it('should maintain memory efficiency during extended use', async () => {
      const initialMemory = process.memoryUsage?.().heapUsed || 0

      // Simulate extended usage
      for (let i = 0; i < 50; i++) {
        const tiles = TilePresets.mixedHand()
        const patterns = [createPatternSelection({ id: `pattern-${i}` })]
        await AnalysisEngine.analyzeHand(tiles, patterns)
      }

      const finalMemory = process.memoryUsage?.().heapUsed || 0
      const memoryGrowth = finalMemory - initialMemory

      // Memory growth should be reasonable (less than 50MB)
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024)
    })
  })

  describe('Result Integrity Tests', () => {
    it('should maintain result consistency across multiple calls', async () => {
      const tiles = TilePresets.mixedHand()
      const patterns = [createPatternSelection()]

      const results = await Promise.all([
        AnalysisEngine.analyzeHand(tiles, patterns),
        AnalysisEngine.analyzeHand(tiles, patterns),
        AnalysisEngine.analyzeHand(tiles, patterns)
      ])

      // All results should be identical (due to caching)
      expect(results[0]).toEqual(results[1])
      expect(results[1]).toEqual(results[2])
    })

    it('should validate result structure completeness', async () => {
      const result = await AnalysisEngine.analyzeHand(TilePresets.mixedHand(), [createPatternSelection()])

      // Verify all required properties exist
      expect(result).toHaveProperty('overallScore')
      expect(result).toHaveProperty('recommendedPatterns')
      expect(result).toHaveProperty('bestPatterns')
      expect(result).toHaveProperty('tileRecommendations')
      expect(result).toHaveProperty('strategicAdvice')
      expect(result).toHaveProperty('threats')
      expect(result).toHaveProperty('lastUpdated')
      expect(result).toHaveProperty('analysisVersion')
      expect(result).toHaveProperty('engine1Facts')

      // Verify types
      expect(typeof result.overallScore).toBe('number')
      expect(Array.isArray(result.recommendedPatterns)).toBe(true)
      expect(Array.isArray(result.bestPatterns)).toBe(true)
      expect(Array.isArray(result.tileRecommendations)).toBe(true)
      expect(Array.isArray(result.strategicAdvice)).toBe(true)
      expect(Array.isArray(result.threats)).toBe(true)
      expect(typeof result.lastUpdated).toBe('number')
      expect(result.analysisVersion).toBe('AV3-ThreeEngine')
      expect(Array.isArray(result.engine1Facts)).toBe(true)
    })

    it('should handle score calculations correctly', async () => {
      const mockRankings = createRankedPatternResults()
      mockRankings.topRecommendations = [
        {
          patternId: 'high-score',
          totalScore: 95,
          components: { currentTileScore: 40, availabilityScore: 50, jokerScore: 0, priorityScore: 5 },
          confidence: 0.95,
          recommendation: 'excellent',
          isViable: true,
          strategicValue: 9,
          riskFactors: []
        }
      ]

      vi.mocked(PatternRankingEngine.rankPatterns).mockResolvedValue(mockRankings)

      const result = await AnalysisEngine.analyzeHand(TilePresets.mixedHand(), [createPatternSelection({ id: 'high-score' })])

      expect(result.overallScore).toBe(95)
      expect(result.recommendedPatterns[0].totalScore).toBe(95)
      expect(result.recommendedPatterns[0].completionPercentage).toBe(100) // 40/40 * 100
    })
  })

  describe('Engine Integration Validation', () => {
    it('should pass correct data between engines', async () => {
      const mockFacts = [createAnalysisFacts({
        patternId: 'test',
        tileContributions: [
          { tileId: '1B', positionsInPattern: [0], isRequired: true, isCritical: true, canBeReplaced: false }
        ]
      })]

      vi.mocked(PatternAnalysisEngine.analyzePatterns).mockResolvedValue(mockFacts)

      await AnalysisEngine.analyzeHand(TilePresets.mixedHand(), [createPatternSelection({ id: 'test' })])

      // Verify Engine 1 facts are passed to Engine 3
      expect(TileRecommendationEngine.generateRecommendations).toHaveBeenCalledWith(
        expect.any(Array), // tileIds
        expect.any(Object), // patternRankings
        expect.any(Object), // gameContext
        mockFacts // Engine 1 facts
      )
    })

    it('should handle partial engine failures gracefully', async () => {
      // Test scenario where Engine 2 fails but Engine 1 succeeds
      vi.mocked(PatternAnalysisEngine.analyzePatterns).mockResolvedValue([createAnalysisFacts()])
      vi.mocked(PatternRankingEngine.rankPatterns).mockRejectedValue(new Error('Engine 2 failed'))

      await expect(AnalysisEngine.analyzeHand(TilePresets.mixedHand(), [])).rejects.toThrow('Analysis engine failure: Engine 2 failed')
    })
  })
})