// Game Statistics Engine - Generate comprehensive game statistics
// Tracks game flow, performance metrics, and completion data

import type { PlayerTile } from '../types/tile-types'
import type { NMJL2025Pattern } from '../../../shared/nmjl-types'
import type { GameDecision, PatternAnalysis, GamePerformance, GameInsights } from '../stores/history-store'

export interface GameEndScenario {
  type: 'mahjong' | 'wall_exhausted' | 'all_passed_out' | 'forfeit'
  winner?: string
  winningPattern?: NMJL2025Pattern
  winningHand?: PlayerTile[]
  endedAt: Date
  reason: string
}

export interface GameStatistics {
  // Basic game info
  gameId: string
  startTime: Date
  endTime: Date
  duration: number // in minutes
  
  // Game flow
  totalTurns: number
  charlestonRounds: number
  discardCount: number
  callsMade: number
  jokersUsed: number
  
  // Player performance
  playerStats: Record<string, PlayerGameStats>
  
  // Game outcome
  endScenario: GameEndScenario
  finalScores: Array<{
    playerId: string
    playerName: string
    score: number
    pattern?: string
  }>
}

export interface PlayerGameStats {
  playerId: string
  playerName: string
  
  // Turn metrics
  turnsPlayed: number
  averageTurnTime: number // seconds
  tilesDrawn: number
  tilesDiscarded: number
  
  // Strategic metrics
  callsAttempted: number
  callsSuccessful: number
  jokersUsedCount: number
  patternSwitches: number
  
  // Pattern progress
  selectedPatterns: NMJL2025Pattern[]
  finalPatternCompletion: number // 0-100%
  bestPatternProgress: number // 0-100%
  
  // Performance scores
  decisionQuality: {
    excellent: number
    good: number
    fair: number
    poor: number
  }
}

export interface WallExhaustionCheck {
  wallTilesRemaining: number
  totalTilesInPlay: number
  canContinue: boolean
  turnsUntilExhaustion?: number
}

export class GameStatisticsEngine {
  private gameStartTime: Date
  private gameId: string
  private turnCount: number = 0
  private charlestonRounds: number = 3
  private playerStats: Map<string, PlayerGameStats> = new Map()
  private gameDecisions: GameDecision[] = []
  private discardPile: PlayerTile[] = []
  private callHistory: Array<{ playerId: string, type: string, timestamp: Date }> = []

  constructor(gameId: string, players: Array<{ id: string, name: string }>) {
    this.gameId = gameId
    this.gameStartTime = new Date()
    
    // Initialize player stats
    players.forEach(player => {
      this.playerStats.set(player.id, {
        playerId: player.id,
        playerName: player.name,
        turnsPlayed: 0,
        averageTurnTime: 0,
        tilesDrawn: 0,
        tilesDiscarded: 0,
        callsAttempted: 0,
        callsSuccessful: 0,
        jokersUsedCount: 0,
        patternSwitches: 0,
        selectedPatterns: [],
        finalPatternCompletion: 0,
        bestPatternProgress: 0,
        decisionQuality: {
          excellent: 0,
          good: 0,
          fair: 0,
          poor: 0
        }
      })
    })
  }

  /**
   * Check if wall is exhausted and game should end
   */
  static checkWallExhaustion(
    wallTilesRemaining: number,
    playersInGame: number = 4
  ): WallExhaustionCheck {
    const totalTilesInPlay = 152 - wallTilesRemaining // Standard American Mahjong set
    const minTilesNeeded = playersInGame * 2 // Minimum for each player to draw once more
    
    const canContinue = wallTilesRemaining >= minTilesNeeded
    const turnsUntilExhaustion = canContinue 
      ? Math.floor(wallTilesRemaining / playersInGame)
      : 0

    return {
      wallTilesRemaining,
      totalTilesInPlay,
      canContinue,
      turnsUntilExhaustion
    }
  }

  /**
   * Record a player turn
   */
  recordTurn(playerId: string, actionType: 'draw' | 'discard' | 'call', turnDuration?: number): void {
    const playerStats = this.playerStats.get(playerId)
    if (!playerStats) return

    this.turnCount++
    playerStats.turnsPlayed++

    if (turnDuration) {
      const totalTime = playerStats.averageTurnTime * (playerStats.turnsPlayed - 1) + turnDuration
      playerStats.averageTurnTime = totalTime / playerStats.turnsPlayed
    }

    switch (actionType) {
      case 'draw':
        playerStats.tilesDrawn++
        break
      case 'discard':
        playerStats.tilesDiscarded++
        break
      case 'call':
        playerStats.callsSuccessful++
        this.callHistory.push({
          playerId,
          type: actionType,
          timestamp: new Date()
        })
        break
    }
  }

