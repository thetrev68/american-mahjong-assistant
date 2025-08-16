// Performance Monitoring and Optimization Hook

import { useCallback, useRef, useState, useEffect } from 'react'

export interface PerformanceMetrics {
  fps: number
  frameTime: number
  memoryUsage?: number
  renderTime: number
  animationPerformance: {
    averageFrameTime: number
    droppedFrames: number
    totalFrames: number
  }
}

export interface UsePerformanceReturn {
  // Current metrics
  metrics: PerformanceMetrics
  isMonitoring: boolean
  
  // Performance monitoring
  startMonitoring: () => void
  stopMonitoring: () => void
  getSnapshot: () => PerformanceMetrics
  
  // Performance optimization
  shouldReduceAnimations: boolean
  shouldSkipNonEssentialUpdates: boolean
  getOptimalFrameRate: () => number
  
  // Animation performance helpers
  measureAnimation: (name: string, fn: () => void | Promise<void>) => Promise<number>
  trackFrameRate: (duration?: number) => Promise<number>
  checkRenderingCapability: () => Promise<'high' | 'medium' | 'low'>
  
  // Memory monitoring
  measureMemoryUsage: () => number | null
  detectMemoryPressure: () => boolean
}

// Performance thresholds for different device capabilities
const PERFORMANCE_THRESHOLDS = {
  high: { minFps: 55, maxFrameTime: 18 },
  medium: { minFps: 30, maxFrameTime: 33 },
  low: { minFps: 15, maxFrameTime: 66 }
}

export function usePerformance(): UsePerformanceReturn {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    frameTime: 16.67,
    renderTime: 0,
    animationPerformance: {
      averageFrameTime: 16.67,
      droppedFrames: 0,
      totalFrames: 0
    }
  })
  
  const [isMonitoring, setIsMonitoring] = useState(false)
  const monitoringRef = useRef<{
    rafId?: number
    frameCount: number
    lastTime: number
    frameTimes: number[]
    startTime: number
  }>({
    frameCount: 0,
    lastTime: 0,
    frameTimes: [],
    startTime: 0
  })
  
  // FPS and frame time monitoring
  const measureFrame = useCallback(() => {
    const now = performance.now()
    const monitoring = monitoringRef.current
    
    if (monitoring.lastTime > 0) {
      const frameTime = now - monitoring.lastTime
      monitoring.frameTimes.push(frameTime)
      monitoring.frameCount++
      
      // Keep only last 60 frames for rolling average
      if (monitoring.frameTimes.length > 60) {
        monitoring.frameTimes.shift()
      }
      
      // Update metrics every 30 frames or 500ms
      if (monitoring.frameCount % 30 === 0 || now - monitoring.startTime > 500) {
        const avgFrameTime = monitoring.frameTimes.reduce((a, b) => a + b, 0) / monitoring.frameTimes.length
        const fps = Math.round(1000 / avgFrameTime)
        const droppedFrames = monitoring.frameTimes.filter(ft => ft > 20).length
        
        setMetrics(prev => ({
          ...prev,
          fps,
          frameTime: avgFrameTime,
          animationPerformance: {
            averageFrameTime: avgFrameTime,
            droppedFrames,
            totalFrames: monitoring.frameCount
          }
        }))
      }
    }
    
    monitoring.lastTime = now
    
    if (isMonitoring) {
      monitoring.rafId = requestAnimationFrame(measureFrame)
    }
  }, [isMonitoring])
  
  const startMonitoring = useCallback(() => {
    if (isMonitoring) return
    
    setIsMonitoring(true)
    monitoringRef.current = {
      frameCount: 0,
      lastTime: 0,
      frameTimes: [],
      startTime: performance.now()
    }
    
    measureFrame()
  }, [isMonitoring, measureFrame])
  
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false)
    
    if (monitoringRef.current.rafId) {
      cancelAnimationFrame(monitoringRef.current.rafId)
      monitoringRef.current.rafId = undefined
    }
  }, [])
  
  const getSnapshot = useCallback((): PerformanceMetrics => {
    return { ...metrics }
  }, [metrics])
  
  // Performance optimization decisions
  const shouldReduceAnimations = metrics.fps < 30 || metrics.frameTime > 33
  const shouldSkipNonEssentialUpdates = metrics.fps < 20 || metrics.frameTime > 50
  
  const getOptimalFrameRate = useCallback((): number => {
    if (metrics.fps >= 55) return 60
    if (metrics.fps >= 30) return 30
    return 15
  }, [metrics.fps])
  
  // Animation performance measurement
  const measureAnimation = useCallback(async (name: string, fn: () => void | Promise<void>): Promise<number> => {
    const startTime = performance.now()
    
    // Track frames during animation
    const framesBefore = monitoringRef.current.frameCount
    
    try {
      await fn()
    } catch (error) {
      console.warn(`Animation "${name}" failed:`, error)
    }
    
    const endTime = performance.now()
    const duration = endTime - startTime
    const framesAfter = monitoringRef.current.frameCount
    const framesUsed = framesAfter - framesBefore
    
    // Calculate performance impact
    const avgFrameTimeBeforeAnimation = metrics.animationPerformance.averageFrameTime
    const expectedFrames = Math.ceil(duration / avgFrameTimeBeforeAnimation)
    const performanceImpact = framesUsed > expectedFrames ? framesUsed - expectedFrames : 0
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`Animation "${name}" performance:`, {
        duration: `${duration.toFixed(2)}ms`,
        framesUsed,
        expectedFrames,
        performanceImpact: performanceImpact > 0 ? `+${performanceImpact} frames` : 'Good'
      })
    }
    
    return duration
  }, [metrics.animationPerformance.averageFrameTime])
  
  // Frame rate tracking for a specific duration
  const trackFrameRate = useCallback(async (duration: number = 1000): Promise<number> => {
    return new Promise((resolve) => {
      const startTime = performance.now()
      const startFrames = monitoringRef.current.frameCount
      
      setTimeout(() => {
        const endFrames = monitoringRef.current.frameCount
        const actualDuration = performance.now() - startTime
        const fps = Math.round((endFrames - startFrames) / (actualDuration / 1000))
        resolve(fps)
      }, duration)
    })
  }, [])
  
  // Check overall rendering capability
  const checkRenderingCapability = useCallback(async (): Promise<'high' | 'medium' | 'low'> => {
    // Start monitoring if not already started
    const wasMonitoring = isMonitoring
    if (!wasMonitoring) startMonitoring()
    
    // Measure performance over 2 seconds
    const testDuration = 2000
    const fps = await trackFrameRate(testDuration)
    
    // Stop monitoring if we started it
    if (!wasMonitoring) stopMonitoring()
    
    if (fps >= PERFORMANCE_THRESHOLDS.high.minFps) return 'high'
    if (fps >= PERFORMANCE_THRESHOLDS.medium.minFps) return 'medium'
    return 'low'
  }, [isMonitoring, startMonitoring, stopMonitoring, trackFrameRate])
  
  // Memory usage monitoring
  const measureMemoryUsage = useCallback((): number | null => {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return memory.usedJSHeapSize / 1024 / 1024 // Convert to MB
    }
    return null
  }, [])
  
  const detectMemoryPressure = useCallback((): boolean => {
    const memoryUsage = measureMemoryUsage()
    if (memoryUsage === null) return false
    
    // Consider high memory pressure if using more than 100MB
    return memoryUsage > 100
  }, [measureMemoryUsage])
  
  // Update memory usage in metrics
  useEffect(() => {
    if (isMonitoring) {
      const interval = setInterval(() => {
        const memoryUsage = measureMemoryUsage()
        if (memoryUsage !== null) {
          setMetrics(prev => ({ ...prev, memoryUsage }))
        }
      }, 1000) // Update every second
      
      return () => clearInterval(interval)
    }
  }, [isMonitoring, measureMemoryUsage])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (monitoringRef.current.rafId) {
        cancelAnimationFrame(monitoringRef.current.rafId)
      }
    }
  }, [])
  
  return {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    getSnapshot,
    shouldReduceAnimations,
    shouldSkipNonEssentialUpdates,
    getOptimalFrameRate,
    measureAnimation,
    trackFrameRate,
    checkRenderingCapability,
    measureMemoryUsage,
    detectMemoryPressure
  }
}

