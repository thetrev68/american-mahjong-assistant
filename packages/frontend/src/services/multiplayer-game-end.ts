// Multiplayer Game End Service - Synchronizes game end across all players
// Handles final hands revelation, group analytics, and coordinated transitions

import { GameEndCoordinator, type GameEndResult, type GameEndContext } from './game-end-coordinator'
import { getUnifiedMultiplayerManager } from './unified-multiplayer-manager'
import type { PlayerTile } from '../types/tile-types'
import type { NMJL2025Pattern } from 'shared-types'

interface PlayerStatistics {
  finalPatternCompletion?: number
  turnsPlayed?: number
  averageTurnTime?: number
  decisionQuality?: {
    excellent: number
    good: number
    fair: number
    poor: number
  }
  patternSwitch?: boolean
  mostActive?: boolean
  playerId?: string
}

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
  private context: GameEndContext

  constructor(context: GameEndContext) {
    this.context = context
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
    const winnerAnalysis = this.analyzeWinner(scenario as unknown as Record<string, unknown>, statistics as unknown as Record<string, unknown>)
    
    // Player comparisons
    const playerComparisons = this.compareAllPlayers(allPlayerHands, allPlayerPatterns, statistics as unknown as Record<string, unknown>)
    
    // Game flow analysis
    const gameFlow = this.analyzeGameFlow(statistics as unknown as Record<string, unknown>)
    
    // Group insights
    const groupInsights = this.generateGroupInsights(playerComparisons)

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
    if (this.context.roomId && this.multiplayerManager) {
      await this.multiplayerManager.emitToRoom(this.context.roomId, 'game-end-complete', {
        playerStates,
        analytics,
        shouldNavigateToPostGame: true,
        gameId: this.context.gameId,
        timestamp: new Date()
      })
    }

    // Wait for all players to acknowledge before allowing post-game navigation
    await this.waitForPlayerAcknowledgments()
  }

  private async collectAllPlayerHands(): Promise<Record<string, PlayerTile[]>> {
    const allHands: Record<string, PlayerTile[]> = { ...this.context.playerHands }
    
    // Request hands from all other players via socket
    const handRequests = this.context.players.map(async (player) => {
      if (allHands[player.id]) {
        return { playerId: player.id, hand: allHands[player.id] }
      }
      
      try {
        // Request player's final hand via socket
        const response = await this.multiplayerManager?.emitWithResponse(
          'request-final-hand',
          { 
            requestingPlayerId: 'game-coordinator',
            targetPlayerId: player.id,
            gameId: this.context.gameId 
          },
          { timeout: 5000, priority: 'high' }
        )
        
        return { 
          playerId: player.id, 
          hand: response?.hand || [] as PlayerTile[]
        }
      } catch (error) {
        console.warn(`Failed to collect hand from player ${player.id}:`, error)
        return { 
          playerId: player.id, 
          hand: [] as PlayerTile[]
        }
      }
    })
    
    // Wait for all hand requests to complete
    const handResults = await Promise.allSettled(handRequests)
    
    // Process results
    handResults.forEach((result) => {
      if (result.status === 'fulfilled' && result.value && Array.isArray(result.value.hand)) {
        allHands[result.value.playerId] = result.value.hand as PlayerTile[]
      }
    })
    
    return allHands
  }

  private async collectAllPlayerPatterns(): Promise<Record<string, NMJL2025Pattern[]>> {
    const allPatterns: Record<string, NMJL2025Pattern[]> = {}
    
    // Request patterns from all players via socket
    const patternRequests = this.context.players.map(async (player) => {
      try {
        // Request player's selected patterns via socket
        const response = await this.multiplayerManager?.emitWithResponse(
          'request-selected-patterns',
          { 
            requestingPlayerId: 'game-coordinator',
            targetPlayerId: player.id,
            gameId: this.context.gameId 
          },
          { timeout: 3000, priority: 'high' }
        )
        
        return { 
          playerId: player.id, 
          patterns: response?.patterns || this.context.selectedPatterns
        }
      } catch (error) {
        console.warn(`Failed to collect patterns from player ${player.id}:`, error)
        return { 
          playerId: player.id, 
          patterns: this.context.selectedPatterns // Fallback to context patterns
        }
      }
    })
    
    // Wait for all pattern requests to complete
    const patternResults = await Promise.allSettled(patternRequests)
    
    // Process results
    patternResults.forEach((result) => {
      if (result.status === 'fulfilled' && result.value && Array.isArray(result.value.patterns)) {
        allPatterns[result.value.playerId] = result.value.patterns as NMJL2025Pattern[]
      }
    })
    
    return allPatterns
  }

  private async broadcastGameEnd(
    multiplayerData: MultiplayerGameEndData, 
    endType: 'mahjong' | 'wall_exhausted' | 'all_passed_out'
  ): Promise<void> {
    const { gameEndResult, allPlayerHands, allPlayerPatterns } = multiplayerData
    
    // Calculate comprehensive final scores for all players
    const finalScores = this.calculateGroupScores(gameEndResult, allPlayerPatterns, endType)
    
    // Broadcast to all players in room with complete game end data
    if (this.context.roomId && this.multiplayerManager) {
      await this.multiplayerManager.emitToRoom(this.context.roomId, 'multiplayer-game-ended', {
      endType,
      winner: gameEndResult.scenario.winner,
      winningPattern: gameEndResult.scenario.winningPattern,
      finalScores,
      allPlayerHands,
      allPlayerPatterns,
      gameStats: {
        duration: gameEndResult.statistics.duration,
        totalTurns: gameEndResult.statistics.totalTurns,
        charlestonPasses: gameEndResult.statistics.charlestonRounds || 0,
        wallTilesRemaining: this.context.wallTilesRemaining,
        gameStartTime: this.context.gameStartTime,
        playerCount: this.context.players.length
      },
        reason: gameEndResult.scenario.reason,
        timestamp: multiplayerData.timestamp
      })
    }
  }

  private calculateGroupScores(
    gameEndResult: GameEndResult,
    allPlayerPatterns: Record<string, NMJL2025Pattern[]>,
    endType: string
  ): Array<{ playerId: string; playerName: string; score: number; pattern?: string; rank: number }> {
    const scores: Array<{ playerId: string; playerName: string; score: number; pattern?: string; rank: number }> = []
    
    for (const player of this.context.players) {
      const isWinner = gameEndResult.scenario.winner === player.id
      let score = 0
      let pattern: string | undefined
      
      if (isWinner && gameEndResult.scenario.winningPattern) {
        // Winner gets the pattern points
        score = gameEndResult.scenario.winningPattern.Hand_Points || 25
        pattern = gameEndResult.scenario.winningPattern.Hand_Description
      } else if (endType === 'wall_exhausted' || endType === 'all_passed_out') {
        // In draw games, calculate partial scores based on pattern progress
        const playerPatterns = allPlayerPatterns[player.id] || []
        if (playerPatterns.length > 0) {
          // Use the highest-value pattern they were working on
          const highestPattern = playerPatterns.reduce((max, current) => 
            current.Hand_Points > max.Hand_Points ? current : max
          )
          score = Math.floor(highestPattern.Hand_Points * 0.25) // 25% of pattern value for progress
          pattern = highestPattern.Hand_Description
        }
      }
      
      scores.push({
        playerId: player.id,
        playerName: player.name,
        score,
        pattern,
        rank: 0 // Will be calculated below
      })
    }
    
    // Calculate ranks based on scores
    scores.sort((a, b) => b.score - a.score)
    scores.forEach((score, index) => {
      score.rank = index + 1
    })
    
    return scores
  }

  private analyzeWinner(scenario: Record<string, unknown>, statistics: Record<string, unknown>): MultiplayerGameEndAnalytics['winnerAnalysis'] {
    if (!scenario.winner) {
      return {
        playerId: '',
        playerName: 'No Winner',
        finalScore: 0,
        timeToWin: Number(statistics.duration) || 0,
        keyDecisions: ['Game ended without a winner']
      }
    }

    const winner = this.context.players.find(p => p.id === scenario.winner)
    const winnerScore = (statistics.finalScores as Array<{playerId: string; [key: string]: unknown}>)?.find((s) => s.playerId === scenario.winner)

    return {
      playerId: String(scenario.winner),
      playerName: winner?.name || 'Unknown',
      winningPattern: scenario.winningPattern as NMJL2025Pattern | undefined,
      finalScore: Number(winnerScore?.score) || 0,
      timeToWin: Number(statistics.duration) || 0,
      keyDecisions: [
        'Selected winning pattern early',
        'Made optimal tile decisions',
        'Completed pattern efficiently'
      ]
    }
  }

  private compareAllPlayers(
    _allPlayerHands: Record<string, PlayerTile[]>,
    allPlayerPatterns: Record<string, NMJL2025Pattern[]>,
    statistics: Record<string, unknown>
  ): MultiplayerGameEndAnalytics['playerComparisons'] {
    const comparisons = []

    for (let i = 0; i < this.context.players.length; i++) {
      const player = this.context.players[i]
      const patterns = allPlayerPatterns[player.id] || []
      const playerStats = (statistics.playerStats as Record<string, PlayerStatistics>)?.[player.id]

      comparisons.push({
        playerId: player.id,
        playerName: player.name,
        rank: i + 1, // Would be calculated based on actual performance
        patternEfficiency: Number(playerStats?.finalPatternCompletion) || 0,
        decisionQuality: playerStats?.decisionQuality ? 
          (playerStats.decisionQuality.excellent + playerStats.decisionQuality.good) / 
          Math.max(1, (Object.values(playerStats.decisionQuality) as number[]).reduce((a: number, b: number) => a + b, 0)) * 100 : 50,
        nearMisses: patterns.slice(0, 2).map(pattern => ({
          pattern,
          completionPercentage: Math.random() * 40 + 40, // Mock data
          tilesNeeded: ['2D', '3D', '4D'] // Mock data
        }))
      })
    }

    return comparisons.sort((a, b) => b.patternEfficiency - a.patternEfficiency)
  }

  private analyzeGameFlow(statistics: Record<string, unknown>): MultiplayerGameEndAnalytics['gameFlow'] {
    const playerStats = Object.values(statistics.playerStats as Record<string, PlayerStatistics>)
    const totalTurns = playerStats.reduce((sum: number, stats: PlayerStatistics) => sum + (Number(stats?.turnsPlayed) || 0), 0)

    return {
      totalDuration: Number(statistics.duration) || 0,
      averageTurnTime: totalTurns > 0 ? 
        playerStats.reduce((sum: number, stats: PlayerStatistics) => sum + (Number(stats?.averageTurnTime) || 30), 0) / playerStats.length : 30,
      mostActivePlayer: playerStats.reduce((mostActive: PlayerStatistics, stats: PlayerStatistics) => 
        (Number(stats?.turnsPlayed) || 0) > (Number(mostActive?.turnsPlayed) || 0) ? stats : mostActive, 
        {} as PlayerStatistics
      )?.playerId || 'unknown',
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
    playerComparisons: MultiplayerGameEndAnalytics['playerComparisons']
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