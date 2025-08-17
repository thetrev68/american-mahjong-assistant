// Game History Management Hook
// High-level hook for managing game history, analytics, and learning insights

import { useCallback, useMemo, useEffect } from 'react'
import { useHistoryStore, type CompletedGame, type GameOutcome, type GameDifficulty } from '../stores/history-store'
import type { Tile } from '../../../shared/tile-utils'
import type { NMJL2025Pattern } from '../../../shared/nmjl-types'

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
        case 'difficulty':
          const difficultyOrder = { beginner: 1, intermediate: 2, expert: 3 }
          comparison = difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]
          break
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
      // Show games with patterns that have low success rates
      const strugglingPatterns = Object.entries(performanceStats.patternStats)
        .filter(([_, stats]) => stats.successRate < 30)
        .map(([patternId]) => patternId)
      
      // This would need custom filtering logic for pattern-based filtering
      // For now, we'll clear filters as a placeholder
      clearFilters()
    }
  }), [setFilter, clearFilters, performanceStats])

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
      
      case 'csv':
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
      
      case 'summary':
        return JSON.stringify({
          summary: gameSummary,
          stats: performanceStats,
          topPatterns: Object.entries(performanceStats.patternStats)
            .sort(([,a], [,b]) => b.successRate - a.successRate)
            .slice(0, 5),
          recommendations: learningRecommendations
        }, null, 2)
      
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

// Helper function to analyze game performance
async function analyzeGamePerformance(gameData: any) {
  // This is a placeholder implementation
  // In a real implementation, this would integrate with the analysis engine
  // to evaluate decisions, pattern choices, and overall performance
  
  const mockDecisions = [
    {
      id: `decision-${Date.now()}-1`,
      timestamp: new Date(),
      type: 'keep' as const,
      tiles: [],
      recommendedAction: 'Keep these tiles',
      actualAction: 'Kept tiles',
      quality: 'good' as const,
      reasoning: 'Good decision to keep potential pattern tiles'
    }
  ]

  const mockPatternAnalyses = gameData.selectedPatterns.map((pattern: NMJL2025Pattern) => ({
    patternId: pattern.Hands_Key,
    pattern,
    completionPercentage: Math.random() * 100,
    timeToCompletion: gameData.outcome === 'won' ? gameData.duration * 60 : undefined,
    missedOpportunities: [],
    optimalMoves: []
  }))

  const mockPerformance = {
    totalDecisions: mockDecisions.length,
    excellentDecisions: 0,
    goodDecisions: mockDecisions.filter(d => d.quality === 'good').length,
    fairDecisions: 0,
    poorDecisions: 0,
    averageDecisionTime: 5.2,
    patternEfficiency: gameData.outcome === 'won' ? 85 : 45,
    charlestonSuccess: 70
  }

  const mockInsights = {
    strengthAreas: ['Pattern recognition', 'Tile management'],
    improvementAreas: gameData.outcome === 'won' ? ['Charleston strategy'] : ['Decision timing', 'Pattern flexibility'],
    learningOpportunities: ['Practice medium difficulty patterns', 'Focus on joker placement'],
    recommendedPatterns: ['2468', 'Consecutive Run'],
    skillProgression: gameData.outcome === 'won' ? 'Good progress!' : 'Keep practicing'
  }

  return {
    decisions: mockDecisions,
    patternAnalyses: mockPatternAnalyses,
    performance: mockPerformance,
    insights: mockInsights
  }
}