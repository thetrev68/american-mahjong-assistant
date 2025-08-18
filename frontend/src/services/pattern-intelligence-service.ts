// Pattern Intelligence Service
// Calculates completion scores for all patterns and provides detailed analysis

import { IntelligenceCalculations } from './intelligence-calculations'
import type { PatternSelectionOption } from '../../../shared/nmjl-types'

export interface PatternIntelligenceScore {
  patternId: string
  patternName: string
  pattern: PatternSelectionOption
  
  // Overall scores
  completionScore: number        // 0-100 main score
  recommendation: 'excellent' | 'good' | 'fair' | 'poor' | 'impossible'
  confidence: number            // 0-1 confidence in the analysis
  
  // Detailed breakdowns
  analysis: {
    currentTiles: {
      count: number              // Tiles already in hand
      percentage: number         // Completion percentage
      matchingGroups: string[]   // Which groups have matches
    }
    
    missingTiles: {
      total: number
      byAvailability: {
        easy: string[]           // 3+ tiles remaining
        moderate: string[]       // 1-2 tiles remaining  
        difficult: string[]      // 0 tiles, need joker
        impossible: string[]     // 0 tiles, can't use joker
      }
    }
    
    jokerSituation: {
      available: number
      needed: number
      canComplete: boolean
      substitutionPlan: { [tileId: string]: boolean }
    }
    
    strategicValue: {
      tilePriorities: { [tileId: string]: number }
      groupPriorities: { [groupName: string]: number }
      overallPriority: number
      reasoning: string[]
    }
    
    gameState: {
      wallTilesRemaining: number
      turnsEstimated: number
      drawProbability: number
    }
  }
  
  // Score components for transparency
  scoreBreakdown: {
    currentTileScore: number    // 0-40 points
    availabilityScore: number   // 0-30 points
    jokerScore: number         // 0-20 points
    priorityScore: number      // 0-10 points
  }
  
  // Strategic recommendations
  recommendations: {
    shouldPursue: boolean
    alternativePatterns: string[]
    strategicNotes: string[]
    riskFactors: string[]
  }
}

export interface GameStateContext {
  playerHand: string[]
  exposedTiles: { [playerId: string]: string[] }
  discardPile: string[]
  jokersInHand: number
  currentTurn: number
  totalPlayers: number
}

/**
 * Service for calculating intelligent pattern completion scores
 */
export class PatternIntelligenceService {
  
  /**
   * Calculate intelligence scores for all patterns
   */
  static calculateAllPatternScores(
    availablePatterns: PatternSelectionOption[],
    gameState: GameStateContext
  ): PatternIntelligenceScore[] {
    
    const scores: PatternIntelligenceScore[] = []
    
    for (const pattern of availablePatterns) {
      try {
        const score = this.calculatePatternScore(pattern, gameState)
        scores.push(score)
      } catch (error) {
        console.warn(`Failed to calculate score for pattern ${pattern.id}:`, error)
      }
    }
    
    // Sort by completion score (highest first)
    return scores.sort((a, b) => b.completionScore - a.completionScore)
  }
  
  /**
   * Calculate detailed intelligence score for a single pattern
   */
  static calculatePatternScore(
    pattern: PatternSelectionOption,
    gameState: GameStateContext
  ): PatternIntelligenceScore {
    
    // Step 1: Analyze current tile matches
    const currentTileAnalysis = IntelligenceCalculations.calculateCurrentPatternTiles(
      gameState.playerHand,
      pattern
    )
    
    // Step 2: Calculate missing tiles and availability
    const missingTileAnalysis = this.analyzeMissingTiles(
      pattern,
      currentTileAnalysis.bestVariation,
      gameState
    )
    
    // Step 3: Analyze joker situation
    const jokerAnalysis = IntelligenceCalculations.calculateJokerSubstitution(
      missingTileAnalysis.allMissingTiles,
      pattern,
      gameState.jokersInHand
    )
    
    // Step 4: Calculate strategic priorities
    const priorityAnalysis = IntelligenceCalculations.calculatePriorityWeights(
      gameState.playerHand,
      currentTileAnalysis.bestVariation?.groups || []
    )
    
    // Step 5: Calculate final intelligence score
    const finalScore = IntelligenceCalculations.calculateFinalIntelligenceScore(
      currentTileAnalysis.currentTileCount,
      missingTileAnalysis.availabilities,
      jokerAnalysis,
      priorityAnalysis
    )
    
    // Step 6: Generate strategic recommendations
    const recommendations = this.generateRecommendations(
      finalScore,
      missingTileAnalysis,
      jokerAnalysis,
      gameState
    )
    
    // Step 7: Calculate game state factors
    const gameStateAnalysis = this.analyzeGameState(
      missingTileAnalysis.allMissingTiles,
      gameState
    )
    
    return {
      patternId: pattern.id,
      patternName: pattern.displayName,
      pattern,
      completionScore: finalScore.completionScore,
      recommendation: finalScore.recommendation,
      confidence: this.calculateConfidence(finalScore, missingTileAnalysis),
      
      analysis: {
        currentTiles: {
          count: currentTileAnalysis.currentTileCount,
          percentage: (currentTileAnalysis.currentTileCount / 14) * 100,
          matchingGroups: Object.keys(currentTileAnalysis.matchDetails).filter(
            group => currentTileAnalysis.matchDetails[group] > 0
          )
        },
        
        missingTiles: {
          total: missingTileAnalysis.allMissingTiles.length,
          byAvailability: missingTileAnalysis.categorizedMissing
        },
        
        jokerSituation: {
          available: jokerAnalysis.jokersAvailable,
          needed: jokerAnalysis.jokersNeeded,
          canComplete: jokerAnalysis.jokersAvailable >= jokerAnalysis.jokersNeeded,
          substitutionPlan: jokerAnalysis.substitutionPlan
        },
        
        strategicValue: {
          tilePriorities: priorityAnalysis.tilePriorities,
          groupPriorities: priorityAnalysis.groupPriorities,
          overallPriority: priorityAnalysis.overallPriorityScore,
          reasoning: this.generatePriorityReasoning(priorityAnalysis)
        },
        
        gameState: gameStateAnalysis
      },
      
      scoreBreakdown: finalScore.components,
      recommendations
    }
  }
  
