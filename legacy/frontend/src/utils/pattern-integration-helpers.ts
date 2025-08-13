// frontend/src/utils/pattern-integration-helpers.ts
// Helper utilities to integrate pattern search with existing game systems

import type { Tile } from '../types';
import { PatternSearchEngine, type PatternSearchResult } from './pattern-search-engine';
import { nmjl2025Loader } from './nmjl-2025-loader';

/**
 * Find patterns that could work with the player's current tiles
 */
export function findViablePatternsForHand(
  playerTiles: Tile[],
  minCompletion: number = 0.3,
  maxResults: number = 10
): PatternSearchResult[] {
  return PatternSearchEngine.findPatternsForTiles(playerTiles, minCompletion)
    .slice(0, maxResults);
}

/**
 * Get pattern recommendations based on game phase and context
 */
export function getContextualPatternRecommendations(
  playerTiles: Tile[],
  gamePhase: 'charleston' | 'playing',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _availableJokers: number = 0
): {
  recommended: PatternSearchResult[];
  alternative: PatternSearchResult[];
  challenging: PatternSearchResult[];
} {
  // Find all viable patterns
  const allViable = findViablePatternsForHand(playerTiles, 0.2, 20);
  
  // Categorize by strategic value
  const recommended = allViable.filter(p => 
    p.pattern.Hand_Difficulty === 'easy' && 
    p.matchScore >= 0.5
  ).slice(0, 3);
  
  const alternative = allViable.filter(p => 
    p.pattern.Hand_Difficulty === 'medium' && 
    p.matchScore >= 0.4
  ).slice(0, 4);
  
  const challenging = allViable.filter(p => 
    p.pattern.Hand_Difficulty === 'hard' && 
    p.matchScore >= 0.3 &&
    p.pattern.Hand_Points >= 40
  ).slice(0, 2);
  
  return { recommended, alternative, challenging };
}

/**
 * Get pattern statistics relevant to current hand
 */
export function getHandPatternStats(playerTiles: Tile[]): {
  totalViablePatterns: number;
  averageCompletion: number;
  bestCompletionRate: number;
  highestValuePattern: PatternSearchResult | null;
  easiestPattern: PatternSearchResult | null;
} {
  const viablePatterns = findViablePatternsForHand(playerTiles, 0.1, 50);
  
  if (viablePatterns.length === 0) {
    return {
      totalViablePatterns: 0,
      averageCompletion: 0,
      bestCompletionRate: 0,
      highestValuePattern: null,
      easiestPattern: null
    };
  }
  
  const totalCompletion = viablePatterns.reduce((sum, p) => sum + p.matchScore, 0);
  const averageCompletion = totalCompletion / viablePatterns.length;
  const bestCompletionRate = Math.max(...viablePatterns.map(p => p.matchScore));
  
  const highestValuePattern = viablePatterns.reduce((best, current) => 
    current.pattern.Hand_Points > best.pattern.Hand_Points ? current : best
  );
  
  const easiestPattern = viablePatterns
    .filter(p => p.pattern.Hand_Difficulty === 'easy')
    .sort((a, b) => b.matchScore - a.matchScore)[0] || null;
  
  return {
    totalViablePatterns: viablePatterns.length,
    averageCompletion,
    bestCompletionRate,
    highestValuePattern,
    easiestPattern
  };
}

/**
 * Find patterns that use specific tiles (for Charleston recommendations)
 */
export function findPatternsUsingTiles(
  tileIds: string[],
  preferredDifficulty?: 'easy' | 'medium' | 'hard'
): PatternSearchResult[] {
  const filters = {
    containsTiles: tileIds,
    difficulty: preferredDifficulty ? [preferredDifficulty] : undefined
  };
  
  return PatternSearchEngine.searchPatterns(filters);
}

/**
 * Get strategic advice for Charleston phase based on pattern analysis
 */
