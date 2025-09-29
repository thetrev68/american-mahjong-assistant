// Urgency Detection Service - Analyzes game state to determine decision pressure
// Calculates context-aware urgency for adaptive UI treatments

import type {
  UrgencyLevel,
  GamePhase,
  UrgencyFactors,
  UrgencyContext,
  UrgencyUITreatment
} from '../types/strategy-advisor.types'

// Game state data interface (read-only from stores)
export interface GameStateSnapshot {
  currentTurn: number
  wallTilesRemaining: number
  gamePhase: 'lobby' | 'tile-input' | 'charleston' | 'playing' | 'finished'
  passedOutPlayers: Set<string>
  totalPlayers: number
  handCompletionPercentage?: number
  hasDefensiveThreat?: boolean
  threatsLevel?: 'low' | 'medium' | 'high'
}

// Constants for urgency calculation
const URGENCY_THRESHOLDS = {
  EARLY_GAME_TURNS: 8,
  MID_GAME_TURNS: 16,
  LOW_WALL_THRESHOLD: 30,
  CRITICAL_WALL_THRESHOLD: 15,
  HIGH_COMPLETION_THRESHOLD: 0.8,
  EMERGENCY_THREAT_THRESHOLD: 0.9
} as const

const URGENCY_WEIGHTS = {
  TURN_PRESSURE: 0.35,
  WALL_PRESSURE: 0.25,
  OPPONENT_THREAT: 0.25,
  HAND_COMPLETION: 0.15
} as const

class UrgencyDetectionService {
  /**
   * Main entry point: Calculate comprehensive urgency context
   */
  calculateUrgencyContext(gameState: GameStateSnapshot): UrgencyContext {
    const gamePhase = this.detectGamePhase(gameState)
    const urgencyFactors = this.calculateUrgencyFactors(gameState)
    const urgencyScore = this.calculateUrgencyScore(urgencyFactors)
    const urgencyLevel = this.determineUrgencyLevel(urgencyScore, gamePhase)
    const isEmergencyMode = this.isEmergencyMode(gameState, urgencyFactors)
    const recommendedUITreatment = this.getUITreatment(urgencyLevel, isEmergencyMode, gamePhase)

    return {
      gamePhase,
      urgencyLevel,
      urgencyScore,
      factors: urgencyFactors,
      isEmergencyMode,
      recommendedUITreatment
    }
  }

  /**
   * Detect current game phase based on turn progression
   */
  detectGamePhase(gameState: GameStateSnapshot): GamePhase {
    const { currentTurn, passedOutPlayers, totalPlayers, hasDefensiveThreat } = gameState

    // Emergency defensive phase - overrides all others
    if (hasDefensiveThreat && gameState.threatsLevel === 'high') {
      return 'defensive'
    }

    // Endgame phase - multiple players passed out or very late game
    if (passedOutPlayers.size >= Math.max(1, totalPlayers - 1) || currentTurn > 24) {
      return 'endgame'
    }

    // Standard phase detection based on turns
    if (currentTurn <= URGENCY_THRESHOLDS.EARLY_GAME_TURNS) {
      return 'early'
    } else if (currentTurn <= URGENCY_THRESHOLDS.MID_GAME_TURNS) {
      return 'mid'
    } else {
      return 'late'
    }
  }

  /**
   * Calculate individual urgency factors (0-1 scale)
   */
  private calculateUrgencyFactors(gameState: GameStateSnapshot): UrgencyFactors {
    return {
      turnPressure: this.calculateTurnPressure(gameState.currentTurn),
      wallPressure: this.calculateWallPressure(gameState.wallTilesRemaining),
      opponentThreat: this.calculateOpponentThreat(gameState),
      handCompletion: this.calculateHandCompletionPressure(gameState.handCompletionPercentage || 0),
      timeRemaining: 1.0 // Future enhancement for timed games
    }
  }

