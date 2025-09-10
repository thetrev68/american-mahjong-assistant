// frontend/src/types/socket-events.ts
// Socket Event Schema & Communication Protocol
// This defines the exact event names and data structures for real-time communication

import type { Player, Room, PlayerGameState } from './multiplayer-types';
import type { Tile, PlayerAction, CharlestonState, DiscardedTile, GameSettings, PlayerPosition, GamePhase, CharlestonPhase, ExposedSet, ActionType, HandAnalysis } from './game-types';

























/*
========================================
CONNECTION & ROOM MANAGEMENT EVENTS
========================================
*/



/*
========================================
GAME SETUP & FLOW EVENTS
========================================
*/

/*
========================================
TURN & ACTION EVENTS
========================================
*/

/*
========================================
TILE & DISCARD EVENTS
========================================
*/

/*
========================================
CHARLESTON EVENTS
========================================
*/

/*
========================================
ANALYSIS & RECOMMENDATION EVENTS
========================================
*/

/*
========================================
GAME END & SCORING EVENTS
========================================
*/

/*
========================================
ERROR & VALIDATION EVENTS
========================================
*/

/*
========================================
HEARTBEAT & CONNECTION MONITORING
========================================
*/

/*
========================================
COMPREHENSIVE EVENT MAP
========================================
*/

export interface SocketEventMap {
  // Connection & Room Management
  'join-room': { roomId: string; playerName: string; reconnectToken?: string };
  'player-joined': { player: Player; roomState: Room };
  'leave-room': { roomId: string; playerId: string };
  'player-left': { playerId: string; roomState: Room };
  'connection-established': { playerId: string; roomId: string; reconnected: boolean };
  'player-connection-changed': { playerId: string; isConnected: boolean; timestamp: number };
  
  // Game Setup & Flow
  'create-room': { hostName: string; settings: Partial<GameSettings> };
  'room-created': { success: boolean; room?: Room; error?: string };
  'update-settings': { roomId: string; settings: Partial<GameSettings> };
  'settings-updated': { settings: GameSettings; updatedBy: string };
  'start-game': { roomId: string };
  'game-started': { gameRoom: Room; dealerPosition: PlayerPosition; startTime: number };
  'phase-change': { newPhase: GamePhase; previousPhase: GamePhase; phaseData?: { charleston?: CharlestonState; winner?: Player; finalScores?: { playerId: string; score: number }[]; }; timestamp: number };
  
  // Turn & Actions
  'turn-change': { currentTurn: PlayerPosition; previousTurn: PlayerPosition; turnStartTime: number; timeLimit: number; actionRequired: ActionType[] };
  'player-action': { roomId: string; action: PlayerAction };
  'action-processed': { action: PlayerAction; success: boolean; gameState: Room; affectedPlayers?: string[] };
  'turn-timer-warning': { playerId: string; timeRemaining: number; urgencyLevel: 'low' | 'medium' | 'high' };
  'turn-timeout': { playerId: string; autoAction?: PlayerAction; newGameState: Room };
  
  // Tiles & Discards
  'update-tiles': { roomId: string; playerId: string; tiles: Tile[]; requestAnalysis?: boolean };
  'private-tiles-updated': { playerState: PlayerGameState; analysis?: HandAnalysis };
  'tile-discarded': { tile: Tile; discardedBy: PlayerPosition; discardPile: DiscardedTile[]; callableBy: PlayerPosition[]; timeLimit: number };
  'call-tile': { roomId: string; playerId: string; tileId: string; callType: 'pung' | 'kong' | 'exposure'; exposedTiles: Tile[] };
  'tile-called': { callerId: string; callerPosition: PlayerPosition; discarderId: string; tile: Tile; callType: string; exposedSet: ExposedSet; newTurn: PlayerPosition; gameState: Room };
  'pass-on-tile': { roomId: string; playerId: string; tileId: string };
  'all-passed': { tileId: string; nextTurn: PlayerPosition; gameState: Room };
  
  // Charleston
  'charleston-started': { charlestonState: CharlestonState; phase: CharlestonPhase; timeLimit: number };
  'charleston-selection': { roomId: string; playerId: string; selectedTiles: Tile[]; isReady: boolean };
  'charleston-selection-status': { playerId: string; isReady: boolean; readyPlayers: PlayerPosition[]; allReady: boolean };
  'charleston-pass': { roomId: string; playerId: string; tilesToPass: Tile[] };
  'charleston-tiles-received': { playerId: string; tilesReceived: Tile[]; fromPlayer: PlayerPosition; phase: CharlestonPhase };
  'charleston-phase-complete': { completedPhase: CharlestonPhase; nextPhase?: CharlestonPhase; charlestonState: CharlestonState };
  'charleston-complete': { finalState: CharlestonState; gamePhase: 'playing'; firstTurn: PlayerPosition };
  
