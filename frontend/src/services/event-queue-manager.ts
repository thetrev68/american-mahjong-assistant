// Event Queue Manager
// Advanced event queuing and replay system for multiplayer services

export interface QueuedMultiplayerEvent {
  id: string
  service: 'room' | 'charleston' | 'turn' | 'game' | 'unified'
  eventType: string
  data: unknown
  priority: 'critical' | 'high' | 'medium' | 'low'
  timestamp: Date
  maxRetries: number
  currentRetries: number
  requiresAck: boolean
  dependsOn?: string[] // Event IDs this event depends on
  expiresAt?: Date
  playerId?: string
  roomId?: string
}

export interface EventReplayResult {
  successful: number
  failed: number
  skipped: number
  totalProcessed: number
  errors: Array<{ eventId: string; error: string }>
}

export interface EventQueueConfig {
  maxQueueSize: number
  maxRetries: number
  retryDelayMs: number
  priorityWeights: Record<QueuedMultiplayerEvent['priority'], number>
  enableDependencyTracking: boolean
  enableEventExpiration: boolean
  defaultExpirationMs: number
}

const DEFAULT_CONFIG: EventQueueConfig = {
  maxQueueSize: 1000,
  maxRetries: 3,
  retryDelayMs: 1000,
  priorityWeights: {
    critical: 1000,
    high: 100,
    medium: 10,
    low: 1
  },
  enableDependencyTracking: true,
  enableEventExpiration: true,
  defaultExpirationMs: 5 * 60 * 1000 // 5 minutes
}

export class EventQueueManager {
  private static instance: EventQueueManager | null = null
  private config: EventQueueConfig
  private eventQueue: QueuedMultiplayerEvent[] = []
  private processedEvents: Set<string> = new Set()
  private failedEvents: Map<string, number> = new Map()
  private isProcessing = false
  private processingTimer: NodeJS.Timeout | null = null

