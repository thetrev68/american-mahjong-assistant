// useMultiplayer Hook Test Suite - Integration testing for multiplayer functionality

import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useMultiplayer } from '../useMultiplayer'
import { useSocket } from '../useSocket'
import { useConnectionResilience } from '../useConnectionResilience'
import { useMultiplayerStore } from '../../stores/multiplayer-store'

// Mock only the external dependencies we can't control in tests
vi.mock('../useSocket')
vi.mock('../useConnectionResilience')


// Simple mocks for external dependencies
const mockSocket = {
  isConnected: true,
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  socketId: 'test-socket-id',
  connectionError: null,
  eventQueue: [],
  lastError: null,
  rawSocket: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connected: true,
    id: 'test-socket-id'
  }
}

const mockConnectionResilience = {
  isConnected: true,
  isReconnecting: false,
  connectionHealth: 'healthy' as const,
  lastError: null,
  isOperationSafe: vi.fn(() => true),
  retryConnection: vi.fn(),
  canRecover: false,
  getNetworkQuality: vi.fn(() => ({
    quality: 'excellent',
    latency: 50,
    packetLoss: 0,
    stability: 'stable'
  }))
}

describe('useMultiplayer Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup simple mocks for external dependencies
    vi.mocked(useSocket).mockReturnValue(mockSocket)
    vi.mocked(useConnectionResilience).mockReturnValue(mockConnectionResilience)
  })

  describe('Basic Hook Functionality', () => {
    it('should initialize without errors', () => {
      const { result } = renderHook(() => useMultiplayer())

      expect(result.current).toBeDefined()
      expect(typeof result.current.createRoom).toBe('function')
      expect(typeof result.current.joinRoom).toBe('function')
      expect(typeof result.current.leaveRoom).toBe('function')
    })

    it('should expose connection state from dependencies', () => {
      const { result } = renderHook(() => useMultiplayer())

      expect(result.current.isConnected).toBe(true)
      expect(result.current.connectionError).toBeNull()
    })

    it('should provide state management functions', () => {
      const { result } = renderHook(() => useMultiplayer())

      expect(typeof result.current.updateGamePhase).toBe('function')
      expect(typeof result.current.updatePlayerState).toBe('function')
      expect(typeof result.current.updateSharedState).toBe('function')
    })
  })

  describe('Connection State Integration', () => {
    it('should handle disconnected state gracefully', () => {
      // Test with disconnected state
      mockSocket.isConnected = false
      mockConnectionResilience.isConnected = false

      const { result } = renderHook(() => useMultiplayer())

      expect(result.current.isConnected).toBe(false)
    })

    it('should prevent operations when operation is not safe', () => {
      mockConnectionResilience.isOperationSafe.mockReturnValue(false)

      const { result } = renderHook(() => useMultiplayer())

      // The hook should respect the isOperationSafe check
      expect(mockConnectionResilience.isOperationSafe).toHaveBeenCalled()
    })
  })

  describe('Room Operations Integration', () => {
    it('should attempt to create room when createRoom is called', async () => {
      // Ensure operation is safe
      mockConnectionResilience.isOperationSafe.mockReturnValue(true)

      const { result } = renderHook(() => useMultiplayer())

      const roomData = {
        hostName: 'Test Host',
        maxPlayers: 4,
        roomName: 'Test Room',
        isPrivate: false,
        gameMode: 'nmjl-2025'
      }

      // Socket should emit create-room when operation is safe
      await act(async () => {
        try {
          result.current.createRoom(roomData)
          // Don't await since we're not mocking the full response cycle
        } catch {
          // Expected to fail since we're not mocking full server response
        }
      })

      expect(mockSocket.emit).toHaveBeenCalledWith('create-room', {
        hostName: 'Test Host',
        config: expect.objectContaining({
          maxPlayers: 4,
          roomName: 'Test Room',
          isPrivate: false,
          gameMode: 'nmjl-2025',
          hostName: 'Test Host'
        })
      })
    })

    it('should attempt to join room when joinRoom is called', async () => {
      // Ensure operation is safe
      mockConnectionResilience.isOperationSafe.mockReturnValue(true)

      const { result } = renderHook(() => useMultiplayer())

      await act(async () => {
        try {
          result.current.joinRoom('room-123', 'Test Player')
          // Don't await since we're not mocking the full response cycle
        } catch {
          // Expected to fail since we're not mocking full server response
        }
      })

      expect(mockSocket.emit).toHaveBeenCalledWith('join-room', {
        roomId: 'room-123',
        playerName: 'Test Player'
      })
    })

    it('should queue updates when connection is not safe', async () => {
      mockConnectionResilience.isOperationSafe.mockReturnValue(false)

      const { result } = renderHook(() => useMultiplayer())

      // First simulate being in a room by using the store directly
      act(() => {
        const mockRoom = {
          id: 'test-room',
          hostId: 'test-host',
          players: [],
          phase: 'waiting',
          maxPlayers: 4,
          isPrivate: false,
          createdAt: new Date()
        }
        // Access store directly since setCurrentRoom isn't exposed from the hook
        useMultiplayerStore.getState().setCurrentRoom(mockRoom)
      })

      await act(async () => {
        await result.current.updateGamePhase('charleston')
      })

      // Should queue the update instead of emitting immediately
      expect(result.current.pendingUpdates).toHaveLength(1)
      expect(result.current.pendingUpdates[0]).toEqual(
        expect.objectContaining({
          type: 'phase-change',
          data: { phase: 'charleston' }
        })
      )
    })
  })

  describe('State Integration', () => {
    it('should expose connection state from resilience service', () => {
      // Ensure the mock returns the correct values
      mockConnectionResilience.isConnected = true

      const { result } = renderHook(() => useMultiplayer())

      expect(result.current.isConnected).toBe(true)
      expect(result.current.connectionError).toBeNull()
      expect(result.current.connectionHealth).toBe('healthy')
      expect(result.current.isReconnecting).toBe(false)
    })

    it('should expose resilience service functions', () => {
      const { result } = renderHook(() => useMultiplayer())

      expect(typeof result.current.retryConnection).toBe('function')
      expect(typeof result.current.isOperationSafe).toBe('function')
      expect(typeof result.current.getNetworkQuality).toBe('function')
    })
  })
})
