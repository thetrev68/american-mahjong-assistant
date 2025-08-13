/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/src/utils/nmjl-probability-calculator.ts
// Advanced probability calculations for NMJL hand completion
// Provides mathematical analysis of winning odds, expected turns, and strategic values

import type { Tile, HandPattern, DiscardedTile } from '../types';
import { TILE_COUNTS } from '../types';

interface ProbabilityResult {
  completionProbability: number; // 0-1, overall chance of completing this pattern
  expectedTurns: number; // Average turns needed to complete
  confidenceInterval: {
    min: number;
    max: number;
  };
  tileSpecificOdds: Array<{
    tileId: string;
    needed: number;
    available: number;
    drawProbability: number;
  }>;
  scenarios: {
    best: { turns: number; probability: number };
    worst: { turns: number; probability: number };
    average: { turns: number; probability: number };
  };
  jokerDependency: {
    withoutJokers: number;
    withOneJoker: number;
    withTwoJokers: number;
    optimal: number;
  };
}

interface GameState {
  wallTilesRemaining: number;
  discardedTiles: DiscardedTile[];
  exposedTiles: Tile[]; // Tiles shown by all players
  turnsElapsed: number;
  playersRemaining: number;
}

/**
 * Advanced NMJL Probability Calculator
 * Uses mathematical models to predict hand completion odds
 */
export class NMJLProbabilityCalculator {
  
  // Standard NMJL tile distribution
  private static readonly TOTAL_TILES = 152;
  private static readonly STANDARD_TILE_COUNTS = {
    'dots': { '1': 4, '2': 4, '3': 4, '4': 4, '5': 4, '6': 4, '7': 4, '8': 4, '9': 4 },
    'bams': { '1': 4, '2': 4, '3': 4, '4': 4, '5': 4, '6': 4, '7': 4, '8': 4, '9': 4 },
    'cracks': { '1': 4, '2': 4, '3': 4, '4': 4, '5': 4, '6': 4, '7': 4, '8': 4, '9': 4 },
    'winds': { 'east': 4, 'south': 4, 'west': 4, 'north': 4 },
    'dragons': { 'red': 4, 'green': 4, 'white': 4 },
    'flowers': { 'f1': 1, 'f2': 1, 'f3': 1, 'f4': 1 },
    'jokers': { 'joker': 8 }
  };
  
  /**
   * Calculate comprehensive probability analysis for pattern completion
   */
  static calculatePatternProbability(
    playerTiles: Tile[],
    targetPattern: HandPattern,
    gameState: GameState,
    availableJokers: number = 0
  ): ProbabilityResult {
    
    // Step 1: Determine what tiles we need
    const missingTiles = this.calculateMissingTiles(playerTiles, targetPattern);
    
    // Step 2: Calculate availability of each needed tile
    const tileAvailability = this.calculateTileAvailability(missingTiles, gameState);
    
    // Step 3: Calculate base probabilities
    const baseProbabilities = this.calculateBaseProbabilities(
      missingTiles,
      tileAvailability,
      gameState
    );
    
    // Step 4: Factor in joker substitution possibilities
    const jokerAdjustedProbs = this.calculateJokerAdjustedProbabilities(
      baseProbabilities,
      availableJokers,
      missingTiles,
      targetPattern
    );
    
    // Step 5: Calculate time-based probabilities (turns needed)
    const timeAnalysis = this.calculateTimeBasedAnalysis(
      missingTiles,
      tileAvailability,
      gameState
    );
    
    // Step 6: Generate scenario analysis
    const scenarios = this.generateScenarios(
      missingTiles,
      tileAvailability,
      availableJokers,
      gameState
    );
    
    return {
      completionProbability: jokerAdjustedProbs.overall,
      expectedTurns: timeAnalysis.expectedTurns,
      confidenceInterval: {
        min: Math.max(0, jokerAdjustedProbs.overall - 0.15),
        max: Math.min(1, jokerAdjustedProbs.overall + 0.15)
      },
      tileSpecificOdds: baseProbabilities.tileOdds,
      scenarios: scenarios,
      jokerDependency: jokerAdjustedProbs.jokerBreakdown
    };
  }
  
