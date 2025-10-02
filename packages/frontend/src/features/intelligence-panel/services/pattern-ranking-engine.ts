// Engine 2: Pattern Ranking Engine
// Applies 4-component mathematical scoring system and strategic assessment
// Determines viable patterns and calculates switch recommendations

import type { PatternAnalysisFacts, TileAvailability, TileMatchResult } from './pattern-analysis-engine'
import type { PatternSelectionOption } from 'shared-types'

export interface ScoringComponents {
  currentTileScore: number    // 0-40 points: (tilesMatched / 14) * 40
  availabilityScore: number   // 0-50 points: tile availability with joker integration
  jokerScore: number         // 0 points: eliminated - integrated into availability
  priorityScore: number      // 0-10 points: strategic pattern priority
}

export interface PatternRanking {
  patternId: string
  totalScore: number
  components: ScoringComponents
  recommendation: 'excellent' | 'good' | 'fair' | 'poor' | 'impossible'
  confidence: number
  isViable: boolean          // >40% completion or strategic value
  strategicValue: number     // Pattern-specific strategic assessment
  riskFactors: string[]
}

export interface PatternSwitchAnalysis {
  shouldSuggestSwitch: boolean
  currentFocus: string
  recommendedPattern: string
  improvementPercent: number
  improvementThreshold: number
  reasoning: string[]
}

export interface RankedPatternResults {
  rankings: PatternRanking[]
  viablePatterns: PatternRanking[]
  topRecommendations: PatternRanking[]
  switchAnalysis: PatternSwitchAnalysis | null
  gameStateFactors: {
    phase: string
    turnsRemaining: number
    riskTolerance: 'conservative' | 'balanced' | 'aggressive'
  }
}

export class PatternRankingEngine {
  // Configuration (easily adjustable) - Updated to eliminate separate joker component
  private static readonly SCORING_WEIGHTS = {
    currentTile: { min: 0, max: 40 },
    availability: { min: 0, max: 50 }, // Expanded to include joker integration
    priority: { min: 0, max: 10 }
  }
  
  private static readonly VIABILITY_THRESHOLD = 0.40  // 40% completion minimum
  private static readonly SWITCH_THRESHOLD = 0.15     // 15% improvement to suggest switch
  private static readonly MAX_RECOMMENDATIONS = 5

  /**
   * Rank all pattern analysis results using 4-component scoring
   */
  static rankPatterns(
    analysisFacts: PatternAnalysisFacts[],
    selectedPatterns: PatternSelectionOption[],
    gameContext: {
      phase: 'charleston' | 'gameplay'
      currentFocus?: string
      turnsElapsed?: number
      wallTilesRemaining?: number
    }
  ): RankedPatternResults {
    // Defensive input validation
    const validAnalysisFacts = this.filterValidAnalysisFacts(analysisFacts)
    const validSelectedPatterns = this.filterValidPatterns(selectedPatterns)
    const safeGameContext = this.sanitizeGameContext(gameContext)

    // Calculate rankings for all patterns
    const rankings: PatternRanking[] = []

    for (const facts of validAnalysisFacts) {
      try {
        const ranking = this.calculatePatternRanking(facts, validSelectedPatterns, safeGameContext)
        rankings.push(ranking)
      } catch {
        // Create fallback ranking for failed analysis
        const fallbackRanking = this.createFallbackRanking(facts.patternId)
        rankings.push(fallbackRanking)
      }
    }
    
    // Sort by total score (highest first)
    rankings.sort((a, b) => b.totalScore - a.totalScore)
    
    // Filter viable patterns
    const viablePatterns = rankings.filter(r => r.isViable)
    
    // Get top recommendations
    const topRecommendations = viablePatterns.slice(0, this.MAX_RECOMMENDATIONS)
    
    // Analyze pattern switching opportunity
    const switchAnalysis = gameContext.currentFocus 
      ? this.analyzePatternSwitch(rankings, gameContext.currentFocus)
      : null
    
    // Assess game state factors
    const gameStateFactors = this.assessGameStateFactors(gameContext)
    
    return {
      rankings,
      viablePatterns,
      topRecommendations,
      switchAnalysis,
      gameStateFactors
    }
  }

