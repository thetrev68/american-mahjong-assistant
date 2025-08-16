// Hand Display Component
// Shows current tiles with management and animation features

// import { useState } from 'react'
import { Card } from '../../ui-components/Card'
import { Button } from '../../ui-components/Button'
import { AnimatedTile } from '../../ui-components/tiles/AnimatedTile'
import { useTileStore, useIntelligenceStore } from '../../stores'
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
    selectedCount,
    validation,
    sortBy,
    dealerHand,
    toggleTileSelection,
    removeTile,
    selectAll,
    deselectAll,
    setSortBy,
    getTileGroups
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
    toggleTileSelection(tile.instanceId)
  }
  
  const handleTileDoubleClick = (tile: PlayerTile) => {
    removeTile(tile.instanceId)
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
                const recommendation = getTileHighlighting(tile)
                return (
                  <div key={tile.instanceId} className="relative group">
                    <AnimatedTile
                      tile={{ ...tile, recommendation }}
                      size={compactMode ? 'sm' : 'md'}
                      onClick={handleTileClick}
                      onDoubleClick={handleTileDoubleClick}
                      animateOnSelect={true}
                      animateOnRecommendation={true}
                      context="selection"
                      recommendationType={recommendation?.action as 'keep' | 'pass' | 'discard'}
                    />
                    {/* Remove button that appears on hover/selection */}
                    {(tile.isSelected || false) && (
                      <button
                        onClick={() => removeTile(tile.instanceId)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs font-bold hover:bg-red-600 transition-all duration-200 flex items-center justify-center shadow-lg z-10"
                        title="Remove tile (or double-click)"
                      >
                        ×
                      </button>
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
      <div className="flex flex-wrap gap-2">
        {playerHand.map(tile => {
          const recommendation = getTileHighlighting(tile)
          return (
            <div key={tile.instanceId} className="relative group">
              <AnimatedTile
                tile={{ ...tile, recommendation }}
                size={compactMode ? 'sm' : 'md'}
                onClick={handleTileClick}
                onDoubleClick={handleTileDoubleClick}
                animateOnSelect={true}
                animateOnRecommendation={true}
                context="selection"
                recommendationType={recommendation?.action as 'keep' | 'pass' | 'discard'}
              />
              {/* Remove button that appears on hover/selection */}
              {(tile.isSelected || false) && (
                <button
                  onClick={() => removeTile(tile.instanceId)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs font-bold hover:bg-red-600 transition-all duration-200 flex items-center justify-center shadow-lg z-10"
                  title="Remove tile (or double-click)"
                >
                  ×
                </button>
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
            {playerHand.length > 0 && (
              <p className="text-xs text-gray-500">
                💡 Click to select, double-click or click ✕ to remove
              </p>
            )}
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
    </Card>
  )
}