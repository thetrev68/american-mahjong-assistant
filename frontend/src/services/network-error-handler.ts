// Network Error Handler & Retry Logic
// Intelligent error classification, retry strategies, and network resilience

import { useGameStore } from '../stores/game-store'
import { useRoomStore } from '../stores/room-store'
import { handleNetworkError } from './disconnection-manager'

export interface NetworkError {
  type: 'connection-failed' | 'timeout' | 'server-error' | 'rate-limit' | 'unknown'
  code?: string | number
  message: string
  timestamp: Date
  severity: 'low' | 'medium' | 'high' | 'critical'
  isRetryable: boolean
}

export interface RetryStrategy {
  maxAttempts: number
  baseDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
  jitterEnabled: boolean
  retryableErrors: string[]
}

export interface NetworkHealth {
  status: 'healthy' | 'degraded' | 'poor' | 'offline'
  latency: number | null
  packetLoss: number
  consecutiveFailures: number
  lastSuccessfulConnection: Date | null
  errorHistory: NetworkError[]
}

const DEFAULT_RETRY_STRATEGY: RetryStrategy = {
  maxAttempts: 5,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitterEnabled: true,
  retryableErrors: [
    'connect_error',
    'timeout',
    'transport error',
    'websocket error',
    'polling error'
  ]
}

export class NetworkErrorHandler {
  private static instance: NetworkErrorHandler | null = null
  private retryStrategy: RetryStrategy
  private networkHealth: NetworkHealth
  private activeRetries: Map<string, NodeJS.Timeout> = new Map()
  private healthMonitorInterval: NodeJS.Timeout | null = null

  private constructor(retryStrategy: Partial<RetryStrategy> = {}) {
    this.retryStrategy = { ...DEFAULT_RETRY_STRATEGY, ...retryStrategy }
    this.networkHealth = {
      status: 'healthy',
      latency: null,
      packetLoss: 0,
      consecutiveFailures: 0,
      lastSuccessfulConnection: new Date(),
      errorHistory: []
    }

    // Health monitoring will be started from the hook
  }

  static getInstance(retryStrategy?: Partial<RetryStrategy>): NetworkErrorHandler {
    if (!NetworkErrorHandler.instance) {
      NetworkErrorHandler.instance = new NetworkErrorHandler(retryStrategy)
    }
    return NetworkErrorHandler.instance
  }

  // Handle network error with intelligent classification
  public async handleError(error: unknown, context?: string): Promise<boolean> {
    const networkError = this.classifyError(error, context)
    
    // Add to error history
    this.addToErrorHistory(networkError)
    
    // Update network health
    this.updateNetworkHealth()
    
    // Handle based on severity and type
    const shouldRetry = await this.processError(networkError)
    
    return shouldRetry
  }

  // Classify error type and severity
  private classifyError(error: unknown, context?: string): NetworkError {
    let type: NetworkError['type'] = 'unknown'
    let severity: NetworkError['severity'] = 'medium'
    let isRetryable = false
    let message = 'Unknown network error'
    let code: string | number | undefined

    if (error instanceof Error) {
      message = error.message
      
      // Socket.io specific errors
      if (message.includes('connect_error') || message.includes('connection')) {
        type = 'connection-failed'
        severity = 'high'
        isRetryable = true
      } else if (message.includes('timeout')) {
        type = 'timeout'
        severity = 'medium'
        isRetryable = true
      } else if (message.includes('transport') || message.includes('websocket')) {
        type = 'connection-failed'
        severity = 'medium'
        isRetryable = true
      } else if (message.includes('server') || message.includes('500')) {
        type = 'server-error'
        severity = 'high'
        isRetryable = true
      } else if (message.includes('rate') || message.includes('429')) {
        type = 'rate-limit'
        severity = 'low'
        isRetryable = true
      }
    } else if (typeof error === 'object' && error !== null) {
      // Handle structured error objects
      const errorObj = error as Record<string, unknown>
      
      if (errorObj.code) {
        code = errorObj.code as string | number
      }
      
      if (errorObj.message) {
        message = String(errorObj.message)
      }
      
      // HTTP status codes
      if (typeof code === 'number') {
        if (code >= 500) {
          type = 'server-error'
          severity = 'high'
          isRetryable = true
        } else if (code === 429) {
          type = 'rate-limit'
          severity = 'low'
          isRetryable = true
        } else if (code >= 400) {
          type = 'connection-failed'
          severity = 'medium'
          isRetryable = false
        }
      }
    }

    // Context-specific classification
    if (context === 'room-join' || context === 'room-create') {
      severity = 'high'
    } else if (context === 'state-sync' || context === 'heartbeat') {
      severity = 'low'
    }

    return {
      type,
      code,
      message,
      timestamp: new Date(),
      severity,
      isRetryable
    }
  }

