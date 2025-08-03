// frontend/src/types/socket-events.ts
// Socket Event Schema & Communication Protocol
// This defines the exact event names and data structures for real-time communication

import { 
  GameRoom, Player, PlayerAction, Tile, PrivatePlayerState, 
  HandAnalysis, CharlestonState, DiscardedTile, GameSettings 
} from '../types';

/*
========================================
CONNECTION & ROOM MANAGEMENT EVENTS
========================================
*/

// Client -> Server: Join a game room
interface JoinRoomEvent {
  roomId: string;
  playerName: string;
  reconnectToken?: string; // For reconnection after disconnect
}

// Server -> All Clients: Player successfully joined
interface PlayerJoinedEvent {
  player: Player;
  roomState: GameRoom;
}

// Client -> Server: Leave room
interface LeaveRoomEvent {
  roomId: string;
  playerId: string;
}

// Server -> All Clients: Player left
interface PlayerLeftEvent {
  playerId: string;
  roomState: GameRoom;
}

// Server -> Client: Connection established
interface ConnectionEstablishedEvent {
  playerId: string;
  roomId: string;
  reconnected: boolean;
}

// Server -> All Clients: Player connection status changed
interface PlayerConnectionEvent {
  playerId: string;
  isConnected: boolean;
  timestamp: number;
}

/*
========================================
GAME SETUP & FLOW EVENTS
========================================
*/

// Client -> Server: Create new room (host only)
interface CreateRoomEvent {
  hostName: string;
  settings: Partial<GameSettings>;
}

// Server -> Client: Room created successfully
interface RoomCreatedEvent {
  roomId: string;
  hostPlayer: Player;
  settings: GameSettings;
}

// Client -> Server: Update game settings (host only)
interface UpdateSettingsEvent {
  roomId: string;
  settings: Partial<GameSettings>;
}

// Server -> All Clients: Settings updated
interface SettingsUpdatedEvent {
  settings: GameSettings;
  updatedBy: string;
}

// Client -> Server: Start game (host only)
interface StartGameEvent {
  roomId: string;
}

// Server -> All Clients: Game started
interface GameStartedEvent {
  gameRoom: GameRoom;
  dealerPosition: PlayerPosition;
  startTime: number;
}

// Server -> All Clients: Game phase changed
interface PhaseChangeEvent {
  newPhase: GamePhase;
  previousPhase: GamePhase;
  phaseData?: {
    charleston?: CharlestonState;
    winner?: Player;
    finalScores?: { playerId: string; score: number }[];
  };
  timestamp: number;
}

/*
========================================
TURN & ACTION EVENTS
========================================
*/

// Server -> All Clients: Turn changed
interface TurnChangeEvent {
  currentTurn: PlayerPosition;
  previousTurn: PlayerPosition;
  turnStartTime: number;
  timeLimit: number;
  actionRequired: ActionType[];
}

// Client -> Server: Player makes an action
interface PlayerActionEvent {
  roomId: string;
  action: PlayerAction;
}

// Server -> All Clients: Action was processed
interface ActionProcessedEvent {
  action: PlayerAction;
  success: boolean;
  gameState: GameRoom;
  affectedPlayers?: string[]; // Players whose state changed
}

// Server -> All Clients: Turn timer warning
interface TurnTimerWarningEvent {
  playerId: string;
  timeRemaining: number;
  urgencyLevel: 'low' | 'medium' | 'high';
}

// Server -> All Clients: Turn timed out
interface TurnTimeoutEvent {
  playerId: string;
  autoAction?: PlayerAction; // Action taken automatically
  newGameState: GameRoom;
}

/*
========================================
TILE & DISCARD EVENTS
========================================
*/

// Client -> Server: Update private tile collection
interface UpdateTilesEvent {
  roomId: string;
  playerId: string;
  tiles: Tile[];
  requestAnalysis?: boolean;
}

// Server -> Specific Client: Private tiles updated
interface PrivateTimesUpdatedEvent {
  playerState: PrivatePlayerState;
  analysis?: HandAnalysis;
}

// Server -> All Clients: Tile discarded
interface TileDiscardedEvent {
  tile: Tile;
  discardedBy: PlayerPosition;
  discardPile: DiscardedTile[];
  callableBy: PlayerPosition[]; // Who can call this tile
  timeLimit: number; // Time to make call decision
}

