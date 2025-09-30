// usePerformanceMonitoring - 60fps performance tracking and optimization for Strategy Advisor
// Monitors frame rate, memory usage, and component performance with automatic degradation

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'

interface PerformanceMetrics {
  frameRate: number
  averageFrameRate: number
  memoryUsage: number // MB
  componentRenderTime: number // ms
  totalRenderCount: number
  slowRenders: number
  jsHeapSize: number // MB
  lastMeasurement: number
  performanceScore: number // 0-100
  isOptimal: boolean
  warnings: PerformanceWarning[]
}

interface PerformanceWarning {
  type: 'low_fps' | 'high_memory' | 'slow_render' | 'memory_leak' | 'excessive_rerenders'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  suggestion: string
  timestamp: number
}

interface PerformanceConfig {
  targetFps: number
  maxMemoryMB: number
  maxRenderTimeMs: number
  sampleSize: number
  enableAutoOptimization: boolean
  enableDegradation: boolean
  degradationThreshold: number
}

interface PerformanceState {
  metrics: PerformanceMetrics
  isMonitoring: boolean
  isDegraded: boolean
  config: PerformanceConfig
}

interface UsePerformanceMonitoringOptions {
  componentName?: string
  enableMemoryTracking?: boolean
  enableFrameRateTracking?: boolean
  enableRenderTracking?: boolean
  autoOptimize?: boolean
  reportingCallback?: (metrics: PerformanceMetrics) => void
}

interface PerformanceOptimizations {
  reduceAnimations: boolean
  simplifyRendering: boolean
  disableNonEssentialFeatures: boolean
  increaseThrottling: boolean
  enableVirtualization: boolean
}

// Default configuration
const DEFAULT_CONFIG: PerformanceConfig = {
  targetFps: 60,
  maxMemoryMB: 100,
  maxRenderTimeMs: 16,
  sampleSize: 10,
  enableAutoOptimization: true,
  enableDegradation: true,
  degradationThreshold: 40 // Performance score below this triggers degradation
}

// Performance memory API types
interface PerformanceMemory {
  readonly usedJSHeapSize: number
  readonly totalJSHeapSize: number
  readonly jsHeapSizeLimit: number
}

interface PerformanceWithMemory extends Performance {
  readonly memory?: PerformanceMemory
}

