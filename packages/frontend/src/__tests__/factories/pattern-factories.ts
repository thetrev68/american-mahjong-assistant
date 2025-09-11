/**
 * Pattern Test Data Factories
 * 
 * Creates consistent NMJL pattern and variation data for testing
 */

import type { NMJL2025Pattern, PatternSelectionOption, PatternGroup } from 'shared-types'
import type { PatternVariation } from '../intelligence-panel/services/pattern-variation-loader'

export interface PatternFactoryOptions {
  id?: number
  section?: string
  line?: number
  pattern?: string
  description?: string
  points?: number
  difficulty?: 'easy' | 'medium' | 'hard'
  concealed?: boolean
  allowsJokers?: boolean
  groups?: PatternGroup[]
}

/**
 * Create a single NMJL2025Pattern with optional overrides
 */
export function createNMJLPattern(options: PatternFactoryOptions = {}): NMJL2025Pattern {
  const id = options.id || 1
  const section = options.section || 'CONSECUTIVE_RUN'
  const line = options.line || 1
  
  return {
    Year: 2025,
    Section: section,
    Line: line,
    'Pattern ID': id,
    Hands_Key: `2025-${section}-${id}`,
    Hand_Pattern: options.pattern || 'FFFF 1111 2222 3333',
    Hand_Description: options.description || `Test Pattern ${id}`,
    Hand_Points: options.points || 25,
    Hand_Conceiled: options.concealed || false,
    Hand_Difficulty: options.difficulty || 'medium',
    Hand_Notes: null,
    Groups: options.groups || []
  }
}

/**
 * Convert NMJL2025Pattern to PatternSelectionOption (helper from integration tests)
 */
export function convertToPatternSelectionOption(pattern: NMJL2025Pattern): PatternSelectionOption {
  return {
    id: pattern.Hands_Key,
    patternId: pattern['Pattern ID'],
    displayName: pattern.Hand_Description,
    pattern: pattern.Hand_Pattern,
    points: pattern.Hand_Points,
    difficulty: pattern.Hand_Difficulty,
    description: pattern.Hand_Description,
    section: pattern.Section,
    line: pattern.Line,
    allowsJokers: pattern.Groups.some(g => g.Jokers_Allowed),
    concealed: pattern.Hand_Conceiled,
    groups: pattern.Groups
  }
}

/**
 * Create a PatternSelectionOption directly
 */
export function createPatternSelection(options: PatternFactoryOptions = {}): PatternSelectionOption {
  const nmjlPattern = createNMJLPattern(options)
  return convertToPatternSelectionOption(nmjlPattern)
}

/**
 * Create multiple patterns for testing
 */
export function createPatternSet(count: number = 3): PatternSelectionOption[] {
  return Array.from({ length: count }, (_, index) => 
    createPatternSelection({
      id: index + 1,
      section: index === 0 ? 'CONSECUTIVE_RUN' : index === 1 ? 'LIKE_NUMBERS' : 'WINDS_DRAGONS',
      line: index + 1,
      pattern: index === 0 ? 'FFFF 1111 2222 3333' : index === 1 ? '111 222 333 DDDD' : 'NNNN EEEE SSSS WW',
      description: `Test Pattern ${index + 1}`,
      points: 25 + (index * 5),
      difficulty: index === 0 ? 'easy' : index === 1 ? 'medium' : 'hard'
    })
  )
}

/**
 * Create a PatternVariation for Engine 1 testing
 */
export function createPatternVariation(options: {
  patternId?: number
  handKey?: string
  tiles?: string[]
  jokers?: boolean[]
  sequence?: number
} = {}): PatternVariation {
  const patternId = options.patternId || 1
  const handKey = options.handKey || `2025-CONSECUTIVE_RUN-${patternId}`
  const tiles = options.tiles || ['f1', 'f2', 'f3', 'f4', '1B', '1B', '1B', '1B', '2B', '2B', '2B', '2B', '3B', '3B']
  const jokers = options.jokers || new Array(14).fill(false).map((_, i) => i >= 4 && i < 12) // Allow jokers in positions 4-11
  
  return {
    year: 2025,
    section: 'CONSECUTIVE_RUN',
    line: 1,
    patternId,
    handKey,
    handPattern: 'FFFF 1111 2222 33',
    handCriteria: 'Consecutive numbers with flowers',
    handPoints: 30,
    handConcealed: false,
    sequence: options.sequence || 1,
    tiles,
    jokers
  }
}

