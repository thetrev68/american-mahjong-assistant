// Selection Area - Displays tiles moved from hand for game actions
// Shows conditional visibility based on game phase and selected tiles

import { useState } from 'react'
import { Card } from '../../ui-components/Card'
import { Button } from '../../ui-components/Button'
import { AnimatedTile } from '../../ui-components/tiles/AnimatedTile'
import { useTileStore, useGameStore } from '../../stores'

interface SelectionAreaProps {
  onPass?: () => void
  onDiscard?: () => void
  isReadyToPass?: boolean
  allPlayersReady?: boolean
  onAdvanceToGameplay?: () => void
  onCharlestonPass?: () => void
}

export const SelectionArea = ({ onPass, onDiscard, isReadyToPass, allPlayersReady, onCharlestonPass }: SelectionAreaProps = {}) => {
  const {
    selectedForAction,
    returnFromSelection,
    lockTile,
    unlockTile,
    clearSelection,
    tileStates
  } = useTileStore()
  const { gamePhase } = useGameStore()

  const [actionType, setActionType] = useState<'pass' | 'discard' | null>(null)

  // Check if the selected tile is locked (only one tile can be selected in gameplay)
  const selectedTile = selectedForAction[0]
  const tileState = selectedTile ? tileStates[selectedTile.instanceId] : undefined
  const isSelectedTileLocked = tileState === 'locked' || tileState === 'locked-placeholder'

  // Show during tile input, charleston, and gameplay phases when tiles are selected
  const shouldShow = (gamePhase === 'playing' || gamePhase === 'charleston' || gamePhase === 'tile-input') && selectedForAction.length > 0


  const handleAction = (action: 'pass' | 'discard') => {
    console.log('🔧 SelectionArea handleAction called:', { action, onPass: !!onPass, onDiscard: !!onDiscard })
    setActionType(action)

    // Call parent callback for game logic
    if (action === 'pass' && onPass) {
      console.log('🔧 SelectionArea calling onPass callback')
      console.log('🔧 SelectionArea onPass function type:', typeof onPass)
      console.log('🔧 SelectionArea onPass function name:', onPass.name)
      console.log('🔧 SelectionArea onPass function toString:', onPass.toString().substring(0, 100))
      try {
        onPass()
        console.log('🔧 SelectionArea onPass called successfully')
      } catch (error) {
        console.error('🔧 SelectionArea Error calling onPass:', error)
      }
    } else if (action === 'discard' && onDiscard) {
      onDiscard()
    }
    
    // Clear the selection after a brief delay for visual feedback
    setTimeout(() => {
      clearSelection()
      setActionType(null)
    }, 1000)
  }

  const handleLock = () => {
    selectedForAction.forEach(tile => {
      // First return the tile from selection area, then lock it
      returnFromSelection(tile.instanceId)
      lockTile(tile.instanceId)
    })
    clearSelection()
  }

  const handleUnlock = () => {
    selectedForAction.forEach(tile => {
      // First return the tile from selection area, then unlock it
      returnFromSelection(tile.instanceId)
      unlockTile(tile.instanceId)
    })
    clearSelection()
  }

  const handleClear = () => {
    selectedForAction.forEach(tile => {
      returnFromSelection(tile.instanceId)
    })
    clearSelection()
  }


  return (
    <div className={`fixed bottom-16 left-4 right-4 z-50 transition-opacity duration-200 ${shouldShow ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
      <Card variant="elevated" className="p-4 bg-white/95 backdrop-blur-sm border-2 border-purple-200 w-full max-w-2xl mx-auto">
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
                onClick={() => {
                  console.log('🔧 Charleston Pass button clicked:', { selectedCount: selectedForAction.length })
                  if (selectedForAction.length === 3) {
                    handleAction('pass')
                    if (onCharlestonPass) {
                      setTimeout(() => onCharlestonPass(), 1000)
                    }
                  }
                }}
                disabled={actionType !== null || isReadyToPass || selectedForAction.length !== 3}
                className={allPlayersReady ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}
              >
                {actionType === 'pass' ? 'Passing...' : 
                 allPlayersReady ? 'All Ready!' :
                 isReadyToPass ? 'Ready - Waiting...' : 
                 selectedForAction.length === 3 ? 'Pass 3 Tiles' : `Select ${3 - selectedForAction.length} more tiles`}
              </Button>
            )}
            
            {gamePhase === 'playing' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleAction('discard')}
                disabled={actionType !== null || isSelectedTileLocked}
                className={`${isSelectedTileLocked ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                title={isSelectedTileLocked ? 'Cannot discard locked tile' : 'Discard selected tile'}
              >
                {actionType === 'discard' ? 'Discarding...' : 'Discard'}
              </Button>
            )}

            {isSelectedTileLocked ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleUnlock}
                disabled={actionType !== null}
                className="border-green-300 text-green-700 hover:bg-green-50"
              >
                🔓 Unlock
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLock}
                disabled={actionType !== null}
                className="border-orange-300 text-orange-700 hover:bg-orange-50"
              >
                🔒 Lock
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={actionType !== null}
            >
              Cancel
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