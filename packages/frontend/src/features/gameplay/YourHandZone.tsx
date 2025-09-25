import React from 'react'
import { Button } from '../../ui-components/Button'
import { Card } from '../../ui-components/Card'
import { LoadingSpinner } from '../../ui-components/LoadingSpinner'
import { AnimatedTile } from '../../ui-components/tiles/AnimatedTile'
import { TilePlaceholder } from '../../ui-components/TilePlaceholder'
import { TileLockBadge } from '../../ui-components/TileLockBadge'
import type { PlayerTile, Tile, PatternSelectionOption } from 'shared-types'
import { useTileStore } from '../../stores/tile-store'
import { tileService } from '../../lib/services/tile-service'
import { getTileStateClass } from './TileStates'
import { useTileInteraction } from '../../hooks/useTileInteraction'

interface YourHandZoneProps {
  currentHand: PlayerTile[]
  lastDrawnTile: Tile | null
  exposedTiles: Array<{
    type: 'pung' | 'kong' | 'quint' | 'sextet'
    tiles: Tile[]
    timestamp: Date
  }>
  selectedDiscardTile: Tile | null
  isMyTurn: boolean
  isAnalyzing: boolean
  handleDrawTile: () => void
  handleDiscardTile: (tile: Tile) => void
  gamePhase: 'charleston' | 'gameplay'
  onAdvanceToGameplay?: () => void
  currentAnalysis?: {
    tileRecommendations?: Array<{
      tileId: string
      action: 'keep' | 'pass' | 'discard' | 'neutral'
      confidence: number
      reasoning: string
    }>
    recommendedPatterns?: Array<{
      pattern: PatternSelectionOption
      expandedTiles?: string[]
      isPrimary: boolean
    }>
  } | null
  playingPatternIds?: string[]
}

