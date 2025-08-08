// frontend/src/utils/charleston-engine.ts
// Core Charleston recommendation logic for American Mahjong Web Assistant

import type { 
  Tile, 
  HandPattern,
  TileSuit 
} from '../types';

import type {
  CharlestonRecommendation,
  CharlestonAnalysisContext,
  TileRecommendation,
  PassReason,
  RecommendationConfidence,
  CharlestonPhase
} from '../types/charleston-types';

import { 
  CHARLESTON_CONSTANTS
} from '../types/charleston-types';

import { 
  countTiles, 
  groupTilesBySuit
} from './tile-utils';

import { CharlestonRecommendationEngine } from './charleston-recommendation-engine';

/**
 * Main Charleston recommendation engine
 * Analyzes player's hand and provides strategic passing advice
 */
export class CharlestonEngine {
  
  /**
   * Generate comprehensive Charleston recommendations using advanced engine
   */
  static generateRecommendations(
    context: CharlestonAnalysisContext
  ): CharlestonRecommendation {
    
    const { playerTiles, currentPhase } = context;
    
    try {
      // Use the advanced Charleston recommendation engine
      const advancedRecommendation = CharlestonRecommendationEngine.generateRecommendations(
        playerTiles,
        currentPhase,
        2025, // Card year
        4 // Player count
      );
      
      return {
        tilesToPass: advancedRecommendation.tilesToPass,
        tilesToKeep: advancedRecommendation.tilesToKeep,
        confidence: Math.min(Math.max(advancedRecommendation.confidence, 0.1), 0.95) as unknown as RecommendationConfidence,
        alternatives: advancedRecommendation.alternativeOptions.map(alt => ({
          tilesToPass: alt.tilesToPass,
          confidence: Math.min(Math.max(alt.score / 10, 0.1), 0.95) as unknown as RecommendationConfidence,
          reasoning: [alt.reasoning]
        })),
        strategicAdvice: advancedRecommendation.strategicAdvice
      };
    } catch (error) {
      console.warn('Advanced Charleston engine failed, falling back to basic analysis:', error);
      
      // Fallback to basic analysis
      return CharlestonEngine.generateBasicRecommendations(context);
    }
  }
  
  /**
   * Fallback basic recommendation generation
   */
  static generateBasicRecommendations(context: CharlestonAnalysisContext): CharlestonRecommendation {
    const { playerTiles, currentPhase, phasesRemaining } = context;
    
    // Step 1: Analyze current hand patterns
    const currentPatterns = CharlestonEngine.analyzeCurrentPatterns(playerTiles);
    
    // Step 2: Generate individual tile recommendations
    const tileAnalysis = CharlestonEngine.analyzeTiles(playerTiles, context);
    
    // Step 3: Select optimal tiles to pass
    const optimalSelection = CharlestonEngine.selectOptimalTiles(tileAnalysis, context);
    
    // Step 4: Generate alternative options
    const alternatives = CharlestonEngine.generateAlternatives(tileAnalysis, optimalSelection);
    
    // Step 5: Create strategic explanation
    const strategy = CharlestonEngine.buildStrategyExplanation(
      optimalSelection, 
      currentPatterns, 
      context
    );
    
    return {
      tilesToPass: optimalSelection.tilesToPass,
      tilesToKeep: optimalSelection.tilesToKeep,
      tileAnalysis,
      alternativeOptions: alternatives,
      overallStrategy: strategy.overallStrategy,
      confidence: strategy.confidence,
      currentPatterns: currentPatterns,
      targetPatterns: strategy.targetPatterns,
      patternShift: strategy.patternShift,
      phaseAdvice: {
        whatToExpect: CharlestonEngine.predictIncomingTiles(currentPhase, context),
        nextPhaseStrategy: CharlestonEngine.getNextPhaseStrategy(phasesRemaining),
        riskAssessment: CharlestonEngine.assessRisks(optimalSelection.tilesToPass, context)
      }
    };
  }
  
