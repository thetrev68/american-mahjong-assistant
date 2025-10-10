import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRoomSetup } from '../../hooks/useRoomSetup'
import { useMultiplayerStore } from '../../stores/multiplayer-store'
import { useGameStore } from '../../stores/useGameStore'
import { useRoomStore } from '../../stores/useRoomStore'
import { useSocketContext } from '../../hooks/useSocketContext'
import { CoPilotModeSelector } from './CoPilotModeSelector'
import { RoomCreation } from './RoomCreation'
import { RoomJoining } from './RoomJoining'
import { PlayerPositioning } from './PlayerPositioning'
import { Button } from '../../ui-components/Button'
import { ShareButton } from '../../ui-components/ShareButton'
import { Container } from '../../ui-components/layout/Container'
import { Card } from '../../ui-components/Card'
import DevShortcuts from '../../ui-components/DevShortcuts'
import type { SocketEventMap } from 'shared-types'
import type { Player } from 'shared-types'

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
  
  // Select ONLY primitives to avoid infinite loops
  const coPilotMode = useRoomStore((s) => s.setup.mode)
  const roomCreationStatus = useRoomStore((s) => s.roomCreationStatus)
  
  const currentRoom = useMultiplayerStore((s) => s.currentRoom)
  const currentPlayerId = useMultiplayerStore((s) => s.currentPlayerId)
  const gameActions = useGameStore((state) => state.actions)
  const socket = useSocketContext()

  const [roomMode, setRoomMode] = useState<RoomMode>('create')
  const [hostName, setHostName] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [roomCodeInput, setRoomCodeInput] = useState('')
  const [forceStep, setForceStep] = useState<string | null>(null)
  const [isStartingGame, setIsStartingGame] = useState(false)

  // Listen for backend test-pong to verify socket connection
  useEffect(() => {
    const handleTestPong = (data: unknown) => {
      console.log('🏓 RECEIVED test-pong from backend:', data)
    }

    socket.on('test-pong', handleTestPong)

    return () => {
      socket.off('test-pong', handleTestPong)
    }
  }, [socket])

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
    console.time('⏱️ Start Game Navigation')
    setIsStartingGame(true)

    try {
      // Starting game - first need to input tiles
      // Mark the game as started in game store for route guards
      console.time('⏱️ setGamePhase')
      gameActions.setPhase('tile-input')
      console.timeEnd('⏱️ setGamePhase')

      // Always go to tile input first, then Charleston, then game
      console.time('⏱️ navigate to /tiles')
      navigate('/tiles')
      console.timeEnd('⏱️ navigate to /tiles')
      console.timeEnd('⏱️ Start Game Navigation')

    } catch (error) {
      console.error('Error starting game:', error)
      setIsStartingGame(false)
    }
  }

  // Dev shortcut functions
  const handleFillTestData = async () => {
    const isSoloMode = coPilotMode === 'solo'

    if (isSoloMode) {
      // Solo mode: create room with all 4 players immediately
      if (roomMode === 'create') {
        setHostName('Trevor')
        // Auto-trigger room creation with test data - only pass other players, host is added automatically
        const otherPlayers = ['Kim', 'Jordan', 'Emilie']
        await roomSetup.createRoom('Trevor', otherPlayers)
      } else {
        setPlayerName('Trevor')
        setRoomCodeInput('TEST')
      }
    } else {
      // Multiplayer mode: Just create room with Trevor as host
      if (roomMode === 'create') {
        console.log('🎲 Creating room as Trevor')
        setHostName('Trevor')
        await roomSetup.createRoom('Trevor')
      } else {
        setPlayerName('Trevor')
        setRoomCodeInput('TEST')
      }
    }
  }

  const handleSkipToCharleston = () => {
    // Set up a complete game state and navigate to Charleston
    gameActions.setPhase('charleston')
    navigate('/charleston')
  }

  const handleSkipToGameplay = () => {
    // Set up a complete game state and navigate to gameplay
    gameActions.setPhase('playing')
    navigate('/game')
  }

  const handleResetGame = () => {
    // Reset all stores and navigate back to setup
    console.log('🔄 Resetting all stores...')
    useRoomStore.getState().actions.clearAll()
    gameActions.resetGame()
    useMultiplayerStore.getState().clearAll()
    useRoomStore.setState({ playerPositions: {}, currentPlayerId: null })
    // Note: tileStore reset is handled by gameActions.resetGame()

    // Clear sessionStorage to remove any persisted state
    sessionStorage.clear()

    console.log('✅ All stores reset')
    navigate('/')
  }

  const handleAutoPosition = () => {
    const isSoloMode = coPilotMode === 'solo'
    const players = currentRoom?.players || []
    console.log('Auto-positioning players:', players)

    if (isSoloMode) {
      // Solo mode: position named players (Trevor, Kim, Jordan, Emilie)
      const trevorPlayer = players.find(p => p.name === 'Trevor')
      const kimPlayer = players.find(p => p.name === 'Kim')
      const jordanPlayer = players.find(p => p.name === 'Jordan')
      const emiliePlayer = players.find(p => p.name === 'Emilie')

      if (trevorPlayer) {
        console.log('Positioning Trevor at east')
        useRoomStore.setState(s => ({ playerPositions: { ...s.playerPositions, [trevorPlayer.id]: 'east' }}))
      }
      if (kimPlayer) {
        console.log('Positioning Kim at south')
        useRoomStore.setState(s => ({ playerPositions: { ...s.playerPositions, [kimPlayer.id]: 'south' }}))
      }
      if (jordanPlayer) {
        console.log('Positioning Jordan at west')
        useRoomStore.setState(s => ({ playerPositions: { ...s.playerPositions, [jordanPlayer.id]: 'west' }}))
      }
      if (emiliePlayer) {
        console.log('Positioning Emilie at north')
        useRoomStore.setState(s => ({ playerPositions: { ...s.playerPositions, [emiliePlayer.id]: 'north' }}))
      }
    } else {
      // Multiplayer mode: Use backend to add Kim/Jordan/Emilie, then position everyone
      const roomId = currentRoom?.id
      console.log('🔍 Current room from store:', currentRoom)
      console.log('🔍 Room ID to populate:', roomId)

      if (!roomId) {
        console.error('❌ No room available')
        return
      }

      console.log('%c━━━ AUTO POSITION CLICKED ━━━', 'font-weight: bold; font-size: 14px; color: orange;')
      console.log('Room ID:', roomId)

      // Emit populate-test-players - Socket.IO debug will show internal details
      socket.emit('populate-test-players', { roomId }, (ack: unknown) => {
        console.log('✅ populate-test-players ACK received:', ack)
      })

      socket.on('dev:players-populated', (response: SocketEventMap['dev:players-populated']) => {
        console.log('🎯 Received response:', response)

        if (response.success && response.room) {
          console.log('✅ Players added. Positioning all', response.room.players.length, 'players')

          // Update multiplayerStore with new room
          useMultiplayerStore.getState().setCurrentRoom(response.room)

          // Find the host player and update roomStore with hostPlayerId
          const hostPlayer = response.room.players.find((p: Player) => p.isHost)
          if (hostPlayer) {
            useRoomStore.setState({ hostPlayerId: hostPlayer.id })
          }

          // Convert backend players to CrossPhasePlayerState format for roomStore
          const crossPhasePlayerStates = response.room.players.map((player: Player) => ({
            id: player.id,
            name: player.name,
            isHost: player.isHost,
            isConnected: player.isConnected,
            lastSeen: new Date(),
            roomReadiness: true,  // Mark as ready
            charlestonReadiness: false,
            gameplayReadiness: false,
            position: undefined,  // Will be set below
            isCurrentTurn: false
          }))

          // Update roomStore with all players
          useRoomStore.getState().updatePlayers(crossPhasePlayerStates)

          // Position all players in playerStore and mark them as ready
          response.room.players.forEach((player: Player) => {
            const position = player.name === 'Trevor' ? 'east' :
                            player.name === 'Kim' ? 'south' :
                            player.name === 'Jordan' ? 'west' :
                            player.name === 'Emilie' ? 'north' : null

            if (position) {
              useRoomStore.setState(s => ({ playerPositions: { ...s.playerPositions, [player.id]: position }}))
              // Mark player as ready for the room phase (multiplayer mode doesn't auto-mark)
              useRoomStore.getState().setPlayerReadiness(player.id, 'room', true)
              console.log('📍 Positioned', player.name, 'at', position, '(ready)')
            }
          })

          console.log('✅ All players positioned and marked ready')
        }
      })
    }
  }

  const handleBackStep = () => {
    switch (currentStep) {
      case 'room-creation':
        // Reset the co-pilot mode selection so user can change it
        useRoomStore.setState(s => ({ setup: { ...s.setup, coPilotModeSelected: false, mode: 'solo' }}))
        // Also reset room creation status and clear errors
        useRoomStore.getState().actions.setRoomCreationStatus('idle')
        useRoomStore.getState().actions.clearError()
        setForceStep('mode-selection')
        break
      case 'player-positioning':
        setForceStep('room-creation')
        break
    }
  }

  const handleContinueFromModeSelection = () => {
    // Confirm the mode selection when continuing
    useRoomStore.getState().actions.setMode(roomSetup.coPilotMode)
    setForceStep('room-creation')
  }

  // Effect to clear forceStep when room is successfully created so natural progression works
  useEffect(() => {
    if (forceStep === 'room-creation' && roomSetup.roomCode && roomCreationStatus === 'success') {
      setForceStep(null) // Clear forced step to allow natural progression to player-positioning
    }
  }, [forceStep, roomSetup.roomCode, roomCreationStatus])

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
            onModeChange={useRoomStore.getState().actions.setMode}
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
                    roomCreationStatus === 'success' ||
                    currentRoom?.hostId === currentPlayerId) && roomSetup.roomCode && (
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
              players={currentRoom?.players || []}
              currentPlayerId={currentPlayerId}
              disabled={false}
              isSoloMode={coPilotMode === 'solo'}
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
              useRoomStore.getState().actions.clearAll()
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
