// frontend/src/utils/nmjl-2025-loader.ts
// Pattern data loader and indexing for the 2025 NMJL card

import type { 
  NMJL2025Pattern, 
  PatternGroup, 
  ParsedConstraint, 
  HandDifficulty 
} from '../types/nmjl-2025-types';

/**
 * Indexed pattern data for fast lookups
 */
export interface PatternIndex {
  /** All patterns by ID */
  byId: Map<number, NMJL2025Pattern>;
  
  /** Patterns grouped by point value */
  byPoints: Map<number, NMJL2025Pattern[]>;
  
  /** Patterns grouped by difficulty */
  byDifficulty: Map<HandDifficulty, NMJL2025Pattern[]>;
  
  /** Patterns that require specific suits */
  bySuitRequirement: Map<string, NMJL2025Pattern[]>;
  
  /** Patterns by section for card reference */
  bySection: Map<number, NMJL2025Pattern[]>;
  
  /** Patterns that allow/require jokers */
  jokerPatterns: NMJL2025Pattern[];
  concealedPatterns: NMJL2025Pattern[];
  
  /** All patterns in original order */
  all: NMJL2025Pattern[];
}

/**
 * NMJL 2025 Card Data Manager
 */
export class NMJL2025Loader {
  private static instance: NMJL2025Loader;
  private patterns: NMJL2025Pattern[];
  private index: PatternIndex;
  
  private constructor() {
    this.patterns = this.loadAndValidatePatterns();
    this.index = this.buildIndex();
  }
  
  public static getInstance(): NMJL2025Loader {
    if (!NMJL2025Loader.instance) {
      NMJL2025Loader.instance = new NMJL2025Loader();
    }
    return NMJL2025Loader.instance;
  }

  /**
   * Load JSON data with proper null handling
   */
  private loadJSONData(): unknown[] {
    try {
      // Import the JSON data (NaN values have been replaced with null)  
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const nmjl2025Data = require('./nmjl-card-2025.json');
      return Array.isArray(nmjl2025Data) ? nmjl2025Data : [];
    } catch (error) {
      console.error('Failed to load NMJL JSON data:', error);
      return [];
    }
  }
  
  /**
   * Load and validate pattern data from JSON
   */
  private loadAndValidatePatterns(): NMJL2025Pattern[] {
    try {
      // Load JSON data dynamically to handle NaN values
      const rawPatterns = this.loadJSONData();
      const validatedPatterns: NMJL2025Pattern[] = [];
      
      for (const rawPattern of rawPatterns) {
        try {
          const pattern = this.validatePattern(rawPattern);
          if (pattern) {
            validatedPatterns.push(pattern);
          }
        } catch (error) {
          console.warn(`Invalid pattern ${rawPattern['Pattern ID']}: ${error}`);
        }
      }
      
      console.log(`Loaded ${validatedPatterns.length} valid NMJL 2025 patterns`);
      return validatedPatterns;
    } catch (error) {
      console.error('Failed to load NMJL 2025 patterns:', error);
      return [];
    }
  }
  
