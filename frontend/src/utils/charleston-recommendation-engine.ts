/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/src/utils/charleston-recommendation-engine.ts
// Advanced Charleston recommendation engine using NMJL pattern analysis
// Provides sophisticated keep/discard recommendations for 3-tile Charleston passes

import type { Tile, CharlestonPhase } from '../types';
import { NMJLPatternAnalyzer } from './nmjl-pattern-analyzer';
// NMJL patterns imported in pattern analyzer
// import { NMJL_2025_PATTERNS } from './nmjl-patterns-2025';

interface CharlestonRecommendation {
  tilesToPass: Tile[];
  tilesToKeep: Tile[];
  confidence: number;
  reasoning: string[];
  alternativeOptions: Array<{
    tilesToPass: Tile[];
    score: number;
    reasoning: string;
  }>;
  strategicAdvice: string[];
}

interface TileValue {
  tile: Tile;
  keepValue: number;
  passValue: number;
  reasoning: string[];
}

/**
 * Advanced Charleston Recommendation Engine
 * Uses pattern analysis to make optimal 3-tile passing decisions
 */
export class CharlestonRecommendationEngine {
  
  /**
   * Generate comprehensive Charleston recommendations
   */
  static generateRecommendations(
    playerTiles: Tile[],
    phase: CharlestonPhase,
    cardYear: number = 2025,
    playerCount: number = 4
  ): CharlestonRecommendation {
    
    // Step 1: Analyze current hand against all patterns
    const patternAnalyses = NMJLPatternAnalyzer.analyzeAllPatterns(playerTiles, cardYear, 10);
    const topPatterns = patternAnalyses.slice(0, 3); // Focus on top 3 patterns
    
    // Step 2: Evaluate each tile's strategic value
    const tileValues = this.evaluateAllTiles(playerTiles, topPatterns, phase);
    
    // Step 3: Generate optimal 3-tile combinations to pass
    const passOptions = this.generatePassCombinations(tileValues, playerTiles);
    
    // Step 4: Select best option
    const bestOption = passOptions[0];
    const tilesToPass = bestOption.tilesToPass;
    const tilesToKeep = playerTiles.filter(tile => 
      !tilesToPass.some(passedTile => passedTile.id === tile.id)
    );
    
    // Step 5: Generate strategic advice
    const strategicAdvice = this.generateStrategicAdvice(
      playerTiles, 
      tilesToPass, 
      topPatterns, 
      phase,
      playerCount
    );
    
    // Step 6: Calculate confidence
    const confidence = this.calculateOverallConfidence(bestOption, topPatterns);
    
    return {
      tilesToPass,
      tilesToKeep,
      confidence,
      reasoning: bestOption.reasoning.split('. '),
      alternativeOptions: passOptions.slice(1, 3), // Next 2 best options
      strategicAdvice
    };
  }
  
  /**
   * Evaluate strategic value of each tile
   */
  private static evaluateAllTiles(
    playerTiles: Tile[],
    topPatterns: Array<{ pattern: unknown; completion: number; confidence: number }>,
    phase: CharlestonPhase
  ): TileValue[] {
    
    return playerTiles.map(tile => {
      const reasoning: string[] = [];
      let keepValue = 0;
      let passValue = 0;
      
      // Evaluate tile against each top pattern
      topPatterns.forEach((patternMatch, index) => {
        const pattern = patternMatch.pattern;
        const weight = (3 - index) / 3; // Weight top patterns more heavily
        
        // Check if tile is required for this pattern
        const isRequired = (pattern as any)?.requiredTiles?.some((req: Tile) => req.id === tile.id) || false;
        
        if (isRequired) {
          const requiredCount = (pattern as any)?.requiredTiles?.filter((req: Tile) => req.id === tile.id)?.length || 0;
          const playerCount = playerTiles.filter(t => t.id === tile.id).length;
          
          if (playerCount <= requiredCount) {
            // We need this tile for the pattern
            keepValue += 10 * weight * patternMatch.confidence;
            reasoning.push(`Required for ${(pattern as any)?.name || 'pattern'} (${Math.round(patternMatch.completion * 100)}% complete)`);
          } else {
            // We have extras of this tile
            passValue += 3 * weight;
            reasoning.push(`Extra copy beyond ${(pattern as any)?.name || 'pattern'} requirements`);
          }
        } else {
          // Tile is not needed for this pattern
          passValue += 2 * weight;
        }
      });
      
      // Special considerations for different tile types
      const tileTypeModifiers = this.evaluateTileTypeValue(tile, playerTiles, phase);
      keepValue += tileTypeModifiers.keepBonus;
      passValue += tileTypeModifiers.passBonus;
      reasoning.push(...tileTypeModifiers.reasoning);
      
      return {
        tile,
        keepValue,
        passValue,
        reasoning
      };
    });
  }
  
