// useErrorRecovery - Graceful error handling and recovery system for Strategy Advisor
// Provides automatic retry, graceful degradation, and user-friendly error states

import { useCallback, useEffect, useRef, useState, useMemo } from 'react'

interface ErrorState {
  hasError: boolean
  error: Error | null
  errorType: ErrorType
  errorId: string
  retryCount: number
  isRecovering: boolean
  lastAttemptTime: number
  canRetry: boolean
  recoveryStrategy: RecoveryStrategy
}

interface RecoveryOptions {
  maxRetries?: number
  baseDelay?: number
  maxDelay?: number
  exponentialBackoff?: boolean
  enableDegradedMode?: boolean
  enableOfflineMode?: boolean
  autoRetry?: boolean
  customRecoveryStrategies?: Partial<Record<ErrorType, RecoveryStrategy>>
}

interface ErrorRecoveryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  exponentialBackoff: boolean
  enableDegradedMode: boolean
  enableOfflineMode: boolean
  autoRetry: boolean
  degradationThreshold: number
  offlineThreshold: number
}

type ErrorType =
  | 'network'
  | 'timeout'
  | 'validation'
  | 'data_corruption'
  | 'memory_pressure'
  | 'performance_degradation'
  | 'service_unavailable'
  | 'authentication'
  | 'rate_limit'
  | 'unknown'

type RecoveryStrategy =
  | 'retry'
  | 'retry_with_delay'
  | 'retry_with_backoff'
  | 'degrade_gracefully'
  | 'enable_offline_mode'
  | 'reset_state'
  | 'escalate_to_user'
  | 'fallback_to_cache'
  | 'no_recovery'

interface RecoveryAction {
  type: 'retry' | 'reset' | 'degrade' | 'offline' | 'escalate'
  payload?: unknown
  delay?: number
}

interface UseErrorRecoveryResult {
  errorState: ErrorState
  isInDegradedMode: boolean
  isInOfflineMode: boolean
  recover: (action?: RecoveryAction) => Promise<boolean>
  reportError: (error: Error, context?: Record<string, unknown>) => void
  clearError: () => void
  resetRecovery: () => void
  setRecoveryOptions: (options: Partial<RecoveryOptions>) => void
}

// Default configuration
const DEFAULT_CONFIG: ErrorRecoveryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  exponentialBackoff: true,
  enableDegradedMode: true,
  enableOfflineMode: true,
  autoRetry: true,
  degradationThreshold: 2,
  offlineThreshold: 3
}

// Error classification utility
const classifyError = (error: Error): ErrorType => {
  const message = error.message.toLowerCase()
  // Note: stack trace analysis could be added here if needed

  if (message.includes('fetch') || message.includes('network') || message.includes('connection')) {
    return 'network'
  }
  if (message.includes('timeout') || message.includes('aborted')) {
    return 'timeout'
  }
  if (message.includes('validation') || message.includes('invalid')) {
    return 'validation'
  }
  if (message.includes('data') || message.includes('corruption') || message.includes('sync')) {
    return 'data_corruption'
  }
  if (message.includes('memory') || message.includes('heap')) {
    return 'memory_pressure'
  }
  if (message.includes('performance') || message.includes('slow')) {
    return 'performance_degradation'
  }
  if (message.includes('service') || message.includes('unavailable') || message.includes('503')) {
    return 'service_unavailable'
  }
  if (message.includes('auth') || message.includes('unauthorized') || message.includes('401')) {
    return 'authentication'
  }
  if (message.includes('rate') || message.includes('limit') || message.includes('429')) {
    return 'rate_limit'
  }

  return 'unknown'
}

// Default recovery strategies
const DEFAULT_RECOVERY_STRATEGIES: Record<ErrorType, RecoveryStrategy> = {
  network: 'retry_with_backoff',
  timeout: 'retry_with_delay',
  validation: 'escalate_to_user',
  data_corruption: 'reset_state',
  memory_pressure: 'degrade_gracefully',
  performance_degradation: 'degrade_gracefully',
  service_unavailable: 'retry_with_backoff',
  authentication: 'escalate_to_user',
  rate_limit: 'retry_with_backoff',
  unknown: 'retry'
}

