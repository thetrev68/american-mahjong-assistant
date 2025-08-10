/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/src/utils/charleston-recommendation-engine.ts
// Advanced Charleston recommendation engine using NMJL pattern analysis
// Provides sophisticated keep/discard recommendations for 3-tile Charleston passes

import type { Tile, CharlestonPhase } from '../types';
import { NMJLPatternAnalyzer } from './nmjl-pattern-analyzer';
import { NMJLPatternAdapter } from './nmjl-pattern-adapter';
import { nmjl2025Loader } from './nmjl-2025-loader';

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
   * Generate comprehensive Charleston recommendations using real NMJL 2025 data
   */
  static generateRecommendations(
    playerTiles: Tile[],
    phase: CharlestonPhase,
    cardYear: number = 2025,
    playerCount: number = 4
  ): CharlestonRecommendation {
    
    // Step 1: Analyze current hand against all real NMJL 2025 patterns
    const patternAnalyses = NMJLPatternAnalyzer.analyzeAllPatterns(playerTiles, cardYear, 15);
    const topPatterns = patternAnalyses.slice(0, 5); // Analyze top 5 patterns for better depth
    
    // Step 2: Get pattern-specific insights from real NMJL data
    const patternInsights = this.analyzePatternRequirements(playerTiles, topPatterns);
    
    // Step 3: Evaluate each tile's strategic value using real pattern data
    const tileValues = this.evaluateAllTilesWithRealPatterns(playerTiles, topPatterns, patternInsights, phase);
    
    // Step 4: Generate optimal 3-tile combinations with pattern awareness
    const passOptions = this.generatePatternAwarePassCombinations(tileValues, playerTiles, patternInsights);
    
    // Step 5: Select best option
    const bestOption = passOptions[0] || {
      tilesToPass: this.getDefaultPass(playerTiles),
      score: 0,
      reasoning: 'Default safe pass - no clear pattern direction'
    };
    
    const tilesToPass = bestOption.tilesToPass;
    const tilesToKeep = playerTiles.filter(tile => 
      !tilesToPass.some(passedTile => passedTile.id === tile.id)
    );
    
    // Step 6: Generate advanced strategic advice using real pattern data
    const strategicAdvice = this.generateAdvancedStrategicAdvice(
      playerTiles, 
      tilesToPass, 
      topPatterns,
      patternInsights,
      phase,
      playerCount
    );
    
    // Step 7: Calculate confidence based on real pattern match quality
    const confidence = this.calculateAdvancedConfidence(bestOption, topPatterns, patternInsights);
    
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
   * Analyze pattern requirements using real NMJL 2025 data
   */
  private static analyzePatternRequirements(
    playerTiles: Tile[],
    topPatterns: Array<{ pattern: any; completion: number; confidence: number }>
  ) {
    const insights = {
      criticalTiles: new Set<string>(), // Tiles essential across multiple patterns
      flexibleTiles: new Set<string>(), // Tiles useful in multiple patterns
      isolatedTiles: new Set<string>(), // Tiles not useful in any top patterns
      jokerSubstitutions: new Map<string, number>(), // How many jokers needed per pattern
      patternCategories: new Map<string, string[]>() // Group patterns by type for strategy
    };

    // Analyze each top pattern for insights
    topPatterns.forEach((patternMatch, index) => {
      const pattern = patternMatch.pattern;
      const weight = Math.max(1, 5 - index); // Give more weight to better patterns
      
      if (pattern?.requiredTiles) {
        // Count tile requirements
        const tileRequirements = new Map<string, number>();
        pattern.requiredTiles.forEach((tile: Tile) => {
          tileRequirements.set(tile.id, (tileRequirements.get(tile.id) || 0) + 1);
        });
        
        // Identify critical vs flexible tiles
        tileRequirements.forEach((needed, tileId) => {
          const playerCount = playerTiles.filter(t => t.id === tileId).length;
          
          if (needed > playerCount) {
            // We need more of this tile
            if (weight >= 3) {
              insights.criticalTiles.add(tileId);
            } else {
              insights.flexibleTiles.add(tileId);
            }
          }
        });
        
        // Categorize pattern types for strategic insights
        const patternName = pattern.name?.toLowerCase() || '';
        let category = 'mixed';
        if (patternName.includes('like') || patternName.includes('number')) {
          category = 'like_numbers';
        } else if (patternName.includes('wind') || patternName.includes('dragon')) {
          category = 'honors';
        } else if (patternName.includes('2025') || patternName.includes('year')) {
          category = 'year_hands';
        } else if (patternName.includes('consecutive') || patternName.includes('run')) {
          category = 'sequences';
        }
        
        if (!insights.patternCategories.has(category)) {
          insights.patternCategories.set(category, []);
        }
        insights.patternCategories.get(category)!.push(pattern.description || pattern.name);
      }
    });

    // Identify isolated tiles (not needed by any top pattern)
    playerTiles.forEach(tile => {
      if (!insights.criticalTiles.has(tile.id) && !insights.flexibleTiles.has(tile.id)) {
        insights.isolatedTiles.add(tile.id);
      }
    });

    return insights;
  }

  /**
   * Enhanced tile evaluation using real NMJL pattern data
   */
  private static evaluateAllTilesWithRealPatterns(
    playerTiles: Tile[],
    topPatterns: Array<{ pattern: any; completion: number; confidence: number }>,
    patternInsights: any,
    phase: CharlestonPhase
  ): TileValue[] {
    
    return playerTiles.map(tile => {
      const reasoning: string[] = [];
      let keepValue = 0;
      let passValue = 0;
      
      // Enhanced pattern-based evaluation using insights
      if (patternInsights.criticalTiles.has(tile.id)) {
        keepValue += 15;
        reasoning.push(`Critical tile needed for top pattern completion`);
      } else if (patternInsights.flexibleTiles.has(tile.id)) {
        keepValue += 8;
        reasoning.push(`Useful for secondary pattern options`);
      } else if (patternInsights.isolatedTiles.has(tile.id)) {
        passValue += 6;
        reasoning.push(`Not needed for any viable patterns - good to pass`);
      }
      
      // Evaluate tile against each top pattern with more nuance
      topPatterns.forEach((patternMatch, index) => {
        const pattern = patternMatch.pattern;
        const weight = Math.max(0.2, (5 - index) / 5); // Better weight distribution
        
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

  /**
   * Generate pattern-aware pass combinations
   */
  private static generatePatternAwarePassCombinations(
    tileValues: TileValue[],
    playerTiles: Tile[],
    patternInsights: any
  ): Array<{ tilesToPass: Tile[]; score: number; reasoning: string }> {
    
    const combinations: Array<{ tilesToPass: Tile[]; score: number; reasoning: string }> = [];
    
    // Prioritize isolated tiles first
    const isolatedTiles = tileValues.filter(tv => patternInsights.isolatedTiles.has(tv.tile.id));
    const flexibleTiles = tileValues.filter(tv => patternInsights.flexibleTiles.has(tv.tile.id));
    const criticalTiles = tileValues.filter(tv => patternInsights.criticalTiles.has(tv.tile.id));
    
    // Strategy 1: Pass 3 isolated tiles (safest)
    if (isolatedTiles.length >= 3) {
      const topIsolated = isolatedTiles
        .sort((a, b) => b.passValue - a.passValue)
        .slice(0, 3);
      
      combinations.push({
        tilesToPass: topIsolated.map(tv => tv.tile),
        score: 20 + topIsolated.reduce((sum, tv) => sum + tv.passValue, 0),
        reasoning: `Pass isolated tiles: ${topIsolated.map(tv => tv.tile.id).join(', ')} - not needed for any viable patterns`
      });
    }
    
    // Strategy 2: Mix isolated + flexible (balanced approach)
    if (isolatedTiles.length >= 2 && flexibleTiles.length >= 1) {
      const topIsolatedMix = isolatedTiles.sort((a, b) => b.passValue - a.passValue).slice(0, 2);
      const topFlexibleMix = flexibleTiles.sort((a, b) => b.passValue - a.passValue).slice(0, 1);
      const mixedPass = [...topIsolatedMix, ...topFlexibleMix];
      
      combinations.push({
        tilesToPass: mixedPass.map(tv => tv.tile),
        score: 15 + mixedPass.reduce((sum, tv) => sum + tv.passValue, 0),
        reasoning: `Mixed pass: ${mixedPass.map(tv => tv.tile.id).join(', ')} - balance safety with potential`
      });
    }
    
    // Strategy 3: All flexible (strategic)
    if (flexibleTiles.length >= 3) {
      const topFlexible = flexibleTiles
        .sort((a, b) => b.passValue - a.passValue)
        .slice(0, 3);
      
      combinations.push({
        tilesToPass: topFlexible.map(tv => tv.tile),
        score: 12 + topFlexible.reduce((sum, tv) => sum + tv.passValue, 0),
        reasoning: `Strategic pass: ${topFlexible.map(tv => tv.tile.id).join(', ')} - focus on strongest pattern`
      });
    }
    
    // Fallback: Use original combination logic if no clear strategic options
    if (combinations.length === 0) {
      return this.generatePassCombinations(tileValues, playerTiles);
    }
    
    // Sort by score and return top options
    return combinations
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  /**
   * Generate advanced strategic advice with real pattern insights
   */
  private static generateAdvancedStrategicAdvice(
    playerTiles: Tile[],
    tilesToPass: Tile[],
    topPatterns: Array<{ pattern: any; completion: number; confidence: number }>,
    patternInsights: any,
    phase: CharlestonPhase,
    playerCount: number
  ): string[] {
    
    const advice: string[] = [];
    
    // Pattern category insights
    const categories = Array.from(patternInsights.patternCategories.keys());
    if (categories.length > 0) {
      const dominantCategory = categories[0];
      switch (dominantCategory) {
        case 'like_numbers':
          advice.push('Focus on Like Numbers patterns - collect same numbers across different suits');
          break;
        case 'honors':
          advice.push('Honor tiles (winds/dragons) strategy - prioritize complete pungs/kongs');
          break;
        case 'year_hands':
          advice.push('2025 Year patterns available - look for 2s, 0s, and 5s combinations');
          break;
        case 'sequences':
          advice.push('Sequential patterns viable - maintain consecutive number runs');
          break;
      }
    }
    
    // Critical tile count advice
    const criticalCount = patternInsights.criticalTiles.size;
    if (criticalCount > 8) {
      advice.push(`${criticalCount} critical tiles identified - be very selective in Charleston`);
    } else if (criticalCount < 3) {
      advice.push('Few critical tiles - you have flexibility to adapt strategies');
    }
    
    // Pattern-specific strategic advice
    const bestPattern = topPatterns[0];
    if (bestPattern && bestPattern.completion > 0.4) {
      const pattern = bestPattern.pattern;
      advice.push(`Strong ${pattern.name} potential (${(bestPattern.completion * 100).toFixed(0)}% complete, ${pattern.points} pts) - prioritize completing this pattern`);
      
      // Add pattern difficulty context
      if (pattern.difficulty === 'hard') {
        advice.push('Attempting challenging pattern - ensure you have joker support');
      } else if (pattern.difficulty === 'easy') {
        advice.push('Good foundation for reliable pattern completion');
      }
    }
    
    // Add the original strategic advice for additional context
    const originalAdvice = this.generateStrategicAdvice(playerTiles, tilesToPass, topPatterns, phase, playerCount);
    advice.push(...originalAdvice);
    
    return advice;
  }

  /**
   * Calculate advanced confidence using pattern insights
   */
  private static calculateAdvancedConfidence(
    bestOption: { score: number; reasoning: string },
    topPatterns: Array<{ pattern: any; completion: number; confidence: number }>,
    patternInsights: any
  ): number {
    
    let confidence = 0.5; // Base confidence
    
    // Boost confidence for good option scores
    confidence += Math.min(bestOption.score / 30, 0.3);
    
    // Boost confidence for strong pattern matches
    const topPattern = topPatterns[0];
    if (topPattern) {
      confidence += topPattern.completion * 0.2;
      confidence += topPattern.confidence * 0.15;
    }
    
    // Boost confidence when we have clear strategic direction
    const criticalTileCount = patternInsights.criticalTiles.size;
    const isolatedTileCount = patternInsights.isolatedTiles.size;
    
    if (isolatedTileCount >= 3) {
      confidence += 0.1; // Clear tiles to pass
    }
    
    if (criticalTileCount >= 5) {
      confidence += 0.1; // Clear pattern direction
    }
    
    // Reduce confidence for unclear situations
    if (criticalTileCount === 0 && isolatedTileCount === 0) {
      confidence -= 0.15; // No clear direction
    }
    
    // Ensure confidence is in valid range
    return Math.max(0.3, Math.min(0.95, confidence));
  }

  /**
   * Get default safe pass when no patterns are viable
   */
  private static getDefaultPass(playerTiles: Tile[]): Tile[] {
    // Default to passing flowers, isolated winds/dragons, and single tiles
    const candidates = playerTiles.filter(tile => {
      if (tile.suit === 'flowers') return true;
      if (tile.suit === 'winds' || tile.suit === 'dragons') {
        const sameType = playerTiles.filter(t => t.suit === tile.suit && t.value === tile.value);
        return sameType.length === 1; // Only isolated honor tiles
      }
      return false;
    });
    
    // If not enough, add some number tiles
    while (candidates.length < 3 && candidates.length < playerTiles.length) {
      const remaining = playerTiles.filter(tile => !candidates.includes(tile));
      if (remaining.length > 0) {
        candidates.push(remaining[0]);
      } else {
        break;
      }
    }
    
    return candidates.slice(0, 3);
  }
}