import { useEffect, useState, useCallback, useRef } from 'react'
import { useSocketContext } from './useSocketContext'
import { useConnectionResilience } from './useConnectionResilience'
import { useMultiplayerStore } from '../stores/multiplayer-store'
import { getNetworkErrorHandler } from '../lib/services/network-error-handler'
import { getRoomMultiplayerService, initializeRoomMultiplayerService } from '../lib/services/room-multiplayer'
import type { Room, Player, GameState, PlayerGameState, RoomConfig } from 'shared-types'

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
  const socket = useSocketContext()
  const connectionResilience = useConnectionResilience()
  
  // Use proper Zustand selectors - ONLY SELECT DATA, NOT FUNCTIONS
  const currentRoom = useMultiplayerStore(state => state.currentRoom)
  const gameState = useMultiplayerStore(state => state.gameState)
  const isHost = useMultiplayerStore(state => state.isHost)
  const availableRooms = useMultiplayerStore(state => state.availableRooms)
  // Functions are accessed via useMultiplayerStore.getState() to avoid infinite loops
  const getCurrentPlayer = useCallback(() => useMultiplayerStore.getState().getCurrentPlayer(), [])
  const getRoomStats = useCallback(() => useMultiplayerStore.getState().getRoomStats(), [])
  const areAllPlayersReady = useCallback(() => useMultiplayerStore.getState().areAllPlayersReady(), [])
  
  const [isCreatingRoom, setIsCreatingRoom] = useState(false)
  const [isJoiningRoom, setIsJoiningRoom] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)
  const [pendingUpdates, setPendingUpdates] = useState<PendingUpdate[]>([])
  const [retryAttempts, setRetryAttempts] = useState(0)

  const retryTimeoutsRef = useRef<NodeJS.Timeout[]>([])
  const roomServiceRef = useRef<ReturnType<typeof getRoomMultiplayerService>>(null)

  // Initialize room multiplayer service with connection resilience
  useEffect(() => {
    if (socket.isConnected && socket.socketId && socket.rawSocket && !roomServiceRef.current) {
      const playerName = 'Player' // This should come from user context
      roomServiceRef.current = initializeRoomMultiplayerService(socket.rawSocket, socket.socketId, playerName)
    }
    
    return () => {
      if (!socket.isConnected) {
        roomServiceRef.current = null
      }
    }
  }, [socket.isConnected, socket.socketId, socket.rawSocket])

  // Sync connection state with store using resilience service
  useEffect(() => {
    const store = useMultiplayerStore.getState()
    store.setConnectionState(connectionResilience.isConnected, socket.socketId || undefined)
    store.setConnectionError(connectionResilience.lastError)
  }, [connectionResilience.isConnected, socket.socketId, connectionResilience.lastError])

  // Clear error on successful operations
  const clearError = useCallback(() => {
    setLastError(null)
    setRetryAttempts(0)
  }, [])

  // Error handler using connection resilience service
  const handleError = useCallback((error: string, operation?: () => Promise<void>) => {
    setLastError(error)
    
    const networkHandler = getNetworkErrorHandler()
    networkHandler.handleError(new Error(error), 'multiplayer-operation')
    
    // Only retry if network is healthy and operation is safe
    if (operation && connectionResilience.isOperationSafe() && retryAttempts < 3) {
      const delay = Math.pow(2, retryAttempts) * 1000 // 1s, 2s, 4s
      const timeoutId = setTimeout(async () => {
        try {
          if (connectionResilience.isOperationSafe()) {
            await operation()
            clearError()
          }
        } catch {
          setRetryAttempts(prev => prev + 1)
        }
      }, delay)
      
      retryTimeoutsRef.current.push(timeoutId)
    }
  }, [retryAttempts, clearError, connectionResilience])

  // Room creation with connection resilience
  const createRoom = useCallback(async (roomData: CreateRoomData): Promise<Room> => {
    // Note: Removed connection safety check - socket will connect on first emit

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

      console.log('🏠 Emitting create-room with socket ID:', socket.socketId)

      socket.emit('create-room', {
        hostName: roomData.hostName,
        config
      })

      const handleResponse = (...args: unknown[]) => {
        console.log('🏠 Received room-created response:', args)
        const response = args[0] as { success: boolean; room?: Room; error?: string }
        setIsCreatingRoom(false)
        
        if (response.success && response.room) {
          const store = useMultiplayerStore.getState()
          store.setCurrentRoom(response.room)
          store.setCurrentPlayerId(socket.socketId!)
          resolve(response.room)
          clearError()
        } else {
          const error = response.error || 'Failed to create room'
          handleError(error, async () => { await createRoom(roomData) })
          reject(new Error(error))
        }

        socket.off('room-created', handleResponse)
      }

      console.log('🏠 Listening for room-created event')
      socket.on('room-created', handleResponse)

      // Add timeout to detect if backend doesn't respond
      setTimeout(() => {
        console.warn('⚠️ No room-created response received after 5 seconds')
      }, 5000)
    })
  }, [socket, clearError, handleError])

  // Room joining with connection resilience
  const joinRoom = useCallback(async (roomId: string, playerName: string): Promise<Room> => {
    // Note: Removed connection safety check - socket will connect on first emit

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
          const store = useMultiplayerStore.getState()
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
  }, [socket, clearError, handleError])

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
          useMultiplayerStore.getState().clearCurrentRoom()
          resolve()
        } else {
          reject(new Error('Failed to leave room'))
        }

        socket.off('room-left', handleResponse)
      }

      socket.on('room-left', handleResponse)
    })
  }, [socket, currentRoom])

  // Game state updates with resilient queueing
  const updateGamePhase = useCallback(async (phase: GameState['phase']): Promise<void> => {
    if (!currentRoom) {
      throw new Error('Not in a room')
    }

    const update = {
      type: 'phase-change',
      data: { phase },
      timestamp: new Date()
    }

    // Always send updates - socket handles queuing if disconnected
    socket.emit('state-update', {
      roomId: currentRoom.id,
      update
    })
  }, [socket, currentRoom])

  const updatePlayerState = useCallback(async (playerState: Partial<PlayerGameState>): Promise<void> => {
    if (!currentRoom) {
      throw new Error('Not in a room')
    }

    const update = {
      type: 'player-state',
      data: playerState,
      timestamp: new Date()
    }

    // Always send updates - socket handles queuing if disconnected
    socket.emit('state-update', {
      roomId: currentRoom.id,
      update
    })
  }, [socket, currentRoom])

  const updateSharedState = useCallback(async (sharedState: Partial<Record<string, unknown>>): Promise<void> => {
    if (!currentRoom) {
      throw new Error('Not in a room')
    }

    const update = {
      type: 'shared-state',
      data: sharedState,
      timestamp: new Date()
    }

    // Always send updates - socket handles queuing if disconnected
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
          useMultiplayerStore.getState().setGameState(response.gameState)
          resolve(response.gameState)
        } else {
          resolve(null)
        }

        socket.off('game-state', handleResponse)
      }

      socket.on('game-state', handleResponse)
    })
  }, [socket, currentRoom])

  // Error setter for testing
  const setError = useCallback((error: string) => {
    setLastError(error)
  }, [])

  // Event listeners for real-time updates
  useEffect(() => {
    const store = useMultiplayerStore.getState()

    const handlePlayerJoined = (...args: unknown[]) => {
      const data = args[0] as { player: Player; room: Room }
      store.addPlayerToRoom(data.player)
    }

    const handlePlayerLeft = (...args: unknown[]) => {
      const data = args[0] as { playerId: string; roomId: string }
      store.removePlayerFromRoom(data.playerId)
    }

    const handleGameStateChanged = (...args: unknown[]) => {
      const data = args[0] as { gameState: GameState }
      store.setGameState(data.gameState)
    }

    const handleRoomDeleted = (...args: unknown[]) => {
      const data = args[0] as { roomId: string }
      if (currentRoom?.id === data.roomId) {
        store.clearCurrentRoom()
      }
    }

    const handleRoomListUpdated = (...args: unknown[]) => {
      const data = args[0] as { rooms: Room[] }
      store.updateAvailableRooms(data.rooms)
    }

    if (socket.isConnected) {
      socket.on('player-joined', handlePlayerJoined)
      socket.on('player-left', handlePlayerLeft)
      socket.on('game-state-changed', handleGameStateChanged)
      socket.on('room-deleted', handleRoomDeleted)
      socket.on('room-list-updated', handleRoomListUpdated)
    }

    return () => {
      socket.off('player-joined', handlePlayerJoined)
      socket.off('player-left', handlePlayerLeft)
      socket.off('game-state-changed', handleGameStateChanged)
      socket.off('room-deleted', handleRoomDeleted)
      socket.off('room-list-updated', handleRoomListUpdated)
    }
  }, [socket, socket.isConnected, currentRoom])

  // Process pending updates when connection is resilient
  useEffect(() => {
    if (connectionResilience.isOperationSafe() && pendingUpdates.length > 0) {
      console.log(`Processing ${pendingUpdates.length} queued multiplayer updates`)
      
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
  }, [connectionResilience.isOperationSafe, pendingUpdates, socket, currentRoom, connectionResilience])

  // Cleanup timeouts on unmount
  useEffect(() => {
    const timeouts = retryTimeoutsRef.current
    return () => {
      timeouts.forEach(clearTimeout)
    }
  }, [])

  return {
    // Connection state from resilience service
    isConnected: connectionResilience.isConnected,
    connectionError: connectionResilience.lastError,
    connectionHealth: connectionResilience.connectionHealth,
    isReconnecting: connectionResilience.isReconnecting,
    
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
    
    // Error handling with resilience
    lastError,
    retryAttempts,
    pendingUpdates,
    setError, // For testing
    canRecover: connectionResilience.canRecover,
    isOperationSafe: connectionResilience.isOperationSafe,
    retryConnection: connectionResilience.retryConnection,
    
    // Network quality info
    getNetworkQuality: connectionResilience.getNetworkQuality,
    
    // Utility
    getCurrentPlayer,
    getRoomStats,
    areAllPlayersReady
  }
}