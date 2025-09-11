// Game History Management Hook
// High-level hook for managing game history, analytics, and learning insights

import { useCallback, useMemo, useEffect } from 'react'
import { useHistoryStore, type CompletedGame, type GameOutcome, type GameDifficulty } from '../stores/history-store'
import { AnalysisEngine } from '../lib/services/analysis-engine'
import { PatternAnalysisEngine } from '../features/intelligence-panel/services/pattern-analysis-engine'
import type { Tile } from 'shared-types'
import type { NMJL2025Pattern } from 'shared-types'

export interface GameHistoryFilters {
  outcome?: GameOutcome
  difficulty?: GameDifficulty
  dateRange?: { start: Date; end: Date }
  minScore?: number
  coPilotMode?: 'everyone' | 'solo'
  search?: string
}

export interface GameSummary {
  totalGames: number
  recentGames: CompletedGame[]
  winRate: number
  averageScore: number
  bestGame: CompletedGame | null
  improvementTrend: 'improving' | 'stable' | 'declining'
}

export function useGameHistory() {
  const {
    completedGames,
    performanceStats,
    learningRecommendations,
    selectedGameId,
    viewMode,
    sortBy,
    sortOrder,
    filterBy,
    isLoading,
    error,
    // Actions
    completeGame,
    deleteGame,
    selectGame,
    setViewMode,
    setSorting,
    setFilter,
    clearFilters,
    shareGame,
    voteOnGame,
    addComment,
    exportHistory,
    importHistory,
    clearHistory,
    calculatePerformanceStats,
    generateLearningRecommendations,
    setError,
    clearError
  } = useHistoryStore()

  // Filtered and sorted games
  const filteredGames = useMemo(() => {
    let filtered = [...completedGames]

    // Apply filters
    if (filterBy.outcome) {
      filtered = filtered.filter(game => game.outcome === filterBy.outcome)
    }
    if (filterBy.difficulty) {
      filtered = filtered.filter(game => game.difficulty === filterBy.difficulty)
    }
    if (filterBy.dateRange) {
      const { start, end } = filterBy.dateRange
      filtered = filtered.filter(game => 
        game.timestamp >= start && game.timestamp <= end
      )
    }
    if (filterBy.minScore !== undefined) {
      filtered = filtered.filter(game => game.finalScore >= filterBy.minScore!)
    }
    if (filterBy.coPilotMode) {
      filtered = filtered.filter(game => game.coPilotMode === filterBy.coPilotMode)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'date':
          comparison = a.timestamp.getTime() - b.timestamp.getTime()
          break
        case 'score':
          comparison = a.finalScore - b.finalScore
          break
        case 'duration':
          comparison = a.duration - b.duration
          break
        case 'difficulty': {
          const difficultyOrder = { beginner: 1, intermediate: 2, expert: 3 }
          comparison = difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]
          break
        }
        default:
          comparison = 0
      }

      return sortOrder === 'desc' ? -comparison : comparison
    })

    return filtered
  }, [completedGames, filterBy, sortBy, sortOrder])

  // Game summary statistics
  const gameSummary = useMemo((): GameSummary => {
    const totalGames = completedGames.length
    const recentGames = completedGames.slice(0, 5)
    const winRate = performanceStats.winRate
    const averageScore = performanceStats.averageScore
    
    // Find best game by score
    const bestGame = completedGames.reduce((best, game) => 
      !best || game.finalScore > best.finalScore ? game : best
    , null as CompletedGame | null)

    // Determine improvement trend (last 5 games vs previous 5)
    let improvementTrend: 'improving' | 'stable' | 'declining' = 'stable'
    if (totalGames >= 10) {
      const recent5 = completedGames.slice(0, 5)
      const previous5 = completedGames.slice(5, 10)
      
      const recentWinRate = recent5.filter(g => g.outcome === 'won').length / 5
      const previousWinRate = previous5.filter(g => g.outcome === 'won').length / 5
      
      if (recentWinRate > previousWinRate + 0.1) {
        improvementTrend = 'improving'
      } else if (recentWinRate < previousWinRate - 0.1) {
        improvementTrend = 'declining'
      }
    }

    return {
      totalGames,
      recentGames,
      winRate,
      averageScore,
      bestGame,
      improvementTrend
    }
  }, [completedGames, performanceStats])

  // Selected game with additional context
  const selectedGame = useMemo(() => {
    if (!selectedGameId) return null
    
    const game = completedGames.find(g => g.id === selectedGameId)
    if (!game) return null

    // Find similar games for comparison
    const similarGames = completedGames
      .filter(g => 
        g.id !== selectedGameId && 
        g.difficulty === game.difficulty &&
        g.selectedPatterns.some(p1 => 
          game.selectedPatterns.some(p2 => p1.Hands_Key === p2.Hands_Key)
        )
      )
      .slice(0, 3)

    return {
      ...game,
      similarGames
    }
  }, [selectedGameId, completedGames])

  // Quick filters for common use cases
  const quickFilters = useMemo(() => ({
    recentWins: () => setFilter({ 
      outcome: 'won',
      dateRange: { 
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        end: new Date() 
      }
    }),
    highScores: () => setFilter({ 
      minScore: Math.max(performanceStats.averageScore * 1.2, 50) 
    }),
    expertGames: () => setFilter({ difficulty: 'expert' }),
    multiplayerGames: () => setFilter({ coPilotMode: 'everyone' }),
    strugglingPatterns: () => {
      // Find patterns with low success rates and filter games using those patterns
      const patternSuccessRates = new Map<string, { wins: number, total: number, rate: number }>()
      
      // Calculate success rate for each pattern
      completedGames.forEach(game => {
        game.selectedPatterns.forEach(pattern => {
          const patternId = pattern.Hands_Key
          if (!patternSuccessRates.has(patternId)) {
            patternSuccessRates.set(patternId, { wins: 0, total: 0, rate: 0 })
          }
          
          const stats = patternSuccessRates.get(patternId)!
          stats.total++
          if (game.outcome === 'won') {
            stats.wins++
          }
          stats.rate = stats.wins / stats.total
        })
      })
      
      // Find patterns with success rate < 30% and at least 3 games played
      const strugglingPatternIds = Array.from(patternSuccessRates.entries())
        .filter(([, stats]) => stats.total >= 3 && stats.rate < 0.3)
        .map(([patternId]) => patternId)
      
      // Apply the custom filter (note: this assumes the filtering system supports custom predicates)
      // If not, we'll set a generic filter that shows recent losses as a fallback
      if (strugglingPatternIds.length > 0) {
        setFilter({ 
          outcome: 'lost',
          minScore: 0 // Show low-scoring games as proxy for struggling patterns
        })
      } else {
        // No struggling patterns found, show recent performance games
        setFilter({ 
          outcome: 'lost',
          dateRange: {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            end: new Date()
          }
        })
      }
    }
  }), [setFilter, performanceStats, completedGames])

  // Game completion handler with analysis
  const completeGameWithAnalysis = useCallback(async (gameData: {
    duration: number
    outcome: GameOutcome
    finalScore: number
    difficulty: GameDifficulty
    selectedPatterns: NMJL2025Pattern[]
    finalHand: Tile[]
    winningPattern?: NMJL2025Pattern
    roomId?: string
    playerCount?: number
    playerPosition?: 'north' | 'east' | 'south' | 'west'
    coPilotMode?: 'everyone' | 'solo'
  }) => {
    try {
      // Analyze the completed game and generate insights
      const gameAnalysis = await analyzeGamePerformance(gameData)
      
      const completedGameData = {
        ...gameData,
        timestamp: new Date(),
        createdAt: new Date(),
        decisions: gameAnalysis.decisions,
        patternAnalyses: gameAnalysis.patternAnalyses,
        performance: gameAnalysis.performance,
        insights: gameAnalysis.insights,
        shared: false,
        votes: 0,
        comments: []
      }

      completeGame(completedGameData)
      
    } catch (error) {
      // Keep this error - it indicates analysis failures
      console.error('Error completing game analysis:', error)
      setError('Failed to analyze completed game')
    }
  }, [completeGame, setError])

  // Pattern performance analysis
  const getPatternPerformance = useCallback((patternId: string) => {
    const stats = performanceStats.patternStats[patternId]
    if (!stats) {
      return {
        attempted: 0,
        completed: 0,
        successRate: 0,
        recentGames: [],
        recommendations: []
      }
    }

    const recentGames = completedGames
      .filter(game => game.selectedPatterns.some(p => p.Hands_Key === patternId))
      .slice(0, 5)

    const recommendations = []
    if (stats.successRate < 30 && stats.attempted >= 3) {
      recommendations.push('Consider practicing this pattern in tutorial mode')
      recommendations.push('Review successful completions to identify winning strategies')
    }

    return {
      ...stats,
      recentGames,
      recommendations
    }
  }, [performanceStats.patternStats, completedGames])

  // Export functionality with formatting
  const exportFormattedHistory = useCallback((format: 'json' | 'csv' | 'summary') => {
    switch (format) {
      case 'json':
        return exportHistory()
      
      case 'csv': {
        const csvHeader = 'Date,Outcome,Score,Duration,Difficulty,Patterns,Win Rate\n'
        const csvRows = completedGames.map(game => [
          game.timestamp.toISOString().split('T')[0],
          game.outcome,
          game.finalScore,
          game.duration,
          game.difficulty,
          game.selectedPatterns.length,
          game.outcome === 'won' ? '100%' : '0%'
        ].join(',')).join('\n')
        return csvHeader + csvRows
      }
      
      case 'summary': {
        return JSON.stringify({
          summary: gameSummary,
          stats: performanceStats,
          topPatterns: Object.entries(performanceStats.patternStats)
            .sort(([,a], [,b]) => b.successRate - a.successRate)
            .slice(0, 5),
          recommendations: learningRecommendations
        }, null, 2)
      }
      
      default:
        return exportHistory()
    }
  }, [exportHistory, completedGames, gameSummary, performanceStats, learningRecommendations])

  // Auto-refresh analytics when games change
  useEffect(() => {
    calculatePerformanceStats()
    generateLearningRecommendations()
  }, [completedGames.length, calculatePerformanceStats, generateLearningRecommendations])

  return {
    // State
    games: filteredGames,
    allGames: completedGames,
    selectedGame,
    gameSummary,
    performanceStats,
    learningRecommendations,
    isLoading,
    error,
    
    // UI State
    viewMode,
    sortBy,
    sortOrder,
    filterBy,
    
    // Actions
    completeGameWithAnalysis,
    deleteGame,
    selectGame,
    shareGame,
    voteOnGame,
    addComment,
    
    // UI Controls
    setViewMode,
    setSorting,
    setFilter,
    clearFilters,
    quickFilters,
    
    // Analysis
    getPatternPerformance,
    
    // Data Management
    exportFormattedHistory,
    importHistory,
    clearHistory,
    
    // Error Handling
    clearError,
    
    // Utility
    hasGames: completedGames.length > 0,
    canCompare: selectedGameId !== null && completedGames.length > 1
  }
}

