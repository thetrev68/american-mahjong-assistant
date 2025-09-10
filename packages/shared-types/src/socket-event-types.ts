// Socket Event Schema & Communication Protocol for American Mahjong

// Consolidated socket events interface merging all definitions
export interface SocketEventMap {
  // Connection & Room Management
  'join-room': { roomId: string; playerName: string; reconnectToken?: string };
  'leave-room': { roomId: string; playerId: string };
  'player-connected': any; // Will be Player when imported
  'player-disconnected': { playerId: string };
  'player-joined': { player: any; roomState?: any }; // Will be Player and Room when imported
  'player-left': { playerId: string; roomId: string; roomState?: any }; // Will be Room when imported
  'connection-established': { playerId: string; roomId: string; reconnected: boolean };
  'player-connection-changed': { playerId: string; isConnected: boolean; timestamp: number };
  
  // Room management events
  'create-room': { hostName: string; config?: any }; // Will be RoomConfig when imported
  'room-created': { success: boolean; room?: any; error?: string }; // Will be Room when imported
  'room-joined': { success: boolean; room?: any; error?: string }; // Will be Room when imported
  'room-left': { success: boolean; roomId: string };
  'room-deleted': { roomId: string };
  'room-update-settings': { roomId: string; settings: any };
  'room-settings-updated': { success: boolean; error?: string };
  'room-settings-changed': { room: any; settings: any }; // Will be Room when imported
  'room-transfer-host': { roomId: string; newHostId: string };
  'room-host-transferred': { success: boolean; error?: string };
  'room-host-changed': { room: any; newHostId: string }; // Will be Room when imported
  'room-kick-player': { roomId: string; playerId: string };
  'room-player-kicked': { success: boolean; error?: string };
  'room-kicked': { roomId: string; kickedBy: string };
  'room-reconnect': { roomId: string; playerId: string; playerName: string };
  'room-reconnect-response': { success: boolean; room?: any; playerStates?: any[]; gameState?: any; error?: string };
  'player-reconnected': { playerId: string; playerName: string };
  'room-list-updated': { rooms: any[] }; // Will be Room[] when imported
  
  // Game Setup & Flow
  'update-settings': { roomId: string; settings: any }; // Will be Partial<GameSettings> when imported
  'settings-updated': { settings: any; updatedBy: string }; // Will be GameSettings when imported
  'start-game': { roomId: string };
  'game-started': { gameRoom: any; dealerPosition?: string; startTime: number }; // Will be Room, PlayerPosition when imported
  'game-state-update': any; // Will be GameRoom when imported
  'phase-change': { newPhase: string; previousPhase?: string; data?: Record<string, unknown>; timestamp?: number };
  'phase-transition': { roomId: string; fromPhase: string; toPhase: string };
  'phase-transition-response': { success: boolean; allReady?: boolean; readinessSummary?: any; error?: string };
  'phase-changed': { fromPhase: string; toPhase: string; triggeredBy: string };
  
  // Turn & Action Events
  'turn-change': { newTurn?: string; currentTurn?: string; previousTurn?: string; timeLimit: number; turnStartTime?: number; actionRequired?: string[] };
  'player-action': any; // Will be PlayerAction when imported
  'action-processed': { action: any; success: boolean; gameState?: any; affectedPlayers?: string[] };
  'turn-timer-warning': { playerId: string; timeRemaining: number; urgencyLevel: 'low' | 'medium' | 'high' };
  'turn-timeout': { playerId: string; autoAction?: any; newGameState?: any };
  'player-state-sync': { roomId: string; phase: string; state: any };
  'player-state-sync-response': { success: boolean; error?: string };
  'player-state-updated': { playerId: string; phase: string; isReady?: boolean; isConnected: boolean };
  
  // Turn management events
  'turn-start-game': { roomId: string; firstPlayer: string; turnOrder: string[] };
  'turn-start-game-response': { success: boolean; gameState?: any; error?: string };
  'turn-advance': { roomId: string; currentPlayerId: string; nextPlayerId: string; turnNumber: number };
  'turn-advance-response': { success: boolean; error?: string };
  'turn-update': { roomId: string; currentPlayer: string; turnNumber: number; roundNumber: number; currentWind: string };
  'turn-request-status': { roomId: string };
  'turn-status': { success: boolean; currentPlayer?: string; turnNumber?: number; roundNumber?: number; currentWind?: string; error?: string };
  'turn-error': { success: boolean; error: string };
  
