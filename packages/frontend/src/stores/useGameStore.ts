import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { GamePhase, Tile, Notification, Player, CharlestonState, PlayerPosition } from '@shared-types/game-types';
import type { PatternSelectionOption } from '@shared-types/nmjl-types';

import type { GameAction, CallType } from '../features/gameplay/services/game-actions';



interface GameActions {
  // Original GameStore Actions
  drawTile: () => void;
  discardTile: (tile: Tile) => void;
  advanceTurn: () => void;
  startCharleston: () => void;
  selectPattern: (pattern: PatternSelectionOption) => void;
  addAlert: (alert: Omit<Notification, "id">) => void;
  setPhase: (phase: GamePhase | 'charleston') => void;
  setGamePhase: (phase: GamePhase | 'charleston' | 'tile-input' | 'lobby' | 'playing' | 'finished') => void;
  resetGame: () => void;
  clearTargetPatterns: () => void;
  setTargetPatterns: (patterns: PatternSelectionOption[]) => void;
  clearHand: () => void;
  setCoPilotMode: (mode: 'solo' | 'everyone' | null) => void;
  startTurn: () => void;
  incrementTurn: () => void;
  recordDiscard: (playerId?: string, tile?: Tile) => void;
  recordAction: (playerId: string, action: string) => void;
  recordCallAttempt: (playerId: string) => void;
  setGameEndResult: (result: unknown) => void;
  markPlayerPassedOut: (playerId: string) => void;
  checkForGameEnd: () => boolean;
  setRoomCode: (code: string | null) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  updatePlayer: (playerId: string, updates: Partial<Player>) => void;
  removeAlert: (alertId: string) => void;
  updateWallTiles: (count: number) => void;
  recordTurnTiming: (durationMs: number) => void;
  resetStatistics: () => void;
  advanceGameTurn: () => void;
  removePassedOutPlayer: (playerId: string) => void;

  // From turn-store (Setup and initialization)
  initializeTurns: (players: Player[]) => void;
  setMultiplayerMode: (isMultiplayer: boolean) => void;
  setPlayers: (players: Player[]) => void;
  
  // From turn-store (Turn management)
  startGame: () => void;
  setCurrentPlayer: (playerId: string) => void;
  
  // From turn-store (Round management)
  advanceRound: () => void;
  
  // From turn-store (Utility)
  resetTurns: () => void;
  updateTurnDuration: () => void;
  
  // From turn-store (Action management)
  setAvailableActions: (playerId: string, actions: GameAction[]) => void;
  executeAction: (playerId: string, action: GameAction, data?: unknown) => Promise<boolean>;
  markPlayerAction: (playerId: string, actionType: 'hasDrawn' | 'hasDiscarded', value: boolean) => void;
  
  // From turn-store (Turn timing)
  startTurnTimer: (duration?: number) => void;
  pauseTurnTimer: () => void;
  resumeTurnTimer: () => void;
  
  // From turn-store (Call management)
  openCallOpportunity: (tile: Tile, duration?: number) => void;
  respondToCall: (response: 'call' | 'pass', callType?: CallType, tiles?: Tile[]) => void;
  closeCallOpportunity: () => void;
  
  // From turn-store (Game state management)
  updateDiscardPile: (tile: Tile, playerId: string) => void;
  updateWallCount: (count: number) => void;
  
  // From turn-store (Getters - computed properties)
  getCurrentPlayerData: () => Player | null;
  getNextPlayer: () => Player | null;
  isCurrentPlayerTurn: (playerId: string) => boolean;
  getTurnOrderDisplay: () => { player: Player; isCurrent: boolean; isNext: boolean }[];
  getPlayerActions: (playerId: string) => PlayerActionState | null;
}

interface PlayerActionState {
  availableActions: GameAction[];
  hasDrawn?: boolean;
  hasDiscarded?: boolean;
  lastActionTime?: Date;
}

interface CallOpportunity {
  tile: Tile;
  callType: CallType;
  duration: number;
  deadline: Date;
  isActive: boolean;
}

// Combined state from game-store and turn-store
interface GameState {
  phase: GamePhase | 'charleston';
  gamePhase: GamePhase | 'charleston' | 'tile-input' | 'lobby' | 'playing' | 'finished';
  playerHand: Tile[];
  exposedTiles: Tile[];
  discardPile: Tile[];
  wallCount: number;
  wallTilesRemaining: number;
  turnOrder: string[];
  currentPlayerId: string | null;
  targetPatterns: PatternSelectionOption[];
  charleston: CharlestonState;
  alerts: Notification[];
  isMultiplayer: boolean;
  coPilotMode: 'solo' | 'everyone' | null;
  roomCode: string | null;

