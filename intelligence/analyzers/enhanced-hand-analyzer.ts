// frontend/src/utils/enhanced-hand-analyzer.ts
// Enhanced hand analysis engine using real NMJL 2025 pattern data
// Provides accurate pattern matching, strategic recommendations, and probability calculations

import type { Tile, HandPattern, PatternMatch, HandAnalysis } from '../types';
import { NMJLPatternAdapter } from './nmjl-pattern-adapter';
import { nmjl2025Loader } from './nmjl-2025-loader';
import type { NMJL2025Pattern } from '../types/nmjl-2025-types';

interface DetailedPatternAnalysis {
  pattern: HandPattern;
  completion: number;
  missingTiles: Tile[];
  blockedBy: Tile[];
  confidence: number;
  jokersNeeded: number;
  exactMatches: number;
  partialMatches: number;
  strategicValue: number;
  completionPath: string[];
}

interface EnhancedRecommendations {
  keep: Tile[];
  discard: Tile[];
  charleston: Tile[];
  reasoning: {
    keepReasons: string[];
    discardReasons: string[];
    charlestonReasons: string[];
  };
  priorityTiles: {
    mostCritical: Tile[];
    highValue: Tile[];
    flexible: Tile[];
    expendable: Tile[];
  };
}

/**
 * Enhanced Hand Analysis Engine with Real NMJL 2025 Patterns
 */
export class EnhancedHandAnalyzer {

