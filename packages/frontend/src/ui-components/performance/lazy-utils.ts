/**
 * Lazy Loading Utilities
 * Utility functions for lazy component creation and preloading
 */

import React, { Suspense, lazy, type ComponentType } from 'react'

interface LazyComponentOptions {
  loader: () => Promise<{ default: ComponentType<Record<string, unknown>> }>
  fallback?: React.ReactNode
  errorBoundary?: ComponentType<{ children: React.ReactNode; onError?: (error: Error, errorInfo: { componentStack: string }) => void; fallback?: React.ReactNode }>
  preload?: boolean
  componentName?: string
}

export const createLazyComponent = ({
  loader,
  fallback,
  errorBoundary: ErrorBoundary,
  preload = false,
  componentName = 'LazyComponent'
}: LazyComponentOptions) => {
  const LazyComponent = lazy(() => {
    let retries = 0
    const maxRetries = 3
    
    const loadWithRetry = (): Promise<{ default: ComponentType<Record<string, unknown>> }> => {
      return loader().catch((error) => {
        if (retries < maxRetries) {
          retries++
          console.warn(`Retry ${retries}/${maxRetries} loading ${componentName}:`, error)
          return new Promise(resolve => setTimeout(resolve, 1000 * retries))
            .then(() => loadWithRetry())
        }
        throw error
      })
    }
    
    return loadWithRetry()
  })

  const WrappedComponent: React.FC<Record<string, unknown>> = (props) => {
    // Preload on hover for better UX
    const handleMouseEnter = React.useCallback(() => {
      if (!preload) {
        // Trigger preload by importing
        loader().catch(() => {
          // Silent fail for preload
        })
      }
    }, [])

    const fallbackElement = fallback || React.createElement('div', {
      className: 'flex items-center justify-center p-4'
    }, 'Loading...')

    return React.createElement(
      'div',
      { onMouseEnter: handleMouseEnter },
      React.createElement(
        ErrorBoundary || React.Fragment,
        ErrorBoundary ? {} : null,
        React.createElement(
          Suspense,
          { fallback: fallbackElement },
          React.createElement(LazyComponent, props)
        )
      )
    )
  }

  WrappedComponent.displayName = `Lazy(${componentName})`
  return WrappedComponent
}

export const usePreloadComponent = (loader: () => Promise<unknown>) => {
  const [isPreloaded, setIsPreloaded] = React.useState(false)
  
  const preload = React.useCallback(() => {
    if (!isPreloaded) {
      loader()
        .then(() => setIsPreloaded(true))
        .catch(() => {
          // Silent fail for preload
        })
    }
  }, [loader, isPreloaded])

  return { preload, isPreloaded }
}