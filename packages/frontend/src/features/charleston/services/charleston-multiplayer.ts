// Charleston Multiplayer Service
// Handles WebSocket communication for Charleston phase coordination

import type { Socket } from 'socket.io-client'
import { useCharlestonStore } from '../../../stores/charleston-store'
import { useMultiplayerStore } from '../../../stores/multiplayer-store'
// import { useSocket } from '../hooks/useSocket' // Unused until service refactor
import type { Tile, TileSuit, TileValue } from 'shared-types';

type CharlestonStore = ReturnType<typeof useCharlestonStore.getState>
type MultiplayerStore = ReturnType<typeof useMultiplayerStore.getState>

export class CharlestonMultiplayerService {
  private static instance: CharlestonMultiplayerService | null = null
  private socket: Socket | null = null
  private charlestonStore: CharlestonStore | null = null
  private multiplayerStore: MultiplayerStore | null = null

  static getInstance(): CharlestonMultiplayerService {
    if (!CharlestonMultiplayerService.instance) {
      CharlestonMultiplayerService.instance = new CharlestonMultiplayerService()
    }
    return CharlestonMultiplayerService.instance
  }

  initialize(
    socket: Socket,
    charlestonStore: CharlestonStore,
    multiplayerStore: MultiplayerStore
  ) {
    this.socket = socket
    this.charlestonStore = charlestonStore
    this.multiplayerStore = multiplayerStore
    this.setupEventListeners()
  }

  private setupEventListeners() {
    if (!this.socket || !this.charlestonStore) return

    // Player readiness updates
    this.socket.on('charleston-player-ready-update', (data: { playerId: string; isReady: boolean; phase: string }) => {
      const { playerId, isReady } = data
      this.charlestonStore?.setPlayerReady(playerId, isReady)
    })

    // Confirmation that our readiness was received
    this.socket.on('charleston-player-ready-confirmed', (data: { success: boolean; playerId: string; phase: string }) => {
      if (data.success) {
        console.log('Charleston readiness confirmed for phase:', data.phase)
      }
    })

    // Tile exchange - receive tiles from other players
    this.socket.on('charleston-tile-exchange', (data: { tilesReceived: unknown[]; phase: string; nextPhase: string }) => {
      const { tilesReceived } = data
      
      // Convert received tiles to proper Tile objects
      const tiles: Tile[] = (tilesReceived as Record<string, unknown>[]).map((tile: Record<string, unknown>) => ({
        id: String(tile.id),
        suit: (String(tile.suit || 'jokers')) as TileSuit,
        value: (String(tile.value || 'joker')) as TileValue,
        displayName: String(tile.displayName || tile.display || tile.id),
        isJoker: Boolean(tile.isJoker || false)
      }))

      // Handle tile exchange in Charleston store
      this.charlestonStore?.handleTileExchange(tiles)
    })

    // Charleston status updates
    this.socket.on('charleston-status', (data: { success: boolean; playerReadiness?: Record<string, boolean>; roomId?: string; error?: string }) => {
      if (data.success && data.playerReadiness) {
        // Update player readiness states
        Object.entries(data.playerReadiness).forEach(([playerId, isReady]) => {
          this.charlestonStore?.setPlayerReady(playerId, isReady as boolean)
        })
      }
    })

    // Charleston errors
    this.socket.on('charleston-error', (data: { success: boolean; error: string }) => {
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
      const confirmHandler = (data: { success: boolean; playerId: string; phase: string }) => {
        if (data.success) {
          clearTimeout(timeout)
          this.socket?.off('charleston-player-ready-confirmed', confirmHandler)
          resolve(true)
        }
      }

      const errorHandler = (data: { success: boolean; error: string }) => {
        clearTimeout(timeout)
        this.socket?.off('charleston-player-ready-confirmed', confirmHandler)
        this.socket?.off('charleston-error', errorHandler)
        console.error('Charleston ready error:', data.error)
        resolve(false)
      }

      this.socket?.on('charleston-player-ready-confirmed', confirmHandler)
      this.socket?.on('charleston-error', errorHandler)

      // Emit readiness with selected tiles
      this.socket?.emit('charleston-player-ready', {
        roomId: currentRoom.id,
        playerId: currentPlayerId,
        selectedTiles: selectedTiles.map(tile => ({
          id: tile.id,
          suit: tile.suit,
          value: tile.value || tile.id,
          displayName: tile.displayName || tile.id,
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

// Hook for using Charleston multiplayer service (LEGACY - use useCharlestonResilience instead)
export const useCharlestonMultiplayer = () => {
  console.warn('useCharlestonMultiplayer is deprecated. Use useCharlestonResilience from charleston-resilient.ts')
  
  // Fallback to resilient service - dynamic import would be needed for proper implementation
  // For now, return a placeholder that guides users to the correct service
  return {
    markPlayerReady: () => {
      console.error('useCharlestonMultiplayer is deprecated. Please use useCharlestonResilience from charleston-resilient.ts')
      return Promise.resolve(false)
    },
    requestStatus: () => {
      console.error('useCharlestonMultiplayer is deprecated. Please use useCharlestonResilience from charleston-resilient.ts')
      return Promise.resolve(false)
    },
    replayQueue: () => {
      console.error('useCharlestonMultiplayer is deprecated. Please use useCharlestonResilience from charleston-resilient.ts')
      return Promise.resolve()
    },
    getQueueStatus: () => {
      console.error('useCharlestonMultiplayer is deprecated. Please use useCharlestonResilience from charleston-resilient.ts')
      return { size: 0, operations: [] }
    },
    cleanup: () => {
      console.error('useCharlestonMultiplayer is deprecated. Please use useCharlestonResilience from charleston-resilient.ts')
    }
  }
}