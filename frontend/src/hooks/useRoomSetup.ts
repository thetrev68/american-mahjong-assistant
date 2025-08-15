import { useCallback } from 'react'
import { useRoomStore, type CoPilotMode } from '../stores/room-store'
import { useMultiplayer } from './useMultiplayer'
import { useMultiplayerStore } from '../stores/multiplayer-store'

export interface UseRoomSetupReturn {
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
  createRoom: (hostName: string) => Promise<void>
  joinRoom: (roomCode: string, playerName: string) => Promise<void>
  generateRoomCode: () => string
  clearError: () => void
}

export const useRoomSetup = (): UseRoomSetupReturn => {
  const roomStore = useRoomStore()
  const multiplayerStore = useMultiplayerStore()
  const multiplayer = useMultiplayer()

  const createRoom = useCallback(async (hostName: string) => {
    // Validation
    if (!hostName.trim()) {
      roomStore.handleRoomCreationError('Please enter your name')
      return
    }

    if (!multiplayer.isConnected) {
      roomStore.handleRoomCreationError('Not connected to server. Please check your connection.')
      return
    }

    try {
      roomStore.setRoomCreationStatus('creating')
      
      const roomData = await multiplayer.createRoom({
        hostName: hostName.trim(),
        config: {
          maxPlayers: 4,
          coPilotMode: roomStore.coPilotMode,
          isPrivate: false
        }
      })

      // Generate a user-friendly room code from the room ID
      const roomCode = roomData.code || generateRoomCodeFromId(roomData.id)
      const hostPlayerId = multiplayerStore.currentPlayerId || generatePlayerId()

      roomStore.handleRoomCreated(roomCode, hostPlayerId)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create room'
      roomStore.handleRoomCreationError(errorMessage)
    }
  }, [roomStore, multiplayer, multiplayerStore.currentPlayerId])

  const joinRoom = useCallback(async (roomCode: string, playerName: string) => {
    // Validation
    if (!roomStore.isValidRoomCode(roomCode)) {
      roomStore.handleRoomJoinError('Please enter a valid 4-character room code')
      return
    }

    if (!playerName.trim()) {
      roomStore.handleRoomJoinError('Please enter your name')
      return
    }

    if (!multiplayer.isConnected) {
      roomStore.handleRoomJoinError('Not connected to server. Please check your connection.')
      return
    }

    try {
      roomStore.setJoinRoomStatus('joining')

      await multiplayer.joinRoom({
        roomId: roomCode.toUpperCase(),
        playerName: playerName.trim()
      })

      roomStore.handleRoomJoined(roomCode.toUpperCase())

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to join room'
      roomStore.handleRoomJoinError(errorMessage)
    }
  }, [roomStore, multiplayer])

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

  return {
    // State
    coPilotMode: roomStore.coPilotMode,
    roomCode: roomStore.currentRoomCode,
    isHost: roomStore.hostPlayerId === multiplayerStore.currentPlayerId,
    isCreatingRoom: roomStore.roomCreationStatus === 'creating',
    isJoiningRoom: roomStore.joinRoomStatus === 'joining',
    error: roomStore.error,
    setupProgress: roomStore.getRoomSetupProgress(),

    // Actions
    setCoPilotMode: roomStore.setCoPilotMode,
    createRoom,
    joinRoom,
    generateRoomCode,
    clearError: roomStore.clearError
  }
}