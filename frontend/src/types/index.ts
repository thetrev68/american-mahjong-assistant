// frontend/src/types/index.ts
// Core type definitions for American Mahjong Web Assistant
// This file serves as the "contract" between all components and sessions

// ========================================
// TILE SYSTEM
// ========================================

export type TileSuit = 'dots' | 'bams' | 'cracks' | 'winds' | 'dragons' | 'flowers' | 'jokers';

export type TileValue = 
  | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'  // Numbers for dots/bams/cracks
  | 'east' | 'south' | 'west' | 'north'                 // Winds
  | 'red' | 'green' | 'white'                           // Dragons  
  | 'f1' | 'f2' | 'f3' | 'f4'                          // Flowers
  | 'joker';                                            // Joker

export interface Tile {
  id: string;           // Unique identifier (e.g., "1D", "east", "joker")
  suit: TileSuit;
  value: TileValue;
  isJoker?: boolean;    // True if being used as joker
  jokerFor?: Tile;      // What this joker represents
}

export interface TileSprite {
  filename: string;     // From tiles.json
  x: number;           // Sprite coordinates
  y: number;
  width: number;
  height: number;
}

// ========================================
// PLAYER & GAME STATE
// ========================================

export type PlayerPosition = 'east' | 'south' | 'west' | 'north';

export type GamePhase = 
  | 'waiting'           // Waiting for players to join
  | 'charleston'        // Charleston passing phase
  | 'playing'          // Active gameplay
  | 'finished';        // Game completed

export type CharlestonPhase = 
  | 'right'            // Pass right
  | 'across'           // Pass across
  | 'left'             // Pass left
  | 'optional'         // Optional pass
  | 'complete';        // Charleston finished

export interface Player {
  id: string;
  name: string;
  position: PlayerPosition;
  isHost: boolean;
  isConnected: boolean;
  isReady: boolean;
  tilesInHand: number;          // Count only (hand is private)
  exposedSets: ExposedSet[];    // Visible to all players
  hasCalledMahjong: boolean;
  lastAction?: PlayerAction;
}

export interface PrivatePlayerState {
  playerId: string;
  tiles: Tile[];                // Private to this player only
  recommendations: HandAnalysis;
  charlestonSelection: Tile[];  // Tiles selected for passing
}

// ========================================
// GAME ACTIONS & EVENTS
// ========================================

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
  tiles?: Tile[];       // For charleston or multiple tile actions
  targetPlayerId?: string; // Who they're calling from
}

export interface ExposedSet {
  tiles: Tile[];
  type: 'pung' | 'kong' | 'exposure' | 'pair';
  calledFrom?: PlayerPosition;  // Which player discarded the called tile
  timestamp: number;
}

// ========================================
// GAME ROOM & SESSION
// ========================================

export interface GameRoom {
  id: string;           // Room code (e.g., "TILE123")
  hostId: string;
  players: Player[];
  phase: GamePhase;
  currentTurn: PlayerPosition;
  turnStartTime: number;
  turnTimeLimit: number; // seconds
  discardPile: DiscardedTile[];
  wall: {
    tilesRemaining: number;
    totalDiscarded: number;
  };
  charleston?: CharlestonState;
  gameStartTime?: number;
  settings: GameSettings;
}

export interface DiscardedTile {
  tile: Tile;
  discardedBy: PlayerPosition;
  timestamp: number;
  canBeCalled: boolean;
  wasCalledBy?: PlayerPosition;
}

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

// ========================================
// HAND ANALYSIS & STRATEGY
// ========================================

export interface HandPattern {
  id: string;
  name: string;           // "LIKE NUMBERS", "2025", etc.
  description: string;
  requiredTiles: Tile[];
  optionalTiles: Tile[];
  points: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
}

