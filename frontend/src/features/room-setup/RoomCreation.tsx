import React, { useState } from 'react'
import { Button } from '../../ui-components/Button'
import { LoadingSpinner } from '../../ui-components/LoadingSpinner'

interface RoomCreationProps {
  hostName: string
  onHostNameChange: (name: string) => void
  onCreateRoom: (hostName: string) => void
  isCreating: boolean
  error: string | null
  disabled?: boolean
}

export const RoomCreation: React.FC<RoomCreationProps> = ({
  hostName,
  onHostNameChange,
  onCreateRoom,
  isCreating,
  error,
  disabled = false
}) => {
  const [validationError, setValidationError] = useState<string | null>(null)

  const validateHostName = (name: string): string | null => {
    const trimmedName = name.trim()
    
    if (!trimmedName) {
      return 'Please enter your name'
    }
    
    if (trimmedName.length < 2) {
      return 'Name must be at least 2 characters long'
    }
    
    if (trimmedName.length > 50) {
      return 'Name must be 50 characters or less'
    }
    
    return null
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const validation = validateHostName(hostName)
    if (validation) {
      setValidationError(validation)
      return
    }
    
    setValidationError(null)
    onCreateRoom(hostName.trim())
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value
    onHostNameChange(newName)
    
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e)
    }
  }

  const isFormDisabled = disabled || isCreating

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Create New Room
        </h2>
        <p className="text-gray-600">
          Creating a room will generate a 4-character code that others can use to join your game
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label 
            htmlFor="host-name" 
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Your Name *
          </label>
          <input
            id="host-name"
            type="text"
            value={hostName}
            onChange={handleNameChange}
            onKeyDown={handleKeyDown}
            placeholder="Enter your name"
            disabled={isFormDisabled}
            required
            className={`
              w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
              ${isFormDisabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
              ${validationError || error ? 'border-red-300' : 'border-gray-300'}
            `}
            maxLength={50}
          />
          
          {validationError && (
            <div className="mt-2 flex items-center space-x-2 text-red-600" role="alert">
              <span role="img" aria-label="Warning">⚠️</span>
              <span className="text-sm">{validationError}</span>
            </div>
          )}
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={isFormDisabled}
          className="w-full"
          aria-label={isCreating ? 'Creating room...' : 'Create room and generate join code'}
        >
          {isCreating ? (
            <div className="flex items-center justify-center space-x-2">
              <LoadingSpinner size="sm" />
              <span>Creating Room...</span>
            </div>
          ) : (
            'Create Room'
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

      {/* Room features info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3">Your room will include:</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-center space-x-2">
            <span className="text-green-500">✓</span>
            <span>Shareable room code for easy joining</span>
          </li>
          <li className="flex items-center space-x-2">
            <span className="text-green-500">✓</span>
            <span>Support for up to 4 players</span>
          </li>
          <li className="flex items-center space-x-2">
            <span className="text-green-500">✓</span>
            <span>AI co-pilot assistance (based on your selected mode)</span>
          </li>
          <li className="flex items-center space-x-2">
            <span className="text-green-500">✓</span>
            <span>Real-time game synchronization</span>
          </li>
        </ul>
      </div>

      {/* Hosting tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <span className="text-blue-500 mt-0.5" role="img" aria-label="Info">💡</span>
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">Hosting Tips:</p>
            <p>
              As the host, you'll be able to start the game once all players have joined and chosen their positions.
              Share your room code with other players to get started!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}