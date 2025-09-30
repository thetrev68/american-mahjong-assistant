// useMemoryOptimization - Memory leak prevention and optimization for Strategy Advisor
// Provides automatic cleanup, memory monitoring, and optimization strategies

import { useCallback, useEffect, useRef, useState, useMemo } from 'react'

interface MemoryOptimizationConfig {
  enableAutoCleanup: boolean
  enableMemoryTracking: boolean
  memoryWarningThreshold: number // MB
  memoryCriticalThreshold: number // MB
  cleanupInterval: number // ms
  maxCacheSize: number // number of items
  enableObjectPooling: boolean
  enableWeakReferences: boolean
}

interface MemoryMetrics {
  currentUsage: number // MB
  peakUsage: number // MB
  averageUsage: number // MB
  samplesCount: number
  lastMeasurement: number
  isOptimal: boolean
  warnings: MemoryWarning[]
  recommendations: MemoryRecommendation[]
}

interface MemoryWarning {
  type: 'high_usage' | 'memory_leak' | 'rapid_growth' | 'gc_pressure'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  suggestion: string
  timestamp: number
  value: number
}

interface MemoryRecommendation {
  action: 'cleanup_cache' | 'reduce_features' | 'enable_pooling' | 'force_gc'
  reason: string
  impact: 'low' | 'medium' | 'high'
  priority: number
}

interface CleanupTask {
  id: string
  cleanup: () => void
  priority: number
  description: string
  automated: boolean
}

interface CacheEntry<T = unknown> {
  value: T
  timestamp: number
  accessCount: number
  lastAccessed: number
  size: number // estimated size in bytes
}

interface UseMemoryOptimizationResult {
  metrics: MemoryMetrics
  isOptimizing: boolean
  cacheSize: number
  cleanupTasks: CleanupTask[]
  addCleanupTask: (task: Omit<CleanupTask, 'id'>) => string
  removeCleanupTask: (id: string) => void
  runCleanup: (taskId?: string) => void
  optimizeMemory: () => Promise<void>
  getCacheItem: <T>(key: string) => T | null
  setCacheItem: <T>(key: string, value: T, ttl?: number) => void
  clearCache: () => void
  forceGarbageCollection: () => void
  getMemoryReport: () => string
}

// Default configuration
const DEFAULT_CONFIG: MemoryOptimizationConfig = {
  enableAutoCleanup: true,
  enableMemoryTracking: true,
  memoryWarningThreshold: 50, // MB
  memoryCriticalThreshold: 100, // MB
  cleanupInterval: 30000, // 30 seconds
  maxCacheSize: 100,
  enableObjectPooling: true,
  enableWeakReferences: true
}

// Memory performance API types
interface PerformanceMemory {
  readonly usedJSHeapSize: number
  readonly totalJSHeapSize: number
  readonly jsHeapSizeLimit: number
}

interface PerformanceWithMemory extends Performance {
  readonly memory?: PerformanceMemory
}

// Estimate object size in bytes
const estimateObjectSize = (obj: unknown): number => {
  if (obj === null || obj === undefined) return 0

  const type = typeof obj

  switch (type) {
    case 'string':
      return obj.length * 2 // Assuming UTF-16
    case 'number':
      return 8
    case 'boolean':
      return 4
    case 'object':
      if (Array.isArray(obj)) {
        return obj.reduce((sum, item) => sum + estimateObjectSize(item), 24) // Array overhead
      }
      return Object.keys(obj).reduce((sum, key) => {
        return sum + estimateObjectSize(key) + estimateObjectSize(obj[key])
      }, 24) // Object overhead
    default:
      return 8
  }
}

