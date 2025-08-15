// Sync Types - Backend state synchronization data structures

export interface PlayerState {
  handTileCount?: number
  isReady?: boolean
  selectedPatterns?: string[]
  position?: number
  score?: number
  isDealer?: boolean
  isActive?: boolean
}

export interface SharedState {
  discardPile: any[] // Tile objects
  wallTilesRemaining: number
  currentPlayer: string | null
  currentWind?: 'east' | 'south' | 'west' | 'north'
  roundNumber?: number
}

export interface GameState {
  roomId: string
  phase: 'setup' | 'charleston' | 'playing' | 'scoring' | 'finished'
  currentRound: number
  currentWind: 'east' | 'south' | 'west' | 'north'
  dealerPosition: number
  playerStates: Record<string, PlayerState>
  sharedState: SharedState
  lastUpdated: Date
}

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

export interface SyncMessage {
  roomId: string
  update: StateUpdate
}

export interface ConflictResolutionStrategy {
  resolveConflict: (current: any, incoming: StateUpdate, history: StateUpdate[]) => any
}