export function getCharlestonAdviceFromPatterns(
  playerTiles: Tile[],
  tilesToPass: Tile[]
): {
  advice: string[];
  patternsLost: PatternSearchResult[];
  patternsGained: PatternSearchResult[];
  strategicImpact: 'positive' | 'negative' | 'neutral';
} {
  const advice: string[] = [];
  
  // Analyze current hand patterns
  const currentPatterns = findViablePatternsForHand(playerTiles, 0.3, 10);
  
  // Analyze hand after Charleston
  const tilesAfterPass = playerTiles.filter(tile => 
    !tilesToPass.some(passedTile => passedTile.id === tile.id)
  );
  const patternsAfterPass = findViablePatternsForHand(tilesAfterPass, 0.3, 10);
  
  // Find patterns lost and gained
  const patternsLost = currentPatterns.filter(current =>
    !patternsAfterPass.some(after => after.pattern["Pattern ID"] === current.pattern["Pattern ID"])
  );
  
  const patternsGained = patternsAfterPass.filter(after =>
    !currentPatterns.some(current => current.pattern["Pattern ID"] === after.pattern["Pattern ID"])
  );
  
  // Determine strategic impact
  let strategicImpact: 'positive' | 'negative' | 'neutral' = 'neutral';
  
  if (patternsGained.length > patternsLost.length) {
    strategicImpact = 'positive';
    advice.push(`Good pass - opens up ${patternsGained.length} new pattern options`);
  } else if (patternsLost.length > patternsGained.length) {
    strategicImpact = 'negative';
    advice.push(`Careful - this pass closes ${patternsLost.length} pattern options`);
  }
  
  // Specific advice based on patterns
  if (patternsLost.length > 0) {
    const highValueLost = patternsLost.find(p => p.pattern.Hand_Points >= 40);
    if (highValueLost) {
      advice.push(`⚠️ Passing tiles needed for ${highValueLost.pattern.Hand_Points}-point pattern`);
    }
  }
  
  if (patternsGained.length > 0) {
    const bestGained = patternsGained.sort((a, b) => b.pattern.Hand_Points - a.pattern.Hand_Points)[0];
    advice.push(`✓ Pass enables ${bestGained.pattern.Hand_Points}-point pattern possibility`);
  }
  
  return {
    advice,
    patternsLost,
    patternsGained,
    strategicImpact
  };
}

/**
 * Quick search for specific pattern types
 */
export function quickPatternSearch(query: string): PatternSearchResult[] {
  return PatternSearchEngine.searchPatterns({
    searchText: query
  }).slice(0, 5);
}

/**
 * Get pattern completion status with detailed breakdown
 */
export function getDetailedPatternCompletion(
  playerTiles: Tile[],
  patternId: number
): {
  pattern: PatternSearchResult | null;
  completion: number;
  missingTiles: string[];
  exactMatches: string[];
  jokersNeeded: number;
  canComplete: boolean;
} | null {
  const pattern = nmjl2025Loader.getPatternById(patternId);
  if (!pattern) return null;
  
  // This would integrate with the enhanced hand analyzer
  // For now, return basic completion info
  const viablePatterns = findViablePatternsForHand(playerTiles, 0.1);
  const matchingPattern = viablePatterns.find(p => p.pattern["Pattern ID"] === patternId);
  
  if (!matchingPattern) {
    return {
      pattern: null,
      completion: 0,
      missingTiles: [],
      exactMatches: [],
      jokersNeeded: 0,
      canComplete: false
    };
  }
  
  return {
    pattern: matchingPattern,
    completion: matchingPattern.matchScore,
    missingTiles: [], // Would be calculated by enhanced analyzer
    exactMatches: [], // Would be calculated by enhanced analyzer
    jokersNeeded: 0,  // Would be calculated by enhanced analyzer
    canComplete: matchingPattern.matchScore >= 0.8
  };
}

/**
 * Export commonly used pattern categories for UI
 */
export const PATTERN_CATEGORIES = {
  BEGINNER_FRIENDLY: ['like_numbers', 'singles_pairs', 'flowers'],
  ADVANCED: ['consecutive', 'year_hands', 'honors'],
  HIGH_SCORING: ['pungs_kongs', 'sequences'],
  JOKER_FRIENDLY: ['mixed', 'honors', 'consecutive']
} as const;

/**
 * Get patterns suitable for beginners
 */
export function getBeginnerPatterns(): PatternSearchResult[] {
  return PatternSearchEngine.searchPatterns({
    difficulty: ['easy'],
    pointRange: { min: 25, max: 35 },
    allowsJokers: true
  });
}