// Game End Coordinator Tests
// Tests for all game end scenarios and statistics generation

import { GameEndCoordinator, type GameEndContext, getWallExhaustionWarning, shouldGameEnd } from '../game-end-coordinator'
import { GameStatisticsEngine } from '../game-statistics'
import type { NMJL2025Pattern } from 'shared-types'
import type { PlayerTile } from '../../types/tile-types'

describe('GameEndCoordinator', () => {
  const mockPattern: NMJL2025Pattern = {
    Year: 2025,
    Section: 'TEST',
    Line: 1,
    'Pattern ID': 1,
    Hands_Key: 'TEST-1',
    Hand_Pattern: 'TEST PATTERN',
    Hand_Description: 'Test Pattern Description',
    Hand_Points: 30,
    Hand_Conceiled: false,
    Hand_Difficulty: 'medium' as const,
    Hand_Notes: null,
    Groups: []
  }

  const mockPlayers = [
    { id: 'player1', name: 'Player 1' },
    { id: 'player2', name: 'Player 2' },
    { id: 'player3', name: 'Player 3' },
    { id: 'player4', name: 'Player 4' }
  ]

  const mockTile: PlayerTile = {
    id: '1D',
    suit: 'dots' as const,
    value: '1' as const,
    displayName: 'One Dot',
    instanceId: '1D-test',
    isSelected: false
  }

  const createMockContext = (overrides?: Partial<GameEndContext>): GameEndContext => ({
    gameId: 'test-game',
    players: mockPlayers,
    wallTilesRemaining: 50,
    passedOutPlayers: new Set(),
    currentTurn: 10,
    gameStartTime: new Date(Date.now() - 600000), // 10 minutes ago
    selectedPatterns: [mockPattern],
    playerHands: {
      player1: Array(14).fill(mockTile),
      player2: Array(13).fill(mockTile),
      player3: Array(13).fill(mockTile),
      player4: Array(13).fill(mockTile)
    },
    ...overrides
  })

  describe('Wall Exhaustion Detection', () => {
    it('should detect when wall is exhausted', () => {
      const context = createMockContext({ wallTilesRemaining: 6 }) // Less than 8 needed for 4 players
      const coordinator = new GameEndCoordinator(context)
      
      const result = coordinator.checkForGameEnd()
      
      expect(result).toBeTruthy()
      expect(result!.scenario.type).toBe('wall_exhausted')
      expect(result!.scenario.reason).toContain('Wall exhausted')
    })

    it('should not end game when wall has sufficient tiles', () => {
      const context = createMockContext({ wallTilesRemaining: 20 })
      const coordinator = new GameEndCoordinator(context)
      
      const result = coordinator.checkForGameEnd()
      
      expect(result).toBeNull()
    })

    it('should calculate correct wall statistics', () => {
      const wallCheck = GameStatisticsEngine.checkWallExhaustion(24, 4)
      
      expect(wallCheck.canContinue).toBe(true)
      expect(wallCheck.turnsUntilExhaustion).toBe(6) // 24 / 4 players
      expect(wallCheck.totalTilesInPlay).toBe(128) // 152 - 24
    })
  })

  describe('Player Pass Out Detection', () => {
    it('should detect when all players have passed out', () => {
      const passedOutPlayers = new Set(['player1', 'player2', 'player3'])
      const context = createMockContext({ passedOutPlayers })
      const coordinator = new GameEndCoordinator(context)
      
      const result = coordinator.checkForGameEnd()
      
      expect(result).toBeTruthy()
      expect(result!.scenario.type).toBe('all_passed_out')
      expect(result!.scenario.winner).toBe('player4') // Last remaining player
    })

    it('should not end game when sufficient players remain', () => {
      const passedOutPlayers = new Set(['player1'])
      const context = createMockContext({ passedOutPlayers })
      const coordinator = new GameEndCoordinator(context)
      
      const result = coordinator.checkForGameEnd()
      
      expect(result).toBeNull()
    })

    it('should check pass out logic correctly', () => {
      expect(GameStatisticsEngine.checkAllPlayersPassedOut(new Set(['p1', 'p2', 'p3']), 4)).toBe(true)
      expect(GameStatisticsEngine.checkAllPlayersPassedOut(new Set(['p1', 'p2']), 4)).toBe(false)
    })
  })

  describe('Mahjong Victory', () => {
    it('should handle mahjong victory correctly', () => {
      const context = createMockContext()
      const coordinator = new GameEndCoordinator(context)
      
      const winningHand = Array(14).fill(mockTile)
      const result = coordinator.endGameByMahjong('player1', mockPattern, winningHand)
      
      expect(result.scenario.type).toBe('mahjong')
      expect(result.scenario.winner).toBe('player1')
      expect(result.scenario.winningPattern).toEqual(mockPattern)
      expect(result.scenario.winningHand).toEqual(winningHand)
      expect(result.shouldNavigateToPostGame).toBe(true)
    })
  })

  describe('Game Statistics Generation', () => {
    it('should generate comprehensive statistics', () => {
      const context = createMockContext()
      const coordinator = new GameEndCoordinator(context)
      
      // Record some actions
      coordinator.recordPlayerAction('player1', 'draw', 30)
      coordinator.recordPlayerAction('player1', 'discard', 25)
      coordinator.updatePatternProgress('player1', 75)

      const result = coordinator.endGameByMahjong('player1', mockPattern, Array(14).fill(mockTile))
      
      expect(result.statistics.gameId).toBe('test-game')
      expect(result.statistics.duration).toBeGreaterThanOrEqual(0) // Should be calculated from actual time
      expect(result.statistics.totalTurns).toBe(2) // 2 recorded actions (draw + discard)
      expect(result.statistics.finalScores).toHaveLength(4)
      
      // Winner gets points, others get 0
      const winnerScore = result.statistics.finalScores.find(s => s.playerId === 'player1')
      const loserScore = result.statistics.finalScores.find(s => s.playerId === 'player2')
      expect(winnerScore?.score).toBe(30) // Pattern points
      expect(loserScore?.score).toBe(0)
    })

    it('should generate proper completed game data', () => {
      const context = createMockContext()
      const coordinator = new GameEndCoordinator(context)
      
      const result = coordinator.endGameByWallExhaustion()
      
      expect(result.completedGameData.outcome).toBe('draw')
      expect(result.completedGameData.selectedPatterns).toEqual([mockPattern])
      expect(result.completedGameData.performance).toBeDefined()
      expect(result.completedGameData.insights).toBeDefined()
      expect(result.completedGameData.playerCount).toBe(4)
    })
  })

  describe('Wall Exhaustion Warnings', () => {
    it('should generate appropriate warnings', () => {
      expect(getWallExhaustionWarning(15)).toContain('Only 15 tiles left')
      expect(getWallExhaustionWarning(35)).toContain('Wall running low')
      expect(getWallExhaustionWarning(60)).toBeNull()
    })
  })

  describe('Forfeit Scenarios', () => {
    it('should handle forfeit when only one player remains', () => {
      const passedOutPlayers = new Set(['player1', 'player2', 'player3'])
      const context = createMockContext({ passedOutPlayers })
      const coordinator = new GameEndCoordinator(context)
      
      const result = coordinator.checkForGameEnd()
      
      expect(result).toBeTruthy()
      // With 3 out of 4 players passed out, this should be 'all_passed_out' scenario
      expect(result!.scenario.type).toBe('all_passed_out') 
      expect(result!.scenario.winner).toBe('player4') // Last remaining player
    })
  })

  describe('Utility Functions', () => {
    it('should detect when game should end', () => {
      const contextShouldEnd = createMockContext({ wallTilesRemaining: 4 })
      const contextShouldContinue = createMockContext({ wallTilesRemaining: 40 })
      
      expect(shouldGameEnd(contextShouldEnd)).toBe(true)
      expect(shouldGameEnd(contextShouldContinue)).toBe(false)
    })
  })

  describe('Hand Revelation', () => {
    it('should create proper hand revelation data', () => {
      const context = createMockContext()
      const coordinator = new GameEndCoordinator(context)
      
      const revelationData = coordinator.createHandRevelationData()
      
      expect(revelationData.allPlayerHands).toEqual(context.playerHands)
      expect(revelationData.finalStatistics).toBeDefined()
      expect(revelationData.finalStatistics.gameId).toBe('test-game')
    })
  })
})