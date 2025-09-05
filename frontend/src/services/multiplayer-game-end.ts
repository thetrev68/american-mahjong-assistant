// Multiplayer Game End Service - Synchronizes game end across all players
// Handles final hands revelation, group analytics, and coordinated transitions

import { GameEndCoordinator, type GameEndResult, type GameEndContext } from './game-end-coordinator'
import { getUnifiedMultiplayerManager } from './unified-multiplayer-manager'
import type { PlayerTile } from '../types/tile-types'
import type { NMJL2025Pattern } from '../../../shared/nmjl-types'

export interface MultiplayerGameEndData {
  gameEndResult: GameEndResult
  allPlayerHands: Record<string, PlayerTile[]>
  allPlayerPatterns: Record<string, NMJL2025Pattern[]>
  gameId: string
  roomId: string
  timestamp: Date
}

export interface PlayerGameEndState {
  playerId: string
  playerName: string
  finalHand: PlayerTile[]
  selectedPatterns: NMJL2025Pattern[]
  finalScore: number
  patternCompletion: number
  isWinner: boolean
  passedOut: boolean
  gameEndReason?: string
}

export interface MultiplayerGameEndAnalytics {
  // Group comparison
  winnerAnalysis: {
    playerId: string
    playerName: string
    winningPattern?: NMJL2025Pattern
    finalScore: number
    timeToWin: number
    keyDecisions: string[]
  }
  
  // Player comparisons
  playerComparisons: Array<{
    playerId: string
    playerName: string
    rank: number
    patternEfficiency: number
    decisionQuality: number
    nearMisses: Array<{
      pattern: NMJL2025Pattern
      completionPercentage: number
      tilesNeeded: string[]
    }>
  }>
  
  // Game flow analysis
  gameFlow: {
    totalDuration: number
    averageTurnTime: number
    mostActivePlayer: string
    charlestonEffectiveness: Record<string, number>
    criticalMoments: Array<{
      timestamp: Date
      event: string
      playerId: string
      impact: 'high' | 'medium' | 'low'
    }>
  }
  
  // Learning insights for the group
  groupInsights: {
    competitiveBalance: 'very-close' | 'close' | 'moderate' | 'one-sided'
    recommendedPatterns: NMJL2025Pattern[]
    groupStrengths: string[]
    areasForImprovement: string[]
    nextGameSuggestions: string[]
  }
}

export class MultiplayerGameEndService {
  private coordinator: GameEndCoordinator
  private multiplayerManager = getUnifiedMultiplayerManager()

  constructor(private context: GameEndContext) {
    this.coordinator = new GameEndCoordinator(context)
  }

  /**
   * Handle mahjong declaration in multiplayer context
   */
  async declareMahjong(
    winnerId: string,
    winningPattern: NMJL2025Pattern,
    winningHand: PlayerTile[]
  ): Promise<MultiplayerGameEndData> {
    // End game using coordinator
    const gameEndResult = this.coordinator.endGameByMahjong(winnerId, winningPattern, winningHand)
    
    // Collect all player data for revelation
    const allPlayerHands = await this.collectAllPlayerHands()
    const allPlayerPatterns = await this.collectAllPlayerPatterns()
    
    // Create multiplayer game end data
    const multiplayerData: MultiplayerGameEndData = {
      gameEndResult,
      allPlayerHands,
      allPlayerPatterns,
      gameId: this.context.gameId,
      roomId: this.context.roomId || '',
      timestamp: new Date()
    }

    // Broadcast to all players
    await this.broadcastGameEnd(multiplayerData, 'mahjong')
    
    return multiplayerData
  }

  /**
   * Handle wall exhaustion in multiplayer context
   */
  async handleWallExhaustion(): Promise<MultiplayerGameEndData> {
    const gameEndResult = this.coordinator.endGameByWallExhaustion()
    
    const allPlayerHands = await this.collectAllPlayerHands()
    const allPlayerPatterns = await this.collectAllPlayerPatterns()
    
    const multiplayerData: MultiplayerGameEndData = {
      gameEndResult,
      allPlayerHands,
      allPlayerPatterns,
      gameId: this.context.gameId,
      roomId: this.context.roomId || '',
      timestamp: new Date()
    }

    await this.broadcastGameEnd(multiplayerData, 'wall_exhausted')
    
    return multiplayerData
  }

  /**
   * Handle all players passed out scenario
   */
  async handleAllPlayersPassedOut(): Promise<MultiplayerGameEndData> {
    const gameEndResult = this.coordinator.endGameByAllPassedOut()
    
    const allPlayerHands = await this.collectAllPlayerHands()
    const allPlayerPatterns = await this.collectAllPlayerPatterns()
    
    const multiplayerData: MultiplayerGameEndData = {
      gameEndResult,
      allPlayerHands,
      allPlayerPatterns,
      gameId: this.context.gameId,
      roomId: this.context.roomId || '',
      timestamp: new Date()
    }

    await this.broadcastGameEnd(multiplayerData, 'all_passed_out')
    
    return multiplayerData
  }

