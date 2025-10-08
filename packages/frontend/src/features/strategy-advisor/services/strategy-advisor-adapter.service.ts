// Strategy Advisor Adapter Service - Clean integration layer with intelligence store
// Adapts intelligence store data to Strategy Advisor format without modifying intelligence store

import type {
  IntelligenceData,
  GameContext,
  StrategyGenerationRequest,
  StrategyGenerationResponse,
  StrategyMessage,
  UrgencyLevel
} from '../types/strategy-advisor.types'
import type { HandAnalysis, PatternRecommendation, TileRecommendation } from '../../../stores/useIntelligenceStore'
import { MessageGeneratorService } from './message-generator.service'

export class StrategyAdvisorAdapter {
  private messageGenerator: MessageGeneratorService

  constructor() {
    this.messageGenerator = new MessageGeneratorService()
  }

  /**
   * Convert intelligence store data to Strategy Advisor format
   */
  adaptIntelligenceData(
    intelligenceAnalysis: HandAnalysis | null,
    isAnalyzing: boolean
  ): IntelligenceData {
    // Handle no analysis case
    if (!intelligenceAnalysis) {
      return {
        hasAnalysis: false,
        isAnalyzing,
        recommendedPatterns: [],
        tileRecommendations: [],
        strategicAdvice: [],
        threats: [],
        overallScore: 0,
        lastUpdated: 0
      }
    }

    try {
      return {
        hasAnalysis: true,
        isAnalyzing,
        recommendedPatterns: this.adaptPatternRecommendations(intelligenceAnalysis.recommendedPatterns || []),
        tileRecommendations: this.adaptTileRecommendations(intelligenceAnalysis.tileRecommendations || []),
        strategicAdvice: intelligenceAnalysis.strategicAdvice || [],
        threats: intelligenceAnalysis.threats || [],
        overallScore: intelligenceAnalysis.overallScore || 0,
        lastUpdated: intelligenceAnalysis.lastUpdated || 0
      }
    } catch (error) {
      console.error('Failed to adapt intelligence data:', error)

      // Return safe fallback
      return {
        hasAnalysis: false,
        isAnalyzing: false,
        recommendedPatterns: [],
        tileRecommendations: [],
        strategicAdvice: [],
        threats: [],
        overallScore: 0,
        lastUpdated: Date.now()
      }
    }
  }

  /**
   * Create game context from various game state sources
   */
  createGameContext(params: {
    gamePhase?: 'charleston' | 'playing' | 'endgame'
    currentTurn?: number
    wallTilesRemaining?: number
    playerPosition?: 'east' | 'south' | 'west' | 'north'
    handSize?: number
    hasDrawnTile?: boolean
    exposedTilesCount?: number
  }): GameContext {
    const {
      gamePhase = 'playing',
      wallTilesRemaining = 144,
      playerPosition = 'east',
      handSize = 13,
      hasDrawnTile = false,
      exposedTilesCount = 0
    } = params

    // Calculate turns remaining based on wall tiles and player count
    const estimatedTurnsRemaining = Math.max(0, Math.floor(wallTilesRemaining / 4))

    // Determine if we're in endgame phase
    const isEndgame = wallTilesRemaining < 20 || estimatedTurnsRemaining < 5
    const finalGamePhase = isEndgame ? 'endgame' : gamePhase

    return {
      gamePhase: finalGamePhase,
      turnsRemaining: estimatedTurnsRemaining,
      wallTilesRemaining,
      playerPosition,
      handSize,
      hasDrawnTile,
      exposedTilesCount
    }
  }

  /**
   * Generate strategy messages using the message generator
   */
  generateStrategyMessages(
    intelligenceData: IntelligenceData,
    gameContext: GameContext,
    previousMessages: StrategyMessage[] = [],
    urgencyThreshold: UrgencyLevel = 'low'
  ): StrategyGenerationResponse {
    const request: StrategyGenerationRequest = {
      intelligenceData,
      gameContext,
      previousMessages,
      urgencyThreshold
    }

    return this.messageGenerator.generateMessages(request)
  }

  /**
   * Check if strategy refresh is needed based on data changes
   */
  shouldRefreshStrategy(
    previousData: IntelligenceData | null,
    currentData: IntelligenceData,
    lastRefreshTime: number
  ): boolean {
    // Always refresh if no previous data
    if (!previousData) return true

    // Refresh if analysis state changed
    if (previousData.hasAnalysis !== currentData.hasAnalysis) return true
    if (previousData.isAnalyzing !== currentData.isAnalyzing) return true

    // Refresh if significant data changes occurred
    if (previousData.lastUpdated !== currentData.lastUpdated) {
      // Check if patterns changed significantly
      const patternChanges = this.detectSignificantPatternChanges(
        previousData.recommendedPatterns,
        currentData.recommendedPatterns
      )

      if (patternChanges.hasSignificantChanges) return true

      // Check if tile recommendations changed significantly
      const tileChanges = this.detectSignificantTileChanges(
        previousData.tileRecommendations,
        currentData.tileRecommendations
      )

      if (tileChanges.hasSignificantChanges) return true
    }

    // Refresh if too much time has passed (5 minutes)
    const timeSinceLastRefresh = Date.now() - lastRefreshTime
    if (timeSinceLastRefresh > 5 * 60 * 1000) return true

    return false
  }

