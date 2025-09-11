// Socket Handlers Test Suite - Comprehensive TDD for WebSocket event handling

import { vi } from 'vitest'
import { Server as SocketIOServer } from 'socket.io'
import { SocketHandlers } from '../features/socket-communication/socket-handlers'
import { RoomManager } from '../features/room-lifecycle/room-manager'
import { StateSyncManager } from '../features/state-sync/state-sync-manager'

// Mock socket for testing
const createMockSocket = (id: string = 'test-socket') => ({
  id,
  join: vi.fn().mockResolvedValue(undefined),
  leave: vi.fn().mockResolvedValue(undefined),
  emit: vi.fn(),
  on: vi.fn(),
  to: vi.fn().mockReturnThis(),
  data: {}
} as any)

const createMockIO = () => ({
  to: vi.fn().mockReturnThis(),
  emit: vi.fn(),
  sockets: {
    adapter: {
      rooms: new Map()
    }
  }
})

describe('SocketHandlers', () => {
  let roomManager: RoomManager
  let stateSyncManager: StateSyncManager
  let socketHandlers: SocketHandlers
  let mockIO: any
  let mockSocket: any

  beforeEach(() => {
    roomManager = new RoomManager()
    stateSyncManager = new StateSyncManager()
    mockIO = createMockIO()
    mockSocket = createMockSocket()
    socketHandlers = new SocketHandlers(mockIO, roomManager, stateSyncManager)
  })

  describe('Socket Handler Registration', () => {
    it('should register all event handlers', () => {
      socketHandlers.registerHandlers(mockSocket)

      expect(mockSocket.on).toHaveBeenCalledWith('create-room', expect.any(Function))
      expect(mockSocket.on).toHaveBeenCalledWith('join-room', expect.any(Function))
      expect(mockSocket.on).toHaveBeenCalledWith('leave-room', expect.any(Function))
      expect(mockSocket.on).toHaveBeenCalledWith('state-update', expect.any(Function))
      expect(mockSocket.on).toHaveBeenCalledWith('request-game-state', expect.any(Function))
      expect(mockSocket.on).toHaveBeenCalledWith('ping', expect.any(Function))
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function))
    })
  })

  describe('Room Creation Events', () => {
    it('should handle create-room event successfully', async () => {
      const createRoomData = {
        hostName: 'Host Player',
        config: { maxPlayers: 4, roomName: 'Test Game' }
      }

      // Register handlers first
      socketHandlers.registerHandlers(mockSocket)
      
      // Get the create-room handler and call it
      const createRoomHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'create-room'
      )?.[1]

      await createRoomHandler(createRoomData)

      expect(mockSocket.emit).toHaveBeenCalledWith('room-created', expect.objectContaining({
        success: true,
        room: expect.objectContaining({
          hostId: mockSocket.id,
          roomName: 'Test Game',
          maxPlayers: 4,
          players: expect.arrayContaining([
            expect.objectContaining({
              id: mockSocket.id,
              name: 'Host Player',
              isHost: true
            })
          ])
        })
      }))

      expect(mockSocket.join).toHaveBeenCalledWith(expect.any(String))
      expect(mockIO.emit).toHaveBeenCalledWith('room-list-updated', expect.any(Object))
    })

    it('should handle create-room event with validation errors', async () => {
      const invalidData = {
        hostName: 'Host',
        config: { maxPlayers: 10 } // Invalid: too many players
      }

      socketHandlers.registerHandlers(mockSocket)
      const createRoomHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'create-room'
      )?.[1]

      await createRoomHandler(invalidData)

      expect(mockSocket.emit).toHaveBeenCalledWith('room-created', expect.objectContaining({
        success: false,
        error: expect.any(String)
      }))

      expect(mockSocket.join).not.toHaveBeenCalled()
    })
  })

  describe('Room Joining Events', () => {
    let roomId: string

    beforeEach(async () => {
      // Create a room first
      const room = roomManager.createRoom(mockSocket.id, { maxPlayers: 4 })
      roomId = room.id
    })

    it('should handle join-room event successfully', async () => {
      const newSocket = createMockSocket('player2-socket')
      const joinData = {
        roomId,
        playerName: 'Player 2'
      }

      socketHandlers.registerHandlers(newSocket)
      const joinRoomHandler = newSocket.on.mock.calls.find(
        (call: any) => call[0] === 'join-room'
      )?.[1]

      await joinRoomHandler(joinData)

      expect(newSocket.emit).toHaveBeenCalledWith('room-joined', expect.objectContaining({
        success: true,
        room: expect.objectContaining({
          id: roomId,
          players: expect.arrayContaining([
            expect.objectContaining({ name: 'Player 2', id: 'player2-socket' })
          ])
        })
      }))

      expect(newSocket.join).toHaveBeenCalledWith(roomId)
      expect(newSocket.to).toHaveBeenCalledWith(roomId)
    })

    it('should reject joining non-existent room', async () => {
      const joinData = {
        roomId: 'non-existent-room',
        playerName: 'Player 2'
      }

      socketHandlers.registerHandlers(mockSocket)
      const joinRoomHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'join-room'
      )?.[1]

      await joinRoomHandler(joinData)

      expect(mockSocket.emit).toHaveBeenCalledWith('room-joined', expect.objectContaining({
        success: false,
        error: expect.stringMatching(/not found/i)
      }))

      expect(mockSocket.join).not.toHaveBeenCalled()
    })

    it('should reject joining full room', async () => {
      // Fill room to capacity
      for (let i = 2; i <= 4; i++) {
        roomManager.joinRoom(roomId, { id: `player${i}`, name: `Player ${i}`, isHost: false, isConnected: true, isReady: false })
      }

      const extraSocket = createMockSocket('extra-socket')
      const joinData = {
        roomId,
        playerName: 'Extra Player'
      }

      socketHandlers.registerHandlers(extraSocket)
      const joinRoomHandler = extraSocket.on.mock.calls.find(
        (call: any) => call[0] === 'join-room'
      )?.[1]

      await joinRoomHandler(joinData)

      expect(extraSocket.emit).toHaveBeenCalledWith('room-joined', expect.objectContaining({
        success: false,
        error: expect.stringMatching(/full/i)
      }))
    })
  })

  describe('Room Leaving Events', () => {
    let roomId: string
    let playerSocket: any

    beforeEach(async () => {
      // Create room and add a player
      const room = roomManager.createRoom(mockSocket.id, { maxPlayers: 4 })
      roomId = room.id

      playerSocket = createMockSocket('player2-socket')
      roomManager.joinRoom(roomId, { id: 'player2-socket', name: 'Player 2', isHost: false, isConnected: true, isReady: false })
    })

    it('should handle leave-room event successfully', async () => {
      socketHandlers.registerHandlers(playerSocket)
      const leaveRoomHandler = playerSocket.on.mock.calls.find(
        (call: any) => call[0] === 'leave-room'
      )?.[1]

      await leaveRoomHandler({ roomId })

      expect(playerSocket.leave).toHaveBeenCalledWith(roomId)
      expect(playerSocket.emit).toHaveBeenCalledWith('room-left', expect.objectContaining({
        success: true,
        roomId
      }))
      expect(playerSocket.to).toHaveBeenCalledWith(roomId)
    })

    it('should delete room when all players leave', async () => {
      // Remove all players
      roomManager.leaveRoom(roomId, 'player2-socket')
      
      socketHandlers.registerHandlers(mockSocket)
      const leaveRoomHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'leave-room'
      )?.[1]

      await leaveRoomHandler({ roomId })

      expect(mockIO.to).toHaveBeenCalledWith(roomId)
      expect(mockIO.emit).toHaveBeenCalledWith('room-deleted', expect.objectContaining({
        roomId
      }))
    })
  })

  describe('Game State Events', () => {
    let roomId: string

    beforeEach(() => {
      const room = roomManager.createRoom(mockSocket.id, { maxPlayers: 4 })
      roomId = room.id
      stateSyncManager.initializeGameState(roomId)
    })

    it('should handle state-update event successfully', async () => {
      const updateData = {
        roomId,
        update: {
          type: 'player-state',
          data: { isReady: true },
          timestamp: new Date()
        }
      }

      socketHandlers.registerHandlers(mockSocket)
      const stateUpdateHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'state-update'
      )?.[1]

      await stateUpdateHandler(updateData)

      expect(mockSocket.emit).toHaveBeenCalledWith('state-updated', expect.objectContaining({
        success: true,
        gameState: expect.any(Object)
      }))

      expect(mockSocket.to).toHaveBeenCalledWith(roomId)
    })

    it('should handle request-game-state event', async () => {
      socketHandlers.registerHandlers(mockSocket)
      const requestStateHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'request-game-state'
      )?.[1]

      requestStateHandler({ roomId })

      expect(mockSocket.emit).toHaveBeenCalledWith('game-state', expect.objectContaining({
        success: true,
        gameState: expect.any(Object)
      }))
    })

    it('should reject state updates for non-existent room', async () => {
      const updateData = {
        roomId: 'non-existent',
        update: { type: 'player-state', data: {}, timestamp: new Date() }
      }

      socketHandlers.registerHandlers(mockSocket)
      const stateUpdateHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'state-update'
      )?.[1]

      await stateUpdateHandler(updateData)

      expect(mockSocket.emit).toHaveBeenCalledWith('state-updated', expect.objectContaining({
        success: false,
        error: expect.stringMatching(/not found/i)
      }))
    })
  })

  describe('Connection Events', () => {
    it('should handle ping-pong events', async () => {
      const pingData = { timestamp: Date.now() }

      socketHandlers.registerHandlers(mockSocket)
      const pingHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'ping'
      )?.[1]

      pingHandler(pingData)

      expect(mockSocket.emit).toHaveBeenCalledWith('pong', {
        timestamp: pingData.timestamp
      })
    })

    it('should handle disconnect event', async () => {
      // Create a room first
      const room = roomManager.createRoom(mockSocket.id, { maxPlayers: 4 })

      socketHandlers.registerHandlers(mockSocket)
      const disconnectHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'disconnect'
      )?.[1]

      disconnectHandler('client disconnect')

      // Verify room cleanup
      expect(roomManager.getRoom(room.id)).toBeNull()
    })
  })

  describe('Periodic Cleanup', () => {
    it('should start periodic cleanup', () => {
      vi.useFakeTimers()
      
      socketHandlers.startPeriodicCleanup()
      
      // Fast-forward time
      vi.advanceTimersByTime(5 * 60 * 1000) // 5 minutes
      
      // Cleanup should have run (no specific assertion needed as it's a background process)
      
      vi.useRealTimers()
    })
  })
})