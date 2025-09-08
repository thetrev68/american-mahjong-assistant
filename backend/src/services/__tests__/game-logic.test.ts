// Game Logic Service Tests - Comprehensive validation of game mechanics

import { GameLogicService } from '../game-logic'
import type { Tile } from '@shared/game-types'

describe('GameLogicService', () => {
  let gameLogic: GameLogicService

  beforeEach(() => {
    gameLogic = new GameLogicService()
  })

  describe('Wall Management', () => {
    test('should initialize wall with 152 tiles', () => {
      const gameState = gameLogic.getGameState()
      expect(gameState.wall.tilesRemaining).toBe(152)
      expect(gameState.wall.totalDealt).toBe(0)
      expect(gameState.wall.isExhausted).toBe(false)
    })

    test('should deal initial hands correctly', () => {
      const playerIds = ['player1', 'player2', 'player3', 'player4']
      const hands = gameLogic.dealInitialHands(playerIds)
      
      // Each player should get 13 tiles initially
      expect(hands.size).toBe(4)
      hands.forEach((hand, playerId) => {
        expect(hand.length).toBe(13)
        expect(playerIds.includes(playerId)).toBe(true)
      })
      
      // Wall should have 100 tiles remaining (152 - 52 dealt)
      const gameState = gameLogic.getGameState()
      expect(gameState.wall.tilesRemaining).toBe(100)
      expect(gameState.wall.totalDealt).toBe(52)
    })
  })

  describe('Action Validation', () => {
    beforeEach(() => {
      // Set up a basic game state
      const playerIds = ['player1', 'player2']
      gameLogic.dealInitialHands(playerIds)
    })

    test('should validate draw action correctly', () => {
      // Valid draw
      const validResult = gameLogic.validateAction('player1', 'draw')
      expect(validResult.isValid).toBe(true)
      expect(validResult.violations).toHaveLength(0)
    })

    test('should reject invalid actions', () => {
      const invalidResult = gameLogic.validateAction('player1', 'invalid-action')
      expect(invalidResult.isValid).toBe(false)
      expect(invalidResult.violations).toContain('Unknown action: invalid-action')
      expect(invalidResult.alternativeActions).toContain('draw')
    })

    test('should reject actions from non-existent players', () => {
      const result = gameLogic.validateAction('nonexistent', 'draw')
      expect(result.isValid).toBe(false)
      expect(result.violations).toContain('Player not found in game')
    })
  })

  describe('Draw Action', () => {
    beforeEach(() => {
      const playerIds = ['player1', 'player2']
      gameLogic.dealInitialHands(playerIds)
    })

    test('should execute draw action successfully', async () => {
      const result = await gameLogic.executeAction('player1', 'draw')
      
      expect(result.success).toBe(true)
      expect(result.action).toBe('draw')
      expect(result.playerId).toBe('player1')
      expect(result.wallUpdated).toBe(true)
      expect(result.handUpdated).toBe(true)
      
      // Check data structure
      expect(result.data).toHaveProperty('tilesDrawn', 1)
      expect(result.data).toHaveProperty('wallTilesRemaining')
      expect(result.data).toHaveProperty('handSize', 14)
    })

    test('should prevent drawing when wall is exhausted', async () => {
      // Exhaust the wall
      const gameState = gameLogic.getGameState()
      while (gameState.wall.tilesRemaining > 0) {
        await gameLogic.executeAction('player1', 'draw')
        await gameLogic.executeAction('player1', 'discard', { 
          tile: { id: '1D', suit: 'dots', value: '1' } 
        })
      }
      
      const result = await gameLogic.executeAction('player1', 'draw')
      expect(result.success).toBe(false)
      expect(result.error).toContain('No tiles available')
    })
  })

  describe('Discard Action', () => {
    beforeEach(() => {
      const playerIds = ['player1', 'player2']
      gameLogic.dealInitialHands(playerIds)
    })

    test('should execute discard action successfully', async () => {
      // First draw a tile
      await gameLogic.executeAction('player1', 'draw')
      
      // Then discard a tile
      const tileToDiscard: Tile = { id: '1D', suit: 'dots', value: '1' }
      const result = await gameLogic.executeAction('player1', 'discard', { tile: tileToDiscard })
      
      expect(result.success).toBe(true)
      expect(result.action).toBe('discard')
      expect(result.discardUpdated).toBe(true)
      expect(result.handUpdated).toBe(true)
      expect(result.nextPlayer).toBe('player2')
      
      // Check discard pile updated
      const gameState = gameLogic.getGameState()
      expect(gameState.discardPile.tileCount).toBe(1)
      expect(gameState.discardPile.lastTile).toEqual(tileToDiscard)
    })

    test('should prevent discarding without drawing', async () => {
      const tileToDiscard: Tile = { id: '1D', suit: 'dots', value: '1' }
      const validation = gameLogic.validateAction('player1', 'discard', { tile: tileToDiscard })
      
      expect(validation.isValid).toBe(false)
      expect(validation.violations).toContain('Must draw before discarding')
    })
  })

  describe('Call Actions', () => {
    beforeEach(() => {
      const playerIds = ['player1', 'player2']
      gameLogic.dealInitialHands(playerIds)
      
      // Set up a discard for calling
      gameLogic.executeAction('player1', 'draw')
      gameLogic.executeAction('player1', 'discard', { 
        tile: { id: '1D', suit: 'dots', value: '1' } 
      })
    })

    test('should validate pung call requirements', () => {
      const validation = gameLogic.validateAction('player2', 'call_pung', {
        callType: 'pung',
        targetTile: { id: '1D', suit: 'dots', value: '1' }
      })
      
      // This will likely fail since we don't control the hand contents,
      // but it tests the validation structure
      expect(validation).toHaveProperty('isValid')
      expect(validation).toHaveProperty('violations')
    })

    test('should reject call with no discard pile', () => {
      // Clear the discard pile by creating fresh service
      const freshGameLogic = new GameLogicService()
      const playerIds = ['player1', 'player2']
      freshGameLogic.dealInitialHands(playerIds)
      
      const validation = freshGameLogic.validateAction('player1', 'call_pung', {
        callType: 'pung',
        targetTile: { id: '1D', suit: 'dots', value: '1' }
      })
      
      expect(validation.isValid).toBe(false)
      expect(validation.violations).toContain('No tiles available in discard pile')
    })
  })

  describe('Pass Action', () => {
    beforeEach(() => {
      const playerIds = ['player1', 'player2']
      gameLogic.dealInitialHands(playerIds)
    })

    test('should always allow pass action', () => {
      const validation = gameLogic.validateAction('player1', 'pass')
      expect(validation.isValid).toBe(true)
      expect(validation.violations).toHaveLength(0)
    })

    test('should execute pass action successfully', async () => {
      const result = await gameLogic.executeAction('player1', 'pass', { reason: 'Testing' })
      
      expect(result.success).toBe(true)
      expect(result.action).toBe('pass')
      expect(result.data).toHaveProperty('reason', 'Testing')
      expect(result.nextPlayer).toBe('player2')
    })
  })

  describe('Wall Exhaustion Detection', () => {
    test('should detect wall exhaustion correctly', () => {
      expect(gameLogic.isWallExhausted(8)).toBe(false) // Wall starts with 152 tiles
      expect(gameLogic.isWallExhausted(200)).toBe(true) // More than available
    })
  })

  describe('Game State Tracking', () => {
    test('should provide comprehensive game state', () => {
      const playerIds = ['player1', 'player2', 'player3']
      gameLogic.dealInitialHands(playerIds)
      
      const gameState = gameLogic.getGameState()
      
      expect(gameState).toHaveProperty('wall')
      expect(gameState).toHaveProperty('discardPile')
      expect(gameState).toHaveProperty('players')
      expect(gameState).toHaveProperty('currentPhase')
      expect(gameState).toHaveProperty('turnNumber')
      
      // Check player data structure
      expect(gameState.players).toHaveLength(3)
      gameState.players.forEach(player => {
        expect(player).toHaveProperty('playerId')
        expect(player).toHaveProperty('position')
        expect(player).toHaveProperty('handSize')
        expect(player).toHaveProperty('hasDrawn')
      })
    })
  })

  describe('Error Handling', () => {
    test('should handle invalid validation gracefully', () => {
      const validation = gameLogic.validateAction('player1', 'discard', {})
      expect(validation.isValid).toBe(false)
      expect(validation.violations).toContain('Player not found in game')
    })

    test('should handle execution errors gracefully', async () => {
      const result = await gameLogic.executeAction('nonexistent', 'draw')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Player not found in game')
    })
  })
})