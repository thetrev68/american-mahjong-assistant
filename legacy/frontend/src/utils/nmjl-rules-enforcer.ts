/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/src/utils/nmjl-rules-enforcer.ts
// Comprehensive NMJL rules validation and enforcement
// Ensures all game actions follow official National Mah Jongg League rules

import type { Tile, HandPattern, Player, ExposedSet } from '../types';
import { NMJL_RULES } from './nmjl-patterns-2025';

interface ValidationResult {
  valid: boolean;
  reason?: string;
  suggestions?: string[];
}

interface MahjongValidationResult extends ValidationResult {
  isWinningHand: boolean;
  matchedPattern?: HandPattern;
  points?: number;
  violations?: string[];
}

interface JokerValidationResult extends ValidationResult {
  allowedUsage: Array<{
    position: number; // Position in hand where joker can be used
    represents: Tile; // What the joker would represent
    reasoning: string;
  }>;
  forbiddenUsage: Array<{
    position: number;
    reasoning: string;
  }>;
}

/**
 * NMJL Rules Enforcement Engine
 * Validates all game actions according to official NMJL rules
 */
export class NMJLRulesEnforcer {
  
  /**
   * Validate if a hand constitutes a winning mahjong
   */
  static validateMahjong(
    playerTiles: Tile[],
    exposedSets: ExposedSet[],
    claimedPattern: HandPattern,
    cardYear: number = 2025
  ): MahjongValidationResult {
    
    const violations: string[] = [];
    let isValid = true;
    
    // Rule 1: Must have exactly 14 tiles
    const totalTiles = playerTiles.length + exposedSets.reduce((sum, set) => sum + set.tiles.length, 0);
    if (totalTiles !== 14) {
      violations.push(`Must have exactly 14 tiles, found ${totalTiles}`);
      isValid = false;
    }
    
    // Rule 2: Validate pattern structure
    const patternValidation = this.validatePatternStructure(playerTiles, exposedSets, claimedPattern);
    if (!patternValidation.valid) {
      violations.push(patternValidation.reason || 'Pattern structure invalid');
      isValid = false;
    }
    
    // Rule 3: Validate joker usage
    const jokerValidation = this.validateJokerUsage(playerTiles, exposedSets, claimedPattern);
    if (!jokerValidation.valid) {
      violations.push(jokerValidation.reason || 'Invalid joker usage');
      isValid = false;
    }
    
    // Rule 4: Validate exposed sets match pattern
    const exposedValidation = this.validateExposedSets(exposedSets, claimedPattern);
    if (!exposedValidation.valid) {
      violations.push(exposedValidation.reason || 'Exposed sets do not match pattern');
      isValid = false;
    }
    
    // Rule 5: Pattern must be from current year's card
    if (!this.isPatternValidForYear(claimedPattern, cardYear)) {
      violations.push(`Pattern not available in ${cardYear} card`);
      isValid = false;
    }
    
    return {
      valid: isValid,
      isWinningHand: isValid,
      matchedPattern: isValid ? claimedPattern : undefined,
      points: isValid ? claimedPattern.points : undefined,
      violations: violations.length > 0 ? violations : undefined,
      reason: violations.length > 0 ? violations.join('; ') : undefined
    };
  }
  
