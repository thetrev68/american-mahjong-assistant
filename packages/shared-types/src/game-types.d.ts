export type TileSuit = 'dots' | 'bams' | 'cracks' | 'winds' | 'dragons' | 'flowers' | 'jokers';
export type TileValue = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'east' | 'south' | 'west' | 'north' | 'red' | 'green' | 'white' | 'f1' | 'f2' | 'f3' | 'f4' | 'joker';
export interface Tile {
    id: string;
    suit: TileSuit;
    value: TileValue;
    isJoker?: boolean;
    jokerFor?: Tile;
}
export interface TileSprite {
    filename: string;
    x: number;
    y: number;
    width: number;
    height: number;
}
export type PlayerPosition = 'east' | 'south' | 'west' | 'north';
export type GamePhase = 'waiting' | 'charleston' | 'playing' | 'finished';
export type CharlestonPhase = 'right' | 'across' | 'left' | 'optional' | 'complete';
export interface Player {
    id: string;
    name: string;
    position: PlayerPosition;
    isHost: boolean;
    isConnected: boolean;
    isReady: boolean;
    tilesInHand: number;
    exposedSets: ExposedSet[];
    hasCalledMahjong: boolean;
    lastAction?: PlayerAction;
}
export interface PrivatePlayerState {
    playerId: string;
    tiles: Tile[];
    recommendations: HandAnalysis;
    charlestonSelection: Tile[];
}
export type ActionType = 'discard' | 'call_pung' | 'call_kong' | 'call_exposure' | 'call_mahjong' | 'pass' | 'charleston_pass';
export interface PlayerAction {
    playerId: string;
    type: ActionType;
    timestamp: number;
    tile?: Tile;
    tiles?: Tile[];
    targetPlayerId?: string;
}
export interface ExposedSet {
    tiles: Tile[];
    type: 'pung' | 'kong' | 'exposure' | 'pair';
    calledFrom?: PlayerPosition;
    timestamp: number;
}
export interface GameRoom {
    id: string;
    hostId: string;
    players: Player[];
    phase: GamePhase;
    currentTurn: PlayerPosition;
    turnStartTime: number;
    turnTimeLimit: number;
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
    charlestonTimeLimit: number;
    turnTimeLimit: number;
    enableJokers: boolean;
    enableFlowers: boolean;
    cardYear: number;
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
export interface SocketEvents {
    'join-room': {
        roomId: string;
        playerName: string;
    };
    'leave-room': {
        roomId: string;
        playerId: string;
    };
    'player-connected': Player;
    'player-disconnected': {
        playerId: string;
    };
    'game-state-update': GameRoom;
    'player-action': PlayerAction;
    'turn-change': {
        newTurn: PlayerPosition;
        timeLimit: number;
    };
    'phase-change': {
        newPhase: GamePhase;
        data?: Record<string, unknown>;
    };
    'tile-discarded': {
        tile: Tile;
        playerId: string;
    };
    'tile-called': {
        tile: Tile;
        callerId: string;
        callType: ActionType;
    };
    'tiles-updated': {
        playerId: string;
        count: number;
    };
    'charleston-selection': {
        playerId: string;
        ready: boolean;
    };
    'charleston-pass': {
        fromPlayer: string;
        toPlayer: string;
        tiles: Tile[];
    };
    'charleston-complete': CharlestonState;
    'private-hand-update': PrivatePlayerState;
    'private-recommendations': HandAnalysis;
    'error': {
        message: string;
        code?: string;
    };
    'invalid-action': {
        reason: string;
        action: PlayerAction;
    };
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
export type TileId = string;
export declare const TILE_COUNTS: {
    readonly numbers: 4;
    readonly winds: 4;
    readonly dragons: 4;
    readonly flowers: 1;
    readonly jokers: 8;
};
export declare const DEFAULT_GAME_SETTINGS: GameSettings;
export declare const PLAYER_POSITIONS: PlayerPosition[];
export declare const TILE_SUITS: TileSuit[];
//# sourceMappingURL=game-types.d.ts.map