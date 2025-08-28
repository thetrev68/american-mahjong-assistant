// Selection Area - Displays tiles moved from hand for game actions
// Shows conditional visibility based on game phase and selected tiles

import { useState } from 'react'
import { Card } from '../../ui-components/Card'
import { Button } from '../../ui-components/Button'
import { AnimatedTile } from '../../ui-components/tiles/AnimatedTile'
import { useTileStore, useGameStore } from '../../stores'

export const SelectionArea = () => {
  const { 
    selectedForAction, 
    returnFromSelection, 
    lockTile, 
    clearSelection,
    removeTile
  } = useTileStore()
  const { gamePhase } = useGameStore()
  
  const [actionType, setActionType] = useState<'pass' | 'discard' | null>(null)

  // Show during tile input, charleston, and gameplay phases when tiles are selected
  const shouldShow = (gamePhase === 'playing' || gamePhase === 'charleston' || gamePhase === 'tile-input') && selectedForAction.length > 0

  const handleAction = (action: 'pass' | 'discard') => {
    setActionType(action)
    // Here you would typically trigger the actual game action
    // For now, we'll just clear the selection after a brief delay
    setTimeout(() => {
      clearSelection()
      setActionType(null)
    }, 1000)
  }

  const handleLock = () => {
    selectedForAction.forEach(tile => {
      lockTile(tile.instanceId)
    })
    clearSelection()
  }

  const handleClear = () => {
    selectedForAction.forEach(tile => {
      returnFromSelection(tile.instanceId)
    })
    clearSelection()
  }

  const handleDelete = () => {
    // Remove tiles from both selection area and hand entirely
    selectedForAction.forEach(tile => {
      removeTile(tile.instanceId)
    })
    clearSelection()
  }

  return (
    <div className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 transition-opacity duration-200 ${shouldShow ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
      <Card variant="elevated" className="p-4 bg-white/95 backdrop-blur-sm border-2 border-purple-200 min-w-80">
        <div className="space-y-3">
          {/* Title */}
          <div className="text-center">
            <h3 className="text-sm font-semibold text-gray-800">Selected for Action</h3>
            <p className="text-xs text-gray-600">
              {selectedForAction.length} tile{selectedForAction.length !== 1 ? 's' : ''} selected
            </p>
          </div>

          {/* Selected Tiles with Jump Animation */}
          <div className="flex justify-center gap-2 p-2 bg-purple-50 rounded-lg">
            {selectedForAction.map(tile => (
              <div 
                key={tile.instanceId} 
                className="animate-bounce"
                style={{ 
                  animationDelay: `${selectedForAction.indexOf(tile) * 100}ms`,
                  animationDuration: '0.6s',
                  animationIterationCount: '1',
                  animationFillMode: 'forwards'
                }}
              >
                <AnimatedTile
                  tile={tile}
                  size="sm"
                  onClick={() => returnFromSelection(tile.instanceId)}
                  context="selection"
                  className="cursor-pointer hover:scale-110 transition-transform"
                />
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-2 flex-wrap">
            {gamePhase === 'charleston' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleAction('pass')}
                disabled={actionType !== null}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {actionType === 'pass' ? 'Passing...' : 'Pass'}
              </Button>
            )}
            
            {gamePhase === 'playing' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleAction('discard')}
                disabled={actionType !== null}
                className="bg-green-600 hover:bg-green-700"
              >
                {actionType === 'discard' ? 'Discarding...' : 'Discard'}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleLock}
              disabled={actionType !== null}
              className="border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              Lock
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={actionType !== null}
            >
              Clear
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={actionType !== null}
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              Delete
            </Button>
          </div>

          {/* Action Status */}
          {actionType && (
            <div className="text-center">
              <div className="inline-flex items-center gap-2 text-sm text-gray-600">
                <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                {actionType === 'pass' && 'Processing pass...'}
                {actionType === 'discard' && 'Processing discard...'}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}