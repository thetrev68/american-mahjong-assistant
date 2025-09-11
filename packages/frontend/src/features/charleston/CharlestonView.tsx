// Charleston View - Enhanced intelligence interface for tile passing
// Based on intelligence panel with full tile display and auto-selected discards

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIntelligenceStore } from '../../stores/intelligence-store'
import { usePatternStore } from '../../stores/pattern-store'
import { useTileStore } from '../../stores/tile-store'
import { useRoomStore } from '../../stores/room.store'
import { useRoomSetupStore } from '../../stores/room-setup.store'
import { usePlayerStore } from '../../stores/player.store'
import { useGameStore } from '../../stores/game-store'
import { useCharlestonStore, useCharlestonSelectors } from '../../stores/charleston-store'
import { useMultiplayerStore } from '../../stores/multiplayer-store'
import GameScreenLayout from '../gameplay/GameScreenLayout'
import { TileInputModal } from '../shared/TileInputModal'
import { SelectionArea } from '../gameplay/SelectionArea'
import { Button } from '../../ui-components/Button'
import { tileService } from '../../lib/services/tile-service'
import { useCharlestonMultiplayer } from '../charleston/services/charleston-multiplayer'
import type { Tile as TileType, PlayerTile } from '../../types/tile-types'


export function CharlestonView() {
  const navigate = useNavigate()
  const { currentAnalysis, isAnalyzing, analyzeHand } = useIntelligenceStore()
  const { getTargetPatterns } = usePatternStore()
  const { playerHand = [], clearHand, addTile, moveToSelection, selectedForAction } = useTileStore()
  const roomStore = useRoomStore()
  const { coPilotMode } = useRoomSetupStore()
  const { otherPlayerNames } = usePlayerStore()
  const currentRoomCode = roomStore.room?.id
  
  // Charleston state management
  const charlestonStore = useCharlestonStore()
  const charlestonSelectors = useCharlestonSelectors()
  const multiplayerStore = useMultiplayerStore()
  const charlestonMultiplayer = useCharlestonMultiplayer()
  
  // Initialize Charleston for multiplayer if we're in a room
  useEffect(() => {
    const isMultiplayer = !!currentRoomCode && coPilotMode === 'everyone'
    const playerId = multiplayerStore.currentPlayerId
    
    if (isMultiplayer && playerId && currentRoomCode) {
      charlestonStore.setMultiplayerMode(true, currentRoomCode, playerId)
    } else {
      charlestonStore.setMultiplayerMode(false)
    }
  }, [currentRoomCode, coPilotMode, multiplayerStore.currentPlayerId, charlestonStore])
  
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
  const [showTileModal, setShowTileModal] = useState(false)
  const [tileModalMode, setTileModalMode] = useState<'receive' | 'edit'>('receive')
  const [currentHand, setCurrentHand] = useState<TileType[]>(() => 
    sortTilesAlphabetically(playerHand)
  )
  const [newlyReceivedTiles, setNewlyReceivedTiles] = useState<string[]>([])
  
  // State variables needed for compatibility with existing code
  const [isReadyToPassLocal, setIsReadyToPass] = useState(false)
  const [allPlayersReadyLocal, setAllPlayersReady] = useState(false)
  const [charlestonPhaseLocal, setCharlestonPhase] = useState<'right' | 'across' | 'left' | 'complete' | 'optional'>('right')
  
  // Multiplayer Charleston state - use Charleston store values
  const isReadyToPass = charlestonSelectors.isCurrentPlayerReady || isReadyToPassLocal
  const allPlayersReady = charlestonSelectors.allPlayersReady || allPlayersReadyLocal
  const charlestonPhase = charlestonSelectors.isMultiplayerMode ? charlestonSelectors.currentPhase : charlestonPhaseLocal
  const isMultiplayerMode = charlestonSelectors.isMultiplayerMode
  
  // Handle receiving tiles (from multiplayer or single-player simulation)
  const handleReceiveTiles = useCallback((receivedTileIds: string[]) => {
    const newTiles: TileType[] = receivedTileIds.map(id => ({ 
      id, 
      suit: 'dots' as const, 
      value: '1' as const,
      displayName: id
    }))
    // Update hand: remove passed tiles, add received tiles
    const remainingTiles = currentHand.filter(tile => !selectedTilesToPass.includes(tile.id))
    const updatedHand = [...remainingTiles, ...newTiles]
    
    setCurrentHand(sortTilesAlphabetically(updatedHand))
    setSelectedTilesToPass([])
    
    // For single-player mode, these state setters don't exist anymore since we use Charleston store
    // The Charleston store will handle phase transitions
  }, [currentHand, selectedTilesToPass])

  // Handle multiplayer ready action
  const handleMarkReady = useCallback(async () => {
    if (selectedTilesToPass.length !== 3) {
      alert('You must select exactly 3 tiles to pass')
      return
    }
    
    if (isMultiplayerMode) {
      // Convert selected tiles to Tile objects for multiplayer service
      const tilesToPass = selectedTilesToPass.map(tileId => {
        const tile = currentHand.find(t => t.id === tileId)
        return tile ? {
          id: tile.id,
          suit: tile.suit || 'unknown',
          value: tile.value || tile.id,
          displayName: tile.displayName || tile.id
        } : null
      }).filter((tile): tile is NonNullable<typeof tile> => tile !== null)
      
      // Update Charleston store with selected tiles
      charlestonStore.clearSelection()
      tilesToPass.forEach(tile => charlestonStore.selectTile(tile))
      
      // Mark player as ready through Charleston store
      charlestonStore.markPlayerReady()
      
      // Also call the multiplayer service
      const success = await charlestonMultiplayer.markPlayerReady()
      if (!success) {
        alert('Failed to mark ready. Please try again.')
      }
    } else {
      // Single-player mode - handle locally
      setTimeout(() => {
        handleReceiveTiles(['1B', '2C', '3D']) // Mock received tiles
      }, 1000)
    }
  }, [selectedTilesToPass, currentHand, isMultiplayerMode, charlestonMultiplayer, charlestonStore, handleReceiveTiles])
  
  // Game context tracking for AI engines
  const [tilesPassedOut, setTilesPassedOut] = useState<string[]>([]) // Tiles we passed to others
  const [knownOpponentTiles, setKnownOpponentTiles] = useState<{ [playerId: string]: string[] }>({}) // Tiles in opponent hands
  
  // Undo functionality
  const [gameStateHistory, setGameStateHistory] = useState<Array<{
    hand: TileType[]
    phase: 'right' | 'across' | 'left' | 'complete' | 'optional'
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





  // Undo function for Charleston moves
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

  // Handle tile passing logic
  /*const handleTilePassing = useCallback(async () => {
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
  }, [currentHand, selectedTilesToPass, coPilotMode, charlestonPhase, replacePlayerHand])*/

  // Handle ready to pass - triggers tile modal for receiving tiles
  // Removed unused handleReadyToPass - using handleMarkReady instead

  const { turnStartTime } = useGameStore()

  // Create complete player names array - You + other players
  const allPlayerNames = ['You', ...otherPlayerNames.filter(name => name.trim().length > 0)]
  
  // Charleston turn order: right -> across -> left (clockwise from your perspective)
  const getCurrentPlayerName = () => {
    // In Charleston, it's always the current player's turn (you're passing tiles)
    return 'You'
  }
  
  // Get next player based on Charleston phase
  const getNextPlayerName = () => {
    if (charlestonPhase === 'right') return allPlayerNames[1] || 'Player 2' // Right player
    if (charlestonPhase === 'across') return allPlayerNames[2] || 'Player 3' // Across player  
    if (charlestonPhase === 'left') return allPlayerNames[3] || 'Player 4' // Left player
    return 'Complete'
  }

  // Convert current hand to PlayerTile format for GameScreenLayout
  const playerTiles: PlayerTile[] = currentHand.map((tile, index) => {
    const instanceId = `${tile.id}-${index}`
    return {
      ...tile,
      instanceId,
      isSelected: selectedForAction.some(selected => selected.instanceId === instanceId)
    }
  })

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
    // Find the PlayerTile with matching id to get instanceId
    const playerTile = playerTiles.find(pt => pt.id === tile.id)
    if (playerTile) {
      moveToSelection(playerTile.instanceId)
    }
  }

  const handleDrawTile = () => {
    // In Charleston, clicking tiles should open modal to pass tiles
    setTileModalMode('receive') 
    setShowTileModal(true)
  }

  const findAlternativePatterns = () => {
    navigate('/patterns')
  }

  // Charleston Progress Component
  const CharlestonProgress = () => (
    <div className="fixed bottom-32 left-4 right-4 bg-white/90 backdrop-blur p-3 rounded-lg z-40">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium">Charleston Progress</span>
        <Button size="sm" variant="ghost" onClick={handleUndo} disabled={gameStateHistory.length === 0}>
          ↶ Undo
        </Button>
      </div>
      <div className="flex gap-2">
        {(['right', 'across', 'left'] as const).map((phase, idx) => {
          const currentPhaseIndex = ['right', 'across', 'left'].indexOf(charlestonPhase)
          return (
            <div 
              key={phase}
              className={`flex-1 h-2 rounded ${
                idx < currentPhaseIndex ? 'bg-green-500' : 
                idx === currentPhaseIndex ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            />
          )
        })}
      </div>
    </div>
  )

  return (
    <div>
      <GameScreenLayout
        gamePhase="charleston"
        currentPlayer={getCurrentPlayerName()}
        timeElapsed={turnStartTime ? Math.floor((Date.now() - turnStartTime.getTime()) / 1000) : 0}
        playerNames={allPlayerNames}
        windRound="east"
        gameRound={1}
        selectedPatternsCount={0}
        findAlternativePatterns={findAlternativePatterns}
        onNavigateToCharleston={() => {}}
        nextPlayer={getNextPlayerName()}
        currentHand={playerTiles}
        lastDrawnTile={null}
        exposedTiles={[]}
        selectedDiscardTile={null}
        isMyTurn={true}
        isAnalyzing={isAnalyzing}
        handleDrawTile={handleDrawTile}
        handleDiscardTile={handleSelectTile}
        discardPile={mockDiscardPile}
        currentPlayerIndex={0}
        playerExposedCount={{}}
        gameHistory={mockGameHistory}
        currentAnalysis={currentAnalysis}
      />

      {/* Multiplayer Status Display */}
      {isMultiplayerMode && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-blue-900">
              {charlestonSelectors.phaseDisplayName}
            </h3>
            <div className="text-sm text-blue-700">
              {charlestonSelectors.readyPlayerCount} / {charlestonSelectors.totalPlayers} Ready
            </div>
          </div>
          
          {/* Player readiness indicators */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {Array.from({ length: charlestonSelectors.totalPlayers }, (_, index) => {
              const playerId = `player-${index}`
              const isReady = charlestonStore.playerReadiness[playerId] || false
              const isCurrentPlayer = playerId === multiplayerStore.currentPlayerId
              
              return (
                <div
                  key={playerId}
                  className={`p-2 rounded text-center text-sm ${
                    isReady 
                      ? 'bg-green-100 text-green-800 border border-green-300' 
                      : 'bg-gray-100 text-gray-600 border border-gray-300'
                  } ${
                    isCurrentPlayer ? 'ring-2 ring-blue-400' : ''
                  }`}
                >
                  <div className="font-medium">
                    {isCurrentPlayer ? 'You' : `Player ${index + 1}`}
                  </div>
                  <div className="text-xs mt-1">
                    {isReady ? '✓ Ready' : 'Selecting...'}
                  </div>
                </div>
              )
            })}
          </div>
          
          {/* Status message */}
          {allPlayersReady ? (
            <div className="text-center text-green-700 font-medium">
              🎉 All players ready! Exchanging tiles...
            </div>
          ) : isReadyToPass ? (
            <div className="text-center text-blue-700">
              ⏳ Waiting for other players to select their tiles...
            </div>
          ) : (
            <div className="text-center text-gray-700">
              Select 3 tiles to pass, then click "Mark Ready"
            </div>
          )}
        </div>
      )}

      {/* Selection Area for Charleston tile passing */}
      <SelectionArea 
        onPass={handleMarkReady} 
        isReadyToPass={isReadyToPass}
        allPlayersReady={allPlayersReady}
      />

      {/* Charleston Progress with Undo functionality */}
      {charlestonPhase !== 'complete' && <CharlestonProgress />}

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
        requiredCount={charlestonPhase === 'complete' ? 1 : 3}
        context={charlestonPhase === 'complete' ? "gameplay" : "charleston"}
        initialTiles={tileModalMode === 'edit' ? newlyReceivedTiles : []}
      />
    </div>
  )
}