  /**
   * Analyze each tile in the hand for Charleston potential
   */
  private static analyzeTiles(
    tiles: Tile[], 
    context: CharlestonAnalysisContext
  ): TileRecommendation[] {
    
    const tileCounts = countTiles(tiles);
    const groupedTiles = groupTilesBySuit(tiles);
    const recommendations: TileRecommendation[] = [];
    
    // Analyze each unique tile type
    for (const [tileId, count] of Object.entries(tileCounts)) {
      const tile = tiles.find(t => t.id === tileId)!;
      const recommendation = CharlestonEngine.analyzeSingleTile(
        tile, 
        count, 
        groupedTiles, 
        context
      );
      recommendations.push(recommendation);
    }
    
    return recommendations.sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * Analyze a single tile for Charleston recommendation
   */
  private static analyzeSingleTile(
    tile: Tile,
    count: number,
    groupedTiles: Record<TileSuit, Tile[]>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: CharlestonAnalysisContext
  ): TileRecommendation {
    
    let action: 'pass' | 'keep' | 'neutral' = 'neutral';
    let reason: PassReason = 'isolated_tile'; // Default reason
    let reasoning: string;
    let confidence: RecommendationConfidence = 'medium';
    let priority = 5;
    
    // Rule 1: Excess duplicates (4 of same tile)
    if (count >= 4) {
      action = 'pass';
      reason = 'excess_duplicates';
      reasoning = `You have ${count} ${tile.id} tiles. Pass extras to make room for useful tiles.`;
      confidence = 'certain';
      priority = 8;
    }
    
    // Rule 2: Isolated tiles (no support in suit)
    else if (CharlestonEngine.isIsolatedTile(tile, groupedTiles)) {
      action = 'pass';
      reason = 'isolated_tile';
      reasoning = `${tile.id} has no supporting tiles in your hand. Better to pass it.`;
      confidence = 'high';
      priority = 7;
    }
    
    // Rule 3: Pattern analysis
    else if (CharlestonEngine.isPatternConflict(tile, groupedTiles)) {
      action = 'pass';
      reason = 'pattern_conflict';
      reasoning = `${tile.id} doesn't fit your strongest patterns. Consider passing.`;
      confidence = 'medium';
      priority = 6;
    }
    
    // Rule 4: Valuable tiles to keep
    else if (CharlestonEngine.isValuableTile(tile, groupedTiles)) {
      action = 'keep';
      reason = 'low_probability';
      reasoning = `${tile.id} supports multiple potential patterns. Keep it.`;
      confidence = 'high';
      priority = 8;
    }
    
    // Rule 5: Dragons and winds (often useful)
    else if (['winds', 'dragons'].includes(tile.suit)) {
      if (count >= 2) {
        action = 'keep';
        reasoning = `You have ${count} ${tile.id} tiles. Good for pairs or pungs.`;
        confidence = 'medium';
        priority = 6;
      } else {
        action = 'pass';
        reason = 'isolated_tile';
        reasoning = `Single ${tile.id} is hard to use. Consider passing.`;
        confidence = 'medium';
        priority = 4;
      }
    }
    
    // Rule 6: Jokers (almost always keep)
    else if (tile.suit === 'jokers') {
      action = 'keep';
      reasoning = 'Jokers are extremely valuable. Never pass unless you have many.';
      confidence = 'certain';
      priority = 10;
    }
    
    // Default case
    else {
      reasoning = `${tile.id} is neutral. Could pass or keep based on other factors.`;
      priority = 3;
    }
    
    return {
      tile,
      action,
      reason,
      reasoning,
      confidence,
      priority
    };
  }
  
  /**
   * Select the optimal 3 tiles to pass based on analysis
   */
  private static selectOptimalTiles(
    tileAnalysis: TileRecommendation[],
    context: CharlestonAnalysisContext
  ): { tilesToPass: Tile[]; tilesToKeep: Tile[] } {
    
    // Get tiles recommended for passing, sorted by priority
    const passRecommendations = tileAnalysis
      .filter(t => t.action === 'pass')
      .sort((a, b) => b.priority - a.priority);
    
    const tilesToPass: Tile[] = [];
    const allTiles = context.playerTiles;
    const tilesToKeep: Tile[] = [];
    
    // Select top 3 tiles to pass
    for (const recommendation of passRecommendations) {
      if (tilesToPass.length >= CHARLESTON_CONSTANTS.TILES_TO_PASS) break;
      
      // Find an instance of this tile in the player's hand
      const tileInstance = allTiles.find(t => 
        t.id === recommendation.tile.id && 
        !tilesToPass.some(passed => passed === t)
      );
      
      if (tileInstance) {
        tilesToPass.push(tileInstance);
      }
    }
    
    // If we don't have 3 clear pass recommendations, fill with neutral tiles
    if (tilesToPass.length < CHARLESTON_CONSTANTS.TILES_TO_PASS) {
      const neutralTiles = tileAnalysis
        .filter(t => t.action === 'neutral')
        .sort((a, b) => a.priority - b.priority); // Lowest priority first
      
      for (const recommendation of neutralTiles) {
        if (tilesToPass.length >= CHARLESTON_CONSTANTS.TILES_TO_PASS) break;
        
        const tileInstance = allTiles.find(t => 
          t.id === recommendation.tile.id && 
          !tilesToPass.some(passed => passed === t)
        );
        
        if (tileInstance) {
          tilesToPass.push(tileInstance);
        }
      }
    }
    
    // Everything else should be kept
    allTiles.forEach(tile => {
      if (!tilesToPass.some(passed => passed === tile)) {
        tilesToKeep.push(tile);
      }
    });
    
    return { tilesToPass, tilesToKeep };
  }
  
  /**
   * Check if a tile is isolated (no supporting tiles)
   */
  private static isIsolatedTile(tile: Tile, groupedTiles: Record<TileSuit, Tile[]>): boolean {
    const suitTiles = groupedTiles[tile.suit];
    
    // For numbered tiles, check for consecutive support
    if (['dots', 'bams', 'cracks'].includes(tile.suit)) {
      const tileNum = parseInt(tile.value);
      if (isNaN(tileNum)) return true;
      
      const hasAdjacent = suitTiles.some(t => {
        const num = parseInt(t.value);
        return !isNaN(num) && Math.abs(num - tileNum) === 1;
      });
      
      const hasSame = suitTiles.filter(t => t.value === tile.value).length;
      
      return !hasAdjacent && hasSame <= 1;
    }
    
    // For honors (winds/dragons), isolated if only one
    return suitTiles.filter(t => t.value === tile.value).length <= 1;
  }
  
  /**
   * Check if tile conflicts with main patterns
   */
  private static isPatternConflict(tile: Tile, groupedTiles: Record<TileSuit, Tile[]>): boolean {
    // Simplified pattern conflict detection
    // In a full implementation, this would check against current NMJL patterns
    
    // If player has many of one suit, other suits might be conflicts
    const suitCounts = Object.entries(groupedTiles).map(([suit, tiles]) => ({
      suit: suit as TileSuit,
      count: tiles.length
    }));
    
    const dominantSuit = suitCounts.reduce((max, current) => 
      current.count > max.count ? current : max
    );
    
    // If this tile's suit is much smaller than dominant suit, might be conflict
    const currentSuitCount = groupedTiles[tile.suit].length;
    return dominantSuit.count >= 7 && currentSuitCount <= 2 && tile.suit !== dominantSuit.suit;
  }
  
  /**
   * Check if tile is valuable for multiple patterns
   */
  private static isValuableTile(tile: Tile, groupedTiles: Record<TileSuit, Tile[]>): boolean {
    const suitTiles = groupedTiles[tile.suit];
    
    // Jokers are always valuable
    if (tile.suit === 'jokers') return true;
    
    // Tiles with multiple copies are valuable
    const sameCount = suitTiles.filter(t => t.value === tile.value).length;
    if (sameCount >= 2) return true;
    
    // Middle numbers (3-7) are often valuable for runs
    if (['dots', 'bams', 'cracks'].includes(tile.suit)) {
      const num = parseInt(tile.value);
      if (num >= 3 && num <= 7) return true;
    }
    
    return false;
  }
  
  /**
   * Analyze current hand for pattern potential
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private static analyzeCurrentPatterns(_tiles: Tile[]): HandPattern[] {
    // Simplified pattern analysis
    // In full implementation, would match against 2025 NMJL card patterns
    
    const mockPatterns: HandPattern[] = [
      {
        id: 'like-numbers-basic',
        name: 'LIKE NUMBERS',
        description: 'Same numbers in different suits',
        requiredTiles: [],
        optionalTiles: [],
        points: 25,
        difficulty: 'medium'
      }
    ];
    
    return mockPatterns;
  }
  
  /**
   * Generate alternative passing options
   */
  private static generateAlternatives(
    tileAnalysis: TileRecommendation[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _primary: { tilesToPass: Tile[]; tilesToKeep: Tile[] }
  ) {
    // Generate 2-3 alternative tile combinations
    const alternatives = [];
    
    const neutralTiles = tileAnalysis.filter(t => t.action === 'neutral');
    const passTiles = tileAnalysis.filter(t => t.action === 'pass');
    
    if (neutralTiles.length >= 3) {
      alternatives.push({
        tiles: neutralTiles.slice(0, 3).map(t => t.tile),
        reasoning: 'Conservative approach - pass neutral tiles',
        confidence: 'medium' as RecommendationConfidence
      });
    }
    
    if (passTiles.length >= 3) {
      const altCombination = passTiles.slice(1, 4).map(t => t.tile);
      if (altCombination.length === 3) {
        alternatives.push({
          tiles: altCombination,
          reasoning: 'Alternative selection - different priorities',
          confidence: 'medium' as RecommendationConfidence
        });
      }
    }
    
    return alternatives;
  }
  
  /**
   * Build strategic explanation
   */
  private static buildStrategyExplanation(
    selection: { tilesToPass: Tile[]; tilesToKeep: Tile[] },
    patterns: HandPattern[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: CharlestonAnalysisContext
  ) {
    const passedTileNames = selection.tilesToPass.map(t => t.id).join(', ');
    
    return {
      overallStrategy: `Passing ${passedTileNames} to focus on your strongest patterns and create space for more useful tiles.`,
      confidence: 'medium' as RecommendationConfidence,
      targetPatterns: patterns,
      patternShift: 'Optimizing hand composition for pattern development'
    };
  }
  
  /**
   * Predict what tiles might be received
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private static predictIncomingTiles(phase: CharlestonPhase, _context: CharlestonAnalysisContext): string {
    return `In ${phase} pass, expect to receive tiles that other players don't need for their patterns.`;
  }
  
  /**
   * Get strategy for next phase
   */
  private static getNextPhaseStrategy(phasesRemaining: CharlestonPhase[]): string {
    if (phasesRemaining.length === 0) return 'Charleston complete - ready to play!';
    
    const nextPhase = phasesRemaining[0];
    return `Next ${nextPhase} pass: Reassess hand after receiving tiles.`;
  }
  
  /**
   * Assess risks of passing certain tiles
   */
  private static assessRisks(tilesToPass: Tile[], context: CharlestonAnalysisContext): string {
    const hasJokers = tilesToPass.some(t => t.suit === 'jokers');
    const hasMultiples = tilesToPass.some(t => 
      context.playerTiles.filter(pt => pt.id === t.id).length > 1
    );
    
    if (hasJokers) return 'HIGH RISK: Passing jokers is generally not recommended.';
    if (hasMultiples) return 'MEDIUM RISK: Passing tiles you have multiples of.';
    return 'LOW RISK: Safe tiles to pass.';
  }
}

/**
 * Convenience function for quick recommendations
 */
export function getCharlestonRecommendations(
  playerTiles: Tile[],
  currentPhase: CharlestonPhase = 'right',
  opponentCount: number = 3
): CharlestonRecommendation {
  
  const context: CharlestonAnalysisContext = {
    playerTiles,
    currentPhase,
    phasesRemaining: currentPhase === 'right' ? ['across', 'left'] : 
                     currentPhase === 'across' ? ['left'] : [],
    opponentCount,
    gameSettings: {
      enableOptional: true,
      timeLimit: 120,
      cardYear: 2025
    }
  };
  
  return CharlestonEngine.generateRecommendations(context);
}

/**
 * Quick validation of Charleston tile selection
 */
export function validateCharlestonSelection(
  selectedTiles: Tile[],
  playerTiles: Tile[]
): { isValid: boolean; error?: string } {
  
  if (selectedTiles.length !== CHARLESTON_CONSTANTS.TILES_TO_PASS) {
    return { 
      isValid: false, 
      error: `Must select exactly ${CHARLESTON_CONSTANTS.TILES_TO_PASS} tiles` 
    };
  }
  
  // Check that player owns all selected tiles
  for (const selected of selectedTiles) {
    const owned = playerTiles.find(t => t === selected);
    if (!owned) {
      return { 
        isValid: false, 
        error: `You don't own tile ${selected.id}` 
      };
    }
  }
  
  return { isValid: true };
}