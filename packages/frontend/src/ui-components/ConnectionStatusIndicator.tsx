// Connection Status Indicator
// Visual feedback for connection health, reconnection attempts, and network status

import { useState, useEffect } from 'react';
import { useSocketContext } from '../hooks/useSocketContext';
import { useRoomStore, useGameStore } from '../stores';
import { getNetworkErrorHandler } from '../lib/services/network-error-handler';
import { getConnectionResilienceService } from '../lib/services/connection-resilience';

interface ConnectionStatusProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

export function ConnectionStatusIndicator({ position = 'top-right', showDetails = false, compact = false, className = '' }: ConnectionStatusProps) {
  const roomStore = useRoomStore();
  const gameStore = useGameStore();
  const socket = useSocketContext();
  const [showTooltip, setShowTooltip] = useState(false);
  const [connectionHealth, setConnectionHealth] = useState<any>();

  useEffect(() => {
    const updateHealth = () => {
      const resilienceService = getConnectionResilienceService();
      if (resilienceService) {
        setConnectionHealth(resilienceService.getConnectionHealth(socket));
      }
    };
    updateHealth();
    const interval = setInterval(updateHealth, 2000);
    return () => clearInterval(interval);
  }, [socket]);

  const getConnectionStatus = () => {
    const networkHandler = getNetworkErrorHandler();
    const networkHealth = networkHandler.getNetworkHealth();
    if (!socket.isConnected) {
      if (connectionHealth?.status === 'reconnecting') {
        return { status: 'reconnecting', color: 'bg-yellow-500', icon: '🔄', text: 'Reconnecting...', description: `Attempt ${connectionHealth.attempt}/${connectionHealth.maxAttempts}` };
      } else if (connectionHealth?.status === 'failed') {
        return { status: 'failed', color: 'bg-red-500', icon: '❌', text: 'Disconnected', description: 'Connection failed. Manual retry required.' };
      } else {
        return { status: 'disconnected', color: 'bg-red-500', icon: '📶', text: 'Offline', description: 'Not connected to server' };
      }
    }
    switch (networkHealth.status) {
      case 'healthy':
        return { status: 'healthy', color: 'bg-green-500', icon: '✅', text: 'Connected', description: `Latency: ${networkHealth.latency || 'N/A'}ms` };
      case 'degraded':
        return { status: 'degraded', color: 'bg-yellow-500', icon: '⚠️', text: 'Degraded', description: `Slow connection. ${networkHealth.consecutiveFailures} recent issues` };
      case 'poor':
        return { status: 'poor', color: 'bg-orange-500', icon: '🔻', text: 'Poor', description: `Connection issues detected. Latency: ${networkHealth.latency || 'N/A'}ms` };
      default:
        return { status: 'unknown', color: 'bg-gray-500', icon: '❓', text: 'Unknown', description: 'Connection status unknown' };
    }
  };

  const status = getConnectionStatus();
  const positionClasses = { 'top-right': 'top-4 right-4', 'top-left': 'top-4 left-4', 'bottom-right': 'bottom-4 right-4', 'bottom-left': 'bottom-4 left-4' };

  const handleManualRetry = () => {
    const networkHandler = getNetworkErrorHandler();
    networkHandler.manualRetry(socket);
  };

  if (roomStore.setup.mode === 'solo') {
    return null;
  }

  if (compact) {
    return (
      <div
        className={`fixed z-50 ${positionClasses[position]} flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl text-gray-900 ${className}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className={`w-3 h-3 rounded-full ${status.color} animate-pulse`} />
        <span className="text-sm font-medium text-gray-700">{status.text}</span>
        {showTooltip && (
          <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap z-10">
            {status.description}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`fixed z-50 ${positionClasses[position]} bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl shadow-xl transition-all duration-300 p-4 min-w-64 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{status.icon}</span>
          <h3 className="text-sm font-semibold text-white">Connection Status</h3>
        </div>
        <div className={`w-3 h-3 rounded-full ${status.color}`} />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-300">Status:</span>
          <span className="text-sm font-medium text-white">{status.text}</span>
        </div>
        {socket.isConnected && (
          <>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">Latency:</span>
              <span className="text-sm text-white">{socket.connectionHealth.latency ? `${socket.connectionHealth.latency}ms` : 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">Socket ID:</span>
              <span className="text-xs text-gray-400 font-mono">{socket.socketId ? socket.socketId.slice(0, 8) + '...' : 'None'}</span>
            </div>
          </>
        )}
        {!socket.isConnected && connectionHealth?.status === 'reconnecting' && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-300">Attempt:</span>
            <span className="text-sm text-white">{connectionHealth.attempt}/{connectionHealth.maxAttempts}</span>
          </div>
        )}
        {roomStore.reconnectionAttempts > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-300">Retries:</span>
            <span className="text-sm text-white">{roomStore.reconnectionAttempts}</span>
          </div>
        )}
      </div>
      {showDetails && roomStore.room && (
        <>
          <div className="border-t border-white/10 mt-3 pt-3">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">Room:</span>
                <span className="text-sm text-white">{roomStore.room?.id || 'None'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">Phase:</span>
                <span className="text-sm text-white capitalize">{gameStore.phase}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">Players:</span>
                <span className="text-sm text-white">{roomStore.room.players.filter(p => p.isConnected).length}/{roomStore.room.players.length}</span>
              </div>
            </div>
          </div>
        </>
      )}
      <div className="border-t border-white/10 mt-3 pt-3 flex gap-2">
        {status.status === 'failed' && (
          <button onClick={handleManualRetry} className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors duration-200">Retry Connection</button>
        )}
        {socket.eventQueue.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <span>📤</span>
            <span>{socket.eventQueue.length} queued</span>
          </div>
        )}
      </div>
      {socket.lastError && (
        <div className="mt-2 p-2 bg-red-500/20 border border-red-500/30 rounded-lg">
          <div className="text-xs text-red-200"><strong>Last Error:</strong> {socket.lastError}</div>
        </div>
      )}
    </div>
  );
}

export function ConnectionStatusBar() {
  const socket = useSocketContext();
  const roomStore = useRoomStore();

  if (socket.isConnected && socket.connectionHealth.isHealthy) {
    return null;
  }

  const getStatusInfo = () => {
    if (!socket.isConnected) {
      return { color: 'bg-red-500', text: `Offline${roomStore.reconnectionAttempts > 0 ? ` (${roomStore.reconnectionAttempts} retries)` : ''}` };
    } else if (!socket.connectionHealth.isHealthy) {
      return { color: 'bg-yellow-500', text: `Connection Issues (${socket.connectionHealth.latency}ms)` };
    }
    return { color: 'bg-gray-500', text: 'Unknown' };
  };

  const status = getStatusInfo();

  return (
    <div className={`fixed top-0 left-0 right-0 z-40 ${status.color} px-4 py-2`}>
      <div className="flex items-center justify-center">
        <span className="text-white text-sm font-medium">{status.text}</span>
        {socket.eventQueue.length > 0 && (
          <span className="ml-2 text-white/80 text-xs">({socket.eventQueue.length} actions queued)</span>
        )}
      </div>
    </div>
  );
}