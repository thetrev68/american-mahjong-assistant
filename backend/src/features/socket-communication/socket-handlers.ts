import { Server as SocketIOServer, Socket } from 'socket.io'
import { RoomManager } from '../room-lifecycle/room-manager'
import { StateSyncManager } from '../state-sync/state-sync-manager'
import type { SocketEvents } from '@shared/multiplayer-types'

export class SocketHandlers {
  constructor(
    private io: SocketIOServer,
    private roomManager: RoomManager,
    private stateSyncManager: StateSyncManager
  ) {}

  registerHandlers(socket: Socket): void {
    this.registerRoomHandlers(socket)
    this.registerGameStateHandlers(socket)
    this.registerConnectionHandlers(socket)
  }

  private registerRoomHandlers(socket: Socket): void {
    socket.on('create-room', async (data) => {
      try {
        const { hostName, config } = data
        const hostPlayer = {
          id: socket.id,
          name: hostName,
          isHost: true
        }

        const room = this.roomManager.createRoom(socket.id, {
          ...config,
          hostName: hostName
        })

        await socket.join(room.id)

        socket.emit('room-created', {
          success: true,
          room
        })

        this.broadcastRoomListUpdate()

      } catch (error) {
        socket.emit('room-created', {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create room'
        })
      }
    })

    socket.on('join-room', async (data) => {
      try {
        const { roomId, playerName } = data

        const player = {
          id: socket.id,
          name: playerName,
          isHost: false
        }

        const room = this.roomManager.joinRoom(roomId, player)
        await socket.join(roomId)

        socket.emit('room-joined', {
          success: true,
          room
        })

        socket.to(roomId).emit('player-joined', {
          player,
          room
        })

        this.broadcastRoomListUpdate()

      } catch (error) {
        socket.emit('room-joined', {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to join room'
        })
      }
    })

    socket.on('leave-room', async (data) => {
      try {
        const { roomId } = data
        const success = this.roomManager.leaveRoom(roomId, socket.id)

        if (success) {
          await socket.leave(roomId)
          
          socket.emit('room-left', {
            success: true,
            roomId
          })

          socket.to(roomId).emit('player-left', {
            playerId: socket.id,
            roomId
          })

          const room = this.roomManager.getRoom(roomId)
          if (!room) {
            this.io.to(roomId).emit('room-deleted', { roomId })
          }

          this.broadcastRoomListUpdate()
        } else {
          socket.emit('room-left', {
            success: false,
            roomId
          })
        }

      } catch (error) {
        socket.emit('room-left', {
          success: false,
          roomId: data.roomId
        })
      }
    })
  }

  private registerGameStateHandlers(socket: Socket): void {
    socket.on('state-update', async (data) => {
      try {
        const { roomId, update } = data
        
        const room = this.roomManager.getRoom(roomId)
        if (!room) {
          socket.emit('state-updated', {
            success: false,
            error: 'Room not found'
          })
          return
        }

        if (!room.players.find(p => p.id === socket.id)) {
          socket.emit('state-updated', {
            success: false,
            error: 'Player not in room'
          })
          return
        }

        const gameState = await this.stateSyncManager.processUpdate(roomId, socket.id, update)
        
        socket.emit('state-updated', {
          success: true,
          gameState
        })

        socket.to(roomId).emit('game-state-changed', {
          roomId,
          gameState,
          update
        })

        this.roomManager.updateRoomActivity(roomId)

      } catch (error) {
        socket.emit('state-updated', {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update state'
        })
      }
    })

    socket.on('request-game-state', (data) => {
      try {
        const { roomId } = data
        const gameState = this.stateSyncManager.getGameState(roomId)

        if (gameState) {
          socket.emit('game-state', {
            success: true,
            gameState
          })
        } else {
          socket.emit('game-state', {
            success: false,
            error: 'Game state not found'
          })
        }

      } catch (error) {
        socket.emit('game-state', {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get game state'
        })
      }
    })
  }

  private registerConnectionHandlers(socket: Socket): void {
    socket.on('ping', (data) => {
      socket.emit('pong', {
        timestamp: data.timestamp
      })
    })

    socket.on('disconnect', (reason) => {
      this.handlePlayerDisconnect(socket.id, reason)
    })
  }

  private handlePlayerDisconnect(playerId: string, reason: string): void {
    const room = this.roomManager.getPlayerRoom(playerId)
    
    if (room) {
      const success = this.roomManager.leaveRoom(room.id, playerId)
      
      if (success) {
        this.io.to(room.id).emit('player-left', {
          playerId,
          roomId: room.id
        })

        const updatedRoom = this.roomManager.getRoom(room.id)
        if (!updatedRoom) {
          this.io.to(room.id).emit('room-deleted', { roomId: room.id })
        }

        this.broadcastRoomListUpdate()
      }
    }

    this.stateSyncManager.cleanupPlayerState(playerId)
  }

  private broadcastRoomListUpdate(): void {
    const publicRooms = this.roomManager.getPublicRooms()
    this.io.emit('room-list-updated', { rooms: publicRooms })
  }

  startPeriodicCleanup(): void {
    setInterval(() => {
      const deletedRooms = this.roomManager.cleanupInactiveRooms()
      
      deletedRooms.forEach(roomId => {
        this.io.to(roomId).emit('room-deleted', { roomId })
      })

      if (deletedRooms.length > 0) {
        this.broadcastRoomListUpdate()
      }
    }, 5 * 60 * 1000) // Every 5 minutes
  }
}