import type { Tile, TileSuit, PlayerPosition } from 'shared-types';
export declare const getTargetTileCount: (_position: PlayerPosition) => number;
export declare const validatePositionTileCount: (_position: PlayerPosition, count: number) => boolean;
export declare const createAllTiles: () => Tile[];
export declare const groupTilesBySuit: (tiles: Tile[]) => Record<TileSuit, Tile[]>;
export declare const countTiles: (tiles: Tile[]) => Record<string, number>;
export declare const canSelectTile: (tile: Tile, currentTiles: Tile[], maxCount?: number) => boolean;
export declare const addTile: (tiles: Tile[], newTile: Tile) => Tile[];
export declare const removeTile: (tiles: Tile[], tileToRemove: Tile) => Tile[];
export declare const getSuitDisplayName: (suit: TileSuit) => string;
export declare const validateTileCollection: (tiles: Tile[], playerPosition?: PlayerPosition) => {
    isValid: boolean;
    errors: string[];
    warnings?: string[];
};
export declare const getMaxTilesForPosition: (position?: PlayerPosition) => number;
export declare const sortTiles: (tiles: Tile[]) => Tile[];
//# sourceMappingURL=tile-utils.d.ts.map