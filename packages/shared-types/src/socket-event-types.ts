// Socket Event Schema & Communication Protocol for American Mahjong
import type {
  Player,
  Room,
  RoomConfig,
  PlayerPosition,
  ExposedSet,
  CharlestonState,
  CharlestonPhase,
  GameSettings,
  PlayerAction,
  ActionType,
} from './room-types';
import type {
  GameState,
  PlayerGameState,
  PrivatePlayerState,
  HandAnalysis,
} from './game-state-types';
import type { Tile } from './tile-types';
import type { NMJL2025Pattern } from './nmjl-types';
import type { FinalScore, GameStatistics } from './multiplayer-types';

// Consolidated socket events interface merging all definitions
export interface SocketEventMap {
  // Connection & Room Management
  'join-room': { roomId: string; playerName: string; reconnectToken?: string };
  'leave-room': { roomId: string; playerId: string };
  'player-connected': Player;
  'player-disconnected': { playerId: string };
  'player-joined': { player: Player; roomState?: Room };
  'player-left': { playerId: string; roomId: string; roomState?: Room };
  'connection-established': { playerId: string; roomId: string; reconnected: boolean };
  'player-connection-changed': { playerId: string; isConnected: boolean; timestamp: number };
  
  // Room management events
  'create-room': { hostName: string; config?: RoomConfig };
  'room-created': { success: boolean; room?: Room; error?: string };
  'room-joined': { success: boolean; room?: Room; error?: string };
  'room-left': { success: boolean; roomId: string };
  'room-deleted': { roomId: string };
  'room-update-settings': { roomId: string; settings: Partial<GameSettings> };
  'room-settings-updated': { success: boolean; error?: string };
  'room-settings-changed': { room: Room; settings: Partial<GameSettings> };
  'room-transfer-host': { roomId: string; newHostId: string };
  'room-host-transferred': { success: boolean; error?: string };
  'room-host-changed': { room: Room; newHostId: string };
  'room-kick-player': { roomId: string; playerId: string };
  'room-player-kicked': { success: boolean; error?: string };
  'room-kicked': { roomId: string; kickedBy: string };
  'room-reconnect': { roomId: string; playerId: string; playerName: string };
  'room-reconnect-response': { success: boolean; room?: Room; playerStates?: PlayerGameState[]; gameState?: GameState; error?: string };
  'player-reconnected': { playerId: string; playerName: string };
  'room-list-updated': { rooms: Room[] };
  
  // Game Setup & Flow
  'update-settings': { roomId: string; settings: Partial<GameSettings> };
  'settings-updated': { settings: GameSettings; updatedBy: string };
  'start-game': { roomId: string };
  'game-started': { gameRoom: Room; dealerPosition?: PlayerPosition; startTime: number };
  'game-state-update': GameState;
  'phase-change': { newPhase: string; previousPhase?: string; data?: Record<string, unknown>; timestamp?: number };
  'phase-transition': { roomId: string; fromPhase: string; toPhase: string };
  'phase-transition-response': { success: boolean; allReady?: boolean; readinessSummary?: Record<string, string[]>; error?: string };
  'phase-changed': { fromPhase: string; toPhase: string; triggeredBy: string };
  
  // Turn & Action Events
  'turn-change': { newTurn?: PlayerPosition; currentTurn?: PlayerPosition; previousTurn?: PlayerPosition; timeLimit: number; turnStartTime?: number; actionRequired?: ActionType[] };
  'player-action': PlayerAction;
  'action-processed': { action: PlayerAction; success: boolean; gameState?: GameState; affectedPlayers?: string[] };
  'turn-timer-warning': { playerId: string; timeRemaining: number; urgencyLevel: 'low' | 'medium' | 'high' };
  'turn-timeout': { playerId: string; autoAction?: PlayerAction; newGameState?: GameState };
  'player-state-sync': { roomId: string; phase: string; state: Partial<PlayerGameState> };
  'player-state-sync-response': { success: boolean; error?: string };
  'player-state-updated': { playerId: string; phase: string; isReady?: boolean; isConnected: boolean };
  
  // Turn management events
  'turn-start-game': { roomId: string; firstPlayer: string; turnOrder: string[] };
  'turn-start-game-response': { success: boolean; gameState?: GameState; error?: string };
  'turn-advance': { roomId: string; currentPlayerId: string; nextPlayerId: string; turnNumber: number };
  'turn-advance-response': { success: boolean; error?: string };
  'turn-update': { roomId: string; currentPlayer: string; turnNumber: number; roundNumber: number; currentWind: string };
  'turn-request-status': { roomId: string };
  'turn-status': { success: boolean; currentPlayer?: string; turnNumber?: number; roundNumber?: number; currentWind?: string; error?: string };
  'turn-error': { success: boolean; error: string };
  
