// Production Monitoring System
// Centralized exports for error tracking and performance monitoring

export {
  errorTracker,
  captureException,
  addBreadcrumb,
  captureGameError,
  captureNetworkError,
  type ErrorContext,
  type ErrorReport
} from './error-tracker'

export {
  ProductionErrorBoundary,
  withErrorBoundary,
  useErrorHandler
} from './ProductionErrorBoundary'

export {
  performanceMonitor,
  startTiming,
  endTiming,
  recordMetric,
  getPerformanceReport,
  measurePatternAnalysis,
  measureTileRender,
  type PerformanceMetrics,
  type PerformanceReport
} from './performance-monitor'

// Initialize monitoring in production
import { featureFlags } from '../feature-flags'
import { addBreadcrumb } from './error-tracker'

if (featureFlags.enableErrorTracking || featureFlags.enablePerformanceMonitoring) {
  // Add initial breadcrumb
  addBreadcrumb('Application initialized with monitoring', 'app-lifecycle')
  
  if (featureFlags.enableDebugMode) {
    console.log('🔍 Production monitoring initialized', {
      errorTracking: featureFlags.enableErrorTracking,
      performanceMonitoring: featureFlags.enablePerformanceMonitoring
    })
  }
}