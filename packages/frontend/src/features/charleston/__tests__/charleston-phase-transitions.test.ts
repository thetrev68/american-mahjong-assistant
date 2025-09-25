// Charleston Phase Transition and Completion Tests
// Comprehensive tests for Charleston phase management, transitions, and completion logic

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useCharlestonStore, type CharlestonPhase } from '../../../stores/charleston-store'
import { useGameStore } from '../../../stores/game-store'
import { useTileStore } from '../../../stores/tile-store'
import { createTile, createTestHand } from '../../../__tests__/factories'
import type { Tile } from 'shared-types'

// Mock dependencies
vi.mock('../../../stores/game-store')
vi.mock('../../../stores/tile-store')

// Test utilities
const createCharlestonHand = (count = 14): Tile[] =>
  Array.from({ length: count }, (_, i) => createTile({
    id: `charleston-tile-${i + 1}`,
    suit: ['dots', 'bams', 'cracks', 'winds', 'dragons', 'flowers'][i % 6] as any,
    value: String((i % 9) + 1),
    displayName: `Charleston Tile ${i + 1}`
  }))

const createPhaseHistory = (phases: CharlestonPhase[]): Array<{
  phase: CharlestonPhase
  tilesPassed: Tile[]
  tilesReceived: Tile[]
  timestamp: number
}> => phases.map((phase, index) => ({
  phase,
  tilesPassed: createCharlestonHand(3),
  tilesReceived: createCharlestonHand(3),
  timestamp: Date.now() + (index * 1000)
}))