  // Tile Events
  'update-tiles': { roomId: string; playerId: string; tiles: Tile[]; requestAnalysis?: boolean };
  'tile-discarded': { tile: Tile; playerId?: string; discardedBy?: PlayerPosition; discardPile?: Tile[]; callableBy?: PlayerPosition[]; timeLimit?: number };
  'tile-called': { tile: Tile; callerId: string; callerPosition?: PlayerPosition; discarderId?: string; callType: string; exposedSet?: ExposedSet; newTurn?: PlayerPosition; gameState?: GameState };
  'tiles-updated': { playerId: string; count: number }; // Private tile count only
  'call-tile': { roomId: string; playerId: string; tileId: string; callType: 'pung' | 'kong' | 'exposure'; exposedTiles: Tile[] };
  'pass-on-tile': { roomId: string; playerId: string; tileId: string };
  'all-passed': { tileId: string; nextTurn: PlayerPosition; gameState?: GameState };
  'private-tiles-updated': { playerState: PlayerGameState; analysis?: HandAnalysis };
  
  // Charleston Events
  'charleston-started': { charlestonState: CharlestonState; phase: CharlestonPhase; timeLimit: number };
  'charleston-selection': { roomId: string; playerId: string; selectedTiles?: Tile[]; ready?: boolean; isReady?: boolean };
  'charleston-player-ready': { roomId: string; playerId: string; selectedTiles: Tile[]; phase: string };
  'charleston-player-ready-confirmed': { success: boolean; playerId: string; phase: string };
  'charleston-player-ready-update': { playerId: string; isReady: boolean; phase: string };
  'charleston-selection-status': { playerId: string; isReady: boolean; readyPlayers: PlayerPosition[]; allReady: boolean };
  'charleston-pass': { roomId: string; playerId?: string; fromPlayer?: PlayerPosition; toPlayer?: PlayerPosition; tiles?: Tile[]; tilesToPass?: Tile[] };
  'charleston-tile-exchange': { roomId: string; phase: string; tilesReceived: Tile[]; nextPhase: string };
  'charleston-tiles-received': { playerId: string; tilesReceived: Tile[]; fromPlayer: PlayerPosition; phase: CharlestonPhase };
  'charleston-phase-complete': { completedPhase: CharlestonPhase; nextPhase?: CharlestonPhase; charlestonState?: CharlestonState };
  'charleston-complete': CharlestonState;
  'charleston-request-status': { roomId: string };
  'charleston-status': { success: boolean; playerReadiness?: Record<string, boolean>; roomId?: string; error?: string };
  'charleston-error': { success: boolean; error: string };
  
  // Analysis & Recommendation Events
  'request-analysis': { roomId: string; playerId: string; tiles: Tile[]; context: 'general' | 'charleston' | 'defensive' };
  'analysis-result': { playerId: string; analysis: HandAnalysis; context: string; timestamp: number };
  'request-charleston-advice': { roomId: string; playerId: string; currentTiles: Tile[]; charlestonPhase: CharlestonPhase };
  'charleston-advice': { playerId: string; recommendations: { pass: Tile[]; keep: Tile[]; reasoning: string[] }; confidence: number };
  'private-hand-update': PrivatePlayerState;
  'private-recommendations': HandAnalysis;
  
  // Game State Events
  'state-update': { roomId: string; update: Partial<GameState> };
  'state-updated': { success: boolean; gameState?: GameState; error?: string };
  'game-state-changed': { roomId: string; gameState: GameState; update: Partial<GameState> };
  'request-game-state': { roomId: string };
  'game-state': { success: boolean; gameState?: GameState; error?: string };
  'game-state-recovery': { roomId: string };
  'game-state-recovery-response': { success: boolean; room?: Room; playerStates?: PlayerGameState[]; gameState?: GameState; readinessSummary?: Record<string, string[]>; recoveredAt?: Date; error?: string };
  
  // Spectator Events
  'room-spectator-join': { roomId: string; spectatorName: string };
  'room-spectator-joined': { success: boolean; room?: Room; isSpectator?: boolean; error?: string };
  'spectator-joined': { spectatorId: string; spectatorName: string };
  