  // Process error and decide on action
  private async processError(error: NetworkError): Promise<boolean> {
    console.error(`Network error [${error.type}]:`, error.message)

    // Show user notification based on severity
    this.showErrorNotification(error)

    // Handle critical errors immediately
    if (error.severity === 'critical') {
      await handleNetworkError(error.message)
      return false
    }

    // Check if we should retry
    if (!error.isRetryable) {
      return false
    }

    // Check retry limits
    if (this.networkHealth.consecutiveFailures >= this.retryStrategy.maxAttempts) {
      console.warn('Max retry attempts reached')
      await this.handleMaxRetriesReached(error)
      return false
    }

    // Start retry process (socketInstance will be passed from hook)
    return this.scheduleRetry(error)
  }

  // Schedule retry with exponential backoff
  private scheduleRetry(error: NetworkError, socketInstance?: { connect: () => void; retry: () => void }): boolean {
    const retryKey = `${error.type}-${Date.now()}`
    const attempt = this.networkHealth.consecutiveFailures + 1
    
    // Calculate delay with exponential backoff
    let delay = this.retryStrategy.baseDelayMs * 
                Math.pow(this.retryStrategy.backoffMultiplier, attempt - 1)
    
    // Cap at maximum delay
    delay = Math.min(delay, this.retryStrategy.maxDelayMs)
    
    // Add jitter if enabled
    if (this.retryStrategy.jitterEnabled) {
      const jitter = Math.random() * 0.1 * delay // Up to 10% jitter
      delay += jitter
    }

    console.log(`Scheduling retry in ${delay}ms (attempt ${attempt}/${this.retryStrategy.maxAttempts})`)

    const timer = setTimeout(async () => {
      this.activeRetries.delete(retryKey)
      if (socketInstance) {
        await this.attemptRetry(error, socketInstance)
      }
    }, delay)

    this.activeRetries.set(retryKey, timer)
    
    return true
  }

  // Attempt to retry the failed operation (will be called from hook)
  public async attemptRetry(originalError: NetworkError, socketInstance: { connect: () => void; retry: () => void }): Promise<void> {
    console.log(`Retrying after ${originalError.type} error`)
    
    try {
      // Different retry strategies based on error type
      switch (originalError.type) {
        case 'connection-failed':
          socketInstance.connect()
          break
          
        case 'timeout':
          // Retry with longer timeout
          socketInstance.retry()
          break
          
        case 'server-error':
          // Wait a bit longer for server recovery
          await new Promise(resolve => setTimeout(resolve, 2000))
          socketInstance.connect()
          break
          
        case 'rate-limit':
          // Wait for rate limit to reset
          await new Promise(resolve => setTimeout(resolve, 5000))
          socketInstance.retry()
          break
          
        default:
          socketInstance.retry()
      }

      // If retry succeeds, reset failure count
      // This will be updated by the connection success handler
      
    } catch (_retryError) {
      console.error('Retry attempt failed:', _retryError)
      this.networkHealth.consecutiveFailures++
      
      // Try again if we haven't exceeded max attempts
      if (this.networkHealth.consecutiveFailures < this.retryStrategy.maxAttempts) {
        this.scheduleRetry(originalError, socketInstance)
      } else {
        await this.handleMaxRetriesReached(originalError)
      }
    }
  }

  // Handle case when max retries are reached
  private async handleMaxRetriesReached(error: NetworkError): Promise<void> {
    console.error('Maximum retry attempts reached for error:', error.type)
    
    this.networkHealth.status = 'offline'
    
    useGameStore.getState().addAlert({
      type: 'warning',
      title: 'Connection Failed',
      message: `Unable to restore connection after ${this.retryStrategy.maxAttempts} attempts. Please check your network and try again.`
    })

    // Trigger disconnection handling
    await handleNetworkError(`Max retries reached: ${error.message}`)
  }

  // Show error notification to user
  private showErrorNotification(error: NetworkError): void {
    const gameStore = useGameStore.getState()
    
    // Don't spam user with low severity errors
    if (error.severity === 'low' && this.networkHealth.consecutiveFailures < 3) {
      return
    }

    let title = 'Network Error'
    let type: 'error' | 'warning' | 'info' = 'warning'
    
    switch (error.severity) {
      case 'critical':
        title = 'Critical Network Error'
        type = 'warning'
        break
      case 'high':
        title = 'Connection Problem'
        type = 'warning'
        break
      case 'medium':
        title = 'Network Issue'
        type = 'warning'
        break
      case 'low':
        title = 'Minor Connection Issue'
        type = 'info'
        break
    }

    gameStore.addAlert({
      type,
      title,
      message: this.getUserFriendlyMessage(error)
    })
  }

