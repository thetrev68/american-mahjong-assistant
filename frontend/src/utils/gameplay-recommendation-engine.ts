// frontend/src/utils/gameplay-recommendation-engine.ts
// Advanced discard recommendation engine for active gameplay
// Provides sophisticated single-tile discard recommendations during play

import type { Tile, Player, DiscardedTile } from '../types';
import { NMJLPatternAnalyzer } from './nmjl-pattern-analyzer';
import { NMJL_2025_PATTERNS } from './nmjl-patterns-2025';

interface DiscardRecommendation {
  recommendedDiscard: Tile;
  confidence: number;
  reasoning: string[];
  riskAssessment: {
    riskLevel: 'low' | 'medium' | 'high';
    dangerousFor: string[]; // Player positions who might benefit
    safetyScore: number; // 0-10, higher is safer
  };
  alternatives: Array<{
    tile: Tile;
    score: number;
    reasoning: string;
  }>;
  strategicAdvice: string[];
}

interface OpponentAnalysis {
  playerId: string;
  position: string;
  suspectedPatterns: string[];
  dangerLevel: 'low' | 'medium' | 'high';
  likelyNeeds: Tile[];
  recentDiscards: Tile[];
  exposedSets: any[];
}

interface GameContext {
  currentTurn: string;
  discardPile: DiscardedTile[];
  wallTilesRemaining: number;
  turnsElapsed: number;
  gamePhase: 'early' | 'mid' | 'late';
}

/**
 * Advanced Gameplay Discard Recommendation Engine
 * Analyzes hand strength, opponent threats, and game state for optimal discards
 */
export class GameplayRecommendationEngine {
  
  /**
   * Generate comprehensive discard recommendations
   */
  static generateRecommendations(
    playerTiles: Tile[],
    opponents: Player[],
    gameContext: GameContext,
    cardYear: number = 2025
  ): DiscardRecommendation {
    
    // Step 1: Analyze own hand patterns
    const patternAnalyses = NMJLPatternAnalyzer.analyzeAllPatterns(playerTiles, cardYear, 5);
    const topPattern = patternAnalyses[0];
    
    // Step 2: Analyze opponents
    const opponentAnalyses = this.analyzeOpponents(opponents, gameContext);
    
    // Step 3: Evaluate each tile for discard safety and strategic value
    const tileEvaluations = this.evaluateTilesForDiscard(
      playerTiles,
      topPattern,
      opponentAnalyses,
      gameContext
    );
    
    // Step 4: Select best discard
    const bestDiscard = tileEvaluations[0];
    
    // Step 5: Generate strategic advice
    const strategicAdvice = this.generateGameplayAdvice(
      playerTiles,
      topPattern,
      opponentAnalyses,
      gameContext
    );
    
    return {
      recommendedDiscard: bestDiscard.tile,
      confidence: bestDiscard.confidence,
      reasoning: bestDiscard.reasoning,
      riskAssessment: bestDiscard.riskAssessment,
      alternatives: tileEvaluations.slice(1, 3),
      strategicAdvice
    };
  }
  
  /**
   * Analyze opponents based on their discards and exposed sets
   */
  private static analyzeOpponents(
    opponents: Player[],
    gameContext: GameContext
  ): OpponentAnalysis[] {
    
    return opponents.map(opponent => {
      const recentDiscards = this.getPlayerDiscards(opponent.id, gameContext.discardPile);
      const exposedSets = opponent.exposedSets || [];
      
      // Analyze discard patterns to infer hand composition
      const suspectedPatterns = this.inferPatternsFromDiscards(recentDiscards, exposedSets);
      
      // Determine danger level based on exposed sets and discard patterns
      const dangerLevel = this.assessOpponentDanger(opponent, recentDiscards, exposedSets);
      
      // Predict what tiles they might need
      const likelyNeeds = this.predictNeededTiles(suspectedPatterns, exposedSets, recentDiscards);
      
      return {
        playerId: opponent.id,
        position: opponent.position,
        suspectedPatterns,
        dangerLevel,
        likelyNeeds,
        recentDiscards,
        exposedSets
      };
    });
  }
  
