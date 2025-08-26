// Charleston View - Enhanced intelligence interface for tile passing
// Based on intelligence panel with full tile display and auto-selected discards

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIntelligenceStore } from '../../stores/intelligence-store'
import { usePatternStore } from '../../stores/pattern-store'
import { useTileStore } from '../../stores/tile-store'
import { useRoomStore } from '../../stores/room-store'
import { PrimaryAnalysisCard } from '../intelligence-panel/PrimaryAnalysisCard'
import { AdvancedPatternAnalysis } from '../intelligence-panel/AdvancedPatternAnalysis'
import { LoadingSpinner } from '../../ui-components/LoadingSpinner'
import { Container } from '../../ui-components/layout/Container'
import { Card } from '../../ui-components/Card'
import { Button } from '../../ui-components/Button'
import { AnimatedTile } from '../../ui-components/tiles/AnimatedTile'
import { tileService } from '../../services/tile-service'
import { AnalysisEngine } from '../../services/analysis-engine'
import type { Tile as TileType } from '../../types/tile-types'

interface TileSelectorProps {
  availableTiles: TileType[]
  selectedTiles: string[]
  onTileSelect: (tileId: string) => void
}

const TileSelector: React.FC<TileSelectorProps> = ({ availableTiles, selectedTiles, onTileSelect }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Select 3 tiles you received:</h3>
      <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-9 gap-4">
        {availableTiles.map((tile, index) => (
          <div key={`${tile.id}-selector-${index}`} style={{ width: '52px', height: '69px', position: 'relative' }}>
            <AnimatedTile
              tile={{...tile, instanceId: `${tile.id}-selector-${index}`, isSelected: selectedTiles.includes(tile.id)}}
              size="md"
              onClick={() => onTileSelect(tile.id)}
              className={`cursor-pointer transition-transform duration-200 ${
                selectedTiles.includes(tile.id) 
                  ? 'ring-2 ring-blue-500 scale-105' 
                  : 'hover:scale-110'
              }`}
              animateOnSelect={true}
              context="selection"
            />
          </div>
        ))}
      </div>
      <p className="text-sm text-gray-600">
        Selected: {selectedTiles.length}/3 tiles
      </p>
    </div>
  )
}

