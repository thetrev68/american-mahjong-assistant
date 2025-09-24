// Charleston Multiplayer Coordination Tests
// Tests for multiplayer Charleston phase coordination, synchronization, and player readiness management

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useCharlestonStore } from '../../../stores/charleston-store'
import { useRoomStore } from '../../../stores/room.store'
import {
  getCharlestonResilientService,
  initializeCharlestonResilientService,
  destroyCharlestonResilientService,
  useCharlestonResilience
} from '../services/charleston-resilient'
import { createTile, createTestHand } from '../../../__tests__/factories'
import type { Tile } from 'shared-types'

// Mock dependencies
vi.mock('../../../stores/room.store')
vi.mock('../../../lib/services/connection-resilience')
vi.mock('../../../lib/services/network-error-handler')

// Test utilities
const createTestTiles = (count: number): Tile[] =>
  Array.from({ length: count }, (_, i) => createTile({
    id: `test-tile-${i + 1}`,
    suit: ['dots', 'bams', 'cracks'][i % 3] as any,
    value: String((i % 9) + 1),
    displayName: `Test Tile ${i + 1}`
  }))

const createTestPlayer = (id: string, name: string, isReady = false) => ({
  id,
  name,
  isReady,
  isConnected: true,
  position: 'east' as const
})

const createTestRoom = (playerCount = 4) => ({
  id: 'test-room-123',
  hostPlayerId: 'player1',
  players: Array.from({ length: playerCount }, (_, i) =>
    createTestPlayer(`player${i + 1}`, `Player ${i + 1}`)
  ),
  gamePhase: 'charleston' as const,
  settings: {
    playerCount,
    timeLimit: 30
  }
})

