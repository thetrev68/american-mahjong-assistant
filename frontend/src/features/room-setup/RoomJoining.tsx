import React, { useState } from 'react'
import { Button } from '../../ui-components/Button'
import { LoadingSpinner } from '../../ui-components/LoadingSpinner'

interface RoomJoiningProps {
  roomCode: string
  playerName: string
  onRoomCodeChange: (code: string) => void
  onPlayerNameChange: (name: string) => void
  onJoinRoom: (roomCode: string, playerName: string) => void
  isJoining: boolean
  error: string | null
  disabled?: boolean
}

export const RoomJoining: React.FC<RoomJoiningProps> = ({
  roomCode,
  playerName,
  onRoomCodeChange,
  onPlayerNameChange,
  onJoinRoom,
  isJoining,
  error,
  disabled = false
}) => {
  const [validationErrors, setValidationErrors] = useState<{
    roomCode?: string
    playerName?: string
  }>({})

  const validateForm = (): boolean => {
    const errors: typeof validationErrors = {}
    
    if (!roomCode.trim()) {
      errors.roomCode = 'Please enter a room code'
    } else if (roomCode.trim().length !== 4) {
      errors.roomCode = 'Room code must be exactly 4 characters'
    }
    
    if (!playerName.trim()) {
      errors.playerName = 'Please enter your name'
    } else if (playerName.trim().length < 2) {
      errors.playerName = 'Name must be at least 2 characters long'
    } else if (playerName.trim().length > 50) {
      errors.playerName = 'Name must be 50 characters or less'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    onJoinRoom(roomCode.trim().toUpperCase(), playerName.trim())
  }

  const handleRoomCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newCode = e.target.value.toUpperCase()
    
    // Limit to 4 characters and allow only alphanumeric
    newCode = newCode.replace(/[^A-Z0-9]/g, '').slice(0, 4)
    
    onRoomCodeChange(newCode)
    
    // Clear validation error when user starts typing
    if (validationErrors.roomCode) {
      setValidationErrors(prev => ({ ...prev, roomCode: undefined }))
    }
  }

  const handlePlayerNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value
    onPlayerNameChange(newName)
    
    // Clear validation error when user starts typing
    if (validationErrors.playerName) {
      setValidationErrors(prev => ({ ...prev, playerName: undefined }))
    }
  }

  const isFormDisabled = disabled || isJoining

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Join Existing Room
        </h2>
        <p className="text-gray-600">
          Enter the 4-character room code shared by your host to join their game
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label 
            htmlFor="room-code" 
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Room Code *
          </label>
          <input
            id="room-code"
            type="text"
            value={roomCode}
            onChange={handleRoomCodeChange}
            placeholder="ABCD"
            disabled={isFormDisabled}
            required
            className={`
              w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
              font-mono text-center text-lg tracking-wider uppercase
              ${isFormDisabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
              ${validationErrors.roomCode || error ? 'border-red-300' : 'border-gray-300'}
            `}
            maxLength={4}
          />
          
          {validationErrors.roomCode && (
            <div className="mt-2 flex items-center space-x-2 text-red-600" role="alert">
              <span role="img" aria-label="Warning">⚠️</span>
              <span className="text-sm">{validationErrors.roomCode}</span>
            </div>
          )}
        </div>

        <div>
          <label 
            htmlFor="player-name" 
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Your Name *
          </label>
          <input
            id="player-name"
            type="text"
            value={playerName}
            onChange={handlePlayerNameChange}
            placeholder="Enter your name"
            disabled={isFormDisabled}
            required
            className={`
              w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
              ${isFormDisabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
              ${validationErrors.playerName || error ? 'border-red-300' : 'border-gray-300'}
            `}
            maxLength={50}
          />
          
          {validationErrors.playerName && (
            <div className="mt-2 flex items-center space-x-2 text-red-600" role="alert">
              <span role="img" aria-label="Warning">⚠️</span>
              <span className="text-sm">{validationErrors.playerName}</span>
            </div>
          )}
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={isFormDisabled}
          className="w-full"
          aria-label={isJoining ? 'Joining room...' : 'Join room with entered code and name'}
        >
          {isJoining ? (
            <div className="flex items-center justify-center space-x-2">
              <LoadingSpinner size="sm" />
              <span>Joining Room...</span>
            </div>
          ) : (
            'Join Room'
          )}
        </Button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4" role="alert">
          <div className="flex items-center space-x-2">
            <span className="text-red-500" role="img" aria-label="Error">⚠️</span>
            <span className="text-red-600 text-sm font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Join instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3">Joining a room:</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-center space-x-2">
            <span className="text-blue-500">•</span>
            <span>Room codes are case-insensitive and exactly 4 characters</span>
          </li>
          <li className="flex items-center space-x-2">
            <span className="text-blue-500">•</span>
            <span>You'll inherit the host's co-pilot mode settings</span>
          </li>
          <li className="flex items-center space-x-2">
            <span className="text-blue-500">•</span>
            <span>You can choose your seating position once joined</span>
          </li>
          <li className="flex items-center space-x-2">
            <span className="text-blue-500">•</span>
            <span>The game starts when all players are ready</span>
          </li>
        </ul>
      </div>

      {/* Connection tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <span className="text-blue-500 mt-0.5" role="img" aria-label="Info">💡</span>
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">Join Tips:</p>
            <p>
              Make sure you're on the same network as the host, or that the host has shared 
              their IP address if playing across different networks.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}