  /**
   * Validate joker usage in a hand or proposed play
   */
  static validateJokerUsage(
    playerTiles: Tile[],
    exposedSets: ExposedSet[],
    targetPattern: HandPattern
  ): JokerValidationResult {
    
    const allowedUsage: Array<{
      position: number;
      represents: Tile;
      reasoning: string;
    }> = [];
    
    const forbiddenUsage: Array<{
      position: number;
      reasoning: string;
    }> = [];
    
    const allTiles = [...playerTiles, ...exposedSets.flatMap(set => set.tiles)];
    const jokers = allTiles.filter(tile => tile.isJoker || tile.suit === 'jokers');
    
    // Check each joker's usage
    jokers.forEach((joker, index) => {
      const position = allTiles.indexOf(joker);
      
      // Rule: Jokers cannot be used in pairs (with rare exceptions)
      if (this.isJokerInPair(joker, allTiles, targetPattern)) {
        if (this.patternAllowsJokersInPairs(targetPattern)) {
          allowedUsage.push({
            position,
            represents: joker.jokerFor || joker,
            reasoning: `Pattern ${targetPattern.name} allows jokers in pairs`
          });
        } else {
          forbiddenUsage.push({
            position,
            reasoning: 'Jokers cannot be used in pairs in this pattern'
          });
        }
      }
      
      // Rule: Jokers cannot represent flowers (in most cases)
      else if (joker.jokerFor?.suit === 'flowers') {
        forbiddenUsage.push({
          position,
          reasoning: 'Jokers cannot represent flowers'
        });
      }
      
      // Rule: Jokers in exposed sets must be properly identified
      else if (this.isJokerInExposedSet(joker, exposedSets)) {
        if (joker.jokerFor) {
          allowedUsage.push({
            position,
            represents: joker.jokerFor,
            reasoning: 'Joker properly identified in exposed set'
          });
        } else {
          forbiddenUsage.push({
            position,
            reasoning: 'Joker in exposed set must specify what it represents'
          });
        }
      }
      
      // Valid joker usage in concealed part of hand
      else {
        allowedUsage.push({
          position,
          represents: joker.jokerFor || { id: 'any', suit: 'any', value: 'any' } as any,
          reasoning: 'Valid joker usage in concealed tiles'
        });
      }
    });
    
    const isValid = forbiddenUsage.length === 0;
    
    return {
      valid: isValid,
      reason: isValid ? undefined : `Invalid joker usage: ${forbiddenUsage.map(f => f.reasoning).join('; ')}`,
      allowedUsage,
      forbiddenUsage
    };
  }
  
  /**
   * Validate if a player can call (pung/kong/exposure) a discarded tile
   */
  static validateTileCall(
    discardedTile: Tile,
    playerTiles: Tile[],
    callType: 'pung' | 'kong' | 'exposure',
    proposedExposure: Tile[],
    targetPattern?: HandPattern
  ): ValidationResult {
    
    // Rule: Must have matching tiles to call
    const matchingTiles = playerTiles.filter(tile => 
      this.tilesMatch(tile, discardedTile, true) // Allow jokers to match
    );
    
    switch (callType) {
      case 'pung':
        if (matchingTiles.length < 2) {
          return {
            valid: false,
            reason: 'Need at least 2 matching tiles to call for pung',
            suggestions: ['Wait for a different tile', 'Use jokers if available']
          };
        }
        break;
        
      case 'kong':
        if (matchingTiles.length < 3) {
          return {
            valid: false,
            reason: 'Need at least 3 matching tiles to call for kong',
            suggestions: ['Call for pung instead', 'Wait for more matching tiles']
          };
        }
        break;
        
      case 'exposure':
        // Exposure rules are more complex and pattern-dependent
        if (targetPattern) {
          const exposureValidation = this.validateExposureForPattern(
            proposedExposure,
            targetPattern
          );
          if (!exposureValidation.valid) {
            return exposureValidation;
          }
        }
        break;
    }
    
    // Rule: Proposed exposure must include the discarded tile
    if (!proposedExposure.some(tile => this.tilesMatch(tile, discardedTile, false))) {
      return {
        valid: false,
        reason: 'Exposed set must include the called tile',
        suggestions: ['Include the discarded tile in your exposure']
      };
    }
    
    // Rule: Cannot call your own discard
    // This would be handled at the game level, but we can validate the structure
    
    return { valid: true };
  }
  
  /**
   * Validate Charleston tile pass
   */
  static validateCharlestonPass(
    selectedTiles: Tile[],
    playerTiles: Tile[],
    phase: 'right' | 'across' | 'left' | 'optional'
  ): ValidationResult {
    
    // Rule: Must pass exactly 3 tiles
    if (selectedTiles.length !== 3) {
      return {
        valid: false,
        reason: `Must pass exactly 3 tiles, selected ${selectedTiles.length}`,
        suggestions: ['Select exactly 3 tiles to pass']
      };
    }
    
    // Rule: Must own the tiles being passed
    const invalidTiles = selectedTiles.filter(tile => 
      !playerTiles.some(owned => owned.id === tile.id)
    );
    
    if (invalidTiles.length > 0) {
      return {
        valid: false,
        reason: 'Cannot pass tiles you don\'t own',
        suggestions: ['Select only tiles from your hand']
      };
    }
    
    // Rule: Cannot pass the same tile multiple times (if you only have one)
    const tileCounts = this.countTiles(playerTiles);
    const passCounts = this.countTiles(selectedTiles);
    
    for (const [tileId, passCount] of Object.entries(passCounts)) {
      if (passCount > (tileCounts[tileId] || 0)) {
        return {
          valid: false,
          reason: `Cannot pass ${passCount} ${tileId} tiles when you only have ${tileCounts[tileId]}`,
          suggestions: ['Check your tile selection']
        };
      }
    }
    
    return { valid: true };
  }
  
