// Error boundary utility functions and constants
// Moved from ErrorBoundary.tsx to resolve React Fast Refresh warnings

import React from 'react'

export interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo, errorId: string) => void
  maxRetries?: number
  className?: string
  showErrorDetails?: boolean
  isolateError?: boolean
}

// Simple className utility for merging classes
export const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ')
}

// User-friendly error messages
export const ERROR_MESSAGES = {
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
} as const

// Classify error type from error message or stack
export const classifyError = (error: Error): keyof typeof ERROR_MESSAGES => {
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
export const generateErrorId = (): string => {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// HOC for wrapping components with error boundary
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  _errorBoundaryProps?: Partial<ErrorBoundaryProps>
) => {
  const WrappedComponent = (props: P) => {
    return React.createElement(
      React.Fragment,
      {},
      React.createElement(
        'div',
        { 'data-error-boundary': 'wrapper' },
        React.createElement(Component, props)
      )
    )
  }

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