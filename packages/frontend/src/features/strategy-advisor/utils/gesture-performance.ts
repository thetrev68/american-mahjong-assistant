// Gesture Performance Utilities - Optimizations for 60fps mobile gesture handling
// Provides throttling, debouncing, and performance monitoring for smooth interactions

import type { GesturePerformanceMetrics, GesturePerformanceUtils } from '../types/strategy-advisor.types'

// Type for Chrome's performance.memory API
interface PerformanceMemory {
  readonly usedJSHeapSize: number
  readonly totalJSHeapSize: number
  readonly jsHeapSizeLimit: number
}

// Extend Performance interface to include memory
interface PerformanceWithMemory extends Performance {
  readonly memory?: PerformanceMemory
}

// Performance monitoring state
const performanceMonitor: {
  isMonitoring: boolean
  metrics: GesturePerformanceMetrics
  frameStartTime: number
  gestureStartTime: number
  rafId: number | null
} = {
  isMonitoring: false,
  metrics: {
    frameRate: 60,
    gestureResponseTime: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    lastMeasurement: 0,
    averageResponseTime: 0,
    missedFrames: 0
  },
  frameStartTime: 0,
  gestureStartTime: 0,
  rafId: null
}

// Frame rate monitoring
const updateFrameRate = () => {
  if (!performanceMonitor.isMonitoring) return

  const now = performance.now()
  const deltaTime = now - performanceMonitor.frameStartTime

  if (deltaTime > 0) {
    const currentFps = 1000 / deltaTime

    // Smooth frame rate calculation
    performanceMonitor.metrics.frameRate =
      performanceMonitor.metrics.frameRate * 0.9 + currentFps * 0.1

    // Track missed frames (target 60fps = ~16.67ms per frame)
    if (deltaTime > 20) { // More than 20ms indicates a missed frame
      performanceMonitor.metrics.missedFrames++
    }
  }

  performanceMonitor.frameStartTime = now
  performanceMonitor.metrics.lastMeasurement = now

  // Continue monitoring
  performanceMonitor.rafId = requestAnimationFrame(updateFrameRate)
}

// Memory usage estimation
const estimateMemoryUsage = (): number => {
  if ('memory' in performance) {
    // Use proper typing for Chrome's performance.memory API
    const memory = (performance as PerformanceWithMemory).memory
    return memory ? memory.usedJSHeapSize / 1024 / 1024 : 0 // Convert to MB
  }
  return 0
}

// High-performance throttle for 60fps target
export const throttleForFrameRate = <T extends unknown[]>(
  fn: (...args: T) => void,
  targetFps: number = 60
): ((...args: T) => void) => {
  const frameTime = 1000 / targetFps
  let lastTime = 0
  let timeoutId: number | null = null

  return (...args: T) => {
    const now = performance.now()
    const timeSinceLastCall = now - lastTime

    if (timeSinceLastCall >= frameTime) {
      lastTime = now
      fn(...args)
    } else if (!timeoutId) {
      timeoutId = window.setTimeout(() => {
        lastTime = performance.now()
        timeoutId = null
        fn(...args)
      }, frameTime - timeSinceLastCall)
    }
  }
}

// Advanced throttle with frame budget management
export const throttleWithFrameBudget = <T extends unknown[]>(
  fn: (...args: T) => void,
  maxExecutionTime: number = 8 // ms per frame budget
): ((...args: T) => void) => {
  let isExecuting = false
  let pendingArgs: T | null = null

  return (...args: T) => {
    pendingArgs = args

    if (isExecuting) return

    isExecuting = true

    const executeWithBudget = () => {
      const startTime = performance.now()

      if (pendingArgs) {
        fn(...pendingArgs)
        pendingArgs = null
      }

      const executionTime = performance.now() - startTime

      // Track performance
      if (performanceMonitor.isMonitoring) {
        performanceMonitor.metrics.gestureResponseTime = executionTime
        performanceMonitor.metrics.averageResponseTime =
          performanceMonitor.metrics.averageResponseTime * 0.9 + executionTime * 0.1
      }

      isExecuting = false

      // If we have more pending work and we're within budget, continue
      if (pendingArgs && executionTime < maxExecutionTime) {
        requestAnimationFrame(executeWithBudget)
      }
    }

    requestAnimationFrame(executeWithBudget)
  }
}

