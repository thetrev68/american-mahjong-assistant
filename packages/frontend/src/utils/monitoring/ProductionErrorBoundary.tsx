// Production Error Boundary
// React Error Boundary with monitoring integration for production deployment

import React, { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { errorTracker, type ErrorContext } from './error-tracker'
import { featureFlags, appConfig } from '../feature-flags'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  
  // Context for error reporting
  component?: string
  gamePhase?: string
  userId?: string
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string | null
}

export class ProductionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    }
  }
  
  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { component, gamePhase, userId, onError } = this.props
    
    // Create detailed error context
    const context: ErrorContext = {
      severity: 'critical',
      category: 'ui',
      component: component || 'unknown-component',
      gamePhase,
      userId,
      tags: {
        errorBoundary: 'ProductionErrorBoundary',
        errorId: this.state.errorId || 'unknown'
      },
      extra: {
        errorInfo,
        componentStack: errorInfo.componentStack,
        errorBoundary: true
      }
    }
    
    // Send to monitoring service
    errorTracker.captureException(error, context)
    
    // Add breadcrumb for error boundary catch
    errorTracker.addBreadcrumb(
      `Error boundary caught error in ${component || 'unknown component'}`,
      'error'
    )
    
    // Update state with error info for potential display
    this.setState({
      errorInfo
    })
    
    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo)
    }
    
    // Log error in development
    if (featureFlags.enableDebugMode) {
      console.group('🛑 Error Boundary Triggered')
      console.error('Error:', error)
      console.error('Error Info:', errorInfo)
      console.error('Component Stack:', errorInfo.componentStack)
      console.groupEnd()
    }
  }
  
  private handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    })
    
    // Add breadcrumb for retry attempt
    errorTracker.addBreadcrumb('User clicked retry after error boundary', 'user-action')
  }
  
  private handleReportError = (): void => {
    const { error, errorInfo } = this.state
    if (!error) return
    
    // Create user feedback payload
    const feedbackData = {
      errorId: this.state.errorId,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      appVersion: appConfig.version,
      error: {
        message: error.message,
        stack: error.stack
      },
      errorInfo,
      // Add any user-provided context here
      userFeedback: 'Error reported via error boundary'
    }
    
    // In production, this could open a feedback modal or send to support
    console.log('Error report data:', feedbackData)
    
    errorTracker.addBreadcrumb('User reported error via error boundary', 'user-action')
  }
  
  render(): ReactNode {
    const { hasError, error, errorId } = this.state
    const { children, fallback } = this.props
    
    if (hasError) {
      // Custom fallback UI if provided
      if (fallback) {
        return fallback
      }
      
      // Default production error UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Something went wrong
            </h1>
            
            <p className="text-gray-600 mb-6">
              We're sorry, but something unexpected happened. The error has been reported to our team.
            </p>
            
            {featureFlags.enableDebugMode && error && (
              <details className="mb-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 mb-2">
                  Error Details (Debug Mode)
                </summary>
                <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                  {error.message}
                  {error.stack && `\n\n${error.stack}`}
                </pre>
              </details>
            )}
            
            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition-colors"
              >
                Try Again
              </button>
              
              <button
                onClick={this.handleReportError}
                className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
              >
                Report This Issue
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="w-full text-gray-500 py-2 px-4 hover:text-gray-700 transition-colors"
              >
                Refresh Page
              </button>
            </div>
            
            {errorId && (
              <p className="text-xs text-gray-400 mt-4">
                Error ID: {errorId}
              </p>
            )}
          </div>
        </div>
      )
    }
    
    return children
  }
}

// HOC for easier wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ProductionErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ProductionErrorBoundary>
  )
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Hook for reporting errors from functional components
export function useErrorHandler() {
  return React.useCallback((error: Error, context?: Partial<ErrorContext>) => {
    errorTracker.captureException(error, {
      severity: 'high',
      category: 'ui',
      component: 'functional-component',
      ...context
    })
  }, [])
}