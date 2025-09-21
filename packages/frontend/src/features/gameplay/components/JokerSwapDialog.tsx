import React, { useState } from 'react'
import { Card } from '../../../ui-components/Card'
import { Button } from '../../../ui-components/Button'
import { AnimatedTile } from '../../../ui-components/tiles/AnimatedTile'
import { useTileStore } from '../../../stores/tile-store'
import type { PlayerTile } from 'shared-types'

interface JokerSwapDialogProps {
  isOpen: boolean
  onClose: () => void
  onSwap: (data: { jokerLocation: 'own' | 'opponent', targetTile: PlayerTile }) => Promise<void>
}

type SwapStep = 'select-joker' | 'select-tile' | 'confirm'

export const JokerSwapDialog: React.FC<JokerSwapDialogProps> = ({
  isOpen,
  onClose,
  onSwap
}) => {
  const { playerHand, exposedTiles } = useTileStore()
  const [currentStep, setCurrentStep] = useState<SwapStep>('select-joker')
  const [selectedJoker, setSelectedJoker] = useState<{ location: 'own' | 'opponent', tile: PlayerTile } | null>(null)
  const [selectedTargetTile, setSelectedTargetTile] = useState<PlayerTile | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  if (!isOpen) return null

  // Find jokers in hand and exposed tiles
  const handJokers = playerHand.filter(tile => tile.isJoker)
  const exposedJokers = exposedTiles.filter(tile => tile.isJoker)

  // Get all possible target tiles (actual tiles that could replace jokers)
  const getAllTargetTiles = () => {
    // For simplicity, show all non-joker tiles from hand as potential targets
    // In a real game, this would be more sophisticated based on what the joker represents
    return playerHand.filter(tile => !tile.isJoker)
  }

  const handleJokerSelect = (location: 'own' | 'opponent', tile: PlayerTile) => {
    setSelectedJoker({ location, tile })
    setCurrentStep('select-tile')
  }

  const handleTargetTileSelect = (tile: PlayerTile) => {
    setSelectedTargetTile(tile)
    setCurrentStep('confirm')
  }

  const handleConfirmSwap = async () => {
    if (!selectedJoker || !selectedTargetTile) return

    setIsProcessing(true)
    try {
      await onSwap({
        jokerLocation: selectedJoker.location,
        targetTile: selectedTargetTile
      })
      onClose()
    } catch (error) {
      console.error('Joker swap failed:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReset = () => {
    setSelectedJoker(null)
    setSelectedTargetTile(null)
    setCurrentStep('select-joker')
  }

  const handleCancel = () => {
    handleReset()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">🃏 Joker Swap</h3>
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              ✕
            </Button>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 text-sm">
            <div className={`px-2 py-1 rounded ${currentStep === 'select-joker' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100'}`}>
              1. Select Joker
            </div>
            <div className="text-gray-400">→</div>
            <div className={`px-2 py-1 rounded ${currentStep === 'select-tile' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100'}`}>
              2. Select Tile
            </div>
            <div className="text-gray-400">→</div>
            <div className={`px-2 py-1 rounded ${currentStep === 'confirm' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100'}`}>
              3. Confirm
            </div>
          </div>

          {/* Step 1: Select Joker */}
          {currentStep === 'select-joker' && (
            <div className="space-y-4">
              <p className="text-gray-600">Select which joker you want to swap:</p>

              {/* Own Exposed Jokers */}
              {exposedJokers.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Your Exposed Jokers:</h4>
                  <div className="flex gap-2 flex-wrap">
                    {exposedJokers.map((tile, index) => (
                      <div key={`exposed-${index}`} className="cursor-pointer">
                        <AnimatedTile
                          tile={tile}
                          size="md"
                          onClick={() => handleJokerSelect('own', tile)}
                          className="hover:scale-110 transition-transform"
                          context="selection"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hand Jokers (for context) */}
              {handJokers.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Jokers in Hand:</h4>
                  <div className="flex gap-2 flex-wrap">
                    {handJokers.map((tile, index) => (
                      <div key={`hand-${index}`} className="opacity-50">
                        <AnimatedTile
                          tile={tile}
                          size="md"
                          context="selection"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Note: Cannot swap jokers from hand
                  </p>
                </div>
              )}

              {/* No jokers available */}
              {exposedJokers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No jokers available for swapping.</p>
                  <p className="text-sm">Jokers must be in exposed sets to be swappable.</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Select Target Tile */}
          {currentStep === 'select-tile' && selectedJoker && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span>Selected joker:</span>
                <AnimatedTile
                  tile={selectedJoker.tile}
                  size="sm"
                  context="selection"
                />
                <Button variant="ghost" size="sm" onClick={() => setCurrentStep('select-joker')}>
                  Change
                </Button>
              </div>

              <p className="text-gray-600">Select the tile to replace the joker with:</p>

              <div className="grid grid-cols-6 gap-2 max-h-60 overflow-y-auto">
                {getAllTargetTiles().map((tile, index) => (
                  <div key={`target-${index}`} className="cursor-pointer">
                    <AnimatedTile
                      tile={tile}
                      size="md"
                      onClick={() => handleTargetTileSelect(tile)}
                      className="hover:scale-110 transition-transform"
                      context="selection"
                    />
                  </div>
                ))}
              </div>

              {getAllTargetTiles().length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No tiles available for swapping.</p>
                  <p className="text-sm">You need actual tiles in your hand to swap with jokers.</p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Confirm */}
          {currentStep === 'confirm' && selectedJoker && selectedTargetTile && (
            <div className="space-y-4">
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Confirm Joker Swap:</h4>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <AnimatedTile tile={selectedJoker.tile} size="md" context="selection" />
                    <p className="text-xs mt-1">Joker</p>
                  </div>
                  <div className="text-2xl">↔</div>
                  <div className="text-center">
                    <AnimatedTile tile={selectedTargetTile} size="md" context="selection" />
                    <p className="text-xs mt-1">Your tile</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-3">
                  The joker will be added to your hand, and your {selectedTargetTile.id} will replace it in the exposed set.
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="ghost" onClick={handleCancel} disabled={isProcessing}>
              Cancel
            </Button>

            {currentStep === 'select-joker' && exposedJokers.length === 0 && (
              <Button variant="primary" onClick={handleCancel}>
                Close
              </Button>
            )}

            {currentStep === 'select-tile' && (
              <Button variant="ghost" onClick={() => setCurrentStep('select-joker')}>
                Back
              </Button>
            )}

            {currentStep === 'confirm' && (
              <>
                <Button variant="ghost" onClick={() => setCurrentStep('select-tile')}>
                  Back
                </Button>
                <Button
                  variant="primary"
                  onClick={handleConfirmSwap}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Swapping...' : 'Confirm Swap'}
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}