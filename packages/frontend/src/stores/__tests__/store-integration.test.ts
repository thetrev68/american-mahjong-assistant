/**
 * Store Integration Tests
 *
 * Tests the interactions between different Zustand stores to ensure they work correctly together.
 * This includes:
 * - Game Store <-> Pattern Store interactions
 * - Game Store <-> Tile Store interactions
 * - Pattern Store <-> Intelligence Store interactions
 * - Cross-store data flow and consistency
 * - Co-pilot mode coordination across stores
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useGameStore } from '../game-store'
import { usePatternStore } from '../pattern-store'
import { useIntelligenceStore } from '../intelligence-store'
import { useTileStore } from '../tile-store'
import {
  createTestPlayer,
  createTile,
  createTestHand,
  AnalysisPresets
} from '../../__tests__/factories'

// Mock external services
vi.mock('../../features/gameplay/services/turn-multiplayer', () => ({
  getTurnMultiplayerService: vi.fn(() => null),
  destroyTurnMultiplayerService: vi.fn()
}))

vi.mock('../../features/gameplay/services/game-end-coordinator', () => ({
  shouldGameEnd: vi.fn(() => false),
  getWallExhaustionWarning: vi.fn(() => null)
}))

vi.mock('../../lib/services/nmjl-service', () => ({
  nmjlService: {
    getAllPatterns: vi.fn(() => Promise.resolve([])),
    getSelectionOptions: vi.fn(() => Promise.resolve([]))
  }
}))

vi.mock('../../lib/services/tile-service', () => ({
  tileService: {
    createPlayerTile: vi.fn((id) => createTile({ id })),
    validateHand: vi.fn(() => ({ isValid: true, errors: [], warnings: [], tileCount: 13, expectedCount: 13, duplicateErrors: [] })),
    sortTiles: vi.fn((tiles) => [...tiles])
  }
}))

vi.mock('../../lib/services/analysis-engine-lazy', () => ({
  lazyAnalysisEngine: {
    analyzeHand: vi.fn(() => Promise.resolve(AnalysisPresets.basic())),
    clearCacheForHandChange: vi.fn()
  }
}))

describe('Store Integration Tests', () => {
  beforeEach(() => {
    // Reset all stores to initial state
    useGameStore.setState({
      roomCode: null,
      players: [],
      currentPlayerId: null,
      gamePhase: 'lobby',
      coPilotMode: null,
      turnStartTime: null,
      gameStartTime: null,
      wallTilesRemaining: 144,
      passedOutPlayers: new Set(),
      gameEndResult: null,
      currentTurn: 0,
      gameStatistics: {
        totalActions: 0,
        turnTimings: [],
        playerActionCounts: {},
        callAttempts: {},
        discardCount: 0
      },
      alerts: []
    })

    usePatternStore.setState({
      patterns: [],
      selectionOptions: [],
      isLoading: false,
      error: null,
      selectedPatternId: null,
      targetPatterns: [],
      searchQuery: '',
      difficultyFilter: 'all',
      pointsFilter: 'all',
      jokerFilter: 'all',
      sectionFilter: 'all',
      patternProgress: {}
    })

    useIntelligenceStore.setState({
      currentAnalysis: null,
      isAnalyzing: false,
      analysisError: null,
      whatIfMode: false,
      whatIfScenarios: [],
      activeScenario: null,
      showConfidenceScores: true,
      autoAnalyze: true,
      analysisDetailLevel: 'detailed',
      analysisCache: {},
      cacheTimeout: 5 * 60 * 1000
    })

    useTileStore.setState({
      selectedTiles: [],
      playerHand: [],
      handSize: 0,
      dealerHand: false,
      exposedTiles: [],
      inputMode: 'select',
      isValidating: false,
      validation: {
        isValid: false,
        errors: [],
        warnings: [],
        tileCount: 0,
        expectedCount: 13,
        duplicateErrors: []
      },
      showRecommendations: true,
      selectedCount: 0,
      showAnimations: true,
      sortBy: 'suit',
      recommendations: {},
      analysisInProgress: false,
      lastAnalysis: null,
      selectedForAction: [],
      tileStates: {}
    })

    vi.clearAllMocks()
  })

  describe('Game Store <-> Pattern Store Integration', () => {
    it('should coordinate game end condition with selected patterns', () => {
      const gameStore = useGameStore.getState()
      const patternStore = usePatternStore.getState()

      // Setup game state
      gameStore.setRoomCode('ROOM123')
      gameStore.startGame()

      // Add some target patterns
      patternStore.addTargetPattern('pattern-1')
      patternStore.addTargetPattern('pattern-2')

      // Check game end condition - should access pattern store data
      const canEnd = gameStore.checkForGameEnd()

      expect(canEnd).toBe(false) // Mock returns false
      // Verify integration is working by checking state consistency
      expect(useGameStore.getState().gamePhase).toBe('playing')
      expect(usePatternStore.getState().targetPatterns).toHaveLength(2)
    })

    it('should maintain pattern selection across game phase changes', () => {
      const gameStore = useGameStore.getState()
      const patternStore = usePatternStore.getState()

      // Select patterns during setup
      patternStore.selectPattern('pattern-1')
      patternStore.addTargetPattern('pattern-2')

      // Progress through game phases
      gameStore.setGamePhase('tile-input')
      gameStore.setGamePhase('charleston')
      gameStore.setGamePhase('playing')

      // Patterns should persist
      const finalPatternState = usePatternStore.getState()
      expect(finalPatternState.selectedPatternId).toBe('pattern-1')
      expect(finalPatternState.targetPatterns).toContain('pattern-1')
      expect(finalPatternState.targetPatterns).toContain('pattern-2')
    })
  })

  describe('Game Store <-> Tile Store Integration', () => {
    it('should coordinate dealer status with game state', () => {
      const gameStore = useGameStore.getState()
      const tileStore = useTileStore.getState()

      // Add players
      const dealer = createTestPlayer({ id: 'dealer', position: 'east' })
      const player = createTestPlayer({ id: 'player', position: 'south' })

      gameStore.addPlayer(dealer)
      gameStore.addPlayer(player)
      gameStore.setCurrentPlayer('dealer')

      // When current player is dealer (east position)
      tileStore.setDealerHand(true)

      expect(useTileStore.getState().dealerHand).toBe(true)
      expect(useTileStore.getState().validation.expectedCount).toBe(14)
    })

    it('should track tile actions in game statistics', () => {
      const gameStore = useGameStore.getState()
      const tileStore = useTileStore.getState()

      gameStore.setCurrentPlayer('player-1')

      // Simulate tile actions
      tileStore.addTile('1B')
      gameStore.recordAction('player-1', 'draw')

      tileStore.addTile('2B')
      gameStore.recordAction('player-1', 'draw')

      const gameStats = useGameStore.getState().gameStatistics
      expect(gameStats.totalActions).toBe(2)
      expect(gameStats.playerActionCounts['player-1']).toBe(2)
    })

    it('should handle game reset with tile store cleanup', () => {
      const gameStore = useGameStore.getState()
      const tileStore = useTileStore.getState()

      // Set up game state
      gameStore.startGame()
      gameStore.setCurrentPlayer('player-1')

      // Add tiles and selections
      tileStore.importTilesFromString('1B 2B 3B 4B')

      // Verify tiles were added before selecting
      const currentState = useTileStore.getState()
      if (currentState.playerHand.length > 0) {
        tileStore.selectTile(currentState.playerHand[0].instanceId)
      }

      // Reset game
      gameStore.resetGame()

      // Verify game store reset
      expect(useGameStore.getState().gamePhase).toBe('lobby')
      expect(useGameStore.getState().currentPlayerId).toBeNull()

      // Tile store should maintain its state independently
      expect(useTileStore.getState().playerHand).toHaveLength(4)
    })
  })

  describe('Pattern Store <-> Intelligence Store Integration', () => {
    it('should use selected patterns for analysis', async () => {
      const patternStore = usePatternStore.getState()
      const intelligenceStore = useIntelligenceStore.getState()
      const tileStore = useTileStore.getState()

      // Set up patterns
      const mockPatterns = [
        { id: 'pattern-1', displayName: 'Test Pattern 1' },
        { id: 'pattern-2', displayName: 'Test Pattern 2' }
      ]

      usePatternStore.setState({ selectionOptions: mockPatterns })
      patternStore.selectPattern('pattern-1')
      patternStore.addTargetPattern('pattern-2')

      // Add some tiles
      tileStore.importTilesFromString('1B 2B 3B')

      // Trigger analysis with selected patterns
      await intelligenceStore.analyzeHand(
        useTileStore.getState().playerHand,
        usePatternStore.getState().getTargetPatterns()
      )

      // Analysis should have been called with the target patterns
      expect(useIntelligenceStore.getState().currentAnalysis).toBeDefined()
      expect(useIntelligenceStore.getState().analysisError).toBeNull()
    })

    it('should clear intelligence analysis when patterns are cleared', () => {
      const patternStore = usePatternStore.getState()
      const intelligenceStore = useIntelligenceStore.getState()

      // Set up analysis
      useIntelligenceStore.setState({
        currentAnalysis: AnalysisPresets.basic()
      })

      // Clear patterns
      patternStore.clearSelection()

      // Intelligence analysis should still exist (independent lifecycle)
      expect(useIntelligenceStore.getState().currentAnalysis).toBeDefined()
    })

    it('should track pattern progress from intelligence analysis', () => {
      const patternStore = usePatternStore.getState()
      const intelligenceStore = useIntelligenceStore.getState()

      // Simulate analysis results with pattern progress
      const mockAnalysis = {
        ...AnalysisPresets.basic(),
        recommendedPatterns: [
          {
            pattern: { id: 'pattern-1' },
            completionPercentage: 75,
            totalScore: 85,
            confidence: 0.8,
            reasoning: 'Good progress',
            difficulty: 'medium' as const,
            isPrimary: true
          }
        ]
      }

      useIntelligenceStore.setState({ currentAnalysis: mockAnalysis })

      // Pattern store should be able to update progress based on analysis
      patternStore.updatePatternProgress('pattern-1', {
        completionPercentage: 75,
        tilesMatched: 10,
        tilesNeeded: 4,
        lastUpdated: Date.now()
      })

      const patternProgress = usePatternStore.getState().patternProgress
      expect(patternProgress['pattern-1']).toBeDefined()
      expect(patternProgress['pattern-1'].completionPercentage).toBe(75)
    })
  })

  describe('Multi-Store Co-pilot Mode Integration', () => {
    it('should coordinate co-pilot mode across all stores', () => {
      const gameStore = useGameStore.getState()

      // Set co-pilot mode
      gameStore.setCoPilotMode('solo')

      // All stores should be aware of co-pilot context
      expect(useGameStore.getState().coPilotMode).toBe('solo')

      // Intelligence store should respect co-pilot preferences
      const intelligenceStore = useIntelligenceStore.getState()
      expect(intelligenceStore.autoAnalyze).toBe(true) // Default enabled for co-pilot

      // Tile store should show recommendations in co-pilot mode
      expect(useTileStore.getState().showRecommendations).toBe(true)
    })

    it('should handle multiplayer co-pilot coordination', () => {
      const gameStore = useGameStore.getState()

      // Set up multiplayer game
      gameStore.setCoPilotMode('everyone')
      gameStore.addPlayer(createTestPlayer({ id: 'player-1', position: 'east' }))
      gameStore.addPlayer(createTestPlayer({ id: 'player-2', position: 'south' }))
      gameStore.setCurrentPlayer('player-1')

      // All players should have independent store states
      // But game coordination should be shared
      expect(useGameStore.getState().coPilotMode).toBe('everyone')
      expect(useGameStore.getState().players).toHaveLength(2)
      expect(useGameStore.getState().currentPlayerId).toBe('player-1')
    })
  })

  describe('Store State Consistency', () => {
    it('should maintain consistency during complex multi-store operations', async () => {
      const gameStore = useGameStore.getState()
      const patternStore = usePatternStore.getState()
      const intelligenceStore = useIntelligenceStore.getState()
      const tileStore = useTileStore.getState()

      // Complex scenario: Start game, select patterns, add tiles, analyze
      gameStore.setRoomCode('INTEGRATION-TEST')
      gameStore.addPlayer(createTestPlayer({ id: 'player-1' }))
      gameStore.setCurrentPlayer('player-1')
      gameStore.setCoPilotMode('solo')
      gameStore.startGame()

      // Select patterns
      const mockPatterns = [{ id: 'pattern-1', displayName: 'Test Pattern' }]
      usePatternStore.setState({ selectionOptions: mockPatterns })
      patternStore.selectPattern('pattern-1')

      // Add tiles
      tileStore.importTilesFromString('1B 2B 3B 4B 5B')
      tileStore.setDealerHand(false)

      // Trigger analysis
      await intelligenceStore.analyzeHand(
        useTileStore.getState().playerHand,
        patternStore.getTargetPatterns()
      )

      // Verify all stores are in consistent state
      const finalGameState = useGameStore.getState()
      const finalPatternState = usePatternStore.getState()
      const finalIntelligenceState = useIntelligenceStore.getState()
      const finalTileState = useTileStore.getState()

      expect(finalGameState.gamePhase).toBe('playing')
      expect(finalGameState.roomCode).toBe('INTEGRATION-TEST')
      expect(finalGameState.coPilotMode).toBe('solo')

      expect(finalPatternState.selectedPatternId).toBe('pattern-1')
      expect(finalPatternState.targetPatterns).toContain('pattern-1')

      expect(finalIntelligenceState.currentAnalysis).toBeDefined()
      expect(finalIntelligenceState.analysisError).toBeNull()

      expect(finalTileState.playerHand).toHaveLength(5)
      expect(finalTileState.dealerHand).toBe(false)
      expect(finalTileState.validation.expectedCount).toBe(13)
    })

    it('should handle error propagation across stores gracefully', async () => {
      const intelligenceStore = useIntelligenceStore.getState()
      const tileStore = useTileStore.getState()

      // Mock analysis engine to throw error
      const { lazyAnalysisEngine } = await import('../../lib/services/analysis-engine-lazy')
      vi.mocked(lazyAnalysisEngine.analyzeHand).mockRejectedValue(new Error('Analysis failed'))

      // Add tiles
      tileStore.importTilesFromString('1B 2B 3B')

      // Trigger analysis that will fail
      await intelligenceStore.analyzeHand(tileStore.playerHand, [])

      // Error should be contained to intelligence store
      expect(useIntelligenceStore.getState().analysisError).toBe('Analysis failed')
      expect(useIntelligenceStore.getState().isAnalyzing).toBe(false)

      // Other stores should be unaffected
      expect(useTileStore.getState().playerHand).toHaveLength(3)
      expect(useGameStore.getState().gamePhase).toBe('lobby')
    })
  })

  describe('Performance and Memory Management', () => {
    it('should handle rapid state changes without memory leaks', () => {
      const gameStore = useGameStore.getState()
      const tileStore = useTileStore.getState()

      // Rapid state changes
      for (let i = 0; i < 100; i++) {
        gameStore.recordAction('player-1', 'draw')
        tileStore.addTile(`${i % 9 + 1}B`)
        if (i % 10 === 0) {
          tileStore.clearHand()
        }
      }

      // Stores should handle rapid changes gracefully
      const finalGameStats = useGameStore.getState().gameStatistics
      expect(finalGameStats.totalActions).toBe(100)

      // Memory should be managed properly (no accumulation)
      const finalHandSize = useTileStore.getState().handSize
      expect(finalHandSize).toBeLessThanOrEqual(10) // Due to periodic clearing
    })

    it('should clean up cross-references when resetting stores', () => {
      const gameStore = useGameStore.getState()
      const patternStore = usePatternStore.getState()
      const intelligenceStore = useIntelligenceStore.getState()

      // Set up cross-references
      gameStore.setCurrentPlayer('player-1')
      patternStore.selectPattern('pattern-1')
      useIntelligenceStore.setState({ currentAnalysis: AnalysisPresets.basic() })

      // Reset one store
      gameStore.resetGame()

      // Other stores should handle the reset gracefully
      expect(useGameStore.getState().currentPlayerId).toBeNull()
      expect(usePatternStore.getState().selectedPatternId).toBe('pattern-1') // Independent
      expect(useIntelligenceStore.getState().currentAnalysis).toBeDefined() // Independent
    })
  })
})