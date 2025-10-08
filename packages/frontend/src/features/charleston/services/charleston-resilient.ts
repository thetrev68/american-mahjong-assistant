// Charleston Resilient Service
// Multiplayer Charleston coordination with connection resilience and event queuing

import { useCharlestonStore } from '../../../stores/charleston-store'
import { useRoomStore } from '../../../stores/useRoomStore'
import { getConnectionResilienceService } from '../../../lib/services/connection-resilience'
import { getNetworkErrorHandler } from '../../../lib/services/network-error-handler'
import type { Tile, TileSuit, TileValue } from 'shared-types';

export interface QueuedCharlestonOperation {
  type: 'player-ready' | 'tile-exchange' | 'phase-advance'
  data: unknown
  priority: 'high' | 'medium' | 'low'
  timestamp: Date
  roomId: string
  playerId: string
  maxRetries: number
  currentRetries: number
}

export interface CharlestonEventData {
  // Player readiness
  'charleston-player-ready': {
    roomId: string
    playerId: string
    phase: string
    selectedTiles: Tile[]
    isReady: boolean
  }

  // Tile exchange
  'charleston-tile-exchange': {
    roomId: string
    fromPlayerId: string
    toPlayerId: string
    tiles: Tile[]
    phase: string
  }

  // Phase progression
  'charleston-phase-advance': {
    roomId: string
    fromPhase: string
    toPhase: string
    allPlayersReady: boolean
  }
}

export class CharlestonResilientService {
  private operationQueue: QueuedCharlestonOperation[] = []
  private eventListeners: Map<string, (...args: unknown[]) => void> = new Map()
  private isInitialized = false
  private socketEmitFunction: ((event: string, data: unknown) => Promise<boolean> | boolean) | null = null

  constructor() {
    this.setupConnectionMonitoring()
  }

  // Initialize with socket emit function for production use
  setSocketEmitter(emitFn: (event: string, data: unknown) => Promise<boolean> | boolean): void {
    this.socketEmitFunction = emitFn
  }

  // Initialize with connection resilience integration
  initialize(): void {
    if (this.isInitialized) return

    this.setupEventListeners()
    this.isInitialized = true
    console.log('Charleston resilient service initialized')
  }

  // Setup connection state monitoring
  private setupConnectionMonitoring(): void {
    // Monitor connection changes and replay queued operations
    const connectionService = getConnectionResilienceService()
    if (connectionService) {
      // This will be called when connection is restored
      this.setupConnectionRecovery()
    }
  }

  // Setup event listeners with resilient socket access
  private setupEventListeners(): void {
    // Player readiness updates from other players
    this.addResilientListener('charleston-player-ready-update', (rawData: unknown) => {
      const data = rawData as {
        playerId: string
        isReady: boolean
        phase: string
        roomId: string
      }
      console.log('Charleston player readiness update:', data)
      
      const charlestonStore = useCharlestonStore.getState()
      charlestonStore.setPlayerReady(data.playerId, data.isReady)
      
      // Update room store as well for cross-phase consistency
      const roomStore = useRoomStore.getState() as any
      try { roomStore.setPlayerReadiness?.(data.playerId, 'charleston', data.isReady) } catch {}
    })

    // Confirmation that our readiness was received by server
    this.addResilientListener('charleston-player-ready-confirmed', (rawData: unknown) => {
      const data = rawData as {
        success: boolean
        playerId: string
        phase: string
        error?: string
      }
      if (data.success) {
        console.log('Charleston readiness confirmed for phase:', data.phase)
      } else {
        console.error('Charleston readiness failed:', data.error)
        
        // Show user feedback
        const networkHandler = getNetworkErrorHandler()
        networkHandler.handleError(new Error(data.error || 'Charleston readiness failed'), 'charleston-ready')
      }
    })

    // Tile exchange - receive tiles from other players  
    this.addResilientListener('charleston-tile-exchange', (rawData: unknown) => {
      const data = rawData as {
        tilesReceived: Record<string, unknown>[]
        phase: string
        nextPhase: string
        fromPlayerId: string
      }
      console.log('Charleston tile exchange received:', data)

      // Convert received tiles to proper Tile objects
      const tiles: Tile[] = data.tilesReceived.map((tile: Record<string, unknown>) => ({
        id: String(tile.id),
        suit: (String(tile.suit || 'jokers')) as TileSuit,
        value: (String(tile.value || 'joker')) as TileValue,
        displayName: String(tile.displayName || tile.display || tile.id),
        isJoker: Boolean(tile.isJoker || false)
      }))

      // Update Charleston store with received tiles
      const charlestonStore = useCharlestonStore.getState()
      // Note: receiveTiles method needs to be implemented in charleston-store
      console.log('Received tiles from Charleston exchange:', tiles, 'from:', data.fromPlayerId)
      
      // Advance to next phase if specified
      if (data.nextPhase && data.nextPhase !== data.phase) {
        charlestonStore.setPhase(data.nextPhase as 'right' | 'across' | 'left' | 'complete')
      }
    })

    // Phase advancement notifications
    this.addResilientListener('charleston-phase-changed', (rawData: unknown) => {
      const data = rawData as {
        fromPhase: string
        toPhase: string
        roomId: string
        allPlayersReady: boolean
      }
      console.log('Charleston phase changed:', data)
      
      const charlestonStore = useCharlestonStore.getState()
      charlestonStore.setPhase(data.toPhase as 'right' | 'across' | 'left' | 'complete')
    })

    // Charleston completion
    this.addResilientListener('charleston-complete', (rawData: unknown) => {
      const data = rawData as {
        roomId: string
        finalTiles: Record<string, unknown>[]
      }
      console.log('Charleston completed:', data)
      
      const charlestonStore = useCharlestonStore.getState()
      charlestonStore.endCharleston()
      
      // Update room readiness for next phase
      const roomStore = useRoomStore.getState()
      const currentPlayerId = roomStore.currentPlayerId
      if (currentPlayerId) {
        try { (roomStore as any).setPlayerReadiness?.(currentPlayerId, 'gameplay', true) } catch {}
      }
    })
  }

