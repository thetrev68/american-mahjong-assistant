// Gesture Conflict Avoidance Hook - Smart detection and resolution of gesture conflicts
// Prevents interference between tile dragging, pattern swiping, and other gestures

import { useState, useCallback, useRef, useEffect } from 'react'
import type {
  UseGestureConflictAvoidance,
  GestureConflictState,
  GestureEvent,
  GestureEventType
} from '../types/strategy-advisor.types'

interface GestureRegistration {
  id: string
  priority: number
  element?: HTMLElement
  isActive: boolean
  startTime: number
  conflictsWith: Set<string>
}

interface ConflictZone {
  id: string
  rect: DOMRect
  gestureTypes: Set<string>
}

/**
 * Hook for managing gesture conflicts and ensuring smooth multi-touch interactions
 * Provides intelligent conflict detection and resolution for mobile gameplay
 */
export const useGestureConflictAvoidance = (): UseGestureConflictAvoidance => {
  // State
  const [conflictState, setConflictState] = useState<GestureConflictState>({
    activeTileInteraction: false,
    activeSwipeGesture: false,
    activePullToRefresh: false,
    activeLongPress: false,
    conflictZones: [],
    allowedGestures: new Set()
  })

  // Internal tracking
  const registeredGesturesRef = useRef<Map<string, GestureRegistration>>(new Map())
  const conflictZonesRef = useRef<Map<string, ConflictZone>>(new Map())
  const eventListenersRef = useRef<Map<GestureEventType, Set<(event: GestureEvent) => void>>>(new Map())

  // Initialize event listener maps
  useEffect(() => {
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
      if (!eventListenersRef.current.has(type)) {
        eventListenersRef.current.set(type, new Set())
      }
    })
  }, [])

  // Update allowed gestures based on current state
  const updateAllowedGestures = useCallback(() => {
    const allowedGestures = new Set<string>()

    for (const [gestureId, registration] of registeredGesturesRef.current) {
      if (registration.isActive || canActivateGesture(gestureId)) {
        allowedGestures.add(gestureId)
      }
    }

    setConflictState(prev => ({
      ...prev,
      allowedGestures
    }))
  }, [canActivateGesture])

  // Define canActivateGesture before it's used
  const canActivateGesture = useCallback((
    gestureId: string,
    position?: { x: number; y: number }
  ): boolean => {
    const registration = registeredGesturesRef.current.get(gestureId)
    if (!registration) return false

    // Check if position is in a conflict zone
    if (position && isInConflictZone(position)) {
      // Only allow high-priority gestures in conflict zones
      if (registration.priority < 8) return false
    }

    // Check for active conflicting gestures
    for (const [activeGestureId, activeRegistration] of registeredGesturesRef.current) {
      if (activeGestureId === gestureId) continue
      if (!activeRegistration.isActive) continue

      // Check if this gesture conflicts with the active one
      if (registration.conflictsWith.has(activeGestureId)) {
        // Allow if this gesture has higher priority
        if (registration.priority <= activeRegistration.priority) {
          return false
        }
      }
    }

    return true
  }, [isInConflictZone])

  // Check if position is in a conflict zone
  const isInConflictZone = useCallback((position: { x: number; y: number }): boolean => {
    for (const zone of conflictZonesRef.current.values()) {
      const rect = zone.rect
      if (
        position.x >= rect.left &&
        position.x <= rect.right &&
        position.y >= rect.top &&
        position.y <= rect.bottom
      ) {
        return true
      }
    }
    return false
  }, [])

  // Register a gesture for conflict detection
  const registerGesture = useCallback((gestureId: string, element?: HTMLElement) => {
    const registration: GestureRegistration = {
      id: gestureId,
      priority: getPriorityForGesture(gestureId),
      element,
      isActive: false,
      startTime: 0,
      conflictsWith: getConflictsForGesture(gestureId)
    }

    registeredGesturesRef.current.set(gestureId, registration)

    // Update allowed gestures
    updateAllowedGestures()
  }, [updateAllowedGestures])

  // Unregister a gesture
  const unregisterGesture = useCallback((gestureId: string) => {
    registeredGesturesRef.current.delete(gestureId)
    updateAllowedGestures()
  }, [updateAllowedGestures])

  // Register a conflict zone
  const registerConflictZone = useCallback((zone: DOMRect, zoneId: string) => {
    const conflictZone: ConflictZone = {
      id: zoneId,
      rect: zone,
      gestureTypes: new Set(['tile-interaction', 'long-press']) // Default conflicts
    }

    conflictZonesRef.current.set(zoneId, conflictZone)

    setConflictState(prev => ({
      ...prev,
      conflictZones: Array.from(conflictZonesRef.current.values()).map(z => z.rect)
    }))
  }, [])

  // Unregister a conflict zone
  const unregisterConflictZone = useCallback((zoneId: string) => {
    conflictZonesRef.current.delete(zoneId)

    setConflictState(prev => ({
      ...prev,
      conflictZones: Array.from(conflictZonesRef.current.values()).map(z => z.rect)
    }))
  }, [])


  // Check if there are active conflicts
  const hasActiveConflicts = useCallback((): boolean => {
    const activeGestures = Array.from(registeredGesturesRef.current.values())
      .filter(g => g.isActive)

    for (let i = 0; i < activeGestures.length; i++) {
      for (let j = i + 1; j < activeGestures.length; j++) {
        const gesture1 = activeGestures[i]
        const gesture2 = activeGestures[j]

        if (gesture1.conflictsWith.has(gesture2.id) || gesture2.conflictsWith.has(gesture1.id)) {
          return true
        }
      }
    }

    return false
  }, [])

  // Update state for gesture start
  const updateStateForGestureStart = useCallback((gestureId: string) => {
    setConflictState(prev => {
      const newState = { ...prev }

      switch (gestureId) {
        case 'tile-interaction':
        case 'tile-drag':
        case 'tile-selection':
          newState.activeTileInteraction = true
          break
        case 'pattern-swipe':
        case 'carousel-swipe':
          newState.activeSwipeGesture = true
          break
        case 'pull-to-refresh':
          newState.activePullToRefresh = true
          break
        case 'long-press':
        case 'pattern-long-press':
          newState.activeLongPress = true
          break
      }

      return newState
    })
  }, [])

  // Update state for gesture end
  const updateStateForGestureEnd = useCallback((gestureId: string) => {
    setConflictState(prev => {
      const newState = { ...prev }

      switch (gestureId) {
        case 'tile-interaction':
        case 'tile-drag':
        case 'tile-selection':
          newState.activeTileInteraction = false
          break
        case 'pattern-swipe':
        case 'carousel-swipe':
          newState.activeSwipeGesture = false
          break
        case 'pull-to-refresh':
          newState.activePullToRefresh = false
          break
        case 'long-press':
        case 'pattern-long-press':
          newState.activeLongPress = false
          break
      }

      return newState
    })
  }, [])

  // Dispatch gesture event to listeners
  const dispatchGestureEvent = useCallback((event: GestureEvent) => {
    const listeners = eventListenersRef.current.get(event.type)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event)
        } catch (error) {
          console.error(`Error in gesture event listener for ${event.type}:`, error)
        }
      })
    }
  }, [])

  // Notify that a gesture has started
  const notifyGestureStart = useCallback((gestureId: string, element?: HTMLElement) => {
    const registration = registeredGesturesRef.current.get(gestureId)
    if (!registration) return

    // Check if gesture is allowed to start
    if (!canActivateGesture(gestureId)) {
      // Dispatch conflict event
      dispatchGestureEvent({
        type: 'gesture-conflict',
        gestureId,
        timestamp: performance.now(),
        element,
        data: { reason: 'activation_blocked' }
      })
      return
    }

    // Update registration
    registration.isActive = true
    registration.startTime = performance.now()
    registration.element = element

    // Update state based on gesture type
    updateStateForGestureStart(gestureId)

    // Dispatch start event
    dispatchGestureEvent({
      type: getEventTypeForGesture(gestureId, 'start'),
      gestureId,
      timestamp: registration.startTime,
      element
    })

    updateAllowedGestures()
  }, [canActivateGesture, dispatchGestureEvent, updateStateForGestureStart, updateAllowedGestures])

  // Notify that a gesture has ended
  const notifyGestureEnd = useCallback((gestureId: string) => {
    const registration = registeredGesturesRef.current.get(gestureId)
    if (!registration || !registration.isActive) return

    // Update registration
    registration.isActive = false
    registration.startTime = 0

    // Update state based on gesture type
    updateStateForGestureEnd(gestureId)

    // Dispatch end event
    dispatchGestureEvent({
      type: getEventTypeForGesture(gestureId, 'end'),
      gestureId,
      timestamp: performance.now(),
      element: registration.element
    })

    updateAllowedGestures()
  }, [dispatchGestureEvent, updateStateForGestureEnd, updateAllowedGestures])


  return {
    // State
    conflictState,

    // Registration
    registerGesture,
    unregisterGesture,
    registerConflictZone,
    unregisterConflictZone,

    // Conflict detection
    canActivateGesture,
    isInConflictZone,
    hasActiveConflicts,

    // Event handling
    notifyGestureStart,
    notifyGestureEnd
  }
}

