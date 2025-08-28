// Hand Display Component
// Shows current tiles with management and animation features

import { Card } from '../../ui-components/Card'
import { Button } from '../../ui-components/Button'
import { AnimatedTile } from '../../ui-components/tiles/AnimatedTile'
import { useTileStore, useIntelligenceStore } from '../../stores'
import { getTileStateClass } from '../gameplay/TileStates'
import type { PlayerTile, TileRecommendation } from '../../types/tile-types'

interface HandDisplayProps {
  showRecommendations?: boolean
  allowReordering?: boolean
  compactMode?: boolean
}

export const HandDisplay = ({ 
  showRecommendations = true, 
  allowReordering = true,
  compactMode = false 
}: HandDisplayProps) => {
  const {
    playerHand,
    validation,
    sortBy,
    dealerHand,
    removeTile,
    setSortBy,
    getTileGroups,
    moveToSelection,
    returnFromSelection,
    clearSelection,
    selectedForAction,
    tileStates
  } = useTileStore()
  
  // Get AI recommendations for highlighting
  const { currentAnalysis } = useIntelligenceStore()
  
  // Create lookup maps for highlighting
  const getTileHighlighting = (tile: PlayerTile): TileRecommendation | undefined => {
    if (!currentAnalysis || !showRecommendations) return undefined
    
    const matchingRec = currentAnalysis.tileRecommendations.find(rec => rec.tileId === tile.id)
    
    if (!matchingRec) return undefined
    
    // Assign a priority based on the action for the TileRecommendation type
    let priority = 0
    switch (matchingRec.action) {
      case 'keep':
        priority = 100
        break
      case 'discard':
        priority = 50
        break
      case 'pass':
        priority = 25
        break
      default:
        priority = 0
        break
    }
    
    return {
      ...matchingRec,
      priority,
      confidence: matchingRec.confidence || 85,
      reasoning: matchingRec.reasoning || ''
    }
  }
  
  const handleTileClick = (tile: PlayerTile) => {
    // If tile is locked, don't allow interaction
    if (tileStates[tile.instanceId] === 'locked') return
    
    const currentState = tileStates[tile.instanceId]
    
    if (currentState === 'placeholder') {
      // Placeholder clicked - return tile from selection area
      returnFromSelection(tile.instanceId)
    } else {
      // Normal tile clicked - move to selection area (creates placeholder)
      moveToSelection(tile.instanceId)
    }
  }
  
  const handleSelectionAreaTileClick = (tile: PlayerTile) => {
    // Selection area tile clicked - return to original position
    returnFromSelection(tile.instanceId)
  }
  
  const handleDeleteTile = (tile: PlayerTile) => {
    // Remove from both selection area and hand completely
    removeTile(tile.instanceId)
  }
  
  
  const getHandSummary = () => {
    const expected = dealerHand ? 14 : 13
    const current = playerHand.length
    const status = validation.isValid ? '✅' : '❌'
    
    return `${status} ${current}/${expected} tiles${selectedForAction.length > 0 ? ` (${selectedForAction.length} in selection)` : ''}`
  }
  
  const renderTileGroups = () => {
    const groups = getTileGroups()
    const nonEmptyGroups = Object.entries(groups).filter(([, tiles]) => tiles.length > 0)
    
    return (
      <div className="space-y-4">
        {nonEmptyGroups.map(([suit, tiles]) => (
          <div key={suit} className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 capitalize flex items-center gap-2">
              <span>{suit}</span>
              <span className="text-xs text-gray-500">({tiles.length})</span>
            </h4>
            <div className="flex flex-wrap gap-4">
              {tiles.map(tile => {
                const recommendation = getTileHighlighting(tile)
                return (
                  <div key={tile.instanceId} className="relative group">
                    {tileStates[tile.instanceId] === 'placeholder' ? (
                      // Show placeholder with tile ID
                      <div className={`${getTileStateClass('placeholder')} rounded-lg flex flex-col items-center justify-center text-xs font-medium text-gray-600 bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300`} style={{ width: '52px', height: '69px' }}>
                        <div className="text-[10px] opacity-75">Tile</div>
                        <div className="font-bold">{tile.id}</div>
                        <div className="text-[8px] opacity-50">Selected</div>
                      </div>
                    ) : (
                      <AnimatedTile
                        tile={{ ...tile, recommendation }}
                        size={compactMode ? 'sm' : 'md'}
                        onClick={handleTileClick}
                        animateOnSelect={true}
                        context="selection"
                        recommendationType={recommendation?.action as 'keep' | 'pass' | 'discard'}
                        className={`${tileStates[tile.instanceId] ? getTileStateClass(tileStates[tile.instanceId] as 'primary' | 'selected' | 'exposed' | 'locked' | 'placeholder') : 'hover:ring-2 hover:ring-blue-300 transition-all cursor-pointer'} ${tileStates[tile.instanceId] === 'locked' ? 'cursor-not-allowed' : ''}`}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    )
  }
  
  const renderTileList = () => {
    return (
      <div className="flex flex-wrap gap-4">
        {playerHand.map(tile => {
          const recommendation = getTileHighlighting(tile)
          return (
            <div key={tile.instanceId} className="relative group">
              {tileStates[tile.instanceId] === 'placeholder' ? (
                // Show placeholder with tile ID
                <div className={`${getTileStateClass('placeholder')} rounded-lg flex flex-col items-center justify-center text-xs font-medium text-gray-600 bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300`} style={{ width: '52px', height: '69px' }}>
                  <div className="text-[10px] opacity-75">Tile</div>
                  <div className="font-bold">{tile.id}</div>
                  <div className="text-[8px] opacity-50">Selected</div>
                </div>
              ) : (
                <AnimatedTile
                  tile={{ ...tile, recommendation }}
                  size={compactMode ? 'sm' : 'md'}
                  onClick={handleTileClick}
                  animateOnSelect={true}
                  context="selection"
                  recommendationType={recommendation?.action as 'keep' | 'pass' | 'discard'}
                  className={`${tileStates[tile.instanceId] ? getTileStateClass(tileStates[tile.instanceId] as 'primary' | 'selected' | 'exposed' | 'locked' | 'placeholder') : 'hover:ring-2 hover:ring-blue-300 transition-all cursor-pointer'} ${tileStates[tile.instanceId] === 'locked' ? 'cursor-not-allowed' : ''}`}
                />
              )}
            </div>
          )
        })}
      </div>
    )
  }
  
  if (playerHand.length === 0) {
    return (
      <Card variant="default" className="p-8">
        <div className="text-center text-gray-500 space-y-4">
          <div className="text-6xl">🀫</div>
          <h3 className="text-lg font-semibold">No Tiles Yet</h3>
          <p className="text-sm">
            Add tiles to your hand using the selector above.
            {dealerHand ? ' You need 14 tiles as dealer.' : ' You need 13 tiles as player.'}
          </p>
        </div>
      </Card>
    )
  }
  
  return (
    <Card variant="elevated" className="p-3 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-gray-900">
              Your Hand
            </h3>
            <p className="text-sm text-gray-600">
              {getHandSummary()}
            </p>
            {playerHand.length > 0 && (
              <p className="text-xs text-gray-500">
                💡 Click tiles to move to selection area
              </p>
            )}
          </div>
          
          {selectedForAction.length > 0 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelection}
                className="text-gray-600"
              >
                Clear ({selectedForAction.length})
              </Button>
            </div>
          )}
        </div>
        
        {/* Sort Controls */}
        {allowReordering && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-600 whitespace-nowrap">Sort By:</span>
            <div className="flex gap-2 flex-wrap">
              {(['suit', 'recommendation'] as const).map(sort => (
                <Button
                  key={sort}
                  variant={sortBy === sort ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setSortBy(sort)}
                  className="min-w-0"
                >
                  {sort === 'suit' && '🎨'}
                  {sort === 'recommendation' && '🧠'}
                  <span className="ml-1 capitalize text-xs whitespace-nowrap">{sort}</span>
                </Button>
              ))}
            </div>
          </div>
        )}
        
        {/* Validation Feedback */}
        {!validation.isValid && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="text-red-500 text-sm">⚠️</span>
              <div className="text-sm">
                <div className="font-medium text-red-800">Hand Issues:</div>
                <ul className="mt-1 list-disc list-inside text-red-700">
                  {validation.errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
                {validation.warnings.length > 0 && (
                  <div className="mt-2">
                    <div className="font-medium text-yellow-800">Warnings:</div>
                    <ul className="mt-1 list-disc list-inside text-yellow-700">
                      {validation.warnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      
      {/* Tiles Display */}
      <div>
        {sortBy === 'suit' ? renderTileGroups() : renderTileList()}
      </div>
    </Card>
  )
}