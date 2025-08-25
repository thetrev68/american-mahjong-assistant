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
    
    // Debug best variation for SINGLES AND PAIRS
    if (variations[0].handKey.includes('SINGLES_AND_PAIRS-1-1')) {
      // console.log('=== BEST VARIATION SELECTED ===')
      // console.log(`Best: Sequence ${bestVariation.sequence}, ${bestVariation.tilesMatched}/14 tiles (${(bestVariation.completionRatio * 100).toFixed(1)}%)`)
      // console.log('All variations completion rates:', variationResults.map(v => `Seq${v.sequence}: ${v.tilesMatched}/14`).join(', '))
    }
    
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
    
    // Pattern analysis debug logging (disabled in production)
    if (process.env.NODE_ENV === 'development' && variation.handKey.includes('SINGLES_AND_PAIRS-2-1')) {
      console.log(`=== ENGINE 1 DEBUG: SINGLES AND PAIRS-2-1 Sequence ${variation.sequence} ===`)
      console.log('Player tiles:', playerTiles)
      console.log('Pattern tiles:', variation.tiles)
    }
    
    // Analyze each required tile type
    for (const [requiredTileId, requiredCount] of Object.entries(requiredTileCounts)) {
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
      const isRequired = this.doesTileMatchPattern(playerTile, variation.tiles)
      
      // Debug tile matching for development
      if (process.env.NODE_ENV === 'development' && variation.handKey.includes('SINGLES_AND_PAIRS-2-1')) {
        console.log(`Tile ${playerTile}: isRequired=${isRequired}, positions=[${positions.join(',')}]`)
      }
      
      const contribution: TileContribution = {
        tileId: playerTile,
        positionsInPattern: positions,
        isRequired: isRequired,
        isCritical: this.isCriticalTile(playerTile, variation),
        canBeReplaced: this.canJokerReplace(playerTile, variation)
      }
      
      // Debug contribution analysis for development
      if (process.env.NODE_ENV === 'development' && variation.handKey.includes('SINGLES_AND_PAIRS-2-1') && positions.length > 0) {
        console.log(`CONTRIBUTION: ${playerTile} -> required=${isRequired}, critical=${contribution.isCritical}`)
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
    const normalizedTile = this.normalizeTileId(tileId)
    
    tiles.forEach((tile, index) => {
      const normalizedPattern = this.normalizeTileId(tile)
      if (normalizedTile === normalizedPattern) {
        positions.push(index)
      }
    })
    return positions
  }

  private static isCriticalTile(tileId: string, variation: PatternVariation): boolean {
    const positions = this.findTilePositions(tileId, variation.tiles)
    // A tile is critical if it appears in multiple positions or is unique
    return positions.length > 1 || this.isUniqueTileInPattern(tileId, variation.tiles)
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

  /**
   * Check if a player tile matches any tile in the pattern variation
   * Handles tile ID normalization and variations
   */
  private static doesTileMatchPattern(playerTile: string, patternTiles: string[]): boolean {
    // Direct match first
    if (patternTiles.includes(playerTile)) {
      return true
    }
    
    // Normalize and try alternate formats
    const normalizedPlayer = this.normalizeTileId(playerTile)
    
    for (const patternTile of patternTiles) {
      const normalizedPattern = this.normalizeTileId(patternTile)
      if (normalizedPlayer === normalizedPattern) {
        return true
      }
    }
    
    return false
  }

  /**
   * Normalize tile ID to handle different naming conventions
   */
  private static normalizeTileId(tileId: string): string {
    const id = tileId.toLowerCase().trim()
    
    // Handle dragon variations
    if (id.includes('green') || id === 'gd') return 'green'
    if (id.includes('red') || id === 'rd') return 'red'  
    if (id.includes('white') || id === 'wd') return 'white'
    
    // Handle wind variations
    if (id.includes('east') || id === 'ew') return 'east'
    if (id.includes('south') || id === 'sw') return 'south'
    if (id.includes('west') || id === 'ww') return 'west'
    if (id.includes('north') || id === 'nw') return 'north'
    
    // Handle flower variations
    if (id.includes('flower') || id.startsWith('f')) return 'flower'
    
    // Handle joker variations
    if (id.includes('joker') || id === 'j') return 'joker'
    
    // Standard numbered tiles should be already normalized (e.g., '4C')
    return id
  }

  /**
   * Check if a tile appears only once in the pattern
   */
  private static isUniqueTileInPattern(tileId: string, patternTiles: string[]): boolean {
    const normalizedTile = this.normalizeTileId(tileId)
    const count = patternTiles.filter(tile => 
      this.normalizeTileId(tile) === normalizedTile
    ).length
    return count === 1
  }
}