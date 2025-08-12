// frontend/src/utils/nmjl-pattern-adapter.ts
// Adapter to convert real NMJL 2025 patterns to HandPattern interface
// FIXED: Tile ID format now matches player tiles

import type { HandPattern, Tile, TileValue } from '../types';
import type { NMJL2025Pattern, PatternGroup, ParsedConstraint } from '../types/nmjl-2025-types';
import { nmjl2025Loader } from './nmjl-2025-loader';

/**
 * Converts real NMJL 2025 pattern data into the HandPattern format
 * expected by the existing pattern analysis engine
 */
export class NMJLPatternAdapter {
  
  /**
   * Convert NMJL2025Pattern to HandPattern for use in existing systems
   */
  static convertToHandPattern(nmjlPattern: NMJL2025Pattern): HandPattern {
    // Create proper section/line naming based on NMJL card structure
    const sectionName = typeof nmjlPattern.Section === 'string' ? nmjlPattern.Section : nmjlPattern.Section.toString();
    const patternName = `Section ${sectionName}, Line ${nmjlPattern.Line}, Pattern ${nmjlPattern.Hand_Pattern}`;
    
    return {
      id: `nmjl-2025-${nmjlPattern.Hands_Key || nmjlPattern["Pattern ID"]}`,
      name: patternName,
      description: nmjlPattern.Hand_Description || nmjlPattern.Hand_Pattern,
      requiredTiles: this.extractRequiredTiles(nmjlPattern),
      optionalTiles: [], // NMJL patterns don't have optional tiles
      points: nmjlPattern.Hand_Points,
      difficulty: nmjlPattern.Hand_Difficulty
    };
  }

  /**
   * Extract tile requirements from pattern groups
   */
  private static extractRequiredTiles(pattern: NMJL2025Pattern): Tile[] {
    const tiles: Tile[] = [];
    
    for (const group of pattern.Groups) {
      const groupTiles = this.parseGroupToTiles(group, pattern);
      tiles.push(...groupTiles);
    }
    
    return tiles;
  }

  /**
   * Parse a pattern group into specific tiles
   */
  private static parseGroupToTiles(group: PatternGroup, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _pattern: NMJL2025Pattern): Tile[] {
    const constraint = nmjl2025Loader.parseConstraint(group);
    const tiles: Tile[] = [];
    
    // Handle different constraint types
    switch (group.Constraint_Type) {
      case 'kong':
        tiles.push(...this.createKongTiles(constraint, group));
        break;
      case 'pung':
        tiles.push(...this.createPungTiles(constraint, group));
        break;
      case 'pair':
        tiles.push(...this.createPairTiles(constraint, group));
        break;
      case 'sequence':
        tiles.push(...this.createSequenceTiles(constraint, group));
        break;
      case 'single':
        tiles.push(...this.createSingleTiles(constraint, group));
        break;
      case 'consecutive':
        tiles.push(...this.createConsecutiveTiles(constraint, group));
        break;
      case 'like':
        tiles.push(...this.createLikeTiles(constraint, group));
        break;
    }
    
    return tiles;
  }

  /**
   * Create kong (4 of a kind) tiles
   */
  private static createKongTiles(constraint: ParsedConstraint, group: PatternGroup): Tile[] {
    const tiles: Tile[] = [];
    
    if (constraint.isFlower) {
      // 4 flowers - using f1, f2, f3, f4 for variety
      tiles.push(
        this.createTile('flowers', 'f1'),
        this.createTile('flowers', 'f2'),
        this.createTile('flowers', 'f3'),
        this.createTile('flowers', 'f4')
      );
    } else if (constraint.isDragon) {
      // 4 dragons of same color
      const dragonType = this.inferDragonType(constraint.raw || '');
      for (let i = 0; i < 4; i++) {
        tiles.push(this.createTile('dragons', dragonType));
      }
    } else if (constraint.isWind) {
      // 4 winds of same direction
      const windType = this.inferWindType(constraint.raw || '');
      for (let i = 0; i < 4; i++) {
        tiles.push(this.createTile('winds', windType));
      }
    } else if (constraint.values.length > 0) {
      // Regular number tiles
      const value = constraint.values[0];
      if (value !== null) {
        const suits = this.getSuitsForRole(group.Suit_Role);
        // For kong, we need 4 tiles, distributed among available suits
        for (let i = 0; i < 4; i++) {
          const suit = suits[i % suits.length];
          tiles.push(this.createTile(suit, value.toString()));
        }
      }
    }
    
    return tiles;
  }

