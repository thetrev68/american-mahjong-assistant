// Error Reporting Service - Production error tracking and monitoring for Strategy Advisor
// Provides comprehensive error reporting, analytics, and user feedback collection

interface ErrorReport {
  id: string
  timestamp: number
  error: SerializedError
  context: ErrorContext
  userAgent: string
  url: string
  userId?: string
  sessionId: string
  severity: ErrorSeverity
  category: ErrorCategory
  tags: string[]
  breadcrumbs: Breadcrumb[]
  performance: PerformanceSnapshot
  userFeedback?: UserFeedback
}

interface SerializedError {
  name: string
  message: string
  stack?: string
  componentStack?: string
  cause?: string
  code?: string | number
}

interface ErrorContext {
  feature: string
  component: string
  action: string
  state: Record<string, unknown>
  props: Record<string, unknown>
  gamePhase?: 'charleston' | 'playing' | 'endgame'
  disclosureLevel?: 'glance' | 'details' | 'advanced'
  strategyMode?: string
}

interface Breadcrumb {
  timestamp: number
  type: 'navigation' | 'user' | 'http' | 'console' | 'dom'
  category: string
  message: string
  level: 'info' | 'warning' | 'error'
  data?: Record<string, unknown>
}

interface PerformanceSnapshot {
  memory: number // MB
  renderTime: number // ms
  frameRate: number
  connectionType: string
  loadTime: number
}

interface UserFeedback {
  rating: 1 | 2 | 3 | 4 | 5
  description: string
  email?: string
  expectation: string
  reproductionSteps?: string
}

type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'
type ErrorCategory = 'javascript' | 'network' | 'performance' | 'user_interaction' | 'data_corruption' | 'security'

interface ErrorReportingConfig {
  enabled: boolean
  endpoint?: string
  apiKey?: string
  enableBreadcrumbs: boolean
  enablePerformanceTracking: boolean
  enableUserFeedback: boolean
  maxBreadcrumbs: number
  sampleRate: number // 0-1
  enableLocalStorage: boolean
  enableConsoleCapture: boolean
  enableNetworkCapture: boolean
  sensitiveDataKeys: string[]
  enableStackTraceEnhancement: boolean
}

interface ErrorFilters {
  ignoreErrors: (string | RegExp)[]
  ignoreUrls: (string | RegExp)[]
  ignoreBrowserExtensions: boolean
  ignoreLocalhost: boolean
}

// Default configuration
const DEFAULT_CONFIG: ErrorReportingConfig = {
  enabled: true,
  enableBreadcrumbs: true,
  enablePerformanceTracking: true,
  enableUserFeedback: true,
  maxBreadcrumbs: 50,
  sampleRate: 1.0, // 100% in development
  enableLocalStorage: true,
  enableConsoleCapture: true,
  enableNetworkCapture: true,
  sensitiveDataKeys: ['password', 'token', 'key', 'secret', 'auth'],
  enableStackTraceEnhancement: true
}

const DEFAULT_FILTERS: ErrorFilters = {
  ignoreErrors: [
    /ResizeObserver loop limit exceeded/,
    /Non-Error promise rejection captured/,
    /Loading chunk \d+ failed/,
    /Script error/,
    /Network request failed/
  ],
  ignoreUrls: [
    /chrome-extension:\/\//,
    /moz-extension:\/\//,
    /safari-extension:\/\//
  ],
  ignoreBrowserExtensions: true,
  ignoreLocalhost: false
}

class ErrorReportingService {
  private config: ErrorReportingConfig
  private filters: ErrorFilters
  private breadcrumbs: Breadcrumb[] = []
  private sessionId: string
  private isInitialized = false
  private pendingReports: ErrorReport[] = []
  private networkCaptures: unknown[] = []

  constructor(config: Partial<ErrorReportingConfig> = {}, filters: Partial<ErrorFilters> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.filters = { ...DEFAULT_FILTERS, ...filters }
    this.sessionId = this.generateSessionId()

    if (this.config.enabled) {
      this.initialize()
    }
  }

  private initialize(): void {
    if (this.isInitialized) return

    // Set up global error handlers
    this.setupGlobalErrorHandlers()

    // Set up breadcrumb tracking
    if (this.config.enableBreadcrumbs) {
      this.setupBreadcrumbTracking()
    }

    // Set up network monitoring
    if (this.config.enableNetworkCapture) {
      this.setupNetworkCapture()
    }

    // Set up console capture
    if (this.config.enableConsoleCapture) {
      this.setupConsoleCapture()
    }

    // Process any pending reports
    this.processPendingReports()

    this.isInitialized = true
    console.log('[ErrorReporting] Service initialized')
  }