  // Tile Events
  'update-tiles': { roomId: string; playerId: string; tiles: any[]; requestAnalysis?: boolean }; // Will be Tile[] when imported
  'tile-discarded': { tile: any; playerId?: string; discardedBy?: string; discardPile?: any[]; callableBy?: string[]; timeLimit?: number }; // Will be Tile, PlayerPosition when imported
  'tile-called': { tile: any; callerId: string; callerPosition?: string; discarderId?: string; callType: string; exposedSet?: any; newTurn?: string; gameState?: any }; // Will be Tile, PlayerPosition, ExposedSet, Room when imported
  'tiles-updated': { playerId: string; count: number }; // Private tile count only
  'call-tile': { roomId: string; playerId: string; tileId: string; callType: 'pung' | 'kong' | 'exposure'; exposedTiles: any[] }; // Will be Tile[] when imported
  'pass-on-tile': { roomId: string; playerId: string; tileId: string };
  'all-passed': { tileId: string; nextTurn: string; gameState?: any }; // Will be PlayerPosition, Room when imported
  'private-tiles-updated': { playerState: any; analysis?: any }; // Will be PlayerGameState, HandAnalysis when imported
  
  // Charleston Events
  'charleston-started': { charlestonState: any; phase: string; timeLimit: number }; // Will be CharlestonState, CharlestonPhase when imported
  'charleston-selection': { roomId: string; playerId: string; selectedTiles?: any[]; ready?: boolean; isReady?: boolean }; // Will be Tile[] when imported
  'charleston-player-ready': { roomId: string; playerId: string; selectedTiles: any[]; phase: string }; // Will be Tile[] when imported
  'charleston-player-ready-confirmed': { success: boolean; playerId: string; phase: string };
  'charleston-player-ready-update': { playerId: string; isReady: boolean; phase: string };
  'charleston-selection-status': { playerId: string; isReady: boolean; readyPlayers: string[]; allReady: boolean }; // Will be PlayerPosition[] when imported
  'charleston-pass': { roomId: string; playerId?: string; fromPlayer?: string; toPlayer?: string; tiles?: any[]; tilesToPass?: any[] }; // Will be Tile[] when imported
  'charleston-tile-exchange': { roomId: string; phase: string; tilesReceived: any[]; nextPhase: string }; // Will be Tile[] when imported
  'charleston-tiles-received': { playerId: string; tilesReceived: any[]; fromPlayer: string; phase: string }; // Will be Tile[], PlayerPosition, CharlestonPhase when imported
  'charleston-phase-complete': { completedPhase: string; nextPhase?: string; charlestonState?: any }; // Will be CharlestonPhase, CharlestonState when imported
  'charleston-complete': any; // Will be CharlestonState when imported
  'charleston-request-status': { roomId: string };
  'charleston-status': { success: boolean; playerReadiness?: Record<string, boolean>; roomId?: string; error?: string };
  'charleston-error': { success: boolean; error: string };
  
  // Analysis & Recommendation Events
  'request-analysis': { roomId: string; playerId: string; tiles: any[]; context: 'general' | 'charleston' | 'defensive' }; // Will be Tile[] when imported
  'analysis-result': { playerId: string; analysis: any; context: string; timestamp: number }; // Will be HandAnalysis when imported
  'request-charleston-advice': { roomId: string; playerId: string; currentTiles: any[]; charlestonPhase: string }; // Will be Tile[], CharlestonPhase when imported
  'charleston-advice': { playerId: string; recommendations: { pass: any[]; keep: any[]; reasoning: string[] }; confidence: number }; // Will be Tile[] when imported
  'private-hand-update': any; // Will be PrivatePlayerState when imported
  'private-recommendations': any; // Will be HandAnalysis when imported
  
  // Game State Events
  'state-update': { roomId: string; update: any };
  'state-updated': { success: boolean; gameState?: any; error?: string }; // Will be GameState when imported
  'game-state-changed': { roomId: string; gameState: any; update: any }; // Will be GameState when imported
  'request-game-state': { roomId: string };
  'game-state': { success: boolean; gameState?: any; error?: string }; // Will be GameState when imported
  'game-state-recovery': { roomId: string };
  'game-state-recovery-response': { success: boolean; room?: any; playerStates?: any[]; gameState?: any; readinessSummary?: any; recoveredAt?: Date; error?: string };
  