export const usePerformanceMonitoring = (
  options: UsePerformanceMonitoringOptions = {}
): {
  metrics: PerformanceMetrics
  isMonitoring: boolean
  isDegraded: boolean
  isOptimizing: boolean // Alias for isDegraded
  optimizations: PerformanceOptimizations
  startMonitoring: () => void
  stopMonitoring: () => void
  measureRender: (renderFunction: () => void) => number
  measureRenderTime: <T>(renderFunction: () => T, operationName?: string) => T
  reportMetrics: () => void
  resetMetrics: () => void
  applyOptimizations: (optimizations: Partial<PerformanceOptimizations>) => void
} => {
  const {
    componentName = 'StrategyAdvisor',
    enableMemoryTracking = true,
    enableFrameRateTracking = true,
    enableRenderTracking = true,
    autoOptimize: shouldAutoOptimize = true,
    reportingCallback
  } = options

  // State management
  const [state, setState] = useState<PerformanceState>({
    metrics: {
      frameRate: 60,
      averageFrameRate: 60,
      memoryUsage: 0,
      componentRenderTime: 0,
      totalRenderCount: 0,
      slowRenders: 0,
      jsHeapSize: 0,
      lastMeasurement: performance.now(),
      performanceScore: 100,
      isOptimal: true,
      warnings: []
    },
    isMonitoring: false,
    isDegraded: false,
    config: DEFAULT_CONFIG
  })

  // Refs for tracking
  // const frameCountRef = useRef(0) // Reserved for future frame counting
  // const frameStartTimeRef = useRef(0) // Reserved for future frame timing
  const rafIdRef = useRef<number | null>(null)
  const renderTimesRef = useRef<number[]>([])
  const memoryCheckIntervalRef = useRef<number | null>(null)
  const lastFrameTimeRef = useRef(performance.now())
  const frameRateSamplesRef = useRef<number[]>([])
  const previousMemoryRef = useRef(0)
  const renderCountRef = useRef(0)

  // Optimizations state
  const [optimizations, setOptimizations] = useState<PerformanceOptimizations>({
    reduceAnimations: false,
    simplifyRendering: false,
    disableNonEssentialFeatures: false,
    increaseThrottling: false,
    enableVirtualization: false
  })

  // Memory usage calculation
  const getMemoryUsage = useCallback((): number => {
    if (!enableMemoryTracking) return 0

    try {
      const performance_ = performance as PerformanceWithMemory
      if (performance_.memory) {
        return Math.round(performance_.memory.usedJSHeapSize / 1024 / 1024) // Convert to MB
      }
    } catch (error) {
      console.warn('Failed to get memory usage:', error)
    }
    return 0
  }, [enableMemoryTracking])

  // Frame rate monitoring
  const monitorFrameRate = useCallback(() => {
    if (!enableFrameRateTracking || !state.isMonitoring) return

    const now = performance.now()
    const deltaTime = now - lastFrameTimeRef.current

    if (deltaTime > 0) {
      const currentFps = 1000 / deltaTime
      frameRateSamplesRef.current.push(currentFps)

      // Keep only recent samples
      if (frameRateSamplesRef.current.length > state.config.sampleSize) {
        frameRateSamplesRef.current.shift()
      }

      // Calculate average FPS
      const averageFps = frameRateSamplesRef.current.reduce((sum, fps) => sum + fps, 0) / frameRateSamplesRef.current.length

      setState(prev => ({
        ...prev,
        metrics: {
          ...prev.metrics,
          frameRate: currentFps,
          averageFrameRate: averageFps,
          lastMeasurement: now
        }
      }))
    }

    lastFrameTimeRef.current = now
    rafIdRef.current = requestAnimationFrame(monitorFrameRate)
  }, [enableFrameRateTracking, state.isMonitoring, state.config.sampleSize])

  // Memory monitoring
  const monitorMemory = useCallback(() => {
    if (!enableMemoryTracking) return

    const currentMemory = getMemoryUsage()
    const memoryDelta = currentMemory - previousMemoryRef.current

    setState(prev => {
      const newMetrics = {
        ...prev.metrics,
        memoryUsage: currentMemory,
        jsHeapSize: currentMemory
      }

      // Check for memory leaks (consistent growth)
      const warnings = [...prev.metrics.warnings]
      if (memoryDelta > 5 && currentMemory > state.config.maxMemoryMB * 0.8) {
        warnings.push({
          type: 'memory_leak',
          severity: 'high',
          message: `Memory usage increased by ${memoryDelta}MB to ${currentMemory}MB`,
          suggestion: 'Check for memory leaks in components and event listeners',
          timestamp: Date.now()
        })
      }

      return {
        ...prev,
        metrics: {
          ...newMetrics,
          warnings: warnings.slice(-10) // Keep last 10 warnings
        }
      }
    })

    previousMemoryRef.current = currentMemory
  }, [enableMemoryTracking, getMemoryUsage, state.config.maxMemoryMB])

  // Calculate performance score
  const calculatePerformanceScore = useCallback((metrics: PerformanceMetrics): number => {
    let score = 100

    // Frame rate penalty (40% weight)
    const fpsRatio = metrics.averageFrameRate / state.config.targetFps
    score -= Math.max(0, (1 - fpsRatio) * 40)

    // Memory usage penalty (30% weight)
    const memoryRatio = metrics.memoryUsage / state.config.maxMemoryMB
    score -= Math.max(0, (memoryRatio - 0.5) * 30)

    // Render time penalty (20% weight)
    const renderRatio = metrics.componentRenderTime / state.config.maxRenderTimeMs
    score -= Math.max(0, (renderRatio - 1) * 20)

    // Slow renders penalty (10% weight)
    const slowRenderRatio = metrics.slowRenders / Math.max(metrics.totalRenderCount, 1)
    score -= slowRenderRatio * 10

    return Math.max(0, Math.min(100, score))
  }, [state.config])

  // Generate performance warnings
  const generateWarnings = useCallback((metrics: PerformanceMetrics): PerformanceWarning[] => {
    const warnings: PerformanceWarning[] = []
    const now = Date.now()

    if (metrics.averageFrameRate < state.config.targetFps * 0.8) {
      warnings.push({
        type: 'low_fps',
        severity: metrics.averageFrameRate < state.config.targetFps * 0.6 ? 'critical' : 'high',
        message: `Frame rate is ${Math.round(metrics.averageFrameRate)}fps (target: ${state.config.targetFps}fps)`,
        suggestion: 'Reduce animations or enable performance mode',
        timestamp: now
      })
    }

    if (metrics.memoryUsage > state.config.maxMemoryMB * 0.8) {
      warnings.push({
        type: 'high_memory',
        severity: metrics.memoryUsage > state.config.maxMemoryMB ? 'critical' : 'high',
        message: `Memory usage is ${metrics.memoryUsage}MB (limit: ${state.config.maxMemoryMB}MB)`,
        suggestion: 'Clear unused data or enable memory optimization',
        timestamp: now
      })
    }

    if (metrics.componentRenderTime > state.config.maxRenderTimeMs) {
      warnings.push({
        type: 'slow_render',
        severity: metrics.componentRenderTime > state.config.maxRenderTimeMs * 2 ? 'critical' : 'medium',
        message: `Component render time is ${Math.round(metrics.componentRenderTime)}ms (target: <${state.config.maxRenderTimeMs}ms)`,
        suggestion: 'Optimize component rendering or enable simplified mode',
        timestamp: now
      })
    }

    const excessiveRerenderThreshold = 100
    if (metrics.totalRenderCount > excessiveRerenderThreshold) {
      warnings.push({
        type: 'excessive_rerenders',
        severity: 'medium',
        message: `Component has rendered ${metrics.totalRenderCount} times`,
        suggestion: 'Check for unnecessary re-renders and optimize dependencies',
        timestamp: now
      })
    }

    return warnings
  }, [state.config])

  // Auto-optimization logic
  const performAutoOptimization = useCallback((performanceScore: number) => {
    if (!shouldAutoOptimize || !state.config.enableAutoOptimization) return

    const newOptimizations: PerformanceOptimizations = {
      reduceAnimations: performanceScore < 70,
      simplifyRendering: performanceScore < 60,
      disableNonEssentialFeatures: performanceScore < 50,
      increaseThrottling: performanceScore < 80,
      enableVirtualization: performanceScore < 40
    }

    setOptimizations(prev => ({
      ...prev,
      ...newOptimizations
    }))

    setState(prev => ({
      ...prev,
      isDegraded: performanceScore < state.config.degradationThreshold
    }))
  }, [shouldAutoOptimize, state.config])

  // Update metrics with calculated values
  const updateMetrics = useCallback(() => {
    setState(prev => {
      const updatedMetrics = {
        ...prev.metrics,
        performanceScore: calculatePerformanceScore(prev.metrics),
        warnings: generateWarnings(prev.metrics),
        isOptimal: prev.metrics.averageFrameRate >= state.config.targetFps * 0.9 &&
                   prev.metrics.memoryUsage < state.config.maxMemoryMB * 0.7 &&
                   prev.metrics.componentRenderTime < state.config.maxRenderTimeMs
      }

      // Auto-optimize based on performance score
      performAutoOptimization(updatedMetrics.performanceScore)

      // Report metrics if callback provided
      if (reportingCallback) {
        reportingCallback(updatedMetrics)
      }

      return {
        ...prev,
        metrics: updatedMetrics
      }
    })
  }, [calculatePerformanceScore, generateWarnings, performAutoOptimization, reportingCallback, state.config])

  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (state.isMonitoring) return

    setState(prev => ({ ...prev, isMonitoring: true }))

    // Start frame rate monitoring
    if (enableFrameRateTracking) {
      lastFrameTimeRef.current = performance.now()
      rafIdRef.current = requestAnimationFrame(monitorFrameRate)
    }

    // Start memory monitoring
    if (enableMemoryTracking) {
      monitorMemory() // Initial check
      memoryCheckIntervalRef.current = window.setInterval(monitorMemory, 2000) // Every 2 seconds
    }

    console.log(`[${componentName}] Performance monitoring started`)
  }, [state.isMonitoring, enableFrameRateTracking, enableMemoryTracking, monitorFrameRate, monitorMemory, componentName])

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    setState(prev => ({ ...prev, isMonitoring: false }))

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }

    if (memoryCheckIntervalRef.current) {
      clearInterval(memoryCheckIntervalRef.current)
      memoryCheckIntervalRef.current = null
    }

    console.log(`[${componentName}] Performance monitoring stopped`)
  }, [componentName])

  // Measure render time
  const measureRender = useCallback((renderFunction: () => void): number => {
    if (!enableRenderTracking) {
      renderFunction()
      return 0
    }

    const startTime = performance.now()
    renderFunction()
    const endTime = performance.now()
    const renderTime = endTime - startTime

    renderTimesRef.current.push(renderTime)
    renderCountRef.current++

    // Keep only recent render times
    if (renderTimesRef.current.length > state.config.sampleSize) {
      renderTimesRef.current.shift()
    }

    // Calculate average render time
    const averageRenderTime = renderTimesRef.current.reduce((sum, time) => sum + time, 0) / renderTimesRef.current.length

    setState(prev => ({
      ...prev,
      metrics: {
        ...prev.metrics,
        componentRenderTime: averageRenderTime,
        totalRenderCount: renderCountRef.current,
        slowRenders: prev.metrics.slowRenders + (renderTime > state.config.maxRenderTimeMs ? 1 : 0)
      }
    }))

    return renderTime
  }, [enableRenderTracking, state.config])

  // Report current metrics
  const reportMetrics = useCallback(() => {
    console.group(`[${componentName}] Performance Report`)
    console.log('Metrics:', state.metrics)
    console.log('Optimizations:', optimizations)
    console.log('Is Degraded:', state.isDegraded)
    console.groupEnd()

    if (reportingCallback) {
      reportingCallback(state.metrics)
    }
  }, [componentName, state.metrics, state.isDegraded, optimizations, reportingCallback])

  // Reset metrics
  const resetMetrics = useCallback(() => {
    renderTimesRef.current = []
    frameRateSamplesRef.current = []
    renderCountRef.current = 0

    setState(prev => ({
      ...prev,
      metrics: {
        frameRate: 60,
        averageFrameRate: 60,
        memoryUsage: getMemoryUsage(),
        componentRenderTime: 0,
        totalRenderCount: 0,
        slowRenders: 0,
        jsHeapSize: getMemoryUsage(),
        lastMeasurement: performance.now(),
        performanceScore: 100,
        isOptimal: true,
        warnings: []
      }
    }))

    console.log(`[${componentName}] Performance metrics reset`)
  }, [componentName, getMemoryUsage])

  // Apply custom optimizations
  const applyOptimizations = useCallback((newOptimizations: Partial<PerformanceOptimizations>) => {
    setOptimizations(prev => ({
      ...prev,
      ...newOptimizations
    }))

    console.log(`[${componentName}] Applied optimizations:`, newOptimizations)
  }, [componentName])

  // Update metrics periodically - updateMetrics removed from deps to prevent infinite loop
  useEffect(() => {
    if (state.isMonitoring) {
      const interval = setInterval(updateMetrics, 1000) // Update every second
      return () => clearInterval(interval)
    }
    // updateMetrics is intentionally omitted to prevent infinite re-render loop
  }, [state.isMonitoring])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring()
    }
  }, [stopMonitoring])

  // Measure render time wrapper for functional interface
  const measureRenderTime = useCallback(<T>(
    renderFunction: () => T,
    operationName?: string
  ): T => {
    if (!enableRenderTracking) {
      return renderFunction()
    }

    const startTime = performance.now()
    const result = renderFunction()
    const endTime = performance.now()
    const renderTime = endTime - startTime

    renderTimesRef.current.push(renderTime)
    renderCountRef.current++

    // Keep only recent render times
    if (renderTimesRef.current.length > state.config.sampleSize) {
      renderTimesRef.current.shift()
    }

    // Calculate average render time
    const averageRenderTime = renderTimesRef.current.reduce((sum, time) => sum + time, 0) / renderTimesRef.current.length

    setState(prev => ({
      ...prev,
      metrics: {
        ...prev.metrics,
        componentRenderTime: averageRenderTime,
        totalRenderCount: renderCountRef.current,
        slowRenders: prev.metrics.slowRenders + (renderTime > state.config.maxRenderTimeMs ? 1 : 0)
      }
    }))

    if (operationName) {
      console.log(`[${componentName}] ${operationName} completed in ${renderTime.toFixed(2)}ms`)
    }

    return result
  }, [enableRenderTracking, state.config, componentName])

  // Memoized return value
  return useMemo(() => ({
    metrics: state.metrics,
    isMonitoring: state.isMonitoring,
    isDegraded: state.isDegraded,
    isOptimizing: state.isDegraded, // Alias for backwards compatibility
    optimizations,
    startMonitoring,
    stopMonitoring,
    measureRender,
    measureRenderTime, // New functional interface
    reportMetrics,
    resetMetrics,
    applyOptimizations
  }), [
    state.metrics,
    state.isMonitoring,
    state.isDegraded,
    optimizations,
    startMonitoring,
    stopMonitoring,
    measureRender,
    measureRenderTime,
    reportMetrics,
    resetMetrics,
    applyOptimizations
  ])
}

export default usePerformanceMonitoring