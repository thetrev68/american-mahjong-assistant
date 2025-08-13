// frontend/src/utils/dealer-logic.ts
// Dealer-specific utilities for American Mahjong Web Assistant

import type { PlayerPosition, Tile } from '../types';

/**
 * Check if a position is the dealer position (East)
 */
export const isDealerPosition = (position: PlayerPosition): boolean => {
  return position === 'east';
};

/**
 * Get the target tile count for a player position
 * Dealer (East) gets 14 tiles, others get 13
 */
export const getTargetTileCount = (position: PlayerPosition): number => {
  return isDealerPosition(position) ? 14 : 13;
};

/**
 * Get the maximum allowed tile count for a player position
 * Allows one extra tile during input phase
 */
export const getMaxTileCount = (position: PlayerPosition): number => {
  const target = getTargetTileCount(position);
  return target + 1; // Allow one extra during input
};

/**
 * Validate tile count for a specific player position
 */
export interface DealerValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  targetCount: number;
  actualCount: number;
  isDealer: boolean;
}

export const validateDealerTileCount = (
  tiles: Tile[], 
  isDealer: boolean
): DealerValidationResult => {
  const targetCount = isDealer ? 14 : 13;
  const actualCount = tiles.length;
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check tile count
  if (actualCount > targetCount + 1) {
    errors.push(`Too many tiles: ${actualCount} (max: ${targetCount + 1})`);
  } else if (actualCount > targetCount) {
    warnings.push(`One extra tile: ${actualCount} (target: ${targetCount})`);
  } else if (actualCount < targetCount) {
    const needed = targetCount - actualCount;
    warnings.push(`Need ${needed} more tile${needed > 1 ? 's' : ''} (target: ${targetCount})`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    targetCount,
    actualCount,
    isDealer
  };
};

/**
 * Validate tile count by position
 */
export const validatePositionTileCount = (
  tiles: Tile[], 
  position: PlayerPosition
): DealerValidationResult => {
  const isDealer = isDealerPosition(position);
  return validateDealerTileCount(tiles, isDealer);
};

/**
 * Get helpful status message for tile count
 */
export const getTileCountStatus = (
  tiles: Tile[], 
  position: PlayerPosition
): { message: string; type: 'success' | 'warning' | 'error' } => {
  const validation = validatePositionTileCount(tiles, position);
  const { targetCount, actualCount, isDealer } = validation;

  if (validation.errors.length > 0) {
    return {
      message: `Too many tiles (${actualCount}/${targetCount})`,
      type: 'error'
    };
  }

  if (actualCount === targetCount) {
    return {
      message: `Ready! (${actualCount}/${targetCount})${isDealer ? ' 👑' : ''}`,
      type: 'success'
    };
  }

  if (actualCount < targetCount) {
    const needed = targetCount - actualCount;
    return {
      message: `Need ${needed} more (${actualCount}/${targetCount})${isDealer ? ' 👑' : ''}`,
      type: 'warning'
    };
  }

  // One extra tile
  return {
    message: `One extra tile (${actualCount}/${targetCount})${isDealer ? ' 👑' : ''}`,
    type: 'warning'
  };
};

/**
 * Check if all players have correct tile counts
 */
export const validateAllPlayerTileCounts = (
  playerTileCounts: { position: PlayerPosition; tileCount: number }[]
): { allValid: boolean; issues: string[] } => {
  const issues: string[] = [];

  for (const { position, tileCount } of playerTileCounts) {
    const targetCount = getTargetTileCount(position);
    const positionLabel = position.charAt(0).toUpperCase() + position.slice(1);
    
    if (tileCount !== targetCount) {
      if (tileCount > targetCount) {
        issues.push(`${positionLabel} has too many tiles (${tileCount}, needs ${targetCount})`);
      } else {
        issues.push(`${positionLabel} needs ${targetCount - tileCount} more tiles`);
      }
    }
  }

  return {
    allValid: issues.length === 0,
    issues
  };
};

/**
 * Constants for dealer logic
 */
export const DEALER_CONSTANTS = {
  DEALER_POSITION: 'east' as PlayerPosition,
  DEALER_TILE_COUNT: 14,
  STANDARD_TILE_COUNT: 13,
  MAX_EXCESS_TILES: 1, // Allow one extra during input
} as const;