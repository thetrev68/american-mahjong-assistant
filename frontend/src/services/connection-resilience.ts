// Connection Resilience Service
// Comprehensive reconnection handling, state recovery, and network error management

import { useSocket } from '../hooks/useSocket'
import { useRoomStore } from '../stores/room-store'
import { useGameStore } from '../stores/game-store'
import { useTurnStore } from '../stores/turn-store'
import { useCharlestonStore } from '../stores/charleston-store'
import { getRoomMultiplayerService } from './room-multiplayer'

// Global flag to prevent repeated disconnection logging across all instances
let globalDisconnectionHandled = false

export interface ReconnectionStrategy {
  maxAttempts: number
  initialDelay: number
  maxDelay: number
  backoffMultiplier: number
  jitterMax: number
}

export interface StateRecoveryOptions {
  recoverRoomState: boolean
  recoverPlayerStates: boolean
  recoverGamePhase: boolean
  recoverTurnState: boolean
  recoverCharlestonState: boolean
}

export interface ConnectionResilienceConfig {
  reconnectionStrategy: ReconnectionStrategy
  stateRecovery: StateRecoveryOptions
  enableAutoReconnect: boolean
  enableStateSync: boolean
  heartbeatInterval: number
  connectionTimeout: number
}

const DEFAULT_CONFIG: ConnectionResilienceConfig = {
  reconnectionStrategy: {
    maxAttempts: 5,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitterMax: 1000
  },
  stateRecovery: {
    recoverRoomState: true,
    recoverPlayerStates: true,
    recoverGamePhase: true,
    recoverTurnState: true,
    recoverCharlestonState: true
  },
  enableAutoReconnect: true,
  enableStateSync: true,
  heartbeatInterval: 15000,
  connectionTimeout: 10000
}

export class ConnectionResilienceService {
  private config: ConnectionResilienceConfig
  private reconnectionTimer: NodeJS.Timeout | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null
  private connectionTimeoutTimer: NodeJS.Timeout | null = null
  private currentAttempt = 0
  private isReconnecting = false
  private hasHandledDisconnection = false
  private lastKnownState: Record<string, unknown> = {}

