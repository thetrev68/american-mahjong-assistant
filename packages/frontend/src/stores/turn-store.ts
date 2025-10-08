// Legacy adapter over the consolidated game store turn state
import { useGameStore } from './useGameStore'

type AnyFn = (...args: unknown[]) => unknown

function mapState() {
  const s = useGameStore.getState()
  return {
    // State
    turnNumber: s.turnNumber,
    currentTurn: s.currentTurn,
    turnStartTime: s.turnStartTime,
    turnDuration: s.turnDuration,
    currentPlayerId: s.currentPlayerId,
    players: s.players,

    // Actions
    startTurn: () => useGameStore.getState().actions.startTurn(),
    advanceTurn: () => useGameStore.getState().actions.advanceTurn(),
    getCurrentPlayerData: () => useGameStore.getState().actions.getCurrentPlayerData(),
    getTurnOrderDisplay: () => useGameStore.getState().actions.getTurnOrderDisplay(),
    getPlayerActions: (playerId: string) => useGameStore.getState().actions.getPlayerActions(playerId),
  }
}

export const useTurnStore = Object.assign(
  ((selector?: (s: ReturnType<typeof mapState>) => any) => {
    const mapped = mapState()
    return selector ? selector(mapped) : mapped
  }) as AnyFn,
  { getState: () => mapState() }
)

export const useTurnSelectors = () => ({
  getCurrentTurn: () => useGameStore.getState().turnNumber,
})
