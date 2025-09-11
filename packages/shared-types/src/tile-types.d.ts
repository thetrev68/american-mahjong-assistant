export type TileSuit = 'dots' | 'bams' | 'cracks' | 'winds' | 'dragons' | 'flowers' | 'jokers';
export type TileValue = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'east' | 'south' | 'west' | 'north' | 'red' | 'green' | 'white' | 'f1' | 'f2' | 'f3' | 'f4' | 'joker';
export interface Tile {
    id: string;
    suit: TileSuit;
    value: TileValue;
    displayName: string;
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
export declare const TILE_COUNTS: {
    readonly numbers: 4;
    readonly winds: 4;
    readonly dragons: 4;
    readonly flowers: 1;
    readonly jokers: 8;
};
export declare const TILE_SUITS: TileSuit[];
export type TileId = string;
//# sourceMappingURL=tile-types.d.ts.map