  // From turn-store
  turnNumber: number;
  roundNumber: number;
  currentWind: PlayerPosition;
  turnStartTime: Date | null;
  turnDuration: number;
  players: Player[];
  isGameActive: boolean;
  canAdvanceTurn: boolean;
  playerActions: Record<string, PlayerActionState>;
  currentCallOpportunity: CallOpportunity | null;
  currentTurn: number;
  gameStartTime: Date | null;
  gameStatistics: {
    totalActions: number;
    turnTimings: number[];
    playerActionCounts: Record<string, number>;
    callAttempts: Record<string, number>;
    discardCount: number;
  };
  passedOutPlayers: string[];
  gameEndResult: unknown;

  actions: GameActions; // Use the defined interface
}

const createDefaultGameStatistics = () => ({
  totalActions: 0,
  turnTimings: [] as number[],
  playerActionCounts: {} as Record<string, number>,
  callAttempts: {} as Record<string, number>,
  discardCount: 0,
});

const initialState = {
  phase: 'loading' as GamePhase | 'charleston',
  gamePhase: 'lobby' as GamePhase | 'charleston' | 'tile-input' | 'lobby' | 'playing' | 'finished',
  playerHand: [],
  exposedTiles: [],
  discardPile: [],
  wallCount: 136,
  wallTilesRemaining: 136,
  turnOrder: [],
  currentPlayerId: null,
  targetPatterns: [],
  charleston: { phase: 'complete', selectedTiles: [], passesRemaining: 3, playersReady: [], timeLimit: 0, startTime: 0 },
  alerts: [],
  isMultiplayer: false,
  coPilotMode: null as 'solo' | 'everyone' | null,
  roomCode: null as string | null,
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
  currentTurn: 0,
  gameStartTime: null,
  gameStatistics: createDefaultGameStatistics(),
  passedOutPlayers: [],
  gameEndResult: null,
};