  /**
   * Filter and validate analysis facts to prevent null reference errors
   */
  private static filterValidAnalysisFacts(analysisFacts: PatternAnalysisFacts[]): PatternAnalysisFacts[] {
    if (!Array.isArray(analysisFacts)) {
      return []
    }

    return analysisFacts.filter(facts => {
      if (!facts || typeof facts !== 'object') {
        return false
      }

      if (!facts.patternId || typeof facts.patternId !== 'string') {
        return false
      }

      if (!facts.tileMatching || typeof facts.tileMatching !== 'object') {
        return false
      }

      if (!facts.tileMatching.bestVariation || typeof facts.tileMatching.bestVariation !== 'object') {
        return false
      }

      return true
    })
  }

  /**
   * Filter and validate selected patterns
   */
  private static filterValidPatterns(selectedPatterns: PatternSelectionOption[]): PatternSelectionOption[] {
    if (!Array.isArray(selectedPatterns)) {
      return []
    }

    return selectedPatterns.filter(pattern => {
      if (!pattern || typeof pattern !== 'object') {
        return false
      }

      if (!pattern.id || typeof pattern.id !== 'string') {
        return false
      }

      return true
    })
  }

  /**
   * Sanitize game context to prevent null reference errors
   */
  private static sanitizeGameContext(gameContext: unknown): {
    phase: 'charleston' | 'gameplay'
    currentFocus?: string
    turnsElapsed?: number
    wallTilesRemaining?: number
  } {
    const context = gameContext as Record<string, unknown>
    const phase = context?.phase

    return {
      phase: (phase === 'charleston' || phase === 'gameplay')
        ? phase
        : 'gameplay',
      currentFocus: typeof context?.currentFocus === 'string' ? context.currentFocus : undefined,
      turnsElapsed: typeof context?.turnsElapsed === 'number' ? context.turnsElapsed : undefined,
      wallTilesRemaining: typeof context?.wallTilesRemaining === 'number' ? context.wallTilesRemaining : 80
    }
  }

  /**
   * Create fallback ranking when normal ranking fails
   */
  private static createFallbackRanking(patternId: string): PatternRanking {
    return {
      patternId: patternId || 'unknown',
      totalScore: 0,
      components: {
        currentTileScore: 0,
        availabilityScore: 0,
        jokerScore: 0,
        priorityScore: 0
      },
      recommendation: 'impossible',
      confidence: 0,
      isViable: false,
      strategicValue: 0,
      riskFactors: ['Data corruption prevented analysis']
    }
  }

  /**
   * Calculate ranking for a single pattern using 4-component system
   */
  private static calculatePatternRanking(
    facts: PatternAnalysisFacts,
    selectedPatterns: PatternSelectionOption[],
    gameContext: {
      phase: 'charleston' | 'gameplay'
      currentFocus?: string
      turnsElapsed?: number
      wallTilesRemaining?: number
    }
  ): PatternRanking {
    // Defensive access to facts properties
    const bestVariation = facts.tileMatching?.bestVariation
    if (!bestVariation) {
      return this.createFallbackRanking(facts.patternId)
    }

    const pattern = selectedPatterns.find(p => p?.id === facts.patternId)
    
    // Component 1: Current tile score (0-40 points) with safety checks
    const completionRatio = typeof bestVariation.completionRatio === 'number'
      ? Math.max(0, Math.min(1, bestVariation.completionRatio))
      : 0

    const currentTileScore = Math.min(
      this.SCORING_WEIGHTS.currentTile.max,
      completionRatio * this.SCORING_WEIGHTS.currentTile.max
    )

    // Component 2: Enhanced Availability score with joker integration (0-50 points)
    const availabilityScore = Math.min(
      this.SCORING_WEIGHTS.availability.max,
      this.calculateAvailabilityScore(
        facts.tileAvailability,
        facts.jokerAnalysis,
        bestVariation
      )
    )
    
    // Component 3: Priority score (0-10 points)
    const priorityScore = this.calculatePriorityScore(pattern, facts, gameContext)

    // Ensure all scores are valid numbers within expected ranges
    const safeCurrentTileScore = this.clampScore(currentTileScore, 0, this.SCORING_WEIGHTS.currentTile.max)
    const safeAvailabilityScore = this.clampScore(availabilityScore, 0, this.SCORING_WEIGHTS.availability.max)
    const safePriorityScore = this.clampScore(priorityScore, 0, this.SCORING_WEIGHTS.priority.max)

    const components: ScoringComponents = {
      currentTileScore: safeCurrentTileScore,
      availabilityScore: safeAvailabilityScore,
      jokerScore: 0, // Eliminated - now integrated into availability score
      priorityScore: safePriorityScore
    }

    const totalScore = safeCurrentTileScore + safeAvailabilityScore + safePriorityScore
    
    // Determine recommendation level
    const recommendation = this.getRecommendationLevel(totalScore)
    
    // Calculate confidence (based on score consistency and data quality)
    const confidence = this.calculateConfidence(totalScore, facts)
    
    // Determine if viable (with safe completion ratio access)
    const isViable = completionRatio >= this.VIABILITY_THRESHOLD ||
                     this.hasStrategicValue(pattern, facts)
    
    // Calculate strategic value
    const strategicValue = this.calculateStrategicValue(pattern, facts)
    
    // Identify risk factors
    const riskFactors = this.identifyRiskFactors(facts, pattern)
    
    return {
      patternId: facts.patternId,
      totalScore,
      components,
      recommendation,
      confidence,
      isViable,
      strategicValue,
      riskFactors
    }
  }

