// Enhanced Analysis Engine - Main Interface
// Coordinates the 3-engine intelligence system:
// Engine 1: Pattern Analysis (Facts), Engine 2: Pattern Ranking (Scoring), Engine 3: Tile Recommendations (Actions)

import type { PatternSelectionOption } from '../../../shared/nmjl-types'
import type { PlayerTile } from '../types/tile-types'
import type { HandAnalysis, PatternRecommendation, TileRecommendation } from '../stores/intelligence-store'
import { nmjlService } from './nmjl-service'
import { PatternAnalysisEngine, type GameContext } from './pattern-analysis-engine'
import { PatternRankingEngine } from './pattern-ranking-engine'
import { TileRecommendationEngine } from './tile-recommendation-engine'

// Legacy interfaces removed - now using the new 3-engine system

export class AnalysisEngine {
  /**
   * Main analysis function - coordinates 3-engine intelligence system
   */
  static async analyzeHand(
    playerTiles: PlayerTile[],
    selectedPatterns: PatternSelectionOption[] = [],
    gameContext?: Partial<GameContext>
  ): Promise<HandAnalysis> {
    const startTime = performance.now()
    
    console.log('=== 3-Engine Intelligence System ===')
    console.log('Input player tiles:', playerTiles.length)
    console.log('Selected patterns:', selectedPatterns.length)
    
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
      
      console.log('🔍 Engine 1: Analyzing pattern facts...')
      const engine1Start = performance.now()
      
      // Engine 1: Get mathematical facts for all patterns
      const patternIds = patternsToAnalyze.map(p => p.id)
      const analysisFacts = await PatternAnalysisEngine.analyzePatterns(
        tileIds,
        patternIds,
        fullGameContext
      )
      
      console.log('=== ENGINE 1 ANALYSIS FACTS ===')
      console.log('Analysis facts count:', analysisFacts.length)
      analysisFacts.forEach(fact => {
        console.log(`Pattern ${fact.patternId}: ${fact.tileMatching.bestVariation.tilesMatched}/14 tiles`)
      })
      
      const engine1Time = performance.now() - engine1Start
      console.log(`✓ Engine 1 completed in ${engine1Time.toFixed(1)}ms`)
      
      console.log('🎯 Engine 2: Ranking patterns...')
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
      console.log(`✓ Engine 2 completed in ${engine2Time.toFixed(1)}ms`)
      
      console.log('💡 Engine 3: Generating recommendations...')
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
      console.log(`✓ Engine 3 completed in ${engine3Time.toFixed(1)}ms`)
      
      // Convert results to HandAnalysis format (maintaining interface compatibility)
      const result = this.convertToHandAnalysis(
        patternRankings,
        tileRecommendations,
        patternsToAnalyze
      )
      
      const totalTime = performance.now() - startTime
      console.log(`🎉 Total analysis completed in ${totalTime.toFixed(1)}ms`)
      
      return result
      
    } catch (error) {
      console.error('Analysis engine error:', error)
      
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
    patterns: PatternSelectionOption[]
  ): HandAnalysis {
    
    // Convert pattern rankings to PatternRecommendation format
    const recommendedPatterns: PatternRecommendation[] = patternRankings.topRecommendations.map((ranking: any, index: number) => {
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
      
      console.log(`DEBUG bestPatterns - ${ranking.patternId}: ${actualCompletion}% (${tilesMatched}/14 tiles)`)
      
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
      analysisVersion: 'AV3-ThreeEngine'
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
