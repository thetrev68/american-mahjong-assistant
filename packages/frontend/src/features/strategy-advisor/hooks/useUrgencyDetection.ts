// Urgency Detection Hook - Comprehensive urgency calculation with performance optimization
// Provides reactive urgency context for adaptive UI treatments

import { useMemo, useCallback, useRef, useEffect } from 'react'
import { useGameStore } from '../../../stores/useGameStore'
import { useIntelligenceStore } from '../../../stores/useIntelligenceStore'
import { urgencyDetectionService } from '../services/urgency-detection.service'
import { useGamePhaseDetection } from './useGamePhaseDetection'
import type {
  UrgencyLevel,
  UrgencyContext,
  UrgencyFactors,
  UrgencyUITreatment
} from '../types/strategy-advisor.types'
import type { GameStateSnapshot } from '../services/urgency-detection.service'

// Performance tracking for optimization
interface PerformanceMetrics {
  lastCalculationTime: number
  averageCalculationTime: number
  calculationCount: number
}

// Hook configuration options
export interface UrgencyDetectionOptions {
  enablePerformanceOptimization: boolean
  quickCheckInterval: number // ms for quick checks vs full analysis
  smoothingEnabled: boolean // Smooth transitions between urgency levels
  emergencyOverrideEnabled: boolean
}

// Default options
const DEFAULT_OPTIONS: UrgencyDetectionOptions = {
  enablePerformanceOptimization: true,
  quickCheckInterval: 1000, // 1 second
  smoothingEnabled: true,
  emergencyOverrideEnabled: true
}

// Hook return interface
export interface UseUrgencyDetection {
  // Current urgency state
  urgencyContext: UrgencyContext
  urgencyLevel: UrgencyLevel
  urgencyScore: number
  factors: UrgencyFactors
  isEmergencyMode: boolean
  uiTreatment: UrgencyUITreatment

  // Convenience flags
  isLowUrgency: boolean
  isMediumUrgency: boolean
  isHighUrgency: boolean
  isCriticalUrgency: boolean

  // Transition state
  isTransitioning: boolean
  previousUrgencyLevel: UrgencyLevel | null
  transitionDuration: number

  // Performance monitoring
  performanceMetrics: PerformanceMetrics
  isPerformanceOptimized: boolean

  // Manual control
  forceRecalculation: () => void
  getQuickUrgencyCheck: () => { urgencyLevel: UrgencyLevel; isEmergency: boolean }
}

/**
 * Hook for comprehensive urgency detection with performance optimization
 * Automatically adapts calculation frequency based on performance requirements
 */
