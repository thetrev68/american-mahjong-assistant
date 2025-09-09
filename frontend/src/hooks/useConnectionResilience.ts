// Connection Resilience Integration Hook
// Centralized hook that coordinates all connection resilience services

import { useEffect, useCallback, useState, useMemo } from 'react'
import { useSocket } from './useSocket'
import { 
  getConnectionResilienceService,
  destroyConnectionResilience 
} from '../services/connection-resilience'
import { 
  getNetworkErrorHandler, 
  handleSocketError,
  onConnectionSuccess,
  isNetworkHealthy 
} from '../services/network-error-handler'
import { 
  getDisconnectionManager,
  initiateLeaveRoom,
  handleNetworkError,
  handleServerShutdown 
} from '../services/disconnection-manager'
import { useRoomStore } from '../stores/room-store'
import { useGameStore } from '../stores/game-store'

export interface ConnectionResilienceConfig {
  enableAutoReconnect?: boolean
  enableStateRecovery?: boolean
  maxReconnectAttempts?: number
  heartbeatInterval?: number
  showConnectionIndicator?: boolean
}

export interface ConnectionResilienceState {
  isConnected: boolean
  isReconnecting: boolean
  connectionHealth: 'healthy' | 'degraded' | 'poor' | 'offline'
  reconnectAttempts: number
  maxAttempts: number
  canRecover: boolean
  hasQueuedEvents: boolean
  lastError: string | null
}

const DEFAULT_CONFIG: ConnectionResilienceConfig = {
  enableAutoReconnect: true,
  enableStateRecovery: true,
  maxReconnectAttempts: 5,
  heartbeatInterval: 15000,
  showConnectionIndicator: true
}

