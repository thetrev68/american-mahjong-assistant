// Call Opportunity Modal
// Modal for responding to call opportunities (pung/kong) with 5-second timer

import React, { useState, useEffect } from 'react'
import { Button } from './Button'
import { Card } from './Card'
import { AnimatedTile } from './tiles/AnimatedTile'
import type { CallType } from '../services/game-actions'
import type { Tile } from '../types/tile-types'

export interface CallOpportunityData {
  tile: Tile
  discardingPlayer: string
  duration: number
  deadline: number
}

export interface CallOpportunityModalProps {
  opportunity: CallOpportunityData | null
  onRespond: (response: 'call' | 'pass', callType?: CallType) => void
  className?: string
}

export const CallOpportunityModal: React.FC<CallOpportunityModalProps> = ({
  opportunity,
  onRespond,
  className = ''
}) => {
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [hasResponded, setHasResponded] = useState(false)

  useEffect(() => {
    if (!opportunity) {
      setHasResponded(false)
      return
    }

    setHasResponded(false)
    
    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((opportunity.deadline - Date.now()) / 1000))
      setTimeRemaining(remaining)
      
      if (remaining <= 0 && !hasResponded) {
        // Auto-pass when timer expires
        handleResponse('pass')
      }
    }

    // Update immediately
    updateTimer()
    
    // Update every 100ms for smooth countdown
    const interval = setInterval(updateTimer, 100)
    
    return () => clearInterval(interval)
  }, [opportunity, hasResponded])

  const handleResponse = (response: 'call' | 'pass', callType?: CallType) => {
    if (hasResponded) return
    
    setHasResponded(true)
    onRespond(response, callType)
  }

  if (!opportunity || hasResponded) {
    return null
  }

  const progressPercentage = (timeRemaining / (opportunity.duration / 1000)) * 100

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className={`p-6 bg-white max-w-md w-full mx-4 ${className}`}>
        <div className="text-center space-y-4">
          {/* Header */}
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-gray-900">Call Opportunity!</h3>
            <p className="text-sm text-gray-600">
              {opportunity.discardingPlayer} discarded:
            </p>
          </div>

          {/* Discarded Tile */}
          <div className="flex justify-center">
            <AnimatedTile
              tile={opportunity.tile}
              isSelected={false}
              animationType="glow"
              className="transform scale-125"
            />
          </div>

          {/* Timer */}
          <div className="space-y-2">
            <div className="text-2xl font-bold text-red-600">
              {timeRemaining}s
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-red-600 h-2 rounded-full transition-all duration-100"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 gap-3">
            {/* Pung Option */}
            <Button
              onClick={() => handleResponse('call', 'pung')}
              variant="primary"
              className="py-3 bg-blue-600 hover:bg-blue-700"
            >
              🀄 Call Pung
              <span className="block text-xs opacity-75">
                (3 of the same tile)
              </span>
            </Button>

            {/* Kong Option */}
            <Button
              onClick={() => handleResponse('call', 'kong')}
              variant="primary"
              className="py-3 bg-purple-600 hover:bg-purple-700"
            >
              🀄🀄 Call Kong
              <span className="block text-xs opacity-75">
                (4 of the same tile)
              </span>
            </Button>

            {/* Pass Option */}
            <Button
              onClick={() => handleResponse('pass')}
              variant="ghost"
              className="py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100"
            >
              👋 Pass
            </Button>
          </div>

          {/* Warning */}
          {timeRemaining <= 2 && (
            <div className="text-xs text-red-600 animate-pulse">
              ⚠️ Auto-pass in {timeRemaining} second{timeRemaining !== 1 ? 's' : ''}!
            </div>
          )}

          {/* Help Text */}
          <div className="text-xs text-gray-500 border-t pt-3">
            <p>Choose quickly! You need the matching tiles in your hand to call.</p>
            <p className="mt-1">Calling will interrupt the turn order and give you the turn.</p>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default CallOpportunityModal