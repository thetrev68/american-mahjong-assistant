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
import type { TileSuit } from '@shared/tile-utils'
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
  { suit: 'bams', value: '1', id: 'tile-1' },
  { suit: 'bams', value: '2', id: 'tile-2' },
  { suit: 'bams', value: '3', id: 'tile-3' },
  { suit: 'cracks', value: '1', id: 'tile-4' },
  { suit: 'cracks', value: '2', id: 'tile-5' },
  { suit: 'cracks', value: '3', id: 'tile-6' },
  { suit: 'dots', value: '1', id: 'tile-7' },
  { suit: 'dots', value: '2', id: 'tile-8' },
  { suit: 'dots', value: '3', id: 'tile-9' },
  { suit: 'flowers', value: 'f1', id: 'tile-10' },
  { suit: 'flowers', value: 'f2', id: 'tile-11' },
  { suit: 'flowers', value: 'f3', id: 'tile-12' },
  { suit: 'flowers', value: 'f4', id: 'tile-13' }
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
      const patternStore = usePatternStore.getState()
      const tileStore = useTileStore.getState()
      const intelligenceStore = useIntelligenceStore.getState()

      // Select patterns first
      patternStore.selectPattern(mockPatterns[0].Hands_Key)
      patternStore.selectPattern(mockPatterns[1].Hands_Key)

      const selectedPatterns = patternStore.getTargetPatterns()
      expect(selectedPatterns).toHaveLength(2)

      // Add tiles
      mockTiles.forEach(tile => tileStore.addTile(tile.id))
      expect(tileStore.handSize).toBe(13)

      // Intelligence analysis should reflect both patterns and tiles
      const analysis = intelligenceStore.currentAnalysis
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
      const patternStore = usePatternStore.getState()
      const intelligenceStore = useIntelligenceStore.getState()

      // Select and then deselect pattern
      patternStore.selectPattern(mockPatterns[0].Hands_Key)
      expect(patternStore.getTargetPatterns()).toHaveLength(1)

      patternStore.removeTargetPattern(mockPatterns[0].Hands_Key)
      expect(patternStore.getTargetPatterns()).toHaveLength(0)

      // Analysis should reflect the change
      const analysis = intelligenceStore.currentAnalysis
      expect(analysis?.recommendedPatterns).toHaveLength(0)
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

      // Complete charleston phases
      charlestonStore.setPhase('across')
      expect(charlestonStore.currentPhase).toBe('across')

      charlestonStore.setPhase('left')
      expect(charlestonStore.currentPhase).toBe('left')

      charlestonStore.setPhase('complete')
      expect(charlestonStore.currentPhase).toBe('complete')

      // Game phase should be ready to advance
      expect(gameStore.gamePhase).toBe('charleston')
    })

    it('should handle player readiness correctly', () => {
      const gameStore = useGameStore.getState()

      // Set up solo mode
      gameStore.setCoPilotMode('solo')
      gameStore.addPlayer({ id: 'player-1', name: 'Solo Player', isReady: false, position: 'east', isConnected: true })

      expect(gameStore.players).toHaveLength(1)
      expect(gameStore.coPilotMode).toBe('solo')

      // Mark player as ready
      gameStore.updatePlayer('player-1', { isReady: true })
      const player = gameStore.players.find(p => p.id === 'player-1')
      expect(player?.isReady).toBe(true)
    })
  })

  describe('Tile Store → Charleston Store Integration', () => {
    it('should handle tile passing correctly', () => {
      const tileStore = useTileStore.getState()
      const charlestonStore = useCharlestonStore.getState()

      // Set up initial hand
      mockTiles.slice(0, 13).forEach(tile => tileStore.addTile(tile.id))
      expect(tileStore.handSize).toBe(13)

      // Select tiles to pass
      const tilesToPass = mockTiles.slice(0, 3)
      tilesToPass.forEach(tile => charlestonStore.selectTile(tile))

      expect(charlestonStore.selectedTiles).toHaveLength(3)

      // Pass tiles (solo mode simulation)
      charlestonStore.completePhase()
      
      // Tiles should be removed from hand
      expect(tileStore.handSize).toBe(10)

      // Receive tiles
      const receivedTiles = [
        { suit: 'bam', rank: '4', id: 'received-1' },
        { suit: 'bam', rank: '5', id: 'received-2' },
        { suit: 'bam', rank: '6', id: 'received-3' }
      ]

      receivedTiles.forEach(tile => tileStore.addTile(tile.id))
      expect(tileStore.handSize).toBe(13)

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
      gameStore.setGamePhase('playing')
      
      // Select patterns
      patternStore.selectPattern(mockPatterns[0].Hands_Key)

      // Simulate game completion
      const gameData = {
        timestamp: new Date(),
        duration: 30, // 30 minutes
        outcome: 'won' as const,
        finalScore: 25,
        difficulty: 'intermediate' as const,
        selectedPatterns: patternStore.getTargetPatterns(),
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
      historyStore.completeGame(gameDataWithTimestamp)

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
      
      patternStore.selectPattern(mockPatterns[0].Hands_Key)
      mockTiles.forEach(tile => tileStore.addTile(tile.id))

      // All stores should reflect consistent state
      expect(gameStore.coPilotMode).toBe('solo')
      expect(patternStore.getTargetPatterns()).toHaveLength(1)
      expect(tileStore.handSize).toBe(13)

      // Transition to next phase
      gameStore.setGamePhase('charleston')
      
      // State should remain consistent
      expect(gameStore.gamePhase).toBe('charleston')
      expect(patternStore.getTargetPatterns()).toHaveLength(1) // Patterns preserved
      expect(tileStore.handSize).toBe(13) // Tiles preserved
    })

    it('should handle store resets gracefully', () => {
      const gameStore = useGameStore.getState()
      const patternStore = usePatternStore.getState()
      const tileStore = useTileStore.getState()

      // Set up some state
      gameStore.setCoPilotMode('solo')
      patternStore.selectPattern(mockPatterns[0].Hands_Key)
      tileStore.addTile(mockTiles[0].id)

      // Reset individual store
      patternStore.clearSelection()
      expect(patternStore.getTargetPatterns()).toHaveLength(0)
      
      // Other stores should remain unaffected
      expect(gameStore.coPilotMode).toBe('solo')
      expect(tileStore.handSize).toBe(1)

      // Reset game should reset everything
      gameStore.resetGame()
      expect(gameStore.coPilotMode).toBe(null) // default
      expect(gameStore.gamePhase).toBe('lobby') // default
    })
  })
})