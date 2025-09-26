/**
 * Game State Test Data Factories
 * 
 * Creates consistent game state objects for testing stores and game logic
 */

import type { PlayerTile, Tile } from 'shared-types'
import { createTile, createTestHand } from './tile-factories'
import type { GameState, PlayerActionState, GameAction, ExposedTileSet } from '../../features/intelligence-panel/services/turn-intelligence-engine'

/**
 * Game phase types
 */
export type GamePhase = 'setup' | 'charleston' | 'gameplay' | 'ended'

/**
 * Player state for testing - matches Game Store Player interface
 */
export interface TestPlayer {
  id: string
  name: string
  position: 'east' | 'south' | 'west' | 'north' | null
  isReady: boolean
  isConnected: boolean
  hand?: PlayerTile[]
  exposedTiles?: PlayerTile[]
  discardedTiles?: string[]
  score?: number
}

/**
 * Game state for testing
 */
export interface TestGameState {
  roomId: string
  phase: GamePhase
  currentPlayer: string
  players: TestPlayer[]
  wallTilesRemaining: number
  discardPile: string[]
  isGameActive: boolean
  turn: number
  lastAction?: {
    type: string
    player: string
    data: unknown
    timestamp: number
  }
}

/**
 * Create a test player with optional overrides
 */
export function createTestPlayer(options: {
  id?: string
  name?: string
  position?: 'east' | 'south' | 'west' | 'north' | null
  isReady?: boolean
  isConnected?: boolean
  hand?: PlayerTile[]
  exposedTiles?: PlayerTile[]
  discardedTiles?: string[]
  score?: number
} = {}): TestPlayer {
  const id = options.id || 'player-1'

  return {
    id,
    name: options.name || `Player ${id.split('-')[1]}`,
    position: options.position || null,
    isReady: options.isReady || true,
    isConnected: options.isConnected ?? true,
    hand: options.hand || createTestHand(),
    exposedTiles: options.exposedTiles || [],
    discardedTiles: options.discardedTiles || [],
    score: options.score || 0
  }
}

/**
 * Create multiple test players
 */
export function createTestPlayers(count: number = 4): TestPlayer[] {
  const positions = ['east', 'south', 'west', 'north'] as const

  return Array.from({ length: count }, (_, index) =>
    createTestPlayer({
      id: `player-${index + 1}`,
      position: index < positions.length ? positions[index] : null,
      hand: createTestHand() // Each player gets a different hand
    })
  )
}

/**
 * Create a test game state with optional overrides
 */
export function createTestGameState(options: {
  roomId?: string
  phase?: GamePhase
  currentPlayer?: string
  players?: TestPlayer[]
  wallTilesRemaining?: number
  discardPile?: string[]
  isGameActive?: boolean
  turn?: number
} = {}): TestGameState {
  const players = options.players || createTestPlayers(4)
  
  return {
    roomId: options.roomId || 'test-room-123',
    phase: options.phase || 'charleston',
    currentPlayer: options.currentPlayer || players[0].id,
    players,
    wallTilesRemaining: options.wallTilesRemaining || 108, // Standard wall count
    discardPile: options.discardPile || [],
    isGameActive: options.isGameActive || true,
    turn: options.turn || 1
  }
}

/**
 * Create GameState for TurnIntelligenceEngine testing
 */
export function createTurnIntelligenceGameState(options: {
  currentPlayer?: string | null
  turnNumber?: number
  roundNumber?: number
  players?: string[]
  gamePhase?: 'setup' | 'charleston' | 'gameplay' | 'ended'
  playerHands?: Record<string, PlayerTile[]>
  playerActions?: Record<string, PlayerActionState>
  discardPile?: Tile[]
  exposedTiles?: Record<string, ExposedTileSet[]>
  wallCount?: number
  actionHistory?: GameAction[]
} = {}): GameState {
  const players = options.players || ['player1', 'player2', 'player3', 'player4']
  const defaultPlayerActions: PlayerActionState = {
    hasDrawn: false,
    hasDiscarded: false,
    lastAction: null,
    actionCount: 0
  }

  return {
    currentPlayer: options.currentPlayer || players[0],
    turnNumber: options.turnNumber || 1,
    roundNumber: options.roundNumber || 1,
    playerHands: options.playerHands || players.reduce((hands, playerId) => {
      hands[playerId] = createTestHand() // Default test hands
      return hands
    }, {} as Record<string, PlayerTile[]>),
    playerActions: options.playerActions || players.reduce((actions, playerId) => {
      actions[playerId] = { ...defaultPlayerActions }
      return actions
    }, {} as Record<string, PlayerActionState>),
    discardPile: options.discardPile || [],
    exposedTiles: options.exposedTiles || players.reduce((exposed, playerId) => {
      exposed[playerId] = []
      return exposed
    }, {} as Record<string, ExposedTileSet[]>),
    wallCount: options.wallCount || 84,
    actionHistory: options.actionHistory || []
  }
}

/**
 * Create Charleston-specific test data
 */
export interface CharlestonTestData {
  currentPass: number
  totalPasses: number
  direction: 'left' | 'right' | 'across'
  passedTiles: { [playerId: string]: PlayerTile[] }
  isComplete: boolean
}

