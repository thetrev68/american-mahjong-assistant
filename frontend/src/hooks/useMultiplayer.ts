import { useEffect, useState, useCallback, useRef } from 'react'
import { useSocket } from './useSocket'
import { useMultiplayerStore } from '../stores/multiplayer-store'
import type { Room, Player, GameState, PlayerGameState, RoomConfig } from '@shared/multiplayer-types'

interface CreateRoomData {
  hostName: string
  maxPlayers: number
  roomName?: string
  isPrivate?: boolean
  gameMode?: string
}

interface PendingUpdate {
  type: string
  data: unknown
  timestamp: Date
}

export function useMultiplayer() {
  const socket = useSocket()
  
  // Use proper Zustand selectors instead of the whole store
  const currentRoom = useMultiplayerStore(state => state.currentRoom)
  const gameState = useMultiplayerStore(state => state.gameState)
  const isHost = useMultiplayerStore(state => state.isHost)
  const availableRooms = useMultiplayerStore(state => state.availableRooms)
  const getCurrentPlayer = useMultiplayerStore(state => state.getCurrentPlayer)
  const getRoomStats = useMultiplayerStore(state => state.getRoomStats)
  const areAllPlayersReady = useMultiplayerStore(state => state.areAllPlayersReady)
  const setConnectionState = useMultiplayerStore(state => state.setConnectionState)
  const setConnectionError = useMultiplayerStore(state => state.setConnectionError)
  const setCurrentRoom = useMultiplayerStore(state => state.setCurrentRoom)
  const setCurrentPlayerId = useMultiplayerStore(state => state.setCurrentPlayerId)
  const clearCurrentRoom = useMultiplayerStore(state => state.clearCurrentRoom)
  const setGameState = useMultiplayerStore(state => state.setGameState)
  const addPlayerToRoom = useMultiplayerStore(state => state.addPlayerToRoom)
  const removePlayerFromRoom = useMultiplayerStore(state => state.removePlayerFromRoom)
  const updateAvailableRooms = useMultiplayerStore(state => state.updateAvailableRooms)
  
  const [isCreatingRoom, setIsCreatingRoom] = useState(false)
  const [isJoiningRoom, setIsJoiningRoom] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)
  const [pendingUpdates, setPendingUpdates] = useState<PendingUpdate[]>([])
  const [retryAttempts, setRetryAttempts] = useState(0)

  const retryTimeoutsRef = useRef<NodeJS.Timeout[]>([])

  // Sync connection state with store
  useEffect(() => {
    setConnectionState(socket.isConnected, socket.socketId || undefined)
    setConnectionError(socket.connectionError)
  }, [socket.isConnected, socket.socketId, socket.connectionError, setConnectionState, setConnectionError])

  // Clear error on successful operations
  const clearError = useCallback(() => {
    setLastError(null)
    setRetryAttempts(0)
  }, [])

  // Error handler with exponential backoff retry
  const handleError = useCallback((error: string, operation?: () => Promise<void>) => {
    setLastError(error)
    
    if (operation && retryAttempts < 3) {
      const delay = Math.pow(2, retryAttempts) * 1000 // 1s, 2s, 4s
      const timeoutId = setTimeout(async () => {
        try {
          await operation()
          clearError()
        } catch {
          setRetryAttempts(prev => prev + 1)
        }
      }, delay)
      
      retryTimeoutsRef.current.push(timeoutId)
    }
  }, [retryAttempts, clearError])

  // Room creation
  const createRoom = useCallback(async (roomData: CreateRoomData): Promise<Room> => {
    if (!socket.isConnected) {
      throw new Error('Not connected to server')
    }

    setIsCreatingRoom(true)
    clearError()

    return new Promise((resolve, reject) => {
      const config: RoomConfig & { hostName: string } = {
        maxPlayers: roomData.maxPlayers,
        isPrivate: roomData.isPrivate,
        roomName: roomData.roomName,
        gameMode: roomData.gameMode as 'nmjl-2025' | 'custom',
        hostName: roomData.hostName
      }

      socket.emit('create-room', {
        hostName: roomData.hostName,
        config
      })

      const handleResponse = (...args: unknown[]) => {
        const response = args[0] as { success: boolean; room?: Room; error?: string }
        setIsCreatingRoom(false)
        
        if (response.success && response.room) {
          setCurrentRoom(response.room)
          setCurrentPlayerId(socket.socketId!)
          resolve(response.room)
          clearError()
        } else {
          const error = response.error || 'Failed to create room'
          handleError(error, async () => { await createRoom(roomData) })
          reject(new Error(error))
        }
        
        socket.off('room-created', handleResponse)
      }

      socket.on('room-created', handleResponse)
    })
  }, [socket, clearError, handleError, setCurrentRoom, setCurrentPlayerId])

  // Room joining
  const joinRoom = useCallback(async (roomId: string, playerName: string): Promise<Room> => {
    if (!socket.isConnected) {
      throw new Error('Not connected to server')
    }

    setIsJoiningRoom(true)
    clearError()

    return new Promise((resolve, reject) => {
      socket.emit('join-room', {
        roomId,
        playerName
      })

      const handleResponse = (...args: unknown[]) => {
        const response = args[0] as { success: boolean; room?: Room; error?: string }
        setIsJoiningRoom(false)
        
        if (response.success && response.room) {
          setCurrentRoom(response.room)
          setCurrentPlayerId(socket.socketId!)
          resolve(response.room)
          clearError()
        } else {
          const error = response.error || 'Failed to join room'
          handleError(error)
          reject(new Error(error))
        }
        
        socket.off('room-joined', handleResponse)
      }

      socket.on('room-joined', handleResponse)
    })
  }, [socket, clearError, handleError, setCurrentRoom, setCurrentPlayerId])

  // Room leaving
  const leaveRoom = useCallback(async (): Promise<void> => {
    if (!currentRoom) {
      return
    }

    const roomId = currentRoom.id

    return new Promise((resolve, reject) => {
      socket.emit('leave-room', { roomId })

      const handleResponse = (...args: unknown[]) => {
        const response = args[0] as { success: boolean; roomId: string }
        if (response.success) {
          clearCurrentRoom()
          resolve()
        } else {
          reject(new Error('Failed to leave room'))
        }
        
        socket.off('room-left', handleResponse)
      }

      socket.on('room-left', handleResponse)
    })
  }, [socket, currentRoom, clearCurrentRoom])

  // Game state updates
  const updateGamePhase = useCallback(async (phase: GameState['phase']): Promise<void> => {
    if (!socket.isConnected) {
      throw new Error('Not connected to server')
    }

    if (!currentRoom) {
      throw new Error('Not in a room')
    }

    const update = {
      type: 'phase-change',
      data: { phase },
      timestamp: new Date()
    }

    if (!socket.isConnected) {
      // Queue for later if disconnected
      setPendingUpdates(prev => [...prev, update])
      return
    }

    socket.emit('state-update', {
      roomId: currentRoom.id,
      update
    })
  }, [socket, currentRoom])

  const updatePlayerState = useCallback(async (playerState: Partial<PlayerGameState>): Promise<void> => {
    if (!socket.isConnected) {
      throw new Error('Not connected to server')
    }

    if (!currentRoom) {
      throw new Error('Not in a room')
    }

    const update = {
      type: 'player-state',
      data: playerState,
      timestamp: new Date()
    }

    if (!socket.isConnected) {
      // Queue for later if disconnected
      setPendingUpdates(prev => [...prev, update])
      return
    }

    socket.emit('state-update', {
      roomId: currentRoom.id,
      update
    })
  }, [socket, currentRoom])

  const updateSharedState = useCallback(async (sharedState: Partial<any>): Promise<void> => {
    if (!socket.isConnected) {
      throw new Error('Not connected to server')
    }

    if (!currentRoom) {
      throw new Error('Not in a room')
    }

    const update = {
      type: 'shared-state',
      data: sharedState,
      timestamp: new Date()
    }

    if (!socket.isConnected) {
      // Queue for later if disconnected
      setPendingUpdates(prev => [...prev, update])
      return
    }

    socket.emit('state-update', {
      roomId: currentRoom.id,
      update
    })
  }, [socket, currentRoom])

  const requestGameState = useCallback(async (): Promise<GameState | null> => {
    if (!currentRoom) {
      return null
    }

    return new Promise((resolve) => {
      socket.emit('request-game-state', {
        roomId: currentRoom!.id
      })

      const handleResponse = (...args: unknown[]) => {
        const response = args[0] as { success: boolean; gameState?: GameState }
        if (response.success && response.gameState) {
          setGameState(response.gameState)
          resolve(response.gameState)
        } else {
          resolve(null)
        }
        
        socket.off('game-state', handleResponse)
      }

      socket.on('game-state', handleResponse)
    })
  }, [socket, currentRoom, setGameState])

  // Error setter for testing
  const setError = useCallback((error: string) => {
    setLastError(error)
  }, [])

  // Event listeners for real-time updates
  useEffect(() => {
    if (!socket.isConnected) return

    const handlePlayerJoined = (...args: unknown[]) => {
      const data = args[0] as { player: Player; room: Room }
      addPlayerToRoom(data.player)
    }

    const handlePlayerLeft = (...args: unknown[]) => {
      const data = args[0] as { playerId: string; roomId: string }
      removePlayerFromRoom(data.playerId)
    }

    const handleGameStateChanged = (...args: unknown[]) => {
      const data = args[0] as { gameState: GameState }
      setGameState(data.gameState)
    }

    const handleRoomDeleted = (...args: unknown[]) => {
      const data = args[0] as { roomId: string }
      if (currentRoom?.id === data.roomId) {
        clearCurrentRoom()
      }
    }

    const handleRoomListUpdated = (...args: unknown[]) => {
      const data = args[0] as { rooms: Room[] }
      updateAvailableRooms(data.rooms)
    }

    socket.on('player-joined', handlePlayerJoined)
    socket.on('player-left', handlePlayerLeft)
    socket.on('game-state-changed', handleGameStateChanged)
    socket.on('room-deleted', handleRoomDeleted)
    socket.on('room-list-updated', handleRoomListUpdated)

    return () => {
      socket.off('player-joined', handlePlayerJoined)
      socket.off('player-left', handlePlayerLeft)
      socket.off('game-state-changed', handleGameStateChanged)
      socket.off('room-deleted', handleRoomDeleted)
      socket.off('room-list-updated', handleRoomListUpdated)
    }
  }, [socket, addPlayerToRoom, removePlayerFromRoom, setGameState, currentRoom, clearCurrentRoom, updateAvailableRooms])

  // Process pending updates when reconnected
  useEffect(() => {
    if (socket.isConnected && pendingUpdates.length > 0) {
      pendingUpdates.forEach(update => {
        if (currentRoom) {
          socket.emit('state-update', {
            roomId: currentRoom.id,
            update
          })
        }
      })
      setPendingUpdates([])
    }
  }, [socket.isConnected, pendingUpdates, socket, currentRoom])

  // Cleanup timeouts on unmount
  useEffect(() => {
    const timeouts = retryTimeoutsRef.current
    return () => {
      timeouts.forEach(clearTimeout)
    }
  }, [])

  return {
    // Connection state
    isConnected: socket.isConnected,
    connectionError: socket.connectionError,
    
    // Room operations
    createRoom,
    joinRoom,
    leaveRoom,
    isCreatingRoom,
    isJoiningRoom,
    
    // Game state operations
    updateGamePhase,
    updatePlayerState,
    updateSharedState,
    requestGameState,
    
    // State from store
    currentRoom,
    gameState,
    isHost,
    availableRooms,
    
    // Error handling
    lastError,
    retryAttempts,
    pendingUpdates,
    setError, // For testing
    
    // Utility
    getCurrentPlayer,
    getRoomStats,
    areAllPlayersReady
  }
}