  /**
   * Calculate turn-based pressure (0-1)
   */
  private calculateTurnPressure(currentTurn: number): number {
    // Exponential pressure increase after turn 8
    if (currentTurn <= URGENCY_THRESHOLDS.EARLY_GAME_TURNS) {
      return Math.min(currentTurn / URGENCY_THRESHOLDS.EARLY_GAME_TURNS * 0.3, 0.3)
    }

    // Accelerating pressure in mid to late game
    const beyondEarly = currentTurn - URGENCY_THRESHOLDS.EARLY_GAME_TURNS
    const midGameRange = URGENCY_THRESHOLDS.MID_GAME_TURNS - URGENCY_THRESHOLDS.EARLY_GAME_TURNS

    if (currentTurn <= URGENCY_THRESHOLDS.MID_GAME_TURNS) {
      return 0.3 + (beyondEarly / midGameRange) * 0.4 // 0.3 to 0.7
    }

    // Late game exponential pressure
    const lateGameTurns = currentTurn - URGENCY_THRESHOLDS.MID_GAME_TURNS
    return Math.min(0.7 + Math.pow(lateGameTurns / 8, 1.5) * 0.3, 1.0)
  }

  /**
   * Calculate wall tile pressure (0-1)
   */
  private calculateWallPressure(wallTilesRemaining: number): number {
    if (wallTilesRemaining > URGENCY_THRESHOLDS.LOW_WALL_THRESHOLD) {
      return 0.1
    }

    if (wallTilesRemaining <= URGENCY_THRESHOLDS.CRITICAL_WALL_THRESHOLD) {
      return 1.0
    }

    // Linear interpolation between thresholds
    const range = URGENCY_THRESHOLDS.LOW_WALL_THRESHOLD - URGENCY_THRESHOLDS.CRITICAL_WALL_THRESHOLD
    const position = URGENCY_THRESHOLDS.LOW_WALL_THRESHOLD - wallTilesRemaining
    return 0.1 + (position / range) * 0.9
  }

  /**
   * Calculate opponent threat pressure (0-1)
   */
  private calculateOpponentThreat(gameState: GameStateSnapshot): number {
    const { hasDefensiveThreat, threatsLevel, passedOutPlayers, totalPlayers } = gameState

    if (!hasDefensiveThreat) {
      return 0.1
    }

    // Base threat level
    let threatScore = 0.3
    switch (threatsLevel) {
      case 'high':
        threatScore = 0.9
        break
      case 'medium':
        threatScore = 0.6
        break
      case 'low':
        threatScore = 0.3
        break
    }

    // Increase pressure if multiple players still active
    const activePlayers = totalPlayers - passedOutPlayers.size
    if (activePlayers > 2) {
      threatScore = Math.min(threatScore * 1.2, 1.0)
    }

    return threatScore
  }

  /**
   * Calculate hand completion pressure (0-1)
   */
  private calculateHandCompletionPressure(completionPercentage: number): number {
    // Higher completion = higher urgency to finish
    if (completionPercentage >= URGENCY_THRESHOLDS.HIGH_COMPLETION_THRESHOLD) {
      return 0.8 + (completionPercentage - URGENCY_THRESHOLDS.HIGH_COMPLETION_THRESHOLD) * 1.0
    }

    // Moderate completion = moderate urgency
    if (completionPercentage >= 0.5) {
      return 0.3 + (completionPercentage - 0.5) * 1.0
    }

    // Low completion = low urgency
    return completionPercentage * 0.6
  }

  /**
   * Calculate weighted urgency score (0-100)
   */
  private calculateUrgencyScore(factors: UrgencyFactors): number {
    const weightedScore =
      factors.turnPressure * URGENCY_WEIGHTS.TURN_PRESSURE +
      factors.wallPressure * URGENCY_WEIGHTS.WALL_PRESSURE +
      factors.opponentThreat * URGENCY_WEIGHTS.OPPONENT_THREAT +
      factors.handCompletion * URGENCY_WEIGHTS.HAND_COMPLETION

    return Math.round(weightedScore * 100)
  }