// Generate unique task ID
const generateTaskId = (): string => {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export const useMemoryOptimization = (
  config: Partial<MemoryOptimizationConfig> = {}
): UseMemoryOptimizationResult => {
  // Configuration
  const finalConfig = useMemo((): MemoryOptimizationConfig => ({
    ...DEFAULT_CONFIG,
    ...config
  }), [config])

  // State management
  const [metrics, setMetrics] = useState<MemoryMetrics>({
    currentUsage: 0,
    peakUsage: 0,
    averageUsage: 0,
    samplesCount: 0,
    lastMeasurement: 0,
    isOptimal: true,
    warnings: [],
    recommendations: []
  })

  const [isOptimizing, setIsOptimizing] = useState(false)
  const [cleanupTasks, setCleanupTasks] = useState<CleanupTask[]>([])

  // Refs for tracking
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map())
  const memorySamplesRef = useRef<number[]>([])
  const cleanupIntervalRef = useRef<number | null>(null)
  const lastMemoryCheckRef = useRef<number>(0)
  const previousMemoryRef = useRef<number>(0)
  const memoryGrowthRateRef = useRef<number>(0)

  // Object pools for reusable objects
  const objectPoolsRef = useRef<Map<string, unknown[]>>(new Map())

  // WeakMap for cleanup tracking (reserved for future use)
  // const cleanupTrackingRef = useRef(new WeakMap())

  // Get current memory usage
  const getCurrentMemoryUsage = useCallback((): number => {
    try {
      const performance_ = performance as PerformanceWithMemory
      if (performance_.memory) {
        return Math.round(performance_.memory.usedJSHeapSize / 1024 / 1024) // Convert to MB
      }
    } catch (error) {
      console.warn('Failed to get memory usage:', error)
    }
    return 0
  }, [])

  // Update memory metrics
  const updateMemoryMetrics = useCallback(() => {
    if (!finalConfig.enableMemoryTracking) return

    const currentUsage = getCurrentMemoryUsage()
    const now = performance.now()

    memorySamplesRef.current.push(currentUsage)

    // Keep only recent samples (last 50)
    if (memorySamplesRef.current.length > 50) {
      memorySamplesRef.current.shift()
    }

    const averageUsage = memorySamplesRef.current.reduce((sum, usage) => sum + usage, 0) / memorySamplesRef.current.length
    const peakUsage = Math.max(metrics.peakUsage, currentUsage)

    // Calculate memory growth rate
    const timeDelta = now - lastMemoryCheckRef.current
    const memoryDelta = currentUsage - previousMemoryRef.current

    if (timeDelta > 0) {
      memoryGrowthRateRef.current = (memoryDelta / timeDelta) * 1000 // MB per second
    }

    // Generate warnings
    const warnings: MemoryWarning[] = []

    if (currentUsage > finalConfig.memoryWarningThreshold) {
      warnings.push({
        type: 'high_usage',
        severity: currentUsage > finalConfig.memoryCriticalThreshold ? 'critical' : 'high',
        message: `Memory usage is ${currentUsage}MB (threshold: ${finalConfig.memoryWarningThreshold}MB)`,
        suggestion: 'Consider running cleanup or reducing cache size',
        timestamp: Date.now(),
        value: currentUsage
      })
    }

    if (memoryGrowthRateRef.current > 0.1) { // Growing by more than 0.1MB/second
      warnings.push({
        type: 'memory_leak',
        severity: 'medium',
        message: `Rapid memory growth detected: ${memoryGrowthRateRef.current.toFixed(2)}MB/s`,
        suggestion: 'Check for memory leaks and run cleanup',
        timestamp: Date.now(),
        value: memoryGrowthRateRef.current
      })
    }

    // Generate recommendations
    const recommendations: MemoryRecommendation[] = []

    if (currentUsage > finalConfig.memoryWarningThreshold * 0.8) {
      recommendations.push({
        action: 'cleanup_cache',
        reason: 'Memory usage approaching warning threshold',
        impact: 'medium',
        priority: 1
      })
    }

    if (cacheRef.current.size > finalConfig.maxCacheSize * 0.8) {
      recommendations.push({
        action: 'cleanup_cache',
        reason: 'Cache size approaching limit',
        impact: 'low',
        priority: 2
      })
    }

    if (memoryGrowthRateRef.current > 0.05) {
      recommendations.push({
        action: 'force_gc',
        reason: 'Potential memory leak detected',
        impact: 'high',
        priority: 1
      })
    }

    setMetrics({
      currentUsage,
      peakUsage,
      averageUsage,
      samplesCount: memorySamplesRef.current.length,
      lastMeasurement: now,
      isOptimal: currentUsage < finalConfig.memoryWarningThreshold && memoryGrowthRateRef.current < 0.05,
      warnings,
      recommendations
    })

    previousMemoryRef.current = currentUsage
    lastMemoryCheckRef.current = now
  }, [finalConfig, getCurrentMemoryUsage, metrics.peakUsage])

  // Add cleanup task
  const addCleanupTask = useCallback((task: Omit<CleanupTask, 'id'>): string => {
    const id = generateTaskId()
    const newTask: CleanupTask = { ...task, id }

    setCleanupTasks(prev => {
      const updated = [...prev, newTask]
      return updated.sort((a, b) => a.priority - b.priority)
    })

    console.log(`[MemoryOptimization] Added cleanup task: ${task.description}`)
    return id
  }, [])

  // Remove cleanup task
  const removeCleanupTask = useCallback((id: string) => {
    setCleanupTasks(prev => prev.filter(task => task.id !== id))
    console.log(`[MemoryOptimization] Removed cleanup task: ${id}`)
  }, [])

  // Run cleanup tasks
  const runCleanup = useCallback((taskId?: string) => {
    const tasksToRun = taskId
      ? cleanupTasks.filter(task => task.id === taskId)
      : cleanupTasks.filter(task => task.automated)

    console.log(`[MemoryOptimization] Running ${tasksToRun.length} cleanup task(s)`)

    tasksToRun.forEach(task => {
      try {
        task.cleanup()
        console.log(`[MemoryOptimization] Completed cleanup: ${task.description}`)
      } catch (error) {
        console.error(`[MemoryOptimization] Cleanup failed for ${task.description}:`, error)
      }
    })

    // Remove completed automated tasks
    if (!taskId) {
      setCleanupTasks(prev => prev.filter(task => !task.automated))
    }
  }, [cleanupTasks])

  // Cache management
  const getCacheItem = useCallback(<T>(key: string): T | null => {
    const entry = cacheRef.current.get(key)
    if (!entry) return null

    // Update access information
    entry.accessCount++
    entry.lastAccessed = Date.now()

    return entry.value as T
  }, [])

  // Cache cleanup (LRU + size-based) - defined before setCacheItem to avoid circular dependency
  const cleanupCache = useCallback(() => {
    const cache = cacheRef.current
    const entries = Array.from(cache.entries())

    // Sort by last accessed time (LRU)
    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)

    // Remove oldest entries to get under limit
    const targetSize = Math.floor(finalConfig.maxCacheSize * 0.8)
    const toRemove = entries.length - targetSize

    if (toRemove > 0) {
      entries.slice(0, toRemove).forEach(([key]) => {
        cache.delete(key)
      })
      console.log(`[MemoryOptimization] Cleaned up ${toRemove} cache entries`)
    }
  }, [finalConfig.maxCacheSize])

  const setCacheItem = useCallback(<T>(key: string, value: T, ttl?: number): void => {
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
      size: estimateObjectSize(value)
    }

    cacheRef.current.set(key, entry)

    // Auto-cleanup if cache is getting too large
    if (cacheRef.current.size > finalConfig.maxCacheSize) {
      cleanupCache()
    }

    // Set TTL cleanup if specified
    if (ttl) {
      setTimeout(() => {
        cacheRef.current.delete(key)
      }, ttl)
    }
  }, [finalConfig.maxCacheSize, cleanupCache])

  const clearCache = useCallback(() => {
    const oldSize = cacheRef.current.size
    cacheRef.current.clear()
    console.log(`[MemoryOptimization] Cleared cache (${oldSize} items)`)
  }, [])

  // Object pooling (reserved for future use)
  // const getPooledObject = useCallback(<T>(poolName: string, factory: () => T): T => {
  //   if (!finalConfig.enableObjectPooling) {
  //     return factory()
  //   }

  //   const pool = objectPoolsRef.current.get(poolName) || []

  //   if (pool.length > 0) {
  //     return pool.pop() as T
  //   }

  //   return factory()
  // }, [finalConfig.enableObjectPooling])

  // const returnToPool = useCallback(<T>(poolName: string, object: T): void => {
  //   if (!finalConfig.enableObjectPooling) return

  //   const pool = objectPoolsRef.current.get(poolName) || []

  //   // Limit pool size to prevent memory bloat
  //   if (pool.length < 10) {
  //     pool.push(object)
  //     objectPoolsRef.current.set(poolName, pool)
  //   }
  // }, [finalConfig.enableObjectPooling])

  // Force garbage collection (if available)
  const forceGarbageCollection = useCallback(() => {
    try {
      // This only works in development or with specific flags
      if ('gc' in window && typeof (window as Window & { gc?: () => void }).gc === 'function') {
        (window as Window & { gc: () => void }).gc()
        console.log('[MemoryOptimization] Forced garbage collection')
      } else {
        console.log('[MemoryOptimization] Garbage collection not available')
      }
    } catch (error) {
      console.warn('[MemoryOptimization] Failed to force garbage collection:', error)
    }
  }, [])

  // Comprehensive memory optimization
  const optimizeMemory = useCallback(async (): Promise<void> => {
    setIsOptimizing(true)

    console.log('[MemoryOptimization] Starting memory optimization...')

    try {
      // 1. Clean up cache
      cleanupCache()

      // 2. Run cleanup tasks
      runCleanup()

      // 3. Clear object pools
      objectPoolsRef.current.clear()

      // 4. Force garbage collection
      forceGarbageCollection()

      // 5. Wait a bit for GC to complete
      await new Promise(resolve => setTimeout(resolve, 100))

      // 6. Update metrics
      updateMemoryMetrics()

      console.log('[MemoryOptimization] Memory optimization completed')
    } catch (error) {
      console.error('[MemoryOptimization] Memory optimization failed:', error)
    } finally {
      setIsOptimizing(false)
    }
  }, [cleanupCache, runCleanup, forceGarbageCollection, updateMemoryMetrics])

  // Generate memory report
  const getMemoryReport = useCallback((): string => {
    const report = [
      '=== Memory Optimization Report ===',
      `Current Usage: ${metrics.currentUsage}MB`,
      `Peak Usage: ${metrics.peakUsage}MB`,
      `Average Usage: ${metrics.averageUsage.toFixed(1)}MB`,
      `Cache Size: ${cacheRef.current.size} items`,
      `Cleanup Tasks: ${cleanupTasks.length}`,
      `Growth Rate: ${memoryGrowthRateRef.current.toFixed(3)}MB/s`,
      `Is Optimal: ${metrics.isOptimal ? 'Yes' : 'No'}`,
      '',
      'Warnings:',
      ...metrics.warnings.map(w => `- [${w.severity.toUpperCase()}] ${w.message}`),
      '',
      'Recommendations:',
      ...metrics.recommendations.map(r => `- ${r.action}: ${r.reason} (impact: ${r.impact})`)
    ].join('\n')

    return report
  }, [metrics, cleanupTasks.length])

  // Auto-cleanup interval
  useEffect(() => {
    if (finalConfig.enableAutoCleanup) {
      cleanupIntervalRef.current = window.setInterval(() => {
        if (metrics.currentUsage > finalConfig.memoryWarningThreshold * 0.8) {
          console.log('[MemoryOptimization] Auto-cleanup triggered')
          runCleanup()
        }
      }, finalConfig.cleanupInterval)

      return () => {
        if (cleanupIntervalRef.current) {
          clearInterval(cleanupIntervalRef.current)
        }
      }
    }
  }, [finalConfig, metrics.currentUsage, runCleanup])

  // Memory monitoring interval
  useEffect(() => {
    if (finalConfig.enableMemoryTracking) {
      const interval = setInterval(updateMemoryMetrics, 2000) // Every 2 seconds
      return () => clearInterval(interval)
    }
  }, [finalConfig.enableMemoryTracking, updateMemoryMetrics])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current)
      }

      // Run final cleanup
      runCleanup()
      clearCache()
    }
  }, [runCleanup, clearCache])

  // Auto-add common cleanup tasks - run only once on mount to prevent infinite loop
  // Empty dependency array ensures this only runs once on mount/unmount
  useEffect(() => {
    const cacheCleanupId = addCleanupTask({
      cleanup: cleanupCache,
      priority: 1,
      description: 'Clean up LRU cache entries',
      automated: true
    })

    return () => {
      removeCleanupTask(cacheCleanupId)
    }
    // Functions are stable via closure, empty array prevents infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    metrics,
    isOptimizing,
    cacheSize: cacheRef.current.size,
    cleanupTasks,
    addCleanupTask,
    removeCleanupTask,
    runCleanup,
    optimizeMemory,
    getCacheItem,
    setCacheItem,
    clearCache,
    forceGarbageCollection,
    getMemoryReport
  }
}

export default useMemoryOptimization