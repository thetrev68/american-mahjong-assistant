// Room Lifecycle Manager
// Complete CRUD operations for multiplayer room management

import type { Room, Player, RoomConfig } from '../../../../shared/multiplayer-types'

interface RoomSettings extends RoomConfig {
  spectatorMode?: boolean
  autoAdvanceTurns?: boolean
  turnTimeLimit?: number
  allowReconnection?: boolean
}

interface HostPermissions {
  canKickPlayers: boolean
  canTransferHost: boolean
  canChangeSettings: boolean
  canStartGame: boolean
  canPauseGame: boolean
}

export class RoomLifecycleManager {
  private rooms = new Map<string, Room>()
  private roomSettings = new Map<string, RoomSettings>()
  private hostPermissions = new Map<string, HostPermissions>()
  private spectators = new Map<string, Player[]>() // roomId -> spectators

  // Create room with enhanced settings
  createRoom(hostId: string, hostName: string, config: RoomConfig): { success: boolean; room?: Room; error?: string } {
    try {
      const roomId = this.generateRoomId()
      
      const host: Player = {
        id: hostId,
        name: hostName,
        isHost: true,
        joinedAt: new Date()
      }

      const room: Room = {
        id: roomId,
        hostId,
        players: [host],
        phase: 'waiting',
        maxPlayers: config.maxPlayers,
        isPrivate: config.isPrivate || false,
        roomName: config.roomName,
        gameMode: config.gameMode || 'nmjl-2025',
        allowSpectators: config.allowSpectators || false,
        createdAt: new Date(),
        lastActivity: new Date()
      }

      // Set default room settings
      const settings: RoomSettings = {
        ...config,
        spectatorMode: config.allowSpectators || false,
        autoAdvanceTurns: false,
        turnTimeLimit: 0, // No time limit by default
        allowReconnection: true
      }

      // Set host permissions
      const permissions: HostPermissions = {
        canKickPlayers: true,
        canTransferHost: true,
        canChangeSettings: true,
        canStartGame: true,
        canPauseGame: true
      }

      this.rooms.set(roomId, room)
      this.roomSettings.set(roomId, settings)
      this.hostPermissions.set(roomId, permissions)
      this.spectators.set(roomId, [])

      return { success: true, room }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create room'
      }
    }
  }

  // Join existing room
  joinRoom(roomId: string, playerId: string, playerName: string): { success: boolean; room?: Room; error?: string } {
    try {
      const room = this.rooms.get(roomId)
      if (!room) {
        return { success: false, error: 'Room not found' }
      }

      // Check if room is full
      if (room.players.length >= room.maxPlayers) {
        // Check if spectators are allowed
        if (room.allowSpectators) {
          return this.joinAsSpectator(roomId, playerId, playerName)
        }
        return { success: false, error: 'Room is full' }
      }

      // Check if player already in room
      const existingPlayer = room.players.find(p => p.id === playerId)
      if (existingPlayer) {
        // Reconnection scenario
        return { success: true, room }
      }

      // Add new player
      const newPlayer: Player = {
        id: playerId,
        name: playerName,
        isHost: false,
        joinedAt: new Date()
      }

      room.players.push(newPlayer)
      room.lastActivity = new Date()

      return { success: true, room }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to join room'
      }
    }
  }

  // Join as spectator
  private joinAsSpectator(roomId: string, playerId: string, playerName: string): { success: boolean; room?: Room; error?: string } {
    const room = this.rooms.get(roomId)
    const spectatorList = this.spectators.get(roomId)
    
    if (!room || !spectatorList) {
      return { success: false, error: 'Room not found' }
    }

    const spectator: Player = {
      id: playerId,
      name: `${playerName} (Spectator)`,
      isHost: false,
      joinedAt: new Date()
    }

    spectatorList.push(spectator)
    return { success: true, room }
  }

  // Leave room
  leaveRoom(roomId: string, playerId: string): { success: boolean; roomDeleted?: boolean; newHost?: string } {
    try {
      const room = this.rooms.get(roomId)
      if (!room) {
        return { success: false }
      }

      // Remove from players
      const playerIndex = room.players.findIndex(p => p.id === playerId)
      if (playerIndex !== -1) {
        const leavingPlayer = room.players[playerIndex]
        room.players.splice(playerIndex, 1)
        room.lastActivity = new Date()

        // Handle host leaving
        if (leavingPlayer.isHost && room.players.length > 0) {
          // Transfer host to next player
          const newHost = room.players[0]
          newHost.isHost = true
          room.hostId = newHost.id
          
          return { success: true, newHost: newHost.id }
        }

        // If no players left, delete room
        if (room.players.length === 0) {
          this.deleteRoom(roomId)
          return { success: true, roomDeleted: true }
        }

        return { success: true }
      }

      // Remove from spectators
      const spectatorList = this.spectators.get(roomId)
      if (spectatorList) {
        const spectatorIndex = spectatorList.findIndex(s => s.id === playerId)
        if (spectatorIndex !== -1) {
          spectatorList.splice(spectatorIndex, 1)
          return { success: true }
        }
      }

      return { success: false }
    } catch (error) {
      return { success: false }
    }
  }

  // Kick player (host only)
  kickPlayer(roomId: string, hostId: string, playerId: string): { success: boolean; error?: string } {
    try {
      const room = this.rooms.get(roomId)
      if (!room) {
        return { success: false, error: 'Room not found' }
      }

      // Verify host permissions
      if (room.hostId !== hostId) {
        return { success: false, error: 'Only host can kick players' }
      }

      // Cannot kick self
      if (playerId === hostId) {
        return { success: false, error: 'Cannot kick yourself' }
      }

      // Remove player
      const result = this.leaveRoom(roomId, playerId)
      return result.success ? { success: true } : { success: false, error: 'Failed to kick player' }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to kick player'
      }
    }
  }

  // Transfer host role
  transferHost(roomId: string, currentHostId: string, newHostId: string): { success: boolean; error?: string } {
    try {
      const room = this.rooms.get(roomId)
      if (!room) {
        return { success: false, error: 'Room not found' }
      }

      // Verify current host
      if (room.hostId !== currentHostId) {
        return { success: false, error: 'Only current host can transfer host role' }
      }

      // Find new host player
      const newHost = room.players.find(p => p.id === newHostId)
      const currentHost = room.players.find(p => p.id === currentHostId)
      
      if (!newHost || !currentHost) {
        return { success: false, error: 'Player not found' }
      }

      // Transfer host status
      currentHost.isHost = false
      newHost.isHost = true
      room.hostId = newHostId
      room.lastActivity = new Date()

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to transfer host'
      }
    }
  }

  // Update room settings (host only)
  updateRoomSettings(roomId: string, hostId: string, newSettings: Partial<RoomSettings>): { success: boolean; error?: string } {
    try {
      const room = this.rooms.get(roomId)
      if (!room) {
        return { success: false, error: 'Room not found' }
      }

      // Verify host permissions
      if (room.hostId !== hostId) {
        return { success: false, error: 'Only host can change room settings' }
      }

      const currentSettings = this.roomSettings.get(roomId)
      if (currentSettings) {
        const updatedSettings = { ...currentSettings, ...newSettings }
        this.roomSettings.set(roomId, updatedSettings)
        
        // Update room properties that mirror settings
        if (newSettings.maxPlayers) room.maxPlayers = newSettings.maxPlayers
        if (newSettings.isPrivate !== undefined) room.isPrivate = newSettings.isPrivate
        if (newSettings.roomName !== undefined) room.roomName = newSettings.roomName
        if (newSettings.allowSpectators !== undefined) room.allowSpectators = newSettings.allowSpectators

        room.lastActivity = new Date()
        return { success: true }
      }

      return { success: false, error: 'Settings not found' }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update settings'
      }
    }
  }

  // Get room with full details
  getRoom(roomId: string): Room | null {
    return this.rooms.get(roomId) || null
  }

  // Get room settings
  getRoomSettings(roomId: string): RoomSettings | null {
    return this.roomSettings.get(roomId) || null
  }

  // Get host permissions
  getHostPermissions(roomId: string): HostPermissions | null {
    return this.hostPermissions.get(roomId) || null
  }

  // Get spectators
  getSpectators(roomId: string): Player[] {
    return this.spectators.get(roomId) || []
  }

  // List public rooms
  getPublicRooms(): Room[] {
    return Array.from(this.rooms.values()).filter(room => !room.isPrivate)
  }

  // Delete room
  private deleteRoom(roomId: string): void {
    this.rooms.delete(roomId)
    this.roomSettings.delete(roomId)
    this.hostPermissions.delete(roomId)
    this.spectators.delete(roomId)
  }

  // Generate unique room ID
  private generateRoomId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    
    // Ensure uniqueness
    if (this.rooms.has(result)) {
      return this.generateRoomId()
    }
    
    return result
  }

  // Cleanup inactive rooms (called periodically)
  cleanupInactiveRooms(maxInactiveTime: number = 3600000): void { // 1 hour default
    const now = Date.now()
    
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.lastActivity && (now - room.lastActivity.getTime()) > maxInactiveTime) {
        this.deleteRoom(roomId)
      }
    }
  }
}