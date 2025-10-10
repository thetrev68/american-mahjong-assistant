import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { appConfig } from '../utils/feature-flags'

export interface QueuedEvent {
  event: string
  data: unknown
  timestamp: Date
}

export interface ConnectionHealth {
  isHealthy: boolean
  latency: number | null
  lastPing: Date | null
  reconnectAttempts: number
}

// GLOBAL singleton socket - shared across ALL hook instances
let globalSocketInstance: Socket | null = null

function patchOutgoingLogging(socket: Socket) {
  try {
    if (!import.meta.env.DEV) return
    const anySock = socket as any
    if (anySock.__outgoingPatched) return
    const originalEmit = socket.emit.bind(socket)
    anySock.__outgoingPatched = true
    socket.emit = ((event: string, ...args: unknown[]) => {
      try {
        // Log outgoing event and first payload arg (compact)
        console.log('🛰️ client OUT:', event, args?.[0])
      } catch {}

      // Wrap ACK to log incoming ACKs tied to this emit
      const last = args[args.length - 1]
      if (typeof last === 'function') {
        const ack = last as (...ackArgs: unknown[]) => void
        args[args.length - 1] = (...ackArgs: unknown[]) => {
          try {
            console.log('🛰️ client ACK for', event, ackArgs?.[0])
          } catch {}
          return ack(...ackArgs)
        }
      }

      return originalEmit(event as any, ...(args as any[]))
    }) as any
  } catch {}
}

export function useSocket(options: { autoConnect?: boolean } = {}) {
  const { autoConnect = true } = options
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
      // If global socket exists, use it
      if (globalSocketInstance) {
        socketRef.current = globalSocketInstance
        patchOutgoingLogging(globalSocketInstance)
        if (globalSocketInstance.connected) {
          setIsConnected(true)
          setSocketId(globalSocketInstance.id || null)
        }
        return
      }

      const backendUrl = appConfig.backendUrl

      // Enable Socket.IO debug logging in development
      if (import.meta.env.DEV) {
        localStorage.debug = 'socket.io-client:*'
      }

      globalSocketInstance = io(backendUrl, {
        autoConnect: true,
        timeout: 10000,
        retries: 3
      })

      socketRef.current = globalSocketInstance
      const socket = globalSocketInstance
      // DISABLED: Testing if monkey-patch is breaking emit after create-room
      // patchOutgoingLogging(socket)

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

  const emit = useCallback((event: string, data?: unknown, callback?: (...args: unknown[]) => void) => {
    try {
      console.log('📤 useSocket.emit() wrapper called:', event, 'connected:', socketRef.current?.connected)

      if (!socketRef.current?.connected) {
        // Queue event if disconnected
        const queuedEvent: QueuedEvent = {
          event,
          data,
          timestamp: new Date()
        }
        setEventQueue(prev => [...prev, queuedEvent])
        console.warn('⚠️ Socket disconnected, queued event:', event)
        return
      }

      console.log('📤 About to call socketRef.current.emit for:', event)
      // Socket.IO debug will show the actual packet transmission
      if (callback) {
        socketRef.current.emit(event, data, callback)
      } else {
        socketRef.current.emit(event, data)
      }
      console.log('📤 socketRef.current.emit completed for:', event)

      setLastError(null)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('❌ emit() error:', errorMessage)
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

  // Auto-connect on mount (or when config changes)
  useEffect(() => {
    if (autoConnect) {
      connect()
    }

    return () => {
      // Don't disconnect - keep socket alive across page navigation
      // disconnect()
    }
  }, [autoConnect, connect])

  // Dev-only: log all incoming socket events to aid debugging
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const s = socketRef.current
    if (!s) return
    const onAny = (event: string, ...args: unknown[]) => {
      try {
        // Keep logs compact to avoid noise
        console.log('🧪 client onAny:', event, args?.[0])
      } catch {}
    }
    // @ts-ignore onAny is available on Socket instance
    s.onAny(onAny)
    return () => {
      // @ts-ignore offAny is available on Socket instance
      s.offAny?.(onAny)
    }
  }, [isConnected])

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