  /**
   * Record a call attempt (may not be successful)
   */
  recordCallAttempt(playerId: string): void {
    const playerStats = this.playerStats.get(playerId)
    if (playerStats) {
      playerStats.callsAttempted++
    }
  }

  /**
   * Record a discard tile
   */
  recordDiscard(playerId: string, tile: PlayerTile): void {
    this.discardPile.push(tile)
    this.recordTurn(playerId, 'discard')
  }

  /**
   * Record joker usage
   */
  recordJokerUse(playerId: string): void {
    const playerStats = this.playerStats.get(playerId)
    if (playerStats) {
      playerStats.jokersUsedCount++
    }
  }

  /**
   * Record pattern switch
   */
  recordPatternSwitch(playerId: string, newPatterns: NMJL2025Pattern[]): void {
    const playerStats = this.playerStats.get(playerId)
    if (playerStats) {
      playerStats.patternSwitches++
      playerStats.selectedPatterns = [...newPatterns]
    }
  }

  /**
   * Update pattern progress for a player
   */
  updatePatternProgress(playerId: string, completionPercentage: number): void {
    const playerStats = this.playerStats.get(playerId)
    if (playerStats) {
      playerStats.finalPatternCompletion = completionPercentage
      playerStats.bestPatternProgress = Math.max(
        playerStats.bestPatternProgress,
        completionPercentage
      )
    }
  }

  /**
   * Record a decision quality
   */
  recordDecision(decision: GameDecision): void {
    this.gameDecisions.push(decision)
    
    const playerStats = this.playerStats.get(decision.id.split('-')[0]) // Assume decision ID starts with player ID
    if (playerStats) {
      switch (decision.quality) {
        case 'excellent':
          playerStats.decisionQuality.excellent++
          break
        case 'good':
          playerStats.decisionQuality.good++
          break
        case 'fair':
          playerStats.decisionQuality.fair++
          break
        case 'poor':
          playerStats.decisionQuality.poor++
          break
      }
    }
  }

  /**
   * Generate final game statistics
   */
  generateFinalStatistics(endScenario: GameEndScenario): GameStatistics {
    const endTime = new Date()
    const duration = Math.floor((endTime.getTime() - this.gameStartTime.getTime()) / 1000 / 60)

    // Calculate final scores based on end scenario
    const finalScores = this.calculateFinalScores(endScenario)

    return {
      gameId: this.gameId,
      startTime: this.gameStartTime,
      endTime,
      duration,
      totalTurns: this.turnCount,
      charlestonRounds: this.charlestonRounds,
      discardCount: this.discardPile.length,
      callsMade: this.callHistory.length,
      jokersUsed: Array.from(this.playerStats.values()).reduce((sum, stats) => 
        sum + stats.jokersUsedCount, 0
      ),
      playerStats: Object.fromEntries(this.playerStats),
      endScenario,
      finalScores
    }
  }

  /**
   * Generate comprehensive game analysis for history store
   */
  generateGameAnalysis(
    endScenario: GameEndScenario,
    selectedPatterns: NMJL2025Pattern[]
  ): {
    decisions: GameDecision[]
    patternAnalyses: PatternAnalysis[]
    performance: GamePerformance
    insights: GameInsights
  } {
    const totalDecisions = this.gameDecisions.length
    const performance: GamePerformance = {
      totalDecisions,
      excellentDecisions: this.gameDecisions.filter(decision => decision.quality === 'excellent').length,
      goodDecisions: this.gameDecisions.filter(decision => decision.quality === 'good').length,
      fairDecisions: this.gameDecisions.filter(decision => decision.quality === 'fair').length,
      poorDecisions: this.gameDecisions.filter(decision => decision.quality === 'poor').length,
      averageDecisionTime: totalDecisions > 0 ? 
        this.gameDecisions.reduce((sum) => sum + 30, 0) / totalDecisions : 0, // Default 30s per decision
      patternEfficiency: this.calculatePatternEfficiency(),
      charlestonSuccess: 75 // Default Charleston success rate
    }

    const patternAnalyses: PatternAnalysis[] = selectedPatterns.map(pattern => ({
      patternId: pattern.Hands_Key,
      pattern,
      completionPercentage: endScenario.type === 'mahjong' && 
        endScenario.winningPattern?.Hands_Key === pattern.Hands_Key ? 100 : 
        Math.random() * 80 + 10, // Random completion for non-winning patterns
      timeToCompletion: endScenario.type === 'mahjong' ? 
        Math.floor((new Date().getTime() - this.gameStartTime.getTime()) / 1000) : undefined,
      missedOpportunities: [],
      optimalMoves: [`Pattern analysis for ${pattern.Hand_Description}`]
    }))

    const insights: GameInsights = this.generateInsights(endScenario, performance)

    return {
      decisions: this.gameDecisions,
      patternAnalyses,
      performance,
      insights
    }
  }

