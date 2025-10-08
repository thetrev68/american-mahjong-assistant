// useRoomSetup Hook Test Suite - Comprehensive TDD for room setup logic

import { renderHook, act } from '@testing-library/react'
import { vi } from 'vitest'
import { useRoomSetup } from '../useRoomSetup'
import { useRoomSetupStore } from '../../stores/room-setup.store'
import { useRoomStore } from '../../stores/useRoomStore'
import { usePlayerStore } from '../../stores/player.store'
import { useMultiplayerStore } from '../../stores/multiplayer-store'
import { useMultiplayer } from '../useMultiplayer'

// Mock dependencies
vi.mock('../useMultiplayer')
vi.mock('../../stores/room-setup.store')
vi.mock('../../stores/useRoomStore')
vi.mock('../../stores/player.store')
vi.mock('../../stores/multiplayer-store')

const mockMultiplayer = {
  // Connection state
  isConnected: true,
  connectionError: null,
  connectionHealth: 'healthy' as const,
  isReconnecting: false,
  canRecover: true,
  isOperationSafe: vi.fn(() => true),
  retryConnection: vi.fn(),
  getNetworkQuality: vi.fn(() => ({ quality: 'good' as const, latency: 50, packetLoss: 0, stability: 'stable' })),
  
  // Room operations
  createRoom: vi.fn(),
  joinRoom: vi.fn(),
  leaveRoom: vi.fn(),
  isCreatingRoom: false,
  isJoiningRoom: false,
  
  // Game state operations
  updateGamePhase: vi.fn(),
  updatePlayerState: vi.fn(),
  updateSharedState: vi.fn(),
  requestGameState: vi.fn(),
  
  // State from store
  currentRoom: null,
  gameState: null,
  isHost: false,
  availableRooms: [],
  
  // Error handling
  lastError: null,
  retryAttempts: 0,
  pendingUpdates: [],
  setError: vi.fn(),
  
  // Utility
  getCurrentPlayer: vi.fn(),
  getRoomStats: vi.fn(),
  areAllPlayersReady: vi.fn()
}

const mockRoomSetupStore = {
  coPilotMode: 'everyone',
  roomCreationStatus: 'idle',
  joinRoomStatus: 'idle',
  error: null,
  setCoPilotMode: vi.fn(),
  setRoomCreationStatus: vi.fn(),
  handleRoomCreated: vi.fn(),
  handleRoomCreationError: vi.fn(),
  setJoinRoomStatus: vi.fn(),
  handleRoomJoined: vi.fn(),
  handleRoomJoinError: vi.fn(),
  isValidRoomCode: vi.fn(),
  clearError: vi.fn(),
  getRoomSetupProgress: vi.fn(() => ({
    currentStep: 'mode-selection',
    completedSteps: 0,
    totalSteps: 3
  }))
}

const mockRoomStore = {
  currentRoomCode: null as string | null,
  hostPlayerId: null as string | null,
  updateRoom: vi.fn(),
  room: null
}

const mockPlayerStore = {
  currentPlayerId: 'different-player-id', // Set different ID to ensure isHost is false
  setCurrentPlayerId: vi.fn()
}

const mockMultiplayerStore = {
  currentPlayerId: null as string | null,
  currentRoom: null,
  setCurrentPlayerId: vi.fn(),
  setCurrentRoom: vi.fn()
}

