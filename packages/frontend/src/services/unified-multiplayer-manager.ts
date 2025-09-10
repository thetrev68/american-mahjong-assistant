// Unified Multiplayer Service Manager
// Coordinates all multiplayer services with unified connection resilience

import { Socket } from 'socket.io-client'
import { getConnectionResilienceService, initializeConnectionResilience } from './connection-resilience'
import { getNetworkErrorHandler } from './network-error-handler'
import { getDisconnectionManager } from './disconnection-manager'
import { initializeRoomMultiplayerService, destroyRoomMultiplayerService, getRoomMultiplayerService } from './room-multiplayer'
import { initializeCharlestonResilientService, destroyCharlestonResilientService, getCharlestonResilientService } from './charleston-resilient'
import { useRoomStore } from '../stores/room.store'
import { useGameStore } from '../stores/game-store'
import { initializeEventQueueManager, getEventQueueManager, destroyEventQueueManager } from './event-queue-manager'
import type { EventReplayResult } from './event-queue-manager'

export interface MultiplayerManagerConfig {
  enableAutoReconnect: boolean
  enableStateRecovery: boolean
  maxReconnectAttempts: number
  heartbeatInterval: number
  eventQueueMaxSize: number
  enableRoomService: boolean
  enableCharlestonService: boolean
}

export interface MultiplayerServiceStatus {
  isInitialized: boolean
  connectionHealth: 'healthy' | 'degraded' | 'poor' | 'offline'
  activeServices: string[]
  queuedEvents: number
  eventQueueDetails?: {
    queueSize: number
    eventsByService: Record<string, number>
    eventsByPriority: Record<string, number>
    processedCount: number
    failedCount: number
  }
  reconnectionState: 'connected' | 'reconnecting' | 'failed'
}

const DEFAULT_CONFIG: MultiplayerManagerConfig = {
  enableAutoReconnect: true,
  enableStateRecovery: true,
  maxReconnectAttempts: 5,
  heartbeatInterval: 15000,
  eventQueueMaxSize: 100,
  enableRoomService: true,
  enableCharlestonService: true
}

export class UnifiedMultiplayerManager {
  private static instance: UnifiedMultiplayerManager | null = null
  private config: MultiplayerManagerConfig
  private _socket: Socket | null = null
  private playerId: string | null = null
  private playerName: string | null = null
  private isInitialized = false
  
  private activeServices: Set<string> = new Set()
  private eventQueueManager: ReturnType<typeof getEventQueueManager> | null = null
  
