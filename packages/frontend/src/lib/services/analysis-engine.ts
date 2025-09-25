// Enhanced Analysis Engine - Main Interface
// Coordinates the 3-engine intelligence system:
// Engine 1: Pattern Analysis (Facts), Engine 2: Pattern Ranking (Scoring), Engine 3: Tile Recommendations (Actions)

import type { PatternSelectionOption } from 'shared-types'
import type { PlayerTile } from 'shared-types'
import type { HandAnalysis, PatternRecommendation, TileRecommendation } from '../../stores/intelligence-store'
import { nmjlService } from './nmjl-service'
import { PatternAnalysisEngine, type GameContext, type PatternAnalysisFacts } from '../../features/intelligence-panel/services/pattern-analysis-engine'
import { PatternRankingEngine, type RankedPatternResults } from '../../features/intelligence-panel/services/pattern-ranking-engine'
import { TileRecommendationEngine } from '../../features/intelligence-panel/services/tile-recommendation-engine'

// Legacy interfaces removed - now using the new 3-engine system

interface CacheEntry {
  facts: PatternAnalysisFacts[]
  timestamp: number
  handHash: string
  patternIds: string[]
}

export class AnalysisEngine {
  // Engine 1 cache: Map<cacheKey, CacheEntry>
  private static engine1Cache = new Map<string, CacheEntry>()
  private static readonly CACHE_SIZE_LIMIT = 50 // Prevent memory issues
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes TTL

  /**
   * Generate cache key for Engine 1 results
   */
  private static generateCacheKey(
    tileIds: string[],
    patternIds: string[],
    gameContext: GameContext
  ): string {
    // Sort tiles and patterns for consistent key
    const sortedTiles = [...tileIds].sort().join(',')
    const sortedPatterns = [...patternIds].sort().join(',')
    
    // Include relevant game context that affects Engine 1 analysis
    const contextKey = `${gameContext.jokersInHand}_${gameContext.currentPhase}_${gameContext.wallTilesRemaining}`
    
    return `${sortedTiles}|${sortedPatterns}|${contextKey}`
  }

  /**
   * Get Engine 1 results from cache or compute fresh
   */
  private static async getEngine1Facts(
    tileIds: string[],
    patternIds: string[],
    gameContext: GameContext
  ): Promise<PatternAnalysisFacts[]> {
    const cacheKey = this.generateCacheKey(tileIds, patternIds, gameContext)
    const handHash = [...tileIds].sort().join(',')
    
    // Check cache first
    const cached = this.engine1Cache.get(cacheKey)
    const now = Date.now()
    
    if (cached && (now - cached.timestamp) < this.CACHE_TTL_MS) {
      // Cache hit - using cached analysis
      return cached.facts
    }
    
    // Cache miss - computing fresh analysis
    
    // Compute fresh Engine 1 results
    const facts = await PatternAnalysisEngine.analyzePatterns(
      tileIds,
      patternIds,
      gameContext
    )
    
    // Store in cache
    this.engine1Cache.set(cacheKey, {
      facts,
      timestamp: now,
      handHash,
      patternIds: [...patternIds]
    })
    
    // Manage cache size
    this.manageCacheSize()
    
    return facts
  }

  /**
   * Clear cache when hand changes (tiles added/removed)
   */
  static clearCacheForHandChange(oldTileIds: string[], newTileIds: string[]): void {
    const oldHash = [...oldTileIds].sort().join(',')
    const newHash = [...newTileIds].sort().join(',')
    
    if (oldHash !== newHash) {
      // Hand actually changed - clear relevant cache entries
      const entriesToRemove: string[] = []
      
      for (const [key, entry] of this.engine1Cache.entries()) {
        if (entry.handHash === oldHash) {
          entriesToRemove.push(key)
        }
      }
      
      entriesToRemove.forEach(key => {
        this.engine1Cache.delete(key)
      })
      
      if (entriesToRemove.length > 0) {
        // Cleared cache entries for hand change
      }
    }
  }

