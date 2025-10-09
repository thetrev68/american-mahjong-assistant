/**
 * Legacy compatibility wrapper for history-store.ts
 * This store has been refactored into useUIStore.ts
 * This file provides backward compatibility for components still using the old API
 */
import { useUIStore } from './useUIStore'

export const useHistoryStore = <T = ReturnType<typeof mapHistoryState>>(
  selector?: (state: ReturnType<typeof mapHistoryState>) => T
) => {
  const uiState = useUIStore((state) => ({
    completedGames: state.history.completedGames,
    recentGames: state.history.recentGames,
    actions: state.actions
  }))

  const mappedState = {
    // State properties (proxied from useUIStore)
    completedGames: uiState.completedGames,
    recentGames: uiState.recentGames,

    // Actions (proxied from useUIStore)
    addCompletedGame: (game: unknown) => {
      uiState.actions.addGameToHistory(game)
    },

    clearHistory: () => {
      uiState.actions.clearHistory?.()
    },

    // Legacy compatibility methods
    getCompletedGames: () => useUIStore.getState().history.completedGames,
    getRecentGames: (limit?: number) => {
      const games = useUIStore.getState().history.recentGames
      return limit ? games.slice(0, limit) : games
    }
  }

  return selector ? selector(mappedState) : (mappedState as T)
}

function mapHistoryState() {
  const state = useUIStore.getState()
  return {
    completedGames: state.history.completedGames,
    recentGames: state.history.recentGames,
    addCompletedGame: (game: unknown) => {
      state.actions.addGameToHistory(game)
    },
    clearHistory: () => {
      state.actions.clearHistory?.()
    },
    getCompletedGames: () => useUIStore.getState().history.completedGames,
    getRecentGames: (limit?: number) => {
      const games = useUIStore.getState().history.recentGames
      return limit ? games.slice(0, limit) : games
    }
  }
}

useHistoryStore.getState = mapHistoryState
