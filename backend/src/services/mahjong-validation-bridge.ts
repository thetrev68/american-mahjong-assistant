// Mahjong Validation Bridge - Backend integration with frontend validator
// Provides server-side validation using frontend MahjongValidator logic

import type { NMJL2025Pattern } from '@shared/nmjl-types'
import type { Tile } from '@shared/game-types'

export interface BackendMahjongValidation {
  isValid: boolean
  score: number
  violations: string[]
  bonusPoints: string[]
  handAnalysis: {
    totalTiles: number
    jokersUsed: number
    exposedTiles: number
    concealedTiles: number
  }
}

export interface MahjongDeclarationData {
  playerId: string
  winningHand: Tile[]
  exposedTiles: Tile[]
  selectedPattern: NMJL2025Pattern
  gameContext?: {
    currentRound: number
    playerPosition: string
    availableTiles: string[]
  }
}

/**
 * Server-side mahjong validation service
 * 
 * Note: This is a simplified backend version of the validation logic.
 * In a production system, you might want to import and run the actual
 * frontend MahjongValidator service on the server side for consistency.
 */
export class MahjongValidationBridge {
  
  /**
   * Validate a mahjong declaration on the backend
   */
  static validateMahjongDeclaration(
    declaration: MahjongDeclarationData
  ): BackendMahjongValidation {
    const { winningHand, exposedTiles, selectedPattern } = declaration
    
    try {
      // Step 1: Basic structural validation
      const basicValidation = this.validateBasicStructure(winningHand, exposedTiles)
      if (!basicValidation.isValid) {
        return {
          isValid: false,
          score: 0,
          violations: basicValidation.violations,
          bonusPoints: [],
          handAnalysis: this.analyzeHand(winningHand, exposedTiles)
        }
      }

      // Step 2: Pattern-specific validation
      const patternValidation = this.validatePatternMatch(
        winningHand, 
        exposedTiles, 
        selectedPattern
      )
      
      if (!patternValidation.isValid) {
        return {
          isValid: false,
          score: 0,
          violations: patternValidation.violations,
          bonusPoints: [],
          handAnalysis: this.analyzeHand(winningHand, exposedTiles)
        }
      }

      // Step 3: Calculate scoring
      const scoring = this.calculateScoring(selectedPattern, winningHand, exposedTiles)

      return {
        isValid: true,
        score: scoring.finalScore,
        violations: [],
        bonusPoints: scoring.bonusDescriptions,
        handAnalysis: this.analyzeHand(winningHand, exposedTiles)
      }

    } catch (error) {
      console.error('Backend mahjong validation error:', error)
      return {
        isValid: false,
        score: 0,
        violations: ['Validation system error'],
        bonusPoints: [],
        handAnalysis: this.analyzeHand(winningHand, exposedTiles)
      }
    }
  }

  /**
   * Quick validation for UI feedback
   */
  static quickValidationCheck(
    hand: Tile[], 
    exposedTiles: Tile[]
  ): { canDeclare: boolean; reason?: string } {
    const totalTiles = hand.length + exposedTiles.length
    
    if (totalTiles !== 14) {
      return {
        canDeclare: false,
        reason: `Need exactly 14 tiles (have ${totalTiles})`
      }
    }

    if (hand.length === 0) {
      return {
        canDeclare: false,
        reason: 'Must have concealed tiles to win'
      }
    }

    return { canDeclare: true }
  }

  /**
   * Validate basic hand structure
   */
  private static validateBasicStructure(
    hand: Tile[], 
    exposedTiles: Tile[]
  ): { isValid: boolean; violations: string[] } {
    const violations: string[] = []
    const totalTiles = hand.length + exposedTiles.length

    // Check total tile count
    if (totalTiles !== 14) {
      violations.push(`Invalid tile count: ${totalTiles} tiles (need exactly 14)`)
      return { isValid: false, violations }
    }

    // Check for excessive duplicate tiles (more than 4 of any type)
    const allTiles = [...hand, ...exposedTiles]
    const tileCounts = new Map<string, number>()
    
    allTiles.forEach(tile => {
      if (tile.id !== 'joker') {
        tileCounts.set(tile.id, (tileCounts.get(tile.id) || 0) + 1)
      }
    })

    for (const [tileId, count] of tileCounts.entries()) {
      if (count > 4) {
        violations.push(`Too many ${tileId} tiles: ${count} (maximum 4)`)
      }
    }

    // Validate exposed tile groups (must be in sets of 3 or 4)
    if (exposedTiles.length > 0 && exposedTiles.length % 3 !== 0) {
      violations.push(`Exposed tiles must be in groups of 3 or 4 (have ${exposedTiles.length})`)
    }

    return {
      isValid: violations.length === 0,
      violations
    }
  }

