// Turn Real-time Synchronization Service
// Coordinates turn actions across multiplayer sessions with connection resilience

import { getUnifiedMultiplayerManager } from './unified-multiplayer-manager'
import { useGameStore } from '../stores/game-store'
import { useTurnStore } from '../stores/turn-store'
import { useRoomStore } from '../stores/room-store'
import type { GameAction, CallType } from './game-actions'
import type { Tile } from '../types/tile-types'

export interface TurnActionEvent {
  playerId: string
  roomId: string
  action: GameAction
  data: unknown
  timestamp: Date
  turnNumber: number
}

export interface CallResponse {
  playerId: string
  response: 'call' | 'pass'
  callType?: CallType
  tiles?: Tile[]
  priority: number // Based on turn order
}

export interface CallResolution {
  winner: CallResponse | null
  executed: boolean
  nextPlayer: string
}

export interface CallOpportunityData {
  discardedTile: Tile
  discardingPlayer: string
  eligiblePlayers: string[]
  duration: number
  deadline: number
}

export class TurnRealtimeService {
  private static instance: TurnRealtimeService | null = null
  private multiplayerManager: ReturnType<typeof getUnifiedMultiplayerManager> | null = null
  private callResponses = new Map<string, CallResponse>()
  private callOpportunityTimer: NodeJS.Timeout | null = null

  private constructor() {
    this.multiplayerManager = getUnifiedMultiplayerManager()
    this.setupTurnEventListeners()
  }

  static getInstance(): TurnRealtimeService {
    if (!TurnRealtimeService.instance) {
      TurnRealtimeService.instance = new TurnRealtimeService()
    }
    return TurnRealtimeService.instance
  }

  // Turn Event Handling

  setupTurnEventListeners(): void {
    if (!this.multiplayerManager) {
      console.warn('Turn realtime service: No multiplayer manager available')
      return
    }

    console.log('Setting up turn event listeners')

    // Listen for turn action broadcasts from other players
    this.addEventListener('turn-action-broadcast', this.handleTurnActionBroadcast.bind(this))

    // Listen for turn advancement
    this.addEventListener('turn-advance', this.handleTurnAdvance.bind(this))

    // Listen for call opportunities
    this.addEventListener('call-opportunity', this.handleCallOpportunity.bind(this))

    // Listen for call responses from other players
    this.addEventListener('call-response', this.handleCallResponse.bind(this))

    // Listen for call resolution
    this.addEventListener('call-resolved', this.handleCallResolution.bind(this))

    // Listen for turn validation errors
    this.addEventListener('turn-action-rejected', this.handleActionRejection.bind(this))

    // Listen for game state synchronization
    this.addEventListener('game-state-sync', this.handleGameStateSync.bind(this))
  }

  private addEventListener(event: string, handler: (data: unknown) => void): void {
    // TODO: Integrate with actual socket event system through multiplayer manager
    console.log(`Registered turn event listener: ${event} with handler:`, !!handler)
  }

  // Turn Action Broadcasting

  async broadcastTurnAction(action: TurnActionEvent): Promise<boolean> {
    if (!this.multiplayerManager) {
      console.error('Cannot broadcast turn action - no multiplayer manager')
      return false
    }

    try {
      const success = await this.multiplayerManager.emitToService('turn', 'turn-action-request', {
        playerId: action.playerId,
        roomId: action.roomId,
        action: action.action,
        actionData: action.data,
        timestamp: action.timestamp.toISOString(),
        turnNumber: action.turnNumber
      }, { priority: 'high', requiresAck: true })

      if (success) {
        console.log(`Turn action broadcasted: ${action.action} by ${action.playerId}`)
      } else {
        console.log(`Turn action queued: ${action.action} by ${action.playerId}`)
      }

      return success
    } catch (error) {
      console.error('Error broadcasting turn action:', error)
      return false
    }
  }

  private handleTurnActionBroadcast(data: unknown): void {
    const actionData = data as {
      playerId: string
      action: GameAction
      result: unknown
      nextPlayer: string
      timestamp: string
    }

    console.log('Received turn action broadcast:', actionData)

    const turnStore = useTurnStore.getState()
    const gameStore = useGameStore.getState()

    switch (actionData.action) {
      case 'draw':
        // Update UI to show player drew a tile (but not which tile)
        gameStore.addAlert({
          type: 'info',
          title: 'Player Action',
          message: `${actionData.playerId} drew a tile`
        })
        break

      case 'discard': {
        // Update discard pile and check for call opportunities
        const discardData = actionData.result as { tile: Tile }
        if (discardData?.tile) {
          // Add to visible discard pile
          console.log(`${actionData.playerId} discarded: ${discardData.tile.display}`)
        }
        break
      }

      case 'call': {
        // Update exposed tiles for the calling player
        const callData = actionData.result as { callType: CallType, tiles: Tile[] }
        if (callData?.tiles) {
          console.log(`${actionData.playerId} called ${callData.callType}:`, callData.tiles.map(t => t.display))
        }
        break
      }

      case 'mahjong':
        // Game over
        gameStore.setGamePhase('finished')
        gameStore.addAlert({
          type: 'success',
          title: 'Game Over',
          message: `${actionData.playerId} declared Mahjong!`
        })
        break
    }

    // Update turn to next player
    if (actionData.nextPlayer) {
      turnStore.setCurrentPlayer(actionData.nextPlayer)
    }
  }

