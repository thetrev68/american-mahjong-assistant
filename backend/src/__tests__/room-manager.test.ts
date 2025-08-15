// Room Manager Test Suite - Comprehensive TDD for room lifecycle management

import { RoomManager } from '../features/room-lifecycle/room-manager'
import type { Room, Player, RoomConfig } from '@shared/multiplayer-types'

describe('RoomManager', () => {
  let roomManager: RoomManager
  
  beforeEach(() => {
    roomManager = new RoomManager()
  })

  describe('Room Creation', () => {
    it('should create room with unique ID', () => {
      const room1 = roomManager.createRoom('player1', { maxPlayers: 4 })
      const room2 = roomManager.createRoom('player2', { maxPlayers: 4 })
      
      expect(room1.id).toBeDefined()
      expect(room2.id).toBeDefined()
      expect(room1.id).not.toBe(room2.id)
    })

    it('should create room with correct initial state', () => {
      const room = roomManager.createRoom('host123', { maxPlayers: 4 })
      
      expect(room.hostId).toBe('host123')
      expect(room.players).toHaveLength(1)
      expect(room.players[0].id).toBe('host123')
      expect(room.players[0].isHost).toBe(true)
      expect(room.phase).toBe('waiting')
      expect(room.maxPlayers).toBe(4)
      expect(room.createdAt).toBeInstanceOf(Date)
    })

    it('should apply custom room configuration', () => {
      const config: RoomConfig = {
        maxPlayers: 3,
        isPrivate: true,
        roomName: 'Test Game'
      }
      
      const room = roomManager.createRoom('host', config)
      
      expect(room.maxPlayers).toBe(3)
      expect(room.isPrivate).toBe(true)
      expect(room.roomName).toBe('Test Game')
    })

    it('should validate room configuration', () => {
      expect(() => {
        roomManager.createRoom('host', { maxPlayers: 1 })
      }).toThrow('Max players must be between 2 and 4')

      expect(() => {
        roomManager.createRoom('host', { maxPlayers: 5 })
      }).toThrow('Max players must be between 2 and 4')

      expect(() => {
        roomManager.createRoom('host', { 
          maxPlayers: 4, 
          roomName: 'a'.repeat(60) 
        })
      }).toThrow('Room name must be 50 characters or less')
    })
  })

  describe('Room Retrieval', () => {
    it('should retrieve existing room by ID', () => {
      const room = roomManager.createRoom('player1', { maxPlayers: 4 })
      const retrieved = roomManager.getRoom(room.id)
      
      expect(retrieved).toEqual(room)
    })

    it('should return null for non-existent room', () => {
      const retrieved = roomManager.getRoom('non-existent')
      expect(retrieved).toBeNull()
    })

    it('should list all rooms', () => {
      const room1 = roomManager.createRoom('p1', { maxPlayers: 4 })
      const room2 = roomManager.createRoom('p2', { maxPlayers: 4 })
      
      const allRooms = roomManager.getAllRooms()
      expect(allRooms).toHaveLength(2)
      expect(allRooms).toContainEqual(room1)
      expect(allRooms).toContainEqual(room2)
    })

    it('should list only public rooms when filtering', () => {
      roomManager.createRoom('p1', { maxPlayers: 4, isPrivate: false })
      roomManager.createRoom('p2', { maxPlayers: 4, isPrivate: true })
      
      const publicRooms = roomManager.getPublicRooms()
      expect(publicRooms).toHaveLength(1)
      expect(publicRooms[0].isPrivate).toBe(false)
    })
  })

  describe('Player Joining', () => {
    let room: Room
    
    beforeEach(() => {
      room = roomManager.createRoom('host', { maxPlayers: 4 })
    })

    it('should allow player to join room with space', () => {
      const player: Player = { id: 'player2', name: 'Player 2', isHost: false }
      
      const updatedRoom = roomManager.joinRoom(room.id, player)
      
      expect(updatedRoom.players).toHaveLength(2)
      expect(updatedRoom.players[1].id).toBe('player2')
      expect(updatedRoom.players[1].name).toBe('Player 2')
      expect(updatedRoom.players[1].joinedAt).toBeInstanceOf(Date)
    })

    it('should reject player when room is full', () => {
      // Fill room to capacity
      for (let i = 2; i <= 4; i++) {
        roomManager.joinRoom(room.id, { id: `player${i}`, name: `Player ${i}`, isHost: false })
      }
      
      const extraPlayer: Player = { id: 'extra', name: 'Extra', isHost: false }
      
      expect(() => {
        roomManager.joinRoom(room.id, extraPlayer)
      }).toThrow('Room is full')
    })

    it('should reject player already in room', () => {
      expect(() => {
        roomManager.joinRoom(room.id, { id: 'host', name: 'Host Again', isHost: false })
      }).toThrow('Player is already in a room')
    })

    it('should check if player is in room', () => {
      expect(roomManager.isPlayerInRoom('host')).toBe(true)
      expect(roomManager.isPlayerInRoom('nobody')).toBe(false)
    })

    it('should get player room', () => {
      const playerRoom = roomManager.getPlayerRoom('host')
      expect(playerRoom).toEqual(room)
      
      const noRoom = roomManager.getPlayerRoom('nobody')
      expect(noRoom).toBeNull()
    })
  })

  describe('Player Removal', () => {
    let room: Room
    
    beforeEach(() => {
      room = roomManager.createRoom('host', { maxPlayers: 4 })
      roomManager.joinRoom(room.id, { id: 'player2', name: 'Player 2', isHost: false })
      roomManager.joinRoom(room.id, { id: 'player3', name: 'Player 3', isHost: false })
    })

    it('should remove player from room', () => {
      const success = roomManager.leaveRoom(room.id, 'player2')
      
      expect(success).toBe(true)
      const updatedRoom = roomManager.getRoom(room.id)!
      expect(updatedRoom.players).toHaveLength(2)
      expect(updatedRoom.players.find(p => p.id === 'player2')).toBeUndefined()
    })

    it('should transfer host when host leaves', () => {
      const success = roomManager.leaveRoom(room.id, 'host')
      
      expect(success).toBe(true)
      const updatedRoom = roomManager.getRoom(room.id)!
      expect(updatedRoom.players).toHaveLength(2)
      expect(updatedRoom.hostId).toBe('player2')
      expect(updatedRoom.players.find(p => p.id === 'player2')?.isHost).toBe(true)
    })

    it('should delete room when all players leave', () => {
      roomManager.leaveRoom(room.id, 'player2')
      roomManager.leaveRoom(room.id, 'player3')
      const success = roomManager.leaveRoom(room.id, 'host')
      
      expect(success).toBe(true)
      expect(roomManager.getRoom(room.id)).toBeNull()
    })

    it('should handle removing non-existent player gracefully', () => {
      const success = roomManager.leaveRoom(room.id, 'non-existent')
      
      expect(success).toBe(false)
      expect(roomManager.getRoom(room.id)!.players).toHaveLength(3)
    })
  })

  describe('Room Management', () => {
    let room: Room
    
    beforeEach(() => {
      room = roomManager.createRoom('host', { maxPlayers: 4 })
    })

    it('should change game phase', () => {
      const updatedRoom = roomManager.changeGamePhase(room.id, 'setup')
      
      expect(updatedRoom).not.toBeNull()
      expect(updatedRoom!.phase).toBe('setup')
      expect(updatedRoom!.lastActivity).toBeInstanceOf(Date)
    })

    it('should update room activity', () => {
      const originalActivity = room.lastActivity
      
      setTimeout(() => {
        roomManager.updateRoomActivity(room.id)
        const updatedRoom = roomManager.getRoom(room.id)!
        expect(updatedRoom.lastActivity!.getTime()).toBeGreaterThan(originalActivity!.getTime())
      }, 10)
    })

    it('should delete room completely', () => {
      roomManager.joinRoom(room.id, { id: 'player2', name: 'Player 2', isHost: false })
      
      const success = roomManager.deleteRoom(room.id)
      expect(success).toBe(true)
      expect(roomManager.getRoom(room.id)).toBeNull()
      expect(roomManager.isPlayerInRoom('host')).toBe(false)
      expect(roomManager.isPlayerInRoom('player2')).toBe(false)
    })

    it('should provide stats', () => {
      roomManager.createRoom('host2', { maxPlayers: 4, isPrivate: true })
      
      const stats = roomManager.getStats()
      expect(stats.totalRooms).toBe(2)
      expect(stats.activeRooms).toBe(2)
      expect(stats.totalPlayers).toBe(2)
      expect(stats.publicRooms).toBe(1)
    })
  })

  describe('Room Cleanup', () => {
    it('should cleanup inactive rooms', () => {
      // Create room and manually set old lastActivity
      const room = roomManager.createRoom('host', { maxPlayers: 4 })
      const oldDate = new Date(Date.now() - 31 * 60 * 1000) // 31 minutes ago
      
      // Manually access private field for testing
      ;(room as any).lastActivity = oldDate
      
      const deletedRooms = roomManager.cleanupInactiveRooms()
      
      expect(deletedRooms).toContain(room.id)
      expect(roomManager.getRoom(room.id)).toBeNull()
    })
  })
})