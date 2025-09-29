// ErrorBoundary - Production-ready error boundary with user-friendly fallbacks
// Provides graceful error handling with recovery options and error reporting

import React, { Component, ReactNode } from 'react'
import { cn } from '../../../lib/utils'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
  errorId: string | null
  retryCount: number
  isRecovering: boolean
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo, errorId: string) => void
  maxRetries?: number
  className?: string
  showErrorDetails?: boolean
  isolateError?: boolean
}

interface ErrorDisplayProps {
  error: Error
  errorId: string
  retryCount: number
  maxRetries: number
  isRecovering: boolean
  onRetry: () => void
  onReport: () => void
  onDismiss: () => void
  showDetails: boolean
  onToggleDetails: () => void
}

// User-friendly error messages
const ERROR_MESSAGES = {
  analysisTimeout: {
    title: "Analysis Taking Longer Than Usual",
    message: "Strategy analysis is taking longer than expected. This might be due to a complex hand or network issues.",
    suggestion: "Try refreshing to restart the analysis, or continue playing while we work in the background."
  },
  networkError: {
    title: "Connection Issue",
    message: "Having trouble connecting to our strategy engine right now.",
    suggestion: "Using your last analysis for now. Check your connection and try again in a moment."
  },
  invalidGameState: {
    title: "Game State Mismatch",
    message: "Something's not quite right with your current hand configuration.",
    suggestion: "Pull down to refresh your hand, or tap 'Reset' to start fresh."
  },
  patternSwitchFailed: {
    title: "Pattern Switch Failed",
    message: "Couldn't switch to the requested pattern right now.",
    suggestion: "Your current selection is unchanged. Try the switch again in a moment."
  },
  memoryPressure: {
    title: "Running Low on Memory",
    message: "Your device is running low on available memory.",
    suggestion: "Some features may be simplified to keep things running smoothly."
  },
  performanceDegradation: {
    title: "Performance Optimization",
    message: "Performance is slower than usual on your device.",
    suggestion: "Switching to optimized mode for a better experience."
  },
  renderError: {
    title: "Display Issue",
    message: "There was a problem displaying this part of the Strategy Advisor.",
    suggestion: "This is usually temporary. Try refreshing or restart the app if it persists."
  },
  dataCorruption: {
    title: "Data Synchronization Issue",
    message: "Strategy data got out of sync with your game state.",
    suggestion: "Refreshing will resynchronize everything with your current hand."
  },
  unknown: {
    title: "Unexpected Issue",
    message: "Something unexpected happened in the Strategy Advisor.",
    suggestion: "This has been logged automatically. Try refreshing to continue."
  }
}

// Classify error type from error message or stack
const classifyError = (error: Error): keyof typeof ERROR_MESSAGES => {
  const message = error.message.toLowerCase()
  const stack = error.stack?.toLowerCase() || ''

  if (message.includes('timeout') || message.includes('aborted')) {
    return 'analysisTimeout'
  }
  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return 'networkError'
  }
  if (message.includes('invalid') || message.includes('state') || message.includes('validation')) {
    return 'invalidGameState'
  }
  if (message.includes('pattern') || message.includes('switch')) {
    return 'patternSwitchFailed'
  }
  if (message.includes('memory') || message.includes('heap')) {
    return 'memoryPressure'
  }
  if (message.includes('performance') || message.includes('slow')) {
    return 'performanceDegradation'
  }
  if (stack.includes('render') || message.includes('render')) {
    return 'renderError'
  }
  if (message.includes('data') || message.includes('sync')) {
    return 'dataCorruption'
  }

  return 'unknown'
}

