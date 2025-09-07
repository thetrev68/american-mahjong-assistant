// Production Error Tracking & Monitoring
// Centralized error handling and reporting for production deployment

import { appConfig, featureFlags } from '../feature-flags'

export interface ErrorContext {
  // Error Classification
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: 'ui' | 'game-logic' | 'network' | 'data' | 'performance'
  
  // Context Information
  userId?: string
  sessionId?: string
  gamePhase?: string
  component?: string
  
  // Technical Details
  userAgent?: string
  url?: string
  timestamp?: Date
  
  // Game State Context
  currentPattern?: string
  tilesInHand?: number
  gameMode?: 'solo' | 'multiplayer'
  
  // Additional Metadata
  tags?: Record<string, string>
  extra?: Record<string, unknown>
}

export interface ErrorReport {
  error: Error
  context: ErrorContext
  stackTrace?: string
  breadcrumbs?: string[]
}

class ErrorTracker {
  private reports: ErrorReport[] = []
  private sessionId: string
  private breadcrumbs: string[] = []
  
  constructor() {
    this.sessionId = this.generateSessionId()
    this.initializeErrorHandling()
  }
  
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
  
  private initializeErrorHandling(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.captureException(new Error(event.message), {
        severity: 'high',
        category: 'ui',
        component: 'global',
        url: event.filename,
        extra: {
          lineno: event.lineno,
          colno: event.colno
        }
      })
    })
    
    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.captureException(new Error(event.reason), {
        severity: 'high',
        category: 'network',
        component: 'promise',
        extra: {
          reason: event.reason
        }
      })
    })
  }
  
  captureException(error: Error, context: Partial<ErrorContext> = {}): void {
    const fullContext: ErrorContext = {
      severity: 'medium',
      category: 'ui',
      sessionId: this.sessionId,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...context
    }
    
    const report: ErrorReport = {
      error,
      context: fullContext,
      stackTrace: error.stack,
      breadcrumbs: [...this.breadcrumbs]
    }
    
    this.reports.push(report)
    
    // Limit stored reports to prevent memory issues
    if (this.reports.length > 100) {
      this.reports = this.reports.slice(-100)
    }
    
    // Send to monitoring service in production
    if (featureFlags.enableErrorTracking) {
      this.sendToMonitoringService(report)
    }
    
    // Log to console in development
    if (featureFlags.enableDebugMode) {
      console.group(`🚨 Error Captured [${fullContext.severity}]`)
      console.error('Error:', error)
      console.log('Context:', fullContext)
      console.log('Breadcrumbs:', this.breadcrumbs)
      console.groupEnd()
    }
  }
  
  addBreadcrumb(message: string, category: string = 'navigation'): void {
    const breadcrumb = `[${new Date().toISOString()}] ${category}: ${message}`
    this.breadcrumbs.push(breadcrumb)
    
    // Limit breadcrumbs to last 50 entries
    if (this.breadcrumbs.length > 50) {
      this.breadcrumbs = this.breadcrumbs.slice(-50)
    }
  }
  
  private async sendToMonitoringService(report: ErrorReport): Promise<void> {
    try {
      // In production, this would send to Sentry, LogRocket, etc.
      if (appConfig.sentryDsn) {
        await this.sendToSentry(report)
      } else {
        // Fallback to custom error endpoint
        await this.sendToCustomEndpoint(report)
      }
    } catch (sendError) {
      console.warn('Failed to send error report:', sendError)
    }
  }
  
  private async sendToSentry(report: ErrorReport): Promise<void> {
    // Sentry integration would go here
    console.log('Would send to Sentry:', report)
  }
  
  private async sendToCustomEndpoint(report: ErrorReport): Promise<void> {
    const payload = {
      error: {
        message: report.error.message,
        name: report.error.name,
        stack: report.stackTrace
      },
      context: report.context,
      breadcrumbs: report.breadcrumbs,
      appVersion: appConfig.version,
      environment: appConfig.environment
    }
    
    try {
      await fetch(`${appConfig.backendUrl}/api/errors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })
    } catch (fetchError) {
      console.warn('Failed to send error to custom endpoint:', fetchError)
    }
  }
  
  // Get error statistics for debugging
  getErrorStats(): {
    totalErrors: number
    errorsBySeverity: Record<string, number>
    errorsByCategory: Record<string, number>
    recentErrors: ErrorReport[]
  } {
    const errorsBySeverity: Record<string, number> = {}
    const errorsByCategory: Record<string, number> = {}
    
    this.reports.forEach(report => {
      errorsBySeverity[report.context.severity] = (errorsBySeverity[report.context.severity] || 0) + 1
      errorsByCategory[report.context.category] = (errorsByCategory[report.context.category] || 0) + 1
    })
    
    return {
      totalErrors: this.reports.length,
      errorsBySeverity,
      errorsByCategory,
      recentErrors: this.reports.slice(-10) // Last 10 errors
    }
  }
  
  // Clear error reports (for testing)
  clearReports(): void {
    this.reports = []
    this.breadcrumbs = []
  }
}

// Singleton instance
export const errorTracker = new ErrorTracker()

// Convenience functions
export const captureException = (error: Error, context?: Partial<ErrorContext>) => {
  errorTracker.captureException(error, context)
}

export const addBreadcrumb = (message: string, category?: string) => {
  errorTracker.addBreadcrumb(message, category)
}

// Game-specific error helpers
export const captureGameError = (error: Error, gameContext: {
  phase?: string
  pattern?: string
  tilesInHand?: number
  gameMode?: 'solo' | 'multiplayer'
}) => {
  errorTracker.captureException(error, {
    severity: 'high',
    category: 'game-logic',
    gamePhase: gameContext.phase,
    currentPattern: gameContext.pattern,
    tilesInHand: gameContext.tilesInHand,
    gameMode: gameContext.gameMode
  })
}

export const captureNetworkError = (error: Error, endpoint?: string) => {
  errorTracker.captureException(error, {
    severity: 'medium',
    category: 'network',
    component: 'api',
    extra: { endpoint }
  })
}