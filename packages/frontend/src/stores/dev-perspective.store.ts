/**
 * Legacy compatibility wrapper for dev-perspective.store.ts
 * This store has been refactored into useUIStore.ts
 * This file provides backward compatibility for components still using the old API
 */
import { useUIStore } from './useUIStore'

export const useDevPerspectiveStore = <T = ReturnType<typeof mapDevState>>(
  selector?: (state: ReturnType<typeof mapDevState>) => T
) => {
  const uiState = useUIStore((state) => ({
    activeDevPlayerId: state.dev.activeDevPlayerId,
    allPlayerIds: state.dev.allPlayerIds || [],
    actions: state.actions
  }))

  const mappedState = {
    // State properties (proxied from useUIStore)
    activeDevPlayerId: uiState.activeDevPlayerId,
    allPlayerIds: uiState.allPlayerIds,

    // Actions (proxied from useUIStore)
    setActiveDevPlayerId: (playerId: string | null) => {
      uiState.actions.setDevPlayerId?.(playerId)
    },

    setAllPlayerIds: (playerIds: string[]) => {
      useUIStore.setState((state) => ({
        dev: {
          ...state.dev,
          allPlayerIds: playerIds
        }
      }))
    },

    clearDevPerspective: () => {
      useUIStore.setState((state) => ({
        dev: {
          ...state.dev,
          activeDevPlayerId: null,
          allPlayerIds: []
        }
      }))
    },

    // Legacy compatibility methods
    getActiveDevPlayerId: () => useUIStore.getState().dev.activeDevPlayerId,
    isDevPerspectiveActive: () => useUIStore.getState().dev.activeDevPlayerId !== null
  }

  return selector ? selector(mappedState) : (mappedState as T)
}

function mapDevState() {
  const state = useUIStore.getState()
  return {
    activeDevPlayerId: state.dev.activeDevPlayerId,
    allPlayerIds: state.dev.allPlayerIds || [],
    setActiveDevPlayerId: (playerId: string | null) => {
      state.actions.setDevPlayerId?.(playerId)
    },
    setAllPlayerIds: (playerIds: string[]) => {
      useUIStore.setState((s) => ({
        dev: { ...s.dev, allPlayerIds: playerIds }
      }))
    },
    clearDevPerspective: () => {
      useUIStore.setState((s) => ({
        dev: { ...s.dev, activeDevPlayerId: null, allPlayerIds: [] }
      }))
    },
    getActiveDevPlayerId: () => useUIStore.getState().dev.activeDevPlayerId,
    isDevPerspectiveActive: () => useUIStore.getState().dev.activeDevPlayerId !== null
  }
}

useDevPerspectiveStore.getState = mapDevState
