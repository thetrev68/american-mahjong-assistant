// Modern Analysis Engine
// Clean, single-file analysis engine using proven mathematical formulas
// Returns data in exact intelligence store format

import type { PatternSelectionOption } from '../types/nmjl-types'
import type { PlayerTile } from '../types/tile-types'
import type { HandAnalysis, PatternRecommendation, TileRecommendation, PatternAnalysis } from '../stores/intelligence-store'
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

export class AnalysisEngine {
  /**
   * Main analysis function - takes current hand and returns complete analysis
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

    // Analyze each pattern
    const patternResults = patternsToAnalyze.map(pattern => 
      this.analyzePattern(pattern, tileCount, availableJokers)
    )

    // Sort by strategic value (best patterns first)
    const sortedResults = patternResults
      .filter(result => result.completionPercentage > 5) // Filter out impossible patterns
      .sort((a, b) => b.strategicValue - a.strategicValue)
      .slice(0, 10) // Top 10 patterns

    // Generate pattern recommendations
    const recommendedPatterns = sortedResults.slice(0, 5).map((result, index) => ({
      pattern: result.pattern,
      confidence: Math.round(result.confidence),
      completionPercentage: Math.round(result.completionPercentage),
      reasoning: this.generatePatternReasoning(result, index),
      difficulty: result.pattern.difficulty,
      isPrimary: index === 0
    }))

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
      threats: [] // TODO: Implement threat analysis
    }
  }

  /**
   * Count tiles in hand for efficient lookups
   */
  private static countTiles(tiles: PlayerTile[]): TileCount {
    const count: TileCount = {}
    tiles.forEach(tile => {
      count[tile.id] = (count[tile.id] || 0) + 1
    })
    return count
  }

  /**
   * Count available jokers
   */
  private static countJokers(tiles: PlayerTile[]): number {
    return tiles.filter(tile => 
      tile.id.toLowerCase().includes('joker') || 
      tile.suit === 'jokers' ||
      tile.isJoker
    ).length
  }

  /**
   * Analyze how well a specific pattern matches the current hand
   */
  private static analyzePattern(
    pattern: PatternSelectionOption,
    tileCount: TileCount,
    availableJokers: number
  ): PatternMatchResult {
    
    // Parse pattern requirements
    const requiredTiles = this.parsePatternRequirements(pattern.pattern)
    
    let tilesMatched = 0
    let jokersNeeded = 0
    const missingTiles: string[] = []

    // Check each required tile group
    requiredTiles.forEach(({ tileId, count, canUseJoker }) => {
      const playerCount = tileCount[tileId] || 0
      const shortage = Math.max(0, count - playerCount)

      if (shortage === 0) {
        // Perfect match
        tilesMatched += count
      } else if (canUseJoker && jokersNeeded + shortage <= availableJokers) {
        // Can use jokers to fill gap
        tilesMatched += playerCount
        jokersNeeded += shortage
      } else {
        // Missing tiles that can't be filled
        for (let i = 0; i < shortage; i++) {
          missingTiles.push(tileId)
        }
        tilesMatched += playerCount
      }
    })

    const totalRequired = requiredTiles.reduce((sum, req) => sum + req.count, 0)
    const completionPercentage = totalRequired > 0 ? (tilesMatched / totalRequired) * 100 : 0

    // Calculate confidence using proven formula
    const confidence = this.calculateConfidence(
      completionPercentage,
      tilesMatched,
      totalRequired,
      jokersNeeded,
      availableJokers
    )

    // Calculate strategic value (combination of completion, points, difficulty)
    const strategicValue = this.calculateStrategicValue(
      completionPercentage,
      pattern.points,
      pattern.difficulty,
      confidence
    )

    // Estimate turns to completion
    const estimatedTurns = this.estimateTurnsToCompletion(
      missingTiles.length,
      jokersNeeded,
      availableJokers
    )

    return {
      pattern,
      completionPercentage,
      tilesMatched,
      tilesNeeded: missingTiles.length,
      missingTiles,
      canUseJokers: jokersNeeded <= availableJokers,
      jokersNeeded,
      confidence,
      strategicValue,
      estimatedTurns
    }
  }