  /**
   * Evaluate tile based on its type (joker, wind, dragon, number)
   */
  private static evaluateTileTypeValue(
    tile: Tile,
    playerTiles: Tile[],
    phase: CharlestonPhase
  ): { keepBonus: number; passBonus: number; reasoning: string[] } {
    
    const reasoning: string[] = [];
    let keepBonus = 0;
    let passBonus = 0;
    
    // Jokers - extremely valuable, almost never pass
    if (tile.isJoker || tile.suit === 'jokers') {
      keepBonus += 20;
      reasoning.push('Jokers are extremely versatile - keep unless you have 4+');
      
      const jokerCount = playerTiles.filter(t => t.isJoker || t.suit === 'jokers').length;
      if (jokerCount > 3) {
        keepBonus -= 5; // Slight reduction if we have many jokers
        passBonus += 2;
        reasoning.push('Have multiple jokers - could pass one');
      }
    }
    
    // Flowers - generally less useful, good candidates to pass
    else if (tile.suit === 'flowers') {
      passBonus += 3;
      reasoning.push('Flowers have limited use in most patterns');
    }
    
    // Winds and Dragons
    else if (tile.suit === 'winds' || tile.suit === 'dragons') {
      const sameTypeTiles = playerTiles.filter(t => t.suit === tile.suit && t.value === tile.value);
      
      if (sameTypeTiles.length >= 3) {
        keepBonus += 5;
        reasoning.push(`Have ${sameTypeTiles.length} ${tile.value} - potential pung/kong`);
      } else if (sameTypeTiles.length === 1) {
        passBonus += 4;
        reasoning.push(`Isolated ${tile.value} - difficult to complete set`);
      }
    }
    
    // Number tiles (dots, bams, cracks)
    else if (['dots', 'bams', 'cracks'].includes(tile.suit)) {
      const adjacentValues = this.findAdjacentNumbers(tile, playerTiles);
      
      if (adjacentValues.length > 0) {
        keepBonus += 3;
        reasoning.push(`Part of potential sequence with ${adjacentValues.join(', ')}`);
      }
      
      // Consider same-number across suits (like numbers patterns)
      const sameNumberDifferentSuits = playerTiles.filter(t => 
        t.value === tile.value && t.suit !== tile.suit && 
        ['dots', 'bams', 'cracks'].includes(t.suit)
      );
      
      if (sameNumberDifferentSuits.length >= 2) {
        keepBonus += 4;
        reasoning.push(`${tile.value} appears in multiple suits - good for Like Numbers`);
      }
    }
    
    // Phase-specific considerations
    if (phase === 'right') {
      // Early Charleston - be more conservative
      keepBonus *= 1.1;
      reasoning.push('Early Charleston phase - prioritize versatile tiles');
    } else if (phase === 'optional') {
      // Late Charleston - can be more aggressive
      passBonus *= 1.2;
      reasoning.push('Late Charleston - can be more selective');
    }
    
    return { keepBonus, passBonus, reasoning };
  }
  
  /**
   * Find adjacent number tiles for sequence potential
   */
  private static findAdjacentNumbers(tile: Tile, playerTiles: Tile[]): string[] {
    if (!['dots', 'bams', 'cracks'].includes(tile.suit)) return [];
    
    const tileNumber = parseInt(tile.value);
    if (isNaN(tileNumber)) return [];
    
    const adjacent: string[] = [];
    const sameSuitTiles = playerTiles.filter(t => t.suit === tile.suit);
    
    // Check for adjacent numbers
    [tileNumber - 1, tileNumber + 1].forEach(adjNum => {
      if (adjNum >= 1 && adjNum <= 9) {
        const adjTile = sameSuitTiles.find(t => t.value === adjNum.toString());
        if (adjTile) {
          adjacent.push(`${adjNum}${tile.suit}`);
        }
      }
    });
    
    return adjacent;
  }
  