  // Spectator Events
  'room-spectator-join': { roomId: string; spectatorName: string };
  'room-spectator-joined': { success: boolean; room?: any; isSpectator?: boolean; error?: string }; // Will be Room when imported
  'spectator-joined': { spectatorId: string; spectatorName: string };
  
  // Game End & Scoring Events
  'declare-mahjong': { roomId?: string; playerId: string; winningHand?: any[]; pattern?: any; hand?: any[] }; // Will be Tile[], HandPattern when imported
  'mahjong-declared': { playerId?: string; winner?: string; winningHand?: any[]; pattern?: string; isValid: boolean; validationDetails?: string; score?: number }; // Will be Tile[] when imported
  'game-ended': { winner?: any; endReason: 'mahjong' | 'wall_exhausted' | 'all_passed_out' | 'forfeit'; finalScores?: Array<{ playerId: string; playerName?: string; score: number; pattern?: string }>; gameStats?: { duration?: number; totalTurns?: number; charlestonPasses?: number }; scores?: any[]; timestamp?: Date }; // Will be Player when imported
  'multiplayer-game-ended': { roomId: string; endType: string; winner?: string; finalScores?: any[]; gameStats?: any; reason?: string; timestamp?: Date };
  'game-end-coordinated': { endType: string; winner?: string; finalScores?: any[]; gameStats?: any; reason?: string; timestamp?: Date };
  
  // Multiplayer Game End Coordination
  'request-final-hand': { requestingPlayerId: string; targetPlayerId: string; gameId: string };
  'final-hand-response': { playerId: string; hand: any[]; success: boolean; error?: string }; // Will be Tile[] when imported
  'provide-final-hand': { requestingPlayerId: string; gameId: string; responseId: string };
  'provide-final-hand-response': { hand: any[]; responseId: string }; // Will be Tile[] when imported
  'final-hand-provided': { playerId: string; hand: any[]; responseId: string }; // Will be Tile[] when imported
  'request-selected-patterns': { requestingPlayerId: string; targetPlayerId: string; gameId: string };
  'selected-patterns-response': { playerId: string; patterns: any[]; success: boolean; error?: string };
  'provide-selected-patterns': { requestingPlayerId: string; gameId: string; responseId: string };
  'provide-patterns-response': { patterns: any[]; responseId: string };
  'selected-patterns-provided': { playerId: string; patterns: any[]; responseId: string };
  
  // Error & Validation Events
  'invalid-action': { playerId?: string; attemptedAction?: any; reason: string; action?: any; validActions?: string[] }; // Will be PlayerAction, ActionType[] when imported
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
  validateGameAction: (action: any, gameState: any) => boolean; // Will be PlayerAction, Room when imported
  validateTileOperation: (tiles: any[], playerId: string) => boolean; // Will be Tile[] when imported
}

// Legacy SocketEvents interface for backward compatibility (deprecated)
export interface SocketEvents {
  // Connection events
  'join-room': { roomId: string; playerName: string };
  'leave-room': { roomId: string; playerId: string };
  'player-connected': any; // Will be Player when imported
  'player-disconnected': { playerId: string };
  
  // Game flow events
  'game-state-update': any; // Will be GameRoom when imported
  'player-action': any; // Will be PlayerAction when imported
  'turn-change': { newTurn: string; timeLimit: number }; // Will be PlayerPosition when imported
  'phase-change': { newPhase: string; data?: Record<string, unknown> }; // Will be GamePhase when imported
  
  // Tile events
  'tile-discarded': { tile: any; playerId: string }; // Will be Tile when imported
  'tile-called': { tile: any; callerId: string; callType: string }; // Will be Tile, ActionType when imported
  'tiles-updated': { playerId: string; count: number };
  
  // Charleston events
  'charleston-selection': { playerId: string; ready: boolean };
  'charleston-pass': { fromPlayer: string; toPlayer: string; tiles: any[] }; // Will be Tile[] when imported
  'charleston-complete': any; // Will be CharlestonState when imported
  
  // Private events
  'private-hand-update': any; // Will be PrivatePlayerState when imported
  'private-recommendations': any; // Will be HandAnalysis when imported
  
  // Error events
  'error': { message: string; code?: string };
  'invalid-action': { reason: string; action: any }; // Will be PlayerAction when imported
}