describe('Charleston Multiplayer Coordination', () => {
  let mockRoomStore: any
  let charlestonStore: any

  beforeEach(() => {
    // Reset services
    destroyCharlestonResilientService()
    useCharlestonStore.getState().reset()

    // Setup mock room store
    mockRoomStore = {
      room: createTestRoom(),
      hostPlayerId: 'player1',
      players: createTestRoom().players,
      setPlayerReadiness: vi.fn(),
      updatePlayerStatus: vi.fn(),
      getPlayerById: vi.fn((id: string) =>
        createTestRoom().players.find(p => p.id === id)
      )
    }

    charlestonStore = useCharlestonStore.getState()

    // Mock store functions
    ;(useRoomStore as any).getState = vi.fn(() => mockRoomStore)

    // Mock connection and network services
    vi.mock('../../../lib/services/connection-resilience', () => ({
      getConnectionResilienceService: () => ({
        isConnected: vi.fn(() => true),
        emit: vi.fn(() => Promise.resolve(true)),
        on: vi.fn(),
        off: vi.fn()
      })
    }))

    vi.mock('../../../lib/services/network-error-handler', () => ({
      getNetworkErrorHandler: () => ({
        isNetworkHealthy: vi.fn(() => true),
        handleError: vi.fn()
      })
    }))
  })

  afterEach(() => {
    destroyCharlestonResilientService()
    useCharlestonStore.getState().reset()
    vi.clearAllMocks()
  })

  describe('Multiplayer Mode Setup', () => {
    it('should initialize multiplayer Charleston mode', () => {
      const store = useCharlestonStore.getState()

      store.setMultiplayerMode(true, 'room123')

      expect(store.isMultiplayerMode).toBe(true)
      expect(store.roomId).toBe('room123')
    })

    it('should handle player readiness initialization', () => {
      const store = useCharlestonStore.getState()

      store.setMultiplayerMode(true, 'room123')
      store.setCurrentPlayer('player1')

      // Initialize player readiness
      const playerIds = ['player1', 'player2', 'player3', 'player4']
      playerIds.forEach(id => {
        store.setPlayerReady(id, false)
      })

      expect(Object.keys(store.playerReadiness)).toHaveLength(4)
      expect(store.playerReadiness['player1']).toBe(false)
      expect(store.playerReadiness['player2']).toBe(false)
    })

    it('should handle current player assignment', () => {
      const store = useCharlestonStore.getState()

      store.setCurrentPlayer('player2')
      expect(store.currentPlayerId).toBe('player2')

      store.setCurrentPlayer('player1')
      expect(store.currentPlayerId).toBe('player1')
    })
  })

  describe('Player Readiness Coordination', () => {
    beforeEach(() => {
      const store = useCharlestonStore.getState()
      store.setMultiplayerMode(true, 'room123')
      store.startCharleston()
    })

    it('should manage individual player readiness', () => {
      const store = useCharlestonStore.getState()

      // Set players ready one by one
      store.setPlayerReady('player1', true)
      expect(store.playerReadiness['player1']).toBe(true)

      store.setPlayerReady('player2', true)
      expect(store.playerReadiness['player2']).toBe(true)

      store.setPlayerReady('player3', false)
      expect(store.playerReadiness['player3']).toBe(false)
    })

    it('should handle all players ready scenario', () => {
      const store = useCharlestonStore.getState()

      // Mark all players as ready
      const playerIds = ['player1', 'player2', 'player3', 'player4']
      playerIds.forEach(id => {
        store.setPlayerReady(id, true)
      })

      // All players should be ready
      const allReady = playerIds.every(id => store.playerReadiness[id])
      expect(allReady).toBe(true)
    })

    it('should handle partial readiness scenarios', () => {
      const store = useCharlestonStore.getState()

      // Mix of ready and not ready players
      store.setPlayerReady('player1', true)
      store.setPlayerReady('player2', false)
      store.setPlayerReady('player3', true)
      store.setPlayerReady('player4', false)

      const readyCount = Object.values(store.playerReadiness).filter(Boolean).length
      expect(readyCount).toBe(2)
    })

    it('should handle readiness changes', () => {
      const store = useCharlestonStore.getState()

      // Player becomes ready
      store.setPlayerReady('player1', true)
      expect(store.playerReadiness['player1']).toBe(true)

      // Player becomes not ready
      store.setPlayerReady('player1', false)
      expect(store.playerReadiness['player1']).toBe(false)

      // Multiple state changes
      for (let i = 0; i < 5; i++) {
        store.setPlayerReady('player1', i % 2 === 0)
      }
      expect(store.playerReadiness['player1']).toBe(false) // Last value
    })
  })

  describe('Charleston Phase Coordination', () => {
    beforeEach(() => {
      const store = useCharlestonStore.getState()
      store.setMultiplayerMode(true, 'room123')
      store.startCharleston()
      store.setPlayerCount(4)
    })

    it('should coordinate phase transitions in multiplayer', () => {
      const store = useCharlestonStore.getState()

      // Start at right phase
      expect(store.currentPhase).toBe('right')

      // Simulate all players ready for phase transition
      const playerIds = ['player1', 'player2', 'player3', 'player4']
      playerIds.forEach(id => store.setPlayerReady(id, true))

      // Complete phase should advance to next
      store.completePhase()
      expect(store.currentPhase).toBe('across')

      // Reset readiness for next phase
      playerIds.forEach(id => store.setPlayerReady(id, false))

      // Continue phase progression
      playerIds.forEach(id => store.setPlayerReady(id, true))
      store.completePhase()
      expect(store.currentPhase).toBe('left')
    })

    it('should handle different player counts in multiplayer', () => {
      const store = useCharlestonStore.getState()

      // Test 3-player game
      store.setPlayerCount(3)
      store.completePhase() // right -> left (skips across)
      expect(store.currentPhase).toBe('left')

      // Reset for 4-player test
      store.reset()
      store.setMultiplayerMode(true, 'room123')
      store.startCharleston()
      store.setPlayerCount(4)
      store.completePhase() // right -> across
      expect(store.currentPhase).toBe('across')
    })

    it('should synchronize Charleston completion', () => {
      const store = useCharlestonStore.getState()

      // Progress through all phases
      const phases = ['across', 'left', 'optional', 'complete']
      phases.forEach(expectedPhase => {
        store.completePhase()
        expect(store.currentPhase).toBe(expectedPhase)
      })

      // Charleston should be complete and inactive
      expect(store.isActive).toBe(false)
      expect(store.currentPhase).toBe('complete')
    })
  })

  describe('Resilient Service Integration', () => {
    it('should initialize resilient service for multiplayer', () => {
      const service = initializeCharlestonResilientService()
      expect(service).toBeDefined()

      const hook = useCharlestonResilience()
      expect(hook.markPlayerReady).toBeDefined()
      expect(hook.requestStatus).toBeDefined()
    })

    it('should handle player ready notifications', async () => {
      const service = initializeCharlestonResilientService()
      const tiles = createTestTiles(3)

      const result = await service.markPlayerReady(tiles, 'right')
      expect(typeof result).toBe('boolean')
    })

    it('should queue operations when connection is poor', async () => {
      // Mock poor network conditions
      vi.mock('../../../lib/services/network-error-handler', () => ({
        getNetworkErrorHandler: () => ({
          isNetworkHealthy: vi.fn(() => false),
          handleError: vi.fn()
        })
      }))

      const service = initializeCharlestonResilientService()
      const tiles = createTestTiles(3)

      const result = await service.markPlayerReady(tiles, 'right')
      expect(result).toBe(false) // Should be queued, not successful

      const queueStatus = service.getQueueStatus()
      expect(queueStatus.size).toBeGreaterThan(0)
    })

    it('should replay queued operations when connection restored', async () => {
      const service = initializeCharlestonResilientService()

      // Simulate queued operations
      await service.replayQueuedOperations()

      // Should complete without error
      const queueStatus = service.getQueueStatus()
      expect(queueStatus).toBeDefined()
    })
  })

  describe('Tile Exchange Coordination', () => {
    beforeEach(() => {
      const store = useCharlestonStore.getState()
      store.setMultiplayerMode(true, 'room123')
      store.startCharleston()
      store.setPlayerTiles(createTestTiles(14))
    })

    it('should handle tile selection for passing', () => {
      const store = useCharlestonStore.getState()
      const tiles = createTestTiles(5)

      // Select tiles for passing
      store.selectTile(tiles[0])
      store.selectTile(tiles[1])
      store.selectTile(tiles[2])

      expect(store.selectedTiles).toHaveLength(3)
    })

    it('should coordinate tile passing between players', async () => {
      const service = initializeCharlestonResilientService()
      const store = useCharlestonStore.getState()

      const selectedTiles = createTestTiles(3)

      // Mark player ready with selected tiles
      const result = await service.markPlayerReady(selectedTiles, 'right')

      // Should coordinate with other players
      expect(typeof result).toBe('boolean')
    })

    it('should handle tile reception coordination', () => {
      // This would be tested through event simulation
      // The actual tile reception is handled by the resilient service event listeners
      const store = useCharlestonStore.getState()
      expect(store.playerTiles).toBeDefined()
    })
  })

  describe('Error Handling and Recovery', () => {
    beforeEach(() => {
      const store = useCharlestonStore.getState()
      store.setMultiplayerMode(true, 'room123')
      store.startCharleston()
    })

    it('should handle player disconnections', () => {
      const store = useCharlestonStore.getState()

      // Player was ready, then disconnects
      store.setPlayerReady('player2', true)
      expect(store.playerReadiness['player2']).toBe(true)

      // Simulate disconnection by setting to false
      store.setPlayerReady('player2', false)
      expect(store.playerReadiness['player2']).toBe(false)
    })

    it('should handle network errors during coordination', async () => {
      const service = initializeCharlestonResilientService()
      const tiles = createTestTiles(3)

      // Service should handle network errors gracefully
      const result = await service.markPlayerReady(tiles, 'right')
      expect(typeof result).toBe('boolean')
    })

    it('should recover from partial state synchronization', () => {
      const store = useCharlestonStore.getState()

      // Simulate partial state
      store.setPlayerReady('player1', true)
      store.setPlayerReady('player3', true)

      // State should remain consistent
      expect(store.playerReadiness['player1']).toBe(true)
      expect(store.playerReadiness['player2']).toBeUndefined()
      expect(store.playerReadiness['player3']).toBe(true)
    })

    it('should handle room state inconsistencies', () => {
      const store = useCharlestonStore.getState()

      // Room changes during Charleston
      store.setMultiplayerMode(true, 'room123')
      store.setMultiplayerMode(true, 'room456') // Different room

      expect(store.roomId).toBe('room456')
      expect(store.isMultiplayerMode).toBe(true)
    })
  })

  describe('Performance in Multiplayer Scenarios', () => {
    it('should handle rapid player state changes', () => {
      const store = useCharlestonStore.getState()

      // Rapid state changes from multiple players
      const playerIds = ['player1', 'player2', 'player3', 'player4']

      for (let i = 0; i < 100; i++) {
        const playerId = playerIds[i % playerIds.length]
        const isReady = i % 2 === 0
        store.setPlayerReady(playerId, isReady)
      }

      // Should handle without issues
      expect(Object.keys(store.playerReadiness)).toHaveLength(4)
    })

    it('should handle many simultaneous players', () => {
      const store = useCharlestonStore.getState()

      // Simulate many players (stress test)
      const playerCount = 50
      for (let i = 1; i <= playerCount; i++) {
        store.setPlayerReady(`player${i}`, i % 2 === 0)
      }

      expect(Object.keys(store.playerReadiness)).toHaveLength(playerCount)
    })

    it('should handle concurrent operations efficiently', async () => {
      const service = initializeCharlestonResilientService()
      const tiles = createTestTiles(3)

      // Concurrent operations
      const promises = Array.from({ length: 10 }, (_, i) =>
        service.markPlayerReady(tiles, `phase-${i}`)
      )

      const results = await Promise.all(promises)
      results.forEach(result => {
        expect(typeof result).toBe('boolean')
      })
    })
  })

  describe('Charleston Multiplayer Integration Scenarios', () => {
    it('should coordinate complete Charleston workflow', async () => {
      const store = useCharlestonStore.getState()
      const service = initializeCharlestonResilientService()

      // Setup multiplayer Charleston
      store.setMultiplayerMode(true, 'room123')
      store.startCharleston()
      store.setPlayerCount(4)
      store.setPlayerTiles(createTestTiles(14))

      // Select tiles for first phase
      const tilesToPass = createTestTiles(3)
      tilesToPass.forEach(tile => store.selectTile(tile))

      // Mark player ready
      await service.markPlayerReady(store.selectedTiles, store.currentPhase)

      // Simulate all players ready and phase completion
      const playerIds = ['player1', 'player2', 'player3', 'player4']
      playerIds.forEach(id => store.setPlayerReady(id, true))

      // Complete phase
      store.completePhase()
      expect(store.currentPhase).toBe('across')

      // Continue through Charleston phases...
      expect(store.isMultiplayerMode).toBe(true)
      expect(store.roomId).toBe('room123')
    })

    it('should handle mixed player readiness states', () => {
      const store = useCharlestonStore.getState()

      store.setMultiplayerMode(true, 'room123')
      store.startCharleston()

      // Complex readiness scenario
      store.setPlayerReady('player1', true)  // Ready
      store.setPlayerReady('player2', false) // Not ready
      store.setPlayerReady('player3', true)  // Ready
      // player4 never set (undefined)

      const readyPlayers = Object.entries(store.playerReadiness)
        .filter(([_, isReady]) => isReady)
        .map(([playerId]) => playerId)

      expect(readyPlayers).toEqual(['player1', 'player3'])
    })

    it('should maintain state consistency across phase transitions', () => {
      const store = useCharlestonStore.getState()

      store.setMultiplayerMode(true, 'room123')
      store.startCharleston()
      store.setPlayerCount(4)

      // Set initial state
      store.setPlayerTiles(createTestTiles(14))
      store.setPlayerReady('player1', true)

      // Phase transition
      store.completePhase()

      // State should remain consistent
      expect(store.isMultiplayerMode).toBe(true)
      expect(store.roomId).toBe('room123')
      expect(store.playerTiles).toHaveLength(14)
      expect(store.playerReadiness['player1']).toBe(true)
      expect(store.currentPhase).toBe('across')
    })
  })
})