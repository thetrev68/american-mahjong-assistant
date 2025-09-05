// Game End Coordinator - Manages all game end scenarios and transitions
// Integrates with GameStatisticsEngine and handles multiplayer coordination

import { GameStatisticsEngine, type GameEndScenario, type GameStatistics } from './game-statistics'
import type { PlayerTile } from '../types/tile-types'
import type { NMJL2025Pattern } from '../../../shared/nmjl-types'
import type { CompletedGame } from '../stores/history-store'

export interface GameEndResult {
  scenario: GameEndScenario
  statistics: GameStatistics
  shouldNavigateToPostGame: boolean
  completedGameData: Omit<CompletedGame, 'id'>
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
  private statisticsEngine: GameStatisticsEngine
  private context: GameEndContext

  constructor(context: GameEndContext) {
    this.context = context
    this.statisticsEngine = new GameStatisticsEngine(
      context.gameId,
      context.players
    )
  }

  /**
   * Check if game should end due to any scenario
   */
  checkForGameEnd(): GameEndResult | null {
    // Check wall exhaustion
    const wallCheck = GameStatisticsEngine.checkWallExhaustion(
      this.context.wallTilesRemaining,
      this.context.players.length
    )
    
    if (!wallCheck.canContinue) {
      return this.endGameByWallExhaustion()
    }

    // Check if all players passed out
    if (GameStatisticsEngine.checkAllPlayersPassedOut(
      this.context.passedOutPlayers,
      this.context.players.length
    )) {
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
   * Record a player action for statistics
   */
  recordPlayerAction(
    playerId: string, 
    actionType: 'draw' | 'discard' | 'call',
    turnDuration?: number
  ): void {
    this.statisticsEngine.recordTurn(playerId, actionType, turnDuration)
  }

  /**
   * Record a tile discard
   */
  recordDiscard(playerId: string, tile: PlayerTile): void {
    this.statisticsEngine.recordDiscard(playerId, tile)
  }

  /**
   * Record a call attempt
   */
  recordCallAttempt(playerId: string): void {
    this.statisticsEngine.recordCallAttempt(playerId)
  }

  /**
   * Record pattern switch
   */
  recordPatternSwitch(playerId: string, newPatterns: NMJL2025Pattern[]): void {
    this.statisticsEngine.recordPatternSwitch(playerId, newPatterns)
  }

  /**
   * Update pattern progress
   */
  updatePatternProgress(playerId: string, completionPercentage: number): void {
    this.statisticsEngine.updatePatternProgress(playerId, completionPercentage)
  }

  /**
   * Get current game statistics (for live updates)
   */
  getCurrentStatistics(): Partial<GameStatistics> {
    const duration = Math.floor((Date.now() - this.context.gameStartTime.getTime()) / 1000 / 60)
    
    return {
      gameId: this.context.gameId,
      startTime: this.context.gameStartTime,
      duration,
      totalTurns: this.context.currentTurn,
      playerStats: Object.fromEntries(this.statisticsEngine['playerStats'])
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
    // Generate comprehensive statistics
    const statistics = this.statisticsEngine.generateFinalStatistics(endScenario)

    // Get winning player's data for completed game
    const winnerData = endScenario.winner ? {
      finalHand: this.context.playerHands[endScenario.winner] || [],
      winningPattern: endScenario.winningPattern
    } : {
      finalHand: [],
      winningPattern: undefined
    }

    // Generate game analysis for history store
    const gameAnalysis = this.statisticsEngine.generateGameAnalysis(
      endScenario,
      this.context.selectedPatterns
    )

    // Create completed game data
    const completedGameData: Omit<CompletedGame, 'id'> = {
      timestamp: statistics.startTime,
      duration: statistics.duration,
      outcome: this.determineOutcome(endScenario),
      finalScore: this.getFinalScore(endScenario),
      difficulty: this.determineDifficulty(),
      selectedPatterns: this.context.selectedPatterns,
      finalHand: winnerData.finalHand.map(tile => ({
        id: tile.id,
        suit: tile.suit as any, // Type conversion needed
        value: tile.value,
        displayName: tile.displayName
      })),
      winningPattern: winnerData.winningPattern,
      decisions: gameAnalysis.decisions,
      patternAnalyses: gameAnalysis.patternAnalyses,
      performance: gameAnalysis.performance,
      insights: gameAnalysis.insights,
      shared: false,
      votes: 0,
      comments: [],
      roomId: this.context.roomId,
      playerCount: this.context.players.length,
      coPilotMode: this.context.coPilotMode
    }

    return {
      scenario: endScenario,
      statistics,
      shouldNavigateToPostGame: true,
      completedGameData
    }
  }

  private getPlayerName(playerId: string): string {
    return this.context.players.find(p => p.id === playerId)?.name || 'Unknown Player'
  }

  private determineOutcome(endScenario: GameEndScenario): 'won' | 'lost' | 'draw' | 'incomplete' {
    switch (endScenario.type) {
      case 'mahjong':
        return 'won'
      case 'wall_exhausted':
      case 'all_passed_out':
        return 'draw'
      case 'forfeit':
        return endScenario.winner ? 'won' : 'incomplete'
      default:
        return 'incomplete'
    }
  }

  private getFinalScore(endScenario: GameEndScenario): number {
    if (endScenario.type === 'mahjong' && endScenario.winningPattern) {
      return endScenario.winningPattern.Hand_Points
    }
    
    // For non-winning scenarios, return 0 (traditional American Mahjong)
    return 0
  }

  private determineDifficulty(): 'beginner' | 'intermediate' | 'expert' {
    // Determine difficulty based on patterns selected
    const difficulties = this.context.selectedPatterns.map(p => p.Hand_Difficulty)
    
    if (difficulties.some(d => d === 'hard')) return 'expert'
    if (difficulties.some(d => d === 'medium')) return 'intermediate'
    return 'beginner'
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