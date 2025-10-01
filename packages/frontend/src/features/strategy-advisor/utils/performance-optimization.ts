// Performance Optimization - Production-ready performance utilities for Strategy Advisor
// Provides comprehensive optimization strategies for 60fps performance on all devices

interface PerformanceOptimizations {
  enableVirtualization: boolean
  reduceAnimations: boolean
  optimizeRendering: boolean
  enableLazyLoading: boolean
  useMemoization: boolean
  enableCodeSplitting: boolean
  optimizeImages: boolean
  enablePrefetching: boolean
  useWebWorkers: boolean
  enableCaching: boolean
}

interface DeviceCapabilities {
  isHighPerformance: boolean
  isLowEndDevice: boolean
  connectionSpeed: 'slow' | 'fast' | 'unknown'
  memoryLimit: number
  cpuCores: number
  gpuTier: 'low' | 'medium' | 'high'
  supportsPWA: boolean
  supportsWebGL: boolean
}

interface PerformanceMetrics {
  fcp: number // First Contentful Paint
  lcp: number // Largest Contentful Paint
  fid: number // First Input Delay
  cls: number // Cumulative Layout Shift
  ttfb: number // Time to First Byte
  renderTime: number
  memoryUsage: number
  jsHeapSize: number
}

interface OptimizationConfig {
  targetFPS: number
  memoryBudget: number // MB
  renderBudget: number // ms per frame
  loadingBudget: number // ms for initial load
  enableAdaptiveOptimization: boolean
  aggressiveOptimizations: boolean
}

// Default configuration
const DEFAULT_CONFIG: OptimizationConfig = {
  targetFPS: 60,
  memoryBudget: 100, // 100MB
  renderBudget: 16, // 16ms per frame (60fps)
  loadingBudget: 2000, // 2 seconds
  enableAdaptiveOptimization: true,
  aggressiveOptimizations: false
}

// Device capability detection
const detectDeviceCapabilities = (): DeviceCapabilities => {
  const nav = navigator as Navigator & {
    hardwareConcurrency?: number
    deviceMemory?: number
    connection?: { effectiveType?: string }
    mozConnection?: { effectiveType?: string }
    webkitConnection?: { effectiveType?: string }
  }

  // CPU cores
  const cpuCores = nav.hardwareConcurrency || 4

  // Memory
  const memoryGB = nav.deviceMemory || 4

  // Connection speed
  const connection = nav.connection || nav.mozConnection || nav.webkitConnection
  const connectionSpeed = connection
    ? connection.effectiveType === '4g' || connection.effectiveType === '3g'
      ? 'fast'
      : 'slow'
    : 'unknown'

  // Performance characteristics
  const isHighPerformance = cpuCores >= 4 && memoryGB >= 4
  const isLowEndDevice = cpuCores <= 2 || memoryGB <= 2

  // Feature support
  const supportsPWA = 'serviceWorker' in navigator
  const supportsWebGL = (() => {
    try {
      const canvas = document.createElement('canvas')
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    } catch {
      return false
    }
  })()

  // GPU tier estimation (simplified)
  const gpuTier = isHighPerformance ? 'high' : isLowEndDevice ? 'low' : 'medium'

  return {
    isHighPerformance,
    isLowEndDevice,
    connectionSpeed,
    memoryLimit: memoryGB * 1024, // Convert to MB
    cpuCores,
    gpuTier,
    supportsPWA,
    supportsWebGL
  }
}

// Performance metrics collection
const collectPerformanceMetrics = (): Promise<PerformanceMetrics> => {
  return new Promise((resolve) => {
    // Wait for next frame to ensure measurements are accurate
    requestAnimationFrame(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const paint = performance.getEntriesByType('paint')

      // Core Web Vitals
      let fcp = 0
      let lcp = 0
      const fid = 0
      const cls = 0

      // First Contentful Paint
      const fcpEntry = paint.find(entry => entry.name === 'first-contentful-paint')
      if (fcpEntry) {
        fcp = fcpEntry.startTime
      }

      // Largest Contentful Paint (requires observer)
      try {
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1]
          lcp = lastEntry.startTime
        }).observe({ type: 'largest-contentful-paint', buffered: true })
      } catch {
        // Fallback if LCP is not supported
        lcp = fcp * 1.5
      }

      // Memory metrics
      const memoryInfo = (performance as Performance & { memory?: { usedJSHeapSize: number, totalJSHeapSize: number } }).memory
      const memoryUsage = memoryInfo ? memoryInfo.usedJSHeapSize / 1024 / 1024 : 0
      const jsHeapSize = memoryInfo ? memoryInfo.totalJSHeapSize / 1024 / 1024 : 0

      resolve({
        fcp,
        lcp,
        fid,
        cls,
        ttfb: navigation ? navigation.responseStart - navigation.requestStart : 0,
        renderTime: performance.now(),
        memoryUsage,
        jsHeapSize
      })
    })
  })
}

