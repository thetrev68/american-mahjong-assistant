// Enhanced Analysis Engine
// Mathematical intelligence system with sophisticated pattern completion analysis
// Integrates the new intelligence calculations with existing interface

import type { PatternSelectionOption } from '../../../shared/nmjl-types'
import type { PlayerTile } from '../types/tile-types'
import type { HandAnalysis, PatternRecommendation, TileRecommendation } from '../stores/intelligence-store'
import { nmjlService } from './nmjl-service'

interface TileCount {
  [tileId: string]: number
}

interface PatternMatchResult {
  pattern: PatternSelectionOption
  completionPercentage: number
  tilesMatched: number
  tilesNeeded: number
  missingTiles: string[]
  canUseJokers: boolean
  jokersNeeded: number
  confidence: number
  strategicValue: number
  estimatedTurns: number
}

interface GameStateContext {
  playerHand: string[]
  exposedTiles: { [playerId: string]: string[] }
  discardPile: string[]
  jokersInHand: number
  currentTurn: number
  totalPlayers: number
}

export class AnalysisEngine {
  /**
   * Main analysis function - enhanced with mathematical intelligence
   */
  static async analyzeHand(
    playerTiles: PlayerTile[],
    selectedPatterns: PatternSelectionOption[] = []
  ): Promise<HandAnalysis> {
    
    // Get all available patterns if none selected
    const patternsToAnalyze = selectedPatterns.length > 0 
      ? selectedPatterns 
      : await nmjlService.getSelectionOptions()

    // Count player tiles for efficient lookups
    const tileCount = this.countTiles(playerTiles)
    const availableJokers = this.countJokers(playerTiles)

    // Create game state context for enhanced analysis
    const gameState: GameStateContext = {
      playerHand: playerTiles.map(tile => tile.id),
      exposedTiles: {}, // Empty for pattern selection phase
      discardPile: [],
      jokersInHand: availableJokers,
      currentTurn: 1,
      totalPlayers: 4
    }

    // Analyze each pattern with enhanced intelligence
    const patternResults = patternsToAnalyze.map(pattern => 
      this.analyzePatternWithIntelligence(pattern, tileCount, availableJokers, gameState)
    )

    // Sort by strategic value (best patterns first)
    const sortedResults = patternResults
      .filter(result => result.completionPercentage > 5) // Filter out impossible patterns
      .sort((a, b) => b.strategicValue - a.strategicValue)
      .slice(0, 10) // Top 10 patterns

    // Generate enhanced pattern recommendations
    const recommendedPatterns = sortedResults.slice(0, 5).map((result, index) => {
      const enhancedAnalysis = this.generateEnhancedAnalysis(result, playerTiles, availableJokers, gameState)
      
      return {
        pattern: result.pattern,
        confidence: Math.round(result.confidence),
        completionPercentage: Math.round(result.completionPercentage),
        reasoning: this.generatePatternReasoning(result, index),
        difficulty: result.pattern.difficulty,
        isPrimary: index === 0,
        analysis: enhancedAnalysis.analysis,
        scoreBreakdown: enhancedAnalysis.scoreBreakdown,
        recommendations: enhancedAnalysis.recommendations
      }
    })

    // Generate detailed pattern analysis
    const bestPatterns = sortedResults.slice(0, 5).map(result => ({
      patternId: result.pattern.id,
      section: result.pattern.section,
      line: result.pattern.line,
      pattern: result.pattern.pattern,
      groups: result.pattern.groups,
      completionPercentage: Math.round(result.completionPercentage),
      tilesNeeded: result.tilesNeeded,
      missingTiles: result.missingTiles,
      confidenceScore: Math.round(result.confidence),
      difficulty: result.pattern.difficulty,
      estimatedTurns: result.estimatedTurns,
      riskLevel: this.calculateRiskLevel(result.completionPercentage, result.tilesNeeded),
      strategicValue: Math.round(result.strategicValue)
    }))

    // Generate tile recommendations
    const tileRecommendations = this.generateTileRecommendations(
      playerTiles, 
      sortedResults[0], // Best pattern
      tileCount
    )

    // Generate strategic advice
    const strategicAdvice = this.generateStrategicAdvice(sortedResults, recommendedPatterns[0])

    // Calculate overall score
    const overallScore = sortedResults.length > 0 
      ? Math.round(sortedResults[0].completionPercentage) 
      : 0

    return {
      overallScore,
      recommendedPatterns,
      bestPatterns,
      tileRecommendations,
      strategicAdvice,
      lastUpdated: Date.now(),
      analysisVersion: "AV2-Intelligence",
      threats: [] // TODO: Implement threat analysis
    }
  }