// Client -> Server: Call discarded tile
interface CallTileEvent {
  roomId: string;
  playerId: string;
  tileId: string;
  callType: 'pung' | 'kong' | 'exposure';
  exposedTiles: Tile[]; // What player is exposing
}

// Server -> All Clients: Tile was called
interface TileCalledEvent {
  callerId: string;
  callerPosition: PlayerPosition;
  discarderId: string;
  tile: Tile;
  callType: string;
  exposedSet: ExposedSet;
  newTurn: PlayerPosition;
  gameState: GameRoom;
}

// Client -> Server: Pass on calling tile
interface PassOnTileEvent {
  roomId: string;
  playerId: string;
  tileId: string;
}

// Server -> All Clients: All players passed, continue play
interface AllPassedEvent {
  tileId: string;
  nextTurn: PlayerPosition;
  gameState: GameRoom;
}

/*
========================================
CHARLESTON EVENTS
========================================
*/

// Server -> All Clients: Charleston phase started
interface CharlestonStartedEvent {
  charlestonState: CharlestonState;
  phase: CharlestonPhase;
  timeLimit: number;
}

// Client -> Server: Select tiles for charleston pass
interface CharlestonSelectionEvent {
  roomId: string;
  playerId: string;
  selectedTiles: Tile[];
  isReady: boolean;
}

// Server -> All Clients: Player charleston selection status
interface CharlestonSelectionStatusEvent {
  playerId: string;
  isReady: boolean;
  readyPlayers: PlayerPosition[];
  allReady: boolean;
}

// Client -> Server: Confirm charleston pass
interface CharlestonPassEvent {
  roomId: string;
  playerId: string;
  tilesToPass: Tile[];
}

// Server -> Specific Clients: Charleston tiles received
interface CharlestonTilesReceivedEvent {
  playerId: string;
  tilesReceived: Tile[];
  fromPlayer: PlayerPosition;
  phase: CharlestonPhase;
}

// Server -> All Clients: Charleston phase completed
interface CharlestonPhaseCompleteEvent {
  completedPhase: CharlestonPhase;
  nextPhase?: CharlestonPhase;
  charlestonState: CharlestonState;
}

// Server -> All Clients: Charleston entirely finished
interface CharlestonCompleteEvent {
  finalState: CharlestonState;
  gamePhase: 'playing';
  firstTurn: PlayerPosition;
}

/*
========================================
ANALYSIS & RECOMMENDATION EVENTS
========================================
*/

// Client -> Server: Request hand analysis
interface RequestAnalysisEvent {
  roomId: string;
  playerId: string;
  tiles: Tile[];
  context: 'general' | 'charleston' | 'defensive';
}

// Server -> Specific Client: Analysis results
interface AnalysisResultEvent {
  playerId: string;
  analysis: HandAnalysis;
  context: string;
  timestamp: number;
}

// Client -> Server: Request charleston recommendations
interface RequestCharlestonAdviceEvent {
  roomId: string;
  playerId: string;
  currentTiles: Tile[];
  charlestonPhase: CharlestonPhase;
}

// Server -> Specific Client: Charleston advice
interface CharlestonAdviceEvent {
  playerId: string;
  recommendations: {
    pass: Tile[];
    keep: Tile[];
    reasoning: string[];
  };
  confidence: number;
}

/*
========================================
GAME END & SCORING EVENTS
========================================
*/

// Client -> Server: Declare mahjong
interface DeclareMahjongEvent {
  roomId: string;
  playerId: string;
  winningHand: Tile[];
  pattern: string;
}

// Server -> All Clients: Mahjong declared (validation pending)
interface MahjongDeclaredEvent {
  playerId: string;
  winningHand: Tile[];
  pattern: string;
  isValid: boolean;
  validationDetails?: string;
}

// Server -> All Clients: Game ended
interface GameEndedEvent {
  winner?: Player;
  finalScores: Array<{
    playerId: string;
    playerName: string;
    score: number;
    pattern?: string;
  }>;
  gameStats: {
    duration: number;
    totalTurns: number;
    charlestonPasses: number;
  };
  endReason: 'mahjong' | 'wall_exhausted' | 'forfeit';
}

/*
========================================
ERROR & VALIDATION EVENTS
========================================
*/

// Server -> Client: Invalid action attempted
interface InvalidActionEvent {
  playerId: string;
  attemptedAction: PlayerAction;
  reason: string;
  validActions: ActionType[];
}