  /**
   * Calculate enhanced availability score with quantity-weighted difficulty and joker integration (0-50 points)
   */
  private static calculateAvailabilityScore(
    tileAvailability: PatternAnalysisFacts['tileAvailability'],
    jokerAnalysis: PatternAnalysisFacts['jokerAnalysis'],
    bestVariation: TileMatchResult
  ): number {
    // Defensive access to nested properties
    if (!tileAvailability || !jokerAnalysis || !bestVariation) {
      return 0
    }

    const missingTileCounts = Array.isArray(tileAvailability.missingTileCounts)
      ? tileAvailability.missingTileCounts
      : []
    const jokersAvailable = typeof jokerAnalysis.jokersAvailable === 'number'
      ? jokerAnalysis.jokersAvailable
      : 0

    if (!missingTileCounts || missingTileCounts.length === 0) {
      return 50 // Perfect - no missing tiles
    }

    // Calculate quantity needed for each unique tile from bestVariation.missingTiles
    const tileQuantities = new Map<string, number>()
    const missingTiles = Array.isArray(bestVariation.missingTiles) ? bestVariation.missingTiles : []

    for (const tileId of missingTiles) {
      if (tileId && typeof tileId === 'string') {
        tileQuantities.set(tileId, (tileQuantities.get(tileId) || 0) + 1)
      }
    }

    let totalWeightedDifficulty = 0
    let totalQuantity = 0

    // Calculate quantity-weighted difficulty for each missing tile
    for (const tileAvail of missingTileCounts) {
      const quantityNeeded = tileQuantities.get(tileAvail.tileId) || 0

      if (quantityNeeded > 0) {
        const effectiveAvailability = this.calculateEffectiveTileAvailability(
          tileAvail,
          bestVariation,
          jokersAvailable,
          jokerAnalysis.substitutablePositions
        )

        const difficulty = this.calculateTileDifficultyWithQuantity(
          tileAvail.tileId,
          effectiveAvailability,
          quantityNeeded
        )

        // Weight difficulty by quantity needed - more tiles needed = higher impact
        totalWeightedDifficulty += difficulty * quantityNeeded
        totalQuantity += quantityNeeded
      }
    }

    // Use quantity-weighted average instead of simple average
    const weightedAverageDifficulty = totalQuantity > 0 ? totalWeightedDifficulty / totalQuantity : 0

    // Convert to 50-point score (expanded from original 30 to include joker component)
    return Math.min(50, Math.max(0, weightedAverageDifficulty * 50))
  }