  /**
   * Manage cache size to prevent memory issues
   */
  private static manageCacheSize(): void {
    if (this.engine1Cache.size > this.CACHE_SIZE_LIMIT) {
      // Remove oldest entries
      const entries = Array.from(this.engine1Cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
      
      const toRemove = entries.slice(0, entries.length - this.CACHE_SIZE_LIMIT)
      toRemove.forEach(([key]) => {
        this.engine1Cache.delete(key)
      })
      
      // Cache cleanup completed
    }
  }

  /**
   * Get cache statistics for debugging
   */
  static getCacheStats(): { size: number; hitRate?: number } {
    return {
      size: this.engine1Cache.size
    }
  }

  /**
   * Main analysis function - coordinates 3-engine intelligence system
   */
  static async analyzeHand(
    playerTiles: PlayerTile[],
    selectedPatterns: PatternSelectionOption[] = [],
    gameContext?: Partial<GameContext>,
    isPatternSwitching: boolean = false
  ): Promise<HandAnalysis> {
    // const startTime = performance.now()
    
    // Starting 3-Engine Intelligence System analysis
    
    try {
      // Convert PlayerTile[] to string[] for engine compatibility
      const tileIds = playerTiles.map(tile => tile.id)
      
      // Get all available patterns if none selected
      const patternsToAnalyze = selectedPatterns.length > 0 
        ? selectedPatterns 
        : await nmjlService.getSelectionOptions()
      
      // Create game context with defaults
      const fullGameContext: GameContext = {
        jokersInHand: tileIds.filter(id => id.includes('joker')).length,
        wallTilesRemaining: gameContext?.wallTilesRemaining || 80,
        discardPile: gameContext?.discardPile || [],
        exposedTiles: gameContext?.exposedTiles || {},
        currentPhase: gameContext?.currentPhase || 'charleston',
        ...gameContext
      }
      
      // console.error('🔍 ENGINE 1 STARTING - ANALYZING PATTERN FACTS')
      // const engine1Start = performance.now()
      
      // Engine 1: Get mathematical facts for all patterns (with caching)
      const patternIds = patternsToAnalyze.map(p => p.id)
      const analysisFacts = await this.getEngine1Facts(
        tileIds,
        patternIds,
        fullGameContext
      )
      
      // console.error('🔍 ENGINE 1 ANALYSIS FACTS:', analysisFacts.length, 'patterns')
      // analysisFacts.forEach(fact => {
      //   console.error(`📊 ${fact.patternId}: ${fact.tileMatching.bestVariation.tilesMatched}/14 tiles`)
      // })
      
      // const engine1Time = performance.now() - engine1Start
      // Engine 1 completed
      
      // Log cache stats for performance monitoring
      // const cacheStats = this.getCacheStats()
      // Engine 1 cache status updated
      
      // Engine 2: Ranking patterns
      // const engine2Start = performance.now()
      
      // Engine 2: Apply strategic ranking and scoring
      const patternRankings = await PatternRankingEngine.rankPatterns(
        analysisFacts,
        patternsToAnalyze,
        {
          phase: fullGameContext.currentPhase,
          wallTilesRemaining: fullGameContext.wallTilesRemaining
        }
      )
      
      // const engine2Time = performance.now() - engine2Start
      // Engine 2 completed
      
      // console.error('💡 ENGINE 3 STARTING - GENERATING TILE RECOMMENDATIONS')
      // const engine3Start = performance.now()
      
      // Engine 3: Generate tile recommendations
      const tileRecommendations = await TileRecommendationEngine.generateRecommendations(
        tileIds,
        patternRankings,
        {
          phase: fullGameContext.currentPhase,
          discardPile: fullGameContext.discardPile,
          exposedTiles: fullGameContext.exposedTiles,
          wallTilesRemaining: fullGameContext.wallTilesRemaining
        },
        analysisFacts // Pass Engine 1 facts so Engine 3 can see actual tile matching
      )


      // const engine3Time = performance.now() - engine3Start
      // Engine 3 completed
      
      // Convert results to HandAnalysis format (maintaining interface compatibility)
      const result = this.convertToHandAnalysis(
        patternRankings,
        tileRecommendations,
        patternsToAnalyze,
        analysisFacts,
        isPatternSwitching
      )
      
      // const totalTime = performance.now() - startTime
      // Total analysis completed
      
      return result
      
    } catch (error) {
      console.error('🚨 ANALYSIS ENGINE ERROR:', error)
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace')
      
      // Re-throw error to stop the game and alert the player
      throw new Error(`Analysis engine failure: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

  }

  /**
   * Convert 3-engine results to HandAnalysis interface format
   */
  private static convertToHandAnalysis(
    patternRankings: RankedPatternResults,
    tileRecommendations: {
      tileActions: Array<{ 
        tileId: string
        primaryAction: string
        confidence: number
        reasoning: string
        priority: number
      }>
      strategicAdvice: string[]
    },
    patterns: PatternSelectionOption[],
    analysisFacts: PatternAnalysisFacts[],
    preservePatternOrder: boolean = false
  ): HandAnalysis {

    let sortedRecommendations: typeof patternRankings.topRecommendations

    if (preservePatternOrder && patterns.length > 0) {
      // When patterns are explicitly provided in order (e.g., pattern switching), preserve that order
      console.log('Preserving explicit pattern order for pattern switching')
      sortedRecommendations = patternRankings.topRecommendations.sort((a, b) => {
        const aIndex = patterns.findIndex(p => p.id === a.patternId)
        const bIndex = patterns.findIndex(p => p.id === b.patternId)

        // If both patterns are in the provided list, sort by their order in the list
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex
        }
        // If only one is in the list, prioritize it
        if (aIndex !== -1) return -1
        if (bIndex !== -1) return 1
        // If neither is in the list, sort by totalScore
        return b.totalScore - a.totalScore
      })
    } else {
      // Default behavior: sort by AI scores (totalScore) - highest first
      sortedRecommendations = patternRankings.topRecommendations.sort((a, b) => {
        return b.totalScore - a.totalScore // Highest AI totalScore first
      })
    }

    // Patterns sorted and ready for conversion
    
    // Convert pattern rankings to PatternRecommendation format
    const recommendedPatterns: PatternRecommendation[] = sortedRecommendations.map((ranking, index: number) => {
      const pattern = patterns.find(p => p.id === ranking.patternId)
      
      // Get actual completion percentage from pattern analysis facts (not AI score)
      const actualCompletion = Math.round((ranking.components.currentTileScore / 40) * 100) // currentTileScore is 0-40 based on actual tiles
      
      // Get expanded tile arrays from Engine 1 facts
      const engineFact = analysisFacts.find(f => f.patternId === ranking.patternId)
      const expandedTiles = engineFact?.tileMatching?.bestVariation?.patternTiles || []
      
      return {
        pattern: pattern || { id: ranking.patternId, displayName: ranking.patternId } as PatternSelectionOption,
        confidence: ranking.confidence,
        totalScore: ranking.totalScore, // The actual AI score calculation
        completionPercentage: actualCompletion, // Use actual tile completion, not AI score
        reasoning: this.generatePatternReasoning(ranking, index),
        difficulty: pattern?.difficulty || 'medium',
        isPrimary: index === 0,
        expandedTiles: expandedTiles, // Include 14-tile expanded array from Engine 1
        
        // Enhanced analysis (using data from Engine 1)
        scoreBreakdown: {
          currentTileScore: ranking.components.currentTileScore,
          availabilityScore: ranking.components.availabilityScore,
          jokerScore: ranking.components.jokerScore,
          priorityScore: ranking.components.priorityScore
        },
        
        // Detailed analysis for UI compatibility
        analysis: {
          currentTiles: {
            count: Math.floor((ranking.components.currentTileScore / 40) * 14), // Calculate actual tiles matched
            percentage: actualCompletion,
            matchingGroups: this.extractMatchingGroups(ranking.patternId, analysisFacts)
          },
          missingTiles: {
            total: 14 - Math.floor((ranking.components.currentTileScore / 40) * 14),
            byAvailability: {
              easy: [],
              moderate: [],
              difficult: [],
              impossible: []
            }
          },
          jokerSituation: {
            available: 2, // Default assumption
            needed: Math.max(0, 14 - Math.floor((ranking.components.currentTileScore / 40) * 14) - 2),
            canComplete: ranking.components.jokerScore > 0,
            substitutionPlan: {}
          },
          strategicValue: {
            tilePriorities: this.extractTilePriorities(ranking.patternId, analysisFacts),
            groupPriorities: this.extractGroupPriorities(ranking.patternId, analysisFacts),
            overallPriority: ranking.components.priorityScore / 10, // Convert to 0-1 scale
            reasoning: [`Confidence: ${Math.round(ranking.confidence * 100)}%`, ...ranking.riskFactors]
          },
          gameState: {
            wallTilesRemaining: 152, // Default assumption
            turnsEstimated: Math.ceil((14 - Math.floor((ranking.components.currentTileScore / 40) * 14)) / 2),
            drawProbability: 0.5 // Default probability
          }
        },
        
        recommendations: {
          shouldPursue: ranking.recommendation === 'excellent' || ranking.recommendation === 'good',
          alternativePatterns: [],
          strategicNotes: [ranking.recommendation],
          riskFactors: ranking.riskFactors
        }
      }
    })

    // Convert tile actions to TileRecommendation format

    const tileRecommendationsList: TileRecommendation[] = tileRecommendations?.tileActions?.map((action) => ({
      tileId: action.tileId,
      action: this.normalizeAction(action.primaryAction),
      confidence: action.confidence,
      reasoning: action.reasoning,
      priority: action.priority
    })) || []


    // Generate best patterns for detailed analysis
    const bestPatterns = patternRankings.viablePatterns.slice(0, 10).map((ranking) => {
      const pattern = patterns.find(p => p.id === ranking.patternId)
      
      // Calculate actual completion and tiles needed from currentTileScore
      const actualCompletion = Math.round((ranking.components.currentTileScore / 40) * 100)
      const tilesMatched = Math.floor((ranking.components.currentTileScore / 40) * 14)
      const tilesNeeded = 14 - tilesMatched
      
      // Pattern ranking debug info available
      
      return {
        patternId: ranking.patternId,
        section: pattern?.section || 'unknown',
        line: pattern?.line || 1,
        pattern: pattern?.pattern || ranking.patternId,
        groups: pattern?.groups || [],
        completionPercentage: actualCompletion, // Use actual tile completion
        tilesNeeded: tilesNeeded, // Use actual tiles needed
        missingTiles: [],
        confidenceScore: ranking.confidence,
        difficulty: pattern?.difficulty || 'medium',
        estimatedTurns: Math.ceil(tilesNeeded > 7 ? 8 : 4),
        riskLevel: ranking.riskFactors.length > 1 ? 'high' : (ranking.riskFactors.length > 0 ? 'medium' : 'low') as 'low' | 'medium' | 'high',
        strategicValue: ranking.strategicValue
      }
    })

    return {
      overallScore: patternRankings.topRecommendations[0]?.totalScore || 0,
      recommendedPatterns,
      bestPatterns,
      tileRecommendations: tileRecommendationsList,
      strategicAdvice: tileRecommendations.strategicAdvice,
      threats: [],
      lastUpdated: Date.now(),
      analysisVersion: 'AV3-ThreeEngine',
      engine1Facts: analysisFacts // Include Engine 1 facts for UI access
    }
  }

  /**
   * Normalize action string to valid TileRecommendation action type
   */
  private static normalizeAction(action: string): 'keep' | 'pass' | 'discard' | 'neutral' {
    const normalized = action.toLowerCase()
    if (normalized === 'keep' || normalized === 'hold') return 'keep'
    if (normalized === 'pass' || normalized === 'charleston') return 'pass'
    if (normalized === 'discard' || normalized === 'drop') return 'discard'
    return 'neutral'
  }


  /**
   * Generate pattern reasoning text
   */
  private static generatePatternReasoning(
    ranking: {
      totalScore: number
    }, 
    index: number
  ): string {
    if (index === 0) return "Highest scoring pattern with current hand"
    if (ranking.totalScore > 70) return "Strong alternative with good fundamentals"
    if (ranking.totalScore > 50) return "Viable backup option worth considering"
    return "Lower probability but still achievable"
  }

  
  /**
   * Extract matching groups from Engine 1 facts for a specific pattern
   */
  private static extractMatchingGroups(patternId: string, analysisFacts: PatternAnalysisFacts[]): string[] {
    const fact = analysisFacts.find(f => f.patternId === patternId)
    if (!fact) return []
    
    // Extract unique tile groups that are contributing to the pattern
    const groups = new Set<string>()
    
    // Add groups based on tile contributions from best variation
    const bestVariation = fact.tileMatching.bestVariation
    if (bestVariation?.tileContributions) {
      bestVariation.tileContributions.forEach(contribution => {
        if (contribution.isRequired || contribution.isCritical) {
          // Group tiles by their base type (e.g., "1B", "2B", "F1")
          const baseType = contribution.tileId.replace(/[0-9]+$/, '') // Remove instance numbers
          groups.add(baseType)
        }
      })
    }
    
    return Array.from(groups)
  }

  /**
   * Extract tile priorities from Engine 1 facts for a specific pattern
   */
  private static extractTilePriorities(patternId: string, analysisFacts: PatternAnalysisFacts[]): { [tileId: string]: number } {
    const fact = analysisFacts.find(f => f.patternId === patternId)
    if (!fact) return {}
    
    const priorities: { [tileId: string]: number } = {}
    const bestVariation = fact.tileMatching.bestVariation
    
    if (bestVariation?.tileContributions) {
      bestVariation.tileContributions.forEach(contribution => {
        let priority = 5 // Default medium priority
        
        // Higher priority for critical and required tiles
        if (contribution.isCritical) priority = 9
        else if (contribution.isRequired) priority = 7
        else if (!contribution.canBeReplaced) priority = 6
        
        // Lower priority for easily replaceable tiles
        if (contribution.canBeReplaced && !contribution.isRequired) priority = 3
        
        priorities[contribution.tileId] = priority
      })
    }
    
    return priorities
  }

  /**
   * Extract group priorities from Engine 1 facts for a specific pattern
   */
  private static extractGroupPriorities(patternId: string, analysisFacts: PatternAnalysisFacts[]): { [groupId: string]: number } {
    const fact = analysisFacts.find(f => f.patternId === patternId)
    if (!fact) return {}
    
    const groupPriorities: { [groupId: string]: number } = {}
    const bestVariation = fact.tileMatching.bestVariation
    
    if (bestVariation?.tileContributions) {
      // Group contributions by tile base type
      const groupContributions = new Map<string, { critical: number, required: number, total: number }>()
      
      bestVariation.tileContributions.forEach(contribution => {
        const baseType = contribution.tileId.replace(/[0-9]+$/, '') // Remove instance numbers
        const existing = groupContributions.get(baseType) || { critical: 0, required: 0, total: 0 }
        
        existing.total++
        if (contribution.isCritical) existing.critical++
        if (contribution.isRequired) existing.required++
        
        groupContributions.set(baseType, existing)
      })
      
      // Convert to priorities (0-10 scale)
      groupContributions.forEach((stats, groupId) => {
        let priority = 5 // Default
        
        // Higher priority for groups with more critical/required tiles
        if (stats.critical > 0) priority = Math.min(10, 7 + stats.critical)
        else if (stats.required > 0) priority = Math.min(9, 5 + stats.required)
        
        // Boost priority for groups that contribute more tiles
        if (stats.total > 1) priority = Math.min(10, priority + 1)
        
        groupPriorities[groupId] = priority
      })
    }
    
    return groupPriorities
  }

  // No legacy helper methods needed - 3-engine system is self-contained
}
