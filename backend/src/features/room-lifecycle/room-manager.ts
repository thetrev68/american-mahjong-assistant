import { v4 as uuidv4 } from 'uuid'
import type { Room, Player, RoomConfig } from '@shared/multiplayer-types';

export class RoomManager {
  private rooms = new Map<string, Room>()
  private playerToRoom = new Map<string, string>()
  private readonly maxRoomsPerHost = 3
  private readonly roomInactivityTimeout = 30 * 60 * 1000 // 30 minutes

  createRoom(hostPlayerId: string, config: RoomConfig & { hostName?: string }): Room {
    this.validateRoomConfig(config)
    this.checkHostRoomLimit(hostPlayerId)

    const roomId = this.generateRoomId()
    const room: Room = {
      id: roomId,
      hostId: hostPlayerId,
      players: [{
        id: hostPlayerId,
        name: config.hostName || 'Host',
        isHost: true,
        joinedAt: new Date()
      }],
      phase: 'waiting',
      maxPlayers: config.maxPlayers,
      isPrivate: config.isPrivate || false,
      roomName: config.roomName,
      gameMode: config.gameMode || 'nmjl-2025',
      allowSpectators: config.allowSpectators || false,
      createdAt: new Date(),
      lastActivity: new Date()
    }

    this.rooms.set(roomId, room)
    this.playerToRoom.set(hostPlayerId, roomId)

    return room
  }

  joinRoom(roomId: string, player: Player): Room {
    const room = this.getRoom(roomId)
    if (!room) {
      throw new Error('Room not found')
    }

    if (room.players.length >= room.maxPlayers) {
      throw new Error('Room is full')
    }

    if (room.phase !== 'waiting') {
      throw new Error('Game has already started')
    }

    if (this.isPlayerInRoom(player.id)) {
      throw new Error('Player is already in a room')
    }

    const playerWithJoinTime = {
      ...player,
      joinedAt: new Date()
    }

    room.players.push(playerWithJoinTime)
    room.lastActivity = new Date()
    this.playerToRoom.set(player.id, roomId)

    return room
  }

  leaveRoom(roomId: string, playerId: string): boolean {
    const room = this.getRoom(roomId)
    if (!room) {
      return false
    }

    const playerIndex = room.players.findIndex(p => p.id === playerId)
    if (playerIndex === -1) {
      return false
    }

    room.players.splice(playerIndex, 1)
    this.playerToRoom.delete(playerId)

    if (room.players.length === 0) {
      this.rooms.delete(roomId)
      return true
    }

    if (room.hostId === playerId && room.players.length > 0) {
      const newHost = room.players[0]
      newHost.isHost = true
      room.hostId = newHost.id
    }

    room.lastActivity = new Date()
    return true
  }

  deleteRoom(roomId: string): boolean {
    const room = this.getRoom(roomId)
    if (!room) {
      return false
    }

    room.players.forEach(player => {
      this.playerToRoom.delete(player.id)
    })

    this.rooms.delete(roomId)
    return true
  }

  getRoom(roomId: string): Room | null {
    return this.rooms.get(roomId) || null
  }

  getAllRooms(): Room[] {
    return Array.from(this.rooms.values())
  }

  getPublicRooms(): Room[] {
    return this.getAllRooms().filter(room => !room.isPrivate)
  }

  getPlayerRoom(playerId: string): Room | null {
    const roomId = this.playerToRoom.get(playerId)
    return roomId ? this.getRoom(roomId) : null
  }

  isPlayerInRoom(playerId: string): boolean {
    return this.playerToRoom.has(playerId)
  }

  updateRoomActivity(roomId: string): void {
    const room = this.getRoom(roomId)
    if (room) {
      room.lastActivity = new Date()
    }
  }

  changeGamePhase(roomId: string, phase: Room['phase']): Room | null {
    const room = this.getRoom(roomId)
    if (!room) {
      return null
    }

    room.phase = phase
    room.lastActivity = new Date()
    return room
  }

  cleanupInactiveRooms(): string[] {
    const now = Date.now()
    const deletedRooms: string[] = []

    for (const [roomId, room] of this.rooms.entries()) {
      const inactiveTime = now - (room.lastActivity?.getTime() || room.createdAt.getTime())
      
      if (inactiveTime > this.roomInactivityTimeout) {
        this.deleteRoom(roomId)
        deletedRooms.push(roomId)
      }
    }

    return deletedRooms
  }

  getStats() {
    return {
      totalRooms: this.rooms.size,
      activeRooms: this.getAllRooms().filter(r => r.phase !== 'finished').length,
      totalPlayers: Array.from(this.playerToRoom.keys()).length,
      publicRooms: this.getPublicRooms().length
    }
  }

  private validateRoomConfig(config: RoomConfig): void {
    if (config.maxPlayers < 2 || config.maxPlayers > 4) {
      throw new Error('Max players must be between 2 and 4')
    }

    if (config.roomName && config.roomName.length > 50) {
      throw new Error('Room name must be 50 characters or less')
    }

    if (config.gameMode && !['nmjl-2025', 'custom'].includes(config.gameMode)) {
      throw new Error('Invalid game mode')
    }
  }

  private checkHostRoomLimit(hostPlayerId: string): void {
    const hostRooms = this.getAllRooms().filter(room => room.hostId === hostPlayerId)
    if (hostRooms.length >= this.maxRoomsPerHost) {
      throw new Error('Maximum number of rooms per host exceeded')
    }
  }

  private generateRoomId(): string {
    let roomId: string
    do {
      roomId = uuidv4().substring(0, 8).toUpperCase()
    } while (this.rooms.has(roomId))
    
    return roomId
  }
}