// Helper function to analyze game performance using real analysis engines
async function analyzeGamePerformance(gameData: Partial<CompletedGame>) {
  try {
    // Real pattern analysis using the pattern analysis engine
    const patternAnalyses = []
    if (gameData.selectedPatterns && gameData.finalHand) {
      for (const pattern of gameData.selectedPatterns) {
        const playerTiles = gameData.finalHand.map(tile => tile.id)
        const analysisResults = await PatternAnalysisEngine.analyzePatterns(playerTiles, [pattern.Hands_Key], { 
          jokersInHand: 0, 
          wallTilesRemaining: 144, 
          discardPile: [], 
          exposedTiles: {}, 
          currentPhase: 'gameplay' 
        })
        
        patternAnalyses.push({
          patternId: pattern.Hands_Key,
          pattern,
          completionPercentage: analysisResults.length > 0 ? analysisResults[0].tileMatching.bestVariation.completionRatio * 100 : 0,
          timeToCompletion: gameData.outcome === 'won' ? (gameData.duration || 0) * 60 : undefined,
          missedOpportunities: analysisResults.length > 0 ? analysisResults[0].tileMatching.bestVariation.missingTiles : [],
          optimalMoves: analysisResults.length > 0 ? [`Pattern ${analysisResults[0].patternId} completion: ${Math.round(analysisResults[0].tileMatching.bestVariation.completionRatio * 100)}%`] : []
        })
      }
    }

    // Analyze decision quality based on game outcome and selected patterns
    const decisions = []
    if (gameData.selectedPatterns && gameData.finalHand && gameData.decisions) {
      // Use the existing decisions from game data if available
      decisions.push(...gameData.decisions)
    } else {
      // Generate analysis based on final game state
      const finalHandAnalysis = gameData.finalHand && gameData.selectedPatterns 
        ? await AnalysisEngine.analyzeHand(
            gameData.finalHand.map(tile => ({
              ...tile,
              instanceId: tile.id + '-analysis',
              isSelected: false,
              displayName: tile.id
            })), 
            gameData.selectedPatterns.map(p => ({ 
              id: p.Hands_Key, 
              patternId: p['Pattern ID'], 
              displayName: p.Hand_Description, 
              pattern: p.Hand_Pattern, 
              points: p.Hand_Points, 
              difficulty: p.Hand_Difficulty, 
              description: p.Hand_Description, 
              section: p.Section, 
              line: p.Line, 
              allowsJokers: false, // NMJL2025Pattern doesn't have Jokers_Allowed property
              concealed: p.Hand_Conceiled, 
              groups: p.Groups 
            }))
          )
        : null
      
      if (finalHandAnalysis) {
        decisions.push({
          id: `final-analysis-${Date.now()}`,
          timestamp: new Date(),
          type: 'keep' as const,
          tiles: gameData.finalHand || [],
          recommendedAction: finalHandAnalysis.recommendedPatterns.length > 0 && finalHandAnalysis.recommendedPatterns[0].recommendations 
            ? (finalHandAnalysis.recommendedPatterns[0].recommendations.shouldPursue ? 'Pursue this pattern' : 'Consider alternatives') 
            : 'Continue with current strategy',
          actualAction: gameData.outcome === 'won' ? 'Won the game' : 'Game ended',
          quality: gameData.outcome === 'won' ? 'excellent' as const : 'fair' as const,
          reasoning: finalHandAnalysis.strategicAdvice.length > 0 ? finalHandAnalysis.strategicAdvice[0] : 'Final hand analysis'
        })
      }
    }

    // Calculate performance metrics based on real game data
    const performance = {
      totalDecisions: decisions.length,
      excellentDecisions: decisions.filter(d => d.quality === 'excellent').length,
      goodDecisions: decisions.filter(d => d.quality === 'good').length,
      fairDecisions: decisions.filter(d => d.quality === 'fair').length,
      poorDecisions: decisions.filter(d => d.quality === 'poor').length,
      averageDecisionTime: gameData.duration ? (gameData.duration * 60) / Math.max(decisions.length, 1) : 0,
      patternEfficiency: patternAnalyses.length > 0 
        ? patternAnalyses.reduce((sum, p) => sum + p.completionPercentage, 0) / patternAnalyses.length
        : 0,
      charlestonSuccess: 70 // This would need Charleston-specific analysis
    }

    // Generate insights based on performance
    const insights = generateGameInsights(gameData, performance, patternAnalyses)

    return {
      decisions,
      patternAnalyses,
      performance,
      insights
    }
  } catch (error) {
    console.error('Error in game performance analysis:', error)
    
    // Fallback to basic analysis if engines fail
    return {
      decisions: [],
      patternAnalyses: [],
      performance: {
        totalDecisions: 0,
        excellentDecisions: 0,
        goodDecisions: 0,
        fairDecisions: 0,
        poorDecisions: 0,
        averageDecisionTime: 0,
        patternEfficiency: 0,
        charlestonSuccess: 0
      },
      insights: {
        strengthAreas: ['Analysis temporarily unavailable'],
        improvementAreas: ['Analysis temporarily unavailable'],
        learningOpportunities: ['Analysis temporarily unavailable'],
        recommendedPatterns: [],
        skillProgression: 'Analysis temporarily unavailable'
      }
    }
  }
}

