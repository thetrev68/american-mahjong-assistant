// frontend/src/types/nmjl-2025-types.ts
// TypeScript interfaces for the 2025 NMJL card JSON structure

export type ConstraintType = 'kong' | 'pung' | 'sequence' | 'pair' | 'single' | 'consecutive' | 'like';
export type SuitRole = 'first' | 'second' | 'third' | 'any' | 'none';
export type HandDifficulty = 'easy' | 'medium' | 'hard';

/**
 * Represents a single constraint group within a pattern
 */
export interface PatternGroup {
  /** Group identifier (e.g., "FFFF", "2025", "222_1") */
  Group: string;
  
  /** Role of this group's suit in the overall pattern */
  Suit_Role: SuitRole;
  
  /** Additional suit-specific notes */
  Suit_Note: string | null;
  
  /** Type of constraint for this group */
  Constraint_Type: ConstraintType;
  
  /** Values required for this constraint (comma-separated string) */
  Constraint_Values: string;
  
  /** ID of another group that must match this group's constraint */
  Constraint_Must_Match: string | null;
  
  /** Additional constraint modifiers (e.g., "zero_is_neutral") */
  Constraint_Extra: string | null;
  
  /** Whether jokers can be used in this group */
  Jokers_Allowed: boolean;
}

/**
 * Represents a complete NMJL pattern from the 2025 card
 */
export interface NMJL2025Pattern {
  /** Card year */
  Year: number;
  
  /** Section number on the card */
  Section: number;
  
  /** Line number within the section */
  Line: number;
  
  /** Unique pattern identifier */
  "Pattern ID": number;
  
  /** Unique key combining year-section-line-pattern */
  Hands_Key: string;
  
  /** Pattern representation (e.g., "FFFF 2025 222 222") */
  Hand_Pattern: string;
  
  /** Human-readable description of the pattern */
  Hand_Description: string;
  
  /** Point value of this pattern */
  Hand_Points: number;
  
  /** Whether this pattern must be concealed */
  Hand_Conceiled: boolean;
  
  /** Difficulty rating */
  Hand_Difficulty: HandDifficulty;
  
  /** Additional notes about the pattern */
  Hand_Notes: string | null;
  
  /** Array of constraint groups that make up this pattern */
  Groups: PatternGroup[];
}

/**
 * Parsed constraint values for easier processing
 */
export interface ParsedConstraint {
  /** Original constraint string */
  raw: string;
  
  /** Parsed values as numbers (null for special values like flowers) */
  values: (number | null)[];
  
  /** Whether this constraint allows zero as neutral */
  allowsZeroNeutral: boolean;
  
  /** Special constraint types */
  isFlower: boolean;
  isDragon: boolean;
  isWind: boolean;
}

/**
 * Pattern analysis result with probability scoring
 */
export interface PatternAnalysisResult {
  /** The pattern being analyzed */
  pattern: NMJL2025Pattern;
  
  /** How well current hand matches this pattern (0-100) */
  matchPercentage: number;
  
  /** Number of tiles needed to complete this pattern */
  tilesNeeded: number;
  
  /** Specific tiles that would complete this pattern */
  completingTiles: string[];
  
  /** Groups that are already satisfied */
  completedGroups: PatternGroup[];
  
  /** Groups that still need tiles */
  incompleteGroups: PatternGroup[];
  
  /** Whether this pattern is achievable with jokers */
  canUseJokers: boolean;
  
  /** Minimum jokers required to complete */
  jokersNeeded: number;
  
  /** Estimated probability of completing this pattern */
  completionProbability: number;
}

/**
 * Charleston-specific pattern recommendation
 */
export interface CharlestonPatternRecommendation {
  /** Patterns to prioritize */
  targetPatterns: PatternAnalysisResult[];
  
  /** Tiles essential for target patterns */
  criticalTiles: string[];
  
  /** Tiles safe to pass */
  expendableTiles: string[];
  
  /** Strategic advice for this Charleston phase */
  strategy: string;
  
  /** Overall confidence in recommendations (0-100) */
  confidence: number;
}

/**
 * Enhanced tile recommendation with pattern context
 */
export interface EnhancedTileRecommendation {
  /** The tile being analyzed */
  tileId: string;
  
  /** Recommendation: keep, pass, or neutral */
  recommendation: 'keep' | 'pass' | 'neutral';
  
  /** Confidence in this recommendation (0-100) */
  confidence: number;
  
  /** Patterns this tile contributes to */
  contributingPatterns: NMJL2025Pattern[];
  
  /** Reason for the recommendation */
  reasoning: string;
  
  /** Priority score (higher = more important) */
  priority: number;
}