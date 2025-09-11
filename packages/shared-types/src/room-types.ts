// Room and Player types for American Mahjong
import type { Tile } from './tile-types';

export type PlayerPosition = 'east' | 'south' | 'west' | 'north';

export type RoomPhase = 'waiting' | 'setup' | 'charleston' | 'playing' | 'finished';

export type GamePhase = 
  | 'waiting'           // Waiting for players to join
  | 'lobby'            // Lobby setup phase
  | 'tile-input'       // Tile input phase
  | 'charleston'        // Charleston passing phase
  | 'playing'          // Active gameplay
  | 'finished';        // Game completed

// Consolidated Player interface with all properties from different sources
export interface Player {
  id: string;
  name: string;
  position?: PlayerPosition | null;
  isHost: boolean;
  isConnected: boolean;
  isReady: boolean;
  joinedAt?: Date;
  // Game-specific properties
  tilesInHand?: number;          // Count only (hand is private)
  exposedSets?: ExposedSet[];    // Visible to all players
  hasCalledMahjong?: boolean;
  lastAction?: PlayerAction;
  // Additional game state properties
  score?: number;
  isDealer?: boolean;
  isActive?: boolean;
  passedOut?: boolean;
  passOutReason?: string;
}

// Consolidated Room interface with all properties from different sources
export interface Room {
  id: string;           // Room code (e.g., "TILE123")
  hostId: string;
  players: Player[];
  phase: RoomPhase;
  maxPlayers: number;
  isPrivate: boolean;
  roomName?: string;
  gameMode?: string;
  allowSpectators?: boolean;
  createdAt: Date;
  lastActivity?: Date;
  // Game-specific properties
  currentTurn?: PlayerPosition;
  turnStartTime?: number;
  turnTimeLimit?: number; // seconds
  discardPile?: DiscardedTile[];
  wall?: {
    tilesRemaining: number;
    totalDiscarded: number;
  };
  charleston?: CharlestonState;
  gameStartTime?: number;
  settings?: GameSettings;
  spectators?: Player[];
}

export interface RoomConfig {
  maxPlayers: number;
  isPrivate?: boolean;
  roomName?: string;
  gameMode?: 'nmjl-2025' | 'custom';
  allowSpectators?: boolean;
}

// Game state types that are room-related
export interface ExposedSet {
  tiles: Tile[];
  type: 'pung' | 'kong' | 'exposure' | 'pair';
  calledFrom?: PlayerPosition;  // Which player discarded the called tile
  timestamp: number;
}

export interface DiscardedTile {
  tile: Tile;
  discardedBy: PlayerPosition;
  timestamp: number;
  canBeCalled: boolean;
  wasCalledBy?: PlayerPosition;
}

export type ActionType = 
  | 'discard'
  | 'call_pung'
  | 'call_kong'
  | 'call_exposure'
  | 'call_mahjong'
  | 'pass'
  | 'charleston_pass';

export interface PlayerAction {
  playerId: string;
  type: ActionType;
  timestamp: number;
  tile?: Tile;
  tiles?: Tile[];
  targetPlayerId?: string; // Who they're calling from
}

export type CharlestonPhase = 
  | 'right'            // Pass right
  | 'across'           // Pass across
  | 'left'             // Pass left
  | 'optional'         // Optional pass
  | 'complete';        // Charleston finished

export interface CharlestonState {
  phase: CharlestonPhase;
  passesRemaining: number;
  playersReady: PlayerPosition[];
  timeLimit: number;
  startTime: number;
}

export interface GameSettings {
  enableCharleston: boolean;
  charlestonTimeLimit: number;  // seconds
  turnTimeLimit: number;        // seconds
  enableJokers: boolean;
  enableFlowers: boolean;
  cardYear: number;             // 2025, etc.
}

// Constants
export const PLAYER_POSITIONS: PlayerPosition[] = ['east', 'south', 'west', 'north'] as const;

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  enableCharleston: true,
  charlestonTimeLimit: 60,
  turnTimeLimit: 30,
  enableJokers: true,
  enableFlowers: true,
  cardYear: 2025
} as const;