  /**
   * Validate pattern matching (simplified)
   * 
   * Note: This is a basic implementation. In production, you'd want to
   * integrate with the full PatternAnalysisEngine logic from the frontend.
   */
  private static validatePatternMatch(
    hand: Tile[],
    exposedTiles: Tile[],
    pattern: NMJL2025Pattern
  ): { isValid: boolean; violations: string[] } {
    const violations: string[] = []

    // Basic pattern validation checks
    const allTiles = [...hand, ...exposedTiles]
    const jokersUsed = allTiles.filter(tile => tile.id === 'joker').length

    // Check concealed requirement
    if (pattern.Hand_Conceiled && exposedTiles.length > 0) {
      violations.push('Pattern requires concealed hand but tiles are exposed')
    }

    // Check joker usage for Singles & Pairs patterns
    const isSinglesAndPairs = pattern.Hand_Description.toLowerCase().includes('singles') || 
                             pattern.Hand_Description.toLowerCase().includes('pairs')
    
    if (isSinglesAndPairs && jokersUsed > 0) {
      // Check if jokers are used in groups that allow them
      const jokersInAllowedGroups = this.validateJokersInAllowedGroups(
        allTiles, 
        pattern.Groups
      )
      
      if (!jokersInAllowedGroups) {
        violations.push('Jokers cannot be used for singles or pairs in this pattern')
      }
    }

    // For a complete implementation, you would:
    // 1. Parse the pattern requirements
    // 2. Check each group constraint (consecutive, like numbers, etc.)
    // 3. Verify tile assignments match the pattern structure
    // 4. Validate joker usage per group rules
    
    // For now, we'll do basic completion checking
    const estimatedCompletion = this.estimatePatternCompletion(allTiles, pattern)
    if (estimatedCompletion < 0.95) {
      violations.push(`Pattern appears incomplete (${Math.round(estimatedCompletion * 100)}% complete)`)
    }

    return {
      isValid: violations.length === 0,
      violations
    }
  }

  /**
   * Validate joker usage in pattern groups
   */
  private static validateJokersInAllowedGroups(
    tiles: Tile[],
    groups: NMJL2025Pattern['Groups']
  ): boolean {
    // Simplified joker validation
    // In a full implementation, this would check each group's joker rules
    const hasJokerAllowedGroups = groups.some(group => group.Jokers_Allowed)
    return hasJokerAllowedGroups
  }

  /**
   * Estimate pattern completion (simplified)
   */
  private static estimatePatternCompletion(
    tiles: Tile[],
    pattern: NMJL2025Pattern
  ): number {
    // This is a simplified estimation
    // In production, you'd use the PatternAnalysisEngine
    
    const tileCount = tiles.length
    const expectedTileCount = 14
    
    // Basic completion based on tile count and pattern requirements
    if (tileCount === expectedTileCount) {
      return 1.0 // Assume complete for now
    }
    
    return tileCount / expectedTileCount
  }

  /**
   * Calculate NMJL scoring with bonuses
   */
  private static calculateScoring(
    pattern: NMJL2025Pattern,
    hand: Tile[],
    exposedTiles: Tile[]
  ): {
    baseScore: number
    bonuses: number
    penalties: number
    finalScore: number
    bonusDescriptions: string[]
  } {
    const baseScore = pattern.Hand_Points
    let bonuses = 0
    let penalties = 0
    const bonusDescriptions: string[] = []

    // Concealed hand bonus
    if (exposedTiles.length === 0 && pattern.Hand_Conceiled) {
      const concealedBonus = Math.floor(baseScore * 0.1)
      bonuses += concealedBonus
      bonusDescriptions.push(`Concealed hand: +${concealedBonus}`)
    }

    // Joker penalty
    const allTiles = [...hand, ...exposedTiles]
    const jokersUsed = allTiles.filter(tile => tile.id === 'joker').length
    if (jokersUsed > 0) {
      const jokerPenalty = Math.min(jokersUsed * 2, Math.floor(baseScore * 0.1))
      penalties += jokerPenalty
      bonusDescriptions.push(`Joker penalty: -${jokerPenalty}`)
    }

    // Difficulty bonus
    if (pattern.Hand_Difficulty === 'hard') {
      bonuses += 5
      bonusDescriptions.push('Hard pattern: +5')
    }

    const finalScore = Math.max(baseScore + bonuses - penalties, baseScore)

    return {
      baseScore,
      bonuses,
      penalties,
      finalScore,
      bonusDescriptions
    }
  }

  /**
   * Analyze hand composition
   */
  private static analyzeHand(hand: Tile[], exposedTiles: Tile[]): {
    totalTiles: number
    jokersUsed: number
    exposedTiles: number
    concealedTiles: number
  } {
    const allTiles = [...hand, ...exposedTiles]
    const jokersUsed = allTiles.filter(tile => tile.id === 'joker').length

    return {
      totalTiles: allTiles.length,
      jokersUsed,
      exposedTiles: exposedTiles.length,
      concealedTiles: hand.length
    }
  }

  /**
   * Get pattern requirements for validation guidance
   */
  static getPatternRequirements(pattern: NMJL2025Pattern): {
    allowsJokers: boolean
    requiresConcealedHand: boolean
    difficulty: string
    points: number
    specialNotes: string[]
  } {
    const specialNotes: string[] = []
    
    if (pattern.Hand_Notes) {
      specialNotes.push(pattern.Hand_Notes)
    }

    // Check for special constraints
    const hasConsecutive = pattern.Groups.some(g => g.Constraint_Type === 'consecutive')
    if (hasConsecutive) {
      specialNotes.push('Requires consecutive number sequences')
    }

    const hasSinglesOrPairs = pattern.Groups.some(g => 
      g.Constraint_Type === 'single' || g.Constraint_Type === 'pair'
    )
    if (hasSinglesOrPairs) {
      specialNotes.push('Contains single tiles or pairs')
    }

    return {
      allowsJokers: pattern.Groups.some(group => group.Jokers_Allowed),
      requiresConcealedHand: pattern.Hand_Conceiled,
      difficulty: pattern.Hand_Difficulty,
      points: pattern.Hand_Points,
      specialNotes
    }
  }
}