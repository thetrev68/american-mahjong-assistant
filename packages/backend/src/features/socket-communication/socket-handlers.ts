import { Server as SocketIOServer, Socket } from 'socket.io'
import { RoomManager } from '../room-lifecycle/room-manager'
import { StateSyncManager } from '../state-sync/state-sync-manager'
import { RoomLifecycleManager } from '../room-management/room-lifecycle-manager'
import { PlayerCoordinationManager } from '../room-management/player-coordination-manager'
import { GameLogicService, type GameActionData } from '../../services/game-logic'
import { MahjongValidationBridge } from '../../services/mahjong-validation-bridge'
import type { Room, Player, GameState, RoomConfig, Tile, NMJL2025Pattern } from 'shared-types'
import type { StateUpdate } from '../state-sync/state-sync-manager'

type SocketHandler = (data: unknown) => Promise<void> | void

interface ActionResult {
  success: boolean
  error?: string
  playerId?: string
  [key: string]: unknown
}

function withSocketErrorHandling(
  socket: Socket,
  eventName: string,
  handler: SocketHandler
): SocketHandler {
  return async (data) => {
    try {
      await handler(data)
    } catch (error) {
      socket.emit(eventName, {
        success: false,
        error: error instanceof Error ? error.message : `Failed to handle ${eventName.replace('-', ' ')}`
      })
    }
  }
}

interface ValidationResult {
  isValid: boolean
  room?: Room
  gameState?: GameState
  error?: string
}

function validateRoomAccess(roomManager: RoomManager, roomId: string, playerId: string): ValidationResult {
  const room = roomManager.getRoom(roomId)
  if (!room) {
    return { isValid: false, error: 'Room not found' }
  }

  const player = room.players.find((p: Player) => p.id === playerId)
  if (!player) {
    return { isValid: false, error: 'Player not in room' }
  }

  return { isValid: true, room }
}


interface FinalHandResponse {
  responseId: string
  hand: unknown[]
}

interface PatternsResponse {
  responseId: string
  patterns: unknown[]
}

export class SocketHandlers {
  private roomLifecycleManager = new RoomLifecycleManager()
  private playerCoordinationManager = new PlayerCoordinationManager()
  private gameLogicServices = new Map<string, GameLogicService>() // Per-room game logic
  
  constructor(
    private io: SocketIOServer,
    private roomManager: RoomManager,
    private stateSyncManager: StateSyncManager
  ) {}

  registerHandlers(socket: Socket): void {
    this.registerRoomHandlers(socket)
    this.registerGameStateHandlers(socket)
    this.registerCharlestonHandlers(socket)
    this.registerTurnHandlers(socket)
    this.registerGameEndHandlers(socket)
    this.registerConnectionHandlers(socket)
  }

