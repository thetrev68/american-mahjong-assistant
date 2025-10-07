// Connection Status Utilities
// Separate file to avoid Fast Refresh issues

import { useSocketContext } from '../contexts/SocketContext'
import { useConnectionStore } from '../stores/connection.store'

// Hook for connection status data
export function useConnectionStatus() {
  const socket = useSocketContext()
  const connectionStore = useConnectionStore()
  
  return {
    isConnected: socket.isConnected,
    isHealthy: socket.connectionHealth.isHealthy,
    latency: socket.connectionHealth.latency,
    socketId: socket.socketId,
    reconnectAttempts: connectionStore.connectionStatus.reconnectionAttempts,
    queuedEvents: socket.eventQueue.length,
    lastError: socket.lastError,
    canRetry: !socket.isConnected
  }
}