  /**
   * Adapt pattern recommendations from intelligence store format
   */
  private adaptPatternRecommendations(
    recommendations: PatternRecommendation[]
  ): IntelligenceData['recommendedPatterns'] {
    return recommendations.map((rec, index) => ({
      pattern: {
        id: rec.pattern.id,
        section: String(rec.pattern.section || 'Unknown'),
        line: rec.pattern.line || 0,
        pattern: rec.pattern.pattern || '',
        displayName: rec.pattern.displayName || `Pattern ${index + 1}`
      },
      confidence: rec.confidence || 0,
      completionPercentage: rec.completionPercentage || 0,
      difficulty: rec.difficulty || 'medium',
      reasoning: rec.reasoning || 'No reasoning provided',
      isPrimary: rec.isPrimary || index === 0
    }))
  }

  /**
   * Adapt tile recommendations from intelligence store format
   */
  private adaptTileRecommendations(
    recommendations: TileRecommendation[]
  ): IntelligenceData['tileRecommendations'] {
    return recommendations.map(rec => ({
      tileId: rec.tileId,
      action: rec.action,
      confidence: rec.confidence || 0,
      reasoning: rec.reasoning || 'No reasoning provided',
      priority: rec.priority || 0
    }))
  }

  /**
   * Detect significant changes in pattern recommendations
   */
  private detectSignificantPatternChanges(
    previous: IntelligenceData['recommendedPatterns'],
    current: IntelligenceData['recommendedPatterns']
  ): { hasSignificantChanges: boolean; details: string } {
    // Check if primary pattern changed
    const prevPrimary = previous.find((p: IntelligenceData['recommendedPatterns'][0]) => p.isPrimary)
    const currentPrimary = current.find((p: IntelligenceData['recommendedPatterns'][0]) => p.isPrimary)

    if (!prevPrimary && currentPrimary) {
      return { hasSignificantChanges: true, details: 'Primary pattern established' }
    }

    if (prevPrimary && !currentPrimary) {
      return { hasSignificantChanges: true, details: 'Primary pattern lost' }
    }

    if (prevPrimary && currentPrimary && prevPrimary.pattern.id !== currentPrimary.pattern.id) {
      return { hasSignificantChanges: true, details: 'Primary pattern changed' }
    }

    // Check for significant completion percentage changes (>10%)
    if (prevPrimary && currentPrimary) {
      const completionDiff = Math.abs(
        currentPrimary.completionPercentage - prevPrimary.completionPercentage
      )
      if (completionDiff > 10) {
        return { hasSignificantChanges: true, details: `Completion changed by ${completionDiff}%` }
      }
    }

    return { hasSignificantChanges: false, details: 'No significant changes' }
  }

  /**
   * Detect significant changes in tile recommendations
   */
  private detectSignificantTileChanges(
    previous: IntelligenceData['tileRecommendations'],
    current: IntelligenceData['tileRecommendations']
  ): { hasSignificantChanges: boolean; details: string } {
    // Check for high-priority recommendation changes
    const prevHighPriority = previous.filter((rec: IntelligenceData['tileRecommendations'][0]) => rec.priority >= 8)
    const currentHighPriority = current.filter((rec: IntelligenceData['tileRecommendations'][0]) => rec.priority >= 8)

    if (prevHighPriority.length !== currentHighPriority.length) {
      return { hasSignificantChanges: true, details: 'High priority recommendations changed' }
    }

    // Check if the actual high-priority tiles changed
    const prevTileIds = new Set(prevHighPriority.map((rec: IntelligenceData['tileRecommendations'][0]) => rec.tileId))
    const currentTileIds = new Set(currentHighPriority.map((rec: IntelligenceData['tileRecommendations'][0]) => rec.tileId))

    const tilesAdded = currentTileIds.size - prevTileIds.size
    const tilesRemoved = prevTileIds.size - currentTileIds.size

    if (tilesAdded > 0 || tilesRemoved > 0) {
      return { hasSignificantChanges: true, details: 'High priority tiles changed' }
    }

    return { hasSignificantChanges: false, details: 'No significant changes' }
  }
}
