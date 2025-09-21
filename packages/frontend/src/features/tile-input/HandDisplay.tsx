// Hand Display Component
// Shows current tiles with management and animation features

import { Card } from '../../ui-components/Card'
import { Button } from '../../ui-components/Button'
import { AnimatedTile } from '../../ui-components/tiles/AnimatedTile'
import { TilePlaceholder } from '../../ui-components/TilePlaceholder'
import { TileLockBadge } from '../../ui-components/TileLockBadge'
import { useTileStore, useIntelligenceStore } from '../../stores'
import { getTileStateClass } from '../gameplay/TileStates'
import { useTileInteraction } from '../../hooks/useTileInteraction'
import type { PlayerTile } from 'shared-types'

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
    setSortBy,
    getTileGroups,
    clearSelection,
    selectedForAction,
    tileStates
  } = useTileStore()
  
  // Get AI recommendations for highlighting
  const { currentAnalysis } = useIntelligenceStore()
  
  // Create lookup maps for highlighting using HandAnalysis
  const getTileHighlighting = (tile: PlayerTile): { action: 'keep' | 'discard' | 'pass'; confidence: number; reasoning: string } | undefined => {
    if (!currentAnalysis || !showRecommendations) return undefined

    const recommendations = currentAnalysis.tileRecommendations
    if (!recommendations) return undefined

    // Check if tile is in keep recommendations
    if (recommendations?.some((rec: { tileId: string; action: string }) => rec.tileId === tile.id && rec.action === 'keep')) {
      return {
        action: 'keep',
        confidence: 85,
        reasoning: 'Recommended to keep'
      }
    }

    // Check if tile is in discard recommendations
    if (recommendations?.some((rec: { tileId: string; action: string }) => rec.tileId === tile.id && rec.action === 'discard')) {
      return {
        action: 'discard',
        confidence: 75,
        reasoning: 'Safe to discard'
      }
    }

    // Check if tile is in charleston recommendations
    if (recommendations?.some((rec: { tileId: string; action: string }) => rec.tileId === tile.id && rec.action === 'pass')) {
      return {
        action: 'pass',
        confidence: 70,
        reasoning: 'Consider passing in Charleston'
      }
    }

    return undefined
  }
  
  const { handleTileClick } = useTileInteraction('selection')
  
  
  
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
            <div className="grid grid-cols-5 sm:grid-cols-7 gap-2 sm:gap-4">
              {tiles.map(tile => {
                const recommendation = getTileHighlighting(tile)
                const isLocked = tileStates[tile.instanceId] === 'locked'
                return (
                  <div key={tile.instanceId} className="relative group">
                    {tileStates[tile.instanceId] === 'placeholder' ? (
                      <TilePlaceholder tile={tile} />
                    ) : (
                      <>
                        <AnimatedTile
                          tile={tile}
                          size={compactMode ? 'sm' : 'md'}
                          onClick={handleTileClick}
                          animateOnSelect={true}
                          context="selection"
                          recommendationType={recommendation?.action as 'keep' | 'pass' | 'discard'}
                          className={`${tileStates[tile.instanceId] ? getTileStateClass(tileStates[tile.instanceId] as 'primary' | 'selected' | 'exposed' | 'locked' | 'placeholder') : 'hover:ring-2 hover:ring-blue-300 transition-all cursor-pointer'} ${isLocked ? 'cursor-not-allowed' : ''}`}
                        />
                        <TileLockBadge isLocked={isLocked} />
                      </>
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
      <div className="grid grid-cols-5 sm:grid-cols-7 gap-2 sm:gap-4">
        {playerHand.map(tile => {
          const recommendation = getTileHighlighting(tile)
          const isLocked = tileStates[tile.instanceId] === 'locked'
          return (
            <div key={tile.instanceId} className="relative group">
              {tileStates[tile.instanceId] === 'placeholder' ? (
                <TilePlaceholder tile={tile} />
              ) : (
                <>
                  <AnimatedTile
                    tile={tile}
                    size={compactMode ? 'sm' : 'md'}
                    onClick={handleTileClick}
                    animateOnSelect={true}
                    context="selection"
                    recommendationType={recommendation?.action as 'keep' | 'pass' | 'discard'}
                    className={`${tileStates[tile.instanceId] ? getTileStateClass(tileStates[tile.instanceId] as 'primary' | 'selected' | 'exposed' | 'locked' | 'placeholder') : 'hover:ring-2 hover:ring-blue-300 transition-all cursor-pointer'} ${isLocked ? 'cursor-not-allowed' : ''}`}
                  />
                  <TileLockBadge isLocked={isLocked} />
                </>
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