// Export all types from the shared-types package
// Organized by domain to prevent conflicts

// Core tile and game concepts
export * from './tile-types';

// NMJL-specific types (patterns, etc.)
export * from './nmjl-types';

// Room and player management - authoritative source
export type { 
  Player,
  Room,
  RoomConfig,
  PlayerPosition,
  RoomPhase,
  GamePhase,
  GameSettings,
  DEFAULT_GAME_SETTINGS,
  PLAYER_POSITIONS
} from './room-types';

// Game state and gameplay - authoritative source
export type {
  GameState,
  PlayerGameState,
  PrivatePlayerState,
  UIState,
  ViewMode,
  SharedState,
  HandAnalysis,
  HandPattern,
  PatternMatch,
  DefensiveAnalysis,
  Notification,
  NotificationAction
} from './game-state-types';

// Socket communication - authoritative source
export type {
  SocketEvents,
  SocketEventMap,
  SocketEventHandler
} from './socket-event-types';

// API types - from game-state-types.ts
export type {
  CreateRoomRequest,
  JoinRoomRequest,
  MakeActionRequest,
  UpdateTilesRequest,
  ApiResponse
} from './game-state-types';

// Game action and Charleston types
export type {
  PlayerAction,
  ActionType,
  ExposedSet,
  DiscardedTile,
  CharlestonState,
  CharlestonPhase
} from './room-types';