  // Analysis & Recommendations
  'request-analysis': { roomId: string; playerId: string; tiles: Tile[]; context: 'general' | 'charleston' | 'defensive' };
  'analysis-result': { playerId: string; analysis: HandAnalysis; context: string; timestamp: number };
  'request-charleston-advice': { roomId: string; playerId: string; currentTiles: Tile[]; charlestonPhase: CharlestonPhase };
  'charleston-advice': { playerId: string; recommendations: { pass: Tile[]; keep: Tile[]; reasoning: string[]; }; confidence: number; };
  
  // Game End & Scoring
  'declare-mahjong': { roomId: string; playerId: string; winningHand: Tile[]; pattern: string };
  'mahjong-declared': { playerId: string; winningHand: Tile[]; pattern: string; isValid: boolean; validationDetails?: string };
  'game-ended': { winner?: Player; finalScores: Array<{ playerId: string; playerName: string; score: number; pattern?: string; }>; gameStats: { duration: number; totalTurns: number; charlestonPasses: number; }; endReason: 'mahjong' | 'wall_exhausted' | 'forfeit' };
  
  // Error & Validation
  'invalid-action': { playerId: string; attemptedAction: PlayerAction; reason: string; validActions: ActionType[] };
  'error': { type: 'connection' | 'validation' | 'game' | 'server'; message: string; code?: string; details?: unknown; recoverable: boolean };
  'warning': { type: 'timing' | 'connection' | 'action'; message: string; autoResolve?: boolean; timeoutMs?: number };
  
  // Heartbeat & Monitoring
  'heartbeat': { timestamp: number; playerId?: string; roomId?: string };
  'connection-quality': { playerId: string; latency: number; quality: 'excellent' | 'good' | 'poor' | 'disconnected'; packetsLost: number };
}

/*
========================================
EVENT HANDLING PATTERNS
========================================
*/

// Client-side event handler type
export type SocketEventHandler<T extends keyof SocketEventMap> = (
  data: SocketEventMap[T]
) => void;

// Server-side event emitter helper
export interface SocketEmitter {
  // Emit to specific client
  to(playerId: string): {
    emit<T extends keyof SocketEventMap>(event: T, data: SocketEventMap[T]): void;
  };
  
  // Emit to all clients in room
  toRoom(roomId: string): {
    emit<T extends keyof SocketEventMap>(event: T, data: SocketEventMap[T]): void;
  };
  
  // Emit to all except sender
  broadcast: {
    emit<T extends keyof SocketEventMap>(event: T, data: SocketEventMap[T]): void;
  };
}

/*
========================================
EVENT FLOW PATTERNS
========================================
*/

// Real-time game flow:
// 1. player-action -> action-processed -> turn-change
// 2. tile-discarded -> (optional) tile-called -> turn-change
// 3. charleston-selection -> charleston-selection-status -> charleston-phase-complete

// Error handling flow:
// 1. invalid-action -> error -> (client retry or fallback)
// 2. connection issues -> heartbeat failure -> reconnection

// Private data flow:
// 1. update-tiles -> private-tiles-updated (to sender only)
// 2. request-analysis -> analysis-result (to sender only)

/*
========================================
RATE LIMITING & THROTTLING
========================================
*/

// Events that should be rate-limited:
export const RATE_LIMITED_EVENTS = [
  'update-tiles',          // Max 1/second per player
  'request-analysis',      // Max 1/2 seconds per player  
  'charleston-selection',  // Max 1/500ms per player
  'heartbeat'             // Max 1/second per connection
] as const;

// Events that trigger immediate responses:
export const IMMEDIATE_RESPONSE_EVENTS = [
  'join-room',
  'player-action', 
  'call-tile',
  'declare-mahjong'
] as const;

/*
========================================
SOCKET MIDDLEWARE HOOKS
========================================
*/

// Authentication middleware
export interface AuthMiddleware {
  validatePlayer: (playerId: string, roomId: string) => boolean;
  validateHost: (playerId: string, roomId: string) => boolean;
}

// Rate limiting middleware  
export interface RateLimitMiddleware {
  checkLimit: (playerId: string, eventType: string) => boolean;
  updateLimit: (playerId: string, eventType: string) => void;
}

// Validation middleware
export interface ValidationMiddleware {
  validateGameAction: (action: PlayerAction, gameState: Room) => boolean;
  validateTileOperation: (tiles: Tile[], playerId: string) => boolean;
}