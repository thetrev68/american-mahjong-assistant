/**
 * Comprehensive Tile Store Tests
 * 
 * Tests all aspects of the tile store including:
 * - Hand management (add/remove tiles)
 * - Validation logic
 * - Selection mechanics
 * - Exposed tiles management
 * - Analysis integration
 * - Bulk operations
 * - State persistence
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useTileStore } from '../tile-store'
import { tileService } from '../../lib/services/tile-service'
import { lazyAnalysisEngine } from '../../lib/services/analysis-engine-lazy'
import {
  createTile,
  createTiles,
  createTestHand,
  cleanupMocks
} from '../../__tests__/factories'

// Mock external dependencies
vi.mock('../../lib/services/tile-service')
vi.mock('../../lib/services/analysis-engine-lazy')
vi.mock('../../features/intelligence-panel/services/real-time-analysis-service')
vi.mock('../../lib/services/nmjl-service')

const mockTileService = vi.mocked(tileService)
const mockAnalysisEngine = vi.mocked(lazyAnalysisEngine)

describe('Tile Store', () => {
  // Reset store and mocks before each test
  beforeEach(() => {
    // Reset the store to initial state
    useTileStore.setState({
      selectedTiles: [],
      playerHand: [],
      handSize: 0,
      dealerHand: false,
      exposedTiles: [],
      inputMode: 'select',
      isValidating: false,
      validation: {
        isValid: false,
        errors: [],
        warnings: [],
        tileCount: 0,
        expectedCount: 13,
        duplicateErrors: []
      },
      showRecommendations: true,
      selectedCount: 0,
      showAnimations: true,
      sortBy: 'suit',
      recommendations: {},
      analysisInProgress: false,
      lastAnalysis: null,
      selectedForAction: [],
      tileStates: {}
    })

    // Setup default mocks
    mockTileService.createPlayerTile = vi.fn((tileId: string) => createTile({ id: tileId }))
    mockTileService.validateHand = vi.fn((hand, expectedCount) => ({
      isValid: hand.length === (expectedCount || 14),
      errors: hand.length !== (expectedCount || 14) ? [`Expected ${expectedCount || 14} tiles, got ${hand.length}`] : [],
      warnings: [],
      tileCount: hand.length,
      expectedCount: expectedCount || 14,
      duplicateErrors: []
    }))
    mockTileService.sortTiles = vi.fn((tiles) => [...tiles].sort((a, b) => a.id.localeCompare(b.id)))
    mockTileService.getTilesGroupedBySuit = vi.fn((tiles) => ({
      dots: [],
      bams: tiles,
      cracks: [],
      winds: [],
      dragons: [],
      flowers: [],
      jokers: []
    }))
    
    mockAnalysisEngine.clearCacheForHandChange = vi.fn()
  })

  afterEach(() => {
    cleanupMocks()
  })

  describe('Initial State', () => {
    it('should initialize with empty hand and correct defaults', () => {
      const state = useTileStore.getState()
      
      expect(state.playerHand).toEqual([])
      expect(state.handSize).toBe(0)
      expect(state.dealerHand).toBe(false)
      expect(state.selectedCount).toBe(0)
      expect(state.inputMode).toBe('select')
      expect(state.sortBy).toBe('suit')
      expect(state.showAnimations).toBe(true)
      expect(state.showRecommendations).toBe(true)
      expect(state.validation.expectedCount).toBe(13)
      expect(state.validation.isValid).toBe(false)
    })
  })

  describe('Hand Management', () => {
    describe('addTile', () => {
      it('should add a tile to the hand', () => {
        const store = useTileStore.getState()
        const testTile = createTile({ id: '1B' })
        mockTileService.createPlayerTile.mockReturnValue(testTile)
        
        store.addTile('1B')
        
        const newState = useTileStore.getState()
        expect(newState.playerHand).toHaveLength(1)
        expect(newState.playerHand[0]).toEqual(testTile)
        expect(newState.handSize).toBe(1)
        expect(mockAnalysisEngine.clearCacheForHandChange).toHaveBeenCalledWith([], ['1B'])
      })

      it('should update validation when adding tiles', () => {
        const store = useTileStore.getState()
        mockTileService.createPlayerTile.mockReturnValue(createTile({ id: '1B' }))
        
        store.addTile('1B')
        
        expect(mockTileService.validateHand).toHaveBeenCalledWith(
          expect.arrayContaining([expect.objectContaining({ id: '1B' })]),
          13
        )
      })

      it('should handle invalid tile IDs gracefully', () => {
        const store = useTileStore.getState()
        mockTileService.createPlayerTile.mockReturnValue(null)
        
        store.addTile('invalid-tile')
        
        const newState = useTileStore.getState()
        expect(newState.playerHand).toHaveLength(0)
        expect(newState.handSize).toBe(0)
      })

      it('should clear analysis timestamp when hand changes', () => {
        const store = useTileStore.getState()
        // Set initial analysis timestamp
        useTileStore.setState({ lastAnalysis: Date.now() })
        mockTileService.createPlayerTile.mockReturnValue(createTile({ id: '1B' }))
        
        store.addTile('1B')
        
        const newState = useTileStore.getState()
        expect(newState.lastAnalysis).toBeNull()
      })
    })

    describe('removeTile', () => {
      beforeEach(() => {
        // Setup initial hand
        const tiles = createTiles(3, { id: '1B' })
        useTileStore.setState({ 
          playerHand: tiles,
          handSize: tiles.length,
          recommendations: {
            [tiles[0].instanceId]: { action: 'keep', confidence: 0.8, reasoning: 'Test', priority: 5 }
          }
        })
      })

      it('should remove a tile by instance ID', () => {
        const initialState = useTileStore.getState()
        const tileToRemove = initialState.playerHand[0]
        
        initialState.removeTile(tileToRemove.instanceId)
        
        const newState = useTileStore.getState()
        expect(newState.playerHand).toHaveLength(2)
        expect(newState.playerHand.find(t => t.instanceId === tileToRemove.instanceId)).toBeUndefined()
        expect(newState.handSize).toBe(2)
      })

      it('should remove recommendations for removed tiles', () => {
        const initialState = useTileStore.getState()
        const tileToRemove = initialState.playerHand[0]
        
        initialState.removeTile(tileToRemove.instanceId)
        
        const newState = useTileStore.getState()
        expect(newState.recommendations[tileToRemove.instanceId]).toBeUndefined()
      })

      it('should clear cache and update validation on removal', () => {
        const initialState = useTileStore.getState()
        const tileToRemove = initialState.playerHand[0]
        
        initialState.removeTile(tileToRemove.instanceId)
        
        expect(mockAnalysisEngine.clearCacheForHandChange).toHaveBeenCalled()
        expect(mockTileService.validateHand).toHaveBeenCalled()
      })
    })

    describe('clearHand', () => {
      beforeEach(() => {
        const tiles = createTestHand()
        useTileStore.setState({ 
          playerHand: tiles,
          handSize: tiles.length,
          selectedTiles: tiles.slice(0, 2),
          selectedCount: 2,
          recommendations: { 'test': { action: 'keep', confidence: 0.8, reasoning: 'Test', priority: 5 } },
          exposedTiles: createTiles(3, { id: '1B' }),
          selectedForAction: tiles.slice(0, 1),
          tileStates: { 'test': 'locked' }
        })
      })

      it('should clear all hand data', () => {
        const store = useTileStore.getState()
        
        store.clearHand()
        
        const newState = useTileStore.getState()
        expect(newState.playerHand).toEqual([])
        expect(newState.handSize).toBe(0)
        expect(newState.selectedTiles).toEqual([])
        expect(newState.selectedCount).toBe(0)
        expect(newState.recommendations).toEqual({})
        expect(newState.exposedTiles).toEqual([])
        expect(newState.selectedForAction).toEqual([])
        expect(newState.tileStates).toEqual({})
        expect(newState.lastAnalysis).toBeNull()
      })

      it('should reset validation state', () => {
        const store = useTileStore.getState()
        
        store.clearHand()
        
        const newState = useTileStore.getState()
        expect(newState.validation).toEqual({
          isValid: false,
          errors: [],
          warnings: [],
          tileCount: 0,
          expectedCount: 13,
          duplicateErrors: []
        })
      })
    })

    describe('setDealerHand', () => {
      it('should update dealer status and expected tile count', () => {
        const store = useTileStore.getState()
        
        store.setDealerHand(true)
        
        const newState = useTileStore.getState()
        expect(newState.dealerHand).toBe(true)
        expect(newState.validation.expectedCount).toBe(14)
        expect(mockTileService.validateHand).toHaveBeenCalledWith([], 14)
      })

      it('should revert to player mode correctly', () => {
        useTileStore.setState({ dealerHand: true })
        const store = useTileStore.getState()
        
        store.setDealerHand(false)
        
        const newState = useTileStore.getState()
        expect(newState.dealerHand).toBe(false)
        expect(newState.validation.expectedCount).toBe(13)
        expect(mockTileService.validateHand).toHaveBeenCalledWith([], 13)
      })
    })
  })

  describe('Exposed Tiles Management', () => {
    describe('addExposedTiles', () => {
      it('should add tiles to exposed tiles collection', () => {
        const store = useTileStore.getState()
        const tilesToExpose = createTiles(3, { id: '1B' })
        
        store.addExposedTiles(tilesToExpose, 'pung')
        
        const newState = useTileStore.getState()
        expect(newState.exposedTiles).toHaveLength(3)
        expect(newState.exposedTiles).toEqual(tilesToExpose)
      })

      it('should accumulate multiple exposed tile sets', () => {
        const store = useTileStore.getState()
        const firstSet = createTiles(3, { id: '1B' })
        const secondSet = createTiles(4, { id: '2C' })
        
        store.addExposedTiles(firstSet, 'pung')
        store.addExposedTiles(secondSet, 'kong')
        
        const newState = useTileStore.getState()
        expect(newState.exposedTiles).toHaveLength(7)
      })
    })

    describe('setExposedTiles', () => {
      it('should replace all exposed tiles', () => {
        useTileStore.setState({ exposedTiles: createTiles(3, { id: '1B' }) })
        const store = useTileStore.getState()
        const newTiles = createTiles(4, { id: '2C' })
        
        store.setExposedTiles(newTiles)
        
        const newState = useTileStore.getState()
        expect(newState.exposedTiles).toEqual(newTiles)
        expect(newState.exposedTiles).toHaveLength(4)
      })
    })

    describe('clearExposedTiles', () => {
      it('should remove all exposed tiles', () => {
        useTileStore.setState({ exposedTiles: createTiles(6, { id: '1B' }) })
        const store = useTileStore.getState()
        
        store.clearExposedTiles()
        
        const newState = useTileStore.getState()
        expect(newState.exposedTiles).toEqual([])
      })
    })
  })

  describe('Tile Selection', () => {
    beforeEach(() => {
      const tiles = createTestHand()
      useTileStore.setState({ 
        playerHand: tiles,
        handSize: tiles.length,
        showAnimations: false // Disable animations for simpler testing
      })
    })

    describe('toggleTileSelection', () => {
      it('should select an unselected tile', () => {
        const state = useTileStore.getState()
        const tileToToggle = state.playerHand[0]
        
        state.toggleTileSelection(tileToToggle.instanceId)
        
        const newState = useTileStore.getState()
        const toggledTile = newState.playerHand.find(t => t.instanceId === tileToToggle.instanceId)
        expect(toggledTile?.isSelected).toBe(true)
        expect(newState.selectedCount).toBe(1)
        expect(newState.selectedTiles).toHaveLength(1)
      })

      it('should deselect a selected tile', () => {
        const state = useTileStore.getState()
        const tileToToggle = state.playerHand[0]
        
        // First select
        state.toggleTileSelection(tileToToggle.instanceId)
        // Then deselect
        state.toggleTileSelection(tileToToggle.instanceId)
        
        const newState = useTileStore.getState()
        const toggledTile = newState.playerHand.find(t => t.instanceId === tileToToggle.instanceId)
        expect(toggledTile?.isSelected).toBe(false)
        expect(newState.selectedCount).toBe(0)
        expect(newState.selectedTiles).toHaveLength(0)
      })
    })

    describe('selectTile', () => {
      it('should select a specific tile', () => {
        const state = useTileStore.getState()
        const tileToSelect = state.playerHand[0]
        
        state.selectTile(tileToSelect.instanceId)
        
        const newState = useTileStore.getState()
        const selectedTile = newState.playerHand.find(t => t.instanceId === tileToSelect.instanceId)
        expect(selectedTile?.isSelected).toBe(true)
      })

      it('should not deselect already selected tiles', () => {
        const state = useTileStore.getState()
        const tileToSelect = state.playerHand[0]
        
        // Select twice
        state.selectTile(tileToSelect.instanceId)
        state.selectTile(tileToSelect.instanceId)
        
        const newState = useTileStore.getState()
        const selectedTile = newState.playerHand.find(t => t.instanceId === tileToSelect.instanceId)
        expect(selectedTile?.isSelected).toBe(true)
      })
    })

    describe('deselectTile', () => {
      it('should deselect a selected tile', () => {
        const state = useTileStore.getState()
        const tileToDeselect = state.playerHand[0]
        
        // First select, then deselect
        state.selectTile(tileToDeselect.instanceId)
        state.deselectTile(tileToDeselect.instanceId)
        
        const newState = useTileStore.getState()
        const deselectedTile = newState.playerHand.find(t => t.instanceId === tileToDeselect.instanceId)
        expect(deselectedTile?.isSelected).toBe(false)
      })
    })

    describe('selectAll', () => {
      it('should select all tiles in hand', () => {
        const state = useTileStore.getState()
        const handSize = state.playerHand.length
        
        state.selectAll()
        
        const newState = useTileStore.getState()
        expect(newState.selectedCount).toBe(handSize)
        expect(newState.selectedTiles).toHaveLength(handSize)
        expect(newState.playerHand.every(tile => tile.isSelected)).toBe(true)
      })
    })

    describe('deselectAll', () => {
      it('should deselect all tiles', () => {
        const state = useTileStore.getState()
        
        // First select all, then deselect all
        state.selectAll()
        state.deselectAll()
        
        const newState = useTileStore.getState()
        expect(newState.selectedCount).toBe(0)
        expect(newState.selectedTiles).toHaveLength(0)
        expect(newState.playerHand.every(tile => !tile.isSelected)).toBe(true)
      })
    })
  })

  describe('UI Controls', () => {
    describe('setInputMode', () => {
      it('should update input mode', () => {
        const store = useTileStore.getState()
        
        store.setInputMode('edit')
        
        const newState = useTileStore.getState()
        expect(newState.inputMode).toBe('edit')
      })
    })

    describe('setSortBy', () => {
      it('should update sort mode and trigger sort', () => {
        const store = useTileStore.getState()
        useTileStore.setState({ playerHand: createTestHand() })
        
        store.setSortBy('recommendation')
        
        const newState = useTileStore.getState()
        expect(newState.sortBy).toBe('recommendation')
        expect(mockTileService.sortTiles).not.toHaveBeenCalled() // Since we're not using suit sort
      })
    })

    describe('setShowAnimations', () => {
      it('should update animation preference', () => {
        const store = useTileStore.getState()
        
        store.setShowAnimations(false)
        
        const newState = useTileStore.getState()
        expect(newState.showAnimations).toBe(false)
      })
    })

    describe('setShowRecommendations', () => {
      it('should update recommendations visibility', () => {
        const store = useTileStore.getState()
        
        store.setShowRecommendations(false)
        
        const newState = useTileStore.getState()
        expect(newState.showRecommendations).toBe(false)
      })
    })
  })

  describe('Validation & Analysis', () => {
    describe('validateHand', () => {
      it('should validate hand and update state', () => {
        const testHand = createTestHand()
        useTileStore.setState({ playerHand: testHand, dealerHand: false })
        const store = useTileStore.getState()
        
        const result = store.validateHand()
        
        expect(mockTileService.validateHand).toHaveBeenCalledWith(testHand, 13)
        expect(result).toBeDefined()
        expect(useTileStore.getState().validation).toEqual(result)
      })
    })

    describe('Recommendations', () => {
      const testRecommendation = {
        action: 'keep' as const,
        confidence: 0.85,
        reasoning: 'Test recommendation',
        priority: 7
      }

      describe('setRecommendation', () => {
        it('should add a recommendation for a tile', () => {
          const store = useTileStore.getState()
          const testInstanceId = 'test-instance-123'
          
          store.setRecommendation(testInstanceId, testRecommendation)
          
          const newState = useTileStore.getState()
          expect(newState.recommendations[testInstanceId]).toEqual(testRecommendation)
        })
      })

      describe('clearRecommendations', () => {
        it('should remove all recommendations', () => {
          useTileStore.setState({ recommendations: { 'test1': testRecommendation, 'test2': testRecommendation } })
          const store = useTileStore.getState()
          
          store.clearRecommendations()
          
          const newState = useTileStore.getState()
          expect(newState.recommendations).toEqual({})
        })
      })
    })
  })

  describe('Bulk Operations', () => {
    describe('importTilesFromString', () => {
      beforeEach(() => {
        // Mock the tile service to create tiles based on IDs
        mockTileService.createPlayerTile.mockImplementation((tileId: string) => {
          if (['1B', '2B', '3B', 'east', 'red'].includes(tileId)) {
            return createTile({ id: tileId })
          }
          return null // Invalid tile
        })
      })

      it('should import valid tiles from string', () => {
        const store = useTileStore.getState()
        
        store.importTilesFromString('1B 2B 3B east red')
        
        const newState = useTileStore.getState()
        expect(newState.playerHand).toHaveLength(5)
        expect(newState.handSize).toBe(5)
      })

      it('should handle invalid tile IDs gracefully', () => {
        const store = useTileStore.getState()
        
        store.importTilesFromString('1B invalid-tile 2B')
        
        const newState = useTileStore.getState()
        expect(newState.playerHand).toHaveLength(2) // Only valid tiles
        expect(newState.handSize).toBe(2)
      })

      it('should clear existing hand and reset state', () => {
        useTileStore.setState({ 
          selectedTiles: [createTile()],
          selectedCount: 1,
          selectedForAction: [createTile()],
          tileStates: { 'test': 'locked' }
        })
        const store = useTileStore.getState()
        
        store.importTilesFromString('1B 2B')
        
        const newState = useTileStore.getState()
        expect(newState.selectedTiles).toEqual([])
        expect(newState.selectedCount).toBe(0)
        expect(newState.selectedForAction).toEqual([])
        expect(newState.tileStates).toEqual({})
      })
    })

    describe('exportTilesToString', () => {
      it('should export hand as tile ID string', () => {
        const testTiles = [
          createTile({ id: '1B' }),
          createTile({ id: '2C' }),
          createTile({ id: 'red' })
        ]
        useTileStore.setState({ playerHand: testTiles })
        const store = useTileStore.getState()
        
        const result = store.exportTilesToString()
        
        expect(result).toBe('1B 2C red')
      })

      it('should return empty string for empty hand', () => {
        const store = useTileStore.getState()
        
        const result = store.exportTilesToString()
        
        expect(result).toBe('')
      })
    })

    describe('sortHand', () => {
      beforeEach(() => {
        const testTiles = [
          createTile({ id: '3B' }),
          createTile({ id: '1B' }), 
          createTile({ id: '2B' })
        ]
        useTileStore.setState({ playerHand: testTiles })
      })

      it('should sort by suit when sortBy is suit', () => {
        useTileStore.setState({ sortBy: 'suit' })
        const store = useTileStore.getState()
        
        store.sortHand()
        
        expect(mockTileService.sortTiles).toHaveBeenCalled()
      })

      it('should sort by recommendation when sortBy is recommendation', () => {
        const tiles = useTileStore.getState().playerHand
        useTileStore.setState({ 
          sortBy: 'recommendation',
          recommendations: {
            [tiles[0].instanceId]: { action: 'keep', confidence: 0.9, reasoning: 'High priority', priority: 10 },
            [tiles[1].instanceId]: { action: 'pass', confidence: 0.5, reasoning: 'Low priority', priority: 3 }
          }
        })
        const store = useTileStore.getState()
        
        store.sortHand()
        
        // Should not call tileService.sortTiles for recommendation sort
        expect(mockTileService.sortTiles).not.toHaveBeenCalled()
      })

      it('should maintain manual order when sortBy is manual', () => {
        const originalHand = [...useTileStore.getState().playerHand]
        useTileStore.setState({ sortBy: 'manual' })
        const store = useTileStore.getState()
        
        store.sortHand()
        
        const newState = useTileStore.getState()
        expect(newState.playerHand).toEqual(originalHand)
      })
    })
  })

  describe('Getters', () => {
    beforeEach(() => {
      const tiles = createTestHand()
      // Select first 3 tiles
      tiles[0].isSelected = true
      tiles[1].isSelected = true  
      tiles[2].isSelected = true
      
      useTileStore.setState({ 
        playerHand: tiles,
        selectedCount: 3,
        validation: { isValid: true, errors: [], warnings: [], tileCount: tiles.length, expectedCount: 13, duplicateErrors: [] }
      })
    })

    describe('getSelectedTiles', () => {
      it('should return only selected tiles', () => {
        const store = useTileStore.getState()
        
        const selectedTiles = store.getSelectedTiles()
        
        expect(selectedTiles).toHaveLength(3)
        expect(selectedTiles.every(tile => tile.isSelected)).toBe(true)
      })
    })

    describe('getTileGroups', () => {
      it('should return grouped tiles by suit', () => {
        const store = useTileStore.getState()
        
        const groups = store.getTileGroups()
        
        expect(mockTileService.getTilesGroupedBySuit).toHaveBeenCalledWith(store.playerHand)
        expect(groups).toBeDefined()
      })
    })

    describe('getHandSummary', () => {
      it('should return comprehensive hand summary', () => {
        const store = useTileStore.getState()
        
        const summary = store.getHandSummary()
        
        expect(summary).toEqual({
          total: 13,
          selected: 3,
          valid: true
        })
      })
    })
  })

  describe('Selection Area Operations', () => {
    beforeEach(() => {
      const tiles = createTestHand()
      useTileStore.setState({ playerHand: tiles })
    })

    describe('moveToSelection', () => {
      it('should move tile to selection area', () => {
        const state = useTileStore.getState()
        const tileToMove = state.playerHand[0]
        
        state.moveToSelection(tileToMove.instanceId)
        
        const newState = useTileStore.getState()
        expect(newState.selectedForAction).toHaveLength(1)
        expect(newState.selectedForAction[0]).toEqual(tileToMove)
        expect(newState.tileStates[tileToMove.instanceId]).toBe('placeholder')
      })

      it('should preserve locked state when moving locked tiles', () => {
        const state = useTileStore.getState()
        const tileToMove = state.playerHand[0]
        useTileStore.setState({ tileStates: { [tileToMove.instanceId]: 'locked' } })

        state.moveToSelection(tileToMove.instanceId)

        const newState = useTileStore.getState()
        expect(newState.selectedForAction).toHaveLength(1)
        expect(newState.tileStates[tileToMove.instanceId]).toBe('locked-placeholder')
      })
    })

    describe('returnFromSelection', () => {
      it('should return tile from selection area', () => {
        const state = useTileStore.getState()
        const tileToReturn = state.playerHand[0]
        
        // First move to selection
        state.moveToSelection(tileToReturn.instanceId)
        // Then return
        state.returnFromSelection(tileToReturn.instanceId)
        
        const newState = useTileStore.getState()
        expect(newState.selectedForAction).toHaveLength(0)
        expect(newState.tileStates[tileToReturn.instanceId]).toBeUndefined()
      })
    })

    describe('lockTile', () => {
      it('should lock a tile', () => {
        const state = useTileStore.getState()
        const tileToLock = state.playerHand[0]
        
        state.lockTile(tileToLock.instanceId)
        
        const newState = useTileStore.getState()
        expect(newState.tileStates[tileToLock.instanceId]).toBe('locked')
      })
    })

    describe('clearSelection', () => {
      it('should clear selection area and tile states', () => {
        const state = useTileStore.getState()
        const testTile = state.playerHand[0]
        
        // Setup selection area with tiles and states
        useTileStore.setState({ 
          selectedForAction: [testTile],
          tileStates: { [testTile.instanceId]: 'placeholder' }
        })
        
        state.clearSelection()
        
        const newState = useTileStore.getState()
        expect(newState.selectedForAction).toEqual([])
        expect(newState.tileStates).toEqual({})
      })
    })
  })
})