  constructor(config: Partial<ConnectionResilienceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  // Initialize connection resilience
  initialize(socketInstance: ReturnType<typeof useSocket>): void {
    // Monitor connection state changes
    if (socketInstance.isConnected) {
      this.onConnectionEstablished()
    } else {
      this.onConnectionLost()
    }

    this.startHeartbeat(socketInstance)
  }

  // Handle connection established
  private onConnectionEstablished(): void {
    this.clearReconnectionTimer()
    this.currentAttempt = 0
    this.isReconnecting = false
    this.hasHandledDisconnection = false
    globalDisconnectionHandled = false // Reset global flag
    
    // Trigger state recovery if needed
    if (this.config.enableStateSync) {
      this.initiateStateRecovery()
    }

    // Update connection status in stores - defer to avoid React render cycle issues
    setTimeout(() => {
      try {
        useRoomStore.getState().updateConnectionStatus({
          isConnected: true,
          reconnectionAttempts: 0
        })

        useGameStore.getState().addAlert({
          type: 'success',
          title: 'Connected',
          message: 'Connection established successfully'
        })
      } catch (error) {
        console.warn('Failed to update connection status:', error)
      }
    }, 0)
  }

  // Handle connection lost
  private onConnectionLost(): void {
    // Only handle if not already processing a disconnection or already handled globally
    if (this.isReconnecting || this.hasHandledDisconnection || globalDisconnectionHandled) {
      return
    }

    // Mark as handled to prevent repeated calls (both instance and global)
    this.hasHandledDisconnection = true
    globalDisconnectionHandled = true

    // Check if auto-reconnection is enabled and we haven't exceeded max attempts
    if (!this.config.enableAutoReconnect || this.currentAttempt >= this.config.reconnectionStrategy.maxAttempts) {
      console.log('Auto-reconnection disabled or max attempts reached')
      this.onReconnectionFailed()
      return
    }

    // Log once and preserve state (only first instance logs)
    console.log('Connection lost - starting auto-reconnection process')

    // Preserve current state for recovery
    this.preserveCurrentState()

    // Update connection status - defer to avoid React render cycle issues
    setTimeout(() => {
      try {
        useRoomStore.getState().updateConnectionStatus({
          isConnected: false
        })

        if (this.currentAttempt === 0) {
          // Only show alert on first disconnection, not on retry attempts
          useGameStore.getState().addAlert({
            type: 'warning',
            title: 'Connection Lost',
            message: 'Attempting to reconnect...'
          })
        }
      } catch (error) {
        console.warn('Failed to update connection status:', error)
      }
    }, 0)
  }

  // Start reconnection process with exponential backoff
  private startReconnection(socketInstance?: ReturnType<typeof useSocket>): void {
    if (this.isReconnecting || this.currentAttempt >= this.config.reconnectionStrategy.maxAttempts) {
      this.onReconnectionFailed()
      return
    }

    this.isReconnecting = true
    this.currentAttempt++

    // Calculate delay with exponential backoff and jitter
    const baseDelay = Math.min(
      this.config.reconnectionStrategy.initialDelay * 
      Math.pow(this.config.reconnectionStrategy.backoffMultiplier, this.currentAttempt - 1),
      this.config.reconnectionStrategy.maxDelay
    )

    const jitter = Math.random() * this.config.reconnectionStrategy.jitterMax
    const delay = baseDelay + jitter

    useGameStore.getState().addAlert({
      type: 'info',
      title: 'Reconnecting',
      message: `Attempt ${this.currentAttempt}/${this.config.reconnectionStrategy.maxAttempts}`
    })

    this.reconnectionTimer = setTimeout(() => {
      if (socketInstance) {
        this.attemptReconnection(socketInstance)
      }
    }, delay)

    // Update reconnection attempts in store - defer to avoid React render cycle issues
    setTimeout(() => {
      try {
        useRoomStore.getState().updateConnectionStatus({
          reconnectionAttempts: this.currentAttempt
        })
      } catch (error) {
        console.warn('Failed to update reconnection attempts:', error)
      }
    }, 0)
  }

  // Attempt to reconnect (will be called from hook)
  private attemptReconnection(socketInstance: ReturnType<typeof useSocket>): void {
    try {
      socketInstance.connect()
      
      // Set up connection timeout
      this.connectionTimeoutTimer = setTimeout(() => {
        if (!socketInstance.isConnected) {
          this.onConnectionTimeout()
        }
      }, this.config.connectionTimeout)

    } catch (error) {
      console.error('Reconnection attempt failed:', error)
      this.isReconnecting = false
      
      // Try again if we haven't exceeded max attempts
      setTimeout(() => {
        this.startReconnection(socketInstance)
      }, 100)
    }
  }

  // Handle connection timeout
  private onConnectionTimeout(): void {
    this.clearConnectionTimeoutTimer()
    this.isReconnecting = false
    
    useGameStore.getState().addAlert({
      type: 'warning',
      title: 'Connection Timeout',
      message: 'Connection attempt timed out'
    })

    // Try again
    this.startReconnection()
  }

  // Handle reconnection failure (max attempts reached)
  private onReconnectionFailed(): void {
    this.isReconnecting = false
    this.currentAttempt = 0
    
    useGameStore.getState().addAlert({
      type: 'warning',
      title: 'Connection Failed',
      message: 'Unable to reconnect to server. Please check your connection and try again.'
    })

    // Offer manual retry - defer to avoid React render cycle issues
    setTimeout(() => {
      try {
        useRoomStore.getState().updateConnectionStatus({
          isConnected: false,
          reconnectionAttempts: this.config.reconnectionStrategy.maxAttempts
        })
      } catch (error) {
        console.warn('Failed to update connection status after max attempts:', error)
      }
    }, 0)
  }

  // Preserve current state for recovery
  private preserveCurrentState(): void {
    const roomStore = useRoomStore.getState()
    const gameStore = useGameStore.getState()
    const turnStore = useTurnStore.getState()
    const charlestonStore = useCharlestonStore.getState()

    this.lastKnownState = {
      room: {
        currentRoomCode: roomStore.currentRoomCode,
        hostPlayerId: roomStore.hostPlayerId,
        players: roomStore.players,
        currentPhase: roomStore.currentPhase,
        roomSettings: roomStore.roomSettings
      },
      game: {
        gamePhase: gameStore.gamePhase,
        currentPlayerId: gameStore.currentPlayerId
      },
      turn: {
        currentPlayer: turnStore.currentPlayer,
        turnOrder: turnStore.turnOrder,
        isGameActive: turnStore.isGameActive
      },
      charleston: {
        currentPhase: charlestonStore.currentPhase,
        isActive: charlestonStore.isActive,
        phaseHistory: charlestonStore.phaseHistory
      },
      timestamp: new Date()
    }
  }

  // Initiate state recovery process
  private async initiateStateRecovery(): Promise<void> {
    const roomStore = useRoomStore.getState()
    const roomService = getRoomMultiplayerService()

    if (!roomStore.currentRoomCode || !roomService) {
      return
    }

    try {
      // Request full state recovery from server
      roomService.requestGameStateRecovery()

      // If room exists but we lost connection, try to rejoin
      if (this.lastKnownState.room && roomStore.currentRoomCode) {
        roomService.reconnectToRoom(roomStore.currentRoomCode)
      }

      useGameStore.getState().addAlert({
        type: 'info',
        title: 'State Recovery',
        message: 'Recovering game state...'
      })

    } catch (error) {
      console.error('State recovery failed:', error)
      
      useGameStore.getState().addAlert({
        type: 'warning',
        title: 'State Recovery Failed',
        message: 'Some game state may be lost. Please verify your current position.'
      })
    }
  }

  // Manual retry connection (called from hook)
  public retryConnection(socketInstance: ReturnType<typeof useSocket>): void {
    this.currentAttempt = 0
    this.isReconnecting = false
    this.clearReconnectionTimer()
    
    socketInstance.retry()
    
    // The hook will handle the reconnection process
  }

  // Start heartbeat mechanism
  private startHeartbeat(socketInstance: ReturnType<typeof useSocket>): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
    }

