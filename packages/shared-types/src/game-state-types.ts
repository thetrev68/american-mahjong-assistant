// Game state types for in-progress American Mahjong games

// Re-export types that game state depends on
export type { PlayerPosition, ActionType, ExposedSet, DiscardedTile, CharlestonState, GameSettings } from './room-types';

// Game state interfaces
export interface PrivatePlayerState {
  playerId: string;
  tiles: any[];                // Private to this player only - will be Tile[] when tile-types imported
  recommendations: HandAnalysis;
  charlestonSelection: any[];  // Tiles selected for passing - will be Tile[] when tile-types imported
}

export interface PlayerGameState {
  handTileCount?: number;
  isReady?: boolean;
  selectedPatterns?: string[];
  selectedTiles?: any[];
  position?: number;
  score?: number;
  isDealer?: boolean;
  isActive?: boolean;
  passedOut?: boolean;
  passOutReason?: string;
}

export interface SharedState {
  discardPile: any[]; // Will be Tile[] when tile-types imported
  wallTilesRemaining: number;
  currentPlayer: string | null;
  currentWind?: 'east' | 'south' | 'west' | 'north';
  roundNumber?: number;
}

export interface GameState {
  roomId: string;
  phase: 'setup' | 'charleston' | 'playing' | 'scoring' | 'finished';
  currentRound: number;
  currentWind: 'east' | 'south' | 'west' | 'north';
  dealerPosition: number;
  playerStates: Record<string, PlayerGameState>;
  sharedState: SharedState;
  lastUpdated: Date;
}

// Hand analysis and strategy types
export interface HandPattern {
  id: string;
  name: string;           // "LIKE NUMBERS", "2025", etc.
  description: string;
  requiredTiles: any[];   // Will be Tile[] when tile-types imported
  optionalTiles: any[];   // Will be Tile[] when tile-types imported
  points: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  completion?: number;    // 0-1, how close to completing (optional for backward compatibility)
}

export interface HandAnalysis {
  bestPatterns: PatternMatch[];
  recommendations: {
    keep: any[];        // Will be Tile[] when tile-types imported
    discard: any[];     // Will be Tile[] when tile-types imported
    charleston: any[];  // Will be Tile[] when tile-types imported
    // Enhanced recommendation data (optional for backward compatibility)
    reasoning?: {
      keepReasons: string[];
      discardReasons: string[];
      charlestonReasons: string[];
    };
    priorityTiles?: {
      mostCritical: any[];  // Will be Tile[] when tile-types imported
      highValue: any[];     // Will be Tile[] when tile-types imported
      flexible: any[];      // Will be Tile[] when tile-types imported
      expendable: any[];    // Will be Tile[] when tile-types imported
    };
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
  missingTiles: any[];      // Will be Tile[] when tile-types imported
  blockedBy: any[];         // Will be Tile[] when tile-types imported - Tiles that prevent this pattern
  confidence: number;       // 0-1, algorithm confidence
}

export interface DefensiveAnalysis {
  dangerousTiles: any[];   // Will be Tile[] when tile-types imported - Tiles likely to help opponents
  safeTiles: any[];        // Will be Tile[] when tile-types imported - Tiles safe to discard
  opponentThreats: {
    playerId: string;
    suspectedPatterns: string[];
    dangerLevel: 'low' | 'medium' | 'high';
  }[];
}

// View and UI state types
export type ViewMode = 'shared' | 'private' | 'charleston';

export interface UIState {
  currentView: ViewMode;
  selectedTiles: any[];    // Will be Tile[] when tile-types imported
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

// API types
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
  tiles: any[];  // Will be Tile[] when tile-types imported
}

export interface MakeActionRequest {
  roomId: string;
  playerId: string;
  action: any;   // Will be PlayerAction when imported from room-types
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type EventCallback<T = unknown> = (data: T) => void;