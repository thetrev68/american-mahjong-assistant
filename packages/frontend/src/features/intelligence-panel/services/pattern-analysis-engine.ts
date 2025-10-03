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
  patternTiles: string[] // Complete 14-tile array from variation.tiles
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
  static analyzePatterns(
    playerTiles: string[],
    targetPatternIds: string[],
    gameContext: GameContext
  ): PatternAnalysisFacts[] {
    // Defensive input validation
    if (!Array.isArray(playerTiles)) {
      playerTiles = []
    }
    if (!Array.isArray(targetPatternIds)) {
      targetPatternIds = []
    }
    if (!gameContext || typeof gameContext !== 'object') {
      gameContext = {
        jokersInHand: 0,
        wallTilesRemaining: 84,
        discardPile: [],
        exposedTiles: {},
        currentPhase: 'gameplay'
      }
    }

    // Filter out invalid player tiles
    const validPlayerTiles = playerTiles.filter(tile =>
      tile && typeof tile === 'string' && tile.length > 0
    )

    try {
      // Data is preloaded in main.tsx, so this returns void (no await needed)
      PatternVariationLoader.loadVariations()
    } catch (error) {
      console.error('❌ Pattern variations load failed:', error)
      // If loader fails, return safe fallback for each pattern
      return targetPatternIds.map(patternId => this.createFallbackAnalysis(patternId, validPlayerTiles))
    }

    const results: PatternAnalysisFacts[] = []

    for (const patternId of targetPatternIds) {
      if (!patternId || typeof patternId !== 'string') {
        continue
      }

      try {
        // Data is preloaded, so this returns array directly (no await)
        const variations = PatternVariationLoader.getPatternVariations(patternId) as PatternVariation[]

        // Filter out invalid variations
        const validVariations = this.filterValidVariations(variations)

        if (validVariations.length === 0) {
          // Return fallback analysis even if no valid variations
          results.push(this.createFallbackAnalysis(patternId, validPlayerTiles))
          continue
        }

        const analysisFacts = this.analyzePatternVariations(
          validPlayerTiles,
          validVariations,
          gameContext
        )

        results.push(analysisFacts)
      } catch {
        // On any error with this pattern, provide fallback
        results.push(this.createFallbackAnalysis(patternId, validPlayerTiles))
      }
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
      const analysisFacts = this.analyzePatternVariations(
        playerTiles,
        variations,
        gameContext
      )
      results.push(analysisFacts)
    }
    
    return results
  }

  /**
   * Filter out invalid variations to prevent crashes
   */
  private static filterValidVariations(variations: PatternVariation[]): PatternVariation[] {
    if (!Array.isArray(variations)) {
      return []
    }

    return variations.filter(variation => {
      if (!variation || typeof variation !== 'object') {
        return false
      }

      // Check required fields exist and have valid types
      if (!variation.handKey || typeof variation.handKey !== 'string') {
        return false
      }

      if (!Array.isArray(variation.tiles) || variation.tiles.length !== 14) {
        return false
      }

      if (!Array.isArray(variation.jokers) || variation.jokers.length !== 14) {
        return false
      }

      if (typeof variation.sequence !== 'number' || variation.sequence < 1) {
        return false
      }

      return true
    })
  }

  /**
   * Create fallback analysis when normal analysis fails
   */
  private static createFallbackAnalysis(patternId: string, _playerTiles: string[]): PatternAnalysisFacts {
    const missingTilePlaceholder = 'unknown'
    const fallbackMissingTiles = Array(14).fill(missingTilePlaceholder)

    const fallbackVariation: TileMatchResult = {
      variationId: `${patternId}-fallback`,
      patternId: patternId,
      sequence: 1,
      tilesMatched: 0,
      tilesNeeded: 14,
      completionRatio: 0,
      missingTiles: fallbackMissingTiles,
      tileContributions: [],
      patternTiles: fallbackMissingTiles
    }

    return {
      patternId,
      tileMatching: {
        totalVariations: 0,
        bestVariation: fallbackVariation,
        worstVariation: fallbackVariation,
        averageCompletion: 0,
        allResults: []
      },
      jokerAnalysis: {
        jokersAvailable: 0,
        substitutablePositions: [],
        maxJokersUseful: 0,
        withJokersCompletion: 0,
        jokersToComplete: 14
      },
      tileAvailability: {
        missingTileCounts: [
          {
            tileId: missingTilePlaceholder,
            inWall: 0,
            inDiscards: 0,
            exposedByOthers: 0,
            totalOriginal: this.getOriginalTileCount(missingTilePlaceholder),
            remainingAvailable: 0
          }
        ],
        totalMissingInWall: 0,
        totalMissingNeeded: fallbackMissingTiles.length,
        availabilityRatio: 0
      },
      progressMetrics: {
        tilesCollected: 0,
        tilesRemaining: 14,
        progressPercentage: 0,
        pairsFormed: 0,
        setsFormed: 0
      }
    }
  }

  /**
   * Analyze all variations of a single pattern
   * NOTE: This method is synchronous (no async) to avoid Promise wrapping and microtask deadlocks
   */
  private static analyzePatternVariations(
    playerTiles: string[],
    variations: PatternVariation[],
    gameContext: GameContext
  ): PatternAnalysisFacts {
    const playerTileCounts = PatternVariationLoader.countTiles(playerTiles)

    // Analyze each variation
    const variationResults: TileMatchResult[] = []
    for (let i = 0; i < variations.length; i++) {
      const variation = variations[i]
      try {
        const result = this.analyzeVariationMatch(playerTiles, variation, playerTileCounts)
        variationResults.push(result)
      } catch {
        // Skip invalid variations rather than crashing
        continue
      }
    }

    // Handle case where no valid variations were processed
    if (variationResults.length === 0) {
      return this.createFallbackAnalysis(variations[0]?.handKey || 'unknown', playerTiles)
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

    // Analyze jokers using best variation (with safe fallback)
    const bestVariationData = variations.find(v => v.sequence === bestVariation.sequence)
    const jokerAnalysis = bestVariationData
      ? this.analyzeJokerSubstitution(
          bestVariation.missingTiles,
          bestVariationData,
          gameContext.jokersInHand
        )
      : {
          jokersAvailable: gameContext.jokersInHand || 0,
          substitutablePositions: [],
          maxJokersUseful: 0,
          withJokersCompletion: bestVariation.completionRatio,
          jokersToComplete: bestVariation.tilesNeeded
        }

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
    // Additional safety checks within the method
    if (!variation || !Array.isArray(variation.tiles)) {
      throw new Error('Invalid variation data')
    }

    const requiredTileCounts = PatternVariationLoader.countTiles(variation.tiles)
    
    let tilesMatched = 0
    const missingTiles: string[] = []
    const tileContributions: TileContribution[] = []
    
    
    // Analyze each required tile type (with null safety)
    for (const [requiredTileId, requiredCount] of Object.entries(requiredTileCounts)) {
      if (!requiredTileId || typeof requiredCount !== 'number') {
        continue
      }

      const playerCount = playerTileCounts[requiredTileId] || 0
      const matched = Math.min(playerCount, requiredCount)
      const missing = requiredCount - matched
      
      tilesMatched += matched
      
      if (variation.handKey.includes('SINGLES_AND_PAIRS-1-1')) {
        // console.log(`Seq ${variation.sequence} - ${requiredTileId}: need ${requiredCount}, have ${playerCount}, matched ${matched}`)
      }
      
      // Add missing tiles to list
      for (let i = 0; i < missing; i++) {
        missingTiles.push(requiredTileId)
      }
    }
    
    // Analyze tile contributions for each player tile
    for (const playerTile of new Set(playerTiles)) {
      const positions = this.findTilePositions(playerTile, variation.tiles)
      const isRequired = variation.tiles.includes(playerTile)
      
      
      const contribution: TileContribution = {
        tileId: playerTile,
        positionsInPattern: positions,
        isRequired: isRequired,
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
      tileContributions,
      patternTiles: variation.tiles // Include complete 14-tile array from Engine 1
    }
  }

  /**
   * Analyze joker substitution possibilities using authoritative NMJL joker data
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
    // Safe access to gameContext properties
    const discardPile = Array.isArray(gameContext.discardPile) ? gameContext.discardPile : []
    const exposedTiles = gameContext.exposedTiles && typeof gameContext.exposedTiles === 'object'
      ? gameContext.exposedTiles
      : {}

    const allExposedTiles = Object.values(exposedTiles)
      .filter(tiles => Array.isArray(tiles))
      .flat()
      .filter(tile => tile && typeof tile === 'string')
    
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
    
    // Use the definitive joker data from the variation (derived from NMJL Jokers_Allowed fields)
    // The variation.jokers array contains the authoritative joker allowance for each position
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
    if (tileId.startsWith('f')) return 8 // Flowers (all interchangeable: 2×f1, 2×f2, 2×f3, 2×f4)
    return 4 // Standard tiles
  }
}