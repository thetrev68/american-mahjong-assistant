// Room Management Multiplayer Service
// Real-time room coordination and player state synchronization

import { Socket } from 'socket.io-client'
import { useRoomStore } from '../../stores/room.store'
import { useGameStore } from '../../stores/game-store'
import type { Room, Player, RoomConfig } from 'shared-types'

interface RoomSettings {
  maxPlayers: number
  isPrivate: boolean
  roomName?: string
  gameMode: 'nmjl-2025' | 'custom'
  allowSpectators: boolean
  spectatorMode: boolean
  autoAdvanceTurns: boolean
  turnTimeLimit: number
  allowReconnection: boolean
}

export class RoomMultiplayerService {
  private socket: Socket | null = null
  private roomId: string | null = null
  private playerId: string | null = null
  private playerName: string | null = null

  constructor(socket: Socket, playerId: string, playerName: string) {
    this.socket = socket
    this.playerId = playerId
    this.playerName = playerName
    this.setupSocketListeners()
  }

  private setupSocketListeners() {
    if (!this.socket) return

    // Basic room events
    this.socket.on('room-created', (data) => {
      if (data.success && data.room) {
        this.handleRoomUpdate(data.room)
        useGameStore.getState().addAlert({
          type: 'success',
          title: 'Room Created',
          message: `Room ${data.room.id} created successfully`
        })
      } else {
        useGameStore.getState().addAlert({
          type: 'warning',
          title: 'Room Creation Failed',
          message: data.error || 'Failed to create room'
        })
      }
    })

    this.socket.on('room-joined', (data) => {
      if (data.success && data.room) {
        this.handleRoomUpdate(data.room)
        useGameStore.getState().addAlert({
          type: 'success',
          title: 'Room Joined',
          message: `Joined room ${data.room.id}`
        })
      } else {
        useGameStore.getState().addAlert({
          type: 'warning',
          title: 'Join Failed',
          message: data.error || 'Failed to join room'
        })
      }
    })

    this.socket.on('player-joined', (data) => {
      const roomStore = useRoomStore.getState()
      if (data.player && data.room) {
        roomStore.updateRoom(data.room)
        useGameStore.getState().addAlert({
          type: 'info',
          title: 'Player Joined',
          message: `${data.player.name} joined the room`
        })
      }
    })

    this.socket.on('player-left', (data) => {
      const roomStore = useRoomStore.getState()
      roomStore.removePlayer(data.playerId)
      
      const message = data.kicked ? 'Player was kicked from room' : 'Player left the room'
      useGameStore.getState().addAlert({
        type: 'info',
        title: 'Player Left',
        message
      })
    })

    // Enhanced room management events
    this.socket.on('room-settings-changed', (data) => {
      const roomStore = useRoomStore.getState()
      roomStore.updateRoom(data.room)
      roomStore.updateRoomSettings(data.settings)
      
      useGameStore.getState().addAlert({
        type: 'info',
        title: 'Room Settings Updated',
        message: 'Host updated room settings'
      })
    })

    this.socket.on('room-host-changed', (data) => {
      const roomStore = useRoomStore.getState()
      roomStore.updateRoom(data.room)
      roomStore.transferHost(data.newHostId)
      
      const isNewHost = data.newHostId === this.playerId
      useGameStore.getState().addAlert({
        type: 'info',
        title: 'Host Changed',
        message: isNewHost ? 'You are now the host' : 'Host role was transferred'
      })

      // Update host permissions if user is new host
      if (isNewHost) {
        roomStore.updateHostPermissions({
          canKickPlayers: true,
          canTransferHost: true,
          canChangeSettings: true,
          canStartGame: true,
          canPauseGame: true
        })
      }
    })

    this.socket.on('room-kicked', () => {
      const roomStore = useRoomStore.getState()
      roomStore.clearAll()
      
      useGameStore.getState().addAlert({
        type: 'warning',
        title: 'Kicked from Room',
        message: 'You were removed from the room by the host'
      })
    })

    // Reconnection events
    this.socket.on('room-reconnect-response', (data) => {
      if (data.success && data.room) {
        this.handleRoomUpdate(data.room)
        
        if (data.playerStates) {
          useRoomStore.getState().updatePlayers(data.playerStates)
        }
        
        useGameStore.getState().addAlert({
          type: 'success',
          title: 'Reconnected',
          message: 'Successfully reconnected to room'
        })
      } else {
        useGameStore.getState().addAlert({
          type: 'warning',
          title: 'Reconnection Failed',
          message: data.error || 'Failed to reconnect to room'
        })
      }
    })

    this.socket.on('player-reconnected', (data) => {
      const roomStore = useRoomStore.getState()
      roomStore.setPlayerConnection(data.playerId, true)
      
      useGameStore.getState().addAlert({
        type: 'info',
        title: 'Player Reconnected',
        message: `${data.playerName} reconnected`
      })
    })

    // Enhanced disconnection handling
    this.socket.on('player-disconnected', (data) => {
      const roomStore = useRoomStore.getState()
      roomStore.setPlayerConnection(data.playerId, false)
      roomStore.updatePlayerState(data.playerId, { lastSeen: new Date() })
      
      useGameStore.getState().addAlert({
        type: 'warning',
        title: 'Player Disconnected',
        message: `${data.playerName} lost connection`
      })
    })

    // Connection timeout warnings
    this.socket.on('player-connection-warning', (data) => {
      useGameStore.getState().addAlert({
        type: 'info',
        title: 'Connection Issues',
        message: `${data.playerName} experiencing connection problems`
      })
    })

    // Room connection health
    this.socket.on('room-health-update', (data) => {
      const roomStore = useRoomStore.getState()
      
      // Update connection status for all players
      if (data.playerConnections) {
        Object.entries(data.playerConnections).forEach(([playerId, isConnected]) => {
          roomStore.setPlayerConnection(playerId, isConnected as boolean)
        })
      }
      
      // Update room-level health metrics - defer to avoid React render cycle issues
      if (data.healthMetrics) {
        setTimeout(() => {
          try {
            roomStore.updateConnectionStatus({
              lastPing: new Date(),
              isConnected: true
            })
          } catch (error) {
            console.warn('Failed to update connection status from health metrics:', error)
          }
        }, 0)
      }
    })

    // Game state recovery response
    this.socket.on('game-state-recovery-response', (data) => {
      if (data.success) {
        const roomStore = useRoomStore.getState()
        
        // Restore room state
        if (data.roomState) {
          roomStore.updateRoom(data.roomState.room)
          roomStore.updatePlayers(data.roomState.players)
          roomStore.setCurrentPhase(data.roomState.currentPhase)
        }
        
        // Restore turn state if available
        if (data.turnState) {
          // This would need integration with turn store
          console.log('Turn state recovery:', data.turnState)
        }
        
        // Restore Charleston state if available  
        if (data.charlestonState) {
          // This would need integration with Charleston store
          console.log('Charleston state recovery:', data.charlestonState)
        }
        
        useGameStore.getState().addAlert({
          type: 'success',
          title: 'State Recovered',
          message: 'Game state successfully recovered'
        })
      } else {
        useGameStore.getState().addAlert({
          type: 'warning',
          title: 'Recovery Failed',
          message: data.error || 'Failed to recover game state'
        })
      }
    })

    // Phase transition events
    this.socket.on('phase-changed', (data) => {
      const roomStore = useRoomStore.getState()
      roomStore.setCurrentPhase(data.toPhase)
      
      useGameStore.getState().addAlert({
        type: 'info',
        title: 'Phase Changed',
        message: `Game phase changed to ${data.toPhase}`
      })
    })

    // Player state updates
    this.socket.on('player-state-updated', (data) => {
      const roomStore = useRoomStore.getState()
      roomStore.updatePlayerState(data.playerId, {
        isConnected: data.isConnected
      })
      
      if (data.isReady !== undefined) {
        roomStore.setPlayerReadiness(data.playerId, data.phase as 'room' | 'charleston' | 'gameplay', data.isReady)
      }
    })

    // Spectator events
    this.socket.on('spectator-joined', (data) => {
      const roomStore = useRoomStore.getState()
      const spectator: Player = {
        id: data.spectatorId,
        name: data.spectatorName,
        isHost: false,
        isConnected: true,
        isReady: false,
        joinedAt: new Date()
      }
      roomStore.addSpectator(spectator)
      
      useGameStore.getState().addAlert({
        type: 'info',
        title: 'Spectator Joined',
        message: `${data.spectatorName} is now spectating`
      })
    })
  }

