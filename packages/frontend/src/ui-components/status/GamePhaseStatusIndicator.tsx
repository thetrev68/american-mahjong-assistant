/**
 * Game Phase Status Indicator
 * Real-time visual feedback for game phase progression and status
 */

import React from 'react'
import { useGameStore } from '../../stores/useGameStore'
import { usePatternStore } from '../../stores/pattern-store'
import { useTileStore } from '../../stores/tile-store'
import { useCharlestonStore } from '../../stores/charleston-store'
import { Card } from '../Card'

interface GamePhaseStatusProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center'
  compact?: boolean
  showProgress?: boolean
  className?: string
}

interface PhaseInfo {
  name: string
  icon: string
  color: string
  bgColor: string
  description: string
  progress?: number
  nextAction?: string
}

export const GamePhaseStatusIndicator: React.FC<GamePhaseStatusProps> = ({
  position = 'top-right',
  compact = false,
  showProgress = true,
  className = ''
}) => {
  const {
    gamePhase,
    players,
    wallTilesRemaining,
    currentTurn,
    coPilotMode,
    roomCode,
    alerts,
  } = useGameStore((state) => ({
    gamePhase: state.gamePhase ?? state.phase,
    players: state.players,
    wallTilesRemaining: state.wallTilesRemaining ?? state.wallCount,
    currentTurn: state.currentTurn ?? state.turnNumber,
    coPilotMode: state.coPilotMode,
    roomCode: state.roomCode,
    alerts: state.alerts,
  }));
  const patternStore = usePatternStore()
  const tileStore = useTileStore()
  const charlestonStore = useCharlestonStore()

  // Get current phase information
  const getPhaseInfo = (): PhaseInfo => {
    const currentPhase = gamePhase

    switch (currentPhase) {
      case 'lobby': {
        const playersReady = players.filter(p => p.isReady).length
        const totalPlayers = players.length
        const progress = totalPlayers > 0 ? (playersReady / totalPlayers) * 100 : 0
        
        return {
          name: 'Room Setup',
          icon: '🏠',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 border-blue-200',
          description: `${playersReady}/${totalPlayers} players ready`,
          progress: progress,
          nextAction: playersReady === totalPlayers ? 'Start Pattern Selection' : 'Wait for players'
        }
      }

      case 'tile-input': {
        const tilesCount = tileStore.handSize
        const expectedTiles = tileStore.dealerHand ? 14 : 13
        const tileProgress = (tilesCount / expectedTiles) * 100
        
        return {
          name: 'Tile Input',
          icon: '🀄',
          color: 'text-purple-600',
          bgColor: 'bg-purple-50 border-purple-200',
          description: `${tilesCount}/${expectedTiles} tiles entered`,
          progress: tileProgress,
          nextAction: tilesCount >= expectedTiles ? 'Proceed to Charleston' : 'Enter remaining tiles'
        }
      }

      case 'charleston': {
        const charlestonProgress = charlestonStore.currentPhase === 'complete' ? 100 : 
          charlestonStore.currentPhase === 'left' ? 75 :
          charlestonStore.currentPhase === 'across' ? 50 :
          charlestonStore.currentPhase === 'right' ? 25 : 0
        
        const roundNames = {
          'right': 'Right Pass',
          'across': 'Across Pass', 
          'left': 'Left Pass',
          'optional': 'Optional Round',
          'complete': 'Complete'
        }
        
        return {
          name: 'Charleston',
          icon: '🔄',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50 border-orange-200',
          description: roundNames[charlestonStore.currentPhase] || 'In Progress',
          progress: charlestonProgress,
          nextAction: charlestonStore.currentPhase === 'complete' ? 'Start Gameplay' : 'Continue Charleston'
        }
      }

      case 'playing': {
        const patterns = patternStore.targetPatterns.length
        const wallRemaining = wallTilesRemaining
        const gameProgress = wallRemaining > 0 ? ((152 - wallRemaining) / 152) * 100 : 100
        
        return {
          name: 'Gameplay',
          icon: '🎯',
          color: 'text-green-600',
          bgColor: 'bg-green-50 border-green-200',
          description: `${patterns} patterns • ${wallRemaining} tiles left`,
          progress: gameProgress,
          nextAction: 'Play your turn'
        }
      }

      case 'finished':
        return {
          name: 'Game Complete',
          icon: '🏆',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50 border-yellow-200',
          description: 'Game finished',
          progress: 100,
          nextAction: 'View results'
        }

      default:
        return {
          name: 'Unknown',
          icon: '❓',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50 border-gray-200',
          description: 'Status unknown',
          progress: 0
        }
    }
  }

  const phaseInfo = getPhaseInfo()

  // Position classes for floating indicator
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4', 
    'bottom-left': 'bottom-4 left-4',
    'center': 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'
  }

  // Compact version for minimal UI
  if (compact) {
    return (
      <div className={`
        fixed z-50 ${positionClasses[position]}
        flex items-center gap-3 px-4 py-3
        bg-white/90 backdrop-blur-sm border rounded-lg shadow-lg
        transition-all duration-300 hover:bg-white
        ${className}
      `}>
        {/* Phase icon and name */}
        <div className="flex items-center gap-2">
          <span className="text-lg">{phaseInfo.icon}</span>
          <div>
            <div className={`font-medium text-sm ${phaseInfo.color}`}>
              {phaseInfo.name}
            </div>
            <div className="text-xs text-gray-500">
              {phaseInfo.description}
            </div>
          </div>
        </div>

        {/* Progress indicator */}
        {showProgress && phaseInfo.progress !== undefined && (
          <div className="flex items-center gap-2 min-w-16">
            <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  phaseInfo.progress >= 100 ? 'bg-green-500' :
                  phaseInfo.progress >= 75 ? 'bg-blue-500' :
                  phaseInfo.progress >= 50 ? 'bg-yellow-500' : 'bg-orange-500'
                }`}
                style={{ width: `${Math.min(phaseInfo.progress, 100)}%` }}
              />
            </div>
            <span className="text-xs font-medium text-gray-600">
              {Math.round(phaseInfo.progress)}%
            </span>
          </div>
        )}
      </div>
    )
  }

  // Full version with detailed information
  return (
    <Card className={`
      fixed z-50 ${positionClasses[position]}
      ${phaseInfo.bgColor} border-2 shadow-xl
      transition-all duration-300 hover:shadow-2xl
      min-w-80 max-w-96
      ${className}
    `}>
      {/* Header with phase info */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{phaseInfo.icon}</div>
          <div>
            <h3 className={`font-bold text-lg ${phaseInfo.color}`}>
              {phaseInfo.name}
            </h3>
            <p className="text-sm text-gray-600">
              {phaseInfo.description}
            </p>
          </div>
        </div>
        
        {/* Current time */}
        <div className="text-right">
          <div className="text-xs text-gray-500">
            {new Date().toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
          <div className="text-xs text-gray-400">
            Turn {currentTurn}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {showProgress && phaseInfo.progress !== undefined && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm font-bold text-gray-900">
              {Math.round(phaseInfo.progress)}%
            </span>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-700 ease-out ${
                phaseInfo.progress >= 100 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                phaseInfo.progress >= 75 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                phaseInfo.progress >= 50 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' : 
                'bg-gradient-to-r from-orange-500 to-orange-600'
              }`}
              style={{ width: `${Math.min(phaseInfo.progress, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Phase-specific details */}
      <div className="space-y-3 mb-4">
        {gamePhase === 'lobby' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Co-Pilot Mode</div>
              <div className="font-medium capitalize">
                {coPilotMode || 'Not set'}
              </div>
            </div>
            <div className="bg-white/50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Room Code</div>
              <div className="font-mono font-medium">
                {roomCode || 'N/A'}
              </div>
            </div>
          </div>
        )}

        {gamePhase === 'charleston' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Round</div>
              <div className="font-medium">
                {charlestonStore.currentPhase === 'right' ? '1' : charlestonStore.currentPhase === 'across' ? '2' : '3'}/3
              </div>
            </div>
            <div className="bg-white/50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Direction</div>
              <div className="font-medium capitalize">
                {charlestonStore.currentPhase}
              </div>
            </div>
          </div>
        )}

        {gamePhase === 'playing' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Patterns</div>
              <div className="font-medium">
                {patternStore.targetPatterns.length} selected
              </div>
            </div>
            <div className="bg-white/50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Wall Tiles</div>
              <div className="font-medium">
                {wallTilesRemaining} remaining
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Next action */}
      {phaseInfo.nextAction && (
        <div className="border-t border-white/50 pt-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Next:</span>
            <span className="font-medium text-gray-700">
              {phaseInfo.nextAction}
            </span>
          </div>
        </div>
      )}

      {/* Game alerts */}
      {alerts.length > 0 && (
        <div className="border-t border-white/50 pt-4 mt-4">
          <div className="text-xs text-gray-500 mb-2">Active Alerts</div>
          <div className="space-y-1">
            {alerts.slice(0, 2).map((alert, index) => (
              <div key={index} className={`
                text-xs px-2 py-1 rounded-full
                ${alert.type === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                  alert.type === 'success' ? 'bg-green-100 text-green-700' :
                  alert.type === 'call' ? 'bg-purple-100 text-purple-700' :
                  'bg-blue-100 text-blue-700'}
              `}>
                {alert.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

