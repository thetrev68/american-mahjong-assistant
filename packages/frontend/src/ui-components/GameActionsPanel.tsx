// Game Actions Panel
// UI component for all player actions in turn-based gameplay

import React, { useState } from 'react'
import { Button } from './Button'
import { Card } from './Card'
import { JokerSwapDialog } from '../features/gameplay/components/JokerSwapDialog'
import type { GameAction } from '../features/gameplay/services/game-actions'

export interface GameActionsPanelProps {
  availableActions: GameAction[]
  onAction: (action: GameAction, data?: unknown) => Promise<void>
  isMyTurn: boolean
  currentPlayer?: string
  wallCount?: number
  className?: string
  isSoloMode?: boolean
}

export const GameActionsPanel: React.FC<GameActionsPanelProps> = ({
  availableActions,
  onAction,
  isMyTurn,
  currentPlayer,
  wallCount = 0,
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


  const canDraw = availableActions.includes('draw') && isMyTurn && wallCount > 0
  const canJokerSwap = availableActions.includes('joker-swap')
  const canMahjong = availableActions.includes('mahjong') && isMyTurn
  const canPassOut = availableActions.includes('pass-out')


  return (
    <Card className={`p-2 sm:p-3 bg-white/95 backdrop-blur-sm ${className}`}>
      <div className="space-y-2">
        {/* Compact Turn Status */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${isMyTurn ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            <span className={isMyTurn ? 'text-green-700 font-medium' : 'text-gray-600'}>
              {isMyTurn ? 'Your Turn' : (currentPlayer ? `${currentPlayer}'s Turn` : 'No player\'s Turn')}
            </span>
          </div>
          {wallCount > 0 && (
            <span className="text-gray-500">Wall: {wallCount} tiles remaining</span>
          )}
        </div>

        {/* Compact Actions Row */}
        <div className="flex gap-1 text-xs">
          {/* Primary Actions */}
          {isMyTurn && (
            <>
              <Button
                onClick={handleDrawTile}
                disabled={!canDraw}
                variant={canDraw ? 'primary' : 'secondary'}
                className="text-xs py-1 px-2 flex-1"
              >
                {canDraw ? '🎲 Draw' : 'Drawn'}
              </Button>

              <Button
                onClick={handleMahjong}
                disabled={!canMahjong}
                variant={canMahjong ? 'primary' : 'secondary'}
                className="text-xs py-1 px-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-300"
              >
                🏆 Mahjong
              </Button>
            </>
          )}

          {/* Advanced Actions - Always show */}
          <Button
            disabled={!canJokerSwap}
            variant="ghost"
            className="text-xs py-1 px-2"
            onClick={() => setShowJokerSwapDialog(true)}
          >
            🃏 Swap Joker
          </Button>

          <Button
            onClick={handlePassOut}
            disabled={!canPassOut}
            variant="ghost"
            className="text-xs py-1 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            🚫 Pass Out
          </Button>

          {/* Solo Mode Game End - Compact */}
          {isSoloMode && (
            <Button
              onClick={handleOtherPlayerWon}
              variant="secondary"
              className="text-xs py-1 px-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800"
            >
              🏆 Other Player Won
            </Button>
          )}
        </div>
      </div>

      {/* Joker Swap Dialog */}
      <JokerSwapDialog
        isOpen={showJokerSwapDialog}
        onClose={() => setShowJokerSwapDialog(false)}
        onSwap={async (data) => {
          await onAction('joker-swap', data)
          setShowJokerSwapDialog(false)
        }}
      />
    </Card>
  )
}