export const useUrgencyDetection = (options: Partial<UrgencyDetectionOptions> = {}): UseUrgencyDetection => {
  const config = { ...DEFAULT_OPTIONS, ...options }

  // Performance tracking refs
  const performanceMetricsRef = useRef<PerformanceMetrics>({
    lastCalculationTime: 0,
    averageCalculationTime: 0,
    calculationCount: 0
  })
  const lastFullCalculationRef = useRef<number>(0)
  const previousUrgencyLevelRef = useRef<UrgencyLevel | null>(null)
  const transitionStartRef = useRef<number>(0)

  // Subscribe to game state changes
  const currentTurn = useGameStore(state => state.currentTurn)
  const wallTilesRemaining = useGameStore(state => state.wallTilesRemaining)
  const gamePhase = useGameStore(state => state.gamePhase)
  const passedOutPlayers = useGameStore(state => state.passedOutPlayers)
  const players = useGameStore(state => state.players)

  // Subscribe to intelligence state
  const currentAnalysis = useIntelligenceStore(state => state.currentAnalysis)

  // Get phase detection for additional context
  const { phase } = useGamePhaseDetection()

  // Build game state snapshot with performance considerations
  const gameStateSnapshot = useMemo((): GameStateSnapshot => {
    const threats = currentAnalysis?.threats || []
    const overallScore = currentAnalysis?.overallScore || 0

    const highThreat = threats.some(threat => threat.level === 'high')
    const threatsLevel = threats.length > 0
      ? (threats.some(t => t.level === 'high') ? 'high'
        : threats.some(t => t.level === 'medium') ? 'medium'
        : 'low')
      : undefined

    return {
      currentTurn,
      wallTilesRemaining,
      gamePhase,
      passedOutPlayers,
      totalPlayers: players.length || 4,
      handCompletionPercentage: overallScore / 100,
      hasDefensiveThreat: highThreat,
      threatsLevel
    }
  }, [
    currentTurn,
    wallTilesRemaining,
    gamePhase,
    passedOutPlayers,
    players.length,
    currentAnalysis?.threats,
    currentAnalysis?.overallScore
  ])

  // Performance-optimized urgency calculation
  const calculateUrgencyWithPerformance = useCallback((): UrgencyContext => {
    const startTime = performance.now()

    let urgencyContext: UrgencyContext

    // Decide between quick check and full analysis based on performance requirements
    const timeSinceLastFull = Date.now() - lastFullCalculationRef.current
    const shouldUseQuickCheck = config.enablePerformanceOptimization &&
      timeSinceLastFull < config.quickCheckInterval &&
      performanceMetricsRef.current.averageCalculationTime > 30 // ms

    if (shouldUseQuickCheck && performanceMetricsRef.current.calculationCount > 5) {
      // Use quick check for frequent updates
      const quickResult = urgencyDetectionService.quickUrgencyCheck(gameStateSnapshot)

      // Create minimal urgency context for quick checks
      urgencyContext = {
        gamePhase: phase.currentPhase,
        urgencyLevel: quickResult.urgencyLevel,
        urgencyScore: quickResult.urgencyLevel === 'critical' ? 85 :
                     quickResult.urgencyLevel === 'high' ? 65 :
                     quickResult.urgencyLevel === 'medium' ? 45 : 25,
        factors: {
          turnPressure: Math.min(currentTurn / 20, 1),
          wallPressure: Math.max(0, (150 - wallTilesRemaining) / 150),
          opponentThreat: gameStateSnapshot.hasDefensiveThreat ? 0.8 : 0.2,
          handCompletion: gameStateSnapshot.handCompletionPercentage || 0,
          timeRemaining: 1.0
        },
        isEmergencyMode: quickResult.isEmergency,
        recommendedUITreatment: getBasicUITreatment(quickResult.urgencyLevel, quickResult.isEmergency)
      }
    } else {
      // Full analysis
      urgencyContext = urgencyDetectionService.calculateUrgencyContext(gameStateSnapshot)
      lastFullCalculationRef.current = Date.now()
    }

    // Update performance metrics
    const calculationTime = performance.now() - startTime
    const metrics = performanceMetricsRef.current
    metrics.lastCalculationTime = calculationTime
    metrics.calculationCount += 1
    metrics.averageCalculationTime = (
      (metrics.averageCalculationTime * (metrics.calculationCount - 1)) + calculationTime
    ) / metrics.calculationCount

    return urgencyContext
  }, [gameStateSnapshot, phase.currentPhase, currentTurn, wallTilesRemaining, config.enablePerformanceOptimization, config.quickCheckInterval])

  // Memoized urgency context with smoothing
  const urgencyContext = useMemo((): UrgencyContext => {
    const newContext = calculateUrgencyWithPerformance()

    // Handle urgency level transitions with smoothing
    if (config.smoothingEnabled && previousUrgencyLevelRef.current !== null) {
      const previousLevel = previousUrgencyLevelRef.current
      const newLevel = newContext.urgencyLevel

      if (previousLevel !== newLevel) {
        // Start transition tracking
        transitionStartRef.current = Date.now()
      }
    }

    previousUrgencyLevelRef.current = newContext.urgencyLevel
    return newContext
  }, [calculateUrgencyWithPerformance, config.smoothingEnabled])

  // Emergency override handling
  useEffect(() => {
    if (config.emergencyOverrideEnabled && urgencyContext.isEmergencyMode) {
      // Could trigger haptic feedback, audio alerts, etc.
      console.log('🚨 Emergency mode activated - opponent threat detected')
    }
  }, [urgencyContext.isEmergencyMode, config.emergencyOverrideEnabled])

  // Memoized convenience flags
  const urgencyFlags = useMemo(() => ({
    isLowUrgency: urgencyContext.urgencyLevel === 'low',
    isMediumUrgency: urgencyContext.urgencyLevel === 'medium',
    isHighUrgency: urgencyContext.urgencyLevel === 'high',
    isCriticalUrgency: urgencyContext.urgencyLevel === 'critical'
  }), [urgencyContext.urgencyLevel])

  // Transition state calculation
  const transitionState = useMemo(() => {
    const now = Date.now()
    const transitionDuration = now - transitionStartRef.current
    const isTransitioning = transitionDuration < 500 // 500ms transition window

    return {
      isTransitioning,
      previousUrgencyLevel: previousUrgencyLevelRef.current,
      transitionDuration
    }
  }, []) // No dependencies needed - only uses refs and Date.now()

  // Manual recalculation function
  const forceRecalculation = useCallback(() => {
    lastFullCalculationRef.current = 0 // Force full calculation
    // Trigger re-render by updating calculation count
    performanceMetricsRef.current.calculationCount += 1
  }, [])

  // Quick urgency check function
  const getQuickUrgencyCheck = useCallback(() => {
    return urgencyDetectionService.quickUrgencyCheck(gameStateSnapshot)
  }, [gameStateSnapshot])

  // Performance monitoring
  const performanceMetrics = performanceMetricsRef.current
  const isPerformanceOptimized = performanceMetrics.averageCalculationTime < 50 // Target under 50ms

  return {
    // Current urgency state
    urgencyContext,
    urgencyLevel: urgencyContext.urgencyLevel,
    urgencyScore: urgencyContext.urgencyScore,
    factors: urgencyContext.factors,
    isEmergencyMode: urgencyContext.isEmergencyMode,
    uiTreatment: urgencyContext.recommendedUITreatment,

    // Convenience flags
    ...urgencyFlags,

    // Transition state
    ...transitionState,

    // Performance monitoring
    performanceMetrics: { ...performanceMetrics },
    isPerformanceOptimized,

    // Manual control
    forceRecalculation,
    getQuickUrgencyCheck
  }
}

/**
 * Get basic UI treatment for quick checks (simplified version)
 */
function getBasicUITreatment(urgencyLevel: UrgencyLevel, isEmergency: boolean): UrgencyUITreatment {
  if (isEmergency) {
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
        informationDensity: 'essential',
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

// Export types for external use
export type { PerformanceMetrics }