export interface HandAnalysis {
  bestPatterns: PatternMatch[];
  recommendations: {
    keep: Tile[];
    discard: Tile[];
    charleston: Tile[];
  };
  probabilities: {
    completion: number;     // 0-1, likelihood of completing best pattern
    turnsEstimate: number;  // Estimated turns to completion
  };
  threats: DefensiveAnalysis;
}

export interface PatternMatch {
  pattern: HandPattern;
  completion: number;       // 0-1, how close to completing
  missingTiles: Tile[];
  blockedBy: Tile[];       // Tiles that prevent this pattern
  confidence: number;       // 0-1, algorithm confidence
}

export interface DefensiveAnalysis {
  dangerousTiles: Tile[];   // Tiles likely to help opponents
  safeTiles: Tile[];        // Tiles safe to discard
  opponentThreats: {
    playerId: string;
    suspectedPatterns: string[];
    dangerLevel: 'low' | 'medium' | 'high';
  }[];
}

// ========================================
// SOCKET EVENTS & COMMUNICATION
// ========================================

export interface SocketEvents {
  // Connection events
  'join-room': { roomId: string; playerName: string };
  'leave-room': { roomId: string; playerId: string };
  'player-connected': Player;
  'player-disconnected': { playerId: string };
  
  // Game flow events
  'game-state-update': GameRoom;
  'player-action': PlayerAction;
  'turn-change': { newTurn: PlayerPosition; timeLimit: number };
  'phase-change': { newPhase: GamePhase; data?: Record<string, unknown> };
  
  // Tile events
  'tile-discarded': { tile: Tile; playerId: string };
  'tile-called': { tile: Tile; callerId: string; callType: ActionType };
  'tiles-updated': { playerId: string; count: number }; // Private tile count only
  
  // Charleston events
  'charleston-selection': { playerId: string; ready: boolean };
  'charleston-pass': { fromPlayer: string; toPlayer: string; tiles: Tile[] };
  'charleston-complete': CharlestonState;
  
  // Private events (only to specific player)
  'private-hand-update': PrivatePlayerState;
  'private-recommendations': HandAnalysis;
  
  // Error events
  'error': { message: string; code?: string };
  'invalid-action': { reason: string; action: PlayerAction };
}

// ========================================
// UI STATE & COMPONENTS
// ========================================

export type ViewMode = 'shared' | 'private' | 'charleston';

export interface UIState {
  currentView: ViewMode;
  selectedTiles: Tile[];
  showRecommendations: boolean;
  showTimer: boolean;
  notifications: Notification[];
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
}

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: number;
  duration?: number;  // Auto-dismiss after this many ms
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'danger';
}

// ========================================
// API RESPONSES & REQUESTS
// ========================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface CreateRoomRequest {
  hostName: string;
  settings: Partial<GameSettings>;
}

export interface JoinRoomRequest {
  roomId: string;
  playerName: string;
}

export interface UpdateTilesRequest {
  playerId: string;
  tiles: Tile[];
}

export interface MakeActionRequest {
  roomId: string;
  playerId: string;
  action: PlayerAction;
}

// ========================================
// UTILITY TYPES
// ========================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type EventCallback<T = unknown> = (data: T) => void;

export type TileId = string; // "1D", "east", "joker", etc.

// ========================================
// CONSTANTS & ENUMS
// ========================================

export const TILE_COUNTS = {
  numbers: 4,      // 4 of each numbered tile (1-9 in each suit)
  winds: 4,        // 4 of each wind
  dragons: 4,      // 4 of each dragon
  flowers: 1,      // 1 of each flower
  jokers: 8        // 8 jokers total
} as const;

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  enableCharleston: true,
  charlestonTimeLimit: 60,
  turnTimeLimit: 30,
  enableJokers: true,
  enableFlowers: true,
  cardYear: 2025
} as const;

export const PLAYER_POSITIONS: PlayerPosition[] = ['east', 'south', 'west', 'north'] as const;

export const TILE_SUITS: TileSuit[] = ['dots', 'bams', 'cracks', 'winds', 'dragons', 'flowers', 'jokers'] as const;