  /**
   * Analyze missing tiles and categorize by availability
   */
  private static analyzeMissingTiles(
    pattern: PatternSelectionOption,
    bestVariation: any,
    gameState: GameStateContext
  ) {
    const allExposedTiles = Object.values(gameState.exposedTiles).flat()
    const allMissingTiles: string[] = []
    const availabilities: Array<{ remainingInWall: number, canUseJoker: boolean }> = []
    
    // Extract missing tiles from the best variation of the pattern
    // Use pattern metadata for enhanced analysis
    const patternDifficulty = pattern.difficulty || 'medium'
    const exampleMissingTiles = this.getVariationMissingTiles(bestVariation, gameState.playerHand)
    
    const categorizedMissing = {
      easy: [] as string[],
      moderate: [] as string[],
      difficult: [] as string[],
      impossible: [] as string[]
    }
    
    for (const tileId of exampleMissingTiles) {
      const availability = IntelligenceCalculations.calculateTileAvailability(
        tileId,
        gameState.playerHand,
        allExposedTiles,
        gameState.discardPile
      )
      
      allMissingTiles.push(tileId)
      availabilities.push({
        remainingInWall: availability.remainingInWall,
        canUseJoker: true // Simplified
      })
      
      // Categorize by difficulty (adjusted based on pattern difficulty)
      const easyThreshold = patternDifficulty === 'hard' ? 4 : 3
      const moderateThreshold = patternDifficulty === 'easy' ? 0 : 1
      
      if (availability.remainingInWall >= easyThreshold) {
        categorizedMissing.easy.push(tileId)
      } else if (availability.remainingInWall >= moderateThreshold) {
        categorizedMissing.moderate.push(tileId)
      } else if (true) { // Can use joker
        categorizedMissing.difficult.push(tileId)
      } else {
        categorizedMissing.impossible.push(tileId)
      }
    }
    
    return {
      allMissingTiles,
      availabilities,
      categorizedMissing
    }
  }
  
  /**
   * Generate strategic recommendations
   */
  private static generateRecommendations(
    finalScore: any,
    missingTileAnalysis: any,
    jokerAnalysis: any,
    gameState: GameStateContext
  ) {
    const shouldPursue = finalScore.completionScore >= 45
    const strategicNotes: string[] = []
    const riskFactors: string[] = []
    const alternativePatterns: string[] = []
    
    // Generate notes based on analysis
    if (finalScore.completionScore >= 80) {
      strategicNotes.push('Excellent completion prospects - prioritize this pattern')
    } else if (finalScore.completionScore >= 65) {
      strategicNotes.push('Good pattern choice with solid fundamentals')
    } else if (finalScore.completionScore >= 45) {
      strategicNotes.push('Viable option but monitor for better alternatives')
    } else {
      strategicNotes.push('Consider switching to a more viable pattern')
    }
    
    // Risk factors
    if (jokerAnalysis.jokersNeeded > jokerAnalysis.jokersAvailable) {
      riskFactors.push(`Requires ${jokerAnalysis.jokersNeeded - jokerAnalysis.jokersAvailable} more jokers`)
    }
    
    if (missingTileAnalysis.categorizedMissing.difficult.length > 3) {
      riskFactors.push('High dependency on hard-to-get tiles')
    }
    
    if (missingTileAnalysis.categorizedMissing.impossible.length > 0) {
      riskFactors.push('Some required tiles are no longer available')
    }
    
    // Game state specific analysis
    const wallRemaining = this.estimateWallTilesRemaining(gameState)
    if (wallRemaining < 30) {
      riskFactors.push('Late in game - limited drawing opportunities')
    }
    
    if (gameState.currentTurn > 8) {
      strategicNotes.push('Mid-game: evaluate switching patterns if needed')
    }
    
    return {
      shouldPursue,
      alternativePatterns,
      strategicNotes,
      riskFactors
    }
  }
  
