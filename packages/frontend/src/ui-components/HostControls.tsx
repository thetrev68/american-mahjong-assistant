// Host Controls Component
// Host-only management panel for room administration

import React, { useState } from 'react'
import { useRoomStore } from '../stores/room.store'
import { usePlayerStore } from '../stores/player.store'
import { getRoomMultiplayerService } from '../services/room-multiplayer'
import { Button } from './Button'
import { Card } from './Card'

const HostControls: React.FC = () => {
  const roomStore = useRoomStore()
  const playerStore = usePlayerStore()
  const [showSettings, setShowSettings] = useState(false)
  const [showTransferHost, setShowTransferHost] = useState(false)
  const [selectedNewHost, setSelectedNewHost] = useState('')
  const [roomSettings, setRoomSettings] = useState(roomStore.roomSettings)

  const roomService = getRoomMultiplayerService()
  const allPlayers = roomStore.players || []
  const connectedPlayers = allPlayers.filter(p => p.isConnected)
  const nonHostPlayers = connectedPlayers.filter(p => !p.isHost)
  
  // Handle kicking a player
  const handleKickPlayer = (playerId: string) => {
    if (!roomService) return
    
    const player = connectedPlayers.find(p => p.id === playerId)
    if (player && window.confirm(`Are you sure you want to kick ${player.name}?`)) {
      roomService.kickPlayer(playerId)
    }
  }

  // Handle transferring host
  const handleTransferHost = () => {
    if (!roomService || !selectedNewHost) return
    
    const newHost = connectedPlayers.find(p => p.id === selectedNewHost)
    if (newHost && window.confirm(`Transfer host role to ${newHost.name}?`)) {
      roomService.transferHost(selectedNewHost)
      setShowTransferHost(false)
      setSelectedNewHost('')
    }
  }

  // Handle updating room settings
  const handleUpdateSettings = () => {
    if (!roomService) return
    
    const changes = {
      maxPlayers: roomSettings.maxPlayers,
      isPrivate: roomSettings.isPrivate,
      roomName: roomSettings.roomName,
      allowSpectators: roomSettings.allowSpectators,
      turnTimeLimit: roomSettings.turnTimeLimit,
      allowReconnection: roomSettings.allowReconnection
    }
    
    roomService.updateRoomSettings(changes)
    setShowSettings(false)
  }

  // Reset settings to current values
  const resetSettings = () => {
    setRoomSettings(roomStore.roomSettings)
    setShowSettings(false)
  }

  // Check if current player is host
  if (!playerStore.isCurrentPlayerHost() || !roomStore.hostPermissions.canKickPlayers) {
    return null // Not a host or no permissions
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Host Controls</h3>
        <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
          Host Only
        </span>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          onClick={() => setShowSettings(true)}
          variant="secondary"
          size="sm"
          disabled={!roomStore.hostPermissions.canChangeSettings}
        >
          Room Settings
        </Button>
        <Button
          onClick={() => setShowTransferHost(true)}
          variant="secondary"
          size="sm"
          disabled={!roomStore.hostPermissions.canTransferHost || nonHostPlayers.length === 0}
        >
          Transfer Host
        </Button>
      </div>

      {/* Player Management */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-600">Player Management</h4>
        {nonHostPlayers.map((player) => (
          <div key={player.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${player.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm font-medium">{player.name}</span>
              {player.position && (
                <span className="text-xs text-gray-500">({player.position})</span>
              )}
            </div>
            <Button
              onClick={() => handleKickPlayer(player.id)}
              variant="secondary"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              disabled={!roomStore.hostPermissions.canKickPlayers}
            >
              Kick
            </Button>
          </div>
        ))}
        
        {nonHostPlayers.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-2">
            No other players to manage
          </p>
        )}
      </div>

      {/* Room Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={resetSettings}>
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Room Settings</h3>
            
            <div className="space-y-4">
              {/* Room Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Room Name
                </label>
                <input
                  type="text"
                  value={roomSettings.roomName || ''}
                  onChange={(e) => setRoomSettings({...roomSettings, roomName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter room name"
                />
              </div>

              {/* Max Players */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Players
                </label>
                <select
                  value={roomSettings.maxPlayers}
                  onChange={(e) => setRoomSettings({...roomSettings, maxPlayers: Number(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={2}>2 Players</option>
                  <option value={3}>3 Players</option>
                  <option value={4}>4 Players</option>
                </select>
              </div>

              {/* Turn Time Limit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Turn Time Limit (seconds, 0 = no limit)
                </label>
                <input
                  type="number"
                  value={roomSettings.turnTimeLimit}
                  onChange={(e) => setRoomSettings({...roomSettings, turnTimeLimit: Number(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="300"
                />
              </div>

              {/* Checkboxes */}
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={roomSettings.isPrivate}
                    onChange={(e) => setRoomSettings({...roomSettings, isPrivate: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm">Private Room</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={roomSettings.allowSpectators}
                    onChange={(e) => setRoomSettings({...roomSettings, allowSpectators: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm">Allow Spectators</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={roomSettings.allowReconnection}
                    onChange={(e) => setRoomSettings({...roomSettings, allowReconnection: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm">Allow Reconnection</span>
                </label>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <Button onClick={handleUpdateSettings} variant="primary" className="flex-1">
                Update Settings
              </Button>
              <Button onClick={resetSettings} variant="secondary" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Host Modal */}
      {showTransferHost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowTransferHost(false)}>
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Transfer Host Role</h3>
            
            <div className="space-y-3 mb-4">
              <p className="text-sm text-gray-600">
                Select a player to transfer host role to:
              </p>
              
              {nonHostPlayers.map((player) => (
                <label key={player.id} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="newHost"
                    value={player.id}
                    checked={selectedNewHost === player.id}
                    onChange={(e) => setSelectedNewHost(e.target.value)}
                    className="mr-3"
                  />
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${player.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="font-medium">{player.name}</span>
                    {player.position && (
                      <span className="text-sm text-gray-500">({player.position})</span>
                    )}
                    {!player.isConnected && (
                      <span className="text-xs text-red-600">(Disconnected)</span>
                    )}
                  </div>
                </label>
              ))}
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={handleTransferHost}
                variant="primary"
                className="flex-1"
                disabled={!selectedNewHost}
              >
                Transfer Host
              </Button>
              <Button
                onClick={() => {
                  setShowTransferHost(false)
                  setSelectedNewHost('')
                }}
                variant="secondary"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

export default HostControls