// Enhanced Analysis Engine - Main Interface
// Coordinates the 3-engine intelligence system:
// Engine 1: Pattern Analysis (Facts), Engine 2: Pattern Ranking (Scoring), Engine 3: Tile Recommendations (Actions)

import type { PatternSelectionOption } from '../../../shared/nmjl-types'
import type { PlayerTile } from '../types/tile-types'
import type { HandAnalysis, PatternRecommendation, TileRecommendation } from '../stores/intelligence-store'
import { nmjlService } from './nmjl-service'
import { PatternAnalysisEngine, type GameContext, type PatternAnalysisFacts } from './pattern-analysis-engine'
import { PatternRankingEngine } from './pattern-ranking-engine'
import { TileRecommendationEngine } from './tile-recommendation-engine'

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
    gameContext?: Partial<GameContext>
  ): Promise<HandAnalysis> {
    const startTime = performance.now()
    
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
      const engine1Start = performance.now()
      
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
      
      const engine1Time = performance.now() - engine1Start
      // Engine 1 completed
      
      // Log cache stats for performance monitoring
      const cacheStats = this.getCacheStats()
      // Engine 1 cache status updated
      
      // Engine 2: Ranking patterns
      const engine2Start = performance.now()
      
      // Engine 2: Apply strategic ranking and scoring
      const patternRankings = await PatternRankingEngine.rankPatterns(
        analysisFacts,
        patternsToAnalyze,
        {
          phase: fullGameContext.currentPhase,
          wallTilesRemaining: fullGameContext.wallTilesRemaining
        }
      )
      
      const engine2Time = performance.now() - engine2Start
      // Engine 2 completed
      
      // console.error('💡 ENGINE 3 STARTING - GENERATING TILE RECOMMENDATIONS')
      const engine3Start = performance.now()
      
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
      
      const engine3Time = performance.now() - engine3Start
      // Engine 3 completed
      
      // Convert results to HandAnalysis format (maintaining interface compatibility)
      const result = this.convertToHandAnalysis(
        patternRankings,
        tileRecommendations,
        patternsToAnalyze,
        analysisFacts
      )
      
      const totalTime = performance.now() - startTime
      // Total analysis completed
      
      return result
      
    } catch (error) {
      console.error('🚨 ANALYSIS ENGINE ERROR:', error)
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace')
      
      // Fallback to basic analysis
      return this.generateFallbackAnalysis(playerTiles, selectedPatterns)
    }

  }

  /**
   * Convert 3-engine results to HandAnalysis interface format
   */
  private static convertToHandAnalysis(
    patternRankings: any,
    tileRecommendations: any,
    patterns: PatternSelectionOption[],
    analysisFacts: any[]
  ): HandAnalysis {
    
    // Sort recommendations by actual completion percentage instead of AI scores
    const sortedRecommendations = patternRankings.topRecommendations.sort((a: any, b: any) => {
      const aCompletion = (a.components.currentTileScore / 40) * 100
      const bCompletion = (b.components.currentTileScore / 40) * 100
      return bCompletion - aCompletion // Highest completion first
    })
    
    // Convert pattern rankings to PatternRecommendation format
    const recommendedPatterns: PatternRecommendation[] = sortedRecommendations.map((ranking: any, index: number) => {
      const pattern = patterns.find(p => p.id === ranking.patternId)
      
      // Get actual completion percentage from pattern analysis facts (not AI score)
      const actualCompletion = Math.round((ranking.components.currentTileScore / 40) * 100) // currentTileScore is 0-40 based on actual tiles
      
      return {
        pattern: pattern || { id: ranking.patternId, displayName: ranking.patternId } as PatternSelectionOption,
        confidence: ranking.confidence,
        completionPercentage: actualCompletion, // Use actual tile completion, not AI score
        reasoning: this.generatePatternReasoning(ranking, index),
        difficulty: pattern?.difficulty || 'medium',
        isPrimary: index === 0,
        
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
            matchingGroups: [] // TODO: populate from Engine 1 facts if needed
          },
          missingTiles: {
            total: 14 - Math.floor((ranking.components.currentTileScore / 40) * 14),
            byAvailability: {
              easy: [],
              moderate: [],
              difficult: []
            }
          },
          gameState: {
            turnsEstimated: Math.ceil((14 - Math.floor((ranking.components.currentTileScore / 40) * 14)) / 2),
            progressRate: actualCompletion / 100
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
    const tileRecommendationsList: TileRecommendation[] = tileRecommendations.tileActions.map((action: any) => ({
      tileId: action.tileId,
      action: action.primaryAction,
      confidence: action.confidence,
      reasoning: action.reasoning,
      priority: action.priority
    }))

    // Generate best patterns for detailed analysis
    const bestPatterns = patternRankings.viablePatterns.slice(0, 10).map((ranking: any) => {
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
        riskLevel: ranking.riskFactors.length > 1 ? 'high' : ranking.riskFactors.length > 0 ? 'medium' : 'low',
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
   * Generate fallback analysis if 3-engine system fails
   */
  private static generateFallbackAnalysis(
    playerTiles: PlayerTile[],
    selectedPatterns: PatternSelectionOption[]
  ): HandAnalysis {
    return {
      overallScore: 30,
      recommendedPatterns: [{
        pattern: selectedPatterns[0] || { id: 'fallback', displayName: 'Pattern Analysis' } as PatternSelectionOption,
        confidence: 50,
        completionPercentage: 30,
        reasoning: 'Analysis engine temporarily unavailable',
        difficulty: 'medium',
        isPrimary: true
      }],
      bestPatterns: [],
      tileRecommendations: playerTiles.map(tile => ({
        tileId: tile.id,
        action: 'neutral' as const,
        confidence: 50,
        reasoning: 'Fallback recommendation',
        priority: 5
      })),
      strategicAdvice: ['Pattern analysis temporarily unavailable'],
      threats: [],
      lastUpdated: Date.now(),
      analysisVersion: 'AV3-Fallback'
    }
  }

  /**
   * Generate pattern reasoning text
   */
  private static generatePatternReasoning(ranking: any, index: number): string {
    if (index === 0) return "Highest scoring pattern with current hand"
    if (ranking.totalScore > 70) return "Strong alternative with good fundamentals"
    if (ranking.totalScore > 50) return "Viable backup option worth considering"
    return "Lower probability but still achievable"
  }

  
  // No legacy helper methods needed - 3-engine system is self-contained
}