const YourHandZone: React.FC<YourHandZoneProps> = ({
  currentHand,
  lastDrawnTile,
  exposedTiles,
  selectedDiscardTile,
  isMyTurn,
  isAnalyzing,
  handleDrawTile,
  handleDiscardTile,
  gamePhase,
  currentAnalysis,
  playingPatternIds = []
}) => {
  const { selectedForAction, tileStates } = useTileStore()
  const isCharleston = gamePhase === 'charleston'
  const { handleTileClick } = useTileInteraction(isCharleston ? 'charleston' : 'gameplay')

  // Find all currently playing patterns for green highlighting
  const playingPatterns = playingPatternIds
    .map(id => currentAnalysis?.recommendedPatterns?.find(p => p.pattern.id === id))
    .filter(Boolean) as Array<{ expandedTiles?: string[]; pattern: PatternSelectionOption }>


  // Get tiles that match any of the playing patterns for green highlighting
  const getMatchingTiles = (pattern: { expandedTiles?: string[] }): string[] => {
    if (!pattern?.expandedTiles || pattern.expandedTiles.length !== 14) {
      return []
    }
    return pattern.expandedTiles
  }

  // Combine all tiles from all playing patterns
  const playingPatternTiles = playingPatterns
    .flatMap(pattern => getMatchingTiles(pattern))
    .filter((tile, index, array) => array.indexOf(tile) === index) // Remove duplicates

  
  // Sort hand tiles using same logic as tile input page
  const sortedCurrentHand = tileService.sortTiles([...currentHand])
  
  // Get tile recommendations for highlighting
  const getTileRecommendation = (tileId: string) => {
    if (!currentAnalysis?.tileRecommendations) return null
    return currentAnalysis.tileRecommendations.find(rec => rec.tileId === tileId)
  }
  
  // Get tile highlighting class based on recommendation and pattern matching
  const getTileHighlightClass = (tileId: string, isSelected: boolean) => {
    if (isSelected) return '' // Let selection styling take precedence

    // Check if this tile matches any position in the currently playing patterns (GREEN PRIORITY)
    const isInPlayingPattern = () => {
      if (!playingPatternTiles || playingPatternTiles.length === 0) return false
      // Check if this tile matches any position in any playing pattern
      return playingPatternTiles.some(patternTile => patternTile === tileId)
    }

    // GREEN HIGHLIGHTING TAKES PRIORITY - if tile is needed for any playing pattern, always show green
    if (isInPlayingPattern()) {
      return 'shadow-[0_0_0_1px_rgba(34,197,94,0.8),0_0_3px_rgba(34,197,94,0.6),0_0_6px_rgba(34,197,94,0.4)] relative z-10' // Green multi-layer glow
    }

    // Only apply red highlighting if tile is NOT needed for any playing pattern
    const recommendation = getTileRecommendation(tileId)
    if (!recommendation) return ''

    const action = isCharleston ?
      (recommendation.action === 'pass' ? 'pass' : null) :
      (recommendation.action === 'discard' ? 'discard' : null)

    switch (action) {
      case 'pass':
      case 'discard':
        return 'shadow-[0_0_0_3px_rgba(239,68,68,0.9),0_0_6px_rgba(239,68,68,0.7),0_0_12px_rgba(239,68,68,0.5)] relative z-10' // Thicker red multi-layer glow
      default:
        return ''
    }
  }
  
  

  return (
    <Card className="p-2 sm:p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Your Hand</h3>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            onClick={handleDrawTile}
            disabled={gamePhase === 'charleston' || !isMyTurn || !!lastDrawnTile}
            className="bg-green-600 hover:bg-green-700"
          >
            🎲 Draw Tile
          </Button>
          {isAnalyzing && <LoadingSpinner size="sm" />}
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Concealed Hand */}
        <div>
          <div className="text-sm text-gray-600 mb-2">Concealed ({sortedCurrentHand.length} tiles)</div>
          <div className="grid grid-cols-5 sm:grid-cols-7 gap-1 sm:gap-2 p-2 sm:p-3 bg-gray-50 rounded-lg min-h-16">
            {sortedCurrentHand.length > 0 ? sortedCurrentHand.map((tile) => {
              const isSelected = isCharleston
                ? selectedForAction.some(t => t.instanceId === tile.instanceId)
                : selectedDiscardTile?.id === tile.id

              const highlightClass = getTileHighlightClass(tile.id, isSelected)
              const tileState = tileStates[tile.instanceId]
              const isLocked = tileState === 'locked'
              const isPlaceholder = tileState === 'placeholder'

              const updatedTile: PlayerTile = {
                ...tile,
                isSelected
              }

              return (
                <div key={tile.instanceId} className="relative group flex justify-center items-center">
                  {isPlaceholder ? (
                    <TilePlaceholder tile={tile} />
                  ) : (
                    <>
                      <div className={`w-[52px] h-[69px] ${highlightClass} ${tileState ? getTileStateClass(tileState as 'primary' | 'selected' | 'exposed' | 'locked' | 'placeholder') : ''}`}>
                        <AnimatedTile
                          tile={updatedTile}
                          size="sm"
                          onClick={(clickedTile) => {
                            // In Charleston mode, always allow tile selection regardless of turn
                            // In gameplay mode, only allow if it's my turn (consistent with button logic)
                            if (isCharleston || (gamePhase === 'gameplay' && isMyTurn)) {
                              handleTileClick(clickedTile)
                            }
                          }}
                          className="cursor-pointer hover:scale-105 transition-transform"
                          context={isCharleston ? "charleston" : "gameplay"}
                        />
                      </div>
                      <TileLockBadge isLocked={isLocked} />
                    </>
                  )}
                </div>
              )
            }) : (
              <div className="text-gray-400 text-sm flex items-center justify-center w-full py-4">
                No tiles in hand - click "Draw Tile" to start
              </div>
            )}
          </div>
        </div>


        {/* Drawn Tile */}
        {lastDrawnTile && (
          <div>
            <div className="text-sm text-gray-600 mb-2">Just Drawn</div>
            <div className="flex gap-2 p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
              <AnimatedTile
                tile={{...lastDrawnTile, instanceId: lastDrawnTile.id, isSelected: false}}
                size="sm"
                onClick={() => isMyTurn && handleDiscardTile(lastDrawnTile)}
                className="cursor-pointer hover:scale-105 transition-transform ring-2 ring-blue-400"
                context="gameplay"
              />
              <div className="text-sm text-blue-600 flex items-center">
                Click to discard or keep in hand
              </div>
            </div>
          </div>
        )}

        {/* Exposed Sets */}
        {exposedTiles.length > 0 && (
          <div>
            <div className="text-sm text-gray-600 mb-2">Exposed Sets ({exposedTiles.length})</div>
            <div className="space-y-2">
              {exposedTiles.map((set, index) => (
                <div key={index} className="flex gap-1 p-2 bg-purple-50 rounded border-l-4 border-purple-400">
                  <span className="text-xs text-purple-600 font-medium mr-2">
                    {set.type.toUpperCase()}:
                  </span>
                  {set.tiles.map((tile, tileIndex) => (
                    <AnimatedTile
                      key={tileIndex}
                      tile={{...tile, instanceId: tile.id, isSelected: false}}
                      size="sm"
                      className="pointer-events-none"
                      context="gameplay"
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

export default YourHandZone