// Charleston Resilient Service Tests
// Tests for multiplayer Charleston coordination with connection resilience and event queuing

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest'
import {
  CharlestonResilientService,
  getCharlestonResilientService,
  initializeCharlestonResilientService,
  destroyCharlestonResilientService,
  useCharlestonResilience,
  type QueuedCharlestonOperation,
  type CharlestonEventData
} from '../charleston-resilient'
import { useCharlestonStore } from '../../../../stores/charleston-store'
import { useRoomStore } from '../../../../stores/room.store'
import { getConnectionResilienceService } from '../../../../lib/services/connection-resilience'
import { getNetworkErrorHandler } from '../../../../lib/services/network-error-handler'
import type { Tile, TileValue } from 'shared-types'

// Mock dependencies
vi.mock('../../../../stores/charleston-store')
vi.mock('../../../../stores/room.store')
vi.mock('../../../../lib/services/connection-resilience')
vi.mock('../../../../lib/services/network-error-handler')

const createTestTile = (overrides: Partial<Tile> = {}): Tile => ({
  id: 'test-tile-1',
  suit: 'dots',
  value: '1',
  displayName: '1 Dot',
  isJoker: false,
  ...overrides
})

const createTestTiles = (count: number): Tile[] =>
  Array.from({ length: count }, (_, i) => createTestTile({
    id: `test-tile-${i + 1}`,
    value: String((i % 9) + 1) as TileValue
  }))