  /**
   * Calculate what tiles are missing for pattern completion
   */
  private static calculateMissingTiles(
    playerTiles: Tile[],
    targetPattern: HandPattern
  ): Array<{ tileId: string; needed: number; canUseJoker: boolean }> {
    
    const playerTileCount = this.countTiles(playerTiles);
    const requiredTileCount = this.countTiles(targetPattern.requiredTiles);
    const missing: Array<{ tileId: string; needed: number; canUseJoker: boolean }> = [];
    
    Object.entries(requiredTileCount).forEach(([tileId, required]) => {
      const have = playerTileCount[tileId] || 0;
      const need = required - have;
      
      if (need > 0) {
        missing.push({
          tileId,
          needed: need,
          canUseJoker: this.canUseJokerForTile(tileId, targetPattern)
        });
      }
    });
    
    return missing;
  }
  
  /**
   * Calculate how many of each needed tile are still available
   */
  private static calculateTileAvailability(
    missingTiles: Array<{ tileId: string; needed: number }>,
    gameState: GameState
  ): Record<string, number> {
    
    const availability: Record<string, number> = {};
    
    missingTiles.forEach(({ tileId }) => {
      // Start with maximum possible tiles
      const maxPossible = this.getMaxTileCount(tileId);
      
      // Subtract tiles we know are gone
      const discarded = gameState.discardedTiles.filter(d => d.tile.id === tileId).length;
      const exposed = gameState.exposedTiles.filter(t => t.id === tileId).length;
      
      availability[tileId] = Math.max(0, maxPossible - discarded - exposed);
    });
    
    return availability;
  }
  
  /**
   * Calculate base probabilities without joker considerations
   */
  private static calculateBaseProbabilities(
    missingTiles: Array<{ tileId: string; needed: number }>,
    availability: Record<string, number>,
    gameState: GameState
  ): { overall: number; tileOdds: Array<any> } {
    
    const tileOdds: Array<{
      tileId: string;
      needed: number;
      available: number;
      drawProbability: number;
    }> = [];
    
    let overallProbability = 1.0;
    
    missingTiles.forEach(({ tileId, needed }) => {
      const available = availability[tileId] || 0;
      
      // Hypergeometric distribution for drawing needed tiles
      const drawProb = this.calculateHypergeometricProbability(
        needed,
        available,
        gameState.wallTilesRemaining,
        Math.min(needed * 3, gameState.wallTilesRemaining) // Estimated draws
      );
      
      tileOdds.push({
        tileId,
        needed,
        available,
        drawProbability: drawProb
      });
      
      // Multiply probabilities (assuming independence - simplified model)
      overallProbability *= drawProb;
    });
    
    return { overall: overallProbability, tileOdds };
  }
  
  /**
   * Adjust probabilities considering joker substitution
   */
  private static calculateJokerAdjustedProbabilities(
    baseProbabilities: { overall: number; tileOdds: Array<any> },
    availableJokers: number,
    missingTiles: Array<{ tileId: string; needed: number; canUseJoker: boolean }>,
    targetPattern: HandPattern
  ): { overall: number; jokerBreakdown: any } {
    
    // Calculate total tiles needed that can use jokers
    const jokerEligibleTiles = missingTiles
      .filter(t => t.canUseJoker)
      .reduce((sum, t) => sum + t.needed, 0);
    
    const totalTilesNeeded = missingTiles.reduce((sum, t) => sum + t.needed, 0);
    
    // Different scenarios based on joker usage
    const withoutJokers = baseProbabilities.overall;
    
    let withOneJoker = withoutJokers;
    let withTwoJokers = withoutJokers;
    let optimal = withoutJokers;
    
    if (availableJokers >= 1 && jokerEligibleTiles > 0) {
      // Using 1 joker reduces tiles needed by 1
      withOneJoker = this.recalculateWithFewerTiles(
        baseProbabilities,
        missingTiles,
        1
      );
    }
    
    if (availableJokers >= 2 && jokerEligibleTiles > 1) {
      // Using 2 jokers reduces tiles needed by 2
      withTwoJokers = this.recalculateWithFewerTiles(
        baseProbabilities,
        missingTiles,
        2
      );
    }
    
    // Optimal usage depends on the specific situation
    optimal = Math.max(withoutJokers, withOneJoker, withTwoJokers);
    
    // The overall probability is the optimal scenario
    const overall = Math.min(1.0, optimal * 1.1); // Small bonus for joker flexibility
    
    return {
      overall,
      jokerBreakdown: {
        withoutJokers,
        withOneJoker,
        withTwoJokers,
        optimal
      }
    };
  }
  