  // Create a new room
  createRoom(config: RoomConfig): void {
    if (!this.socket || !this.playerName) return

    this.socket.emit('create-room', {
      hostName: this.playerName,
      config
    })
  }

  // Join existing room
  joinRoom(roomId: string): void {
    if (!this.socket || !this.playerName) return

    this.roomId = roomId
    this.socket.emit('join-room', {
      roomId,
      playerName: this.playerName
    })
  }

  // Leave current room
  leaveRoom(): void {
    if (!this.socket || !this.roomId) return

    this.socket.emit('leave-room', { roomId: this.roomId })
    this.roomId = null
  }

  // Update room settings (host only)
  updateRoomSettings(settings: Partial<RoomSettings>): void {
    if (!this.socket || !this.roomId) return

    this.socket.emit('room-update-settings', {
      roomId: this.roomId,
      settings
    })
  }

  // Transfer host role (host only)
  transferHost(newHostId: string): void {
    if (!this.socket || !this.roomId) return

    this.socket.emit('room-transfer-host', {
      roomId: this.roomId,
      newHostId
    })
  }

  // Kick player (host only)
  kickPlayer(playerId: string): void {
    if (!this.socket || !this.roomId) return

    this.socket.emit('room-kick-player', {
      roomId: this.roomId,
      playerId
    })
  }

