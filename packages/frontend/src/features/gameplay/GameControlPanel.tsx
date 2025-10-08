import { useState } from 'react'
import { Card } from '../../ui-components/Card'
import { Button } from '../../ui-components/Button'
import { TileInputModal } from '../shared/TileInputModal'
import { useGameStore } from '../../stores/useGameStore'
import { useTileStore } from '../../stores/tile-store'
import { useIntelligenceStore } from '../../stores/useIntelligenceStore'
import { useRoomSetupStore } from '../../stores/room-setup.store'

interface GameControlPanelProps {
  className?: string
}

export const GameControlPanel = ({ className = '' }: GameControlPanelProps) => {
  const gamePhase = useGameStore((state) => state.gamePhase ?? state.phase)
  const currentTurn = useGameStore((state) => state.currentTurn)
  const currentPlayerId = useGameStore((state) => state.currentPlayerId)
  const gameActions = useGameStore((state) => state.actions)
  const isSoloMode = useRoomSetupStore(s => (s as any).coPilotMode === 'solo')
  const tileStore = useTileStore(s => s)
  const intelligenceStore = useIntelligenceStore()

  const [showDiscardModal, setShowDiscardModal] = useState(false)
  const [showCallModal, setShowCallModal] = useState(false)

  // Only show in solo mode - depends on roomSetupStore state
  const isGameActive = gamePhase === 'playing'

  if (!isSoloMode || !isGameActive) {
    return null
  }

  const handleLogDiscard = (tiles: string[]) => {
    if (tiles.length === 1) {
      // Record opponent discard in game statistics
      gameActions.recordDiscard('opponent')
      gameActions.recordAction('opponent', 'discard')

      // Trigger intelligence analysis if available
      if ((intelligenceStore as any)?.analyzeHand) {
        (intelligenceStore as any).analyzeHand(tileStore.playerHand, [])
      }

      // Add alert for tracking
      gameActions.addAlert({
        type: 'info',
        title: 'Opponent Action',
        message: `Logged opponent discard: ${tiles[0]}`,
        duration: 3000
      })
    }
    setShowDiscardModal(false)
  }

  const handleLogCall = (tiles: string[]) => {
    if (tiles.length === 3) {
      // Record opponent call (pung/kong)
      gameActions.recordAction('opponent', 'call')
      gameActions.recordCallAttempt('opponent')

      // Add alert for tracking
      gameActions.addAlert({
        type: 'info',
        title: 'Opponent Action',
        message: `Logged opponent call: ${tiles.join(', ')}`,
        duration: 3000
      })
    }
    setShowCallModal(false)
  }

  const handleUndoLastTurn = () => {
    // Basic undo implementation - reset to previous turn
    if (currentTurn > 0) {
      gameActions.addAlert({
        type: 'warning',
        title: 'Undo Action',
        message: 'Previous turn undone',
        duration: 3000
      })

      // Note: More sophisticated undo would require state history
      // For now, just provide user feedback
      gameActions.recordAction(currentPlayerId || 'player', 'undo')
    } else {
      gameActions.addAlert({
        type: 'warning',
        title: 'Undo Failed',
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
              Turn {currentTurn}
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
              disabled={currentTurn === 0}
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

