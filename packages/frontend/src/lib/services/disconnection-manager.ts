// Graceful Disconnection Manager
// Handles clean disconnection, state preservation, and graceful degradation

import { useRoomStore } from '../../stores/useRoomStore'
import { useGameStore } from '../../stores/useGameStore'

const getGameActions = () => useGameStore.getState().actions
import { useTurnStore } from '../../stores/turn-store'
import { useCharlestonStore } from '../../stores/charleston-store'
import { getRoomMultiplayerService, destroyRoomMultiplayerService } from './room-multiplayer'
import { destroyConnectionResilience } from './connection-resilience'

export interface DisconnectionReason {
  type: 'user-initiated' | 'network-error' | 'server-shutdown' | 'timeout' | 'kicked'
  message?: string
  isRecoverable: boolean
}

export interface CleanupOptions {
  preserveLocalState: boolean
  notifyOtherPlayers: boolean
  saveProgressToStorage: boolean
  gracePeriodMs: number
}

export interface DisconnectionMetadata {
  playerId: string
  playerName: string
  roomId: string | null
  currentPhase: string
  disconnectionTime: Date
  reason: DisconnectionReason
}

const DEFAULT_CLEANUP_OPTIONS: CleanupOptions = {
  preserveLocalState: true,
  notifyOtherPlayers: true,
  saveProgressToStorage: true,
  gracePeriodMs: 30000 // 30 seconds grace period
}

export class DisconnectionManager {
  private static instance: DisconnectionManager | null = null
  private cleanupTimer: NodeJS.Timeout | null = null
  private isDisconnecting = false
  private disconnectionMetadata: DisconnectionMetadata | null = null

  private constructor() {}

  static getInstance(): DisconnectionManager {
    if (!DisconnectionManager.instance) {
      DisconnectionManager.instance = new DisconnectionManager()
    }
    return DisconnectionManager.instance
  }

  // Initiate graceful disconnection
  public async initiateGracefulDisconnection(
    reason: DisconnectionReason,
    options: Partial<CleanupOptions> = {}
  ): Promise<void> {
    if (this.isDisconnecting) {
      return // Already in progress
    }

    this.isDisconnecting = true
    const finalOptions = { ...DEFAULT_CLEANUP_OPTIONS, ...options }

    // Gather current state metadata
    this.gatherDisconnectionMetadata(reason)

    try {
      // Phase 1: Notify other players (if applicable)
      if (finalOptions.notifyOtherPlayers && reason.type === 'user-initiated') {
        await this.notifyPlannedDisconnection()
      }

      // Phase 2: Save progress to storage
      if (finalOptions.saveProgressToStorage) {
        await this.saveProgressToStorage()
      }

      // Phase 3: Clean up game state gracefully
      await this.performGracefulStateCleanup()

      // Phase 4: Clean up network connections
      await this.cleanupNetworkConnections(reason)

      // Phase 5: Preserve local state if needed
      if (finalOptions.preserveLocalState && reason.isRecoverable) {
        await this.preserveLocalStateForRecovery()
      } else {
        await this.clearAllLocalState()
      }

      // Phase 6: Show appropriate user feedback
      this.showDisconnectionFeedback(reason)

    } catch (error) {
      console.error('Error during graceful disconnection:', error)
      
      // Fallback to immediate cleanup
      await this.performImmediateCleanup()
    } finally {
      this.isDisconnecting = false
    }
  }

  // Handle unexpected disconnection
  public async handleUnexpectedDisconnection(
    reason: DisconnectionReason
  ): Promise<void> {
    const roomStore = useRoomStore.getState()
    
    // Skip disconnection handling if not in a multiplayer room
    if (!roomStore.room?.id) {
      console.log('Skipping disconnection handling - no active room')
      return
    }

    console.warn('Unexpected disconnection detected:', reason)

    // Gather metadata for potential recovery
    this.gatherDisconnectionMetadata(reason)

    // Start grace period for potential recovery
    this.startDisconnectionGracePeriod(reason)

    // Preserve state for recovery attempt
    await this.preserveLocalStateForRecovery()

    // Show user-friendly message
    getGameActions().addAlert({
      type: 'warning',
      title: 'Connection Lost',
      message: reason.isRecoverable 
        ? 'Connection lost. Attempting to reconnect...'
        : 'Connection lost. Please rejoin the room.'
    })
  }

