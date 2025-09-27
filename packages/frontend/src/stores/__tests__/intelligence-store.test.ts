import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useIntelligenceStore } from '../intelligence-store'
import type { PatternAnalysis } from '../intelligence-store'
import {
  createTileRecommendation,
  AnalysisPresets,
  createTurnIntelligenceGameState,
  createTile
} from '../../__tests__/factories'

// Helper factory for intelligence store PatternAnalysis (different from engine PatternAnalysisFacts)
function createIntelligencePatternAnalysis(options: Partial<PatternAnalysis> = {}): PatternAnalysis {
  return {
    patternId: options.patternId || 'test-pattern',
    section: options.section || 'TEST',
    line: options.line || 1,
    pattern: options.pattern || 'Test Pattern',
    groups: options.groups || [],
    completionPercentage: options.completionPercentage ?? 50,
    tilesNeeded: options.tilesNeeded ?? 5,
    missingTiles: options.missingTiles || ['1B', '2B'],
    confidenceScore: options.confidenceScore ?? 75,
    difficulty: options.difficulty || 'medium',
    estimatedTurns: options.estimatedTurns ?? 8,
    riskLevel: options.riskLevel || 'medium',
    strategicValue: options.strategicValue ?? 5
  }
}

// Mock the analysis engine
vi.mock('../../lib/services/analysis-engine-lazy', () => ({
  lazyAnalysisEngine: {
    analyzeHand: vi.fn(() => Promise.resolve(AnalysisPresets.basic()))
  }
}))

// Mock the turn intelligence services
vi.mock('../../features/intelligence-panel/services/turn-intelligence-engine', () => ({
  getTurnIntelligenceEngine: vi.fn(() => ({
    analyzeCurrentTurn: vi.fn(() => Promise.resolve({
      defensiveAnalysis: { threatLevel: 'medium', recommendations: [] },
      patternSwitchSuggestions: []
    }))
  }))
}))

vi.mock('../../features/intelligence-panel/services/analysis-engines-lazy', () => ({
  getOpponentAnalysisEngine: vi.fn(() => Promise.resolve({
    analyzeAllOpponents: vi.fn(() => []),
    identifyDangerousTilesForAll: vi.fn(() => [])
  }))
}))

vi.mock('../../features/intelligence-panel/services/call-opportunity-analyzer', () => ({
  getCallOpportunityAnalyzer: vi.fn(() => ({
    analyzeCallOpportunity: vi.fn(() => Promise.resolve({
      shouldCall: true,
      confidence: 0.8,
      reasoning: 'Test call recommendation'
    }))
  }))
}))

