// Engine 2: Pattern Ranking Engine
// Applies 4-component mathematical scoring system and strategic assessment
// Determines viable patterns and calculates switch recommendations

import type { PatternAnalysisFacts } from './pattern-analysis-engine'
import type { PatternSelectionOption } from '../../../shared/nmjl-types'

export interface ScoringComponents {
  currentTileScore: number    // 0-40 points: (tilesMatched / 14) * 40
  availabilityScore: number   // 0-30 points: tile availability in wall
  jokerScore: number         // 0-20 points: joker balance
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
  // Configuration (easily adjustable)
  private static readonly SCORING_WEIGHTS = {
    currentTile: { min: 0, max: 40 },
    availability: { min: 0, max: 30 },
    joker: { min: 0, max: 20 },
    priority: { min: 0, max: 10 }
  }
  
  private static readonly VIABILITY_THRESHOLD = 0.40  // 40% completion minimum
  private static readonly SWITCH_THRESHOLD = 0.15     // 15% improvement to suggest switch
  private static readonly MAX_RECOMMENDATIONS = 5

  /**
   * Rank all pattern analysis results using 4-component scoring
   */
  static async rankPatterns(
    analysisFacts: PatternAnalysisFacts[],
    selectedPatterns: PatternSelectionOption[],
    gameContext: {
      phase: 'charleston' | 'gameplay'
      currentFocus?: string
      turnsElapsed?: number
      wallTilesRemaining?: number
    }
  ): Promise<RankedPatternResults> {
    
    // Calculate rankings for all patterns
    const rankings: PatternRanking[] = []
    
    for (const facts of analysisFacts) {
      const ranking = this.calculatePatternRanking(facts, selectedPatterns, gameContext)
      rankings.push(ranking)
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
    
    const bestVariation = facts.tileMatching.bestVariation
    const pattern = selectedPatterns.find(p => p.id === facts.patternId)
    
    // Component 1: Current tile score (0-40 points)
    const currentTileScore = Math.min(
      this.SCORING_WEIGHTS.currentTile.max,
      bestVariation.completionRatio * this.SCORING_WEIGHTS.currentTile.max
    )
    
    // Component 2: Availability score (0-30 points)
    const availabilityScore = Math.min(
      this.SCORING_WEIGHTS.availability.max,
      this.calculateAvailabilityScore(facts.tileAvailability)
    )
    
    // Component 3: Joker score (0-20 points)
    const jokerScore = this.calculateJokerScore(facts.jokerAnalysis)
    
    // Component 4: Priority score (0-10 points)
    const priorityScore = this.calculatePriorityScore(pattern, facts, gameContext)
    
    const components: ScoringComponents = {
      currentTileScore,
      availabilityScore,
      jokerScore,
      priorityScore
    }
    
    const totalScore = currentTileScore + availabilityScore + jokerScore + priorityScore
    
    // Determine recommendation level
    const recommendation = this.getRecommendationLevel(totalScore)
    
    // Calculate confidence (based on score consistency and data quality)
    const confidence = this.calculateConfidence(totalScore, facts)
    
    // Determine if viable
    const isViable = bestVariation.completionRatio >= this.VIABILITY_THRESHOLD || 
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
   * Calculate availability score (0-30 points)
   */
  private static calculateAvailabilityScore(tileAvailability: PatternAnalysisFacts['tileAvailability']): number {
    // Base score on availability ratio (tiles available vs needed)
    const { availabilityRatio, totalMissingInWall } = tileAvailability
    
    // Score based on ratio, but cap at max points
    let score = Math.min(availabilityRatio * 10, this.SCORING_WEIGHTS.availability.max)
    
    // Bonus for having many tiles available
    if (totalMissingInWall >= 10) score += 5
    else if (totalMissingInWall >= 5) score += 2
    
    // Penalty for very few tiles available
    if (totalMissingInWall <= 2) score *= 0.5
    
    return Math.min(this.SCORING_WEIGHTS.availability.max, Math.max(0, score))
  }

  /**
   * Calculate joker score (0-20 points)
   */
  private static calculateJokerScore(jokerAnalysis: PatternAnalysisFacts['jokerAnalysis']): number {
    const { jokersAvailable, jokersToComplete, maxJokersUseful } = jokerAnalysis
    
    // Perfect joker situation: have exactly what you need
    if (jokersToComplete <= jokersAvailable) {
      return this.SCORING_WEIGHTS.joker.max
    }
    
    // Good joker situation: jokers can help significantly
    if (jokersAvailable > 0 && maxJokersUseful > 0) {
      const jokerEffectiveness = jokersAvailable / Math.max(1, jokersToComplete)
      return Math.min(this.SCORING_WEIGHTS.joker.max, jokerEffectiveness * 15)
    }
    
    // No jokers or jokers can't help
    return this.SCORING_WEIGHTS.joker.min
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
   */
  private static getRecommendationLevel(totalScore: number): PatternRanking['recommendation'] {
    if (totalScore >= 80) return 'excellent'
    if (totalScore >= 65) return 'good'
    if (totalScore >= 45) return 'fair'
    if (totalScore >= 25) return 'poor'
    return 'impossible'
  }

  /**
   * Calculate confidence in recommendation
   */
  private static calculateConfidence(totalScore: number, facts: PatternAnalysisFacts): number {
    let confidence = Math.min(95, totalScore + 10) // Base confidence from score
    
    // Adjust based on data quality
    const { totalVariations, averageCompletion } = facts.tileMatching
    
    // More variations = more confidence
    if (totalVariations >= 50) confidence += 5
    else if (totalVariations <= 10) confidence -= 5
    
    // Consistent variations = more confidence
    const consistencyBonus = Math.abs(averageCompletion - facts.tileMatching.bestVariation.completionRatio) < 0.1 ? 5 : 0
    confidence += consistencyBonus
    
    return Math.min(95, Math.max(15, confidence))
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