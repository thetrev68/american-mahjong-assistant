/**
 * Performance Monitor Hook
 * Real-time performance tracking and optimization utilities
 */

import { useState, useEffect, useCallback, useRef } from 'react'

// Performance API type definitions
interface PerformancePaintTiming extends PerformanceEntry {
  startTime: number
}

interface PerformanceEventTiming extends PerformanceEntry {
  processingStart: number
  startTime: number
}

interface LayoutShift extends PerformanceEntry {
  value: number
  hadRecentInput: boolean
}

interface PerformanceMetrics {
  loadTime: number
  renderTime: number
  bundleSize: number
  memoryUsage: number
  fps: number
  largestContentfulPaint: number
  firstInputDelay: number
  cumulativeLayoutShift: number
}

interface ComponentMetrics {
  name: string
  renderCount: number
  averageRenderTime: number
  lastRenderTime: number
  propsChanges: number
}

export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<Partial<PerformanceMetrics>>({})
  const [componentMetrics, setComponentMetrics] = useState<Map<string, ComponentMetrics>>(new Map<string, ComponentMetrics>())
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false)
  const frameRef = useRef<number | undefined>(undefined)
  const fpsCounter = useRef({ frames: 0, lastTime: 0 })

  // Measure Web Vitals
  const measureWebVitals = useCallback(() => {
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1] as PerformancePaintTiming
        if (lastEntry) {
          setMetrics(prev => ({ ...prev, largestContentfulPaint: lastEntry.startTime }))
        }
      })
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          const eventEntry = entry as PerformanceEventTiming
          if (eventEntry.processingStart && eventEntry.startTime) {
            const fid = eventEntry.processingStart - eventEntry.startTime
            setMetrics(prev => ({ ...prev, firstInputDelay: fid }))
          }
        })
      })
      fidObserver.observe({ entryTypes: ['first-input'] })

      // Cumulative Layout Shift
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0
        list.getEntries().forEach((entry) => {
          const layoutEntry = entry as LayoutShift
          if (!layoutEntry.hadRecentInput) {
            clsValue += layoutEntry.value
          }
        })
        setMetrics(prev => ({ ...prev, cumulativeLayoutShift: clsValue }))
      })
      clsObserver.observe({ entryTypes: ['layout-shift'] })
    }
  }, [])

  // Measure FPS
  const measureFPS = useCallback(() => {
    const measure = (timestamp: number) => {
      fpsCounter.current.frames++
      
      if (timestamp - fpsCounter.current.lastTime >= 1000) {
        const fps = (fpsCounter.current.frames * 1000) / (timestamp - fpsCounter.current.lastTime)
        setMetrics(prev => ({ ...prev, fps: Math.round(fps) }))
        
        fpsCounter.current.frames = 0
        fpsCounter.current.lastTime = timestamp
      }
      
      if (isMonitoring) {
        frameRef.current = requestAnimationFrame(measure)
      }
    }
    
    if (isMonitoring) {
      frameRef.current = requestAnimationFrame(measure)
    }
  }, [isMonitoring])

  // Measure memory usage
  const measureMemory = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as unknown as { memory: { usedJSHeapSize: number } }).memory
      setMetrics(prev => ({
        ...prev,
        memoryUsage: Math.round(memory.usedJSHeapSize / 1048576) // Convert to MB
      }))
    }
  }, [])

  // Measure bundle size (approximate)
  const measureBundleSize = useCallback(async () => {
    try {
      const scripts = Array.from(document.querySelectorAll('script[src]'))
      let totalSize = 0
      
      for (const script of scripts) {
        const src = (script as HTMLScriptElement).src
        if (src && src.includes('localhost') || src.includes('assets')) {
          try {
            const response = await fetch(src, { method: 'HEAD' })
            const contentLength = response.headers.get('content-length')
            if (contentLength) {
              totalSize += parseInt(contentLength, 10)
            }
          } catch {
            console.warn('Could not measure bundle size for:', src)
          }
        }
      }
      
      setMetrics(prev => ({ 
        ...prev, 
        bundleSize: Math.round(totalSize / 1024) // Convert to KB
      }))
    } catch (error) {
      console.warn('Bundle size measurement failed:', error)
    }
  }, [])

  // Component performance tracking
  const trackComponent = useCallback((
    componentName: string,
    renderTime: number,
    propsChanged: boolean = false
  ) => {
    setComponentMetrics(prev => {
      const existing = prev.get(componentName) || {
        name: componentName,
        renderCount: 0,
        averageRenderTime: 0,
        lastRenderTime: 0,
        propsChanges: 0
      }
      
      const newRenderCount = existing.renderCount + 1
      const newAverageTime = (existing.averageRenderTime * existing.renderCount + renderTime) / newRenderCount
      
      const updated = {
        ...existing,
        renderCount: newRenderCount,
        averageRenderTime: newAverageTime,
        lastRenderTime: renderTime,
        propsChanges: propsChanged ? existing.propsChanges + 1 : existing.propsChanges
      }
      
      const newMap = new Map(prev)
      newMap.set(componentName, updated)
      return newMap
    })
  }, [])

  // Start monitoring
  const startMonitoring = useCallback(() => {
    setIsMonitoring(true)
    measureWebVitals()
    measureBundleSize()
  }, [measureWebVitals, measureBundleSize])

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false)
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current)
    }
  }, [])

  // Get performance recommendations
  const getRecommendations = useCallback((): string[] => {
    const recommendations: string[] = []
    
    if (metrics.loadTime && metrics.loadTime > 3000) {
      recommendations.push('Page load time is slow. Consider code splitting or lazy loading.')
    }
    
    if (metrics.bundleSize && metrics.bundleSize > 1000) {
      recommendations.push('Bundle size is large. Consider tree shaking and code splitting.')
    }
    
    if (metrics.fps && metrics.fps < 30) {
      recommendations.push('Low FPS detected. Reduce complex animations and DOM manipulations.')
    }
    
    if (metrics.memoryUsage && metrics.memoryUsage > 50) {
      recommendations.push('High memory usage. Check for memory leaks in components.')
    }
    
    if (metrics.largestContentfulPaint && metrics.largestContentfulPaint > 2500) {
      recommendations.push('LCP is slow. Optimize images and critical resources.')
    }
    
    if (metrics.firstInputDelay && metrics.firstInputDelay > 100) {
      recommendations.push('FID is high. Reduce main thread blocking time.')
    }
    
    if (metrics.cumulativeLayoutShift && metrics.cumulativeLayoutShift > 0.1) {
      recommendations.push('CLS is high. Ensure stable layout during loading.')
    }
    
    // Component-specific recommendations
    componentMetrics.forEach(component => {
      if (component.averageRenderTime > 16) { // 60fps threshold
        recommendations.push(`Component "${component.name}" renders slowly. Consider optimization.`)
      }
      
      if (component.propsChanges / component.renderCount > 0.8) {
        recommendations.push(`Component "${component.name}" has frequent prop changes. Check for unnecessary re-renders.`)
      }
    })
    
    return recommendations
  }, [metrics, componentMetrics])

  // Export metrics for analysis
  const exportMetrics = useCallback(() => {
    const data = {
      timestamp: new Date().toISOString(),
      metrics,
      componentMetrics: Array.from(componentMetrics.entries()).map(([name, data]) => ({
        ...data,
        name
      })),
      recommendations: getRecommendations(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `performance-metrics-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [metrics, componentMetrics, getRecommendations])

  // Cleanup
  useEffect(() => {
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [])

  // Auto-measure memory and FPS when monitoring
  useEffect(() => {
    if (isMonitoring) {
      measureFPS()
      
      const memoryInterval = setInterval(measureMemory, 5000) // Every 5 seconds
      
      return () => {
        clearInterval(memoryInterval)
      }
    }
  }, [isMonitoring, measureFPS, measureMemory])

  // Measure initial load time
  useEffect(() => {
    if ('performance' in window && performance.timing) {
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart
      setMetrics(prev => ({ ...prev, loadTime }))
    }
  }, [])

  return {
    metrics,
    componentMetrics: Array.from(componentMetrics.values()),
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    trackComponent,
    getRecommendations,
    exportMetrics
  }
}