// Adaptive optimization strategies
class PerformanceOptimizer {
  private config: OptimizationConfig
  private deviceCapabilities: DeviceCapabilities
  private currentOptimizations: PerformanceOptimizations
  private metricsHistory: PerformanceMetrics[] = []

  constructor(config: Partial<OptimizationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.deviceCapabilities = detectDeviceCapabilities()
    this.currentOptimizations = this.calculateOptimalSettings()

    console.log('[PerformanceOptimizer] Initialized with device capabilities:', this.deviceCapabilities)
    console.log('[PerformanceOptimizer] Applied optimizations:', this.currentOptimizations)
  }

  // Calculate optimal settings based on device capabilities
  private calculateOptimalSettings(): PerformanceOptimizations {
    const { isLowEndDevice, isHighPerformance, connectionSpeed, memoryLimit } = this.deviceCapabilities

    return {
      enableVirtualization: isLowEndDevice || memoryLimit < 2048,
      reduceAnimations: isLowEndDevice || connectionSpeed === 'slow',
      optimizeRendering: true, // Always optimize rendering
      enableLazyLoading: connectionSpeed === 'slow' || isLowEndDevice,
      useMemoization: true, // Always use memoization
      enableCodeSplitting: connectionSpeed === 'slow' || !isHighPerformance,
      optimizeImages: connectionSpeed === 'slow' || isLowEndDevice,
      enablePrefetching: isHighPerformance && connectionSpeed === 'fast',
      useWebWorkers: isHighPerformance && this.deviceCapabilities.cpuCores > 2,
      enableCaching: true // Always enable caching
    }
  }

  // Get current optimizations
  getOptimizations(): PerformanceOptimizations {
    return { ...this.currentOptimizations }
  }

  // Update optimizations based on current performance
  async updateOptimizations(): Promise<PerformanceOptimizations> {
    if (!this.config.enableAdaptiveOptimization) {
      return this.currentOptimizations
    }

    const metrics = await collectPerformanceMetrics()
    this.metricsHistory.push(metrics)

    // Keep only recent metrics (last 10)
    if (this.metricsHistory.length > 10) {
      this.metricsHistory.shift()
    }

    const avgMetrics = this.calculateAverageMetrics()
    const shouldOptimize = this.shouldIncreaseOptimizations(avgMetrics)
    const canReduceOptimizations = this.canReduceOptimizations(avgMetrics)

    if (shouldOptimize) {
      this.increaseOptimizations()
      console.log('[PerformanceOptimizer] Increased optimizations due to poor performance')
    } else if (canReduceOptimizations) {
      this.reduceOptimizations()
      console.log('[PerformanceOptimizer] Reduced optimizations due to good performance')
    }

    return this.currentOptimizations
  }

  private calculateAverageMetrics(): PerformanceMetrics {
    if (this.metricsHistory.length === 0) {
      return {
        fcp: 0, lcp: 0, fid: 0, cls: 0, ttfb: 0,
        renderTime: 0, memoryUsage: 0, jsHeapSize: 0
      }
    }

    const totals = this.metricsHistory.reduce((acc, metrics) => ({
      fcp: acc.fcp + metrics.fcp,
      lcp: acc.lcp + metrics.lcp,
      fid: acc.fid + metrics.fid,
      cls: acc.cls + metrics.cls,
      ttfb: acc.ttfb + metrics.ttfb,
      renderTime: acc.renderTime + metrics.renderTime,
      memoryUsage: acc.memoryUsage + metrics.memoryUsage,
      jsHeapSize: acc.jsHeapSize + metrics.jsHeapSize
    }))

    const count = this.metricsHistory.length
    return {
      fcp: totals.fcp / count,
      lcp: totals.lcp / count,
      fid: totals.fid / count,
      cls: totals.cls / count,
      ttfb: totals.ttfb / count,
      renderTime: totals.renderTime / count,
      memoryUsage: totals.memoryUsage / count,
      jsHeapSize: totals.jsHeapSize / count
    }
  }

