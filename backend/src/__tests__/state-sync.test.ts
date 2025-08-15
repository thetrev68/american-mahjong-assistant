// State Sync Test Suite - Comprehensive TDD for multiplayer state synchronization

import { StateSyncManager, StateUpdate } from '../features/state-sync/state-sync-manager'
import { RoomManager } from '../features/room-lifecycle/room-manager'
import type { GameState } from '@shared/multiplayer-types'

describe('StateSyncManager', () => {
  let stateSyncManager: StateSyncManager
  let roomManager: RoomManager

  beforeEach(() => {
    roomManager = new RoomManager()
    stateSyncManager = new StateSyncManager()
  })

  describe('Game State Management', () => {
    let roomId: string

    beforeEach(() => {
      const room = roomManager.createRoom('host', { maxPlayers: 4 })
      roomId = room.id
    })

    it('should initialize game state for room', () => {
      const gameState = stateSyncManager.initializeGameState(roomId)

      expect(gameState).toEqual({
        roomId,
        phase: 'setup',
        currentRound: 1,
        currentWind: 'east',
        dealerPosition: 0,
        playerStates: {},
        sharedState: {
          discardPile: [],
          wallTilesRemaining: 144,
          currentPlayer: null
        },
        lastUpdated: expect.any(Date)
      })
    })

    it('should retrieve existing game state', () => {
      const initialized = stateSyncManager.initializeGameState(roomId)
      const retrieved = stateSyncManager.getGameState(roomId)

      expect(retrieved).toEqual(initialized)
    })

    it('should return null for non-existent game state', () => {
      const retrieved = stateSyncManager.getGameState('non-existent')
      expect(retrieved).toBeNull()
    })

    it('should clear game state', () => {
      stateSyncManager.initializeGameState(roomId)
      stateSyncManager.clearGameState(roomId)

      expect(stateSyncManager.getGameState(roomId)).toBeNull()
      expect(stateSyncManager.getUpdateHistory(roomId)).toEqual([])
    })

    it('should validate game state structure', () => {
      const gameState = stateSyncManager.initializeGameState(roomId)
      const isValid = stateSyncManager.validateGameState(gameState)

      expect(isValid).toBe(true)
    })

    it('should reject invalid game state', () => {
      const invalidGameState = {
        roomId: '',
        phase: 'invalid-phase' as any,
        currentRound: 0,
        currentWind: 'invalid-wind' as any,
        dealerPosition: -1,
        playerStates: {},
        sharedState: {
          discardPile: [],
          wallTilesRemaining: 144,
          currentPlayer: null
        },
        lastUpdated: new Date()
      } as GameState

      const isValid = stateSyncManager.validateGameState(invalidGameState)
      expect(isValid).toBe(false)
    })
  })

  describe('State Updates', () => {
    let roomId: string
    let gameState: GameState

    beforeEach(() => {
      const room = roomManager.createRoom('host', { maxPlayers: 4 })
      roomManager.joinRoom(room.id, { id: 'player1', name: 'Player 1', isHost: false })
      roomId = room.id
      gameState = stateSyncManager.initializeGameState(roomId)
    })

    it('should process valid state update', async () => {
      const update = {
        type: 'phase-change' as const,
        data: { phase: 'charleston' },
        timestamp: new Date()
      }

      const updatedState = await stateSyncManager.processUpdate(roomId, 'host', update)

      expect(updatedState.phase).toBe('charleston')
      expect(updatedState.lastUpdated).toBeInstanceOf(Date)
    })

    it('should update player state', () => {
      const playerState = {
        handTileCount: 13,
        isReady: true,
        selectedPatterns: ['pattern1', 'pattern2']
      }

      const updatedState = stateSyncManager.updatePlayerState(roomId, 'player1', playerState)

      expect(updatedState).not.toBeNull()
      expect(updatedState!.playerStates['player1']).toEqual(playerState)
      expect(updatedState!.lastUpdated).toBeInstanceOf(Date)
    })

    it('should update shared state', () => {
      const sharedState = {
        currentPlayer: 'player1',
        wallTilesRemaining: 143
      }

      const updatedState = stateSyncManager.updateSharedState(roomId, sharedState)

      expect(updatedState).not.toBeNull()
      expect(updatedState!.sharedState.currentPlayer).toBe('player1')
      expect(updatedState!.sharedState.wallTilesRemaining).toBe(143)
      expect(updatedState!.sharedState.discardPile).toEqual([]) // Should preserve existing properties
    })

    it('should update game phase', () => {
      const updatedState = stateSyncManager.updateGamePhase(roomId, 'charleston')

      expect(updatedState).not.toBeNull()
      expect(updatedState!.phase).toBe('charleston')
      expect(updatedState!.lastUpdated).toBeInstanceOf(Date)
    })

    it('should maintain update history', async () => {
      const update1 = {
        type: 'phase-change' as const,
        data: { phase: 'charleston' },
        timestamp: new Date(Date.now() - 1000)
      }

      const update2 = {
        type: 'player-state' as const,
        data: { isReady: true },
        timestamp: new Date()
      }

      await stateSyncManager.processUpdate(roomId, 'host', update1)
      await stateSyncManager.processUpdate(roomId, 'player1', update2)

      const history = stateSyncManager.getUpdateHistory(roomId)
      expect(history).toHaveLength(2)
      expect(history[0].type).toBe('phase-change')
      expect(history[1].type).toBe('player-state')
    })

    it('should limit update history size', async () => {
      // Add more than 100 updates
      for (let i = 0; i < 105; i++) {
        await stateSyncManager.processUpdate(roomId, 'host', {
          type: 'player-state' as const,
          data: { score: i },
          timestamp: new Date()
        })
      }

      const history = stateSyncManager.getUpdateHistory(roomId)
      expect(history).toHaveLength(100) // Should be capped at 100
    })
  })

  describe('State Validation', () => {
    let roomId: string

    beforeEach(() => {
      const room = roomManager.createRoom('host', { maxPlayers: 4 })
      roomId = room.id
      stateSyncManager.initializeGameState(roomId)
    })

    it('should validate phase changes', async () => {
      // Valid transition: setup -> charleston
      await expect(
        stateSyncManager.processUpdate(roomId, 'host', {
          type: 'phase-change',
          data: { phase: 'charleston' },
          timestamp: new Date()
        })
      ).resolves.toBeDefined()

      // Invalid transition: charleston -> setup (not allowed)
      await expect(
        stateSyncManager.processUpdate(roomId, 'host', {
          type: 'phase-change',
          data: { phase: 'setup' },
          timestamp: new Date()
        })
      ).rejects.toThrow(/Invalid phase transition/)
    })

    it('should validate player state data', async () => {
      // Valid player state
      await expect(
        stateSyncManager.processUpdate(roomId, 'host', {
          type: 'player-state',
          data: { handTileCount: 13, isReady: true },
          timestamp: new Date()
        })
      ).resolves.toBeDefined()

      // Invalid hand tile count
      await expect(
        stateSyncManager.processUpdate(roomId, 'host', {
          type: 'player-state',
          data: { handTileCount: 20 },
          timestamp: new Date()
        })
      ).rejects.toThrow(/Invalid hand tile count/)
    })

    it('should validate shared state data', async () => {
      // Valid shared state
      await expect(
        stateSyncManager.processUpdate(roomId, 'host', {
          type: 'shared-state',
          data: { wallTilesRemaining: 143 },
          timestamp: new Date()
        })
      ).resolves.toBeDefined()

      // Invalid wall tiles remaining
      await expect(
        stateSyncManager.processUpdate(roomId, 'host', {
          type: 'shared-state',
          data: { wallTilesRemaining: 200 },
          timestamp: new Date()
        })
      ).rejects.toThrow(/Invalid wall tiles remaining/)
    })
  })

  describe('State Synchronization', () => {
    let roomId: string

    beforeEach(() => {
      const room = roomManager.createRoom('host', { maxPlayers: 4 })
      roomId = room.id
      stateSyncManager.initializeGameState(roomId)
    })

    it('should sync remote state when newer', () => {
      const localState = stateSyncManager.getGameState(roomId)!
      
      const remoteState: GameState = {
        ...localState,
        phase: 'charleston',
        lastUpdated: new Date(Date.now() + 1000) // Newer
      }

      const syncedState = stateSyncManager.syncGameState(roomId, remoteState)

      expect(syncedState.phase).toBe('charleston')
      expect(syncedState).toEqual(remoteState)
    })

    it('should keep local state when newer', () => {
      const localState = stateSyncManager.getGameState(roomId)!
      localState.phase = 'charleston'
      localState.lastUpdated = new Date()

      const remoteState: GameState = {
        ...localState,
        phase: 'playing',
        lastUpdated: new Date(Date.now() - 1000) // Older
      }

      const syncedState = stateSyncManager.syncGameState(roomId, remoteState)

      expect(syncedState.phase).toBe('charleston')
      expect(syncedState).toEqual(localState)
    })
  })

  describe('Player Cleanup', () => {
    let roomId: string

    beforeEach(() => {
      const room = roomManager.createRoom('host', { maxPlayers: 4 })
      roomId = room.id
      stateSyncManager.initializeGameState(roomId)
    })

    it('should clean up player state on disconnect', () => {
      // Add player state
      stateSyncManager.updatePlayerState(roomId, 'player1', {
        handTileCount: 13,
        isReady: true
      })

      // Verify player state exists
      let gameState = stateSyncManager.getGameState(roomId)!
      expect(gameState.playerStates['player1']).toBeDefined()

      // Clean up player
      stateSyncManager.cleanupPlayerState('player1')

      // Verify player state is removed
      gameState = stateSyncManager.getGameState(roomId)!
      expect(gameState.playerStates['player1']).toBeUndefined()
      expect(gameState.lastUpdated).toBeInstanceOf(Date)
    })

    it('should clean up player from multiple rooms', () => {
      const room2 = roomManager.createRoom('host2', { maxPlayers: 4 })
      const roomId2 = room2.id
      stateSyncManager.initializeGameState(roomId2)

      // Add player to both rooms
      stateSyncManager.updatePlayerState(roomId, 'player1', { isReady: true })
      stateSyncManager.updatePlayerState(roomId2, 'player1', { isReady: true })

      // Clean up player
      stateSyncManager.cleanupPlayerState('player1')

      // Verify player removed from both rooms
      const gameState1 = stateSyncManager.getGameState(roomId)!
      const gameState2 = stateSyncManager.getGameState(roomId2)!
      
      expect(gameState1.playerStates['player1']).toBeUndefined()
      expect(gameState2.playerStates['player1']).toBeUndefined()
    })
  })
})