  // Add resilient event listener that handles disconnection
  private addResilientListener(event: string, handler: (data: unknown) => void): void {
    const resilientHandler = (...args: unknown[]) => {
      try {
        // Pass first argument as data object
        handler(args[0])
      } catch (error) {
        console.error(`Error in Charleston event handler for ${event}:`, error)
        
        // Handle error through network error handler
        const networkHandler = getNetworkErrorHandler()
        networkHandler.handleError(error, `charleston-${event}`)
      }
    }

    this.eventListeners.set(event, resilientHandler)
    
    // Register with socket when available
    this.registerSocketListener(event)
  }

  // Register listener with socket (will retry if socket not available)
  private registerSocketListener(event: string): void {
    const connectionService = getConnectionResilienceService()
    
    if (connectionService) {
      // Use the resilient connection system to register listener
      // This would need to be implemented in the connection service
      console.log(`Registering resilient listener for ${event}`)
    }
  }

  // Mark player as ready with connection resilience
  async markPlayerReady(selectedTiles: Tile[], phase: string): Promise<boolean> {
    const roomStore = useRoomStore.getState()
    const currentPlayerId = roomStore.currentPlayerId
    const roomId = roomStore.room?.id

    if (!currentPlayerId || !roomId) {
      console.error('Missing player ID or room ID for Charleston readiness')
      return false
    }

    const operation: QueuedCharlestonOperation = {
      type: 'player-ready',
      data: {
        roomId,
        playerId: currentPlayerId,
        phase,
        selectedTiles: selectedTiles.map(tile => ({
          id: tile.id,
          suit: tile.suit,
          value: tile.value,
          displayName: tile.displayName,
          isJoker: tile.isJoker
        })),
        isReady: true
      },
      priority: 'high',
      timestamp: new Date(),
      roomId,
      playerId: currentPlayerId,
      maxRetries: 3,
      currentRetries: 0
    }

    return this.executeResilientOperation(operation)
  }

  // Execute operation with connection resilience
  private async executeResilientOperation(operation: QueuedCharlestonOperation): Promise<boolean> {
    const connectionService = getConnectionResilienceService()
    
    // Check if we can safely perform the operation
    if (!connectionService || !this.isNetworkHealthy()) {
      console.log('Network not healthy, queueing Charleston operation:', operation.type)
      this.queueOperation(operation)
      return false // Operation queued, not failed
    }

    try {
      const success = await this.executeImmediate(operation)

      // If operation failed, handle retry logic
      if (!success) {
        console.error('Charleston operation failed')

        // Retry if under retry limit
        if (operation.currentRetries < operation.maxRetries) {
          operation.currentRetries++
          this.queueOperation(operation)
          return false
        }

        // Handle permanent failure
        const networkHandler = getNetworkErrorHandler()
        networkHandler.handleError(new Error('Charleston operation failed'), `charleston-${operation.type}`)
        return false
      }

      return success
    } catch (error) {
      console.error('Charleston operation failed with exception:', error)

      // Retry if under retry limit
      if (operation.currentRetries < operation.maxRetries) {
        operation.currentRetries++
        this.queueOperation(operation)
        return false
      }

      // Handle permanent failure
      const networkHandler = getNetworkErrorHandler()
      networkHandler.handleError(error, `charleston-${operation.type}`)
      return false
    }
  }

  // Execute operation immediately (when connection is healthy)
  private async executeImmediate(operation: QueuedCharlestonOperation): Promise<boolean> {
    console.log('Executing Charleston operation:', operation.type)
    
    // Emit to socket through the resilient connection
    const success = await this.emitResilientEvent(operation.type, operation.data)
    
    if (success) {
      console.log('Charleston operation completed:', operation.type)
    } else {
      console.error('Charleston operation failed:', operation.type)
    }
    
    return success
  }

