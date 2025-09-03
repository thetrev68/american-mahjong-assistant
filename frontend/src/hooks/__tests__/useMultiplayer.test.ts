// useMultiplayer Hook Test Suite - Comprehensive TDD for multiplayer game logic

import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useMultiplayer } from '../useMultiplayer'
import { useSocket } from '../useSocket'
import { useMultiplayerStore } from '../../stores/multiplayer-store'

// Mock dependencies
vi.mock('../useSocket')
vi.mock('../../stores/multiplayer-store')

const mockSocketHook = {
  isConnected: true,
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  socketId: 'test-socket-id',
  connectionError: null as string | null
}

const mockMultiplayerStore = {
  currentRoom: null,
  gameState: null,
  isHost: false,
  availableRooms: [],
  getCurrentPlayer: vi.fn(),
  getRoomStats: vi.fn(),
  areAllPlayersReady: vi.fn(),
  setConnectionState: vi.fn(),
  setConnectionError: vi.fn(),
  setCurrentRoom: vi.fn(),
  setCurrentPlayerId: vi.fn(),
  clearCurrentRoom: vi.fn(),
  setGameState: vi.fn(),
  addPlayerToRoom: vi.fn(),
  removePlayerFromRoom: vi.fn(),
  updateAvailableRooms: vi.fn(),
};

