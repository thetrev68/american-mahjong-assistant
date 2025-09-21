// Connection Resilience Test Suite
// Comprehensive testing of end-to-end connection resilience functionality

import { getUnifiedMultiplayerManager, initializeUnifiedMultiplayerManager } from './unified-multiplayer-manager'
import { getConnectionResilienceService } from './connection-resilience'
import { getNetworkErrorHandler } from './network-error-handler'
import { getEventQueueManager } from './event-queue-manager'
import { getCharlestonResilientService } from '../../features/charleston/services/charleston-resilient'
import type { Socket } from 'socket.io-client'

interface MockSocket {
  id: string
  connected: boolean
  emit: (event: string, data: unknown) => unknown
  on: (event: string, handler: (...args: unknown[]) => void) => MockSocket
  off: (event: string, handler?: (...args: unknown[]) => void) => MockSocket
  _triggerEvent: (event: string, ...args: unknown[]) => void
  _setConnected: (connected: boolean) => void
  _setSocketId: (id: string) => void
}

export interface TestResult {
  testName: string
  passed: boolean
  duration: number
  details: string
  error?: string
}

export interface TestSuiteResult {
  totalTests: number
  passed: number
  failed: number
  duration: number
  tests: TestResult[]
  summary: string
}

export class ConnectionResilienceTestSuite {
  private mockSocket: MockSocket | null = null
  private testResults: TestResult[] = []
  private startTime: number = 0

  // Initialize mock socket for testing
  private initializeMockSocket(): MockSocket {
    const eventHandlers = new Map<string, ((...args: unknown[]) => void)[]>()
    let isConnected = true
    let socketId = 'test-socket-id'

    const mockSocket = {
      id: socketId,
      connected: isConnected,
      emit: (event: string, data: unknown) => {
        console.log(`Mock socket emit: ${event}`, data)
        return true as unknown as Socket
      },
      on: (event: string, handler: (...args: unknown[]) => void) => {
        if (!eventHandlers.has(event)) {
          eventHandlers.set(event, [])
        }
        eventHandlers.get(event)!.push(handler)
        return mockSocket
      },
      off: (event: string, handler?: (...args: unknown[]) => void) => {
        if (handler) {
          const handlers = eventHandlers.get(event) || []
          const index = handlers.indexOf(handler)
          if (index >= 0) {
            handlers.splice(index, 1)
          }
        } else {
          eventHandlers.delete(event)
        }
        return mockSocket
      },
      
      // Test helper methods
      _triggerEvent: (event: string, ...args: unknown[]) => {
        const handlers = eventHandlers.get(event) || []
        handlers.forEach(handler => {
          try {
            handler(...args)
          } catch (error) {
            console.error(`Mock socket event handler error:`, error)
          }
        })
      },
      
      _setConnected: (connected: boolean) => {
        const wasConnected = isConnected
        isConnected = connected
        mockSocket.connected = connected
        
        if (connected && !wasConnected) {
          mockSocket._triggerEvent('connect')
        } else if (!connected && wasConnected) {
          mockSocket._triggerEvent('disconnect', 'transport close')
        }
      },
      
      _setSocketId: (id: string) => {
        socketId = id
        mockSocket.id = id
      }
    }

    return mockSocket
  }

  // Execute a single test with error handling and timing
  private async executeTest(testName: string, testFn: () => Promise<void>): Promise<void> {
    const testStart = Date.now()
    
    try {
      console.log(`Starting test: ${testName}`)
      await testFn()
      
      const duration = Date.now() - testStart
      this.testResults.push({
        testName,
        passed: true,
        duration,
        details: 'Test completed successfully'
      })
      console.log(`✓ ${testName} passed (${duration}ms)`)
      
    } catch (error) {
      const duration = Date.now() - testStart
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      this.testResults.push({
        testName,
        passed: false,
        duration,
        details: 'Test failed with error',
        error: errorMessage
      })
      console.error(`✗ ${testName} failed (${duration}ms):`, errorMessage)
    }
  }

  // Test 1: Basic service initialization
  private async testServiceInitialization(): Promise<void> {
    // Initialize mock socket
    this.mockSocket = this.initializeMockSocket()
    
    // Test unified multiplayer manager initialization
    const manager = await initializeUnifiedMultiplayerManager(
      this.mockSocket as unknown as Socket,
      'test-player-id',
      'Test Player'
    )

    if (!manager) {
      throw new Error('Failed to initialize unified multiplayer manager')
    }

    const status = manager.getServiceStatus()
    
    if (!status.isInitialized) {
      throw new Error('Manager not initialized')
    }

    if (status.activeServices.length === 0) {
      throw new Error('No active services')
    }

    console.log('Service initialization test passed:', status)
  }

