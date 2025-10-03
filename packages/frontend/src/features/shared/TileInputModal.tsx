// Universal Tile Input Modal
// Reusable modal for tile selection in Charleston and gameplay contexts

import { useState, useEffect, useCallback } from 'react'
import { Card } from '../../ui-components/Card'
import { Button } from '../../ui-components/Button'
import { TileSelector } from '../tile-input/TileSelector'
import { AnimatedTile } from '../../ui-components/tiles/AnimatedTile'
import { tileService } from '../../lib/services/tile-service'
import { useTileStore } from '../../stores/tile-store'
import { useCharlestonStore } from '../../stores/charleston-store'
import { getTileDisplayChar, getTileCharClasses } from '../../utils/tile-display-utils'
import type { PlayerTile } from 'shared-types'

interface TileInputModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (tiles: string[]) => void
  mode: 'receive' | 'edit' | 'discard' | 'exposed'
  requiredCount: number  // 3 for Charleston, 1 for gameplay
  context: 'charleston' | 'gameplay'
  initialTiles?: string[]
}

export const TileInputModal = ({
  isOpen,
  onClose,
  onConfirm,
  mode,
  requiredCount,
  context,
  initialTiles = []
}: TileInputModalProps) => {
  const [modalHand, setModalHand] = useState<PlayerTile[]>([])
  
  // Store integration for current hand display
  const { playerHand } = useTileStore()
  const { currentPhase, isActive: charlestonActive } = useCharlestonStore()

  // Initialize modal hand with provided tiles
  useEffect(() => {
    if (isOpen) {
      if (initialTiles.length > 0) {
        const tiles = initialTiles.map(tileId => tileService.createPlayerTile(tileId)).filter(tile => tile !== null) as PlayerTile[]
        setModalHand(tiles)
      } else {
        setModalHand([])
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // Get current hand as colored single characters
  const getCurrentHandDisplay = () => {
    const sortedTiles = tileService.sortTiles([...playerHand])
    return sortedTiles.map(tile => {
      const tileChar = getTileDisplayChar(tile.id)
      return (
        <span
          key={tile.instanceId}
          className={getTileCharClasses(tileChar, false)}
        >
          {tileChar.char}
        </span>
      )
    })
  }

  // Progress calculation
  const progress = requiredCount > 0 ? (modalHand.length / requiredCount) * 100 : 0
  const progressColor = progress === 100 ? 'bg-green-500' : progress > 66 ? 'bg-blue-500' : progress > 33 ? 'bg-yellow-500' : 'bg-gray-300'

  const handleTileAdd = useCallback((tileId: string) => {
    if (modalHand.length >= requiredCount) return
    const newTile = tileService.createPlayerTile(tileId)
    if (newTile) {
      setModalHand(prev => [...prev, newTile])
    }
  }, [modalHand.length, requiredCount])

  const handleTileRemove = useCallback((instanceId: string) => {
    setModalHand(prev => prev.filter(tile => tile.instanceId !== instanceId))
  }, [])

  const handleConfirm = useCallback(() => {
    if (modalHand.length !== requiredCount) return
    const tileIds = modalHand.map(tile => tile.id)
    onConfirm(tileIds)
    setModalHand([])
  }, [requiredCount, modalHand, onConfirm])

  const handleCancel = useCallback(() => {
    setModalHand([])
    onClose()
  }, [onClose])

  if (!isOpen) return null

  const isComplete = modalHand.length === requiredCount

  // Dynamic content based on context and mode
  const getTitle = () => {
    switch (mode) {
      case 'receive':
        return context === 'charleston' 
          ? 'Select tiles you received' 
          : 'Identify opponent discard'
      case 'edit':
        return context === 'charleston'
          ? 'Edit received tiles'
          : 'Edit opponent discard'
      case 'discard':
        return 'Identify discarded tile'
      case 'exposed':
        return 'Identify exposed tiles'
      default:
        return 'Select tiles'
    }
  }

  const getButtonText = () => {
    switch (mode) {
      case 'receive':
        return 'Done'
      case 'edit':
        return 'Update'
      case 'discard':
        return 'Confirm Discard'
      case 'exposed':
        return 'Confirm Exposed'
      default:
        return 'Confirm'
    }
  }

  const getInstructions = () => {
    const tileText = requiredCount === 1 ? 'tile' : 'tiles'
    switch (mode) {
      case 'receive':
        return context === 'charleston'
          ? `Select the ${requiredCount} ${tileText} you received from other players`
          : `Select the ${tileText} discarded by opponent`
      case 'edit':
        return `Modify your selection of ${requiredCount} ${tileText}`
      case 'discard':
        return `Identify which ${tileText} was discarded`
      case 'exposed':
        return `Identify which ${tileText} were exposed (pung/kong)`
      default:
        return `Select exactly ${requiredCount} ${tileText}`
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <Card className="max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col animate-pop-in">
        {/* Header with Hand Preview */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{getTitle()}</h2>
              <p className="text-sm text-gray-600 mt-1">
                {getInstructions()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Selected: {modalHand.length}/{requiredCount}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
            >
              ✕
            </Button>
          </div>
          
          {/* Contextual Hand Preview */}
          {playerHand.length > 0 && (
            <div className="mt-3 p-2 bg-white/80 rounded border">
              <div className="text-xs font-medium text-gray-600 mb-1">
                Current Hand ({playerHand.length} tiles):
              </div>
              <div className="flex flex-wrap gap-1">
                {playerHand.length > 0 ? getCurrentHandDisplay() : (
                  <span className="text-gray-500 text-xs">No tiles in hand</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 space-y-4">

          {/* Progress Indicator */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Selection Progress</h3>
              <span className="text-xs text-gray-500">
                {modalHand.length}/{requiredCount}
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <div 
                className={`h-3 rounded-full transition-all duration-300 ${progressColor}`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            
            <div className="text-center">
              {modalHand.length < requiredCount && (
                <p className="text-sm text-gray-600">
                  Need {requiredCount - modalHand.length} more {requiredCount - modalHand.length === 1 ? 'tile' : 'tiles'}
                </p>
              )}
              {modalHand.length === requiredCount && (
                <p className="text-sm text-green-600 font-medium flex items-center justify-center">
                  <span className="mr-1">✅</span>
                  Ready to confirm!
                </p>
              )}
              {modalHand.length > requiredCount && (
                <p className="text-sm text-yellow-600 font-medium flex items-center justify-center">
                  <span className="mr-1">⚠️</span>
                  Too many tiles selected
                </p>
              )}
            </div>
          </div>

          {/* Enhanced Selected Tiles Display */}
          {modalHand.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                Selected {requiredCount === 1 ? 'Tile' : 'Tiles'}
                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  {modalHand.length}
                </span>
              </h3>
              <div className="flex flex-wrap gap-3">
                {modalHand.map((tile) => (
                  <div
                    key={tile.instanceId}
                    className="relative group cursor-pointer"
                    onClick={() => handleTileRemove(tile.instanceId)}
                  >
                    <div className="relative">
                      <AnimatedTile
                        tile={tile}
                        size="md"
                        className="hover:scale-105 transition-transform duration-200"
                        context="selection"
                        animateOnSelect={false}
                      />
                      <span className="absolute -bottom-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        ×
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tile Selector */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Available Tiles:
            </h3>
            <TileSelector
              onTileSelect={handleTileAdd}
              compact={false}
              modalMode={true}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {context === 'charleston' && charlestonActive && (
              <span className="flex items-center">
                <span className="mr-2">📋</span>
                Charleston {currentPhase} pass
              </span>
            )}
            {context === 'gameplay' && (
              <span className="flex items-center">
                <span className="mr-2">🎯</span>
                Game mode selection
              </span>
            )}
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            
            <Button
              variant="primary"
              onClick={handleConfirm}
              disabled={!isComplete}
              className={isComplete ? 'animate-pulse' : ''}
            >
              {getButtonText()}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}