// Specialized hook for animation performance monitoring
export function useAnimationPerformance() {
  const performance = usePerformance()
  
  const measureTileAnimation = useCallback(async (animationType: string, fn: () => void | Promise<void>) => {
    return performance.measureAnimation(`tile-${animationType}`, fn)
  }, [performance])
  
  const measureCharlestonAnimation = useCallback(async (fn: () => void | Promise<void>) => {
    return performance.measureAnimation('charleston-sequence', fn)
  }, [performance])
  
  const getAnimationQuality = useCallback((): 'high' | 'medium' | 'low' => {
    if (performance.metrics.fps >= 55) return 'high'
    if (performance.metrics.fps >= 30) return 'medium'
    return 'low'
  }, [performance.metrics.fps])
  
  const shouldUseReducedAnimations = useCallback((): boolean => {
    return performance.shouldReduceAnimations || performance.detectMemoryPressure()
  }, [performance])
  
  return {
    ...performance,
    measureTileAnimation,
    measureCharlestonAnimation,
    getAnimationQuality,
    shouldUseReducedAnimations
  }
}

// Hook for adaptive performance optimization
export function useAdaptivePerformance() {
  const performance = usePerformance()
  const [adaptiveSettings, setAdaptiveSettings] = useState({
    animationQuality: 'high' as 'high' | 'medium' | 'low',
    enableParticleEffects: true,
    enableShadows: true,
    maxConcurrentAnimations: 5
  })
  
  // Auto-adjust settings based on performance
  useEffect(() => {
    if (!performance.isMonitoring) return
    
    const capability = performance.metrics.fps >= 55 ? 'high' : 
                     performance.metrics.fps >= 30 ? 'medium' : 'low'
    
    setAdaptiveSettings(prev => {
      const newSettings = { ...prev }
      
      switch (capability) {
        case 'high':
          newSettings.animationQuality = 'high'
          newSettings.enableParticleEffects = true
          newSettings.enableShadows = true
          newSettings.maxConcurrentAnimations = 5
          break
        case 'medium':
          newSettings.animationQuality = 'medium'
          newSettings.enableParticleEffects = false
          newSettings.enableShadows = true
          newSettings.maxConcurrentAnimations = 3
          break
        case 'low':
          newSettings.animationQuality = 'low'
          newSettings.enableParticleEffects = false
          newSettings.enableShadows = false
          newSettings.maxConcurrentAnimations = 1
          break
      }
      
      return newSettings
    })
  }, [performance.metrics.fps, performance.isMonitoring])
  
  return {
    ...performance,
    adaptiveSettings,
    setAdaptiveSettings
  }
}