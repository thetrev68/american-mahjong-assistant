import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useRoomStore } from './room.store';

interface ConnectionStatus {
  isConnected: boolean;
  connectionId?: string;
  lastPing?: Date;
  reconnectionAttempts: number;
}

interface ConnectionStore {
  // Connection state
  connectionStatus: ConnectionStatus;
  
  // Actions - Connection management
  updateConnectionStatus: (status: Partial<ConnectionStatus>) => void;
  setPlayerConnection: (playerId: string, connected: boolean) => void;
  incrementReconnectionAttempts: () => void;
  resetReconnectionAttempts: () => void;
  updateLastPing: () => void;
  
  // Actions - Cleanup
  resetConnectionState: () => void;
  
  // Computed properties
  getConnectedPlayers: () => string[];
  getDisconnectedPlayers: () => string[];
  isFullyConnected: () => boolean;
  getConnectionHealth: () => 'healthy' | 'unstable' | 'poor' | 'disconnected';
}

const defaultConnectionStatus: ConnectionStatus = {
  isConnected: false,
  reconnectionAttempts: 0,
};

export const useConnectionStore = create<ConnectionStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      connectionStatus: defaultConnectionStatus,

      // Actions - Connection management
      updateConnectionStatus: (status) => set((state) => ({
        connectionStatus: { ...state.connectionStatus, ...status }
      })),

      setPlayerConnection: (playerId, connected) => {
        // Update player connection status in room store
        const { updatePlayerState } = useRoomStore.getState();
        updatePlayerState(playerId, { 
          isConnected: connected,
          lastSeen: connected ? new Date() : undefined
        });
      },

      incrementReconnectionAttempts: () => set((state) => ({
        connectionStatus: {
          ...state.connectionStatus,
          reconnectionAttempts: state.connectionStatus.reconnectionAttempts + 1
        }
      })),

      resetReconnectionAttempts: () => set((state) => ({
        connectionStatus: {
          ...state.connectionStatus,
          reconnectionAttempts: 0
        }
      })),

      updateLastPing: () => set((state) => ({
        connectionStatus: {
          ...state.connectionStatus,
          lastPing: new Date()
        }
      })),

      resetConnectionState: () => set({
        connectionStatus: defaultConnectionStatus
      }),

      // Computed properties
      getConnectedPlayers: () => {
        const { players } = useRoomStore.getState();
        return players.filter(p => p.isConnected).map(p => p.id);
      },

      getDisconnectedPlayers: () => {
        const { players } = useRoomStore.getState();
        return players.filter(p => !p.isConnected).map(p => p.id);
      },

      isFullyConnected: () => {
        const { connectionStatus } = get();
        const { players } = useRoomStore.getState();
        
        return connectionStatus.isConnected && 
               players.length > 0 && 
               players.every(p => p.isConnected);
      },

      getConnectionHealth: () => {
        const { connectionStatus } = get();
        const { lastPing, isConnected, reconnectionAttempts } = connectionStatus;
        
        if (!isConnected) return 'disconnected';
        
        if (reconnectionAttempts > 3) return 'poor';
        
        if (lastPing && Date.now() - lastPing.getTime() > 10000) {
          return 'unstable';
        }
        
        return 'healthy';
      },
    }),
    { name: 'connection-store' }
  )
);