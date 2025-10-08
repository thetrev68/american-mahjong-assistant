// Game Phase Detection Hook - Monitors game state for turn-based phase analysis
// Provides reactive game phase detection with performance optimization

import { useMemo } from 'react'
import { useGameStore } from '../../../stores/useGameStore'
import { useIntelligenceStore } from '../../../stores/useIntelligenceStore'
import { urgencyDetectionService } from '../services/urgency-detection.service'
import type { GamePhase } from '../types/strategy-advisor.types'
import type { GameStateSnapshot } from '../services/urgency-detection.service'

// Game phase analysis result
export interface GamePhaseAnalysis {
  currentPhase: GamePhase
  turnNumber: number
  wallTilesRemaining: number
  isTransitioning: boolean
  phaseProgress: number // 0-1 progress within current phase
  nextPhaseThreshold: number
  phaseDescription: string
  strategicContext: string[]
}

// Hook return interface
export interface UseGamePhaseDetection {
  phase: GamePhaseAnalysis
  isEarlyGame: boolean
  isMidGame: boolean
  isLateGame: boolean
  isDefensive: boolean
  isEndgame: boolean
  getPhaseRecommendations: () => string[]
}

/**
 * Hook for reactive game phase detection and analysis
 * Optimized for performance with memoization and selective subscriptions
 */
export const useGamePhaseDetection = (): UseGamePhaseDetection => {
  // Subscribe to relevant game state only
  const currentTurn = useGameStore(state => state.currentTurn)
  const wallTilesRemaining = useGameStore(state => state.wallTilesRemaining)
  const gamePhase = useGameStore(state => state.gamePhase)
  const passedOutPlayers = useGameStore(state => state.passedOutPlayers)
  const players = useGameStore(state => state.players)

  // Subscribe to intelligence state for threat analysis
  const currentAnalysis = useIntelligenceStore(state => state.currentAnalysis)
  const overallScore = currentAnalysis?.overallScore || 0

  // Stable threat analysis - threats array calculated inside to prevent re-renders
  const threatAnalysis = useMemo(() => {
    const threats = currentAnalysis?.threats || []
    const hasHighThreat = threats.some(threat => threat.level === 'high')
    const hasAnyThreats = threats.length > 0
    const threatsLevel = hasAnyThreats
      ? (threats.some(t => t.level === 'high') ? 'high'
        : threats.some(t => t.level === 'medium') ? 'medium'
        : 'low')
      : undefined

    return {
      hasHighThreat,
      threatsLevel,
      threatCount: threats.length
    }
  }, [currentAnalysis?.threats])

  // Memoized game state snapshot for urgency detection
  const gameStateSnapshot = useMemo((): GameStateSnapshot => {
    return {
      currentTurn,
      wallTilesRemaining,
      gamePhase,
      passedOutPlayers,
      totalPlayers: players.length || 4,
      handCompletionPercentage: overallScore / 100,
      hasDefensiveThreat: threatAnalysis.hasHighThreat,
      threatsLevel: threatAnalysis.threatsLevel
    }
  }, [currentTurn, wallTilesRemaining, gamePhase, passedOutPlayers, players.length, overallScore, threatAnalysis])

  // Memoized phase analysis
  const phaseAnalysis = useMemo((): GamePhaseAnalysis => {
    const detectedPhase = urgencyDetectionService.detectGamePhase(gameStateSnapshot)

    // Calculate phase progress and thresholds
    const { progress, threshold, isTransitioning } = calculatePhaseProgress(currentTurn, detectedPhase)

    return {
      currentPhase: detectedPhase,
      turnNumber: currentTurn,
      wallTilesRemaining,
      isTransitioning,
      phaseProgress: progress,
      nextPhaseThreshold: threshold,
      phaseDescription: getPhaseDescription(detectedPhase, currentTurn, wallTilesRemaining),
      strategicContext: getStrategicContext(detectedPhase, gameStateSnapshot)
    }
  }, [gameStateSnapshot, currentTurn, wallTilesRemaining])

  // Memoized convenience flags
  const phaseFlags = useMemo(() => ({
    isEarlyGame: phaseAnalysis.currentPhase === 'early',
    isMidGame: phaseAnalysis.currentPhase === 'mid',
    isLateGame: phaseAnalysis.currentPhase === 'late',
    isDefensive: phaseAnalysis.currentPhase === 'defensive',
    isEndgame: phaseAnalysis.currentPhase === 'endgame'
  }), [phaseAnalysis.currentPhase])

  // Memoized recommendations function
  const getPhaseRecommendations = useMemo(() => () => {
    return generatePhaseRecommendations(phaseAnalysis.currentPhase, gameStateSnapshot)
  }, [phaseAnalysis.currentPhase, gameStateSnapshot])

  return {
    phase: phaseAnalysis,
    ...phaseFlags,
    getPhaseRecommendations
  }
}

/**
 * Calculate progress within current phase and transition indicators
 */
