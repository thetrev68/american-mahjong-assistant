import type { Tile } from './tile-types';
export type PlayerPosition = 'east' | 'south' | 'west' | 'north';
export type RoomPhase = 'waiting' | 'setup' | 'charleston' | 'playing' | 'finished';
export type GamePhase = 'waiting' | 'lobby' | 'tile-input' | 'charleston' | 'playing' | 'finished';
export interface Player {
    id: string;
    name: string;
    position?: PlayerPosition | null;
    isHost: boolean;
    isConnected: boolean;
    isReady: boolean;
    joinedAt?: Date;
    tilesInHand?: number;
    exposedSets?: ExposedSet[];
    hasCalledMahjong?: boolean;
    lastAction?: PlayerAction;
    score?: number;
    isDealer?: boolean;
    isActive?: boolean;
    passedOut?: boolean;
    passOutReason?: string;
}
export interface Room {
    id: string;
    hostId: string;
    players: Player[];
    phase: RoomPhase;
    maxPlayers: number;
    isPrivate: boolean;
    roomName?: string;
    gameMode?: string;
    allowSpectators?: boolean;
    createdAt: Date;
    lastActivity?: Date;
    currentTurn?: PlayerPosition;
    turnStartTime?: number;
    turnTimeLimit?: number;
    discardPile?: DiscardedTile[];
    wall?: {
        tilesRemaining: number;
        totalDiscarded: number;
    };
    charleston?: CharlestonState;
    gameStartTime?: number;
    settings?: GameSettings;
    spectators?: Player[];
}
export interface RoomConfig {
    maxPlayers: number;
    isPrivate?: boolean;
    roomName?: string;
    gameMode?: 'nmjl-2025' | 'custom';
    allowSpectators?: boolean;
}
export interface ExposedSet {
    tiles: Tile[];
    type: 'pung' | 'kong' | 'exposure' | 'pair';
    calledFrom?: PlayerPosition;
    timestamp: number;
}
export interface DiscardedTile {
    tile: Tile;
    discardedBy: PlayerPosition;
    timestamp: number;
    canBeCalled: boolean;
    wasCalledBy?: PlayerPosition;
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
export type CharlestonPhase = 'right' | 'across' | 'left' | 'optional' | 'complete';
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
export declare const PLAYER_POSITIONS: PlayerPosition[];
export declare const DEFAULT_GAME_SETTINGS: GameSettings;
//# sourceMappingURL=room-types.d.ts.map