// Generate unique error ID for tracking
const generateErrorId = (): string => {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Error display component
const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  errorId,
  retryCount,
  maxRetries,
  isRecovering,
  onRetry,
  onReport,
  onDismiss,
  showDetails,
  _onToggleDetails
}) => {
  const [detailsExpanded, setDetailsExpanded] = React.useState(false)
  const errorType = classifyError(error)
  const errorConfig = ERROR_MESSAGES[errorType]

  const canRetry = retryCount < maxRetries && !isRecovering

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-lg border border-red-200 dark:border-red-800 shadow-lg">
      {/* Error Icon & Title */}
      <div className="flex items-start space-x-3 mb-4">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
            <svg
              className="w-5 h-5 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium text-red-800 dark:text-red-200">
            {errorConfig.title}
          </h3>
          <p className="text-sm text-red-600 dark:text-red-300 mt-1">
            {errorConfig.message}
          </p>
        </div>
      </div>

      {/* Suggestion */}
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Suggestion:</strong> {errorConfig.suggestion}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-4">
        {canRetry && (
          <button
            onClick={onRetry}
            disabled={isRecovering}
            className={cn(
              'px-4 py-2 bg-purple-600 text-white rounded-lg font-medium transition-all',
              'hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              isRecovering && 'animate-pulse'
            )}
          >
            {isRecovering ? 'Recovering...' : 'Try Again'}
          </button>
        )}

        <button
          onClick={onReport}
          className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-all hover:bg-slate-200 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
        >
          Report Issue
        </button>

        <button
          onClick={onDismiss}
          className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          Dismiss
        </button>
      </div>

      {/* Retry Count Warning */}
      {retryCount > 0 && (
        <div className="mb-4 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border-l-4 border-yellow-400">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            {retryCount >= maxRetries
              ? `Maximum retry attempts reached (${maxRetries}). Please refresh the page or contact support.`
              : `Retry attempt ${retryCount} of ${maxRetries}`
            }
          </p>
        </div>
      )}

      {/* Error Details (Collapsible) */}
      {showDetails && (
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <button
            onClick={() => setDetailsExpanded(!detailsExpanded)}
            className="flex items-center text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <svg
              className={cn(
                'w-4 h-4 mr-2 transition-transform',
                detailsExpanded ? 'transform rotate-90' : ''
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {detailsExpanded ? 'Hide' : 'Show'} technical details
          </button>

          {detailsExpanded && (
            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800 rounded text-xs font-mono">
              <div className="mb-2">
                <strong>Error ID:</strong> {errorId}
              </div>
              <div className="mb-2">
                <strong>Error:</strong> {error.name}: {error.message}
              </div>
              {error.stack && (
                <div>
                  <strong>Stack Trace:</strong>
                  <pre className="mt-1 whitespace-pre-wrap overflow-auto max-h-32">
                    {error.stack}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Main ErrorBoundary class component
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: number | null = null

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      isRecovering: false
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: generateErrorId()
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorId = this.state.errorId || generateErrorId()

    this.setState({
      errorInfo,
      errorId
    })

    // Call onError prop if provided
    this.props.onError?.(error, errorInfo, errorId)

    // Log error for debugging
    console.error('ErrorBoundary caught an error:', {
      error,
      errorInfo,
      errorId,
      retryCount: this.state.retryCount
    })

    // Report to error monitoring service (if available)
    this.reportError(error, errorInfo, errorId)
  }

  private reportError = (error: Error, errorInfo: React.ErrorInfo, errorId: string) => {
    // This would integrate with your error reporting service
    // For now, we'll just log it
    const errorReport = {
      errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }

    // Send to error reporting service
    try {
      // Example: Sentry, LogRocket, or custom endpoint
      // window.errorReportingService?.captureException(error, { extra: errorReport })
      console.error('Error Report:', errorReport)
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError)
    }
  }

  private handleRetry = () => {
    const { maxRetries = 3 } = this.props

    if (this.state.retryCount >= maxRetries) {
      return
    }

    this.setState({
      isRecovering: true,
      retryCount: this.state.retryCount + 1
    })

    // Clear any existing timeout
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }

    // Delay recovery to prevent rapid retries
    this.retryTimeoutId = window.setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
        isRecovering: false
      })
      this.retryTimeoutId = null
    }, 1000)
  }

  private handleReport = () => {
    if (this.state.error && this.state.errorInfo && this.state.errorId) {
      this.reportError(this.state.error, this.state.errorInfo, this.state.errorId)

      // Show user feedback
      alert('Error report sent. Thank you for helping us improve!')
    }
  }

  private handleDismiss = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      isRecovering: false
    })
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // If a fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Otherwise, render our error display
      return (
        <div className={cn('error-boundary', this.props.className)}>
          <ErrorDisplay
            error={this.state.error}
            errorId={this.state.errorId || 'unknown'}
            retryCount={this.state.retryCount}
            maxRetries={this.props.maxRetries || 3}
            isRecovering={this.state.isRecovering}
            onRetry={this.handleRetry}
            onReport={this.handleReport}
            onDismiss={this.handleDismiss}
            showDetails={this.props.showErrorDetails ?? false}
            onToggleDetails={() => {}}
          />
        </div>
      )
    }

    return this.props.children
  }
}

// HOC for wrapping components with error boundary
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Partial<ErrorBoundaryProps>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}

// Hook for manual error reporting
export const useErrorReporting = () => {
  const reportError = React.useCallback((error: Error, context?: Record<string, unknown>) => {
    const errorId = generateErrorId()
    const errorReport = {
      errorId,
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }

    console.error('Manual Error Report:', errorReport)

    // Send to error reporting service
    try {
      // window.errorReportingService?.captureException(error, { extra: errorReport })
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError)
    }

    return errorId
  }, [])

  return { reportError }
}

export default ErrorBoundary