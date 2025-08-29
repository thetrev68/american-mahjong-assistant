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
  nextPlayer?: string
}


const DramaticTimer: React.FC<{ 
  timeElapsed: number
  gamePhase: 'charleston' | 'gameplay'
}> = ({ timeElapsed, gamePhase }) => {
  const isUrgent = timeElapsed >= 30
  const minutes = Math.floor(timeElapsed / 60)
  const seconds = timeElapsed % 60
  
  // Phase-aware positioning and styling
  const position = gamePhase === 'charleston' ? 'top-4 left-4' : 'top-4 right-4'
  const priority = gamePhase === 'charleston' ? 'low' : 'high'
  const size = priority === 'low' ? 'text-base px-3 py-2' : 'text-lg px-4 py-3'
  
  return (
    <div 
      className={`
        fixed ${position} z-40 ${size} rounded-full font-bold shadow-lg transition-all duration-500
        ${isUrgent && priority === 'high'
          ? 'bg-red-500 text-white animate-pulse border-2 border-red-300' 
          : isUrgent && priority === 'low'
          ? 'bg-yellow-500 text-white border-2 border-yellow-300'
          : priority === 'high'
          ? 'bg-blue-500 text-white border-2 border-blue-300'
          : 'bg-gray-500 text-white border-2 border-gray-300'
        }
      `}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">
          {isUrgent ? '🔥' : '⏱️'}
        </span>
        <span>
          {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
        </span>
      </div>
    </div>
  )
}

const getNextPlayer = (currentPlayer: string, playerNames: string[], gamePhase?: 'charleston' | 'gameplay'): string => {
  if (gamePhase === 'charleston') {
    // For Charleston, the "next" refers to who will receive your tiles
    // This should be passed from the parent component
    return 'Receiving Player' // Will be overridden by parent
  }
  
  // Regular gameplay: counterclockwise turn order
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
  nextPlayer: providedNextPlayer,
}) => {

  const nextPlayer = providedNextPlayer || getNextPlayer(currentPlayer, playerNames, gamePhase)
  const phaseDisplayName = gamePhase === 'charleston' ? 'Charleston' : 'Game Mode'

  return (
    <>
      <DramaticTimer timeElapsed={timeElapsed} gamePhase={gamePhase} />
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">{phaseDisplayName}</h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1">
            <p className="text-sm md:text-base text-gray-600">
              🟢 {currentPlayer}'s turn 
              {gamePhase === 'gameplay' && (
                <>
                  • Playing {selectedPatternsCount} pattern{selectedPatternsCount !== 1 ? 's' : ''}
                </>
              )}
            </p>
            <div className="text-xs md:text-sm text-gray-500">
              {windRound.charAt(0).toUpperCase() + windRound.slice(1)} Round #{gameRound} • 
              Next: {nextPlayer}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 sm:gap-2">
          {gamePhase === 'gameplay' && (
            <>
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
            </>
          )}
          <Button variant="ghost" size="sm">
            Pause Game
          </Button>
        </div>
      </div>
      </div>
    </>
  )
}

export default TopZone