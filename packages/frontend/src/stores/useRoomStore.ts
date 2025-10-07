import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Socket } from 'socket.io-client';
import type { Room } from '@shared-types/room-types';
import { useUIStore } from './useUIStore';

export type CoPilotMode = 'solo' | 'everyone';
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
export type PlayerPosition = 'north' | 'east' | 'south' | 'west';
export type RoomStatus = 'idle' | 'creating' | 'joining' | 'success' | 'error';

// Combined state from all five stores
interface RoomState {
  // From connection.store
  connectionStatus: ConnectionStatus;
  reconnectionAttempts: number;
  socketId: string | null;
  connectionError: string | null;

  // From room-setup.store
  setup: { mode: CoPilotMode; step: string; };
  coPilotModeSelected: boolean;
  roomCreationStatus: RoomStatus;
  joinRoomStatus: RoomStatus;
  error: string | null;

  // From player.store
  currentPlayerId: string | null;
  playerPositions: Record<string, PlayerPosition>;
  otherPlayerNames: string[];

  // From room.store & multiplayer-store
  room: Room | null;
  roomCode: string | null;
  availableRooms: Room[];
  isHost: boolean;

  // From multiplayer-store
  gameState: GameState | null;
  socket: Socket | null;

  actions: any; // Using any for actions due to complexity
}

const ALL_POSITIONS: PlayerPosition[] = ['north', 'east', 'south', 'west'];

const initialState = {
  connectionStatus: 'disconnected' as ConnectionStatus,
  reconnectionAttempts: 0,
  socketId: null,
  connectionError: null,
  setup: { mode: 'solo' as CoPilotMode, step: 'initial' },
  coPilotModeSelected: false,
  roomCreationStatus: 'idle' as RoomStatus,
  joinRoomStatus: 'idle' as RoomStatus,
  error: null,
  currentPlayerId: null,
  playerPositions: {},
  otherPlayerNames: [],
  room: null,
  roomCode: null,
  availableRooms: [],
  isHost: false,
  gameState: null,
  socket: null,
};

export const useRoomStore = create<RoomState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        actions: {
          // --- Merged Actions ---
          setConnectionStatus: (status) => set({ connectionStatus: status }),
          setReconnectionAttempts: (attempts) => set({ reconnectionAttempts: attempts }),
          setConnectionError: (error) => set({ connectionError: error, connectionStatus: error ? 'error' : get().connectionStatus }),
          setMode: (mode) => set((state) => ({ setup: { ...state.setup, mode }, coPilotModeSelected: true })),
          setSetupStep: (step) => set((state) => ({ setup: { ...state.setup, step } })),
          setCurrentPlayerId: (playerId) => set((state) => ({ currentPlayerId: playerId, isHost: state.room?.hostId === playerId })),
          setPlayerPosition: (playerId, position) => set((state) => {
            const clearedPositions = Object.entries(state.playerPositions).reduce((acc, [pid, pos]) => {
              if (pos !== position) acc[pid] = pos;
              return acc;
            }, {} as Record<string, PlayerPosition>);
            return { playerPositions: { ...clearedPositions, [playerId]: position } };
          }),
          clearPlayerPosition: (playerId) => set((state) => {
            const newPositions = { ...state.playerPositions };
            delete newPositions[playerId];
            return { playerPositions: newPositions };
          }),
          setOtherPlayerNames: (names) => set({ otherPlayerNames: names }),
          clearPlayerData: () => set({ currentPlayerId: null, playerPositions: {}, otherPlayerNames: [] }),
          setCurrentRoom: (room) => set((state) => ({ room, isHost: room ? room.hostId === state.currentPlayerId : false, gameState: !room ? null : state.gameState })),
          clearCurrentRoom: () => set({ room: null, gameState: null, isHost: false }),
          updateAvailableRooms: (rooms) => set({ availableRooms: rooms }),
          addPlayerToRoom: (player) => set((state) => (state.room ? { room: { ...state.room, players: [...state.room.players, player] } } : {})),
          removePlayerFromRoom: (playerId) => set((state) => (state.room ? { room: { ...state.room, players: state.room.players.filter((p) => p.id !== playerId) } } : {})),
          updatePlayer: (playerId, updates) => set((state) => (state.room ? { room: { ...state.room, players: state.room.players.map((p) => (p.id === playerId ? { ...p, ...updates } : p)) } } : {})),
          setGameState: (gameState) => set({ gameState }),
          updateGamePhase: (phase) => set((state) => (state.gameState ? { gameState: { ...state.gameState, phase, lastUpdated: new Date() } } : {})),
          updatePlayerGameState: (playerId, stateUpdate) => set((state) => (state.gameState ? { gameState: { ...state.gameState, playerStates: { ...state.gameState.playerStates, [playerId]: { ...state.gameState.playerStates[playerId], ...stateUpdate } }, lastUpdated: new Date() } } : {})),
          updateSharedGameState: (stateUpdate) => set((state) => (state.gameState ? { gameState: { ...state.gameState, sharedState: { ...state.gameState.sharedState, ...stateUpdate }, lastUpdated: new Date() } } : {})),
          clearAll: () => set(initialState),
          // from room-setup
          setRoomCreationStatus: (status) => set({ roomCreationStatus: status }),
          handleRoomCreationError: (error) => set({ roomCreationStatus: 'error', error }),
          setJoinRoomStatus: (status) => set({ joinRoomStatus: status }),
          handleRoomJoined: (roomCode) => set({ joinRoomStatus: 'success', roomCode }),
          handleRoomJoinError: (error) => set({ joinRoomStatus: 'error', error }),
          isValidRoomCode: (code) => /^[A-Z]{4}$/.test(code.toUpperCase()),
          clearError: () => set({ error: null }),
          // --- Merged Getters ---
          getCurrentPlayer: () => {
            const { room, currentPlayerId } = get();
            const devPlayerId = useUIStore.getState().dev.activeDevPlayerId;
            const effectivePlayerId = devPlayerId || currentPlayerId;
            if (!room || !effectivePlayerId) return null;
            return room.players.find((p) => p.id === effectivePlayerId) || null;
          },
          getAvailablePositions: () => {
            const { playerPositions } = get();
            const takenPositions = Object.values(playerPositions);
            return ALL_POSITIONS.filter(pos => !takenPositions.includes(pos));
          },
          isPositionTaken: (position) => Object.values(get().playerPositions).includes(position),
          getCurrentPlayerPosition: () => {
            const { currentPlayerId, playerPositions } = get();
            const devPlayerId = useUIStore.getState().dev.activeDevPlayerId;
            const effectivePlayerId = devPlayerId || currentPlayerId;
            return effectivePlayerId ? playerPositions[effectivePlayerId] || null : null;
          },
        },
      }),
      {
        name: 'room-store',
        storage: {
          getItem: (name) => {
            const str = sessionStorage.getItem(name);
            if (!str) return null;
            return JSON.parse(str);
          },
          setItem: (name, value) => {
            sessionStorage.setItem(name, JSON.stringify(value));
          },
          removeItem: (name) => sessionStorage.removeItem(name),
        },
        partialize: (state) => ({
          roomCode: state.roomCode,
          currentPlayerId: state.currentPlayerId,
          room: state.room,
          playerPositions: state.playerPositions,
          otherPlayerNames: state.otherPlayerNames,
          setup: state.setup,
        }),
      }
    ),
    { name: 'RoomStore' }
  )
);