export function useConnectionResilience(config: ConnectionResilienceConfig = {}) {
  const socket = useSocket()
  const roomStore = useRoomStore()
  const gameStore = useGameStore()
  const finalConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config])
  
  const [resilienceState, setResilienceState] = useState<ConnectionResilienceState>({
    isConnected: false,
    isReconnecting: false,
    connectionHealth: 'offline',
    reconnectAttempts: 0,
    maxAttempts: finalConfig.maxReconnectAttempts || 5,
    canRecover: false,
    hasQueuedEvents: false,
    lastError: null
  })

  // Get existing service instance (do not initialize here to prevent multiple instances)
  useEffect(() => {
    const resilienceService = getConnectionResilienceService()
    if (!resilienceService) {
      // Only warn if we're actually in a multiplayer context (not on landing page)
      const roomStore = useRoomStore.getState()
      if (roomStore.currentRoomCode || roomStore.hostPlayerId) {
        console.warn('Connection resilience service not initialized in multiplayer context.')
      }
      return
    }

    // Initialize with socket instance only once
    if (socket) {
      resilienceService.initialize(socket)
    }

    // Unused variable fix
    void resilienceService

    return () => {
      destroyConnectionResilience()
    }
  }, [finalConfig, socket]) // Include socket but prevent reinitializing with service singleton

  // Monitor connection state changes
  useEffect(() => {
    const updateResilienceState = () => {
      const networkHandler = getNetworkErrorHandler()
      const disconnectionManager = getDisconnectionManager()
      const resilienceService = getConnectionResilienceService()
      
      // If no services are initialized, provide basic socket-only state
      if (!networkHandler || !disconnectionManager || !resilienceService) {
        setResilienceState({
          isConnected: socket.isConnected,
          isReconnecting: false,
          connectionHealth: socket.isConnected ? 'healthy' : 'offline',
          reconnectAttempts: 0,
          maxAttempts: finalConfig.maxReconnectAttempts || 5,
          canRecover: false,
          hasQueuedEvents: socket.eventQueue.length > 0,
          lastError: socket.lastError
        })
        return
      }
      
      const networkHealth = networkHandler.getNetworkHealth()
      const connectionHealth = resilienceService?.getConnectionHealth(socket)
      
      setResilienceState({
        isConnected: socket.isConnected,
        isReconnecting: connectionHealth?.status === 'reconnecting' || false,
        connectionHealth: networkHealth.status,
        reconnectAttempts: networkHealth.consecutiveFailures,
        maxAttempts: finalConfig.maxReconnectAttempts || 5,
        canRecover: disconnectionManager.canRecover(),
        hasQueuedEvents: socket.eventQueue.length > 0,
        lastError: socket.lastError
      })
    }

    // Defer initial update to avoid React render cycle issues
    setTimeout(updateResilienceState, 0)
    
    // Only run frequent updates if we're in multiplayer context
    const roomStore = useRoomStore.getState()
    const updateInterval = (roomStore.currentRoomCode || roomStore.hostPlayerId) ? 2000 : 10000
    const interval = setInterval(updateResilienceState, updateInterval)

    return () => clearInterval(interval)
  }, [socket, socket.isConnected, socket.eventQueue.length, socket.lastError, finalConfig.maxReconnectAttempts])

  // Handle socket connection events
  useEffect(() => {
    const handleConnect = () => {
      console.log('Socket connected - triggering success handlers')
      onConnectionSuccess()
    }

    const handleDisconnect = (...args: unknown[]) => {
      const reason = args[0] as string
      console.log('Socket disconnected:', reason)
      handleNetworkError(`Connection lost: ${reason}`)
    }

    const handleConnectError = (...args: unknown[]) => {
      const error = args[0] as Error
      console.error('Socket connection error:', error)
      handleSocketError(error, 'socket-connection')
    }

    // Set up socket event listeners
    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('connect_error', handleConnectError)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('connect_error', handleConnectError)
    }
  }, [socket])

  // Manual retry function
  const retryConnection = useCallback(() => {
    console.log('Manual retry triggered')
    const networkHandler = getNetworkErrorHandler()
    networkHandler.manualRetry(socket)
  }, [socket])

  // Graceful leave room
  const leaveRoom = useCallback(async () => {
    console.log('Initiating graceful room leave')
    await initiateLeaveRoom()
  }, [])

  // Force disconnect (for testing or emergency)
  const forceDisconnect = useCallback(() => {
    console.log('Force disconnect triggered')
    socket.disconnect()
  }, [socket])

  // Check if operation is safe (network is healthy)
  const isOperationSafe = useCallback(() => {
    return isNetworkHealthy()
  }, [])

  // Get detailed connection info
  const getConnectionDetails = useCallback(() => {
    const networkHandler = getNetworkErrorHandler()
    const resilienceService = getConnectionResilienceService()
    
    return {
      socket: {
        id: socket.socketId,
        connected: socket.isConnected,
        health: socket.connectionHealth
      },
      network: networkHandler.getNetworkHealth(),
      resilience: resilienceService?.getConnectionHealth(),
      room: roomStore.connectionStatus
    }
  }, [socket.socketId, socket.isConnected, socket.connectionHealth, roomStore.connectionStatus])

  // Recovery functions
  const attemptRecovery = useCallback(async () => {
    const disconnectionManager = getDisconnectionManager()
    
    if (!disconnectionManager.canRecover()) {
      throw new Error('No recovery data available')
    }

    const recoveryData = disconnectionManager.getRecoveryData()
    if (!recoveryData || !recoveryData.roomId) {
      throw new Error('Invalid recovery data')
    }

    console.log('Attempting recovery with data:', recoveryData)
    
    // Clear old recovery data
    disconnectionManager.clearRecoveryData()
    
    // Try to reconnect to the room
    // This would typically involve calling room service methods
    gameStore.addAlert({
      type: 'info',
      title: 'Recovering Session',
      message: 'Attempting to restore your previous session...'
    })

    return recoveryData
  }, [gameStore])

  const clearRecoveryData = useCallback(() => {
    const disconnectionManager = getDisconnectionManager()
    disconnectionManager.clearRecoveryData()
  }, [])

  // Server shutdown handler
  const handleServerMaintenance = useCallback(async () => {
    console.log('Server maintenance detected')
    await handleServerShutdown()
  }, [])

  // Network quality assessment
  const getNetworkQuality = useCallback(() => {
    const networkHandler = getNetworkErrorHandler()
    const health = networkHandler.getNetworkHealth()
    
    let quality: 'excellent' | 'good' | 'fair' | 'poor' | 'offline'
    
    if (!socket.isConnected) {
      quality = 'offline'
    } else if (health.latency === null) {
      quality = 'good' // Default when no latency data
    } else if (health.latency < 50) {
      quality = 'excellent'
    } else if (health.latency < 150) {
      quality = 'good'
    } else if (health.latency < 300) {
      quality = 'fair'
    } else {
      quality = 'poor'
    }
    
    return {
      quality,
      latency: health.latency,
      packetLoss: health.packetLoss,
      stability: health.consecutiveFailures === 0 ? 'stable' : 'unstable'
    }
  }, [socket.isConnected])

  return {
    // State
    ...resilienceState,
    
    // Config
    config: finalConfig,
    
    // Actions
    retryConnection,
    leaveRoom,
    forceDisconnect,
    
    // Recovery
    attemptRecovery,
    clearRecoveryData,
    
    // Utilities
    isOperationSafe,
    getConnectionDetails,
    getNetworkQuality,
    
    // Event handlers (for components that need custom handling)
    handleServerMaintenance,
    
    // Raw socket for advanced usage
    socket
  }
}

// Helper hook for simple connection monitoring
export function useConnectionStatus() {
  const { isConnected, connectionHealth, reconnectAttempts, hasQueuedEvents, lastError } = useConnectionResilience()
  
  return {
    isConnected,
    status: connectionHealth,
    isReconnecting: reconnectAttempts > 0,
    queuedActions: hasQueuedEvents,
    error: lastError
  }
}

// Helper hook for components that need to disable features during poor connections
export function useNetworkAware() {
  const { isConnected, connectionHealth, isOperationSafe } = useConnectionResilience()
  
  return {
    isOnline: isConnected,
    canPerformActions: isOperationSafe(),
    shouldShowOfflineMessage: !isConnected,
    shouldWarnAboutConnection: connectionHealth === 'poor' || connectionHealth === 'degraded',
    connectionQuality: connectionHealth
  }
}