  private constructor(config: Partial<EventQueueConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  static getInstance(config?: Partial<EventQueueConfig>): EventQueueManager {
    if (!EventQueueManager.instance) {
      EventQueueManager.instance = new EventQueueManager(config)
    }
    return EventQueueManager.instance
  }

  // Queue an event for later processing
  queueEvent(event: Omit<QueuedMultiplayerEvent, 'id' | 'timestamp' | 'currentRetries'>): string {
    // Generate unique ID
    const eventId = `${event.service}-${event.eventType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Check queue size limit
    if (this.eventQueue.length >= this.config.maxQueueSize) {
      console.warn('Event queue is full, removing oldest low priority events')
      this.removeOldLowPriorityEvents()
    }

    // Create full event object
    const queuedEvent: QueuedMultiplayerEvent = {
      id: eventId,
      timestamp: new Date(),
      currentRetries: 0,
      expiresAt: event.expiresAt || new Date(Date.now() + this.config.defaultExpirationMs),
      ...event
    }

    // Insert event in priority order
    this.insertByPriority(queuedEvent)

    console.log(`Queued ${event.service} event: ${event.eventType} (ID: ${eventId}, Priority: ${event.priority})`)
    
    return eventId
  }

  // Insert event maintaining priority order
  private insertByPriority(event: QueuedMultiplayerEvent): void {
    const eventWeight = this.config.priorityWeights[event.priority] || 1
    
    // Find insertion point based on priority and timestamp
    let insertIndex = this.eventQueue.length
    
    for (let i = 0; i < this.eventQueue.length; i++) {
      const existingEvent = this.eventQueue[i]
      const existingWeight = this.config.priorityWeights[existingEvent.priority] || 1
      
      // Higher priority events go first
      if (eventWeight > existingWeight) {
        insertIndex = i
        break
      }
      
      // Same priority - older events go first
      if (eventWeight === existingWeight && event.timestamp < existingEvent.timestamp) {
        insertIndex = i
        break
      }
    }
    
    this.eventQueue.splice(insertIndex, 0, event)
  }

  // Remove old low-priority events to make space
  private removeOldLowPriorityEvents(): void {
    const lowPriorityIndices = this.eventQueue
      .map((event, index) => ({ event, index }))
      .filter(({ event }) => event.priority === 'low' || event.priority === 'medium')
      .sort((a, b) => a.event.timestamp.getTime() - b.event.timestamp.getTime())
      .slice(0, Math.floor(this.config.maxQueueSize * 0.1)) // Remove 10% of queue
      .map(({ index }) => index)

    // Remove from highest index to lowest to maintain indices
    lowPriorityIndices.reverse().forEach(index => {
      const removed = this.eventQueue.splice(index, 1)[0]
      console.log(`Removed expired low priority event: ${removed.id}`)
    })
  }

  // Process all queued events
  async processQueue(emitFunction: (eventType: string, data: unknown) => Promise<boolean>): Promise<EventReplayResult> {
    if (this.isProcessing) {
      console.log('Event queue processing already in progress')
      return {
        successful: 0,
        failed: 0,
        skipped: 0,
        totalProcessed: 0,
        errors: []
      }
    }

    this.isProcessing = true
    console.log(`Starting event queue processing: ${this.eventQueue.length} events queued`)

    const result: EventReplayResult = {
      successful: 0,
      failed: 0,
      skipped: 0,
      totalProcessed: 0,
      errors: []
    }

    // Clean up expired events first
    this.removeExpiredEvents()

    // Sort by dependency order if enabled
    if (this.config.enableDependencyTracking) {
      this.sortByDependencies()
    }

    const eventsToProcess = [...this.eventQueue]
    this.eventQueue = []

    for (const event of eventsToProcess) {
      result.totalProcessed++

      try {
        // Check if event is expired
        if (this.isEventExpired(event)) {
          result.skipped++
          console.log(`Skipped expired event: ${event.id}`)
          continue
        }

        // Check dependencies
        if (this.config.enableDependencyTracking && !this.areDependenciesMet(event)) {
          // Re-queue for later processing
          this.eventQueue.push(event)
          result.skipped++
          console.log(`Skipped event with unmet dependencies: ${event.id}`)
          continue
        }

        // Attempt to process event
        const success = await this.processEvent(event, emitFunction)
        
        if (success) {
          result.successful++
          this.processedEvents.add(event.id)
          this.failedEvents.delete(event.id)
          console.log(`Successfully processed event: ${event.id}`)
        } else {
          result.failed++
          this.handleEventFailure(event, result)
        }

      } catch (error) {
        result.failed++
        const errorMessage = error instanceof Error ? error.message : String(error)
        result.errors.push({ eventId: event.id, error: errorMessage })
        this.handleEventFailure(event, result)
      }

      // Small delay between events to avoid overwhelming server
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    this.isProcessing = false
    console.log(`Event queue processing complete:`, result)
    
    return result
  }

  // Process individual event
  private async processEvent(
    event: QueuedMultiplayerEvent, 
    emitFunction: (eventType: string, data: unknown) => Promise<boolean>
  ): Promise<boolean> {
    console.log(`Processing ${event.service} event: ${event.eventType} (attempt ${event.currentRetries + 1}/${event.maxRetries})`)
    
    event.currentRetries++
    return await emitFunction(event.eventType, event.data)
  }

  // Handle event processing failure
  private handleEventFailure(event: QueuedMultiplayerEvent, result: EventReplayResult): void {
    const failureCount = (this.failedEvents.get(event.id) || 0) + 1
    this.failedEvents.set(event.id, failureCount)

    console.error(`Event processing failed: ${event.id} (failure ${failureCount}/${event.maxRetries})`)

    // Retry if under limit
    if (event.currentRetries < event.maxRetries) {
      // Re-queue with lower priority for retry
      const retryEvent = {
        ...event,
        priority: 'low' as const,
        timestamp: new Date(Date.now() + this.config.retryDelayMs)
      }
      
      this.insertByPriority(retryEvent)
      console.log(`Re-queued event for retry: ${event.id}`)
    } else {
      console.error(`Event exceeded max retries: ${event.id}`)
      result.errors.push({ 
        eventId: event.id, 
        error: `Max retries (${event.maxRetries}) exceeded` 
      })
    }
  }

  // Remove expired events
  private removeExpiredEvents(): void {
    if (!this.config.enableEventExpiration) return

    const now = new Date()
    const originalLength = this.eventQueue.length
    
    this.eventQueue = this.eventQueue.filter(event => {
      if (event.expiresAt && event.expiresAt < now) {
        console.log(`Removed expired event: ${event.id}`)
        return false
      }
      return true
    })

    const removedCount = originalLength - this.eventQueue.length
    if (removedCount > 0) {
      console.log(`Removed ${removedCount} expired events from queue`)
    }
  }

  // Check if event is expired
  private isEventExpired(event: QueuedMultiplayerEvent): boolean {
    if (!this.config.enableEventExpiration || !event.expiresAt) return false
    return event.expiresAt < new Date()
  }

  // Check if event dependencies are met
  private areDependenciesMet(event: QueuedMultiplayerEvent): boolean {
    if (!event.dependsOn || event.dependsOn.length === 0) return true
    
    return event.dependsOn.every(depId => this.processedEvents.has(depId))
  }

  // Sort events by dependency order
  private sortByDependencies(): void {
    // Topological sort of events by dependencies
    const sorted: QueuedMultiplayerEvent[] = []
    const visited = new Set<string>()
    const visiting = new Set<string>()
    
    const visit = (event: QueuedMultiplayerEvent) => {
      if (visiting.has(event.id)) {
        console.warn(`Circular dependency detected for event: ${event.id}`)
        return
      }
      
      if (visited.has(event.id)) return
      
      visiting.add(event.id)
      
      // Process dependencies first
      if (event.dependsOn) {
        for (const depId of event.dependsOn) {
          const depEvent = this.eventQueue.find(e => e.id === depId)
          if (depEvent) {
            visit(depEvent)
          }
        }
      }
      
      visiting.delete(event.id)
      visited.add(event.id)
      sorted.push(event)
    }

    for (const event of this.eventQueue) {
      if (!visited.has(event.id)) {
        visit(event)
      }
    }

    this.eventQueue = sorted
  }

  // Get queue statistics
  getQueueStatus(): {
    queueSize: number
    processingActive: boolean
    eventsByService: Record<string, number>
    eventsByPriority: Record<string, number>
    processedCount: number
    failedCount: number
  } {
    const eventsByService: Record<string, number> = {}
    const eventsByPriority: Record<string, number> = {}

    for (const event of this.eventQueue) {
      eventsByService[event.service] = (eventsByService[event.service] || 0) + 1
      eventsByPriority[event.priority] = (eventsByPriority[event.priority] || 0) + 1
    }

    return {
      queueSize: this.eventQueue.length,
      processingActive: this.isProcessing,
      eventsByService,
      eventsByPriority,
      processedCount: this.processedEvents.size,
      failedCount: this.failedEvents.size
    }
  }

  // Clear all events (for cleanup or reset)
  clearQueue(): void {
    console.log(`Clearing event queue: ${this.eventQueue.length} events discarded`)
    this.eventQueue = []
    this.processedEvents.clear()
    this.failedEvents.clear()
    
    if (this.processingTimer) {
      clearTimeout(this.processingTimer)
      this.processingTimer = null
    }
  }

  // Get events for a specific service
  getServiceEvents(service: QueuedMultiplayerEvent['service']): QueuedMultiplayerEvent[] {
    return this.eventQueue.filter(event => event.service === service)
  }

  // Remove specific event from queue
  removeEvent(eventId: string): boolean {
    const index = this.eventQueue.findIndex(event => event.id === eventId)
    if (index >= 0) {
      const removed = this.eventQueue.splice(index, 1)[0]
      console.log(`Manually removed event: ${removed.id}`)
      return true
    }
    return false
  }

  // Schedule automatic queue processing
  scheduleProcessing(intervalMs: number, emitFunction: (eventType: string, data: unknown) => Promise<boolean>): void {
    if (this.processingTimer) {
      clearTimeout(this.processingTimer)
    }

    this.processingTimer = setTimeout(async () => {
      if (this.eventQueue.length > 0) {
        await this.processQueue(emitFunction)
      }
      
      // Schedule next processing
      this.scheduleProcessing(intervalMs, emitFunction)
    }, intervalMs)
  }

  // Cleanup
  destroy(): void {
    this.clearQueue()
    if (this.processingTimer) {
      clearTimeout(this.processingTimer)
      this.processingTimer = null
    }
    this.isProcessing = false
  }

  // Static cleanup
  static destroyInstance(): void {
    if (EventQueueManager.instance) {
      EventQueueManager.instance.destroy()
      EventQueueManager.instance = null
    }
  }
}

// Export singleton access functions
export const getEventQueueManager = (): EventQueueManager => {
  return EventQueueManager.getInstance()
}

export const initializeEventQueueManager = (config?: Partial<EventQueueConfig>): EventQueueManager => {
  return EventQueueManager.getInstance(config)
}

export const destroyEventQueueManager = (): void => {
  EventQueueManager.destroyInstance()
}