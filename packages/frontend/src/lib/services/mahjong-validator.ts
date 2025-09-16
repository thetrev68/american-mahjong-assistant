// Mahjong Validation Service - Real pattern validation using NMJL rules
// Integrates with PatternAnalysisEngine for authentic American Mahjong validation

import { PatternAnalysisEngine, type GameContext, type TileMatchResult } from '../../features/intelligence-panel/services/pattern-analysis-engine'
import type { NMJL2025Pattern } from 'shared-types'
import type { PlayerTile } from 'shared-types'

export interface MahjongValidationResult {
  isValid: boolean
  violations: string[]
  validPattern?: NMJL2025Pattern
  score: number
  bonusPoints: string[]
  handAnalysis?: {
    totalTiles: number
    exposedTiles: number
    concealedTiles: number
    jokersUsed: number
    completionRatio: number
  }
}

export interface MahjongDeclaration {
  playerId: string
  hand: PlayerTile[]
  exposedTiles: PlayerTile[]
  selectedPattern: NMJL2025Pattern
  context: GameContext
}

export interface ScoringBreakdown {
  basePoints: number
  concealedBonus: number
  jokerPenalty: number
  specialBonuses: number
  finalScore: number
  bonusDescriptions: string[]
}

export class MahjongValidator {
  /**
   * Validates a mahjong declaration using real pattern analysis
   */
  static async validateMahjongDeclaration(
    declaration: MahjongDeclaration
  ): Promise<MahjongValidationResult> {
    const { hand, exposedTiles, selectedPattern, context } = declaration
    
    try {
      // Step 1: Basic hand validation
      const basicValidation = this.validateBasicHandStructure(hand, exposedTiles)
      if (!basicValidation.isValid) {
        return {
          isValid: false,
          violations: basicValidation.violations,
          score: 0,
          bonusPoints: []
        }
      }

      // Step 2: Pattern-specific validation using PatternAnalysisEngine
      const patternValidation = await this.validatePatternCompletion(
        hand, 
        exposedTiles, 
        selectedPattern, 
        context
      )
      
      if (!patternValidation.isValid) {
        return {
          isValid: false,
          violations: patternValidation.violations,
          score: 0,
          bonusPoints: []
        }
      }

      // Step 3: Calculate score with bonuses
      const scoringResult = this.calculateScore(
        selectedPattern,
        hand,
        exposedTiles,
        patternValidation.completionRatio || 1.0
      )

      return {
        isValid: true,
        violations: [],
        validPattern: selectedPattern,
        score: scoringResult.finalScore,
        bonusPoints: scoringResult.bonusDescriptions,
        handAnalysis: {
          totalTiles: hand.length + exposedTiles.length,
          exposedTiles: exposedTiles.length,
          concealedTiles: hand.length,
          jokersUsed: this.countJokers(hand) + this.countJokers(exposedTiles),
          completionRatio: patternValidation.completionRatio || 1.0
        }
      }

    } catch (error) {
      console.error('Error validating mahjong declaration:', error)
      return {
        isValid: false,
        violations: ['Validation system error - please try again'],
        score: 0,
        bonusPoints: []
      }
    }
  }

