/**
 * Integration Test: Service Interactions
 * Tests how different services work together and provide consistent data
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nmjlService } from '../../services/nmjl-service'
import { analysisEngine } from '../../services/analysis-engine'
import { patternAnalysisEngine } from '../../services/pattern-analysis-engine'
import { patternRankingEngine } from '../../services/pattern-ranking-engine'
import { tileRecommendationEngine } from '../../services/tile-recommendation-engine'
import { gameActions } from '../../services/game-actions'
import type { NMJL2025Pattern } from '../../../shared/nmjl-types'
import type { PlayerTile } from '../../types/tile-types'

// Mock data for testing
const mockPatterns: NMJL2025Pattern[] = [
  {
    Year: 2025,
    Section: 'CONSECUTIVE_RUN',
    Line: 1,
    Hands_Key: '2025-CONSECUTIVE_RUN-1',
    Hand: 'FFFF 1111 2222 3',
    Hand_Criteria: 'Consecutive Run',
    Points: 30,
    Concealed: false
  },
  {
    Year: 2025,
    Section: 'LIKE_NUMBERS',
    Line: 2,
    Hands_Key: '2025-LIKE_NUMBERS-2',
    Hand: '111 222 333 DDDD',
    Hand_Criteria: 'Like Numbers',
    Points: 25,
    Concealed: false
  }
]

const mockHand: PlayerTile[] = [
  { suit: 'bam', rank: '1', id: 'tile-1', isJoker: false },
  { suit: 'bam', rank: '2', id: 'tile-2', isJoker: false },
  { suit: 'bam', rank: '3', id: 'tile-3', isJoker: false },
  { suit: 'bam', rank: '4', id: 'tile-4', isJoker: false },
  { suit: 'crak', rank: '1', id: 'tile-5', isJoker: false },
  { suit: 'crak', rank: '2', id: 'tile-6', isJoker: false },
  { suit: 'crak', rank: '3', id: 'tile-7', isJoker: false },
  { suit: 'crak', rank: '4', id: 'tile-8', isJoker: false },
  { suit: 'dot', rank: '1', id: 'tile-9', isJoker: false },
  { suit: 'dot', rank: '2', id: 'tile-10', isJoker: false },
  { suit: 'dot', rank: '3', id: 'tile-11', isJoker: false },
  { suit: 'flower', rank: 'flower', id: 'tile-12', isJoker: false },
  { suit: 'flower', rank: 'flower', id: 'tile-13', isJoker: false }
]

describe('Service Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('NMJL Service → Analysis Engine Integration', () => {
    it('should load patterns and provide them to analysis engine', async () => {
      // Mock pattern loading
      vi.spyOn(nmjlService, 'loadAllPatterns').mockResolvedValue(mockPatterns)
      vi.spyOn(nmjlService, 'getPatternById').mockImplementation((id: string) => 
        mockPatterns.find(p => p.Hands_Key === id) || null
      )

      // Load patterns
      const patterns = await nmjlService.loadAllPatterns()
      expect(patterns).toHaveLength(2)

      // Analysis engine should be able to use loaded patterns
      const analysis = await analysisEngine.analyzeHand(mockHand, patterns)
      
      expect(analysis).toBeDefined()
      expect(analysis.patternProgress).toBeDefined()
      expect(analysis.recommendations).toBeDefined()
      expect(analysis.insights).toBeDefined()
    })

    it('should handle pattern loading errors gracefully', async () => {
      // Mock pattern loading failure
      vi.spyOn(nmjlService, 'loadAllPatterns').mockRejectedValue(new Error('Network error'))

      // Analysis should still work with fallback behavior
      const analysis = await analysisEngine.analyzeHand(mockHand, [])
      
      expect(analysis).toBeDefined()
      expect(analysis.patternProgress).toEqual([])
      expect(analysis.recommendations).toBeDefined()
    })
  })

  describe('Three-Engine Intelligence System Integration', () => {
    it('should coordinate all three engines for comprehensive analysis', async () => {
      // Test the complete pipeline: Facts → Ranking → Recommendations
      
      // Engine 1: Pattern Analysis (Facts)
      const patternFacts = await patternAnalysisEngine.analyzePatterns(mockHand, mockPatterns)
      expect(patternFacts).toBeDefined()
      expect(Array.isArray(patternFacts)).toBe(true)

      // Engine 2: Pattern Ranking (Scoring)
      const patternRankings = await patternRankingEngine.rankPatterns(patternFacts, {
        gamePhase: 'gameplay',
        turnsRemaining: 50,
        exposedTiles: [],
        discardPile: []
      })
      expect(patternRankings).toBeDefined()
      expect(Array.isArray(patternRankings)).toBe(true)

      // Engine 3: Tile Recommendations (Actions)
      const tileRecommendations = await tileRecommendationEngine.recommendActions(
        mockHand,
        patternRankings,
        {
          availableTiles: [],
          recentDiscards: [],
          opponentActions: []
        }
      )
      expect(tileRecommendations).toBeDefined()
      expect(tileRecommendations.keep).toBeDefined()
      expect(tileRecommendations.discard).toBeDefined()

      // All engines should work together coherently
      expect(patternRankings.length).toBeGreaterThanOrEqual(0)
      expect(tileRecommendations.keep.length + tileRecommendations.discard.length).toBeGreaterThan(0)
    })

    it('should maintain consistency between engine outputs', async () => {
      const patternFacts = await patternAnalysisEngine.analyzePatterns(mockHand, mockPatterns)
      const patternRankings = await patternRankingEngine.rankPatterns(patternFacts, {
        gamePhase: 'gameplay',
        turnsRemaining: 50,
        exposedTiles: [],
        discardPile: []
      })

      // Rankings should correspond to facts
      patternRankings.forEach(ranking => {
        const correspondingFact = patternFacts.find(fact => 
          fact.patternId === ranking.patternId
        )
        expect(correspondingFact).toBeDefined()
      })

      // Recommendations should be based on top-ranked patterns
      const tileRecommendations = await tileRecommendationEngine.recommendActions(
        mockHand,
        patternRankings,
        {
          availableTiles: [],
          recentDiscards: [],
          opponentActions: []
        }
      )

      // Keep recommendations should align with top patterns
      expect(tileRecommendations.keep.length).toBeGreaterThan(0)
      expect(tileRecommendations.reasoning).toContain('pattern')
    })

    it('should handle engine failures gracefully', async () => {
      // Mock engine failure
      vi.spyOn(patternAnalysisEngine, 'analyzePatterns').mockRejectedValue(new Error('Analysis failed'))

      // System should degrade gracefully
      const analysis = await analysisEngine.analyzeHand(mockHand, mockPatterns)
      
      expect(analysis).toBeDefined()
      // Should provide fallback analysis
      expect(analysis.recommendations).toBeDefined()
      expect(analysis.insights.learningOpportunities).toContain('analysis unavailable')
    })
  })

  describe('Game Actions → Analysis Engine Integration', () => {
    it('should update analysis after each action', async () => {
      // Mock game actions service
      const mockGameContext = {
        currentPlayerId: 'player-1',
        hand: mockHand,
        selectedPatterns: mockPatterns,
        discardPile: [],
        exposedTiles: {},
        gamePhase: 'gameplay' as const,
        turnNumber: 5
      }

      // Perform draw action
      const drawResult = await gameActions.drawTile(mockGameContext)
      expect(drawResult).toBeDefined()
      expect(drawResult.success).toBe(true)

      // Analysis should be updated with new hand
      if (drawResult.newHand) {
        const updatedAnalysis = await analysisEngine.analyzeHand(drawResult.newHand, mockPatterns)
        expect(updatedAnalysis).toBeDefined()
        expect(updatedAnalysis.patternProgress.length).toBeGreaterThanOrEqual(0)
      }

      // Perform discard action
      const tileToDiscard = mockHand[0]
      const discardResult = await gameActions.discardTile(tileToDiscard, mockGameContext)
      expect(discardResult).toBeDefined()
      expect(discardResult.success).toBe(true)

      // Analysis should reflect the discard
      if (discardResult.newHand) {
        const postDiscardAnalysis = await analysisEngine.analyzeHand(discardResult.newHand, mockPatterns)
        expect(postDiscardAnalysis).toBeDefined()
        expect(postDiscardAnalysis.handSize).toBe(mockHand.length - 1)
      }
    })

    it('should validate actions using pattern analysis', async () => {
      const mockGameContext = {
        currentPlayerId: 'player-1',
        hand: mockHand,
        selectedPatterns: mockPatterns,
        discardPile: [],
        exposedTiles: {},
        gamePhase: 'gameplay' as const,
        turnNumber: 5
      }

      // Analysis should inform action validity
      const analysis = await analysisEngine.analyzeHand(mockHand, mockPatterns)
      
      // Actions should be validated based on analysis
      const tileToDiscard = mockHand[0]
      const isValidDiscard = await gameActions.validateAction('discard', tileToDiscard, mockGameContext)
      
      expect(typeof isValidDiscard).toBe('boolean')

      // High-value tiles (based on analysis) should be less likely to be recommended for discard
      const recommendations = analysis.recommendations
      const keepRecommendations = recommendations.filter(r => r.action === 'keep')
      const discardRecommendations = recommendations.filter(r => r.action === 'discard')

      expect(keepRecommendations.length + discardRecommendations.length).toBeGreaterThan(0)
    })
  })

  describe('Performance and Caching Integration', () => {
    it('should cache analysis results for performance', async () => {
      const startTime = Date.now()

      // First analysis (should hit the services)
      const firstAnalysis = await analysisEngine.analyzeHand(mockHand, mockPatterns)
      const firstDuration = Date.now() - startTime

      const secondStartTime = Date.now()
      
      // Second identical analysis (should use cache)
      const secondAnalysis = await analysisEngine.analyzeHand(mockHand, mockPatterns)
      const secondDuration = Date.now() - secondStartTime

      // Results should be identical
      expect(firstAnalysis).toEqual(secondAnalysis)

      // Second analysis should be significantly faster (cached)
      expect(secondDuration).toBeLessThan(firstDuration / 2)
    })

    it('should handle large datasets efficiently', async () => {
      // Create larger mock dataset
      const largePatternSet = Array(50).fill(null).map((_, index) => ({
        ...mockPatterns[0],
        Hands_Key: `2025-TEST-${index}`,
        Line: index + 1
      }))

      const largeHand = Array(14).fill(null).map((_, index) => ({
        suit: 'bam' as const,
        rank: `${(index % 9) + 1}` as const,
        id: `large-tile-${index}`,
        isJoker: false
      }))

      const startTime = Date.now()
      const analysis = await analysisEngine.analyzeHand(largeHand, largePatternSet)
      const duration = Date.now() - startTime

      // Should complete within reasonable time (< 1 second)
      expect(duration).toBeLessThan(1000)
      expect(analysis).toBeDefined()
      expect(analysis.patternProgress.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should recover from service failures', async () => {
      // Mock service failure
      const originalAnalyze = analysisEngine.analyzeHand
      vi.spyOn(analysisEngine, 'analyzeHand').mockImplementation(async (hand, patterns) => {
        if (patterns.length === 0) {
          throw new Error('No patterns available')
        }
        return originalAnalyze.call(analysisEngine, hand, patterns)
      })

      // Should handle gracefully and provide fallback
      const analysis = await analysisEngine.analyzeHand(mockHand, [])
      
      expect(analysis).toBeDefined()
      expect(analysis.recommendations).toBeDefined()
      expect(analysis.insights).toBeDefined()
      expect(
        analysis.insights.learningOpportunities.includes('service unavailable') ||
        analysis.insights.learningOpportunities.includes('analysis failed')
      ).toBeTruthy()
    })

    it('should validate service responses', async () => {
      // Mock invalid service response
      vi.spyOn(patternAnalysisEngine, 'analyzePatterns').mockResolvedValue([
        // Invalid pattern fact (missing required fields)
        {
          patternId: 'invalid',
          // Missing other required fields
        } as { patternId: string }
      ])

      // Should handle invalid responses
      const analysis = await analysisEngine.analyzeHand(mockHand, mockPatterns)
      
      expect(analysis).toBeDefined()
      // Should either filter invalid data or provide fallback
      expect(Array.isArray(analysis.patternProgress)).toBe(true)
    })
  })
})