// Hand Display Component
// Shows current tiles with management and animation features

// import { useState } from 'react'
import { Card } from '../../ui-components/Card'
import { Button } from '../../ui-components/Button'
import { Tile } from '../../ui-components/Tile'
import { useTileStore, useAnimationsEnabled, useIntelligenceStore } from '../../stores'
import type { PlayerTile } from '../../types/tile-types'

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
  // const [draggedTile, setDraggedTile] = useState<PlayerTile | null>(null)
  const animationsEnabled = useAnimationsEnabled()
  
  const {
    playerHand,
    selectedCount,
    validation,
    sortBy,
    // recommendations,
    dealerHand,
    toggleTileSelection,
    removeTile,
    selectAll,
    deselectAll,
    setSortBy,
    // sortHand,
    triggerTileAnimation,
    getTileGroups
  } = useTileStore()
  
  // Get AI recommendations for highlighting
  const { currentAnalysis } = useIntelligenceStore()
  
  // Create lookup maps for highlighting
  const getTileHighlighting = (tile: PlayerTile) => {
    if (!currentAnalysis || !showRecommendations) return null
    
    const recommendations = currentAnalysis.tileRecommendations
    const matchingRec = recommendations.find(rec => rec.tileId === tile.id)
    
    if (!matchingRec) return null
    
    switch (matchingRec.action) {
      case 'pass':
      case 'discard':
        return { type: 'danger', reason: 'Recommended to pass/discard' }
      case 'keep':
        return { type: 'success', reason: 'Recommended to keep' }
      default:
        return null
    }
  }
  
  const handleTileClick = (tile: PlayerTile) => {
    toggleTileSelection(tile.instanceId)
    
    if (animationsEnabled) {
      triggerTileAnimation(tile.instanceId, {
        type: tile.isSelected ? 'deselect' : 'select',
        duration: 300
      })
    }
  }
  
  const handleTileDoubleClick = (tile: PlayerTile) => {
    // Double-click to remove
    if (animationsEnabled) {
      triggerTileAnimation(tile.instanceId, {
        type: 'pass',
        duration: 400
      })
      
      setTimeout(() => {
        removeTile(tile.instanceId)
      }, 200)
    } else {
      removeTile(tile.instanceId)
    }
  }
  
  const handleTileLongPress = (tile: PlayerTile) => {
    // Long press for special actions - show recommendation animation
    if (animationsEnabled) {
      triggerTileAnimation(tile.instanceId, {
        type: 'joker',
        duration: 1000
      })
    }
  }
  
  const getHandSummary = () => {
    const expected = dealerHand ? 14 : 13
    const current = playerHand.length
    const status = validation.isValid ? '✅' : '❌'
    
    return `${status} ${current}/${expected} tiles${selectedCount > 0 ? ` (${selectedCount} selected)` : ''}`
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
            <div className="flex flex-wrap gap-2">
              {tiles.map(tile => {
                const highlighting = getTileHighlighting(tile)
                const tileWithRecommendation = {
                  ...tile,
                  recommendation: highlighting ? {
                    action: highlighting.type === 'danger' ? 
                      (currentAnalysis?.tileRecommendations.find(rec => rec.tileId === tile.id)?.action || 'discard') : 
                      'keep',
                    confidence: 85,
                    reasoning: highlighting.reason
                  } : undefined
                }
                
                return (
                  <Tile
                    key={tile.instanceId}
                    tile={tileWithRecommendation}
                    size={compactMode ? 'sm' : 'md'}
                    showRecommendation={false}
                    onClick={handleTileClick}
                    onDoubleClick={handleTileDoubleClick}
                    onLongPress={handleTileLongPress}
                  />
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
      <div className="flex flex-wrap gap-2">
        {playerHand.map(tile => {
          const highlighting = getTileHighlighting(tile)
          const tileWithRecommendation = {
            ...tile,
            recommendation: highlighting ? {
              action: highlighting.type === 'danger' ? 
                (currentAnalysis?.tileRecommendations.find(rec => rec.tileId === tile.id)?.action || 'discard') : 
                'keep',
              confidence: 85,
              reasoning: highlighting.reason
            } : undefined
          }
          
          return (
            <Tile
              key={tile.instanceId}
              tile={tileWithRecommendation}
              size={compactMode ? 'sm' : 'md'}
              showRecommendation={false}
              onClick={handleTileClick}
              onDoubleClick={handleTileDoubleClick}
              onLongPress={handleTileLongPress}
            />
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
    <Card variant="elevated" className="space-y-4">
      <div className="p-4 pb-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-gray-900">
              Your Hand
            </h3>
            <p className="text-sm text-gray-600">
              {getHandSummary()}
            </p>
          </div>
          
          <div className="flex gap-2">
            {/* Selection Controls */}
            {selectedCount > 0 && (
              <Button variant="ghost" size="sm" onClick={deselectAll}>
                Clear ({selectedCount})
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={selectedCount === playerHand.length ? deselectAll : selectAll}
            >
              {selectedCount === playerHand.length ? 'None' : 'All'}
            </Button>
          </div>
        </div>
        
        {/* Sort Controls */}
        {allowReordering && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-sm text-gray-600 whitespace-nowrap">Sort:</span>
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
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
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
      </div>
      
      {/* Tiles Display */}
      <div className="p-4 pt-0">
        {sortBy === 'suit' ? renderTileGroups() : renderTileList()}
      </div>
      
      {/* Quick Actions */}
      {!compactMode && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-200">
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="text-gray-600">💡 Tips:</span>
            <span className="text-gray-500">Click to select</span>
            <span className="text-gray-500">•</span>
            <span className="text-gray-500">Double-click to remove</span>
            <span className="text-gray-500">•</span>
            <span className="text-gray-500">Long-press for recommendations</span>
          </div>
        </div>
      )}
    </Card>
  )
}