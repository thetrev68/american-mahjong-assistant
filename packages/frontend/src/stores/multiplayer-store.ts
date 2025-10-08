// Legacy adapter for refactored room/multiplayer store
// Maps the old multiplayer-store API onto the new useRoomStore
import { useRoomStore } from './useRoomStore'
import type { Room, Player, GameState, PlayerGameState, SharedState } from '@shared-types/room-types'
import { useSyncExternalStore } from 'react'

function mapState() {
  const s = useRoomStore.getState()
  return {
    // State mappings
    currentRoom: s.room,
    availableRooms: s.availableRooms,
    gameState: s.gameState,
    isConnected: s.connectionStatus === 'connected',
    socketId: s.socketId,
    connectionError: s.connectionError,
    isHost: s.isHost,
    currentPlayerId: s.currentPlayerId,

    // Action adapters
    setCurrentRoom: (room: Room | null) => s.actions.setCurrentRoom(room),
    clearCurrentRoom: () => s.actions.clearCurrentRoom(),
    updateAvailableRooms: (rooms: Room[]) => s.actions.updateAvailableRooms(rooms),
    addPlayerToRoom: (player: Player) => s.actions.addPlayerToRoom(player),
    removePlayerFromRoom: (playerId: string) => s.actions.removePlayerFromRoom(playerId),
    updatePlayer: (playerId: string, updates: Partial<Player>) => s.actions.updatePlayer(playerId, updates),
    setCurrentPlayerId: (playerId: string) => s.actions.setCurrentPlayerId(playerId),

    // Game state adapters
    setGameState: (gameState: GameState | null) => s.actions.setGameState(gameState),
    updateGamePhase: (phase: GameState['phase']) => s.actions.updateGamePhase(phase),
    updatePlayerGameState: (playerId: string, state: Partial<PlayerGameState>) => s.actions.updatePlayerGameState(playerId, state),
    updateSharedGameState: (state: Partial<SharedState>) => s.actions.updateSharedGameState(state),

    // Connection adapters (compose from provided actions)
    setConnectionState: (connected: boolean, socketId?: string | null) => {
      s.actions.setConnectionStatus(connected ? 'connected' : 'disconnected')
      s.actions.setReconnectionAttempts(connected ? 0 : s.reconnectionAttempts)
      if (socketId !== undefined) {
        // update socketId via a small state patch through setCurrentRoom (no direct setter exposed)
        // useRoomStore stores socketId at root; emulate a setter by using internal set
        // This adapter avoids direct mutation by calling useRoomStore.setState
        useRoomStore.setState({ socketId: socketId ?? null, connectionError: connected ? null : s.connectionError })
      } else if (connected) {
        useRoomStore.setState({ connectionError: null })
      }
    },
    setConnectionError: (error: string | null) => {
      // setConnectionError already sets connectionStatus to 'error' internally
      s.actions.setConnectionError(error)
    },

    // Utilities and computed
    clearAll: () => s.actions.clearAll(),
    getCurrentPlayer: () => {
      const p = s.actions.getCurrentPlayer?.() as Player | null
      if (!p) return null
      const { id, name, isHost } = p
      return { id, name, isHost }
    },
    getPlayerGameState: (playerId: string): PlayerGameState | null => {
      const gs = useRoomStore.getState().gameState
      if (!gs) return null
      return gs.playerStates?.[playerId] ?? null
    },
    getPublicRooms: (): Room[] => (useRoomStore.getState().availableRooms || []).filter((r: Room) => !r.isPrivate),
    areAllPlayersReady: () => {
      const gs = useRoomStore.getState().gameState
      if (!gs) return false
      const states = Object.values(gs.playerStates || {}) as PlayerGameState[]
      if (states.length === 0) return false
      return states.every((ps) => ps?.isReady === true)
    },
    getRoomStats: () => {
      const room = useRoomStore.getState().room
      if (!room) {
        return { playerCount: 0, maxPlayers: 0, spotsRemaining: 0, isFull: false, isEmpty: true }
      }
      const playerCount = room.players?.length || 0
      const maxPlayers = room.maxPlayers ?? 0
      const spotsRemaining = Math.max(0, maxPlayers - playerCount)
      return {
        playerCount,
        maxPlayers,
        spotsRemaining,
        isFull: maxPlayers > 0 ? playerCount >= maxPlayers : false,
        isEmpty: playerCount === 0,
      }
    },
    getAvailablePositions: () => s.actions.getAvailablePositions?.(),
    isPositionTaken: (pos: ReturnType<typeof useRoomStore.getState>['actions']['getAvailablePositions'] extends () => (infer P)[] ? P : never) => s.actions.isPositionTaken?.(pos),
    getCurrentPlayerPosition: () => s.actions.getCurrentPlayerPosition?.(),
  }
}

// Create a proper React hook using useSyncExternalStore
export function useMultiplayerStore<T = ReturnType<typeof mapState>>(
  selector?: (state: ReturnType<typeof mapState>) => T
): T {
  const state = useSyncExternalStore(
    useRoomStore.subscribe,
    mapState,
    mapState
  );

  if (selector) {
    return selector(state);
  }

  return state as T;
}

// Add getState for non-hook usage
useMultiplayerStore.getState = mapState;