    this.heartbeatTimer = setInterval(() => {
      if (socketInstance.isConnected) {
        // Send heartbeat - this is handled by useSocket's ping mechanism
        // Update last ping time - defer to avoid React render cycle issues
        setTimeout(() => {
          try {
            useRoomStore.getState().updateConnectionStatus({
              lastPing: new Date()
            })
          } catch (error) {
            console.warn('Failed to update last ping time:', error)
          }
        }, 0)
      }
    }, this.config.heartbeatInterval)
  }

  // Get connection health status
  public getConnectionHealth(socketInstance?: ReturnType<typeof useSocket>): {
    isHealthy: boolean
    status: 'connected' | 'disconnected' | 'reconnecting' | 'failed'
    attempt: number
    maxAttempts: number
    lastPing: Date | null
  } {
    const roomStore = useRoomStore.getState()

    let status: 'connected' | 'disconnected' | 'reconnecting' | 'failed'
    
    if (socketInstance?.isConnected) {
      status = 'connected'
    } else if (this.isReconnecting) {
      status = 'reconnecting'
    } else if (this.currentAttempt >= this.config.reconnectionStrategy.maxAttempts) {
      status = 'failed'
    } else {
      status = 'disconnected'
    }

    return {
      isHealthy: Boolean(socketInstance?.isConnected && socketInstance?.connectionHealth.isHealthy),
      status,
      attempt: this.currentAttempt,
      maxAttempts: this.config.reconnectionStrategy.maxAttempts,
      lastPing: roomStore.connectionStatus.lastPing || null
    }
  }

  // Clean up timers
  private clearReconnectionTimer(): void {
    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer)
      this.reconnectionTimer = null
    }
  }

  private clearConnectionTimeoutTimer(): void {
    if (this.connectionTimeoutTimer) {
      clearTimeout(this.connectionTimeoutTimer)
      this.connectionTimeoutTimer = null
    }
  }

  // Destroy service and clean up
  public destroy(): void {
    this.clearReconnectionTimer()
    this.clearConnectionTimeoutTimer()
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }

    this.isReconnecting = false
    this.currentAttempt = 0
    this.lastKnownState = {}
  }
}

// Singleton service manager
let connectionResilienceService: ConnectionResilienceService | null = null

export const getConnectionResilienceService = (): ConnectionResilienceService | null => {
  return connectionResilienceService
}

export const initializeConnectionResilience = (
  config?: Partial<ConnectionResilienceConfig>
): ConnectionResilienceService => {
  // Clean up existing service
  if (connectionResilienceService) {
    connectionResilienceService.destroy()
  }

  connectionResilienceService = new ConnectionResilienceService(config)
  // Initialize will be called from the hook with socket instance
  
  return connectionResilienceService
}

export const destroyConnectionResilience = (): void => {
  if (connectionResilienceService) {
    connectionResilienceService.destroy()
    connectionResilienceService = null
  }
  // Reset global flag when destroying service
  globalDisconnectionHandled = false
}