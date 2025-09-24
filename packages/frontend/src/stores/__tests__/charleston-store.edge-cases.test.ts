// Charleston Store Edge Cases and Error Handling Tests
// Comprehensive tests for Charleston store edge cases, error scenarios, and boundary conditions

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useCharlestonStore, type CharlestonPhase } from '../charleston-store'
import { createTile, createPatternSelection, TilePresets } from '../../__tests__/factories'
import type { Tile } from 'shared-types'

// Test data
const createLargeHand = (count: number): Tile[] =>
  Array.from({ length: count }, (_, i) => createTile({
    id: `tile-${i}`,
    suit: ['dots', 'bams', 'cracks', 'winds', 'dragons', 'flowers'][i % 6] as any,
    value: String((i % 9) + 1),
    displayName: `Test Tile ${i}`
  }))

const createJokerTiles = (count: number): Tile[] =>
  Array.from({ length: count }, (_, i) => createTile({
    id: `joker-${i}`,
    suit: 'jokers',
    value: 'joker',
    isJoker: true,
    displayName: `Joker ${i}`
  }))

const createFlowerTiles = (count: number): Tile[] =>
  Array.from({ length: count }, (_, i) => createTile({
    id: `flower-${i}`,
    suit: 'flowers',
    value: `f${i + 1}`,
    displayName: `Flower ${i + 1}`
  }))