  private handleTurnAdvance(data: unknown): void {
    const advanceData = data as {
      nextPlayer: string
      turnNumber: number
      roundNumber: number
    }

    const turnStore = useTurnStore.getState()
    turnStore.setCurrentPlayer(advanceData.nextPlayer)
    
    console.log(`Turn advanced to: ${advanceData.nextPlayer}`)
  }

  // Call Opportunity Management

  async openCallWindow(discardedTile: Tile, duration: number = 5000): Promise<CallResponse[]> {
    if (!this.multiplayerManager) {
      console.error('Cannot open call window - no multiplayer manager')
      return []
    }

    const roomStore = useRoomStore.getState()
    this.callResponses.clear()

    try {
      // Broadcast call opportunity
      await this.multiplayerManager.emitToService('turn', 'call-opportunity', {
        discardedTile: {
          id: discardedTile.id,
          suit: discardedTile.suit,
          value: discardedTile.value,
          display: discardedTile.display,
          isJoker: discardedTile.isJoker
        },
        discardingPlayer: roomStore.hostPlayerId,
        duration,
        deadline: Date.now() + duration
      }, { priority: 'critical' })

      // Wait for responses
      return new Promise((resolve) => {
        this.callOpportunityTimer = setTimeout(() => {
          const responses = Array.from(this.callResponses.values())
          resolve(responses)
        }, duration)
      })
    } catch (error) {
      console.error('Error opening call window:', error)
      return []
    }
  }

  private handleCallOpportunity(data: unknown): void {
    const opportunityData = data as CallOpportunityData

    console.log('Call opportunity available:', opportunityData)

    const gameStore = useGameStore.getState()
    const roomStore = useRoomStore.getState()
    const currentPlayerId = roomStore.hostPlayerId

    // Don't show call opportunity to the discarding player
    if (opportunityData.discardingPlayer === currentPlayerId) {
      return
    }

    // Check if current player is eligible
    if (!opportunityData.eligiblePlayers.includes(currentPlayerId || '')) {
      return
    }

    // Show call opportunity UI
    gameStore.addAlert({
      type: 'info',
      title: 'Call Opportunity',
      message: `${opportunityData.discardedTile.display} discarded. You have ${Math.floor(opportunityData.duration / 1000)} seconds to call.`
    })

    // Auto-pass if no response
    setTimeout(() => {
      this.respondToCall('pass')
    }, opportunityData.duration)
  }

  async respondToCall(response: 'call' | 'pass', callType?: CallType, tiles?: Tile[]): Promise<void> {
    if (!this.multiplayerManager) {
      console.error('Cannot respond to call - no multiplayer manager')
      return
    }

    const roomStore = useRoomStore.getState()
    const turnStore = useTurnStore.getState()

    try {
      await this.multiplayerManager.emitToService('turn', 'call-response', {
        playerId: roomStore.hostPlayerId,
        response,
        callType,
        tiles: tiles?.map(tile => ({
          id: tile.id,
          suit: tile.suit,
          value: tile.value,
          display: tile.display,
          isJoker: tile.isJoker
        })),
        priority: this.getCallPriority(roomStore.hostPlayerId || '', turnStore.turnOrder)
      }, { priority: 'critical' })

      console.log(`Call response sent: ${response}`)
    } catch (error) {
      console.error('Error responding to call:', error)
    }
  }

  private handleCallResponse(data: unknown): void {
    const responseData = data as CallResponse

    this.callResponses.set(responseData.playerId, responseData)
    console.log('Call response received:', responseData)
  }

  handleCallResponses(responses: CallResponse[]): CallResolution {
    // Find the highest priority caller
    const callers = responses.filter(r => r.response === 'call')
    
    if (callers.length === 0) {
      return {
        winner: null,
        executed: false,
        nextPlayer: this.getNextPlayerInTurnOrder()
      }
    }

    // Sort by priority (lower number = higher priority)
    callers.sort((a, b) => a.priority - b.priority)
    const winner = callers[0]

    return {
      winner,
      executed: true,
      nextPlayer: winner.playerId
    }
  }