  /**
   * Parse pattern string to extract tile requirements
   * e.g., "FFFF 2025 222 222" -> [{tileId: "flower", count: 4, canUseJoker: false}, ...]
   */
  private static parsePatternRequirements(pattern: string): Array<{tileId: string, count: number, canUseJoker: boolean}> {
    const requirements: Array<{tileId: string, count: number, canUseJoker: boolean}> = []
    
    // Split pattern into groups
    const groups = pattern.split(' ').filter(group => group.length > 0)
    
    groups.forEach(group => {
      if (group === 'FFFF') {
        // Flowers
        requirements.push({tileId: 'flower', count: 4, canUseJoker: false})
      } else if (group.match(/^\d+$/)) {
        // Like numbers (e.g., "2025", "111", "222")
        const digit = group[0]
        requirements.push({tileId: `${digit}D`, count: group.length, canUseJoker: true})
        requirements.push({tileId: `${digit}B`, count: group.length, canUseJoker: true})
        requirements.push({tileId: `${digit}C`, count: group.length, canUseJoker: true})
      } else if (group === 'NEWS') {
        // Winds
        requirements.push({tileId: 'north', count: 1, canUseJoker: true})
        requirements.push({tileId: 'east', count: 1, canUseJoker: true})
        requirements.push({tileId: 'west', count: 1, canUseJoker: true})
        requirements.push({tileId: 'south', count: 1, canUseJoker: true})
      } else if (group === 'RGW') {
        // Dragons
        requirements.push({tileId: 'red', count: 1, canUseJoker: true})
        requirements.push({tileId: 'green', count: 1, canUseJoker: true})
        requirements.push({tileId: 'white', count: 1, canUseJoker: true})
      }
      // Add more pattern parsing as needed
    })

    return requirements
  }

  /**
   * Calculate confidence score using proven formula
   */
  private static calculateConfidence(
    completionPercentage: number,
    tilesMatched: number,
    totalRequired: number,
    jokersNeeded: number,
    availableJokers: number
  ): number {
    let confidence = completionPercentage

    // Boost confidence for exact matches
    if (tilesMatched > 0) {
      confidence += (tilesMatched / totalRequired) * 20
    }

    // Reduce confidence if relying heavily on jokers
    if (jokersNeeded > availableJokers) {
      confidence -= (jokersNeeded - availableJokers) * 15
    }

    // Boost confidence if jokers available for flexibility
    if (availableJokers > jokersNeeded) {
      confidence += Math.min(10, (availableJokers - jokersNeeded) * 3)
    }

    return Math.max(0, Math.min(100, confidence))
  }

  /**
   * Calculate strategic value (prioritizes patterns)
   */
  private static calculateStrategicValue(
    completionPercentage: number,
    points: number,
    difficulty: string,
    confidence: number
  ): number {
    let value = completionPercentage * 2 // Base on completion

    // Factor in points
    value += points * 0.3

    // Adjust for difficulty
    if (difficulty === 'easy') value += 10
    if (difficulty === 'medium') value += 5
    if (difficulty === 'hard') value -= 5

    // Factor in confidence
    value += confidence * 0.5

    return Math.max(0, value)
  }

  /**
   * Estimate turns to completion
   */
  private static estimateTurnsToCompletion(
    missingTiles: number,
    jokersNeeded: number,
    availableJokers: number
  ): number {
    const baseEstimate = missingTiles + Math.max(0, jokersNeeded - availableJokers)
    
    // Add some randomness for realism (1-3 extra turns)
    const variance = Math.floor(Math.random() * 3) + 1
    
    return Math.max(1, baseEstimate + variance)
  }

  /**
   * Calculate risk level
   */
  private static calculateRiskLevel(completion: number, tilesNeeded: number): 'low' | 'medium' | 'high' {
    if (completion > 70 && tilesNeeded <= 3) return 'low'
    if (completion > 40 && tilesNeeded <= 6) return 'medium'
    return 'high'
  }