/**
 * Create multiple pattern variations for a single pattern
 */
export function createPatternVariations(patternId: number, count: number = 3): PatternVariation[] {
  const baseHandKey = `2025-TEST_PATTERN-${patternId}`
  
  return Array.from({ length: count }, (_, index) => 
    createPatternVariation({
      patternId,
      handKey: baseHandKey,
      sequence: index + 1,
      // Vary the tiles slightly for each variation
      tiles: index === 0 
        ? ['f1', 'f2', 'f3', 'f4', '1B', '1B', '1B', '1B', '2B', '2B', '2B', '2B', '3B', '3B']
        : index === 1
        ? ['f1', 'f2', 'f3', 'f4', '1C', '1C', '1C', '1C', '2C', '2C', '2C', '2C', '3C', '3C']
        : ['f1', 'f2', 'f3', 'f4', '1D', '1D', '1D', '1D', '2D', '2D', '2D', '2D', '3D', '3D']
    })
  )
}

/**
 * Create pattern index structure for PatternVariationLoader mocking
 */
export function createPatternIndex(variations: PatternVariation[]) {
  const byPattern: { [patternId: string]: PatternVariation[] } = {}
  const bySection: { [section: string]: PatternVariation[] } = {}
  const patternCounts: { [patternId: string]: number } = {}
  const sectionCounts: { [section: string]: number } = {}
  
  variations.forEach(variation => {
    // Group by pattern
    if (!byPattern[variation.handKey]) {
      byPattern[variation.handKey] = []
    }
    byPattern[variation.handKey].push(variation)
    
    // Group by section
    if (!bySection[variation.section]) {
      bySection[variation.section] = []
    }
    bySection[variation.section].push(variation)
    
    // Count patterns and sections
    patternCounts[variation.handKey] = (patternCounts[variation.handKey] || 0) + 1
    sectionCounts[variation.section] = (sectionCounts[variation.section] || 0) + 1
  })
  
  return {
    byPattern,
    bySection,
    statistics: {
      totalVariations: variations.length,
      uniquePatterns: Object.keys(byPattern).length,
      uniqueSections: Object.keys(bySection).length,
      patternCounts,
      sectionCounts
    }
  }
}

/**
 * Predefined pattern sets for common test scenarios
 */
export const PatternPresets = {
  // Basic test patterns
  basic: () => createPatternSet(2),
  
  // Comprehensive set covering different difficulties
  comprehensive: () => [
    createPatternSelection({
      id: 1,
      section: 'CONSECUTIVE_RUN', 
      pattern: 'FFFF 1111 2222 3333',
      description: 'Easy Consecutive Run',
      points: 25,
      difficulty: 'easy'
    }),
    createPatternSelection({
      id: 2, 
      section: 'LIKE_NUMBERS',
      pattern: '111 222 333 DDDD', 
      description: 'Medium Like Numbers',
      points: 30,
      difficulty: 'medium'
    }),
    createPatternSelection({
      id: 3,
      section: 'WINDS_DRAGONS',
      pattern: 'NNNN EEEE SSSS WWWW',
      description: 'Hard Winds',
      points: 35, 
      difficulty: 'hard'
    })
  ],
  
  // Single pattern for focused testing
  single: (id: number = 1) => [createPatternSelection({ id })],
  
  // Empty set for error testing
  empty: () => [] as PatternSelectionOption[],
  
  // With variations for Engine 1 testing
  withVariations: (patternCount: number = 2, variationsPerPattern: number = 3) => {
    const patterns = createPatternSet(patternCount)
    const variations: PatternVariation[] = []
    
    patterns.forEach((pattern) => {
      const patternVariations = createPatternVariations(pattern.patternId, variationsPerPattern)
      variations.push(...patternVariations)
    })
    
    return {
      patterns,
      variations,
      index: createPatternIndex(variations)
    }
  }
}

/**
 * Create pattern groups (for more complex patterns)
 */
export function createPatternGroup(options: {
  description?: string
  jokersAllowed?: boolean
  tiles?: string[]
  groupType?: string
} = {}): PatternGroup {
  return {
    Group_Seq: 1,
    Group_Description: options.description || 'Test Group',
    Group_Pattern: 'FFFF',
    Jokers_Allowed: options.jokersAllowed || false,
    Group_Type: options.groupType || 'pung',
    Tiles: options.tiles || ['f1', 'f2', 'f3', 'f4']
  }
}