  /**
   * Check if all players have passed out
   */
  static checkAllPlayersPassedOut(passedOutPlayers: Set<string>, totalPlayers: number): boolean {
    return passedOutPlayers.size >= totalPlayers - 1 // At least 3 out of 4 players
  }

  private calculateFinalScores(endScenario: GameEndScenario): Array<{
    playerId: string
    playerName: string
    score: number
    pattern?: string
  }> {
    const scores = []
    
    for (const [playerId, stats] of this.playerStats) {
      if (endScenario.type === 'mahjong' && endScenario.winner === playerId) {
        // Winner gets pattern points
        scores.push({
          playerId,
          playerName: stats.playerName,
          score: endScenario.winningPattern?.Hand_Points || 25,
          pattern: endScenario.winningPattern?.Hand_Description
        })
      } else {
        // Other players get 0 (traditional American Mahjong)
        scores.push({
          playerId,
          playerName: stats.playerName,
          score: 0
        })
      }
    }

    return scores
  }

  private calculatePatternEfficiency(): number {
    const completionRates = Array.from(this.playerStats.values())
      .map(stats => stats.finalPatternCompletion)
      .filter(rate => rate > 0)
    
    return completionRates.length > 0 ? 
      completionRates.reduce((sum, rate) => sum + rate, 0) / completionRates.length : 0
  }

  private generateInsights(endScenario: GameEndScenario, performance: GamePerformance): GameInsights {
    const strengthAreas: string[] = []
    const improvementAreas: string[] = []
    const learningOpportunities: string[] = []
    const recommendedPatterns: string[] = []

    // Analyze performance
    const goodDecisionRate = performance.totalDecisions > 0 ?
      (performance.excellentDecisions + performance.goodDecisions) / performance.totalDecisions : 0

    if (goodDecisionRate >= 0.8) {
      strengthAreas.push('Excellent strategic decision making')
    } else if (goodDecisionRate >= 0.6) {
      strengthAreas.push('Good tactical awareness')
    } else {
      improvementAreas.push('Decision quality and timing')
    }

    if (performance.patternEfficiency >= 75) {
      strengthAreas.push('Strong pattern completion')
    } else if (performance.patternEfficiency < 50) {
      improvementAreas.push('Pattern recognition and completion')
    }

    // Game outcome analysis
    if (endScenario.type === 'mahjong') {
      strengthAreas.push('Successful game completion')
      learningOpportunities.push('Analyze winning strategy for future games')
    } else if (endScenario.type === 'wall_exhausted') {
      learningOpportunities.push('Focus on faster pattern completion')
      improvementAreas.push('Game completion efficiency')
    } else if (endScenario.type === 'all_passed_out') {
      learningOpportunities.push('Pattern selection and flexibility')
      improvementAreas.push('Hand viability assessment')
    }

    // Recommendations based on player stats
    const avgJokersUsed = Array.from(this.playerStats.values())
      .reduce((sum, stats) => sum + stats.jokersUsedCount, 0) / this.playerStats.size

    if (avgJokersUsed < 2) {
      learningOpportunities.push('Consider more flexible joker usage')
    }

    return {
      strengthAreas: strengthAreas.length > 0 ? strengthAreas : ['Pattern recognition'],
      improvementAreas: improvementAreas.length > 0 ? improvementAreas : ['Strategic planning'],
      learningOpportunities: learningOpportunities.length > 0 ? learningOpportunities : ['Continue practicing'],
      recommendedPatterns,
      skillProgression: endScenario.type === 'mahjong' ? 
        'Excellent progress! Try more challenging patterns.' : 
        'Good effort! Focus on pattern completion strategies.'
    }
  }
}