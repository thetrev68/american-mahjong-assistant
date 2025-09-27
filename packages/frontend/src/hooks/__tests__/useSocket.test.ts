// useSocket Hook Test Suite - Comprehensive TDD for WebSocket connection management

import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { MockedFunction } from 'vitest'
import { useSocket } from '../useSocket'
import { io } from 'socket.io-client'

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn()
}))

const mockSocket = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  connected: true,
  id: 'test-socket-id'
}

describe('useSocket Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset the emit mock implementation and socket state
    mockSocket.emit.mockImplementation(vi.fn())
    mockSocket.connected = true
    ;(io as ReturnType<typeof vi.fn>).mockReturnValue(mockSocket)
  })

  describe('Connection Management', () => {
    it('should connect to backend on mount', () => {
      const { result } = renderHook(() => useSocket())

      expect(io).toHaveBeenCalledWith(expect.stringContaining('localhost:5000'), {
        autoConnect: true,
        timeout: 10000,
        retries: 3
      })

      // Simulate the connect event
      act(() => {
        const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1]
        if (connectHandler) {
          connectHandler()
        }
      })

      expect(result.current.isConnected).toBe(true)
      expect(result.current.socketId).toBe('test-socket-id')
    })

    it('should handle connection failures gracefully', () => {
      const failingSocket = {
        ...mockSocket,
        connected: false,
        connect: vi.fn().mockImplementation(() => {
          throw new Error('Connection failed')
        })
      }
      ;(io as MockedFunction<typeof io>).mockReturnValue(failingSocket)

      const { result } = renderHook(() => useSocket())

      expect(result.current.isConnected).toBe(false)
      expect(result.current.connectionError).toBe('Connection failed')
      expect(result.current.socketId).toBeNull()
    })

    it('should provide manual connect/disconnect functions', () => {
      const { result } = renderHook(() => useSocket())

      act(() => {
        result.current.connect()
      })
      expect(mockSocket.connect).toHaveBeenCalled()

      act(() => {
        result.current.disconnect()
      })
      expect(mockSocket.disconnect).toHaveBeenCalled()
    })

    it('should handle connection state changes', () => {
      const { result } = renderHook(() => useSocket())

      // Simulate connection event
      act(() => {
        const connectHandler = mockSocket.on.mock.calls.find((call: unknown[]) => call[0] === 'connect')?.[1] as ((...args: unknown[]) => void) | undefined
        if (connectHandler) connectHandler()
      })

      expect(result.current.isConnected).toBe(true)
      expect(result.current.connectionError).toBeNull()

      // Simulate disconnection event
      act(() => {
        const disconnectHandler = mockSocket.on.mock.calls.find((call: unknown[]) => call[0] === 'disconnect')?.[1] as ((...args: unknown[]) => void) | undefined
        if (disconnectHandler) disconnectHandler('server error')
      })

      expect(result.current.isConnected).toBe(false)
      expect(result.current.connectionError).toBe('server error')
    })

    it('should implement connection retry logic', () => {
      const retriableSocket = {
        ...mockSocket,
        connected: false
      }
      ;(io as MockedFunction<typeof io>).mockReturnValue(retriableSocket)

      const { result } = renderHook(() => useSocket())

      act(() => {
        result.current.retry()
      })

      expect(mockSocket.connect).toHaveBeenCalled()
    })
  })

  describe('Event Emission', () => {
    it('should emit events with proper error handling', () => {
      const { result } = renderHook(() => useSocket())

      act(() => {
        result.current.emit('test-event', { data: 'test' })
      })

      expect(mockSocket.emit).toHaveBeenCalledWith('test-event', { data: 'test' })
    })

    it('should handle emission failures gracefully', () => {
      mockSocket.emit.mockImplementation(() => {
        throw new Error('Emission failed')
      })

      const { result } = renderHook(() => useSocket())

      act(() => {
        expect(() => {
          result.current.emit('test-event', { data: 'test' })
        }).not.toThrow()
      })

      expect(result.current.lastError).toBe('Failed to emit event: Emission failed')
    })

    it('should queue events when disconnected', () => {
      const disconnectedSocket = {
        ...mockSocket,
        connected: false
      }
      ;(io as MockedFunction<typeof io>).mockReturnValue(disconnectedSocket)

      const { result } = renderHook(() => useSocket())

      act(() => {
        result.current.emit('test-event', { data: 'test' })
      })

      expect(result.current.eventQueue).toHaveLength(1)
      expect(result.current.eventQueue[0]).toEqual({
        event: 'test-event',
        data: { data: 'test' },
        timestamp: expect.any(Date)
      })
    })

    it('should flush event queue on reconnection', () => {
      const { result } = renderHook(() => useSocket())

      // First connect the socket
      act(() => {
        const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1]
        if (connectHandler) {
          connectHandler()
        }
      })

      // Then simulate disconnect and queue events
      act(() => {
        const disconnectHandler = mockSocket.on.mock.calls.find((call: unknown[]) => call[0] === 'disconnect')?.[1] as ((...args: unknown[]) => void) | undefined
        if (disconnectHandler) {
          mockSocket.connected = false  // Set socket to disconnected state
          disconnectHandler()
        }
        result.current.emit('queued-event', { data: 'queued' })
      })

      expect(result.current.eventQueue).toHaveLength(1)

      // Simulate reconnection
      act(() => {
        const connectHandler = mockSocket.on.mock.calls.find((call: unknown[]) => call[0] === 'connect')?.[1] as ((...args: unknown[]) => void) | undefined
        if (connectHandler) {
          mockSocket.connected = true  // Set socket back to connected state
          connectHandler()
        }
      })

      expect(mockSocket.emit).toHaveBeenCalledWith('queued-event', { data: 'queued' })
      expect(result.current.eventQueue).toHaveLength(0)
    })
  })

  describe('Event Listening', () => {
    it('should register event listeners', () => {
      const { result } = renderHook(() => useSocket())
      const handler = vi.fn()

      act(() => {
        result.current.on('test-event', handler)
      })

      expect(mockSocket.on).toHaveBeenCalledWith('test-event', handler)
    })

    it('should unregister event listeners', () => {
      const { result } = renderHook(() => useSocket())
      const handler = vi.fn()

      act(() => {
        result.current.on('test-event', handler)
        result.current.off('test-event', handler)
      })

      expect(mockSocket.off).toHaveBeenCalledWith('test-event', handler)
    })

    it('should clean up listeners on unmount', () => {
      const { result, unmount } = renderHook(() => useSocket())

      act(() => {
        result.current.on('test-event', vi.fn())
      })

      unmount()

      expect(mockSocket.disconnect).toHaveBeenCalled()
    })
  })

  describe('Connection Status Monitoring', () => {
    it('should track connection health', () => {
      const { result } = renderHook(() => useSocket())

      expect(result.current.connectionHealth).toEqual({
        isHealthy: true,
        latency: null,
        lastPing: null,
        reconnectAttempts: 0
      })
    })

    it('should implement ping/pong mechanism', () => {
      vi.useFakeTimers()
      const { result } = renderHook(() => useSocket())

      // First connect the socket to start ping mechanism
      act(() => {
        const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1]
        if (connectHandler) {
          connectHandler()
        }
      })

      // Advance timers to trigger ping
      act(() => {
        vi.advanceTimersByTime(30000) // 30 seconds
      })

      expect(mockSocket.emit).toHaveBeenCalledWith('ping', expect.objectContaining({
        timestamp: expect.any(Number)
      }))

      // Simulate pong response
      act(() => {
        const pongHandler = mockSocket.on.mock.calls.find((call: unknown[]) => call[0] === 'pong')?.[1] as ((...args: unknown[]) => void) | undefined
        if (pongHandler) {
          pongHandler({ timestamp: Date.now() - 100 }) // 100ms latency
        }
      })

      expect(result.current.connectionHealth.latency).toBeCloseTo(100, -1)

      vi.useRealTimers()
    })
  })
})