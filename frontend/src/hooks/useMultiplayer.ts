import { useEffect, useState, useCallback, useRef } from 'react'
import { useSocket } from './useSocket'
import { useMultiplayerStore } from '../stores/multiplayer-store'
import type { Room, Player, GameState, PlayerGameState, SharedGameState, RoomConfig } from '@shared/multiplayer-types'

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
  const store = useMultiplayerStore()
  
  const [isCreatingRoom, setIsCreatingRoom] = useState(false)
  const [isJoiningRoom, setIsJoiningRoom] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)
  const [pendingUpdates, setPendingUpdates] = useState<PendingUpdate[]>([])
  const [retryAttempts, setRetryAttempts] = useState(0)

  const retryTimeoutsRef = useRef<NodeJS.Timeout[]>([])

  // Sync connection state with store
  useEffect(() => {
    store.setConnectionState(socket.isConnected, socket.socketId || undefined)
    store.setConnectionError(socket.connectionError)
  }, [socket.isConnected, socket.socketId, socket.connectionError, store])

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

      const handleResponse = (response: { success: boolean; room?: Room; error?: string }) => {
        setIsCreatingRoom(false)
        
        if (response.success && response.room) {
          store.setCurrentRoom(response.room)
          store.setCurrentPlayerId(socket.socketId!)
          resolve(response.room)
          clearError()
        } else {
          const error = response.error || 'Failed to create room'
          handleError(error, () => createRoom(roomData))
          reject(new Error(error))
        }
        
        socket.off('room-created', handleResponse)
      }

      socket.on('room-created', handleResponse)
    })
  }, [socket, store, clearError, handleError])

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

      const handleResponse = (response: { success: boolean; room?: Room; error?: string }) => {
        setIsJoiningRoom(false)
        
        if (response.success && response.room) {
          store.setCurrentRoom(response.room)
          store.setCurrentPlayerId(socket.socketId!)
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
  }, [socket, store, clearError, handleError])

  // Room leaving
  const leaveRoom = useCallback(async (): Promise<void> => {
    if (!store.currentRoom) {
      return
    }

    const roomId = store.currentRoom.id

    return new Promise((resolve, reject) => {
      socket.emit('leave-room', { roomId })

      const handleResponse = (response: { success: boolean; roomId: string }) => {
        if (response.success) {
          store.clearCurrentRoom()
          resolve()
        } else {
          reject(new Error('Failed to leave room'))
        }
        
        socket.off('room-left', handleResponse)
      }

      socket.on('room-left', handleResponse)
    })
  }, [socket, store])

  // Game state updates
  const updateGamePhase = useCallback(async (phase: GameState['phase']): Promise<void> => {
    if (!socket.isConnected) {
      throw new Error('Not connected to server')
    }

    if (!store.currentRoom) {
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
      roomId: store.currentRoom.id,
      update
    })
  }, [socket, store])

  const updatePlayerState = useCallback(async (playerState: Partial<PlayerGameState>): Promise<void> => {
    if (!socket.isConnected) {
      throw new Error('Not connected to server')
    }

    if (!store.currentRoom) {
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
      roomId: store.currentRoom.id,
      update
    })
  }, [socket, store])

  const updateSharedState = useCallback(async (sharedState: Partial<SharedGameState>): Promise<void> => {
    if (!socket.isConnected) {
      throw new Error('Not connected to server')
    }

    if (!store.currentRoom) {
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
      roomId: store.currentRoom.id,
      update
    })
  }, [socket, store])

  const requestGameState = useCallback(async (): Promise<GameState | null> => {
    if (!store.currentRoom) {
      return null
    }

    return new Promise((resolve) => {
      socket.emit('request-game-state', {
        roomId: store.currentRoom!.id
      })

      const handleResponse = (response: { success: boolean; gameState?: GameState }) => {
        if (response.success && response.gameState) {
          store.setGameState(response.gameState)
          resolve(response.gameState)
        } else {
          resolve(null)
        }
        
        socket.off('game-state', handleResponse)
      }

      socket.on('game-state', handleResponse)
    })
  }, [socket, store])

  // Error setter for testing
  const setError = useCallback((error: string) => {
    setLastError(error)
  }, [])

  // Event listeners for real-time updates
  useEffect(() => {
    if (!socket.isConnected) return

    const handlePlayerJoined = (data: { player: Player; room: Room }) => {
      store.addPlayerToRoom(data.player)
    }

    const handlePlayerLeft = (data: { playerId: string; roomId: string }) => {
      store.removePlayerFromRoom(data.playerId)
    }

    const handleGameStateChanged = (data: { gameState: GameState }) => {
      store.setGameState(data.gameState)
    }

    const handleRoomDeleted = (data: { roomId: string }) => {
      if (store.currentRoom?.id === data.roomId) {
        store.clearCurrentRoom()
      }
    }

    const handleRoomListUpdated = (data: { rooms: Room[] }) => {
      store.updateAvailableRooms(data.rooms)
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
  }, [socket, store])

  // Process pending updates when reconnected
  useEffect(() => {
    if (socket.isConnected && pendingUpdates.length > 0) {
      pendingUpdates.forEach(update => {
        if (store.currentRoom) {
          socket.emit('state-update', {
            roomId: store.currentRoom.id,
            update
          })
        }
      })
      setPendingUpdates([])
    }
  }, [socket.isConnected, pendingUpdates, store.currentRoom, socket])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      const timeouts = retryTimeoutsRef.current
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
    currentRoom: store.currentRoom,
    gameState: store.gameState,
    isHost: store.isHost,
    availableRooms: store.availableRooms,
    
    // Error handling
    lastError,
    retryAttempts,
    pendingUpdates,
    setError, // For testing
    
    // Utility
    getCurrentPlayer: store.getCurrentPlayer,
    getRoomStats: store.getRoomStats,
    areAllPlayersReady: store.areAllPlayersReady
  }
}