// Gesture-specific debounce with smart timing
export const debounceGesture = <T extends unknown[]>(
  fn: (...args: T) => void,
  delay: number
): ((...args: T) => void) => {
  let timeoutId: number | null = null
  let lastArgs: T | null = null

  return (...args: T) => {
    lastArgs = args

    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = window.setTimeout(() => {
      if (lastArgs) {
        fn(...lastArgs)
        lastArgs = null
      }
      timeoutId = null
    }, delay)
  }
}

// Batch gesture updates for efficiency
export const batchGestureUpdates = (updates: (() => void)[]): void => {
  if (updates.length === 0) return

  requestAnimationFrame(() => {
    const startTime = performance.now()

    for (const update of updates) {
      update()

      // Yield control if we've used too much frame time
      if (performance.now() - startTime > 8) {
        // Schedule remaining updates for next frame
        if (updates.length > 0) {
          batchGestureUpdates(updates.slice(updates.indexOf(update) + 1))
        }
        break
      }
    }
  })
}

// Smart event listener cleanup
export const cleanupGestureListeners = (element: HTMLElement): void => {
  // Remove all gesture-related event listeners
  const events = [
    'touchstart', 'touchmove', 'touchend', 'touchcancel',
    'pointerdown', 'pointermove', 'pointerup', 'pointercancel',
    'mousedown', 'mousemove', 'mouseup',
    'gesturestart', 'gesturechange', 'gestureend'
  ]

  events.forEach(_eventType => {
    // Clone and replace element to remove all listeners
    const newElement = element.cloneNode(true) as HTMLElement
    element.parentNode?.replaceChild(newElement, element)
  })
}

// Passive event listener utility for better performance
export const addPassiveEventListener = (
  element: HTMLElement,
  event: string,
  handler: EventListener,
  options?: AddEventListenerOptions
): void => {
  element.addEventListener(event, handler, {
    passive: true,
    ...options
  })
}

// Gesture performance utilities implementation
export const gesturePerformanceUtils: GesturePerformanceUtils = {
  // Monitoring
  startPerformanceMonitoring: () => {
    if (performanceMonitor.isMonitoring) return

    performanceMonitor.isMonitoring = true
    performanceMonitor.frameStartTime = performance.now()
    performanceMonitor.metrics.missedFrames = 0
    performanceMonitor.rafId = requestAnimationFrame(updateFrameRate)
  },

  stopPerformanceMonitoring: () => {
    performanceMonitor.isMonitoring = false
    if (performanceMonitor.rafId) {
      cancelAnimationFrame(performanceMonitor.rafId)
      performanceMonitor.rafId = null
    }
  },

  getMetrics: () => ({
    ...performanceMonitor.metrics,
    memoryUsage: estimateMemoryUsage()
  }),

  // Optimization
  throttleGesture: <T extends unknown[]>(
    fn: (...args: T) => void,
    ms: number
  ) => throttleForFrameRate(fn, 1000 / ms),

  debounceGesture,

  optimizeForFrameRate: <T extends unknown[]>(
    fn: (...args: T) => void
  ) => throttleWithFrameBudget(fn),

  // Memory management
  cleanupGestureListeners,
  batchGestureUpdates
}

// Performance monitoring hook for React components
export const useGesturePerformance = () => {
  const [metrics, setMetrics] = React.useState<GesturePerformanceMetrics>(
    performanceMonitor.metrics
  )

  React.useEffect(() => {
    gesturePerformanceUtils.startPerformanceMonitoring()

    const interval = setInterval(() => {
      setMetrics(gesturePerformanceUtils.getMetrics())
    }, 1000) // Update metrics every second

    return () => {
      clearInterval(interval)
      gesturePerformanceUtils.stopPerformanceMonitoring()
    }
  }, [])

  return {
    metrics,
    isOptimal: metrics.frameRate > 55 && metrics.averageResponseTime < 16,
    warnings: {
      lowFrameRate: metrics.frameRate < 50,
      highResponseTime: metrics.averageResponseTime > 20,
      missedFrames: metrics.missedFrames > 5
    }
  }
}

// Gesture optimization constants
export const GESTURE_CONSTANTS = {
  TARGET_FPS: 60,
  FRAME_BUDGET_MS: 8,
  MAX_RESPONSE_TIME_MS: 16,
  THROTTLE_INTERVAL_MS: 16,
  DEBOUNCE_DELAY_MS: 100,
  PERFORMANCE_SAMPLE_SIZE: 10,
  MEMORY_WARNING_THRESHOLD_MB: 50
} as const

// React import (for the hook)
import React from 'react'