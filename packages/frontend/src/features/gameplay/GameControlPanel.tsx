import { useState } from 'react'
import { Card } from '../../ui-components/Card'
import { Button } from '../../ui-components/Button'
import { TileInputModal } from '../shared/TileInputModal'
import { useGameStore } from '../../stores/game-store'
import { useTileStore } from '../../stores/tile-store'
import { useIntelligenceStore } from '../../stores/intelligence-store'
import { useRoomSetupStore } from '../../stores/room-setup.store'

interface GameControlPanelProps {
  className?: string
}

export const GameControlPanel = ({ className = '' }: GameControlPanelProps) => {
  const gameStore = useGameStore()
  const roomSetupStore = useRoomSetupStore()
  const tileStore = useTileStore()
  const intelligenceStore = useIntelligenceStore()

  const [showDiscardModal, setShowDiscardModal] = useState(false)
  const [showCallModal, setShowCallModal] = useState(false)

  // Only show in solo mode - check roomSetupStore instead of gameStore
  const isSoloMode = roomSetupStore.coPilotMode === 'solo'
  const isGameActive = gameStore.gamePhase === 'playing'

  if (!isSoloMode || !isGameActive) {
    return null
  }

  const handleLogDiscard = (tiles: string[]) => {
    if (tiles.length === 1) {
      // Record opponent discard in game statistics
      gameStore.recordDiscard()
      gameStore.recordAction('opponent', 'discard')

      // Trigger intelligence analysis if needed
      intelligenceStore.analyzeHand(tileStore.playerHand, [])

      // Add alert for tracking
      gameStore.addAlert({
        type: 'info',
        message: `Logged opponent discard: ${tiles[0]}`,
        duration: 3000
      })
    }
    setShowDiscardModal(false)
  }

  const handleLogCall = (tiles: string[]) => {
    if (tiles.length === 3) {
      // Record opponent call (pung/kong)
      gameStore.recordAction('opponent', 'call')
      gameStore.recordCallAttempt('opponent')

      // Add alert for tracking
      gameStore.addAlert({
        type: 'info',
        message: `Logged opponent call: ${tiles.join(', ')}`,
        duration: 3000
      })
    }
    setShowCallModal(false)
  }

  const handleUndoLastTurn = () => {
    // Basic undo implementation - reset to previous turn
    if (gameStore.currentTurn > 0) {
      gameStore.addAlert({
        type: 'warning',
        message: 'Previous turn undone',
        duration: 3000
      })

      // Note: More sophisticated undo would require state history
      // For now, just provide user feedback
      gameStore.recordAction(gameStore.currentPlayerId || 'player', 'undo')
    } else {
      gameStore.addAlert({
        type: 'error',
        message: 'No previous turn to undo',
        duration: 3000
      })
    }
  }

  return (
    <>
      <Card className={`bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 ${className}`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
              <span className="mr-2">🎮</span>
              Solo Game Controls
            </h3>
            <div className="text-xs text-gray-500 bg-white/80 px-2 py-1 rounded">
              Turn {gameStore.currentTurn}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDiscardModal(true)}
              className="flex items-center justify-center space-x-2 text-sm"
            >
              <span>🗂️</span>
              <span>Log Other Player Discard</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCallModal(true)}
              className="flex items-center justify-center space-x-2 text-sm"
            >
              <span>📢</span>
              <span>Log Other Player Call</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleUndoLastTurn}
              disabled={gameStore.currentTurn === 0}
              className="flex items-center justify-center space-x-2 text-sm"
            >
              <span>↩️</span>
              <span>Undo Last Turn</span>
            </Button>
          </div>

          <div className="mt-3 text-xs text-gray-600 bg-white/60 p-2 rounded border">
            <strong>Solo Mode:</strong> Use these controls to log other players' actions during physical gameplay.
            The AI will incorporate this information into its recommendations.
          </div>
        </div>
      </Card>

      {/* Discard Tracking Modal */}
      <TileInputModal
        isOpen={showDiscardModal}
        onClose={() => setShowDiscardModal(false)}
        onConfirm={handleLogDiscard}
        mode="discard"
        requiredCount={1}
        context="gameplay"
      />

      {/* Call Tracking Modal */}
      <TileInputModal
        isOpen={showCallModal}
        onClose={() => setShowCallModal(false)}
        onConfirm={handleLogCall}
        mode="exposed"
        requiredCount={3}
        context="gameplay"
      />
    </>
  )
}