  private handleCallResolution(data: unknown): void {
    const resolutionData = data as {
      winner: CallResponse | null
      executed: boolean
      nextPlayer: string
    }

    const turnStore = useTurnStore.getState()
    const gameStore = useGameStore.getState()

    if (resolutionData.winner && resolutionData.executed) {
      gameStore.addAlert({
        type: 'success',
        title: 'Call Made',
        message: `${resolutionData.winner.playerId} called ${resolutionData.winner.callType}`
      })
    }

    // Update turn order
    turnStore.setCurrentPlayer(resolutionData.nextPlayer)
    
    console.log('Call resolved:', resolutionData)
  }

  // Turn Timeout Handling (Note: Timeout system commented out per user request)

  handleTurnTimeout(playerId: string): void {
    console.log(`Turn timeout for player: ${playerId}`)
    
    const gameStore = useGameStore.getState()
    gameStore.addAlert({
      type: 'warning',
      title: 'Turn Timeout',
      message: `${playerId} took too long. Turn advanced automatically.`
    })

    // Advance turn
    const turnStore = useTurnStore.getState()
    turnStore.advanceTurn()
  }

  // State Synchronization

  async syncTurnStateWithServer(): Promise<void> {
    if (!this.multiplayerManager) {
      console.error('Cannot sync turn state - no multiplayer manager')
      return
    }

    const roomStore = useRoomStore.getState()
    
    try {
      await this.multiplayerManager.emitToService('turn', 'request-game-state-sync', {
        roomId: roomStore.currentRoomCode,
        playerId: roomStore.hostPlayerId
      }, { priority: 'medium' })

      console.log('Turn state sync requested')
    } catch (error) {
      console.error('Error syncing turn state:', error)
    }
  }

  async recoverTurnStateOnReconnection(): Promise<void> {
    console.log('Recovering turn state after reconnection')
    
    // Request full game state recovery
    await this.syncTurnStateWithServer()
    
    // Clear any pending call responses
    this.callResponses.clear()
    if (this.callOpportunityTimer) {
      clearTimeout(this.callOpportunityTimer)
      this.callOpportunityTimer = null
    }
  }

  private handleGameStateSync(data: unknown): void {
    const syncData = data as {
      currentPlayer: string
      turnNumber: number
      roundNumber: number
      playerActions: Record<string, { hasDrawn: boolean, hasDiscarded: boolean }>
      discardPile: Tile[]
      wallCount: number
    }

    console.log('Received game state sync:', syncData)

    const turnStore = useTurnStore.getState()
    const gameStore = useGameStore.getState()

    // Update turn state
    turnStore.setCurrentPlayer(syncData.currentPlayer)
    
    // Update game state
    gameStore.addAlert({
      type: 'info',
      title: 'Game Synchronized',
      message: 'Game state updated from server'
    })
  }

  private handleActionRejection(data: unknown): void {
    const rejectionData = data as {
      action: GameAction
      reason: string
      playerId: string
    }

    console.error('Turn action rejected:', rejectionData)

    const gameStore = useGameStore.getState()
    gameStore.addAlert({
      type: 'warning',
      title: 'Action Rejected',
      message: rejectionData.reason
    })
  }

  // Helper Methods

  private getCallPriority(playerId: string, turnOrder: string[]): number {
    // Priority based on turn order (closer to current turn = higher priority)
    const index = turnOrder.indexOf(playerId)
    return index >= 0 ? index : 999
  }

  private getNextPlayerInTurnOrder(): string {
    const turnStore = useTurnStore.getState()
    const nextPlayer = turnStore.getNextPlayer()
    return nextPlayer?.id || ''
  }

  // Cleanup

  cleanup(): void {
    if (this.callOpportunityTimer) {
      clearTimeout(this.callOpportunityTimer)
      this.callOpportunityTimer = null
    }
    
    this.callResponses.clear()
    console.log('Turn realtime service cleaned up')
  }
}

// Export singleton instance
export const turnRealtime = TurnRealtimeService.getInstance()

// React hook for using turn realtime service
export const useTurnRealtime = () => {
  const service = TurnRealtimeService.getInstance()
  
  return {
    broadcastTurnAction: (action: TurnActionEvent) => service.broadcastTurnAction(action),
    openCallWindow: (discardedTile: Tile, duration?: number) => service.openCallWindow(discardedTile, duration),
    respondToCall: (response: 'call' | 'pass', callType?: CallType, tiles?: Tile[]) => service.respondToCall(response, callType, tiles),
    syncTurnState: () => service.syncTurnStateWithServer(),
    recoverTurnState: () => service.recoverTurnStateOnReconnection(),
    cleanup: () => service.cleanup()
  }
}