export function CharlestonView() {
  const navigate = useNavigate()
  const { currentAnalysis, isAnalyzing, analyzeHand } = useIntelligenceStore()
  const { getTargetPatterns } = usePatternStore()
  const { playerHand = [], setPlayerHand } = useTileStore()
  const { coPilotMode } = useRoomStore()
  
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
  const [showTileSelector, setShowTileSelector] = useState(false)
  const [selectedReceivedTiles, setSelectedReceivedTiles] = useState<string[]>([])
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
      setPlayerHand(storePlayerTiles)
      
      // Reset selection state
      setSelectedTilesToPass([])
      setIsReadyToPass(false)
      setAllPlayersReady(false)
    }
  }, [gameStateHistory, setPlayerHand])

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
      // In solo mode, show tile selector for received tiles
      setShowTileSelector(true)
    } else {
      // In multiplayer mode, tiles will be received from other players via websockets
      setCurrentHand(remainingTiles)
      // Update tile store with remaining tiles
      const playerTilesRemaining = remainingTiles
        .map(tile => tileService.createPlayerTile(tile.id))
        .filter((tile): tile is NonNullable<typeof tile> => tile !== null)
      setPlayerHand(playerTilesRemaining)
      // Note: When multiplayer receives tiles, it should also trigger re-analysis and phase advancement
      // This will be handled by the websocket event listeners
    }
    
    // Reset passing state for next round
    setSelectedTilesToPass([])
    setIsReadyToPass(false)
    setAllPlayersReady(false)
  }, [currentHand, selectedTilesToPass, coPilotMode, charlestonPhase])

  // Handle ready to pass
  const handleReadyToPass = useCallback(() => {
    if (selectedTilesToPass.length !== 3) return
    
    setIsReadyToPass(true)
    
    // Mock: simulate all players becoming ready after a delay
    setTimeout(() => {
      setAllPlayersReady(true)
      // Simulate tile passing
      setTimeout(() => {
        handleTilePassing()
      }, 1000)
    }, 2000)
  }, [selectedTilesToPass.length, handleTilePassing])

  // Handle tile selector for solo mode
  const handleReceivedTileSelect = useCallback((tileId: string) => {
    setSelectedReceivedTiles(current => {
      if (current.includes(tileId)) {
        return current.filter(id => id !== tileId)
      } else if (current.length < 3) {
        return [...current, tileId]
      } else {
        return [tileId, ...current.slice(1)]
      }
    })
  }, [])

  const handleConfirmReceivedTiles = useCallback(async () => {
    if (selectedReceivedTiles.length !== 3) return
    
    // Save state before making changes (for undo)
    saveGameState()
    
    // Remove passed tiles and add selected received tiles using tile service
    const remainingTiles = currentHand.filter(tile => !selectedTilesToPass.includes(tile.id))
    const receivedTiles = selectedReceivedTiles
      .map(tileId => tileService.getTileById(tileId))
      .filter(tile => tile !== undefined) as TileType[]
    
    const unsortedNewHand = [...remainingTiles, ...receivedTiles]
    const newHand = sortTilesAlphabetically(unsortedNewHand)
    
    setNewlyReceivedTiles(selectedReceivedTiles)
    setCurrentHand(newHand)
    setShowTileSelector(false)
    setSelectedReceivedTiles([])
    
    // Update the tile store so PrimaryAnalysisCard gets the correct tiles
    const storePlayerTiles = newHand
      .map(tile => tileService.createPlayerTile(tile.id))
      .filter((tile): tile is NonNullable<typeof tile> => tile !== null)
    setPlayerHand(storePlayerTiles)
    
    // Re-run all 3 engines with the new hand and updated game context
    const selectedPatterns = getTargetPatterns()
    
    // Create game context with tile tracking information
    const gameContext = {
      currentPhase: 'charleston' as const,
      wallTilesRemaining: 152 - tilesPassedOut.length - 3, // Standard wall minus passed tiles minus received tiles
      discardPile: [], // No discards yet in Charleston
      exposedTiles: knownOpponentTiles, // Tiles we know are in opponent hands
      playerHands: { 'current': newHand.length }
    }
    
    // Use AnalysisEngine directly with game context instead of intelligence store
    const analysisPlayerTiles = newHand.map(tile => tileService.createPlayerTile(tile.id)).filter(Boolean)
    const analysis = await AnalysisEngine.analyzeHand(analysisPlayerTiles, selectedPatterns, gameContext)
    
    // Update intelligence store with the new analysis
    // This is a bit of a hack but ensures the UI components get the updated data
    await analyzeHand(newHand, selectedPatterns)
    
    // Advance Charleston phase
    const nextPhase = charlestonPhase === 'right' ? 'across' : charlestonPhase === 'across' ? 'left' : 'complete'
    setCharlestonPhase(nextPhase)
    
    // If Charleston is complete, navigate to game mode
    if (nextPhase === 'complete') {
      setTimeout(() => {
        navigate('/game')
      }, 2000)
    }
    
    // Clear rings after a few seconds
    setTimeout(() => {
      setNewlyReceivedTiles([])
    }, 3000)
  }, [currentHand, selectedTilesToPass, selectedReceivedTiles, getTargetPatterns, analyzeHand, charlestonPhase, navigate, tilesPassedOut, knownOpponentTiles, saveGameState])

  return (
    <div className="min-h-screen bg-gray-50 w-full overflow-x-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <Container size="full" padding="sm" center={true}>
          <div className="flex items-center justify-between w-full">
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
                🔄 Charleston - Pass {charlestonPhase === 'right' ? 'Right' : charlestonPhase === 'across' ? 'Across' : charlestonPhase === 'left' ? 'Left' : 'Complete'}
              </h1>
              <p className="text-gray-600 text-xs sm:text-sm">
                {charlestonPhase === 'complete' 
                  ? 'Charleston complete! Proceeding to game...' 
                  : `Pass 3 tiles ${charlestonPhase} based on AI recommendations`}
              </p>
            </div>
            
            {/* Undo Button */}
            {gameStateHistory.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleUndo}
                className="flex items-center gap-2"
              >
                ↶ Undo
              </Button>
            )}
          </div>
        </Container>
      </div>

      {/* Main Content */}
      <Container size="full" padding="sm" center={true}>
        <div className="space-y-6">
          
          {/* Your Hand Section - Same as tile input page */}
          <Card variant="elevated" className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-gray-900">Your Hand</h3>
                <p className="text-sm text-gray-600">
                  {currentHand.length} tiles • Selected to pass: {selectedTilesToPass.length}/3
                </p>
                <p className="text-xs text-gray-500">
                  💡 Click tiles to select for passing
                </p>
              </div>
              {isAnalyzing && <LoadingSpinner size="sm" />}
            </div>
            
            <div className="flex flex-wrap gap-4">
              {currentHand.length > 0 ? currentHand.map((tile, index) => {
                if (!tile || !tile.id) return null;
                
                return (
                  <div key={`${tile.id}-${index}`} className="relative group">
                    <AnimatedTile
                      tile={{
                        ...tile, 
                        instanceId: `${tile.id}-${index}`, 
                        isSelected: selectedTilesToPass.includes(tile.id)
                      }}
                      size="md"
                      onClick={() => handleTileSelect(tile.id)}
                      className={`transition-all ${
                        isReadyToPass 
                          ? 'opacity-75 cursor-not-allowed'
                          : 'hover:scale-110 cursor-pointer'
                      }`}
                      animateOnSelect={true}
                      context="selection"
                    />
                    {selectedTilesToPass.includes(tile.id) && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">✕</span>
                      </div>
                    )}
                    {newlyReceivedTiles.includes(tile.id) && (
                      <div className="absolute -top-2 -right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
                        <span className="text-white text-xs font-bold">★</span>
                      </div>
                    )}
                  </div>
                )
              }).filter(Boolean) : (
                <div className="text-gray-400 text-sm flex items-center justify-center w-full py-8">
                  No tiles available for Charleston
                </div>
              )}
            </div>
            
            <div className="flex justify-between items-center pt-3 border-t border-gray-200 text-sm text-gray-600">
              <span>Selected to pass: {selectedTilesToPass.length}/3 tiles</span>
              {selectedTilesToPass.length === 3 && !isReadyToPass && (
                <span className="text-green-600 font-medium">✓ Ready to confirm</span>
              )}
              {isReadyToPass && (
                <span className="text-blue-600 font-medium">⏳ Waiting for other players...</span>
              )}
            </div>
          </Card>

          {/* Primary Analysis Card */}
          {currentAnalysis && (
            <PrimaryAnalysisCard 
              analysis={currentAnalysis}
              currentPattern={currentAnalysis.recommendedPatterns[0] || null}
              onPatternSwitch={async (pattern) => {
                // Pattern switching logic (same as intelligence panel)
                console.log('Pattern switch:', pattern)
              }}
              onBrowseAllPatterns={() => {
                navigate('/patterns')
              }}
            />
          )}

          {/* Advanced Pattern Analysis */}
          {currentAnalysis && (
            <AdvancedPatternAnalysis
              analysis={currentAnalysis}
              playerTiles={currentHand.map(t => t.id)}
              gamePhase="charleston"
              onPatternSelect={async (patternId) => {
                console.log('Pattern select:', patternId)
              }}
            />
          )}

          {/* Action Button */}
          <div className="text-center">
            <div className="inline-flex flex-col items-center gap-4 p-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl">
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
                    <Button
                      onClick={handleReadyToPass}
                      disabled={selectedTilesToPass.length !== 3}
                      variant="primary"
                    >
                      Ready to Pass
                    </Button>
                  </>
                ) : allPlayersReady ? (
                  <>
                    <h3 className="text-lg font-semibold text-green-900 mb-1">
                      Passing Tiles...
                    </h3>
                    <p className="text-sm text-green-700 mb-4">
                      All players ready - tiles are being exchanged
                    </p>
                    <LoadingSpinner size="sm" />
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
            </div>
          </div>
        </div>
      </Container>

      {/* Solo Mode Tile Selector Modal */}
      {showTileSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="p-6 max-w-2xl w-full max-h-96 overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Select Tiles You Received</h3>
            
            <TileSelector
              availableTiles={tileService.getAllTiles()}
              selectedTiles={selectedReceivedTiles}
              onTileSelect={handleReceivedTileSelect}
            />

            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <Button 
                variant="outline"
                onClick={() => {
                  setShowTileSelector(false)
                  setSelectedReceivedTiles([])
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="primary"
                onClick={handleConfirmReceivedTiles}
                disabled={selectedReceivedTiles.length !== 3}
              >
                Confirm Received Tiles
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}