  // Start grace period timer
  private startDisconnectionGracePeriod(reason: DisconnectionReason): void {
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer)
    }

    // If it's recoverable, give time for reconnection
    if (reason.isRecoverable) {
      this.cleanupTimer = setTimeout(() => {
        this.performDelayedCleanup()
      }, DEFAULT_CLEANUP_OPTIONS.gracePeriodMs)
    } else {
      // Immediate cleanup for non-recoverable disconnections
      this.performImmediateCleanup()
    }
  }

  // Gather current state metadata
  private gatherDisconnectionMetadata(reason: DisconnectionReason): void {
    const roomStore = useRoomStore.getState()

    this.disconnectionMetadata = {
      playerId: useGameStore.getState().currentPlayerId || 'unknown',
      playerName: 'Unknown Player', // Will be updated from room store
      roomId: roomStore.room?.id || null,
      currentPhase: useGameStore.getState().gamePhase || 'unknown',
      disconnectionTime: new Date(),
      reason
    }
  }

  // Notify other players of planned disconnection
  private async notifyPlannedDisconnection(): Promise<void> {
    const roomService = getRoomMultiplayerService()
    const metadata = this.disconnectionMetadata

    if (roomService && metadata?.roomId) {
      try {
        // Emit planned disconnection event
        roomService.syncPlayerState('turn', {
          type: 'planned-disconnection',
          playerId: metadata.playerId,
          message: 'Player is leaving the game',
          timestamp: new Date()
        })

        // Give time for the message to be sent
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error('Failed to notify other players:', error)
      }
    }
  }

  // Save current progress to localStorage
  private async saveProgressToStorage(): Promise<void> {
    try {
      const roomStore = useRoomStore.getState()
      const gameStore = useGameStore.getState()
      const turnStore = useTurnStore.getState()
      const charlestonStore = useCharlestonStore.getState()

      const progressData = {
        room: {
          roomCode: roomStore.room?.id,
          players: roomStore.room?.players || [],
          currentPhase: useGameStore.getState().gamePhase
        },
        game: {
          gamePhase: gameStore.gamePhase,
          currentPlayerId: gameStore.currentPlayerId
        },
        turn: {
          currentPlayer: turnStore.currentPlayerId,
          // turn order not exposed via adapter; derive from game store if needed
          turnOrder: useGameStore.getState().turnOrder
        },
        charleston: {
          currentPhase: charlestonStore.currentPhase,
          phaseHistory: charlestonStore.phaseHistory
        },
        metadata: this.disconnectionMetadata,
        savedAt: new Date()
      }

      localStorage.setItem('american-mahjong-progress', JSON.stringify(progressData))
      console.log('Progress saved to localStorage')
    } catch (error) {
      console.error('Failed to save progress:', error)
    }
  }

  // Perform graceful state cleanup
  private async performGracefulStateCleanup(): Promise<void> {
    const charlestonStore = useCharlestonStore.getState()

    // Handle phase-specific cleanup based on consolidated game phase
    switch (useGameStore.getState().gamePhase) {
      case 'charleston':
        // End Charleston gracefully
        if (charlestonStore.isActive) {
          charlestonStore.endCharleston()
        }
        break

      case 'playing':
        // Handle turn cleanup if it's the player's turn
        if (useTurnStore.getState().currentPlayerId) {
          // Auto-pass turn or handle gracefully - would need proper turn management
          console.log('Player disconnected during their turn')
        }
        break

      case 'setup':
        // Clear readiness states
        // No-op: readiness is not tracked in consolidated room store
        break
    }

    // Mark player as disconnected
    if (this.disconnectionMetadata?.playerId) {
      try {
        const roomActions = useRoomStore.getState().actions
        roomActions.setConnectionStatus('disconnected')
      } catch (e) {
        console.warn('Failed to mark player disconnected', e)
      }
    }
  }

  // Clean up network connections
  private async cleanupNetworkConnections(reason: DisconnectionReason): Promise<void> {
    try {
      // Clean up room multiplayer service
      if (reason.type === 'user-initiated' || reason.type === 'kicked') {
        // Leave room properly for user-initiated disconnections
        const roomService = getRoomMultiplayerService()
        if (roomService) {
          roomService.leaveRoom()
        }
      }

      // Destroy services
      destroyRoomMultiplayerService()
      destroyConnectionResilience()

    } catch (error) {
      console.error('Error cleaning up network connections:', error)
    }
  }

  // Preserve local state for recovery
  private async preserveLocalStateForRecovery(): Promise<void> {
    // Save to localStorage with recovery flag
    try {
      const recoveryData = {
        canRecover: true,
        disconnectionMetadata: this.disconnectionMetadata,
        preservedAt: new Date()
      }

      localStorage.setItem('american-mahjong-recovery', JSON.stringify(recoveryData))
    } catch (error) {
      console.error('Failed to preserve recovery data:', error)
    }
  }

  // Clear all local state
  private async clearAllLocalState(): Promise<void> {
    const roomStore = useRoomStore.getState()

    // Don't clear room store if not in a multiplayer room
    if (!roomStore.room?.id) {
      console.log('Skipping room state clearing - no active room')
      return
    }

    // Clear all stores - reset to empty state
    useRoomStore.getState().actions.clearAll()
    getGameActions().resetGame()
    useGameStore.getState().actions.resetTurns()
    useCharlestonStore.getState().endCharleston()

    // Clear localStorage
    localStorage.removeItem('american-mahjong-progress')
    localStorage.removeItem('american-mahjong-recovery')
  }

  // Perform immediate cleanup (fallback)
  private async performImmediateCleanup(): Promise<void> {
    try {
      destroyRoomMultiplayerService()
      destroyConnectionResilience()
      await this.clearAllLocalState()
    } catch (error) {
      console.error('Error during immediate cleanup:', error)
    }
  }

  // Perform delayed cleanup after grace period
  private async performDelayedCleanup(): Promise<void> {
    // Check if reconnection happened during grace period
    if (useRoomStore.getState().connectionStatus === 'connected') {
      console.log('Reconnection successful during grace period')
      return
    }

    // No reconnection, perform cleanup
    console.log('Grace period expired, performing cleanup')
    await this.performImmediateCleanup()

    getGameActions().addAlert({
      type: 'info',
      title: 'Session Ended',
      message: 'Unable to reconnect. Please start a new session.'
    })
  }

  // Show appropriate disconnection feedback
  private showDisconnectionFeedback(reason: DisconnectionReason): void {

    switch (reason.type) {
      case 'user-initiated':
        getGameActions().addAlert({
          type: 'info',
          title: 'Left Game',
          message: 'You have left the game session'
        })
        break

      case 'kicked':
        getGameActions().addAlert({
          type: 'warning',
          title: 'Removed from Room',
          message: 'You were removed from the room by the host'
        })
        break

      case 'server-shutdown':
        getGameActions().addAlert({
          type: 'warning',
          title: 'Server Unavailable',
          message: 'The server is currently unavailable'
        })
        break

      case 'network-error':
        getGameActions().addAlert({
          type: 'warning',
          title: 'Connection Error',
          message: reason.isRecoverable 
            ? 'Connection lost. Attempting to reconnect...'
            : 'Connection lost. Please restart the app.'
        })
        break

      case 'timeout':
        getGameActions().addAlert({
          type: 'warning',
          title: 'Connection Timeout',
          message: 'Connection timed out. Please check your network.'
        })
        break
    }
  }

  // Check if recovery is possible
  public canRecover(): boolean {
    try {
      const recoveryData = localStorage.getItem('american-mahjong-recovery')
      if (!recoveryData) return false

      const data = JSON.parse(recoveryData)
      return data.canRecover === true
    } catch {
      return false
    }
  }

  // Get recovery data
  public getRecoveryData(): DisconnectionMetadata | null {
    try {
      const recoveryData = localStorage.getItem('american-mahjong-recovery')
      if (!recoveryData) return null

      const data = JSON.parse(recoveryData)
      return data.disconnectionMetadata || null
    } catch {
      return null
    }
  }

  // Clear recovery data
  public clearRecoveryData(): void {
    localStorage.removeItem('american-mahjong-recovery')
    this.disconnectionMetadata = null
  }

  // Cancel disconnection process (for recovery)
  public cancelDisconnection(): void {
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer)
      this.cleanupTimer = null
    }
    
    this.isDisconnecting = false
    console.log('Disconnection process cancelled - recovery successful')
  }

  // Clean up manager itself
  public destroy(): void {
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer)
      this.cleanupTimer = null
    }
    
    this.isDisconnecting = false
    this.disconnectionMetadata = null
  }
}

// Export singleton instance
export const getDisconnectionManager = (): DisconnectionManager => {
  return DisconnectionManager.getInstance()
}

// Utility functions for common disconnection scenarios
export const initiateLeaveRoom = async (): Promise<void> => {
  const manager = getDisconnectionManager()
  await manager.initiateGracefulDisconnection(
    {
      type: 'user-initiated',
      message: 'Player chose to leave',
      isRecoverable: false
    },
    {
      preserveLocalState: false,
      notifyOtherPlayers: true
    }
  )
}

export const handleNetworkError = async (error: string): Promise<void> => {
  const manager = getDisconnectionManager()
  await manager.handleUnexpectedDisconnection({
    type: 'network-error',
    message: error,
    isRecoverable: true
  })
}

export const handleServerShutdown = async (): Promise<void> => {
  const manager = getDisconnectionManager()
  await manager.initiateGracefulDisconnection(
    {
      type: 'server-shutdown',
      message: 'Server is shutting down',
      isRecoverable: false
    },
    {
      preserveLocalState: false,
      notifyOtherPlayers: false
    }
  )
}

