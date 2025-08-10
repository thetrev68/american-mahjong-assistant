/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/src/utils/nmjl-pattern-analyzer.ts
// Advanced pattern analysis engine for NMJL hands
// This engine calculates probabilities, identifies missing tiles, and provides strategic advice

import type { Tile, HandPattern, PatternMatch } from '../types';
import { NMJL_RULES } from './nmjl-patterns-2025';
import { countTiles, groupTilesBySuit } from './tile-utils';
import { NMJLPatternAdapter } from './nmjl-pattern-adapter';

interface TileCount {
  [key: string]: number;
}

interface PatternAnalysisResult {
  completion: number;
  missingTiles: Tile[];
  blockedBy: Tile[];
  confidence: number;
  jokersNeeded: number;
  availableJokers: number;
  completionProbability: number;
  turnsEstimate: number;
  strategicValue: number;
}

/**
 * Advanced NMJL Pattern Analysis Engine
 */
export class NMJLPatternAnalyzer {
  
  /**
   * Analyze how well current hand matches a specific pattern
   */
  static analyzePattern(
    playerTiles: Tile[], 
    pattern: HandPattern,
    availableJokers: number = 0
  ): PatternAnalysisResult {
    
    const tileCount = this.countPlayerTiles(playerTiles);
    const requiredCount = this.countRequiredTiles(pattern.requiredTiles);
    
    // Calculate basic completion metrics
    let matchedTiles = 0;
    const totalRequired = pattern.requiredTiles.length;
    let jokersNeeded = 0;
    const missingTiles: Tile[] = [];
    const blockedBy: Tile[] = [];
    
    // Analyze each required tile
    for (const [tileId, requiredAmount] of Object.entries(requiredCount)) {
      const playerAmount = tileCount[tileId] || 0;
      const shortage = requiredAmount - playerAmount;
      
      if (shortage > 0) {
        // We're missing some of this tile
        const tile = pattern.requiredTiles.find(t => t.id === tileId)!;
        
        if (this.canUseJokerFor(tile, pattern)) {
          // Can substitute with jokers
          jokersNeeded += shortage;
          for (let i = 0; i < shortage; i++) {
            missingTiles.push(tile);
          }
        } else {
          // Must have actual tile (e.g., pairs in some patterns)
          for (let i = 0; i < shortage; i++) {
            missingTiles.push(tile);
          }
          // These tiles block the pattern if we can't use jokers
          blockedBy.push(...Array(shortage).fill(tile));
        }
      } else {
        matchedTiles += Math.min(playerAmount, requiredAmount);
      }
    }
    
    // Calculate completion percentage
    const completion = totalRequired > 0 ? matchedTiles / totalRequired : 0;
    
    // Calculate probability of completion
    const jokersAvailable = Math.min(availableJokers, jokersNeeded);
    const tilesStillNeeded = missingTiles.length - jokersAvailable;
    const completionProbability = this.calculateCompletionProbability(
      tilesStillNeeded,
      missingTiles,
      pattern
    );
    
    // Estimate turns to completion
    const turnsEstimate = this.estimateTurnsToComplete(
      tilesStillNeeded,
      missingTiles,
      pattern
    );
    
    // Calculate strategic value (considers points, difficulty, probability)
    const strategicValue = this.calculateStrategicValue(
      pattern,
      completion,
      completionProbability,
      jokersNeeded
    );
    
    // Calculate confidence based on multiple factors
    const confidence = this.calculateConfidence(
      completion,
      completionProbability,
      pattern,
      jokersNeeded,
      availableJokers
    );
    
    return {
      completion,
      missingTiles,
      blockedBy,
      confidence,
      jokersNeeded,
      availableJokers: jokersAvailable,
      completionProbability,
      turnsEstimate,
      strategicValue
    };
  }
  
  /**
   * Analyze all patterns and return best matches
   */
  static analyzeAllPatterns(
    playerTiles: Tile[],
    cardYear: number = 2025,
    maxResults: number = 5
  ): PatternMatch[] {
    
    const patterns = this.getPatternsByYear(cardYear);
    const availableJokers = playerTiles.filter(t => t.isJoker || t.suit === 'jokers').length;
    
    const results: PatternMatch[] = patterns.map(pattern => {
      const analysis = this.analyzePattern(playerTiles, pattern, availableJokers);
      
      return {
        pattern,
        completion: analysis.completion,
        missingTiles: analysis.missingTiles,
        blockedBy: analysis.blockedBy,
        confidence: analysis.confidence
      };
    });
    
    // Sort by strategic value (combination of completion, probability, points)
    return results
      .sort((a, b) => {
        // Primary sort: completion percentage
        if (Math.abs(a.completion - b.completion) > 0.1) {
          return b.completion - a.completion;
        }
        // Secondary sort: pattern points
        return b.pattern.points - a.pattern.points;
      })
      .slice(0, maxResults);
  }
  
