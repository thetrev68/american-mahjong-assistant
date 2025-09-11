import type { Tile } from './game-types';
export interface Player {
    id: string;
    name: string;
    isHost: boolean;
    joinedAt?: Date;
}
export interface Room {
    id: string;
    hostId: string;
    players: Player[];
    phase: 'waiting' | 'setup' | 'charleston' | 'playing' | 'finished';
    maxPlayers: number;
    isPrivate: boolean;
    roomName?: string;
    gameMode?: string;
    allowSpectators?: boolean;
    createdAt: Date;
    lastActivity?: Date;
}
export interface RoomConfig {
    maxPlayers: number;
    isPrivate?: boolean;
    roomName?: string;
    gameMode?: 'nmjl-2025' | 'custom';
    allowSpectators?: boolean;
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
export interface SocketEvents {
    'create-room': (data: {
        hostName: string;
        config: RoomConfig;
    }) => void;
    'room-created': (data: {
        success: boolean;
        room?: Room;
        error?: string;
    }) => void;
    'join-room': (data: {
        roomId: string;
        playerName: string;
    }) => void;
    'room-joined': (data: {
        success: boolean;
        room?: Room;
        error?: string;
    }) => void;
    'leave-room': (data: {
        roomId: string;
    }) => void;
    'room-left': (data: {
        success: boolean;
        roomId: string;
    }) => void;
    'player-joined': (data: {
        player: Player;
        room: Room;
    }) => void;
    'player-left': (data: {
        playerId: string;
        roomId: string;
    }) => void;
    'room-deleted': (data: {
        roomId: string;
    }) => void;
    'room-update-settings': (data: {
        roomId: string;
        settings: any;
    }) => void;
    'room-settings-updated': (data: {
        success: boolean;
        error?: string;
    }) => void;
    'room-settings-changed': (data: {
        room: Room;
        settings: any;
    }) => void;
    'room-transfer-host': (data: {
        roomId: string;
        newHostId: string;
    }) => void;
    'room-host-transferred': (data: {
        success: boolean;
        error?: string;
    }) => void;
    'room-host-changed': (data: {
        room: Room;
        newHostId: string;
    }) => void;
    'room-kick-player': (data: {
        roomId: string;
        playerId: string;
    }) => void;
    'room-player-kicked': (data: {
        success: boolean;
        error?: string;
    }) => void;
    'room-kicked': (data: {
        roomId: string;
        kickedBy: string;
    }) => void;
    'room-reconnect': (data: {
        roomId: string;
        playerId: string;
        playerName: string;
    }) => void;
    'room-reconnect-response': (data: {
        success: boolean;
        room?: Room;
        playerStates?: any[];
        gameState?: GameState;
        error?: string;
    }) => void;
    'player-reconnected': (data: {
        playerId: string;
        playerName: string;
    }) => void;
    'phase-transition': (data: {
        roomId: string;
        fromPhase: string;
        toPhase: string;
    }) => void;
    'phase-transition-response': (data: {
        success: boolean;
        allReady?: boolean;
        readinessSummary?: any;
        error?: string;
    }) => void;
    'phase-changed': (data: {
        fromPhase: string;
        toPhase: string;
        triggeredBy: string;
    }) => void;
    'player-state-sync': (data: {
        roomId: string;
        phase: string;
        state: any;
    }) => void;
    'player-state-sync-response': (data: {
        success: boolean;
        error?: string;
    }) => void;
    'player-state-updated': (data: {
        playerId: string;
        phase: string;
        isReady?: boolean;
        isConnected: boolean;
    }) => void;
    'game-state-recovery': (data: {
        roomId: string;
    }) => void;
    'game-state-recovery-response': (data: {
        success: boolean;
        room?: Room;
        playerStates?: any[];
        gameState?: GameState;
        readinessSummary?: any;
        recoveredAt?: Date;
        error?: string;
    }) => void;
    'room-spectator-join': (data: {
        roomId: string;
        spectatorName: string;
    }) => void;
    'room-spectator-joined': (data: {
        success: boolean;
        room?: Room;
        isSpectator?: boolean;
        error?: string;
    }) => void;
    'spectator-joined': (data: {
        spectatorId: string;
        spectatorName: string;
    }) => void;
    'state-update': (data: {
        roomId: string;
        update: any;
    }) => void;
    'state-updated': (data: {
        success: boolean;
        gameState?: GameState;
        error?: string;
    }) => void;
    'game-state-changed': (data: {
        roomId: string;
        gameState: GameState;
        update: any;
    }) => void;
    'request-game-state': (data: {
        roomId: string;
    }) => void;
    'game-state': (data: {
        success: boolean;
        gameState?: GameState;
        error?: string;
    }) => void;
    'room-list-updated': (data: {
        rooms: Room[];
    }) => void;
    'charleston-player-ready': (data: {
        roomId: string;
        playerId: string;
        selectedTiles: any[];
        phase: string;
    }) => void;
    'charleston-player-ready-confirmed': (data: {
        success: boolean;
        playerId: string;
        phase: string;
    }) => void;
    'charleston-player-ready-update': (data: {
        playerId: string;
        isReady: boolean;
        phase: string;
    }) => void;
    'charleston-tile-exchange': (data: {
        roomId: string;
        phase: string;
        tilesReceived: any[];
        nextPhase: string;
    }) => void;
    'charleston-request-status': (data: {
        roomId: string;
    }) => void;
    'charleston-status': (data: {
        success: boolean;
        playerReadiness?: Record<string, boolean>;
        roomId?: string;
        error?: string;
    }) => void;
    'charleston-error': (data: {
        success: boolean;
        error: string;
    }) => void;
    'turn-start-game': (data: {
        roomId: string;
        firstPlayer: string;
        turnOrder: string[];
    }) => void;
    'turn-start-game-response': (data: {
        success: boolean;
        gameState?: any;
        error?: string;
    }) => void;
    'turn-advance': (data: {
        roomId: string;
        currentPlayerId: string;
        nextPlayerId: string;
        turnNumber: number;
    }) => void;
    'turn-advance-response': (data: {
        success: boolean;
        error?: string;
    }) => void;
    'turn-update': (data: {
        roomId: string;
        currentPlayer: string;
        turnNumber: number;
        roundNumber: number;
        currentWind: string;
    }) => void;
    'turn-request-status': (data: {
        roomId: string;
    }) => void;
    'turn-status': (data: {
        success: boolean;
        currentPlayer?: string;
        turnNumber?: number;
        roundNumber?: number;
        currentWind?: string;
        error?: string;
    }) => void;
    'turn-error': (data: {
        success: boolean;
        error: string;
    }) => void;
    'declare-mahjong': (data: {
        playerId: string;
        roomId: string;
        hand: any[];
        pattern: any;
    }) => void;
    'mahjong-declared': (data: {
        success: boolean;
        isValid: boolean;
        winner?: string;
        score?: number;
        validationDetails?: string;
        error?: string;
    }) => void;
    'game-ended': (data: {
        endReason: 'mahjong' | 'wall_exhausted' | 'all_passed_out' | 'forfeit';
        winner?: string;
        scores?: any[];
        gameStats?: any;
        timestamp?: Date;
    }) => void;
    'request-final-hand': (data: {
        requestingPlayerId: string;
        targetPlayerId: string;
        gameId: string;
    }) => void;
    'final-hand-response': (data: {
        playerId: string;
        hand: any[];
        success: boolean;
        error?: string;
    }) => void;
    'provide-final-hand': (data: {
        requestingPlayerId: string;
        gameId: string;
        responseId: string;
    }) => void;
    'provide-final-hand-response': (data: {
        hand: any[];
        responseId: string;
    }) => void;
    'final-hand-provided': (data: {
        playerId: string;
        hand: any[];
        responseId: string;
    }) => void;
    'request-selected-patterns': (data: {
        requestingPlayerId: string;
        targetPlayerId: string;
        gameId: string;
    }) => void;
    'selected-patterns-response': (data: {
        playerId: string;
        patterns: any[];
        success: boolean;
        error?: string;
    }) => void;
    'provide-selected-patterns': (data: {
        requestingPlayerId: string;
        gameId: string;
        responseId: string;
    }) => void;
    'provide-patterns-response': (data: {
        patterns: any[];
        responseId: string;
    }) => void;
    'selected-patterns-provided': (data: {
        playerId: string;
        patterns: any[];
        responseId: string;
    }) => void;
    'multiplayer-game-ended': (data: {
        roomId: string;
        endType: string;
        winner?: string;
        finalScores?: any[];
        gameStats?: any;
        reason?: string;
        timestamp?: Date;
    }) => void;
    'game-end-coordinated': (data: {
        endType: string;
        winner?: string;
        finalScores?: any[];
        gameStats?: any;
        reason?: string;
        timestamp?: Date;
    }) => void;
    'ping': (data: {
        timestamp: number;
    }) => void;
    'pong': (data: {
        timestamp: number;
    }) => void;
    'disconnect': (reason: string) => void;
}
//# sourceMappingURL=multiplayer-types.d.ts.map