function calculatePhaseProgress(currentTurn: number, phase: GamePhase): {
  progress: number
  threshold: number
  isTransitioning: boolean
} {
  switch (phase) {
    case 'early': {
      const earlyProgress = Math.min(currentTurn / 8, 1)
      return {
        progress: earlyProgress,
        threshold: 8,
        isTransitioning: earlyProgress > 0.8
      }
    }

    case 'mid': {
      const midProgress = Math.max(0, Math.min((currentTurn - 8) / 8, 1))
      return {
        progress: midProgress,
        threshold: 16,
        isTransitioning: midProgress > 0.8
      }
    }

    case 'late': {
      const lateProgress = Math.max(0, Math.min((currentTurn - 16) / 8, 1))
      return {
        progress: lateProgress,
        threshold: 24,
        isTransitioning: lateProgress > 0.8
      }
    }

    case 'defensive':
    case 'endgame':
      return {
        progress: 1.0,
        threshold: currentTurn,
        isTransitioning: false
      }

    default:
      return {
        progress: 0,
        threshold: 1,
        isTransitioning: false
      }
  }
}

/**
 * Generate human-readable phase description
 */
function getPhaseDescription(phase: GamePhase, turn: number, wallTiles: number): string {
  switch (phase) {
    case 'early':
      return `Early game (Turn ${turn}/8) - Pattern exploration and tile gathering`

    case 'mid':
      return `Mid game (Turn ${turn}/16) - Pattern commitment and strategic decisions`

    case 'late':
      return `Late game (Turn ${turn}+) - Pattern completion and risk management`

    case 'defensive':
      return `Defensive mode - Opponent threat detected, prioritizing blocking`

    case 'endgame':
      return `Endgame - Final turns with limited options (${wallTiles} tiles left)`

    default:
      return `Unknown phase (Turn ${turn})`
  }
}

/**
 * Generate strategic context based on phase and game state
 */
function getStrategicContext(phase: GamePhase, gameState: GameStateSnapshot): string[] {
  const context: string[] = []

  switch (phase) {
    case 'early':
      context.push('Focus on identifying strong patterns')
      context.push('Collect tiles for multiple pattern options')
      if (gameState.handCompletionPercentage && gameState.handCompletionPercentage > 0.3) {
        context.push('Strong early progress detected')
      }
      break

    case 'mid':
      context.push('Commit to your strongest pattern')
      context.push('Begin discarding non-essential tiles')
      if (gameState.wallTilesRemaining < 80) {
        context.push('Wall getting lower - increase urgency')
      }
      break

    case 'late':
      context.push('Focus on pattern completion')
      context.push('Consider defensive discards')
      if (gameState.wallTilesRemaining < 40) {
        context.push('Limited time remaining')
      }
      break

    case 'defensive':
      context.push('DEFENSIVE MODE ACTIVE')
      context.push('Prioritize blocking opponent wins')
      context.push('Safe discards only')
      break

    case 'endgame':
      context.push('Final opportunity window')
      context.push('High-risk, high-reward decisions')
      if (gameState.passedOutPlayers.size > 1) {
        context.push('Multiple players eliminated')
      }
      break
  }

  // Add turn-specific context
  if (gameState.currentTurn > 20) {
    context.push('Very late in the game')
  }

  if (gameState.wallTilesRemaining < 20) {
    context.push('Wall nearly exhausted')
  }

  return context
}

/**
 * Generate phase-specific strategic recommendations
 */
function generatePhaseRecommendations(phase: GamePhase, gameState: GameStateSnapshot): string[] {
  const recommendations: string[] = []

  switch (phase) {
    case 'early':
      recommendations.push('Keep multiple pattern options open')
      recommendations.push('Prioritize jokers and versatile tiles')
      recommendations.push('Observe opponent discards for information')
      break

    case 'mid':
      recommendations.push('Choose your primary pattern now')
      recommendations.push('Start discarding off-pattern tiles')
      recommendations.push('Watch for calling opportunities')
      break

    case 'late':
      recommendations.push('Focus solely on completion')
      recommendations.push('Consider risky but necessary calls')
      recommendations.push('Prepare defensive discards')
      break

    case 'defensive':
      recommendations.push('Block dangerous tiles immediately')
      recommendations.push('Abandon completion if necessary')
      recommendations.push('Force opponents to redraw')
      break

    case 'endgame':
      recommendations.push('Take calculated risks for completion')
      recommendations.push('Consider Mahjong calls even with low points')
      recommendations.push('Prevent wall exhaustion scenarios')
      break
  }

  // Add context-specific recommendations
  if (gameState.handCompletionPercentage && gameState.handCompletionPercentage > 0.8) {
    recommendations.push('You are very close to completion')
  }

  if (gameState.wallTilesRemaining < 30 && phase !== 'defensive') {
    recommendations.push('Time pressure is increasing')
  }

  return recommendations
}

// Export types for external use
export type { GamePhaseAnalysis }

