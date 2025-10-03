// Room Lobby View Component
// Pre-game lobby with complete player management and host controls

import React, { useState } from 'react'
import { useRoomStore } from '../../stores/room.store'
import { usePlayerStore } from '../../stores/player.store'
import { useDevPerspectiveStore } from '../../stores/dev-perspective.store'
import { getRoomMultiplayerService } from '../../lib/services/room-multiplayer'
import { Button } from '../../ui-components/Button'
import { Card } from '../../ui-components/Card'
import HostControls from '../../ui-components/HostControls'
import DevShortcuts from '../../ui-components/DevShortcuts'

interface RoomLobbyViewProps {
  onStartGame?: () => void
  onLeaveRoom?: () => void
}

const RoomLobbyView: React.FC<RoomLobbyViewProps> = ({
  onStartGame,
  onLeaveRoom
}) => {
  const roomStore = useRoomStore()
  const playerStore = usePlayerStore()
  const devPerspective = useDevPerspectiveStore()
  const [copySuccess, setCopySuccess] = useState(false)

  // Copy room code to clipboard
  const copyRoomCode = async () => {
    if (!roomStore.room?.id) return
    
    try {
      await navigator.clipboard.writeText(roomStore.room.id)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('Failed to copy room code:', err)
    }
  }

  // Handle leaving the room
  const handleLeaveRoom = () => {
    const roomService = getRoomMultiplayerService()
    if (roomService) {
      roomService.leaveRoom()
    }
    onLeaveRoom?.()
  }

  // Handle starting the game
  const handleStartGame = () => {
    const roomService = getRoomMultiplayerService()
    if (roomService) {
      roomService.initiatePhaseTransition('waiting', 'setup')
    }
    onStartGame?.()
  }

  // Get player position color
  const getPositionColor = (position: string): string => {
    const colors = {
      east: 'bg-red-100 text-red-800',
      north: 'bg-blue-100 text-blue-800',
      west: 'bg-green-100 text-green-800',
      south: 'bg-yellow-100 text-yellow-800'
    }
    return colors[position as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  // Get connection status indicator  
  const getConnectionStatus = (player: { isConnected: boolean }) => {
    if (player.isConnected) {
      return <div className="w-2 h-2 bg-green-500 rounded-full" title="Connected" />
    } else {
      return <div className="w-2 h-2 bg-red-500 rounded-full" title="Disconnected" />
    }
  }

  const isHost = playerStore.isCurrentPlayerHost()
  const allPlayers = roomStore.players || []
  const readyPlayers = allPlayers.filter(p => p.roomReadiness && p.isConnected)
  const notReadyPlayers = allPlayers.filter(p => !p.roomReadiness && p.isConnected)

  if (!roomStore.room) {
    return (
      <Card className="p-6 text-center">
        <p className="text-gray-500">No room data available</p>
        <Button onClick={onLeaveRoom} variant="secondary" className="mt-4">
          Back to Room Setup
        </Button>
      </Card>
    )
  }

  // Handle dev perspective switching
  const handleSwitchPlayer = (playerId: string) => {
    devPerspective.setActiveDevPlayer(playerId)
  }

  // Register all players in dev mode
  React.useEffect(() => {
    if (import.meta.env.DEV && allPlayers.length > 0) {
      allPlayers.forEach(player => {
        devPerspective.registerPlayer(player.id)
      })
    }
  }, [allPlayers, devPerspective])

  return (
    <div className="space-y-6">
      {/* Dev Shortcuts - Multiplayer Mode */}
      {import.meta.env.DEV && allPlayers.length > 0 && (
        <DevShortcuts
          variant="multiplayer"
          onSwitchPlayer={handleSwitchPlayer}
          currentDevPlayerId={devPerspective.activeDevPlayerId}
          availablePlayerIds={devPerspective.allPlayerIds}
          realPlayerId={playerStore.currentPlayerId}
          onResetGame={() => {
            roomStore.clearRoomData()
            onLeaveRoom?.()
          }}
        />
      )}

      {/* Room Information */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">
            {roomStore.roomSettings.roomName || `Room ${roomStore.room?.id}`}
          </h2>
          <div className="flex items-center space-x-2">
            {roomStore.room.isPrivate && (
              <span className="px-2 py-1 text-xs bg-amber-100 text-amber-800 rounded">
                Private
              </span>
            )}
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
              {roomStore.room.gameMode?.toUpperCase() || 'NMJL-2025'}
            </span>
          </div>
        </div>

        {/* Room Code */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-4">
          <div>
            <p className="text-sm text-gray-600">Room Code</p>
            <p className="font-mono text-lg font-bold">{roomStore.room?.id}</p>
          </div>
          <Button
            onClick={copyRoomCode}
            variant="secondary"
            size="sm"
            className={copySuccess ? 'bg-green-100 text-green-800' : ''}
          >
            {copySuccess ? '✓ Copied' : 'Copy'}
          </Button>
        </div>

        {/* Room Status */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-gray-600">Players</div>
            <div className="font-semibold">
              {allPlayers.filter(p => p.isConnected).length} / {roomStore.roomSettings.maxPlayers}
            </div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-gray-600">Phase</div>
            <div className="font-semibold capitalize">{roomStore.currentPhase}</div>
          </div>
        </div>
      </Card>

      {/* Player List */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Players</h3>
        
        {/* Connected Players */}
        <div className="space-y-3 mb-6">
          {allPlayers.filter(p => p.isConnected).map((player) => (
            <div key={player.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                {getConnectionStatus(player)}
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{player.name}</span>
                    {player.isHost && (
                      <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                        Host
                      </span>
                    )}
                  </div>
                  {player.position && (
                    <span className={`inline-block px-2 py-1 text-xs rounded mt-1 ${getPositionColor(player.position)}`}>
                      {player.position.charAt(0).toUpperCase() + player.position.slice(1)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {player.roomReadiness ? (
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                    Ready
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                    Not Ready
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Disconnected Players */}
        {allPlayers.filter(p => !p.isConnected).length > 0 && (
          <div>
            <h4 className="text-md font-medium text-gray-600 mb-2">Disconnected</h4>
            <div className="space-y-2">
              {allPlayers.filter(p => !p.isConnected).map((player) => (
                <div key={player.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg opacity-60">
                  <div className="flex items-center space-x-3">
                    {getConnectionStatus(player)}
                    <span className="font-medium text-gray-600">{player.name}</span>
                    {player.isHost && (
                      <span className="px-1 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">
                        Host
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    Waiting to reconnect...
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Spectators */}
        {roomStore.spectators.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <h4 className="text-md font-medium text-gray-600 mb-2">Spectators</h4>
            <div className="space-y-2">
              {roomStore.spectators.map((spectator) => (
                <div key={spectator.id} className="flex items-center p-2 bg-blue-50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3" />
                  <span className="font-medium text-blue-800">{spectator.name}</span>
                  <span className="ml-2 px-1 py-0.5 text-xs bg-blue-100 text-blue-600 rounded">
                    Spectator
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Host Controls */}
      {isHost && (
        <HostControls />
      )}

      {/* Readiness Summary */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <span className="text-gray-600">Ready: </span>
            <span className="font-semibold text-green-600">{readyPlayers.length}</span>
            <span className="text-gray-600"> / </span>
            <span className="font-semibold">{allPlayers.filter(p => p.isConnected).length}</span>
          </div>
          <div className="text-xs text-gray-500">
            {notReadyPlayers.length > 0 && (
              <>Waiting for: {notReadyPlayers.map(p => p.name).join(', ')}</>
            )}
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex space-x-4">
        {isHost ? (
          <Button
            onClick={handleStartGame}
            variant="primary"
            className="flex-1"
            disabled={readyPlayers.length < 2 || notReadyPlayers.length > 0}
          >
            Start Game ({readyPlayers.length}/{allPlayers.filter(p => p.isConnected).length} Ready)
          </Button>
        ) : (
          <Button
            onClick={() => {
              const roomService = getRoomMultiplayerService()
              if (roomService) {
                roomService.syncPlayerState('room', { isReady: true })
              }
            }}
            variant="primary"
            className="flex-1"
            disabled={readyPlayers.some(p => p.id === playerStore.currentPlayerId)}
          >
            {readyPlayers.some(p => p.id === playerStore.currentPlayerId) ? 'Ready ✓' : 'Mark Ready'}
          </Button>
        )}
        
        <Button
          onClick={handleLeaveRoom}
          variant="secondary"
          className="px-6"
        >
          Leave Room
        </Button>
      </div>
    </div>
  )
}

export default RoomLobbyView