describe('useMultiplayer Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useSocket as vi.MockedFunction<typeof useSocket>).mockReturnValue(mockSocketHook)
    ;(useMultiplayerStore as vi.MockedFunction<typeof useMultiplayerStore>).mockReturnValue(mockStore)
  })

  describe('Room Management', () => {
    it('should create room successfully', async () => {
      const { result } = renderHook(() => useMultiplayer())

      const roomConfig = {
        hostName: 'Test Host',
        maxPlayers: 4,
        roomName: 'Test Room'
      }

      await act(async () => {
        await result.current.createRoom(roomConfig)
      })

      expect(mockSocketHook.emit).toHaveBeenCalledWith('create-room', {
        hostName: 'Test Host',
        config: {
          maxPlayers: 4,
          roomName: 'Test Room'
        }
      })

      expect(result.current.isCreatingRoom).toBe(false)
    })

    it('should handle room creation failure', async () => {
      const { result } = renderHook(() => useMultiplayer())

      // Mock failed response
      mockSocketHook.on.mockImplementation((event, callback) => {
        if (event === 'room-created') {
          setTimeout(() => callback({
            success: false,
            error: 'Room creation failed'
          }), 0)
        }
      })

      const roomConfig = {
        hostName: 'Test Host',
        maxPlayers: 4
      }

      await act(async () => {
        const result_promise = result.current.createRoom(roomConfig)
        await expect(result_promise).rejects.toThrow('Room creation failed')
      })

      expect(result.current.lastError).toBe('Room creation failed')
      expect(result.current.isCreatingRoom).toBe(false)
    })

    it('should join room successfully', async () => {
      const { result } = renderHook(() => useMultiplayer())

      await act(async () => {
        await result.current.joinRoom('room-123', 'Player Name')
      })

      expect(mockSocketHook.emit).toHaveBeenCalledWith('join-room', {
        roomId: 'room-123',
        playerName: 'Player Name'
      })

      expect(result.current.isJoiningRoom).toBe(false)
    })

    it('should leave room successfully', async () => {
      mockStore.currentRoom = { id: 'room-123', hostId: 'other-player' }
      const { result } = renderHook(() => useMultiplayer())

      await act(async () => {
        await result.current.leaveRoom()
      })

      expect(mockSocketHook.emit).toHaveBeenCalledWith('leave-room', {
        roomId: 'room-123'
      })

      expect(mockStore.clearCurrentRoom).toHaveBeenCalled()
    })

    it('should handle room not found error', async () => {
      const { result } = renderHook(() => useMultiplayer())

      mockSocketHook.on.mockImplementation((event, callback) => {
        if (event === 'room-joined') {
          setTimeout(() => callback({
            success: false,
            error: 'Room not found'
          }), 0)
        }
      })

      await act(async () => {
        await expect(
          result.current.joinRoom('non-existent', 'Player')
        ).rejects.toThrow('Room not found')
      })

      expect(result.current.lastError).toBe('Room not found')
    })
  })

  describe('Game State Management', () => {
    beforeEach(() => {
      mockStore.currentRoom = { id: 'room-123', hostId: 'host-id' }
      mockStore.gameState = {
        phase: 'setup',
        currentRound: 1,
        playerStates: {}
      }
    })

    it('should update game phase', async () => {
      const { result } = renderHook(() => useMultiplayer())

      await act(async () => {
        await result.current.updateGamePhase('charleston')
      })

      expect(mockSocketHook.emit).toHaveBeenCalledWith('state-update', {
        roomId: 'room-123',
        update: {
          type: 'phase-change',
          data: { phase: 'charleston' },
          timestamp: expect.any(Date)
        }
      })
    })

    it('should update player state', async () => {
      const { result } = renderHook(() => useMultiplayer())

      const playerState = {
        handTileCount: 13,
        isReady: true,
        selectedPatterns: ['pattern1']
      }

      await act(async () => {
        await result.current.updatePlayerState(playerState)
      })

      expect(mockSocketHook.emit).toHaveBeenCalledWith('state-update', {
        roomId: 'room-123',
        update: {
          type: 'player-state',
          data: playerState,
          timestamp: expect.any(Date)
        }
      })
    })

    it('should sync shared state', async () => {
      const { result } = renderHook(() => useMultiplayer())

      const sharedState = {
        currentPlayer: 'player-2',
        wallTilesRemaining: 142
      }

      await act(async () => {
        await result.current.updateSharedState(sharedState)
      })

      expect(mockSocketHook.emit).toHaveBeenCalledWith('state-update', {
        roomId: 'room-123',
        update: {
          type: 'shared-state',
          data: sharedState,
          timestamp: expect.any(Date)
        }
      })
    })

    it('should request current game state', async () => {
      const { result } = renderHook(() => useMultiplayer())

      await act(async () => {
        await result.current.requestGameState()
      })

      expect(mockSocketHook.emit).toHaveBeenCalledWith('request-game-state', {
        roomId: 'room-123'
      })
    })
  })

  describe('Real-time Event Handling', () => {
    it('should handle player-joined events', () => {
      renderHook(() => useMultiplayer())

      const newPlayer = {
        id: 'new-player-id',
        name: 'New Player',
        isHost: false
      }

      act(() => {
        const joinHandler = mockSocketHook.on.mock.calls.find(
          (call: [string, (...args: unknown[]) => void]) => call[0] === 'player-joined'
        )?.[1]
        joinHandler({ player: newPlayer, room: { id: 'room-123' } })
      })

      expect(mockStore.addPlayerToRoom).toHaveBeenCalledWith(newPlayer)
    })

    it('should handle player-left events', () => {
      renderHook(() => useMultiplayer())

      act(() => {
        const leaveHandler = mockSocketHook.on.mock.calls.find(
          (call: [string, (...args: unknown[]) => void]) => call[0] === 'player-left'
        )?.[1]
        leaveHandler({ playerId: 'leaving-player', roomId: 'room-123' })
      })

      expect(mockStore.removePlayerFromRoom).toHaveBeenCalledWith('leaving-player')
    })

    it('should handle game-state-changed events', () => {
      renderHook(() => useMultiplayer())

      const updatedGameState = {
        phase: 'playing',
        currentRound: 2,
        playerStates: { 'player1': { isReady: true } }
      }

      act(() => {
        const stateHandler = mockSocketHook.on.mock.calls.find(
          (call: [string, (...args: unknown[]) => void]) => call[0] === 'game-state-changed'
        )?.[1]
        stateHandler({ gameState: updatedGameState })
      })

      expect(mockStore.setGameState).toHaveBeenCalledWith(updatedGameState)
    })

    it('should handle room-deleted events', () => {
      mockStore.currentRoom = { id: 'room-123' }
      renderHook(() => useMultiplayer())

      act(() => {
        const deleteHandler = mockSocketHook.on.mock.calls.find(
          (call: [string, (...args: unknown[]) => void]) => call[0] === 'room-deleted'
        )?.[1]
        deleteHandler({ roomId: 'room-123' })
      })

      expect(mockStore.clearCurrentRoom).toHaveBeenCalled()
    })
  })

  describe('Connection State Integration', () => {
    it('should handle socket disconnection gracefully', () => {
      mockSocketHook.isConnected = false
      mockSocketHook.connectionError = 'Network error'
      
      const { result } = renderHook(() => useMultiplayer())

      expect(result.current.isConnected).toBe(false)
      expect(result.current.connectionError).toBe('Network error')
    })

    it('should prevent actions when disconnected', async () => {
      mockSocketHook.isConnected = false
      const { result } = renderHook(() => useMultiplayer())

      await act(async () => {
        await expect(
          result.current.updateGamePhase('charleston')
        ).rejects.toThrow('Not connected to server')
      })

      expect(mockSocketHook.emit).not.toHaveBeenCalled()
    })

    it('should queue state updates when disconnected', async () => {
      mockSocketHook.isConnected = false
      mockStore.currentRoom = { id: 'room-123' }
      
      const { result } = renderHook(() => useMultiplayer())

      await act(async () => {
        await result.current.updatePlayerState({ isReady: true })
      })

      expect(result.current.pendingUpdates).toHaveLength(1)
      expect(result.current.pendingUpdates[0]).toEqual({
        type: 'player-state',
        data: { isReady: true },
        timestamp: expect.any(Date)
      })
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should implement exponential backoff for retries', async () => {
      vi.useFakeTimers()
      const { result } = renderHook(() => useMultiplayer())

      // Simulate multiple failures
      mockSocketHook.on.mockImplementation((event, callback) => {
        if (event === 'room-created') {
          setTimeout(() => callback({
            success: false,
            error: 'Server error'
          }), 0)
        }
      })

      await act(async () => {
        const promise = result.current.createRoom({
          hostName: 'Host',
          maxPlayers: 4
        })

        vi.advanceTimersByTime(1000) // Initial retry
        vi.advanceTimersByTime(2000) // Exponential backoff
        vi.advanceTimersByTime(4000) // Exponential backoff

        await expect(promise).rejects.toThrow()
      })

      expect(result.current.retryAttempts).toBeGreaterThan(0)
      vi.useRealTimers()
    })

    it('should clear errors after successful operations', async () => {
      const { result } = renderHook(() => useMultiplayer())

      // Set an error
      act(() => {
        result.current.setError('Previous error')
      })

      expect(result.current.lastError).toBe('Previous error')

      // Successful operation should clear error
      mockSocketHook.on.mockImplementation((event, callback) => {
        if (event === 'room-created') {
          setTimeout(() => callback({
            success: true,
            room: { id: 'new-room' }
          }), 0)
        }
      })

      await act(async () => {
        await result.current.createRoom({
          hostName: 'Host',
          maxPlayers: 4
        })
      })

      expect(result.current.lastError).toBeNull()
    })
  })
})