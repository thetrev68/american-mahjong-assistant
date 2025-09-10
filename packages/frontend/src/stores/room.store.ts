import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Room, Player } from 'shared-types';

export type PlayerPosition = 'north' | 'east' | 'south' | 'west';

interface CrossPhasePlayerState {
  id: string;
  name: string;
  isHost: boolean;
  isConnected: boolean;
  lastSeen: Date;
  roomReadiness: boolean;
  charlestonReadiness: boolean;
  gameplayReadiness: boolean;
  position?: PlayerPosition;
  isCurrentTurn?: boolean;
}

interface HostPermissions {
  canKickPlayers: boolean;
  canTransferHost: boolean;
  canChangeSettings: boolean;
  canStartGame: boolean;
  canPauseGame: boolean;
}

interface RoomSettings {
  maxPlayers: number;
  isPrivate: boolean;
  roomName?: string;
  gameMode: 'nmjl-2025' | 'custom';
  allowSpectators: boolean;
  spectatorMode: boolean;
  autoAdvanceTurns: boolean;
  turnTimeLimit: number;
  allowReconnection: boolean;
}

interface RoomStore {
  // Core room data
  room: Room | null;
  players: CrossPhasePlayerState[];
  hostPlayerId: string | null;
  currentRoomCode: string | null;
  spectators: Player[];
  
  // Room configuration
  hostPermissions: HostPermissions;
  roomSettings: RoomSettings;
  
  // Phase management
  currentPhase: 'waiting' | 'setup' | 'charleston' | 'playing' | 'scoring' | 'finished';
  phaseReadiness: Record<string, { room: boolean; charleston: boolean; gameplay: boolean }>;
  allPlayersReady: Record<string, boolean>;

  // Actions - Room management
  updateRoom: (newRoom: Partial<Room>) => void;
  updatePlayers: (players: CrossPhasePlayerState[]) => void;
  updatePlayerState: (playerId: string, updates: Partial<CrossPhasePlayerState>) => void;
  removePlayer: (playerId: string) => void;
  
  // Actions - Host management
  updateHostPermissions: (permissions: HostPermissions) => void;
  transferHost: (newHostId: string) => void;
  kickPlayer: (playerId: string) => void;
  
  // Actions - Room settings
  updateRoomSettings: (settings: Partial<RoomSettings>) => void;
  
  // Actions - Phase management
  setCurrentPhase: (phase: 'waiting' | 'setup' | 'charleston' | 'playing' | 'scoring' | 'finished') => void;
  setPlayerReadiness: (playerId: string, phase: 'room' | 'charleston' | 'gameplay', ready: boolean) => void;
  setPhaseReadiness: (phase: string, ready: boolean) => void;
  
  // Actions - Spectator management
  addSpectator: (spectator: Player) => void;
  removeSpectator: (spectatorId: string) => void;

  // Computed properties
  isHost: (playerId: string) => boolean;
  isRoomReadyForGame: () => boolean;
  isCurrentPlayerHost: () => boolean;
  getPlayerByPosition: (position: PlayerPosition) => CrossPhasePlayerState | null;
  getReadinessSummary: (phase: 'room' | 'charleston' | 'gameplay') => { ready: string[]; notReady: string[]; total: number };
}

const defaultHostPermissions: HostPermissions = {
  canKickPlayers: true,
  canTransferHost: true,
  canChangeSettings: true,
  canStartGame: true,
  canPauseGame: true,
};

const defaultRoomSettings: RoomSettings = {
  maxPlayers: 4,
  isPrivate: false,
  gameMode: 'nmjl-2025',
  allowSpectators: false,
  spectatorMode: false,
  autoAdvanceTurns: false,
  turnTimeLimit: 0,
  allowReconnection: true,
};

export const useRoomStore = create<RoomStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      room: null,
      players: [],
      hostPlayerId: null,
      currentRoomCode: null,
      spectators: [],
      hostPermissions: defaultHostPermissions,
      roomSettings: defaultRoomSettings,
      currentPhase: 'waiting',
      phaseReadiness: {},
      allPlayersReady: {},

      // Room management actions
      updateRoom: (newRoom) => set((state) => ({ 
        room: state.room ? { ...state.room, ...newRoom } : newRoom as Room 
      })),

      updatePlayers: (players) => set({ players }),

      updatePlayerState: (playerId, updates) => set((state) => ({
        players: state.players.map(player => 
          player.id === playerId ? { ...player, ...updates } : player
        )
      })),

      removePlayer: (playerId) => set((state) => ({
        players: state.players.filter(player => player.id !== playerId)
      })),

      // Host management actions
      updateHostPermissions: (permissions) => set((state) => ({
        hostPermissions: { ...state.hostPermissions, ...permissions }
      })),

      transferHost: (newHostId) => set((state) => ({
        hostPlayerId: newHostId,
        players: state.players.map(player => ({
          ...player,
          isHost: player.id === newHostId
        }))
      })),

      kickPlayer: (playerId) => {
        const { removePlayer } = get();
        removePlayer(playerId);
      },

      // Room settings actions
      updateRoomSettings: (settings) => set((state) => ({
        roomSettings: { ...state.roomSettings, ...settings }
      })),

      // Phase management actions
      setCurrentPhase: (phase) => set({ currentPhase: phase }),

      setPlayerReadiness: (playerId, phase, ready) => set((state) => ({
        phaseReadiness: {
          ...state.phaseReadiness,
          [playerId]: {
            ...state.phaseReadiness[playerId],
            [phase]: ready
          }
        }
      })),

      setPhaseReadiness: (phase, ready) => set((state) => ({
        allPlayersReady: { ...state.allPlayersReady, [phase]: ready }
      })),

      // Spectator management actions
      addSpectator: (spectator) => set((state) => ({
        spectators: [...state.spectators, spectator]
      })),

      removeSpectator: (spectatorId) => set((state) => ({
        spectators: state.spectators.filter(s => s.id !== spectatorId)
      })),

      // Computed properties
      isHost: (playerId) => {
        const { hostPlayerId } = get();
        return hostPlayerId === playerId;
      },

      isRoomReadyForGame: () => {
        const { players, roomSettings } = get();
        return players.length >= 2 && players.length <= roomSettings.maxPlayers &&
               players.every(p => p.roomReadiness);
      },

      isCurrentPlayerHost: () => {
        // Note: This would need the current player ID from a player store
        // For now, returning false as placeholder until components are refactored
        return false;
      },

      getPlayerByPosition: (position) => {
        const { players } = get();
        return players.find(p => p.position === position) || null;
      },

      getReadinessSummary: (phase) => {
        const { players } = get();
        const ready = players.filter(p => {
          switch (phase) {
            case 'room': return p.roomReadiness;
            case 'charleston': return p.charlestonReadiness;
            case 'gameplay': return p.gameplayReadiness;
            default: return false;
          }
        }).map(p => p.id);
        
        const notReady = players.filter(p => !ready.includes(p.id)).map(p => p.id);
        
        return { ready, notReady, total: players.length };
      },
    }),
    { name: 'room-store' }
  )
);