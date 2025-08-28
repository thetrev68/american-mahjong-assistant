// Charleston View - Enhanced intelligence interface for tile passing
// Based on intelligence panel with full tile display and auto-selected discards

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIntelligenceStore } from '../../stores/intelligence-store'
import { usePatternStore } from '../../stores/pattern-store'
import { useTileStore } from '../../stores/tile-store'
import { useRoomStore } from '../../stores/room-store'
import { useGameStore } from '../../stores/game-store'
import GameScreenLayout from '../gameplay/GameScreenLayout'
import { TileInputModal } from '../shared/TileInputModal'
import { SelectionArea } from '../gameplay/SelectionArea'
import { tileService } from '../../services/tile-service'
import type { Tile as TileType, PlayerTile } from '../../types/tile-types'


export function CharlestonView() {
  const navigate = useNavigate()
  const { currentAnalysis, isAnalyzing, analyzeHand } = useIntelligenceStore()
  const { getTargetPatterns } = usePatternStore()
  const { playerHand = [], clearHand, addTile } = useTileStore()
  const { coPilotMode } = useRoomStore()
  
  // Helper function to replace the entire hand
  const replacePlayerHand = useCallback((newTiles: PlayerTile[]) => {
    clearHand()
    newTiles.forEach(tile => addTile(tile.id))
  }, [clearHand, addTile])

  // Sort tiles alphabetically like PrimaryAnalysisCard
  const sortTilesAlphabetically = (tiles: TileType[]): TileType[] => {
    return [...tiles].sort((a, b) => {
      const getOrder = (tileId: string): number => {
        const t = tileId.toLowerCase()
        // Jokers first
        if (t.includes('joker') || t === 'j') return 0
        // Flowers second  
        if (t === 'f1' || t.includes('flower') || t === 'f') return 1
        // Numbers 1-9 for each suit (B, C, D)
        if (t.match(/^[1-9][bcd]$/)) {
          const num = parseInt(t[0])
          const suit = t[1]
          if (suit === 'b') return 2000 + num      // Bams: 2001-2009
          if (suit === 'c') return 3000 + num      // Cracks: 3001-3009  
          if (suit === 'd') return 4000 + num      // Dots: 4001-4009
        }
        // Dragons
        if (t === 'f2' || t.includes('green') || t === 'gd') return 5001
        if (t === 'f3' || t.includes('red') || t === 'rd') return 5002
        if (t === 'f4' || t.includes('white') || t === 'wd') return 5003
        // Winds  
        if (t === 'f5' || t.includes('east') || t === 'ew') return 6001
        if (t === 'f6' || t.includes('south') || t === 'sw') return 6002
        if (t === 'f7' || t.includes('west') || t === 'ww') return 6003
        if (t === 'f8' || t.includes('north') || t === 'nw') return 6004
        
        return 9999 // Unknown tiles last
      }
      
      return getOrder(a.id) - getOrder(b.id)
    })
  }
  
  // Charleston state
  const [selectedTilesToPass, setSelectedTilesToPass] = useState<string[]>([])
  const [isReadyToPass, setIsReadyToPass] = useState(false)
  const [allPlayersReady, setAllPlayersReady] = useState(false)
  const [newlyReceivedTiles, setNewlyReceivedTiles] = useState<string[]>([])
  const [showTileModal, setShowTileModal] = useState(false)
  const [tileModalMode, setTileModalMode] = useState<'receive' | 'edit'>('receive')
  const [currentHand, setCurrentHand] = useState<TileType[]>(() => 
    sortTilesAlphabetically(playerHand)
  )
  const [charlestonPhase, setCharlestonPhase] = useState<'right' | 'across' | 'left' | 'complete'>('right')
  
  // Game context tracking for AI engines
  const [tilesPassedOut, setTilesPassedOut] = useState<string[]>([]) // Tiles we passed to others
  const [knownOpponentTiles, setKnownOpponentTiles] = useState<{ [playerId: string]: string[] }>({}) // Tiles in opponent hands
  
  // Undo functionality
  const [gameStateHistory, setGameStateHistory] = useState<Array<{
    hand: TileType[]
    phase: 'right' | 'across' | 'left' | 'complete'
    tilesPassedOut: string[]
    knownOpponentTiles: { [playerId: string]: string[] }
    timestamp: number
  }>>([])
  
  // Persistence key
  const CHARLESTON_STORAGE_KEY = 'charleston-game-state'

  // Load persisted state on component mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CHARLESTON_STORAGE_KEY)
      if (saved) {
        const state = JSON.parse(saved)
        setCurrentHand(state.hand || playerHand)
        setCharlestonPhase(state.phase || 'right')
        setTilesPassedOut(state.tilesPassedOut || [])
        setKnownOpponentTiles(state.knownOpponentTiles || {})
        setGameStateHistory(state.history || [])
      }
    } catch (error) {
      console.warn('Failed to load Charleston state:', error)
    }
  }, [playerHand])

  // Save state to localStorage whenever it changes
  useEffect(() => {
    const state = {
      hand: currentHand,
      phase: charlestonPhase,
      tilesPassedOut,
      knownOpponentTiles,
      history: gameStateHistory
    }
    try {
      localStorage.setItem(CHARLESTON_STORAGE_KEY, JSON.stringify(state))
    } catch (error) {
      console.warn('Failed to save Charleston state:', error)
    }
  }, [currentHand, charlestonPhase, tilesPassedOut, knownOpponentTiles, gameStateHistory])

  // Save game state for undo
  const saveGameState = useCallback(() => {
    const newState = {
      hand: currentHand,
      phase: charlestonPhase,
      tilesPassedOut,
      knownOpponentTiles,
      timestamp: Date.now()
    }
    setGameStateHistory(prev => [...prev.slice(-9), newState]) // Keep last 10 states
  }, [currentHand, charlestonPhase, tilesPassedOut, knownOpponentTiles])

  // Undo function
  const handleUndo = useCallback(() => {
    if (gameStateHistory.length > 0) {
      const previousState = gameStateHistory[gameStateHistory.length - 1]
      setCurrentHand(previousState.hand)
      setCharlestonPhase(previousState.phase)
      setTilesPassedOut(previousState.tilesPassedOut)
      setKnownOpponentTiles(previousState.knownOpponentTiles)
      setGameStateHistory(prev => prev.slice(0, -1))
      
      // Update tile store
      const storePlayerTiles = previousState.hand
        .map(tile => tileService.createPlayerTile(tile.id))
        .filter((tile): tile is NonNullable<typeof tile> => tile !== null)
      replacePlayerHand(storePlayerTiles)
      
      // Reset selection state
      setSelectedTilesToPass([])
      setIsReadyToPass(false)
      setAllPlayersReady(false)
    }
  }, [gameStateHistory, replacePlayerHand])

  // Auto-select 3 tiles based on Engine 3 recommendations
  useEffect(() => {
    if (currentAnalysis?.tileRecommendations && selectedTilesToPass.length === 0) {
      const tilesToDiscard = currentAnalysis.tileRecommendations
        .filter(rec => rec && rec.tileId && (rec.action === 'pass' || rec.action === 'discard'))
        .slice(0, 3)
        .map(rec => rec.tileId)
      
      setSelectedTilesToPass(tilesToDiscard)
    }
  }, [currentAnalysis, selectedTilesToPass.length])

  // Handle tile selection for passing
  const handleTileSelect = useCallback((tileId: string) => {
    if (isReadyToPass) return // Can't change selection when ready
    
    setSelectedTilesToPass(current => {
      if (current.includes(tileId)) {
        return current.filter(id => id !== tileId)
      } else if (current.length < 3) {
        return [...current, tileId]
      } else {
        // Replace the first selected tile
        return [tileId, ...current.slice(1)]
      }
    })
  }, [isReadyToPass])

  // Handle tile passing logic
  const handleTilePassing = useCallback(async () => {
    // Remove passed tiles from hand
    const remainingTiles = currentHand.filter(tile => !selectedTilesToPass.includes(tile.id))
    
    // Track tiles we passed out (they're no longer in wall and are in opponent hands)
    setTilesPassedOut(prev => [...prev, ...selectedTilesToPass])
    
    // In real multiplayer, we'd track which specific player received which tiles
    // For now, just track that these tiles are in "opponent hands"
    const opponentId = charlestonPhase === 'right' ? 'player_right' : charlestonPhase === 'across' ? 'player_across' : 'player_left'
    setKnownOpponentTiles(prev => ({
      ...prev,
      [opponentId]: [...(prev[opponentId] || []), ...selectedTilesToPass]
    }))
    
    if (coPilotMode === 'solo') {
      // In solo mode, modal will be shown in handleReadyToPass
    } else {
      // In multiplayer mode, tiles will be received from other players via websockets
      setCurrentHand(remainingTiles)
      // Update tile store with remaining tiles
      const playerTilesRemaining = remainingTiles
        .map(tile => tileService.createPlayerTile(tile.id))
        .filter((tile): tile is NonNullable<typeof tile> => tile !== null)
      replacePlayerHand(playerTilesRemaining)
      // Note: When multiplayer receives tiles, it should also trigger re-analysis and phase advancement
      // This will be handled by the websocket event listeners
    }
    
    // Reset passing state for next round
    setSelectedTilesToPass([])
    setIsReadyToPass(false)
    setAllPlayersReady(false)
  }, [currentHand, selectedTilesToPass, coPilotMode, charlestonPhase, replacePlayerHand])

  // Handle ready to pass
  const handleReadyToPass = useCallback(() => {
    if (selectedTilesToPass.length !== 3) return
    
    setIsReadyToPass(true)
    
    // Mock: simulate all players becoming ready after a delay
    setTimeout(() => {
      setAllPlayersReady(true)
      // In solo mode, show tile modal for receiving tiles
      if (coPilotMode === 'solo') {
        setShowTileModal(true)
        setTileModalMode('receive')
      } else {
        // In multiplayer, continue with tile passing
        setTimeout(() => {
          handleTilePassing()
        }, 1000)
      }
    }, 2000)
  }, [selectedTilesToPass.length, handleTilePassing, coPilotMode])


  const { turnStartTime } = useGameStore()

  // Convert current hand to PlayerTile format for GameScreenLayout
  const playerTiles: PlayerTile[] = currentHand.map((tile, index) => ({
    ...tile,
    instanceId: `${tile.id}-${index}`,
    isSelected: selectedTilesToPass.includes(tile.id)
  }))

  // Mock data for GameScreenLayout
  const mockDiscardPile: Array<{
    tile: TileType
    playerId: string
    timestamp: Date
  }> = []

  const mockGameHistory: Array<{
    playerId: string
    action: string
    tile?: TileType
    timestamp: Date
  }> = []

  const handleSelectTile = (tile: TileType) => {
    handleTileSelect(tile.id)
  }

  const findAlternativePatterns = () => {
    navigate('/patterns')
  }

  return (
    <div>
      <GameScreenLayout
        gamePhase="charleston"
        currentPlayer={`Pass ${charlestonPhase === 'right' ? 'Right' : charlestonPhase === 'across' ? 'Across' : charlestonPhase === 'left' ? 'Left' : 'Complete'}`}
        timeElapsed={turnStartTime ? Math.floor((Date.now() - turnStartTime.getTime()) / 1000) : 0}
        playerNames={['You', 'Player 2', 'Player 3', 'Player 4']}
        windRound="east"
        gameRound={1}
        selectedPatternsCount={getTargetPatterns().length}
        findAlternativePatterns={findAlternativePatterns}
        onNavigateToCharleston={() => {}}
        currentHand={playerTiles}
        lastDrawnTile={null}
        exposedTiles={[]}
        selectedDiscardTile={null}
        isMyTurn={true}
        isAnalyzing={isAnalyzing}
        handleDrawTile={() => {}}
        handleDiscardTile={handleSelectTile}
        discardPile={mockDiscardPile}
        currentPlayerIndex={0}
        playerExposedCount={{}}
        gameHistory={mockGameHistory}
        currentAnalysis={currentAnalysis}
      />

      {/* Selection Area for Charleston tile passing */}
      <SelectionArea />

      {/* Charleston Action Panel */}
      <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-40">
        <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg p-4 min-w-80">
          <div className="text-center space-y-3">
            <div className="text-2xl">🔄</div>
            <div>
              {!isReadyToPass ? (
                <>
                  <h3 className="text-lg font-semibold text-blue-900 mb-1">
                    Pass Selection
                  </h3>
                  <p className="text-sm text-blue-700 mb-4">
                    {selectedTilesToPass.length === 3 
                      ? 'Ready to pass your tiles!'
                      : `Select ${3 - selectedTilesToPass.length} more tile${3 - selectedTilesToPass.length !== 1 ? 's' : ''} to pass`
                    }
                  </p>
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={handleReadyToPass}
                      disabled={selectedTilesToPass.length !== 3}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
                    >
                      Ready to Pass ({selectedTilesToPass.length}/3)
                    </button>
                    {gameStateHistory.length > 0 && (
                      <button
                        onClick={handleUndo}
                        className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        ↶ Undo
                      </button>
                    )}
                  </div>
                </>
              ) : allPlayersReady ? (
                <>
                  <h3 className="text-lg font-semibold text-green-900 mb-1">
                    Passing Tiles...
                  </h3>
                  <p className="text-sm text-green-700 mb-4">
                    All players ready - tiles are being exchanged
                  </p>
                  <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-orange-900 mb-1">
                    Tiles Locked
                  </h3>
                  <p className="text-sm text-orange-700">
                    Waiting for other players to confirm their passes...
                  </p>
                </>
              )}
            </div>

            {/* Edit Received Tiles */}
            {newlyReceivedTiles.length > 0 && (
              <div className="border-t pt-3">
                <p className="text-xs text-gray-500 mb-2">
                  {newlyReceivedTiles.length} tiles received - marked with ★
                </p>
                <button
                  onClick={() => {
                    setTileModalMode('edit')
                    setShowTileModal(true)
                  }}
                  className="text-xs px-3 py-1 border border-blue-200 text-blue-600 rounded hover:bg-blue-50"
                >
                  ✏️ Edit Received Tiles
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Universal Tile Input Modal */}
      <TileInputModal
        isOpen={showTileModal}
        onClose={() => {
          setShowTileModal(false)
          setTileModalMode('receive')
        }}
        onConfirm={(tileIds) => {
          if (tileModalMode === 'receive') {
            // Save state before making changes (for undo)
            saveGameState()
            
            // Remove passed tiles and add received tiles
            const remainingTiles = currentHand.filter(tile => !selectedTilesToPass.includes(tile.id))
            const receivedTiles = tileIds
              .map(tileId => tileService.getTileById(tileId))
              .filter(tile => tile !== undefined) as TileType[]
              
            const unsortedNewHand = [...remainingTiles, ...receivedTiles]
            const newHand = sortTilesAlphabetically(unsortedNewHand)
            
            setNewlyReceivedTiles(tileIds)
            setCurrentHand(newHand)
            
            // Update the tile store
            const storePlayerTiles = newHand
              .map(tile => tileService.createPlayerTile(tile.id))
              .filter((tile): tile is NonNullable<typeof tile> => tile !== null)
            replacePlayerHand(storePlayerTiles)
            
            // Re-run analysis with new hand
            const targetPatterns = getTargetPatterns()
            if (targetPatterns.length > 0) {
              analyzeHand(storePlayerTiles, targetPatterns)
            }
            
            // Advance to next phase
            const nextPhase = charlestonPhase === 'right' ? 'across' 
                           : charlestonPhase === 'across' ? 'left' 
                           : 'complete'
            setCharlestonPhase(nextPhase)
            
            if (nextPhase === 'complete') {
              setTimeout(() => {
                navigate('/gameplay')
              }, 2000)
            }
            
            // Clear selection and receiving state
            setSelectedTilesToPass([])
            setIsReadyToPass(false)
            setAllPlayersReady(false)
            
            // Auto-hide newly received tiles after 3 seconds
            setTimeout(() => {
              setNewlyReceivedTiles([])
            }, 3000)
          } else if (tileModalMode === 'edit') {
            // Edit flow: replace the previously received tiles
            saveGameState()
            
            // Remove the old received tiles from hand
            const handWithoutOldReceived = currentHand.filter(tile => !newlyReceivedTiles.includes(tile.id))
            
            // Add the new selected tiles
            const newReceivedTiles = tileIds
              .map(tileId => tileService.getTileById(tileId))
              .filter(tile => tile !== undefined) as TileType[]
              
            const updatedHand = sortTilesAlphabetically([...handWithoutOldReceived, ...newReceivedTiles])
            
            // Update state
            setNewlyReceivedTiles(tileIds)
            setCurrentHand(updatedHand)
            
            // Update the tile store
            const storePlayerTiles = updatedHand
              .map(tile => tileService.createPlayerTile(tile.id))
              .filter((tile): tile is NonNullable<typeof tile> => tile !== null)
            replacePlayerHand(storePlayerTiles)
            
            // Re-run analysis with updated hand
            const targetPatterns = getTargetPatterns()
            if (targetPatterns.length > 0) {
              analyzeHand(storePlayerTiles, targetPatterns)
            }
            
            // Auto-hide the edit markers after 3 seconds
            setTimeout(() => {
              setNewlyReceivedTiles([])
            }, 3000)
          }
          
          setShowTileModal(false)
          setTileModalMode('receive')
        }}
        mode={tileModalMode}
        requiredCount={3}
        context="charleston"
        initialTiles={tileModalMode === 'edit' ? newlyReceivedTiles : []}
      />
    </div>
  )
}