  /**
   * Generate optimal 3-tile pass combinations
   */
  private static generatePassCombinations(
    tileValues: TileValue[],
    playerTiles: Tile[]
  ): Array<{ tilesToPass: Tile[]; score: number; reasoning: string }> {
    
    const combinations: Array<{ tilesToPass: Tile[]; score: number; reasoning: string }> = [];
    
    // Sort tiles by pass value (highest first)
    const sortedForPassing = [...tileValues].sort((a, b) => b.passValue - a.passValue);
    
    // Generate combinations of 3 tiles to pass
    for (let i = 0; i < Math.min(sortedForPassing.length - 2, 10); i++) {
      for (let j = i + 1; j < Math.min(sortedForPassing.length - 1, 10); j++) {
        for (let k = j + 1; k < Math.min(sortedForPassing.length, 10); k++) {
          const tile1 = sortedForPassing[i];
          const tile2 = sortedForPassing[j];
          const tile3 = sortedForPassing[k];
          
          const tilesToPass = [tile1.tile, tile2.tile, tile3.tile];
          const score = tile1.passValue + tile2.passValue + tile3.passValue;
          
          // Penalize passing tiles we really need
          const keepPenalty = (tile1.keepValue + tile2.keepValue + tile3.keepValue) * 0.3;
          const finalScore = score - keepPenalty;
          
          const reasoning = [
            `Pass ${tile1.tile.id}: ${tile1.reasoning[0] || 'Low strategic value'}`,
            `Pass ${tile2.tile.id}: ${tile2.reasoning[0] || 'Low strategic value'}`,
            `Pass ${tile3.tile.id}: ${tile3.reasoning[0] || 'Low strategic value'}`
          ].join('. ');
          
          combinations.push({
            tilesToPass,
            score: finalScore,
            reasoning
          });
        }
      }
    }
    
    // Sort by score and return top options
    return combinations
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }
  
  /**
   * Generate strategic advice for Charleston phase
   */
  private static generateStrategicAdvice(
    playerTiles: Tile[],
    tilesToPass: Tile[],
    topPatterns: Array<{ pattern: unknown; completion: number; confidence: number }>,
    phase: CharlestonPhase,
    playerCount: number
  ): string[] {
    
    const advice: string[] = [];
    
    // Pattern-specific advice
    const bestPattern = topPatterns[0];
    if (bestPattern && bestPattern.completion > 0.3) {
      advice.push(`Focus on completing ${(bestPattern.pattern as any)?.name || 'pattern'} (${(bestPattern.completion * 100).toFixed(0)}% complete, ${(bestPattern.pattern as any)?.points || 25} points)`);
    }
    
    // Phase-specific advice
    switch (phase) {
      case 'right':
        advice.push('Early Charleston: Pass tiles that don\'t fit multiple patterns');
        break;
      case 'across':
        if (playerCount === 3) {
          advice.push('3-player game: This across pass is skipped automatically');
        } else {
          advice.push('Mid Charleston: Start focusing on your strongest pattern');
        }
        break;
      case 'left':
        advice.push('Late Charleston: Keep tiles essential for your target pattern');
        break;
      case 'optional':
        advice.push('Optional pass: Only participate if it significantly helps your hand');
        break;
    }
    
    // Joker advice
    const jokerCount = playerTiles.filter(t => t.isJoker || t.suit === 'jokers').length;
    if (jokerCount === 0) {
      advice.push('No jokers: Focus on patterns with exact tiles you have');
    } else if (jokerCount >= 3) {
      advice.push(`${jokerCount} jokers: You have flexibility - consider challenging patterns`);
    }
    
    // Tile composition advice
    const suits = ['dots', 'bams', 'cracks', 'winds', 'dragons', 'flowers'];
    const suitCounts = suits.map(suit => ({
      suit,
      count: playerTiles.filter(t => t.suit === suit).length
    }));
    
    const dominantSuit = suitCounts.reduce((max, curr) => curr.count > max.count ? curr : max);
    if (dominantSuit.count >= 6) {
      advice.push(`Strong in ${dominantSuit.suit}: Consider patterns emphasizing this suit`);
    }
    
    return advice;
  }
  
  /**
   * Calculate overall confidence in recommendation
   */
  private static calculateOverallConfidence(
    bestOption: { score: number; reasoning: string },
    topPatterns: Array<{ confidence: number }>
  ): number {
    
    // Base confidence from option score
    let confidence = Math.min(bestOption.score / 20, 0.8);
    
    // Boost confidence if we have strong pattern matches
    const avgPatternConfidence = topPatterns.reduce((sum, p) => sum + p.confidence, 0) / topPatterns.length;
    confidence += avgPatternConfidence * 0.2;
    
    // Ensure confidence is in valid range
    return Math.max(0.3, Math.min(0.95, confidence));
  }
}