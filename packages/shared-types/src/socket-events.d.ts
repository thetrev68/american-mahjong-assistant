import type { Player, Room, PlayerGameState } from './multiplayer-types';
import type { Tile, PlayerAction, CharlestonState, DiscardedTile, GameSettings, PlayerPosition, GamePhase, CharlestonPhase, ExposedSet, ActionType, HandAnalysis } from './game-types';
export interface SocketEventMap {
    'join-room': {
        roomId: string;
        playerName: string;
        reconnectToken?: string;
    };
    'player-joined': {
        player: Player;
        roomState: Room;
    };
    'leave-room': {
        roomId: string;
        playerId: string;
    };
    'player-left': {
        playerId: string;
        roomState: Room;
    };
    'connection-established': {
        playerId: string;
        roomId: string;
        reconnected: boolean;
    };
    'player-connection-changed': {
        playerId: string;
        isConnected: boolean;
        timestamp: number;
    };
    'create-room': {
        hostName: string;
        settings: Partial<GameSettings>;
    };
    'room-created': {
        success: boolean;
        room?: Room;
        error?: string;
    };
    'update-settings': {
        roomId: string;
        settings: Partial<GameSettings>;
    };
    'settings-updated': {
        settings: GameSettings;
        updatedBy: string;
    };
    'start-game': {
        roomId: string;
    };
    'game-started': {
        gameRoom: Room;
        dealerPosition: PlayerPosition;
        startTime: number;
    };
    'phase-change': {
        newPhase: GamePhase;
        previousPhase: GamePhase;
        phaseData?: {
            charleston?: CharlestonState;
            winner?: Player;
            finalScores?: {
                playerId: string;
                score: number;
            }[];
        };
        timestamp: number;
    };
    'turn-change': {
        currentTurn: PlayerPosition;
        previousTurn: PlayerPosition;
        turnStartTime: number;
        timeLimit: number;
        actionRequired: ActionType[];
    };
    'player-action': {
        roomId: string;
        action: PlayerAction;
    };
    'action-processed': {
        action: PlayerAction;
        success: boolean;
        gameState: Room;
        affectedPlayers?: string[];
    };
    'turn-timer-warning': {
        playerId: string;
        timeRemaining: number;
        urgencyLevel: 'low' | 'medium' | 'high';
    };
    'turn-timeout': {
        playerId: string;
        autoAction?: PlayerAction;
        newGameState: Room;
    };
    'update-tiles': {
        roomId: string;
        playerId: string;
        tiles: Tile[];
        requestAnalysis?: boolean;
    };
    'private-tiles-updated': {
        playerState: PlayerGameState;
        analysis?: HandAnalysis;
    };
    'tile-discarded': {
        tile: Tile;
        discardedBy: PlayerPosition;
        discardPile: DiscardedTile[];
        callableBy: PlayerPosition[];
        timeLimit: number;
    };
    'call-tile': {
        roomId: string;
        playerId: string;
        tileId: string;
        callType: 'pung' | 'kong' | 'exposure';
        exposedTiles: Tile[];
    };
    'tile-called': {
        callerId: string;
        callerPosition: PlayerPosition;
        discarderId: string;
        tile: Tile;
        callType: string;
        exposedSet: ExposedSet;
        newTurn: PlayerPosition;
        gameState: Room;
    };
    'pass-on-tile': {
        roomId: string;
        playerId: string;
        tileId: string;
    };
    'all-passed': {
        tileId: string;
        nextTurn: PlayerPosition;
        gameState: Room;
    };
    'charleston-started': {
        charlestonState: CharlestonState;
        phase: CharlestonPhase;
        timeLimit: number;
    };
    'charleston-selection': {
        roomId: string;
        playerId: string;
        selectedTiles: Tile[];
        isReady: boolean;
    };
    'charleston-selection-status': {
        playerId: string;
        isReady: boolean;
        readyPlayers: PlayerPosition[];
        allReady: boolean;
    };
    'charleston-pass': {
        roomId: string;
        playerId: string;
        tilesToPass: Tile[];
    };
    'charleston-tiles-received': {
        playerId: string;
        tilesReceived: Tile[];
        fromPlayer: PlayerPosition;
        phase: CharlestonPhase;
    };
    'charleston-phase-complete': {
        completedPhase: CharlestonPhase;
        nextPhase?: CharlestonPhase;
        charlestonState: CharlestonState;
    };
    'charleston-complete': {
        finalState: CharlestonState;
        gamePhase: 'playing';
        firstTurn: PlayerPosition;
    };
    'request-analysis': {
        roomId: string;
        playerId: string;
        tiles: Tile[];
        context: 'general' | 'charleston' | 'defensive';
    };
    'analysis-result': {
        playerId: string;
        analysis: HandAnalysis;
        context: string;
        timestamp: number;
    };
    'request-charleston-advice': {
        roomId: string;
        playerId: string;
        currentTiles: Tile[];
        charlestonPhase: CharlestonPhase;
    };
    'charleston-advice': {
        playerId: string;
        recommendations: {
            pass: Tile[];
            keep: Tile[];
            reasoning: string[];
        };
        confidence: number;
    };
    'declare-mahjong': {
        roomId: string;
        playerId: string;
        winningHand: Tile[];
        pattern: string;
    };
    'mahjong-declared': {
        playerId: string;
        winningHand: Tile[];
        pattern: string;
        isValid: boolean;
        validationDetails?: string;
    };
    'game-ended': {
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
    };
    'invalid-action': {
        playerId: string;
        attemptedAction: PlayerAction;
        reason: string;
        validActions: ActionType[];
    };
    'error': {
        type: 'connection' | 'validation' | 'game' | 'server';
        message: string;
        code?: string;
        details?: unknown;
        recoverable: boolean;
    };
    'warning': {
        type: 'timing' | 'connection' | 'action';
        message: string;
        autoResolve?: boolean;
        timeoutMs?: number;
    };
    'heartbeat': {
        timestamp: number;
        playerId?: string;
        roomId?: string;
    };
    'connection-quality': {
        playerId: string;
        latency: number;
        quality: 'excellent' | 'good' | 'poor' | 'disconnected';
        packetsLost: number;
    };
}
export type SocketEventHandler<T extends keyof SocketEventMap> = (data: SocketEventMap[T]) => void;
export interface SocketEmitter {
    to(playerId: string): {
        emit<T extends keyof SocketEventMap>(event: T, data: SocketEventMap[T]): void;
    };
    toRoom(roomId: string): {
        emit<T extends keyof SocketEventMap>(event: T, data: SocketEventMap[T]): void;
    };
    broadcast: {
        emit<T extends keyof SocketEventMap>(event: T, data: SocketEventMap[T]): void;
    };
}
export declare const RATE_LIMITED_EVENTS: readonly ["update-tiles", "request-analysis", "charleston-selection", "heartbeat"];
export declare const IMMEDIATE_RESPONSE_EVENTS: readonly ["join-room", "player-action", "call-tile", "declare-mahjong"];
export interface AuthMiddleware {
    validatePlayer: (playerId: string, roomId: string) => boolean;
    validateHost: (playerId: string, roomId: string) => boolean;
}
export interface RateLimitMiddleware {
    checkLimit: (playerId: string, eventType: string) => boolean;
    updateLimit: (playerId: string, eventType: string) => void;
}
export interface ValidationMiddleware {
    validateGameAction: (action: PlayerAction, gameState: Room) => boolean;
    validateTileOperation: (tiles: Tile[], playerId: string) => boolean;
}
//# sourceMappingURL=socket-events.d.ts.map