export function createCharlestonState(options: {
  currentPass?: number
  direction?: 'left' | 'right' | 'across'
  players?: TestPlayer[]
  passedTiles?: { [playerId: string]: PlayerTile[] }
} = {}): CharlestonTestData {
  const players = options.players || createTestPlayers(4)
  const passedTiles = options.passedTiles || {}
  
  // Create default passed tiles if not provided
  if (Object.keys(passedTiles).length === 0) {
    players.forEach(player => {
      passedTiles[player.id] = [
        createTile({ suit: 'bams', value: '7', id: '7B' }),
        createTile({ suit: 'cracks', value: '8', id: '8C' }),
        createTile({ suit: 'dots', value: '9', id: '9D' })
      ]
    })
  }
  
  return {
    currentPass: options.currentPass || 1,
    totalPasses: 3,
    direction: options.direction || 'left',
    passedTiles,
    isComplete: false
  }
}

/**
 * Create room setup test data
 */
export interface RoomSetupTestData {
  roomCode: string
  hostId: string
  gameMode: 'solo' | 'local-multiplayer'
  maxPlayers: number
  isPrivate: boolean
  settings: {
    enableTutorial: boolean
    difficulty: 'beginner' | 'intermediate' | 'expert'
    enableHints: boolean
  }
}

export function createRoomSetupState(options: {
  roomCode?: string
  hostId?: string
  gameMode?: 'solo' | 'local-multiplayer'
  maxPlayers?: number
  isPrivate?: boolean
  settings?: Partial<RoomSetupTestData['settings']>
} = {}): RoomSetupTestData {
  return {
    roomCode: options.roomCode || 'TEST123',
    hostId: options.hostId || 'host-player-1',
    gameMode: options.gameMode || 'local-multiplayer',
    maxPlayers: options.maxPlayers || 4,
    isPrivate: options.isPrivate || false,
    settings: {
      enableTutorial: options.settings?.enableTutorial || false,
      difficulty: options.settings?.difficulty || 'intermediate',
      enableHints: options.settings?.enableHints || true
    }
  }
}

/**
 * Predefined game state presets for common test scenarios
 */
export const GameStatePresets = {
  // Fresh game just starting Charleston
  charlestonStart: () => createTestGameState({
    phase: 'charleston',
    turn: 1,
    wallTilesRemaining: 108,
    discardPile: []
  }),
  
  // Game in active play phase
  activeGameplay: () => createTestGameState({
    phase: 'gameplay',
    turn: 15,
    wallTilesRemaining: 85,
    discardPile: ['7B', '8C', '9D', '1B', '2C']
  }),
  
  // Game ending scenario
  gameEnding: () => createTestGameState({
    phase: 'gameplay',
    turn: 45,
    wallTilesRemaining: 20,
    discardPile: ['7B', '8C', '9D', '1B', '2C', '3D', '4B', '5C', '6D']
  }),
  
  // Solo mode game
  soloMode: () => {
    const gameState = createTestGameState({
      players: [createTestPlayer({ id: 'solo-player', name: 'Solo Player' })]
    })
    return gameState
  },
  
  // Multiplayer setup
  multiplayerSetup: () => createTestGameState({
    phase: 'setup',
    players: createTestPlayers(4),
    isGameActive: false
  }),
  
  // Game with exposed tiles (for complex scenarios)
  withExposedTiles: () => {
    const players = createTestPlayers(4)
    
    // Add some exposed tiles to players
    players[0].exposedTiles = [
      createTile({ suit: 'bams', value: '1', id: '1B' }),
      createTile({ suit: 'bams', value: '1', id: '1B' }),
      createTile({ suit: 'bams', value: '1', id: '1B' })
    ]
    
    players[1].exposedTiles = [
      createTile({ suit: 'dragons', value: 'red', id: 'red' }),
      createTile({ suit: 'dragons', value: 'red', id: 'red' }),
      createTile({ suit: 'dragons', value: 'red', id: 'red' }),
      createTile({ suit: 'dragons', value: 'red', id: 'red' })
    ]
    
    return createTestGameState({
      phase: 'gameplay',
      players,
      discardPile: ['7B', '8C', '2D'],
      wallTilesRemaining: 95
    })
  }
}

/**
 * Helper functions for game state manipulation in tests
 */
export const GameStateHelpers = {
  // Add a tile to a player's hand
  addTileToPlayer: (gameState: TestGameState, playerId: string, tile: PlayerTile): TestGameState => {
    const updatedState = { ...gameState }
    const player = updatedState.players.find(p => p.id === playerId)
    if (player && player.hand) {
      player.hand = [...player.hand, tile]
    }
    return updatedState
  },
  
  // Remove a tile from a player's hand
  removeTileFromPlayer: (gameState: TestGameState, playerId: string, tileId: string): TestGameState => {
    const updatedState = { ...gameState }
    const player = updatedState.players.find(p => p.id === playerId)
    if (player && player.hand) {
      player.hand = player.hand.filter(tile => tile.id !== tileId)
    }
    return updatedState
  },
  
  // Add a tile to discard pile
  addToDiscardPile: (gameState: TestGameState, tileId: string): TestGameState => {
    return {
      ...gameState,
      discardPile: [...gameState.discardPile, tileId]
    }
  },
  
  // Advance to next player's turn
  nextTurn: (gameState: TestGameState): TestGameState => {
    const currentIndex = gameState.players.findIndex(p => p.id === gameState.currentPlayer)
    const nextIndex = (currentIndex + 1) % gameState.players.length
    
    return {
      ...gameState,
      currentPlayer: gameState.players[nextIndex].id,
      turn: gameState.turn + 1
    }
  }
}