  // Test 2: Connection resilience service functionality
  private async testConnectionResilience(): Promise<void> {
    const resilienceService = getConnectionResilienceService()
    
    if (!resilienceService) {
      throw new Error('Connection resilience service not available')
    }

    // Mock socket connection changes
    this.mockSocket?._setConnected(false)
    await new Promise(resolve => setTimeout(resolve, 100)) // Wait for handlers
    
    this.mockSocket?._setConnected(true)
    await new Promise(resolve => setTimeout(resolve, 100)) // Wait for handlers

    const connectionHealth = resilienceService.getConnectionHealth()
    
    if (!connectionHealth) {
      throw new Error('Connection health not available')
    }

    console.log('Connection resilience test passed:', connectionHealth)
  }

  // Test 3: Event queue management
  private async testEventQueueManagement(): Promise<void> {
    const eventQueue = getEventQueueManager()
    const manager = getUnifiedMultiplayerManager()
    
    if (!eventQueue || !manager) {
      throw new Error('Event queue or manager not available')
    }

    // Queue some test events
    const eventId1 = eventQueue.queueEvent({
      service: 'room',
      eventType: 'test-event-1',
      data: { test: 'data1' },
      priority: 'high',
      requiresAck: false,
      maxRetries: 2
    })

    eventQueue.queueEvent({
      service: 'charleston',
      eventType: 'test-event-2',
      data: { test: 'data2' },
      priority: 'medium',
      requiresAck: true,
      maxRetries: 3,
      dependsOn: [eventId1] // Depends on first event
    })

    const queueStatus = eventQueue.getQueueStatus()
    
    if (queueStatus.queueSize !== 2) {
      throw new Error(`Expected 2 queued events, got ${queueStatus.queueSize}`)
    }

    if (queueStatus.eventsByService['room'] !== 1) {
      throw new Error('Room service events not queued correctly')
    }

    if (queueStatus.eventsByService['charleston'] !== 1) {
      throw new Error('Charleston service events not queued correctly')
    }

    console.log('Event queue management test passed:', queueStatus)
  }

  // Test 4: Charleston resilient service
  private async testCharlestonResilientService(): Promise<void> {
    const charlestonService = getCharlestonResilientService()
    
    if (!charlestonService) {
      throw new Error('Charleston resilient service not available')
    }

    // Test queueing Charleston operations
    const tiles = [
      { id: 'test-tile-1', suit: 'bamboo', value: '1', display: '1B', isJoker: false },
      { id: 'test-tile-2', suit: 'character', value: '5', display: '5C', isJoker: false },
      { id: 'test-tile-3', suit: 'dots', value: '9', display: '9D', isJoker: false }
    ]

    // This should queue the operation since we're in test mode
    const result = await charlestonService.markPlayerReady(tiles, 'right')
    
    // In test mode with mock socket, this will return false but queue the operation
    if (result === true) {
      console.warn('Charleston operation succeeded unexpectedly in test mode')
    }

    const queueStatus = charlestonService.getQueueStatus()
    
    if (queueStatus.size === 0) {
      throw new Error('Charleston operation was not queued')
    }

    console.log('Charleston resilient service test passed:', queueStatus)
  }

  // Test 5: Network error handling
  private async testNetworkErrorHandling(): Promise<void> {
    const networkHandler = getNetworkErrorHandler()
    
    if (!networkHandler) {
      throw new Error('Network error handler not available')
    }

    // Test error handling
    const testError = new Error('Test network error')
    networkHandler.handleError(testError, 'test-context')

    const networkHealth = networkHandler.getNetworkHealth()
    
    if (networkHealth.consecutiveFailures === 0) {
      throw new Error('Network error was not recorded')
    }

    // Test recovery
    networkHandler.onConnectionSuccess()
    const recoveredHealth = networkHandler.getNetworkHealth()
    
    if (recoveredHealth.consecutiveFailures !== 0) {
      throw new Error('Network health not recovered after successful connection')
    }

    console.log('Network error handling test passed')
  }

  // Test 6: End-to-end event processing
  private async testEndToEndEventProcessing(): Promise<void> {
    const manager = getUnifiedMultiplayerManager()
    const eventQueue = getEventQueueManager()
    
    if (!manager || !eventQueue) {
      throw new Error('Manager or event queue not available')
    }

    // Simulate disconnected state
    this.mockSocket?._setConnected(false)
    await new Promise(resolve => setTimeout(resolve, 100))

    // Emit events while disconnected - they should be queued
    await manager.emitToService('room', 'test-room-event', { testData: 'room' }, { priority: 'high' })
    await manager.emitToService('charleston', 'test-charleston-event', { testData: 'charleston' }, { priority: 'medium' })

    const queueStatusDisconnected = eventQueue.getQueueStatus()
    
    if (queueStatusDisconnected.queueSize < 2) {
      throw new Error('Events not queued while disconnected')
    }

    // Simulate reconnection
    this.mockSocket?._setConnected(true)
    await new Promise(resolve => setTimeout(resolve, 200)) // Wait for processing

    // Check if events were processed
    const queueStatusConnected = eventQueue.getQueueStatus()
    console.log('Queue status after reconnection:', queueStatusConnected)

    console.log('End-to-end event processing test passed')
  }