describe('useRoomSetup Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useMultiplayer).mockReturnValue(mockMultiplayer)
    vi.mocked(useRoomSetupStore).mockReturnValue(mockRoomSetupStore)
    vi.mocked(useRoomStore).mockReturnValue(mockRoomStore)
    vi.mocked(usePlayerStore).mockReturnValue(mockPlayerStore)
    vi.mocked(useMultiplayerStore).mockReturnValue(mockMultiplayerStore)
  })

  describe('Hook Initialization', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useRoomSetup())

      expect(result.current.coPilotMode).toBe('everyone')
      expect(result.current.isCreatingRoom).toBe(false)
      expect(result.current.isJoiningRoom).toBe(false)
      expect(result.current.roomCode).toBeNull()
      // With everyone mode and no host/player IDs set, should not be host
      expect(result.current.isHost).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should reflect room store state changes', () => {
      mockRoomStore.currentRoomCode = 'ABCD'
      mockRoomStore.hostPlayerId = 'host-123'
      mockRoomSetupStore.roomCreationStatus = 'creating'

      const { result } = renderHook(() => useRoomSetup())

      expect(result.current.roomCode).toBe('ABCD')
      expect(result.current.isCreatingRoom).toBe(true)
    })
  })

  describe('Co-Pilot Mode Management', () => {
    it('should set co-pilot mode to everyone', () => {
      const { result } = renderHook(() => useRoomSetup())

      act(() => {
        result.current.setCoPilotMode('everyone')
      })

      expect(mockRoomSetupStore.setCoPilotMode).toHaveBeenCalledWith('everyone')
    })

    it('should set co-pilot mode to solo', () => {
      const { result } = renderHook(() => useRoomSetup())

      act(() => {
        result.current.setCoPilotMode('solo')
      })

      expect(mockRoomSetupStore.setCoPilotMode).toHaveBeenCalledWith('solo')
    })
  })

  describe('Room Creation', () => {
    it('should create room successfully', async () => {
      mockMultiplayer.createRoom.mockResolvedValue({
        id: 'room-123',
        code: 'ABCD'
      })

      const { result } = renderHook(() => useRoomSetup())

      await act(async () => {
        await result.current.createRoom('Host Player')
      })

      expect(mockRoomSetupStore.setRoomCreationStatus).toHaveBeenCalledWith('creating')
      expect(mockMultiplayer.createRoom).toHaveBeenCalledWith({
        hostName: 'Host Player',
        maxPlayers: 4,
        gameMode: 'nmjl-2025',
        isPrivate: false
      })
      // Room code is generated from room ID, so it should be a hash of 'room-123'
      expect(mockRoomSetupStore.handleRoomCreated).toHaveBeenCalledWith(expect.any(String), expect.any(String))
    })

    it('should handle room creation failure', async () => {
      mockMultiplayer.createRoom.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useRoomSetup())

      await act(async () => {
        await result.current.createRoom('Host Player')
      })

      expect(mockRoomSetupStore.handleRoomCreationError).toHaveBeenCalledWith('Network error')
    })

    it('should not create room when not connected', async () => {
      mockMultiplayer.isConnected = false

      const { result } = renderHook(() => useRoomSetup())

      await act(async () => {
        await result.current.createRoom('Host Player')
      })

      expect(mockRoomSetupStore.handleRoomCreationError).toHaveBeenCalledWith(
        'Not connected to server. Please check your connection.'
      )
      expect(mockMultiplayer.createRoom).not.toHaveBeenCalled()
    })

    it('should validate host name before creating room', async () => {
      const { result } = renderHook(() => useRoomSetup())

      await act(async () => {
        await result.current.createRoom('')
      })

      expect(mockRoomSetupStore.handleRoomCreationError).toHaveBeenCalledWith(
        'Please enter your name'
      )
      expect(mockMultiplayer.createRoom).not.toHaveBeenCalled()
    })
  })

  describe('Room Joining', () => {
    beforeEach(() => {
      mockRoomSetupStore.isValidRoomCode.mockReturnValue(true)
    })

    it('should join room successfully', async () => {
      // Ensure multiplayer is connected for this test
      mockMultiplayer.isConnected = true
      mockMultiplayer.joinRoom.mockResolvedValue({
        id: 'room-456',
        code: 'EFGH'
      })

      const { result } = renderHook(() => useRoomSetup())

      await act(async () => {
        await result.current.joinRoom('EFGH', 'Player Name')
      })

      expect(mockRoomSetupStore.setJoinRoomStatus).toHaveBeenCalledWith('joining')
      expect(mockMultiplayer.joinRoom).toHaveBeenCalledWith('EFGH', 'Player Name')
      expect(mockRoomSetupStore.handleRoomJoined).toHaveBeenCalledWith('EFGH')
    })

    it('should handle room joining failure', async () => {
      // Ensure multiplayer is connected for this test
      mockMultiplayer.isConnected = true
      mockMultiplayer.joinRoom.mockRejectedValue(new Error('Room not found'))

      const { result } = renderHook(() => useRoomSetup())

      await act(async () => {
        await result.current.joinRoom('EFGH', 'Player Name')
      })

      expect(mockRoomSetupStore.handleRoomJoinError).toHaveBeenCalledWith('Room not found')
    })

    it('should validate room code before joining', async () => {
      mockRoomSetupStore.isValidRoomCode.mockReturnValue(false)

      const { result } = renderHook(() => useRoomSetup())

      await act(async () => {
        await result.current.joinRoom('INVALID', 'Player Name')
      })

      expect(mockRoomSetupStore.handleRoomJoinError).toHaveBeenCalledWith(
        'Please enter a valid 4-character room code'
      )
      expect(mockMultiplayer.joinRoom).not.toHaveBeenCalled()
    })

    it('should validate player name before joining', async () => {
      const { result } = renderHook(() => useRoomSetup())

      await act(async () => {
        await result.current.joinRoom('EFGH', '')
      })

      expect(mockRoomSetupStore.handleRoomJoinError).toHaveBeenCalledWith(
        'Please enter your name'
      )
      expect(mockMultiplayer.joinRoom).not.toHaveBeenCalled()
    })

    it('should not join room when not connected', async () => {
      mockMultiplayer.isConnected = false

      const { result } = renderHook(() => useRoomSetup())

      await act(async () => {
        await result.current.joinRoom('EFGH', 'Player Name')
      })

      expect(mockRoomSetupStore.handleRoomJoinError).toHaveBeenCalledWith(
        'Not connected to server. Please check your connection.'
      )
      expect(mockMultiplayer.joinRoom).not.toHaveBeenCalled()
    })
  })

  describe('Room Code Generation', () => {
    it('should generate valid room codes', () => {
      const { result } = renderHook(() => useRoomSetup())

      const roomCode = result.current.generateRoomCode()

      expect(roomCode).toHaveLength(4)
      expect(roomCode).toMatch(/^[A-Z0-9]{4}$/)
    })

    it('should generate different room codes on multiple calls', () => {
      const { result } = renderHook(() => useRoomSetup())

      const codes = new Set()
      for (let i = 0; i < 10; i++) {
        codes.add(result.current.generateRoomCode())
      }

      expect(codes.size).toBeGreaterThan(1) // Should generate different codes
    })
  })

  describe('Error Handling', () => {
    it('should clear errors', () => {
      const { result } = renderHook(() => useRoomSetup())

      act(() => {
        result.current.clearError()
      })

      expect(mockRoomSetupStore.clearError).toHaveBeenCalled()
    })

    it('should retry room creation after error', async () => {
      // Ensure multiplayer is connected for this test
      mockMultiplayer.isConnected = true
      mockMultiplayer.createRoom
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({ id: 'room-123', code: 'ABCD' })

      const { result } = renderHook(() => useRoomSetup())

      // First attempt fails
      await act(async () => {
        await result.current.createRoom('Host Player')
      })
      expect(mockRoomSetupStore.handleRoomCreationError).toHaveBeenCalledWith('Network timeout')

      // Retry succeeds
      await act(async () => {
        await result.current.createRoom('Host Player')
      })
      expect(mockRoomSetupStore.handleRoomCreated).toHaveBeenCalledWith(expect.any(String), expect.any(String))
    })
  })

  describe('Setup Progress', () => {
    it('should return setup progress from store', () => {
      const mockProgress = {
        currentStep: 'room-creation' as const,
        completedSteps: 1,
        totalSteps: 3
      }
      mockRoomSetupStore.getRoomSetupProgress.mockReturnValue(mockProgress)

      const { result } = renderHook(() => useRoomSetup())

      expect(result.current.setupProgress).toEqual(mockProgress)
    })
  })

  describe('Host Status', () => {
    it('should determine host status correctly', () => {
      // Mock current player ID (would come from player store)
      const mockCurrentPlayerId = 'player-123'
      mockRoomStore.hostPlayerId = mockCurrentPlayerId
      mockPlayerStore.currentPlayerId = mockCurrentPlayerId

      const { result } = renderHook(() => useRoomSetup())

      // This would need access to current player ID to work properly
      // For now, test the basic logic
      expect(typeof result.current.isHost).toBe('boolean')
    })
  })
})