  /**
   * Validate if a discard is legal
   */
  static validateDiscard(
    tileToDiscard: Tile,
    playerTiles: Tile[],
    isFirstDiscard: boolean = false
  ): ValidationResult {
    
    // Rule: Must own the tile being discarded
    if (!playerTiles.some(tile => tile.id === tileToDiscard.id)) {
      return {
        valid: false,
        reason: 'Cannot discard a tile you don\'t own',
        suggestions: ['Select a tile from your hand']
      };
    }
    
    // Rule: First discard cannot be a joker (house rule in many games)
    if (isFirstDiscard && (tileToDiscard.isJoker || tileToDiscard.suit === 'jokers')) {
      return {
        valid: false,
        reason: 'Cannot discard joker on first turn (house rule)',
        suggestions: ['Discard a different tile', 'Keep jokers for later use']
      };
    }
    
    return { valid: true };
  }
  
  /**
   * Get valid joker substitutions for a given pattern
   */
  static getValidJokerSubstitutions(
    targetPattern: HandPattern,
    currentTiles: Tile[]
  ): Array<{ position: number; canRepresent: Tile[]; restrictions: string[] }> {
    
    const substitutions: Array<{
      position: number;
      canRepresent: Tile[];
      restrictions: string[];
    }> = [];
    
    // Analyze each position in the pattern
    targetPattern.requiredTiles.forEach((requiredTile, index) => {
      const currentTile = currentTiles[index];
      
      if (currentTile?.isJoker || currentTile?.suit === 'jokers') {
        const canRepresent: Tile[] = [];
        const restrictions: string[] = [];
        
        // Determine what this joker can represent at this position
        if (this.isPositionInPair(index, targetPattern)) {
          restrictions.push('Cannot be used in pairs (most patterns)');
          if (this.patternAllowsJokersInPairs(targetPattern)) {
            canRepresent.push(requiredTile);
            restrictions.pop();
            restrictions.push('Special pattern allows jokers in pairs');
          }
        } else {
          // Joker in pung, kong, or sequence
          canRepresent.push(requiredTile);
          
          if (requiredTile.suit === 'flowers') {
            restrictions.push('Cannot represent flowers');
            canRepresent.length = 0; // Clear the array
          }
        }
        
        substitutions.push({
          position: index,
          canRepresent,
          restrictions
        });
      }
    });
    
    return substitutions;
  }
  
  // Helper methods
  
  private static validatePatternStructure(
    playerTiles: Tile[],
    exposedSets: ExposedSet[],
    pattern: HandPattern
  ): ValidationResult {
    
    // Combine all tiles
    const allTiles = [...playerTiles, ...exposedSets.flatMap(set => set.tiles)];
    
    // Count what we have vs what pattern requires
    const haveCounts = this.countTiles(allTiles);
    const needCounts = this.countTiles(pattern.requiredTiles);
    
    // Allow jokers to fill gaps
    const jokerCount = allTiles.filter(t => t.isJoker || t.suit === 'jokers').length;
    let jokersUsed = 0;
    
    for (const [tileId, needed] of Object.entries(needCounts)) {
      const have = haveCounts[tileId] || 0;
      const shortage = needed - have;
      
      if (shortage > 0) {
        if (jokersUsed + shortage <= jokerCount) {
          jokersUsed += shortage;
        } else {
          return {
            valid: false,
            reason: `Missing ${shortage} ${tileId} tiles and insufficient jokers`
          };
        }
      }
    }
    
    return { valid: true };
  }
  
  private static validateExposedSets(
    exposedSets: ExposedSet[],
    pattern: HandPattern
  ): ValidationResult {
    
    // TODO: This would validate that exposed sets are legal according to the pattern
    // For now, assume they're valid if they exist
    return { valid: true };
  }
  
