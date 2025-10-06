import { useCallback, useMemo } from 'react'
import { useRoomSetupStore, type CoPilotMode } from '../stores/room-setup.store'
import { useRoomStore } from '../stores/room.store'
import { usePlayerStore } from '../stores/player.store'
import { useMultiplayer } from './useMultiplayer'
import { useMultiplayerStore } from '../stores/multiplayer-store'
import type { Player, Room } from 'shared-types'

interface UseRoomSetupReturn {
  // State
  coPilotMode: CoPilotMode
  roomCode: string | null
  isHost: boolean
  isCreatingRoom: boolean
  isJoiningRoom: boolean
  error: string | null
  setupProgress: {
    currentStep: 'mode-selection' | 'room-creation' | 'player-positioning' | 'ready'
    completedSteps: number
    totalSteps: number
  }

  // Actions
  setCoPilotMode: (mode: CoPilotMode) => void
  createRoom: (hostName: string, otherPlayerNames?: string[]) => Promise<void>
  joinRoom: (roomCode: string, playerName: string) => Promise<void>
  generateRoomCode: () => string
  clearError: () => void
}

export const useRoomSetup = (): UseRoomSetupReturn => {
  const roomSetupStore = useRoomSetupStore()
  const roomStore = useRoomStore()
  const playerStore = usePlayerStore()
  const multiplayerStore = useMultiplayerStore()
  const multiplayer = useMultiplayer()

  // Subscribe to specific room store values to avoid infinite loops
  const playersCount = useRoomStore((state) => state.players.length)
  const playersReadiness = useRoomStore((state) =>
    state.players.map(p => p.roomReadiness).join(',')
  )

  const generateRoomCode = useCallback((): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }, [])

  const generateRoomCodeFromId = useCallback((roomId: string): string => {
    // Convert room ID to a user-friendly 4-character code
    const hash = roomId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0)
      return a & a
    }, 0)
    
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    let num = Math.abs(hash)
    
    for (let i = 0; i < 4; i++) {
      code += chars[num % chars.length]
      num = Math.floor(num / chars.length)
    }
    
    return code
  }, [])

  const generatePlayerId = useCallback((): string => {
    return `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }, [])

  const createRoom = useCallback(async (hostName: string, otherPlayerNames?: string[]) => {
    // Prevent duplicate calls while already creating
    if (roomSetupStore.isCreatingRoom) {
      console.warn('⚠️ Room creation already in progress, ignoring duplicate call')
      return
    }

    // Validation
    if (!hostName.trim()) {
      roomSetupStore.handleRoomCreationError('Please enter your name')
      return
    }

    // Note: Connection check removed - socket will auto-connect on first use
    // If connection fails, the createRoom promise will reject with an error

    try {
      roomSetupStore.setRoomCreationStatus('creating')
      
      // In solo mode, create a local game instead of a multiplayer room
      if (roomSetupStore.coPilotMode === 'solo') {
        // Generate a local room code for solo mode
        const roomCode = generateRoomCode()
        let hostPlayerId = playerStore.currentPlayerId
        
        // Ensure we have a consistent player ID
        if (!hostPlayerId) {
          hostPlayerId = generatePlayerId()
          // Update the player store with the generated player ID
          playerStore.setCurrentPlayerId(hostPlayerId)
          multiplayerStore.setCurrentPlayerId(hostPlayerId)
        }
        
        // Create Player objects for all players in solo mode
        const players: Player[] = [
          {
            id: hostPlayerId,
            name: hostName.trim(),
            isHost: true,
            isConnected: true,
            isReady: false,
            joinedAt: new Date()
          }
        ]
        
        // Add other players from names
        if (otherPlayerNames) {
          const filteredNames = otherPlayerNames.filter(name => name.trim().length > 0)
          filteredNames.forEach((name) => {
            players.push({
              id: generatePlayerId(),
              name: name.trim(),
              isHost: false,
              isConnected: true,
              isReady: false,
              joinedAt: new Date()
            })
          })
        }
        
        // Create a local room with all players
        const room: Room = {
          id: roomCode,
          hostId: hostPlayerId,
          players: players,
          phase: 'setup',
          maxPlayers: 4,
          isPrivate: true,
          gameMode: 'nmjl-2025',
          createdAt: new Date()
        }
        
        // Set the room in stores
        roomStore.updateRoom(room)
        
        // Convert Player objects to CrossPhasePlayerState objects for room store
        const crossPhasePlayerStates = players.map(player => ({
          id: player.id,
          name: player.name,
          isHost: player.isHost,
          isConnected: player.isConnected,
          lastSeen: new Date(),
          roomReadiness: false, // Will be set to true when positioned
          charlestonReadiness: false,
          gameplayReadiness: false,
          position: undefined,
          isCurrentTurn: false
        }))
        
        roomStore.updatePlayers(crossPhasePlayerStates)
        multiplayerStore.setCurrentRoom(room)
        
        roomSetupStore.handleRoomCreated(roomCode, hostPlayerId, otherPlayerNames)
        
      } else {
        // Everyone mode - create actual multiplayer room
        console.log('🏠 Creating multiplayer room...')
        const roomData = await multiplayer.createRoom({
          hostName: hostName.trim(),
          maxPlayers: 4,
          gameMode: 'nmjl-2025',
          isPrivate: false
        })
        console.log('✅ Room created:', roomData)

        // Generate a user-friendly room code from the room ID
        const roomCode = generateRoomCodeFromId(roomData.id)

        // Use the hostId from the backend as our currentPlayerId
        const hostPlayerId = roomData.hostId
        playerStore.setCurrentPlayerId(hostPlayerId)
        multiplayerStore.setCurrentPlayerId(hostPlayerId)

        roomSetupStore.handleRoomCreated(roomCode, hostPlayerId)
        console.log('🎉 Room setup complete, code:', roomCode)
      }

    } catch (error) {
      console.error('❌ Room creation error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create room'
      roomSetupStore.handleRoomCreationError(errorMessage)
    }
  }, [roomSetupStore, roomStore, playerStore, multiplayer, multiplayerStore, generatePlayerId, generateRoomCode, generateRoomCodeFromId])

  const joinRoom = useCallback(async (roomCode: string, playerName: string) => {
    // Validation
    if (!roomSetupStore.isValidRoomCode(roomCode)) {
      roomSetupStore.handleRoomJoinError('Please enter a valid 4-character room code')
      return
    }

    if (!playerName.trim()) {
      roomSetupStore.handleRoomJoinError('Please enter your name')
      return
    }

    // Note: Connection check removed - socket will auto-connect on first use
    // If connection fails, the joinRoom promise will reject with an error

    try {
      roomSetupStore.setJoinRoomStatus('joining')

      await multiplayer.joinRoom(roomCode.toUpperCase(), playerName.trim())

      roomSetupStore.handleRoomJoined(roomCode.toUpperCase())

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to join room'
      roomSetupStore.handleRoomJoinError(errorMessage)
    }
  }, [roomSetupStore, multiplayer])

  // Compute setupProgress using useMemo based on actual state dependencies
  // Only depend on primitive values to avoid infinite loops
  const setupProgress = useMemo(() => {
    return useRoomSetupStore.getState().getRoomSetupProgress()
  }, [playersCount, playersReadiness])

  // Compute isHost directly using current values
  const isHost = roomSetupStore.coPilotMode === 'solo'
    ? true
    : roomStore.hostPlayerId === playerStore.currentPlayerId

  return {
    // State
    coPilotMode: roomSetupStore.coPilotMode,
    roomCode: roomStore.currentRoomCode,
    isHost,
    isCreatingRoom: roomSetupStore.roomCreationStatus === 'creating',
    isJoiningRoom: roomSetupStore.joinRoomStatus === 'joining',
    error: roomSetupStore.error,
    setupProgress,

    // Actions
    setCoPilotMode: roomSetupStore.setCoPilotMode,
    createRoom,
    joinRoom,
    generateRoomCode,
    clearError: roomSetupStore.clearError
  }
}