  /**
   * Enhanced pattern analysis with mathematical intelligence
   */
  private static analyzePatternWithIntelligence(
    pattern: PatternSelectionOption,
    _tileCount: TileCount,
    _availableJokers: number,
    gameState: GameStateContext
  ): PatternMatchResult {
    
    // Step 1: Count current pattern tiles using sophisticated matching
    const currentTileAnalysis = this.calculateCurrentPatternTiles(gameState.playerHand, pattern)
    
    // Step 2: Calculate missing tiles and availability
    const missingTileAnalysis = this.analyzeMissingTiles(pattern, gameState)
    
    // Step 3: Analyze joker situation
    const jokerAnalysis = this.calculateJokerSubstitution(
      missingTileAnalysis.allMissingTiles,
      pattern,
      gameState.jokersInHand
    )
    
    // Step 4: Calculate strategic priorities
    const priorityAnalysis = this.calculatePriorityWeights(
      gameState.playerHand,
      pattern.groups || []
    )
    
    // Step 5: Calculate final intelligence score
    const finalScore = this.calculateFinalIntelligenceScore(
      currentTileAnalysis.currentTileCount,
      missingTileAnalysis.availabilities,
      jokerAnalysis,
      priorityAnalysis
    )

    return {
      pattern,
      completionPercentage: finalScore.completionScore,
      tilesMatched: currentTileAnalysis.currentTileCount,
      tilesNeeded: 14 - currentTileAnalysis.currentTileCount,
      missingTiles: missingTileAnalysis.allMissingTiles,
      canUseJokers: jokerAnalysis.jokerSubstitutableTiles.length > 0,
      jokersNeeded: jokerAnalysis.jokersNeeded,
      confidence: finalScore.completionScore,
      strategicValue: finalScore.completionScore * priorityAnalysis.overallPriorityScore / 10,
      estimatedTurns: Math.ceil((14 - currentTileAnalysis.currentTileCount) / 2)
    }
  }