  /**
   * Calculate effective tile availability including NMJL-compliant joker substitution
   */
  private static calculateEffectiveTileAvailability(
    tileAvailability: TileAvailability,
    bestVariation: TileMatchResult,
    jokersAvailable: number,
    substitutablePositions?: number[]
  ): number {
    const baseTilesAvailable = tileAvailability.remainingAvailable as number

    if (jokersAvailable <= 0 || !substitutablePositions) {
      return baseTilesAvailable
    }

    // Find positions where this specific tile appears in the best variation
    const tilePositions = this.findTilePositionsInVariation(
      tileAvailability.tileId,
      bestVariation.patternTiles
    )

    if (tilePositions.length === 0) {
      return baseTilesAvailable // Tile not in pattern
    }

    // Count how many of this tile's positions can actually use jokers according to NMJL rules
    const jokerEligiblePositionsForThisTile = tilePositions.filter(position =>
      substitutablePositions.includes(position)
    )

    if (jokerEligiblePositionsForThisTile.length === 0) {
      return baseTilesAvailable // None of this tile's positions allow jokers
    }

    // We can add jokers up to the number of joker-eligible positions for this specific tile
    // or the number of available jokers, whichever is smaller
    const effectiveJokersForThisTile = Math.min(
      jokersAvailable,
      jokerEligiblePositionsForThisTile.length
    )

    return baseTilesAvailable + effectiveJokersForThisTile
  }

  /**
   * Safely clamp a score to valid range and handle NaN/Infinity
   */
  private static clampScore(score: number, min: number, max: number): number {
    if (typeof score !== 'number' || isNaN(score) || !isFinite(score)) {
      return min
    }
    return Math.max(min, Math.min(max, score))
  }

  /**
   * Find positions where a tile appears in the variation tiles array
   */
  private static findTilePositionsInVariation(tileId: string, patternTiles: string[]): number[] {
    const positions: number[] = []

    // Safe array access
    if (!Array.isArray(patternTiles) || !tileId || typeof tileId !== 'string') {
      return positions
    }

    patternTiles.forEach((tile, index) => {
      if (tile === tileId) {
        positions.push(index)
      }
    })
    return positions
  }

  /**
   * Calculate tile difficulty with quantity consideration - if you need more than available, impossible
   */
  private static calculateTileDifficultyWithQuantity(
    tileId: string,
    availableCount: number,
    quantityNeeded: number
  ): number {
    // Handle extreme/invalid values
    const safeAvailableCount = this.clampScore(availableCount, 0, Number.MAX_SAFE_INTEGER)
    const safeQuantityNeeded = this.clampScore(quantityNeeded, 0, Number.MAX_SAFE_INTEGER)

    // If we need more tiles than are available, impossible regardless of percentage
    if (safeQuantityNeeded > safeAvailableCount) {
      return 0.0 // Impossible
    }

    // Otherwise use original logic
    return this.calculateTileDifficulty(tileId, safeAvailableCount)
  }

  /**
   * Calculate tile difficulty based on percentage of original tiles available
   */
  private static calculateTileDifficulty(tileId: string, availableCount: number): number {
    const originalCount = this.getOriginalTileCount(tileId)

    // Handle extreme values and prevent division by zero
    if (originalCount <= 0 || typeof availableCount !== 'number' || !isFinite(availableCount)) {
      return 0.0
    }

    const safeAvailableCount = Math.max(0, availableCount)
    const availabilityRatio = safeAvailableCount / originalCount

    // Difficulty based on percentage of original tiles remaining
    if (availabilityRatio >= 0.75) return 1.0    // Easy (75%+ available)
    if (availabilityRatio >= 0.50) return 0.8    // Moderate (50-75% available)
    if (availabilityRatio >= 0.25) return 0.5    // Hard (25-50% available)
    if (availabilityRatio > 0.00) return 0.2     // Very Hard (1-25% available)
    return 0.0                                    // Impossible (0% available)
  }

  /**
   * Get original tile count in a standard Mahjong set
   */
  private static getOriginalTileCount(tileId: string): number {
    if (tileId === 'joker') return 8        // 8 jokers total
    if (tileId.startsWith('f')) return 8    // 8 flowers total (interchangeable)
    return 4                                // 4 of each standard tile
  }


  /**
   * Calculate priority score (0-10 points)
   */
  private static calculatePriorityScore(
    pattern: PatternSelectionOption | undefined,
    facts: PatternAnalysisFacts,
    gameContext: {
      phase: 'charleston' | 'gameplay'
      currentFocus?: string
      turnsElapsed?: number
      wallTilesRemaining?: number
    }
  ): number {
    if (!pattern) return 5 // Default mid-range
    
    let score = 5 // Base score
    
    // Higher points = higher priority
    if (pattern.points >= 50) score += 3
    else if (pattern.points >= 35) score += 2
    else if (pattern.points >= 25) score += 1
    
    // Difficulty consideration (easier patterns slight bonus)
    if (pattern.difficulty === 'easy') score += 1
    else if (pattern.difficulty === 'hard') score -= 1
    
    // Game phase consideration
    if (gameContext.phase === 'charleston') {
      // Early game: prefer patterns with good completion potential
      if (facts.tileMatching.averageCompletion > 0.5) score += 1
    } else {
      // Late game: prefer patterns close to completion
      if (facts.tileMatching.bestVariation.completionRatio > 0.7) score += 2
    }
    
    return Math.min(this.SCORING_WEIGHTS.priority.max, Math.max(0, score))
  }

