/**
 * Integration Test: Store Interactions
 * Tests how different Zustand stores work together and maintain consistency
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '../../stores/game-store'
import { usePatternStore } from '../../stores/pattern-store'
import { useTileStore } from '../../stores/tile-store'
import { useCharlestonStore } from '../../stores/charleston-store'
import { useHistoryStore } from '../../stores/history-store'
import { useIntelligenceStore } from '../../stores/intelligence-store'

// Mock NMJL patterns for testing
const mockPatterns = [
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

const mockTiles = [
  { suit: 'bam', rank: '1', id: 'tile-1' },
  { suit: 'bam', rank: '2', id: 'tile-2' },
  { suit: 'bam', rank: '3', id: 'tile-3' },
  { suit: 'crak', rank: '1', id: 'tile-4' },
  { suit: 'crak', rank: '2', id: 'tile-5' },
  { suit: 'crak', rank: '3', id: 'tile-6' },
  { suit: 'dot', rank: '1', id: 'tile-7' },
  { suit: 'dot', rank: '2', id: 'tile-8' },
  { suit: 'dot', rank: '3', id: 'tile-9' },
  { suit: 'flower', rank: 'flower', id: 'tile-10' },
  { suit: 'flower', rank: 'flower', id: 'tile-11' },
  { suit: 'flower', rank: 'flower', id: 'tile-12' },
  { suit: 'flower', rank: 'flower', id: 'tile-13' }
]

describe('Store Integration Tests', () => {
  beforeEach(() => {
    // Reset all stores to clean state
    useGameStore.getState().resetGame()
    usePatternStore.getState().clearPatterns()
    useTileStore.getState().clearTiles()
    useCharlestonStore.getState().reset()
    useHistoryStore.getState().clearHistory()
    useIntelligenceStore.getState().reset()
  })

  describe('Pattern Store → Tile Store Integration', () => {
    it('should maintain consistent pattern analysis when tiles change', async () => {
      const patternStore = usePatternStore.getState()
      const tileStore = useTileStore.getState()
      const intelligenceStore = useIntelligenceStore.getState()

      // Select patterns first
      patternStore.selectPattern(mockPatterns[0])
      patternStore.selectPattern(mockPatterns[1])

      const selectedPatterns = patternStore.getSelectedPatterns()
      expect(selectedPatterns).toHaveLength(2)

      // Add tiles
      mockTiles.forEach(tile => tileStore.addTile(tile))
      expect(tileStore.getTileCount()).toBe(13)

      // Intelligence analysis should reflect both patterns and tiles
      const analysis = intelligenceStore.getCurrentAnalysis()
      expect(analysis).toBeDefined()
      
      // Pattern progress should be calculated based on current hand
      const patternProgress = analysis?.patternProgress || []
      expect(patternProgress.length).toBeGreaterThan(0)
      
      // Each selected pattern should have progress data
      selectedPatterns.forEach(pattern => {
        const progress = patternProgress.find(p => p.patternId === pattern.Hands_Key)
        expect(progress).toBeDefined()
        expect(progress?.completionPercentage).toBeGreaterThanOrEqual(0)
      })
    })

    it('should update analysis when patterns are deselected', () => {
      const patternStore = usePatternStore.getState()
      const intelligenceStore = useIntelligenceStore.getState()

      // Select and then deselect pattern
      patternStore.selectPattern(mockPatterns[0])
      expect(patternStore.getSelectedPatterns()).toHaveLength(1)

      patternStore.deselectPattern(mockPatterns[0].Hands_Key)
      expect(patternStore.getSelectedPatterns()).toHaveLength(0)

      // Analysis should reflect the change
      const analysis = intelligenceStore.getCurrentAnalysis()
      expect(analysis?.patternProgress).toHaveLength(0)
    })
  })

  describe('Game Store → Charleston Store Integration', () => {
    it('should coordinate phase transitions correctly', () => {
      const gameStore = useGameStore.getState()
      const charlestonStore = useCharlestonStore.getState()

      // Start game in tile input phase
      gameStore.setGamePhase('tile-input')
      expect(gameStore.gamePhase).toBe('tile-input')

      // Transition to charleston
      gameStore.setGamePhase('charleston')
      expect(gameStore.gamePhase).toBe('charleston')

      // Charleston store should initialize properly
      expect(charlestonStore.currentPhase).toBe('right')
      expect(charlestonStore.roundNumber).toBe(1)

      // Complete charleston rounds
      charlestonStore.completeRound()
      expect(charlestonStore.roundNumber).toBe(2)
      expect(charlestonStore.currentPhase).toBe('across')

      charlestonStore.completeRound()
      expect(charlestonStore.roundNumber).toBe(3)
      expect(charlestonStore.currentPhase).toBe('left')

      charlestonStore.completeRound()
      expect(charlestonStore.currentPhase).toBe('complete')

      // Game should be ready to proceed
      expect(gameStore.canProceedToGameplay()).toBe(true)
    })

    it('should handle player readiness correctly', () => {
      const gameStore = useGameStore.getState()

      // Set up solo mode
      gameStore.setCoPilotMode('solo')
      gameStore.addPlayer({ id: 'player-1', name: 'Solo Player', isReady: false })

      expect(gameStore.players).toHaveLength(1)
      expect(gameStore.coPilotMode).toBe('solo')

      // Mark player as ready
      gameStore.setPlayerReady('player-1', true)
      const player = gameStore.players.find(p => p.id === 'player-1')
      expect(player?.isReady).toBe(true)
    })
  })

  describe('Tile Store → Charleston Store Integration', () => {
    it('should handle tile passing correctly', () => {
      const tileStore = useTileStore.getState()
      const charlestonStore = useCharlestonStore.getState()

      // Set up initial hand
      mockTiles.slice(0, 13).forEach(tile => tileStore.addTile(tile))
      expect(tileStore.getTileCount()).toBe(13)

      // Select tiles to pass
      const tilesToPass = mockTiles.slice(0, 3)
      tilesToPass.forEach(tile => charlestonStore.selectTileToPass(tile))

      expect(charlestonStore.selectedTiles).toHaveLength(3)

      // Pass tiles (solo mode simulation)
      charlestonStore.passTiles()
      
      // Tiles should be removed from hand
      expect(tileStore.getTileCount()).toBe(10)

      // Receive tiles
      const receivedTiles = [
        { suit: 'bam', rank: '4', id: 'received-1' },
        { suit: 'bam', rank: '5', id: 'received-2' },
        { suit: 'bam', rank: '6', id: 'received-3' }
      ]

      receivedTiles.forEach(tile => tileStore.addTile(tile))
      expect(tileStore.getTileCount()).toBe(13)

      // Charleston round should be complete
      expect(charlestonStore.selectedTiles).toHaveLength(0)
    })
  })

  describe('Game Store → History Store Integration', () => {
    it('should record completed games correctly', async () => {
      const gameStore = useGameStore.getState()
      const historyStore = useHistoryStore.getState()
      const patternStore = usePatternStore.getState()

      // Set up game
      gameStore.setCoPilotMode('solo')
      gameStore.setGamePhase('gameplay')
      
      // Select patterns
      patternStore.selectPattern(mockPatterns[0])

      // Simulate game completion
      const gameData = {
        timestamp: new Date(),
        duration: 30, // 30 minutes
        outcome: 'won' as const,
        finalScore: 25,
        difficulty: 'intermediate' as const,
        selectedPatterns: patternStore.getSelectedPatterns(),
        finalHand: mockTiles.slice(0, 14), // Winning hand
        decisions: [],
        patternAnalyses: [],
        performance: {
          totalDecisions: 20,
          excellentDecisions: 15,
          goodDecisions: 3,
          fairDecisions: 2,
          poorDecisions: 0,
          averageDecisionTime: 5.2,
          patternEfficiency: 85,
          charlestonSuccess: 75
        },
        insights: {
          strengthAreas: ['Pattern recognition'],
          improvementAreas: ['Defensive play'],
          learningOpportunities: ['Focus on safer discards'],
          recommendedPatterns: ['CONSECUTIVE RUN-2'],
          skillProgression: 'Advanced beginner'
        },
        shared: false,
        votes: 0,
        comments: [],
        coPilotMode: 'solo' as const
      }

      // Complete the game
      historyStore.completeGame(gameData)

      // Verify game was recorded
      const completedGames = historyStore.completedGames
      expect(completedGames).toHaveLength(1)

      const recordedGame = completedGames[0]
      expect(recordedGame.coPilotMode).toBe('solo')
      expect(recordedGame.outcome).toBe('won')
      expect(recordedGame.selectedPatterns).toHaveLength(1)

      // Performance stats should be updated
      const stats = historyStore.performanceStats
      expect(stats.totalGames).toBe(1)
      expect(stats.gamesWon).toBe(1)
      expect(stats.winRate).toBe(100)
    })
  })

  describe('Cross-Store State Consistency', () => {
    it('should maintain consistent state across all stores', () => {
      const gameStore = useGameStore.getState()
      const patternStore = usePatternStore.getState()
      const tileStore = useTileStore.getState()

      // Set up coordinated state
      gameStore.setCoPilotMode('solo')
      gameStore.setGamePhase('tile-input')
      
      patternStore.selectPattern(mockPatterns[0])
      mockTiles.forEach(tile => tileStore.addTile(tile))

      // All stores should reflect consistent state
      expect(gameStore.coPilotMode).toBe('solo')
      expect(patternStore.getSelectedPatterns()).toHaveLength(1)
      expect(tileStore.getTileCount()).toBe(13)

      // Transition to next phase
      gameStore.setGamePhase('charleston')
      
      // State should remain consistent
      expect(gameStore.gamePhase).toBe('charleston')
      expect(patternStore.getSelectedPatterns()).toHaveLength(1) // Patterns preserved
      expect(tileStore.getTileCount()).toBe(13) // Tiles preserved
    })

    it('should handle store resets gracefully', () => {
      const gameStore = useGameStore.getState()
      const patternStore = usePatternStore.getState()
      const tileStore = useTileStore.getState()

      // Set up some state
      gameStore.setCoPilotMode('solo')
      patternStore.selectPattern(mockPatterns[0])
      tileStore.addTile(mockTiles[0])

      // Reset individual store
      patternStore.clearPatterns()
      expect(patternStore.getSelectedPatterns()).toHaveLength(0)
      
      // Other stores should remain unaffected
      expect(gameStore.coPilotMode).toBe('solo')
      expect(tileStore.getTileCount()).toBe(1)

      // Reset game should reset everything
      gameStore.resetGame()
      expect(gameStore.coPilotMode).toBe('everyone') // default
      expect(gameStore.gamePhase).toBe('setup') // default
    })
  })
})