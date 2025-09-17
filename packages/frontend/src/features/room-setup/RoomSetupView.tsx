import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRoomSetup } from '../../hooks/useRoomSetup'
import { useRoomSetupStore } from '../../stores/room-setup.store'
import { useMultiplayerStore } from '../../stores/multiplayer-store'
import { useGameStore } from '../../stores/game-store'
import { usePlayerStore } from '../../stores/player.store'
import { CoPilotModeSelector } from './CoPilotModeSelector'
import { RoomCreation } from './RoomCreation'
import { RoomJoining } from './RoomJoining'
import { PlayerPositioning } from './PlayerPositioning'
import { Button } from '../../ui-components/Button'
import { ShareButton } from '../../ui-components/ShareButton'
import { Container } from '../../ui-components/layout/Container'
import { Card } from '../../ui-components/Card'
import DevShortcuts from '../../ui-components/DevShortcuts'

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
  const navigate = useNavigate()
  const roomSetup = useRoomSetup()
  const roomSetupStore = useRoomSetupStore()
  const multiplayerStore = useMultiplayerStore()
  const gameStore = useGameStore()
  const playerStore = usePlayerStore()
  
  const [roomMode, setRoomMode] = useState<RoomMode>('create')
  const [hostName, setHostName] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [roomCodeInput, setRoomCodeInput] = useState('')
  const [forceStep, setForceStep] = useState<string | null>(null)
  const [isStartingGame, setIsStartingGame] = useState(false)

  // Check for URL parameters to auto-fill room code and switch to join mode
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const joinCode = urlParams.get('join')
    
    if (joinCode && joinCode.length === 4) {
      setRoomCodeInput(joinCode.toUpperCase())
      setRoomMode('join')
      // Clear the URL parameter to avoid confusion on refresh
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, [])

  const currentStep = forceStep || roomSetup.setupProgress.currentStep
  const currentStepNumber = steps.findIndex(s => s.title.toLowerCase().includes(currentStep.split('-')[0])) + 1
  
  const handleStartGame = async () => {
    setIsStartingGame(true)

    try {
      // Starting game - first need to input tiles
      // Mark the game as started in game store for route guards
      gameStore.setGamePhase('tile-input')

      // Always go to tile input first, then Charleston, then game
      navigate('/tiles')

    } catch (error) {
      console.error('Error starting game:', error)
      setIsStartingGame(false)
    }
  }

  // Dev shortcut functions
  const handleFillTestData = async () => {
    if (roomMode === 'create') {
      setHostName('Trevor')
      // Auto-trigger room creation with test data - only pass other players, host is added automatically
      const otherPlayers = ['Kim', 'Jordan', 'Emilie']
      await roomSetup.createRoom('Trevor', otherPlayers)
    } else {
      setPlayerName('Trevor')
      setRoomCodeInput('TEST')
    }
  }

  const handleSkipToCharleston = () => {
    // Set up a complete game state and navigate to Charleston
    gameStore.setGamePhase('charleston')
    navigate('/charleston')
  }

  const handleSkipToGameplay = () => {
    // Set up a complete game state and navigate to gameplay
    gameStore.setGamePhase('gameplay')
    navigate('/game')
  }

  const handleResetGame = () => {
    // Reset all stores and navigate back to setup
    roomSetupStore.resetToStart()
    gameStore.resetGame()
    navigate('/')
  }

  const handleAutoPosition = () => {
    // Auto-position all players in the current room
    const players = multiplayerStore.currentRoom?.players || []
    console.log('Auto-positioning players:', players)

    const trevorPlayer = players.find(p => p.name === 'Trevor')
    const kimPlayer = players.find(p => p.name === 'Kim')
    const jordanPlayer = players.find(p => p.name === 'Jordan')
    const emiliePlayer = players.find(p => p.name === 'Emilie')

    if (trevorPlayer) {
      console.log('Positioning Trevor at east')
      playerStore.setPlayerPosition(trevorPlayer.id, 'east')
    }
    if (kimPlayer) {
      console.log('Positioning Kim at north')
      playerStore.setPlayerPosition(kimPlayer.id, 'north')
    }
    if (jordanPlayer) {
      console.log('Positioning Jordan at west')
      playerStore.setPlayerPosition(jordanPlayer.id, 'west')
    }
    if (emiliePlayer) {
      console.log('Positioning Emilie at south')
      playerStore.setPlayerPosition(emiliePlayer.id, 'south')
    }
  }

  const handleBackStep = () => {
    switch (currentStep) {
      case 'room-creation':
        // Reset the co-pilot mode selection so user can change it
        roomSetupStore.resetCoPilotModeSelection()
        // Also reset room creation status and clear errors
        roomSetupStore.setRoomCreationStatus('idle')
        roomSetupStore.clearError()
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
    if (forceStep === 'room-creation' && roomSetup.roomCode && roomSetupStore.roomCreationStatus === 'success') {
      setForceStep(null) // Clear forced step to allow natural progression to player-positioning
    }
  }, [forceStep, roomSetup.roomCode, roomSetupStore.roomCreationStatus])

  const renderProgressIndicator = () => (
    <Card variant="default" padding="sm" className="mb-8">
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
    </Card>
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
              <Card variant="default" className="text-center mb-6 bg-green-50 border-green-200">
                <div className="text-green-900 font-medium">
                  Solo Game Setup
                </div>
                <div className="text-sm text-green-600 mt-1">
                  Choose where you want to sit at the table
                </div>
              </Card>
            ) : (
              <Card variant="default" className="text-center mb-6 bg-primary-50 border-primary-200">
                <div className="text-primary-900 font-medium flex items-center justify-center space-x-3">
                  <span>Room Code: <span className="font-mono text-lg">{roomSetup.roomCode}</span></span>
                  {/* Show share button for host (multiple fallback conditions for reliability) */}
                  {(roomSetup.isHost || 
                    roomSetupStore.roomCreationStatus === 'success' || 
                    multiplayerStore.currentRoom?.hostId === multiplayerStore.currentPlayerId) && roomSetup.roomCode && (
                    <ShareButton 
                      roomCode={roomSetup.roomCode}
                      disabled={roomSetup.isCreatingRoom || roomSetup.isJoiningRoom}
                    />
                  )}
                </div>
                <div className="text-sm text-primary-600 mt-1">
                  Share this code with other players to join
                </div>
              </Card>
            )}

            <PlayerPositioning
              players={multiplayerStore.currentRoom?.players || []}
              currentPlayerId={multiplayerStore.currentPlayerId}
              disabled={false}
              isSoloMode={roomSetupStore.coPilotMode === 'solo'}
            />
          </div>
        )

      case 'ready':
        return (
          <div className="space-y-6 text-center">
            <Card variant="default" className="p-8 bg-green-50 border-green-200">
              <div className="text-4xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-green-900 mb-2">
                Setup Complete!
              </h2>
              <p className="text-green-700">
                All players are positioned and ready to begin
              </p>
            </Card>

            {roomSetup.isHost ? (
              <Button
                onClick={handleStartGame}
                variant="primary"
                size="lg"
                className="w-full max-w-md mx-auto"
                disabled={isStartingGame}
              >
                {isStartingGame ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Starting Game...</span>
                  </div>
                ) : (
                  'Start Game'
                )}
              </Button>
            ) : (
              <Card variant="default" className="bg-blue-50 border-blue-200">
                <div className="text-blue-700">
                  Waiting for host to start the game...
                </div>
              </Card>
            )}
          </div>
        )

      default:
        return <div>Unknown step</div>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DevShortcuts
        variant="setup"
        onFillTestData={handleFillTestData}
        onAutoPosition={handleAutoPosition}
        onSkipToCharleston={handleSkipToCharleston}
        onSkipToGameplay={handleSkipToGameplay}
        onResetGame={handleResetGame}
      />
      <Container size="full" padding="sm" center={true}>
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Room Setup
            <br />
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Let's Play Together
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed mb-6">
            Set up your American Mahjong game room for solo practice or multiplayer fun
          </p>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              roomSetupStore.resetToStart()
            }}
            className="text-red-600 hover:bg-red-50 border-red-200"
          >
            🔄 Start Over
          </Button>
        </div>

        {renderProgressIndicator()}

        <Card variant="default" padding="sm" className="mb-6">
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
        </Card>
      </Container>
    </div>
  )
}