  /**
   * Calculate time-based analysis (expected turns)
   */
  private static calculateTimeBasedAnalysis(
    missingTiles: Array<{ tileId: string; needed: number }>,
    availability: Record<string, number>,
    gameState: GameState
  ): { expectedTurns: number; confidence: number } {
    
    const totalNeeded = missingTiles.reduce((sum, t) => sum + t.needed, 0);
    
    if (totalNeeded === 0) {
      return { expectedTurns: 0, confidence: 1.0 };
    }
    
    // Calculate weighted average of turns needed per tile
    let weightedTurns = 0;
    let totalWeight = 0;
    
    missingTiles.forEach(({ tileId, needed }) => {
      const available = availability[tileId] || 0;
      const probability = available / gameState.wallTilesRemaining;
      
      // Expected turns to draw one of this tile
      const expectedTurnsForOne = probability > 0 ? 1 / probability : 50;
      const expectedTurnsForAll = expectedTurnsForOne * needed;
      
      weightedTurns += expectedTurnsForAll * needed;
      totalWeight += needed;
    });
    
    const expectedTurns = totalWeight > 0 ? weightedTurns / totalWeight : 50;
    
    // Confidence decreases with more tiles needed and fewer turns remaining
    const turnsRemaining = Math.floor(gameState.wallTilesRemaining / gameState.playersRemaining);
    const confidence = Math.max(0.1, Math.min(1.0, turnsRemaining / expectedTurns));
    
    return { expectedTurns: Math.ceil(expectedTurns), confidence };
  }
  
  /**
   * Generate best/worst/average case scenarios
   */
  private static generateScenarios(
    missingTiles: Array<{ tileId: string; needed: number }>,
    availability: Record<string, number>,
    availableJokers: number,
    gameState: GameState
  ): { best: any; worst: any; average: any } {
    
    const totalNeeded = missingTiles.reduce((sum, t) => sum + t.needed, 0);
    
    // Best case: Draw everything we need quickly
    const bestTurns = Math.max(1, Math.ceil(totalNeeded / 2));
    const bestProb = Math.pow(0.8, totalNeeded); // Optimistic probability
    
    // Worst case: Need to wait for everything
    const worstTurns = Math.min(50, totalNeeded * 8);
    const worstProb = Math.pow(0.2, Math.max(1, totalNeeded - availableJokers));
    
    // Average case: Expected scenario
    const avgTurns = Math.ceil(totalNeeded * 3);
    const avgProb = Math.pow(0.5, Math.max(1, totalNeeded - Math.floor(availableJokers / 2)));
    
    return {
      best: { turns: bestTurns, probability: bestProb },
      worst: { turns: worstTurns, probability: worstProb },
      average: { turns: avgTurns, probability: avgProb }
    };
  }
  
