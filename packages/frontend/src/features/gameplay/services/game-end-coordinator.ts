// Game End Coordinator - Manages all game end scenarios and transitions
// Simplified version without persistent history storage

import type { PlayerTile } from 'shared-types'
import type { NMJL2025Pattern } from 'shared-types'

// Local type definitions (no longer stored in database)
export interface GameEndScenario {
  type: 'mahjong' | 'wall_exhausted' | 'all_passed_out' | 'forfeit'
  winner?: string
  winningPattern?: NMJL2025Pattern
  winningHand?: PlayerTile[]
  endedAt: Date
  reason: string
}

export interface GameStatistics {
  gameId: string
  startTime: Date
  duration: number
  totalTurns: number
  playerStats: Record<string, {
    turns: number
    discards: number
    calls: number
  }>
}

export interface GameEndResult {
  scenario: GameEndScenario
  statistics: GameStatistics
  shouldNavigateToPostGame: boolean
}

export interface GameEndContext {
  gameId: string
  players: Array<{ id: string, name: string }>
  wallTilesRemaining: number
  passedOutPlayers: Set<string>
  currentTurn: number
  gameStartTime: Date
  selectedPatterns: NMJL2025Pattern[]
  playerHands: Record<string, PlayerTile[]>
  roomId?: string
  coPilotMode?: 'everyone' | 'solo'
}

export class GameEndCoordinator {
  private context: GameEndContext

  constructor(context: GameEndContext) {
    this.context = context
  }

  /**
   * Check if game should end due to any scenario
   */
  checkForGameEnd(): GameEndResult | null {
    // Check wall exhaustion (simplified)
    const minTilesNeeded = this.context.players.length * 2
    if (this.context.wallTilesRemaining < minTilesNeeded) {
      return this.endGameByWallExhaustion()
    }

    // Check if all players passed out
    if (this.context.passedOutPlayers.size >= this.context.players.length) {
      return this.endGameByAllPassedOut()
    }

    // Check for forfeit (only 1 player remaining)
    const activePlayers = this.context.players.length - this.context.passedOutPlayers.size
    if (activePlayers <= 1) {
      return this.endGameByForfeit()
    }

    return null // Game continues
  }

  /**
   * End game due to mahjong declaration
   */
  endGameByMahjong(
    winnerId: string,
    winningPattern: NMJL2025Pattern,
    winningHand: PlayerTile[]
  ): GameEndResult {
    const endScenario: GameEndScenario = {
      type: 'mahjong',
      winner: winnerId,
      winningPattern,
      winningHand,
      endedAt: new Date(),
      reason: `${this.getPlayerName(winnerId)} declared mahjong with ${winningPattern.Hand_Description}`
    }

    return this.finalizeGameEnd(endScenario)
  }

  /**
   * End game due to wall exhaustion
   */
  endGameByWallExhaustion(): GameEndResult {
    const endScenario: GameEndScenario = {
      type: 'wall_exhausted',
      endedAt: new Date(),
      reason: 'Wall exhausted - no more tiles available'
    }

    return this.finalizeGameEnd(endScenario)
  }

  /**
   * End game due to all players passing out
   */
  endGameByAllPassedOut(): GameEndResult {
    const remainingPlayers = this.context.players.filter(
      p => !this.context.passedOutPlayers.has(p.id)
    )

    const endScenario: GameEndScenario = {
      type: 'all_passed_out',
      winner: remainingPlayers.length === 1 ? remainingPlayers[0].id : undefined,
      endedAt: new Date(),
      reason: remainingPlayers.length === 1 ? 
        `${remainingPlayers[0].name} is the last player remaining` :
        'All players have passed out'
    }

    return this.finalizeGameEnd(endScenario)
  }

  /**
   * End game due to forfeit
   */
  endGameByForfeit(): GameEndResult {
    const activePlayers = this.context.players.filter(
      p => !this.context.passedOutPlayers.has(p.id)
    )

    const endScenario: GameEndScenario = {
      type: 'forfeit',
      winner: activePlayers.length === 1 ? activePlayers[0].id : undefined,
      endedAt: new Date(),
      reason: activePlayers.length === 1 ? 
        `${activePlayers[0].name} wins by forfeit` :
        'Game ended by forfeit'
    }

    return this.finalizeGameEnd(endScenario)
  }

  /**
   * Get current game statistics (simplified - no persistence)
   */
  getCurrentStatistics(): Partial<GameStatistics> {
    const duration = Math.floor((Date.now() - this.context.gameStartTime.getTime()) / 1000 / 60)

    return {
      gameId: this.context.gameId,
      startTime: this.context.gameStartTime,
      duration,
      totalTurns: this.context.currentTurn,
      playerStats: {}
    }
  }

  /**
   * Create final hand revelation data for multiplayer
   */
  createHandRevelationData(): {
    allPlayerHands: Record<string, PlayerTile[]>
    finalStatistics: Partial<GameStatistics>
  } {
    return {
      allPlayerHands: this.context.playerHands,
      finalStatistics: this.getCurrentStatistics()
    }
  }

  private finalizeGameEnd(endScenario: GameEndScenario): GameEndResult {
    // Simplified - just basic statistics
    const statistics: GameStatistics = {
      gameId: this.context.gameId,
      startTime: this.context.gameStartTime,
      duration: Math.floor((Date.now() - this.context.gameStartTime.getTime()) / 1000 / 60),
      totalTurns: this.context.currentTurn,
      playerStats: {}
    }

    return {
      scenario: endScenario,
      statistics,
      shouldNavigateToPostGame: true
    }
  }

  private getPlayerName(playerId: string): string {
    return this.context.players.find(p => p.id === playerId)?.name || 'Unknown Player'
  }
}

/**
 * Utility function to check if game end conditions are met
 */
export function shouldGameEnd(context: GameEndContext): boolean {
  const coordinator = new GameEndCoordinator(context)
  return coordinator.checkForGameEnd() !== null
}

/**
 * Utility function to get wall exhaustion warning
 */
export function getWallExhaustionWarning(wallTilesRemaining: number): string | null {
  if (wallTilesRemaining <= 20) {
    return `⚠️ Only ${wallTilesRemaining} tiles left in wall - game may end soon!`
  }
  if (wallTilesRemaining <= 40) {
    return `Wall running low: ${wallTilesRemaining} tiles remaining`
  }
  return null
}