  /**
   * Determine urgency level from score and context
   */
  private determineUrgencyLevel(urgencyScore: number, gamePhase: GamePhase): UrgencyLevel {
    // Emergency situations override normal thresholds
    if (gamePhase === 'defensive') {
      return 'critical'
    }

    if (gamePhase === 'endgame' && urgencyScore >= 60) {
      return 'critical'
    }

    // Standard thresholds
    if (urgencyScore >= 80) return 'critical'
    if (urgencyScore >= 60) return 'high'
    if (urgencyScore >= 35) return 'medium'
    return 'low'
  }

  /**
   * Check if emergency mode should be activated
   */
  private isEmergencyMode(gameState: GameStateSnapshot, factors: UrgencyFactors): boolean {
    // Emergency conditions:
    // 1. High defensive threat with opponent close to winning
    // 2. Critical wall situation with high completion pressure
    // 3. Endgame with multiple threat factors

    if (gameState.hasDefensiveThreat && factors.opponentThreat >= URGENCY_THRESHOLDS.EMERGENCY_THREAT_THRESHOLD) {
      return true
    }

    if (factors.wallPressure >= 0.9 && factors.handCompletion >= 0.7) {
      return true
    }

    if (gameState.currentTurn > 20 && factors.turnPressure >= 0.8 && factors.opponentThreat >= 0.7) {
      return true
    }

    return false
  }

  /**
   * Get recommended UI treatment based on urgency context
   */
  private getUITreatment(urgencyLevel: UrgencyLevel, isEmergencyMode: boolean, gamePhase: GamePhase): UrgencyUITreatment {
    if (isEmergencyMode) {
      return {
        colorScheme: 'emergency',
        informationDensity: 'minimal',
        animationIntensity: 'pronounced',
        messageFiltering: 'critical-only',
        visualEmphasis: 'alert'
      }
    }

    switch (urgencyLevel) {
      case 'critical':
        return {
          colorScheme: 'urgent',
          informationDensity: gamePhase === 'late' ? 'essential' : 'minimal',
          animationIntensity: 'pronounced',
          messageFiltering: 'critical-only',
          visualEmphasis: 'alert'
        }

      case 'high':
        return {
          colorScheme: 'urgent',
          informationDensity: 'essential',
          animationIntensity: 'moderate',
          messageFiltering: 'prioritized',
          visualEmphasis: 'prominent'
        }

      case 'medium':
        return {
          colorScheme: 'moderate',
          informationDensity: 'full',
          animationIntensity: 'moderate',
          messageFiltering: 'prioritized',
          visualEmphasis: 'bold'
        }

      case 'low':
      default:
        return {
          colorScheme: 'calm',
          informationDensity: 'full',
          animationIntensity: 'subtle',
          messageFiltering: 'all',
          visualEmphasis: 'normal'
        }
    }
  }

  /**
   * Performance-optimized urgency check (< 50ms requirement)
   * Simplified calculation for frequent updates
   */
  quickUrgencyCheck(gameState: GameStateSnapshot): { urgencyLevel: UrgencyLevel; isEmergency: boolean } {
    const turnPressure = this.calculateTurnPressure(gameState.currentTurn)
    const wallPressure = this.calculateWallPressure(gameState.wallTilesRemaining)
    const threatLevel = gameState.hasDefensiveThreat && gameState.threatsLevel === 'high' ? 0.9 : 0.1

    const quickScore = (turnPressure * 0.4 + wallPressure * 0.3 + threatLevel * 0.3) * 100

    const isEmergency = threatLevel >= 0.9 || (wallPressure >= 0.9 && quickScore >= 70)

    let urgencyLevel: UrgencyLevel = 'low'
    if (isEmergency || quickScore >= 80) urgencyLevel = 'critical'
    else if (quickScore >= 60) urgencyLevel = 'high'
    else if (quickScore >= 35) urgencyLevel = 'medium'

    return { urgencyLevel, isEmergency }
  }
}

// Export singleton instance
export const urgencyDetectionService = new UrgencyDetectionService()

// Export type for testing
export type { UrgencyDetectionService }