  private setupGlobalErrorHandlers(): void {
    // JavaScript errors
    window.addEventListener('error', (event) => {
      this.captureError(new Error(event.message), {
        feature: 'global',
        component: 'window',
        action: 'javascript_error',
        state: { filename: event.filename, lineno: event.lineno, colno: event.colno },
        props: {}
      })
    })

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason))
      this.captureError(error, {
        feature: 'global',
        component: 'promise',
        action: 'unhandled_rejection',
        state: {},
        props: {}
      })
    })

    // React error boundary integration
    if (window.React) {
      const originalConsoleError = console.error
      console.error = (...args) => {
        if (args[0]?.includes?.('React') || args[0]?.includes?.('component')) {
          this.addBreadcrumb({
            type: 'console',
            category: 'react',
            message: args.join(' '),
            level: 'error'
          })
        }
        originalConsoleError.apply(console, args)
      }
    }
  }

  private setupBreadcrumbTracking(): void {
    // DOM events
    ['click', 'input', 'change', 'submit'].forEach(eventType => {
      document.addEventListener(eventType, (event) => {
        const target = event.target as HTMLElement
        this.addBreadcrumb({
          type: 'dom',
          category: 'interaction',
          message: `${eventType} on ${target.tagName}`,
          level: 'info',
          data: {
            tagName: target.tagName,
            className: target.className,
            id: target.id
          }
        })
      }, { passive: true })
    })

    // Navigation
    const originalPushState = history.pushState
    history.pushState = function(state: unknown, title: string, url?: string | URL | null) {
      originalPushState.apply(history, [state, title, url])
      window.errorReportingService?.addBreadcrumb({
        type: 'navigation',
        category: 'navigation',
        message: `Navigated to ${url}`,
        level: 'info',
        data: { from: window.location.href, to: url }
      })
    }
  }

  private setupNetworkCapture(): void {
    // Intercept fetch
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      const start = performance.now()
      const url = typeof args[0] === 'string' ? args[0] : args[0].url

      try {
        const response = await originalFetch(...args)
        const duration = performance.now() - start

        this.addBreadcrumb({
          type: 'http',
          category: 'request',
          message: `${response.status} ${url}`,
          level: response.ok ? 'info' : 'warning',
          data: {
            url,
            status: response.status,
            duration: Math.round(duration)
          }
        })

        return response
      } catch (error) {
        const duration = performance.now() - start

        this.addBreadcrumb({
          type: 'http',
          category: 'request',
          message: `Failed ${url}`,
          level: 'error',
          data: {
            url,
            error: error instanceof Error ? error.message : String(error),
            duration: Math.round(duration)
          }
        })

        throw error
      }
    }
  }

  private setupConsoleCapture(): void {
    ['log', 'warn', 'error'].forEach(level => {
      const originalMethod = console[level as keyof Console] as (...args: unknown[]) => void
      console[level as keyof Console] = (...args: unknown[]) => {
        this.addBreadcrumb({
          type: 'console',
          category: 'console',
          message: args.join(' '),
          level: level === 'log' ? 'info' : (level as 'warning' | 'error'),
          data: { arguments: args }
        })
        originalMethod.apply(console, args)
      }
    })
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private shouldIgnoreError(error: Error, _context?: ErrorContext): boolean {
    // Check error message against filters
    const errorMessage = error.message || error.toString()
    if (this.filters.ignoreErrors.some(filter => {
      return typeof filter === 'string' ? errorMessage.includes(filter) : filter.test(errorMessage)
    })) {
      return true
    }

    // Check URL against filters
    const currentUrl = window.location.href
    if (this.filters.ignoreUrls.some(filter => {
      return typeof filter === 'string' ? currentUrl.includes(filter) : filter.test(currentUrl)
    })) {
      return true
    }

    // Ignore localhost in production
    if (this.filters.ignoreLocalhost && currentUrl.includes('localhost')) {
      return true
    }

    // Check stack trace for browser extensions
    if (this.filters.ignoreBrowserExtensions && error.stack) {
      const extensionPatterns = [/chrome-extension:\/\//, /moz-extension:\/\//, /safari-extension:\/\//]
      if (extensionPatterns.some(pattern => pattern.test(error.stack!))) {
        return true
      }
    }

    return false
  }

  private sanitizeData(data: unknown): unknown {
    if (typeof data !== 'object' || data === null) {
      return data
    }

    const sanitized = Array.isArray(data) ? [] : {}

    for (const [key, value] of Object.entries(data)) {
      const keyLower = key.toLowerCase()

      // Remove sensitive data
      if (this.config.sensitiveDataKeys.some(sensitive => keyLower.includes(sensitive.toLowerCase()))) {
        (sanitized as Record<string, unknown>)[key] = '[REDACTED]'
        continue
      }

      if (typeof value === 'object' && value !== null) {
        (sanitized as Record<string, unknown>)[key] = this.sanitizeData(value)
      } else {
        (sanitized as Record<string, unknown>)[key] = value
      }
    }

    return sanitized
  }

  private getPerformanceSnapshot(): PerformanceSnapshot {
    const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize / 1024 / 1024 || 0
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    const connection = (navigator as Navigator & { connection?: { effectiveType: string } }).connection

    return {
      memory: Math.round(memory),
      renderTime: Math.round(performance.now()),
      frameRate: 60, // Would be calculated from actual frame rate monitoring
      connectionType: connection?.effectiveType || 'unknown',
      loadTime: navigation ? Math.round(navigation.loadEventEnd - navigation.navigationStart) : 0
    }
  }

  private categorizeError(error: Error, context?: ErrorContext): ErrorCategory {
    const message = error.message.toLowerCase()
    // Note: stack trace analysis could be added here if needed

    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return 'network'
    }

    if (message.includes('performance') || message.includes('slow') || message.includes('timeout')) {
      return 'performance'
    }

    if (message.includes('click') || message.includes('user') || context?.action?.includes('user')) {
      return 'user_interaction'
    }

    if (message.includes('data') || message.includes('corruption') || message.includes('invalid')) {
      return 'data_corruption'
    }

    if (message.includes('security') || message.includes('unauthorized') || message.includes('forbidden')) {
      return 'security'
    }

    return 'javascript'
  }

  private determineSeverity(error: Error, _context?: ErrorContext): ErrorSeverity {
    const message = error.message.toLowerCase()

    // Critical errors
    if (message.includes('critical') || message.includes('fatal') || message.includes('crash')) {
      return 'critical'
    }

    // High severity errors
    if (message.includes('security') || message.includes('data loss') || message.includes('corruption')) {
      return 'high'
    }

    // Medium severity errors
    if (message.includes('network') || message.includes('timeout') || message.includes('validation')) {
      return 'medium'
    }

    // Default to low severity
    return 'low'
  }

  addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void {
    if (!this.config.enableBreadcrumbs) return

    const timestampedBreadcrumb: Breadcrumb = {
      ...breadcrumb,
      timestamp: Date.now(),
      data: breadcrumb.data ? this.sanitizeData(breadcrumb.data) : undefined
    }

    this.breadcrumbs.push(timestampedBreadcrumb)

    // Keep only recent breadcrumbs
    if (this.breadcrumbs.length > this.config.maxBreadcrumbs) {
      this.breadcrumbs.shift()
    }
  }

  captureError(error: Error, context: ErrorContext, userFeedback?: UserFeedback): string | null {
    if (!this.config.enabled || this.shouldIgnoreError(error, context)) {
      return null
    }

    // Sample rate check
    if (Math.random() > this.config.sampleRate) {
      return null
    }

    const errorId = this.generateErrorId()
    const severity = this.determineSeverity(error, context)
    const category = this.categorizeError(error, context)

    const report: ErrorReport = {
      id: errorId,
      timestamp: Date.now(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        componentStack: (error as Error & { componentStack?: string }).componentStack,
        cause: error.cause ? String(error.cause) : undefined
      },
      context: this.sanitizeData(context),
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: this.sessionId,
      severity,
      category,
      tags: [context.feature, context.component, context.action],
      breadcrumbs: [...this.breadcrumbs],
      performance: this.getPerformanceSnapshot(),
      userFeedback: userFeedback ? this.sanitizeData(userFeedback) : undefined
    }

    this.sendReport(report)
    return errorId
  }

  private async sendReport(report: ErrorReport): Promise<void> {
    try {
      // Store locally first
      if (this.config.enableLocalStorage) {
        this.storeReportLocally(report)
      }

      // Send to remote endpoint if configured
      if (this.config.endpoint) {
        await this.sendToRemote(report)
      } else {
        // Store in pending reports for later
        this.pendingReports.push(report)
      }

      console.log(`[ErrorReporting] Error reported: ${report.id}`)
    } catch (error) {
      console.error('[ErrorReporting] Failed to send report:', error)
      this.pendingReports.push(report)
    }
  }

  private storeReportLocally(report: ErrorReport): void {
    try {
      const key = `error_report_${report.id}`
      const serialized = JSON.stringify(report)
      localStorage.setItem(key, serialized)

      // Clean up old reports (keep only last 10)
      const allKeys = Object.keys(localStorage).filter(key => key.startsWith('error_report_'))
      if (allKeys.length > 10) {
        allKeys.sort()
        allKeys.slice(0, allKeys.length - 10).forEach(key => {
          localStorage.removeItem(key)
        })
      }
    } catch (error) {
      console.warn('[ErrorReporting] Failed to store report locally:', error)
    }
  }

  private async sendToRemote(report: ErrorReport): Promise<void> {
    if (!this.config.endpoint) return

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`
    }

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(report)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
  }

  private processPendingReports(): void {
    if (this.pendingReports.length === 0 || !this.config.endpoint) return

    const reportsToSend = [...this.pendingReports]
    this.pendingReports = []

    reportsToSend.forEach(report => {
      this.sendToRemote(report).catch(error => {
        console.error('[ErrorReporting] Failed to send pending report:', error)
        this.pendingReports.push(report)
      })
    })
  }

  // Public API methods
  setUser(userId: string): void {
    this.addBreadcrumb({
      type: 'user',
      category: 'auth',
      message: `User set: ${userId}`,
      level: 'info'
    })
  }

  setTag(key: string, value: string): void {
    this.addBreadcrumb({
      type: 'user',
      category: 'context',
      message: `Tag set: ${key}=${value}`,
      level: 'info',
      data: { [key]: value }
    })
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Partial<ErrorContext>): void {
    this.addBreadcrumb({
      type: 'user',
      category: 'message',
      message,
      level,
      data: context
    })
  }

  // Get recent error reports for debugging
  getRecentReports(): ErrorReport[] {
    if (!this.config.enableLocalStorage) return []

    const reports: ErrorReport[] = []
    const keys = Object.keys(localStorage).filter(key => key.startsWith('error_report_'))

    keys.forEach(key => {
      try {
        const report = JSON.parse(localStorage.getItem(key) || '{}')
        reports.push(report)
      } catch (error) {
        console.warn('[ErrorReporting] Failed to parse stored report:', error)
      }
    })

    return reports.sort((a, b) => b.timestamp - a.timestamp)
  }

  // Clear all stored reports
  clearStoredReports(): void {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('error_report_'))
    keys.forEach(key => localStorage.removeItem(key))
  }

  // Update configuration
  updateConfig(newConfig: Partial<ErrorReportingConfig>): void {
    this.config = { ...this.config, ...newConfig }

    if (this.config.enabled && !this.isInitialized) {
      this.initialize()
    }
  }

  // Manually flush pending reports
  async flush(): Promise<void> {
    if (this.pendingReports.length > 0) {
      this.processPendingReports()
      // Wait for a bit to allow network requests to complete
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
}

// Global instance
let globalErrorReportingService: ErrorReportingService | null = null

// Initialize global error reporting
export const initializeErrorReporting = (
  config: Partial<ErrorReportingConfig> = {},
  filters: Partial<ErrorFilters> = {}
): ErrorReportingService => {
  if (globalErrorReportingService) {
    globalErrorReportingService.updateConfig(config)
    return globalErrorReportingService
  }

  globalErrorReportingService = new ErrorReportingService(config, filters)

  // Make available globally for breadcrumb tracking
  ;(window as Window & { errorReportingService?: ErrorReportingService }).errorReportingService = globalErrorReportingService

  return globalErrorReportingService
}

// Get global instance
export const getErrorReportingService = (): ErrorReportingService | null => {
  return globalErrorReportingService
}

// React hook for error reporting
import { useCallback, useEffect } from 'react'

export const useErrorReporting = (context: Partial<ErrorContext> = {}) => {
  const service = getErrorReportingService()

  const reportError = useCallback((error: Error, additionalContext?: Partial<ErrorContext>, userFeedback?: UserFeedback) => {
    if (!service) return null

    const fullContext: ErrorContext = {
      feature: 'strategy-advisor',
      component: 'unknown',
      action: 'unknown',
      state: {},
      props: {},
      ...context,
      ...additionalContext
    }

    return service.captureError(error, fullContext, userFeedback)
  }, [service, context])

  const reportMessage = useCallback((message: string, level: 'info' | 'warning' | 'error' = 'info') => {
    if (!service) return

    service.captureMessage(message, level, context)
  }, [service, context])

  const addBreadcrumb = useCallback((breadcrumb: Omit<Breadcrumb, 'timestamp'>) => {
    if (!service) return

    service.addBreadcrumb(breadcrumb)
  }, [service])

  // Add component mount/unmount breadcrumbs
  useEffect(() => {
    if (context.component) {
      addBreadcrumb({
        type: 'user',
        category: 'component',
        message: `Component ${context.component} mounted`,
        level: 'info'
      })

      return () => {
        addBreadcrumb({
          type: 'user',
          category: 'component',
          message: `Component ${context.component} unmounted`,
          level: 'info'
        })
      }
    }
  }, [context.component, addBreadcrumb])

  return {
    reportError,
    reportMessage,
    addBreadcrumb,
    isInitialized: !!service
  }
}

export {
  ErrorReportingService,
  type ErrorReport,
  type ErrorContext,
  type UserFeedback,
  type ErrorReportingConfig,
  type ErrorFilters
}

export default ErrorReportingService