  private registerRoomHandlers(socket: Socket): void {
    socket.on('create-room', withSocketErrorHandling(socket, 'room-created', async (data) => {
      const { hostName, config } = data as { hostName: string, config: RoomConfig }

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
    }))

    socket.on('join-room', withSocketErrorHandling(socket, 'room-joined', async (data) => {
      const { roomId, playerName } = data as { roomId: string, playerName: string }

      const player = {
        id: socket.id,
        name: playerName,
        isHost: false,
        isConnected: true,
        isReady: false
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
    }))

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

      } catch {
        socket.emit('room-left', {
          success: false,
          roomId: data.roomId
        })
      }
    })

    // Enhanced Room Management Events

    // Update room settings (host only)
    socket.on('room-update-settings', (data) => {
      try {
        const { roomId, settings } = data
        const result = this.roomLifecycleManager.updateRoomSettings(roomId, socket.id, settings)
        
        socket.emit('room-settings-updated', result)
        
        if (result.success) {
          const room = this.roomLifecycleManager.getRoom(roomId)
          socket.to(roomId).emit('room-settings-changed', { room, settings })
          this.broadcastRoomListUpdate()
        }
      } catch (error) {
        socket.emit('room-settings-updated', {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update room settings'
        })
      }
    })

    // Transfer host role
    socket.on('room-transfer-host', (data) => {
      try {
        const { roomId, newHostId } = data
        const result = this.roomLifecycleManager.transferHost(roomId, socket.id, newHostId)
        
        socket.emit('room-host-transferred', result)
        
        if (result.success) {
          const room = this.roomLifecycleManager.getRoom(roomId)
          this.io.to(roomId).emit('room-host-changed', { room, newHostId })
        }
      } catch (error) {
        socket.emit('room-host-transferred', {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to transfer host'
        })
      }
    })

    // Kick player (host only)
    socket.on('room-kick-player', (data) => {
      try {
        const { roomId, playerId } = data
        const result = this.roomLifecycleManager.kickPlayer(roomId, socket.id, playerId)
        
        socket.emit('room-player-kicked', result)
        
        if (result.success) {
          // Find the kicked player's socket and disconnect them
          const kickedSocket = this.io.sockets.sockets.get(playerId)
          if (kickedSocket) {
            kickedSocket.leave(roomId)
            kickedSocket.emit('room-kicked', { roomId, kickedBy: socket.id })
          }
          
          socket.to(roomId).emit('player-left', { playerId, roomId, kicked: true })
          this.broadcastRoomListUpdate()
        }
      } catch (error) {
        socket.emit('room-player-kicked', {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to kick player'
        })
      }
    })

    // Reconnect to room with state recovery
    socket.on('room-reconnect', async (data) => {
      try {
        const { roomId, playerId, playerName } = data
        const room = this.roomLifecycleManager.getRoom(roomId)
        
        if (!room) {
          socket.emit('room-reconnect-response', {
            success: false,
            error: 'Room not found'
          })
          return
        }

        // Check if player was in room
        const existingPlayer = room.players.find((p: Player) => p.id === playerId)
        if (!existingPlayer) {
          socket.emit('room-reconnect-response', {
            success: false,
            error: 'Player was not in this room'
          })
          return
        }

        // Rejoin room
        await socket.join(roomId)
        
        // Update player connection status
        this.playerCoordinationManager.updatePlayerConnection(roomId, playerId, true, socket.id)
        
        // Get current player states for recovery
        const playerStates = this.playerCoordinationManager.getRoomPlayerStates(roomId)
        const gameState = this.stateSyncManager.getGameState(roomId)
        
        socket.emit('room-reconnect-response', {
          success: true,
          room,
          playerStates,
          gameState
        })
        
        // Notify other players of reconnection
        socket.to(roomId).emit('player-reconnected', { playerId, playerName })
        
      } catch (error) {
        socket.emit('room-reconnect-response', {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to reconnect'
        })
      }
    })

    // Phase transition coordination
    socket.on('phase-transition', (data) => {
      try {
        const { roomId, fromPhase, toPhase } = data
        
        // Record the transition
        this.playerCoordinationManager.recordPhaseTransition(roomId, fromPhase, toPhase, socket.id)
        
        // Check if all players are ready for this phase
        const phaseReadiness = (() => {
          switch (toPhase) {
            case 'charleston': return 'charleston'
            case 'playing': return 'gameplay'
            default: return 'room'
          }
        })() as 'room' | 'charleston' | 'gameplay'
        
        const allReady = this.playerCoordinationManager.areAllPlayersReady(roomId, phaseReadiness)
        
        socket.emit('phase-transition-response', {
          success: true,
          allReady,
          readinessSummary: this.playerCoordinationManager.getReadinessSummary(roomId, phaseReadiness)
        })
        
        // If all ready, broadcast phase change
        if (allReady) {
          this.io.to(roomId).emit('phase-changed', { fromPhase, toPhase, triggeredBy: socket.id })
        }
        
      } catch (error) {
        socket.emit('phase-transition-response', {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to process phase transition'
        })
      }
    })

    // Player state synchronization across phases
    socket.on('player-state-sync', (data) => {
      try {
        const { roomId, phase, state } = data
        const playerId = socket.id
        
        // Update player readiness
        if (state.isReady !== undefined) {
          this.playerCoordinationManager.setPlayerReadiness(roomId, playerId, phase, state.isReady)
        }
        
        // Update phase-specific state
        switch (phase) {
          case 'charleston':
            if (state.charlestonTiles && state.charlestonPhase) {
              this.playerCoordinationManager.updateCharlestonState(
                roomId, playerId, state.charlestonTiles, state.charlestonPhase
              )
            }
            break
          case 'gameplay':
            this.playerCoordinationManager.updateGameplayState(roomId, playerId, state)
            break
          case 'turn':
            if (state.position && state.isCurrentTurn !== undefined) {
              this.playerCoordinationManager.updateTurnState(
                roomId, playerId, state.position, state.isCurrentTurn
              )
            }
            break
        }
        
        socket.emit('player-state-sync-response', { success: true })
        
        // Broadcast state change to other players (without sensitive data)
        const publicState = {
          playerId,
          phase,
          isReady: state.isReady,
          isConnected: true
        }
        socket.to(roomId).emit('player-state-updated', publicState)
        
      } catch (error) {
        socket.emit('player-state-sync-response', {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to sync player state'
        })
      }
    })

    // Game state recovery for disconnected players
    socket.on('game-state-recovery', (data) => {
      try {
        const { roomId } = data
        
        const room = this.roomLifecycleManager.getRoom(roomId)
        const playerStates = this.playerCoordinationManager.getRoomPlayerStates(roomId)
        const gameState = this.stateSyncManager.getGameState(roomId)
        const readinessSummary = {
          room: this.playerCoordinationManager.getReadinessSummary(roomId, 'room'),
          charleston: this.playerCoordinationManager.getReadinessSummary(roomId, 'charleston'),
          gameplay: this.playerCoordinationManager.getReadinessSummary(roomId, 'gameplay')
        }
        
        socket.emit('game-state-recovery-response', {
          success: true,
          room,
          playerStates,
          gameState,
          readinessSummary,
          recoveredAt: new Date()
        })
        
      } catch (error) {
        socket.emit('game-state-recovery-response', {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to recover game state'
        })
      }
    })

    // Spectator join
    socket.on('room-spectator-join', async (data) => {
      try {
        const { roomId, spectatorName } = data
        const result = this.roomLifecycleManager.joinRoom(roomId, socket.id, spectatorName)
        
        if (result.success && result.room) {
          await socket.join(roomId)
          
          socket.emit('room-spectator-joined', {
            success: true,
            room: result.room,
            isSpectator: true
          })
          
          // Notify players of new spectator
          socket.to(roomId).emit('spectator-joined', {
            spectatorId: socket.id,
            spectatorName
          })
          
        } else {
          socket.emit('room-spectator-joined', {
            success: false,
            error: result.error || 'Failed to join as spectator'
          })
        }
        
      } catch (error) {
        socket.emit('room-spectator-joined', {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to join as spectator'
        })
      }
    })
  }

  private registerGameStateHandlers(socket: Socket): void {
    socket.on('state-update', withSocketErrorHandling(socket, 'state-updated', async (data) => {
      const { roomId, update } = data as { roomId: string, update: StateUpdate }
      
      const validation = validateRoomAccess(this.roomManager, roomId, socket.id)
      if (!validation.isValid) {
        socket.emit('state-updated', {
          success: false,
          error: validation.error
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
    }))

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
    socket.on('charleston-player-ready', withSocketErrorHandling(socket, 'charleston-error', async (data) => {
      const { roomId, playerId, selectedTiles, phase } = data as { 
        roomId: string, playerId: string, selectedTiles: Tile[], phase: string 
      }
      
      const validation = validateRoomAccess(this.roomManager, roomId, playerId)
      if (!validation.isValid) {
        socket.emit('charleston-error', {
          success: false,
          error: validation.error
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
      const allPlayersReady = validation.room!.players.every((player: Player) => {
        const playerState = gameState.playerStates[player.id]
        return playerState && playerState.isReady
      })

      if (allPlayersReady) {
        this.handleCharlestonTileExchange(roomId, validation.room!, gameState, phase)
      }
    }))

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
        room.players.forEach((player: Player) => {
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

  private handleCharlestonTileExchange(roomId: string, room: Room, gameState: GameState, phase: string): void {
    try {
      // Calculate tile exchanges based on phase
      const tileExchanges = this.calculateTileExchanges(room.players, gameState, phase)
      
      // Reset player readiness for next phase
      room.players.forEach((player: Player) => {
        if (gameState.playerStates[player.id]) {
          gameState.playerStates[player.id].isReady = false
          gameState.playerStates[player.id].selectedTiles = []
        }
      })

      // Broadcast tile exchanges to all players
      room.players.forEach((player: Player) => {
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

  private calculateTileExchanges(players: Player[], gameState: GameState, phase: string): Record<string, { tilesReceived: unknown[] }> {
    const exchanges: Record<string, { tilesReceived: unknown[] }> = {}
    
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

  private registerTurnHandlers(socket: Socket): void {
    socket.on('turn-start-game', async (data) => {
      try {
        const { roomId, firstPlayer, turnOrder } = data
        
        const room = this.roomManager.getRoom(roomId)
        if (!room) {
          socket.emit('turn-start-game-response', {
            success: false,
            error: 'Room not found'
          })
          return
        }

        // Validate first player is in room
        if (!room.players.find((p: Player) => p.id === firstPlayer)) {
          socket.emit('turn-start-game-response', {
            success: false,
            error: 'First player not in room'
          })
          return
        }

        // Validate all turn order players are in room
        const invalidPlayers = turnOrder.filter((playerId: string) => 
          !room.players.find((p: Player) => p.id === playerId)
        )
        if (invalidPlayers.length > 0) {
          socket.emit('turn-start-game-response', {
            success: false,
            error: `Players not in room: ${invalidPlayers.join(', ')}`
          })
          return
        }

        // Initialize game state with turn information
        const gameState = this.stateSyncManager.getGameState(roomId) || this.stateSyncManager.initializeGameState(roomId)
        
        // Update shared state with turn information
        gameState.sharedState.currentPlayer = firstPlayer
        gameState.phase = 'playing'

        // Store turn order in player states
        turnOrder.forEach((playerId: string, index: number) => {
          if (!gameState.playerStates[playerId]) {
            gameState.playerStates[playerId] = {}
          }
          gameState.playerStates[playerId].position = index
        })

        this.stateSyncManager.updateSharedState(roomId, {
          currentPlayer: firstPlayer
        })

        // Broadcast turn start to all players in room
        this.io.to(roomId).emit('turn-update', {
          roomId,
          currentPlayer: firstPlayer,
          turnNumber: 1,
          roundNumber: 1,
          currentWind: 'east'
        })

        socket.emit('turn-start-game-response', {
          success: true,
          gameState
        })

        this.roomManager.updateRoomActivity(roomId)

      } catch (error) {
        socket.emit('turn-start-game-response', {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to start turn-based game'
        })
      }
    })

    socket.on('turn-advance', async (data) => {
      try {
        const { roomId, currentPlayerId, nextPlayerId, turnNumber } = data
        
        const room = this.roomManager.getRoom(roomId)
        if (!room) {
          socket.emit('turn-advance-response', {
            success: false,
            error: 'Room not found'
          })
          return
        }

        // Validate current player is actually current
        const gameState = this.stateSyncManager.getGameState(roomId)
        if (!gameState || gameState.sharedState.currentPlayer !== currentPlayerId) {
          socket.emit('turn-advance-response', {
            success: false,
            error: 'Not current player turn'
          })
          return
        }

        // Validate next player is in room
        if (!room.players.find((p: Player) => p.id === nextPlayerId)) {
          socket.emit('turn-advance-response', {
            success: false,
            error: 'Next player not in room'
          })
          return
        }

        // Update game state with new current player
        this.stateSyncManager.updateSharedState(roomId, {
          currentPlayer: nextPlayerId
        })

        // Calculate round and wind information
        const roundNumber = Math.floor((turnNumber - 1) / 4) + 1
        const windOrder = ['east', 'south', 'west', 'north']
        const currentWind = windOrder[(roundNumber - 1) % 4]

        // Broadcast turn change to all players
        this.io.to(roomId).emit('turn-update', {
          roomId,
          currentPlayer: nextPlayerId,
          turnNumber,
          roundNumber,
          currentWind
        })

        socket.emit('turn-advance-response', {
          success: true
        })

        this.roomManager.updateRoomActivity(roomId)

      } catch (error) {
        socket.emit('turn-advance-response', {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to advance turn'
        })
      }
    })

    socket.on('turn-request-status', (data) => {
      try {
        const { roomId } = data
        const room = this.roomManager.getRoom(roomId)
        const gameState = this.stateSyncManager.getGameState(roomId)

        if (!room || !gameState) {
          socket.emit('turn-status', {
            success: false,
            error: 'Room or game state not found'
          })
          return
        }

        // Calculate current turn information from game state
        const currentPlayer = gameState.sharedState.currentPlayer
        
        // Simple turn/round calculation based on when game started
        const turnNumber = 1 // This could be enhanced to track actual turns
        const roundNumber = 1 // This could be enhanced to track actual rounds
        const currentWind = gameState.currentWind

        socket.emit('turn-status', {
          success: true,
          currentPlayer,
          turnNumber,
          roundNumber,
          currentWind
        })

      } catch (error) {
        socket.emit('turn-status', {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get turn status'
        })
      }
    })

    // Phase 4B: Real-Time Turn Action Broadcasting
    socket.on('turn-action-request', async (data) => {
      try {
        const { roomId, playerId, action, actionData } = data
        
        const room = this.roomManager.getRoom(roomId)
        if (!room) {
          socket.emit('turn-action-rejected', { 
            reason: 'Room not found' 
          })
          return
        }

        const gameState = this.stateSyncManager.getGameState(roomId)
        if (!gameState) {
          socket.emit('turn-action-rejected', { 
            reason: 'Game state not found' 
          })
          return
        }

        // Validate it's the player's turn
        if (gameState.sharedState.currentPlayer !== playerId) {
          socket.emit('turn-action-rejected', { 
            reason: 'Not your turn' 
          })
          return
        }

        // Validate action is allowed for current game state
        const isValidAction = this.validateTurnAction(action, gameState, playerId)
        if (!isValidAction) {
          socket.emit('turn-action-rejected', { 
            reason: 'Invalid action for current game state' 
          })
          return
        }

        // Execute the action and update game state
        const actionResult = await this.executeTurnAction(roomId, playerId, action, actionData)
        
        if (actionResult.success) {
          // Determine next player based on action
          const nextPlayerId = this.determineNextPlayer(roomId, action, actionResult)
          
          // Update game state with new current player
          await this.stateSyncManager.updateSharedState(roomId, {
            currentPlayer: nextPlayerId
          })

          // Broadcast successful action to all players in room
          this.io.to(roomId).emit('turn-action-broadcast', {
            playerId,
            action,
            result: actionResult,
            nextPlayer: nextPlayerId,
            turnNumber: gameState.currentRound + 1,
            timestamp: new Date().toISOString()
          })

          // Confirm success to the acting player
          socket.emit('turn-action-success', {
            action,
            result: actionResult,
            nextPlayer: nextPlayerId
          })

        } else {
          socket.emit('turn-action-rejected', { 
            reason: actionResult.error || 'Action failed to execute' 
          })
        }

      } catch (error) {
        socket.emit('turn-action-rejected', {
          reason: error instanceof Error ? error.message : 'Internal server error'
        })
      }
    })

    // Phase 4B: Call Opportunity Broadcasting
    socket.on('call-opportunity-response', async (data) => {
      try {
        const { roomId, playerId, response, callType, tiles } = data
        
        const room = this.roomManager.getRoom(roomId)
        if (!room) {
          socket.emit('call-response-rejected', { 
            reason: 'Room not found' 
          })
          return
        }

        // Broadcast the response to all players
        this.io.to(roomId).emit('call-response-broadcast', {
          playerId,
          response,
          callType,
          tiles,
          timestamp: new Date().toISOString()
        })

        // If someone called, interrupt turn order
        if (response === 'call' && callType && tiles) {
          await this.handleCallInterruption(roomId, playerId, callType, tiles)
        }

      } catch (error) {
        socket.emit('call-response-rejected', {
          reason: error instanceof Error ? error.message : 'Failed to process call response'
        })
      }
    })

    // Mahjong Declaration Handler
    socket.on('declare-mahjong', async (data) => {
      try {
        const { roomId, playerId, winningHand, selectedPattern } = data as {
          roomId: string
          playerId: string
          winningHand: Tile[]
          selectedPattern: NMJL2025Pattern
        }
        
        const room = this.roomManager.getRoom(roomId)
        if (!room) {
          socket.emit('mahjong-declared', {
            isValid: false,
            validationDetails: 'Room not found'
          })
          return
        }

        const gameState = this.stateSyncManager.getGameState(roomId)
        if (!gameState) {
          socket.emit('mahjong-declared', {
            isValid: false,
            validationDetails: 'Game state not found'
          })
          return
        }

        // Validate it's the player's turn
        if (gameState.sharedState.currentPlayer !== playerId) {
          socket.emit('mahjong-declared', {
            isValid: false,
            validationDetails: 'Not your turn to declare mahjong'
          })
          return
        }

        // Basic validation - in a full implementation, this would use the MahjongValidator
        const isValidMahjong = this.validateMahjongDeclaration(winningHand, selectedPattern)
        
        if (isValidMahjong.isValid) {
          // End the game - update game state
          gameState.phase = 'finished'
          
          // Calculate final scores
          const finalScores = this.calculateFinalScores(roomId, playerId, selectedPattern, winningHand)

          // Broadcast game end to all players
          this.io.to(roomId).emit('game-ended', {
            winner: room.players.find((p: Player) => p.id === playerId),
            winningHand,
            pattern: selectedPattern.Hand_Description,
            finalScores,
            gameStats: {
              duration: Math.floor((Date.now() - gameState.lastUpdated.getTime()) / 1000 / 60), // minutes
              totalTurns: gameState.currentRound || 1,
              charlestonPasses: 3 // Standard Charleston rounds
            },
            endReason: 'mahjong'
          })

          // Confirm to declaring player
          socket.emit('mahjong-declared', {
            isValid: true,
            winningHand,
            pattern: selectedPattern.Hand_Description,
            score: isValidMahjong.score,
            bonusPoints: isValidMahjong.bonusPoints
          })

        } else {
          socket.emit('mahjong-declared', {
            isValid: false,
            validationDetails: isValidMahjong.reason || 'Invalid mahjong declaration'
          })
        }

        this.roomManager.updateRoomActivity(roomId)

      } catch (error) {
        socket.emit('mahjong-declared', {
          isValid: false,
          validationDetails: error instanceof Error ? error.message : 'Validation failed'
        })
      }
    })

    // Wall Exhaustion Handler
    socket.on('check-wall-exhaustion', async (data) => {
      try {
        const { roomId, wallTilesRemaining } = data
        
        const room = this.roomManager.getRoom(roomId)
        if (!room) {
          socket.emit('wall-exhaustion-checked', {
            canContinue: false,
            reason: 'Room not found'
          })
          return
        }

        const gameState = this.stateSyncManager.getGameState(roomId)
        if (!gameState) {
          socket.emit('wall-exhaustion-checked', {
            canContinue: false,
            reason: 'Game state not found'
          })
          return
        }

        // Check if wall is exhausted (less than 8 tiles for 4 players)
        const minTilesNeeded = room.players.length * 2
        const canContinue = wallTilesRemaining >= minTilesNeeded

        if (!canContinue) {
          // End the game due to wall exhaustion
          gameState.phase = 'finished'

          // Broadcast game end to all players
          this.io.to(roomId).emit('game-ended', {
            winner: undefined,
            finalScores: room.players.map((player: Player) => ({
              playerId: player.id,
              playerName: player.name,
              score: 0
            })),
            gameStats: {
              duration: Math.floor((Date.now() - gameState.lastUpdated.getTime()) / 1000 / 60),
              totalTurns: gameState.currentRound || 1,
              charlestonPasses: 3
            },
            endReason: 'wall_exhausted'
          })

          socket.emit('wall-exhaustion-checked', {
            canContinue: false,
            reason: 'Wall exhausted - game ended'
          })
        } else {
          socket.emit('wall-exhaustion-checked', {
            canContinue: true,
            tilesRemaining: wallTilesRemaining,
            turnsUntilExhaustion: Math.floor(wallTilesRemaining / room.players.length)
          })
        }

        this.roomManager.updateRoomActivity(roomId)

      } catch (error) {
        socket.emit('wall-exhaustion-checked', {
          canContinue: false,
          reason: error instanceof Error ? error.message : 'Wall exhaustion check failed'
        })
      }
    })

    // Player Pass Out Handler
    socket.on('player-pass-out', async (data) => {
      try {
        const { roomId, playerId, reason } = data
        
        const room = this.roomManager.getRoom(roomId)
        if (!room) {
          socket.emit('pass-out-result', {
            success: false,
            error: 'Room not found'
          })
          return
        }

        const gameState = this.stateSyncManager.getGameState(roomId)
        if (!gameState) {
          socket.emit('pass-out-result', {
            success: false,
            error: 'Game state not found'
          })
          return
        }

        // Mark player as passed out
        if (!gameState.playerStates[playerId]) {
          gameState.playerStates[playerId] = {}
        }
        gameState.playerStates[playerId].passedOut = true
        gameState.playerStates[playerId].passOutReason = reason

        // Count remaining active players
        const passedOutCount = Object.values(gameState.playerStates)
          .filter((state: unknown) => (state as { passedOut?: boolean }).passedOut).length
        const activePlayers = room.players.length - passedOutCount

        // Broadcast pass out to all players
        this.io.to(roomId).emit('player-passed-out', {
          playerId,
          playerName: room.players.find((p: Player) => p.id === playerId)?.name,
          reason,
          activePlayers
        })

        // Check if game should end (only 1 or 0 active players)
        if (activePlayers <= 1) {
          const remainingPlayer = room.players.find((p: Player) => 
            !gameState.playerStates[p.id]?.passedOut
          )

          gameState.phase = 'finished'

          this.io.to(roomId).emit('game-ended', {
            winner: remainingPlayer || undefined,
            finalScores: room.players.map((player: Player) => ({
              playerId: player.id,
              playerName: player.name,
              score: player.id === remainingPlayer?.id ? 25 : 0 // Default score for last player
            })),
            gameStats: {
              duration: Math.floor((Date.now() - gameState.lastUpdated.getTime()) / 1000 / 60),
              totalTurns: gameState.currentRound || 1,
              charlestonPasses: 3
            },
            endReason: activePlayers === 1 ? 'all_passed_out' : 'forfeit'
          })
        }

        socket.emit('pass-out-result', {
          success: true,
          activePlayers
        })

        this.roomManager.updateRoomActivity(roomId)

      } catch (error) {
        socket.emit('pass-out-result', {
          success: false,
          error: error instanceof Error ? error.message : 'Pass out failed'
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

  private handlePlayerDisconnect(playerId: string, _reason: string): void {
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

  // Phase 4B: Turn Action Validation and Execution Methods

  private validateTurnAction(action: string, gameState: GameState, playerId: string): boolean {
    // Get game logic service for this room
    const roomId = this.findRoomIdForPlayer(playerId)
    if (!roomId) {
      return false
    }

    const gameLogic = this.getOrCreateGameLogic(roomId)
    
    // Use proper game rule validation
    const validation = gameLogic.validateAction(playerId, action)
    return validation.isValid
  }

  private async executeTurnAction(roomId: string, playerId: string, action: string, actionData: unknown): Promise<ActionResult> {
    try {
      // Execute action using real game logic
      const gameLogic = this.getOrCreateGameLogic(roomId)
      const result = await gameLogic.executeAction(playerId, action, actionData as GameActionData)
      
      // Add timestamp and format for socket response
      return {
        ...result,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Action execution failed'
      }
    }
  }

  private determineNextPlayer(roomId: string, action: string, actionResult: ActionResult): string {
    const gameState = this.stateSyncManager.getGameState(roomId)
    const room = this.roomManager.getRoom(roomId)
    
    if (!gameState || !room) {
      return gameState?.sharedState.currentPlayer || ''
    }

    // If someone called, they get the next turn
    if (action === 'call') {
      return actionResult.playerId || ''
    }

    // If someone won, game is over
    if (action === 'mahjong') {
      return gameState.sharedState.currentPlayer || '' // Keep current player as winner
    }

    // Normal turn advancement - find next player in turn order
    const currentPlayerIndex = room.players.findIndex((p: Player) => p.id === gameState.sharedState.currentPlayer)
    const nextPlayerIndex = (currentPlayerIndex + 1) % room.players.length
    
    return room.players[nextPlayerIndex].id
  }

  private async handleCallInterruption(roomId: string, callingPlayerId: string, callType: string, tiles: unknown[]): Promise<void> {
    try {
      // Update game state to give turn to calling player
      await this.stateSyncManager.updateSharedState(roomId, {
        currentPlayer: callingPlayerId
      })

      // Broadcast turn interruption to all players
      this.io.to(roomId).emit('turn-interrupted', {
        newCurrentPlayer: callingPlayerId,
        reason: 'call',
        callType,
        tiles,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error('Failed to handle call interruption:', error)
    }
  }

  // Mahjong validation helper method
  private validateMahjongDeclaration(winningHand: Tile[], selectedPattern: NMJL2025Pattern): {
    isValid: boolean
    score?: number
    bonusPoints?: string[]
    reason?: string
  } {
    try {
      // Basic validation checks
      if (!winningHand || winningHand.length !== 14) {
        return {
          isValid: false,
          reason: `Invalid hand size: ${winningHand?.length || 0} tiles (need exactly 14)`
        }
      }

      if (!selectedPattern || !selectedPattern.Hand_Points) {
        return {
          isValid: false,
          reason: 'No valid pattern selected'
        }
      }

      // Use proper mahjong validation
      const validationResult = MahjongValidationBridge.validateMahjongDeclaration({
        playerId: 'server-validation',
        winningHand: winningHand,
        exposedTiles: [], // This would come from game state
        selectedPattern: selectedPattern
      })
      
      if (!validationResult.isValid) {
        return {
          isValid: false,
          reason: validationResult.violations.join('; ')
        }
      }
      const baseScore = selectedPattern.Hand_Points || 25
      const bonusPoints = ['Base pattern: +' + baseScore]

      // Simple scoring calculation
      let finalScore = baseScore

      // Concealed hand bonus
      if (selectedPattern.Hand_Conceiled) {
        const concealedBonus = Math.floor(baseScore * 0.1)
        finalScore += concealedBonus
        bonusPoints.push(`Concealed hand: +${concealedBonus}`)
      }

      // Difficulty bonus
      if (selectedPattern.Hand_Difficulty === 'hard') {
        finalScore += 5
        bonusPoints.push('Hard pattern: +5')
      }

      return {
        isValid: true,
        score: finalScore,
        bonusPoints
      }

    } catch {
      return {
        isValid: false,
        reason: 'Validation system error'
      }
    }
  }

  // Calculate final scores for all players
  private calculateFinalScores(roomId: string, winnerId: string, winningPattern: NMJL2025Pattern, _winningHand: Tile[]): Array<{
    playerId: string
    playerName: string
    score: number
    pattern?: string
  }> {
    const room = this.roomManager.getRoom(roomId)
    if (!room) return []

    const winnerScore = winningPattern.Hand_Points || 25
    const scores = []

    for (const player of room.players) {
      if (player.id === winnerId) {
        scores.push({
          playerId: player.id,
          playerName: player.name,
          score: winnerScore,
          pattern: winningPattern.Hand_Description
        })
      } else {
        // Other players get 0 points (traditional American Mahjong)
        scores.push({
          playerId: player.id,
          playerName: player.name,
          score: 0
        })
      }
    }

    return scores
  }

  private registerGameEndHandlers(socket: Socket): void {
    // Handle request for player's final hand
    socket.on('request-final-hand', async (data) => {
      try {
        const { requestingPlayerId, targetPlayerId, gameId } = data
        
        // Forward request to target player
        socket.to(targetPlayerId).emit('provide-final-hand', {
          requestingPlayerId,
          gameId,
          responseId: `hand-${socket.id}-${Date.now()}`
        })
        
        // Set up response handler
        const responseHandler = (responseData: FinalHandResponse) => {
          if (responseData.responseId === `hand-${socket.id}-${Date.now()}`) {
            socket.emit('final-hand-response', {
              playerId: targetPlayerId,
              hand: responseData.hand,
              success: true
            })
            socket.off('final-hand-provided', responseHandler)
          }
        }
        
        socket.on('final-hand-provided', responseHandler)
        
        // Timeout after 5 seconds
        setTimeout(() => {
          socket.emit('final-hand-response', {
            playerId: targetPlayerId,
            hand: [],
            success: false,
            error: 'Timeout'
          })
          socket.off('final-hand-provided', responseHandler)
        }, 5000)
        
      } catch {
        socket.emit('final-hand-response', {
          playerId: data.targetPlayerId,
          hand: [],
          success: false,
          error: 'Failed to request hand'
        })
      }
    })

    // Handle player providing their final hand
    socket.on('provide-final-hand-response', (data) => {
      this.io.emit('final-hand-provided', {
        playerId: socket.id,
        hand: data.hand,
        responseId: data.responseId
      })
    })

    // Handle request for player's selected patterns
    socket.on('request-selected-patterns', async (data) => {
      try {
        const { requestingPlayerId, targetPlayerId, gameId } = data
        
        // Forward request to target player
        socket.to(targetPlayerId).emit('provide-selected-patterns', {
          requestingPlayerId,
          gameId,
          responseId: `patterns-${socket.id}-${Date.now()}`
        })
        
        // Set up response handler
        const responseHandler = (responseData: PatternsResponse) => {
          if (responseData.responseId === `patterns-${socket.id}-${Date.now()}`) {
            socket.emit('selected-patterns-response', {
              playerId: targetPlayerId,
              patterns: responseData.patterns,
              success: true
            })
            socket.off('selected-patterns-provided', responseHandler)
          }
        }
        
        socket.on('selected-patterns-provided', responseHandler)
        
        // Timeout after 3 seconds
        setTimeout(() => {
          socket.emit('selected-patterns-response', {
            playerId: targetPlayerId,
            patterns: [],
            success: false,
            error: 'Timeout'
          })
          socket.off('selected-patterns-provided', responseHandler)
        }, 3000)
        
      } catch {
        socket.emit('selected-patterns-response', {
          playerId: data.targetPlayerId,
          patterns: [],
          success: false,
          error: 'Failed to request patterns'
        })
      }
    })

    // Handle player providing their selected patterns
    socket.on('provide-patterns-response', (data) => {
      this.io.emit('selected-patterns-provided', {
        playerId: socket.id,
        patterns: data.patterns,
        responseId: data.responseId
      })
    })

    // Handle multiplayer game end broadcast
    socket.on('multiplayer-game-ended', (data) => {
      const { roomId } = data
      if (roomId) {
        // Broadcast to all players in the room
        this.io.to(roomId).emit('game-end-coordinated', {
          ...data,
          timestamp: new Date()
        })
      }
    })
  }

  // Game Logic Service Management Methods

  private getOrCreateGameLogic(roomId: string): GameLogicService {
    let gameLogic = this.gameLogicServices.get(roomId)
    if (!gameLogic) {
      gameLogic = new GameLogicService()
      this.gameLogicServices.set(roomId, gameLogic)
    }
    return gameLogic
  }

  private findRoomIdForPlayer(playerId: string): string | null {
    const room = this.roomManager.getPlayerRoom(playerId)
    return room ? room.id : null
  }

  private cleanupGameLogic(roomId: string): void {
    this.gameLogicServices.delete(roomId)
  }

  // Override room deletion to clean up game logic
  private handleRoomDeletion(roomId: string): void {
    this.cleanupGameLogic(roomId)
    this.io.to(roomId).emit('room-deleted', { roomId })
    this.broadcastRoomListUpdate()
  }
}