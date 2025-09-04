import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

interface QueuedEvent {
  event: string
  data: unknown
  timestamp: Date
}

interface ConnectionHealth {
  isHealthy: boolean
  latency: number | null
  lastPing: Date | null
  reconnectAttempts: number
}

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false)
  const [socketId, setSocketId] = useState<string | null>(null)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [connectionHealth, setConnectionHealth] = useState<ConnectionHealth>({
    isHealthy: true,
    latency: null,
    lastPing: null,
    reconnectAttempts: 0
  })
  const [eventQueue, setEventQueue] = useState<QueuedEvent[]>([])
  const [lastError, setLastError] = useState<string | null>(null)

  const socketRef = useRef<Socket | null>(null)
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)

  const connect = useCallback(() => {
    try {
      if (socketRef.current?.connected) {
        return
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'
      
      socketRef.current = io(backendUrl, {
        autoConnect: true,
        timeout: 10000,
        retries: 3
      })

      const socket = socketRef.current

      socket.on('connect', () => {
        setIsConnected(true)
        setSocketId(socket.id || null)
        setConnectionError(null)
        setLastError(null)
        reconnectAttemptsRef.current = 0
        
        setConnectionHealth(prev => ({
          ...prev,
          isHealthy: true,
          reconnectAttempts: 0
        }))

        // Flush queued events on reconnection - use functional update to avoid dependency
        setEventQueue(currentQueue => {
          if (currentQueue.length > 0) {
            currentQueue.forEach(({ event, data }) => {
              socket.emit(event, data)
            })
            return []
          }
          return currentQueue
        })
      })

      socket.on('disconnect', (reason) => {
        setIsConnected(false)
        setSocketId(null)
        setConnectionError(reason)
        
        setConnectionHealth(prev => ({
          ...prev,
          isHealthy: false
        }))
      })

      socket.on('connect_error', (error) => {
        reconnectAttemptsRef.current++
        setConnectionError(error.message)
        setIsConnected(false)
        
        setConnectionHealth(prev => ({
          ...prev,
          isHealthy: false,
          reconnectAttempts: reconnectAttemptsRef.current
        }))
      })

      socket.on('pong', (data: { timestamp: number }) => {
        const latency = Date.now() - data.timestamp
        setConnectionHealth(prev => ({
          ...prev,
          latency,
          lastPing: new Date()
        }))
      })

      socket.connect()

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed'
      setConnectionError(errorMessage)
      setIsConnected(false)
      setSocketId(null)
    }
  }, [])

  const disconnect = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }

    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }

    setIsConnected(false)
    setSocketId(null)
    setConnectionError(null)
    setEventQueue([])
  }, [])

  const emit = useCallback((event: string, data?: unknown) => {
    try {
      if (!socketRef.current?.connected) {
        // Queue event if disconnected
        const queuedEvent: QueuedEvent = {
          event,
          data,
          timestamp: new Date()
        }
        setEventQueue(prev => [...prev, queuedEvent])
        return
      }

      socketRef.current.emit(event, data)
      setLastError(null)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setLastError(`Failed to emit event: ${errorMessage}`)
    }
  }, [])

  const on = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler)
    }
  }, [])

  const off = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    if (socketRef.current) {
      socketRef.current.off(event, handler)
    }
  }, [])

  const retry = useCallback(() => {
    if (socketRef.current && !socketRef.current.connected) {
      socketRef.current.connect()
    }
  }, [])

  // Start ping mechanism
  useEffect(() => {
    if (isConnected && !pingIntervalRef.current) {
      pingIntervalRef.current = setInterval(() => {
        if (socketRef.current?.connected) {
          socketRef.current.emit('ping', { timestamp: Date.now() })
        }
      }, 30000) // Ping every 30 seconds
    }

    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
        pingIntervalRef.current = null
      }
    }
  }, [isConnected])

  // Auto-connect on mount - run only once
  useEffect(() => {
    connect()

    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return {
    isConnected,
    socketId,
    connectionError,
    connectionHealth,
    eventQueue,
    lastError,
    connect,
    disconnect,
    emit,
    on,
    off,
    retry,
    rawSocket: socketRef.current
  }
}