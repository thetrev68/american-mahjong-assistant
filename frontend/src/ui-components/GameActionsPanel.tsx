// Game Actions Panel
// UI component for all player actions in turn-based gameplay

import React from 'react'
import { Button } from './Button'
import { Card } from './Card'
import type { GameAction, CallType } from '../services/game-actions'
import type { Tile } from '../types/tile-types'

export interface GameActionsPanelProps {
  availableActions: GameAction[]
  onAction: (action: GameAction, data?: unknown) => Promise<void>
  isMyTurn: boolean
  currentPlayer?: string
  wallCount?: number
  turnDuration?: number
  className?: string
}

export const GameActionsPanel: React.FC<GameActionsPanelProps> = ({
  availableActions,
  onAction,
  isMyTurn,
  currentPlayer,
  wallCount = 0,
  turnDuration = 0,
  className = ''
}) => {
  const handleDrawTile = async () => {
    await onAction('draw')
  }

  const handlePassOut = async () => {
    const confirmed = window.confirm('Are you sure you want to pass out? This will remove you from active play.')
    if (confirmed) {
      await onAction('pass-out', 'Hand not viable')
    }
  }

  const handleMahjong = async () => {
    // TODO: This would need to integrate with pattern selection
    console.log('Mahjong declaration - requires pattern validation')
    // For now, show placeholder
    alert('Mahjong declaration requires pattern validation - feature coming soon!')
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
                // TODO: Implement joker swap UI
                alert('Joker swap feature coming soon!')
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
    </Card>
  )
}

export default GameActionsPanel