  /**
   * Hypergeometric probability calculation
   * P(X = k) = C(K,k) * C(N-K,n-k) / C(N,n)
   */
  private static calculateHypergeometricProbability(
    successes: number,      // k - number of successes we want
    populationSuccesses: number, // K - successes in population
    populationSize: number,     // N - total population
    sampleSize: number          // n - sample size
  ): number {
    
    if (successes > sampleSize || successes > populationSuccesses) {
      return 0;
    }
    
    if (populationSize <= 0 || sampleSize <= 0) {
      return 0;
    }
    
    // Simplified approximation for large numbers
    if (populationSize > 50) {
      const p = populationSuccesses / populationSize;
      return Math.pow(p, successes) * Math.pow(1 - p, sampleSize - successes);
    }
    
    // Exact calculation for smaller numbers (using approximation to avoid factorial overflow)
    const prob = (populationSuccesses / populationSize) * 
                 Math.min(1, sampleSize / (populationSize - populationSuccesses + 1));
    
    return Math.pow(prob, successes);
  }
  
  /**
   * Recalculate probability with fewer tiles needed (due to joker usage)
   */
  private static recalculateWithFewerTiles(
    baseProbabilities: { overall: number; tileOdds: Array<any> },
    missingTiles: Array<{ tileId: string; needed: number; canUseJoker: boolean }>,
    jokersUsed: number
  ): number {
    
    // Find the tiles that benefit most from joker substitution
    const jokerCandidates = missingTiles
      .filter(t => t.canUseJoker)
      .sort((a, b) => {
        // Prioritize tiles that are harder to get
        const aOdds = baseProbabilities.tileOdds.find(o => o.tileId === a.tileId)?.drawProbability || 0;
        const bOdds = baseProbabilities.tileOdds.find(o => o.tileId === b.tileId)?.drawProbability || 0;
        return aOdds - bOdds; // Lower probability first (harder to get)
      });
    
    // Simulate using jokers for the hardest-to-get tiles
    let improvedProbability = baseProbabilities.overall;
    let jokersRemaining = jokersUsed;
    
    jokerCandidates.forEach(tile => {
      if (jokersRemaining > 0) {
        const tileOdd = baseProbabilities.tileOdds.find(o => o.tileId === tile.tileId);
        if (tileOdd && tileOdd.drawProbability < 0.7) {
          // Using joker improves our odds significantly for hard-to-get tiles
          improvedProbability /= tileOdd.drawProbability; // Remove the low probability
          improvedProbability *= 0.9; // Replace with high certainty (joker availability)
          jokersRemaining--;
        }
      }
    });
    
    return Math.min(1.0, improvedProbability);
  }
  
  // Helper methods
  private static countTiles(tiles: Tile[]): Record<string, number> {
    return tiles.reduce((count, tile) => {
      count[tile.id] = (count[tile.id] || 0) + 1;
      return count;
    }, {} as Record<string, number>);
  }
  
  private static getMaxTileCount(tileId: string): number {
    // Extract suit and value from tileId
    const tile = { id: tileId } as Tile; // Simplified - would parse properly
    
    if (tileId.includes('joker')) return 8;
    if (tileId.includes('flower')) return 1;
    return 4; // Standard count for most tiles
  }
  
  private static canUseJokerForTile(tileId: string, pattern: HandPattern): boolean {
    // Jokers generally cannot be used for flowers or in pairs (pattern-specific)
    if (tileId.includes('flower')) return false;
    
    // TODO: This would need pattern-specific logic to determine if the tile is part of a pair
    // For now, assume most tiles can use jokers
    return true;
  }
  
  /**
   * Calculate win probability against opponents
   */
  static calculateWinProbability(
    ownCompletion: number,
    opponentCompletions: number[],
    turnsRemaining: number
  ): number {
    
    // Adjust our completion chance based on time pressure
    const timeAdjustedCompletion = ownCompletion * Math.min(1, turnsRemaining / 10);
    
    // Calculate probability that we win before any opponent
    let winProbability = timeAdjustedCompletion;
    
    opponentCompletions.forEach(oppCompletion => {
      const oppTimeAdjusted = oppCompletion * Math.min(1, turnsRemaining / 12); // Slightly slower for opponents
      winProbability *= (1 - oppTimeAdjusted);
    });
    
    return Math.max(0, Math.min(1, winProbability));
  }
}