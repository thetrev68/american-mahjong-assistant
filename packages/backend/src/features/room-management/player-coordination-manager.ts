// Player Coordination Manager
// Cross-phase player state synchronization for multiplayer American Mahjong

import type { Player, GameState, PlayerGameState } from 'shared-types'

interface CrossPhasePlayerState {
  // Basic player info
  id: string
  name: string
  isHost: boolean
  isConnected: boolean
  lastSeen: Date
  
  // Game phase states
  roomReadiness: boolean
  charlestonReadiness: boolean
  gameplayReadiness: boolean
  
  // Charleston phase
  charlestonTiles?: unknown[]
  charlestonPhase?: 'right' | 'across' | 'left' | 'optional'
  
  // Turn management
  position?: 'east' | 'north' | 'west' | 'south'
  isCurrentTurn?: boolean
  turnActions?: string[]
  
  // Gameplay state
  handTileCount?: number
  selectedPatterns?: string[]
  score?: number
  isDealer?: boolean
  isActive?: boolean
  
  // Connection state
  connectionId?: string
  reconnectionAttempts?: number
}

interface PhaseTransition {
  fromPhase: 'waiting' | 'setup' | 'charleston' | 'playing' | 'scoring' | 'finished'
  toPhase: 'waiting' | 'setup' | 'charleston' | 'playing' | 'scoring' | 'finished'
  triggeredBy: string // player ID
  requiresAllPlayers: boolean
  timestamp: Date
}

export class PlayerCoordinationManager {
  private playerStates = new Map<string, Map<string, CrossPhasePlayerState>>() // roomId -> playerId -> state
  private phaseHistory = new Map<string, PhaseTransition[]>() // roomId -> transitions
  private readinessTracking = new Map<string, Map<string, boolean>>() // roomId -> playerId -> ready

  // Initialize player in room
  initializePlayer(roomId: string, player: Player): void {
    if (!this.playerStates.has(roomId)) {
      this.playerStates.set(roomId, new Map())
      this.phaseHistory.set(roomId, [])
      this.readinessTracking.set(roomId, new Map())
    }

    const roomPlayers = this.playerStates.get(roomId)!
    const playerState: CrossPhasePlayerState = {
      id: player.id,
      name: player.name,
      isHost: player.isHost,
      isConnected: true,
      lastSeen: new Date(),
      roomReadiness: false,
      charlestonReadiness: false,
      gameplayReadiness: false,
      reconnectionAttempts: 0
    }

    roomPlayers.set(player.id, playerState)
  }

  // Update player connection status
  updatePlayerConnection(roomId: string, playerId: string, isConnected: boolean, connectionId?: string): void {
    const roomPlayers = this.playerStates.get(roomId)
    const playerState = roomPlayers?.get(playerId)
    
    if (playerState) {
      playerState.isConnected = isConnected
      playerState.lastSeen = new Date()
      
      if (connectionId) {
        playerState.connectionId = connectionId
      }
      
      if (!isConnected) {
        playerState.reconnectionAttempts = (playerState.reconnectionAttempts || 0) + 1
      } else {
        playerState.reconnectionAttempts = 0
      }
    }
  }

  // Set player readiness for specific phase
  setPlayerReadiness(roomId: string, playerId: string, phase: 'room' | 'charleston' | 'gameplay', isReady: boolean): boolean {
    const roomPlayers = this.playerStates.get(roomId)
    const playerState = roomPlayers?.get(playerId)
    
    if (!playerState) {
      return false
    }

    switch (phase) {
      case 'room':
        playerState.roomReadiness = isReady
        break
      case 'charleston':
        playerState.charlestonReadiness = isReady
        break
      case 'gameplay':
        playerState.gameplayReadiness = isReady
        break
    }

    // Update readiness tracking
    const readiness = this.readinessTracking.get(roomId)!
    readiness.set(`${playerId}-${phase}`, isReady)

    return true
  }

  // Check if all players are ready for phase transition
  areAllPlayersReady(roomId: string, phase: 'room' | 'charleston' | 'gameplay'): boolean {
    const roomPlayers = this.playerStates.get(roomId)
    if (!roomPlayers) return false

    const connectedPlayers = Array.from(roomPlayers.values()).filter(p => p.isConnected)
    if (connectedPlayers.length === 0) return false

    return connectedPlayers.every(player => {
      switch (phase) {
        case 'room':
          return player.roomReadiness
        case 'charleston':
          return player.charlestonReadiness
        case 'gameplay':
          return player.gameplayReadiness
        default:
          return false
      }
    })
  }

  // Update Charleston-specific state
  updateCharlestonState(roomId: string, playerId: string, tiles: unknown[], phase: 'right' | 'across' | 'left' | 'optional'): void {
    const roomPlayers = this.playerStates.get(roomId)
    const playerState = roomPlayers?.get(playerId)
    
    if (playerState) {
      playerState.charlestonTiles = tiles
      playerState.charlestonPhase = phase
    }
  }

