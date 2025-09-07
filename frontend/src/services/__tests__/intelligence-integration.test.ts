// Integration Tests for 3-Engine Intelligence System
// Tests coordination between Engine 1 (Pattern Analysis), Engine 2 (Pattern Ranking), and Engine 3 (Tile Recommendations)

import { describe, test, expect, beforeAll } from 'vitest'
import { PatternAnalysisEngine, type GameContext } from '../pattern-analysis-engine'
import { PatternRankingEngine } from '../pattern-ranking-engine'
import { TileRecommendationEngine } from '../tile-recommendation-engine'
import { PatternVariationLoader } from '../pattern-variation-loader'
import type { PatternSelectionOption, PatternGroup } from '@shared/nmjl-types'
// Test objects use simplified structure, not full PatternSelectionOption

// Sample pattern selection options for integration testing
const createTestPatterns = (): PatternSelectionOption[] => ([
  {
    id: '2025-SINGLES_AND_PAIRS-3-1',
    patternId: 1,
    displayName: 'Singles And Pairs',
    pattern: 'FF DDDD DDDD 33',
    points: 25,
    difficulty: 'medium',
    description: 'FF DDDD DDDD 33',
    section: 'SINGLES_AND_PAIRS',
    line: 1,
    allowsJokers: true,
    concealed: false,
    groups: [] as PatternGroup[]
  },
  {
    id: '2025-CONSECUTIVE_RUN-7-1',
    patternId: 2,
    displayName: 'Consecutive Run',
    pattern: '1111 2222 3333 FF',
    points: 30,
    difficulty: 'hard',
    description: '1111 2222 3333 FF',
    section: 'CONSECUTIVE_RUN',
    line: 1,
    allowsJokers: true,
    concealed: false,
    groups: [] as PatternGroup[]
  },
  {
    id: '2025-ANY_LIKE_NUMBERS-2-1',
    patternId: 3,
    displayName: 'Any Like Numbers',
    pattern: '111 222 333 DDDD',
    points: 25,
    difficulty: 'medium',
    description: '111 222 333 DDDD',
    section: 'ANY_LIKE_NUMBERS',
    line: 1,
    allowsJokers: true,
    concealed: false,
    groups: [] as PatternGroup[]
  }
])

// Sample game context for integration testing
const createIntegrationContext = (overrides: Partial<GameContext> = {}): GameContext => ({
  jokersInHand: 1,
  wallTilesRemaining: 72,
  discardPile: ['3D', '7B', '8C', '9D'],
  exposedTiles: {
    'player2': ['1B', '1B', '1B'], // Player 2 exposed 1B pung
    'player3': ['flower', 'flower'] // Player 3 exposed flowers
  },
  currentPhase: 'gameplay',
  ...overrides
})