// Helper function to generate insights based on real analysis
function generateGameInsights(
  gameData: Partial<CompletedGame>, 
  performance: {
    totalDecisions: number
    excellentDecisions: number
    goodDecisions: number
    fairDecisions: number
    poorDecisions: number
    averageDecisionTime: number
    patternEfficiency: number
    charlestonSuccess: number
  }, 
  patternAnalyses: Array<{
    patternId: string
    pattern: NMJL2025Pattern
    completionPercentage: number
    timeToCompletion?: number
    missedOpportunities: string[]
    optimalMoves: string[]
  }>
) {
  const strengthAreas = []
  const improvementAreas = []
  const learningOpportunities = []
  const recommendedPatterns = []
  
  // Analyze pattern completion rates
  const avgCompletion = patternAnalyses.length > 0 
    ? patternAnalyses.reduce((sum, p) => sum + p.completionPercentage, 0) / patternAnalyses.length
    : 0
  
  if (avgCompletion >= 80) {
    strengthAreas.push('Excellent pattern completion')
  } else if (avgCompletion >= 60) {
    strengthAreas.push('Good pattern recognition')
  } else {
    improvementAreas.push('Pattern completion efficiency')
  }
  
  // Analyze decision quality
  const goodDecisionRate = performance.totalDecisions > 0 
    ? (performance.excellentDecisions + performance.goodDecisions) / performance.totalDecisions
    : 0
  
  if (goodDecisionRate >= 0.8) {
    strengthAreas.push('Strategic decision making')
  } else if (goodDecisionRate >= 0.6) {
    strengthAreas.push('Solid tile management')
  } else {
    improvementAreas.push('Decision quality and timing')
  }
  
  // Game outcome analysis
  if (gameData.outcome === 'won') {
    strengthAreas.push('Successful game completion')
    if (gameData.duration && gameData.duration < 30) {
      strengthAreas.push('Efficient gameplay')
    }
  } else {
    improvementAreas.push('Game completion strategy')
    learningOpportunities.push('Analyze alternative pattern choices')
  }
  
  // Pattern-specific recommendations
  if (patternAnalyses.length > 0) {
    const strugglingPatterns = patternAnalyses
      .filter(p => p.completionPercentage < 50)
      .map(p => p.pattern.Hand_Description || p.patternId)
    
    if (strugglingPatterns.length > 0) {
      learningOpportunities.push(`Focus on: ${strugglingPatterns.slice(0, 2).join(', ')}`)
    }
    
    const successfulPatterns = patternAnalyses
      .filter(p => p.completionPercentage >= 70)
      .map(p => p.pattern.Hand_Description || p.patternId)
    
    recommendedPatterns.push(...successfulPatterns.slice(0, 3))
  }
  
  // Generate skill progression message
  let skillProgression = 'Keep practicing'
  if (gameData.outcome === 'won' && avgCompletion >= 80) {
    skillProgression = 'Excellent progress! Consider trying harder patterns.'
  } else if (gameData.outcome === 'won') {
    skillProgression = 'Good win! Focus on pattern efficiency next time.'
  } else if (avgCompletion >= 70) {
    skillProgression = 'Strong pattern work, focus on completion timing.'
  }
  
  return {
    strengthAreas: strengthAreas.length > 0 ? strengthAreas : ['Pattern recognition'],
    improvementAreas: improvementAreas.length > 0 ? improvementAreas : ['Strategic planning'],
    learningOpportunities: learningOpportunities.length > 0 ? learningOpportunities : ['Practice pattern variations'],
    recommendedPatterns,
    skillProgression
  }
}