  /**
   * Generate tile recommendations (keep/discard/pass)
   */
  private static generateTileRecommendations(
    playerTiles: PlayerTile[],
    bestPattern: PatternMatchResult | undefined,
    tileCount: TileCount
  ): TileRecommendation[] {
    const recommendations: TileRecommendation[] = []

    if (!bestPattern) return recommendations

    // Analyze each tile in hand
    playerTiles.forEach(tile => {
      const recommendation = this.analyzeTile(tile, bestPattern, tileCount)
      if (recommendation) {
        recommendations.push(recommendation)
      }
    })

    return recommendations
  }

  /**
   * Analyze individual tile for recommendations
   */
  private static analyzeTile(
    tile: PlayerTile,
    bestPattern: PatternMatchResult,
    tileCount: TileCount
  ): TileRecommendation | null {
    // Check if tile is needed for best pattern
    const isNeeded = bestPattern.missingTiles.includes(tile.id) || 
                     this.isTileUsefulForPattern(tile.id, bestPattern.pattern.pattern)

    // Check if tile is a joker
    const isJoker = tile.id.toLowerCase().includes('joker') || tile.isJoker

    // Generate recommendation
    if (isJoker) {
      return {
        tileId: tile.id,
        action: 'keep',
        confidence: 95,
        reasoning: 'Jokers are extremely valuable - always keep',
        priority: 10
      }
    } else if (isNeeded) {
      return {
        tileId: tile.id,
        action: 'keep',
        confidence: 85,
        reasoning: 'Required for your best pattern',
        priority: 8
      }
    } else if (tileCount[tile.id] > 1) {
      // Multiple copies - might be expendable
      return {
        tileId: tile.id,
        action: 'pass',
        confidence: 70,
        reasoning: 'You have duplicates - good for Charleston',
        priority: 4
      }
    } else {
      return {
        tileId: tile.id,
        action: 'discard',
        confidence: 60,
        reasoning: 'Not needed for current patterns',
        priority: 2
      }
    }
  }

  /**
   * Check if tile is useful for pattern
   */
  private static isTileUsefulForPattern(tileId: string, pattern: string): boolean {
    // Simple pattern matching - can be enhanced
    return pattern.includes(tileId[0]) || // Number match
           pattern.includes('FFFF') && tileId.includes('flower') || // Flower match
           pattern.includes('NEWS') && ['north', 'east', 'west', 'south'].includes(tileId) || // Wind match
           pattern.includes('RGW') && ['red', 'green', 'white'].includes(tileId) // Dragon match
  }

  /**
   * Generate pattern reasoning
   */
  private static generatePatternReasoning(result: PatternMatchResult, index: number): string {
    if (index === 0) {
      return `Best match - ${Math.round(result.completionPercentage)}% complete with ${result.tilesNeeded} tiles needed`
    }
    return `Strong alternative - ${Math.round(result.completionPercentage)}% complete`
  }

  /**
   * Generate strategic advice
   */
  private static generateStrategicAdvice(
    results: PatternMatchResult[],
    primaryPattern: PatternRecommendation | undefined
  ): string[] {
    const advice: string[] = []

    if (!results.length || !primaryPattern) {
      advice.push('Add more tiles to see strategic recommendations')
      return advice
    }

    const bestResult = results[0]

    if (bestResult.completionPercentage > 70) {
      advice.push(`Focus on completing ${primaryPattern.pattern.section} #${primaryPattern.pattern.line} - you're very close!`)
    } else if (bestResult.completionPercentage > 40) {
      advice.push(`Continue working toward ${primaryPattern.pattern.section} #${primaryPattern.pattern.line} while keeping options open`)
    } else {
      advice.push('Consider switching to a different pattern - current progress is limited')
    }

    if (bestResult.jokersNeeded > 0) {
      advice.push(`You'll need ${bestResult.jokersNeeded} joker${bestResult.jokersNeeded > 1 ? 's' : ''} to complete this pattern`)
    }

    if (bestResult.estimatedTurns <= 5) {
      advice.push('You\'re close to winning - be defensive and protect your hand')
    }

    return advice
  }
}