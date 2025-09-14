// Game state types for in-progress American Mahjong games

// Import types that game state depends on
import type { GameSettings, PlayerAction } from './room-types';
import type { Tile } from './tile-types';

// Re-export types that game state depends on  
export type { PlayerPosition, ActionType, ExposedSet, DiscardedTile, CharlestonState } from './room-types';

// Game state interfaces
export interface PrivatePlayerState {
  playerId: string;
  tiles: Tile[];                // Private to this player only
  recommendations: HandAnalysis;
  charlestonSelection: Tile[];  // Tiles selected for passing
}

export interface PlayerGameState {
  handTileCount?: number;
  isReady?: boolean;
  selectedPatterns?: string[];
  selectedTiles?: Tile[];
  position?: number;
  score?: number;
  isDealer?: boolean;
  isActive?: boolean;
  passedOut?: boolean;
  passOutReason?: string;
}

export interface SharedState {
  discardPile: Tile[];
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
  requiredTiles: Tile[];
  optionalTiles: Tile[];
  points: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  completion?: number;    // 0-1, how close to completing (optional for backward compatibility)
}

export interface HandAnalysis {
  bestPatterns: PatternMatch[];
  recommendations: {
    keep: Tile[];
    discard: Tile[];
    charleston: Tile[];
    // Enhanced recommendation data (optional for backward compatibility)
    reasoning?: {
      keepReasons: string[];
      discardReasons: string[];
      charlestonReasons: string[];
    };
    priorityTiles?: {
      mostCritical: Tile[];
      highValue: Tile[];
      flexible: Tile[];
      expendable: Tile[];
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
  missingTiles: Tile[];
  blockedBy: Tile[];         // Tiles that prevent this pattern
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

// View and UI state types
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
  tiles: Tile[];
}

export interface MakeActionRequest {
  roomId: string;
  playerId: string;
  action: PlayerAction;
}

// Utility types
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