  /**
   * Determine recommendation level based on total score
   * Updated thresholds to better reflect gameplay reality where 70% completion should be "good"
   */
  private static getRecommendationLevel(totalScore: number): PatternRanking['recommendation'] {
    if (totalScore >= 70) return 'excellent'  // 70+ points: High completion with good availability
    if (totalScore >= 50) return 'good'       // 50+ points: 60-70% completion recognized as good
    if (totalScore >= 30) return 'fair'       // 30+ points: Moderate completion with potential
    if (totalScore >= 15) return 'poor'       // 15+ points: Low completion but not impossible
    return 'impossible'                       // <15 points: Truly unachievable patterns
  }

  /**
   * Calculate confidence in recommendation
   */
  private static calculateConfidence(totalScore: number, facts: PatternAnalysisFacts): number {
    // Ensure totalScore is a valid number
    const safeScore = typeof totalScore === 'number' && !isNaN(totalScore) ? totalScore : 0
    let confidence = Math.min(95, safeScore + 10) // Base confidence from score

    // Adjust based on data quality (with safe access)
    const tileMatching = facts.tileMatching || {}
    const totalVariations = typeof tileMatching.totalVariations === 'number' ? tileMatching.totalVariations : 0
    const averageCompletion = typeof tileMatching.averageCompletion === 'number' ? tileMatching.averageCompletion : 0
    
    // More variations = more confidence
    if (totalVariations >= 50) confidence += 5
    else if (totalVariations <= 10) confidence -= 5
    
    // Consistent variations = more confidence (with safe access)
    const bestVariationRatio = facts.tileMatching?.bestVariation?.completionRatio
    const consistencyBonus = (typeof bestVariationRatio === 'number' &&
                             Math.abs(averageCompletion - bestVariationRatio) < 0.1) ? 5 : 0
    confidence += consistencyBonus

    // Ensure final confidence is within valid range
    return Math.min(1, Math.max(0, confidence / 100))
  }

  /**
   * Check if pattern has strategic value beyond completion percentage
   */
  private static hasStrategicValue(pattern: PatternSelectionOption | undefined, facts: PatternAnalysisFacts): boolean {
    if (!pattern) return false
    
    // High-point patterns have strategic value even at lower completion
    if (pattern.points >= 50) return true
    
    // Patterns with good joker flexibility
    if (facts.jokerAnalysis.maxJokersUseful >= 4) return true
    
    // Patterns with many available variations
    if (facts.tileMatching.totalVariations >= 75) return true
    
    return false
  }

  /**
   * Calculate strategic value assessment
   */
  private static calculateStrategicValue(
    pattern: PatternSelectionOption | undefined,
    facts: PatternAnalysisFacts
  ): number {
    let value = 5 // Base strategic value
    
    if (!pattern) return value
    
    // Point value consideration
    value += Math.min(3, (pattern.points - 25) / 10)
    
    // Flexibility consideration (multiple variations)
    value += Math.min(2, facts.tileMatching.totalVariations / 50)
    
    // Current progress consideration
    value += facts.tileMatching.bestVariation.completionRatio * 3
    
    return Math.min(10, Math.max(1, value))
  }

  /**
   * Identify risk factors for the pattern
   */
  private static identifyRiskFactors(facts: PatternAnalysisFacts, pattern: PatternSelectionOption | undefined): string[] {
    const risks: string[] = []
    
    // Low tile availability
    if (facts.tileAvailability.availabilityRatio < 1.5) {
      risks.push('Low tile availability in wall')
    }
    
    // Joker dependency
    if (facts.jokerAnalysis.jokersToComplete > facts.jokerAnalysis.jokersAvailable + 2) {
      risks.push('High joker dependency')
    }
    
    // Many tiles still needed
    if (facts.tileMatching.bestVariation.tilesNeeded > 8) {
      risks.push('Many tiles still required')
    }
    
    // Difficult pattern
    if (pattern?.difficulty === 'hard') {
      risks.push('Complex pattern requirements')
    }
    
    return risks
  }

