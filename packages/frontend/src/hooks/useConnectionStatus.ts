// Connection Status Utilities
// Separate file to avoid Fast Refresh issues

import { useSocketContext } from './useSocketContext';
import { useRoomStore } from '../stores';

// Hook for connection status data
export function useConnectionStatus() {
  const socket = useSocketContext();
  const reconnectionAttempts = useRoomStore((s) => s.reconnectionAttempts);

  return {
    isConnected: socket.isConnected,
    isHealthy: socket.connectionHealth.isHealthy,
    latency: socket.connectionHealth.latency,
    socketId: socket.socketId,
    reconnectAttempts: reconnectionAttempts,
    queuedEvents: socket.eventQueue.length,
    lastError: socket.lastError,
    canRetry: !socket.isConnected,
  };
}