// Generate unique error ID
const generateErrorId = (): string => {
  return `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export const useErrorRecovery = (
  options: RecoveryOptions = {}
): UseErrorRecoveryResult => {
  // Configuration
  const config = useMemo((): ErrorRecoveryConfig => ({
    ...DEFAULT_CONFIG,
    maxRetries: options.maxRetries ?? DEFAULT_CONFIG.maxRetries,
    baseDelay: options.baseDelay ?? DEFAULT_CONFIG.baseDelay,
    maxDelay: options.maxDelay ?? DEFAULT_CONFIG.maxDelay,
    exponentialBackoff: options.exponentialBackoff ?? DEFAULT_CONFIG.exponentialBackoff,
    enableDegradedMode: options.enableDegradedMode ?? DEFAULT_CONFIG.enableDegradedMode,
    enableOfflineMode: options.enableOfflineMode ?? DEFAULT_CONFIG.enableOfflineMode,
    autoRetry: options.autoRetry ?? DEFAULT_CONFIG.autoRetry
  }), [options])

  // State management
  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    error: null,
    errorType: 'unknown',
    errorId: '',
    retryCount: 0,
    isRecovering: false,
    lastAttemptTime: 0,
    canRetry: true,
    recoveryStrategy: 'retry'
  })

  const [isInDegradedMode, setIsInDegradedMode] = useState(false)
  const [isInOfflineMode, setIsInOfflineMode] = useState(false)

  // Refs for tracking
  const retryTimeoutRef = useRef<number | null>(null)
  const recoveryAttemptRef = useRef<number>(0)
  const onlineStatusRef = useRef(navigator.onLine)

  // Calculate next retry delay with exponential backoff
  const calculateRetryDelay = useCallback((retryCount: number): number => {
    if (!config.exponentialBackoff) {
      return config.baseDelay
    }

    const delay = config.baseDelay * Math.pow(2, retryCount)
    return Math.min(delay, config.maxDelay)
  }, [config])

  // Get recovery strategy for error type
  const getRecoveryStrategy = useCallback((errorType: ErrorType): RecoveryStrategy => {
    return options.customRecoveryStrategies?.[errorType] || DEFAULT_RECOVERY_STRATEGIES[errorType]
  }, [options.customRecoveryStrategies])

  // Check if we should enter degraded mode
  const shouldEnterDegradedMode = useCallback((retryCount: number, errorType: ErrorType): boolean => {
    if (!config.enableDegradedMode) return false

    const degradationTypes: ErrorType[] = ['memory_pressure', 'performance_degradation', 'service_unavailable']
    return retryCount >= config.degradationThreshold && degradationTypes.includes(errorType)
  }, [config])

  // Check if we should enter offline mode
  const shouldEnterOfflineMode = useCallback((retryCount: number, errorType: ErrorType): boolean => {
    if (!config.enableOfflineMode) return false

    const offlineTypes: ErrorType[] = ['network', 'service_unavailable', 'timeout']
    return retryCount >= config.offlineThreshold && offlineTypes.includes(errorType) && !navigator.onLine
  }, [config])

  // Execute recovery strategy
  const executeRecoveryStrategy = useCallback(async (
    strategy: RecoveryStrategy,
    error: Error,
    retryCount: number
  ): Promise<boolean> => {
    switch (strategy) {
      case 'retry':
        return true // Immediate retry

      case 'retry_with_delay':
        await new Promise(resolve => setTimeout(resolve, config.baseDelay))
        return true

      case 'retry_with_backoff': {
        const delay = calculateRetryDelay(retryCount)
        await new Promise(resolve => setTimeout(resolve, delay))
        return true
      }

      case 'degrade_gracefully':
        setIsInDegradedMode(true)
        return false // Don't retry, but continue in degraded mode

      case 'enable_offline_mode':
        setIsInOfflineMode(true)
        return false // Don't retry, but continue in offline mode

      case 'reset_state':
        // Trigger state reset (would need to be handled by parent component)
        console.warn('State reset requested for error recovery')
        return false

      case 'escalate_to_user':
        // Let user handle the error
        return false

      case 'fallback_to_cache':
        // Use cached data (would need to be implemented by parent)
        console.log('Falling back to cached data')
        return false

      case 'no_recovery':
      default:
        return false
    }
  }, [config, calculateRetryDelay])

  // Recover from error - defined before reportError to avoid circular dependency
  const recover = useCallback(async (action?: RecoveryAction): Promise<boolean> => {
    if (!errorState.hasError) return true

    setErrorState(prev => ({
      ...prev,
      isRecovering: true
    }))

    try {
      const { error, errorType, retryCount, recoveryStrategy } = errorState

      // Check if we should enter special modes
      if (shouldEnterDegradedMode(retryCount, errorType)) {
        setIsInDegradedMode(true)
        console.log('[ErrorRecovery] Entering degraded mode')
      }

      if (shouldEnterOfflineMode(retryCount, errorType)) {
        setIsInOfflineMode(true)
        console.log('[ErrorRecovery] Entering offline mode')
      }

      // Execute recovery strategy
      const shouldRetry = await executeRecoveryStrategy(
        action?.type === 'retry' ? recoveryStrategy : (action?.type as RecoveryStrategy || recoveryStrategy),
        error!,
        retryCount
      )

      if (shouldRetry && retryCount < config.maxRetries) {
        setErrorState(prev => ({
          ...prev,
          retryCount: prev.retryCount + 1,
          lastAttemptTime: Date.now(),
          canRetry: prev.retryCount + 1 < config.maxRetries,
          isRecovering: false
        }))

        console.log(`[ErrorRecovery] Retry attempt ${retryCount + 1}/${config.maxRetries}`)
        return true
      } else {
        // Recovery failed or no more retries
        setErrorState(prev => ({
          ...prev,
          isRecovering: false,
          canRetry: false
        }))

        console.warn('[ErrorRecovery] Recovery failed or max retries reached')
        return false
      }
    } catch (recoveryError) {
      console.error('[ErrorRecovery] Recovery attempt failed:', recoveryError)
      setErrorState(prev => ({
        ...prev,
        isRecovering: false
      }))
      return false
    }
  }, [errorState, config, shouldEnterDegradedMode, shouldEnterOfflineMode, executeRecoveryStrategy])

  // Report an error and initiate recovery
  const reportError = useCallback((error: Error, context?: Record<string, unknown>) => {
    const errorType = classifyError(error)
    const recoveryStrategy = getRecoveryStrategy(errorType)
    const errorId = generateErrorId()

    console.error('[ErrorRecovery] Error reported:', {
      error: error.message,
      errorType,
      recoveryStrategy,
      errorId,
      context
    })

    setErrorState(prev => ({
      ...prev,
      hasError: true,
      error,
      errorType,
      errorId,
      recoveryStrategy,
      lastAttemptTime: Date.now(),
      canRetry: prev.retryCount < config.maxRetries
    }))

    // Auto-retry if enabled and strategy supports it
    if (config.autoRetry && ['retry', 'retry_with_delay', 'retry_with_backoff'].includes(recoveryStrategy)) {
      // Delay auto-retry to prevent immediate retry loops
      retryTimeoutRef.current = window.setTimeout(() => {
        recover({ type: 'retry' })
      }, 100)
    }
  }, [config, getRecoveryStrategy, recover])

  // Clear error state
  const clearError = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }

    setErrorState({
      hasError: false,
      error: null,
      errorType: 'unknown',
      errorId: '',
      retryCount: 0,
      isRecovering: false,
      lastAttemptTime: 0,
      canRetry: true,
      recoveryStrategy: 'retry'
    })

    console.log('[ErrorRecovery] Error state cleared')
  }, [])

  // Reset recovery system
  const resetRecovery = useCallback(() => {
    clearError()
    setIsInDegradedMode(false)
    setIsInOfflineMode(false)
    recoveryAttemptRef.current = 0

    console.log('[ErrorRecovery] Recovery system reset')
  }, [clearError])

  // Set recovery options
  const setRecoveryOptions = useCallback((newOptions: Partial<RecoveryOptions>) => {
    // Options are handled through useMemo dependency on options prop
    console.log('[ErrorRecovery] Recovery options updated:', newOptions)
  }, [])

  // Monitor online status
  useEffect(() => {
    const handleOnlineStatusChange = () => {
      const wasOffline = !onlineStatusRef.current
      const isNowOnline = navigator.onLine

      onlineStatusRef.current = isNowOnline

      if (wasOffline && isNowOnline && isInOfflineMode) {
        console.log('[ErrorRecovery] Back online, attempting recovery')
        setIsInOfflineMode(false)

        // Attempt recovery if we have an error and retries available
        if (errorState.hasError && errorState.canRetry) {
          recover({ type: 'retry' })
        }
      }
    }

    window.addEventListener('online', handleOnlineStatusChange)
    window.addEventListener('offline', handleOnlineStatusChange)

    return () => {
      window.removeEventListener('online', handleOnlineStatusChange)
      window.removeEventListener('offline', handleOnlineStatusChange)
    }
  }, [errorState, isInOfflineMode, recover])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [])

  // Automatic error clearing for certain types
  useEffect(() => {
    if (errorState.hasError && !errorState.isRecovering) {
      const { errorType, lastAttemptTime } = errorState
      const timeSinceLastAttempt = Date.now() - lastAttemptTime

      // Auto-clear certain types of errors after a delay
      const autoClearTypes: ErrorType[] = ['rate_limit', 'timeout']
      const autoClearDelay = 60000 // 1 minute

      if (autoClearTypes.includes(errorType) && timeSinceLastAttempt > autoClearDelay) {
        console.log(`[ErrorRecovery] Auto-clearing ${errorType} error after ${autoClearDelay}ms`)
        clearError()
      }
    }
  }, [errorState, clearError])

  return {
    errorState,
    isInDegradedMode,
    isInOfflineMode,
    recover,
    reportError,
    clearError,
    resetRecovery,
    setRecoveryOptions
  }
}

export default useErrorRecovery