  /**
   * Analyze pattern switching opportunity
   */
  private static analyzePatternSwitch(rankings: PatternRanking[], currentFocus: string): PatternSwitchAnalysis {
    const currentPattern = rankings.find(r => r.patternId === currentFocus)
    const bestAlternative = rankings.find(r => r.patternId !== currentFocus && r.isViable)
    
    if (!currentPattern || !bestAlternative) {
      return {
        shouldSuggestSwitch: false,
        currentFocus,
        recommendedPattern: currentFocus,
        improvementPercent: 0,
        improvementThreshold: this.SWITCH_THRESHOLD * 100,
        reasoning: ['Insufficient data for switch analysis']
      }
    }
    
    const improvementPercent = (bestAlternative.totalScore - currentPattern.totalScore) / currentPattern.totalScore
    const shouldSwitch = improvementPercent >= this.SWITCH_THRESHOLD
    
    const reasoning: string[] = []
    if (shouldSwitch) {
      reasoning.push(`${bestAlternative.patternId} scores ${improvementPercent.toFixed(1)}% higher`)
      reasoning.push(`Current pattern: ${currentPattern.recommendation} (${currentPattern.totalScore} points)`)
      reasoning.push(`Alternative: ${bestAlternative.recommendation} (${bestAlternative.totalScore} points)`)
    }
    
    return {
      shouldSuggestSwitch: shouldSwitch,
      currentFocus,
      recommendedPattern: shouldSwitch ? bestAlternative.patternId : currentFocus,
      improvementPercent: improvementPercent * 100,
      improvementThreshold: this.SWITCH_THRESHOLD * 100,
      reasoning
    }
  }

  /**
   * Assess game state factors
   */
  private static assessGameStateFactors(gameContext: {
    phase: 'charleston' | 'gameplay'
    currentFocus?: string
    turnsElapsed?: number
    wallTilesRemaining?: number
  }): RankedPatternResults['gameStateFactors'] {
    const wallTiles = gameContext.wallTilesRemaining || 80
    
    // Estimate turns remaining (rough calculation)
    const turnsRemaining = Math.max(10, Math.floor(wallTiles / 4))
    
    // Determine risk tolerance based on game state
    let riskTolerance: 'conservative' | 'balanced' | 'aggressive' = 'balanced'
    
    if (gameContext.phase === 'charleston') {
      riskTolerance = 'balanced' // Charleston allows for flexibility
    } else if (turnsRemaining < 15) {
      riskTolerance = 'aggressive' // Late game, need to commit
    } else if (turnsRemaining > 40) {
      riskTolerance = 'conservative' // Early game, keep options open
    }
    
    return {
      phase: gameContext.phase,
      turnsRemaining,
      riskTolerance
    }
  }

  /**
   * Update scoring weights (for easy adjustment)
   */
  static updateScoringWeights(newWeights: Partial<typeof PatternRankingEngine.SCORING_WEIGHTS>): void {
    Object.assign(this.SCORING_WEIGHTS, newWeights)
  }

  /**
   * Update thresholds (for easy adjustment)
   */
  static updateThresholds(options: {
    viabilityThreshold?: number
    switchThreshold?: number
    maxRecommendations?: number
  }): void {
    if (options.viabilityThreshold !== undefined) {
      // TypeScript doesn't allow modifying readonly properties, but this is intentional
      // @ts-expect-error - Intentionally modifying readonly property for configuration
      this.VIABILITY_THRESHOLD = options.viabilityThreshold
    }
    if (options.switchThreshold !== undefined) {
      // TypeScript doesn't allow modifying readonly properties, but this is intentional
      // @ts-expect-error - Intentionally modifying readonly property for configuration
      this.SWITCH_THRESHOLD = options.switchThreshold
    }
    if (options.maxRecommendations !== undefined) {
      // TypeScript doesn't allow modifying readonly properties, but this is intentional
      // @ts-expect-error - Intentionally modifying readonly property for configuration
      this.MAX_RECOMMENDATIONS = options.maxRecommendations
    }
  }
}