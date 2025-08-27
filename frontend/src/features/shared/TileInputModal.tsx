// Universal Tile Input Modal
// Reusable modal for tile selection in Charleston and gameplay contexts

import { useState, useEffect } from 'react'
import { Card } from '../../ui-components/Card'
import { Button } from '../../ui-components/Button'
import { TileSelector } from '../tile-input/TileSelector'
import { tileService } from '../../services/tile-service'
import type { PlayerTile } from '../../types/tile-types'

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

  // Initialize modal hand with provided tiles
  useEffect(() => {
    if (isOpen && initialTiles.length > 0) {
      const tiles = initialTiles.map(tileId => tileService.createPlayerTile(tileId)).filter(tile => tile !== null) as PlayerTile[]
      setModalHand(tiles)
    } else if (isOpen) {
      setModalHand([])
    }
  }, [isOpen, initialTiles])

  const handleTileAdd = (tileId: string) => {
    if (modalHand.length >= requiredCount) return
    const newTile = tileService.createPlayerTile(tileId)
    if (newTile) {
      setModalHand(prev => [...prev, newTile])
    }
  }

  const handleTileRemove = (instanceId: string) => {
    setModalHand(prev => prev.filter(tile => tile.instanceId !== instanceId))
  }

  const handleConfirm = () => {
    if (modalHand.length !== requiredCount) return
    const tileIds = modalHand.map(tile => tile.id)
    onConfirm(tileIds)
    setModalHand([])
  }

  const handleCancel = () => {
    setModalHand([])
    onClose()
  }

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{getTitle()}</h2>
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
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Selected Tiles Display */}
          {modalHand.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Selected {requiredCount === 1 ? 'Tile' : 'Tiles'}:
              </h3>
              <div className="flex flex-wrap gap-2">
                {modalHand.map((tile) => (
                  <button
                    key={tile.instanceId}
                    onClick={() => handleTileRemove(tile.instanceId)}
                    className="relative"
                  >
                    <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded font-mono text-sm border border-blue-200 hover:bg-red-100 hover:text-red-800 hover:border-red-200">
                      {tile.id}
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">×</span>
                    </span>
                  </button>
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
            {modalHand.length < requiredCount && (
              <>
                Need {requiredCount - modalHand.length} more {requiredCount - modalHand.length === 1 ? 'tile' : 'tiles'}
              </>
            )}
            {modalHand.length === requiredCount && (
              <span className="text-green-600 font-medium">✅ Ready to confirm</span>
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
            >
              {getButtonText()}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}