// Server -> Client: General error
interface ErrorEvent {
  type: 'connection' | 'validation' | 'game' | 'server';
  message: string;
  code?: string;
  details?: any;
  recoverable: boolean;
}

// Server -> Client: Warning (non-critical)
interface WarningEvent {
  type: 'timing' | 'connection' | 'action';
  message: string;
  autoResolve?: boolean;
  timeoutMs?: number;
}

/*
========================================
HEARTBEAT & CONNECTION MONITORING
========================================
*/

// Bidirectional: Connection heartbeat
interface HeartbeatEvent {
  timestamp: number;
  playerId?: string;
  roomId?: string;
}

// Server -> Client: Connection quality info
interface ConnectionQualityEvent {
  playerId: string;
  latency: number;
  quality: 'excellent' | 'good' | 'poor' | 'disconnected';
  packetsLost: number;
}

/*
========================================
COMPREHENSIVE EVENT MAP
========================================
*/

export interface SocketEventMap {
  // Connection & Room Management
  'join-room': JoinRoomEvent;
  'player-joined': PlayerJoinedEvent;
  'leave-room': LeaveRoomEvent;
  'player-left': PlayerLeftEvent;
  'connection-established': ConnectionEstablishedEvent;
  'player-connection-changed': PlayerConnectionEvent;
  
  // Game Setup & Flow
  'create-room': CreateRoomEvent;
  'room-created': RoomCreatedEvent;
  'update-settings': UpdateSettingsEvent;
  'settings-updated': SettingsUpdatedEvent;
  'start-game': StartGameEvent;
  'game-started': GameStartedEvent;
  'phase-change': PhaseChangeEvent;
  
  // Turn & Actions
  'turn-change': TurnChangeEvent;
  'player-action': PlayerActionEvent;
  'action-processed': ActionProcessedEvent;
  'turn-timer-warning': TurnTimerWarningEvent;
  'turn-timeout': TurnTimeoutEvent;
  
  // Tiles & Discards
  'update-tiles': UpdateTilesEvent;
  'private-tiles-updated': PrivateTimesUpdatedEvent;
  'tile-discarded': TileDiscardedEvent;
  'call-tile': CallTileEvent;
  'tile-called': TileCalledEvent;
  'pass-on-tile': PassOnTileEvent;
  'all-passed': AllPassedEvent;
  
  // Charleston
  'charleston-started': CharlestonStartedEvent;
  'charleston-selection': CharlestonSelectionEvent;
  'charleston-selection-status': CharlestonSelectionStatusEvent;
  'charleston-pass': CharlestonPassEvent;
  'charleston-tiles-received': CharlestonTilesReceivedEvent;
  'charleston-phase-complete': CharlestonPhaseCompleteEvent;
  'charleston-complete': CharlestonCompleteEvent;
  
  // Analysis & Recommendations
  'request-analysis': RequestAnalysisEvent;
  'analysis-result': AnalysisResultEvent;
  'request-charleston-advice': RequestCharlestonAdviceEvent;
  'charleston-advice': CharlestonAdviceEvent;
  
  // Game End & Scoring
  'declare-mahjong': DeclareMahjongEvent;
  'mahjong-declared': MahjongDeclaredEvent;
  'game-ended': GameEndedEvent;
  
  // Error & Validation
  'invalid-action': InvalidActionEvent;
  'error': ErrorEvent;
  'warning': WarningEvent;
  
  // Heartbeat & Monitoring
  'heartbeat': HeartbeatEvent;
  'connection-quality': ConnectionQualityEvent;
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
const RATE_LIMITED_EVENTS = [
  'update-tiles',          // Max 1/second per player
  'request-analysis',      // Max 1/2 seconds per player  
  'charleston-selection',  // Max 1/500ms per player
  'heartbeat'             // Max 1/second per connection
] as const;

// Events that trigger immediate responses:
const IMMEDIATE_RESPONSE_EVENTS = [
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
interface AuthMiddleware {
  validatePlayer: (playerId: string, roomId: string) => boolean;
  validateHost: (playerId: string, roomId: string) => boolean;
}

// Rate limiting middleware  
interface RateLimitMiddleware {
  checkLimit: (playerId: string, eventType: string) => boolean;
  updateLimit: (playerId: string, eventType: string) => void;
}

// Validation middleware
interface ValidationMiddleware {
  validateGameAction: (action: PlayerAction, gameState: GameRoom) => boolean;
  validateTileOperation: (tiles: Tile[], playerId: string) => boolean;
}