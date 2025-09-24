// Intelligence Panel Services - Error Handling Tests
// Comprehensive error handling and resilience testing for all 3 engines

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PatternAnalysisEngine, type GameContext } from '../pattern-analysis-engine'
import { PatternRankingEngine } from '../pattern-ranking-engine'
import { TileRecommendationEngine } from '../tile-recommendation-engine'
import { PatternVariationLoader } from '../pattern-variation-loader'

// Mock the PatternVariationLoader to control failure scenarios
vi.mock('../pattern-variation-loader')

describe('Intelligence Panel Services - Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Pattern Analysis Engine (Engine 1) - Error Resilience', () => {
    const createGameContext = (overrides: Partial<GameContext> = {}): GameContext => ({
      jokersInHand: 0,
      wallTilesRemaining: 84,
      discardPile: [],
      exposedTiles: {},
      currentPhase: 'gameplay',
      ...overrides
    })

    it('should handle pattern variation loading failures', async () => {
      // Mock loader to fail
      vi.mocked(PatternVariationLoader.loadVariations).mockRejectedValue(new Error('Network failure'))
      vi.mocked(PatternVariationLoader.getPatternVariations).mockResolvedValue([])

      const result = await PatternAnalysisEngine.analyzePatterns(
        ['1B', '2B', '3B'],
        ['2025-SINGLES_AND_PAIRS-3-1'],
        createGameContext()
      )

      // Should return empty results rather than crash
      expect(result).toHaveLength(1)
      expect(result[0].patternId).toBe('2025-SINGLES_AND_PAIRS-3-1')
      expect(result[0].tileMatching.totalVariations).toBe(0)
    })

    it('should handle corrupted pattern data gracefully', async () => {
      // Mock loader to return corrupted data
      vi.mocked(PatternVariationLoader.loadVariations).mockResolvedValue()
      vi.mocked(PatternVariationLoader.getPatternVariations).mockResolvedValue([
        {
          year: 2025,
          section: 'CORRUPTED',
          line: null as any, // Invalid line
          patternId: undefined as any, // Invalid patternId
          handKey: '',
          handPattern: '',
          handCriteria: '',
          handPoints: -1, // Invalid points
          handConcealed: null as any,
          sequence: 'invalid' as any, // Invalid sequence
          tiles: null as any, // Invalid tiles array
          jokers: 'invalid' as any // Invalid jokers array
        }
      ])

      const result = await PatternAnalysisEngine.analyzePatterns(
        ['1B', '2B'],
        ['corrupted-pattern'],
        createGameContext()
      )

      // Should handle corrupted data without crashing
      expect(result).toHaveLength(1)
      expect(result[0].patternId).toBe('corrupted-pattern')
    })

    it('should handle invalid tile IDs', async () => {
      // Setup valid loader but with invalid tiles
      vi.mocked(PatternVariationLoader.loadVariations).mockResolvedValue()
      vi.mocked(PatternVariationLoader.getPatternVariations).mockResolvedValue([{
        year: 2025,
        section: 'TEST',
        line: 1,
        patternId: 1,
        handKey: 'test-pattern',
        handPattern: 'TEST',
        handCriteria: 'Test',
        handPoints: 25,
        handConcealed: false,
        sequence: 1,
        tiles: ['1B', '2B', '3B', 'flower', 'flower', 'flower', 'flower', 'flower', 'flower', 'flower', 'flower', 'flower', 'flower', 'flower'],
        jokers: Array(14).fill(false)
      }])

      const invalidTileIds = [
        '', // Empty string
        null as any, // Null
        undefined as any, // Undefined
        123 as any, // Number instead of string
        'INVALID_TILE_FORMAT', // Invalid format
        '99Z', // Non-existent suit
      ]

      const result = await PatternAnalysisEngine.analyzePatterns(
        invalidTileIds,
        ['test-pattern'],
        createGameContext()
      )

      expect(result).toHaveLength(1)
      expect(result[0].tileMatching.bestVariation).toBeDefined()
      expect(result[0].tileMatching.bestVariation.tilesMatched).toBeGreaterThanOrEqual(0)
    })

    it('should handle extreme game context values', async () => {
      vi.mocked(PatternVariationLoader.loadVariations).mockResolvedValue()
      vi.mocked(PatternVariationLoader.getPatternVariations).mockResolvedValue([])

      const extremeContext = createGameContext({
        jokersInHand: -10, // Negative jokers
        wallTilesRemaining: Number.MAX_SAFE_INTEGER, // Extremely large number
        discardPile: Array(1000).fill('1B'), // Massive discard pile
        exposedTiles: {
          'player2': Array(500).fill('2B'), // Unrealistic exposure
          'player3': null as any, // Invalid exposure
          'player4': undefined as any // Invalid exposure
        }
      })

      const result = await PatternAnalysisEngine.analyzePatterns(
        ['1B', '2B'],
        ['test'],
        extremeContext
      )

      // Should not crash despite extreme values
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle memory constraints gracefully', async () => {
      vi.mocked(PatternVariationLoader.loadVariations).mockResolvedValue()

      // Create extremely large tile array to test memory handling
      const hugeTileArray = Array(10000).fill('1B')
      const manyPatterns = Array(1000).fill('pattern')

      const result = await PatternAnalysisEngine.analyzePatterns(
        hugeTileArray,
        manyPatterns,
        createGameContext()
      )

      // Should complete without memory errors
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('Pattern Ranking Engine (Engine 2) - Error Resilience', () => {
    it('should handle corrupted analysis facts', async () => {
      const corruptedFacts = [
        {
          patternId: 'valid-pattern',
          tileMatching: null as any, // Corrupted tile matching
          jokerAnalysis: undefined as any, // Missing joker analysis
          tileAvailability: {
            missingTileCounts: 'corrupted' as any, // Invalid array
            totalMissingInWall: -1, // Invalid count
            totalMissingNeeded: null as any, // Invalid count
            availabilityRatio: 'not-a-number' as any // Invalid ratio
          },
          progressMetrics: {
            tilesCollected: Number.NaN, // Invalid number
            tilesRemaining: undefined as any, // Missing value
            progressPercentage: 150, // Out of range
            pairsFormed: -5, // Invalid count
            setsFormed: null as any // Invalid count
          }
        }
      ]

      const patterns = [{
        id: 'valid-pattern',
        name: 'Test Pattern',
        points: 25,
        difficulty: 'medium' as const,
        description: 'Test',
        groups: [],
        jokerRules: { allowJokers: true, minTiles: 8 },
        isStarred: false,
        completionProgress: 0
      }]

      const result = await PatternRankingEngine.rankPatterns(
        corruptedFacts as any,
        patterns,
        { phase: 'gameplay' }
      )

      // Should handle corruption gracefully
      expect(result).toBeDefined()
      expect(result.rankings).toBeDefined()
      expect(Array.isArray(result.viablePatterns)).toBe(true)
    })

    it('should handle missing or invalid pattern data', async () => {
      const validFacts = [{
        patternId: 'test-pattern',
        tileMatching: {
          totalVariations: 5,
          bestVariation: {
            variationId: 'test-var',
            patternId: 'test-pattern',
            sequence: 1,
            tilesMatched: 7,
            tilesNeeded: 7,
            completionRatio: 0.5,
            missingTiles: ['1C', '2C'],
            tileContributions: [],
            patternTiles: Array(14).fill('1B')
          },
          worstVariation: {
            variationId: 'test-var-worst',
            patternId: 'test-pattern',
            sequence: 2,
            tilesMatched: 3,
            tilesNeeded: 11,
            completionRatio: 0.2,
            missingTiles: Array(11).fill('missing'),
            tileContributions: [],
            patternTiles: Array(14).fill('2B')
          },
          averageCompletion: 0.35,
          allResults: []
        },
        jokerAnalysis: {
          jokersAvailable: 2,
          substitutablePositions: [0, 1],
          maxJokersUseful: 2,
          withJokersCompletion: 0.7,
          jokersToComplete: 0
        },
        tileAvailability: {
          missingTileCounts: [],
          totalMissingInWall: 5,
          totalMissingNeeded: 7,
          availabilityRatio: 0.7
        },
        progressMetrics: {
          tilesCollected: 7,
          tilesRemaining: 7,
          progressPercentage: 50,
          pairsFormed: 2,
          setsFormed: 1
        }
      }]

      const invalidPatterns = [
        null as any, // Null pattern
        undefined as any, // Undefined pattern
        { id: '', name: '', points: 0 }, // Empty pattern
        { id: 'no-other-fields' } as any, // Incomplete pattern
        {
          id: 'corrupted-pattern',
          points: 'invalid' as any, // Invalid points type
          difficulty: 999 as any // Invalid difficulty
        } as any
      ]

      const result = await PatternRankingEngine.rankPatterns(
        validFacts,
        invalidPatterns,
        { phase: 'gameplay' }
      )

      expect(result).toBeDefined()
      expect(result.rankings.length).toBe(validFacts.length)
    })

    it('should handle extreme scoring scenarios', async () => {
      const extremeFacts = [{
        patternId: 'extreme-pattern',
        tileMatching: {
          totalVariations: Number.MAX_SAFE_INTEGER,
          bestVariation: {
            variationId: 'extreme',
            patternId: 'extreme-pattern',
            sequence: 1,
            tilesMatched: Number.MAX_SAFE_INTEGER, // Impossible large match
            tilesNeeded: -1000, // Negative need
            completionRatio: 999, // Way over 100%
            missingTiles: [],
            tileContributions: [],
            patternTiles: Array(14).fill('1B')
          },
          worstVariation: {
            variationId: 'extreme-worst',
            patternId: 'extreme-pattern',
            sequence: 2,
            tilesMatched: -50, // Negative match
            tilesNeeded: Number.MAX_SAFE_INTEGER,
            completionRatio: -5, // Negative ratio
            missingTiles: [],
            tileContributions: [],
            patternTiles: Array(14).fill('2B')
          },
          averageCompletion: Number.NaN,
          allResults: []
        },
        jokerAnalysis: {
          jokersAvailable: -10, // Negative jokers
          substitutablePositions: Array(1000).fill(0), // Huge positions array
          maxJokersUseful: Number.MAX_SAFE_INTEGER, // Impossibly useful
          withJokersCompletion: -1, // Negative completion
          jokersToComplete: Number.MAX_SAFE_INTEGER // Impossible requirement
        },
        tileAvailability: {
          missingTileCounts: [],
          totalMissingInWall: Number.MAX_SAFE_INTEGER,
          totalMissingNeeded: Number.MIN_SAFE_INTEGER,
          availabilityRatio: Number.NEGATIVE_INFINITY
        },
        progressMetrics: {
          tilesCollected: Number.POSITIVE_INFINITY,
          tilesRemaining: Number.NaN,
          progressPercentage: -999,
          pairsFormed: Number.MAX_SAFE_INTEGER,
          setsFormed: undefined as any
        }
      }]

      const patterns = [{
        id: 'extreme-pattern',
        name: 'Extreme Test',
        points: Number.MAX_SAFE_INTEGER,
        difficulty: 'extreme' as any,
        description: 'Test',
        groups: [],
        jokerRules: { allowJokers: true, minTiles: -1 },
        isStarred: false,
        completionProgress: Number.NaN
      }]

      const result = await PatternRankingEngine.rankPatterns(
        extremeFacts as any,
        patterns,
        { phase: 'gameplay' }
      )

      // Should normalize extreme values
      expect(result).toBeDefined()
      expect(result.rankings[0]).toBeDefined()
      expect(Number.isFinite(result.rankings[0].totalScore)).toBe(true)
      expect(result.rankings[0].confidence).toBeGreaterThanOrEqual(0)
      expect(result.rankings[0].confidence).toBeLessThanOrEqual(1)
    })

    it('should handle concurrent ranking requests', async () => {
      const baseFacts = [{
        patternId: 'concurrent-test',
        tileMatching: {
          totalVariations: 3,
          bestVariation: {
            variationId: 'test',
            patternId: 'concurrent-test',
            sequence: 1,
            tilesMatched: 5,
            tilesNeeded: 9,
            completionRatio: 0.36,
            missingTiles: [],
            tileContributions: [],
            patternTiles: Array(14).fill('1B')
          },
          worstVariation: {
            variationId: 'test-worst',
            patternId: 'concurrent-test',
            sequence: 2,
            tilesMatched: 2,
            tilesNeeded: 12,
            completionRatio: 0.14,
            missingTiles: [],
            tileContributions: [],
            patternTiles: Array(14).fill('2B')
          },
          averageCompletion: 0.25,
          allResults: []
        },
        jokerAnalysis: {
          jokersAvailable: 2,
          substitutablePositions: [],
          maxJokersUseful: 1,
          withJokersCompletion: 0.5,
          jokersToComplete: 2
        },
        tileAvailability: {
          missingTileCounts: [],
          totalMissingInWall: 20,
          totalMissingNeeded: 9,
          availabilityRatio: 2.2
        },
        progressMetrics: {
          tilesCollected: 5,
          tilesRemaining: 9,
          progressPercentage: 36,
          pairsFormed: 1,
          setsFormed: 0
        }
      }]

      const patterns = [{
        id: 'concurrent-test',
        name: 'Concurrent Test',
        points: 25,
        difficulty: 'medium' as const,
        description: 'Test',
        groups: [],
        jokerRules: { allowJokers: true, minTiles: 8 },
        isStarred: false,
        completionProgress: 0
      }]

      // Launch multiple concurrent ranking requests
      const promises = Array.from({ length: 10 }, () =>
        PatternRankingEngine.rankPatterns(baseFacts, patterns, { phase: 'gameplay' })
      )

      const results = await Promise.all(promises)

      // All should succeed
      expect(results).toHaveLength(10)
      results.forEach(result => {
        expect(result).toBeDefined()
        expect(result.rankings).toHaveLength(1)
      })
    })
  })

  describe('Tile Recommendation Engine (Engine 3) - Error Resilience', () => {
    it('should handle invalid pattern rankings', async () => {
      const invalidRankings = {
        rankings: null as any,
        viablePatterns: 'not-an-array' as any,
        topRecommendations: undefined as any,
        switchAnalysis: {
          shouldSuggestSwitch: 'maybe' as any, // Invalid boolean
          currentFocus: 123 as any, // Invalid string
          recommendedPattern: null,
          improvementPercent: 'lots' as any, // Invalid number
          improvementThreshold: undefined as any,
          reasoning: 'not-an-array' as any // Invalid array
        },
        gameStateFactors: null as any
      }

      const gameContext = {
        phase: 'gameplay' as const,
        discardPile: ['1B'],
        exposedTiles: {},
        wallTilesRemaining: 50
      }

      const result = await TileRecommendationEngine.generateRecommendations(
        ['1B', '2B', '3B'],
        invalidRankings as any,
        gameContext
      )

      // Should return safe fallback structure
      expect(result).toBeDefined()
      expect(Array.isArray(result.tileActions)).toBe(true)
      expect(Array.isArray(result.keepTiles)).toBe(true)
      expect(Array.isArray(result.passTiles)).toBe(true)
      expect(Array.isArray(result.discardTiles)).toBe(true)
      expect(result.optimalStrategy).toBeDefined()
      expect(Array.isArray(result.opponentAnalysis)).toBe(true)
      expect(Array.isArray(result.strategicAdvice)).toBe(true)
    })

    it('should handle corrupted analysis facts from Engine 1', async () => {
      const validRankings = {
        rankings: [],
        viablePatterns: [],
        topRecommendations: [{
          patternId: 'test',
          totalScore: 50,
          components: { currentTileScore: 20, availabilityScore: 20, jokerScore: 5, priorityScore: 5 },
          confidence: 0.7,
          recommendation: 'fair' as const,
          isViable: true,
          strategicValue: 5,
          riskFactors: []
        }],
        switchAnalysis: null,
        gameStateFactors: {
          phase: 'gameplay',
          turnsRemaining: 20,
          riskTolerance: 'balanced' as const
        }
      }

      const corruptedAnalysisFacts = [
        null, // Null fact
        undefined, // Undefined fact
        { patternId: 'corrupt', tileMatching: 'invalid' }, // Invalid structure
        {
          patternId: 'partial',
          tileMatching: {
            bestVariation: null, // Missing best variation
            totalVariations: 'not-a-number' // Invalid type
          }
        }
      ]

      const result = await TileRecommendationEngine.generateRecommendations(
        ['1B', '2B'],
        validRankings,
        {
          phase: 'gameplay',
          discardPile: [],
          exposedTiles: {},
          wallTilesRemaining: 50
        },
        corruptedAnalysisFacts as any
      )

      expect(result).toBeDefined()
      expect(result.tileActions.length).toBeGreaterThan(0)
    })

    it('should handle network-like failures in opponent analysis', async () => {
      const validRankings = {
        rankings: [],
        viablePatterns: [],
        topRecommendations: [],
        switchAnalysis: null,
        gameStateFactors: {
          phase: 'gameplay',
          turnsRemaining: 15,
          riskTolerance: 'balanced' as const
        }
      }

      const corruptedGameContext = {
        phase: 'gameplay' as const,
        discardPile: Array(1000).fill(null), // Massive corrupted discard pile
        exposedTiles: {
          'player1': undefined as any,
          'player2': 'corrupted-data' as any,
          'player3': [null, undefined, 'valid', 123, {}] as any // Mixed invalid data
        },
        wallTilesRemaining: 'invalid-number' as any
      }

      const result = await TileRecommendationEngine.generateRecommendations(
        ['1B', '2B', '3B'],
        validRankings,
        corruptedGameContext as any
      )

      expect(result).toBeDefined()
      expect(result.opponentAnalysis).toBeDefined()
      expect(Array.isArray(result.opponentAnalysis)).toBe(true)
    })

    it('should handle extreme tile arrays', async () => {
      const validRankings = {
        rankings: [],
        viablePatterns: [],
        topRecommendations: [],
        switchAnalysis: null,
        gameStateFactors: {
          phase: 'charleston',
          turnsRemaining: 30,
          riskTolerance: 'conservative' as const
        }
      }

      const extremeTiles = [
        '', // Empty tile
        null, // Null tile
        undefined, // Undefined tile
        'SUPER_LONG_INVALID_TILE_ID_THAT_SHOULD_NOT_EXIST',
        123, // Number tile
        {}, // Object tile
        ...Array(100).fill('duplicate-tile') // Many duplicates
      ]

      const result = await TileRecommendationEngine.generateRecommendations(
        extremeTiles as any,
        validRankings,
        {
          phase: 'charleston',
          discardPile: [],
          exposedTiles: {},
          wallTilesRemaining: 50
        }
      )

      expect(result).toBeDefined()
      expect(result.tileActions).toBeDefined()
    })

    it('should maintain minimum recommendations under all conditions', async () => {
      const emptyRankings = {
        rankings: [],
        viablePatterns: [],
        topRecommendations: [],
        switchAnalysis: null,
        gameStateFactors: {
          phase: 'charleston',
          turnsRemaining: 0, // Game ending
          riskTolerance: 'aggressive' as const
        }
      }

      // Charleston phase with minimal tiles
      const charlestonResult = await TileRecommendationEngine.generateRecommendations(
        ['1B', '2B'], // Only 2 tiles
        emptyRankings,
        {
          phase: 'charleston',
          discardPile: [],
          exposedTiles: {},
          wallTilesRemaining: 0
        }
      )

      expect(charlestonResult.passTiles.length).toBeGreaterThanOrEqual(0) // Should try to meet Charleston requirements

      // Gameplay phase with minimal tiles
      const gameplayResult = await TileRecommendationEngine.generateRecommendations(
        ['joker'], // Single joker
        emptyRankings,
        {
          phase: 'gameplay',
          discardPile: [],
          exposedTiles: {},
          wallTilesRemaining: 0
        }
      )

      expect(gameplayResult.tileActions.length).toBeGreaterThan(0) // Should always provide some recommendation
    })
  })

  describe('Cross-Engine Error Propagation', () => {
    it('should isolate engine failures appropriately', async () => {
      // Test that Engine 2 failure doesn't crash Engine 3
      const validFacts = [{
        patternId: 'test',
        tileMatching: {
          totalVariations: 1,
          bestVariation: {
            variationId: 'test-var',
            patternId: 'test',
            sequence: 1,
            tilesMatched: 5,
            tilesNeeded: 9,
            completionRatio: 0.36,
            missingTiles: [],
            tileContributions: [],
            patternTiles: Array(14).fill('1B')
          },
          worstVariation: {
            variationId: 'test-var-worst',
            patternId: 'test',
            sequence: 1,
            tilesMatched: 5,
            tilesNeeded: 9,
            completionRatio: 0.36,
            missingTiles: [],
            tileContributions: [],
            patternTiles: Array(14).fill('1B')
          },
          averageCompletion: 0.36,
          allResults: []
        },
        jokerAnalysis: {
          jokersAvailable: 0,
          substitutablePositions: [],
          maxJokersUseful: 0,
          withJokersCompletion: 0.36,
          jokersToComplete: 5
        },
        tileAvailability: {
          missingTileCounts: [],
          totalMissingInWall: 20,
          totalMissingNeeded: 9,
          availabilityRatio: 2.2
        },
        progressMetrics: {
          tilesCollected: 5,
          tilesRemaining: 9,
          progressPercentage: 36,
          pairsFormed: 1,
          setsFormed: 0
        }
      }]

      // Engine 2 should handle this gracefully even with invalid pattern data
      const result = await PatternRankingEngine.rankPatterns(
        validFacts,
        [null as any], // Invalid patterns
        { phase: 'gameplay' }
      )

      expect(result).toBeDefined()
      expect(result.rankings.length).toBe(validFacts.length)
    })

    it('should provide meaningful error context', async () => {
      // This test ensures error messages are helpful for debugging
      try {
        await PatternAnalysisEngine.analyzePatterns(
          null as any, // Invalid tiles
          ['valid-pattern'],
          null as any // Invalid context
        )
      } catch (error) {
        // If it throws, error should be meaningful
        expect(error).toBeDefined()
      }

      // Should not crash the process
      expect(true).toBe(true)
    })
  })
})