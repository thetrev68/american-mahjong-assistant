import type { 
  GameState, 
  PlayerGameState, 
  SharedGameState 
} from '@shared/multiplayer-types'

export type StateUpdateType = 
  | 'phase-change'
  | 'player-state' 
  | 'shared-state'
  | 'round-change'
  | 'turn-change'

export interface StateUpdate {
  type: StateUpdateType
  playerId: string
  data: any
  timestamp: Date
}

export interface ConflictResolutionStrategy {
  resolveConflict: (current: any, incoming: StateUpdate, history: StateUpdate[]) => any
}

export class StateSyncManager {
  private gameStates = new Map<string, GameState>()
  private updateHistory = new Map<string, StateUpdate[]>()
  private conflictResolver: ConflictResolutionStrategy

  constructor() {
    this.conflictResolver = {
      resolveConflict: this.defaultConflictResolution.bind(this)
    }
  }

  async processUpdate(roomId: string, playerId: string, update: any): Promise<GameState> {
    let gameState = this.getGameState(roomId)
    
    if (!gameState) {
      gameState = this.initializeGameState(roomId)
    }

    const stateUpdate: StateUpdate = {
      type: update.type,
      playerId,
      data: update.data,
      timestamp: new Date()
    }

    this.validateUpdate(gameState, stateUpdate)
    
    const updatedState = this.applyUpdate(gameState, stateUpdate)
    
    this.gameStates.set(roomId, updatedState)
    this.addToHistory(roomId, stateUpdate)

    return updatedState
  }

  getGameState(roomId: string): GameState | null {
    return this.gameStates.get(roomId) || null
  }

  initializeGameState(roomId: string): GameState {
    const gameState: GameState = {
      roomId,
      phase: 'setup',
      currentRound: 1,
      currentWind: 'east',
      dealerPosition: 0,
      playerStates: {},
      sharedState: {
        discardPile: [],
        wallTilesRemaining: 144,
        currentPlayer: null
      },
      lastUpdated: new Date()
    }

    this.gameStates.set(roomId, gameState)
    this.updateHistory.set(roomId, [])
    
    return gameState
  }

  updateGamePhase(roomId: string, phase: GameState['phase']): GameState | null {
    const gameState = this.getGameState(roomId)
    if (!gameState) {
      return null
    }

    gameState.phase = phase
    gameState.lastUpdated = new Date()
    
    this.gameStates.set(roomId, gameState)
    return gameState
  }

  updatePlayerState(roomId: string, playerId: string, playerState: Partial<PlayerGameState>): GameState | null {
    const gameState = this.getGameState(roomId)
    if (!gameState) {
      return null
    }

    gameState.playerStates[playerId] = {
      ...gameState.playerStates[playerId],
      ...playerState
    }
    gameState.lastUpdated = new Date()

    this.gameStates.set(roomId, gameState)
    return gameState
  }

  updateSharedState(roomId: string, sharedState: Partial<SharedGameState>): GameState | null {
    const gameState = this.getGameState(roomId)
    if (!gameState) {
      return null
    }

    gameState.sharedState = {
      ...gameState.sharedState,
      ...sharedState
    }
    gameState.lastUpdated = new Date()

    this.gameStates.set(roomId, gameState)
    return gameState
  }

  syncGameState(roomId: string, remoteState: GameState): GameState {
    const localState = this.getGameState(roomId)
    
    if (!localState) {
      this.gameStates.set(roomId, remoteState)
      return remoteState
    }

    if (remoteState.lastUpdated > localState.lastUpdated) {
      this.gameStates.set(roomId, remoteState)
      return remoteState
    }

    return localState
  }

  validateGameState(gameState: GameState): boolean {
    if (!gameState.roomId || !gameState.phase) {
      return false
    }

    if (!['setup', 'charleston', 'playing', 'scoring', 'finished'].includes(gameState.phase)) {
      return false
    }

    if (!['east', 'south', 'west', 'north'].includes(gameState.currentWind)) {
      return false
    }

    if (gameState.currentRound < 1 || gameState.currentRound > 4) {
      return false
    }

    if (gameState.dealerPosition < 0 || gameState.dealerPosition > 3) {
      return false
    }

    return true
  }

  getUpdateHistory(roomId: string): StateUpdate[] {
    return this.updateHistory.get(roomId) || []
  }

