// Production Performance Monitoring
// Web Vitals and performance tracking for production deployment

import { featureFlags, appConfig } from '../feature-flags'

export interface PerformanceMetrics {
  // Core Web Vitals
  firstContentfulPaint?: number
  largestContentfulPaint?: number
  cumulativeLayoutShift?: number
  firstInputDelay?: number
  timeToFirstByte?: number
  
  // Custom App Metrics  
  gameLoadTime?: number
  patternAnalysisTime?: number
  tileRenderTime?: number
  
  // Resource Metrics
  bundleLoadTime?: number
  imageLoadTime?: number
  apiResponseTime?: number
  
  // User Experience Metrics
  userInteractionLatency?: number
  errorRate?: number
  crashRate?: number
}

export interface PerformanceReport {
  metrics: PerformanceMetrics
  timestamp: Date
  url: string
  userAgent: string
  connectionType?: string
  deviceMemory?: number
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {}
  private reports: PerformanceReport[] = []
  
  constructor() {
    this.initializeMonitoring()
  }
  
  private initializeMonitoring(): void {
    if (!featureFlags.enablePerformanceMonitoring) {
      return
    }
    
    // Initialize Web Vitals monitoring
    this.initializeWebVitals()
    
    // Monitor resource loading
    this.monitorResourceLoading()
    
    // Monitor custom app metrics
    this.startCustomMetrics()
    
    // Send initial report
    setTimeout(() => this.generateReport(), 5000)
  }
  
