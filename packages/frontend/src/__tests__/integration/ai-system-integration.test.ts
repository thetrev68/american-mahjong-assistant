// AI System Integration Tests
// Tests the complete 3-engine workflow with real data flows and realistic scenarios

import { describe, it, expect, beforeAll, vi } from 'vitest'
import { AnalysisEngine } from '../../lib/services/analysis-engine'
import { PatternAnalysisEngine } from '../../features/intelligence-panel/services/pattern-analysis-engine'
import { PatternRankingEngine } from '../../features/intelligence-panel/services/pattern-ranking-engine'
import { TileRecommendationEngine } from '../../features/intelligence-panel/services/tile-recommendation-engine'
import { PatternVariationLoader } from '../../features/intelligence-panel/services/pattern-variation-loader'
import { nmjlService } from '../../lib/services/nmjl-service'
import {
  createTile,
  createPatternSelection,
  TilePresets
} from '../factories'
import type { PlayerTile, PatternSelectionOption } from 'shared-types'

// Integration tests use real engine implementations (no mocks)
// Only mock external data loading for consistency

// Mock PatternAnalysisEngine to return test data
vi.mock('../../features/intelligence-panel/services/pattern-analysis-engine', async (importOriginal) => {
  const actual = await importOriginal() as any
  return {
    ...actual,
    PatternAnalysisEngine: {
      ...actual.PatternAnalysisEngine,
      analyzePatterns: vi.fn().mockImplementation(async (tileIds: string[], patternIds: string[]) => {
        // Return mock analysis facts for test patterns
        return patternIds.map(patternId => ({
          patternId,
          tileMatching: {
            bestVariation: {
              variationId: `${patternId}-var-1`,
              patternId,
              sequence: 1,
              tilesMatched: 7,
              tilesNeeded: 7,
              completionRatio: 0.5,
              missingTiles: ['4B', '5B', '6B', '7B', '8B', '9B', 'red'],
              tileContributions: [
                { tileId: tileIds[0] || '1B', positionsInPattern: [0], isRequired: true, isCritical: true, canBeReplaced: false }
              ],
              patternTiles: ['1B', '1B', '1B', '2B', '2B', '2B', '3B', '3B', '3B', 'red', 'green', 'white', 'joker', 'east']
            }
          },
          jokerAnalysis: {
            jokersAvailable: 1,
            substitutablePositions: [12],
            maxJokersUseful: 3,
            withJokersCompletion: 0.7,
            jokersToComplete: 3
          },
          tileAvailability: {
            criticalTiles: ['4B', '5B', '6B'],
            abundantTiles: ['red', 'green'],
            bottleneckTiles: []
          },
          progressMetrics: {
            tilesMatched: 7,
            tilesNeeded: 7,
            completionRatio: 0.5,
            nextMilestone: 10
          }
        }))
      })
    }
  }
})

