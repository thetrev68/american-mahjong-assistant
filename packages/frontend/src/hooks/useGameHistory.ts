/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useMemo, useEffect } from 'react';
import { useUIStore } from '../stores';

// ... (interfaces remain the same)

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
  } = useUIStore((s) => s.history);

  const historyActions = useUIStore((s) => s.actions.history);

  // Filtered and sorted games
  const filteredGames = useMemo(() => {
    // ... (logic remains the same, uses `completedGames`, `filterBy`, etc. from state)
  }, [completedGames, filterBy, sortBy, sortOrder]);

  // Game summary statistics
  const gameSummary = useMemo(() => {
    // ... (logic remains the same, uses `completedGames`, `performanceStats`)
  }, [completedGames, performanceStats]);

  // Selected game with additional context
  const selectedGame = useMemo(() => {
    // ... (logic remains the same, uses `selectedGameId`, `completedGames`)
  }, [selectedGameId, completedGames]);

  // Quick filters for common use cases
  const quickFilters = useMemo(() => ({
    // ... (logic remains the same, uses `historyActions.setFilter`, `performanceStats`, `completedGames`)
  }), [historyActions.setFilter, performanceStats, completedGames]);

  // Game completion handler with analysis
  const completeGameWithAnalysis = useCallback(async (gameData) => {
    try {
      const gameAnalysis = await analyzeGamePerformance(gameData);
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
        comments: [],
      };
      historyActions.completeGame(completedGameData);
    } catch (error) {
      console.error('Error completing game analysis:', error);
      historyActions.setError('Failed to analyze completed game');
    }
  }, [historyActions]);

  // Pattern performance analysis
  const getPatternPerformance = useCallback((_patternId) => {
    // ... (logic remains the same, uses `performanceStats`, `completedGames`)
  }, [performanceStats.patternStats, completedGames]);

  // Export functionality with formatting
  const exportFormattedHistory = useCallback((_format) => {
    // ... (logic uses `historyActions.exportHistory`, `completedGames`, etc.)
  }, [historyActions.exportHistory, completedGames, gameSummary, performanceStats, learningRecommendations]);

  // Auto-refresh analytics when games change
  useEffect(() => {
    historyActions.calculatePerformanceStats();
    historyActions.generateLearningRecommendations();
  }, [completedGames.length, historyActions]);

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
    deleteGame: historyActions.deleteGame,
    selectGame: historyActions.selectGame,
    shareGame: historyActions.shareGame,
    voteOnGame: historyActions.voteOnGame,
    addComment: historyActions.addComment,
    
    // UI Controls
    setViewMode: historyActions.setViewMode,
    setSorting: historyActions.setSorting,
    setFilter: historyActions.setFilter,
    clearFilters: historyActions.clearFilters,
    quickFilters,
    
    // Analysis
    getPatternPerformance,
    
    // Data Management
    exportFormattedHistory,
    importHistory: historyActions.importHistory,
    clearHistory: historyActions.clearHistory,
    
    // Error Handling
    clearError: historyActions.clearError,
    
    // Utility
    hasGames: completedGames.length > 0,
    canCompare: selectedGameId !== null && completedGames.length > 1,
  };
}

// ... (helper functions `analyzeGamePerformance` and `generateGameInsights` remain the same)