  private static validateExposureForPattern(
    proposedExposure: Tile[],
    pattern: HandPattern
  ): ValidationResult {
    
    // TODO: Pattern-specific exposure validation would go here
    // For now, basic validation
    if (proposedExposure.length < 3) {
      return {
        valid: false,
        reason: 'Exposure must contain at least 3 tiles'
      };
    }
    
    return { valid: true };
  }
  
  private static isPatternValidForYear(pattern: HandPattern, year: number): boolean {
    // TODO: For now, assume all patterns are valid for 2025
    return year === 2025;
  }
  
  private static isJokerInPair(
    joker: Tile,
    allTiles: Tile[],
    pattern: HandPattern
  ): boolean {
    
    // TODO: Simplified check - would need more sophisticated pattern analysis
    const jokerIndex = allTiles.indexOf(joker);
    
    // Check if this position in the pattern represents a pair
    return this.isPositionInPair(jokerIndex, pattern);
  }
  
  private static isPositionInPair(index: number, pattern: HandPattern): boolean {
    // TODO: This would require analyzing the pattern structure
    // For now, simplified assumption based on pattern description
    return pattern.description.includes('pair') && index >= pattern.requiredTiles.length - 2;
  }
  
  private static patternAllowsJokersInPairs(pattern: HandPattern): boolean {
    // Some special patterns allow jokers in pairs
    return pattern.name.includes('SPECIAL') || pattern.name.includes('2025');
  }
  
  private static isJokerInExposedSet(joker: Tile, exposedSets: ExposedSet[]): boolean {
    return exposedSets.some(set => set.tiles.some(tile => tile.id === joker.id));
  }
  
  private static tilesMatch(tile1: Tile, tile2: Tile, allowJokers: boolean): boolean {
    if (tile1.id === tile2.id) return true;
    
    if (allowJokers) {
      if (tile1.isJoker || tile1.suit === 'jokers') {
        return tile1.jokerFor ? tile1.jokerFor.id === tile2.id : true;
      }
      if (tile2.isJoker || tile2.suit === 'jokers') {
        return tile2.jokerFor ? tile2.jokerFor.id === tile1.id : true;
      }
    }
    
    return false;
  }
  
  private static countTiles(tiles: Tile[]): Record<string, number> {
    return tiles.reduce((counts, tile) => {
      counts[tile.id] = (counts[tile.id] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
  }
  
  /**
   * Get comprehensive rule violations for educational purposes
   */
  static getAllRuleViolations(
    playerTiles: Tile[],
    exposedSets: ExposedSet[],
    targetPattern?: HandPattern
  ): Array<{ rule: string; violation: string; severity: 'warning' | 'error' }> {
    
    const violations: Array<{ rule: string; violation: string; severity: 'warning' | 'error' }> = [];
    
    // Check tile count
    const totalTiles = playerTiles.length + exposedSets.reduce((sum, set) => sum + set.tiles.length, 0);
    if (totalTiles !== 14 && totalTiles !== 13) {
      violations.push({
        rule: 'Tile Count',
        violation: `Must have 13 or 14 tiles, currently have ${totalTiles}`,
        severity: 'error'
      });
    }
    
    // Check joker usage
    const jokerValidation = targetPattern ? 
      this.validateJokerUsage(playerTiles, exposedSets, targetPattern) :
      { valid: true, forbiddenUsage: [] };
    
    jokerValidation.forbiddenUsage?.forEach(forbidden => {
      violations.push({
        rule: 'Joker Usage',
        violation: forbidden.reasoning,
        severity: 'error'
      });
    });
    
    // Check for duplicate tiles beyond legal limits
    const tileCounts = this.countTiles([...playerTiles, ...exposedSets.flatMap(s => s.tiles)]);
    Object.entries(tileCounts).forEach(([tileId, count]) => {
      const maxAllowed = this.getMaxTileCount(tileId);
      if (count > maxAllowed) {
        violations.push({
          rule: 'Tile Limits',
          violation: `Too many ${tileId} tiles: ${count}/${maxAllowed}`,
          severity: 'error'
        });
      }
    });
    
    return violations;
  }
  
  private static getMaxTileCount(tileId: string): number {
    if (tileId.includes('joker')) return 8;
    if (tileId.includes('flower')) return 1;
    return 4; // Standard for most tiles
  }
}