  /**
   * Quick validation check without full analysis (for UI feedback)
   */
  static quickValidationCheck(
    hand: PlayerTile[], 
    exposedTiles: PlayerTile[]
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
        reason: 'Must have at least some concealed tiles'
      }
    }

    return { canDeclare: true }
  }

  /**
   * Validate basic hand structure (tile count, duplicates, etc.)
   */
  private static validateBasicHandStructure(
    hand: PlayerTile[], 
    exposedTiles: PlayerTile[]
  ): { isValid: boolean; violations: string[] } {
    const violations: string[] = []
    const totalTiles = hand.length + exposedTiles.length

    // Check total tile count
    if (totalTiles !== 14) {
      violations.push(`Invalid tile count: ${totalTiles} tiles (need exactly 14)`)
      return { isValid: false, violations }
    }

    // Check for excessive duplicate tiles (more than 4 of any non-joker)
    const allTiles = [...hand, ...exposedTiles]
    const tileCounts = new Map<string, number>()
    
    allTiles.forEach(tile => {
      if (tile.id !== 'joker') {
        tileCounts.set(tile.id, (tileCounts.get(tile.id) || 0) + 1)
      }
    })

    for (const [tileId, count] of tileCounts.entries()) {
      if (count > 4) {
        violations.push(`Too many ${tileId} tiles: ${count} (maximum 4 per tile type)`)
      }
    }

    // Validate exposed tile groups (must be valid pungs/kongs)
    const exposedValidation = this.validateExposedTiles(exposedTiles)
    if (!exposedValidation.isValid) {
      violations.push(...exposedValidation.violations)
    }

    return {
      isValid: violations.length === 0,
      violations
    }
  }

  /**
   * Validate exposed tiles form proper groups (pungs/kongs)
   */
  private static validateExposedTiles(
    exposedTiles: PlayerTile[]
  ): { isValid: boolean; violations: string[] } {
    if (exposedTiles.length === 0) {
      return { isValid: true, violations: [] }
    }

    // Group tiles by their type (id) to validate sets
    const tileGroups = new Map<string, PlayerTile[]>()
    for (const tile of exposedTiles) {
      const group = tileGroups.get(tile.id) || []
      group.push(tile)
      tileGroups.set(tile.id, group)
    }

    const violations: string[] = []

    // Validate each group is either a pung (3 identical) or kong (4 identical)
    for (const [tileId, group] of tileGroups) {
      const count = group.length

      if (count === 3) {
        // Valid pung
      } else if (count === 4) {
        // Valid kong
      } else if (count < 3) {
        violations.push(`Incomplete set: ${count} ${tileId} tile${count !== 1 ? 's' : ''} (need 3 for pung or 4 for kong)`)
      } else {
        violations.push(`Invalid set: ${count} ${tileId} tiles (maximum 4 for kong)`)
      }
    }

    // Check that all exposed tiles are accounted for in valid groups
    if (violations.length === 0 && exposedTiles.length !== Array.from(tileGroups.values()).reduce((sum, group) => sum + group.length, 0)) {
      violations.push('Exposed tiles contain invalid groupings')
    }

    return {
      isValid: violations.length === 0,
      violations
    }
  }

  /**
   * Validate pattern completion using PatternAnalysisEngine
   */
  private static async validatePatternCompletion(
    hand: PlayerTile[],
    exposedTiles: PlayerTile[],
    selectedPattern: NMJL2025Pattern,
    context: GameContext
  ): Promise<{ 
    isValid: boolean; 
    violations: string[]; 
    completionRatio?: number;
    matchResult?: TileMatchResult 
  }> {
    try {
      // Convert tiles to analysis format
      const allTiles = [...hand, ...exposedTiles]
      const tileIds = allTiles.map(tile => tile.id)

      // Use PatternAnalysisEngine to check pattern completion
      const analysisResults = await PatternAnalysisEngine.analyzePatterns(
        tileIds,
        [selectedPattern.Hands_Key],
        context
      )

      if (analysisResults.length === 0) {
        return {
          isValid: false,
          violations: ['Pattern analysis failed - unable to validate completion']
        }
      }

      const patternResult = analysisResults.find(
        result => result.patternId === selectedPattern.Hands_Key
      )

      if (!patternResult) {
        return {
          isValid: false,
          violations: [`Pattern ${selectedPattern.Hand_Description} not found in analysis`]
        }
      }

      const bestMatch = patternResult.tileMatching.bestVariation
      const completionRatio = bestMatch.completionRatio

      // For mahjong, we need 100% completion (or very close for joker flexibility)
      const isComplete = completionRatio >= 0.98 // Allow 2% tolerance for joker calculations
      
      if (!isComplete) {
        const missingTiles = bestMatch.missingTiles || []
        const missingCount = Math.max(1, Math.round((1 - completionRatio) * 14))
        
        return {
          isValid: false,
          violations: [
            `Pattern not complete: ${Math.round(completionRatio * 100)}% complete`,
            `Missing approximately ${missingCount} tile${missingCount === 1 ? '' : 's'}`,
            ...(missingTiles.length > 0 ? [`Needs: ${missingTiles.slice(0, 3).join(', ')}`] : [])
          ]
        }
      }

      // Pattern is complete!
      return {
        isValid: true,
        violations: [],
        completionRatio,
        matchResult: bestMatch
      }

    } catch (error) {
      console.error('Pattern validation error:', error)
      return {
        isValid: false,
        violations: ['Pattern validation system error']
      }
    }
  }

  /**
   * Calculate NMJL score with bonuses and penalties
   */
  private static calculateScore(
    pattern: NMJL2025Pattern,
    hand: PlayerTile[],
    exposedTiles: PlayerTile[],
    completionRatio: number
  ): ScoringBreakdown {
    const basePoints = pattern.Hand_Points
    let concealedBonus = 0
    let jokerPenalty = 0
    let specialBonuses = 0
    const bonusDescriptions: string[] = []

    // Concealed hand bonus (all tiles in hand, none exposed)
    if (exposedTiles.length === 0 && pattern.Hand_Conceiled) {
      concealedBonus = Math.floor(basePoints * 0.1) // 10% bonus for concealed
      bonusDescriptions.push(`Concealed hand bonus: +${concealedBonus}`)
    }

    // Joker penalty calculation
    const jokersInHand = this.countJokers(hand)
    const jokersInExposed = this.countJokers(exposedTiles)
    const totalJokers = jokersInHand + jokersInExposed
    
    if (totalJokers > 0) {
      // Traditional NMJL: small penalty for joker use
      jokerPenalty = Math.min(totalJokers * 2, Math.floor(basePoints * 0.1))
      bonusDescriptions.push(`Joker penalty: -${jokerPenalty} (${totalJokers} joker${totalJokers === 1 ? '' : 's'})`)
    }

    // Special bonuses for difficulty
    if (pattern.Hand_Difficulty === 'hard') {
      specialBonuses = 5
      bonusDescriptions.push('Hard pattern bonus: +5')
    }

    // Perfect completion bonus
    if (completionRatio >= 1.0) {
      const perfectBonus = 2
      specialBonuses += perfectBonus
      bonusDescriptions.push(`Perfect completion: +${perfectBonus}`)
    }

    const finalScore = Math.max(
      basePoints + concealedBonus - jokerPenalty + specialBonuses,
      basePoints // Never go below base points
    )

    return {
      basePoints,
      concealedBonus,
      jokerPenalty,
      specialBonuses,
      finalScore,
      bonusDescriptions
    }
  }

  /**
   * Count jokers in a tile collection
   */
  private static countJokers(tiles: PlayerTile[]): number {
    return tiles.filter(tile => tile.id === 'joker' || tile.value === 'joker').length
  }

  /**
   * Check if a pattern allows jokers for specific groups
   */
  static patternAllowsJokers(pattern: NMJL2025Pattern): boolean {
    return pattern.Groups.some(group => group.Jokers_Allowed)
  }

  /**
   * Get validation requirements for a pattern (for UI guidance)
   */
  static getPatternRequirements(pattern: NMJL2025Pattern): {
    description: string
    requiresConcealedHand: boolean
    allowsJokers: boolean
    difficulty: string
    points: number
    specialNotes?: string[]
  } {
    const specialNotes: string[] = []
    
    if (pattern.Hand_Notes) {
      specialNotes.push(pattern.Hand_Notes)
    }

    // Analyze groups for special requirements
    const hasConsecutiveGroups = pattern.Groups.some(g => g.Constraint_Type === 'consecutive')
    if (hasConsecutiveGroups) {
      specialNotes.push('Requires consecutive tiles in sequence')
    }

    const hasSinglePairs = pattern.Groups.some(g => 
      g.Constraint_Type === 'single' || g.Constraint_Type === 'pair'
    )
    if (hasSinglePairs) {
      specialNotes.push('Includes single tiles or pairs')
    }

    return {
      description: pattern.Hand_Description,
      requiresConcealedHand: pattern.Hand_Conceiled,
      allowsJokers: this.patternAllowsJokers(pattern),
      difficulty: pattern.Hand_Difficulty,
      points: pattern.Hand_Points,
      specialNotes: specialNotes.length > 0 ? specialNotes : undefined
    }
  }
}