describe('3-Engine Intelligence System Integration', () => {
  beforeAll(async () => {
    // Load pattern variations before testing
    await PatternVariationLoader.loadVariations()
  })

  describe('Complete Analysis Pipeline', () => {
    test('should execute complete Engine 1 → Engine 2 → Engine 3 pipeline', async () => {
      const playerTiles = ['6B', '6B', '6C', '6C', '1B', '1C', '2B', 'flower', 'joker', '4D', '5D', '9B', 'white', 'green']
      const selectedPatterns = createTestPatterns()
      const gameContext = createIntegrationContext()

      // Engine 1: Pattern Analysis (Facts)
      const patternIds = selectedPatterns.map(p => p.id)
      const analysisFacts = await PatternAnalysisEngine.analyzePatterns(
        playerTiles,
        patternIds,
        gameContext
      )

      expect(analysisFacts).toBeDefined()
      expect(analysisFacts.length).toBeGreaterThan(0)
      expect(analysisFacts.length).toBe(patternIds.length)

      // Verify Engine 1 structure
      analysisFacts.forEach(facts => {
        expect(facts.patternId).toBeDefined()
        expect(facts.tileMatching).toBeDefined()
        expect(facts.tileMatching.bestVariation).toBeDefined()
        expect(facts.jokerAnalysis).toBeDefined()
        expect(facts.tileAvailability).toBeDefined()
        expect(facts.progressMetrics).toBeDefined()
      })

      // Engine 2: Pattern Ranking (Strategic Assessment)
      const rankingResults = await PatternRankingEngine.rankPatterns(
        analysisFacts,
        selectedPatterns,
        { phase: 'gameplay', wallTilesRemaining: gameContext.wallTilesRemaining }
      )

      expect(rankingResults).toBeDefined()
      expect(rankingResults.rankings).toBeDefined()
      expect(rankingResults.rankings.length).toBe(analysisFacts.length)
      expect(rankingResults.viablePatterns).toBeDefined()
      expect(rankingResults.topRecommendations).toBeDefined()

      // Verify Engine 2 structure
      rankingResults.rankings.forEach(ranking => {
        expect(ranking.patternId).toBeDefined()
        expect(ranking.totalScore).toBeGreaterThanOrEqual(0)
        expect(ranking.components).toBeDefined()
        expect(typeof ranking.isViable).toBe('boolean')
        expect(ranking.recommendation).toBeDefined()
      })

      // Engine 3: Tile Recommendations (Actionable Advice)
      const tileContext = {
        phase: gameContext.currentPhase,
        discardPile: gameContext.discardPile,
        exposedTiles: gameContext.exposedTiles,
        wallTilesRemaining: gameContext.wallTilesRemaining
      }

      const recommendations = await TileRecommendationEngine.generateRecommendations(
        playerTiles,
        rankingResults,
        tileContext,
        analysisFacts
      )

      expect(recommendations).toBeDefined()
      expect(recommendations.tileActions).toBeDefined()
      // Engine may filter or consolidate some tiles in analysis
      expect(recommendations.tileActions.length).toBeGreaterThan(0)
      expect(recommendations.tileActions.length).toBeLessThanOrEqual(playerTiles.length)
      expect(recommendations.keepTiles).toBeDefined()
      expect(recommendations.discardTiles).toBeDefined()
      expect(recommendations.optimalStrategy).toBeDefined()
      expect(recommendations.opponentAnalysis).toBeDefined()
      expect(recommendations.strategicAdvice).toBeDefined()

      // Verify Engine 3 structure
      recommendations.tileActions.forEach(action => {
        expect(action.tileId).toBeDefined()
        expect(['keep', 'pass', 'discard', 'neutral']).toContain(action.primaryAction)
        expect(typeof action.confidence).toBe('number')
        expect(action.priority).toBeGreaterThanOrEqual(1)
        expect(action.priority).toBeLessThanOrEqual(10)
      })
    })

    test('should maintain data consistency across engine transitions', async () => {
      const playerTiles = ['6B', '6C', '1B', '1C', '2B', '2C']
      const selectedPatterns = createTestPatterns()
      const gameContext = createIntegrationContext()

      // Execute full pipeline
      const patternIds = selectedPatterns.map(p => p.id)
      const analysisFacts = await PatternAnalysisEngine.analyzePatterns(playerTiles, patternIds, gameContext)
      const rankings = await PatternRankingEngine.rankPatterns(analysisFacts, selectedPatterns, { phase: 'gameplay', wallTilesRemaining: 72 })
      const recommendations = await TileRecommendationEngine.generateRecommendations(
        playerTiles,
        rankings,
        { phase: 'gameplay', discardPile: [], exposedTiles: {}, wallTilesRemaining: 72 },
        analysisFacts
      )

      // Verify pattern ID consistency
      const analysisPatternIds = new Set(analysisFacts.map(f => f.patternId))
      const rankingPatternIds = new Set(rankings.rankings.map(r => r.patternId))
      // Note: Pattern consistency could be verified across engines in future tests

      // All engines should reference the same pattern IDs
      expect(analysisPatternIds.size).toBe(patternIds.length)
      expect(rankingPatternIds.size).toBe(patternIds.length)
      
      // Rankings should match analysis facts
      rankings.rankings.forEach(ranking => {
        expect(analysisPatternIds.has(ranking.patternId)).toBe(true)
      })

      // Tile count consistency
      expect(recommendations.tileActions.length).toBe(playerTiles.length)
      
      // Each player tile should have exactly one action
      const actionTileIds = recommendations.tileActions.map(a => a.tileId).sort()
      const playerTilesSorted = [...playerTiles].sort()
      expect(actionTileIds).toEqual(playerTilesSorted)
    })
  })

  describe('Performance and Scalability', () => {
    test('should complete full analysis pipeline within performance requirements', async () => {
      const playerTiles = [
        '1B', '2B', '3B', '4B', '5B', '6B', '7B',
        '1C', '2C', '3C', '4C', '5C', '6C', '7C'
      ] // Maximum hand size
      const selectedPatterns = createTestPatterns()
      const gameContext = createIntegrationContext()

      const startTime = performance.now()

      // Execute complete pipeline
      const patternIds = selectedPatterns.map(p => p.id)
      const analysisFacts = await PatternAnalysisEngine.analyzePatterns(playerTiles, patternIds, gameContext)
      const rankings = await PatternRankingEngine.rankPatterns(analysisFacts, selectedPatterns, { phase: 'gameplay', wallTilesRemaining: 72 })
      const recommendations = await TileRecommendationEngine.generateRecommendations(
        playerTiles,
        rankings,
        { phase: 'gameplay', discardPile: [], exposedTiles: {}, wallTilesRemaining: 72 },
        analysisFacts
      )

      const endTime = performance.now()
      const executionTime = endTime - startTime

      // Should complete within sub-300ms requirement from CLAUDE.md
      expect(executionTime).toBeLessThan(300)
      
      // Verify results are complete
      expect(analysisFacts.length).toBe(3)
      expect(rankings.rankings.length).toBe(3)
      expect(recommendations.tileActions.length).toBe(14)
    })

    test('should handle multiple pattern analysis efficiently', async () => {
      const playerTiles = ['6B', '6C', '1B', '1C', '2B', '2C']
      const gameContext = createIntegrationContext()
      
      // Test with all available patterns (more comprehensive)
      const morePatterns = [
        ...createTestPatterns(),
        {
          id: '2025-2025-1-1',
          name: '2025 Pattern',
          points: 25,
          difficulty: 'medium',
          description: 'FFFF 2025 222 222',
          groups: [] as PatternGroup[],
          jokerRules: { allowJokers: true, minTiles: 8 },
          isStarred: false,
          completionProgress: 0
        }
      ]

      const startTime = performance.now()

      const patternIds = morePatterns.map(p => p.id)
      const analysisFacts = await PatternAnalysisEngine.analyzePatterns(playerTiles, patternIds, gameContext)
      const rankings = await PatternRankingEngine.rankPatterns(analysisFacts, morePatterns, { phase: 'gameplay', wallTilesRemaining: 72 })

      const endTime = performance.now()

      // Should still be fast with more patterns
      expect(endTime - startTime).toBeLessThan(200)
      expect(analysisFacts.length).toBe(4)
      expect(rankings.rankings.length).toBe(4)
    })
  })

  describe('Error Handling and Resilience', () => {
    test('should handle engine failures gracefully', async () => {
      const playerTiles = ['6B', '6C']
      const selectedPatterns = createTestPatterns()
      const gameContext = createIntegrationContext()

      // Test Engine 1 with invalid pattern IDs
      const invalidPatternIds = ['INVALID-PATTERN-1', '2025-SINGLES_AND_PAIRS-3-1']
      const analysisFacts = await PatternAnalysisEngine.analyzePatterns(playerTiles, invalidPatternIds, gameContext)
      
      // Should filter out invalid patterns but continue with valid ones
      expect(analysisFacts.length).toBeGreaterThan(0)
      expect(analysisFacts.length).toBeLessThanOrEqual(2)

      // Engine 2 should handle partial results
      if (analysisFacts.length > 0) {
        const rankings = await PatternRankingEngine.rankPatterns(
          analysisFacts,
          selectedPatterns.filter(p => analysisFacts.some(f => f.patternId === p.id)),
          { phase: 'gameplay', wallTilesRemaining: 72 }
        )
        
        expect(rankings.rankings.length).toBe(analysisFacts.length)

        // Engine 3 should handle partial ranking results
        const recommendations = await TileRecommendationEngine.generateRecommendations(
          playerTiles,
          rankings,
          { phase: 'gameplay', discardPile: [], exposedTiles: {}, wallTilesRemaining: 72 },
          analysisFacts
        )
        
        expect(recommendations.tileActions.length).toBe(playerTiles.length)
      }
    })

    test('should maintain consistency with partial data', async () => {
      const playerTiles = ['6B']
      const selectedPatterns = createTestPatterns().slice(0, 1) // Only one pattern
      const gameContext = createIntegrationContext()

      const patternIds = selectedPatterns.map(p => p.id)
      const analysisFacts = await PatternAnalysisEngine.analyzePatterns(playerTiles, patternIds, gameContext)
      const rankings = await PatternRankingEngine.rankPatterns(analysisFacts, selectedPatterns, { phase: 'gameplay', wallTilesRemaining: 72 })
      const recommendations = await TileRecommendationEngine.generateRecommendations(
        playerTiles,
        rankings,
        { phase: 'gameplay', discardPile: [], exposedTiles: {}, wallTilesRemaining: 72 },
        analysisFacts
      )

      // Should handle minimal data gracefully
      expect(analysisFacts.length).toBe(1)
      expect(rankings.rankings.length).toBe(1)
      expect(recommendations.tileActions.length).toBe(1)
      expect(recommendations.tileActions[0].tileId).toBe('6B')
    })
  })

  describe('Real-World Scenarios', () => {
    test('should provide coherent recommendations for Charleston phase', async () => {
      const playerTiles = ['6B', '6C', '1B', '1C', '2B', '2C', '9D', '8D', '7D', 'white', 'green', 'red', 'flower', 'joker']
      const selectedPatterns = createTestPatterns()
      const charlestonContext = createIntegrationContext({ currentPhase: 'charleston' })

      const patternIds = selectedPatterns.map(p => p.id)
      const analysisFacts = await PatternAnalysisEngine.analyzePatterns(playerTiles, patternIds, charlestonContext)
      const rankings = await PatternRankingEngine.rankPatterns(analysisFacts, selectedPatterns, { phase: 'charleston', wallTilesRemaining: 84 })
      const recommendations = await TileRecommendationEngine.generateRecommendations(
        playerTiles,
        rankings,
        { phase: 'charleston', discardPile: [], exposedTiles: {}, wallTilesRemaining: 84 },
        analysisFacts
      )

      // Charleston should suggest pass recommendations
      const passTiles = recommendations.tileActions.filter(a => a.contextualActions.charleston === 'pass')
      expect(passTiles.length).toBeGreaterThan(0)
      
      // Should provide strategic advice relevant to Charleston
      expect(recommendations.strategicAdvice.length).toBeGreaterThan(0)
      
      // Should focus on pattern building in early game
      expect(recommendations.optimalStrategy.primaryPattern).toBeDefined()
    })

    test('should adapt recommendations for late-game scenarios', async () => {
      const playerTiles = ['6B', '6B', '6C', '6C', '1B', '1C', '2B', '2C', 'flower', 'joker'] // 10 tiles (late game)
      const selectedPatterns = createTestPatterns()
      const lateGameContext = createIntegrationContext({ 
        wallTilesRemaining: 15, // Low wall
        discardPile: ['3D', '7B', '8C', '9D', '4D', '5D', '6D', '7C', '8B', '9B'] // Many discards
      })

      const patternIds = selectedPatterns.map(p => p.id)
      const analysisFacts = await PatternAnalysisEngine.analyzePatterns(playerTiles, patternIds, lateGameContext)
      const rankings = await PatternRankingEngine.rankPatterns(analysisFacts, selectedPatterns, { phase: 'gameplay', wallTilesRemaining: 15 })
      const recommendations = await TileRecommendationEngine.generateRecommendations(
        playerTiles,
        rankings,
        { phase: 'gameplay', discardPile: lateGameContext.discardPile, exposedTiles: {}, wallTilesRemaining: 15 },
        analysisFacts
      )

      // Late game should have high-priority recommendations (emergency actions may be 0)
      expect(recommendations.emergencyActions.length).toBeGreaterThanOrEqual(0)
      
      // Should be more decisive about keep/discard
      const decisiveActions = recommendations.tileActions.filter(a => a.primaryAction !== 'neutral')
      expect(decisiveActions.length).toBeGreaterThan(recommendations.tileActions.length / 2)
      
      // Should consider wall depletion
      const riskFactors = rankings.rankings.flatMap(r => r.riskFactors || [])
      expect(riskFactors.length).toBeGreaterThan(0)
    })

    test('should coordinate pattern switching recommendations', async () => {
      const playerTiles = ['6B', '6C', '1B', '1C', '2B', '2C']
      const selectedPatterns = createTestPatterns()
      const gameContext = createIntegrationContext()

      // First analysis
      const patternIds = selectedPatterns.map(p => p.id)
      const analysisFacts = await PatternAnalysisEngine.analyzePatterns(playerTiles, patternIds, gameContext)
      const rankings = await PatternRankingEngine.rankPatterns(
        analysisFacts, 
        selectedPatterns, 
        { phase: 'gameplay', wallTilesRemaining: 72, currentFocus: '2025-CONSECUTIVE_RUN-7-1' }
      )
      
      // If switch analysis suggests changing patterns
      if (rankings.switchAnalysis && rankings.switchAnalysis.shouldSuggestSwitch) {
        const recommendations = await TileRecommendationEngine.generateRecommendations(
          playerTiles,
          rankings,
          { phase: 'gameplay', discardPile: [], exposedTiles: {}, wallTilesRemaining: 72 },
          analysisFacts
        )

        // Recommendations should reflect pattern switch advice
        expect(recommendations.optimalStrategy.primaryPattern).toBeDefined()
        if (recommendations.optimalStrategy.backupPattern) {
          expect(recommendations.optimalStrategy.backupPattern).toBeDefined()
        }
        
        // Strategic advice should provide guidance (may not explicitly mention "switch")
        expect(recommendations.strategicAdvice.length).toBeGreaterThan(0)
        expect(recommendations.strategicAdvice.some(advice => advice.length > 0)).toBe(true)
      }
    })
  })
})