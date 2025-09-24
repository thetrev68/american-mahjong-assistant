/**
 * Lazy Loading Wrapper
 * Intelligent component lazy loading with performance monitoring
 */

import React, {
  useEffect,
  useState,
  useRef,
  Suspense
} from 'react'
import { LoadingSpinner } from '../LoadingSpinner'
import { usePerformanceMonitor } from '../../hooks/usePerformanceMonitor'

interface LazyWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  timeout?: number
  retryAttempts?: number
  onError?: (error: Error) => void
  onLoad?: () => void
  preload?: boolean
  className?: string
}


// Error boundary for lazy components
class LazyErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error, errorInfo: { componentStack: string }) => void; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; onError?: (error: Error, errorInfo: { componentStack: string }) => void; fallback?: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    this.props.onError?.(error, errorInfo)
    console.error('Lazy component loading error:', error)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 text-center text-red-600">
          <p>Failed to load component</p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// Smart fallback component with progressive loading
const SmartFallback: React.FC<{ 
  timeout?: number
  componentName?: string
}> = ({ timeout = 5000, componentName }) => {
  const [stage, setStage] = useState<'loading' | 'delayed' | 'timeout'>('loading')
  const { trackComponent } = usePerformanceMonitor()
  const startTime = useRef(Date.now())

  useEffect(() => {
    const delayTimer = setTimeout(() => {
      setStage('delayed')
    }, 1000) // Show "taking longer" after 1 second

    const timeoutTimer = setTimeout(() => {
      setStage('timeout')
      if (componentName) {
        trackComponent(componentName, Date.now() - startTime.current, false)
      }
    }, timeout)

    return () => {
      clearTimeout(delayTimer)
      clearTimeout(timeoutTimer)
    }
  }, [timeout, componentName, trackComponent])

  switch (stage) {
    case 'loading':
      return (
        <div className="flex items-center justify-center p-4">
          <LoadingSpinner size="sm" />
          <span className="ml-2 text-sm text-gray-600">Loading...</span>
        </div>
      )
    
    case 'delayed':
      return (
        <div className="flex flex-col items-center justify-center p-6">
          <LoadingSpinner size="md" />
          <p className="mt-2 text-sm text-gray-600">Taking longer than expected...</p>
          <p className="text-xs text-gray-500">Loading {componentName || 'component'}</p>
        </div>
      )
    
    case 'timeout':
      return (
        <div className="flex flex-col items-center justify-center p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="text-yellow-600 text-2xl mb-2">⚠️</div>
          <p className="text-sm text-yellow-800 text-center">
            Component loading timed out
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-3 px-3 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 text-sm"
          >
            Reload Page
          </button>
        </div>
      )
  }
}

// Intersection Observer for lazy loading
export const LazyWrapper: React.FC<LazyWrapperProps> = ({
  children,
  fallback,
  timeout = 10000,
  onError,
  onLoad,
  preload = false,
  className = ''
}) => {
  const [shouldLoad, setShouldLoad] = useState(preload)
  const elementRef = useRef<HTMLDivElement>(null)
  const { trackComponent } = usePerformanceMonitor()

  // Intersection observer for viewport-based loading
  useEffect(() => {
    if (preload || shouldLoad) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true)
          observer.disconnect()
        }
      },
      { 
        rootMargin: '100px', // Load when component is 100px from viewport
        threshold: 0.1 
      }
    )

    if (elementRef.current) {
      observer.observe(elementRef.current)
    }

    return () => observer.disconnect()
  }, [preload, shouldLoad])

  // Track loading performance
  useEffect(() => {
    if (shouldLoad) {
      const startTime = Date.now()
      onLoad?.()
      
      return () => {
        trackComponent('LazyWrapper', Date.now() - startTime, false)
      }
    }
  }, [shouldLoad, onLoad, trackComponent])

  return (
    <div ref={elementRef} className={`lazy-wrapper ${className}`}>
      {shouldLoad ? (
        <LazyErrorBoundary onError={onError} fallback={fallback}>
          <Suspense 
            fallback={
              fallback || <SmartFallback timeout={timeout} componentName="LazyWrapper" />
            }
          >
            {children}
          </Suspense>
        </LazyErrorBoundary>
      ) : (
        <div className="h-32 bg-gray-50 rounded-lg animate-pulse flex items-center justify-center">
          <span className="text-sm text-gray-500">Loading when visible...</span>
        </div>
      )}
    </div>
  )
}


// Re-export utilities from separate file to avoid Fast Refresh warnings
// export { createLazyComponent, usePreloadComponent } from './lazy-utils'