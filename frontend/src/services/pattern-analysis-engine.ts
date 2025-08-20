// Engine 1: Pattern Analysis Engine (Facts Only)
// Pure mathematical calculations with no opinions or scoring
// Analyzes player hand against all 1,002 pattern variations

import { PatternVariationLoader, type PatternVariation } from './pattern-variation-loader'

export interface GameContext {
  jokersInHand: number
  wallTilesRemaining: number
  discardPile: string[]
  exposedTiles: { [playerId: string]: string[] }
  currentPhase: 'charleston' | 'gameplay'
}

export interface TileMatchResult {
  variationId: string
  patternId: string
  sequence: number
  tilesMatched: number
  tilesNeeded: number
  completionRatio: number
  missingTiles: string[]
  tileContributions: TileContribution[]
}

export interface TileContribution {
  tileId: string
  positionsInPattern: number[]
  isRequired: boolean
  isCritical: boolean
  canBeReplaced: boolean
}

export interface JokerAnalysis {
  jokersAvailable: number
  substitutablePositions: number[]
  maxJokersUseful: number
  withJokersCompletion: number
  jokersToComplete: number
}

export interface TileAvailability {
  tileId: string
  inWall: number
  inDiscards: number
  exposedByOthers: number
  totalOriginal: number
  remainingAvailable: number
}

export interface ProgressMetrics {
  tilesCollected: number
  tilesRemaining: number
  progressPercentage: number
  pairsFormed: number
  setsFormed: number
  sequenceProgress?: {
    consecutiveTilesFound: number
    gapsInSequence: number
    longestRun: number
  }
}

export interface PatternAnalysisFacts {
  patternId: string
  
  // Exact tile matching across all variations
  tileMatching: {
    totalVariations: number
    bestVariation: TileMatchResult
    worstVariation: TileMatchResult
    averageCompletion: number
    allResults: TileMatchResult[]
  }
  
  // Joker substitution facts
  jokerAnalysis: JokerAnalysis
  
  // Tile availability facts (wall counting)
  tileAvailability: {
    missingTileCounts: TileAvailability[]
    totalMissingInWall: number
    totalMissingNeeded: number
    availabilityRatio: number
  }
  
  // Statistical facts
  progressMetrics: ProgressMetrics
}

export class PatternAnalysisEngine {
  /**
   * Analyze a player's hand against all variations of specific patterns
   */
  static async analyzePatterns(
    playerTiles: string[],
    targetPatternIds: string[],
    gameContext: GameContext
  ): Promise<PatternAnalysisFacts[]> {
    await PatternVariationLoader.loadVariations()
    
    const results: PatternAnalysisFacts[] = []
    
    for (const patternId of targetPatternIds) {
      const variations = await PatternVariationLoader.getPatternVariations(patternId)
      if (variations.length === 0) continue
      
      const analysisFacts = await this.analyzePatternVariations(
        playerTiles,
        variations,
        gameContext
      )
      
      results.push(analysisFacts)
    }
    
    return results
  }

  /**
   * Analyze all 1,002 variations against player hand
   */
  static async analyzeAllVariations(
    playerTiles: string[],
    gameContext: GameContext
  ): Promise<PatternAnalysisFacts[]> {
    await PatternVariationLoader.loadVariations()
    
    const allVariations = await PatternVariationLoader.getAllVariations()
    
    // Group variations by pattern
    const variationsByPattern = new Map<string, PatternVariation[]>()
    for (const variation of allVariations) {
      const existing = variationsByPattern.get(variation.handKey) || []
      existing.push(variation)
      variationsByPattern.set(variation.handKey, existing)
    }
    
    const results: PatternAnalysisFacts[] = []
    
    for (const [, variations] of variationsByPattern) {
      const analysisFacts = await this.analyzePatternVariations(
        playerTiles,
        variations,
        gameContext
      )
      results.push(analysisFacts)
    }
    
    return results
  }

