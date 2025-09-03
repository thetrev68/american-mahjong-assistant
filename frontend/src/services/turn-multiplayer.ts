// Turn Management Multiplayer Service
// Real-time synchronization for turn rotation in 4-player American Mahjong

import { Socket } from 'socket.io-client'
import { useTurnStore, type TurnPlayer } from '../stores/turn-store'
import { useGameStore } from '../stores/game-store'

export class TurnMultiplayerService {
  private socket: Socket | null = null
  private roomId: string | null = null
  private playerId: string | null = null

  constructor(socket: Socket, roomId: string, playerId: string) {
    this.socket = socket
    this.roomId = roomId
    this.playerId = playerId
    this.setupSocketListeners()
  }

  private setupSocketListeners() {
    if (!this.socket) return

    // Turn start game response
    this.socket.on('turn-start-game-response', (data) => {
      if (data.success && data.gameState) {
        // Update local turn store with game state
        const turnStore = useTurnStore.getState()
        turnStore.setCurrentPlayer(data.gameState.currentPlayer)
        turnStore.startGame()
        
        console.log('Turn management: Game started successfully')
      } else {
        console.error('Turn management: Failed to start game:', data.error)
        useGameStore.getState().addAlert({
          type: 'warning',
          title: 'Turn Error',
          message: 'Failed to start turn management'
        })
      }
    })

    // Turn advance response
    this.socket.on('turn-advance-response', (data) => {
      if (data.success) {
        console.log('Turn management: Turn advanced successfully')
      } else {
        console.error('Turn management: Failed to advance turn:', data.error)
        useGameStore.getState().addAlert({
          type: 'warning',
          title: 'Turn Error', 
          message: 'Failed to advance turn'
        })
      }
    })

    // Turn update from other players
    this.socket.on('turn-update', (data) => {
      const { currentPlayer, turnNumber, roundNumber, currentWind } = data
      
      // Update local turn store
      const turnStore = useTurnStore.getState()
      turnStore.setCurrentPlayer(currentPlayer)
      
      // Update turn/round state if needed
      if (turnStore.turnNumber !== turnNumber) {
        // Force sync with server state
        console.log(`Turn sync: Updated to turn ${turnNumber}, round ${roundNumber}, wind ${currentWind}`)
      }
    })

    // Turn status response
    this.socket.on('turn-status', (data) => {
      if (data.success && data.currentPlayer) {
        const turnStore = useTurnStore.getState()
        turnStore.setCurrentPlayer(data.currentPlayer)
        
        console.log('Turn status synced:', {
          currentPlayer: data.currentPlayer,
          turnNumber: data.turnNumber,
          roundNumber: data.roundNumber,
          currentWind: data.currentWind
        })
      } else if (data.error) {
        console.error('Turn status error:', data.error)
      }
    })

    // Turn error handling
    this.socket.on('turn-error', (data) => {
      console.error('Turn management error:', data.error)
      useGameStore.getState().addAlert({
        type: 'warning',
        title: 'Turn Error',
        message: `Turn error: ${data.error}`
      })
    })
  }

  // Start the game with turn management
  startGame(players: TurnPlayer[]): void {
    if (!this.socket || !this.roomId) return

    // Set up local turn order first
    const turnStore = useTurnStore.getState()
    turnStore.initializeTurns(players)
    turnStore.setMultiplayerMode(true, this.roomId)

    // Get first player and turn order
    const firstPlayer = players.find(p => p.position === 'east')?.id || players[0]?.id
    const turnOrder = players
      .sort((a, b) => {
        const positions = ['east', 'north', 'west', 'south']
        return positions.indexOf(a.position) - positions.indexOf(b.position)
      })
      .map(p => p.id)

    // Notify backend to start turn management
    this.socket.emit('turn-start-game', {
      roomId: this.roomId,
      firstPlayer,
      turnOrder
    })
  }

  // Advance to next player's turn
  advanceTurn(): void {
    if (!this.socket || !this.roomId) return

    const turnStore = useTurnStore.getState()
    const currentPlayer = turnStore.currentPlayer
    const nextPlayer = turnStore.getNextPlayer()

    if (!currentPlayer || !nextPlayer) {
      console.error('Cannot advance turn: missing player data')
      return
    }

    // Advance locally first for immediate UI response
    turnStore.advanceTurn()

    // Notify backend
    this.socket.emit('turn-advance', {
      roomId: this.roomId,
      currentPlayerId: currentPlayer,
      nextPlayerId: nextPlayer.id,
      turnNumber: turnStore.turnNumber
    })
  }

  // Request current turn status from server
  requestTurnStatus(): void {
    if (!this.socket || !this.roomId) return

    this.socket.emit('turn-request-status', {
      roomId: this.roomId
    })
  }

  // Check if it's current player's turn
  isMyTurn(): boolean {
    const turnStore = useTurnStore.getState()
    return turnStore.isCurrentPlayerTurn(this.playerId || '')
  }

  // Get current game turn info
  getCurrentTurnInfo() {
    const turnStore = useTurnStore.getState()
    return {
      currentPlayer: turnStore.currentPlayer,
      turnNumber: turnStore.turnNumber,
      roundNumber: turnStore.roundNumber,
      currentWind: turnStore.currentWind,
      isMyTurn: this.isMyTurn()
    }
  }

  // Clean up socket listeners
  destroy(): void {
    if (!this.socket) return

    this.socket.off('turn-start-game-response')
    this.socket.off('turn-advance-response')
    this.socket.off('turn-update')
    this.socket.off('turn-status')
    this.socket.off('turn-error')
    
    this.socket = null
    this.roomId = null
    this.playerId = null
  }
}

// Singleton service manager
let turnMultiplayerService: TurnMultiplayerService | null = null

export const getTurnMultiplayerService = (): TurnMultiplayerService | null => {
  return turnMultiplayerService
}

export const initializeTurnMultiplayerService = (
  socket: Socket, 
  roomId: string, 
  playerId: string
): TurnMultiplayerService => {
  // Clean up existing service
  if (turnMultiplayerService) {
    turnMultiplayerService.destroy()
  }

  turnMultiplayerService = new TurnMultiplayerService(socket, roomId, playerId)
  return turnMultiplayerService
}

export const destroyTurnMultiplayerService = (): void => {
  if (turnMultiplayerService) {
    turnMultiplayerService.destroy()
    turnMultiplayerService = null
  }
}