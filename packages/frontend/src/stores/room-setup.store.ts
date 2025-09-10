import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export type CoPilotMode = 'everyone' | 'solo';
export type RoomStatus = 'idle' | 'creating' | 'joining' | 'success' | 'error';

interface RoomSetupProgress {
  currentStep: 'mode-selection' | 'room-creation' | 'player-positioning' | 'ready';
  completedSteps: number;
  totalSteps: number;
}

interface RoomSetupStore {
  // UI state
  coPilotMode: CoPilotMode;
  coPilotModeSelected: boolean; // Track if mode was explicitly selected
  roomCreationStatus: RoomStatus;
  joinRoomStatus: RoomStatus;
  error: string | null;
  
  // Actions - Co-pilot mode
  setCoPilotMode: (mode: CoPilotMode) => void;
  resetCoPilotModeSelection: () => void;
  getCoPilotModeDescription: (mode: CoPilotMode) => string;
  
  // Actions - Room creation
  setRoomCreationStatus: (status: RoomStatus) => void;
  handleRoomCreated: (roomCode: string, hostPlayerId: string, otherPlayerNames?: string[]) => void;
  handleRoomCreationError: (error: string) => void;
  
  // Actions - Room joining
  setJoinRoomStatus: (status: RoomStatus) => void;
  handleRoomJoined: (roomCode: string) => void;
  handleRoomJoinError: (error: string) => void;
  
  // Actions - Validation
  isValidRoomCode: (code: string) => boolean;
  
  // Actions - State management
  clearError: () => void;
  clearAll: () => void;
  resetToStart: () => void;
  
  // Computed properties
  getRoomSetupProgress: () => RoomSetupProgress;
  canProceedToNextStep: () => boolean;
  getCurrentStepTitle: () => string;
}

export const useRoomSetupStore = create<RoomSetupStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        coPilotMode: 'everyone',
        coPilotModeSelected: false,
        roomCreationStatus: 'idle',
        joinRoomStatus: 'idle',
        error: null,

        // Actions - Co-pilot mode
        setCoPilotMode: (mode) => set({ 
          coPilotMode: mode, 
          coPilotModeSelected: true,
          error: null
        }),

        resetCoPilotModeSelection: () => set({ 
          coPilotModeSelected: false,
          error: null 
        }),

        getCoPilotModeDescription: (mode) => {
          const descriptions = {
            everyone: 'All players use their devices as intelligent co-pilots during the game',
            solo: 'You play alone with the co-pilot while others use physical tiles only'
          };
          return descriptions[mode];
        },

        // Actions - Room creation
        setRoomCreationStatus: (status) => set({ 
          roomCreationStatus: status,
          error: status === 'error' ? null : get().error // Clear error unless setting error status
        }),

        handleRoomCreated: (roomCode, hostPlayerId, otherPlayerNames) => {
          set({ 
            roomCreationStatus: 'success',
            error: null 
          });
          
          // Update room store through actions
          const { useRoomStore } = require('./room.store');
          const { usePlayerStore } = require('./player.store');
          
          useRoomStore.getState().updateRoom({ id: roomCode });
          usePlayerStore.getState().setCurrentPlayerId(hostPlayerId);
          
          if (otherPlayerNames) {
            usePlayerStore.getState().setOtherPlayerNames(otherPlayerNames);
          }
        },

        handleRoomCreationError: (error) => set({ 
          roomCreationStatus: 'error',
          error 
        }),

        // Actions - Room joining
        setJoinRoomStatus: (status) => set({ 
          joinRoomStatus: status,
          error: status === 'error' ? null : get().error
        }),

        handleRoomJoined: (roomCode) => {
          set({ 
            joinRoomStatus: 'success',
            error: null 
          });
          
          // Update room store
          const { useRoomStore } = require('./room.store');
          useRoomStore.getState().updateRoom({ id: roomCode });
        },

        handleRoomJoinError: (error) => set({ 
          joinRoomStatus: 'error',
          error 
        }),

        // Actions - Validation
        isValidRoomCode: (code) => {
          return /^[A-Z]{4}[0-9]{3}$/.test(code.toUpperCase());
        },

        // Actions - State management
        clearError: () => set({ error: null }),

        clearAll: () => set({
          coPilotMode: 'everyone',
          coPilotModeSelected: false,
          roomCreationStatus: 'idle',
          joinRoomStatus: 'idle',
          error: null
        }),

        resetToStart: () => {
          const { clearAll } = get();
          clearAll();
          
          // Also clear related stores
          const { useRoomStore } = require('./room.store');
          const { usePlayerStore } = require('./player.store');
          const { useConnectionStore } = require('./connection.store');
          
          useRoomStore.getState().updateRoom({ id: null } as any);
          usePlayerStore.getState().clearPlayerData();
          useConnectionStore.getState().resetConnectionState();
        },

        // Computed properties
        getRoomSetupProgress: () => {
          const { coPilotModeSelected, roomCreationStatus, joinRoomStatus } = get();
          
          let currentStep: RoomSetupProgress['currentStep'] = 'mode-selection';
          let completedSteps = 0;
          const totalSteps = 4;
          
          if (coPilotModeSelected) {
            completedSteps = 1;
            currentStep = 'room-creation';
          }
          
          if (roomCreationStatus === 'success' || joinRoomStatus === 'success') {
            completedSteps = 2;
            currentStep = 'player-positioning';
          }
          
          // Additional steps would be determined by room store state
          const { useRoomStore } = require('./room.store');
          const { isRoomReadyForGame } = useRoomStore.getState();
          
          if (isRoomReadyForGame()) {
            completedSteps = 3;
            currentStep = 'ready';
          }
          
          return { currentStep, completedSteps, totalSteps };
        },

        canProceedToNextStep: () => {
          const { currentStep } = get().getRoomSetupProgress();
          const { coPilotModeSelected, roomCreationStatus, joinRoomStatus } = get();
          
          switch (currentStep) {
            case 'mode-selection':
              return coPilotModeSelected;
            case 'room-creation':
              return roomCreationStatus === 'success' || joinRoomStatus === 'success';
            case 'player-positioning':
              const { useRoomStore } = require('./room.store');
              return useRoomStore.getState().isRoomReadyForGame();
            case 'ready':
              return true;
            default:
              return false;
          }
        },

        getCurrentStepTitle: () => {
          const { currentStep } = get().getRoomSetupProgress();
          
          const titles = {
            'mode-selection': 'Choose Co-Pilot Mode',
            'room-creation': 'Create or Join Room',
            'player-positioning': 'Set Player Positions',
            'ready': 'Ready to Play'
          };
          
          return titles[currentStep];
        },
      }),
      {
        name: 'room-setup-store',
        // Persist user preferences and current state
        partialize: (state) => ({
          coPilotMode: state.coPilotMode,
          coPilotModeSelected: state.coPilotModeSelected,
        }),
      }
    ),
    { name: 'room-setup-store' }
  )
);