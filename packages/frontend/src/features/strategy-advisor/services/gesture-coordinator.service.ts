// Gesture Coordinator Service - Centralized management for all gesture interactions
// Provides event coordination, conflict resolution, and priority-based gesture handling

import type {
  GestureCoordinator,
  GestureEvent,
  GestureEventType
} from '../types/strategy-advisor.types'

interface GestureRegistration {
  id: string
  priority: number
  conflictsWith: string[]
  element?: HTMLElement
  isActive: boolean
  startTime: number
  metadata: Record<string, unknown>
}

/**
 * Centralized gesture coordination service
 * Manages gesture conflicts, priorities, and event dispatching
 */
class GestureCoordinatorService implements GestureCoordinator {
  private eventListeners = new Map<GestureEventType, Set<(event: GestureEvent) => void>>()
  private registeredGestures = new Map<string, GestureRegistration>()
  private gestureQueue: GestureEvent[] = []
  private isProcessingQueue = false
  private globalPaused = false

  constructor() {
    // Initialize event listener maps
    this.initializeEventTypes()
  }

  private initializeEventTypes(): void {
    const eventTypes: GestureEventType[] = [
      'tile-interaction-start',
      'tile-interaction-end',
      'swipe-start',
      'swipe-end',
      'pull-to-refresh-start',
      'pull-to-refresh-end',
      'long-press-start',
      'long-press-end',
      'gesture-conflict',
      'gesture-resolved'
    ]

    eventTypes.forEach(type => {
      this.eventListeners.set(type, new Set())
    })
  }