describe('Charleston Phase Transitions', () => {
  let mockGameStore: any
  let mockTileStore: any

  beforeEach(() => {
    useCharlestonStore.getState().reset()

    // Setup mock game store
    mockGameStore = {
      gamePhase: 'charleston',
      currentTurn: 1,
      setGamePhase: vi.fn(),
      incrementTurn: vi.fn(),
      addAlert: vi.fn()
    }

    // Setup mock tile store
    mockTileStore = {
      playerTiles: createCharlestonHand(),
      selectedForAction: [],
      addToHand: vi.fn(),
      removeFromHand: vi.fn(),
      clearSelection: vi.fn()
    }

    ;(useGameStore as any).mockReturnValue(mockGameStore)
    ;(useTileStore as any).mockReturnValue(mockTileStore)
  })

  afterEach(() => {
    useCharlestonStore.getState().reset()
    vi.clearAllMocks()
  })

  describe('Phase Initialization and Setup', () => {
    it('should initialize with correct default phase', () => {
      const store = useCharlestonStore.getState()

      expect(store.currentPhase).toBe('right')
      expect(store.isActive).toBe(false)
      expect(store.phaseHistory).toHaveLength(0)
    })

    it('should start Charleston with proper initialization', () => {
      const store = useCharlestonStore.getState()

      store.startCharleston()

      expect(store.isActive).toBe(true)
      expect(store.currentPhase).toBe('right')
      expect(store.phaseHistory).toHaveLength(0)
      expect(store.selectedTiles).toHaveLength(0)
      expect(store.recommendations).toBeNull()
    })

    it('should handle repeated start calls', () => {
      const store = useCharlestonStore.getState()

      store.startCharleston()
      const firstState = {
        isActive: store.isActive,
        currentPhase: store.currentPhase,
        phaseHistory: [...store.phaseHistory]
      }

      store.startCharleston() // Second call

      // Should reset to initial state
      expect(store.isActive).toBe(true)
      expect(store.currentPhase).toBe('right')
      expect(store.phaseHistory).toHaveLength(0)
    })
  })

  describe('Standard 4-Player Phase Transitions', () => {
    beforeEach(() => {
      const store = useCharlestonStore.getState()
      store.setPlayerCount(4)
      store.startCharleston()
    })

    it('should follow correct 4-player phase sequence', () => {
      const store = useCharlestonStore.getState()

      // Start: right
      expect(store.currentPhase).toBe('right')

      // right -> across
      store.completePhase()
      expect(store.currentPhase).toBe('across')

      // across -> left
      store.completePhase()
      expect(store.currentPhase).toBe('left')

      // left -> optional
      store.completePhase()
      expect(store.currentPhase).toBe('optional')

      // optional -> complete
      store.completePhase()
      expect(store.currentPhase).toBe('complete')
      expect(store.isActive).toBe(false)
    })

    it('should handle each phase transition correctly', () => {
      const store = useCharlestonStore.getState()

      const expectedSequence: CharlestonPhase[] = ['right', 'across', 'left', 'optional', 'complete']

      expectedSequence.forEach((expectedPhase, index) => {
        if (index === 0) {
          // Starting phase
          expect(store.currentPhase).toBe(expectedPhase)
        } else {
          // Transition to next phase
          store.completePhase()
          expect(store.currentPhase).toBe(expectedPhase)

          if (expectedPhase === 'complete') {
            expect(store.isActive).toBe(false)
          } else {
            expect(store.isActive).toBe(true)
          }
        }
      })
    })

    it('should maintain phase consistency during transitions', () => {
      const store = useCharlestonStore.getState()

      for (let i = 0; i < 4; i++) {
        const phaseBefore = store.currentPhase
        const isActiveBefore = store.isActive

        store.completePhase()

        const phaseAfter = store.currentPhase
        const isActiveAfter = store.isActive

        // Phase should change (except when complete)
        if (phaseBefore !== 'complete') {
          expect(phaseAfter).not.toBe(phaseBefore)
        }

        // Active state should only change when reaching complete
        if (phaseAfter === 'complete') {
          expect(isActiveAfter).toBe(false)
        }
      }
    })
  })

  describe('3-Player Phase Transitions', () => {
    beforeEach(() => {
      const store = useCharlestonStore.getState()
      store.setPlayerCount(3)
      store.startCharleston()
    })

    it('should skip across phase in 3-player games', () => {
      const store = useCharlestonStore.getState()

      // Start: right
      expect(store.currentPhase).toBe('right')

      // right -> left (skipping across)
      store.completePhase()
      expect(store.currentPhase).toBe('left')

      // left -> optional
      store.completePhase()
      expect(store.currentPhase).toBe('optional')

      // optional -> complete
      store.completePhase()
      expect(store.currentPhase).toBe('complete')
      expect(store.isActive).toBe(false)
    })

    it('should complete 3-player Charleston in correct number of phases', () => {
      const store = useCharlestonStore.getState()

      let phaseCount = 0
      const maxPhases = 10 // Safety limit

      while (store.isActive && phaseCount < maxPhases) {
        store.completePhase()
        phaseCount++
      }

      expect(phaseCount).toBe(3) // right -> left -> optional -> complete
      expect(store.currentPhase).toBe('complete')
      expect(store.isActive).toBe(false)
    })
  })

  describe('Edge Case Player Counts', () => {
    it('should handle 2-player Charleston transitions', () => {
      const store = useCharlestonStore.getState()

      store.setPlayerCount(2)
      store.startCharleston()

      // Should still follow normal sequence
      store.completePhase() // right -> across
      expect(store.currentPhase).toBe('across')

      store.completePhase() // across -> left
      expect(store.currentPhase).toBe('left')
    })

    it('should handle unusual player counts gracefully', () => {
      const store = useCharlestonStore.getState()

      const unusualCounts = [1, 5, 6, 8]

      unusualCounts.forEach(count => {
        store.reset()
        store.setPlayerCount(count)
        store.startCharleston()

        // Should still follow logical progression
        store.completePhase()
        if (count === 3) {
          expect(store.currentPhase).toBe('left') // Skip across
        } else {
          expect(store.currentPhase).toBe('across') // Normal progression
        }
      })
    })

    it('should handle zero or negative player counts', () => {
      const store = useCharlestonStore.getState()

      store.setPlayerCount(0)
      store.startCharleston()

      // Should still allow phase transitions (edge case behavior)
      store.completePhase()
      expect(store.currentPhase).toBe('across') // Default behavior
    })
  })

  describe('Charleston Completion', () => {
    beforeEach(() => {
      const store = useCharlestonStore.getState()
      store.setPlayerCount(4)
      store.startCharleston()
    })

    it('should complete Charleston properly', () => {
      const store = useCharlestonStore.getState()

      // Progress to completion
      store.completePhase() // right -> across
      store.completePhase() // across -> left
      store.completePhase() // left -> optional
      store.completePhase() // optional -> complete

      expect(store.currentPhase).toBe('complete')
      expect(store.isActive).toBe(false)
    })

    it('should handle direct Charleston ending', () => {
      const store = useCharlestonStore.getState()

      // Set up some state
      store.setPlayerTiles(createCharlestonHand())
      store.selectTile(createTile())

      // End Charleston directly
      store.endCharleston()

      expect(store.isActive).toBe(false)
      expect(store.currentPhase).toBe('complete')
      expect(store.selectedTiles).toHaveLength(0)
      expect(store.recommendations).toBeNull()
    })

    it('should clear state appropriately on completion', () => {
      const store = useCharlestonStore.getState()

      // Set up state
      store.setPlayerTiles(createCharlestonHand())
      store.selectTile(createTile({ id: 'test-tile' }))

      // Complete Charleston through normal progression
      let phaseCount = 0
      const maxPhases = 10 // Safety limit
      while (store.isActive && phaseCount < maxPhases) {
        store.completePhase()
        phaseCount++
      }

      expect(store.currentPhase).toBe('complete')
      expect(store.isActive).toBe(false)
      expect(store.selectedTiles).toHaveLength(0) // Should be cleared in endCharleston
      expect(store.recommendations).toBeNull()
    })

    it('should handle completion at different phases', () => {
      const store = useCharlestonStore.getState()

      // Test ending at each phase
      const phases: CharlestonPhase[] = ['right', 'across', 'left', 'optional']

      phases.forEach(phase => {
        store.reset()
        store.startCharleston()
        store.setPhase(phase)

        store.endCharleston()

        expect(store.currentPhase).toBe('complete')
        expect(store.isActive).toBe(false)
      })
    })
  })

  describe('Phase History Tracking', () => {
    beforeEach(() => {
      const store = useCharlestonStore.getState()
      store.setPlayerCount(4)
      store.startCharleston()
    })

    it('should maintain empty history initially', () => {
      const store = useCharlestonStore.getState()
      expect(store.phaseHistory).toHaveLength(0)
    })

    it('should reset history on Charleston start', () => {
      const store = useCharlestonStore.getState()

      // Manually add some history
      const mockHistory = createPhaseHistory(['right', 'across'])
      // Note: The store doesn't expose a direct way to set history,
      // but it should start empty

      store.startCharleston()
      expect(store.phaseHistory).toHaveLength(0)
    })

    it('should handle history across multiple Charleston sessions', () => {
      const store = useCharlestonStore.getState()

      // First Charleston session
      store.startCharleston()
      store.endCharleston()

      // Second Charleston session
      store.startCharleston()
      expect(store.phaseHistory).toHaveLength(0) // Should reset
    })
  })

  describe('Manual Phase Setting', () => {
    it('should allow manual phase setting', () => {
      const store = useCharlestonStore.getState()

      store.setPhase('across')
      expect(store.currentPhase).toBe('across')

      store.setPhase('left')
      expect(store.currentPhase).toBe('left')

      store.setPhase('complete')
      expect(store.currentPhase).toBe('complete')
    })

    it('should handle manual setting to all valid phases', () => {
      const store = useCharlestonStore.getState()

      const allPhases: CharlestonPhase[] = ['right', 'across', 'left', 'optional', 'complete']

      allPhases.forEach(phase => {
        store.setPhase(phase)
        expect(store.currentPhase).toBe(phase)
      })
    })

    it('should allow manual phase setting during active Charleston', () => {
      const store = useCharlestonStore.getState()

      store.startCharleston()
      expect(store.currentPhase).toBe('right')

      store.setPhase('left')
      expect(store.currentPhase).toBe('left')
      expect(store.isActive).toBe(true) // Should remain active
    })

    it('should handle setting to complete phase manually', () => {
      const store = useCharlestonStore.getState()

      store.startCharleston()
      store.setPhase('complete')

      expect(store.currentPhase).toBe('complete')
      expect(store.isActive).toBe(true) // Manual setting doesn't change active state
    })
  })

  describe('Phase Transition Error Cases', () => {
    it('should handle transitions when not active', () => {
      const store = useCharlestonStore.getState()

      // Don't start Charleston
      expect(store.isActive).toBe(false)

      store.completePhase()
      // Should handle gracefully - phase still advances but Charleston isn't active
      expect(store.currentPhase).toBe('across')
    })

    it('should handle multiple rapid transitions', () => {
      const store = useCharlestonStore.getState()

      store.startCharleston()

      // Rapid phase completions
      for (let i = 0; i < 10; i++) {
        store.completePhase()
      }

      // Should end up at complete and inactive
      expect(store.currentPhase).toBe('complete')
      expect(store.isActive).toBe(false)
    })

    it('should handle transitions after manual completion', () => {
      const store = useCharlestonStore.getState()

      store.startCharleston()
      store.endCharleston()

      expect(store.currentPhase).toBe('complete')
      expect(store.isActive).toBe(false)

      // Try to transition after ending
      store.completePhase()
      expect(store.currentPhase).toBe('complete') // Should stay complete
    })
  })

  describe('Integration with Game State', () => {
    it('should maintain consistency with game phase', () => {
      const store = useCharlestonStore.getState()

      store.startCharleston()
      expect(store.isActive).toBe(true)
      expect(store.currentPhase).toBe('right')

      // Game integration would be handled by GameModeView
      expect(mockGameStore.gamePhase).toBe('charleston')
    })

    it('should coordinate with tile management', () => {
      const store = useCharlestonStore.getState()

      store.startCharleston()
      store.setPlayerTiles(createCharlestonHand())

      expect(store.playerTiles).toHaveLength(14)
      expect(store.isActive).toBe(true)
    })

    it('should handle state synchronization during transitions', () => {
      const store = useCharlestonStore.getState()

      store.startCharleston()
      store.setPlayerTiles(createCharlestonHand())
      store.selectTile(createTile())

      // Complete phase
      store.completePhase()

      // Tile state should be preserved during phase transition
      expect(store.playerTiles).toHaveLength(14)
      expect(store.selectedTiles).toHaveLength(1)
      expect(store.currentPhase).toBe('across')
    })
  })

  describe('Reset and Recovery', () => {
    it('should reset all phase-related state', () => {
      const store = useCharlestonStore.getState()

      // Set up complex state
      store.startCharleston()
      store.setPlayerTiles(createCharlestonHand())
      store.selectTile(createTile())
      store.completePhase()
      store.setMultiplayerMode(true, 'room123')

      // Reset
      store.reset()

      expect(store.currentPhase).toBe('right')
      expect(store.isActive).toBe(false)
      expect(store.playerTiles).toHaveLength(0)
      expect(store.selectedTiles).toHaveLength(0)
      expect(store.phaseHistory).toHaveLength(0)
      expect(store.isMultiplayerMode).toBe(false)
      expect(store.roomId).toBeNull()
    })

    it('should handle reset at any phase', () => {
      const store = useCharlestonStore.getState()

      const phases: CharlestonPhase[] = ['right', 'across', 'left', 'optional', 'complete']

      phases.forEach(phase => {
        store.startCharleston()
        store.setPhase(phase)
        store.reset()

        expect(store.currentPhase).toBe('right')
        expect(store.isActive).toBe(false)
      })
    })

    it('should recover from invalid states', () => {
      const store = useCharlestonStore.getState()

      // Create potentially invalid state
      store.startCharleston()
      store.setPhase('complete')
      // Charleston is complete but still marked as active

      // Reset should fix any inconsistency
      store.reset()

      expect(store.currentPhase).toBe('right')
      expect(store.isActive).toBe(false)
    })
  })
})