  /**
   * Evaluate each tile for discard appropriateness
   */
  private static evaluateTilesForDiscard(
    playerTiles: Tile[],
    topPattern: any,
    opponentAnalyses: OpponentAnalysis[],
    gameContext: GameContext
  ): Array<{
    tile: Tile;
    score: number;
    confidence: number;
    reasoning: string[];
    riskAssessment: any;
  }> {
    
    const evaluations = playerTiles.map(tile => {
      let discardScore = 5; // Base neutral score
      const reasoning: string[] = [];
      let confidence = 0.7;
      
      // Step 1: Evaluate tile's value to our own hand
      const ownHandValue = this.evaluateTileValueForOwnHand(tile, playerTiles, topPattern);
      discardScore -= ownHandValue.value;
      reasoning.push(...ownHandValue.reasoning);
      
      // Step 2: Evaluate danger to opponents
      const opponentDanger = this.evaluateOpponentDanger(tile, opponentAnalyses);
      discardScore -= opponentDanger.dangerScore;
      reasoning.push(...opponentDanger.reasoning);
      
      // Step 3: Game phase considerations
      const phaseAdjustment = this.adjustForGamePhase(tile, gameContext);
      discardScore += phaseAdjustment.adjustment;
      reasoning.push(...phaseAdjustment.reasoning);
      
      // Step 4: Calculate risk assessment
      const riskAssessment = {
        riskLevel: opponentDanger.riskLevel,
        dangerousFor: opponentDanger.dangerousFor,
        safetyScore: Math.max(0, Math.min(10, discardScore))
      };
      
      // Step 5: Adjust confidence based on various factors
      confidence = this.calculateDiscardConfidence(discardScore, ownHandValue, opponentDanger);
      
      return {
        tile,
        score: discardScore,
        confidence,
        reasoning,
        riskAssessment
      };
    });
    
    // Sort by discard score (higher is better to discard)
    return evaluations.sort((a, b) => b.score - a.score);
  }
  
  /**
   * Evaluate how valuable a tile is to our own hand
   */
  private static evaluateTileValueForOwnHand(
    tile: Tile,
    playerTiles: Tile[],
    topPattern: any
  ): { value: number; reasoning: string[] } {
    
    let value = 0;
    const reasoning: string[] = [];
    
    // Jokers are extremely valuable - never discard unless you have 4+
    if (tile.isJoker || tile.suit === 'jokers') {
      const jokerCount = playerTiles.filter(t => t.isJoker || t.suit === 'jokers').length;
      if (jokerCount <= 2) {
        value = 15;
        reasoning.push('Joker is extremely valuable - keep at all costs');
      } else {
        value = 8;
        reasoning.push('Have multiple jokers - one could be discarded if needed');
      }
      return { value, reasoning };
    }
    
    // Check if tile is required for top pattern
    if (topPattern && topPattern.pattern) {
      const requiredTiles = topPattern.pattern.requiredTiles || [];
      const isRequired = requiredTiles.some((req: Tile) => req.id === tile.id);
      
      if (isRequired) {
        const requiredCount = requiredTiles.filter((req: Tile) => req.id === tile.id).length;
        const playerCount = playerTiles.filter(t => t.id === tile.id).length;
        
        if (playerCount <= requiredCount) {
          value = 10;
          reasoning.push(`Essential for ${topPattern.pattern.name} pattern`);
        } else {
          value = 3;
          reasoning.push(`Extra copy for ${topPattern.pattern.name} pattern`);
        }
      }
    }
    
    // Evaluate tile relationships (pairs, sequences, etc.)
    const relationships = this.findTileRelationships(tile, playerTiles);
    value += relationships.value;
    reasoning.push(...relationships.reasoning);
    
    return { value, reasoning };
  }
  
  /**
   * Evaluate how dangerous discarding this tile is for opponents
   */
  private static evaluateOpponentDanger(
    tile: Tile,
    opponentAnalyses: OpponentAnalysis[]
  ): { dangerScore: number; riskLevel: any; dangerousFor: string[]; reasoning: string[] } {
    
    let dangerScore = 0;
    const dangerousFor: string[] = [];
    const reasoning: string[] = [];
    
    opponentAnalyses.forEach(opponent => {
      // Check if tile is likely needed by this opponent
      const isLikelyNeeded = opponent.likelyNeeds.some(needed => needed.id === tile.id);
      
      if (isLikelyNeeded) {
        const multiplier = opponent.dangerLevel === 'high' ? 3 : 
                         opponent.dangerLevel === 'medium' ? 2 : 1;
        
        dangerScore += 5 * multiplier;
        dangerousFor.push(opponent.position);
        reasoning.push(`${opponent.position} likely needs ${tile.id} (${opponent.dangerLevel} threat)`);
      }
      
      // Check recent discard patterns
      const recentSameTiles = opponent.recentDiscards.filter(d => 
        d.suit === tile.suit || d.value === tile.value
      ).length;
      
      if (recentSameTiles === 0 && opponent.dangerLevel === 'high') {
        dangerScore += 2;
        reasoning.push(`${opponent.position} hasn't discarded similar tiles - possibly collecting`);
      }
    });
    
    const riskLevel = dangerScore >= 10 ? 'high' : dangerScore >= 5 ? 'medium' : 'low';
    
    return { dangerScore, riskLevel, dangerousFor, reasoning };
  }
  
