// Store Exports
export { type GameState, type Player } from './game-store'
export { type UIState } from './ui-store'
export { usePatternStore } from './pattern-store'
export { useTileStore } from './tile-store'
export { useIntelligenceStore } from './intelligence-store'
export { useCharlestonStore, useCharlestonSelectors } from './charleston-store'
export { 
  useTutorialStore, 
  useTutorialProgress, 
  useTutorialNavigation, 
  useTutorialPreferences, 
  useTutorialDemo 
} from './tutorial-store'

// New decomposed room-related stores
export { useRoomStore } from './room.store'
export type { PlayerPosition } from 'shared-types'
export { usePlayerStore } from './player.store'
export { useConnectionStore } from './connection.store'
export { useRoomSetupStore, type CoPilotMode, type RoomStatus } from './room-setup.store'
export { useTurnStore, useTurnSelectors, type TurnPlayer } from './turn-store'

// Dev-only stores
export { useDevPerspectiveStore } from './dev-perspective.store'

// Store Selectors (commonly used combinations)
import { useGameStore } from './game-store'
import { useUIStore } from './ui-store'

// Export the imported stores
export { useGameStore, useUIStore }

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