  // Attempt reconnection to room
  reconnectToRoom(roomId: string): void {
    if (!this.socket || !this.playerId || !this.playerName) return

    this.roomId = roomId
    this.socket.emit('room-reconnect', {
      roomId,
      playerId: this.playerId,
      playerName: this.playerName
    })
  }

  // Trigger phase transition
  initiatePhaseTransition(fromPhase: string, toPhase: string): void {
    if (!this.socket || !this.roomId) return

    this.socket.emit('phase-transition', {
      roomId: this.roomId,
      fromPhase,
      toPhase
    })
  }

  // Sync player state for current phase
  syncPlayerState(phase: 'room' | 'charleston' | 'gameplay' | 'turn', state: unknown): void {
    if (!this.socket || !this.roomId) return

    this.socket.emit('player-state-sync', {
      roomId: this.roomId,
      phase,
      state
    })
  }

  // Request game state recovery
  requestGameStateRecovery(): void {
    if (!this.socket || !this.roomId) return

    this.socket.emit('game-state-recovery', {
      roomId: this.roomId
    })
  }

  // Join as spectator
  joinAsSpectator(roomId: string, spectatorName: string): void {
    if (!this.socket) return

    this.socket.emit('room-spectator-join', {
      roomId,
      spectatorName
    })
  }

  // Helper method to handle room updates
  private handleRoomUpdate(room: Room): void {
    this.roomId = room.id
    const roomStore = useRoomStore.getState()
    roomStore.updateRoom(room)

    // Convert Room players to CrossPhasePlayerState
    const crossPhaseStates = room.players.map(player => ({
      id: player.id,
      name: player.name,
      isHost: player.isHost,
      isConnected: true,
      lastSeen: new Date(),
      roomReadiness: false,
      charlestonReadiness: false,
      gameplayReadiness: false
    }))

    roomStore.updatePlayers(crossPhaseStates)

    // Update connection status - defer to avoid React render cycle issues
    setTimeout(() => {
      try {
        roomStore.updateConnectionStatus({
          isConnected: true,
          connectionId: this.playerId || undefined,
          lastPing: new Date(),
          reconnectionAttempts: 0
        })
      } catch (error) {
        console.warn('Failed to update connection status from room multiplayer:', error)
      }
    }, 0)

    // Update host permissions if user is host
    if (room.hostId === this.playerId) {
      roomStore.updateHostPermissions({
        canKickPlayers: true,
        canTransferHost: true,
        canChangeSettings: true,
        canStartGame: true,
        canPauseGame: true
      })
    }
  }

  // Get current room status
  getCurrentRoomStatus(): { roomId: string | null; isConnected: boolean; isHost: boolean } {
    const roomStore = useRoomStore.getState()
    return {
      roomId: this.roomId,
      isConnected: roomStore.connectionStatus.isConnected,
      isHost: roomStore.hostPlayerId === this.playerId
    }
  }

  // Clean up socket listeners
  destroy(): void {
    if (!this.socket) return

    // Remove all room-related listeners
    const events = [
      'room-created', 'room-joined', 'player-joined', 'player-left',
      'room-settings-changed', 'room-host-changed', 'room-kicked',
      'room-reconnect-response', 'player-reconnected', 'player-disconnected',
      'player-connection-warning', 'room-health-update', 'game-state-recovery-response',
      'phase-changed', 'player-state-updated', 'spectator-joined'
    ]
    
    events.forEach(event => this.socket?.off(event))
    
    this.socket = null
    this.roomId = null
    this.playerId = null
    this.playerName = null
  }
}

// Singleton service manager
let roomMultiplayerService: RoomMultiplayerService | null = null

export const getRoomMultiplayerService = (): RoomMultiplayerService | null => {
  return roomMultiplayerService
}

export const initializeRoomMultiplayerService = (
  socket: Socket,
  playerId: string,
  playerName: string
): RoomMultiplayerService => {
  // Clean up existing service
  if (roomMultiplayerService) {
    roomMultiplayerService.destroy()
  }

  roomMultiplayerService = new RoomMultiplayerService(socket, playerId, playerName)
  return roomMultiplayerService
}

export const destroyRoomMultiplayerService = (): void => {
  if (roomMultiplayerService) {
    roomMultiplayerService.destroy()
    roomMultiplayerService = null
  }
}