  /**
   * Adjust discard score based on game phase
   */
  private static adjustForGamePhase(
    tile: Tile,
    gameContext: GameContext
  ): { adjustment: number; reasoning: string[] } {
    
    let adjustment = 0;
    const reasoning: string[] = [];
    
    switch (gameContext.gamePhase) {
      case 'early':
        // Early game - safe to discard isolated tiles
        if (tile.suit === 'flowers' || (tile.suit === 'winds' && this.isIsolatedWind(tile))) {
          adjustment += 2;
          reasoning.push('Early game - safe to discard isolated tiles');
        }
        break;
        
      case 'mid':
        // Mid game - be more cautious
        if (tile.suit === 'jokers') {
          adjustment -= 3;
          reasoning.push('Mid game - jokers become more valuable');
        }
        break;
        
      case 'late':
        // Late game - very cautious, don't feed opponents
        adjustment -= 1;
        reasoning.push('Late game - increased caution with all discards');
        
        if (tile.suit === 'dragons' || tile.suit === 'winds') {
          adjustment -= 2;
          reasoning.push('Late game - honor tiles often needed for completion');
        }
        break;
    }
    
    // Adjust based on wall tiles remaining
    if (gameContext.wallTilesRemaining < 20) {
      adjustment -= 1;
      reasoning.push('Few tiles remain - be extra cautious');
    }
    
    return { adjustment, reasoning };
  }
  
  /**
   * Find relationships between this tile and others in hand
   */
  private static findTileRelationships(
    tile: Tile,
    playerTiles: Tile[]
  ): { value: number; reasoning: string[] } {
    
    let value = 0;
    const reasoning: string[] = [];
    
    // Count identical tiles (for pairs/pungs/kongs)
    const identicalCount = playerTiles.filter(t => t.id === tile.id).length;
    if (identicalCount >= 3) {
      value = 8;
      reasoning.push(`Part of ${identicalCount}-tile set - very valuable`);
    } else if (identicalCount === 2) {
      value = 4;
      reasoning.push('Part of pair - somewhat valuable');
    }
    
    // For number tiles, check for sequence potential
    if (['dots', 'bams', 'cracks'].includes(tile.suit) && !isNaN(parseInt(tile.value))) {
      const tileNum = parseInt(tile.value);
      const sameSuitTiles = playerTiles.filter(t => t.suit === tile.suit);
      
      const hasAdjacent = sameSuitTiles.some(t => {
        const tNum = parseInt(t.value);
        return !isNaN(tNum) && Math.abs(tNum - tileNum) === 1;
      });
      
      if (hasAdjacent) {
        value += 3;
        reasoning.push('Part of potential sequence');
      }
    }
    
    // For same-number tiles across suits (like numbers patterns)
    if (['dots', 'bams', 'cracks'].includes(tile.suit)) {
      const sameNumberCount = playerTiles.filter(t => 
        t.value === tile.value && 
        ['dots', 'bams', 'cracks'].includes(t.suit)
      ).length;
      
      if (sameNumberCount >= 3) {
        value += 5;
        reasoning.push(`${tile.value} appears in multiple suits - good for Like Numbers`);
      }
    }
    
    return { value, reasoning };
  }
  
  /**
   * Calculate confidence in discard recommendation
   */
  private static calculateDiscardConfidence(
    discardScore: number,
    ownHandValue: any,
    opponentDanger: any
  ): number {
    
    let confidence = 0.7; // Base confidence
    
    // Higher confidence for clearly good/bad discards
    if (discardScore >= 8) confidence = 0.9;
    else if (discardScore >= 6) confidence = 0.8;
    else if (discardScore <= 2) confidence = 0.6;
    else if (discardScore <= 0) confidence = 0.4;
    
    // Reduce confidence if high opponent danger
    if (opponentDanger.riskLevel === 'high') {
      confidence -= 0.2;
    }
    
    // Reduce confidence if valuable to own hand
    if (ownHandValue.value >= 8) {
      confidence -= 0.1;
    }
    
    return Math.max(0.3, Math.min(0.95, confidence));
  }
  
