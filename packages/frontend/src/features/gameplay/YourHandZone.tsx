import React from 'react'
import { Button } from '../../ui-components/Button'
import { Card } from '../../ui-components/Card'
import { LoadingSpinner } from '../../ui-components/LoadingSpinner'
import { AnimatedTile } from '../../ui-components/tiles/AnimatedTile'
import type { PlayerTile } from 'shared-types'
import type { Tile } from 'shared-types'
import { useTileStore } from '../../stores/tile-store'
import { tileService } from '../../lib/services/tile-service'

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
      pattern: any
      expandedTiles?: string[]
      isPrimary: boolean
    }>
  } | null
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
  currentAnalysis
}) => {
  const { selectedForAction, moveToSelection, returnFromSelection } = useTileStore()
  const isCharleston = gamePhase === 'charleston'
  
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
    
    const recommendation = getTileRecommendation(tileId)
    if (!recommendation) return ''
    
    const action = isCharleston ? 
      (recommendation.action === 'keep' ? 'keep' : recommendation.action === 'pass' ? 'pass' : null) :
      (recommendation.action === 'keep' ? 'keep' : recommendation.action === 'discard' ? 'discard' : null)
    
    // For Charleston, only highlight green if tile is actually in the primary pattern
    const isInPrimaryPattern = () => {
      if (!isCharleston || !currentAnalysis?.recommendedPatterns) return true
      
      const primaryPattern = currentAnalysis.recommendedPatterns.find(p => p.isPrimary)
      if (!primaryPattern?.expandedTiles) return true // Fallback to old behavior if no expanded tiles
      
      // Check if the tile ID exists in the primary pattern's expanded tiles
      return primaryPattern.expandedTiles.includes(tileId)
    }
    
    switch (action) {
      case 'keep':
        // Only show green if tile is actually needed for the primary pattern
        return isInPrimaryPattern() 
          ? 'shadow-[0_0_0_2px_rgba(34,197,94,0.6),0_0_8px_rgba(34,197,94,0.3)]' // Green glow for tiles in primary pattern
          : '' // No highlighting for tiles not in pattern
      case 'pass':
        return 'shadow-[0_0_0_2px_rgba(239,68,68,0.6),0_0_8px_rgba(239,68,68,0.3)]' // Red glow for pass
      case 'discard':
        return 'shadow-[0_0_0_2px_rgba(239,68,68,0.6),0_0_8px_rgba(239,68,68,0.3)]' // Red glow for discard
      default:
        return ''
    }
  }
  
  
  const handleTileClick = (tile: PlayerTile) => {
    const instanceId = tile.instanceId
    
    if (isCharleston) {
      // Charleston mode: toggle selection for passing
      const isSelected = selectedForAction.some(t => t.instanceId === instanceId)
      
      if (isSelected) {
        returnFromSelection(instanceId)
      } else if (selectedForAction.length < 3) {
        moveToSelection(instanceId)
      }
    } else {
      // Gameplay mode: discard tile - convert PlayerTile to Tile
      const tileForDiscard: Tile = {
        id: tile.id,
        suit: tile.suit,
        value: tile.value,
                                                        displayName: tile.id,
        unicodeSymbol: tile.unicodeSymbol
      }
      handleDiscardTile(tileForDiscard)
    }
  }

  return (
    <Card className="p-4 mb-4 md:col-span-2 xl:col-span-2">
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
          <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg min-h-16">
            {sortedCurrentHand.length > 0 ? sortedCurrentHand.map((tile) => {
              const isSelected = isCharleston 
                ? selectedForAction.some(t => t.instanceId === tile.instanceId)
                : selectedDiscardTile?.id === tile.id
              
              const highlightClass = getTileHighlightClass(tile.id, isSelected)
              
              const updatedTile: PlayerTile = {
                ...tile,
                isSelected
              }
              
              return (
                <AnimatedTile
                  key={tile.instanceId}
                  tile={updatedTile}
                  size="md"
                  onClick={(clickedTile) => isMyTurn && handleTileClick(clickedTile)}
                  className={`cursor-pointer hover:scale-105 transition-transform min-w-12 min-h-16 ${highlightClass}`}
                  context={isCharleston ? "charleston" : "gameplay"}
                />
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
                size="md"
                onClick={() => isMyTurn && handleDiscardTile(lastDrawnTile)}
                className="cursor-pointer hover:scale-105 transition-transform ring-2 ring-blue-400 min-w-12 min-h-16"
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
                      size="md"
                      className="pointer-events-none min-w-12 min-h-16"
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