describe('Intelligence Store', () => {
  beforeEach(() => {
    // Reset store to initial state
    const initialState = {
      currentAnalysis: null,
      isAnalyzing: false,
      analysisError: null,
      whatIfMode: false,
      whatIfScenarios: [],
      activeScenario: null,
      showConfidenceScores: true,
      autoAnalyze: true,
      analysisDetailLevel: 'detailed' as const,
      analysisCache: {},
      cacheTimeout: 5 * 60 * 1000
    }
    
    useIntelligenceStore.setState(initialState)
    vi.clearAllMocks()
  })

  describe('Analysis Management', () => {
    it('should start analysis with loading state', async () => {
      const store = useIntelligenceStore.getState()
      
      // Mock a delayed analysis to test loading state
      const { lazyAnalysisEngine } = await import('../../lib/services/analysis-engine-lazy')
      let resolveAnalysis: (value: any) => void
      const delayedPromise = new Promise<any>(resolve => { resolveAnalysis = resolve })
      vi.mocked(lazyAnalysisEngine.analyzeHand).mockReturnValue(delayedPromise)
      
      const analysisPromise = store.analyzeHand([], [])
      
      // Should be in loading state immediately
      expect(useIntelligenceStore.getState().isAnalyzing).toBe(true)
      expect(useIntelligenceStore.getState().analysisError).toBeNull()
      
      // Resolve the analysis
      resolveAnalysis!(AnalysisPresets.basic())
      await analysisPromise
      
      // Should complete successfully
      expect(useIntelligenceStore.getState().isAnalyzing).toBe(false)
      expect(useIntelligenceStore.getState().currentAnalysis).toBeDefined()
    })

    it('should handle analysis success', async () => {
      const store = useIntelligenceStore.getState()
      const mockAnalysis = AnalysisPresets.comprehensive()
      
      // Mock successful analysis
      const { lazyAnalysisEngine } = await import('../../lib/services/analysis-engine-lazy')
      vi.mocked(lazyAnalysisEngine.analyzeHand).mockResolvedValue(mockAnalysis)
      
      await store.analyzeHand([], [])
      
      const state = useIntelligenceStore.getState()
      expect(state.isAnalyzing).toBe(false)
      expect(state.currentAnalysis).toEqual(mockAnalysis)
      expect(state.analysisError).toBeNull()
    })

    it('should handle analysis errors gracefully', async () => {
      const store = useIntelligenceStore.getState()
      const error = new Error('Analysis failed')
      
      // Mock analysis failure
      const { lazyAnalysisEngine } = await import('../../lib/services/analysis-engine-lazy')
      vi.mocked(lazyAnalysisEngine.analyzeHand).mockRejectedValue(error)
      
      await store.analyzeHand([], [])
      
      const state = useIntelligenceStore.getState()
      expect(state.isAnalyzing).toBe(false)
      expect(state.currentAnalysis).toBeNull()
      expect(state.analysisError).toBe('Analysis failed')
    })

    it('should clear analysis state', () => {
      const store = useIntelligenceStore.getState()
      
      // Set up analysis state
      useIntelligenceStore.setState({
        currentAnalysis: AnalysisPresets.basic(),
        analysisError: 'Some error',
        whatIfScenarios: [{ id: 'test', name: 'Test', tileChanges: [], analysis: AnalysisPresets.basic(), comparisonScore: 5 }],
        activeScenario: 'test'
      })
      
      store.clearAnalysis()
      
      const state = useIntelligenceStore.getState()
      expect(state.currentAnalysis).toBeNull()
      expect(state.analysisError).toBeNull()
      expect(state.whatIfScenarios).toEqual([])
      expect(state.activeScenario).toBeNull()
    })

    it('should refresh analysis when current analysis exists', async () => {
      const store = useIntelligenceStore.getState()
      
      // Set up existing analysis
      useIntelligenceStore.setState({
        currentAnalysis: AnalysisPresets.basic()
      })
      
      await store.refreshAnalysis()
      
      // Should have called analyzeHand (placeholder implementation)
      expect(useIntelligenceStore.getState().currentAnalysis).toBeDefined()
    })
  })

  describe('What If Mode Management', () => {
    it('should enable what if mode', () => {
      const store = useIntelligenceStore.getState()
      
      store.enableWhatIfMode()
      
      expect(useIntelligenceStore.getState().whatIfMode).toBe(true)
    })

    it('should disable what if mode and clear scenarios', () => {
      const store = useIntelligenceStore.getState()
      
      // Set up what if state
      useIntelligenceStore.setState({
        whatIfMode: true,
        whatIfScenarios: [{ id: 'test', name: 'Test', tileChanges: [], analysis: AnalysisPresets.basic(), comparisonScore: 5 }],
        activeScenario: 'test'
      })
      
      store.disableWhatIfMode()
      
      const state = useIntelligenceStore.getState()
      expect(state.whatIfMode).toBe(false)
      expect(state.whatIfScenarios).toEqual([])
      expect(state.activeScenario).toBeNull()
    })

    it('should create what if scenarios', async () => {
      const store = useIntelligenceStore.getState()
      
      const scenarioId = await store.createWhatIfScenario('Test Scenario', [
        { remove: 'tile1', add: 'tile2' }
      ])
      
      const state = useIntelligenceStore.getState()
      expect(scenarioId).toBeDefined()
      expect(state.whatIfScenarios).toHaveLength(1)
      expect(state.whatIfScenarios[0].name).toBe('Test Scenario')
      expect(state.whatIfScenarios[0].tileChanges).toEqual([{ remove: 'tile1', add: 'tile2' }])
    })

    it('should remove what if scenarios', async () => {
      const store = useIntelligenceStore.getState()
      
      const scenarioId1 = await store.createWhatIfScenario('Scenario 1', [])
      const scenarioId2 = await store.createWhatIfScenario('Scenario 2', [])
      
      store.removeWhatIfScenario(scenarioId1)
      
      const state = useIntelligenceStore.getState()
      expect(state.whatIfScenarios).toHaveLength(1)
      expect(state.whatIfScenarios[0].id).toBe(scenarioId2)
    })

    it('should set active scenario', async () => {
      const store = useIntelligenceStore.getState()
      
      const scenarioId = await store.createWhatIfScenario('Test', [])
      store.setActiveScenario(scenarioId)
      
      expect(useIntelligenceStore.getState().activeScenario).toBe(scenarioId)
      
      store.setActiveScenario(null)
      expect(useIntelligenceStore.getState().activeScenario).toBeNull()
    })

    it('should clear active scenario when removing active scenario', async () => {
      const store = useIntelligenceStore.getState()
      
      const scenarioId = await store.createWhatIfScenario('Test', [])
      store.setActiveScenario(scenarioId)
      
      expect(useIntelligenceStore.getState().activeScenario).toBe(scenarioId)
      
      store.removeWhatIfScenario(scenarioId)
      
      expect(useIntelligenceStore.getState().activeScenario).toBeNull()
    })
  })

  describe('User Preferences', () => {
    it('should update show confidence scores preference', () => {
      const store = useIntelligenceStore.getState()
      
      store.setShowConfidenceScores(false)
      expect(useIntelligenceStore.getState().showConfidenceScores).toBe(false)
      
      store.setShowConfidenceScores(true)
      expect(useIntelligenceStore.getState().showConfidenceScores).toBe(true)
    })

    it('should update auto analyze preference', () => {
      const store = useIntelligenceStore.getState()
      
      store.setAutoAnalyze(false)
      expect(useIntelligenceStore.getState().autoAnalyze).toBe(false)
      
      store.setAutoAnalyze(true)
      expect(useIntelligenceStore.getState().autoAnalyze).toBe(true)
    })

    it('should update analysis detail level', () => {
      const store = useIntelligenceStore.getState()
      
      store.setAnalysisDetailLevel('basic')
      expect(useIntelligenceStore.getState().analysisDetailLevel).toBe('basic')
      
      store.setAnalysisDetailLevel('expert')
      expect(useIntelligenceStore.getState().analysisDetailLevel).toBe('expert')
    })
  })

  describe('Cache Management', () => {
    it('should store and retrieve cached analysis', () => {
      const store = useIntelligenceStore.getState()
      const analysis = AnalysisPresets.basic()
      const handHash = 'test-hash'
      
      store.setCachedAnalysis(handHash, analysis)
      const retrieved = store.getCachedAnalysis(handHash)
      
      expect(retrieved).toEqual(analysis)
    })

    it('should return null for non-existent cache entries', () => {
      const store = useIntelligenceStore.getState()
      
      const retrieved = store.getCachedAnalysis('non-existent')
      
      expect(retrieved).toBeNull()
    })

    it('should return null for expired cache entries', () => {
      const store = useIntelligenceStore.getState()
      const analysis = { ...AnalysisPresets.basic(), lastUpdated: Date.now() - (6 * 60 * 1000) } // 6 minutes ago
      const handHash = 'expired-hash'
      
      useIntelligenceStore.setState({
        analysisCache: { [handHash]: analysis }
      })
      
      const retrieved = store.getCachedAnalysis(handHash)
      
      expect(retrieved).toBeNull()
    })

    it('should clear entire cache', () => {
      const store = useIntelligenceStore.getState()
      
      store.setCachedAnalysis('hash1', AnalysisPresets.basic())
      store.setCachedAnalysis('hash2', AnalysisPresets.basic())
      
      expect(Object.keys(useIntelligenceStore.getState().analysisCache)).toHaveLength(2)
      
      store.clearCache()
      
      expect(useIntelligenceStore.getState().analysisCache).toEqual({})
    })
  })

  describe('Enhanced Intelligence Features (Phase 4C)', () => {
    const mockGameState = createTurnIntelligenceGameState({
      currentPlayer: 'player1',
      players: ['player1', 'player2', 'player3', 'player4'],
      gamePhase: 'gameplay'
    })

    it('should analyze turn situation', async () => {
      const store = useIntelligenceStore.getState()
      
      // Set up existing analysis
      useIntelligenceStore.setState({
        currentAnalysis: AnalysisPresets.basic()
      })
      
      await store.analyzeTurnSituation('player1', mockGameState)
      
      const state = useIntelligenceStore.getState()
      expect(state.currentAnalysis?.turnIntelligence).toBeDefined()
      expect(state.currentAnalysis?.analysisVersion).toBe('4C-turn-aware')
    })

    it('should analyze opponents', async () => {
      const store = useIntelligenceStore.getState()
      
      // Set up existing analysis
      useIntelligenceStore.setState({
        currentAnalysis: AnalysisPresets.basic()
      })
      
      await store.analyzeOpponents(mockGameState, 'player1')
      
      const state = useIntelligenceStore.getState()
      expect(state.currentAnalysis?.opponentAnalysis).toBeDefined()
      expect(state.currentAnalysis?.dangerousTiles).toBeDefined()
    })

    it('should analyze call opportunities', async () => {
      const store = useIntelligenceStore.getState()
      const opportunity = {
        tile: createTile({ id: 'test-tile', suit: 'bams', value: '5' }),
        discardingPlayer: 'player2',
        availableCallTypes: ['pung' as const],
        timeRemaining: 5000,
        deadline: Date.now() + 5000
      }
      const context = {
        playerHand: mockGameState.playerHands['player1'] || [],
        selectedPatterns: [],
        gameState: mockGameState,
        opponentProfiles: [],
        turnPosition: 1,
        roundPhase: 'middle' as const
      }
      
      // Set up existing analysis
      useIntelligenceStore.setState({
        currentAnalysis: AnalysisPresets.basic()
      })
      
      await store.analyzeCallOpportunity(opportunity, context)
      
      const state = useIntelligenceStore.getState()
      expect(state.currentAnalysis?.currentCallRecommendation).toBeDefined()
    })

    it('should update defensive analysis', async () => {
      const store = useIntelligenceStore.getState()
      
      // Set up existing analysis
      useIntelligenceStore.setState({
        currentAnalysis: AnalysisPresets.basic()
      })
      
      await store.updateDefensiveAnalysis(mockGameState, 'player1')
      
      const state = useIntelligenceStore.getState()
      expect(state.currentAnalysis?.defensiveAnalysis).toBeDefined()
      expect(state.currentAnalysis?.patternSwitchSuggestions).toBeDefined()
    })

    it('should handle enhanced intelligence errors gracefully', async () => {
      const store = useIntelligenceStore.getState()
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Mock service failure
      const { getTurnIntelligenceEngine } = await import('../../features/intelligence-panel/services/turn-intelligence-engine')
      vi.mocked(getTurnIntelligenceEngine).mockImplementation(() => ({
        analyzeCurrentTurn: vi.fn(() => Promise.reject(new Error('Service failed'))),
        getAvailableActions: vi.fn(),
        analyzeDrawOptions: vi.fn(),
        analyzeDiscardOptions: vi.fn(),
        calculateDiscardRisk: vi.fn(),
        calculatePatternProgress: vi.fn(),
        calculateDiscardConfidence: vi.fn(),
        hasCallOpportunity: vi.fn(),
        analyzeCallValue: vi.fn(),
        analyzeDefensivePlays: vi.fn(),
        analyzePatternSwitches: vi.fn(),
        calculateOverallConfidence: vi.fn()
      } as any))
      
      await store.analyzeTurnSituation('player1', mockGameState)
      
      expect(consoleSpy).toHaveBeenCalledWith('Turn situation analysis failed:', expect.any(Error))
      consoleSpy.mockRestore()
    })
  })

  describe('Getters and Utility Methods', () => {
    it('should get top tile recommendations', () => {
      const store = useIntelligenceStore.getState()
      const analysis = {
        ...AnalysisPresets.basic(),
        tileRecommendations: [
          createTileRecommendation({ tileId: 'tile1', priority: 8 }),
          createTileRecommendation({ tileId: 'tile2', priority: 6 }),
          createTileRecommendation({ tileId: 'tile3', priority: 9 }),
          createTileRecommendation({ tileId: 'tile4', priority: 5 })
        ]
      }
      
      useIntelligenceStore.setState({ currentAnalysis: analysis })
      
      const topRecs = store.getTopRecommendations(2)
      
      expect(topRecs).toHaveLength(2)
      expect(topRecs[0].tileId).toBe('tile3') // Highest priority
      expect(topRecs[1].tileId).toBe('tile1')
    })

    it('should get best patterns', () => {
      const analysis = {
        ...AnalysisPresets.basic(),
        bestPatterns: [
          createIntelligencePatternAnalysis({ patternId: 'pattern1', strategicValue: 7 }),
          createIntelligencePatternAnalysis({ patternId: 'pattern2', strategicValue: 9 }),
          createIntelligencePatternAnalysis({ patternId: 'pattern3', strategicValue: 6 })
        ]
      }

      useIntelligenceStore.setState({ currentAnalysis: analysis })

      // Get fresh state after updating
      const store = useIntelligenceStore.getState()
      const bestPatterns = store.getBestPatterns(2)

      expect(bestPatterns).toHaveLength(2)
      expect(bestPatterns[0].patternId).toBe('pattern2') // Highest strategic value
      expect(bestPatterns[1].patternId).toBe('pattern1')
    })

    it('should calculate confidence level from recommendations', () => {
      const store = useIntelligenceStore.getState()
      
      // High confidence scenario
      let analysis = {
        ...AnalysisPresets.basic(),
        tileRecommendations: [
          createTileRecommendation({ confidence: 85 }),
          createTileRecommendation({ confidence: 90 }),
          createTileRecommendation({ confidence: 80 })
        ]
      }
      useIntelligenceStore.setState({ currentAnalysis: analysis })
      expect(store.getConfidenceLevel()).toBe('high')
      
      // Medium confidence scenario
      analysis = {
        ...AnalysisPresets.basic(),
        tileRecommendations: [
          createTileRecommendation({ confidence: 65 }),
          createTileRecommendation({ confidence: 70 }),
          createTileRecommendation({ confidence: 60 })
        ]
      }
      useIntelligenceStore.setState({ currentAnalysis: analysis })
      expect(store.getConfidenceLevel()).toBe('medium')
      
      // Low confidence scenario
      analysis = {
        ...AnalysisPresets.basic(),
        tileRecommendations: [
          createTileRecommendation({ confidence: 45 }),
          createTileRecommendation({ confidence: 50 }),
          createTileRecommendation({ confidence: 40 })
        ]
      }
      useIntelligenceStore.setState({ currentAnalysis: analysis })
      expect(store.getConfidenceLevel()).toBe('low')
    })

    it('should generate strategic summary', () => {
      // With analysis
      const analysis = {
        ...AnalysisPresets.basic(),
        bestPatterns: [
          createIntelligencePatternAnalysis({
            patternId: 'pattern1',
            completionPercentage: 75,
            tilesNeeded: 3
          })
        ]
      }
      useIntelligenceStore.setState({ currentAnalysis: analysis })

      // Get fresh state after updating
      let store = useIntelligenceStore.getState()
      const summary = store.getStrategicSummary()
      expect(summary).toContain('75%')
      expect(summary).toContain('3 tiles needed')

      // Without analysis
      useIntelligenceStore.setState({ currentAnalysis: null })
      store = useIntelligenceStore.getState() // Get fresh state again
      expect(store.getStrategicSummary()).toBe('No analysis available')
      
      // With analysis but no patterns
      const emptyAnalysis = { ...AnalysisPresets.basic(), bestPatterns: [] }
      useIntelligenceStore.setState({ currentAnalysis: emptyAnalysis })
      expect(store.getStrategicSummary()).toBe('Analyzing patterns...')
    })

    it('should return empty arrays for getters when no analysis', () => {
      const store = useIntelligenceStore.getState()
      
      useIntelligenceStore.setState({ currentAnalysis: null })
      
      expect(store.getTopRecommendations()).toEqual([])
      expect(store.getBestPatterns()).toEqual([])
      expect(store.getConfidenceLevel()).toBe('low')
    })
  })

  describe('State Integration and Persistence', () => {
    it('should maintain state consistency during complex operations', async () => {
      const store = useIntelligenceStore.getState()
      
      // Perform multiple operations
      store.enableWhatIfMode()
      store.setAutoAnalyze(false)
      store.setAnalysisDetailLevel('expert')
      
      const scenarioId = await store.createWhatIfScenario('Test', [])
      store.setActiveScenario(scenarioId)
      
      await store.analyzeHand([], [])
      
      const state = useIntelligenceStore.getState()
      expect(state.whatIfMode).toBe(true)
      expect(state.autoAnalyze).toBe(false)
      expect(state.analysisDetailLevel).toBe('expert')
      expect(state.activeScenario).toBe(scenarioId)
      expect(state.currentAnalysis).toBeDefined()
    })

    it('should handle edge cases gracefully', () => {
      const store = useIntelligenceStore.getState()
      
      // Try to get cached analysis with invalid hash
      expect(store.getCachedAnalysis('')).toBeNull()
      
      // Try to remove non-existent scenario
      store.removeWhatIfScenario('non-existent')
      expect(useIntelligenceStore.getState().whatIfScenarios).toHaveLength(0)
      
      // Try to set active scenario that doesn't exist
      store.setActiveScenario('non-existent')
      expect(useIntelligenceStore.getState().activeScenario).toBe('non-existent') // It allows this
    })
  })
})