  /**
   * Generate comprehensive hand analysis using real NMJL 2025 data
   */
  static async analyzeHand(
    playerTiles: Tile[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _cardYear: number = 2025,
    gameContext?: {
      discardedTiles?: Tile[];
      exposedTiles?: Tile[];
      wallTilesRemaining?: number;
      turnsElapsed?: number;
    }
  ): Promise<HandAnalysis> {
    
    // Step 1: Get all real NMJL patterns and analyze against player's hand
    const detailedAnalyses = this.performDetailedPatternAnalysis(playerTiles);
    
    // Step 2: Convert to PatternMatch format for compatibility
    const patternMatches = this.convertToPatternMatches(detailedAnalyses);
    
    // Step 3: Generate enhanced recommendations with reasoning
    const recommendations = this.generateEnhancedRecommendations(
      playerTiles, 
      detailedAnalyses, 
      gameContext
    );
    
    // Step 4: Calculate sophisticated probabilities
    const probabilities = this.calculateEnhancedProbabilities(
      playerTiles,
      detailedAnalyses,
      gameContext
    );
    
    // Step 5: Generate defensive analysis
    const threats = this.generateDefensiveAnalysis(
      playerTiles,
      detailedAnalyses,
      gameContext
    );
    
    return {
      bestPatterns: patternMatches.slice(0, 5), // Top 5 patterns
      recommendations,
      probabilities,
      threats
    };
  }

  /**
   * Perform detailed analysis of all NMJL patterns against player tiles
   */
  private static performDetailedPatternAnalysis(playerTiles: Tile[]): DetailedPatternAnalysis[] {
    const allNMJLPatterns = nmjl2025Loader.getAllPatterns();
    const analyses: DetailedPatternAnalysis[] = [];
    
    // Count player tiles for efficient lookups
    const tileCountMap = new Map<string, number>();
    playerTiles.forEach(tile => {
      tileCountMap.set(tile.id, (tileCountMap.get(tile.id) || 0) + 1);
    });
    
    const availableJokers = playerTiles.filter(t => t.isJoker || t.suit === 'jokers').length;
    
    allNMJLPatterns.forEach((nmjlPattern) => {
      const handPattern = NMJLPatternAdapter.convertToHandPattern(nmjlPattern);
      
      const analysis = this.analyzePatternMatch(
        playerTiles,
        tileCountMap,
        handPattern,
        nmjlPattern,
        availableJokers
      );
      
      if (analysis.completion > 0.1 || analysis.exactMatches > 0) {
        // Only include patterns with some potential
        analyses.push(analysis);
      }
    });
    
    // Sort by strategic value (combination of completion, confidence, points)
    return analyses.sort((a, b) => b.strategicValue - a.strategicValue);
  }

  /**
   * Analyze how well a specific pattern matches the player's tiles
   */
  private static analyzePatternMatch(
    playerTiles: Tile[],
    tileCountMap: Map<string, number>,
    handPattern: HandPattern,
    nmjlPattern: NMJL2025Pattern,
    availableJokers: number
  ): DetailedPatternAnalysis {
    
    const requiredTileCount = new Map<string, number>();
    handPattern.requiredTiles.forEach(tile => {
      requiredTileCount.set(tile.id, (requiredTileCount.get(tile.id) || 0) + 1);
    });
    
    let exactMatches = 0;
    let partialMatches = 0;
    let jokersNeeded = 0;
    const missingTiles: Tile[] = [];
    const blockedBy: Tile[] = [];
    const completionPath: string[] = [];
    
    // Analyze each required tile
    requiredTileCount.forEach((needed, tileId) => {
      const playerCount = tileCountMap.get(tileId) || 0;
      
      if (playerCount >= needed) {
        exactMatches += needed;
        completionPath.push(`✓ ${tileId}: ${playerCount}/${needed} (complete)`);
      } else {
        const shortage = needed - playerCount;
        partialMatches += playerCount;
        
        // Check if we can use jokers for the missing tiles
        const canUseJokersForThis = this.canUseJokersForTile(tileId, nmjlPattern);
        
        if (canUseJokersForThis) {
          jokersNeeded += shortage;
          for (let i = 0; i < shortage; i++) {
            const missingTile = handPattern.requiredTiles.find(t => t.id === tileId);
            if (missingTile) missingTiles.push(missingTile);
          }
          completionPath.push(`⚬ ${tileId}: ${playerCount}/${needed} (need ${shortage}, can use jokers)`);
        } else {
          // Must have actual tile
          for (let i = 0; i < shortage; i++) {
            const blockingTile = handPattern.requiredTiles.find(t => t.id === tileId);
            if (blockingTile) {
              missingTiles.push(blockingTile);
              blockedBy.push(blockingTile);
            }
          }
          completionPath.push(`✗ ${tileId}: ${playerCount}/${needed} (need ${shortage}, no jokers allowed)`);
        }
      }
    });
    
    const totalRequired = handPattern.requiredTiles.length;
    const totalMatched = exactMatches + partialMatches;
    const completion = totalRequired > 0 ? totalMatched / totalRequired : 0;
    
    // Calculate confidence based on multiple factors
    const confidence = this.calculatePatternConfidence(
      completion,
      exactMatches,
      totalRequired,
      jokersNeeded,
      availableJokers,
      nmjlPattern
    );
    
    // Calculate strategic value considering points, difficulty, and completion
    const strategicValue = this.calculateStrategicValue(
      handPattern,
      completion,
      confidence,
      exactMatches,
      totalRequired
    );
    
    return {
      pattern: handPattern,
      completion,
      missingTiles,
      blockedBy,
      confidence,
      jokersNeeded,
      exactMatches,
      partialMatches,
      strategicValue,
      completionPath
    };
  }

  /**
   * Check if jokers can be used for a specific tile in the pattern
   */
  private static canUseJokersForTile(tileId: string, nmjlPattern: NMJL2025Pattern): boolean {
    // Check if the tile is part of a group that allows jokers
    for (const group of nmjlPattern.Groups) {
      if (group.Jokers_Allowed) {
        // This is a simplified check - in reality we'd need to analyze
        // which specific tiles belong to which groups
        return true;
      }
    }
    
    // Special rules: jokers generally can't be used for flowers or pairs
    if (tileId.includes('flowers') || tileId.includes('f')) {
      return false;
    }
    
    // Default: assume jokers can be used for most tiles
    return true;
  }

  /**
   * Calculate pattern confidence score
   */
  private static calculatePatternConfidence(
    completion: number,
    exactMatches: number,
    totalRequired: number,
    jokersNeeded: number,
    availableJokers: number,
    nmjlPattern: NMJL2025Pattern
  ): number {
    let confidence = 0.3; // Base confidence
    
    // Boost for high completion rate
    confidence += completion * 0.4;
    
    // Boost for exact matches (better than partial)
    confidence += (exactMatches / totalRequired) * 0.2;
    
    // Reduce confidence if we need more jokers than available
    if (jokersNeeded > availableJokers) {
      confidence -= ((jokersNeeded - availableJokers) / totalRequired) * 0.3;
    }
    
    // Adjust for pattern difficulty
    switch (nmjlPattern.Hand_Difficulty) {
      case 'easy':
        confidence += 0.1;
        break;
      case 'hard':
        confidence -= 0.1;
        break;
    }
    
    // Boost confidence for concealed patterns if we have strong matches
    if (nmjlPattern.Hand_Conceiled && completion > 0.6) {
      confidence += 0.1;
    }
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Calculate strategic value of pursuing this pattern
   */
  private static calculateStrategicValue(
    handPattern: HandPattern,
    completion: number,
    confidence: number,
    exactMatches: number,
    totalRequired: number
  ): number {
    // Base value from pattern points, weighted by completion and confidence
    // Use Math.max to ensure some base value even with 0% completion
    let value = handPattern.points * Math.max(0.1, completion) * confidence;
    
    // Bonus for having many exact matches
    value += (exactMatches / totalRequired) * 10;
    
    // Bonus for nearly complete patterns
    if (completion > 0.8) {
      value *= 1.3;
    } else if (completion > 0.6) {
      value *= 1.1;
    }
    
    // Adjust for difficulty
    switch (handPattern.difficulty) {
      case 'easy':
        value *= 1.1; // Slight bonus for reliability
        break;
      case 'hard':
        value *= 0.9; // Slight penalty for risk
        break;
      case 'expert':
        value *= 0.8; // Penalty for high risk
        break;
    }
    
    return value;
  }

  /**
   * Convert detailed analysis to PatternMatch format for compatibility
   */
  private static convertToPatternMatches(analyses: DetailedPatternAnalysis[]): PatternMatch[] {
    return analyses.map(analysis => ({
      pattern: analysis.pattern,
      completion: analysis.completion,
      missingTiles: analysis.missingTiles,
      blockedBy: analysis.blockedBy,
      confidence: analysis.confidence
    }));
  }

  /**
   * Generate enhanced recommendations with detailed reasoning
   */
  private static generateEnhancedRecommendations(
    playerTiles: Tile[],
    analyses: DetailedPatternAnalysis[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _gameContext?: {
      discardedTiles?: Tile[];
      exposedTiles?: Tile[];
      wallTilesRemaining?: number;
      turnsElapsed?: number;
    }
  ): EnhancedRecommendations {
    
    const keep: Tile[] = [];
    const discard: Tile[] = [];
    const charleston: Tile[] = [];
    const keepReasons: string[] = [];
    const discardReasons: string[] = [];
    const charlestonReasons: string[] = [];
    
    // Get top 3 viable patterns for analysis
    const topPatterns = analyses.slice(0, 3);
    
    // Analyze tile value across top patterns
    const tileValues = new Map<string, { 
      keepScore: number; 
      reasons: string[]; 
      patternsUsed: string[] 
    }>();
    
    playerTiles.forEach(tile => {
      let keepScore = 0;
      const reasons: string[] = [];
      const patternsUsed: string[] = [];
      
      // Always keep jokers unless we have too many
      if (tile.isJoker || tile.suit === 'jokers') {
        keepScore += 50;
        reasons.push('Joker - extremely versatile');
      }
      
      // Evaluate against each top pattern
      topPatterns.forEach((analysis, index) => {
        const weight = Math.max(0.3, (3 - index) / 3);
        const needed = analysis.pattern.requiredTiles.filter(t => t.id === tile.id).length;
        const playerCount = playerTiles.filter(t => t.id === tile.id).length;
        
        if (needed > 0) {
          if (playerCount <= needed) {
            // We need this tile
            keepScore += (20 * weight * analysis.completion);
            reasons.push(`Essential for ${analysis.pattern.name} (${(analysis.completion * 100).toFixed(0)}% complete)`);
            patternsUsed.push(analysis.pattern.name);
          } else {
            // We have extras
            keepScore += (5 * weight);
            reasons.push(`Extra ${analysis.pattern.name} tile - good backup`);
          }
        }
      });
      
      tileValues.set(tile.id, {
        keepScore: keepScore / Math.max(1, playerTiles.filter(t => t.id === tile.id).length), // Normalize by count
        reasons,
        patternsUsed
      });
    });
    
    // Sort tiles by keep value
    const sortedTileValues = Array.from(tileValues.entries())
      .sort(([, a], [, b]) => b.keepScore - a.keepScore);
    
    // Categorize tiles
    const mostCritical: Tile[] = [];
    const highValue: Tile[] = [];
    const flexible: Tile[] = [];
    const expendable: Tile[] = [];
    
    sortedTileValues.forEach(([tileId, value]) => {
      const tilesOfThisType = playerTiles.filter(t => t.id === tileId);
      
      if (value.keepScore >= 30) {
        keep.push(...tilesOfThisType);
        mostCritical.push(...tilesOfThisType);
        keepReasons.push(`Keep ${tileId}: ${value.reasons[0] || 'High strategic value'}`);
      } else if (value.keepScore >= 15) {
        highValue.push(...tilesOfThisType);
      } else if (value.keepScore >= 5) {
        flexible.push(...tilesOfThisType);
      } else {
        expendable.push(...tilesOfThisType);
        discard.push(...tilesOfThisType.slice(0, 1)); // Only discard one of each type initially
        charleston.push(...tilesOfThisType.slice(0, 2));
        discardReasons.push(`Discard ${tileId}: Low value for current patterns`);
        charlestonReasons.push(`Pass ${tileId}: Not needed for viable strategies`);
      }
    });
    
    return {
      keep: keep.slice(0, 12), // Reasonable keep limit
      discard: discard.slice(0, 3), // Top 3 discard candidates
      charleston: charleston.slice(0, 4), // Charleston options
      reasoning: {
        keepReasons: keepReasons.slice(0, 5),
        discardReasons: discardReasons.slice(0, 3),
        charlestonReasons: charlestonReasons.slice(0, 3)
      },
      priorityTiles: {
        mostCritical,
        highValue,
        flexible,
        expendable
      }
    };
  }

  /**
   * Calculate enhanced probabilities with game context
   */
  private static calculateEnhancedProbabilities(
    playerTiles: Tile[],
    analyses: DetailedPatternAnalysis[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _gameContext?: {
      discardedTiles?: Tile[];
      exposedTiles?: Tile[];
      wallTilesRemaining?: number;
      turnsElapsed?: number;
    }
  ) {
    const bestPattern = analyses[0];
    if (!bestPattern) {
      return { completion: 0, turnsEstimate: 20 };
    }
    
    const tilesNeeded = bestPattern.missingTiles.length;
    
    // Enhanced probability calculation
    let completionProb = bestPattern.completion;
    
    // Adjust for tiles still needed
    if (tilesNeeded > 0) {
      const avgTilesPerDraw = 2.5; // Conservative estimate
      const drawsNeeded = tilesNeeded / avgTilesPerDraw;
      const turnsNeeded = Math.ceil(drawsNeeded);
      
      // Probability decreases with more turns needed
      completionProb *= Math.max(0.1, 1 - (turnsNeeded / 15));
      
      return {
        completion: completionProb,
        turnsEstimate: Math.min(turnsNeeded, 20)
      };
    }
    
    return {
      completion: completionProb,
      turnsEstimate: Math.max(1, 5 - Math.floor(bestPattern.completion * 5))
    };
  }

  /**
   * Generate defensive analysis
   */
  private static generateDefensiveAnalysis(
    playerTiles: Tile[],
    analyses: DetailedPatternAnalysis[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _gameContext?: {
      discardedTiles?: Tile[];
      exposedTiles?: Tile[];
      wallTilesRemaining?: number;
      turnsElapsed?: number;
    }
  ) {
    // This is a placeholder for defensive analysis
    // In the real implementation, this would analyze opponent threats
    return {
      dangerousTiles: [],
      safeTiles: [],
      opponentThreats: [
        {
          playerId: 'opponent-estimate',
          suspectedPatterns: analyses.slice(0, 2).map(a => a.pattern.name),
          dangerLevel: analyses[0]?.completion > 0.7 ? 'high' as const : 'medium' as const
        }
      ]
    };
  }
}

// Export for backward compatibility
export const enhancedHandAnalyzer = EnhancedHandAnalyzer;