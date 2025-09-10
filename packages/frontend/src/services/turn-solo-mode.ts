// Solo Mode Turn Management Service
// Single player using AI assistant while 3 other players play normally

import { useTurnStore, type TurnPlayer } from '../stores/turn-store'
import { useGameStore } from '../stores/game-store'

export class TurnSoloModeService {
  private humanPlayerId: string | null = null

  // Initialize solo game with human player + 3 real players (not using app)
  initializeSoloGame(playerName: string, playerId: string, otherPlayerNames: string[]): void {
    this.humanPlayerId = playerId

    // Create player objects - only human player uses the app
    const humanPlayer: TurnPlayer = {
      id: playerId,
      name: playerName,
      position: 'east', // Or chosen position
      isReady: true
    }

    // Other 3 players are real people not using the app
    const otherPlayers: TurnPlayer[] = otherPlayerNames.map((name, index) => ({
      id: `player-${index + 1}`,
      name,
      position: (['north', 'west', 'south'] as const)[index],
      isReady: true // They're physically ready, just not using the app
    }))

    const allPlayers = [humanPlayer, ...otherPlayers]
    
    const turnStore = useTurnStore.getState()
    turnStore.initializeTurns(allPlayers)
    turnStore.setMultiplayerMode(false) // Solo mode - no socket communication
  }

  // Start the solo game
  startSoloGame(): void {
    const turnStore = useTurnStore.getState()
    turnStore.startGame()
    
    useGameStore.getState().addAlert({
      type: 'info',
      title: 'Game Started',
      message: 'Solo game started - track turns manually as they happen'
    })
  }

  // Manually advance turn when observing real-world turn completion
  advanceTurnManually(): void {
    const turnStore = useTurnStore.getState()
    const currentPlayer = turnStore.getCurrentPlayerData()
    
    if (!currentPlayer) return

    // Track the turn advancement
    useGameStore.getState().addAlert({
      type: 'info',
      title: 'Turn Complete',
      message: `${currentPlayer.name} completed their turn`
    })

    turnStore.advanceTurn()
  }

  // Set specific player as current (for correction/sync)
  setCurrentPlayerManually(playerId: string): void {
    const turnStore = useTurnStore.getState()
    turnStore.setCurrentPlayer(playerId)
    
    const player = turnStore.getCurrentPlayerData()
    useGameStore.getState().addAlert({
      type: 'info',
      title: 'Turn Corrected',
      message: `Turn corrected to ${player?.name || 'Unknown player'}`
    })
  }

  // Check if it's the human player's turn (for UI highlighting)
  isHumanPlayerTurn(): boolean {
    if (!this.humanPlayerId) return false
    
    const turnStore = useTurnStore.getState()
    return turnStore.isCurrentPlayerTurn(this.humanPlayerId)
  }

  // Get current turn status for solo play
  getSoloGameStatus() {
    const turnStore = useTurnStore.getState()
    const currentPlayer = turnStore.getCurrentPlayerData()
    
    return {
      isGameActive: turnStore.isGameActive,
      currentPlayer: currentPlayer?.name || 'No player',
      currentPlayerId: currentPlayer?.id || null,
      isHumanTurn: this.isHumanPlayerTurn(),
      turnNumber: turnStore.turnNumber,
      roundNumber: turnStore.roundNumber,
      currentWind: turnStore.currentWind,
      canAdvanceTurn: turnStore.canAdvanceTurn
    }
  }

  // Get all players for display
  getAllPlayers(): TurnPlayer[] {
    const turnStore = useTurnStore.getState()
    return turnStore.players
  }

  // Mark that data was entered for a player (for tracking purposes)
  recordPlayerAction(playerId: string, action: string): void {
    const turnStore = useTurnStore.getState()
    const player = turnStore.players.find(p => p.id === playerId)
    
    if (player) {
      useGameStore.getState().addAlert({
        type: 'info',
        title: 'Action Recorded',
        message: `Recorded: ${player.name} ${action}`
      })
    }
  }

  // Reset solo game
  resetSoloGame(): void {
    const turnStore = useTurnStore.getState()
    turnStore.resetTurns()
    this.humanPlayerId = null
  }

  // Get human player ID
  getHumanPlayerId(): string | null {
    return this.humanPlayerId
  }
}

// Singleton service manager
let turnSoloModeService: TurnSoloModeService | null = null

export const getTurnSoloModeService = (): TurnSoloModeService | null => {
  return turnSoloModeService
}

export const initializeTurnSoloModeService = (): TurnSoloModeService => {
  turnSoloModeService = new TurnSoloModeService()
  return turnSoloModeService
}

export const destroyTurnSoloModeService = (): void => {
  if (turnSoloModeService) {
    turnSoloModeService = null
  }
}