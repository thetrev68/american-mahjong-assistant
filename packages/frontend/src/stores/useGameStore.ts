import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { GamePhase, type Alert } from '@shared-types/game-types';
import { Tile } from '@shared-types/tile-types';
import { Pattern } from '@shared-types/nmjl-types';
import type { PlayerPosition, TurnPlayer, PlayerActionState, CallOpportunity } from './turn-store'; // Assuming these types are now local or moved

// ... (CharlestonState interface)

// Combined state from game-store and turn-store
interface GameState {
  phase: GamePhase | 'charleston';
  playerHand: Tile[];
  exposedTiles: Tile[];
  discardPile: Tile[];
  wallCount: number;
  turnOrder: string[];
  currentPlayerId: string | null;
  targetPatterns: Pattern[];
  charleston: CharlestonState;
  alerts: Alert[];

  // From turn-store
  turnNumber: number;
  roundNumber: number;
  currentWind: PlayerPosition;
  turnStartTime: Date | null;
  turnDuration: number;
  players: TurnPlayer[];
  isGameActive: boolean;
  canAdvanceTurn: boolean;
  playerActions: Record<string, PlayerActionState>;
  currentCallOpportunity: CallOpportunity | null;

  actions: any; // Simplified for brevity
}

const initialState = {
  phase: 'loading' as GamePhase | 'charleston',
  playerHand: [],
  exposedTiles: [],
  discardPile: [],
  wallCount: 136,
  turnOrder: [],
  currentPlayerId: null,
  targetPatterns: [],
  charleston: { phase: 'first', selectedTiles: [] },
  alerts: [],
  turnNumber: 1,
  roundNumber: 1,
  currentWind: 'east' as PlayerPosition,
  turnStartTime: null,
  turnDuration: 0,
  players: [],
  isGameActive: false,
  canAdvanceTurn: false,
  playerActions: {},
  currentCallOpportunity: null,
};

export const useGameStore = create<GameState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        actions: {
          // --- Original GameStore Actions ---
          drawTile: () => set((state) => ({ wallCount: state.wallCount - 1 })),
          discardTile: (tile) => set((state) => ({ discardPile: [...state.discardPile, tile] })),
          startCharleston: () => set({ phase: 'charleston' }),
          selectPattern: (pattern) => set((state) => ({ targetPatterns: [...state.targetPatterns, pattern] })),
          addAlert: (alert) => set((state) => ({ alerts: [...state.alerts, { ...alert, id: Date.now().toString() }] })),

          // --- Merged TurnStore Actions ---
          initializeTurns: (players) => {
            const positionOrder: PlayerPosition[] = ['east', 'north', 'west', 'south'];
            const sortedPlayers = [...players].sort((a, b) => positionOrder.indexOf(a.position) - positionOrder.indexOf(b.position));
            const turnOrder = sortedPlayers.map(p => p.id);
            set({ players: sortedPlayers, turnOrder, currentPlayerId: null, turnNumber: 1, roundNumber: 1, currentWind: 'east', isGameActive: false, canAdvanceTurn: false });
          },
          startGame: () => {
            const { turnOrder } = get();
            if (turnOrder.length > 0) {
              set({ isGameActive: true, currentPlayerId: turnOrder[0], turnStartTime: new Date(), turnDuration: 0, canAdvanceTurn: true });
            }
          },
          advanceTurn: () => {
            const { isGameActive, canAdvanceTurn, turnOrder, currentPlayerId, turnNumber, roundNumber, currentWind } = get();
            if (!isGameActive || !canAdvanceTurn) return;
            const currentIndex = turnOrder.indexOf(currentPlayerId || '');
            if (currentIndex === -1) return;
            const nextIndex = (currentIndex + 1) % turnOrder.length;
            const nextPlayer = turnOrder[nextIndex];
            const newTurnNumber = turnNumber + 1;
            let newRoundNumber = roundNumber;
            let newCurrentWind = currentWind;
            if (newTurnNumber > 4 && (newTurnNumber - 1) % 4 === 0) {
              newRoundNumber += 1;
              const windOrder: PlayerPosition[] = ['east', 'south', 'west', 'north'];
              const currentWindIndex = windOrder.indexOf(newCurrentWind);
              newCurrentWind = windOrder[(currentWindIndex + 1) % windOrder.length];
            }
            set({ currentPlayerId: nextPlayer, turnNumber: newTurnNumber, roundNumber: newRoundNumber, currentWind: newCurrentWind, turnStartTime: new Date(), turnDuration: 0 });
          },
          updateTurnDuration: () => {
            const { turnStartTime } = get();
            if (turnStartTime) {
              const duration = Math.floor((Date.now() - turnStartTime.getTime()) / 1000);
              set({ turnDuration: duration });
            }
          },
          // ... other actions from turn-store
        },
      }),
      {
        name: 'game-store',
        partialize: (state) => ({
          // Persisted state
          playerHand: state.playerHand,
          exposedTiles: state.exposedTiles,
          targetPatterns: state.targetPatterns,
          // ... persisted parts from turn-store
        }),
      }
    ),
    { name: 'GameStore' }
  )
);