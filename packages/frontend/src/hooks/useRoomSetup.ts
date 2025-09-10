import { useCallback } from 'react'
import { useRoomStore, type CoPilotMode } from '../stores/room-store'
import { useMultiplayer } from './useMultiplayer'
import { useMultiplayerStore } from '../stores/multiplayer-store'
import type { Player, Room } from 'shared-types'

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
  createRoom: (hostName: string, otherPlayerNames?: string[]) => Promise<void>
  joinRoom: (roomCode: string, playerName: string) => Promise<void>
  generateRoomCode: () => string
  clearError: () => void
}

export const useRoomSetup = (): UseRoomSetupReturn => {
  const roomStore = useRoomStore()
  const multiplayerStore = useMultiplayerStore()
  const multiplayer = useMultiplayer()

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
    // Validation
    if (!hostName.trim()) {
      roomStore.handleRoomCreationError('Please enter your name')
      return
    }

    // Only check server connection for multiplayer mode
    if (roomStore.coPilotMode !== 'solo' && !multiplayer.isConnected) {
      roomStore.handleRoomCreationError('Not connected to server. Please check your connection.')
      return
    }

    try {
      roomStore.setRoomCreationStatus('creating')
      
      // In solo mode, create a local game instead of a multiplayer room
      if (roomStore.coPilotMode === 'solo') {
        // Generate a local room code for solo mode
        const roomCode = generateRoomCode()
        let hostPlayerId = multiplayerStore.currentPlayerId
        
        // Ensure we have a consistent player ID
        if (!hostPlayerId) {
          hostPlayerId = generatePlayerId()
          // Update the multiplayer store with the generated player ID
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
        
        // Set the room in multiplayer store so PlayerPositioning can see all players
        multiplayerStore.setCurrentRoom(room)
        
        roomStore.handleRoomCreated(roomCode, hostPlayerId, otherPlayerNames)
        
      } else {
        // Everyone mode - create actual multiplayer room
        const roomData = await multiplayer.createRoom({
          hostName: hostName.trim(),
          maxPlayers: 4,
          gameMode: 'nmjl-2025',
          isPrivate: false
        })

        // Generate a user-friendly room code from the room ID  
        const roomCode = generateRoomCodeFromId(roomData.id)
        let hostPlayerId = multiplayerStore.currentPlayerId
        
        // Ensure we have a consistent player ID
        if (!hostPlayerId) {
          hostPlayerId = generatePlayerId()
          // Update the multiplayer store with the generated player ID
          multiplayerStore.setCurrentPlayerId(hostPlayerId)
        }

        roomStore.handleRoomCreated(roomCode, hostPlayerId)
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create room'
      roomStore.handleRoomCreationError(errorMessage)
    }
  }, [roomStore, multiplayer, multiplayerStore, generatePlayerId, generateRoomCode, generateRoomCodeFromId])

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

      await multiplayer.joinRoom(roomCode.toUpperCase(), playerName.trim())

      roomStore.handleRoomJoined(roomCode.toUpperCase())

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to join room'
      roomStore.handleRoomJoinError(errorMessage)
    }
  }, [roomStore, multiplayer])

  return {
    // State
    coPilotMode: roomStore.coPilotMode,
    roomCode: roomStore.currentRoomCode,
    isHost: roomStore.coPilotMode === 'solo' ? true : roomStore.hostPlayerId === multiplayerStore.currentPlayerId,
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