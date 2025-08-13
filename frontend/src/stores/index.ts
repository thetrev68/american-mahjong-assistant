// Store Exports
export { useGameStore, type GameState, type Player } from './game-store'
export { useUIStore, type UIState } from './ui-store'
export { usePatternStore } from './pattern-store'
export { useTileStore } from './tile-store'

// Store Selectors (commonly used combinations)
import { useGameStore } from './game-store'
import { useUIStore } from './ui-store'

export const useGamePhase = () => useGameStore((state) => state.gamePhase)
export const useRoomCode = () => useGameStore((state) => state.roomCode)
export const usePlayers = () => useGameStore((state) => state.players)
export const useCurrentPlayer = () => {
  const currentPlayerId = useGameStore((state) => state.currentPlayerId)
  const players = useGameStore((state) => state.players)
  return players.find((p) => p.id === currentPlayerId) || null
}

export const useTheme = () => useUIStore((state) => state.theme)
export const useAnimationsEnabled = () => useUIStore((state) => state.animationsEnabled)
export const useSkillLevel = () => useUIStore((state) => state.skillLevel)