  // Update turn management state
  updateTurnState(roomId: string, playerId: string, position: 'east' | 'north' | 'west' | 'south', isCurrentTurn: boolean): void {
    const roomPlayers = this.playerStates.get(roomId)
    const playerState = roomPlayers?.get(playerId)
    
    if (playerState) {
      playerState.position = position
      playerState.isCurrentTurn = isCurrentTurn
      playerState.turnActions = playerState.turnActions || []
    }
  }

  // Update gameplay state
  updateGameplayState(roomId: string, playerId: string, gameState: Partial<PlayerGameState>): void {
    const roomPlayers = this.playerStates.get(roomId)
    const playerState = roomPlayers?.get(playerId)
    
    if (playerState) {
      if (gameState.handTileCount !== undefined) playerState.handTileCount = gameState.handTileCount
      if (gameState.selectedPatterns) playerState.selectedPatterns = gameState.selectedPatterns
      if (gameState.score !== undefined) playerState.score = gameState.score
      if (gameState.isDealer !== undefined) playerState.isDealer = gameState.isDealer
      if (gameState.isActive !== undefined) playerState.isActive = gameState.isActive
    }
  }

  // Record phase transition
  recordPhaseTransition(
    roomId: string, 
    fromPhase: GameState['phase'], 
    toPhase: GameState['phase'], 
    triggeredBy: string
  ): void {
    const history = this.phaseHistory.get(roomId)
    if (history) {
      const transition: PhaseTransition = {
        fromPhase,
        toPhase,
        triggeredBy,
        requiresAllPlayers: this.doesPhaseRequireAllPlayers(toPhase),
        timestamp: new Date()
      }
      history.push(transition)
    }
  }

  // Get current player states for room
  getRoomPlayerStates(roomId: string): CrossPhasePlayerState[] {
    const roomPlayers = this.playerStates.get(roomId)
    return roomPlayers ? Array.from(roomPlayers.values()) : []
  }

  // Get specific player state
  getPlayerState(roomId: string, playerId: string): CrossPhasePlayerState | null {
    const roomPlayers = this.playerStates.get(roomId)
    return roomPlayers?.get(playerId) || null
  }

  // Get readiness summary for phase
  getReadinessSummary(roomId: string, phase: 'room' | 'charleston' | 'gameplay'): { ready: string[], notReady: string[], total: number } {
    const roomPlayers = this.playerStates.get(roomId)
    if (!roomPlayers) return { ready: [], notReady: [], total: 0 }

    const connectedPlayers = Array.from(roomPlayers.values()).filter(p => p.isConnected)
    const ready: string[] = []
    const notReady: string[] = []

    connectedPlayers.forEach(player => {
      const isReady = (() => {
        switch (phase) {
          case 'room': return player.roomReadiness
          case 'charleston': return player.charlestonReadiness
          case 'gameplay': return player.gameplayReadiness
          default: return false
        }
      })()

      if (isReady) {
        ready.push(player.name)
      } else {
        notReady.push(player.name)
      }
    })

    return { ready, notReady, total: connectedPlayers.length }
  }

  // Get disconnected players
  getDisconnectedPlayers(roomId: string): CrossPhasePlayerState[] {
    const roomPlayers = this.playerStates.get(roomId)
    if (!roomPlayers) return []

    return Array.from(roomPlayers.values()).filter(p => !p.isConnected)
  }

  // Remove player from coordination
  removePlayer(roomId: string, playerId: string): void {
    const roomPlayers = this.playerStates.get(roomId)
    if (roomPlayers) {
      roomPlayers.delete(playerId)
      
      // Clean up readiness tracking
      const readiness = this.readinessTracking.get(roomId)
      if (readiness) {
        ['room', 'charleston', 'gameplay'].forEach(phase => {
          readiness.delete(`${playerId}-${phase}`)
        })
      }
    }
  }

  // Clean up room data
  cleanupRoom(roomId: string): void {
    this.playerStates.delete(roomId)
    this.phaseHistory.delete(roomId)
    this.readinessTracking.delete(roomId)
  }

  // Get phase history
  getPhaseHistory(roomId: string): PhaseTransition[] {
    return this.phaseHistory.get(roomId) || []
  }

  // Helper: Check if phase requires all players to be ready
  private doesPhaseRequireAllPlayers(phase: GameState['phase']): boolean {
    switch (phase) {
      case 'charleston':
      case 'playing':
        return true
      case 'setup':
      case 'finished':
        return false
      default:
        return false
    }
  }

  // Get connected player count
  getConnectedPlayerCount(roomId: string): number {
    const roomPlayers = this.playerStates.get(roomId)
    if (!roomPlayers) return 0

    return Array.from(roomPlayers.values()).filter(p => p.isConnected).length
  }

  // Bulk state sync for recovery
  syncPlayerStates(roomId: string, states: Record<string, CrossPhasePlayerState>): void {
    const roomPlayers = this.playerStates.get(roomId)
    if (roomPlayers) {
      for (const [playerId, state] of Object.entries(states)) {
        roomPlayers.set(playerId, { ...state, lastSeen: new Date() })
      }
    }
  }
}