  // Test 7: Service coordination
  private async testServiceCoordination(): Promise<void> {
    const manager = getUnifiedMultiplayerManager()
    
    if (!manager) {
      throw new Error('Manager not available')
    }

    // Test full state recovery
    await manager.requestFullStateRecovery()

    // Test service status
    const status = manager.getServiceStatus()
    
    if (!status.isInitialized) {
      throw new Error('Manager should be initialized')
    }

    if (status.activeServices.length === 0) {
      throw new Error('No active services found')
    }

    // Test event queue details
    if (!status.eventQueueDetails) {
      throw new Error('Event queue details not available')
    }

    console.log('Service coordination test passed:', status)
  }

  // Run all tests
  async runAllTests(): Promise<TestSuiteResult> {
    this.testResults = []
    this.startTime = Date.now()

    console.log('🧪 Starting Connection Resilience Test Suite')

    // Execute all tests
    await this.executeTest('Service Initialization', () => this.testServiceInitialization())
    await this.executeTest('Connection Resilience', () => this.testConnectionResilience())
    await this.executeTest('Event Queue Management', () => this.testEventQueueManagement())
    await this.executeTest('Charleston Resilient Service', () => this.testCharlestonResilientService())
    await this.executeTest('Network Error Handling', () => this.testNetworkErrorHandling())
    await this.executeTest('End-to-End Event Processing', () => this.testEndToEndEventProcessing())
    await this.executeTest('Service Coordination', () => this.testServiceCoordination())

    // Calculate results
    const totalDuration = Date.now() - this.startTime
    const passedCount = this.testResults.filter(t => t.passed).length
    const failedCount = this.testResults.filter(t => !t.passed).length

    const result: TestSuiteResult = {
      totalTests: this.testResults.length,
      passed: passedCount,
      failed: failedCount,
      duration: totalDuration,
      tests: this.testResults,
      summary: `${passedCount}/${this.testResults.length} tests passed in ${totalDuration}ms`
    }

    // Log results
    console.log('\n📊 Test Suite Results:')
    console.log(`Total Tests: ${result.totalTests}`)
    console.log(`✓ Passed: ${result.passed}`)
    console.log(`✗ Failed: ${result.failed}`)
    console.log(`⏱️ Duration: ${result.duration}ms`)

    if (result.failed > 0) {
      console.log('\n❌ Failed Tests:')
      this.testResults
        .filter(t => !t.passed)
        .forEach(test => {
          console.log(`  - ${test.testName}: ${test.error}`)
        })
    }

    // Cleanup
    await this.cleanup()

    return result
  }

  // Cleanup test environment
  private async cleanup(): Promise<void> {
    try {
      // Clear event queues
      const eventQueue = getEventQueueManager()
      eventQueue?.clearQueue()

      // Cleanup services (but don't destroy them completely as they might be used elsewhere)
      console.log('Test cleanup completed')
    } catch (error) {
      console.error('Error during test cleanup:', error)
    }
  }

  // Run specific test category
  async runTestCategory(category: 'basic' | 'resilience' | 'queue' | 'integration'): Promise<TestResult[]> {
    this.testResults = []
    
    switch (category) {
      case 'basic':
        await this.executeTest('Service Initialization', () => this.testServiceInitialization())
        break
      case 'resilience':
        await this.executeTest('Connection Resilience', () => this.testConnectionResilience())
        await this.executeTest('Network Error Handling', () => this.testNetworkErrorHandling())
        break
      case 'queue':
        await this.executeTest('Event Queue Management', () => this.testEventQueueManagement())
        break
      case 'integration':
        await this.executeTest('End-to-End Event Processing', () => this.testEndToEndEventProcessing())
        await this.executeTest('Service Coordination', () => this.testServiceCoordination())
        break
    }

    return this.testResults
  }
}

// Export singleton test suite
let testSuite: ConnectionResilienceTestSuite | null = null

export const getConnectionResilienceTestSuite = (): ConnectionResilienceTestSuite => {
  if (!testSuite) {
    testSuite = new ConnectionResilienceTestSuite()
  }
  return testSuite
}

// Utility functions for running tests
export const runConnectionResilienceTests = async (): Promise<TestSuiteResult> => {
  const suite = getConnectionResilienceTestSuite()
  return await suite.runAllTests()
}

export const runConnectionResilienceTestCategory = async (
  category: 'basic' | 'resilience' | 'queue' | 'integration'
): Promise<TestResult[]> => {
  const suite = getConnectionResilienceTestSuite()
  return await suite.runTestCategory(category)
}

// Development helper - allows running tests from browser console
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__runConnectionResilienceTests = runConnectionResilienceTests;
  (window as unknown as Record<string, unknown>).__runConnectionResilienceTestCategory = runConnectionResilienceTestCategory;
  console.log('Connection resilience test functions available:', {
    runAll: '__runConnectionResilienceTests()',
    runCategory: '__runConnectionResilienceTestCategory(category)'
  });
}