export const useGameStore = create<GameState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        actions: {
          // --- Original GameStore Actions ---
          drawTile: () => set((_state) => ({
            wallCount: Math.max(0, _state.wallCount - 1),
            wallTilesRemaining: Math.max(0, _state.wallTilesRemaining - 1),
          })),
          discardTile: (tile) => set((_state) => ({ discardPile: [..._state.discardPile, tile] })),
          startCharleston: () => set({ phase: 'charleston', gamePhase: 'charleston' }),
          selectPattern: (pattern) => set((state) => ({ targetPatterns: [...state.targetPatterns, pattern] })),
          addAlert: (alert) => set((state) => ({ alerts: [...state.alerts, { ...alert, id: Date.now().toString() }] })),
          setPhase: (phase) => set({ phase, gamePhase: phase }),
          setGamePhase: (phase) => set({ phase, gamePhase: phase }),
          resetGame: () => set(() => ({
            ...initialState,
            gameStatistics: createDefaultGameStatistics(),
            alerts: [],
            playerHand: [],
            exposedTiles: [],
            discardPile: [],
            turnOrder: [],
            players: [],
            passedOutPlayers: [],
            roomCode: null,
            currentCallOpportunity: null,
            actions: get().actions,
          })),
          clearTargetPatterns: () => set({ targetPatterns: [] }),
          setTargetPatterns: (patterns) => set({ targetPatterns: patterns }),
          clearHand: () => set({ playerHand: [], exposedTiles: [], discardPile: [] }),
          setCoPilotMode: (mode) => set({ coPilotMode: mode }),
          startTurn: () => set({ turnStartTime: new Date(), turnDuration: 0 }),
          incrementTurn: () =>
            set((state) => ({
              currentTurn: state.currentTurn + 1,
              turnNumber: state.turnNumber + 1,
            })),
          recordDiscard: (playerId = 'opponent', tile) =>
            set((state) => {
              const playerActionCounts = {
                ...state.gameStatistics.playerActionCounts,
                [playerId]: (state.gameStatistics.playerActionCounts[playerId] || 0) + 1,
              };
              return {
                gameStatistics: {
                  ...state.gameStatistics,
                  totalActions: state.gameStatistics.totalActions + 1,
                  discardCount: state.gameStatistics.discardCount + 1,
                  playerActionCounts,
                },
                discardPile: tile ? [...state.discardPile, tile] : state.discardPile,
              };
            }),
          recordAction: (playerId, action) =>
            set((state) => {
              const playerActionCounts = {
                ...state.gameStatistics.playerActionCounts,
                [playerId]: (state.gameStatistics.playerActionCounts[playerId] || 0) + 1,
              };
              return {
                gameStatistics: {
                  ...state.gameStatistics,
                  totalActions: state.gameStatistics.totalActions + 1,
                  playerActionCounts,
                },
              };
            }),
          recordCallAttempt: (playerId) =>
            set((state) => ({
              gameStatistics: {
                ...state.gameStatistics,
                callAttempts: {
                  ...state.gameStatistics.callAttempts,
                  [playerId]: (state.gameStatistics.callAttempts[playerId] || 0) + 1,
                },
              },
            })),
          setGameEndResult: (result) => set({ gameEndResult: result }),
          markPlayerPassedOut: (playerId) =>
            set((state) => ({
              passedOutPlayers: state.passedOutPlayers.includes(playerId)
                ? state.passedOutPlayers
                : [...state.passedOutPlayers, playerId],
            })),
          setRoomCode: (code) => set({ roomCode: code }),
          addPlayer: (player) => set((state) => ({
            players: [...state.players, player],
            turnOrder: state.turnOrder.includes(player.id)
              ? state.turnOrder
              : [...state.turnOrder, player.id],
          })),
          removePlayer: (playerId) => set((state) => ({
            players: state.players.filter((p) => p.id !== playerId),
            turnOrder: state.turnOrder.filter((id) => id !== playerId),
            passedOutPlayers: state.passedOutPlayers.filter((id) => id !== playerId),
          })),
          updatePlayer: (playerId, updates) => set((state) => ({
            players: state.players.map((player) =>
              player.id === playerId ? { ...player, ...updates } : player
            ),
          })),
          removeAlert: (alertId) => set((state) => ({
            alerts: state.alerts.filter((alert) => alert.id !== alertId),
          })),
          updateWallTiles: (count) => set({
            wallCount: Math.max(0, count),
            wallTilesRemaining: Math.max(0, count),
          }),
          recordTurnTiming: (durationMs) => set((state) => ({
            gameStatistics: {
              ...state.gameStatistics,
              turnTimings: [...state.gameStatistics.turnTimings, durationMs],
            },
          })),
          resetStatistics: () => set(() => ({
            gameStatistics: createDefaultGameStatistics(),
            passedOutPlayers: [],
          })),
          advanceGameTurn: () => set((state) => ({
            currentTurn: state.currentTurn + 1,
            turnNumber: state.turnNumber + 1,
          })),
          removePassedOutPlayer: (playerId) => set((state) => ({
            passedOutPlayers: state.passedOutPlayers.filter((id) => id !== playerId),
          })),
          checkForGameEnd: () => {
            const state = get();
            const everyonePassedOut =
              state.players.length > 0 &&
              state.passedOutPlayers.length >= state.players.length;
            return state.wallTilesRemaining <= 0 || everyonePassedOut;
          },
          // --- Merged TurnStore Actions ---
          initializeTurns: (players: Player[]) =>
            set(() => ({
              turnOrder: players.map((p) => p.id),
              currentPlayerId: players[0]?.id || null,
            })),
          setMultiplayerMode: (isMultiplayer: boolean) => set({ isMultiplayer }),
          setPlayers: (players: Player[]) => set({ players }),
          startGame: () => {
            const { turnOrder } = get();
            const startTime = new Date();
            set({
              isGameActive: true,
              currentPlayerId: turnOrder[0] || null,
              turnStartTime: startTime,
              turnDuration: 0,
              canAdvanceTurn: true,
              phase: 'playing',
              gamePhase: 'playing',
              gameStartTime: startTime,
              currentTurn: turnOrder.length > 0 ? 1 : 0,
              turnNumber: turnOrder.length > 0 ? 1 : 0,
            });
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
            set({
              currentPlayerId: nextPlayer,
              turnNumber: newTurnNumber,
              currentTurn: newTurnNumber,
              roundNumber: newRoundNumber,
              currentWind: newCurrentWind,
              turnStartTime: new Date(),
              turnDuration: 0,
            });
          },
          updateTurnDuration: () => {
            const { turnStartTime } = get();
            if (turnStartTime) {
              const duration = Math.floor((Date.now() - turnStartTime.getTime()) / 1000);
              set({ turnDuration: duration });
            }
          },
          setCurrentPlayer: (playerId) => set({ currentPlayerId: playerId }),
          advanceRound: () => {
            const state = get();
            const windOrder: PlayerPosition[] = ['east', 'south', 'west', 'north'];
            const currentWindIndex = windOrder.indexOf(state.currentWind);
            const newWind = windOrder[(currentWindIndex + 1) % windOrder.length];
            set({ roundNumber: state.roundNumber + 1, currentWind: newWind });
          },
          resetTurns: () => set(() => ({ ...initialState, actions: get().actions })),
          setAvailableActions: (playerId, actions) => {
            set((state) => ({
              playerActions: {
                ...state.playerActions,
                [playerId]: { ...state.playerActions[playerId], availableActions: actions },
              },
            }));
          },
          executeAction: async (_playerId, action, _data) => {
            console.log(`Executing action ${action} for player ${_playerId}`);
            return true;
          },
          markPlayerAction: (playerId, actionType, value) => {
            set((state) => ({
              playerActions: {
                ...state.playerActions,
                [playerId]: {
                  ...state.playerActions[playerId],
                  [actionType]: value,
                  lastActionTime: value ? new Date() : state.playerActions[playerId]?.lastActionTime,
                },
              },
            }));
          },
          startTurnTimer: (duration = 0) => set({ turnStartTime: new Date(), turnDuration: duration }),
          pauseTurnTimer: () => {
            const { turnStartTime } = get();
            if (turnStartTime) {
              const duration = Math.floor((Date.now() - turnStartTime.getTime()) / 1000);
              set({ turnDuration: duration, turnStartTime: null });
            }
          },
          resumeTurnTimer: () => {
            const { turnDuration } = get();
            set({ turnStartTime: new Date(Date.now() - turnDuration * 1000) });
          },
          openCallOpportunity: (tile, duration = 5000) => {
            const deadline = new Date(Date.now() + duration);
            set({ currentCallOpportunity: { tile, callType: 'pung', duration, deadline, isActive: true } });
            setTimeout(() => get().actions.closeCallOpportunity(), duration);
          },
          respondToCall: async (_response, _callType, _tiles) => {
            console.log(`Responding to call: ${_response}`);
            return true;
          },
          closeCallOpportunity: () => set({ currentCallOpportunity: null }),
          updateDiscardPile: (tile, _playerId) => set((state) => ({ discardPile: [...state.discardPile, tile] })),
          updateWallCount: (count) => set({ wallCount: Math.max(0, count), wallTilesRemaining: Math.max(0, count) }),
          getCurrentPlayerData: () => get().players.find((p) => p.id === get().currentPlayerId) || null,
          getNextPlayer: () => {
            const state = get();
            if (!state.currentPlayerId || state.turnOrder.length === 0) return null;
            const currentIndex = state.turnOrder.indexOf(state.currentPlayerId);
            if (currentIndex === -1) return null;
            const nextPlayerId = state.turnOrder[(currentIndex + 1) % state.turnOrder.length];
            return state.players.find((p) => p.id === nextPlayerId) || null;
          },
          isCurrentPlayerTurn: (playerId) => get().currentPlayerId === playerId,
          getTurnOrderDisplay: () => {
            const state = get();
            return state.players.map((player) => {
              const isCurrent = player.id === state.currentPlayerId;
              const nextPlayer = state.actions.getNextPlayer();
              const isNext = player.id === nextPlayer?.id;
              return { player, isCurrent, isNext };
            });
          },
          getPlayerActions: (playerId) => get().playerActions[playerId] || null,
        },
      }),
      {
        name: 'game-store',
        partialize: (state) => ({
          playerHand: state.playerHand,
          exposedTiles: state.exposedTiles,
          targetPatterns: state.targetPatterns,
          // Persisted parts from turn-store
          phase: state.phase,
          gamePhase: state.gamePhase,
          turnNumber: state.turnNumber,
          roundNumber: state.roundNumber,
          currentWind: state.currentWind,
          turnStartTime: state.turnStartTime,
          turnDuration: state.turnDuration,
          players: state.players,
          isGameActive: state.isGameActive,
          currentPlayerId: state.currentPlayerId,
          currentTurn: state.currentTurn,
          wallTilesRemaining: state.wallTilesRemaining,
          coPilotMode: state.coPilotMode,
        }),
      }
    ),
    { name: 'GameStore' }
  )
);
