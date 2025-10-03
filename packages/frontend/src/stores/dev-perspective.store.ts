import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface DevPerspectiveStore {
  // State
  isDevMode: boolean
  activeDevPlayerId: string | null
  allPlayerIds: string[]

  // Actions
  setActiveDevPlayer: (playerId: string) => void
  registerPlayer: (playerId: string) => void
  unregisterPlayer: (playerId: string) => void
  clearDevMode: () => void

  // Utility
  getEffectivePlayerId: (realPlayerId: string | null) => string | null
}

export const useDevPerspectiveStore = create<DevPerspectiveStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        isDevMode: import.meta.env.DEV,
        activeDevPlayerId: null,
        allPlayerIds: [],

        // Actions
        setActiveDevPlayer: (playerId) => {
          if (!import.meta.env.DEV) return
          set({ activeDevPlayerId: playerId }, false, 'setActiveDevPlayer')
        },

        registerPlayer: (playerId) => {
          if (!import.meta.env.DEV) return
          set((state) => {
            if (state.allPlayerIds.includes(playerId)) return state
            return {
              allPlayerIds: [...state.allPlayerIds, playerId]
            }
          }, false, 'registerPlayer')
        },

        unregisterPlayer: (playerId) => {
          if (!import.meta.env.DEV) return
          set((state) => ({
            allPlayerIds: state.allPlayerIds.filter(id => id !== playerId),
            activeDevPlayerId: state.activeDevPlayerId === playerId ? null : state.activeDevPlayerId
          }), false, 'unregisterPlayer')
        },

        clearDevMode: () => {
          if (!import.meta.env.DEV) return
          set({
            activeDevPlayerId: null,
            allPlayerIds: []
          }, false, 'clearDevMode')
        },

        // Utility
        getEffectivePlayerId: (realPlayerId) => {
          const state = get()
          // In dev mode with an active perspective, use dev player
          // Otherwise fall back to real player
          if (state.isDevMode && state.activeDevPlayerId) {
            return state.activeDevPlayerId
          }
          return realPlayerId
        }
      }),
      {
        name: 'dev-perspective-store',
        storage: {
          getItem: (name) => {
            // Use sessionStorage for dev-only temporary state
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
          // Only persist the active dev player, not computed state
          activeDevPlayerId: state.activeDevPlayerId,
          allPlayerIds: state.allPlayerIds,
        }) as Partial<DevPerspectiveStore>
      }
    ),
    { name: 'dev-perspective-store' }
  )
)
