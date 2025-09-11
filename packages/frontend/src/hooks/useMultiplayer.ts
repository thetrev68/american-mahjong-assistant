import { useEffect, useState, useCallback, useRef } from 'react'
import { useSocket } from './useSocket'
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
  const socket = useSocket()
  const connectionResilience = useConnectionResilience()
  
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
    setConnectionState(connectionResilience.isConnected, socket.socketId || undefined)
    setConnectionError(connectionResilience.lastError)
  }, [connectionResilience.isConnected, socket.socketId, connectionResilience.lastError, setConnectionState, setConnectionError])

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
    if (!connectionResilience.isOperationSafe()) {
      throw new Error('Network connection is not stable for this operation')
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
  }, [socket, clearError, handleError, setCurrentRoom, setCurrentPlayerId, connectionResilience])

  // Room joining with connection resilience
  const joinRoom = useCallback(async (roomId: string, playerName: string): Promise<Room> => {
    if (!connectionResilience.isOperationSafe()) {
      throw new Error('Network connection is not stable for this operation')
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
  }, [socket, clearError, handleError, setCurrentRoom, setCurrentPlayerId, connectionResilience])

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

    if (!connectionResilience.isOperationSafe()) {
      // Queue for later if connection is not stable
      setPendingUpdates(prev => [...prev, update])
      return
    }

    socket.emit('state-update', {
      roomId: currentRoom.id,
      update
    })
  }, [socket, currentRoom, connectionResilience])

  const updatePlayerState = useCallback(async (playerState: Partial<PlayerGameState>): Promise<void> => {
    if (!currentRoom) {
      throw new Error('Not in a room')
    }

    const update = {
      type: 'player-state',
      data: playerState,
      timestamp: new Date()
    }

    if (!connectionResilience.isOperationSafe()) {
      // Queue for later if connection is not stable
      setPendingUpdates(prev => [...prev, update])
      return
    }

    socket.emit('state-update', {
      roomId: currentRoom.id,
      update
    })
  }, [socket, currentRoom, connectionResilience])

  const updateSharedState = useCallback(async (sharedState: Partial<Record<string, unknown>>): Promise<void> => {
    if (!currentRoom) {
      throw new Error('Not in a room')
    }

    const update = {
      type: 'shared-state',
      data: sharedState,
      timestamp: new Date()
    }

    if (!connectionResilience.isOperationSafe()) {
      // Queue for later if connection is not stable
      setPendingUpdates(prev => [...prev, update])
      return
    }

    socket.emit('state-update', {
      roomId: currentRoom.id,
      update
    })
  }, [socket, currentRoom, connectionResilience])

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