  /**
   * Analyze all variations of a single pattern
   */
  private static async analyzePatternVariations(
    playerTiles: string[],
    variations: PatternVariation[],
    gameContext: GameContext
  ): Promise<PatternAnalysisFacts> {
    const playerTileCounts = PatternVariationLoader.countTiles(playerTiles)
    
    // Analyze each variation
    const variationResults: TileMatchResult[] = []
    for (const variation of variations) {
      const result = this.analyzeVariationMatch(playerTiles, variation, playerTileCounts)
      variationResults.push(result)
    }
    
    // Find best and worst variations
    const bestVariation = variationResults.reduce((best, current) => 
      current.completionRatio > best.completionRatio ? current : best
    )
    
    const worstVariation = variationResults.reduce((worst, current) => 
      current.completionRatio < worst.completionRatio ? current : worst
    )
    
    // Calculate average completion
    const averageCompletion = variationResults.reduce((sum, result) => 
      sum + result.completionRatio, 0
    ) / variationResults.length
    
    // Analyze jokers using best variation
    const jokerAnalysis = this.analyzeJokerSubstitution(
      bestVariation.missingTiles,
      variations.find(v => v.sequence === bestVariation.sequence)!,
      gameContext.jokersInHand
    )
    
    // Analyze tile availability
    const tileAvailability = this.analyzeTileAvailability(
      bestVariation.missingTiles,
      gameContext
    )
    
    // Calculate progress metrics
    const progressMetrics = this.calculateProgressMetrics(playerTiles, bestVariation)
    
    return {
      patternId: variations[0].handKey,
      tileMatching: {
        totalVariations: variations.length,
        bestVariation,
        worstVariation,
        averageCompletion,
        allResults: variationResults
      },
      jokerAnalysis,
      tileAvailability,
      progressMetrics
    }
  }

  /**
   * Analyze exact tile matching for a single variation
   */
  private static analyzeVariationMatch(
    playerTiles: string[],
    variation: PatternVariation,
    playerTileCounts: { [tileId: string]: number }
  ): TileMatchResult {
    const requiredTileCounts = PatternVariationLoader.countTiles(variation.tiles)
    
    let tilesMatched = 0
    const missingTiles: string[] = []
    const tileContributions: TileContribution[] = []
    
    // Analyze each required tile type
    for (const [requiredTileId, requiredCount] of Object.entries(requiredTileCounts)) {
      const playerCount = playerTileCounts[requiredTileId] || 0
      const matched = Math.min(playerCount, requiredCount)
      const missing = requiredCount - matched
      
      tilesMatched += matched
      
      // Add missing tiles to list
      for (let i = 0; i < missing; i++) {
        missingTiles.push(requiredTileId)
      }
    }
    
    // Analyze tile contributions for each player tile
    for (const playerTile of new Set(playerTiles)) {
      const positions = this.findTilePositions(playerTile, variation.tiles)
      const contribution: TileContribution = {
        tileId: playerTile,
        positionsInPattern: positions,
        isRequired: variation.tiles.includes(playerTile),
        isCritical: this.isCriticalTile(playerTile, variation),
        canBeReplaced: this.canJokerReplace(playerTile, variation)
      }
      tileContributions.push(contribution)
    }
    
    return {
      variationId: `${variation.handKey}-${variation.sequence}`,
      patternId: variation.handKey,
      sequence: variation.sequence,
      tilesMatched,
      tilesNeeded: 14 - tilesMatched,
      completionRatio: tilesMatched / 14,
      missingTiles,
      tileContributions
    }
  }

