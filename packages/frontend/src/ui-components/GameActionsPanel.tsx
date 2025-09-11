// Game Actions Panel
// UI component for all player actions in turn-based gameplay

import React, { useState } from 'react'
import { Button } from './Button'
import { Card } from './Card'
import type { GameAction } from '../features/gameplay/services/game-actions'

export interface GameActionsPanelProps {
  availableActions: GameAction[]
  onAction: (action: GameAction, data?: unknown) => Promise<void>
  isMyTurn: boolean
  currentPlayer?: string
  wallCount?: number
  turnDuration?: number
  className?: string
  isSoloMode?: boolean
}

export const GameActionsPanel: React.FC<GameActionsPanelProps> = ({
  availableActions,
  onAction,
  isMyTurn,
  currentPlayer,
  wallCount = 0,
  turnDuration = 0,
  className = '',
  isSoloMode = false
}) => {
  const [showJokerSwapDialog, setShowJokerSwapDialog] = useState(false)
  const handleDrawTile = async () => {
    await onAction('draw')
  }

  const handlePassOut = async () => {
    const message = isSoloMode ? 
      'Pass out of this hand? You can still track the game as other players continue.' :
      'Are you sure you want to pass out? This will remove you from active play.'
    
    const confirmed = window.confirm(message)
    if (confirmed) {
      const reason = isSoloMode ? 'Hand not viable - continuing to track game' : 'Hand not viable'
      await onAction('pass-out', reason)
    }
  }

  const handleMahjong = async () => {
    await onAction('declare-mahjong')
  }

  const handleOtherPlayerWon = async () => {
    const playerName = window.prompt('Which player won? Enter their name:')
    if (playerName) {
      await onAction('other-player-mahjong', playerName)
    }
  }

  const handleGameDrawn = async () => {
    const reason = window.prompt('Why did the game end?\n(wall exhausted / all passed out / time limit)')
    if (reason) {
      await onAction('game-drawn', reason)
    }
  }

  const canDraw = availableActions.includes('draw') && isMyTurn && wallCount > 0
  const canDiscard = availableActions.includes('discard') && isMyTurn
  const canCall = availableActions.includes('call') && !isMyTurn
  const canJokerSwap = availableActions.includes('joker-swap')
  const canMahjong = availableActions.includes('mahjong') && isMyTurn
  const canPassOut = availableActions.includes('pass-out')

  // Format turn duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Card className={`p-4 bg-white/90 backdrop-blur-sm ${className}`}>
      <div className="space-y-4">
        {/* Turn Status */}
        <div className="text-center">
          <div className="text-sm text-gray-600 mb-2">
            {isMyTurn ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="font-medium text-green-700">Your Turn</span>
                {turnDuration > 0 && (
                  <span className="text-gray-500">({formatDuration(turnDuration)})</span>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full" />
                <span>{currentPlayer ? `${currentPlayer}'s Turn` : 'Waiting for player'}</span>
              </div>
            )}
          </div>
          
          {wallCount > 0 && (
            <div className="text-xs text-gray-500">
              Wall: {wallCount} tiles remaining
            </div>
          )}
        </div>

        {/* Primary Actions */}
        {isMyTurn && (
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleDrawTile}
              disabled={!canDraw}
              variant={canDraw ? 'primary' : 'secondary'}
              className="text-sm py-2"
            >
              {canDraw ? '🎲 Draw Tile' : 'Already Drawn'}
            </Button>
            
            <Button
              onClick={handleMahjong}
              disabled={!canMahjong}
              variant={canMahjong ? 'primary' : 'secondary'}
              className="text-sm py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-300"
            >
              🏆 Mahjong
            </Button>
          </div>
        )}

        {/* Call Actions (for non-current players) */}
        {!isMyTurn && canCall && (
          <div className="text-center">
            <div className="text-xs text-gray-600 mb-2">Call opportunities will appear here</div>
            <Button
              disabled
              variant="secondary"
              className="text-sm py-1"
            >
              🔔 Wait for Call
            </Button>
          </div>
        )}

        {/* Advanced Actions */}
        <div className="border-t pt-3">
          <div className="text-xs font-medium text-gray-700 mb-2">Advanced Actions</div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              disabled={!canJokerSwap}
              variant="ghost"
              className="text-xs py-1"
              onClick={() => {
                // Open joker swap dialog
                setShowJokerSwapDialog(true)
              }}
            >
              🃏 Swap Joker
            </Button>
            
            <Button
              onClick={handlePassOut}
              disabled={!canPassOut}
              variant="ghost"
              className="text-xs py-1 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              🚫 Pass Out
            </Button>
          </div>
        </div>

        {/* Solo Mode Game End Controls */}
        {isSoloMode && (
          <div className="border-t pt-3">
            <div className="text-xs font-medium text-gray-700 mb-2">Game End (Physical Game)</div>
            <div className="space-y-2">
              <Button
                onClick={handleOtherPlayerWon}
                variant="secondary"
                className="w-full text-xs py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-800"
              >
                🏆 Other Player Won
              </Button>
              
              <Button
                onClick={handleGameDrawn}
                variant="secondary" 
                className="w-full text-xs py-1 bg-gray-100 hover:bg-gray-200 text-gray-800"
              >
                🤝 Game Drawn
              </Button>
            </div>
          </div>
        )}

        {/* Debug Info (development only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="border-t pt-2 text-xs text-gray-500">
            <div>Available: {availableActions.join(', ') || 'none'}</div>
            <div>My Turn: {isMyTurn ? 'yes' : 'no'}</div>
            <div>Can Draw: {canDraw ? 'yes' : 'no'}</div>
            <div>Can Discard: {canDiscard ? 'yes' : 'no'}</div>
          </div>
        )}
      </div>

      {/* Joker Swap Dialog */}
      {showJokerSwapDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">🃏 Joker Swap</h3>
            <p className="text-gray-600 mb-4">
              Select a joker from your hand and choose which tile to swap it with from exposed sets.
            </p>
            <div className="space-y-3">
              <div className="text-sm text-gray-500">
                • Jokers can be swapped for actual tiles in exposed pungs/kongs
                <br />
                • You must have the actual tile that the joker represents
                <br />
                • This gives you the joker back for other uses
              </div>
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="ghost" 
                  onClick={() => setShowJokerSwapDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    // For now, just close the dialog - full implementation would handle the swap
                    onAction('joker-swap', { message: 'Joker swap functionality will be fully implemented in a future update' })
                    setShowJokerSwapDialog(false)
                  }}
                >
                  Continue
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </Card>
  )
}

export default GameActionsPanel