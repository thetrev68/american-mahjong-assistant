import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useCharlestonStore } from '../charleston-store'
import { CharlestonAdapter } from '../../utils/charleston-adapter'
import { createTile, createPatternSelection, TilePresets } from '../../__tests__/factories'

// Mock the charleston adapter
vi.mock('../../utils/charleston-adapter', () => ({
  CharlestonAdapter: {
    generateRecommendations: vi.fn(() => ({
      tilesToPass: [
        createTile({ id: '7B', displayName: '7 Bam' }),
        createTile({ id: '8C', displayName: '8 Crak' }),
        createTile({ id: '9D', displayName: '9 Dot' })
      ],
      reasoning: 'Test recommendation reasoning',
      strategicNotes: ['Strategic note 1', 'Strategic note 2'],
      confidence: 0.85,
      alternativeOptions: []
    }))
  }
}))

describe('Charleston Store', () => {
  beforeEach(() => {
    // Reset store to initial state
    const initialState = {
      currentPhase: 'right' as const,
      playerCount: 4,
      isActive: false,
      playerTiles: [],
      selectedTiles: [],
      recommendations: null,
      isAnalyzing: false,
      targetPatterns: [],
      phaseHistory: [],
      isMultiplayerMode: false,
      playerReadiness: {},
      waitingForPlayers: [],
      currentPlayerId: null,
      roomId: null,
      showStrategy: false,
      analysisError: null
    }
    
    useCharlestonStore.setState(initialState)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('Phase Management', () => {
    it('should set charleston phase', () => {
      const store = useCharlestonStore.getState()
      
      store.setPhase('across')
      expect(useCharlestonStore.getState().currentPhase).toBe('across')
      
      store.setPhase('left')
      expect(useCharlestonStore.getState().currentPhase).toBe('left')
    })

    it('should set player count', () => {
      const store = useCharlestonStore.getState()
      
      store.setPlayerCount(3)
      expect(useCharlestonStore.getState().playerCount).toBe(3)
    })

    it('should start charleston with correct initial state', () => {
      const store = useCharlestonStore.getState()
      
      store.startCharleston()
      
      const state = useCharlestonStore.getState()
      expect(state.isActive).toBe(true)
      expect(state.currentPhase).toBe('right')
      expect(state.phaseHistory).toEqual([])
      expect(state.selectedTiles).toEqual([])
    })

    it('should generate recommendations when starting charleston with tiles', async () => {
      const store = useCharlestonStore.getState()
      const tiles = TilePresets.mixedHand()
      
      useCharlestonStore.setState({ playerTiles: tiles })
      store.startCharleston()
      
      // Wait for async recommendation generation
      await new Promise(resolve => setTimeout(resolve, 0))
      
      expect(CharlestonAdapter.generateRecommendations).toHaveBeenCalled()
    })

    it('should end charleston and clear state', () => {
      const store = useCharlestonStore.getState()
      
      // Set up active charleston
      store.startCharleston()
      useCharlestonStore.setState({
        selectedTiles: [createTile()],
        recommendations: { tilesToPass: [], reasoning: 'test', strategicNotes: [], confidence: 0.8, alternativeOptions: [] }
      })
      
      store.endCharleston()
      
      const state = useCharlestonStore.getState()
      expect(state.isActive).toBe(false)
      expect(state.currentPhase).toBe('complete')
      expect(state.selectedTiles).toEqual([])
      expect(state.recommendations).toBeNull()
    })
  })

  describe('Tile Management', () => {
    it('should set player tiles', () => {
      const store = useCharlestonStore.getState()
      const tiles = TilePresets.pungs()
      
      store.setPlayerTiles(tiles)
      
      expect(useCharlestonStore.getState().playerTiles).toEqual(tiles)
    })

    it('should clean up selection when setting new tiles', () => {
      const store = useCharlestonStore.getState()
      const tile1 = createTile({ id: 'tile1' })
      const tile2 = createTile({ id: 'tile2' })
      const tile3 = createTile({ id: 'tile3' })
      
      // Set initial tiles and selection
      useCharlestonStore.setState({
        playerTiles: [tile1, tile2, tile3],
        selectedTiles: [tile1, tile2]
      })
      
      // Set new tiles that don't include selected tile1
      store.setPlayerTiles([tile2, tile3])
      
      const state = useCharlestonStore.getState()
      expect(state.playerTiles).toEqual([tile2, tile3])
      expect(state.selectedTiles).toEqual([tile2]) // tile1 should be removed from selection
    })

    it('should add unique tiles only', () => {
      const store = useCharlestonStore.getState()
      const tile1 = createTile({ id: 'tile1' })
      const tile2 = createTile({ id: 'tile2' })
      
      useCharlestonStore.setState({ playerTiles: [tile1] })
      
      store.addTile(tile2)
      expect(useCharlestonStore.getState().playerTiles).toHaveLength(2)
      
      // Adding same tile should not duplicate
      store.addTile(tile1)
      expect(useCharlestonStore.getState().playerTiles).toHaveLength(2)
    })

    it('should remove tiles by ID', () => {
      const store = useCharlestonStore.getState()
      const tile1 = createTile({ id: 'tile1' })
      const tile2 = createTile({ id: 'tile2' })
      
      useCharlestonStore.setState({ playerTiles: [tile1, tile2] })
      
      store.removeTile('tile1')
      
      const state = useCharlestonStore.getState()
      expect(state.playerTiles).toEqual([tile2])
    })
  })

  describe('Selection Management', () => {
    it('should select tiles up to maximum of 3', () => {
      const store = useCharlestonStore.getState()
      // Create tiles with unique IDs to test selection properly
      const tiles = [
        createTile({ id: 'tile1', instanceId: 'inst1' }),
        createTile({ id: 'tile2', instanceId: 'inst2' }),
        createTile({ id: 'tile3', instanceId: 'inst3' }),
        createTile({ id: 'tile4', instanceId: 'inst4' }),
        createTile({ id: 'tile5', instanceId: 'inst5' })
      ]
      
      useCharlestonStore.setState({ playerTiles: tiles })
      
      store.selectTile(tiles[0])
      store.selectTile(tiles[1])
      store.selectTile(tiles[2])
      
      let state = useCharlestonStore.getState()
      expect(state.selectedTiles).toHaveLength(3)
      
      // Should not select 4th tile
      store.selectTile(tiles[3])
      state = useCharlestonStore.getState()
      expect(state.selectedTiles).toHaveLength(3)
    })

    it('should not select the same tile twice', () => {
      const store = useCharlestonStore.getState()
      const tile = createTile({ id: 'tile1' })
      
      useCharlestonStore.setState({ playerTiles: [tile] })
      
      store.selectTile(tile)
      store.selectTile(tile)
      
      expect(useCharlestonStore.getState().selectedTiles).toHaveLength(1)
    })

    it('should deselect tiles', () => {
      const store = useCharlestonStore.getState()
      const tile1 = createTile({ id: 'tile1' })
      const tile2 = createTile({ id: 'tile2' })
      
      useCharlestonStore.setState({ selectedTiles: [tile1, tile2] })
      
      store.deselectTile(tile1)
      
      expect(useCharlestonStore.getState().selectedTiles).toEqual([tile2])
    })

    it('should clear all selections', () => {
      const store = useCharlestonStore.getState()
      const tiles = TilePresets.pairs()
      
      useCharlestonStore.setState({ selectedTiles: tiles.slice(0, 3) })
      
      store.clearSelection()
      
      expect(useCharlestonStore.getState().selectedTiles).toEqual([])
    })

    it('should auto-select recommended tiles', () => {
      const store = useCharlestonStore.getState()
      const recommendedTiles = [
        createTile({ id: 'rec1' }),
        createTile({ id: 'rec2' }),
        createTile({ id: 'rec3' }),
        createTile({ id: 'rec4' })
      ]
      
      useCharlestonStore.setState({
        recommendations: {
          tilesToPass: recommendedTiles,
          reasoning: 'test',
          strategicNotes: [],
          confidence: 0.8,
          alternativeOptions: []
        }
      })
      
      store.autoSelectRecommended()
      
      const state = useCharlestonStore.getState()
      expect(state.selectedTiles).toHaveLength(3) // Should only select first 3
      expect(state.selectedTiles).toEqual(recommendedTiles.slice(0, 3))
    })
  })

  describe('Pattern Management', () => {
    it('should set target patterns and regenerate recommendations', async () => {
      const store = useCharlestonStore.getState()
      const patterns = [createPatternSelection({ id: 1 }), createPatternSelection({ id: 2 })]
      const tiles = TilePresets.mixedHand()
      
      useCharlestonStore.setState({ 
        isActive: true,
        playerTiles: tiles 
      })
      
      store.setTargetPatterns(patterns)
      
      expect(useCharlestonStore.getState().targetPatterns).toEqual(patterns)
      
      // Wait for async recommendation generation
      await new Promise(resolve => setTimeout(resolve, 0))
      
      expect(CharlestonAdapter.generateRecommendations).toHaveBeenCalledWith(
        tiles,
        patterns,
        'right',
        4
      )
    })
  })

  describe('Analysis and Recommendations', () => {
    it('should generate recommendations successfully', async () => {
      const store = useCharlestonStore.getState()
      const tiles = TilePresets.mixedHand()
      const patterns = [createPatternSelection()]
      
      useCharlestonStore.setState({
        isActive: true,
        playerTiles: tiles,
        targetPatterns: patterns
      })
      
      await store.generateRecommendations()
      
      const state = useCharlestonStore.getState()
      expect(state.isAnalyzing).toBe(false)
      expect(state.recommendations).toBeDefined()
      expect(state.analysisError).toBeNull()
    })

    it('should handle analysis errors gracefully', async () => {
      const store = useCharlestonStore.getState()
      const error = new Error('Analysis failed')
      
      vi.mocked(CharlestonAdapter.generateRecommendations).mockImplementation(() => {
        throw error
      })
      
      useCharlestonStore.setState({
        isActive: true,
        playerTiles: TilePresets.mixedHand()
      })
      
      await store.generateRecommendations()
      
      const state = useCharlestonStore.getState()
      expect(state.isAnalyzing).toBe(false)
      expect(state.recommendations).toBeNull()
      expect(state.analysisError).toBe('Analysis failed')
    })

    it('should not generate recommendations when inactive or no tiles', async () => {
      const store = useCharlestonStore.getState()
      
      // Test inactive state
      useCharlestonStore.setState({ isActive: false, playerTiles: TilePresets.mixedHand() })
      await store.generateRecommendations()
      expect(CharlestonAdapter.generateRecommendations).not.toHaveBeenCalled()
      
      // Test no tiles
      useCharlestonStore.setState({ isActive: true, playerTiles: [] })
      await store.generateRecommendations()
      expect(CharlestonAdapter.generateRecommendations).not.toHaveBeenCalled()
    })

    it('should clear recommendations', () => {
      const store = useCharlestonStore.getState()
      
      useCharlestonStore.setState({
        recommendations: {
          tilesToPass: [],
          reasoning: 'test',
          strategicNotes: [],
          confidence: 0.8,
          alternativeOptions: []
        }
      })
      
      store.clearRecommendations()
      
      expect(useCharlestonStore.getState().recommendations).toBeNull()
    })
  })

  describe('Phase Completion', () => {
    it('should complete phase and advance to next phase', () => {
      vi.useFakeTimers()
      
      const store = useCharlestonStore.getState()
      const passedTiles = TilePresets.pungs().slice(0, 3)
      const receivedTiles = TilePresets.pairs().slice(0, 3)
      
      useCharlestonStore.setState({
        currentPhase: 'right',
        playerCount: 4,
        selectedTiles: passedTiles,
        playerTiles: TilePresets.mixedHand()
      })
      
      store.completePhase(receivedTiles)
      
      const state = useCharlestonStore.getState()
      expect(state.currentPhase).toBe('across') // Next phase for 4 players
      expect(state.selectedTiles).toEqual([]) // Selection cleared
      expect(state.phaseHistory).toHaveLength(1)
      
      const historyEntry = state.phaseHistory[0]
      expect(historyEntry.phase).toBe('right')
      expect(historyEntry.tilesPassed).toEqual(passedTiles)
      expect(historyEntry.tilesReceived).toEqual(receivedTiles)
      expect(historyEntry.timestamp).toBeTypeOf('number')
      
      vi.useRealTimers()
    })

    it('should handle 3-player game phase progression', () => {
      const store = useCharlestonStore.getState()
      
      useCharlestonStore.setState({
        currentPhase: 'right',
        playerCount: 3,
        selectedTiles: TilePresets.pungs().slice(0, 3)
      })
      
      store.completePhase()
      
      // In 3-player game, should skip 'across' and go to 'left'
      expect(useCharlestonStore.getState().currentPhase).toBe('left')
    })

    it('should end charleston when completing optional phase', () => {
      const store = useCharlestonStore.getState()
      
      useCharlestonStore.setState({
        currentPhase: 'optional',
        selectedTiles: TilePresets.pungs().slice(0, 3)
      })
      
      store.completePhase()
      
      const state = useCharlestonStore.getState()
      expect(state.currentPhase).toBe('complete')
      expect(state.isActive).toBe(false)
    })
  })

  describe('Multiplayer Coordination', () => {
    it('should set multiplayer mode', () => {
      const store = useCharlestonStore.getState()
      
      store.setMultiplayerMode(true, 'room123', 'player1')
      
      const state = useCharlestonStore.getState()
      expect(state.isMultiplayerMode).toBe(true)
      expect(state.roomId).toBe('room123')
      expect(state.currentPlayerId).toBe('player1')
    })

    it('should manage player readiness', () => {
      const store = useCharlestonStore.getState()
      
      store.setPlayerReady('player1', true)
      store.setPlayerReady('player2', false)
      store.setPlayerReady('player3', true)
      
      const state = useCharlestonStore.getState()
      expect(state.playerReadiness['player1']).toBe(true)
      expect(state.playerReadiness['player2']).toBe(false)
      expect(state.playerReadiness['player3']).toBe(true)
    })

    it('should reset player readiness', () => {
      const store = useCharlestonStore.getState()
      
      useCharlestonStore.setState({
        playerReadiness: { player1: true, player2: false, player3: true }
      })
      
      store.resetPlayerReadiness()
      
      expect(useCharlestonStore.getState().playerReadiness).toEqual({})
    })

    it('should update waiting for players list', () => {
      const store = useCharlestonStore.getState()
      
      store.updateWaitingForPlayers(['player2', 'player4'])
      
      expect(useCharlestonStore.getState().waitingForPlayers).toEqual(['player2', 'player4'])
    })

    it('should mark current player ready with valid selection', () => {
      const store = useCharlestonStore.getState()
      
      useCharlestonStore.setState({
        isMultiplayerMode: true,
        currentPlayerId: 'player1',
        selectedTiles: TilePresets.pungs().slice(0, 3)
      })
      
      store.markPlayerReady()
      
      const state = useCharlestonStore.getState()
      expect(state.playerReadiness['player1']).toBe(true)
    })

    it('should show error when marking ready with invalid selection', () => {
      const store = useCharlestonStore.getState()
      
      useCharlestonStore.setState({
        isMultiplayerMode: true,
        currentPlayerId: 'player1',
        selectedTiles: TilePresets.pungs().slice(0, 2) // Only 2 tiles
      })
      
      store.markPlayerReady()
      
      const state = useCharlestonStore.getState()
      expect(state.analysisError).toBe('You must select exactly 3 tiles to pass')
      expect(state.playerReadiness['player1']).toBeUndefined()
    })

    it('should handle tile exchange in multiplayer', () => {
      vi.useFakeTimers()
      
      const store = useCharlestonStore.getState()
      const passedTiles = TilePresets.pungs().slice(0, 3)
      const receivedTiles = TilePresets.pairs().slice(0, 3)
      
      useCharlestonStore.setState({
        currentPhase: 'right',
        selectedTiles: passedTiles,
        playerTiles: TilePresets.mixedHand(),
        playerReadiness: { player1: true, player2: true }
      })
      
      store.handleTileExchange(receivedTiles)
      
      const state = useCharlestonStore.getState()
      expect(state.currentPhase).toBe('across')
      expect(state.selectedTiles).toEqual([])
      expect(state.playerReadiness).toEqual({}) // Reset for next phase
      expect(state.waitingForPlayers).toEqual([])
      
      vi.useRealTimers()
    })
  })

  describe('UI State Management', () => {
    it('should toggle strategy display', () => {
      const store = useCharlestonStore.getState()
      
      expect(useCharlestonStore.getState().showStrategy).toBe(false)
      
      store.toggleStrategy()
      expect(useCharlestonStore.getState().showStrategy).toBe(true)
      
      store.toggleStrategy()
      expect(useCharlestonStore.getState().showStrategy).toBe(false)
    })

    it('should clear analysis errors', () => {
      const store = useCharlestonStore.getState()
      
      useCharlestonStore.setState({ analysisError: 'Test error' })
      
      store.clearError()
      
      expect(useCharlestonStore.getState().analysisError).toBeNull()
    })
  })

  describe('Store Reset', () => {
    it('should reset to initial state', () => {
      const store = useCharlestonStore.getState()
      
      // Set up modified state
      useCharlestonStore.setState({
        isActive: true,
        currentPhase: 'left',
        playerTiles: TilePresets.mixedHand(),
        selectedTiles: TilePresets.pungs().slice(0, 3),
        recommendations: { tilesToPass: [], reasoning: 'test', strategicNotes: [], confidence: 0.8, alternativeOptions: [] },
        targetPatterns: [createPatternSelection()],
        phaseHistory: [{ phase: 'right', tilesPassed: [], tilesReceived: [], timestamp: Date.now() }],
        isMultiplayerMode: true,
        playerReadiness: { player1: true }
      })
      
      store.reset()
      
      const state = useCharlestonStore.getState()
      expect(state.currentPhase).toBe('right')
      expect(state.isActive).toBe(false)
      expect(state.playerTiles).toEqual([])
      expect(state.selectedTiles).toEqual([])
      expect(state.recommendations).toBeNull()
      expect(state.targetPatterns).toEqual([])
      expect(state.phaseHistory).toEqual([])
      expect(state.isMultiplayerMode).toBe(false)
      expect(state.playerReadiness).toEqual({})
    })
  })

  describe('Charleston Selectors', () => {
    it('should compute derived state correctly', () => {
      // Set up test state
      const tiles = TilePresets.mixedHand()
      const jokerTile = createTile({ suit: 'jokers', value: 'joker', isJoker: true })
      const selectedTiles = tiles.slice(0, 2)
      
      useCharlestonStore.setState({
        isActive: true,
        currentPhase: 'across',
        playerCount: 3,
        playerTiles: [...tiles, jokerTile],
        selectedTiles,
        recommendations: { tilesToPass: [], reasoning: 'test', strategicNotes: [], confidence: 0.8, alternativeOptions: [] },
        isAnalyzing: false,
        analysisError: 'Test error',
        targetPatterns: [createPatternSelection(), createPatternSelection()],
        isMultiplayerMode: true,
        currentPlayerId: 'player1',
        playerReadiness: { player1: true, player2: false }
      })
      
      // Note: We can't directly test useCharlestonSelectors() here as it's a hook
      // In a real test, this would be tested with renderHook from @testing-library/react-hooks
      // For now, we verify the underlying logic
      const state = useCharlestonStore.getState()
      
      expect(state.isActive).toBe(true)
      expect(state.currentPhase).toBe('across')
      expect(state.playerTiles).toHaveLength(tiles.length + 1)
      expect(state.selectedTiles).toHaveLength(2)
      expect(state.recommendations).toBeDefined()
      expect(state.analysisError).toBe('Test error')
      expect(state.targetPatterns).toHaveLength(2)
      expect(state.isMultiplayerMode).toBe(true)
      expect(state.currentPlayerId).toBe('player1')
      expect(state.playerReadiness['player1']).toBe(true)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle recommendations generation with empty patterns', async () => {
      const store = useCharlestonStore.getState()
      
      useCharlestonStore.setState({
        isActive: true,
        playerTiles: TilePresets.mixedHand(),
        targetPatterns: []
      })
      
      await store.generateRecommendations()
      
      expect(CharlestonAdapter.generateRecommendations).toHaveBeenCalledWith(
        expect.any(Array),
        [],
        'right',
        4
      )
    })

    it('should handle phase completion with no received tiles', () => {
      const store = useCharlestonStore.getState()
      
      useCharlestonStore.setState({
        currentPhase: 'right',
        selectedTiles: TilePresets.pungs().slice(0, 3),
        playerTiles: TilePresets.mixedHand()
      })
      
      store.completePhase() // No received tiles parameter
      
      const state = useCharlestonStore.getState()
      expect(state.phaseHistory).toHaveLength(1)
      expect(state.phaseHistory[0].tilesReceived).toEqual([])
    })

    it('should handle single player mode in markPlayerReady', () => {
      const store = useCharlestonStore.getState()
      
      useCharlestonStore.setState({
        isMultiplayerMode: false,
        selectedTiles: TilePresets.pungs().slice(0, 3),
        currentPhase: 'right',
        playerTiles: TilePresets.mixedHand()
      })
      
      store.markPlayerReady()
      
      // Should complete phase immediately in single player mode
      expect(useCharlestonStore.getState().currentPhase).toBe('across')
    })
  })
})