// Helper functions

// Get priority for gesture type (higher = more important)
const getPriorityForGesture = (gestureId: string): number => {
  const priorityMap: Record<string, number> = {
    // High priority - essential game interactions
    'tile-interaction': 10,
    'tile-drag': 10,
    'tile-selection': 9,

    // Medium priority - navigation and feedback
    'pull-to-refresh': 7,
    'pattern-swipe': 6,
    'carousel-swipe': 6,

    // Lower priority - optional enhancements
    'long-press': 4,
    'pattern-long-press': 4,
    'haptic-feedback': 3
  }

  return priorityMap[gestureId] || 5
}

// Get conflicts for gesture type
const getConflictsForGesture = (gestureId: string): Set<string> => {
  const conflictMap: Record<string, string[]> = {
    'tile-interaction': ['pattern-swipe', 'pull-to-refresh', 'long-press'],
    'tile-drag': ['pattern-swipe', 'pull-to-refresh', 'carousel-swipe'],
    'pattern-swipe': ['tile-interaction', 'pull-to-refresh'],
    'carousel-swipe': ['tile-drag', 'pull-to-refresh'],
    'pull-to-refresh': ['tile-interaction', 'pattern-swipe', 'carousel-swipe'],
    'long-press': ['tile-interaction', 'pattern-swipe'],
    'pattern-long-press': ['tile-interaction', 'carousel-swipe']
  }

  return new Set(conflictMap[gestureId] || [])
}

