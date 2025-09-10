import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AnalysisEngine } from '../analysis-engine'
import { nmjlService } from '../nmjl-service'
import { PatternAnalysisEngine } from '../pattern-analysis-engine'
import { PatternRankingEngine } from '../pattern-ranking-engine'
import { TileRecommendationEngine } from '../tile-recommendation-engine'
import {
  createTile,
  createPatternSelection,
  createAnalysisFacts,
  createRankedPatternResults,
  TilePresets,
} from '../../__tests__/factories'

// Mock the service dependencies
vi.mock('../nmjl-service')
vi.mock('../pattern-analysis-engine')
vi.mock('../pattern-ranking-engine') 
vi.mock('../tile-recommendation-engine')

describe('Analysis Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock default responses from each engine
    vi.mocked(nmjlService.getSelectionOptions).mockResolvedValue([
      createPatternSelection({ id: 'pattern1' }),
      createPatternSelection({ id: 'pattern2' })
    ])
    
    vi.mocked(PatternAnalysisEngine.analyzePatterns).mockResolvedValue([
      createAnalysisFacts({ patternId: 'pattern1', tilesMatched: 7 }),
      createAnalysisFacts({ patternId: 'pattern2', tilesMatched: 5 })
    ])
    
    vi.mocked(PatternRankingEngine.rankPatterns).mockResolvedValue(
      createRankedPatternResults({
        patterns: [
          createPatternSelection({ id: 'pattern1' }),
          createPatternSelection({ id: 'pattern2' })
        ]
      })
    )
    
    // Use implementation that works with correct parameter types
    vi.mocked(TileRecommendationEngine.generateRecommendations).mockImplementation(() => {
      return Promise.resolve({
        tileActions: [
          {
            tileId: '1B',
            primaryAction: 'keep',
            confidence: 0.85,
            reasoning: 'Critical for primary pattern',
            priority: 9
          },
          {
            tileId: '7C',
            primaryAction: 'discard',
            confidence: 0.7,
            reasoning: 'Low strategic value',
            priority: 3
          }
        ],
        strategicAdvice: ['Focus on completing primary pattern', 'Consider joker substitution']
      })
    })
  })

  describe('Core Analysis Flow', () => {
    it('should orchestrate 3-engine analysis successfully', async () => {
      const tiles = TilePresets.mixedHand()
      const patterns = [createPatternSelection({ id: 'test-pattern' })]
      
      const result = await AnalysisEngine.analyzeHand(tiles, patterns)
      
      // Verify all engines were called
      expect(PatternAnalysisEngine.analyzePatterns).toHaveBeenCalledWith(
        tiles.map(t => t.id),
        patterns.map(p => p.id),
        expect.objectContaining({
          jokersInHand: expect.any(Number),
          wallTilesRemaining: expect.any(Number),
          currentPhase: expect.any(String)
        })
      )
      
      expect(PatternRankingEngine.rankPatterns).toHaveBeenCalled()
      expect(TileRecommendationEngine.generateRecommendations).toHaveBeenCalled()
      
      // Verify output structure
      expect(result).toMatchObject({
        overallScore: expect.any(Number),
        recommendedPatterns: expect.any(Array),
        bestPatterns: expect.any(Array),
        tileRecommendations: expect.any(Array),
        strategicAdvice: expect.any(Array),
        threats: expect.any(Array),
        lastUpdated: expect.any(Number),
        analysisVersion: 'AV3-ThreeEngine',
        engine1Facts: expect.any(Array)
      })
    })

    it('should use provided patterns when given', async () => {
      const tiles = TilePresets.mixedHand()
      const patterns = [
        createPatternSelection({ id: 'custom1' }),
        createPatternSelection({ id: 'custom2' })
      ]
      
      await AnalysisEngine.analyzeHand(tiles, patterns)
      
      expect(PatternAnalysisEngine.analyzePatterns).toHaveBeenCalledWith(
        tiles.map(t => t.id),
        expect.arrayContaining([
          expect.stringContaining('custom1'),
          expect.stringContaining('custom2')
        ]),
        expect.objectContaining({
          jokersInHand: expect.any(Number),
          wallTilesRemaining: expect.any(Number),
          currentPhase: expect.any(String)
        })
      )
      
      // Should not load all patterns when specific ones are provided
      expect(nmjlService.getSelectionOptions).not.toHaveBeenCalled()
    })

    it('should load all patterns when none provided', async () => {
      const tiles = TilePresets.mixedHand()
      
      await AnalysisEngine.analyzeHand(tiles, [])
      
      expect(nmjlService.getSelectionOptions).toHaveBeenCalled()
      expect(PatternAnalysisEngine.analyzePatterns).toHaveBeenCalledWith(
        tiles.map(t => t.id),
        expect.arrayContaining([
          expect.stringContaining('pattern1'),
          expect.stringContaining('pattern2')
        ]), // From mocked service response with prefixes
        expect.objectContaining({
          jokersInHand: expect.any(Number),
          wallTilesRemaining: expect.any(Number),
          currentPhase: expect.any(String)
        })
      )
    })
  })

  describe('Game Context Handling', () => {
    it('should create default game context when none provided', async () => {
      const tiles = TilePresets.mixedHand()
      const patterns = [createPatternSelection()]
      
      await AnalysisEngine.analyzeHand(tiles, patterns)
      
      expect(PatternAnalysisEngine.analyzePatterns).toHaveBeenCalledWith(
        tiles.map(t => t.id),
        patterns.map(p => p.id),
        expect.objectContaining({
          jokersInHand: expect.any(Number),
          wallTilesRemaining: 80, // Default value
          discardPile: [],
          exposedTiles: {},
          currentPhase: 'charleston'
        })
      )
    })

    it('should merge provided game context with defaults', async () => {
      const tiles = TilePresets.mixedHand()
      const patterns = [createPatternSelection()]
      const gameContext = {
        wallTilesRemaining: 50,
        currentPhase: 'gameplay' as const,
        discardPile: ['1B', '2C']
      }
      
      await AnalysisEngine.analyzeHand(tiles, patterns, gameContext)
      
      expect(PatternAnalysisEngine.analyzePatterns).toHaveBeenCalledWith(
        tiles.map(t => t.id),
        patterns.map(p => p.id),
        expect.objectContaining({
          wallTilesRemaining: 50,
          currentPhase: 'gameplay',
          discardPile: ['1B', '2C'],
          exposedTiles: {}, // Still uses default
          jokersInHand: expect.any(Number)
        })
      )
    })

    it('should correctly count jokers in hand', async () => {
      const tiles = [
        createTile({ id: '1B' }),
        createTile({ id: 'joker', isJoker: true }),
        createTile({ id: 'joker2', suit: 'jokers' }),
        createTile({ id: '2C' })
      ]
      const patterns = [createPatternSelection()]
      
      await AnalysisEngine.analyzeHand(tiles, patterns)
      
      expect(PatternAnalysisEngine.analyzePatterns).toHaveBeenCalledWith(
        tiles.map(t => t.id),
        patterns.map(p => p.id),
        expect.objectContaining({
          jokersInHand: 2 // Should count both joker tiles
        })
      )
    })
  })

  describe('Result Conversion', () => {
    it('should convert pattern rankings to recommended patterns format', async () => {
      const mockPatternRankings = createRankedPatternResults({
        patterns: [createPatternSelection({ id: 'test1', difficulty: 'easy', points: 25 })]
      })
      
      vi.mocked(PatternRankingEngine.rankPatterns).mockResolvedValue(mockPatternRankings)
      
      const result = await AnalysisEngine.analyzeHand(TilePresets.mixedHand(), [])
      
      expect(result.recommendedPatterns.length).toBeGreaterThan(0) // Based on actual pattern rankings
      expect(result.recommendedPatterns[0]).toMatchObject({
        pattern: expect.any(Object),
        confidence: expect.any(Number),
        completionPercentage: expect.any(Number),
        reasoning: expect.any(String),
        difficulty: expect.any(String),
        isPrimary: expect.any(Boolean),
        scoreBreakdown: expect.objectContaining({
          currentTileScore: expect.any(Number),
          availabilityScore: expect.any(Number),
          jokerScore: expect.any(Number),
          priorityScore: expect.any(Number)
        })
      })
    })

    it('should convert tile actions to tile recommendations format', async () => {
      const result = await AnalysisEngine.analyzeHand(TilePresets.mixedHand(), [])
      
      expect(result.tileRecommendations).toHaveLength(2) // Based on mock response
      expect(result.tileRecommendations[0]).toMatchObject({
        tileId: '1B',
        action: 'keep',
        confidence: 0.85,
        reasoning: 'Critical for primary pattern',
        priority: 9
      })
      expect(result.tileRecommendations[1]).toMatchObject({
        tileId: '7C',
        action: 'discard',
        confidence: 0.7,
        reasoning: 'Low strategic value',
        priority: 3
      })
    })

    it('should normalize tile actions correctly', async () => {
      vi.mocked(TileRecommendationEngine.generateRecommendations).mockResolvedValue({
        tileActions: [
          { tileId: '1B', primaryAction: 'hold', confidence: 0.8, reasoning: 'test', priority: 5 },
          { tileId: '2C', primaryAction: 'charleston', confidence: 0.6, reasoning: 'test', priority: 3 },
          { tileId: '3D', primaryAction: 'drop', confidence: 0.4, reasoning: 'test', priority: 1 }
        ],
        strategicAdvice: []
      })
      
      const result = await AnalysisEngine.analyzeHand(TilePresets.mixedHand(), [])
      
      expect(result.tileRecommendations[0].action).toBe('keep') // hold -> keep
      expect(result.tileRecommendations[1].action).toBe('pass') // charleston -> pass
      expect(result.tileRecommendations[2].action).toBe('discard') // drop -> discard
    })
  })

  describe('Caching System', () => {
    it('should cache Engine 1 results for identical requests', async () => {
      const tiles = TilePresets.mixedHand()
      const patterns = [createPatternSelection({ id: 'test' })]
      
      // First analysis
      await AnalysisEngine.analyzeHand(tiles, patterns)
      expect(PatternAnalysisEngine.analyzePatterns).toHaveBeenCalledTimes(1)
      
      // Second identical analysis - should use cache
      await AnalysisEngine.analyzeHand(tiles, patterns)
      expect(PatternAnalysisEngine.analyzePatterns).toHaveBeenCalledTimes(1) // Still only called once
    })

    it('should bypass cache for different hands', async () => {
      const tiles1 = [createTile({ id: '1B' })]
      const tiles2 = [createTile({ id: '2B' })]
      const patterns = [createPatternSelection()]
      
      await AnalysisEngine.analyzeHand(tiles1, patterns)
      await AnalysisEngine.analyzeHand(tiles2, patterns)
      
      expect(PatternAnalysisEngine.analyzePatterns).toHaveBeenCalledTimes(2)
    })

    it('should bypass cache for different patterns', async () => {
      const tiles = TilePresets.mixedHand()
      const patterns1 = [createPatternSelection({ id: 'pattern1' })]
      const patterns2 = [createPatternSelection({ id: 'pattern2' })]
      
      await AnalysisEngine.analyzeHand(tiles, patterns1)
      await AnalysisEngine.analyzeHand(tiles, patterns2)
      
      expect(PatternAnalysisEngine.analyzePatterns).toHaveBeenCalledTimes(2)
    })

    it('should bypass cache for different game contexts', async () => {
      const tiles = TilePresets.mixedHand()
      const patterns = [createPatternSelection()]
      
      await AnalysisEngine.analyzeHand(tiles, patterns, { wallTilesRemaining: 50 })
      await AnalysisEngine.analyzeHand(tiles, patterns, { wallTilesRemaining: 30 })
      
      expect(PatternAnalysisEngine.analyzePatterns).toHaveBeenCalledTimes(2)
    })

    it('should clear cache for hand changes', () => {
      const oldTiles = ['1B', '2B', '3B']
      const newTiles = ['1B', '2B', '4B'] // Changed one tile
      
      // This should clear cache entries for the old hand
      expect(() => AnalysisEngine.clearCacheForHandChange(oldTiles, newTiles)).not.toThrow()
    })

    it('should not clear cache when hand unchanged', () => {
      const tiles = ['1B', '2B', '3B']
      
      // This should not clear cache as hand is identical
      expect(() => AnalysisEngine.clearCacheForHandChange(tiles, tiles)).not.toThrow()
    })

    it('should provide cache statistics', () => {
      const stats = AnalysisEngine.getCacheStats()
      
      expect(stats).toMatchObject({
        size: expect.any(Number)
      })
    })
  })

  describe('Pattern Analysis Details', () => {
    it('should calculate completion percentage from current tile score', async () => {
      const mockRankings = createRankedPatternResults({
        patterns: [createPatternSelection({ id: 'test' })]
      })
      
      // Mock a ranking with specific current tile score
      mockRankings.topRecommendations[0].components.currentTileScore = 20 // 50% completion
      
      vi.mocked(PatternRankingEngine.rankPatterns).mockResolvedValue(mockRankings)
      
      const result = await AnalysisEngine.analyzeHand(TilePresets.mixedHand(), [])
      
      expect(result.recommendedPatterns[0].completionPercentage).toBe(50) // 20/40 * 100
      expect(result.bestPatterns[0].completionPercentage).toBe(50)
    })

    it('should extract matching groups from analysis facts', async () => {
      const mockFacts = [createAnalysisFacts({
        patternId: 'test',
        tileContributions: [
          { tileId: '1B', positionsInPattern: [0], isRequired: true, isCritical: true, canBeReplaced: false },
          { tileId: '2B', positionsInPattern: [1], isRequired: true, isCritical: false, canBeReplaced: true }
        ]
      })]
      
      vi.mocked(PatternAnalysisEngine.analyzePatterns).mockResolvedValue(mockFacts)
      
      const result = await AnalysisEngine.analyzeHand(TilePresets.mixedHand(), [createPatternSelection({ id: 'test' })])
      
      // Should extract matching groups from tile contributions
      expect(result.recommendedPatterns[0].analysis?.currentTiles.matchingGroups).toBeDefined()
    })

    it('should calculate strategic value from pattern ranking components', async () => {
      const result = await AnalysisEngine.analyzeHand(TilePresets.mixedHand(), [])
      
      expect(result.recommendedPatterns[0].analysis?.strategicValue).toMatchObject({
        tilePriorities: expect.any(Object),
        groupPriorities: expect.any(Object),
        overallPriority: expect.any(Number),
        reasoning: expect.any(Array)
      })
    })
  })

  describe('Error Handling', () => {

    it('should handle Pattern Analysis Engine errors', async () => {
      vi.mocked(nmjlService.getSelectionOptions).mockReset().mockResolvedValue([createPatternSelection()])
      vi.mocked(PatternAnalysisEngine.analyzePatterns).mockReset().mockRejectedValue(new Error('Engine 1 failed'))
      
      await expect(AnalysisEngine.analyzeHand(TilePresets.mixedHand(), [])).rejects.toThrow('Analysis engine failure: Engine 1 failed')
    })

    it('should handle Pattern Ranking Engine errors', async () => {
      vi.mocked(nmjlService.getSelectionOptions).mockReset().mockResolvedValue([createPatternSelection()])
      vi.mocked(PatternAnalysisEngine.analyzePatterns).mockReset().mockResolvedValue([createAnalysisFacts()])
      vi.mocked(PatternRankingEngine.rankPatterns).mockReset().mockRejectedValue(new Error('Engine 2 failed'))
      
      await expect(AnalysisEngine.analyzeHand(TilePresets.mixedHand(), [])).rejects.toThrow('Analysis engine failure: Engine 2 failed')
    })

    it('should handle Tile Recommendation Engine errors', async () => {
      vi.mocked(nmjlService.getSelectionOptions).mockReset().mockResolvedValue([createPatternSelection()])
      vi.mocked(PatternAnalysisEngine.analyzePatterns).mockReset().mockResolvedValue([createAnalysisFacts()])
      vi.mocked(PatternRankingEngine.rankPatterns).mockReset().mockResolvedValue(createRankedPatternResults())
      vi.mocked(TileRecommendationEngine.generateRecommendations).mockReset().mockRejectedValue(new Error('Engine 3 failed'))
      
      await expect(AnalysisEngine.analyzeHand(TilePresets.mixedHand(), [])).rejects.toThrow('Analysis engine failure: Engine 3 failed')
    })

    it('should handle NMJL service errors gracefully', async () => {
      vi.mocked(nmjlService.getSelectionOptions).mockReset().mockRejectedValue(new Error('Pattern loading failed'))
      
      await expect(AnalysisEngine.analyzeHand(TilePresets.mixedHand(), [])).rejects.toThrow('Analysis engine failure: Pattern loading failed')
    })

    it('should handle non-Error exceptions', async () => {
      vi.mocked(nmjlService.getSelectionOptions).mockReset().mockResolvedValue([createPatternSelection()])
      vi.mocked(PatternAnalysisEngine.analyzePatterns).mockReset().mockRejectedValue('String error')
      
      await expect(AnalysisEngine.analyzeHand(TilePresets.mixedHand(), [])).rejects.toThrow('Analysis engine failure: Unknown error')
    })
  })

  describe('Performance and Edge Cases', () => {
    it('should handle empty tile arrays', async () => {
      const result = await AnalysisEngine.analyzeHand([], [createPatternSelection()])
      
      expect(result).toBeDefined()
      expect(result.tileRecommendations).toBeDefined()
      expect(result.recommendedPatterns).toBeDefined()
    })

    it('should handle empty pattern arrays', async () => {
      const result = await AnalysisEngine.analyzeHand(TilePresets.mixedHand(), [])
      
      expect(result).toBeDefined()
      expect(nmjlService.getSelectionOptions).toHaveBeenCalled() // Should load patterns
    })

    it('should handle large numbers of patterns efficiently', async () => {
      const manyPatterns = Array.from({ length: 50 }, (_, i) => 
        createPatternSelection({ id: `pattern-${i}` })
      )
      
      const startTime = performance.now()
      const result = await AnalysisEngine.analyzeHand(TilePresets.mixedHand(), manyPatterns)
      const duration = performance.now() - startTime
      
      expect(result).toBeDefined()
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
    })

    it('should handle patterns with missing data gracefully', async () => {
      const mockRankings = createRankedPatternResults({
        patterns: [createPatternSelection({ id: 'missing-pattern' })]
      })
      
      mockRankings.topRecommendations[0].patternId = 'nonexistent-pattern'
      vi.mocked(PatternRankingEngine.rankPatterns).mockResolvedValue(mockRankings)
      
      const result = await AnalysisEngine.analyzeHand(TilePresets.mixedHand(), [])
      
      expect(result.recommendedPatterns[0].pattern).toMatchObject({
        id: 'nonexistent-pattern',
        displayName: 'nonexistent-pattern' // Fallback values
      })
    })
  })

  describe('Integration Points', () => {
    it('should pass Engine 1 facts to Engine 3', async () => {
      const mockFacts = [createAnalysisFacts({ patternId: 'test' })]
      vi.mocked(PatternAnalysisEngine.analyzePatterns).mockResolvedValue(mockFacts)
      
      await AnalysisEngine.analyzeHand(TilePresets.mixedHand(), [])
      
      expect(TileRecommendationEngine.generateRecommendations).toHaveBeenCalledWith(
        expect.any(Array), // tileIds
        expect.any(Object), // patternRankings
        expect.any(Object), // context
        mockFacts // Engine 1 facts should be passed to Engine 3
      )
    })

    it('should maintain engine1Facts in result for UI access', async () => {
      const result = await AnalysisEngine.analyzeHand(TilePresets.mixedHand(), [])
      
      expect(result.engine1Facts).toBeDefined()
      expect(result.engine1Facts).toHaveLength(2) // Based on default mock
    })

    it('should sort recommendations by completion percentage', async () => {
      const mockRankings = createRankedPatternResults({
        patterns: [
          createPatternSelection({ id: 'low-completion' }),
          createPatternSelection({ id: 'high-completion' })
        ]
      })
      
      // Set different completion scores
      mockRankings.topRecommendations[0].components.currentTileScore = 10 // 25%
      mockRankings.topRecommendations[1].components.currentTileScore = 30 // 75%
      
      vi.mocked(PatternRankingEngine.rankPatterns).mockResolvedValue(mockRankings)
      
      const result = await AnalysisEngine.analyzeHand(TilePresets.mixedHand(), [])
      
      // Should be sorted by completion (highest first)
      expect(result.recommendedPatterns[0].completionPercentage).toBe(75)
      expect(result.recommendedPatterns[1].completionPercentage).toBe(25)
    })
  })
})