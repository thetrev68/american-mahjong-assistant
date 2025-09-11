// frontend/src/utils/tile-utils.ts
import type { Tile, TileValue, TileSuit, PlayerPosition } from 'shared-types';

// Mock these functions for now since dealer-logic doesn't exist
export const getTargetTileCount = (_position: PlayerPosition): number => 14;
export const validatePositionTileCount = (_position: PlayerPosition, count: number): boolean => count === 14;

// Helper function to generate display names for tiles
const getDisplayName = (suit: TileSuit, value: TileValue): string => {
  switch (suit) {
    case 'dots':
      return `${value} Dot${value === '1' ? '' : 's'}`
    case 'bams':
      return `${value} Bam${value === '1' ? '' : 's'}`
    case 'cracks':
      return `${value} Crack${value === '1' ? '' : 's'}`
    case 'winds':
      return `${value.charAt(0).toUpperCase() + value.slice(1)} Wind`
    case 'dragons':
      return `${value.charAt(0).toUpperCase() + value.slice(1)} Dragon`
    case 'flowers':
      return `Flower ${value.substring(1)}`
    case 'jokers':
      return 'Joker'
    default:
      return `${value}`
  }
}

// Create all available tiles for selection
export const createAllTiles = (): Tile[] => {
  const tiles: Tile[] = [];

  // Dots (1D-9D)
  for (let i = 1; i <= 9; i++) {
    const suit: TileSuit = 'dots';
    const value = i.toString() as TileValue;
    tiles.push({
      id: `${i}D`,
      suit,
      value,
      displayName: getDisplayName(suit, value)
    });
  }

  // Bams (1B-9B)
  for (let i = 1; i <= 9; i++) {
    const suit: TileSuit = 'bams';
    const value = i.toString() as TileValue;
    tiles.push({
      id: `${i}B`,
      suit,
      value,
      displayName: getDisplayName(suit, value)
    });
  }

  // Cracks (1C-9C)
  for (let i = 1; i <= 9; i++) {
    const suit: TileSuit = 'cracks';
    const value = i.toString() as TileValue;
    tiles.push({
      id: `${i}C`,
      suit,
      value,
      displayName: getDisplayName(suit, value)
    });
  }

  // Winds
  const windTiles = [
    { id: 'east', suit: 'winds' as TileSuit, value: 'east' as TileValue },
    { id: 'south', suit: 'winds' as TileSuit, value: 'south' as TileValue },
    { id: 'west', suit: 'winds' as TileSuit, value: 'west' as TileValue },
    { id: 'north', suit: 'winds' as TileSuit, value: 'north' as TileValue }
  ];
  windTiles.forEach(tile => {
    tiles.push({ ...tile, displayName: getDisplayName(tile.suit, tile.value) });
  });

  // Dragons
  const dragonTiles = [
    { id: 'red', suit: 'dragons' as TileSuit, value: 'red' as TileValue },
    { id: 'green', suit: 'dragons' as TileSuit, value: 'green' as TileValue },
    { id: 'white', suit: 'dragons' as TileSuit, value: 'white' as TileValue }
  ];
  dragonTiles.forEach(tile => {
    tiles.push({ ...tile, displayName: getDisplayName(tile.suit, tile.value) });
  });

  // Flowers
  const flowerTiles = [
    { id: 'f1', suit: 'flowers' as TileSuit, value: 'f1' as TileValue },
    { id: 'f2', suit: 'flowers' as TileSuit, value: 'f2' as TileValue },
    { id: 'f3', suit: 'flowers' as TileSuit, value: 'f3' as TileValue },
    { id: 'f4', suit: 'flowers' as TileSuit, value: 'f4' as TileValue }
  ];
  flowerTiles.forEach(tile => {
    tiles.push({ ...tile, displayName: getDisplayName(tile.suit, tile.value) });
  });

  // Jokers
  const suit: TileSuit = 'jokers';
  const value: TileValue = 'joker';
  tiles.push({ id: 'joker', suit, value, displayName: getDisplayName(suit, value) });

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