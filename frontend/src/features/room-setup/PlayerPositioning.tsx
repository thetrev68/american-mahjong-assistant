import React, { useState } from 'react'
import { type PlayerPosition } from '../../stores/room-store'

interface Player {
  id: string
  name: string
  isHost: boolean
}

interface PlayerPositioningProps {
  players: Player[]
  playerPositions: Record<string, PlayerPosition>
  currentPlayerId: string | null
  onPositionChange: (playerId: string, position: PlayerPosition) => void
  disabled?: boolean
  isSoloMode?: boolean
}

interface PositionInfo {
  id: PlayerPosition
  label: string
  icon: string
  gridClass: string
}

const positions: PositionInfo[] = [
  { id: 'north', label: 'North', icon: '↑', gridClass: 'col-start-2 row-start-1' },
  { id: 'east', label: 'East', icon: '→', gridClass: 'col-start-3 row-start-2' },
  { id: 'south', label: 'South', icon: '↓', gridClass: 'col-start-2 row-start-3' },
  { id: 'west', label: 'West', icon: '←', gridClass: 'col-start-1 row-start-2' }
]

export const PlayerPositioning: React.FC<PlayerPositioningProps> = ({
  players,
  playerPositions,
  currentPlayerId,
  onPositionChange,
  disabled = false,
  isSoloMode = false
}) => {
  const [selectedPlayerForAssignment, setSelectedPlayerForAssignment] = useState<string | null>(null)
  
  const getPlayerAtPosition = (position: PlayerPosition): Player | null => {
    const playerId = Object.entries(playerPositions).find(([, pos]) => pos === position)?.[0]
    return playerId ? players.find(p => p.id === playerId) || null : null
  }

  const getUnpositionedPlayers = (): Player[] => {
    const positionedPlayerIds = Object.keys(playerPositions)
    return players.filter(player => !positionedPlayerIds.includes(player.id))
  }

  const handlePositionClick = (position: PlayerPosition) => {
    if (disabled) return
    
    const playerAtPosition = getPlayerAtPosition(position)
    
    if (isSoloMode) {
      // Solo mode: host can assign any player to any position
      if (!currentPlayerId) return
      
      if (selectedPlayerForAssignment) {
        // Assign the selected player to this position
        onPositionChange(selectedPlayerForAssignment, position)
        setSelectedPlayerForAssignment(null)
      } else if (playerAtPosition) {
        // Click on an occupied position - select this player for reassignment
        setSelectedPlayerForAssignment(playerAtPosition.id)
      }
    } else {
      // Multiplayer mode: only assign yourself
      if (!currentPlayerId) return
      
      // Don't allow selecting occupied positions (unless it's the current player's position)
      if (playerAtPosition && playerAtPosition.id !== currentPlayerId) return
      
      onPositionChange(currentPlayerId, position)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent, position: PlayerPosition) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handlePositionClick(position)
    }
  }

  const isPositionAvailable = (position: PlayerPosition): boolean => {
    return !getPlayerAtPosition(position)
  }

  const isCurrentPlayerPosition = (position: PlayerPosition): boolean => {
    const playerAtPosition = getPlayerAtPosition(position)
    return playerAtPosition?.id === currentPlayerId
  }
  
  const canInteractWithPosition = (position: PlayerPosition): boolean => {
    if (isSoloMode) {
      // In solo mode, can always interact (either assign selected player or select positioned player)
      return true
    } else {
      // In multiplayer mode, can only interact if position is available or it's your position
      return isPositionAvailable(position) || isCurrentPlayerPosition(position)
    }
  }

  const positionedPlayersCount = Object.keys(playerPositions).length
  const unpositionedPlayers = getUnpositionedPlayers()

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {isSoloMode ? 'Assign Player Positions' : 'Choose Your Position'}
        </h2>
        <p className="text-gray-600">
          {isSoloMode 
            ? 'Click on a player below, then click on a table position to assign them'
            : 'Select where you\'d like to sit at the Mahjong table'
          }
        </p>
      </div>

      {/* Player Selection for Solo Mode */}
      {isSoloMode && unpositionedPlayers.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-3">Select Player to Position</h3>
          <div className="flex flex-wrap gap-2">
            {unpositionedPlayers.map((player) => (
              <button
                key={player.id}
                onClick={() => setSelectedPlayerForAssignment(player.id)}
                className={`
                  px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium
                  ${selectedPlayerForAssignment === player.id
                    ? 'border-primary-500 bg-primary-100 text-primary-700'
                    : 'border-blue-300 bg-white text-blue-700 hover:bg-blue-100'
                  }
                `}
              >
                {player.name}
                {player.isHost && <span className="ml-1">👑</span>}
              </button>
            ))}
          </div>
          {selectedPlayerForAssignment && (
            <p className="text-xs text-blue-600 mt-2">
              Now click on an empty table position to seat {players.find(p => p.id === selectedPlayerForAssignment)?.name}
            </p>
          )}
        </div>
      )}

      {/* Mahjong Table Layout */}
      <div className="flex justify-center">
        <div 
          className="grid grid-cols-3 grid-rows-3 gap-4 p-8 bg-green-50 border-4 border-green-200 rounded-xl"
          role="region"
          aria-label="Mahjong table with four seating positions"
        >
          {/* Center table indicator */}
          <div className="col-start-2 row-start-2 flex items-center justify-center bg-green-100 rounded-lg border-2 border-green-300">
            <div className="text-center text-green-700">
              <div className="text-2xl mb-1">🀄</div>
              <div className="text-xs font-medium">TABLE</div>
            </div>
          </div>

          {/* Position buttons */}
          {positions.map((position) => {
            const playerAtPosition = getPlayerAtPosition(position.id)
            const isAvailable = isPositionAvailable(position.id)
            const isCurrentPlayer = isCurrentPlayerPosition(position.id)
            const canSelect = canInteractWithPosition(position.id)
            const isSelectedForReassignment = isSoloMode && playerAtPosition && selectedPlayerForAssignment === playerAtPosition.id

            return (
              <button
                key={position.id}
                onClick={() => handlePositionClick(position.id)}
                onKeyDown={(e) => handleKeyDown(e, position.id)}
                disabled={disabled || !canSelect}
                className={`
                  ${position.gridClass} p-4 border-2 rounded-lg transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                  ${disabled 
                    ? 'opacity-50 cursor-not-allowed' 
                    : canSelect 
                      ? 'cursor-pointer hover:shadow-md' 
                      : 'cursor-not-allowed'
                  }
                  ${isSelectedForReassignment
                    ? 'border-yellow-500 bg-yellow-100 shadow-md'
                    : isCurrentPlayer 
                      ? 'border-primary-500 bg-primary-50 shadow-md' 
                      : isAvailable 
                        ? 'border-gray-300 bg-white hover:bg-primary-50 hover:border-primary-300' 
                        : 'border-gray-400 bg-gray-100'
                  }
                  ${isSoloMode && selectedPlayerForAssignment && isAvailable
                    ? 'ring-2 ring-blue-300 border-blue-400 bg-blue-50'
                    : ''
                  }
                `}
                aria-label={
                  playerAtPosition 
                    ? `${position.label} position occupied by ${playerAtPosition.name}${playerAtPosition.isHost ? ' (Host)' : ''}`
                    : `${position.label} position available for selection`
                }
              >
                <div className="text-center space-y-2">
                  <div className="text-2xl">{position.icon}</div>
                  <div className="font-medium text-sm">{position.label}</div>
                  
                  {playerAtPosition ? (
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-gray-900">
                        {playerAtPosition.name}
                        {playerAtPosition.isHost && (
                          <span className="ml-1" role="img" aria-label="Host">👑</span>
                        )}
                      </div>
                      {isCurrentPlayer && (
                        <div className="text-xs text-primary-600 font-medium">You</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 font-medium text-center">Available</div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Player Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Positioned Players */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-medium text-green-900 mb-3">Seated Players ({positionedPlayersCount})</h3>
          <div className="space-y-2">
            {Object.entries(playerPositions).map(([playerId, position]) => {
              const player = players.find(p => p.id === playerId)
              if (!player) return null
              
              return (
                <div key={playerId} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{player.name}</span>
                    {player.isHost && (
                      <span role="img" aria-label="Host">👑</span>
                    )}
                    {player.id === currentPlayerId && (
                      <span className="text-primary-600 text-xs">(You)</span>
                    )}
                  </div>
                  <span className="text-gray-600 capitalize">{position}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Waiting Players */}
        {unpositionedPlayers.length > 0 && (
          <div 
            className="bg-blue-50 border border-blue-200 rounded-lg p-4"
            role="region"
            aria-label="Players waiting to join table"
          >
            <h3 className="font-medium text-blue-900 mb-3">Waiting to Join ({unpositionedPlayers.length})</h3>
            <div className="space-y-2">
              {unpositionedPlayers.map((player) => (
                <div key={player.id} className="flex items-center space-x-2 text-sm">
                  <span className="font-medium">{player.name}</span>
                  {player.isHost && (
                    <span role="img" aria-label="Host">👑</span>
                  )}
                  {player.id === currentPlayerId && (
                    <span className="text-primary-600 text-xs">(You)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Game Status */}
      <div className="text-center">
        {positionedPlayersCount < 2 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-center space-x-2 text-yellow-700">
              <span role="img" aria-label="Waiting">⏳</span>
              <span className="font-medium">Waiting for more players to join...</span>
            </div>
            <p className="text-sm text-yellow-600 mt-1">
              Need at least 2 players to start the game
            </p>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-center space-x-2 text-green-700">
              <span role="img" aria-label="Ready">✅</span>
              <span className="font-medium">Ready to start the game!</span>
            </div>
            <p className="text-sm text-green-600 mt-1">
              {positionedPlayersCount} players positioned • Game can begin
            </p>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3">
          {isSoloMode ? 'Solo Mode Instructions:' : 'Position Instructions:'}
        </h3>
        <ul className="space-y-1 text-sm text-gray-600">
          {isSoloMode ? (
            <>
              <li className="flex items-center space-x-2">
                <span className="text-blue-500">•</span>
                <span>Click on a player name above to select them</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-blue-500">•</span>
                <span>Click on an empty table position to seat the selected player</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-blue-500">•</span>
                <span>Click on a seated player to select them for reassignment</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-blue-500">•</span>
                <span>All players must be positioned before the game can start</span>
              </li>
            </>
          ) : (
            <>
              <li className="flex items-center space-x-2">
                <span className="text-blue-500">•</span>
                <span>Click on an available position to take a seat</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-blue-500">•</span>
                <span>You can change your position by selecting a different seat</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-blue-500">•</span>
                <span>Positions determine turn order and tile dealing</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-blue-500">•</span>
                <span>Host controls when the game starts</span>
              </li>
            </>
          )}
        </ul>
      </div>
    </div>
  )
}