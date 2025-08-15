// Room Types - Backend room and player data structures

export interface Player {
  id: string
  name: string
  isHost: boolean
  joinedAt?: Date
  socketId?: string
}

export interface RoomConfig {
  maxPlayers: number
  isPrivate?: boolean
  roomName?: string
  gameMode?: 'nmjl-2025' | 'custom'
  allowSpectators?: boolean
}

export type RoomPhase = 'waiting' | 'setup' | 'charleston' | 'playing' | 'finished'

export interface Room {
  id: string
  hostId: string
  players: Player[]
  phase: RoomPhase
  maxPlayers: number
  isPrivate: boolean
  roomName?: string
  gameMode: string
  allowSpectators: boolean
  createdAt: Date
  lastActivity: Date
}