  /**
   * Calculate probability of completing a pattern
   */
  private static calculateCompletionProbability(
    tilesNeeded: number,
    missingTiles: Tile[],
    pattern: HandPattern
  ): number {
    if (tilesNeeded <= 0) return 1.0;
    
    // Base probability calculation
    // Consider: remaining tiles in wall, duplicates available, game phase
    const uniqueMissingTiles = new Set(missingTiles.map(t => t.id)).size;
    const averageCopiesPerTile = 3; // Conservative estimate
    const wallTilesRemaining = 100; // Approximate
    
    const availableCopies = uniqueMissingTiles * averageCopiesPerTile;
    const drawProbability = Math.min(availableCopies / wallTilesRemaining, 0.9);
    
    // Adjust for pattern difficulty
    const difficultyMultiplier = {
      'easy': 0.9,
      'medium': 0.8,
      'hard': 0.6,
      'expert': 0.4
    }[pattern.difficulty] || 0.7;
    
    return Math.pow(drawProbability, tilesNeeded) * difficultyMultiplier;
  }
  
  /**
   * Estimate turns needed to complete pattern
   */
  private static estimateTurnsToComplete(
    tilesNeeded: number,
    missingTiles: Tile[],
    pattern: HandPattern
  ): number {
    if (tilesNeeded <= 0) return 0;
    
    // Base estimate: 2-3 turns per tile needed
    const baseTurns = tilesNeeded * 2.5;
    
    // Adjust for pattern complexity
    const complexityMultiplier = {
      'easy': 0.8,
      'medium': 1.0,
      'hard': 1.3,
      'expert': 1.6
    }[pattern.difficulty] || 1.0;
    
    return Math.ceil(baseTurns * complexityMultiplier);
  }
  
  /**
   * Calculate strategic value of pursuing a pattern
   */
  private static calculateStrategicValue(
    pattern: HandPattern,
    completion: number,
    probability: number,
    jokersNeeded: number
  ): number {
    // Base value from pattern points
    let value = pattern.points;
    
    // Multiply by completion and probability
    value *= completion * probability;
    
    // Penalize excessive joker usage (they're valuable)
    if (jokersNeeded > 2) {
      value *= Math.pow(0.8, jokersNeeded - 2);
    }
    
    // Bonus for nearly complete patterns
    if (completion > 0.8) {
      value *= 1.2;
    }
    
    return value;
  }
  
  /**
   * Calculate confidence in pattern recommendation
   */
  private static calculateConfidence(
    completion: number,
    probability: number,
    pattern: HandPattern,
    jokersNeeded: number,
    availableJokers: number
  ): number {
    let confidence = 0.5; // Base confidence
    
    // Boost confidence for high completion
    confidence += completion * 0.3;
    
    // Boost confidence for high probability
    confidence += probability * 0.2;
    
    // Reduce confidence for difficult patterns
    const difficultyPenalty = {
      'easy': 0,
      'medium': -0.05,
      'hard': -0.1,
      'expert': -0.15
    }[pattern.difficulty] || 0;
    confidence += difficultyPenalty;
    
    // Reduce confidence if we need more jokers than we have
    if (jokersNeeded > availableJokers) {
      confidence -= (jokersNeeded - availableJokers) * 0.1;
    }
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }
  
  /**
   * Check if joker can be used for specific tile in pattern
   */
  private static canUseJokerFor(tile: Tile, pattern: HandPattern): boolean {
    // Jokers generally cannot be used in pairs
    if (NMJL_RULES.jokersInPairs === false) {
      // This would require pattern-specific logic to determine if tile is part of a pair
      // For now, assume most tiles can use jokers except specific cases
    }
    
    // Jokers cannot be flowers in most cases
    if (tile.suit === 'flowers' && NMJL_RULES.jokerRestrictions.cannotBeFlowers) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Count tiles in player's hand
   */
  private static countPlayerTiles(tiles: Tile[]): TileCount {
    const count: TileCount = {};
    tiles.forEach(tile => {
      count[tile.id] = (count[tile.id] || 0) + 1;
    });
    return count;
  }
  
  /**
   * Count required tiles in pattern
   */
  private static countRequiredTiles(tiles: Tile[]): TileCount {
    const count: TileCount = {};
    tiles.forEach(tile => {
      count[tile.id] = (count[tile.id] || 0) + 1;
    });
    return count;
  }
  
  /**
   * Get patterns for specific year using real NMJL 2025 data
   */
  private static getPatternsByYear(year: number): HandPattern[] {
    switch (year) {
      case 2025:
        return NMJLPatternAdapter.getAllHandPatterns();
      default:
        return NMJLPatternAdapter.getAllHandPatterns();
    }
  }
  
  /**
   * Identify which tiles are most valuable to keep for a specific pattern
   */
  static identifyKeepTiles(
    playerTiles: Tile[],
    pattern: HandPattern
  ): Tile[] {
    const keepTiles: Tile[] = [];
    const requiredCount = this.countRequiredTiles(pattern.requiredTiles);
    
    // Keep tiles that match the pattern requirements
    playerTiles.forEach(tile => {
      if (requiredCount[tile.id] > 0) {
        keepTiles.push(tile);
        requiredCount[tile.id]--;
      }
    });
    
    return keepTiles;
  }
  
  /**
   * Identify which tiles are safe to discard for a specific pattern
   */
  static identifyDiscardTiles(
    playerTiles: Tile[],
    pattern: HandPattern,
    keepTiles: Tile[]
  ): Tile[] {
    const keepTileIds = new Set(keepTiles.map(t => t.id));
    
    return playerTiles.filter(tile => !keepTileIds.has(tile.id));
  }
}