  // Game End & Scoring Events
  'declare-mahjong': { roomId?: string; playerId: string; winningHand?: Tile[]; pattern?: NMJL2025Pattern; hand?: Tile[] };
  'mahjong-declared': { playerId?: string; winner?: string; winningHand?: Tile[]; pattern?: string; isValid: boolean; validationDetails?: string; score?: number };
  'game-ended': { winner?: Player; endReason: 'mahjong' | 'wall_exhausted' | 'all_passed_out' | 'forfeit'; finalScores?: Array<{ playerId: string; playerName?: string; score: number; pattern?: string }>; gameStats?: { duration?: number; totalTurns?: number; charlestonPasses?: number }; scores?: FinalScore[]; timestamp?: Date };
  'multiplayer-game-ended': { roomId: string; endType: string; winner?: string; finalScores?: FinalScore[]; gameStats?: GameStatistics; reason?: string; timestamp?: Date };
  'game-end-coordinated': { endType: string; winner?: string; finalScores?: FinalScore[]; gameStats?: GameStatistics; reason?: string; timestamp?: Date };
  
  // Multiplayer Game End Coordination
  'request-final-hand': { requestingPlayerId: string; targetPlayerId: string; gameId: string };
  'final-hand-response': { playerId: string; hand: Tile[]; success: boolean; error?: string };
  'provide-final-hand': { requestingPlayerId: string; gameId: string; responseId: string };
  'provide-final-hand-response': { hand: Tile[]; responseId: string };
  'final-hand-provided': { playerId: string; hand: Tile[]; responseId: string };
  'request-selected-patterns': { requestingPlayerId: string; targetPlayerId: string; gameId: string };
  'selected-patterns-response': { playerId: string; patterns: NMJL2025Pattern[]; success: boolean; error?: string };
  'provide-selected-patterns': { requestingPlayerId: string; gameId: string; responseId: string };
  'provide-patterns-response': { patterns: NMJL2025Pattern[]; responseId: string };
  'selected-patterns-provided': { playerId: string; patterns: NMJL2025Pattern[]; responseId: string };
  
  // Error & Validation Events
  'invalid-action': { playerId?: string; attemptedAction?: PlayerAction; reason: string; action?: PlayerAction; validActions?: ActionType[] };
  'error': { type?: 'connection' | 'validation' | 'game' | 'server'; message: string; code?: string; details?: unknown; recoverable?: boolean };
  'warning': { type: 'timing' | 'connection' | 'action'; message: string; autoResolve?: boolean; timeoutMs?: number };
  
  // Heartbeat & Connection Monitoring
  'ping': { timestamp: number };
  'pong': { timestamp: number };
  'heartbeat': { timestamp: number; playerId?: string; roomId?: string };
  'connection-quality': { playerId: string; latency: number; quality: 'excellent' | 'good' | 'poor' | 'disconnected'; packetsLost: number };
  'disconnect': (reason: string) => void;
}

// Event handling patterns
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

// Rate limiting constants
export const RATE_LIMITED_EVENTS = [
  'update-tiles',          // Max 1/second per player
  'request-analysis',      // Max 1/2 seconds per player  
  'charleston-selection',  // Max 1/500ms per player
  'heartbeat'             // Max 1/second per connection
] as const;

export const IMMEDIATE_RESPONSE_EVENTS = [
  'join-room',
  'player-action', 
  'call-tile',
  'declare-mahjong'
] as const;

// Middleware interfaces
export interface AuthMiddleware {
  validatePlayer: (playerId: string, roomId: string) => boolean;
  validateHost: (playerId: string, roomId: string) => boolean;
}

export interface RateLimitMiddleware {
  checkLimit: (playerId: string, eventType: string) => boolean;
  updateLimit: (playerId: string, eventType: string) => void;
}

export interface ValidationMiddleware {
  validateGameAction: (action: PlayerAction, gameState: GameState) => boolean;
  validateTileOperation: (tiles: Tile[], playerId: string) => boolean;
}

// Legacy SocketEvents interface for backward compatibility (deprecated)
export interface SocketEvents {
  // Connection events
  'join-room': { roomId: string; playerName: string };
  'leave-room': { roomId: string; playerId: string };
  'player-connected': Player;
  'player-disconnected': { playerId: string };
  
  // Game flow events
  'game-state-update': GameState;
  'player-action': PlayerAction;
  'turn-change': { newTurn: PlayerPosition; timeLimit: number };
  'phase-change': { newPhase: GameState['phase']; data?: Record<string, unknown> };
  
  // Tile events
  'tile-discarded': { tile: Tile; playerId: string };
  'tile-called': { tile: Tile; callerId: string; callType: ActionType };
  'tiles-updated': { playerId: string; count: number };
  
  // Charleston events
  'charleston-selection': { playerId: string; ready: boolean };
  'charleston-pass': { fromPlayer: PlayerPosition; toPlayer: PlayerPosition; tiles: Tile[] };
  'charleston-complete': CharlestonState;
  
  // Private events
  'private-hand-update': PrivatePlayerState;
  'private-recommendations': HandAnalysis;
  
  // Error events
  'error': { message: string; code?: string };
  'invalid-action': { reason: string; action: PlayerAction };
}