  private shouldIncreaseOptimizations(metrics: PerformanceMetrics): boolean {
    return (
      metrics.lcp > 2500 || // LCP > 2.5s is poor
      metrics.fid > 100 || // FID > 100ms is poor
      metrics.cls > 0.1 || // CLS > 0.1 is poor
      metrics.memoryUsage > this.config.memoryBudget * 0.8 || // 80% of memory budget
      metrics.renderTime > this.config.renderBudget * 2 // Double the render budget
    )
  }

  private canReduceOptimizations(metrics: PerformanceMetrics): boolean {
    return (
      metrics.lcp < 1500 && // LCP < 1.5s is good
      metrics.fid < 50 && // FID < 50ms is good
      metrics.cls < 0.05 && // CLS < 0.05 is good
      metrics.memoryUsage < this.config.memoryBudget * 0.5 && // 50% of memory budget
      metrics.renderTime < this.config.renderBudget // Within render budget
    )
  }

  private increaseOptimizations(): void {
    this.currentOptimizations = {
      ...this.currentOptimizations,
      enableVirtualization: true,
      reduceAnimations: true,
      enableLazyLoading: true,
      enableCodeSplitting: true,
      optimizeImages: true,
      useWebWorkers: false, // Disable web workers if performance is poor
      enablePrefetching: false // Disable prefetching if performance is poor
    }
  }

  private reduceOptimizations(): void {
    if (this.deviceCapabilities.isHighPerformance) {
      this.currentOptimizations = {
        ...this.currentOptimizations,
        reduceAnimations: false,
        enablePrefetching: true,
        useWebWorkers: this.deviceCapabilities.cpuCores > 2
      }
    }
  }

  // Get performance recommendations
  getRecommendations(): string[] {
    const recommendations: string[] = []
    const optimizations = this.currentOptimizations

    if (optimizations.enableVirtualization) {
      recommendations.push('Enable virtual scrolling for large lists')
    }

    if (optimizations.reduceAnimations) {
      recommendations.push('Reduce animations and transitions')
    }

    if (optimizations.enableLazyLoading) {
      recommendations.push('Implement lazy loading for images and components')
    }

    if (optimizations.enableCodeSplitting) {
      recommendations.push('Use code splitting for non-critical features')
    }

    if (optimizations.useWebWorkers) {
      recommendations.push('Offload heavy computations to web workers')
    }

    if (!optimizations.enablePrefetching) {
      recommendations.push('Disable resource prefetching to conserve bandwidth')
    }

    return recommendations
  }

  // Apply React-specific optimizations
  getReactOptimizations() {
    const opts = this.currentOptimizations

    return {
      // React.memo usage
      useMemo: opts.useMemoization,
      useCallback: opts.useMemoization,
      memo: opts.optimizeRendering,

      // Virtualization
      useVirtualization: opts.enableVirtualization,
      virtualScrollThreshold: opts.enableVirtualization ? 20 : 100,

      // Lazy loading
      useLazyLoading: opts.enableLazyLoading,
      lazyLoadThreshold: opts.enableLazyLoading ? '200px' : '0px',

      // Animation settings
      enableAnimations: !opts.reduceAnimations,
      animationDuration: opts.reduceAnimations ? 100 : 300,
      useTransitions: !opts.reduceAnimations,

      // Bundle splitting
      enableCodeSplitting: opts.enableCodeSplitting,
      chunkSize: opts.enableCodeSplitting ? 'small' : 'medium',

      // Image optimization
      imageQuality: opts.optimizeImages ? 'medium' : 'high',
      enableWebP: opts.optimizeImages,
      lazyLoadImages: opts.enableLazyLoading,

      // Caching
      enableServiceWorker: opts.enableCaching && this.deviceCapabilities.supportsPWA,
      cacheStrategy: opts.enableCaching ? 'aggressive' : 'conservative',

      // Web Workers
      useWebWorkers: opts.useWebWorkers,
      maxWorkers: opts.useWebWorkers ? Math.min(this.deviceCapabilities.cpuCores - 1, 2) : 0
    }
  }

  // Performance monitoring utilities
  measureRenderTime = <T extends unknown[], R>(
    fn: (...args: T) => R,
    name: string = 'render'
  ) => {
    return (...args: T): R => {
      const start = performance.now()
      const result = fn(...args)
      const end = performance.now()

      console.log(`[PerformanceOptimizer] ${name} took ${(end - start).toFixed(2)}ms`)

      return result
    }
  }