  private constructor(config: Partial<MultiplayerManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  static getInstance(config?: Partial<MultiplayerManagerConfig>): UnifiedMultiplayerManager {
    if (!UnifiedMultiplayerManager.instance) {
      UnifiedMultiplayerManager.instance = new UnifiedMultiplayerManager(config)
    }
    return UnifiedMultiplayerManager.instance
  }

  // Public getter for socket access
  get socket(): Socket | null {
    return this._socket
  }

  // Initialize all multiplayer services with connection resilience
  async initialize(socket: Socket, playerId: string, playerName: string): Promise<void> {
    if (this.isInitialized) {
      console.log('Multiplayer manager already initialized')
      return
    }

    this._socket = socket
    this.playerId = playerId
    this.playerName = playerName

    console.log(`Initializing multiplayer manager for player ${playerId} (${playerName})`)

    try {
      console.log('Initializing unified multiplayer manager...')

      // Initialize connection resilience system
      initializeConnectionResilience({
        enableAutoReconnect: this.config.enableAutoReconnect,
        enableStateSync: this.config.enableStateRecovery,
        reconnectionStrategy: {
          maxAttempts: this.config.maxReconnectAttempts,
          initialDelay: 1000,
          maxDelay: 30000,
          backoffMultiplier: 2,
          jitterMax: 1000
        },
        heartbeatInterval: this.config.heartbeatInterval
      })

      // Initialize network error handling
      const networkHandler = getNetworkErrorHandler()
      if (networkHandler) {
        console.log('Network error handler ready')
      }

      // Initialize disconnection manager
      getDisconnectionManager()
      console.log('Disconnection manager ready')

      // Initialize event queue manager
      this.eventQueueManager = initializeEventQueueManager({
        maxQueueSize: this.config.eventQueueMaxSize,
        maxRetries: this.config.maxReconnectAttempts,
        enableDependencyTracking: true,
        enableEventExpiration: true
      })
      console.log('Event queue manager ready')

      // Initialize room multiplayer service if enabled
      if (this.config.enableRoomService) {
        const roomService = initializeRoomMultiplayerService(socket, this.playerId!, this.playerName!)
        this.activeServices.add('room-multiplayer')
        console.log(`Room multiplayer service initialized for ${this.playerName}`)
        
        // Unused variable fix
        void roomService
      }

      // Initialize Charleston resilient service if enabled
      if (this.config.enableCharlestonService) {
        const charlestonService = initializeCharlestonResilientService()
        this.activeServices.add('charleston-resilient')
        console.log(`Charleston resilient service initialized for ${this.playerName}`)
        
        // Unused variable fix
        void charlestonService
      }

      // Set up cross-service event coordination
      this.setupEventCoordination()

      // Set up reconnection handlers
      this.setupReconnectionHandlers()

      this.isInitialized = true
      console.log('Unified multiplayer manager initialization complete')

      // Update game state
      useGameStore.getState().addAlert({
        type: 'success',
        title: 'Multiplayer Ready',
        message: 'All multiplayer services initialized successfully'
      })

    } catch (error) {
      console.error('Failed to initialize unified multiplayer manager:', error)
      useGameStore.getState().addAlert({
        type: 'warning',
        title: 'Multiplayer Setup Failed',
        message: 'Failed to initialize multiplayer services'
      })
      throw error
    }
  }

  // Set up event coordination between services
  private setupEventCoordination(): void {
    if (!this._socket) return

    // Cross-service event handlers
    this._socket.on('service-state-sync', (data: { service: string; state: unknown }) => {
      console.log('Cross-service state sync:', data.service)
      
      switch (data.service) {
        case 'room':
          this.handleRoomStateSync(data.state)
          break
        case 'charleston':
          this.handleCharlestonStateSync(data.state)
          break
        case 'turn':
          this.handleTurnStateSync(data.state)
          break
        default:
          console.log('Unknown service state sync:', data.service)
      }
    })

    // Process queued events when connection is restored
    this._socket.on('connect', async () => {
      console.log('Connection restored - processing event queue')
      await this.processEventQueue()
    })
  }

  // Set up reconnection event handlers
  private setupReconnectionHandlers(): void {
    const resilienceService = getConnectionResilienceService()
    const disconnectionManager = getDisconnectionManager()
    
    if (!resilienceService || !disconnectionManager) return

    // Handle successful reconnection
    this._socket?.on('connect', () => {
      console.log('Reconnection successful - resyncing all services')
      this.resyncAllServices()
    })

    // Handle disconnection with recovery preparation
    this._socket?.on('disconnect', (reason: string) => {
      console.log('Connection lost - preparing service recovery:', reason)
      this.prepareServiceRecovery(reason)
    })
  }

  // Handle room state synchronization
  private handleRoomStateSync(state: unknown): void {
    const roomService = getRoomMultiplayerService()
    if (roomService) {
      console.log('Syncing room state across services:', state)
      // Room service will handle its own state updates via listeners
    }
  }

  // Handle Charleston state synchronization
  private handleCharlestonStateSync(state: unknown): void {
    const charlestonService = getCharlestonResilientService()
    if (charlestonService) {
      console.log('Syncing Charleston state across services:', state)
      // Charleston service will handle its own state updates via listeners
    }
  }

  // Handle turn state synchronization
  private handleTurnStateSync(state: unknown): void {
    console.log('Syncing turn state across services:', state)
    // Turn service integration would go here
  }

  // Resync all active services after reconnection
  private async resyncAllServices(): Promise<void> {
    const roomStore = useRoomStore.getState()
    
    for (const serviceName of this.activeServices) {
      try {
        switch (serviceName) {
          case 'room-multiplayer': {
            const roomService = getRoomMultiplayerService()
            if (roomService && roomStore.currentRoomCode) {
              console.log('Resyncing room service')
              roomService.requestGameStateRecovery()
            }
            break
          }
            
          case 'charleston-resilient': {
            const charlestonService = getCharlestonResilientService()
            if (charlestonService) {
              console.log('Replaying Charleston queue')
              await charlestonService.replayQueuedOperations()
            }
            break
          }
            
          default:
            console.log('Unknown service for resync:', serviceName)
        }
      } catch (error) {
        console.error(`Failed to resync service ${serviceName}:`, error)
      }
    }
  }

  // Prepare services for recovery during disconnection
  private prepareServiceRecovery(reason: string): void {
    console.log('Preparing service recovery for reason:', reason)
    
    // Preserve critical state for all active services
    for (const serviceName of this.activeServices) {
      try {
        switch (serviceName) {
          case 'charleston-resilient': {
            const charlestonService = getCharlestonResilientService()
            const queueStatus = charlestonService?.getQueueStatus()
            console.log(`Charleston service queue status:`, queueStatus)
            break
          }
            
          case 'room-multiplayer': {
            const roomService = getRoomMultiplayerService()
            const roomStatus = roomService?.getCurrentRoomStatus()
            console.log('Room service status:', roomStatus)
            break
          }
        }
      } catch (error) {
        console.error(`Failed to prepare recovery for ${serviceName}:`, error)
      }
    }
  }

  // Process queued events when connection is restored
  private async processEventQueue(): Promise<EventReplayResult | null> {
    if (!this.eventQueueManager) {
      console.error('Event queue manager not initialized')
      return null
    }

    const queueStatus = this.eventQueueManager.getQueueStatus()
    if (queueStatus.queueSize === 0) {
      console.log('No queued events to process')
      return {
        successful: 0,
        failed: 0,
        skipped: 0,
        totalProcessed: 0,
        errors: []
      }
    }

    console.log(`Processing ${queueStatus.queueSize} queued events across services`)
    
    // Create emit function for event queue manager
    const emitFunction = async (eventType: string, data: unknown): Promise<boolean> => {
      try {
        if (!this._socket?.connected) {
          return false
        }
        
        this._socket.emit(eventType, data)
        return true
      } catch (error) {
        console.error(`Failed to emit queued event ${eventType}:`, error)
        return false
      }
    }

    const result = await this.eventQueueManager.processQueue(emitFunction)
    console.log('Event queue processing result:', result)
    
    // Show user feedback about event replay
    if (result.totalProcessed > 0) {
      useGameStore.getState().addAlert({
        type: result.successful > result.failed ? 'success' : 'warning',
        title: 'Event Replay Complete',
        message: `Processed ${result.totalProcessed} queued events (${result.successful} successful, ${result.failed} failed)`
      })
    }
    
    return result
  }

  // Get current status of all multiplayer services
  getServiceStatus(): MultiplayerServiceStatus {
    const networkHandler = getNetworkErrorHandler()
    const resilienceService = getConnectionResilienceService()
    
    const networkHealth = networkHandler.getNetworkHealth()
    const connectionHealth = resilienceService?.getConnectionHealth()
    
    let connectionHealthStatus: 'healthy' | 'degraded' | 'poor' | 'offline'
    
    if (!this._socket?.connected) {
      connectionHealthStatus = 'offline'
    } else if (networkHealth.consecutiveFailures === 0 && networkHealth.latency !== null && networkHealth.latency < 100) {
      connectionHealthStatus = 'healthy'
    } else if (networkHealth.consecutiveFailures < 2 && networkHealth.latency !== null && networkHealth.latency < 300) {
      connectionHealthStatus = 'degraded'
    } else if (networkHealth.consecutiveFailures < 5) {
      connectionHealthStatus = 'poor'
    } else {
      connectionHealthStatus = 'offline'
    }

    const eventQueueDetails = this.eventQueueManager?.getQueueStatus()

    return {
      isInitialized: this.isInitialized,
      connectionHealth: connectionHealthStatus,
      activeServices: Array.from(this.activeServices),
      queuedEvents: eventQueueDetails?.queueSize || 0,
      eventQueueDetails,
      reconnectionState: (connectionHealth?.status === 'disconnected' ? 'failed' : connectionHealth?.status) || 'failed'
    }
  }

  // Emit event to specific service with resilience
  async emitToService(
    serviceName: 'room' | 'charleston' | 'turn' | 'game' | 'unified',
    event: string, 
    data: unknown,
    options?: {
      priority?: 'critical' | 'high' | 'medium' | 'low'
      requiresAck?: boolean
      maxRetries?: number
      dependsOn?: string[]
    }
  ): Promise<boolean> {
    if (!this.eventQueueManager) {
      console.error('Event queue manager not initialized')
      return false
    }

    if (!this._socket?.connected) {
      console.log(`Queueing event for ${serviceName} - connection not available`)
      
      // Queue event with advanced event queue manager
      this.eventQueueManager.queueEvent({
        service: serviceName,
        eventType: event,
        data,
        priority: options?.priority || 'medium',
        requiresAck: options?.requiresAck || false,
        maxRetries: options?.maxRetries || this.config.maxReconnectAttempts,
        dependsOn: options?.dependsOn,
        playerId: this.playerId || undefined,
        roomId: useRoomStore.getState().currentRoomCode || undefined
      })
      
      return true
    }

    try {
      this._socket.emit(event, data)
      return true
    } catch (error) {
      console.error(`Failed to emit event to ${serviceName}:`, error)
      
      // Queue for retry
      this.eventQueueManager.queueEvent({
        service: serviceName,
        eventType: event,
        data,
        priority: 'high', // Failed events get high priority
        requiresAck: false,
        maxRetries: 2,
        playerId: this.playerId || undefined,
        roomId: useRoomStore.getState().currentRoomCode || undefined
      })
      
      return false
    }
  }

  // Emit event and wait for response with timeout
  async emitWithResponse(
    event: string,
    data: unknown,
    options?: {
      timeout?: number
      priority?: 'critical' | 'high' | 'medium' | 'low'
    }
  ): Promise<Record<string, unknown>> {
    if (!this._socket?.connected) {
      throw new Error('Socket not connected')
    }

    const timeout = options?.timeout || 5000
    
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Request timeout after ${timeout}ms`))
      }, timeout)

      // Create response event name
      const responseEvent = event.replace('request-', '') + '-response'
      
      const responseHandler = (responseData: Record<string, unknown>) => {
        clearTimeout(timeoutId)
        this._socket?.off(responseEvent, responseHandler)
        resolve(responseData)
      }

      // Listen for response
      this._socket?.on(responseEvent, responseHandler)
      
      // Emit the request
      this._socket?.emit(event, data)
    })
  }

  // Emit to room (for broadcasting)
  async emitToRoom(
    roomId: string,
    event: string,
    data: unknown
  ): Promise<boolean> {
    if (!this._socket?.connected) {
      console.log('Queueing room event - connection not available')
      return false
    }

    try {
      this._socket?.emit(event, { ...(data as Record<string, unknown>), roomId })
      return true
    } catch (error) {
      console.error(`Failed to emit event to room ${roomId}:`, error)
      return false
    }
  }

  // Request full state recovery for all services
  async requestFullStateRecovery(): Promise<void> {
    console.log('Requesting full state recovery for all services')
    
    const roomService = getRoomMultiplayerService()
    if (roomService) {
      roomService.requestGameStateRecovery()
    }

    const charlestonService = getCharlestonResilientService()
    if (charlestonService) {
      await charlestonService.requestCharlestonStatus()
    }
  }

  // Graceful shutdown of all services
  async shutdown(): Promise<void> {
    console.log('Shutting down unified multiplayer manager')
    
    if (!this.isInitialized) return

    try {
      // Clean up all active services
      for (const serviceName of this.activeServices) {
        switch (serviceName) {
          case 'room-multiplayer':
            destroyRoomMultiplayerService()
            break
          case 'charleston-resilient':
            destroyCharlestonResilientService()
            break
        }
      }

      // Clean up event listeners
      this._socket?.off('service-state-sync')
      this._socket?.off('connect')
      this._socket?.off('disconnect')

      // Clear event queue manager
      if (this.eventQueueManager) {
        destroyEventQueueManager()
        this.eventQueueManager = null
      }

      // Clear state
      this.activeServices.clear()
      this._socket = null
      this.playerId = null
      this.playerName = null
      this.isInitialized = false

      console.log('Unified multiplayer manager shutdown complete')

    } catch (error) {
      console.error('Error during multiplayer manager shutdown:', error)
    }
  }

  // Static cleanup method
  static destroy(): void {
    if (UnifiedMultiplayerManager.instance) {
      UnifiedMultiplayerManager.instance.shutdown()
      UnifiedMultiplayerManager.instance = null
    }
  }
}

// Export singleton access functions
export const getUnifiedMultiplayerManager = (): UnifiedMultiplayerManager | null => {
  return UnifiedMultiplayerManager['instance']
}

export const initializeUnifiedMultiplayerManager = async (
  socket: Socket,
  playerId: string,
  playerName: string,
  config?: Partial<MultiplayerManagerConfig>
): Promise<UnifiedMultiplayerManager> => {
  const manager = UnifiedMultiplayerManager.getInstance(config)
  await manager.initialize(socket, playerId, playerName)
  return manager
}

export const destroyUnifiedMultiplayerManager = (): void => {
  UnifiedMultiplayerManager.destroy()
}

// React hook for using unified multiplayer manager
export const useUnifiedMultiplayer = () => {
  const manager = getUnifiedMultiplayerManager()
  
  if (!manager) {
    console.warn('Unified multiplayer manager not initialized')
    return null
  }
  
  return {
    manager,
    status: manager.getServiceStatus(),
    emitToService: manager.emitToService.bind(manager),
    emitWithResponse: manager.emitWithResponse.bind(manager),
    emitToRoom: manager.emitToRoom.bind(manager),
    requestFullRecovery: manager.requestFullStateRecovery.bind(manager),
    processEventQueue: manager['processEventQueue'].bind(manager),
    getEventQueueStatus: () => manager.getServiceStatus().eventQueueDetails,
    shutdown: manager.shutdown.bind(manager)
  }
}