  // Event system implementation
  addEventListener(
    type: GestureEventType,
    listener: (event: GestureEvent) => void
  ): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set())
    }

    this.eventListeners.get(type)!.add(listener)
  }

  removeEventListener(
    type: GestureEventType,
    listener: (event: GestureEvent) => void
  ): void {
    const listeners = this.eventListeners.get(type)
    if (listeners) {
      listeners.delete(listener)
    }
  }

  dispatchEvent(event: GestureEvent): void {
    if (this.globalPaused && !this.isSystemEvent(event.type)) {
      return
    }

    // Add to queue for ordered processing
    this.gestureQueue.push(event)
    this.processEventQueue()
  }

  private async processEventQueue(): Promise<void> {
    if (this.isProcessingQueue || this.gestureQueue.length === 0) {
      return
    }

    this.isProcessingQueue = true

    while (this.gestureQueue.length > 0) {
      const event = this.gestureQueue.shift()!
      await this.processEvent(event)

      // Yield control periodically to prevent blocking
      if (this.gestureQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 0))
      }
    }

    this.isProcessingQueue = false
  }

  private async processEvent(event: GestureEvent): Promise<void> {
    // Handle gesture start/end events
    if (event.type.endsWith('-start')) {
      await this.handleGestureStart(event)
    } else if (event.type.endsWith('-end')) {
      await this.handleGestureEnd(event)
    }

    // Dispatch to listeners
    const listeners = this.eventListeners.get(event.type)
    if (listeners) {
      const promises = Array.from(listeners).map(async (listener) => {
        try {
          await listener(event)
        } catch (error) {
          console.error(`Error in gesture event listener for ${event.type}:`, error)
        }
      })

      await Promise.all(promises)
    }
  }

  private async handleGestureStart(event: GestureEvent): Promise<void> {
    const registration = this.registeredGestures.get(event.gestureId)
    if (!registration) {
      console.warn(`Gesture ${event.gestureId} not registered`)
      return
    }

    // Check if gesture is allowed to start
    if (!this.isGestureAllowed(event.gestureId)) {
      // Dispatch conflict event
      const conflictEvent: GestureEvent = {
        type: 'gesture-conflict',
        gestureId: event.gestureId,
        timestamp: performance.now(),
        element: event.element,
        data: {
          reason: 'gesture_not_allowed',
          conflictingGestures: this.getConflictingGestures(event.gestureId)
        }
      }

      this.dispatchEvent(conflictEvent)
      return
    }

    // Resolve conflicts with lower priority gestures
    await this.resolveConflictsForGesture(event.gestureId)

    // Activate gesture
    registration.isActive = true
    registration.startTime = event.timestamp
    registration.element = event.element
  }

  private async handleGestureEnd(event: GestureEvent): Promise<void> {
    const registration = this.registeredGestures.get(event.gestureId)
    if (!registration) {
      return
    }

    // Deactivate gesture
    registration.isActive = false
    registration.startTime = 0
    registration.element = undefined

    // Check if any queued gestures can now start
    await this.processQueuedGestures()
  }

  private async resolveConflictsForGesture(gestureId: string): Promise<void> {
    const registration = this.registeredGestures.get(gestureId)
    if (!registration) return

    const conflictingGestures = this.getActiveConflictingGestures(gestureId)

    for (const conflictingId of conflictingGestures) {
      const conflictingRegistration = this.registeredGestures.get(conflictingId)
      if (!conflictingRegistration) continue

      // Only cancel if current gesture has higher priority
      if (registration.priority > conflictingRegistration.priority) {
        await this.cancelGesture(conflictingId)

        // Dispatch resolution event
        const resolvedEvent: GestureEvent = {
          type: 'gesture-resolved',
          gestureId: conflictingId,
          timestamp: performance.now(),
          data: {
            resolvedBy: gestureId,
            reason: 'priority_conflict'
          }
        }

        this.dispatchEvent(resolvedEvent)
      }
    }
  }

  private async cancelGesture(gestureId: string): Promise<void> {
    const registration = this.registeredGestures.get(gestureId)
    if (!registration || !registration.isActive) return

    // Deactivate gesture
    registration.isActive = false
    registration.startTime = 0

    // Dispatch end event
    const endEvent: GestureEvent = {
      type: this.getEndEventType(gestureId),
      gestureId,
      timestamp: performance.now(),
      data: { cancelled: true }
    }

    this.dispatchEvent(endEvent)
  }

  private async processQueuedGestures(): Promise<void> {
    // Check if any registered gestures can now start
    for (const [gestureId, registration] of this.registeredGestures) {
      if (!registration.isActive && this.isGestureAllowed(gestureId)) {
        // This gesture could potentially start, but we need an actual start event
        // This is just for future enhancement where gestures might be queued
      }
    }
  }

  // Gesture management implementation
  registerGesture(
    gestureId: string,
    config: {
      priority: number
      conflictsWith?: string[]
      element?: HTMLElement
    }
  ): void {
    const registration: GestureRegistration = {
      id: gestureId,
      priority: config.priority,
      conflictsWith: config.conflictsWith || [],
      element: config.element,
      isActive: false,
      startTime: 0,
      metadata: {}
    }

    this.registeredGestures.set(gestureId, registration)
  }

  unregisterGesture(gestureId: string): void {
    const registration = this.registeredGestures.get(gestureId)
    if (registration?.isActive) {
      this.cancelGesture(gestureId)
    }

    this.registeredGestures.delete(gestureId)
  }

  // Conflict resolution implementation
  resolveConflict(gestureIds: string[]): string | null {
    if (gestureIds.length === 0) return null
    if (gestureIds.length === 1) return gestureIds[0]

    // Find the gesture with the highest priority
    let winningGesture: string | null = null
    let highestPriority = -1

    for (const gestureId of gestureIds) {
      const registration = this.registeredGestures.get(gestureId)
      if (registration && registration.priority > highestPriority) {
        highestPriority = registration.priority
        winningGesture = gestureId
      }
    }

    return winningGesture
  }

  setGesturePriority(gestureId: string, priority: number): void {
    const registration = this.registeredGestures.get(gestureId)
    if (registration) {
      registration.priority = priority
    }
  }

  // Global state implementation
  getActiveGestures(): string[] {
    return Array.from(this.registeredGestures.entries())
      .filter(([_, registration]) => registration.isActive)
      .map(([gestureId]) => gestureId)
  }

  isGestureAllowed(gestureId: string): boolean {
    if (this.globalPaused) return false

    const registration = this.registeredGestures.get(gestureId)
    if (!registration) return false

    // Check for conflicts with active gestures
    const conflictingGestures = this.getActiveConflictingGestures(gestureId)
    return conflictingGestures.length === 0
  }

  pauseAllGestures(): void {
    this.globalPaused = true

    // Cancel all active gestures
    const activeGestures = this.getActiveGestures()
    activeGestures.forEach(gestureId => {
      this.cancelGesture(gestureId)
    })
  }

  resumeAllGestures(): void {
    this.globalPaused = false
  }

  // Helper methods
  private getConflictingGestures(gestureId: string): string[] {
    const registration = this.registeredGestures.get(gestureId)
    if (!registration) return []

    return registration.conflictsWith.filter(conflictId =>
      this.registeredGestures.has(conflictId)
    )
  }

  private getActiveConflictingGestures(gestureId: string): string[] {
    const conflictingGestures = this.getConflictingGestures(gestureId)
    return conflictingGestures.filter(conflictId => {
      const conflictRegistration = this.registeredGestures.get(conflictId)
      return conflictRegistration?.isActive
    })
  }

  private isSystemEvent(eventType: GestureEventType): boolean {
    return eventType === 'gesture-conflict' || eventType === 'gesture-resolved'
  }

  private getEndEventType(gestureId: string): GestureEventType {
    // Map gesture IDs to their end event types
    const endEventMap: Record<string, GestureEventType> = {
      'tile-interaction': 'tile-interaction-end',
      'tile-drag': 'tile-interaction-end',
      'pattern-swipe': 'swipe-end',
      'carousel-swipe': 'swipe-end',
      'pull-to-refresh': 'pull-to-refresh-end',
      'long-press': 'long-press-end',
      'pattern-long-press': 'long-press-end'
    }

    return endEventMap[gestureId] || 'gesture-resolved'
  }

  // Public utility methods
  getGestureInfo(gestureId: string): GestureRegistration | null {
    return this.registeredGestures.get(gestureId) || null
  }

  getConflictReport(): {
    activeGestures: string[]
    conflicts: Array<{ gesture: string; conflictsWith: string[] }>
  } {
    const activeGestures = this.getActiveGestures()
    const conflicts = activeGestures.map(gestureId => ({
      gesture: gestureId,
      conflictsWith: this.getActiveConflictingGestures(gestureId)
    }))

    return { activeGestures, conflicts }
  }

  // Debug methods
  debugLog(): void {
    console.log('Gesture Coordinator State:', {
      registeredGestures: Array.from(this.registeredGestures.keys()),
      activeGestures: this.getActiveGestures(),
      isPaused: this.globalPaused,
      queueLength: this.gestureQueue.length
    })
  }
}

// Singleton instance
export const gestureCoordinator = new GestureCoordinatorService()

// React hook for using the gesture coordinator
export const useGestureCoordinator = () => {
  return gestureCoordinator
}

// Utility functions for common gesture patterns
export const GesturePatterns = {
  // High-priority interactive gestures
  TILE_INTERACTION: {
    priority: 10,
    conflictsWith: ['pattern-swipe', 'pull-to-refresh', 'long-press']
  },

  // Medium-priority navigation gestures
  PATTERN_SWIPE: {
    priority: 6,
    conflictsWith: ['tile-interaction', 'pull-to-refresh']
  },

  PULL_TO_REFRESH: {
    priority: 7,
    conflictsWith: ['tile-interaction', 'pattern-swipe', 'carousel-swipe']
  },

  // Lower-priority enhancement gestures
  LONG_PRESS: {
    priority: 4,
    conflictsWith: ['tile-interaction', 'pattern-swipe']
  },

  CAROUSEL_SWIPE: {
    priority: 5,
    conflictsWith: ['tile-interaction', 'pull-to-refresh']
  }
} as const