  /**
   * Create pung (3 of a kind) tiles
   */
  private static createPungTiles(constraint: ParsedConstraint, group: PatternGroup): Tile[] {
    const tiles: Tile[] = [];
    
    if (constraint.isFlower) {
      // Use first 3 flower types
      tiles.push(
        this.createTile('flowers', 'f1'),
        this.createTile('flowers', 'f2'),
        this.createTile('flowers', 'f3')
      );
    } else if (constraint.isDragon) {
      const dragonType = this.inferDragonType(constraint.raw || '');
      for (let i = 0; i < 3; i++) {
        tiles.push(this.createTile('dragons', dragonType));
      }
    } else if (constraint.isWind) {
      const windType = this.inferWindType(constraint.raw || '');
      for (let i = 0; i < 3; i++) {
        tiles.push(this.createTile('winds', windType));
      }
    } else if (constraint.values.length > 0) {
      const value = constraint.values[0];
      if (value !== null) {
        const suits = this.getSuitsForRole(group.Suit_Role);
        for (let i = 0; i < 3; i++) {
          const suit = suits[i % suits.length];
          tiles.push(this.createTile(suit, value.toString()));
        }
      }
    }
    
    return tiles;
  }

  /**
   * Create pair (2 of a kind) tiles
   */
  private static createPairTiles(constraint: ParsedConstraint, group: PatternGroup): Tile[] {
    const tiles: Tile[] = [];
    
    if (constraint.isFlower) {
      tiles.push(
        this.createTile('flowers', 'f1'),
        this.createTile('flowers', 'f2')
      );
    } else if (constraint.isDragon) {
      const dragonType = this.inferDragonType(constraint.raw || '');
      for (let i = 0; i < 2; i++) {
        tiles.push(this.createTile('dragons', dragonType));
      }
    } else if (constraint.isWind) {
      const windType = this.inferWindType(constraint.raw || '');
      for (let i = 0; i < 2; i++) {
        tiles.push(this.createTile('winds', windType));
      }
    } else if (constraint.values.length > 0) {
      const value = constraint.values[0];
      if (value !== null) {
        const suits = this.getSuitsForRole(group.Suit_Role);
        for (let i = 0; i < 2; i++) {
          const suit = suits[i % suits.length];
          tiles.push(this.createTile(suit, value.toString()));
        }
      }
    }
    
    return tiles;
  }

  /**
   * Create single tiles
   */
  private static createSingleTiles(constraint: ParsedConstraint, group: PatternGroup): Tile[] {
    const tiles: Tile[] = [];
    
    if (constraint.isFlower) {
      tiles.push(this.createTile('flowers', 'f1'));
    } else if (constraint.isDragon) {
      const dragonType = this.inferDragonType(constraint.raw || '');
      tiles.push(this.createTile('dragons', dragonType));
    } else if (constraint.isWind) {
      const windType = this.inferWindType(constraint.raw || '');
      tiles.push(this.createTile('winds', windType));
    } else if (constraint.values.length > 0) {
      for (const value of constraint.values) {
        if (value !== null) {
          const suits = this.getSuitsForRole(group.Suit_Role);
          tiles.push(this.createTile(suits[0], value.toString()));
        }
      }
    }
    
    return tiles;
  }

  /**
   * Create sequence tiles (consecutive numbers)
   */
  private static createSequenceTiles(constraint: ParsedConstraint, group: PatternGroup): Tile[] {
    const tiles: Tile[] = [];
    
    if (constraint.values.length >= 2) {
      const suits = this.getSuitsForRole(group.Suit_Role);
      const startValue = Math.min(...constraint.values.filter(v => v !== null) as number[]);
      const endValue = Math.max(...constraint.values.filter(v => v !== null) as number[]);
      
      for (let value = startValue; value <= endValue; value++) {
        tiles.push(this.createTile(suits[0], value.toString()));
      }
    }
    
    return tiles;
  }

  /**
   * Create consecutive tiles (like sequences but across multiple suits)
   */
  private static createConsecutiveTiles(constraint: ParsedConstraint, group: PatternGroup): Tile[] {
    return this.createSequenceTiles(constraint, group);
  }

  /**
   * Create "like" tiles (same value across different suits)
   */
  private static createLikeTiles(constraint: ParsedConstraint, group: PatternGroup): Tile[] {
    const tiles: Tile[] = [];
    
    if (constraint.values.length > 0) {
      const value = constraint.values[0];
      if (value !== null) {
        const suits = this.getSuitsForRole(group.Suit_Role);
        for (const suit of suits) {
          tiles.push(this.createTile(suit, value.toString()));
        }
      }
    }
    
    return tiles;
  }