  /**
   * Generate strategic advice for gameplay
   */
  private static generateGameplayAdvice(
    playerTiles: Tile[],
    topPattern: any,
    opponentAnalyses: OpponentAnalysis[],
    gameContext: GameContext
  ): string[] {
    
    const advice: string[] = [];
    
    // Pattern-specific advice
    if (topPattern && topPattern.completion > 0.6) {
      advice.push(`You're ${(topPattern.completion * 100).toFixed(0)}% complete with ${topPattern.pattern.name} - focus on completion`);
    } else if (topPattern && topPattern.completion > 0.3) {
      advice.push(`Building ${topPattern.pattern.name} (${(topPattern.completion * 100).toFixed(0)}% complete) - keep essential tiles`);
    } else {
      advice.push('No strong pattern yet - maintain flexibility and watch opponents');
    }
    
    // Opponent threat advice
    const highThreatOpponents = opponentAnalyses.filter(o => o.dangerLevel === 'high');
    if (highThreatOpponents.length > 0) {
      const positions = highThreatOpponents.map(o => o.position).join(', ');
      advice.push(`High threat from ${positions} - be very careful with discards`);
    }
    
    // Game phase advice
    switch (gameContext.gamePhase) {
      case 'early':
        advice.push('Early game - discard isolated tiles and focus on building sets');
        break;
      case 'mid':
        advice.push('Mid game - balance offense and defense, watch opponent patterns');
        break;
      case 'late':
        advice.push('Late game - prioritize defense, avoid feeding opponents');
        break;
    }
    
    // Joker advice
    const jokerCount = playerTiles.filter(t => t.isJoker || t.suit === 'jokers').length;
    if (jokerCount === 0) {
      advice.push('No jokers - must rely on exact tiles, be defensive');
    } else if (jokerCount >= 3) {
      advice.push(`${jokerCount} jokers provide flexibility - consider aggressive patterns`);
    }
    
    return advice;
  }
  
  // Helper methods
  private static getPlayerDiscards(playerId: string, discardPile: DiscardedTile[]): Tile[] {
    return discardPile
      .filter(discard => discard.discardedBy === playerId) // This assumes playerId maps to position
      .map(discard => discard.tile);
  }
  
  private static inferPatternsFromDiscards(discards: Tile[], exposedSets: any[]): string[] {
    // Simplified pattern inference - would be more sophisticated in production
    const patterns: string[] = [];
    
    const suitCounts = discards.reduce((counts, tile) => {
      counts[tile.suit] = (counts[tile.suit] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    
    // If discarding many of one suit, probably not going for that suit
    Object.entries(suitCounts).forEach(([suit, count]) => {
      if (count >= 3) {
        patterns.push(`Not ${suit.toUpperCase()}`);
      }
    });
    
    return patterns;
  }
  
  private static assessOpponentDanger(
    opponent: Player,
    recentDiscards: Tile[],
    exposedSets: any[]
  ): 'low' | 'medium' | 'high' {
    
    let dangerScore = 0;
    
    // More exposed sets = higher danger
    dangerScore += exposedSets.length * 2;
    
    // Fewer diverse discards = more focused hand
    const uniqueDiscards = new Set(recentDiscards.map(d => d.id)).size;
    if (uniqueDiscards < 3 && recentDiscards.length > 3) {
      dangerScore += 3;
    }
    
    // Tile count consideration (fewer tiles = closer to winning)
    if (opponent.tilesInHand <= 5) {
      dangerScore += 4;
    } else if (opponent.tilesInHand <= 8) {
      dangerScore += 2;
    }
    
    return dangerScore >= 8 ? 'high' : dangerScore >= 4 ? 'medium' : 'low';
  }
  
  private static predictNeededTiles(
    suspectedPatterns: string[],
    exposedSets: any[],
    recentDiscards: Tile[]
  ): Tile[] {
    // Simplified prediction - would use more sophisticated analysis in production
    const needed: Tile[] = [];
    
    // Based on what they haven't discarded
    const discardedSuits = new Set(recentDiscards.map(d => d.suit));
    
    // If they haven't discarded winds, they might be collecting them
    if (!discardedSuits.has('winds')) {
      needed.push({ id: 'east', suit: 'winds', value: 'east' } as Tile);
    }
    
    return needed;
  }
  
  private static isIsolatedWind(tile: Tile): boolean {
    // Simplified check - would consider full hand context in production
    return tile.suit === 'winds';
  }
}