  /**
   * Analyze joker substitution possibilities
   */
  private static analyzeJokerSubstitution(
    missingTiles: string[],
    variation: PatternVariation,
    jokersAvailable: number
  ): JokerAnalysis {
    const substitutablePositions: number[] = []
    let maxJokersUseful = 0
    
    // Find which missing tiles can be substituted by jokers
    const missingTilePositions = new Map<string, number[]>()
    
    missingTiles.forEach(tileId => {
      const positions = this.findTilePositions(tileId, variation.tiles)
      missingTilePositions.set(tileId, positions)
    })
    
    // Check which positions allow jokers
    for (const [, positions] of missingTilePositions) {
      for (const position of positions) {
        if (variation.jokers[position]) {
          substitutablePositions.push(position)
          maxJokersUseful++
        }
      }
    }
    
    const jokersUsed = Math.min(jokersAvailable, maxJokersUseful)
    const originalMatched = 14 - missingTiles.length
    const withJokersMatched = originalMatched + jokersUsed
    
    return {
      jokersAvailable,
      substitutablePositions: [...new Set(substitutablePositions)],
      maxJokersUseful,
      withJokersCompletion: withJokersMatched / 14,
      jokersToComplete: Math.max(0, missingTiles.length - jokersAvailable)
    }
  }

  /**
   * Analyze tile availability in wall
   */
  private static analyzeTileAvailability(
    missingTiles: string[],
    gameContext: GameContext
  ): PatternAnalysisFacts['tileAvailability'] {
    const { discardPile, exposedTiles } = gameContext
    const allExposedTiles = Object.values(exposedTiles).flat()
    
    const missingTileCounts: TileAvailability[] = []
    let totalMissingInWall = 0
    
    for (const tileId of new Set(missingTiles)) {
      const availability = this.calculateTileAvailability(
        tileId,
        discardPile,
        allExposedTiles
      )
      
      missingTileCounts.push(availability)
      totalMissingInWall += availability.remainingAvailable
    }
    
    return {
      missingTileCounts,
      totalMissingInWall,
      totalMissingNeeded: missingTiles.length,
      availabilityRatio: totalMissingInWall / missingTiles.length
    }
  }

  /**
   * Calculate progress metrics
   */
  private static calculateProgressMetrics(
    playerTiles: string[],
    bestVariation: TileMatchResult
  ): ProgressMetrics {
    const tileCounts = PatternVariationLoader.countTiles(playerTiles)
    
    let pairsFormed = 0
    let setsFormed = 0
    
    for (const [, count] of Object.entries(tileCounts)) {
      if (count >= 2) pairsFormed++
      if (count >= 3) setsFormed++
    }
    
    return {
      tilesCollected: bestVariation.tilesMatched,
      tilesRemaining: bestVariation.tilesNeeded,
      progressPercentage: bestVariation.completionRatio * 100,
      pairsFormed,
      setsFormed
      // sequenceProgress calculation would go here for sequence patterns
    }
  }

  // Utility Methods

  private static findTilePositions(tileId: string, tiles: string[]): number[] {
    const positions: number[] = []
    tiles.forEach((tile, index) => {
      if (tile === tileId) {
        positions.push(index)
      }
    })
    return positions
  }

  private static isCriticalTile(tileId: string, variation: PatternVariation): boolean {
    const positions = this.findTilePositions(tileId, variation.tiles)
    const count = positions.length
    
    // Consider a tile critical if it appears 2+ times (pair, pung, kong)
    return count >= 2
  }

  private static canJokerReplace(tileId: string, variation: PatternVariation): boolean {
    const positions = this.findTilePositions(tileId, variation.tiles)
    
    // Check if any position of this tile allows jokers
    return positions.some(position => variation.jokers[position])
  }

  private static calculateTileAvailability(
    tileId: string,
    discardPile: string[],
    exposedTiles: string[]
  ): TileAvailability {
    const originalCount = this.getOriginalTileCount(tileId)
    const inDiscards = discardPile.filter(tile => tile === tileId).length
    const exposedByOthers = exposedTiles.filter(tile => tile === tileId).length
    
    const remainingAvailable = Math.max(0, originalCount - inDiscards - exposedByOthers)
    
    return {
      tileId,
      inWall: remainingAvailable,
      inDiscards,
      exposedByOthers,
      totalOriginal: originalCount,
      remainingAvailable
    }
  }

  private static getOriginalTileCount(tileId: string): number {
    if (tileId === 'joker') return 8
    if (tileId.startsWith('f')) return 1 // Flowers
    return 4 // Standard tiles
  }
}