  /**
   * Get suits based on suit role
   */
  private static getSuitsForRole(role: string): string[] {
    switch (role) {
      case 'first':
        return ['bams'];
      case 'second':
        return ['cracks'];
      case 'third':
        return ['dots'];
      case 'any':
        return ['bams', 'cracks', 'dots'];
      case 'none':
      default:
        return ['bams', 'cracks', 'dots'];
    }
  }

  /**
   * Infer dragon type from constraint text
   */
  private static inferDragonType(constraintText: string): string {
    const text = constraintText.toLowerCase();
    if (text.includes('red')) return 'red';
    if (text.includes('green')) return 'green';
    if (text.includes('white')) return 'white';
    return 'red'; // default
  }

  /**
   * Infer wind type from constraint text
   */
  private static inferWindType(constraintText: string): string {
    const text = constraintText.toLowerCase();
    if (text.includes('east')) return 'east';
    if (text.includes('south')) return 'south';
    if (text.includes('west')) return 'west';
    if (text.includes('north')) return 'north';
    return 'east'; // default
  }

  /**
   * FIXED: Create a tile with the proper ID format matching player tiles
   * Player tiles from tile-utils.ts use: 
   * - 1D, 2D, 3D, etc. for dots
   * - 1B, 2B, 3B, etc. for bams
   * - 1C, 2C, 3C, etc. for cracks
   * - east, south, west, north for winds
   * - red, green, white for dragons
   * - f1, f2, f3, f4 for flowers
   * - joker for jokers
   */
  private static createTile(suit: string, value: string): Tile {
    let tileId: string;
    
    // Create ID based on suit and value to match player tile format from tile-utils.ts
    if (suit === 'dots') {
      // Dots: 1D, 2D, 3D, etc.
      tileId = `${value}D`;
    } else if (suit === 'bams') {
      // Bams: 1B, 2B, 3B, etc.
      tileId = `${value}B`;
    } else if (suit === 'cracks') {
      // Cracks: 1C, 2C, 3C, etc.
      tileId = `${value}C`;
    } else if (suit === 'winds') {
      // Wind tiles: east, south, west, north
      tileId = value; // value is already 'east', 'south', etc.
    } else if (suit === 'dragons') {
      // Dragon tiles: red, green, white
      tileId = value; // value is already 'red', 'green', 'white'
    } else if (suit === 'flowers') {
      // Flower tiles: f1, f2, f3, f4
      tileId = value; // value is already 'f1', 'f2', etc.
    } else if (suit === 'jokers') {
      // Joker tiles: joker
      tileId = 'joker';
    } else {
      // Fallback (shouldn't happen)
      console.warn(`Unknown suit "${suit}" for tile value "${value}"`);
      tileId = `${value}${suit}`;
    }
    
    return {
      id: tileId,
      suit: suit as 'bams' | 'cracks' | 'dots' | 'winds' | 'dragons' | 'flowers' | 'jokers',
      value: value as TileValue,
      isJoker: suit === 'jokers'
    };
  }

  /**
   * Convert all real NMJL 2025 patterns to HandPattern format
   */
  static getAllHandPatterns(): HandPattern[] {
    const nmjlPatterns = nmjl2025Loader.getAllPatterns();
    return nmjlPatterns.map(pattern => this.convertToHandPattern(pattern));
  }

  /**
   * Get patterns by difficulty using real data
   */
  static getPatternsByDifficulty(difficulty: 'easy' | 'medium' | 'hard'): HandPattern[] {
    const nmjlPatterns = nmjl2025Loader.getPatternsByDifficulty(difficulty);
    return nmjlPatterns.map(pattern => this.convertToHandPattern(pattern));
  }

  /**
   * Get patterns by point value using real data
   */
  static getPatternsByPoints(points: number): HandPattern[] {
    const nmjlPatterns = nmjl2025Loader.getPatternsByPoints(points);
    return nmjlPatterns.map(pattern => this.convertToHandPattern(pattern));
  }

  /**
   * Get a specific pattern by NMJL ID
   */
  static getPatternById(nmjlId: number): HandPattern | null {
    const nmjlPattern = nmjl2025Loader.getPatternById(nmjlId);
    return nmjlPattern ? this.convertToHandPattern(nmjlPattern) : null;
  }
}