  /**
   * Validate and clean a single pattern
   */
  private validatePattern(raw: unknown): NMJL2025Pattern | null {
    if (!raw || typeof raw !== 'object') return null;
    
    const pattern = raw as Record<string, unknown>;
    
    // Required fields validation
    const requiredFields = ['Year', 'Pattern ID', 'Hand_Pattern', 'Hand_Description', 'Hand_Points', 'Groups'];
    for (const field of requiredFields) {
      if (pattern[field] === undefined || pattern[field] === null) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    // Validate groups
    if (!Array.isArray(pattern.Groups) || pattern.Groups.length === 0) {
      throw new Error('Pattern must have at least one group');
    }
    
    const validatedGroups: PatternGroup[] = [];
    for (const group of pattern.Groups as unknown[]) {
      const validatedGroup = this.validateGroup(group);
      if (validatedGroup) {
        validatedGroups.push(validatedGroup);
      }
    }
    
    if (validatedGroups.length === 0) {
      throw new Error('Pattern must have at least one valid group');
    }
    
    // Clean and validate the pattern
    return {
      Year: parseInt(String(pattern.Year)) || 2025,
      Section: parseInt(String(pattern.Section)) || 2025,
      Line: parseInt(String(pattern.Line)) || 1,
      "Pattern ID": parseInt(String(pattern["Pattern ID"])),
      Hands_Key: String(pattern.Hands_Key) || `${pattern.Year}-${pattern.Section}-${pattern.Line}-${pattern["Pattern ID"]}`,
      Hand_Pattern: String(pattern.Hand_Pattern),
      Hand_Description: String(pattern.Hand_Description),
      Hand_Points: parseInt(String(pattern.Hand_Points)) || 25,
      Hand_Conceiled: Boolean(pattern.Hand_Conceiled),
      Hand_Difficulty: this.validateDifficulty(pattern.Hand_Difficulty),
      Hand_Notes: pattern.Hand_Notes && pattern.Hand_Notes !== null ? String(pattern.Hand_Notes) : null,
      Groups: validatedGroups
    };
  }
  
  /**
   * Validate a pattern group
   */
  private validateGroup(raw: unknown): PatternGroup | null {
    if (!raw || typeof raw !== 'object') return null;
    
    const group = raw as Record<string, unknown>;
    
    try {
      return {
        Group: String(group.Group || ''),
        Suit_Role: this.validateSuitRole(group.Suit_Role),
        Suit_Note: group.Suit_Note && group.Suit_Note !== null ? String(group.Suit_Note) : null,
        Constraint_Type: this.validateConstraintType(group.Constraint_Type),
        Constraint_Values: String(group.Constraint_Values || ''),
        Constraint_Must_Match: group.Constraint_Must_Match && group.Constraint_Must_Match !== null ? 
          String(group.Constraint_Must_Match) : null,
        Constraint_Extra: group.Constraint_Extra && group.Constraint_Extra !== null ? 
          String(group.Constraint_Extra) : null,
        Jokers_Allowed: Boolean(group.Jokers_Allowed)
      };
    } catch (error) {
      console.warn(`Invalid group ${String(group.Group)}: ${error}`);
      return null;
    }
  }
  
  /**
   * Validate difficulty level
   */
  private validateDifficulty(difficulty: unknown): HandDifficulty {
    const validDifficulties: HandDifficulty[] = ['easy', 'medium', 'hard'];
    const normalized = String(difficulty || '').toLowerCase();
    
    if (validDifficulties.includes(normalized as HandDifficulty)) {
      return normalized as HandDifficulty;
    }
    
    return 'medium'; // Default
  }
  
  /**
   * Validate suit role
   */
  private validateSuitRole(role: unknown): 'first' | 'second' | 'third' | 'any' | 'none' {
    const validRoles = ['first', 'second', 'third', 'any', 'none'];
    const normalized = String(role || '').toLowerCase();
    
    if (validRoles.includes(normalized)) {
      return normalized as 'first' | 'second' | 'third' | 'any' | 'none';
    }
    
    return 'any'; // Default
  }
  
  /**
   * Validate constraint type
   */
  private validateConstraintType(type: unknown): 'kong' | 'pung' | 'sequence' | 'pair' | 'single' | 'consecutive' | 'like' {
    const validTypes = ['kong', 'pung', 'sequence', 'pair', 'single', 'consecutive', 'like'];
    const normalized = String(type || '').toLowerCase();
    
    if (validTypes.includes(normalized)) {
      return normalized as 'kong' | 'pung' | 'sequence' | 'pair' | 'single' | 'consecutive' | 'like';
    }
    
    return 'pung'; // Default
  }
  
  /**
   * Build comprehensive index for fast lookups
   */
  private buildIndex(): PatternIndex {
    const index: PatternIndex = {
      byId: new Map(),
      byPoints: new Map(),
      byDifficulty: new Map(),
      bySuitRequirement: new Map(),
      bySection: new Map(),
      jokerPatterns: [],
      concealedPatterns: [],
      all: this.patterns
    };
    
    for (const pattern of this.patterns) {
      // Index by ID
      index.byId.set(pattern["Pattern ID"], pattern);
      
      // Index by points
      if (!index.byPoints.has(pattern.Hand_Points)) {
        index.byPoints.set(pattern.Hand_Points, []);
      }
      index.byPoints.get(pattern.Hand_Points)!.push(pattern);
      
      // Index by difficulty
      if (!index.byDifficulty.has(pattern.Hand_Difficulty)) {
        index.byDifficulty.set(pattern.Hand_Difficulty, []);
      }
      index.byDifficulty.get(pattern.Hand_Difficulty)!.push(pattern);
      
      // Index by section
      if (!index.bySection.has(pattern.Section)) {
        index.bySection.set(pattern.Section, []);
      }
      index.bySection.get(pattern.Section)!.push(pattern);
      
      // Joker patterns
      const allowsJokers = pattern.Groups.some(group => group.Jokers_Allowed);
      if (allowsJokers) {
        index.jokerPatterns.push(pattern);
      }
      
      // Concealed patterns
      if (pattern.Hand_Conceiled) {
        index.concealedPatterns.push(pattern);
      }
      
      // Index by suit requirements
      this.indexBySuitRequirements(pattern, index.bySuitRequirement);
    }
    
    return index;
  }
  
  /**
   * Index patterns by their suit requirements
   */
  private indexBySuitRequirements(pattern: NMJL2025Pattern, suitIndex: Map<string, NMJL2025Pattern[]>) {
    const suitRoles = new Set<string>();
    
    for (const group of pattern.Groups) {
      if (group.Suit_Role !== 'none') {
        suitRoles.add(group.Suit_Role);
      }
    }
    
    const suitKey = Array.from(suitRoles).sort().join('-') || 'none';
    
    if (!suitIndex.has(suitKey)) {
      suitIndex.set(suitKey, []);
    }
    suitIndex.get(suitKey)!.push(pattern);
  }
  
  // Public API methods
  
  /**
   * Get all patterns
   */
  public getAllPatterns(): NMJL2025Pattern[] {
    return this.index.all;
  }
  
  /**
   * Get pattern by ID
   */
  public getPatternById(id: number): NMJL2025Pattern | undefined {
    return this.index.byId.get(id);
  }
  
  /**
   * Get patterns by point value
   */
  public getPatternsByPoints(points: number): NMJL2025Pattern[] {
    return this.index.byPoints.get(points) || [];
  }
  
  /**
   * Get patterns by difficulty
   */
  public getPatternsByDifficulty(difficulty: HandDifficulty): NMJL2025Pattern[] {
    return this.index.byDifficulty.get(difficulty) || [];
  }
  
  /**
   * Get patterns by section
   */
  public getPatternsBySection(section: number): NMJL2025Pattern[] {
    return this.index.bySection.get(section) || [];
  }
  
  /**
   * Get patterns that allow jokers
   */
  public getJokerPatterns(): NMJL2025Pattern[] {
    return this.index.jokerPatterns;
  }
  
  /**
   * Get concealed patterns only
   */
  public getConcealedPatterns(): NMJL2025Pattern[] {
    return this.index.concealedPatterns;
  }
  
  /**
   * Parse constraint values into usable format
   */
  public parseConstraint(group: PatternGroup): ParsedConstraint {
    const raw = group.Constraint_Values;
    const values: (number | null)[] = [];
    let allowsZeroNeutral = false;
    let isFlower = false;
    let isDragon = false;
    let isWind = false;
    
    // Check for special constraint extras
    if (group.Constraint_Extra) {
      allowsZeroNeutral = group.Constraint_Extra.includes('zero_is_neutral');
    }
    
    // Parse constraint values
    if (raw) {
      const parts = raw.split(',').map(p => p.trim());
      
      for (const part of parts) {
        if (part === 'flower') {
          isFlower = true;
          values.push(null);
        } else if (['red', 'green', 'white'].includes(part.toLowerCase())) {
          isDragon = true;
          values.push(null);
        } else if (['east', 'south', 'west', 'north'].includes(part.toLowerCase())) {
          isWind = true;
          values.push(null);
        } else {
          const num = parseInt(part);
          if (!isNaN(num)) {
            values.push(num);
          } else {
            values.push(null);
          }
        }
      }
    }
    
    return {
      raw,
      values,
      allowsZeroNeutral,
      isFlower,
      isDragon,
      isWind
    };
  }
  
  /**
   * Get statistics about loaded patterns
   */
  public getStatistics() {
    const stats = {
      totalPatterns: this.patterns.length,
      pointDistribution: {} as Record<number, number>,
      difficultyDistribution: {} as Record<HandDifficulty, number>,
      jokerPatterns: this.index.jokerPatterns.length,
      concealedPatterns: this.index.concealedPatterns.length,
      sectionsUsed: this.index.bySection.size
    };
    
    // Count point distribution
    for (const [points, patterns] of this.index.byPoints) {
      stats.pointDistribution[points] = patterns.length;
    }
    
    // Count difficulty distribution
    for (const [difficulty, patterns] of this.index.byDifficulty) {
      stats.difficultyDistribution[difficulty] = patterns.length;
    }
    
    return stats;
  }
}

// Export singleton instance
export const nmjl2025Loader = NMJL2025Loader.getInstance();