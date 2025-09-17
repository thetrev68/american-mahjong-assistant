import React from 'react'
import { Button } from '../../ui-components/Button'
import { useCharlestonStore } from '../../stores/charleston-store'

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
  onPauseGame?: () => void
  isPaused?: boolean
  nextPlayer?: string
  wallCount?: number
  onSwapJoker?: () => void
  onDeadHand?: () => void
}


const DramaticTimer: React.FC<{ 
  timeElapsed: number
  gamePhase: 'charleston' | 'gameplay'
}> = ({ timeElapsed, gamePhase }) => {
  const isUrgent = timeElapsed >= 30
  const minutes = Math.floor(timeElapsed / 60)
  const seconds = timeElapsed % 60
  
  // Phase-aware positioning and styling - moved down to avoid covering player names
  const position = gamePhase === 'charleston' ? 'top-32 right-4' : 'top-32 right-4'
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

const getCharlestonPassingDirection = (charlestonPhase: string, playerNames: string[]): string => {
  // In Charleston, "You" is always at position 0, other players at positions 1, 2, 3
  const allPlayers = playerNames // Should be ['You', 'Player2', 'Player3', 'Player4']
  if (allPlayers.length < 4) return 'Next Player'

  // Charleston passing directions from "You" (position 0)
  const passingPositions: Record<string, number> = {
    'right': 1,        // Pass to player on right (position 1)
    'across': 2,       // Pass to player across (position 2)
    'left': 3,         // Pass to player on left (position 3)
    'optional-right': 1,
    'optional-across': 2,
    'optional-left': 3
  }

  const targetPosition = passingPositions[charlestonPhase] || 1
  return allPlayers[targetPosition] || 'Next Player'
}

const getCharlestonReceivingDirection = (charlestonPhase: string, playerNames: string[]): string => {
  // In Charleston, "You" is always at position 0, other players at positions 1, 2, 3
  const allPlayers = playerNames // Should be ['You', 'Player2', 'Player3', 'Player4']
  if (allPlayers.length < 4) return 'Previous Player'

  // Charleston receiving directions - receiving is opposite of passing
  // right pass = receive from left, across pass = receive from across, left pass = receive from right
  const receivingPositions: Record<string, number> = {
    'right': 3,        // receive from left (position 3)
    'across': 2,       // receive from across (position 2)
    'left': 1,         // receive from right (position 1)
    'optional-right': 3,
    'optional-across': 2,
    'optional-left': 1
  }

  const sourcePosition = receivingPositions[charlestonPhase] || 3
  return allPlayers[sourcePosition] || 'Previous Player'
}

const getNextPlayer = (currentPlayer: string, playerNames: string[], gamePhase?: 'charleston' | 'gameplay'): string => {
  if (gamePhase === 'charleston') {
    // For Charleston, we need to know which Charleston phase we're in
    // This is a fallback - should be passed as a parameter
    const currentIndex = playerNames.findIndex(name => name === currentPlayer)
    if (currentIndex !== -1) {
      const nextIndex = (currentIndex + 1) % playerNames.length
      return playerNames[nextIndex]
    }
    return playerNames[1] || 'Next Player'
  }
  
  // Regular gameplay: clockwise turn order
  const currentIndex = playerNames.findIndex(name => name === currentPlayer)
  const nextIndex = (currentIndex + 1) % playerNames.length
  return playerNames[nextIndex]
}

const getReceivingFromPlayer = (currentPlayer: string, playerNames: string[]): string => {
  // In Charleston, you receive from the player before you (counter-clockwise)
  const currentIndex = playerNames.findIndex(name => name === currentPlayer)
  if (currentIndex !== -1) {
    const receivingIndex = (currentIndex - 1 + playerNames.length) % playerNames.length
    return playerNames[receivingIndex]
  }
  return playerNames[playerNames.length - 1] || 'Previous Player' // Fallback to last player
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
  onPauseGame,
  isPaused,
  nextPlayer: providedNextPlayer,
  wallCount = 0,
  onSwapJoker,
  onDeadHand,
}) => {

  const { currentPhase } = useCharlestonStore()
  
  // Get appropriate next player based on game phase
  const nextPlayer = providedNextPlayer || getNextPlayer(currentPlayer, playerNames, gamePhase)
  const phaseDisplayName = gamePhase === 'charleston' ? 'Charleston' : 'Game Mode'
  
  // Charleston-specific passing directions
  const passingToPlayer = gamePhase === 'charleston'
    ? getCharlestonPassingDirection(currentPhase, playerNames)
    : nextPlayer

  const receivingFromPlayer = gamePhase === 'charleston'
    ? getCharlestonReceivingDirection(currentPhase, playerNames)
    : getReceivingFromPlayer(currentPlayer, playerNames)

  return (
    <>
      <DramaticTimer timeElapsed={timeElapsed} gamePhase={gamePhase} />
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">{phaseDisplayName}</h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1">
            {gamePhase === 'charleston' ? (
              <div className="text-sm md:text-base text-gray-600 space-y-1">
                <div className="flex flex-wrap items-center gap-4">
                  <span>📤 Passing to: <span className="font-semibold text-blue-600">{passingToPlayer}</span></span>
                  <span>📥 Receiving from: <span className="font-semibold text-green-600">{receivingFromPlayer}</span></span>
                </div>
                <div className="text-xs text-gray-500">
                  All players select 3 tiles simultaneously
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm md:text-base text-gray-600">
                  🟢 {currentPlayer}{currentPlayer.endsWith('s') ? "'" : "'s"} turn
                  • Playing {selectedPatternsCount} pattern{selectedPatternsCount !== 1 ? 's' : ''}
                </p>
                <div className="text-xs md:text-sm text-gray-500">
                  {windRound.charAt(0).toUpperCase() + windRound.slice(1)} Round #{gameRound} • Next: {nextPlayer}
                  {wallCount > 0 && <span> • Wall: {wallCount} tiles remaining</span>}
                </div>
              </>
            )}
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
          <Button
            variant="ghost"
            size="sm"
            onClick={onPauseGame}
            className={isPaused ? "bg-yellow-100 text-yellow-700" : ""}
          >
            {isPaused ? 'Resume Game' : 'Pause Game'}
          </Button>
          {gamePhase === 'gameplay' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onSwapJoker}
                className="text-purple-600 border-purple-300 hover:bg-purple-50"
              >
                🃏 Swap Joker
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onDeadHand}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                🚫 Dead Hand
              </Button>
            </>
          )}
        </div>
      </div>
      </div>
    </>
  )
}

export default TopZone