  // Throttle function with adaptive timing
  createAdaptiveThrottle = <T extends unknown[]>(
    fn: (...args: T) => void,
    baseMs: number = 100
  ) => {
    const throttleMs = this.currentOptimizations.reduceAnimations
      ? baseMs * 2
      : baseMs

    let lastCall = 0
    let timeoutId: number | null = null

    return (...args: T) => {
      const now = Date.now()

      if (now - lastCall >= throttleMs) {
        lastCall = now
        fn(...args)
      } else if (!timeoutId) {
        timeoutId = window.setTimeout(() => {
          lastCall = Date.now()
          timeoutId = null
          fn(...args)
        }, throttleMs - (now - lastCall))
      }
    }
  }

  // Memory pressure detection
  detectMemoryPressure(): 'low' | 'medium' | 'high' | 'critical' {
    const memoryInfo = (performance as Performance & { memory?: { usedJSHeapSize: number, jsHeapSizeLimit: number } }).memory
    if (!memoryInfo) return 'low'

    const usedRatio = memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit

    if (usedRatio > 0.9) return 'critical'
    if (usedRatio > 0.7) return 'high'
    if (usedRatio > 0.5) return 'medium'
    return 'low'
  }

  // Get performance report
  getPerformanceReport(): string {
    const latest = this.metricsHistory[this.metricsHistory.length - 1]
    const avgMetrics = this.calculateAverageMetrics()

    return `
=== Performance Optimization Report ===
Device: ${this.deviceCapabilities.isHighPerformance ? 'High-end' : this.deviceCapabilities.isLowEndDevice ? 'Low-end' : 'Mid-range'}
CPU Cores: ${this.deviceCapabilities.cpuCores}
Memory: ${this.deviceCapabilities.memoryLimit}MB
Connection: ${this.deviceCapabilities.connectionSpeed}

Current Metrics:
- LCP: ${latest?.lcp != null ? latest.lcp.toFixed(0) : 'n/a'}ms
- FCP: ${latest?.fcp != null ? latest.fcp.toFixed(0) : 'n/a'}ms
- Memory: ${latest?.memoryUsage != null ? latest.memoryUsage.toFixed(1) : 'n/a'}MB

Average Metrics:
- LCP: ${avgMetrics.lcp != null ? avgMetrics.lcp.toFixed(0) : 'n/a'}ms
- FCP: ${avgMetrics.fcp != null ? avgMetrics.fcp.toFixed(0) : 'n/a'}ms
- Memory: ${avgMetrics.memoryUsage != null ? avgMetrics.memoryUsage.toFixed(1) : 'n/a'}MB

Active Optimizations:
${Object.entries(this.currentOptimizations)
  .filter(([_, enabled]) => enabled)
  .map(([key]) => `- ${key}`)
  .join('\n')}

Recommendations:
${this.getRecommendations().map(rec => `- ${rec}`).join('\n')}
    `.trim()
  }
}

// Performance monitoring React hook
import { useEffect, useRef, useState } from 'react'

export const usePerformanceOptimization = (
  config: Partial<OptimizationConfig> = {}
) => {
  const optimizerRef = useRef<PerformanceOptimizer>()
  const [optimizations, setOptimizations] = useState<PerformanceOptimizations>()
  const [isOptimizing, setIsOptimizing] = useState(false)

  // Initialize optimizer
  useEffect(() => {
    optimizerRef.current = new PerformanceOptimizer(config)
    setOptimizations(optimizerRef.current.getOptimizations())
  }, [config])

  // Update optimizations periodically
  useEffect(() => {
    if (!optimizerRef.current || !config.enableAdaptiveOptimization) return

    const interval = setInterval(async () => {
      setIsOptimizing(true)
      const newOptimizations = await optimizerRef.current!.updateOptimizations()
      setOptimizations(newOptimizations)
      setIsOptimizing(false)
    }, 10000) // Check every 10 seconds

    return () => clearInterval(interval)
  }, [config.enableAdaptiveOptimization])

  return {
    optimizations: optimizations || {},
    isOptimizing,
    reactOptimizations: optimizerRef.current?.getReactOptimizations(),
    measureRenderTime: optimizerRef.current?.measureRenderTime,
    createAdaptiveThrottle: optimizerRef.current?.createAdaptiveThrottle,
    detectMemoryPressure: optimizerRef.current?.detectMemoryPressure,
    getPerformanceReport: optimizerRef.current?.getPerformanceReport,
    deviceCapabilities: optimizerRef.current?.deviceCapabilities
  }
}

// Export utilities
export {
  PerformanceOptimizer,
  detectDeviceCapabilities,
  collectPerformanceMetrics,
  type PerformanceOptimizations,
  type DeviceCapabilities,
  type PerformanceMetrics,
  type OptimizationConfig
}

export default PerformanceOptimizer