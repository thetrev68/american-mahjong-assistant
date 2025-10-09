/**
 * Legacy compatibility wrapper for player.store.ts
 * This store has been refactored into useRoomStore.ts
 * This file provides backward compatibility for components still using the old API
 */
import { useRoomStore } from './useRoomStore'
import type { PlayerPosition } from './useRoomStore'

// This store is deprecated - components should use useRoomStore directly
export const usePlayerStore = () => {
  // Select ONLY primitives
  const currentPlayerId = useRoomStore((state) => state.currentPlayerId)
  const playerPositions = useRoomStore((state) => state.playerPositions)

  return {
    activePlayerId: currentPlayerId,
    playerPositions,
    currentPlayerId,

    // Actions use getState to avoid subscribing
    setPlayerPosition: (playerId: string, position: PlayerPosition) => {
      const currentPositions = useRoomStore.getState().playerPositions
      useRoomStore.setState({
        playerPositions: {
          ...currentPositions,
          [playerId]: position
        }
      })
    },
    clearPlayerData: () => {
      useRoomStore.setState({
        playerPositions: {},
        currentPlayerId: null
      })
    },
    getPlayerPosition: (playerId: string) => {
      return useRoomStore.getState().playerPositions[playerId] || null
    }
  }
}

function mapPlayerState() {
  const state = useRoomStore.getState()
  return {
    activePlayerId: state.currentPlayerId,
    playerPositions: state.playerPositions,
    currentPlayerId: state.currentPlayerId,
    setPlayerPosition: (playerId: string, position: PlayerPosition) => {
      const currentPositions = useRoomStore.getState().playerPositions
      useRoomStore.setState({
        playerPositions: {
          ...currentPositions,
          [playerId]: position
        }
      })
    },
    clearPlayerData: () => {
      useRoomStore.setState({
        playerPositions: {},
        currentPlayerId: null
      })
    },
    getPlayerPosition: (playerId: string) => {
      return useRoomStore.getState().playerPositions[playerId] || null
    }
  }
}

usePlayerStore.getState = mapPlayerState
