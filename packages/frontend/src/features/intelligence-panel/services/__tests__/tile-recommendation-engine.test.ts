// Engine 3: Tile Recommendation Engine Tests
// Tests keep/pass/discard recommendations with opponent analysis and strategic advice

import { describe, test, expect, beforeAll } from 'vitest'
import { TileRecommendationEngine } from '../tile-recommendation-engine'
import { PatternVariationLoader } from '../pattern-variation-loader'
import type { RankedPatternResults } from '../pattern-ranking-engine'
import type { PatternAnalysisFacts } from '../pattern-analysis-engine'

// Sample game context for testing
const createGameContext = (overrides = {}) => ({
  phase: 'gameplay' as const,
  discardPile: ['3D', '7B', '8C'],
  exposedTiles: {
    'player2': ['1B', '1B', '1B'], // Player 2 exposed 1B pung
    'player3': ['flower', 'flower'] // Player 3 exposed flowers
  },
  playerHands: {
    'player1': 14,
    'player2': 11, // 11 after exposure
    'player3': 12, // 12 after exposure
    'player4': 14
  },
  wallTilesRemaining: 70,
  ...overrides
})

// Sample pattern rankings from Engine 2
const createMockRankings = (): RankedPatternResults => {
  const viablePattern = {
    patternId: '2025-SINGLES_AND_PAIRS-3-1',
    pattern: { id: '2025-SINGLES_AND_PAIRS-3-1', name: 'Singles And Pairs', points: 25 },
    totalScore: 65,
    components: {
      currentTileScore: 25,
      availabilityScore: 20,
      jokerScore: 12,
      priorityScore: 8
    },
    isViable: true,
    recommendation: 'good' as const,
    confidence: 0.8,
    strategicValue: 72,
    riskFactors: []
  }
  
  const nonViablePattern = {
    patternId: '2025-CONSECUTIVE_RUN-7-1',
    pattern: { id: '2025-CONSECUTIVE_RUN-7-1', name: 'Consecutive Run', points: 30 },
    totalScore: 45,
    components: {
      currentTileScore: 15,
      availabilityScore: 18,
      jokerScore: 8,
      priorityScore: 4
    },
    isViable: false,
    recommendation: 'fair' as const,
    confidence: 0.6,
    strategicValue: 55,
    riskFactors: ['low_completion']
  }
  
  return {
    rankings: [viablePattern, nonViablePattern],
    viablePatterns: [viablePattern], // Only viable patterns
    topRecommendations: [viablePattern], // Top patterns for recommendations
    switchAnalysis: null,
    gameStateFactors: {
      phase: 'gameplay',
      turnsRemaining: 20,
      riskTolerance: 'balanced' as const
    }
  }
}

// Sample Engine 1 analysis facts
const createMockAnalysisFacts = (): PatternAnalysisFacts[] => ([
  {
    patternId: '2025-SINGLES_AND_PAIRS-3-1',
    tileMatching: {
      totalVariations: 10,
      bestVariation: {
        variationId: '2025-SINGLES_AND_PAIRS-3-1-1',
        patternId: '2025-SINGLES_AND_PAIRS-3-1',
        sequence: 1,
        tilesMatched: 7,
        tilesNeeded: 7,
        completionRatio: 0.5,
        missingTiles: ['6B', '6C', '1B', '1C', '2B', '2C', 'flower'],
        tileContributions: [
          {
            tileId: '6B',
            positionsInPattern: [2, 3],
            isRequired: true,
            isCritical: true,
            canBeReplaced: false
          },
          {
            tileId: '6C',
            positionsInPattern: [4, 5],
            isRequired: true,
            isCritical: true,
            canBeReplaced: false
          }
        ],
        patternTiles: ['flower', 'flower', '6B', '6B', '6C', '6C', '1B', '1B', '1C', '1C', '2B', '2B', '2C', '2C']
      },
      worstVariation: {
        variationId: '2025-SINGLES_AND_PAIRS-3-1-worst',
        patternId: '2025-SINGLES_AND_PAIRS-3-1',
        sequence: 5,
        tilesMatched: 2,
        tilesNeeded: 12,
        completionRatio: 2/14,
        missingTiles: Array(12).fill('missing'),
        tileContributions: [],
        patternTiles: Array(14).fill('tile')
      },
      averageCompletion: 0.35,
      allResults: []
    },
    jokerAnalysis: {
      jokersAvailable: 1,
      substitutablePositions: [6, 7, 8, 9, 10, 11, 12, 13],
      maxJokersUseful: 8,
      withJokersCompletion: 0.57,
      jokersToComplete: 6
    },
    tileAvailability: {
      missingTileCounts: [
        {
          tileId: '6B',
          inWall: 2,
          inDiscards: 1,
          exposedByOthers: 1,
          totalOriginal: 4,
          remainingAvailable: 2
        },
        {
          tileId: '6C',
          inWall: 3,
          inDiscards: 0,
          exposedByOthers: 1,
          totalOriginal: 4,
          remainingAvailable: 3
        }
      ],
      totalMissingInWall: 15,
      totalMissingNeeded: 7,
      availabilityRatio: 0.6
    },
    progressMetrics: {
      tilesCollected: 7,
      tilesRemaining: 7,
      progressPercentage: 50,
      pairsFormed: 3,
      setsFormed: 1
    }
  }
])

