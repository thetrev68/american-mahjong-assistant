// Tile system types for American Mahjong

export type TileSuit = 'dots' | 'bams' | 'cracks' | 'winds' | 'dragons' | 'flowers' | 'jokers';

export type TileValue = 
  | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'  // Numbers for dots/bams/cracks
  | 'east' | 'south' | 'west' | 'north'                 // Winds
  | 'red' | 'green' | 'white'                           // Dragons  
  | 'f1' | 'f2' | 'f3' | 'f4'                          // Flowers
  | 'joker';                                            // Joker

export interface Tile {
  id: string;           // Unique identifier (e.g., "1D", "east", "joker")
  suit: TileSuit;
  value: TileValue;
  isJoker?: boolean;    // True if being used as joker
  jokerFor?: Tile;      // What this joker represents
}

export interface TileSprite {
  filename: string;     // From tiles.json
  x: number;           // Sprite coordinates
  y: number;
  width: number;
  height: number;
}

// Tile count constants
export const TILE_COUNTS = {
  numbers: 4,      // 4 of each numbered tile (1-9 in each suit)
  winds: 4,        // 4 of each wind
  dragons: 4,      // 4 of each dragon
  flowers: 1,      // 1 of each flower
  jokers: 8        // 8 jokers total
} as const;

export const TILE_SUITS: TileSuit[] = ['dots', 'bams', 'cracks', 'winds', 'dragons', 'flowers', 'jokers'] as const;

// Utility types
export type TileId = string; // "1D", "east", "joker", etc.