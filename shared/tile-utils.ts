// frontend/src/utils/tile-utils.ts
import type { TileValue } from '../game-types';

// Define tile-related types here
export type TileSuit = 'dots' | 'bams' | 'cracks' | 'winds' | 'dragons' | 'flowers' | 'jokers';

export type Tile = {
  id: string;
  suit: TileSuit;
  value: TileValue;
  isJoker?: boolean;
};

export type PlayerPosition = 'east' | 'south' | 'west' | 'north';

// Mock these functions for now since dealer-logic doesn't exist
export const getTargetTileCount = (_position: PlayerPosition): number => 14;
export const validatePositionTileCount = (_position: PlayerPosition, count: number): boolean => count === 14;

// Create all available tiles for selection
export const createAllTiles = (): Tile[] => {
  const tiles: Tile[] = [];

  // Dots (1D-9D)
  for (let i = 1; i <= 9; i++) {
    tiles.push({
      id: `${i}D`,
      suit: 'dots',
      value: i.toString() as TileValue
    });
  }

  // Bams (1B-9B)
  for (let i = 1; i <= 9; i++) {
    tiles.push({
      id: `${i}B`,
      suit: 'bams',
      value: i.toString() as TileValue
    });
  }

  // Cracks (1C-9C)
  for (let i = 1; i <= 9; i++) {
    tiles.push({
      id: `${i}C`,
      suit: 'cracks',
      value: i.toString() as TileValue
    });
  }

  // Winds
  tiles.push(
    { id: 'east', suit: 'winds', value: 'east' },
    { id: 'south', suit: 'winds', value: 'south' },
    { id: 'west', suit: 'winds', value: 'west' },
    { id: 'north', suit: 'winds', value: 'north' }
  );

  // Dragons
  tiles.push(
    { id: 'red', suit: 'dragons', value: 'red' },
    { id: 'green', suit: 'dragons', value: 'green' },
    { id: 'white', suit: 'dragons', value: 'white' }
  );

  // Flowers
  tiles.push(
    { id: 'f1', suit: 'flowers', value: 'f1' },
    { id: 'f2', suit: 'flowers', value: 'f2' },
    { id: 'f3', suit: 'flowers', value: 'f3' },
    { id: 'f4', suit: 'flowers', value: 'f4' }
  );

  // Jokers
  tiles.push({ id: 'joker', suit: 'jokers', value: 'joker' });

  return tiles;
};

// Group tiles by suit for organized display
export const groupTilesBySuit = (tiles: Tile[]): Record<TileSuit, Tile[]> => {
  const grouped: Record<TileSuit, Tile[]> = {
    dots: [],
    bams: [],
    cracks: [],
    winds: [],
    dragons: [],
    flowers: [],
    jokers: []
  };

  tiles.forEach(tile => {
    grouped[tile.suit].push(tile);
  });

  // Sort numerical tiles within each suit
  ['dots', 'bams', 'cracks'].forEach(suit => {
    grouped[suit as TileSuit].sort((a, b) => 
      parseInt(String(a.value)) - parseInt(String(b.value))
    );
  });

  return grouped;
};

// Count occurrences of each tile in a collection
export const countTiles = (tiles: Tile[]): Record<string, number> => {
  const counts: Record<string, number> = {};
  tiles.forEach(tile => {
    counts[tile.id] = (counts[tile.id] || 0) + 1;
  });
  return counts;
};

// Check if a tile can be selected (not exceeding max count)
export const canSelectTile = (tile: Tile, currentTiles: Tile[], maxCount: number = 4): boolean => {
  const currentCount = currentTiles.filter(t => t.id === tile.id).length;
  return currentCount < maxCount;
};

// Add a tile to collection
export const addTile = (tiles: Tile[], newTile: Tile): Tile[] => {
  if (canSelectTile(newTile, tiles)) {
    return [...tiles, { ...newTile }];
  }
  return tiles;
};

// Remove one instance of a tile from collection
export const removeTile = (tiles: Tile[], tileToRemove: Tile): Tile[] => {
  const index = tiles.findIndex(t => t.id === tileToRemove.id);
  if (index !== -1) {
    const newTiles = [...tiles];
    newTiles.splice(index, 1);
    return newTiles;
  }
  return tiles;
};

// Get display name for suits
export const getSuitDisplayName = (suit: TileSuit): string => {
  const displayNames: Record<TileSuit, string> = {
    dots: 'Dots',
    bams: 'Bams', 
    cracks: 'Cracks',
    winds: 'Winds',
    dragons: 'Dragons',
    flowers: 'Flowers',
    jokers: 'Jokers'
  };
  return displayNames[suit];
};

// UPDATED: Validate a tile collection with optional position-aware logic
export const validateTileCollection = (
  tiles: Tile[], 
  playerPosition?: PlayerPosition
): { isValid: boolean; errors: string[]; warnings?: string[] } => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const counts = countTiles(tiles);

  // Check for too many of any tile type
  Object.entries(counts).forEach(([tileId, count]) => {
    const maxAllowed = tileId === 'joker' ? 8 : 4;
    if (count > maxAllowed) {
      errors.push(`Too many ${tileId} tiles: ${count} (max: ${maxAllowed})`);
    }
  });

  // Position-aware tile count validation
  if (playerPosition) {
    const isValid = validatePositionTileCount(playerPosition, tiles.length);
    if (!isValid) {
      errors.push(`Invalid tile count for position ${playerPosition}: ${tiles.length}`);
    }
  } else {
    // Original logic for backward compatibility (assumes 13 tiles)
    if (tiles.length > 14) {
      errors.push(`Too many tiles total: ${tiles.length} (max: 14)`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

// NEW: Get appropriate max tiles for HandTileGrid based on position
export const getMaxTilesForPosition = (position?: PlayerPosition): number => {
  if (!position) {
    return 14; // Default for backward compatibility
  }
  return getTargetTileCount(position) + 1; // Allow one extra during input
};

// Sort tiles for consistent display
export const sortTiles = (tiles: Tile[]): Tile[] => {
  const suitOrder: TileSuit[] = ['dots', 'bams', 'cracks', 'winds', 'dragons', 'flowers', 'jokers'];
  
  return [...tiles].sort((a, b) => {
    // First sort by suit
    const suitA = suitOrder.indexOf(a.suit);
    const suitB = suitOrder.indexOf(b.suit);
    if (suitA !== suitB) {
      return suitA - suitB;
    }

    // Then sort by value within suit
    if (['dots', 'bams', 'cracks'].includes(a.suit)) {
      return parseInt(String(a.value)) - parseInt(String(b.value));
    }

    // For non-numerical tiles, sort alphabetically
    return String(a.value).localeCompare(String(b.value));
  });
};