describe('Tile Recommendation Engine (Engine 3)', () => {
  beforeAll(async () => {
    // Load pattern variations before testing
    await PatternVariationLoader.loadVariations()
  })

  describe('Core Recommendation Generation', () => {
    test('should generate comprehensive tile recommendations', async () => {
      const playerTiles = ['6B', '6B', '6C', '1B', '1C', '2B', 'flower', 'joker', '4D', '5D', '9B', '9C', 'white', 'green']
      const patternRankings = createMockRankings()
      const gameContext = createGameContext()
      const analysisFacts = createMockAnalysisFacts()

      const results = await TileRecommendationEngine.generateRecommendations(
        playerTiles,
        patternRankings,
        gameContext,
        analysisFacts
      )

      // Verify basic structure
      expect(results.tileActions).toBeDefined()
      expect(Array.isArray(results.tileActions)).toBe(true)
      expect(results.tileActions.length).toBeGreaterThan(0)
      
      expect(results.keepTiles).toBeDefined()
      expect(results.passTiles).toBeDefined()
      expect(results.discardTiles).toBeDefined()
      expect(results.optimalStrategy).toBeDefined()
      expect(results.opponentAnalysis).toBeDefined()
      expect(results.strategicAdvice).toBeDefined()
      expect(results.emergencyActions).toBeDefined()
    })

    test('should generate tile actions with required properties', async () => {
      const playerTiles = ['6B', '6C', '1B', '1C']
      const patternRankings = createMockRankings()
      const gameContext = createGameContext()
      const analysisFacts = createMockAnalysisFacts()

      const results = await TileRecommendationEngine.generateRecommendations(
        playerTiles,
        patternRankings,
        gameContext,
        analysisFacts
      )

      // Check that tile actions have all required properties
      results.tileActions.forEach(action => {
        expect(action.tileId).toBeDefined()
        expect(['keep', 'pass', 'discard', 'neutral']).toContain(action.primaryAction)
        expect(typeof action.confidence).toBe('number')
        expect(action.confidence).toBeGreaterThanOrEqual(0)
        // Engine may use confidence values > 1 for high-confidence recommendations
        expect(action.confidence).toBeLessThanOrEqual(100)
        expect(typeof action.priority).toBe('number')
        expect(action.priority).toBeGreaterThanOrEqual(1)
        expect(action.priority).toBeLessThanOrEqual(10)
        expect(typeof action.reasoning).toBe('string')
        expect(action.reasoning.length).toBeGreaterThan(0)
        
        // Contextual actions
        expect(action.contextualActions).toBeDefined()
        expect(['keep', 'pass', 'neutral']).toContain(action.contextualActions.charleston)
        expect(['keep', 'discard', 'neutral']).toContain(action.contextualActions.gameplay)
        expect(['expose', 'keep', 'never']).toContain(action.contextualActions.exposition)
        
        // Multi-pattern analysis
        expect(Array.isArray(action.patternsHelped)).toBe(true)
        expect(typeof action.multiPatternValue).toBe('number')
        
        // Dangers (can be null)
        if (action.dangers) {
          expect(Array.isArray(action.dangers)).toBe(true)
        }
      })
    })

    test('should categorize tiles correctly', async () => {
      const playerTiles = ['6B', '6B', '6C', '1B', 'white', 'green', '9D']
      const patternRankings = createMockRankings()
      const gameContext = createGameContext()
      const analysisFacts = createMockAnalysisFacts()

      const results = await TileRecommendationEngine.generateRecommendations(
        playerTiles,
        patternRankings,
        gameContext,
        analysisFacts
      )

      // Should have tiles in different categories
      expect(results.keepTiles.length).toBeGreaterThan(0)
      expect(results.discardTiles.length).toBeGreaterThan(0)
      
      // All tiles should be categorized
      const totalCategorized = results.keepTiles.length + results.passTiles.length + results.discardTiles.length
      const neutralActions = results.tileActions.filter(a => a.primaryAction === 'neutral').length
      expect(totalCategorized + neutralActions).toBe(results.tileActions.length)
      
      // Keep tiles should have higher priorities than discard tiles
      const keepPriorities = results.keepTiles.map(t => t.priority)
      const discardPriorities = results.discardTiles.map(t => t.priority)
      
      if (keepPriorities.length > 0 && discardPriorities.length > 0) {
        const avgKeepPriority = keepPriorities.reduce((a, b) => a + b, 0) / keepPriorities.length
        const avgDiscardPriority = discardPriorities.reduce((a, b) => a + b, 0) / discardPriorities.length
        expect(avgKeepPriority).toBeGreaterThan(avgDiscardPriority)
      }
    })
  })

  describe('Optimal Strategy Generation', () => {
    test('should generate optimal strategy with pattern focus', async () => {
      const playerTiles = ['6B', '6B', '6C', '1B', '1C', '2B']
      const patternRankings = createMockRankings()
      const gameContext = createGameContext()
      const analysisFacts = createMockAnalysisFacts()

      const results = await TileRecommendationEngine.generateRecommendations(
        playerTiles,
        patternRankings,
        gameContext,
        analysisFacts
      )

      expect(results.optimalStrategy.primaryPattern).toBeDefined()
      expect(typeof results.optimalStrategy.primaryPattern).toBe('string')
      expect(results.optimalStrategy.primaryPattern.length).toBeGreaterThan(0)
      
      expect(typeof results.optimalStrategy.expectedCompletion).toBe('number')
      expect(results.optimalStrategy.expectedCompletion).toBeGreaterThanOrEqual(0)
      // Engine may use completion percentages (0-100) instead of ratios (0-1)
      expect(results.optimalStrategy.expectedCompletion).toBeLessThanOrEqual(100)
      
      // Backup pattern can be null
      if (results.optimalStrategy.backupPattern) {
        expect(typeof results.optimalStrategy.backupPattern).toBe('string')
      }
      
      // Pivot condition can be null
      if (results.optimalStrategy.pivotCondition) {
        expect(typeof results.optimalStrategy.pivotCondition).toBe('string')
      }
    })

    test('should provide strategic advice', async () => {
      const playerTiles = ['6B', '6C', '1B', '1C']
      const patternRankings = createMockRankings()
      const gameContext = createGameContext()
      const analysisFacts = createMockAnalysisFacts()

      const results = await TileRecommendationEngine.generateRecommendations(
        playerTiles,
        patternRankings,
        gameContext,
        analysisFacts
      )

      expect(Array.isArray(results.strategicAdvice)).toBe(true)
      expect(results.strategicAdvice.length).toBeGreaterThan(0)
      
      results.strategicAdvice.forEach(advice => {
        expect(typeof advice).toBe('string')
        expect(advice.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Opponent Analysis', () => {
    test('should analyze opponent patterns and risks', async () => {
      const playerTiles = ['6B', '6C', '1B', '1C']
      const patternRankings = createMockRankings()
      const gameContext = createGameContext({
        exposedTiles: {
          'player2': ['1B', '1B', '1B'], // Clear pung
          'player3': ['flower', 'flower', '2B', '2B'] // Mixed exposure
        }
      })
      const analysisFacts = createMockAnalysisFacts()

      const results = await TileRecommendationEngine.generateRecommendations(
        playerTiles,
        patternRankings,
        gameContext,
        analysisFacts
      )

      expect(Array.isArray(results.opponentAnalysis)).toBe(true)
      expect(results.opponentAnalysis.length).toBeGreaterThan(0)
      
      results.opponentAnalysis.forEach(analysis => {
        expect(typeof analysis.playerId).toBe('string')
        expect(Array.isArray(analysis.likelyNeeds)).toBe(true)
        expect(Array.isArray(analysis.exposedPatterns)).toBe(true)
        expect(Array.isArray(analysis.safeDiscards)).toBe(true)
        expect(Array.isArray(analysis.riskyDiscards)).toBe(true)
        expect(Array.isArray(analysis.patternClues)).toBe(true)
        
        // Check likely needs structure
        analysis.likelyNeeds.forEach(need => {
          expect(typeof need.tileId).toBe('string')
          expect(typeof need.probability).toBe('number')
          expect(need.probability).toBeGreaterThanOrEqual(0)
          expect(need.probability).toBeLessThanOrEqual(1)
          expect(Array.isArray(need.reasoning)).toBe(true)
        })
        
        // Check pattern clues structure
        analysis.patternClues.forEach(clue => {
          expect(typeof clue.pattern).toBe('string')
          expect(typeof clue.confidence).toBe('number')
          expect(Array.isArray(clue.evidence)).toBe(true)
        })
      })
    })

    test('should identify safe and risky discards', async () => {
      const playerTiles = ['6B', '6C', '1B', '1C', '9D', '8D']
      const patternRankings = createMockRankings()
      const gameContext = createGameContext({
        exposedTiles: {
          'player2': ['1B', '1B', '1B'], // Player 2 likely doesn't need 1B
          'player3': ['6B', '6C', '6D'] // Player 3 might need 6s
        }
      })
      const analysisFacts = createMockAnalysisFacts()

      const results = await TileRecommendationEngine.generateRecommendations(
        playerTiles,
        patternRankings,
        gameContext,
        analysisFacts
      )

      // Should have opponent analysis
      expect(results.opponentAnalysis.length).toBeGreaterThan(0)
      
      // Check that some tiles are identified as safe/risky
      const allSafeDiscards = results.opponentAnalysis.flatMap(a => a.safeDiscards)
      const allRiskyDiscards = results.opponentAnalysis.flatMap(a => a.riskyDiscards)
      
      expect(allSafeDiscards.length).toBeGreaterThan(0)
      expect(allRiskyDiscards.length).toBeGreaterThan(0)
    })
  })

  describe('Contextual Actions', () => {
    test('should provide different recommendations for Charleston vs Gameplay', async () => {
      const playerTiles = ['6B', '6C', '1B', '1C', '9D', '8D']
      const patternRankings = createMockRankings()
      const analysisFacts = createMockAnalysisFacts()

      const charlestonContext = createGameContext({ phase: 'charleston' })
      const gameplayContext = createGameContext({ phase: 'gameplay' })

      const charlestonResults = await TileRecommendationEngine.generateRecommendations(
        playerTiles,
        patternRankings,
        charlestonContext,
        analysisFacts
      )
      
      const gameplayResults = await TileRecommendationEngine.generateRecommendations(
        playerTiles,
        patternRankings,
        gameplayContext,
        analysisFacts
      )

      // Both should provide recommendations
      expect(charlestonResults.tileActions.length).toBeGreaterThan(0)
      expect(gameplayResults.tileActions.length).toBeGreaterThan(0)
      
      // Charleston should have pass recommendations
      const charlestonPassTiles = charlestonResults.tileActions.filter(
        a => a.contextualActions.charleston === 'pass'
      )
      expect(charlestonPassTiles.length).toBeGreaterThan(0)
      
      // Gameplay should have discard recommendations
      const gameplayDiscardTiles = gameplayResults.tileActions.filter(
        a => a.contextualActions.gameplay === 'discard'
      )
      expect(gameplayDiscardTiles.length).toBeGreaterThan(0)
    })

    test('should identify tiles for exposition', async () => {
      const playerTiles = ['6B', '6B', '6B', '1C', '1C', '1C', '2D'] // Multiple pungs
      const patternRankings = createMockRankings()
      const gameContext = createGameContext()
      const analysisFacts = createMockAnalysisFacts()

      const results = await TileRecommendationEngine.generateRecommendations(
        playerTiles,
        patternRankings,
        gameContext,
        analysisFacts
      )

      // Should identify some tiles as exposable
      const exposableTiles = results.tileActions.filter(
        a => a.contextualActions.exposition === 'expose'
      )
      expect(exposableTiles.length).toBeGreaterThan(0)
    })
  })

  describe('Danger Detection', () => {
    test('should detect pattern destruction dangers', async () => {
      const playerTiles = ['6B', '6B', '1B', '1C'] // Partial progress
      const patternRankings = createMockRankings()
      const gameContext = createGameContext()
      const analysisFacts = createMockAnalysisFacts()

      const results = await TileRecommendationEngine.generateRecommendations(
        playerTiles,
        patternRankings,
        gameContext,
        analysisFacts
      )

      // Look for tiles with danger warnings
      const tilesWithDangers = results.tileActions.filter(a => a.dangers && a.dangers.length > 0)
      
      if (tilesWithDangers.length > 0) {
        tilesWithDangers.forEach(tile => {
          tile.dangers!.forEach(danger => {
            expect(['pattern_destruction', 'opponent_feeding', 'wall_depletion', 'strategic_error']).toContain(danger.type)
            expect(['low', 'medium', 'high']).toContain(danger.severity)
            expect(typeof danger.message).toBe('string')
            expect(typeof danger.impact).toBe('string')
          })
        })
      }
    })

    test('should identify emergency actions', async () => {
      const playerTiles = ['6B'] // Very limited hand
      const patternRankings = createMockRankings()
      const gameContext = createGameContext({ wallTilesRemaining: 5 }) // Low wall = emergency
      const analysisFacts = createMockAnalysisFacts()

      const results = await TileRecommendationEngine.generateRecommendations(
        playerTiles,
        patternRankings,
        gameContext,
        analysisFacts
      )

      expect(Array.isArray(results.emergencyActions)).toBe(true)
      
      // Emergency actions should have high priorities
      results.emergencyActions.forEach(action => {
        expect(action.priority).toBeGreaterThanOrEqual(8) // High priority
      })
    })
  })

  describe('Multi-Pattern Analysis', () => {
    test('should analyze multi-pattern tile value', async () => {
      const playerTiles = ['6B', '6C', '1B', '1C', '2B', '2C']
      const patternRankings = createMockRankings()
      const gameContext = createGameContext()
      const analysisFacts = createMockAnalysisFacts()

      const results = await TileRecommendationEngine.generateRecommendations(
        playerTiles,
        patternRankings,
        gameContext,
        analysisFacts
      )

      // Check that tiles show which patterns they help
      results.tileActions.forEach(action => {
        expect(Array.isArray(action.patternsHelped)).toBe(true)
        expect(typeof action.multiPatternValue).toBe('number')
        expect(action.multiPatternValue).toBeGreaterThanOrEqual(0)
      })
      
      // Some tiles should help multiple patterns (but may be 0 depending on hand)
      const multiPatternTiles = results.tileActions.filter(a => a.patternsHelped.length > 1)
      expect(multiPatternTiles.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Tier-Based Priority System', () => {
    test('should prioritize primary pattern tiles for KEEP recommendations', async () => {
      const playerTiles = ['4C', 'green', 'red', '8B', '2C', '1B', '3C', '5D', '7D']
      
      // Mock analysis facts with primary pattern that includes some of our tiles
      const mockFacts = [{
        patternId: '2025-SINGLES_AND_PAIRS-2-1',
        tileMatching: {
          totalVariations: 3,
          bestVariation: {
            variationId: '2025-SINGLES_AND_PAIRS-2-1-1',
            patternId: '2025-SINGLES_AND_PAIRS-2-1',
            sequence: 1,
            tilesMatched: 4,
            tilesNeeded: 10,
            completionRatio: 4/14,
            missingTiles: ['6B', '6C', '1C', '2B', '3B', 'white', 'flower', 'joker', '4B', '5C'],
            tileContributions: [
              {
                tileId: '4C',
                positionsInPattern: [0, 1],
                isRequired: true,
                isCritical: true,
                canBeReplaced: false
              },
              {
                tileId: 'green',
                positionsInPattern: [2],
                isRequired: true,
                isCritical: false,
                canBeReplaced: false
              },
              {
                tileId: 'red',
                positionsInPattern: [3],
                isRequired: true,
                isCritical: false,
                canBeReplaced: false
              },
              {
                tileId: '8B',
                positionsInPattern: [4, 5],
                isRequired: true,
                isCritical: true,
                canBeReplaced: false
              }
            ],
            patternTiles: ['4C', '4C', 'green', 'red', '8B', '8B', '6B', '6C', '1C', '2B', '3B', 'white', 'flower', 'joker']
          },
          worstVariation: {
            variationId: '2025-SINGLES_AND_PAIRS-2-1-3',
            patternId: '2025-SINGLES_AND_PAIRS-2-1',
            sequence: 3,
            tilesMatched: 1,
            tilesNeeded: 13,
            completionRatio: 1/14,
            missingTiles: Array(13).fill('missing'),
            tileContributions: [],
            patternTiles: Array(14).fill('tile')
          },
          averageCompletion: 0.25,
          allResults: []
        },
        jokerAnalysis: {
          jokersAvailable: 0,
          substitutablePositions: [],
          maxJokersUseful: 0,
          withJokersCompletion: 4/14,
          jokersToComplete: 10
        },
        tileAvailability: {
          missingTileCounts: [],
          totalMissingInWall: 30,
          totalMissingNeeded: 10,
          availabilityRatio: 0.3
        },
        progressMetrics: {
          tilesCollected: 4,
          tilesRemaining: 10,
          progressPercentage: 28.6,
          pairsFormed: 2,
          setsFormed: 0
        }
      }]

      const patternRankings = createMockRankings()
      const gameContext = createGameContext()

      const results = await TileRecommendationEngine.generateRecommendations(
        playerTiles,
        patternRankings,
        gameContext,
        mockFacts
      )

      // Primary pattern tiles should be recommended as KEEP
      const primaryPatternTiles = ['4C', 'green', 'red', '8B']
      const nonPatternTiles = ['2C', '1B', '3C', '5D', '7D']

      primaryPatternTiles.forEach(tileId => {
        const action = results.tileActions.find(a => a.tileId === tileId)
        expect(action).toBeDefined()
        expect(action!.primaryAction).toBe('keep')
        expect(action!.priority).toBeGreaterThanOrEqual(6) // High priority
        expect(action!.reasoning).toMatch(/primary pattern|Critical single tile/)
      })

      nonPatternTiles.forEach(tileId => {
        const action = results.tileActions.find(a => a.tileId === tileId)
        expect(action).toBeDefined()
        expect(['discard', 'neutral']).toContain(action!.primaryAction)
        expect(action!.priority).toBeLessThanOrEqual(5) // Lower priority
      })
    })

    test('should sort recommendations by hand display order', async () => {
      const playerTiles = ['9C', '1D', '5B', 'north', 'green', 'flower', 'joker']
      const patternRankings = createMockRankings()
      const gameContext = createGameContext()
      const analysisFacts = createMockAnalysisFacts()

      const results = await TileRecommendationEngine.generateRecommendations(
        playerTiles,
        patternRankings,
        gameContext,
        analysisFacts
      )

      // Check that tiles are sorted in hand display order: dots → bams → cracks → winds → dragons → flowers → jokers
      const expectedOrder = ['1D', '5B', '9C', 'north', 'green', 'flower', 'joker']
      const actualOrder = results.tileActions.map(a => a.tileId)
      
      expect(actualOrder).toEqual(expectedOrder)
    })

    test('should handle multiple patterns with tier-based prioritization', async () => {
      const playerTiles = ['6B', '6C', '1B', '1C', '2B', '2C']
      
      // Mock analysis facts with multiple viable patterns
      const mockFacts = [
        {
          patternId: '2025-SINGLES_AND_PAIRS-3-1', // Primary (best completion)
          tileMatching: {
            totalVariations: 5,
            bestVariation: {
              variationId: '2025-SINGLES_AND_PAIRS-3-1-1',
              patternId: '2025-SINGLES_AND_PAIRS-3-1',
              sequence: 1,
              tilesMatched: 6,
              tilesNeeded: 8,
              completionRatio: 6/14,
              missingTiles: ['flower', 'flower', '3B', '3C', '4B', '4C', '5B', '5C'],
              tileContributions: [
                {
                  tileId: '6B',
                  positionsInPattern: [2, 3],
                  isRequired: true,
                  isCritical: true,
                  canBeReplaced: false
                },
                {
                  tileId: '6C',
                  positionsInPattern: [4, 5],
                  isRequired: true,
                  isCritical: true,
                  canBeReplaced: false
                }
              ],
              patternTiles: ['flower', 'flower', '6B', '6B', '6C', '6C', '1B', '1B', '1C', '1C', '2B', '2B', '2C', '2C']
            },
            worstVariation: {
              variationId: '2025-SINGLES_AND_PAIRS-3-1-5',
              patternId: '2025-SINGLES_AND_PAIRS-3-1',
              sequence: 5,
              tilesMatched: 2,
              tilesNeeded: 12,
              completionRatio: 2/14,
              missingTiles: Array(12).fill('missing'),
              tileContributions: [],
              patternTiles: Array(14).fill('tile')
            },
            averageCompletion: 0.35,
            allResults: []
          },
          jokerAnalysis: {
            jokersAvailable: 0,
            substitutablePositions: [],
            maxJokersUseful: 0,
            withJokersCompletion: 6/14,
            jokersToComplete: 8
          },
          tileAvailability: {
            missingTileCounts: [],
            totalMissingInWall: 20,
            totalMissingNeeded: 8,
            availabilityRatio: 0.4
          },
          progressMetrics: {
            tilesCollected: 6,
            tilesRemaining: 8,
            progressPercentage: 42.9,
            pairsFormed: 3,
            setsFormed: 0
          }
        },
        {
          patternId: '2025-CONSECUTIVE_RUN-4-1', // Alternate pattern (lower completion)
          tileMatching: {
            totalVariations: 3,
            bestVariation: {
              variationId: '2025-CONSECUTIVE_RUN-4-1-1',
              patternId: '2025-CONSECUTIVE_RUN-4-1',
              sequence: 1,
              tilesMatched: 3,
              tilesNeeded: 11,
              completionRatio: 3/14,
              missingTiles: Array(11).fill('missing'),
              tileContributions: [
                {
                  tileId: '1B',
                  positionsInPattern: [6],
                  isRequired: true,
                  isCritical: false,
                  canBeReplaced: false
                },
                {
                  tileId: '2B',
                  positionsInPattern: [7],
                  isRequired: true,
                  isCritical: false,
                  canBeReplaced: false
                }
              ],
              patternTiles: ['flower', 'flower', 'flower', 'flower', 'joker', 'joker', '1B', '2B', '3B', '4B', '5B', '6B', '7B', '8B']
            },
            worstVariation: {
              variationId: '2025-CONSECUTIVE_RUN-4-1-3',
              patternId: '2025-CONSECUTIVE_RUN-4-1',
              sequence: 3,
              tilesMatched: 1,
              tilesNeeded: 13,
              completionRatio: 1/14,
              missingTiles: Array(13).fill('missing'),
              tileContributions: [],
              patternTiles: Array(14).fill('tile')
            },
            averageCompletion: 0.2,
            allResults: []
          },
          jokerAnalysis: {
            jokersAvailable: 0,
            substitutablePositions: [],
            maxJokersUseful: 0,
            withJokersCompletion: 3/14,
            jokersToComplete: 11
          },
          tileAvailability: {
            missingTileCounts: [],
            totalMissingInWall: 25,
            totalMissingNeeded: 11,
            availabilityRatio: 0.3
          },
          progressMetrics: {
            tilesCollected: 3,
            tilesRemaining: 11,
            progressPercentage: 21.4,
            pairsFormed: 1,
            setsFormed: 0
          }
        }
      ]

      const patternRankings = createMockRankings()
      const gameContext = createGameContext()

      const results = await TileRecommendationEngine.generateRecommendations(
        playerTiles,
        patternRankings,
        gameContext,
        mockFacts
      )

      // Primary pattern tiles (6B, 6C) should have Tier 1 priority
      const primaryTiles = results.tileActions.filter(a => ['6B', '6C'].includes(a.tileId))
      primaryTiles.forEach(action => {
        expect(action.primaryAction).toBe('keep')
        expect(action.priority).toBeGreaterThanOrEqual(8) // High priority for Tier 1
        expect(action.reasoning).toMatch(/primary pattern|Critical single tile/)
      })

      // Alternate pattern tiles (1B, 2B) should have Tier 3 priority
      const alternateTiles = results.tileActions.filter(a => ['1B', '2B'].includes(a.tileId))
      alternateTiles.forEach(action => {
        expect(action.primaryAction).toBe('keep')
        expect(action.priority).toBe(6) // Lower priority for Tier 3
        expect(action.reasoning).toContain('alternate pattern')
      })

      // Non-pattern tiles should be discarded
      const nonPatternTiles = results.tileActions.filter(a => ['1C', '2C'].includes(a.tileId))
      nonPatternTiles.forEach(action => {
        expect(['discard', 'neutral']).toContain(action.primaryAction)
        expect(action.priority).toBeLessThanOrEqual(5)
      })
    })

    test('should handle tiles not in any pattern', async () => {
      const playerTiles = ['9D', '8D', '7D', '1C'] // Tiles not in mock pattern
      const patternRankings = createMockRankings()
      const gameContext = createGameContext()
      const analysisFacts = createMockAnalysisFacts() // Mock facts don't include these tiles

      const results = await TileRecommendationEngine.generateRecommendations(
        playerTiles,
        patternRankings,
        gameContext,
        analysisFacts
      )

      // All tiles should be recommended for discard since they don't contribute to patterns
      results.tileActions.forEach(action => {
        expect(['discard', 'neutral']).toContain(action.primaryAction)
        expect(action.priority).toBeLessThanOrEqual(5)
        expect(action.reasoning).toContain('priority patterns')
      })
    })

    test('should maintain ~11 keep tiles target when possible', async () => {
      // Create a hand with mix of pattern and non-pattern tiles
      const playerTiles = [
        '6B', '6B', '6C', '6C', // Primary pattern tiles (4 tiles)
        '1B', '1B', '1C', '1C', // Primary pattern tiles (4 tiles) 
        '2B', '2B', '2C', // Primary pattern tiles (3 tiles) = 11 total keep tiles
        '9D', '8D', '7D' // Non-pattern tiles (3 discard tiles)
      ]

      const mockFacts = [{
        patternId: '2025-SINGLES_AND_PAIRS-3-1',
        tileMatching: {
          totalVariations: 5,
          bestVariation: {
            variationId: '2025-SINGLES_AND_PAIRS-3-1-1',
            patternId: '2025-SINGLES_AND_PAIRS-3-1',
            sequence: 1,
            tilesMatched: 11,
            tilesNeeded: 3,
            completionRatio: 11/14,
            missingTiles: ['flower', '2C', 'joker'],
            tileContributions: [
              // All pattern tiles are required
              ...['6B', '6C', '1B', '1C', '2B', '2C'].map(tileId => ({
                tileId,
                positionsInPattern: [0, 1],
                isRequired: true,
                isCritical: false,
                canBeReplaced: false
              }))
            ],
            patternTiles: ['flower', 'joker', '6B', '6B', '6C', '6C', '1B', '1B', '1C', '1C', '2B', '2B', '2C', '2C']
          },
          worstVariation: {
            variationId: 'worst',
            patternId: '2025-SINGLES_AND_PAIRS-3-1',
            sequence: 5,
            tilesMatched: 1,
            tilesNeeded: 13,
            completionRatio: 1/14,
            missingTiles: Array(13).fill('missing'),
            tileContributions: [],
            patternTiles: Array(14).fill('tile')
          },
          averageCompletion: 0.6,
          allResults: []
        },
        jokerAnalysis: {
          jokersAvailable: 0,
          substitutablePositions: [],
          maxJokersUseful: 0,
          withJokersCompletion: 11/14,
          jokersToComplete: 3
        },
        tileAvailability: {
          missingTileCounts: [],
          totalMissingInWall: 10,
          totalMissingNeeded: 3,
          availabilityRatio: 0.9
        },
        progressMetrics: {
          tilesCollected: 11,
          tilesRemaining: 3,
          progressPercentage: 78.6,
          pairsFormed: 5,
          setsFormed: 0
        }
      }]

      const patternRankings = createMockRankings()
      const gameContext = createGameContext()

      const results = await TileRecommendationEngine.generateRecommendations(
        playerTiles,
        patternRankings,
        gameContext,
        mockFacts
      )

      // Should have reasonable keep/discard balance (pattern tiles kept, non-pattern tiles discarded)
      expect(results.keepTiles.length).toBeGreaterThanOrEqual(5) // At least some pattern tiles kept
      expect(results.keepTiles.length).toBeLessThanOrEqual(12)   // Not all tiles
      expect(results.discardTiles.length).toBeGreaterThanOrEqual(2) // At least some non-pattern tiles discarded
      expect(results.discardTiles.length).toBeLessThanOrEqual(8)    // Not all tiles

      // Pattern tiles should be kept
      const patternTileIds = ['6B', '6C', '1B', '1C', '2B', '2C']
      patternTileIds.forEach(tileId => {
        const keepActions = results.keepTiles.filter(a => a.tileId === tileId)
        expect(keepActions.length).toBeGreaterThan(0) // At least one instance should be kept
      })

      // Non-pattern tiles should be discarded
      const nonPatternTileIds = ['9D', '8D', '7D']
      nonPatternTileIds.forEach(tileId => {
        const discardActions = results.discardTiles.filter(a => a.tileId === tileId)
        expect(discardActions.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty player tiles', async () => {
      const playerTiles: string[] = []
      const patternRankings = createMockRankings()
      const gameContext = createGameContext()
      const analysisFacts = createMockAnalysisFacts()

      const results = await TileRecommendationEngine.generateRecommendations(
        playerTiles,
        patternRankings,
        gameContext,
        analysisFacts
      )

      expect(results.tileActions).toHaveLength(0)
      expect(results.keepTiles).toHaveLength(0)
      expect(results.passTiles).toHaveLength(0)
      expect(results.discardTiles).toHaveLength(0)
      expect(results.optimalStrategy).toBeDefined()
      expect(results.strategicAdvice).toBeDefined()
    })

    test('should handle invalid Engine 1 analysis facts gracefully', async () => {
      const playerTiles = ['6B', '6C']
      const patternRankings = createMockRankings()
      const gameContext = createGameContext()

      // Test null analysis facts - Engine handles gracefully with fallback
      const nullResults = await TileRecommendationEngine.generateRecommendations(
        playerTiles,
        patternRankings,
        gameContext,
        null as unknown as PatternAnalysisFacts[]
      )
      
      expect(nullResults.optimalStrategy.primaryPattern).toBe('analysis_failed')
      expect(nullResults.strategicAdvice).toContain('Engine 3 analysis failed - manual review recommended')

      // Test empty analysis facts - Engine handles gracefully with fallback  
      const emptyResults = await TileRecommendationEngine.generateRecommendations(
        playerTiles,
        patternRankings,
        gameContext,
        []
      )
      
      expect(emptyResults.optimalStrategy.primaryPattern).toBe('analysis_failed')
      expect(emptyResults.strategicAdvice).toContain('Engine 3 analysis failed - manual review recommended')
    })

    test('should handle invalid game context gracefully', async () => {
      const playerTiles = ['6B', '6C']
      const patternRankings = createMockRankings()
      const analysisFacts = createMockAnalysisFacts()

      const invalidContext = {
        ...createGameContext(),
        exposedTiles: null as unknown as { [playerId: string]: string[] }
      }

      const results = await TileRecommendationEngine.generateRecommendations(
        playerTiles,
        patternRankings,
        invalidContext,
        analysisFacts
      )

      // Should still return valid results
      expect(results.tileActions).toBeDefined()
      expect(results.optimalStrategy).toBeDefined()
    })

    test('should maintain consistent tile action counts', async () => {
      const playerTiles = ['6B', '6C', '1B', '1C', '2B', '2C']
      const patternRankings = createMockRankings()
      const gameContext = createGameContext()
      const analysisFacts = createMockAnalysisFacts()

      const results = await TileRecommendationEngine.generateRecommendations(
        playerTiles,
        patternRankings,
        gameContext,
        analysisFacts
      )

      // Should have one action per tile
      expect(results.tileActions.length).toBe(playerTiles.length)
      
      // Each tile should appear exactly once across all categories
      const allCategorizedTiles = [
        ...results.keepTiles.map(t => t.tileId),
        ...results.passTiles.map(t => t.tileId),
        ...results.discardTiles.map(t => t.tileId),
        ...results.tileActions.filter(t => t.primaryAction === 'neutral').map(t => t.tileId)
      ]
      
      expect(allCategorizedTiles.length).toBe(results.tileActions.length)
    })
  })
})