  /**
   * Generate comprehensive multiplayer analytics
   */
  generateMultiplayerAnalytics(multiplayerData: MultiplayerGameEndData): MultiplayerGameEndAnalytics {
    const { gameEndResult, allPlayerHands, allPlayerPatterns } = multiplayerData
    const { scenario, statistics } = gameEndResult

    // Winner analysis
    const winnerAnalysis = this.analyzeWinner(scenario, statistics)
    
    // Player comparisons
    const playerComparisons = this.compareAllPlayers(allPlayerHands, allPlayerPatterns, statistics)
    
    // Game flow analysis
    const gameFlow = this.analyzeGameFlow(statistics)
    
    // Group insights
    const groupInsights = this.generateGroupInsights(playerComparisons, gameFlow)

    return {
      winnerAnalysis,
      playerComparisons,
      gameFlow,
      groupInsights
    }
  }

  /**
   * Create player-specific game end states
   */
  createPlayerGameEndStates(multiplayerData: MultiplayerGameEndData): Record<string, PlayerGameEndState> {
    const { gameEndResult, allPlayerHands, allPlayerPatterns } = multiplayerData
    const playerStates: Record<string, PlayerGameEndState> = {}

    for (const player of this.context.players) {
      const finalHand = allPlayerHands[player.id] || []
      const selectedPatterns = allPlayerPatterns[player.id] || []
      const playerScore = gameEndResult.statistics.finalScores.find(s => s.playerId === player.id)
      const isWinner = gameEndResult.scenario.winner === player.id
      const passedOut = this.context.passedOutPlayers.has(player.id)

      playerStates[player.id] = {
        playerId: player.id,
        playerName: player.name,
        finalHand,
        selectedPatterns,
        finalScore: playerScore?.score || 0,
        patternCompletion: this.calculatePatternCompletion(finalHand, selectedPatterns),
        isWinner,
        passedOut,
        gameEndReason: isWinner ? 'Won the game!' : 
                     passedOut ? 'Passed out' :
                     gameEndResult.scenario.reason
      }
    }

    return playerStates
  }

  /**
   * Coordinate synchronized transition to post-game
   */
  async coordinatePostGameTransition(multiplayerData: MultiplayerGameEndData): Promise<void> {
    const playerStates = this.createPlayerGameEndStates(multiplayerData)
    const analytics = this.generateMultiplayerAnalytics(multiplayerData)

    // Broadcast final game state to all players
    await this.multiplayerManager.emitToRoom(this.context.roomId || '', 'game-end-complete', {
      playerStates,
      analytics,
      shouldNavigateToPostGame: true,
      gameId: this.context.gameId,
      timestamp: new Date()
    })

    // Wait for all players to acknowledge before allowing post-game navigation
    await this.waitForPlayerAcknowledgments()
  }

  private async collectAllPlayerHands(): Promise<Record<string, PlayerTile[]>> {
    // In a real implementation, this would request hands from all connected players
    // For now, use the context data and extend with mock data for other players
    const allHands: Record<string, PlayerTile[]> = { ...this.context.playerHands }
    
    // Fill in missing player hands with empty arrays (they would be collected via socket)
    for (const player of this.context.players) {
      if (!allHands[player.id]) {
        allHands[player.id] = [] // Would be populated from socket request
      }
    }
    
    return allHands
  }

  private async collectAllPlayerPatterns(): Promise<Record<string, NMJL2025Pattern[]>> {
    // Similar to hands, this would collect all player patterns via socket
    const allPatterns: Record<string, NMJL2025Pattern[]> = {}
    
    for (const player of this.context.players) {
      // For now, use the same patterns for all players (would be individual in real implementation)
      allPatterns[player.id] = this.context.selectedPatterns
    }
    
    return allPatterns
  }

  private async broadcastGameEnd(
    multiplayerData: MultiplayerGameEndData, 
    endType: 'mahjong' | 'wall_exhausted' | 'all_passed_out'
  ): Promise<void> {
    const { gameEndResult } = multiplayerData
    
    // Broadcast to all players in room
    await this.multiplayerManager.emitToRoom(this.context.roomId || '', 'multiplayer-game-ended', {
      endType,
      winner: gameEndResult.scenario.winner,
      winningPattern: gameEndResult.scenario.winningPattern,
      finalScores: gameEndResult.statistics.finalScores,
      gameStats: {
        duration: gameEndResult.statistics.duration,
        totalTurns: gameEndResult.statistics.totalTurns,
        charlestonPasses: gameEndResult.statistics.charlestonRounds
      },
      reason: gameEndResult.scenario.reason,
      timestamp: multiplayerData.timestamp
    })
  }

  private analyzeWinner(scenario: any, statistics: any): MultiplayerGameEndAnalytics['winnerAnalysis'] {
    if (!scenario.winner) {
      return {
        playerId: '',
        playerName: 'No Winner',
        finalScore: 0,
        timeToWin: statistics.duration,
        keyDecisions: ['Game ended without a winner']
      }
    }

    const winner = this.context.players.find(p => p.id === scenario.winner)
    const winnerScore = statistics.finalScores.find((s: any) => s.playerId === scenario.winner)

    return {
      playerId: scenario.winner,
      playerName: winner?.name || 'Unknown',
      winningPattern: scenario.winningPattern,
      finalScore: winnerScore?.score || 0,
      timeToWin: statistics.duration,
      keyDecisions: [
        'Selected winning pattern early',
        'Made optimal tile decisions',
        'Completed pattern efficiently'
      ]
    }
  }