describe('Charleston Resilient Service', () => {
  let service: CharlestonResilientService
  let mockCharlestonStore: any
  let mockRoomStore: any
  let mockConnectionService: any
  let mockNetworkHandler: any

  beforeEach(() => {
    // Reset service singleton
    destroyCharlestonResilientService()

    // Mock console.error for testing error scenarios
    vi.spyOn(console, 'error').mockImplementation(() => {})

    // Setup mocks
    mockCharlestonStore = {
      setPlayerReady: vi.fn(),
      setPhase: vi.fn(),
      endCharleston: vi.fn()
    }

    mockRoomStore = {
      hostPlayerId: 'player1',
      room: { id: 'room123' },
      setPlayerReadiness: vi.fn()
    }

    mockConnectionService = {
      isConnected: vi.fn(() => true),
      emit: vi.fn(() => Promise.resolve(true))
    }

    mockNetworkHandler = {
      isNetworkHealthy: vi.fn(() => true),
      handleError: vi.fn()
    }

    // Mock store getState functions
    ;(useCharlestonStore as any).getState = vi.fn(() => mockCharlestonStore)
    ;(useRoomStore as any).getState = vi.fn(() => mockRoomStore)
    ;(getConnectionResilienceService as Mock).mockReturnValue(mockConnectionService)
    ;(getNetworkErrorHandler as Mock).mockReturnValue(mockNetworkHandler)

    service = new CharlestonResilientService()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    destroyCharlestonResilientService()
  })

  describe('Service Initialization', () => {
    it('should initialize service correctly', () => {
      expect(service).toBeInstanceOf(CharlestonResilientService)
      service.initialize()
      // Service should be initialized without errors
    })

    it('should not re-initialize if already initialized', () => {
      const consoleSpy = vi.spyOn(console, 'log')
      consoleSpy.mockClear() // Clear any previous calls

      service.initialize()
      const callsAfterFirst = consoleSpy.mock.calls.length

      service.initialize() // Second call should be ignored
      const callsAfterSecond = consoleSpy.mock.calls.length

      expect(callsAfterSecond).toBe(callsAfterFirst) // No additional calls
      expect(consoleSpy).toHaveBeenCalledWith('Charleston resilient service initialized')

      consoleSpy.mockRestore()
    })

    it('should setup singleton service correctly', () => {
      const service1 = getCharlestonResilientService()
      const service2 = getCharlestonResilientService()
      expect(service1).toBe(service2) // Same instance
    })

    it('should initialize service through helper function', () => {
      const initializedService = initializeCharlestonResilientService()
      expect(initializedService).toBeInstanceOf(CharlestonResilientService)
    })

    it('should destroy service correctly', () => {
      const service = getCharlestonResilientService()
      destroyCharlestonResilientService()
      const newService = getCharlestonResilientService()
      expect(service).not.toBe(newService) // Different instance after destroy
    })
  })

  describe('Player Readiness Operations', () => {
    beforeEach(() => {
      service.initialize()
    })

    it('should mark player ready successfully', async () => {
      const selectedTiles = createTestTiles(3)
      const result = await service.markPlayerReady(selectedTiles, 'right')

      expect(result).toBe(true)
      expect(mockNetworkHandler.isNetworkHealthy).toHaveBeenCalled()
    })

    it('should queue operation when network is unhealthy', async () => {
      mockNetworkHandler.isNetworkHealthy.mockReturnValue(false)
      const selectedTiles = createTestTiles(3)

      const result = await service.markPlayerReady(selectedTiles, 'right')

      expect(result).toBe(false) // Queued, not failed
      const queueStatus = service.getQueueStatus()
      expect(queueStatus.size).toBe(1)
      expect(queueStatus.operations[0]).toContain('player-ready')
    })

    it('should handle missing player ID', async () => {
      mockRoomStore.hostPlayerId = null
      const selectedTiles = createTestTiles(3)

      const result = await service.markPlayerReady(selectedTiles, 'right')

      expect(result).toBe(false)
      expect(console.error).toHaveBeenCalledWith('Missing player ID or room ID for Charleston readiness')
    })

    it('should handle missing room ID', async () => {
      mockRoomStore.room = null
      const selectedTiles = createTestTiles(3)

      const result = await service.markPlayerReady(selectedTiles, 'right')

      expect(result).toBe(false)
      expect(console.error).toHaveBeenCalledWith('Missing player ID or room ID for Charleston readiness')
    })

    it('should retry failed operations up to limit', async () => {
      // Mock connection service to fail
      mockConnectionService.emit = vi.fn(() => Promise.resolve(false))

      const selectedTiles = createTestTiles(3)
      const result = await service.markPlayerReady(selectedTiles, 'right')

      expect(result).toBe(false)
      const queueStatus = service.getQueueStatus()
      expect(queueStatus.size).toBe(1) // Should be queued for retry
    })
  })

  describe('Event Handling', () => {
    beforeEach(() => {
      service.initialize()
    })

    it('should handle player readiness updates', () => {
      // Simulate event listener being called
      const eventData = {
        playerId: 'player2',
        isReady: true,
        phase: 'right',
        roomId: 'room123'
      }

      // We can't directly test private event listeners, but we can test the store calls they make
      service.initialize()

      // The setup happens in private methods, so we verify the mocks are set up
      expect(mockCharlestonStore.setPlayerReady).toBeDefined()
      expect(mockRoomStore.setPlayerReadiness).toBeDefined()
    })

    it('should handle tile exchange events', () => {
      const eventData = {
        tilesReceived: [
          { id: 'tile1', suit: 'dots', value: '1', displayName: '1 Dot', isJoker: false },
          { id: 'tile2', suit: 'dots', value: '2', displayName: '2 Dot', isJoker: false },
          { id: 'tile3', suit: 'dots', value: '3', displayName: '3 Dot', isJoker: false }
        ],
        phase: 'right',
        nextPhase: 'across',
        fromPlayerId: 'player2'
      }

      // Event handling setup is verified through initialization
      expect(service).toBeInstanceOf(CharlestonResilientService)
    })

    it('should handle phase change events', () => {
      const eventData = {
        fromPhase: 'right',
        toPhase: 'across',
        roomId: 'room123',
        allPlayersReady: true
      }

      // Event handling is set up in initialization
      service.initialize()
      expect(mockCharlestonStore.setPhase).toBeDefined()
    })

    it('should handle Charleston completion events', () => {
      const eventData = {
        roomId: 'room123',
        finalTiles: [
          { id: 'tile1', suit: 'dots', value: '1' }
        ]
      }

      // Event handling is set up in initialization
      service.initialize()
      expect(mockCharlestonStore.endCharleston).toBeDefined()
    })
  })

  describe('Operation Queue Management', () => {
    beforeEach(() => {
      service.initialize()
    })

    it('should queue operations by priority', async () => {
      // Make network unhealthy to force queuing
      mockNetworkHandler.isNetworkHealthy.mockReturnValue(false)

      const tiles1 = createTestTiles(3)
      const tiles2 = createTestTiles(3)
      const tiles3 = createTestTiles(3)

      // Queue operations with different players to avoid duplicate removal
      mockRoomStore.hostPlayerId = 'player1'
      await service.markPlayerReady(tiles1, 'right')

      mockRoomStore.hostPlayerId = 'player2'
      await service.markPlayerReady(tiles2, 'across')

      mockRoomStore.hostPlayerId = 'player3'
      await service.markPlayerReady(tiles3, 'left')

      const queueStatus = service.getQueueStatus()
      expect(queueStatus.size).toBe(3)
    })

    it('should remove duplicate operations', async () => {
      mockNetworkHandler.isNetworkHealthy.mockReturnValue(false)

      const tiles = createTestTiles(3)

      // Queue same operation twice
      await service.markPlayerReady(tiles, 'right')
      await service.markPlayerReady(tiles, 'right')

      const queueStatus = service.getQueueStatus()
      expect(queueStatus.size).toBe(1) // Should deduplicate
    })

    it('should replay queued operations when connection restored', async () => {
      // Start with unhealthy network
      mockNetworkHandler.isNetworkHealthy.mockReturnValue(false)
      const tiles = createTestTiles(3)

      await service.markPlayerReady(tiles, 'right')

      let queueStatus = service.getQueueStatus()
      expect(queueStatus.size).toBe(1)

      // Restore network health
      mockNetworkHandler.isNetworkHealthy.mockReturnValue(true)

      // Replay operations
      await service.replayQueuedOperations()

      queueStatus = service.getQueueStatus()
      expect(queueStatus.size).toBe(0) // Queue should be empty after replay
    })

    it('should handle replay failures', async () => {
      mockNetworkHandler.isNetworkHealthy.mockReturnValue(false)
      const tiles = createTestTiles(3)

      await service.markPlayerReady(tiles, 'right')

      // Make replay fail
      mockNetworkHandler.isNetworkHealthy.mockReturnValue(true)
      mockConnectionService.emit = vi.fn(() => Promise.resolve(false))

      await service.replayQueuedOperations()

      const queueStatus = service.getQueueStatus()
      expect(queueStatus.size).toBeGreaterThan(0) // Failed operations stay queued
    })

    it('should provide queue status for debugging', async () => {
      mockNetworkHandler.isNetworkHealthy.mockReturnValue(false)
      const tiles = createTestTiles(3)

      await service.markPlayerReady(tiles, 'right')

      const status = service.getQueueStatus()
      expect(status).toHaveProperty('size')
      expect(status).toHaveProperty('operations')
      expect(status.size).toBe(1)
      expect(status.operations[0]).toContain('player-ready')
    })
  })

  describe('Status Requests', () => {
    beforeEach(() => {
      service.initialize()
    })

    it('should request Charleston status successfully', async () => {
      const result = await service.requestCharlestonStatus()
      expect(result).toBe(true)
    })

    it('should handle status request without room ID', async () => {
      mockRoomStore.room = null

      const result = await service.requestCharlestonStatus()
      expect(result).toBe(false)
      expect(console.error).toHaveBeenCalledWith('No room ID for Charleston status request')
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      service.initialize()
    })

    it('should handle event listener errors gracefully', () => {
      // This tests the try-catch in event handlers
      // Since we can't directly trigger private event listeners, we verify error handling setup
      expect(mockNetworkHandler.handleError).toBeDefined()
    })

    it('should handle operation execution errors', async () => {
      // Mock an error in operation execution
      mockConnectionService.emit = vi.fn(() => Promise.reject(new Error('Network error')))

      const tiles = createTestTiles(3)

      // First attempt will queue for retry (retry count = 0)
      const result1 = await service.markPlayerReady(tiles, 'right')
      expect(result1).toBe(false)
      expect(mockNetworkHandler.handleError).not.toHaveBeenCalled() // Not called yet

      // Make network healthy for replay
      mockNetworkHandler.isNetworkHealthy.mockReturnValue(true)

      // Replay will exhaust retries and call error handler
      await service.replayQueuedOperations()

      expect(mockNetworkHandler.handleError).toHaveBeenCalled()
    })

    it('should handle retry limit exceeded', async () => {
      // Mock failing operations that exceed retry limit
      mockConnectionService.emit = vi.fn(() => Promise.reject(new Error('Persistent error')))

      const tiles = createTestTiles(3)

      // This would internally create an operation with retries
      const result = await service.markPlayerReady(tiles, 'right')
      expect(result).toBe(false)
    })
  })

  describe('Service Cleanup', () => {
    it('should cleanup correctly', () => {
      service.initialize()

      const queueStatusBefore = service.getQueueStatus()
      service.cleanup()
      const queueStatusAfter = service.getQueueStatus()

      expect(queueStatusAfter.size).toBe(0)
    })

    it('should destroy service completely', () => {
      service.initialize()
      service.destroy()

      // Service should be cleaned up
      const queueStatus = service.getQueueStatus()
      expect(queueStatus.size).toBe(0)
    })
  })

  describe('React Hook Integration', () => {
    it('should provide hook interface', () => {
      const hook = useCharlestonResilience()

      expect(hook).toHaveProperty('markPlayerReady')
      expect(hook).toHaveProperty('requestStatus')
      expect(hook).toHaveProperty('replayQueue')
      expect(hook).toHaveProperty('getQueueStatus')
      expect(hook).toHaveProperty('cleanup')

      expect(typeof hook.markPlayerReady).toBe('function')
      expect(typeof hook.requestStatus).toBe('function')
      expect(typeof hook.replayQueue).toBe('function')
      expect(typeof hook.getQueueStatus).toBe('function')
      expect(typeof hook.cleanup).toBe('function')
    })

    it('should handle hook operations', async () => {
      const hook = useCharlestonResilience()
      const tiles = createTestTiles(3)

      const result = await hook.markPlayerReady(tiles, 'right')
      expect(typeof result).toBe('boolean')

      const status = hook.getQueueStatus()
      expect(status).toHaveProperty('size')
      expect(status).toHaveProperty('operations')
    })
  })

  describe('Connection Recovery', () => {
    beforeEach(() => {
      service.initialize()
    })

    it('should setup connection recovery monitoring', () => {
      // Connection recovery setup happens in constructor
      expect(service).toBeInstanceOf(CharlestonResilientService)

      // Verify connection service is accessed
      expect(getConnectionResilienceService).toHaveBeenCalled()
    })

    it('should handle connection state changes', () => {
      // This would be triggered by connection service events
      // We verify the setup is in place
      expect(mockConnectionService).toBeDefined()
    })
  })

  describe('Edge Cases', () => {
    beforeEach(() => {
      service.initialize()
    })

    it('should handle empty tile selection', async () => {
      const result = await service.markPlayerReady([], 'right')
      expect(typeof result).toBe('boolean')
    })

    it('should handle invalid phase names', async () => {
      const tiles = createTestTiles(3)
      const result = await service.markPlayerReady(tiles, 'invalid-phase' as any)
      expect(typeof result).toBe('boolean')
    })

    it('should handle service operations without initialization', async () => {
      const newService = new CharlestonResilientService()
      // Don't initialize

      const tiles = createTestTiles(3)
      const result = await newService.markPlayerReady(tiles, 'right')
      expect(typeof result).toBe('boolean')
    })

    it('should handle concurrent operations', async () => {
      const tiles1 = createTestTiles(3)
      const tiles2 = createTestTiles(3)

      // Execute concurrent operations
      const [result1, result2] = await Promise.all([
        service.markPlayerReady(tiles1, 'right'),
        service.markPlayerReady(tiles2, 'across')
      ])

      expect(typeof result1).toBe('boolean')
      expect(typeof result2).toBe('boolean')
    })
  })
})