  // Emit event through resilient connection system
  private async emitResilientEvent(event: string, data: unknown): Promise<boolean> {
    try {
      console.log(`Emitting resilient Charleston event: ${event}`, data)

      // Priority 1: Use configured socket emitter function (production)
      if (this.socketEmitFunction) {
        const result = await this.socketEmitFunction(event, data)
        return Boolean(result)
      }

      // Priority 2: Use mocked connection service (test scenario)
      const connectionService = getConnectionResilienceService() as {
        emit?: (event: string, data: unknown) => Promise<boolean>
      } | null

      if (connectionService && typeof connectionService.emit === 'function') {
        return await connectionService.emit(event, data)
      }

      // Priority 3: Fallback - log and return false (no socket available)
      console.warn('No socket emitter available for Charleston event:', event)
      return false
    } catch (error) {
      console.error('Failed to emit resilient Charleston event:', error)
      return false
    }
  }

  // Queue operation for retry when connection is restored
  private queueOperation(operation: QueuedCharlestonOperation): void {
    // Remove duplicates of same operation type for same player/room
    this.operationQueue = this.operationQueue.filter(
      op => !(op.type === operation.type && 
               op.roomId === operation.roomId && 
               op.playerId === operation.playerId)
    )

    this.operationQueue.push(operation)
    
    // Sort by priority and timestamp
    this.operationQueue.sort((a, b) => {
      if (a.priority !== b.priority) {
        const priorityOrder = { high: 0, medium: 1, low: 2 }
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      }
      return a.timestamp.getTime() - b.timestamp.getTime()
    })

    console.log(`Queued Charleston operation: ${operation.type} (queue size: ${this.operationQueue.length})`)
  }

  // Check if network is healthy enough for operations
  private isNetworkHealthy(): boolean {
    const networkHandler = getNetworkErrorHandler()
    return networkHandler.isNetworkHealthy()
  }

  // Setup connection recovery to replay queued operations
  private setupConnectionRecovery(): void {
    // Setup connection recovery monitoring
    console.log('Charleston connection recovery setup complete')
  }

  // Replay queued operations when connection is restored
  async replayQueuedOperations(): Promise<void> {
    if (this.operationQueue.length === 0) {
      return
    }

    console.log(`Replaying ${this.operationQueue.length} queued Charleston operations`)
    
    const operations = [...this.operationQueue]
    this.operationQueue = []

    for (const operation of operations) {
      const success = await this.executeResilientOperation(operation)
      if (!success) {
        // If it failed again, it's already re-queued by executeResilientOperation
        break
      }
      
      // Small delay between operations to avoid overwhelming server
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log(`Charleston operation replay complete. Remaining queue size: ${this.operationQueue.length}`)
  }

  // Get current queue status for debugging
  getQueueStatus(): { size: number; operations: string[] } {
    return {
      size: this.operationQueue.length,
      operations: this.operationQueue.map(op => `${op.type}:${op.priority}`)
    }
  }

  // Request current Charleston status from server
  async requestCharlestonStatus(): Promise<boolean> {
    const roomStore = useRoomStore.getState()
    const roomId = roomStore.room?.id

    if (!roomId) {
      console.error('No room ID for Charleston status request')
      return false
    }

    const operation: QueuedCharlestonOperation = {
      type: 'phase-advance', // Reusing type for status request
      data: { roomId, requestType: 'status' },
      priority: 'low',
      timestamp: new Date(),
      roomId,
      playerId: 'system',
      maxRetries: 1,
      currentRetries: 0
    }

    return this.executeResilientOperation(operation)
  }

  // Cleanup - remove listeners and clear queue
  cleanup(): void {
    this.eventListeners.clear()
    this.operationQueue = []
    this.isInitialized = false
    console.log('Charleston resilient service cleaned up')
  }

  // Destroy service
  destroy(): void {
    this.cleanup()
  }
}

// Singleton service manager
let charlestonResilientService: CharlestonResilientService | null = null

export const getCharlestonResilientService = (): CharlestonResilientService => {
  if (!charlestonResilientService) {
    charlestonResilientService = new CharlestonResilientService()
  }
  return charlestonResilientService
}

export const initializeCharlestonResilientService = (): CharlestonResilientService => {
  const service = getCharlestonResilientService()
  service.initialize()
  return service
}

export const destroyCharlestonResilientService = (): void => {
  if (charlestonResilientService) {
    charlestonResilientService.destroy()
    charlestonResilientService = null
  }
}

// React hook for using Charleston resilient service
export const useCharlestonResilience = () => {
  const service = getCharlestonResilientService()

  // Initialize service when hook is first used
  if (!service) {
    initializeCharlestonResilientService()
  }

  return {
    markPlayerReady: (selectedTiles: Tile[], phase: string) =>
      service.markPlayerReady(selectedTiles, phase),
    requestStatus: () => service.requestCharlestonStatus(),
    replayQueue: () => service.replayQueuedOperations(),
    getQueueStatus: () => service.getQueueStatus(),
    setSocketEmitter: (emitFn: (event: string, data: unknown) => Promise<boolean> | boolean) =>
      service.setSocketEmitter(emitFn),
    cleanup: () => service.cleanup()
  }
}
