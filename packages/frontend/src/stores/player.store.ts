import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { useRoomStore } from './room.store';

export type PlayerPosition = 'north' | 'east' | 'south' | 'west';

interface PlayerStore {
  // Local player state
  currentPlayerId: string | null;
  playerPositions: Record<string, PlayerPosition>;
  otherPlayerNames: string[]; // For solo mode - names of other players at the table
  
  // Actions - Player positioning
  setCurrentPlayerId: (playerId: string) => void;
  setPlayerPosition: (playerId: string, position: PlayerPosition) => void;
  clearPlayerPosition: (playerId: string) => void;
  setOtherPlayerNames: (names: string[]) => void;
  
  // Actions - Cleanup
  clearPlayerData: () => void;
  
  // Computed properties
  getAvailablePositions: () => PlayerPosition[];
  isPositionTaken: (position: PlayerPosition) => boolean;
  getCurrentPlayerPosition: () => PlayerPosition | null;
  isCurrentPlayerHost: () => boolean;
}

const ALL_POSITIONS: PlayerPosition[] = ['north', 'east', 'south', 'west'];

export const usePlayerStore = create<PlayerStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        currentPlayerId: null,
        playerPositions: {},
        otherPlayerNames: [],

        // Actions - Player management
        setCurrentPlayerId: (playerId) => set({ currentPlayerId: playerId }),

        setPlayerPosition: (playerId, position) => set((state) => {
          // Clear any existing player at this position
          const clearedPositions = Object.entries(state.playerPositions).reduce((acc, [pid, pos]) => {
            if (pos !== position) {
              acc[pid] = pos;
            }
            return acc;
          }, {} as Record<string, PlayerPosition>);
          
          return {
            playerPositions: {
              ...clearedPositions,
              [playerId]: position
            }
          };
        }),

        clearPlayerPosition: (playerId) => set((state) => {
          const newPositions = { ...state.playerPositions };
          delete newPositions[playerId];
          return { playerPositions: newPositions };
        }),

        setOtherPlayerNames: (names) => set({ otherPlayerNames: names }),

        clearPlayerData: () => set({
          currentPlayerId: null,
          playerPositions: {},
          otherPlayerNames: []
        }),

        // Computed properties
        getAvailablePositions: () => {
          const { playerPositions } = get();
          const takenPositions = Object.values(playerPositions);
          return ALL_POSITIONS.filter(pos => !takenPositions.includes(pos));
        },

        isPositionTaken: (position) => {
          const { playerPositions } = get();
          return Object.values(playerPositions).includes(position);
        },

        getCurrentPlayerPosition: () => {
          const { currentPlayerId, playerPositions } = get();
          return currentPlayerId ? playerPositions[currentPlayerId] || null : null;
        },

        isCurrentPlayerHost: () => {
          const { currentPlayerId } = get();
          if (!currentPlayerId) return false;
          
          // Use getState() to avoid circular dependencies
          const { hostPlayerId } = useRoomStore.getState();
          return currentPlayerId === hostPlayerId;
        },
      }),
      {
        name: 'player-store',
        // Only persist essential player data
        partialize: (state) => ({
          currentPlayerId: state.currentPlayerId,
          playerPositions: state.playerPositions,
          otherPlayerNames: state.otherPlayerNames,
        }),
      }
    ),
    { name: 'player-store' }
  )
);