  private compareAllPlayers(
    allPlayerHands: Record<string, PlayerTile[]>,
    allPlayerPatterns: Record<string, NMJL2025Pattern[]>,
    statistics: any
  ): MultiplayerGameEndAnalytics['playerComparisons'] {
    const comparisons = []

    for (let i = 0; i < this.context.players.length; i++) {
      const player = this.context.players[i]
      const finalHand = allPlayerHands[player.id] || []
      const patterns = allPlayerPatterns[player.id] || []
      const playerStats = statistics.playerStats[player.id]

      comparisons.push({
        playerId: player.id,
        playerName: player.name,
        rank: i + 1, // Would be calculated based on actual performance
        patternEfficiency: playerStats?.finalPatternCompletion || 0,
        decisionQuality: playerStats ? 
          (playerStats.decisionQuality.excellent + playerStats.decisionQuality.good) / 
          Math.max(1, Object.values(playerStats.decisionQuality).reduce((a: any, b: any) => a + b, 0)) * 100 : 50,
        nearMisses: patterns.slice(0, 2).map(pattern => ({
          pattern,
          completionPercentage: Math.random() * 40 + 40, // Mock data
          tilesNeeded: ['2D', '3D', '4D'] // Mock data
        }))
      })
    }

    return comparisons.sort((a, b) => b.patternEfficiency - a.patternEfficiency)
  }

  private analyzeGameFlow(statistics: any): MultiplayerGameEndAnalytics['gameFlow'] {
    const playerStats = Object.values(statistics.playerStats) as any[]
    const totalTurns = playerStats.reduce((sum, stats) => sum + (stats.turnsPlayed || 0), 0)

    return {
      totalDuration: statistics.duration,
      averageTurnTime: totalTurns > 0 ? 
        playerStats.reduce((sum, stats) => sum + (stats.averageTurnTime || 30), 0) / playerStats.length : 30,
      mostActivePlayer: playerStats.reduce((mostActive, stats) => 
        (stats.turnsPlayed || 0) > (mostActive.turnsPlayed || 0) ? stats : mostActive
      ).playerId || 'unknown',
      charlestonEffectiveness: Object.fromEntries(
        this.context.players.map(p => [p.id, Math.random() * 40 + 60]) // Mock data
      ),
      criticalMoments: [
        {
          timestamp: new Date(Date.now() - 300000), // 5 minutes ago
          event: 'Pattern switch detected',
          playerId: this.context.players[0]?.id || '',
          impact: 'high' as const
        }
      ]
    }
  }

  private generateGroupInsights(
    playerComparisons: MultiplayerGameEndAnalytics['playerComparisons'],
    gameFlow: MultiplayerGameEndAnalytics['gameFlow']
  ): MultiplayerGameEndAnalytics['groupInsights'] {
    const efficiencyRange = Math.max(...playerComparisons.map(p => p.patternEfficiency)) - 
                           Math.min(...playerComparisons.map(p => p.patternEfficiency))

    let competitiveBalance: MultiplayerGameEndAnalytics['groupInsights']['competitiveBalance']
    if (efficiencyRange < 10) competitiveBalance = 'very-close'
    else if (efficiencyRange < 25) competitiveBalance = 'close'
    else if (efficiencyRange < 50) competitiveBalance = 'moderate'
    else competitiveBalance = 'one-sided'

    return {
      competitiveBalance,
      recommendedPatterns: this.context.selectedPatterns.slice(0, 3), // Top patterns
      groupStrengths: [
        'Strong pattern recognition',
        'Good strategic timing',
        'Effective Charleston play'
      ],
      areasForImprovement: [
        'Pattern completion speed',
        'Defensive tile play',
        'Joker utilization'
      ],
      nextGameSuggestions: [
        'Try more challenging patterns',
        'Focus on speed rounds',
        'Practice defensive strategies'
      ]
    }
  }

  private calculatePatternCompletion(finalHand: PlayerTile[], selectedPatterns: NMJL2025Pattern[]): number {
    if (selectedPatterns.length === 0) return 0
    
    // Mock calculation - would use real pattern analysis
    const handSize = finalHand.length
    const expectedSize = 14
    
    return Math.min(100, (handSize / expectedSize) * 100)
  }

  private async waitForPlayerAcknowledgments(): Promise<void> {
    // Mock implementation - would wait for all players to acknowledge game end
    return new Promise(resolve => {
      setTimeout(resolve, 2000) // 2 second delay for synchronization
    })
  }
}

/**
 * Factory function to create multiplayer game end service
 */
export function createMultiplayerGameEndService(context: GameEndContext): MultiplayerGameEndService {
  return new MultiplayerGameEndService(context)
}

/**
 * Utility function to check if current session is multiplayer
 */
export function isMultiplayerSession(context: GameEndContext): boolean {
  return !!(context.roomId && context.players.length > 1)
}