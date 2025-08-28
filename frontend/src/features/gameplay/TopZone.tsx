import React from 'react'
import { Button } from '../../ui-components/Button'

interface TopZoneProps {
  gamePhase: 'charleston' | 'gameplay'
  currentPlayer: string
  timeElapsed: number
  playerNames: string[]
  windRound: 'east' | 'south' | 'west' | 'north'
  gameRound: number
  selectedPatternsCount: number
  findAlternativePatterns: () => void
  onNavigateToCharleston?: () => void
}

const formatTimer = (timeInSeconds: number): string => {
  const minutes = Math.floor(timeInSeconds / 60)
  const seconds = timeInSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

const getNextPlayer = (currentPlayer: string, playerNames: string[]): string => {
  const currentIndex = playerNames.findIndex(name => name === currentPlayer)
  const nextIndex = (currentIndex + 1) % playerNames.length
  return playerNames[nextIndex]
}

const TopZone: React.FC<TopZoneProps> = ({
  gamePhase,
  currentPlayer,
  timeElapsed,
  playerNames,
  windRound,
  gameRound,
  selectedPatternsCount,
  findAlternativePatterns,
  onNavigateToCharleston,
}) => {

  const nextPlayer = getNextPlayer(currentPlayer, playerNames)
  const phaseDisplayName = gamePhase === 'charleston' ? 'Charleston' : 'Game Mode'

  return (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">{phaseDisplayName}</h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1">
            <p className="text-sm md:text-base text-gray-600">
              🟢 {currentPlayer}'s turn • 
              Playing {selectedPatternsCount} pattern{selectedPatternsCount !== 1 ? 's' : ''} •
              ⏱️ {formatTimer(timeElapsed)}
            </p>
            <div className="text-xs md:text-sm text-gray-500">
              {windRound.charAt(0).toUpperCase() + windRound.slice(1)} Round #{gameRound} • 
              Next: {nextPlayer}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 sm:gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={findAlternativePatterns}
            disabled={selectedPatternsCount === 0}
            className="text-purple-600 border-purple-300 hover:bg-purple-50"
          >
            🔄 Switch Strategy
          </Button>
          <Button variant="outline" size="sm" onClick={onNavigateToCharleston}>
            Back to Charleston
          </Button>
          <Button variant="ghost" size="sm">
            Pause Game
          </Button>
        </div>
      </div>
    </div>
  )
}

export default TopZone