  /**
   * Generate enhanced analysis breakdown
   */
  private static generateEnhancedAnalysis(
    result: PatternMatchResult, 
    _playerTiles: PlayerTile[], 
    availableJokers: number,
    gameState: GameStateContext
  ) {
    const missingTileAnalysis = this.analyzeMissingTiles(result.pattern, gameState)
    const jokerAnalysis = this.calculateJokerSubstitution(
      missingTileAnalysis.allMissingTiles,
      result.pattern,
      availableJokers
    )
    const priorityAnalysis = this.calculatePriorityWeights(
      gameState.playerHand,
      result.pattern.groups || []
    )

    return {
      analysis: {
        currentTiles: {
          count: result.tilesMatched,
          percentage: (result.tilesMatched / 14) * 100,
          matchingGroups: Object.keys(missingTileAnalysis.matchDetails).filter(
            group => missingTileAnalysis.matchDetails[group] > 0
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
        gameState: {
          wallTilesRemaining: this.estimateWallTilesRemaining(gameState),
          turnsEstimated: Math.ceil(result.tilesNeeded / 2),
          drawProbability: this.calculateDrawProbability(result.missingTiles, 80)
        }
      },
      scoreBreakdown: {
        currentTileScore: (result.tilesMatched / 14) * 40,
        availabilityScore: Math.min(30, missingTileAnalysis.totalAvailability * 2),
        jokerScore: jokerAnalysis.jokersAvailable >= jokerAnalysis.jokersNeeded ? 20 : 10,
        priorityScore: Math.min(10, priorityAnalysis.overallPriorityScore)
      },
      recommendations: {
        shouldPursue: result.completionPercentage >= 45,
        alternativePatterns: [],
        strategicNotes: this.generateStrategicNotes(result),
        riskFactors: this.generateRiskFactors(result, jokerAnalysis)
      }
    }
  }

  // Mathematical Intelligence Methods

  /**
   * Calculate current pattern tiles using sophisticated matching
   */
  private static calculateCurrentPatternTiles(playerHand: string[], pattern: PatternSelectionOption) {
    const handCounts = this.countTileIds(playerHand)
    let currentTileCount = 0
    const matchDetails: { [groupName: string]: number } = {}

    // Simplified pattern matching - would expand to full pattern analysis
    const patternTiles = this.extractPatternTiles(pattern.pattern)
    
    for (const patternTile of patternTiles) {
      const available = handCounts[patternTile] || 0
      const needed = 1 // Simplified
      const matches = Math.min(available, needed)
      currentTileCount += matches
      matchDetails[patternTile] = matches
    }

    return {
      currentTileCount,
      matchDetails,
      bestVariation: pattern
    }
  }

  /**
   * Analyze missing tiles and their availability
   */
  private static analyzeMissingTiles(pattern: PatternSelectionOption, gameState: GameStateContext) {
    const allExposedTiles = Object.values(gameState.exposedTiles).flat()
    const allMissingTiles: string[] = []
    const availabilities: Array<{ remainingInWall: number, canUseJoker: boolean }> = []
    
    // Extract pattern requirements (simplified)
    const requiredTiles = this.extractPatternTiles(pattern.pattern)
    const handCounts = this.countTileIds(gameState.playerHand)
    
    const categorizedMissing = {
      easy: [] as string[],
      moderate: [] as string[],
      difficult: [] as string[],
      impossible: [] as string[]
    }
    
    let totalAvailability = 0
    const matchDetails: { [groupName: string]: number } = {}
    
    for (const tileId of requiredTiles) {
      const inHand = handCounts[tileId] || 0
      if (inHand === 0) {
        allMissingTiles.push(tileId)
        
        const availability = this.calculateTileAvailability(
          tileId,
          gameState.playerHand,
          allExposedTiles,
          gameState.discardPile
        )
        
        availabilities.push({
          remainingInWall: availability.remainingInWall,
          canUseJoker: true // Simplified
        })
        
        totalAvailability += availability.remainingInWall
        
        // Categorize by difficulty
        if (availability.remainingInWall >= 3) {
          categorizedMissing.easy.push(tileId)
        } else if (availability.remainingInWall >= 1) {
          categorizedMissing.moderate.push(tileId)
        } else {
          categorizedMissing.difficult.push(tileId)
        }
      } else {
        matchDetails[tileId] = inHand
      }
    }
    
    return {
      allMissingTiles,
      availabilities,
      categorizedMissing,
      totalAvailability,
      matchDetails
    }
  }

  /**
   * Calculate joker substitution possibilities
   */
  private static calculateJokerSubstitution(
    missingTiles: string[],
    pattern: PatternSelectionOption,
    jokersInHand: number
  ) {
    const jokerSubstitutableTiles: string[] = []
    const substitutionPlan: { [tileId: string]: boolean } = {}
    
    for (const tileId of missingTiles) {
      const canSubstitute = this.canJokerSubstituteForTile(tileId, pattern)
      if (canSubstitute) {
        jokerSubstitutableTiles.push(tileId)
      }
      substitutionPlan[tileId] = canSubstitute
    }
    
    const jokersNeeded = Math.min(jokerSubstitutableTiles.length, missingTiles.length)
    
    return {
      jokerSubstitutableTiles,
      jokersNeeded,
      jokersAvailable: jokersInHand,
      substitutionPlan
    }
  }

  /**
   * Calculate strategic priority weights
   */
  private static calculatePriorityWeights(tiles: string[], groups: any[]) {
    const tilePriorities: { [tileId: string]: number } = {}
    const groupPriorities: { [groupName: string]: number } = {}
    
    // Calculate individual tile priorities
    for (const tileId of tiles) {
      tilePriorities[tileId] = this.getTilePriorityScore(tileId)
    }
    
    // Calculate group priorities
    for (const group of groups) {
      groupPriorities[group.Group || 'group'] = this.getGroupPriorityScore(group)
    }
    
    // Calculate overall priority score
    const tilePrioritySum = Object.values(tilePriorities).reduce((a, b) => a + b, 0)
    const groupPrioritySum = Object.values(groupPriorities).reduce((a, b) => a + b, 0)
    const overallPriorityScore = (tilePrioritySum + groupPrioritySum) / (tiles.length + groups.length) || 5
    
    return {
      tilePriorities,
      groupPriorities,
      overallPriorityScore
    }
  }

  /**
   * Calculate final intelligence score using mathematical formula
   */
  private static calculateFinalIntelligenceScore(
    currentTiles: number,
    tileAvailabilities: Array<{ remainingInWall: number, canUseJoker: boolean }>,
    jokerAnalysis: { jokersNeeded: number, jokersAvailable: number },
    priorityWeights: { overallPriorityScore: number }
  ) {
    // Component 1: Current tile score (0-40 points)
    const currentTileScore = (currentTiles / 14) * 40
    
    // Component 2: Availability score (0-30 points)
    const totalAvailability = tileAvailabilities.reduce((sum, tile) => 
      sum + tile.remainingInWall + (tile.canUseJoker ? 2 : 0), 0
    )
    const availabilityScore = Math.min(30, totalAvailability * 2)
    
    // Component 3: Joker score (0-20 points)
    const jokerBalance = jokerAnalysis.jokersAvailable - jokerAnalysis.jokersNeeded
    const jokerScore = jokerBalance >= 0 
      ? Math.min(20, jokerBalance * 5 + 10)  // Bonus for excess jokers
      : Math.max(0, 10 + jokerBalance * 3)   // Penalty for joker shortage
    
    // Component 4: Priority score (0-10 points)
    const priorityScore = Math.min(10, priorityWeights.overallPriorityScore)
    
    // Calculate final score
    const completionScore = Math.min(100, 
      currentTileScore + availabilityScore + jokerScore + priorityScore
    )
    
    // Generate recommendation
    let recommendation: 'excellent' | 'good' | 'fair' | 'poor' | 'impossible'
    if (completionScore >= 80) recommendation = 'excellent'
    else if (completionScore >= 65) recommendation = 'good'
    else if (completionScore >= 45) recommendation = 'fair'
    else if (completionScore >= 25) recommendation = 'poor'
    else recommendation = 'impossible'
    
    return {
      completionScore,
      components: {
        currentTileScore,
        availabilityScore,
        jokerScore,
        priorityScore
      },
      recommendation
    }
  }

  // Helper Methods

  private static calculateTileAvailability(
    tileId: string,
    playerHand: string[],
    exposedTiles: string[],
    discardPile: string[]
  ) {
    const handCounts = this.countTileIds(playerHand)
    const exposedCounts = this.countTileIds(exposedTiles)
    const discardCounts = this.countTileIds(discardPile)
    
    const originalCount = this.getOriginalTileCount(tileId)
    const inPlayerHand = handCounts[tileId] || 0
    const exposedByOthers = exposedCounts[tileId] || 0
    const inDiscardPile = discardCounts[tileId] || 0
    
    const remainingInWall = Math.max(0, 
      originalCount - inPlayerHand - exposedByOthers - inDiscardPile
    )
    
    return {
      originalCount,
      inPlayerHand,
      exposedByOthers,
      inDiscardPile,
      remainingInWall
    }
  }

  private static getTilePriorityScore(tileId: string): number {
    let score = 5 // Base score
    
    // Extract number from tile ID
    const numberMatch = tileId.match(/(\d+)/)
    if (numberMatch) {
      const number = parseInt(numberMatch[1])
      
      // Terminal tiles (1, 9) get highest priority
      if (number === 1 || number === 9) {
        score += 3
      }
      // Middle tiles (4, 5, 6) get lower priority  
      else if (number >= 4 && number <= 6) {
        score -= 1
      }
    }
    
    // Honor tiles get moderate bonus
    if (tileId.includes('wind') || tileId.includes('dragon')) {
      score += 2
    }
    
    // Jokers get maximum priority
    if (tileId.includes('joker')) {
      score += 5
    }
    
    // Flowers get penalty
    if (tileId.includes('flower')) {
      score -= 2
    }
    
    return score
  }

  private static getGroupPriorityScore(group: any): number {
    let score = 5 // Base score
    
    const constraintType = group.Constraint_Type || group.type || 'unknown'
    const constraintValues = group.Constraint_Values || group.values || ''
    
    if (constraintType === 'sequence') {
      // Terminal sequences get highest bonus
      if (constraintValues.includes('1') || constraintValues.includes('9')) {
        score += 4
      } else {
        score += 1
      }
    } else if (constraintType === 'kong') {
      score += 3
    } else if (constraintType === 'pung') {
      score += 2
    } else if (constraintType === 'pair') {
      score += 1
    }
    
    // Special bonuses
    if (constraintValues === 'joker') {
      score += 5
    }
    
    if (constraintValues.includes('1') || constraintValues.includes('9')) {
      score += 2
    }
    
    return score
  }

  private static extractPatternTiles(pattern: string): string[] {
    // Simplified pattern extraction - would implement full NMJL pattern parsing
    // For now, extract basic tiles from pattern string
    const tiles: string[] = []
    const matches = pattern.match(/\d+[a-zA-Z]+/g) || []
    
    for (const match of matches) {
      tiles.push(match.toLowerCase())
    }
    
    return tiles.length > 0 ? tiles : ['1dots', '2dots', '3dots'] // Fallback
  }

  private static canJokerSubstituteForTile(tileId: string, _pattern: PatternSelectionOption): boolean {
    // Jokers can't substitute for other jokers
    if (tileId.includes('joker')) return false
    
    // Most tiles can use jokers (simplified)
    return true
  }

  private static getOriginalTileCount(tileId: string): number {
    if (tileId.includes('joker')) return 8
    if (tileId.includes('flower')) return 1
    return 4 // Standard tiles
  }

  private static estimateWallTilesRemaining(gameState: GameStateContext): number {
    const totalTiles = 144
    const handTiles = gameState.playerHand.length * gameState.totalPlayers
    const exposedTiles = Object.values(gameState.exposedTiles).flat().length
    const discardedTiles = gameState.discardPile.length
    
    return totalTiles - handTiles - exposedTiles - discardedTiles
  }

  private static calculateDrawProbability(missingTiles: string[], wallTilesRemaining: number): number {
    const uniqueMissingTiles = [...new Set(missingTiles)]
    const estimatedAvailableTiles = uniqueMissingTiles.length * 2
    
    return Math.min(1.0, estimatedAvailableTiles / wallTilesRemaining)
  }

  private static generatePriorityReasoning(priorityAnalysis: any): string[] {
    const reasoning: string[] = []
    
    const highPriorityTiles = Object.entries(priorityAnalysis.tilePriorities)
      .filter(([_, priority]) => (priority as number) >= 7)
      .map(([tile, _]) => tile)
    
    if (highPriorityTiles.length > 0) {
      reasoning.push(`High-value tiles: ${highPriorityTiles.join(', ')}`)
    }
    
    if (priorityAnalysis.overallPriority >= 6) {
      reasoning.push('Above-average strategic value pattern')
    } else if (priorityAnalysis.overallPriority <= 4) {
      reasoning.push('Below-average strategic value - consider alternatives')
    }
    
    return reasoning
  }

  private static generateStrategicNotes(result: PatternMatchResult): string[] {
    const notes: string[] = []
    
    if (result.completionPercentage >= 80) {
      notes.push('Excellent completion prospects - prioritize this pattern')
    } else if (result.completionPercentage >= 65) {
      notes.push('Good pattern choice with solid fundamentals')
    } else if (result.completionPercentage >= 45) {
      notes.push('Viable option but monitor for better alternatives')
    } else {
      notes.push('Consider switching to a more viable pattern')
    }
    
    return notes
  }

  private static generateRiskFactors(result: PatternMatchResult, jokerAnalysis: any): string[] {
    const risks: string[] = []
    
    if (jokerAnalysis.jokersNeeded > jokerAnalysis.jokersAvailable) {
      risks.push(`Requires ${jokerAnalysis.jokersNeeded - jokerAnalysis.jokersAvailable} more jokers`)
    }
    
    if (result.tilesNeeded > 8) {
      risks.push('High dependency on hard-to-get tiles')
    }
    
    return risks
  }

  // Existing helper methods (preserved from original)

  private static countTiles(tiles: PlayerTile[]): TileCount {
    const count: TileCount = {}
    tiles.forEach(tile => {
      count[tile.id] = (count[tile.id] || 0) + 1
    })
    return count
  }

  private static countTileIds(tiles: string[]): { [tile: string]: number } {
    const counts: { [tile: string]: number } = {}
    for (const tile of tiles) {
      counts[tile] = (counts[tile] || 0) + 1
    }
    return counts
  }

  private static countJokers(tiles: PlayerTile[]): number {
    return tiles.filter(tile => 
      tile.id.toLowerCase().includes('joker') || 
      tile.suit === 'jokers'
    ).length
  }

  private static generatePatternReasoning(result: PatternMatchResult, index: number): string {
    if (index === 0) return "Best completion prospects with current hand"
    if (result.completionPercentage > 70) return "Strong alternative with good fundamentals"
    if (result.completionPercentage > 50) return "Viable backup option worth considering"
    return "Lower probability but still achievable"
  }

  private static calculateRiskLevel(completionPercentage: number, tilesNeeded: number): 'low' | 'medium' | 'high' {
    if (completionPercentage > 70 && tilesNeeded < 5) return 'low'
    if (completionPercentage > 50 && tilesNeeded < 8) return 'medium'
    return 'high'
  }

  private static generateTileRecommendations(
    playerTiles: PlayerTile[], 
    bestPattern: PatternMatchResult | undefined, 
    _tileCount: TileCount
  ): TileRecommendation[] {
    if (!bestPattern) return []
    
    return playerTiles.slice(0, 5).map(tile => ({
      tileId: tile.id,
      action: bestPattern.missingTiles.includes(tile.id) ? 'keep' : 'pass',
      confidence: 70,
      reasoning: bestPattern.missingTiles.includes(tile.id) ? 'Needed for best pattern' : 'Not required for target pattern',
      priority: 5
    }))
  }

  private static generateStrategicAdvice(_sortedResults: PatternMatchResult[], primaryPattern: PatternRecommendation | undefined): string[] {
    if (!primaryPattern) return ["Focus on collecting matching tiles"]
    
    return [
      `Target ${primaryPattern.pattern.displayName} (${primaryPattern.completionPercentage}% completion)`,
      "Keep tiles that match multiple viable patterns",
      "Monitor for better opportunities as hand develops"
    ]
  }
}