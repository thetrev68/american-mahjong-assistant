import type { GameSettings, PlayerAction } from './room-types';
import type { Tile } from './tile-types';
export type { PlayerPosition, ActionType, ExposedSet, DiscardedTile, CharlestonState, GameSettings } from './room-types';
export interface PrivatePlayerState {
    playerId: string;
    tiles: Tile[];
    recommendations: HandAnalysis;
    charlestonSelection: Tile[];
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
export interface HandPattern {
    id: string;
    name: string;
    description: string;
    requiredTiles: Tile[];
    optionalTiles: Tile[];
    points: number;
    difficulty: 'easy' | 'medium' | 'hard' | 'expert';
    completion?: number;
}
export interface HandAnalysis {
    bestPatterns: PatternMatch[];
    recommendations: {
        keep: Tile[];
        discard: Tile[];
        charleston: Tile[];
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
        completion: number;
        turnsEstimate: number;
    };
    threats: DefensiveAnalysis;
}
export interface PatternMatch {
    pattern: HandPattern;
    completion: number;
    missingTiles: Tile[];
    blockedBy: Tile[];
    confidence: number;
}
export interface DefensiveAnalysis {
    dangerousTiles: Tile[];
    safeTiles: Tile[];
    opponentThreats: {
        playerId: string;
        suspectedPatterns: string[];
        dangerLevel: 'low' | 'medium' | 'high';
    }[];
}
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
    duration?: number;
    actions?: NotificationAction[];
}
export interface NotificationAction {
    label: string;
    action: () => void;
    style?: 'primary' | 'secondary' | 'danger';
}
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
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type EventCallback<T = unknown> = (data: T) => void;
//# sourceMappingURL=game-state-types.d.ts.map