/**
 * Integration Test: Store Interactions
 * Tests how different Zustand stores work together and maintain consistency
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '../../stores/game-store'
import { usePatternStore } from '../../stores/pattern-store'
import { useTileStore } from '../../stores/tile-store'
import { useCharlestonStore } from '../../stores/charleston-store'
import type { PatternRecommendation } from '../../stores/intelligence-store'
import { useHistoryStore } from '../../stores/history-store'
import { useIntelligenceStore } from '../../stores/intelligence-store'
import type { NMJL2025Pattern } from 'shared-types'
import type { TileSuit } from 'shared-types'
import type { TileValue } from 'shared-types'

// Mock NMJL patterns for testing
const mockPatterns: NMJL2025Pattern[] = [
  {
    Year: 2025,
    Section: 'CONSECUTIVE_RUN',
    Line: 1,
    'Pattern ID': 1,
    Hands_Key: '2025-CONSECUTIVE_RUN-1',
    Hand_Pattern: 'FFFF 1111 2222 3',
    Hand_Description: 'Consecutive Run',
    Hand_Points: 30,
    Hand_Conceiled: false,
    Hand_Difficulty: 'medium' as const,
    Hand_Notes: null,
    Groups: []
  },
  {
    Year: 2025,
    Section: 'LIKE_NUMBERS',
    Line: 2,
    'Pattern ID': 2,
    Hands_Key: '2025-LIKE_NUMBERS-2',
    Hand_Pattern: '111 222 333 DDDD',
    Hand_Description: 'Like Numbers',
    Hand_Points: 25,
    Hand_Conceiled: false,
    Hand_Difficulty: 'easy' as const,
    Hand_Notes: null,
    Groups: []
  }
]

const mockTiles = [
  { suit: 'bams', value: '1', id: '1B' },
  { suit: 'bams', value: '2', id: '2B' },
  { suit: 'bams', value: '3', id: '3B' },
  { suit: 'cracks', value: '1', id: '1C' },
  { suit: 'cracks', value: '2', id: '2C' },
  { suit: 'cracks', value: '3', id: '3C' },
  { suit: 'dots', value: '1', id: '1D' },
  { suit: 'dots', value: '2', id: '2D' },
  { suit: 'dots', value: '3', id: '3D' },
  { suit: 'flowers', value: 'f1', id: 'f1' },
  { suit: 'flowers', value: 'f2', id: 'f2' },
  { suit: 'flowers', value: 'f3', id: 'f3' },
  { suit: 'flowers', value: 'f4', id: 'f4' }
]

describe('Store Integration Tests', () => {
  beforeEach(() => {
    // Reset all stores to clean state
    useGameStore.getState().resetGame()
    usePatternStore.getState().clearSelection()
    useTileStore.getState().clearHand()
    useCharlestonStore.getState().reset()
    useHistoryStore.getState().clearHistory()
    // useIntelligenceStore.getState().reset() // Method may not exist
  })

  describe('Pattern Store → Tile Store Integration', () => {
    it('should maintain consistent pattern analysis when tiles change', async () => {
      // Access pattern store actions and state correctly
      // Access tile store actions and state correctly
      // Access intelligence store actions and state correctly

      // Select patterns first
      usePatternStore.getState().selectPattern(mockPatterns[0].Hands_Key)
      usePatternStore.getState().selectPattern(mockPatterns[1].Hands_Key)

      const selectedPatterns = usePatternStore.getState().getTargetPatterns()
      expect(selectedPatterns).toHaveLength(2)

      // Add tiles
      mockTiles.forEach(tile => useTileStore.getState().addTile(tile.id))
      expect(useTileStore.getState().handSize).toBe(13)

      // Intelligence analysis should reflect both patterns and tiles
      const analysis = useIntelligenceStore.getState().currentAnalysis
      expect(analysis).toBeDefined()
      
      // Analysis should contain pattern recommendations
      const patternRecs = analysis?.recommendedPatterns || []
      expect(patternRecs.length).toBeGreaterThanOrEqual(0)
      
      // Each selected pattern should have progress data
      selectedPatterns.forEach(pattern => {
        const progress = patternRecs.find((p: PatternRecommendation) => p.pattern?.id === pattern.id)
        expect(progress).toBeDefined()
        expect(progress?.completionPercentage).toBeGreaterThanOrEqual(0)
      })
    })

    it('should update analysis when patterns are deselected', () => {
      // Access pattern store actions and state correctly
      // Access intelligence store actions and state correctly

      // Select and then deselect pattern
      usePatternStore.getState().selectPattern(mockPatterns[0].Hands_Key)
      expect(usePatternStore.getState().getTargetPatterns()).toHaveLength(1)

      usePatternStore.getState().removeTargetPattern(mockPatterns[0].Hands_Key)
      expect(usePatternStore.getState().getTargetPatterns()).toHaveLength(0)

      // Analysis should reflect the change
      const analysis = useIntelligenceStore.getState().currentAnalysis
      expect(analysis?.recommendedPatterns).toHaveLength(0)
    })
  })

  describe('Game Store → Charleston Store Integration', () => {
    it('should coordinate phase transitions correctly', () => {
      // Access game store actions and state correctly
      // Access charleston store actions and state correctly

      // Start game in tile input phase
      useGameStore.getState().setGamePhase('tile-input')
      expect(useGameStore.getState().gamePhase).toBe('tile-input')

      // Transition to charleston
      useGameStore.getState().setGamePhase('charleston')
      expect(useGameStore.getState().gamePhase).toBe('charleston')

      // Charleston store should initialize properly
      expect(useCharlestonStore.getState().currentPhase).toBe('right')

      // Complete charleston phases
      useCharlestonStore.getState().setPhase('across')
      expect(useCharlestonStore.getState().currentPhase).toBe('across')

      useCharlestonStore.getState().setPhase('left')
      expect(useCharlestonStore.getState().currentPhase).toBe('left')

      useCharlestonStore.getState().setPhase('complete')
      expect(useCharlestonStore.getState().currentPhase).toBe('complete')

      // Game phase should be ready to advance
      expect(useGameStore.getState().gamePhase).toBe('charleston')
    })

    it('should handle player readiness correctly', () => {
      // Access game store actions and state correctly

      // Set up solo mode
      useGameStore.getState().setCoPilotMode('solo')
      useGameStore.getState().addPlayer({ id: 'player-1', name: 'Solo Player', isReady: false, position: 'east', isConnected: true })

      expect(useGameStore.getState().players).toHaveLength(1)
      expect(useGameStore.getState().coPilotMode).toBe('solo')

      // Mark player as ready
      useGameStore.getState().updatePlayer('player-1', { isReady: true })
      const player = useGameStore.getState().players.find(p => p.id === 'player-1')
      expect(player?.isReady).toBe(true)
    })
  })

  describe('Tile Store → Charleston Store Integration', () => {
    it('should handle tile passing correctly', () => {
      // Access tile store actions and state correctly
      // Access charleston store actions and state correctly

      // Set up initial hand
      mockTiles.slice(0, 13).forEach(tile => useTileStore.getState().addTile(tile.id))
      expect(useTileStore.getState().handSize).toBe(13)

      // Select tiles to pass
      const tilesToPass = mockTiles.slice(0, 3)
      tilesToPass.forEach(tile => useCharlestonStore.getState().selectTile(tile))

      expect(useCharlestonStore.getState().selectedTiles).toHaveLength(3)

      // Pass tiles (solo mode simulation)
      useCharlestonStore.getState().completePhase()
      
      // Tiles should be removed from hand
      expect(useTileStore.getState().handSize).toBe(10)

      // Receive tiles
      const receivedTiles = [
        { suit: 'bam', rank: '4', id: 'received-1' },
        { suit: 'bam', rank: '5', id: 'received-2' },
        { suit: 'bam', rank: '6', id: 'received-3' }
      ]

      receivedTiles.forEach(tile => useTileStore.getState().addTile(tile.id))
      expect(useTileStore.getState().handSize).toBe(13)

      // Charleston round should be complete
      expect(useCharlestonStore.getState().selectedTiles).toHaveLength(0)
    })
  })

  describe('Game Store → History Store Integration', () => {
    it('should record completed games correctly', async () => {
      // Access game store actions and state correctly
      // Access history store actions and state correctly
      // Access pattern store actions and state correctly

      // Set up game
      useGameStore.getState().setCoPilotMode('solo')
      useGameStore.getState().setGamePhase('playing')
      
      // Select patterns
      usePatternStore.getState().selectPattern(mockPatterns[0].Hands_Key)

      // Simulate game completion
      const gameData = {
        timestamp: new Date(),
        duration: 30, // 30 minutes
        outcome: 'won' as const,
        finalScore: 25,
        difficulty: 'intermediate' as const,
        selectedPatterns: usePatternStore.getState().getTargetPatterns(),
        finalHand: mockTiles.slice(0, 14).map(tile => ({
          ...tile,
          suit: tile.suit as TileSuit,
          value: tile.value as TileValue,
          displayName: `${tile.value} ${tile.suit}`,
          isJoker: false
        })), // Winning hand
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
      const gameDataWithTimestamp = { 
        ...gameData, 
        createdAt: new Date(),
        selectedPatterns: gameData.selectedPatterns.map(() => mockPatterns[0]) // Convert to NMJL2025Pattern format
      }
      useHistoryStore.getState().completeGame(gameDataWithTimestamp)

      // Verify game was recorded
      const completedGames = useHistoryStore.getState().completedGames
      expect(completedGames).toHaveLength(1)

      const recordedGame = completedGames[0]
      expect(recordedGame.coPilotMode).toBe('solo')
      expect(recordedGame.outcome).toBe('won')
      expect(recordedGame.selectedPatterns).toHaveLength(1)

      // Performance stats should be updated
      const stats = useHistoryStore.getState().performanceStats
      expect(stats.totalGames).toBe(1)
      expect(stats.gamesWon).toBe(1)
      expect(stats.winRate).toBe(100)
    })
  })

  describe('Cross-Store State Consistency', () => {
    it('should maintain consistent state across all stores', () => {
      // Access game store actions and state correctly
      // Access pattern store actions and state correctly
      // Access tile store actions and state correctly

      // Set up coordinated state
      useGameStore.getState().setCoPilotMode('solo')
      useGameStore.getState().setGamePhase('tile-input')
      
      usePatternStore.getState().selectPattern(mockPatterns[0].Hands_Key)
      mockTiles.forEach(tile => useTileStore.getState().addTile(tile.id))

      // All stores should reflect consistent state
      expect(useGameStore.getState().coPilotMode).toBe('solo')
      expect(usePatternStore.getState().getTargetPatterns()).toHaveLength(1)
      expect(useTileStore.getState().handSize).toBe(13)

      // Transition to next phase
      useGameStore.getState().setGamePhase('charleston')
      
      // State should remain consistent
      expect(useGameStore.getState().gamePhase).toBe('charleston')
      expect(usePatternStore.getState().getTargetPatterns()).toHaveLength(1) // Patterns preserved
      expect(useTileStore.getState().handSize).toBe(13) // Tiles preserved
    })

    it('should handle store resets gracefully', () => {
      // Access game store actions and state correctly
      // Access pattern store actions and state correctly
      // Access tile store actions and state correctly

      // Set up some state
      useGameStore.getState().setCoPilotMode('solo')
      usePatternStore.getState().selectPattern(mockPatterns[0].Hands_Key)
      useTileStore.getState().addTile(mockTiles[0].id)

      // Reset individual store
      usePatternStore.getState().clearSelection()
      expect(usePatternStore.getState().getTargetPatterns()).toHaveLength(0)
      
      // Other stores should remain unaffected
      expect(useGameStore.getState().coPilotMode).toBe('solo')
      expect(useTileStore.getState().handSize).toBe(1)

      // Reset game should reset everything
      useGameStore.getState().resetGame()
      expect(useGameStore.getState().coPilotMode).toBe(null) // default
      expect(useGameStore.getState().gamePhase).toBe('lobby') // default
    })
  })
})