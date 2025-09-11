import React from 'react'
import { Button } from '../../ui-components/Button'
import { Card } from '../../ui-components/Card'
import { LoadingSpinner } from '../../ui-components/LoadingSpinner'
import { AnimatedTile } from '../../ui-components/tiles/AnimatedTile'
import type { PlayerTile, Tile as TileType } from '../../types/tile-types'
import { useTileStore } from '../../stores/tile-store'
import { tileService } from '../../lib/services/tile-service'

interface YourHandZoneProps {
  currentHand: PlayerTile[]
  lastDrawnTile: TileType | null
  exposedTiles: Array<{
    type: 'pung' | 'kong' | 'quint' | 'sextet'
    tiles: TileType[]
    timestamp: Date
  }>
  selectedDiscardTile: TileType | null
  isMyTurn: boolean
  isAnalyzing: boolean
  handleDrawTile: () => void
  handleDiscardTile: (tile: TileType) => void
  gamePhase: 'charleston' | 'gameplay'
  onAdvanceToGameplay?: () => void
  currentAnalysis?: {
    tileRecommendations?: Array<{
      tileId: string
      action: 'keep' | 'pass' | 'discard' | 'neutral'
      confidence: number
      reasoning: string
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
  
  // Get tile highlighting class based on recommendation
  const getTileHighlightClass = (tileId: string, isSelected: boolean) => {
    if (isSelected) return '' // Let selection styling take precedence
    
    const recommendation = getTileRecommendation(tileId)
    if (!recommendation) return ''
    
    const action = isCharleston ? 
      (recommendation.action === 'keep' ? 'keep' : recommendation.action === 'pass' ? 'pass' : null) :
      (recommendation.action === 'keep' ? 'keep' : recommendation.action === 'discard' ? 'discard' : null)
    
    switch (action) {
      case 'keep':
        return 'ring-2 ring-green-400 ring-opacity-60 bg-green-50' // Green for keep
      case 'pass':
        return 'ring-2 ring-orange-400 ring-opacity-60 bg-orange-50' // Orange for pass
      case 'discard':
        return 'ring-2 ring-red-400 ring-opacity-60 bg-red-50' // Red for discard
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
      // Gameplay mode: discard tile - convert PlayerTile to TileType
      const tileForDiscard: TileType = {
        id: tile.id,
        suit: tile.suit,
        value: tile.value,
        displayName: tile.displayName,
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
          <div className="flex flex-wrap gap-1 sm:gap-2 p-3 bg-gray-50 rounded-lg min-h-16">
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
                  onClick={() => isMyTurn && handleTileClick(tile)}
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