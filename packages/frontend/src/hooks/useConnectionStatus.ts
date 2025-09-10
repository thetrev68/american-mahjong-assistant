// Connection Status Utilities
// Separate file to avoid Fast Refresh issues

import { useSocket } from './useSocket'
import { useRoomStore } from '../stores/room-store'

// Hook for connection status data
export function useConnectionStatus() {
  const socket = useSocket()
  const roomStore = useRoomStore()
  
  return {
    isConnected: socket.isConnected,
    isHealthy: socket.connectionHealth.isHealthy,
    latency: socket.connectionHealth.latency,
    socketId: socket.socketId,
    reconnectAttempts: roomStore.connectionStatus.reconnectionAttempts,
    queuedEvents: socket.eventQueue.length,
    lastError: socket.lastError,
    canRetry: !socket.isConnected
  }
}