  private initializeWebVitals(): void {
    // First Contentful Paint (FCP)
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntriesByName('first-contentful-paint')
      if (entries.length > 0) {
        this.metrics.firstContentfulPaint = entries[0].startTime
      }
    }).observe({ entryTypes: ['paint'] })
    
    // Largest Contentful Paint (LCP)
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries()
      if (entries.length > 0) {
        this.metrics.largestContentfulPaint = entries[entries.length - 1].startTime
      }
    }).observe({ entryTypes: ['largest-contentful-paint'] })
    
    // First Input Delay (FID)
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries()
      entries.forEach(entry => {
        if (entry.name === 'first-input') {
          this.metrics.firstInputDelay = (entry as PerformanceEventTiming).processingStart - entry.startTime
        }
      })
    }).observe({ entryTypes: ['first-input'] })
    
    // Cumulative Layout Shift (CLS)
    new PerformanceObserver((entryList) => {
      let cls = 0
      entryList.getEntries().forEach(entry => {
        const layoutShiftEntry = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number }
        if (!layoutShiftEntry.hadRecentInput) {
          cls += layoutShiftEntry.value || 0
        }
      })
      this.metrics.cumulativeLayoutShift = cls
    }).observe({ entryTypes: ['layout-shift'] })
  }
  
  private monitorResourceLoading(): void {
    // Monitor navigation timing
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      if (navigation) {
        this.metrics.timeToFirstByte = navigation.responseStart - navigation.requestStart
        this.metrics.bundleLoadTime = navigation.loadEventEnd - navigation.fetchStart
      }
    })
    
    // Monitor resource timing
    new PerformanceObserver((entryList) => {
      entryList.getEntries().forEach(entry => {
        const resource = entry as PerformanceResourceTiming
        
        // Track API response times
        if (resource.name.includes('/api/')) {
          const responseTime = resource.responseEnd - resource.requestStart
          this.updateApiResponseTime(responseTime)
        }
        
        // Track image load times
        if (resource.initiatorType === 'img') {
          const loadTime = resource.responseEnd - resource.requestStart
          this.updateImageLoadTime(loadTime)
        }
      })
    }).observe({ entryTypes: ['resource'] })
  }
  
  private startCustomMetrics(): void {
    // Game-specific performance tracking
    this.trackGameMetrics()
  }
  
  private trackGameMetrics(): void {
    // Monitor pattern analysis performance
    const originalAnalyze = window.console.time
    window.console.time = (label: string) => {
      if (label.includes('pattern-analysis')) {
        performance.mark(`${label}-start`)
      }
      originalAnalyze.call(console, label)
    }
    
    const originalTimeEnd = window.console.timeEnd
    window.console.timeEnd = (label: string) => {
      if (label.includes('pattern-analysis')) {
        performance.mark(`${label}-end`)
        performance.measure(label, `${label}-start`, `${label}-end`)
        
        const measure = performance.getEntriesByName(label)[0]
        if (measure) {
          this.metrics.patternAnalysisTime = measure.duration
        }
      }
      originalTimeEnd.call(console, label)
    }
  }
  
  private updateApiResponseTime(responseTime: number): void {
    if (!this.metrics.apiResponseTime) {
      this.metrics.apiResponseTime = responseTime
    } else {
      // Running average
      this.metrics.apiResponseTime = (this.metrics.apiResponseTime + responseTime) / 2
    }
  }
  
  private updateImageLoadTime(loadTime: number): void {
    if (!this.metrics.imageLoadTime) {
      this.metrics.imageLoadTime = loadTime
    } else {
      // Running average
      this.metrics.imageLoadTime = (this.metrics.imageLoadTime + loadTime) / 2
    }
  }
  
  // Custom metric tracking methods
  startTiming(name: string): void {
    performance.mark(`${name}-start`)
  }
  
  endTiming(name: string): number {
    performance.mark(`${name}-end`)
    performance.measure(name, `${name}-start`, `${name}-end`)
    
    const measure = performance.getEntriesByName(name)[0]
    return measure ? measure.duration : 0
  }
  
  recordCustomMetric(name: keyof PerformanceMetrics, value: number): void {
    ;(this.metrics as Record<string, unknown>)[name] = value
  }
  
  generateReport(): PerformanceReport {
    const report: PerformanceReport = {
      metrics: { ...this.metrics },
      timestamp: new Date(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      connectionType: (navigator as Navigator & { connection?: { effectiveType?: string } }).connection?.effectiveType,
      deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory
    }
    
    this.reports.push(report)
    
    // Limit stored reports
    if (this.reports.length > 50) {
      this.reports = this.reports.slice(-50)
    }
    
    // Send to monitoring service
    if (featureFlags.enablePerformanceMonitoring) {
      this.sendReport(report)
    }
    
    return report
  }
  
  private async sendReport(report: PerformanceReport): Promise<void> {
    try {
      await fetch(`${appConfig.backendUrl}/api/performance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report)
      })
    } catch (error) {
      console.warn('Failed to send performance report:', error)
    }
  }
  
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }
  
  getWebVitalsScore(): {
    fcp: 'good' | 'needs-improvement' | 'poor'
    lcp: 'good' | 'needs-improvement' | 'poor'  
    fid: 'good' | 'needs-improvement' | 'poor'
    cls: 'good' | 'needs-improvement' | 'poor'
    overall: 'good' | 'needs-improvement' | 'poor'
  } {
    const fcp = this.scoreMetric(this.metrics.firstContentfulPaint, [1800, 3000])
    const lcp = this.scoreMetric(this.metrics.largestContentfulPaint, [2500, 4000])
    const fid = this.scoreMetric(this.metrics.firstInputDelay, [100, 300])
    const cls = this.scoreMetric(this.metrics.cumulativeLayoutShift, [0.1, 0.25])
    
    const scores = [fcp, lcp, fid, cls]
    const goodCount = scores.filter(s => s === 'good').length
    const poorCount = scores.filter(s => s === 'poor').length
    
    let overall: 'good' | 'needs-improvement' | 'poor'
    if (goodCount >= 3) overall = 'good'
    else if (poorCount >= 2) overall = 'poor'  
    else overall = 'needs-improvement'
    
    return { fcp, lcp, fid, cls, overall }
  }
  
  private scoreMetric(
    value: number | undefined, 
    thresholds: [number, number]
  ): 'good' | 'needs-improvement' | 'poor' {
    if (value === undefined) return 'poor'
    if (value <= thresholds[0]) return 'good'
    if (value <= thresholds[1]) return 'needs-improvement'
    return 'poor'
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor()

// Convenience functions
export const startTiming = (name: string) => performanceMonitor.startTiming(name)
export const endTiming = (name: string) => performanceMonitor.endTiming(name)
export const recordMetric = (name: keyof PerformanceMetrics, value: number) => 
  performanceMonitor.recordCustomMetric(name, value)
export const getPerformanceReport = () => performanceMonitor.generateReport()

// Game-specific performance helpers
export const measurePatternAnalysis = async <T>(
  operation: () => Promise<T> | T
): Promise<T> => {
  startTiming('pattern-analysis')
  const result = await operation()
  const duration = endTiming('pattern-analysis')
  recordMetric('patternAnalysisTime', duration)
  return result
}

export const measureTileRender = async <T>(
  operation: () => Promise<T> | T
): Promise<T> => {
  startTiming('tile-render')
  const result = await operation()
  const duration = endTiming('tile-render')
  recordMetric('tileRenderTime', duration)
  return result
}