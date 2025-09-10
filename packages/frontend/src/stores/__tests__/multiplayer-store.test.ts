// Multiplayer Store Test Suite - Comprehensive TDD for multiplayer state management

import { useMultiplayerStore } from '../multiplayer-store'
import type { Room, Player, GameState } from 'shared-types'

// Mock data
const mockRoom: Room = {
  id: 'room-123',
  hostId: 'host-player',
  players: [
    { id: 'host-player', name: 'Host', isHost: true },
    { id: 'player2', name: 'Player 2', isHost: false }
  ],
  phase: 'waiting',
  maxPlayers: 4,
  isPrivate: false,
  roomName: 'Test Room',
  createdAt: new Date()
}

const mockGameState: GameState = {
  roomId: 'room-123',
  phase: 'setup',
  currentRound: 1,
  currentWind: 'east',
  dealerPosition: 0,
  playerStates: {
    'host-player': { isReady: true, handTileCount: 13 },
    'player2': { isReady: false, handTileCount: 13 }
  },
  sharedState: {
    discardPile: [],
    wallTilesRemaining: 144,
    currentPlayer: null
  },
  lastUpdated: new Date()
}

describe('Multiplayer Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = useMultiplayerStore.getState()
    store.clearAll()
  })

  describe('Room State Management', () => {
    it('should initialize with empty state', () => {
      const store = useMultiplayerStore.getState()

      expect(store.currentRoom).toBeNull()
      expect(store.availableRooms).toEqual([])
      expect(store.gameState).toBeNull()
      expect(store.isConnected).toBe(false)
      expect(store.connectionError).toBeNull()
    })

    it('should set current room', () => {
      const store = useMultiplayerStore.getState()

      store.setCurrentRoom(mockRoom)

      const updatedStore = useMultiplayerStore.getState()
      expect(updatedStore.currentRoom).toEqual(mockRoom)
      expect(updatedStore.isHost).toBe(false) // Current player is not host in mock
    })

    it('should determine host status correctly', () => {
      const store = useMultiplayerStore.getState()

      // Set current player as host
      const hostRoom = { ...mockRoom, hostId: 'current-player-id' }
      store.setCurrentPlayerId('current-player-id')
      store.setCurrentRoom(hostRoom)

      const updatedStore = useMultiplayerStore.getState()
      expect(updatedStore.isHost).toBe(true)
    })

    it('should clear current room', () => {
      const store = useMultiplayerStore.getState()

      store.setCurrentRoom(mockRoom)
      store.clearCurrentRoom()

      const updatedStore = useMultiplayerStore.getState()
      expect(updatedStore.currentRoom).toBeNull()
      expect(updatedStore.gameState).toBeNull()
      expect(updatedStore.isHost).toBe(false)
    })

    it('should update room list', () => {
      const store = useMultiplayerStore.getState()
      const rooms = [mockRoom, { ...mockRoom, id: 'room-456' }]

      store.updateAvailableRooms(rooms)

      const updatedStore = useMultiplayerStore.getState()
      expect(updatedStore.availableRooms).toEqual(rooms)
    })

    it('should filter public rooms', () => {
      const store = useMultiplayerStore.getState()
      const rooms = [
        { ...mockRoom, isPrivate: false },
        { ...mockRoom, id: 'room-456', isPrivate: true },
        { ...mockRoom, id: 'room-789', isPrivate: false }
      ]

      store.updateAvailableRooms(rooms)

      const publicRooms = store.getPublicRooms()
      expect(publicRooms).toHaveLength(2)
      expect(publicRooms.every(room => !room.isPrivate)).toBe(true)
    })
  })

  describe('Player Management', () => {
    beforeEach(() => {
      const store = useMultiplayerStore.getState()
      store.setCurrentRoom(mockRoom)
    })

    it('should add player to current room', () => {
      const store = useMultiplayerStore.getState()
      const newPlayer: Player = { id: 'player3', name: 'Player 3', isHost: false }

      store.addPlayerToRoom(newPlayer)

      const updatedStore = useMultiplayerStore.getState()
      expect(updatedStore.currentRoom!.players).toHaveLength(3)
      expect(updatedStore.currentRoom!.players[2]).toEqual(newPlayer)
    })

    it('should remove player from current room', () => {
      const store = useMultiplayerStore.getState()

      store.removePlayerFromRoom('player2')

      const updatedStore = useMultiplayerStore.getState()
      expect(updatedStore.currentRoom!.players).toHaveLength(1)
      expect(updatedStore.currentRoom!.players[0].id).toBe('host-player')
    })

    it('should update player information', () => {
      const store = useMultiplayerStore.getState()

      store.updatePlayer('player2', { name: 'Updated Player 2' })

      const updatedStore = useMultiplayerStore.getState()
      const updatedPlayer = updatedStore.currentRoom!.players.find(p => p.id === 'player2')
      expect(updatedPlayer?.name).toBe('Updated Player 2')
      expect(updatedPlayer?.isHost).toBe(false) // Should preserve other properties
    })

    it('should get current player information', () => {
      const store = useMultiplayerStore.getState()
      store.setCurrentPlayerId('player2')

      const currentPlayer = store.getCurrentPlayer()
      expect(currentPlayer).toEqual({
        id: 'player2',
        name: 'Player 2',
        isHost: false
      })
    })

    it('should handle player updates when no current room', () => {
      const store = useMultiplayerStore.getState()
      store.clearCurrentRoom()

      const newPlayer: Player = { id: 'player3', name: 'Player 3', isHost: false }
      store.addPlayerToRoom(newPlayer)

      const updatedStore = useMultiplayerStore.getState()
      expect(updatedStore.currentRoom).toBeNull() // Should remain null
    })
  })

  describe('Game State Management', () => {
    beforeEach(() => {
      const store = useMultiplayerStore.getState()
      store.setCurrentRoom(mockRoom)
    })

    it('should set game state', () => {
      const store = useMultiplayerStore.getState()

      store.setGameState(mockGameState)

      const updatedStore = useMultiplayerStore.getState()
      expect(updatedStore.gameState).toEqual(mockGameState)
    })

    it('should update game phase', () => {
      const store = useMultiplayerStore.getState()
      store.setGameState(mockGameState)

      store.updateGamePhase('charleston')

      const updatedStore = useMultiplayerStore.getState()
      expect(updatedStore.gameState!.phase).toBe('charleston')
      expect(updatedStore.gameState!.lastUpdated).toBeInstanceOf(Date)
    })

    it('should update player state', () => {
      const store = useMultiplayerStore.getState()
      store.setGameState(mockGameState)

      store.updatePlayerGameState('player2', { 
        isReady: true, 
        selectedPatterns: ['pattern1', 'pattern2'] 
      })

      const updatedStore = useMultiplayerStore.getState()
      expect(updatedStore.gameState!.playerStates['player2']).toEqual({
        isReady: true,
        handTileCount: 13, // Should preserve existing properties
        selectedPatterns: ['pattern1', 'pattern2']
      })
    })

    it('should update shared state', () => {
      const store = useMultiplayerStore.getState()
      store.setGameState(mockGameState)

      store.updateSharedGameState({
        currentPlayer: 'player2',
        wallTilesRemaining: 143
      })

      const updatedStore = useMultiplayerStore.getState()
      expect(updatedStore.gameState!.sharedState.currentPlayer).toBe('player2')
      expect(updatedStore.gameState!.sharedState.wallTilesRemaining).toBe(143)
      expect(updatedStore.gameState!.sharedState.discardPile).toEqual([]) // Should preserve existing properties
    })

    it('should get player game state', () => {
      const store = useMultiplayerStore.getState()
      store.setGameState(mockGameState)

      const playerState = store.getPlayerGameState('host-player')
      expect(playerState).toEqual({
        isReady: true,
        handTileCount: 13
      })
    })

    it('should check if all players are ready', () => {
      const store = useMultiplayerStore.getState()
      const allReadyState = {
        ...mockGameState,
        playerStates: {
          'host-player': { isReady: true, handTileCount: 13 },
          'player2': { isReady: true, handTileCount: 13 }
        }
      }

      store.setGameState(allReadyState)

      const allReady = store.areAllPlayersReady()
      expect(allReady).toBe(true)
    })

    it('should return false when not all players are ready', () => {
      const store = useMultiplayerStore.getState()
      store.setGameState(mockGameState) // player2 is not ready

      const allReady = store.areAllPlayersReady()
      expect(allReady).toBe(false)
    })
  })

  describe('Connection State Management', () => {
    it('should set connection state', () => {
      const store = useMultiplayerStore.getState()

      store.setConnectionState(true, 'socket-123')

      const updatedStore = useMultiplayerStore.getState()
      expect(updatedStore.isConnected).toBe(true)
      expect(updatedStore.socketId).toBe('socket-123')
      expect(updatedStore.connectionError).toBeNull()
    })

    it('should set connection error', () => {
      const store = useMultiplayerStore.getState()

      store.setConnectionError('Network timeout')

      const updatedStore = useMultiplayerStore.getState()
      expect(updatedStore.isConnected).toBe(false)
      expect(updatedStore.connectionError).toBe('Network timeout')
    })

    it('should clear connection error on successful connection', () => {
      const store = useMultiplayerStore.getState()

      store.setConnectionError('Previous error')
      store.setConnectionState(true, 'socket-123')

      const updatedStore = useMultiplayerStore.getState()
      expect(updatedStore.connectionError).toBeNull()
    })
  })

  describe('Store Actions Integration', () => {
    it('should provide all necessary actions', () => {
      const store = useMultiplayerStore.getState()

      expect(typeof store.setCurrentRoom).toBe('function')
      expect(typeof store.clearCurrentRoom).toBe('function')
      expect(typeof store.addPlayerToRoom).toBe('function')
      expect(typeof store.removePlayerFromRoom).toBe('function')
      expect(typeof store.setGameState).toBe('function')
      expect(typeof store.updateGamePhase).toBe('function')
      expect(typeof store.setConnectionState).toBe('function')
      expect(typeof store.clearAll).toBe('function')
    })

    it('should clear all state', () => {
      const store = useMultiplayerStore.getState()

      // Set some state
      store.setCurrentRoom(mockRoom)
      store.setGameState(mockGameState)
      store.setConnectionState(true, 'socket-123')

      // Clear all
      store.clearAll()

      const clearedStore = useMultiplayerStore.getState()
      expect(clearedStore.currentRoom).toBeNull()
      expect(clearedStore.gameState).toBeNull()
      expect(clearedStore.availableRooms).toEqual([])
      expect(clearedStore.isConnected).toBe(false)
      expect(clearedStore.socketId).toBeNull()
      expect(clearedStore.connectionError).toBeNull()
    })
  })

  describe('Computed Properties', () => {
    it('should compute room statistics correctly', () => {
      const store = useMultiplayerStore.getState()
      store.setCurrentRoom(mockRoom)

      const stats = store.getRoomStats()
      expect(stats).toEqual({
        playerCount: 2,
        maxPlayers: 4,
        spotsRemaining: 2,
        isFull: false,
        isEmpty: false
      })
    })

    it('should handle edge cases for room statistics', () => {
      const store = useMultiplayerStore.getState()

      // No current room
      const noRoomStats = store.getRoomStats()
      expect(noRoomStats).toEqual({
        playerCount: 0,
        maxPlayers: 0,
        spotsRemaining: 0,
        isFull: false,
        isEmpty: true
      })

      // Full room
      const fullRoom = {
        ...mockRoom,
        players: [
          { id: 'p1', name: 'P1', isHost: true },
          { id: 'p2', name: 'P2', isHost: false },
          { id: 'p3', name: 'P3', isHost: false },
          { id: 'p4', name: 'P4', isHost: false }
        ]
      }
      store.setCurrentRoom(fullRoom)

      const fullRoomStats = store.getRoomStats()
      expect(fullRoomStats).toEqual({
        playerCount: 4,
        maxPlayers: 4,
        spotsRemaining: 0,
        isFull: true,
        isEmpty: false
      })
    })
  })
})