// Get event type for gesture start/end
const getEventTypeForGesture = (gestureId: string, phase: 'start' | 'end'): GestureEventType => {
  const eventTypeMap: Record<string, { start: GestureEventType; end: GestureEventType }> = {
    'tile-interaction': {
      start: 'tile-interaction-start',
      end: 'tile-interaction-end'
    },
    'pattern-swipe': {
      start: 'swipe-start',
      end: 'swipe-end'
    },
    'carousel-swipe': {
      start: 'swipe-start',
      end: 'swipe-end'
    },
    'pull-to-refresh': {
      start: 'pull-to-refresh-start',
      end: 'pull-to-refresh-end'
    },
    'long-press': {
      start: 'long-press-start',
      end: 'long-press-end'
    },
    'pattern-long-press': {
      start: 'long-press-start',
      end: 'long-press-end'
    }
  }

  const events = eventTypeMap[gestureId]
  return events ? events[phase] : (phase === 'start' ? 'gesture-conflict' : 'gesture-resolved')
}

// Utility hook for tile interaction conflict detection
export const useTileInteractionConflicts = () => {
  const conflictAvoidance = useGestureConflictAvoidance()

  // Register tile interaction zones on mount
  useEffect(() => {
    // Find all tile elements and register them as conflict zones
    const tileElements = document.querySelectorAll('[data-tile-id]')

    tileElements.forEach((element, index) => {
      const rect = element.getBoundingClientRect()
      conflictAvoidance.registerConflictZone(rect, `tile-zone-${index}`)
    })

    return () => {
      // Cleanup zones on unmount
      tileElements.forEach((_, index) => {
        conflictAvoidance.unregisterConflictZone(`tile-zone-${index}`)
      })
    }
  }, [conflictAvoidance])

  return {
    canUseTileInteraction: () => conflictAvoidance.canActivateGesture('tile-interaction'),
    startTileInteraction: () => conflictAvoidance.notifyGestureStart('tile-interaction'),
    endTileInteraction: () => conflictAvoidance.notifyGestureEnd('tile-interaction'),
    hasConflicts: conflictAvoidance.hasActiveConflicts()
  }
}