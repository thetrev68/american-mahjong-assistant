import React, { useState, useEffect } from 'react'
import { useRoomSetup } from '../../hooks/useRoomSetup'
import { useRoomStore } from '../../stores/room-store'
import { useMultiplayerStore } from '../../stores/multiplayer-store'
import { CoPilotModeSelector } from './CoPilotModeSelector'
import { RoomCreation } from './RoomCreation'
import { RoomJoining } from './RoomJoining'
import { PlayerPositioning } from './PlayerPositioning'
import { Button } from '../../ui-components/Button'

type RoomMode = 'create' | 'join'

interface ProgressStep {
  number: number
  title: string
  description: string
}

const steps: ProgressStep[] = [
  { number: 1, title: 'Co-Pilot Mode', description: 'Choose AI assistance level' },
  { number: 2, title: 'Room Setup', description: 'Create or join a room' },
  { number: 3, title: 'Player Positions', description: 'Choose your seat' }
]

export const RoomSetupView: React.FC = () => {
  const roomSetup = useRoomSetup()
  const roomStore = useRoomStore()
  const multiplayerStore = useMultiplayerStore()
  
  const [roomMode, setRoomMode] = useState<RoomMode>('create')
  const [hostName, setHostName] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [roomCodeInput, setRoomCodeInput] = useState('')
  const [forceStep, setForceStep] = useState<string | null>(null)

  const currentStep = forceStep || roomSetup.setupProgress.currentStep
  const currentStepNumber = steps.findIndex(s => s.title.toLowerCase().includes(currentStep.split('-')[0])) + 1
  
  const handleStartGame = () => {
    // This would navigate to the game view
    console.log('Starting game...')
  }

  const handleBackStep = () => {
    switch (currentStep) {
      case 'room-creation':
        // Reset the co-pilot mode selection so user can change it
        roomStore.resetCoPilotModeSelection()
        // Also reset room creation status and clear errors
        roomStore.setRoomCreationStatus('idle')
        roomStore.clearError()
        setForceStep('mode-selection')
        break
      case 'player-positioning':
        setForceStep('room-creation')
        break
    }
  }

  const handleContinueFromModeSelection = () => {
    setForceStep('room-creation')
  }

  // Effect to clear forceStep when room is successfully created so natural progression works
  useEffect(() => {
    if (forceStep === 'room-creation' && roomStore.currentRoomCode && roomStore.roomCreationStatus === 'success') {
      setForceStep(null) // Clear forced step to allow natural progression to player-positioning
    }
  }, [forceStep, roomStore.currentRoomCode, roomStore.roomCreationStatus])

  const renderProgressIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-center space-x-4">
        {steps.map((step, index) => {
          const isCompleted = index < roomSetup.setupProgress.completedSteps
          const isCurrent = index === currentStepNumber - 1
          
          return (
            <div key={step.number} className="flex items-center">
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors
                  ${isCompleted 
                    ? 'bg-green-500 text-white' 
                    : isCurrent 
                      ? 'bg-primary-500 text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }
                `}>
                  {isCompleted ? '✓' : step.number}
                </div>
                <div className="mt-2 text-center">
                  <div className={`text-sm font-medium ${isCurrent ? 'text-primary-600' : 'text-gray-600'}`}>
                    {step.title}
                  </div>
                  <div className="text-xs text-gray-500">{step.description}</div>
                </div>
              </div>
              
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className={`
                  w-12 h-0.5 mx-4 mt-[-24px] transition-colors
                  ${index < roomSetup.setupProgress.completedSteps ? 'bg-green-500' : 'bg-gray-200'}
                `} />
              )}
            </div>
          )
        })}
      </div>
      
      <div className="text-center mt-4">
        <span className="text-sm text-gray-600">
          Step {currentStepNumber} of {steps.length}
        </span>
      </div>
    </div>
  )

  const renderStepContent = () => {
    switch (currentStep) {
      case 'mode-selection':
        return (
          <CoPilotModeSelector
            selectedMode={roomSetup.coPilotMode}
            onModeChange={roomSetup.setCoPilotMode}
            onContinue={handleContinueFromModeSelection}
            disabled={roomSetup.isCreatingRoom || roomSetup.isJoiningRoom}
          />
        )

      case 'room-creation':
        return (
          <div className="space-y-6">
            {/* Mode tabs */}
            <div className="flex justify-center">
              <div className="bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setRoomMode('create')}
                  className={`
                    px-4 py-2 rounded-md text-sm font-medium transition-colors
                    ${roomMode === 'create'
                      ? 'bg-white text-primary-600 border border-primary-500 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                    }
                  `}
                >
                  Create Room
                </button>
                <button
                  onClick={() => setRoomMode('join')}
                  className={`
                    px-4 py-2 rounded-md text-sm font-medium transition-colors
                    ${roomMode === 'join'
                      ? 'bg-white text-primary-600 border border-primary-500 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                    }
                  `}
                >
                  Join Room
                </button>
              </div>
            </div>

            {/* Mode content */}
            {roomMode === 'create' ? (
              <RoomCreation
                hostName={hostName}
                onHostNameChange={setHostName}
                onCreateRoom={roomSetup.createRoom}
                isCreating={roomSetup.isCreatingRoom}
                error={roomSetup.error}
                disabled={roomSetup.isJoiningRoom}
                coPilotMode={roomSetup.coPilotMode}
              />
            ) : (
              <RoomJoining
                roomCode={roomCodeInput}
                playerName={playerName}
                onRoomCodeChange={setRoomCodeInput}
                onPlayerNameChange={setPlayerName}
                onJoinRoom={roomSetup.joinRoom}
                isJoining={roomSetup.isJoiningRoom}
                error={roomSetup.error}
                disabled={roomSetup.isCreatingRoom}
              />
            )}
          </div>
        )

      case 'player-positioning':
        return (
          <div className="space-y-6">
            {/* Room info */}
            {roomSetup.coPilotMode === 'solo' ? (
              <div className="text-center bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-green-900 font-medium">
                  Solo Game Setup
                </div>
                <div className="text-sm text-green-600 mt-1">
                  Choose where you want to sit at the table
                </div>
              </div>
            ) : (
              <div className="text-center bg-primary-50 border border-primary-200 rounded-lg p-4">
                <div className="text-primary-900 font-medium">
                  Room Code: <span className="font-mono text-lg">{roomSetup.roomCode}</span>
                </div>
                <div className="text-sm text-primary-600 mt-1">
                  Share this code with other players to join
                </div>
              </div>
            )}

            <PlayerPositioning
              players={multiplayerStore.currentRoom?.players || []}
              playerPositions={roomStore.playerPositions}
              currentPlayerId={multiplayerStore.currentPlayerId}
              onPositionChange={roomStore.setPlayerPosition}
              disabled={false}
              coPilotMode={roomSetup.coPilotMode}
              otherPlayerNames={roomStore.otherPlayerNames}
              hostName={hostName}
            />
          </div>
        )

      case 'ready':
        return (
          <div className="space-y-6 text-center">
            <div className="bg-green-50 border border-green-200 rounded-lg p-8">
              <div className="text-4xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-green-900 mb-2">
                Setup Complete!
              </h2>
              <p className="text-green-700">
                All players are positioned and ready to begin
              </p>
            </div>

            {roomSetup.isHost ? (
              <Button
                onClick={handleStartGame}
                variant="primary"
                size="lg"
                className="w-full max-w-md mx-auto"
              >
                Start Game
              </Button>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-blue-700">
                  Waiting for host to start the game...
                </div>
              </div>
            )}
          </div>
        )

      default:
        return <div>Unknown step</div>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header with Start Over */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Room Setup</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              roomStore.resetToStart()
              window.location.reload() // Force refresh to reset all state
            }}
            className="text-red-600 hover:bg-red-50"
          >
            🔄 Start Over
          </Button>
        </div>

        {renderProgressIndicator()}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {/* Error display */}
          {roomSetup.error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-red-500" role="img" aria-label="Error">⚠️</span>
                  <span className="text-red-700 font-medium">{roomSetup.error}</span>
                </div>
                <button
                  onClick={roomSetup.clearError}
                  className="text-red-500 hover:text-red-700 text-sm"
                  aria-label="Dismiss error"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Step content */}
          {renderStepContent()}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <div>
              {currentStepNumber > 1 && currentStep !== 'ready' && (
                <Button
                  onClick={handleBackStep}
                  variant="secondary"
                  aria-label="Go back to previous step"
                >
                  ← Back
                </Button>
              )}
            </div>
            
            <div className="text-sm text-gray-500">
              {currentStep === 'mode-selection' && 'Select your preferred AI assistance mode'}
              {currentStep === 'room-creation' && 'Create a new room or join an existing one'}
              {currentStep === 'player-positioning' && 'Choose where you want to sit'}
              {currentStep === 'ready' && 'All set! Ready to play Mahjong'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}