  clearGameState(roomId: string): void {
    this.gameStates.delete(roomId)
    this.updateHistory.delete(roomId)
  }

  cleanupPlayerState(playerId: string): void {
    for (const [roomId, gameState] of this.gameStates.entries()) {
      if (gameState.playerStates[playerId]) {
        delete gameState.playerStates[playerId]
        gameState.lastUpdated = new Date()
        this.gameStates.set(roomId, gameState)
      }
    }
  }

  private validateUpdate(gameState: GameState, update: StateUpdate): void {
    switch (update.type) {
      case 'phase-change':
        this.validatePhaseChange(gameState, update.data.phase)
        break
      case 'player-state':
        this.validatePlayerState(update.data)
        break
      case 'shared-state':
        this.validateSharedState(update.data)
        break
      case 'round-change':
        this.validateRoundChange(gameState, update.data)
        break
      case 'turn-change':
        this.validateTurnChange(gameState, update.data)
        break
      default:
        throw new Error(`Unknown update type: ${update.type}`)
    }
  }

  private applyUpdate(gameState: GameState, update: StateUpdate): GameState {
    const updatedState = { ...gameState, lastUpdated: new Date() }

    switch (update.type) {
      case 'phase-change':
        updatedState.phase = update.data.phase
        break
      case 'player-state':
        updatedState.playerStates[update.playerId] = {
          ...updatedState.playerStates[update.playerId],
          ...update.data
        }
        break
      case 'shared-state':
        updatedState.sharedState = {
          ...updatedState.sharedState,
          ...update.data
        }
        break
      case 'round-change':
        updatedState.currentRound = update.data.round
        updatedState.currentWind = update.data.wind
        break
      case 'turn-change':
        updatedState.sharedState.currentPlayer = update.data.currentPlayer
        break
    }

    return updatedState
  }

  private addToHistory(roomId: string, update: StateUpdate): void {
    const history = this.updateHistory.get(roomId) || []
    history.push(update)
    
    if (history.length > 100) {
      history.shift()
    }
    
    this.updateHistory.set(roomId, history)
  }

  private validatePhaseChange(gameState: GameState, newPhase: string): void {
    const validTransitions: Record<string, string[]> = {
      'setup': ['charleston', 'playing'],
      'charleston': ['playing'],
      'playing': ['scoring', 'finished'],
      'scoring': ['setup', 'finished'],
      'finished': ['setup']
    }

    if (!validTransitions[gameState.phase]?.includes(newPhase)) {
      throw new Error(`Invalid phase transition from ${gameState.phase} to ${newPhase}`)
    }
  }

  private validatePlayerState(data: any): void {
    if (data.handTileCount !== undefined && (data.handTileCount < 0 || data.handTileCount > 14)) {
      throw new Error('Invalid hand tile count')
    }

    if (data.position !== undefined && (data.position < 0 || data.position > 3)) {
      throw new Error('Invalid player position')
    }

    if (data.score !== undefined && data.score < 0) {
      throw new Error('Invalid score')
    }
  }

  private validateSharedState(data: any): void {
    if (data.wallTilesRemaining !== undefined && (data.wallTilesRemaining < 0 || data.wallTilesRemaining > 144)) {
      throw new Error('Invalid wall tiles remaining')
    }

    if (data.currentWind !== undefined && !['east', 'south', 'west', 'north'].includes(data.currentWind)) {
      throw new Error('Invalid current wind')
    }

    if (data.roundNumber !== undefined && (data.roundNumber < 1 || data.roundNumber > 4)) {
      throw new Error('Invalid round number')
    }
  }

  private validateRoundChange(gameState: GameState, data: any): void {
    if (data.round < 1 || data.round > 4) {
      throw new Error('Invalid round number')
    }

    if (!['east', 'south', 'west', 'north'].includes(data.wind)) {
      throw new Error('Invalid wind direction')
    }
  }

  private validateTurnChange(gameState: GameState, data: any): void {
    if (!data.currentPlayer) {
      throw new Error('Current player must be specified')
    }

    if (!gameState.playerStates[data.currentPlayer]) {
      throw new Error('Current player not found in game state')
    }
  }

  private defaultConflictResolution(current: any, incoming: StateUpdate, history: StateUpdate[]): any {
    return incoming.timestamp > current.lastUpdated ? incoming.data : current
  }
}