  /**
   * Analyze game state factors
   */
  private static analyzeGameState(
    missingTiles: string[],
    gameState: GameStateContext
  ) {
    const wallTilesRemaining = this.estimateWallTilesRemaining(gameState)
    const turnsEstimated = Math.floor(wallTilesRemaining / gameState.totalPlayers)
    const drawProbability = this.calculateDrawProbability(missingTiles, wallTilesRemaining)
    
    return {
      wallTilesRemaining,
      turnsEstimated,
      drawProbability
    }
  }
  
  /**
   * Calculate confidence in the analysis
   */
  private static calculateConfidence(
    finalScore: any,
    missingTileAnalysis: any
  ): number {
    let confidence = 0.7 // Base confidence
    
    // Higher confidence for clear recommendations
    if (finalScore.completionScore >= 80 || finalScore.completionScore <= 25) {
      confidence += 0.2
    }
    
    // Lower confidence for many unknowns
    if (missingTileAnalysis.allMissingTiles.length > 8) {
      confidence -= 0.1
    }
    
    return Math.max(0.3, Math.min(0.95, confidence))
  }
  
  /**
   * Generate reasoning for priority scores
   */
  private static generatePriorityReasoning(priorityAnalysis: any): string[] {
    const reasoning: string[] = []
    
    // Find highest priority tiles
    const highPriorityTiles = Object.entries(priorityAnalysis.tilePriorities)
      .filter(([_, priority]) => (priority as number) >= 7)
      .map(([tile, _]) => tile)
    
    if (highPriorityTiles.length > 0) {
      reasoning.push(`High-value tiles: ${highPriorityTiles.join(', ')}`)
    }
    
    // Analyze group composition
    const groupTypes = Object.keys(priorityAnalysis.groupPriorities)
    if (groupTypes.some(group => group.includes('sequence'))) {
      reasoning.push('Pattern includes sequences - good strategic flexibility')
    }
    
    if (priorityAnalysis.overallPriority >= 6) {
      reasoning.push('Above-average strategic value pattern')
    } else if (priorityAnalysis.overallPriority <= 4) {
      reasoning.push('Below-average strategic value - consider alternatives')
    }
    
    return reasoning
  }
  
  // Helper methods
  
  private static getVariationMissingTiles(bestVariation: any, hand: string[]): string[] {
    // Get missing tiles for this specific pattern variation
    const handCounts = this.countTiles(hand)
    const missing: string[] = []
    
    // Analyze each group in the variation
    for (const group of bestVariation.groups || []) {
      const groupTiles = this.getGroupTiles(group)
      for (const [tileId, needed] of Object.entries(groupTiles)) {
        const have = handCounts[tileId] || 0
        if (have < needed) {
          for (let i = have; i < needed; i++) {
            missing.push(tileId)
          }
        }
      }
    }
    
    return missing
  }
  
  static getPatternRequiredTiles(pattern: PatternSelectionOption): {[tileId: string]: number} {
    // Extract required tiles from pattern groups
    const required: {[tileId: string]: number} = {}
    
    for (const group of pattern.groups || []) {
      const groupTiles = this.getGroupTiles(group)
      for (const [tileId, count] of Object.entries(groupTiles)) {
        required[tileId] = (required[tileId] || 0) + count
      }
    }
    
    return required
  }
  
  private static getGroupTiles(group: any): {[tileId: string]: number} {
    // Parse group constraints to get required tiles
    const tiles: {[tileId: string]: number} = {}
    const constraintType = group.Constraint_Type || 'sequence'
    const constraintValues = group.Constraint_Values || ''
    
    if (constraintType === 'sequence') {
      // Parse sequence like "123" 
      for (const char of constraintValues) {
        if (char >= '1' && char <= '9') {
          tiles[`${char}dots`] = 1 // Simplified - would need suit detection
        }
      }
    } else if (constraintType === 'pung') {
      // Pung needs 3 of the same tile
      if (constraintValues) {
        tiles[`${constraintValues}dots`] = 3
      }
    }
    
    return tiles
  }
  
  private static countTiles(tiles: string[]): {[tileId: string]: number} {
    const counts: {[tileId: string]: number} = {}
    for (const tile of tiles) {
      counts[tile] = (counts[tile] || 0) + 1
    }
    return counts
  }

  private static estimateWallTilesRemaining(gameState: GameStateContext): number {
    const totalTiles = 144 // Standard mahjong set
    const handTiles = gameState.playerHand.length * gameState.totalPlayers
    const exposedTiles = Object.values(gameState.exposedTiles).flat().length
    const discardedTiles = gameState.discardPile.length
    
    return totalTiles - handTiles - exposedTiles - discardedTiles
  }
  
  private static calculateDrawProbability(missingTiles: string[], wallTilesRemaining: number): number {
    // Simplified probability calculation
    const uniqueMissingTiles = [...new Set(missingTiles)]
    const estimatedAvailableTiles = uniqueMissingTiles.length * 2 // Average 2 per type
    
    return Math.min(1.0, estimatedAvailableTiles / wallTilesRemaining)
  }
}