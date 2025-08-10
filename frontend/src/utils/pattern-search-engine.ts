// frontend/src/utils/pattern-search-engine.ts
// Advanced pattern search and filtering engine for NMJL 2025 card
// Enables players to explore, search, and filter all 71 authentic patterns

import { nmjl2025Loader } from './nmjl-2025-loader';
import { NMJLPatternAdapter } from './nmjl-pattern-adapter';
import type { NMJL2025Pattern } from '../types/nmjl-2025-types';
import type { HandPattern, Tile } from '../types';

export interface PatternSearchFilters {
  // Basic filters
  difficulty?: ('easy' | 'medium' | 'hard')[];
  points?: number[];
  pointRange?: { min: number; max: number };
  
  // Pattern type filters
  categories?: PatternCategory[];
  requiresJokers?: boolean;
  allowsJokers?: boolean;
  isConcealed?: boolean;
  
  // Tile-based filters
  containsTiles?: string[]; // Tile IDs that must be present
  excludesTiles?: string[]; // Tile IDs that must not be present
  usesFlowers?: boolean;
  usesHonors?: boolean; // Winds/Dragons
  suitsRequired?: ('bams' | 'cracks' | 'dots' | 'winds' | 'dragons' | 'flowers')[];
  
  // Advanced filters
  groupCount?: number; // Number of groups in pattern
  hasSequences?: boolean;
  hasPairs?: boolean;
  hasPungs?: boolean;
  hasKongs?: boolean;
  
  // Search terms
  searchText?: string; // Search in names and descriptions
}

export type PatternCategory = 
  | 'year_hands'      // 2025-specific patterns
  | 'like_numbers'    // Same numbers across suits
  | 'consecutive'     // Sequential patterns
  | 'honors'          // Winds/Dragons focus
  | 'mixed'           // Various tile combinations
  | 'flowers'         // Flower-heavy patterns
  | 'sequences'       // Run-based patterns
  | 'singles_pairs'   // Single/pair combinations
  | 'pungs_kongs';    // Pung/kong focus

export interface PatternSearchResult {
  pattern: NMJL2025Pattern;
  handPattern: HandPattern;
  category: PatternCategory;
  matchScore: number; // Relevance score for search
  highlightedText?: string; // Text with search terms highlighted
}

export interface PatternStats {
  totalPatterns: number;
  byDifficulty: Record<string, number>;
  byPoints: Record<number, number>;
  byCategory: Record<PatternCategory, number>;
  jokerPatterns: number;
  concealedPatterns: number;
  averagePoints: number;
}

/**
 * Advanced Pattern Search and Filter Engine
 */
export class PatternSearchEngine {
  
