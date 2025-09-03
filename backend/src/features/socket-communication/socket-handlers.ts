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
    this.registerCharlestonHandlers(socket)
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

  private registerCharlestonHandlers(socket: Socket): void {
    socket.on('charleston-player-ready', async (data) => {
      try {
        const { roomId, playerId, selectedTiles, phase } = data
        
        const room = this.roomManager.getRoom(roomId)
        if (!room) {
          socket.emit('charleston-error', {
            success: false,
            error: 'Room not found'
          })
          return
        }

        if (!room.players.find(p => p.id === playerId)) {
          socket.emit('charleston-error', {
            success: false,
            error: 'Player not in room'
          })
          return
        }

        // Validate selected tiles (exactly 3)
        if (!selectedTiles || selectedTiles.length !== 3) {
          socket.emit('charleston-error', {
            success: false,
            error: 'Must select exactly 3 tiles'
          })
          return
        }

        // Store player's tile selection and readiness
        const gameState = this.stateSyncManager.getGameState(roomId) || this.stateSyncManager.initializeGameState(roomId)
        
        if (!gameState.playerStates[playerId]) {
          gameState.playerStates[playerId] = {}
        }

        gameState.playerStates[playerId] = {
          ...gameState.playerStates[playerId],
          isReady: true,
          selectedTiles: selectedTiles
        }

        this.stateSyncManager.updatePlayerState(roomId, playerId, {
          isReady: true,
          selectedTiles: selectedTiles
        })

        // Notify all players that this player is ready
        socket.to(roomId).emit('charleston-player-ready-update', {
          playerId,
          isReady: true,
          phase
        })

        socket.emit('charleston-player-ready-confirmed', {
          success: true,
          playerId,
          phase
        })

        // Check if all players are ready
        const allPlayersReady = room.players.every(player => {
          const playerState = gameState.playerStates[player.id]
          return playerState && playerState.isReady
        })

        if (allPlayersReady) {
          this.handleCharlestonTileExchange(roomId, room, gameState, phase)
        }

      } catch (error) {
        socket.emit('charleston-error', {
          success: false,
          error: error instanceof Error ? error.message : 'Charleston ready failed'
        })
      }
    })

    socket.on('charleston-request-status', (data) => {
      try {
        const { roomId } = data
        const room = this.roomManager.getRoom(roomId)
        const gameState = this.stateSyncManager.getGameState(roomId)

        if (!room || !gameState) {
          socket.emit('charleston-status', {
            success: false,
            error: 'Room or game state not found'
          })
          return
        }

        const playerReadiness: Record<string, boolean> = {}
        room.players.forEach(player => {
          const playerState = gameState.playerStates[player.id]
          playerReadiness[player.id] = playerState?.isReady || false
        })

        socket.emit('charleston-status', {
          success: true,
          playerReadiness,
          roomId
        })

      } catch (error) {
        socket.emit('charleston-status', {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get Charleston status'
        })
      }
    })
  }

  private handleCharlestonTileExchange(roomId: string, room: any, gameState: any, phase: string): void {
    try {
      // Calculate tile exchanges based on phase
      const tileExchanges = this.calculateTileExchanges(room.players, gameState, phase)
      
      // Reset player readiness for next phase
      room.players.forEach((player: any) => {
        if (gameState.playerStates[player.id]) {
          gameState.playerStates[player.id].isReady = false
          gameState.playerStates[player.id].selectedTiles = []
        }
      })

      // Broadcast tile exchanges to all players
      room.players.forEach((player: any) => {
        const exchange = tileExchanges[player.id]
        if (exchange) {
          this.io.to(player.id).emit('charleston-tile-exchange', {
            roomId,
            phase,
            tilesReceived: exchange.tilesReceived,
            nextPhase: this.getNextCharlestonPhase(phase, room.players.length)
          })
        }
      })

      this.roomManager.updateRoomActivity(roomId)

    } catch (error) {
      console.error('Charleston tile exchange error:', error)
      this.io.to(roomId).emit('charleston-error', {
        success: false,
        error: 'Failed to exchange tiles'
      })
    }
  }

  private calculateTileExchanges(players: any[], gameState: any, phase: string): Record<string, { tilesReceived: any[] }> {
    const exchanges: Record<string, { tilesReceived: any[] }> = {}
    
    // Create a mapping of player positions (East=0, North=1, West=2, South=3)
    const playersByPosition = players.sort((a, b) => {
      const posA = gameState.playerStates[a.id]?.position || 0
      const posB = gameState.playerStates[b.id]?.position || 0
      return posA - posB
    })

    playersByPosition.forEach((player, index) => {
      const playerState = gameState.playerStates[player.id]
      if (!playerState || !playerState.selectedTiles) {
        exchanges[player.id] = { tilesReceived: [] }
        return
      }

      let sourcePlayerIndex: number
      
      switch (phase) {
        case 'right':
          // Receive from player to the right (next in rotation)
          sourcePlayerIndex = (index + 1) % playersByPosition.length
          break
        case 'across':
          // Receive from player across (opposite)
          sourcePlayerIndex = (index + 2) % playersByPosition.length
          break
        case 'left':
          // Receive from player to the left (previous in rotation)
          sourcePlayerIndex = (index + playersByPosition.length - 1) % playersByPosition.length
          break
        default:
          sourcePlayerIndex = index // No exchange for unknown phase
      }

      const sourcePlayer = playersByPosition[sourcePlayerIndex]
      const sourcePlayerState = gameState.playerStates[sourcePlayer.id]
      
      exchanges[player.id] = {
        tilesReceived: sourcePlayerState?.selectedTiles || []
      }
    })

    return exchanges
  }

  private getNextCharlestonPhase(currentPhase: string, playerCount: number): string {
    switch (currentPhase) {
      case 'right':
        return playerCount === 3 ? 'left' : 'across' // Skip across in 3-player games
      case 'across':
        return 'left'
      case 'left':
        return 'optional'
      case 'optional':
      default:
        return 'complete'
    }
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