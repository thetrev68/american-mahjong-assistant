// Charleston Multiplayer Service
// Handles WebSocket communication for Charleston phase coordination

import { useSocket } from '../hooks/useSocket'
import { useCharlestonStore } from '../stores/charleston-store'
import { useMultiplayerStore } from '../stores/multiplayer-store'
import type { Tile } from '../utils/charleston-adapter'

export class CharlestonMultiplayerService {
  private static instance: CharlestonMultiplayerService | null = null
  private socket: any = null
  private charlestonStore: any = null
  private multiplayerStore: any = null

  static getInstance(): CharlestonMultiplayerService {
    if (!CharlestonMultiplayerService.instance) {
      CharlestonMultiplayerService.instance = new CharlestonMultiplayerService()
    }
    return CharlestonMultiplayerService.instance
  }

  initialize(
    socket: any,
    charlestonStore: any,
    multiplayerStore: any
  ) {
    this.socket = socket
    this.charlestonStore = charlestonStore
    this.multiplayerStore = multiplayerStore
    this.setupEventListeners()
  }

  private setupEventListeners() {
    if (!this.socket || !this.charlestonStore) return

    // Player readiness updates
    this.socket.on('charleston-player-ready-update', (data: any) => {
      const { playerId, isReady } = data
      this.charlestonStore?.setPlayerReady(playerId, isReady)
    })

    // Confirmation that our readiness was received
    this.socket.on('charleston-player-ready-confirmed', (data: any) => {
      if (data.success) {
        console.log('Charleston readiness confirmed for phase:', data.phase)
      }
    })

    // Tile exchange - receive tiles from other players
    this.socket.on('charleston-tile-exchange', (data: any) => {
      const { tilesReceived } = data
      
      // Convert received tiles to proper Tile objects
      const tiles: Tile[] = tilesReceived.map((tile: any) => ({
        id: tile.id,
        suit: tile.suit || 'unknown',
        value: tile.value || tile.id,
        display: tile.display || tile.id,
        isJoker: tile.isJoker || false
      }))

      // Handle tile exchange in Charleston store
      this.charlestonStore?.handleTileExchange(tiles)
    })

    // Charleston status updates
    this.socket.on('charleston-status', (data: any) => {
      if (data.success && data.playerReadiness) {
        // Update player readiness states
        Object.entries(data.playerReadiness).forEach(([playerId, isReady]) => {
          this.charlestonStore?.setPlayerReady(playerId, isReady as boolean)
        })
      }
    })

    // Charleston errors
    this.socket.on('charleston-error', (data: any) => {
      console.error('Charleston error:', data.error)
      // Update Charleston store with error
      this.charlestonStore?.clearError()
    })
  }

  /**
   * Mark current player as ready with their selected tiles
   */
  async markPlayerReady(selectedTiles: Tile[], phase: string): Promise<boolean> {
    if (!this.socket || !this.multiplayerStore || !this.charlestonStore) {
      console.error('Charleston multiplayer service not properly initialized')
      return false
    }

    const currentRoom = this.multiplayerStore.currentRoom
    const currentPlayerId = this.multiplayerStore.currentPlayerId

    if (!currentRoom || !currentPlayerId) {
      console.error('No current room or player ID for Charleston')
      return false
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(false)
      }, 5000) // 5-second timeout

      // Listen for confirmation
      const confirmHandler = (data: any) => {
        if (data.success) {
          clearTimeout(timeout)
          this.socket?.off('charleston-player-ready-confirmed', confirmHandler)
          resolve(true)
        }
      }

      const errorHandler = (data: any) => {
        clearTimeout(timeout)
        this.socket?.off('charleston-player-ready-confirmed', confirmHandler)
        this.socket?.off('charleston-error', errorHandler)
        console.error('Charleston ready error:', data.error)
        resolve(false)
      }

      this.socket.on('charleston-player-ready-confirmed', confirmHandler)
      this.socket.on('charleston-error', errorHandler)

      // Emit readiness with selected tiles
      this.socket.emit('charleston-player-ready', {
        roomId: currentRoom.id,
        playerId: currentPlayerId,
        selectedTiles: selectedTiles.map(tile => ({
          id: tile.id,
          suit: tile.suit,
          value: tile.value || tile.id,
          display: tile.display || tile.id,
          isJoker: tile.isJoker || false
        })),
        phase
      })
    })
  }

  /**
   * Request current Charleston status from server
   */
  async requestCharlestonStatus(): Promise<void> {
    if (!this.socket || !this.multiplayerStore) return

    const currentRoom = this.multiplayerStore.currentRoom
    if (!currentRoom) return

    this.socket.emit('charleston-request-status', {
      roomId: currentRoom.id
    })
  }

  /**
   * Cleanup event listeners
   */
  cleanup() {
    if (!this.socket) return

    this.socket.off('charleston-player-ready-update', () => {})
    this.socket.off('charleston-player-ready-confirmed', () => {})
    this.socket.off('charleston-tile-exchange', () => {})
    this.socket.off('charleston-status', () => {})
    this.socket.off('charleston-error', () => {})
  }
}

// Hook for using Charleston multiplayer service
export const useCharlestonMultiplayer = () => {
  const socket = useSocket()
  const charlestonStore = useCharlestonStore()
  const multiplayerStore = useMultiplayerStore()
  
  const service = CharlestonMultiplayerService.getInstance()
  
  // Initialize service with current stores
  if (socket && charlestonStore && multiplayerStore) {
    service.initialize(socket, charlestonStore, multiplayerStore)
  }

  return {
    markPlayerReady: (selectedTiles: Tile[], phase: string) => 
      service.markPlayerReady(selectedTiles, phase),
    requestStatus: () => service.requestCharlestonStatus(),
    cleanup: () => service.cleanup()
  }
}