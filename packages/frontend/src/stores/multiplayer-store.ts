import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { Room, Player, GameState, PlayerGameState, SharedState } from 'shared-types'

interface MultiplayerState {
  // Connection state
  isConnected: boolean
  socketId: string | null
  connectionError: string | null
  
  // Current player
  currentPlayerId: string | null
  
  // Room state
  currentRoom: Room | null
  availableRooms: Room[]
  
  // Game state
  gameState: GameState | null
  
  // Computed properties
  isHost: boolean
  
  // Actions
  setConnectionState: (connected: boolean, socketId?: string) => void
  setConnectionError: (error: string | null) => void
  setCurrentPlayerId: (playerId: string) => void
  
  // Room actions
  setCurrentRoom: (room: Room | null) => void
  clearCurrentRoom: () => void
  updateAvailableRooms: (rooms: Room[]) => void
  addPlayerToRoom: (player: Player) => void
  removePlayerFromRoom: (playerId: string) => void
  updatePlayer: (playerId: string, updates: Partial<Player>) => void
  
  // Game state actions
  setGameState: (gameState: GameState | null) => void
  updateGamePhase: (phase: GameState['phase']) => void
  updatePlayerGameState: (playerId: string, state: Partial<PlayerGameState>) => void
  updateSharedGameState: (state: Partial<SharedState>) => void
  
  // Utility actions
  clearAll: () => void
  
  // Computed getters
  getCurrentPlayer: () => Player | null
  getPlayerGameState: (playerId: string) => PlayerGameState | null
  getPublicRooms: () => Room[]
  areAllPlayersReady: () => boolean
  getRoomStats: () => {
    playerCount: number
    maxPlayers: number
    spotsRemaining: number
    isFull: boolean
    isEmpty: boolean
  }
}

export const useMultiplayerStore = create<MultiplayerState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        isConnected: false,
        socketId: null,
        connectionError: null,
        currentPlayerId: null,
        currentRoom: null,
        availableRooms: [],
        gameState: null,
        isHost: false,

        // Connection actions
        setConnectionState: (connected, socketId) =>
          set((state) => ({
            isConnected: connected,
            socketId: socketId || null,
            connectionError: connected ? null : state.connectionError
          }), false, 'setConnectionState'),

        setConnectionError: (error) =>
          set({
            connectionError: error,
            isConnected: error ? false : get().isConnected
          }, false, 'setConnectionError'),

        setCurrentPlayerId: (playerId) =>
          set((state) => ({
            currentPlayerId: playerId,
            isHost: state.currentRoom?.hostId === playerId
          }), false, 'setCurrentPlayerId'),

        // Room actions
        setCurrentRoom: (room) =>
          set((state) => ({
            currentRoom: room,
            isHost: room ? room.hostId === state.currentPlayerId : false,
            gameState: !room ? null : state.gameState
          }), false, 'setCurrentRoom'),

        clearCurrentRoom: () =>
          set({
            currentRoom: null,
            gameState: null,
            isHost: false
          }, false, 'clearCurrentRoom'),

        updateAvailableRooms: (rooms) =>
          set({ availableRooms: rooms }, false, 'updateAvailableRooms'),

        addPlayerToRoom: (player) =>
          set((state) => {
            if (!state.currentRoom) return state

            const updatedRoom = {
              ...state.currentRoom,
              players: [...state.currentRoom.players, player]
            }

            return { currentRoom: updatedRoom }
          }, false, 'addPlayerToRoom'),

        removePlayerFromRoom: (playerId) =>
          set((state) => {
            if (!state.currentRoom) return state

            const updatedRoom = {
              ...state.currentRoom,
              players: state.currentRoom.players.filter(p => p.id !== playerId)
            }

            return { currentRoom: updatedRoom }
          }, false, 'removePlayerFromRoom'),

        updatePlayer: (playerId, updates) =>
          set((state) => {
            if (!state.currentRoom) return state

            const updatedRoom = {
              ...state.currentRoom,
              players: state.currentRoom.players.map(player =>
                player.id === playerId ? { ...player, ...updates } : player
              )
            }

            return { currentRoom: updatedRoom }
          }, false, 'updatePlayer'),

        // Game state actions
        setGameState: (gameState) =>
          set({ gameState }, false, 'setGameState'),

        updateGamePhase: (phase) =>
          set((state) => {
            if (!state.gameState) return state

            return {
              gameState: {
                ...state.gameState,
                phase,
                lastUpdated: new Date()
              }
            }
          }, false, 'updateGamePhase'),

        updatePlayerGameState: (playerId, stateUpdate) =>
          set((state) => {
            if (!state.gameState) return state

            return {
              gameState: {
                ...state.gameState,
                playerStates: {
                  ...state.gameState.playerStates,
                  [playerId]: {
                    ...state.gameState.playerStates[playerId],
                    ...stateUpdate
                  }
                },
                lastUpdated: new Date()
              }
            }
          }, false, 'updatePlayerGameState'),

        updateSharedGameState: (stateUpdate) =>
          set((state) => {
            if (!state.gameState) return state

            return {
              gameState: {
                ...state.gameState,
                sharedState: {
                  ...state.gameState.sharedState,
                  ...stateUpdate
                },
                lastUpdated: new Date()
              }
            }
          }, false, 'updateSharedGameState'),

        // Utility actions
        clearAll: () =>
          set({
            isConnected: false,
            socketId: null,
            connectionError: null,
            currentRoom: null,
            availableRooms: [],
            gameState: null,
            isHost: false
          }, false, 'clearAll'),

        // Computed getters
        getCurrentPlayer: () => {
          const state = get()
          if (!state.currentRoom || !state.currentPlayerId) return null
          return state.currentRoom.players.find(p => p.id === state.currentPlayerId) || null
        },

        getPlayerGameState: (playerId) => {
          const state = get()
          if (!state.gameState) return null
          return state.gameState.playerStates[playerId] || null
        },

        getPublicRooms: () => {
          const state = get()
          return state.availableRooms.filter(room => !room.isPrivate)
        },

        areAllPlayersReady: () => {
          const state = get()
          if (!state.gameState || !state.currentRoom) return false

          return state.currentRoom.players.every(player => {
            const playerState = state.gameState!.playerStates[player.id]
            return playerState?.isReady === true
          })
        },

        getRoomStats: () => {
          const state = get()
          if (!state.currentRoom) {
            return {
              playerCount: 0,
              maxPlayers: 0,
              spotsRemaining: 0,
              isFull: false,
              isEmpty: true
            }
          }

          const playerCount = state.currentRoom.players.length
          const maxPlayers = state.currentRoom.maxPlayers
          const spotsRemaining = maxPlayers - playerCount
          const isFull = spotsRemaining === 0
          const isEmpty = playerCount === 0

          return {
            playerCount,
            maxPlayers,
            spotsRemaining,
            isFull,
            isEmpty
          }
        }
      }),
      {
        name: 'multiplayer-store',
        storage: {
          getItem: (name) => {
            // Use sessionStorage for temporary game state to reduce persistence load
            const str = sessionStorage.getItem(name)
            if (!str) return null
            return JSON.parse(str)
          },
          setItem: (name, value) => {
            sessionStorage.setItem(name, JSON.stringify(value))
          },
          removeItem: (name) => sessionStorage.removeItem(name),
        },
        partialize: (state) => ({
          // Only persist essential state, not volatile connection info or action methods
          // Uses sessionStorage for temporary persistence - cleared on browser restart
          currentPlayerId: state.currentPlayerId,
          currentRoom: state.currentRoom
        } as any)
      }
    ),
    { name: 'multiplayer-store' }
  )
)