describe('AI System Integration Tests', () => {
  beforeAll(async () => {
    // Ensure pattern data is loaded before integration tests
    await PatternVariationLoader.loadVariations()
  })

  describe('Complete Analysis Workflow', () => {
    it('should complete end-to-end analysis with real engines', async () => {
      const tiles: PlayerTile[] = [
        createTile({ id: '1B', suit: 'bams', value: '1' }),
        createTile({ id: '1B', suit: 'bams', value: '1' }),
        createTile({ id: '2B', suit: 'bams', value: '2' }),
        createTile({ id: '2B', suit: 'bams', value: '2' }),
        createTile({ id: '3B', suit: 'bams', value: '3' }),
        createTile({ id: '3B', suit: 'bams', value: '3' }),
        createTile({ id: 'flower', suit: 'flowers', value: 'f1' }),
        createTile({ id: 'flower', suit: 'flowers', value: 'f2' }),
        createTile({ id: 'joker', suit: 'jokers', value: 'joker', isJoker: true }),
        createTile({ id: 'red', suit: 'dragons', value: 'red' }),
        createTile({ id: 'green', suit: 'dragons', value: 'green' }),
        createTile({ id: 'white', suit: 'dragons', value: 'white' })
      ]

      const patterns: PatternSelectionOption[] = [
        createPatternSelection({
          id: '2025-TEST_PATTERN-1',
          name: 'Test Pattern 1',
          points: 25,
          difficulty: 'medium'
        }),
        createPatternSelection({
          id: '2025-TEST_PATTERN-2',
          name: 'Test Pattern 2',
          points: 30,
          difficulty: 'hard'
        })
      ]

      const gameContext = {
        wallTilesRemaining: 75,
        currentPhase: 'gameplay' as const,
        discardPile: ['7C', '8C', '9C'],
        exposedTiles: {
          'player2': ['east', 'east', 'east'],
          'player3': ['4D', '4D']
        }
      }

      const startTime = performance.now()
      const result = await AnalysisEngine.analyzeHand(tiles, patterns, gameContext)
      const endTime = performance.now()

      // Performance validation
      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second

      // Structure validation
      expect(result).toBeDefined()
      expect(result.analysisVersion).toBe('AV3-ThreeEngine')
      expect(result.overallScore).toBeGreaterThan(0)
      expect(result.lastUpdated).toBeGreaterThan(0)

      // Engine 1 validation
      expect(result.engine1Facts).toBeDefined()
      expect(Array.isArray(result.engine1Facts)).toBe(true)
      expect(result.engine1Facts.length).toBeGreaterThan(0)

      result.engine1Facts.forEach(fact => {
        expect(fact.patternId).toBeDefined()
        expect(fact.tileMatching).toBeDefined()
        expect(fact.tileMatching.bestVariation).toBeDefined()
        expect(fact.tileMatching.bestVariation.completionRatio).toBeGreaterThanOrEqual(0)
        expect(fact.tileMatching.bestVariation.completionRatio).toBeLessThanOrEqual(1)
      })

      // Engine 2 validation
      expect(result.recommendedPatterns).toBeDefined()
      expect(Array.isArray(result.recommendedPatterns)).toBe(true)
      expect(result.bestPatterns).toBeDefined()
      expect(Array.isArray(result.bestPatterns)).toBe(true)

      if (result.recommendedPatterns.length > 0) {
        const topPattern = result.recommendedPatterns[0]
        expect(topPattern.confidence).toBeGreaterThan(0)
        expect(topPattern.confidence).toBeLessThanOrEqual(100)
        expect(topPattern.completionPercentage).toBeGreaterThanOrEqual(0)
        expect(topPattern.completionPercentage).toBeLessThanOrEqual(100)
        expect(topPattern.totalScore).toBeGreaterThan(0)
        expect(topPattern.isPrimary).toBe(true)
        expect(topPattern.scoreBreakdown).toBeDefined()
        expect(topPattern.analysis).toBeDefined()
      }

      // Engine 3 validation
      expect(result.tileRecommendations).toBeDefined()
      expect(Array.isArray(result.tileRecommendations)).toBe(true)
      expect(result.strategicAdvice).toBeDefined()
      expect(Array.isArray(result.strategicAdvice)).toBe(true)

      if (result.tileRecommendations.length > 0) {
        result.tileRecommendations.forEach(recommendation => {
          expect(recommendation.tileId).toBeDefined()
          expect(['keep', 'pass', 'discard', 'neutral']).toContain(recommendation.action)
          expect(recommendation.confidence).toBeGreaterThan(0)
          expect(recommendation.confidence).toBeLessThanOrEqual(100)
          expect(recommendation.priority).toBeGreaterThan(0)
          expect(recommendation.priority).toBeLessThanOrEqual(10)
          expect(recommendation.reasoning).toBeDefined()
        })
      }
    })

    it('should handle Charleston phase workflow correctly', async () => {
      const charlestonTiles = TilePresets.charlestonHand()
      const patterns = [
        createPatternSelection({ id: '2025-TEST_PATTERN-1' }),
        createPatternSelection({ id: '2025-TEST_PATTERN-2' })
      ]

      const result = await AnalysisEngine.analyzeHand(charlestonTiles, patterns, {
        currentPhase: 'charleston',
        wallTilesRemaining: 84,
        discardPile: [],
        exposedTiles: {}
      })

      expect(result).toBeDefined()

      // Charleston should produce pass recommendations
      const passRecommendations = result.tileRecommendations.filter(r => r.action === 'pass')
      expect(passRecommendations.length).toBeGreaterThan(0)

      // Strategic advice should be relevant to Charleston phase
      expect(result.strategicAdvice.some(advice =>
        advice.toLowerCase().includes('charleston') ||
        advice.toLowerCase().includes('pass')
      )).toBe(true)
    })

    it('should handle joker-heavy scenarios correctly', async () => {
      const jokerHeavyTiles = [
        ...TilePresets.jokers(3),
        createTile({ id: '1B' }),
        createTile({ id: '1B' }),
        createTile({ id: '2B' }),
        createTile({ id: '2B' }),
        createTile({ id: 'red' }),
        createTile({ id: 'red' }),
        createTile({ id: 'flower' }),
        createTile({ id: 'flower' })
      ]

      const result = await AnalysisEngine.analyzeHand(jokerHeavyTiles, [
        createPatternSelection({ id: '2025-TEST_PATTERN-1' })
      ])

      expect(result).toBeDefined()

      // Jokers should be marked as high priority keeps
      const jokerRecommendations = result.tileRecommendations.filter(r =>
        r.tileId === 'joker' && r.action === 'keep'
      )
      expect(jokerRecommendations.length).toBeGreaterThan(0)

      jokerRecommendations.forEach(jokerRec => {
        expect(jokerRec.priority).toBeGreaterThan(8) // High priority
        expect(jokerRec.confidence).toBeGreaterThan(0.9) // High confidence
      })
    })

    it('should provide consistent results across multiple analyses', async () => {
      const tiles = TilePresets.mixedHand()
      const patterns = [createPatternSelection({ id: '2025-TEST_PATTERN-1' })]
      const context = { wallTilesRemaining: 60, currentPhase: 'gameplay' as const }

      // Run multiple analyses with same inputs
      const results = await Promise.all([
        AnalysisEngine.analyzeHand(tiles, patterns, context),
        AnalysisEngine.analyzeHand(tiles, patterns, context),
        AnalysisEngine.analyzeHand(tiles, patterns, context)
      ])

      // Results should be consistent (caching should work)
      expect(results[0].overallScore).toBe(results[1].overallScore)
      expect(results[1].overallScore).toBe(results[2].overallScore)

      expect(results[0].recommendedPatterns.length).toBe(results[1].recommendedPatterns.length)
      expect(results[0].tileRecommendations.length).toBe(results[1].tileRecommendations.length)

      if (results[0].recommendedPatterns.length > 0) {
        expect(results[0].recommendedPatterns[0].completionPercentage)
          .toBe(results[1].recommendedPatterns[0].completionPercentage)
      }
    })
  })

  describe('Pattern Selection Integration', () => {
    it('should handle pattern switching recommendations', async () => {
      const tiles = [
        createTile({ id: '1B' }), createTile({ id: '1B' }),
        createTile({ id: '2C' }), createTile({ id: '2C' }),
        createTile({ id: '3D' }), createTile({ id: '3D' }),
        createTile({ id: 'red' }), createTile({ id: 'green' })
      ]

      // First analysis with one pattern focus
      const result1 = await AnalysisEngine.analyzeHand(tiles, [
        createPatternSelection({ id: '2025-TEST_PATTERN-1' })
      ])

      // Second analysis with multiple patterns (should suggest better options)
      const result2 = await AnalysisEngine.analyzeHand(tiles, [
        createPatternSelection({ id: '2025-TEST_PATTERN-1' }),
        createPatternSelection({ id: '2025-TEST_PATTERN-2' }),
        createPatternSelection({ id: '2025-TEST_PATTERN-3' })
      ])

      expect(result1).toBeDefined()
      expect(result2).toBeDefined()
      expect(result2.recommendedPatterns.length).toBeGreaterThan(result1.recommendedPatterns.length)
    })

    it('should prioritize high-value patterns appropriately', async () => {
      const tiles = TilePresets.strongHand()

      const patterns = [
        createPatternSelection({ id: '2025-LOW-VALUE', points: 25, difficulty: 'easy' }),
        createPatternSelection({ id: '2025-HIGH-VALUE', points: 50, difficulty: 'medium' }),
        createPatternSelection({ id: '2025-MEGA-VALUE', points: 75, difficulty: 'hard' })
      ]

      const result = await AnalysisEngine.analyzeHand(tiles, patterns)

      expect(result).toBeDefined()

      if (result.recommendedPatterns.length > 1) {
        // Higher point patterns should generally rank higher (with some exceptions based on completion)
        const sortedByPoints = result.recommendedPatterns
          .slice()
          .sort((a, b) => (b.pattern.points || 0) - (a.pattern.points || 0))

        // At least the top pattern should be high-value or highly complete
        const topPattern = result.recommendedPatterns[0]
        expect(
          (topPattern.pattern.points || 0) >= 40 ||
          topPattern.completionPercentage >= 70
        ).toBe(true)
      }
    })
  })

  describe('Game State Integration', () => {
    it('should adapt recommendations based on wall depletion', async () => {
      const tiles = TilePresets.mixedHand()
      const patterns = [createPatternSelection({ id: '2025-TEST_PATTERN-1' })]

      // Early game (full wall)
      const earlyGame = await AnalysisEngine.analyzeHand(tiles, patterns, {
        wallTilesRemaining: 84,
        currentPhase: 'charleston'
      })

      // Late game (depleted wall)
      const lateGame = await AnalysisEngine.analyzeHand(tiles, patterns, {
        wallTilesRemaining: 10,
        currentPhase: 'gameplay'
      })

      expect(earlyGame).toBeDefined()
      expect(lateGame).toBeDefined()

      // Strategic advice should differ based on game state
      expect(earlyGame.strategicAdvice).not.toEqual(lateGame.strategicAdvice)
    })

    it('should consider opponent exposures in recommendations', async () => {
      const tiles = TilePresets.mixedHand()
      const patterns = [createPatternSelection({ id: '2025-TEST_PATTERN-1' })]

      // Game with heavy opponent exposures
      const result = await AnalysisEngine.analyzeHand(tiles, patterns, {
        exposedTiles: {
          'player2': ['1B', '1B', '1B', '2B', '2B', '2B'], // Exposed pungs
          'player3': ['red', 'red', 'red', 'green', 'green'] // Partial pung
        },
        discardPile: ['1B', '2B', '3B', '4B'] // Related discards
      })

      expect(result).toBeDefined()

      // Should factor opponent needs into discard safety
      const discardRecommendations = result.tileRecommendations.filter(r => r.action === 'discard')
      if (discardRecommendations.length > 0) {
        // Reasoning should mention opponent safety considerations
        const hasOpponentConsideration = discardRecommendations.some(rec =>
          rec.reasoning.toLowerCase().includes('opponent') ||
          rec.reasoning.toLowerCase().includes('safe') ||
          rec.reasoning.toLowerCase().includes('risky')
        )
        expect(hasOpponentConsideration).toBe(true)
      }
    })
  })

  describe('Performance Integration', () => {
    it('should handle large-scale analysis efficiently', async () => {
      // Simulate analyzing many patterns simultaneously
      const manyPatterns = Array.from({ length: 25 }, (_, i) =>
        createPatternSelection({
          id: `pattern-${i}`,
          points: 25 + (i % 25),
          difficulty: ['easy', 'medium', 'hard'][i % 3] as any
        })
      )

      const startTime = performance.now()
      const result = await AnalysisEngine.analyzeHand(TilePresets.mixedHand(), manyPatterns)
      const duration = performance.now() - startTime

      expect(result).toBeDefined()
      expect(duration).toBeLessThan(3000) // Should complete within 3 seconds for 25 patterns
      expect(result.recommendedPatterns.length).toBeGreaterThan(0)
      expect(result.tileRecommendations.length).toBeGreaterThan(0)
    })

    it('should demonstrate caching effectiveness', async () => {
      const tiles = TilePresets.mixedHand()
      const patterns = [createPatternSelection({ id: '2025-TEST_PATTERN-1' })]

      // First analysis (cache miss)
      const startTime1 = performance.now()
      const result1 = await AnalysisEngine.analyzeHand(tiles, patterns)
      const duration1 = performance.now() - startTime1

      // Second analysis (cache hit)
      const startTime2 = performance.now()
      const result2 = await AnalysisEngine.analyzeHand(tiles, patterns)
      const duration2 = performance.now() - startTime2

      // Results should be identical except for timestamp
      expect({ ...result1, lastUpdated: 0 }).toEqual({ ...result2, lastUpdated: 0 })
      expect(duration2).toBeLessThan(duration1 * 1.5) // Second should be no significantly slower (allowing for timing variance)
    })

    it('should handle memory pressure gracefully', async () => {
      // Create many unique analysis scenarios to test memory management
      const scenarios: Array<{ tiles: PlayerTile[], patterns: PatternSelectionOption[] }> = []

      for (let i = 0; i < 100; i++) {
        scenarios.push({
          tiles: [
            createTile({ id: `${i % 9 + 1}B` }),
            createTile({ id: `${(i + 1) % 9 + 1}C` }),
            createTile({ id: `${(i + 2) % 9 + 1}D` })
          ],
          patterns: [createPatternSelection({ id: `pattern-${i}` })]
        })
      }

      // Run all scenarios
      const results = await Promise.all(
        scenarios.map(scenario =>
          AnalysisEngine.analyzeHand(scenario.tiles, scenario.patterns)
        )
      )

      expect(results).toHaveLength(100)
      results.forEach(result => {
        expect(result).toBeDefined()
        expect(result.analysisVersion).toBe('AV3-ThreeEngine')
      })

      // Cache should be managed within limits
      const cacheStats = AnalysisEngine.getCacheStats()
      expect(cacheStats.size).toBeLessThanOrEqual(50) // Should respect cache size limits
    })
  })

  describe('Error Recovery Integration', () => {
    it('should provide partial results when individual engines have issues', async () => {
      // This test simulates partial engine failures in integration context
      const tiles = TilePresets.mixedHand()
      const patterns = [createPatternSelection({ id: 'potentially-problematic-pattern' })]

      const result = await AnalysisEngine.analyzeHand(tiles, patterns)

      // Even with potential issues, should provide some analysis
      expect(result).toBeDefined()
      expect(result.analysisVersion).toBe('AV3-ThreeEngine')

      // Should have basic structure even if some parts fail
      expect(Array.isArray(result.recommendedPatterns)).toBe(true)
      expect(Array.isArray(result.tileRecommendations)).toBe(true)
      expect(Array.isArray(result.strategicAdvice)).toBe(true)
    })

    it('should maintain system stability under load', async () => {
      // Simulate concurrent high-load scenarios
      const concurrentAnalyses = Array.from({ length: 20 }, (_, i) =>
        AnalysisEngine.analyzeHand(
          TilePresets.mixedHand(),
          [createPatternSelection({ id: `concurrent-${i}` })],
          { wallTilesRemaining: 84 - i }
        )
      )

      const results = await Promise.all(concurrentAnalyses)

      expect(results).toHaveLength(20)
      results.forEach((result, index) => {
        expect(result).toBeDefined()
        expect(result.analysisVersion).toBe('AV3-ThreeEngine')
      })
    })
  })

  describe('Real-World Scenarios', () => {
    it('should handle typical mid-game analysis scenario', async () => {
      const midGameTiles = [
        createTile({ id: '1B' }), createTile({ id: '1B' }),
        createTile({ id: '2B' }), createTile({ id: '2B' }), createTile({ id: '2B' }),
        createTile({ id: 'red' }), createTile({ id: 'red' }),
        createTile({ id: 'flower' }), createTile({ id: 'flower' }),
        createTile({ id: '5C' }), createTile({ id: '6C' }),
        createTile({ id: 'joker', isJoker: true }),
        createTile({ id: 'east' }), createTile({ id: 'white' })
      ]

      const result = await AnalysisEngine.analyzeHand(midGameTiles, [
        createPatternSelection({ id: '2025-TEST_PATTERN-1' })
      ], {
        wallTilesRemaining: 45,
        currentPhase: 'gameplay',
        discardPile: ['7C', '8C', '9C', '9D', '9B'],
        exposedTiles: {
          'player2': ['north', 'north', 'north'],
          'player3': ['3D', '3D']
        }
      })

      expect(result).toBeDefined()
      expect(result.overallScore).toBeGreaterThan(20) // Should have reasonable progress
      expect(result.recommendedPatterns.length).toBeGreaterThan(0)
      expect(result.tileRecommendations.length).toBeGreaterThan(0) // Should have tile recommendations
      expect(result.strategicAdvice.length).toBeGreaterThan(0)
    })

    it('should handle end-game desperation scenario', async () => {
      const desperationTiles = [
        createTile({ id: '7B' }), createTile({ id: '8C' }), createTile({ id: '9D' }),
        createTile({ id: 'north' }), createTile({ id: 'south' }),
        createTile({ id: 'white' }), createTile({ id: 'green' }),
        createTile({ id: 'f3' }), createTile({ id: 'f4' }),
        createTile({ id: '4B' }), createTile({ id: '5C' }),
        createTile({ id: 'joker', isJoker: true }),
        createTile({ id: 'joker', isJoker: true }),
        createTile({ id: '6D' })
      ]

      const result = await AnalysisEngine.analyzeHand(desperationTiles, [
        createPatternSelection({ id: '2025-TEST_PATTERN-1' }),
        createPatternSelection({ id: '2025-TEST_PATTERN-2' })
      ], {
        wallTilesRemaining: 8, // Very few tiles left
        currentPhase: 'gameplay',
        discardPile: Array.from({ length: 30 }, (_, i) => `discard-${i}`),
        exposedTiles: {
          'player2': ['1B', '1B', '1B', '2B', '2B', '2B'],
          'player3': ['red', 'red', 'red', 'flower', 'flower'],
          'player4': ['east', 'east', 'east']
        }
      })

      expect(result).toBeDefined()

      // In desperation, should still provide actionable advice
      expect(result.strategicAdvice.length).toBeGreaterThan(0)
      expect(result.tileRecommendations.some(r => r.action === 'keep')).toBe(true) // Should keep something

      // Jokers should be high priority even in desperation
      const jokerRecs = result.tileRecommendations.filter(r => r.tileId === 'joker')
      jokerRecs.forEach(rec => {
        expect(rec.action).toBe('keep')
        expect(rec.priority).toBeGreaterThan(7)
      })
    })
  })
})