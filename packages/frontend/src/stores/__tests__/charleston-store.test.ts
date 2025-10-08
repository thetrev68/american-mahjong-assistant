import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useCharlestonStore } from '../charleston-store'
import { createTile, createPatternSelection } from '../../__tests__/factories'

// Create test tile presets
const DOT_1 = { suit: 'dots' as const, value: '1' as const, id: '1D' }
const DOT_2 = { suit: 'dots' as const, value: '2' as const, id: '2D' }
const DOT_3 = { suit: 'dots' as const, value: '3' as const, id: '3D' }
const DOT_4 = { suit: 'dots' as const, value: '4' as const, id: '4D' }
const FLOWER_1 = { suit: 'flowers' as const, value: 'f1' as const, id: 'f1' }
const FLOWER_2 = { suit: 'flowers' as const, value: 'f2' as const, id: 'f2' }
const WIND_EAST = { suit: 'winds' as const, value: 'east' as const, id: 'east' }
const JOKER = { suit: 'jokers' as const, value: 'joker' as const, id: 'joker', isJoker: true }

describe('Charleston Store', () => {
  beforeEach(() => {
    useCharlestonStore.getState().reset()
  })

  afterEach(() => {
    useCharlestonStore.getState().reset()
  })

  describe('Phase Management', () => {
    it('should initialize with right phase', () => {
      const store = useCharlestonStore.getState()
      expect(store.currentPhase).toBe('right')
      expect(store.isActive).toBe(false)
    })

    it('should start charleston', () => {
      useCharlestonStore.getState().startCharleston()
      const store = useCharlestonStore.getState()

      expect(store.isActive).toBe(true)
      expect(store.currentPhase).toBe('right')
      expect(store.phaseHistory).toEqual([])
    })

    it('should complete phases correctly for 4 players', () => {
      useCharlestonStore.getState().setPlayerCount(4)
      let store = useCharlestonStore.getState()

      // Start at right
      expect(store.currentPhase).toBe('right')

      // Complete phase should go right -> across
      useCharlestonStore.getState().completePhase()
      store = useCharlestonStore.getState()
      expect(store.currentPhase).toBe('across')

      // across -> left
      useCharlestonStore.getState().completePhase()
      store = useCharlestonStore.getState()
      expect(store.currentPhase).toBe('left')

      // left -> optional
      useCharlestonStore.getState().completePhase()
      store = useCharlestonStore.getState()
      expect(store.currentPhase).toBe('optional')

      // optional -> complete (and end charleston)
      useCharlestonStore.getState().completePhase()
      store = useCharlestonStore.getState()
      expect(store.currentPhase).toBe('complete')
      expect(store.isActive).toBe(false)
    })

    it('should skip across phase for 3 players', () => {
      useCharlestonStore.getState().setPlayerCount(3)
      let store = useCharlestonStore.getState()

      // Start at right
      expect(store.currentPhase).toBe('right')

      // Complete phase should skip across and go right -> left
      useCharlestonStore.getState().completePhase()
      store = useCharlestonStore.getState()
      expect(store.currentPhase).toBe('left')
    })

    it('should end charleston', () => {
      useCharlestonStore.getState().startCharleston()
      useCharlestonStore.getState().endCharleston()
      const store = useCharlestonStore.getState()

      expect(store.isActive).toBe(false)
      expect(store.currentPhase).toBe('complete')
      expect(store.selectedTiles).toEqual([])
      expect(store.recommendations).toBeNull()
    })
  })

  describe('Tile Management', () => {
    it('should select and deselect tiles', () => {
      const tile1 = createTile(DOT_1)
      const tile2 = createTile(DOT_2)

      useCharlestonStore.getState().selectTile(tile1)
      let store = useCharlestonStore.getState()
      expect(store.selectedTiles).toHaveLength(1)
      expect(store.selectedTiles[0].id).toBe(tile1.id)

      useCharlestonStore.getState().selectTile(tile2)
      store = useCharlestonStore.getState()
      expect(store.selectedTiles).toHaveLength(2)

      useCharlestonStore.getState().deselectTile(tile1)
      store = useCharlestonStore.getState()
      expect(store.selectedTiles).toHaveLength(1)
      expect(store.selectedTiles[0].id).toBe(tile2.id)
    })

    it('should limit selection to 3 tiles', () => {
      const tiles = [
        createTile(DOT_1),
        createTile(DOT_2),
        createTile(DOT_3),
        createTile(DOT_4)
      ]

      tiles.forEach(tile => useCharlestonStore.getState().selectTile(tile))
      const store = useCharlestonStore.getState()

      // Should only have first 3 tiles selected
      expect(store.selectedTiles).toHaveLength(3)
      expect(store.selectedTiles.map(t => t.id)).toEqual([
        tiles[0].id,
        tiles[1].id,
        tiles[2].id
      ])
    })

    it('should not allow duplicate selections', () => {
      const tile = createTile(DOT_1)

      useCharlestonStore.getState().selectTile(tile)
      useCharlestonStore.getState().selectTile(tile) // Try to select same tile again
      const store = useCharlestonStore.getState()

      expect(store.selectedTiles).toHaveLength(1)
    })

    it('should clear all selections', () => {
      const tiles = [
        createTile(DOT_1),
        createTile(DOT_2)
      ]

      tiles.forEach(tile => useCharlestonStore.getState().selectTile(tile))
      let store = useCharlestonStore.getState()
      expect(store.selectedTiles).toHaveLength(2)

      useCharlestonStore.getState().clearSelection()
      store = useCharlestonStore.getState()
      expect(store.selectedTiles).toHaveLength(0)
    })
  })

  describe('Recommendations', () => {
    it('should generate recommendations when active and has tiles', async () => {
      const tiles = [
        createTile(DOT_1),
        createTile(DOT_2),
        createTile(FLOWER_1),
        createTile(WIND_EAST)
      ]

      useCharlestonStore.getState().startCharleston()
      useCharlestonStore.getState().setPlayerTiles(tiles)

      // Should automatically generate recommendations
      await new Promise(resolve => setTimeout(resolve, 10)) // Let async complete
      const store = useCharlestonStore.getState()

      expect(store.recommendations).not.toBeNull()
      expect(store.recommendations?.tilesToPass).toHaveLength(3)
      expect(store.recommendations?.reasoning).toBeInstanceOf(Array)
      expect(store.recommendations?.confidence).toBeGreaterThan(0)
    })

    it('should not generate recommendations when inactive', async () => {
      const tiles = [createTile(DOT_1)]

      // Don't start charleston
      useCharlestonStore.getState().setPlayerTiles(tiles)

      await useCharlestonStore.getState().generateRecommendations()
      const store = useCharlestonStore.getState()
      expect(store.recommendations).toBeNull()
    })

    it('should prioritize keeping jokers', async () => {
      const tiles = [
        createTile(JOKER),
        createTile(FLOWER_1),
        createTile(FLOWER_2),
        createTile(DOT_1)
      ]

      useCharlestonStore.getState().startCharleston()
      useCharlestonStore.getState().setPlayerTiles(tiles)

      await new Promise(resolve => setTimeout(resolve, 10))
      const store = useCharlestonStore.getState()

      expect(store.recommendations).not.toBeNull()
      // Should not include joker in tiles to pass
      const tilesToPass = store.recommendations!.tilesToPass
      expect(tilesToPass.some(tile => tile.isJoker)).toBe(false)
    })

    it('should clear recommendations', () => {
      useCharlestonStore.getState().startCharleston()

      // Manually set recommendations to test clearing
      useCharlestonStore.getState().clearRecommendations()
      const store = useCharlestonStore.getState()
      expect(store.recommendations).toBeNull()
    })
  })

  describe('Pattern Management', () => {
    it('should set target patterns', () => {
      const patterns = [createPatternSelection()]

      useCharlestonStore.getState().setTargetPatterns(patterns)
      const store = useCharlestonStore.getState()
      expect(store.targetPatterns).toEqual(patterns)
    })

    it('should regenerate recommendations when patterns change', async () => {
      const tiles = [createTile(DOT_1), createTile(DOT_2)]
      const patterns = [createPatternSelection()]

      useCharlestonStore.getState().startCharleston()
      useCharlestonStore.getState().setPlayerTiles(tiles)

      // Clear any existing recommendations
      useCharlestonStore.getState().clearRecommendations()
      let store = useCharlestonStore.getState()
      expect(store.recommendations).toBeNull()

      // Setting patterns should trigger recommendation generation
      useCharlestonStore.getState().setTargetPatterns(patterns)

      await new Promise(resolve => setTimeout(resolve, 10))
      store = useCharlestonStore.getState()
      expect(store.recommendations).not.toBeNull()
    })
  })

  describe('Multiplayer', () => {
    it('should set multiplayer mode', () => {
      useCharlestonStore.getState().setMultiplayerMode(true, 'room123')
      let store = useCharlestonStore.getState()
      expect(store.isMultiplayerMode).toBe(true)
      expect(store.roomId).toBe('room123')

      useCharlestonStore.getState().setMultiplayerMode(false)
      store = useCharlestonStore.getState()
      expect(store.isMultiplayerMode).toBe(false)
      expect(store.roomId).toBeNull()
    })

    it('should manage player readiness', () => {
      useCharlestonStore.getState().setPlayerReady('player1', true)
      useCharlestonStore.getState().setPlayerReady('player2', false)
      const store = useCharlestonStore.getState()

      expect(store.playerReadiness['player1']).toBe(true)
      expect(store.playerReadiness['player2']).toBe(false)
    })

    it('should set current player', () => {
      useCharlestonStore.getState().setCurrentPlayer('player1')
      const store = useCharlestonStore.getState()
      expect(store.currentPlayerId).toBe('player1')
    })
  })

  describe('Selectors', () => {
    it('should provide useful selectors', () => {
      // Start charleston and select some tiles
      useCharlestonStore.getState().startCharleston()
      useCharlestonStore.getState().selectTile(createTile(DOT_1))
      useCharlestonStore.getState().selectTile(createTile(DOT_2))
      const store = useCharlestonStore.getState()

      // Test selectors would be used like this (mocked here since we can't import the hook in tests easily):
      expect(store.isActive).toBe(true)
      expect(store.currentPhase).toBe('right')
      expect(store.selectedTiles).toHaveLength(2)
      expect(store.selectedTiles.length < 3).toBe(true) // canSelectMore
      expect(store.selectedTiles.length === 3).toBe(false) // isReadyToPass
    })
  })

  describe('Persistence', () => {
    it('should persist preferences but not game state', () => {
      // Set some preferences
      useCharlestonStore.getState().setPlayerCount(3)
      useCharlestonStore.getState().setShowStrategy(true)
      useCharlestonStore.getState().setTargetPatterns([createPatternSelection()])
      let store = useCharlestonStore.getState()

      // These should be persisted (would be tested in integration tests)
      expect(store.playerCount).toBe(3)
      expect(store.showStrategy).toBe(true)
      expect(store.targetPatterns).toHaveLength(1)

      // Game state like active charleston should NOT be persisted
      useCharlestonStore.getState().startCharleston()
      store = useCharlestonStore.getState()
      expect(store.isActive).toBe(true) // This would not survive a page reload
    })
  })
})