  /**
   * Search and filter patterns with comprehensive options
   */
  static searchPatterns(filters: PatternSearchFilters = {}): PatternSearchResult[] {
    const allPatterns = nmjl2025Loader.getAllPatterns();
    const results: PatternSearchResult[] = [];
    
    // Convert patterns and categorize
    for (const nmjlPattern of allPatterns) {
      const handPattern = NMJLPatternAdapter.convertToHandPattern(nmjlPattern);
      const category = this.categorizePattern(nmjlPattern);
      
      // Check if pattern matches all filters
      if (this.matchesFilters(nmjlPattern, handPattern, category, filters)) {
        const matchScore = this.calculateMatchScore(nmjlPattern, handPattern, filters);
        const highlightedText = this.highlightSearchTerms(
          `${nmjlPattern.Hand_Description} ${nmjlPattern.Hand_Pattern}`,
          filters.searchText
        );
        
        results.push({
          pattern: nmjlPattern,
          handPattern,
          category,
          matchScore,
          highlightedText
        });
      }
    }
    
    // Sort by relevance score (highest first)
    return results.sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Get comprehensive statistics about all patterns
   */
  static getPatternStatistics(): PatternStats {
    const allPatterns = nmjl2025Loader.getAllPatterns();
    
    const stats: PatternStats = {
      totalPatterns: allPatterns.length,
      byDifficulty: {},
      byPoints: {},
      byCategory: {} as Record<PatternCategory, number>,
      jokerPatterns: 0,
      concealedPatterns: 0,
      averagePoints: 0
    };
    
    let totalPoints = 0;
    
    for (const pattern of allPatterns) {
      // Difficulty distribution
      const difficulty = pattern.Hand_Difficulty || 'medium';
      stats.byDifficulty[difficulty] = (stats.byDifficulty[difficulty] || 0) + 1;
      
      // Points distribution
      const points = pattern.Hand_Points || 25;
      stats.byPoints[points] = (stats.byPoints[points] || 0) + 1;
      totalPoints += points;
      
      // Category distribution
      const category = this.categorizePattern(pattern);
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
      
      // Joker patterns
      if (pattern.Groups?.some(g => g.Jokers_Allowed)) {
        stats.jokerPatterns++;
      }
      
      // Concealed patterns
      if (pattern.Hand_Conceiled) {
        stats.concealedPatterns++;
      }
    }
    
    stats.averagePoints = Math.round(totalPoints / allPatterns.length);
    return stats;
  }

  /**
   * Find patterns similar to a given pattern
   */
  static findSimilarPatterns(
    targetPattern: NMJL2025Pattern,
    limit: number = 5
  ): PatternSearchResult[] {
    const allPatterns = nmjl2025Loader.getAllPatterns()
      .filter(p => p["Pattern ID"] !== targetPattern["Pattern ID"]);
    
    const results: PatternSearchResult[] = [];
    
    for (const pattern of allPatterns) {
      const similarity = this.calculatePatternSimilarity(targetPattern, pattern);
      if (similarity > 0.3) { // Only include reasonably similar patterns
        const handPattern = NMJLPatternAdapter.convertToHandPattern(pattern);
        const category = this.categorizePattern(pattern);
        
        results.push({
          pattern,
          handPattern,
          category,
          matchScore: similarity,
          highlightedText: `${pattern.Hand_Description} (${Math.round(similarity * 100)}% similar)`
        });
      }
    }
    
    return results
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
  }

  /**
   * Find patterns that work well with given tiles
   */
  static findPatternsForTiles(
    tiles: Tile[],
    minCompletion: number = 0.3
  ): PatternSearchResult[] {
    const allPatterns = nmjl2025Loader.getAllPatterns();
    const results: PatternSearchResult[] = [];
    
    // Count available tiles
    const tileCount = new Map<string, number>();
    tiles.forEach(tile => {
      tileCount.set(tile.id, (tileCount.get(tile.id) || 0) + 1);
    });
    
    for (const nmjlPattern of allPatterns) {
      const handPattern = NMJLPatternAdapter.convertToHandPattern(nmjlPattern);
      const completion = this.calculatePatternCompletion(handPattern, tileCount);
      
      if (completion >= minCompletion) {
        const category = this.categorizePattern(nmjlPattern);
        
        results.push({
          pattern: nmjlPattern,
          handPattern,
          category,
          matchScore: completion,
          highlightedText: `${nmjlPattern.Hand_Description} (${Math.round(completion * 100)}% match)`
        });
      }
    }
    
    return results.sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Get patterns by specific categories
   */
  static getPatternsByCategory(category: PatternCategory): PatternSearchResult[] {
    return this.searchPatterns({ categories: [category] });
  }

  /**
   * Get quick filter presets for common searches
   */
  static getFilterPresets(): Record<string, PatternSearchFilters> {
    return {
      'beginner_friendly': {
        difficulty: ['easy'],
        pointRange: { min: 25, max: 30 },
        allowsJokers: true
      },
      'high_scoring': {
        pointRange: { min: 40, max: 75 },
        difficulty: ['medium', 'hard']
      },
      'year_2025': {
        categories: ['year_hands'],
        searchText: '2025'
      },
      'joker_heavy': {
        requiresJokers: true,
        allowsJokers: true
      },
      'no_jokers': {
        allowsJokers: false,
        requiresJokers: false
      },
      'flowers_required': {
        usesFlowers: true,
        containsTiles: ['f1flowers', 'f2flowers', 'f3flowers', 'f4flowers']
      },
      'winds_dragons': {
        categories: ['honors'],
        usesHonors: true
      },
      'like_numbers': {
        categories: ['like_numbers']
      },
      'consecutive_runs': {
        categories: ['consecutive', 'sequences'],
        hasSequences: true
      },
      'concealed_only': {
        isConcealed: true
      }
    };
  }

  /**
   * Categorize a pattern based on its characteristics
   */
  private static categorizePattern(pattern: NMJL2025Pattern): PatternCategory {
    const description = pattern.Hand_Description?.toLowerCase() || '';
    const handPattern = pattern.Hand_Pattern?.toLowerCase() || '';
    const combined = `${description} ${handPattern}`;
    
    // Check for specific pattern types
    if (combined.includes('2025') || combined.includes('year')) {
      return 'year_hands';
    }
    
    if (combined.includes('like') || combined.includes('same number')) {
      return 'like_numbers';
    }
    
    if (combined.includes('consecutive') || combined.includes('run')) {
      return 'consecutive';
    }
    
    if (combined.includes('wind') || combined.includes('dragon') || 
        combined.includes('honor') || combined.includes('eeee') || 
        combined.includes('rrr') || combined.includes('ggg')) {
      return 'honors';
    }
    
    if (combined.includes('flower') || combined.includes('fff')) {
      return 'flowers';
    }
    
    if (combined.includes('sequence') || combined.includes('123') || 
        combined.includes('456') || combined.includes('789')) {
      return 'sequences';
    }
    
    if (combined.includes('single') || combined.includes('pair') || 
        combined.includes('11 22') || combined.includes('pairs')) {
      return 'singles_pairs';
    }
    
    if (combined.includes('pung') || combined.includes('kong') || 
        combined.includes('111') || combined.includes('1111')) {
      return 'pungs_kongs';
    }
    
    return 'mixed';
  }

  /**
   * Check if pattern matches all specified filters
   */
  private static matchesFilters(
    nmjlPattern: NMJL2025Pattern,
    handPattern: HandPattern,
    category: PatternCategory,
    filters: PatternSearchFilters
  ): boolean {
    
    // Difficulty filter
    if (filters.difficulty && !filters.difficulty.includes(nmjlPattern.Hand_Difficulty)) {
      return false;
    }
    
    // Points filters
    if (filters.points && !filters.points.includes(nmjlPattern.Hand_Points)) {
      return false;
    }
    
    if (filters.pointRange) {
      const points = nmjlPattern.Hand_Points;
      if (points < filters.pointRange.min || points > filters.pointRange.max) {
        return false;
      }
    }
    
    // Category filter
    if (filters.categories && !filters.categories.includes(category)) {
      return false;
    }
    
    // Joker filters
    const allowsJokers = nmjlPattern.Groups?.some(g => g.Jokers_Allowed) || false;
    if (filters.requiresJokers === true && !allowsJokers) {
      return false;
    }
    if (filters.allowsJokers === false && allowsJokers) {
      return false;
    }
    
    // Concealed filter
    if (filters.isConcealed !== undefined && nmjlPattern.Hand_Conceiled !== filters.isConcealed) {
      return false;
    }
    
    // Search text filter
    if (filters.searchText) {
      const searchText = filters.searchText.toLowerCase();
      const searchableText = `${nmjlPattern.Hand_Description} ${nmjlPattern.Hand_Pattern} ${handPattern.name}`.toLowerCase();
      if (!searchableText.includes(searchText)) {
        return false;
      }
    }
    
    // Advanced filters would go here (tiles, suits, groups, etc.)
    // Simplified for now but can be extended
    
    return true;
  }

  /**
   * Calculate relevance score for search results
   */
  private static calculateMatchScore(
    nmjlPattern: NMJL2025Pattern,
    handPattern: HandPattern,
    filters: PatternSearchFilters
  ): number {
    let score = 0;
    
    // Base score
    score += 10;
    
    // Boost for exact difficulty match
    if (filters.difficulty && filters.difficulty.includes(nmjlPattern.Hand_Difficulty)) {
      score += 5;
    }
    
    // Boost for point value preferences
    if (filters.pointRange) {
      const points = nmjlPattern.Hand_Points;
      const range = filters.pointRange.max - filters.pointRange.min;
      const position = (points - filters.pointRange.min) / range;
      score += Math.round(5 * (1 - Math.abs(0.5 - position))); // Peak at middle of range
    }
    
    // Boost for search term matches
    if (filters.searchText) {
      const searchText = filters.searchText.toLowerCase();
      const description = nmjlPattern.Hand_Description?.toLowerCase() || '';
      const pattern = nmjlPattern.Hand_Pattern?.toLowerCase() || '';
      
      // Exact matches get highest score
      if (description.includes(searchText)) score += 15;
      if (pattern.includes(searchText)) score += 10;
      
      // Partial matches get lower score
      const words = searchText.split(' ');
      words.forEach(word => {
        if (description.includes(word)) score += 3;
        if (pattern.includes(word)) score += 2;
      });
    }
    
    return score;
  }

  /**
   * Calculate similarity between two patterns
   */
  private static calculatePatternSimilarity(
    pattern1: NMJL2025Pattern,
    pattern2: NMJL2025Pattern
  ): number {
    let similarity = 0;
    
    // Same difficulty
    if (pattern1.Hand_Difficulty === pattern2.Hand_Difficulty) {
      similarity += 0.2;
    }
    
    // Similar points (within 10 points)
    const pointDiff = Math.abs(pattern1.Hand_Points - pattern2.Hand_Points);
    if (pointDiff <= 5) similarity += 0.2;
    else if (pointDiff <= 10) similarity += 0.1;
    
    // Same concealed status
    if (pattern1.Hand_Conceiled === pattern2.Hand_Conceiled) {
      similarity += 0.1;
    }
    
    // Similar group structure
    if (pattern1.Groups && pattern2.Groups) {
      const groups1 = pattern1.Groups.length;
      const groups2 = pattern2.Groups.length;
      if (groups1 === groups2) {
        similarity += 0.2;
      } else if (Math.abs(groups1 - groups2) === 1) {
        similarity += 0.1;
      }
    }
    
    // Similar joker usage
    const jokers1 = pattern1.Groups?.some(g => g.Jokers_Allowed) || false;
    const jokers2 = pattern2.Groups?.some(g => g.Jokers_Allowed) || false;
    if (jokers1 === jokers2) {
      similarity += 0.1;
    }
    
    // Text similarity (simplified)
    const desc1 = pattern1.Hand_Description?.toLowerCase() || '';
    const desc2 = pattern2.Hand_Description?.toLowerCase() || '';
    const commonWords = this.getCommonWords(desc1, desc2);
    similarity += Math.min(0.2, commonWords * 0.05);
    
    return Math.min(1.0, similarity);
  }

  /**
   * Calculate pattern completion percentage for given tiles
   */
  private static calculatePatternCompletion(
    handPattern: HandPattern,
    tileCount: Map<string, number>
  ): number {
    const requiredTileCount = new Map<string, number>();
    handPattern.requiredTiles.forEach(tile => {
      requiredTileCount.set(tile.id, (requiredTileCount.get(tile.id) || 0) + 1);
    });
    
    let matches = 0;
    let total = 0;
    
    requiredTileCount.forEach((needed, tileId) => {
      const available = tileCount.get(tileId) || 0;
      matches += Math.min(available, needed);
      total += needed;
    });
    
    return total > 0 ? matches / total : 0;
  }

  /**
   * Highlight search terms in text
   */
  private static highlightSearchTerms(text: string, searchText?: string): string {
    if (!searchText || !text) return text;
    
    const terms = searchText.toLowerCase().split(' ').filter(t => t.length > 1);
    let highlighted = text;
    
    terms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    });
    
    return highlighted;
  }

  /**
   * Count common words between two strings
   */
  private static getCommonWords(text1: string, text2: string): number {
    const words1 = new Set(text1.split(' ').filter(w => w.length > 2));
    const words2 = new Set(text2.split(' ').filter(w => w.length > 2));
    
    let common = 0;
    words1.forEach(word => {
      if (words2.has(word)) common++;
    });
    
    return common;
  }
}

// Export singleton for convenience
export const patternSearchEngine = PatternSearchEngine;