  // Get user-friendly error message
  private getUserFriendlyMessage(error: NetworkError): string {
    switch (error.type) {
      case 'connection-failed':
        return 'Unable to connect to the server. Checking your connection...'
      case 'timeout':
        return 'Connection is slow. Please be patient while we retry...'
      case 'server-error':
        return 'Server is experiencing issues. Retrying automatically...'
      case 'rate-limit':
        return 'Too many requests. Slowing down and retrying...'
      default:
        return 'Network issue detected. Attempting to resolve...'
    }
  }

  // Add error to history (with size limit)
  private addToErrorHistory(error: NetworkError): void {
    this.networkHealth.errorHistory.push(error)
    
    // Keep only last 20 errors
    if (this.networkHealth.errorHistory.length > 20) {
      this.networkHealth.errorHistory.shift()
    }
  }

  // Update network health status
  private updateNetworkHealth(): void {
    this.networkHealth.consecutiveFailures++
    
    // Update status based on failure count
    if (this.networkHealth.consecutiveFailures >= 5) {
      this.networkHealth.status = 'offline'
    } else if (this.networkHealth.consecutiveFailures >= 3) {
      this.networkHealth.status = 'poor'
    } else if (this.networkHealth.consecutiveFailures >= 1) {
      this.networkHealth.status = 'degraded'
    }

    // Update room store with health status - defer to avoid React render cycle issues
    setTimeout(() => {
      try {
        useRoomStore.getState().updateConnectionStatus({
          isConnected: this.networkHealth.status === 'healthy',
          reconnectionAttempts: this.networkHealth.consecutiveFailures
        })
      } catch (error) {
        console.warn('Failed to update connection status from network health:', error)
      }
    }, 0)
  }

  // Handle successful connection (reset failure count)
  public onConnectionSuccess(): void {
    this.networkHealth.consecutiveFailures = 0
    this.networkHealth.lastSuccessfulConnection = new Date()
    this.networkHealth.status = 'healthy'
    
    // Clear any active retries
    this.clearAllRetries()
    
    useGameStore.getState().addAlert({
      type: 'success',
      title: 'Connection Restored',
      message: 'Successfully reconnected to the server'
    })
  }

  // Start health monitoring (called from hook)
  public startHealthMonitoring(socketInstance: { isConnected: boolean; connectionHealth: { latency: number | null } }): void {
    this.healthMonitorInterval = setInterval(() => {
      this.monitorNetworkHealth(socketInstance)
    }, 10000) // Check every 10 seconds
  }

  // Monitor network health (called from hook)
  public monitorNetworkHealth(socketInstance: { isConnected: boolean; connectionHealth: { latency: number | null } }): void {
    // Update latency from socket health
    if (socketInstance.connectionHealth.latency !== null) {
      this.networkHealth.latency = socketInstance.connectionHealth.latency
    }
    
    // Estimate packet loss based on ping success rate
    const recentErrors = this.networkHealth.errorHistory
      .filter(e => Date.now() - e.timestamp.getTime() < 60000) // Last minute
      .filter(e => e.type === 'timeout')
    
    this.networkHealth.packetLoss = recentErrors.length / 6 // Rough estimate
    
    // Auto-recovery check
    if (!socketInstance.isConnected && this.networkHealth.consecutiveFailures === 0) {
      // Connection lost but no recorded failures - start recovery
      this.handleError(new Error('Connection lost unexpectedly'), 'health-monitor')
    }
  }

  // Clear all active retries
  private clearAllRetries(): void {
    this.activeRetries.forEach((timer) => {
      clearTimeout(timer)
    })
    this.activeRetries.clear()
  }

  // Get current network health
  public getNetworkHealth(): NetworkHealth {
    return { ...this.networkHealth }
  }

  // Check if network is healthy enough for operation
  public isNetworkHealthy(): boolean {
    return this.networkHealth.status === 'healthy' || this.networkHealth.status === 'degraded'
  }

  // Manual retry trigger (called from hook)
  public manualRetry(socketInstance: { retry: () => void }): void {
    this.networkHealth.consecutiveFailures = 0
    this.clearAllRetries()
    
    socketInstance.retry()
  }

  // Clean up
  public destroy(): void {
    this.clearAllRetries()
    
    if (this.healthMonitorInterval) {
      clearInterval(this.healthMonitorInterval)
      this.healthMonitorInterval = null
    }
  }
}

// Export singleton instance
export const getNetworkErrorHandler = (): NetworkErrorHandler => {
  return NetworkErrorHandler.getInstance()
}

// Utility functions
export const handleSocketError = async (error: unknown, context?: string): Promise<void> => {
  const handler = getNetworkErrorHandler()
  await handler.handleError(error, context)
}

export const onConnectionSuccess = (): void => {
  const handler = getNetworkErrorHandler()
  handler.onConnectionSuccess()
}

export const isNetworkHealthy = (): boolean => {
  const handler = getNetworkErrorHandler()
  return handler.isNetworkHealthy()
}