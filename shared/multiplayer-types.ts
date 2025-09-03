// Shared Multiplayer Types - Common interfaces for frontend and backend

import type { Tile } from './game-types'

export interface Player {
  id: string
  name: string
  isHost: boolean
  joinedAt?: Date
}

export interface Room {
  id: string
  hostId: string
  players: Player[]
  phase: 'waiting' | 'setup' | 'charleston' | 'playing' | 'finished'
  maxPlayers: number
  isPrivate: boolean
  roomName?: string
  gameMode?: string
  allowSpectators?: boolean
  createdAt: Date
  lastActivity?: Date
}

export interface RoomConfig {
  maxPlayers: number
  isPrivate?: boolean
  roomName?: string
  gameMode?: 'nmjl-2025' | 'custom'
  allowSpectators?: boolean
}

export interface PlayerGameState {
  handTileCount?: number
  isReady?: boolean
  selectedPatterns?: string[]
  position?: number
  score?: number
  isDealer?: boolean
  isActive?: boolean
}

export interface SharedState {
  discardPile: Tile[] // Tile objects
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
  playerStates: Record<string, PlayerGameState>
  sharedState: SharedState
  lastUpdated: Date
}

// Socket Event Types
export interface SocketEvents {
  // Room events
  'create-room': (data: { hostName: string; config: RoomConfig }) => void
  'room-created': (data: { success: boolean; room?: Room; error?: string }) => void
  
  'join-room': (data: { roomId: string; playerName: string }) => void
  'room-joined': (data: { success: boolean; room?: Room; error?: string }) => void
  
  'leave-room': (data: { roomId: string }) => void
  'room-left': (data: { success: boolean; roomId: string }) => void
  
  'player-joined': (data: { player: Player; room: Room }) => void
  'player-left': (data: { playerId: string; roomId: string }) => void
  'room-deleted': (data: { roomId: string }) => void
  
  // Game state events
  'state-update': (data: { roomId: string; update: any }) => void
  'state-updated': (data: { success: boolean; gameState?: GameState; error?: string }) => void
  'game-state-changed': (data: { roomId: string; gameState: GameState; update: any }) => void
  
  'request-game-state': (data: { roomId: string }) => void
  'game-state': (data: { success: boolean; gameState?: GameState; error?: string }) => void
  
  // Room list events
  'room-list-updated': (data: { rooms: Room[] }) => void
  
  // Charleston events
  'charleston-player-ready': (data: { roomId: string; playerId: string; selectedTiles: any[]; phase: string }) => void
  'charleston-player-ready-confirmed': (data: { success: boolean; playerId: string; phase: string }) => void
  'charleston-player-ready-update': (data: { playerId: string; isReady: boolean; phase: string }) => void
  'charleston-tile-exchange': (data: { roomId: string; phase: string; tilesReceived: any[]; nextPhase: string }) => void
  'charleston-request-status': (data: { roomId: string }) => void
  'charleston-status': (data: { success: boolean; playerReadiness?: Record<string, boolean>; roomId?: string; error?: string }) => void
  'charleston-error': (data: { success: boolean; error: string }) => void
  
  // Connection events
  'ping': (data: { timestamp: number }) => void
  'pong': (data: { timestamp: number }) => void
  
  'disconnect': (reason: string) => void
}