describe('Charleston Store Edge Cases', () => {
  beforeEach(() => {
    useCharlestonStore.getState().reset()
  })

  afterEach(() => {
    useCharlestonStore.getState().reset()
  })

  describe('Phase Management Edge Cases', () => {
    it('should handle rapid phase transitions', () => {
      const store = useCharlestonStore.getState()

      store.startCharleston()
      expect(store.currentPhase).toBe('right')

      // Get fresh state after each phase completion
      store.completePhase() // right -> across
      let currentState = useCharlestonStore.getState()
      expect(currentState.currentPhase).toBe('across')

      store.completePhase() // across -> left
      currentState = useCharlestonStore.getState()
      expect(currentState.currentPhase).toBe('left')

      store.completePhase() // left -> optional
      currentState = useCharlestonStore.getState()
      expect(currentState.currentPhase).toBe('optional')

      store.completePhase() // optional -> complete
      const finalStore = useCharlestonStore.getState()
      expect(finalStore.currentPhase).toBe('complete')
      expect(finalStore.isActive).toBe(false)
    })

    it('should handle phase transitions for edge player counts', () => {
      // Test 2-player game (minimum)
      useCharlestonStore.getState().setPlayerCount(2)
      let store = useCharlestonStore.getState()

      store.completePhase() // right -> across (should still work)
      store = useCharlestonStore.getState() // Get fresh state
      expect(store.currentPhase).toBe('across')

      // Test 8-player game (maximum realistic)
      useCharlestonStore.getState().reset()
      useCharlestonStore.getState().setPlayerCount(8)
      store = useCharlestonStore.getState()

      store.completePhase() // right -> across
      store = useCharlestonStore.getState() // Get fresh state
      expect(store.currentPhase).toBe('across')
    })

    it('should handle invalid player counts gracefully', () => {
      let store = useCharlestonStore.getState()

      store.setPlayerCount(0) // Invalid
      store = useCharlestonStore.getState() // Get fresh state
      expect(store.playerCount).toBe(0) // Should accept but may cause issues downstream

      store.setPlayerCount(-1) // Negative
      store = useCharlestonStore.getState() // Get fresh state
      expect(store.playerCount).toBe(-1)

      store.setPlayerCount(100) // Unrealistic
      store = useCharlestonStore.getState() // Get fresh state
      expect(store.playerCount).toBe(100)
    })

    it('should handle manual phase setting to invalid phases', () => {
      let store = useCharlestonStore.getState()

      // These should work as the type system allows them
      store.setPhase('complete')
      store = useCharlestonStore.getState() // Get fresh state
      expect(store.currentPhase).toBe('complete')

      store.setPhase('right')
      store = useCharlestonStore.getState() // Get fresh state
      expect(store.currentPhase).toBe('right')

      // Test with all valid phases
      const phases: CharlestonPhase[] = ['right', 'across', 'left', 'optional', 'complete']
      phases.forEach(phase => {
        store.setPhase(phase)
        store = useCharlestonStore.getState() // Get fresh state
        expect(store.currentPhase).toBe(phase)
      })
    })

    it('should handle Charleston end during active phases', () => {
      const store = useCharlestonStore.getState()

      store.startCharleston()
      store.selectTile(createTile())

      // End Charleston abruptly during active phase
      store.endCharleston()
      const finalStore = useCharlestonStore.getState()

      expect(finalStore.isActive).toBe(false)
      expect(finalStore.currentPhase).toBe('complete')
      expect(finalStore.selectedTiles).toHaveLength(0)
      expect(finalStore.recommendations).toBeNull()
    })

    it('should handle multiple start/end cycles', () => {
      let store = useCharlestonStore.getState()

      // Multiple cycles
      for (let i = 0; i < 3; i++) {
        store.startCharleston()
        store = useCharlestonStore.getState() // Get fresh state
        expect(store.isActive).toBe(true)
        expect(store.currentPhase).toBe('right')

        store.endCharleston()
        store = useCharlestonStore.getState() // Get fresh state
        expect(store.isActive).toBe(false)
        expect(store.currentPhase).toBe('complete')
      }
    })
  })

  describe('Tile Selection Edge Cases', () => {
    it('should handle selecting tiles with duplicate IDs', () => {
      const store = useCharlestonStore.getState()
      const tile1 = createTile({ id: 'duplicate' })
      const tile2 = createTile({ id: 'duplicate' }) // Same ID

      store.selectTile(tile1)
      store.selectTile(tile2) // Should be prevented

      expect(store.selectedTiles).toHaveLength(1)
    })

    it('should handle selecting tiles beyond the 3-tile limit', () => {
      const store = useCharlestonStore.getState()
      const tiles = createLargeHand(10)

      tiles.forEach(tile => store.selectTile(tile))

      // Should only have first 3 tiles selected
      expect(store.selectedTiles).toHaveLength(3)
      expect(store.selectedTiles.map(t => t.id)).toEqual([
        tiles[0].id,
        tiles[1].id,
        tiles[2].id
      ])
    })

    it('should handle deselecting non-existent tiles', () => {
      const store = useCharlestonStore.getState()
      const tile1 = createTile({ id: 'exists' })
      const tile2 = createTile({ id: 'not-selected' })

      store.selectTile(tile1)
      expect(store.selectedTiles).toHaveLength(1)

      // Try to deselect a tile that wasn't selected
      store.deselectTile(tile2)
      expect(store.selectedTiles).toHaveLength(1) // Should remain unchanged
      expect(store.selectedTiles[0].id).toBe(tile1.id)
    })

    it('should handle empty tile selection operations', () => {
      const store = useCharlestonStore.getState()

      store.clearSelection() // Should not error when already empty
      expect(store.selectedTiles).toHaveLength(0)

      // Multiple clears
      store.clearSelection()
      store.clearSelection()
      expect(store.selectedTiles).toHaveLength(0)
    })

    it('should handle setting empty tile arrays', () => {
      const store = useCharlestonStore.getState()

      store.setPlayerTiles([])
      expect(store.playerTiles).toHaveLength(0)

      store.setSelectedTiles([])
      expect(store.selectedTiles).toHaveLength(0)
    })

    it('should handle setting large tile arrays', () => {
      const store = useCharlestonStore.getState()
      const largeTileSet = createLargeHand(100)

      store.setPlayerTiles(largeTileSet)
      expect(store.playerTiles).toHaveLength(100)

      // Should still work with large sets
      expect(store.playerTiles[0].id).toBe('tile-0')
      expect(store.playerTiles[99].id).toBe('tile-99')
    })

    it('should handle tiles with missing or invalid properties', () => {
      const store = useCharlestonStore.getState()

      // Tile with minimal properties
      const minimalTile = {
        id: 'minimal',
        suit: 'dots' as const,
        value: '1' as const,
        displayName: 'Minimal',
        isJoker: false
      }

      store.selectTile(minimalTile)
      expect(store.selectedTiles).toHaveLength(1)
      expect(store.selectedTiles[0].id).toBe('minimal')
    })
  })

  describe('Analysis and Recommendation Edge Cases', () => {
    it('should handle analysis with empty hand', async () => {
      const store = useCharlestonStore.getState()

      store.startCharleston()
      store.setPlayerTiles([]) // Empty hand

      await store.generateRecommendations()

      // Should not generate recommendations for empty hand
      expect(store.recommendations).toBeNull()
      expect(store.isAnalyzing).toBe(false)
    })

    it('should handle analysis with hand of only jokers', async () => {
      const store = useCharlestonStore.getState()
      const jokerHand = createJokerTiles(5)

      store.startCharleston()
      store.setPlayerTiles(jokerHand)

      await store.generateRecommendations()

      // Should handle joker-only hand gracefully
      const recommendations = store.recommendations
      if (recommendations) {
        // Should not recommend passing jokers
        expect(recommendations.tilesToPass.every(tile => !tile.isJoker)).toBe(true)
      }
    })

    it('should handle analysis with hand of only flowers', async () => {
      const store = useCharlestonStore.getState()
      const flowerHand = createFlowerTiles(5)

      store.startCharleston()
      store.setPlayerTiles(flowerHand)

      await store.generateRecommendations()

      const recommendations = store.recommendations
      expect(recommendations).not.toBeNull()
      if (recommendations) {
        expect(recommendations.tilesToPass).toHaveLength(3)
        // All recommendations should be flowers (least useful)
        expect(recommendations.tilesToPass.every(tile => tile.suit === 'flowers')).toBe(true)
      }
    })

    it('should handle analysis with very small hand (less than 3 tiles)', async () => {
      const store = useCharlestonStore.getState()
      const smallHand = createLargeHand(2) // Only 2 tiles

      store.startCharleston()
      store.setPlayerTiles(smallHand)

      await store.generateRecommendations()

      const recommendations = store.recommendations
      expect(recommendations).not.toBeNull()
      if (recommendations) {
        // Should recommend all available non-joker tiles
        expect(recommendations.tilesToPass.length).toBeLessThanOrEqual(2)
      }
    })

    it('should handle analysis when not active', async () => {
      const store = useCharlestonStore.getState()
      const hand = createLargeHand(5)

      // Don't start Charleston
      store.setPlayerTiles(hand)

      await store.generateRecommendations()

      // Should not generate recommendations when not active
      expect(store.recommendations).toBeNull()
      expect(store.isAnalyzing).toBe(false)
    })

    it('should handle concurrent analysis requests', async () => {
      const store = useCharlestonStore.getState()
      const hand = createLargeHand(10)

      store.startCharleston()
      store.setPlayerTiles(hand)

      // Start multiple analysis requests
      const promises = [
        store.generateRecommendations(),
        store.generateRecommendations(),
        store.generateRecommendations()
      ]

      await Promise.all(promises)

      // Should handle gracefully without errors
      expect(store.isAnalyzing).toBe(false)
    })

    it('should handle analysis with malformed pattern data', async () => {
      const store = useCharlestonStore.getState()
      const hand = createLargeHand(5)

      // Pattern with unusual structure
      const malformedPattern = {
        ...createPatternSelection(),
        pattern: '', // Empty pattern string
        displayName: null as any, // Invalid type
      }

      store.startCharleston()
      store.setPlayerTiles(hand)
      store.setTargetPatterns([malformedPattern])

      await store.generateRecommendations()

      // Should handle malformed patterns gracefully
      expect(store.recommendations).not.toBeNull()
    })
  })

  describe('Multiplayer State Edge Cases', () => {
    it('should handle setting multiplayer mode without room ID', () => {
      const store = useCharlestonStore.getState()

      store.setMultiplayerMode(true) // No room ID provided
      expect(store.isMultiplayerMode).toBe(true)
      expect(store.roomId).toBeNull()
    })

    it('should handle player readiness with invalid player IDs', () => {
      const store = useCharlestonStore.getState()

      store.setPlayerReady('', true) // Empty string
      store.setPlayerReady('   ', false) // Whitespace
      store.setPlayerReady('very-long-player-id-that-might-cause-issues-in-storage', true)

      expect(store.playerReadiness['']).toBe(true)
      expect(store.playerReadiness['   ']).toBe(false)
      expect(store.playerReadiness['very-long-player-id-that-might-cause-issues-in-storage']).toBe(true)
    })

    it('should handle rapid readiness changes for same player', () => {
      const store = useCharlestonStore.getState()

      const playerId = 'player1'

      // Rapid state changes
      for (let i = 0; i < 10; i++) {
        store.setPlayerReady(playerId, i % 2 === 0)
      }

      expect(store.playerReadiness[playerId]).toBe(false) // Last value
    })

    it('should handle setting current player to invalid values', () => {
      const store = useCharlestonStore.getState()

      store.setCurrentPlayer('') // Empty string
      expect(store.currentPlayerId).toBe('')

      store.setCurrentPlayer('   ') // Whitespace
      expect(store.currentPlayerId).toBe('   ')

      store.setCurrentPlayer('non-existent-player')
      expect(store.currentPlayerId).toBe('non-existent-player')
    })

    it('should handle many simultaneous players', () => {
      const store = useCharlestonStore.getState()
      const playerCount = 100

      // Set readiness for many players
      for (let i = 0; i < playerCount; i++) {
        store.setPlayerReady(`player${i}`, i % 2 === 0)
      }

      expect(Object.keys(store.playerReadiness)).toHaveLength(playerCount)
      expect(store.playerReadiness['player0']).toBe(true)
      expect(store.playerReadiness['player1']).toBe(false)
      expect(store.playerReadiness['player99']).toBe(false)
    })
  })

  describe('Store Persistence Edge Cases', () => {
    it('should handle reset during active Charleston', () => {
      const store = useCharlestonStore.getState()

      store.startCharleston()
      store.setPlayerTiles(createLargeHand(5))
      store.selectTile(createTile())
      store.setMultiplayerMode(true, 'room123')

      // Reset should clear everything
      store.reset()
      const resetStore = useCharlestonStore.getState()

      expect(resetStore.isActive).toBe(false)
      expect(resetStore.currentPhase).toBe('right')
      expect(resetStore.playerTiles).toHaveLength(0)
      expect(resetStore.selectedTiles).toHaveLength(0)
      expect(resetStore.isMultiplayerMode).toBe(false)
      expect(resetStore.roomId).toBeNull()
      expect(resetStore.recommendations).toBeNull()
    })

    it('should handle multiple resets', () => {
      const store = useCharlestonStore.getState()

      store.startCharleston()
      store.reset()
      store.reset()
      store.reset()

      // Multiple resets should not cause issues
      expect(store.isActive).toBe(false)
      expect(store.currentPhase).toBe('right')
    })
  })

  describe('Selectors Edge Cases', () => {
    it('should handle selectors with edge state values', () => {
      const store = useCharlestonStore.getState()

      // Test selectors with various states
      store.startCharleston()

      // No tiles selected
      expect(store.selectedTiles.length < 3).toBe(true) // canSelectMore
      expect(store.selectedTiles.length === 3).toBe(false) // isReadyToPass

      // Exactly 3 tiles selected
      store.setSelectedTiles(createLargeHand(3))
      expect(store.selectedTiles.length < 3).toBe(false) // canSelectMore
      expect(store.selectedTiles.length === 3).toBe(true) // isReadyToPass

      // More than 3 tiles (should not happen in normal flow)
      store.setSelectedTiles(createLargeHand(5))
      expect(store.selectedTiles.length < 3).toBe(false) // canSelectMore
      expect(store.selectedTiles.length === 3).toBe(false) // isReadyToPass
    })
  })

  describe('Memory and Performance Edge Cases', () => {
    it('should handle large phase history', () => {
      const store = useCharlestonStore.getState()

      // Simulate many phase completions
      store.startCharleston()

      for (let i = 0; i < 1000; i++) {
        // This would normally be managed by the phase completion logic
        // but we're testing the data structure limits
        store.setPhase('right')
        store.setPhase('across')
      }

      expect(store.currentPhase).toBe('across')
    })

    it('should handle frequent recommendation generation', async () => {
      const store = useCharlestonStore.getState()
      const hand = createLargeHand(10)

      store.startCharleston()
      store.setPlayerTiles(hand)

      // Generate many recommendations
      const promises = []
      for (let i = 0; i < 50; i++) {
        promises.push(store.generateRecommendations())
      }

      await Promise.all(promises)

      // Should complete without memory issues
      expect(store.recommendations).not.toBeNull()
      expect(store.isAnalyzing).toBe(false)
    })

    it('should handle rapid state changes', () => {
      const store = useCharlestonStore.getState()

      // Rapid state changes
      for (let i = 0; i < 1000; i++) {
        store.setShowStrategy(i % 2 === 0)
        store.setPlayerCount((i % 8) + 1)
      }

      expect(store.showStrategy).toBe(false) // Last value
      expect(store.playerCount).toBe(1) // Last value: (999 % 8) + 1 = 8
    })
  })

  describe('Error Recovery', () => {
    it('should recover from analysis errors', async () => {
      const store = useCharlestonStore.getState()

      store.startCharleston()
      store.setPlayerTiles(createLargeHand(5))

      // First analysis should work
      await store.generateRecommendations()
      expect(store.analysisError).toBeNull()

      // Clear recommendations and try again
      store.clearRecommendations()
      await store.generateRecommendations()
      expect(store.recommendations).not.toBeNull()
    })

    it('should maintain consistency after errors', () => {
      const store = useCharlestonStore.getState()

      try {
        // Force error scenario
        store.setPlayerTiles(createLargeHand(5))
        store.setSelectedTiles(createLargeHand(10))
      } catch (error) {
        // Should not error, but if it does, state should remain consistent
      }

      // State should still be consistent
      expect(store.selectedTiles).toHaveLength(10)
      expect(store.playerTiles).toHaveLength(5)
    })
  })
})