// Pattern Switching Hook - Smart pattern switching with preview and impact analysis
// Provides seamless pattern transitions with "what happens if I switch?" preview

import { useState, useCallback, useRef, useMemo } from 'react'
import { usePatternStore } from '../../../stores/pattern-store'
import { useIntelligenceStore } from '../../../stores/useIntelligenceStore'
import type {
  UsePatternSwitching,
  PatternSwitchPreview,
  ActionPatternData,
  PatternPriority
} from '../types/strategy-advisor.types'
import { patternPrioritizerService } from '../services/pattern-prioritizer.service'
import { useHapticFeedback } from './useHapticFeedback'
import { useUrgencyDetection } from './useUrgencyDetection'

interface UsePatternSwitchingOptions {
  availablePatterns: ActionPatternData[]
  enableHapticFeedback?: boolean
  onSwitchComplete?: (newPatternId: string) => void
  onSwitchError?: (error: string) => void
}

/**
 * Hook for intelligent pattern switching with impact analysis
 * Provides preview functionality and seamless transitions
 */
export const usePatternSwitching = ({
  availablePatterns,
  enableHapticFeedback = true,
  onSwitchComplete,
  onSwitchError
}: UsePatternSwitchingOptions): UsePatternSwitching => {
  // Store access
  const {
    selectedPatternId,
    selectPattern,
    addTargetPattern
  } = usePatternStore()

  const { currentAnalysis } = useIntelligenceStore()

  // State
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<PatternSwitchPreview | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  // Performance optimization - cache preview calculations
  const previewCacheRef = useRef<Map<string, PatternSwitchPreview>>(new Map())
  const lastAnalysisTimestampRef = useRef<number>(0)

  // Haptic feedback and urgency context
  const {
    triggerSuccessFeedback,
    triggerErrorFeedback,
    triggerWarningFeedback
  } = useHapticFeedback()

  const { urgencyLevel, factors } = useUrgencyDetection()

  // Get current pattern data
  const currentPattern = useMemo(() => {
    if (!selectedPatternId) return null
    return availablePatterns.find(p => p.id === selectedPatternId) || null
  }, [selectedPatternId, availablePatterns])

  // Clear cache when analysis updates
  const currentAnalysisTimestamp = currentAnalysis?.lastUpdated || 0
  if (currentAnalysisTimestamp !== lastAnalysisTimestampRef.current) {
    previewCacheRef.current.clear()
    lastAnalysisTimestampRef.current = currentAnalysisTimestamp
  }

  // Check if pattern switch is feasible - defined before switchToPattern to avoid circular dependency
  const canSwitchToPattern = useCallback((patternId: string): boolean => {
    const targetPattern = availablePatterns.find(p => p.id === patternId)
    if (!targetPattern) return false

    // Don't allow switching to dead patterns in high urgency
    if (urgencyLevel === 'critical' && targetPattern.priorityInfo.priority === 'dead') {
      return false
    }

    // Don't allow switching to very risky patterns in emergency
    if (urgencyLevel === 'critical' && targetPattern.priorityInfo.priority === 'risky') {
      return false
    }

    // Allow all other switches
    return true
  }, [availablePatterns, urgencyLevel])

  // Core pattern switching logic
  const switchToPattern = useCallback(async (patternId: string): Promise<void> => {
    if (isLoading || patternId === selectedPatternId) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const targetPattern = availablePatterns.find(p => p.id === patternId)
      if (!targetPattern) {
        throw new Error(`Pattern ${patternId} not found`)
      }

      // Validate switch feasibility
      const canSwitch = canSwitchToPattern(patternId)
      if (!canSwitch) {
        throw new Error('Pattern switch not recommended in current game state')
      }

      // Update pattern store
      selectPattern(patternId)
      addTargetPattern(patternId)

      // Haptic feedback based on pattern priority
      if (enableHapticFeedback) {
        const priority = targetPattern.priorityInfo.priority
        switch (priority) {
          case 'pursue':
            triggerSuccessFeedback()
            break
          case 'backup':
            triggerWarningFeedback()
            break
          case 'risky':
          case 'dead':
            triggerErrorFeedback()
            break
        }
      }

      // Close preview if open
      setIsPreviewOpen(false)
      setPreviewData(null)

      onSwitchComplete?.(patternId)

    } catch (switchError) {
      const errorMessage = switchError instanceof Error ? switchError.message : 'Pattern switch failed'
      setError(errorMessage)

      if (enableHapticFeedback) {
        triggerErrorFeedback()
      }

      onSwitchError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [
    isLoading,
    selectedPatternId,
    availablePatterns,
    canSwitchToPattern,
    selectPattern,
    addTargetPattern,
    enableHapticFeedback,
    triggerSuccessFeedback,
    triggerWarningFeedback,
    triggerErrorFeedback,
    onSwitchComplete,
    onSwitchError
  ])

  // Generate preview for pattern switch impact
  const generatePreview = useCallback(async (targetPatternId: string): Promise<PatternSwitchPreview> => {
    // Check cache first
    const cacheKey = `${selectedPatternId}-${targetPatternId}-${currentAnalysisTimestamp}`
    const cached = previewCacheRef.current.get(cacheKey)
    if (cached) {
      return cached
    }

    const fromPattern = currentPattern
    const toPattern = availablePatterns.find(p => p.id === targetPatternId)

    if (!fromPattern || !toPattern) {
      throw new Error('Invalid pattern for preview')
    }

    // Calculate impact analysis
    const impactAnalysis = calculateSwitchImpact(fromPattern, toPattern)

    // Get recommendation from prioritizer service
    const recommendation = patternPrioritizerService.getPatternSwitchRecommendation(
      fromPattern,
      toPattern,
      {
        urgencyLevel,
        wallTilesRemaining: factors.wallPressure * 150, // Convert back to tile count
        opponentThreat: factors.opponentThreat > 0.5,
        turnsRemaining: Math.max(1, Math.floor((1 - factors.turnPressure) * 20)),
        gamePhase: urgencyLevel === 'critical' ? 'endgame' :
                  urgencyLevel === 'high' ? 'late' :
                  urgencyLevel === 'medium' ? 'mid' : 'early'
      }
    )

    // Generate reasoning
    const reasoning = generateSwitchReasoning(fromPattern, toPattern, impactAnalysis, recommendation)

    const preview: PatternSwitchPreview = {
      fromPattern: {
        id: fromPattern.id,
        name: fromPattern.name,
        priority: fromPattern.priorityInfo.priority,
        completionPercentage: fromPattern.priorityInfo.completionPercentage
      },
      toPattern: {
        id: toPattern.id,
        name: toPattern.name,
        priority: toPattern.priorityInfo.priority,
        expectedCompletion: toPattern.priorityInfo.completionPercentage
      },
      impactAnalysis,
      recommendation,
      reasoning
    }

    // Cache the result
    previewCacheRef.current.set(cacheKey, preview)

    return preview
  }, [selectedPatternId, currentPattern, availablePatterns, currentAnalysisTimestamp, urgencyLevel, factors])

  // Open preview modal
  const openPreview = useCallback(async (patternId: string) => {
    if (patternId === selectedPatternId) {
      return // No preview for current pattern
    }

    try {
      setIsLoading(true)
      const preview = await generatePreview(patternId)
      setPreviewData(preview)
      setIsPreviewOpen(true)
    } catch (previewError) {
      const errorMessage = previewError instanceof Error ? previewError.message : 'Preview generation failed'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [selectedPatternId, generatePreview])

  // Close preview modal
  const closePreview = useCallback(() => {
    setIsPreviewOpen(false)
    setPreviewData(null)
  }, [])

  // Confirm switch from preview
  const confirmSwitch = useCallback(async (): Promise<void> => {
    if (!previewData) {
      throw new Error('No preview data available')
    }

    await switchToPattern(previewData.toPattern.id)
  }, [previewData, switchToPattern])

  // Get best pattern recommendation
  const getBestPatternRecommendation = useCallback((): string | null => {
    if (availablePatterns.length === 0) return null

    // Filter patterns based on urgency
    const viablePatterns = availablePatterns.filter(p => canSwitchToPattern(p.id))

    if (viablePatterns.length === 0) return null

    // Sort by priority and completion
    const sorted = viablePatterns.sort((a, b) => {
      const priorityOrder = { pursue: 3, backup: 2, risky: 1, dead: 0 }
      const aPriority = priorityOrder[a.priorityInfo.priority]
      const bPriority = priorityOrder[b.priorityInfo.priority]

      if (aPriority !== bPriority) {
        return bPriority - aPriority
      }

      return b.priorityInfo.completionPercentage - a.priorityInfo.completionPercentage
    })

    return sorted[0]?.id || null
  }, [availablePatterns, canSwitchToPattern])

  return {
    // Current state
    currentPatternId: selectedPatternId,
    isLoading,
    error,

    // Preview state
    previewData,
    isPreviewOpen,

    // Actions
    switchToPattern,
    generatePreview,
    openPreview,
    closePreview,
    confirmSwitch,

    // Quick actions
    canSwitchToPattern,
    getBestPatternRecommendation
  }
}

// Helper functions

function calculateSwitchImpact(
  fromPattern: ActionPatternData,
  toPattern: ActionPatternData
) {
  const fromCompletion = fromPattern.priorityInfo.completionPercentage
  const toCompletion = toPattern.priorityInfo.completionPercentage

  return {
    probabilityChange: toCompletion - fromCompletion,
    riskChange: calculateRiskChange(fromPattern.priorityInfo.priority, toPattern.priorityInfo.priority),
    tilesNeededChange: toPattern.tilesNeeded.length - fromPattern.tilesNeeded.length,
    timeToCompletionChange: toPattern.estimatedTurns - fromPattern.estimatedTurns
  }
}

function calculateRiskChange(fromPriority: PatternPriority, toPriority: PatternPriority): number {
  const riskScores = { pursue: 10, backup: 30, risky: 70, dead: 90 }
  return riskScores[toPriority] - riskScores[fromPriority]
}

function generateSwitchReasoning(
  fromPattern: ActionPatternData,
  toPattern: ActionPatternData,
  impact: ReturnType<typeof calculateSwitchImpact>,
  recommendation: PatternSwitchPreview['recommendation']
): string {
  const { probabilityChange, riskChange } = impact

  if (recommendation === 'strongly_recommend') {
    return `Strong recommendation: ${toPattern.name} has ${probabilityChange > 0 ? 'higher' : 'similar'} completion potential and better strategic positioning.`
  }

  if (recommendation === 'recommend') {
    return `Recommended: Switching to ${toPattern.name} improves your position by ${Math.abs(probabilityChange).toFixed(0)}%.`
  }

  if (recommendation === 'caution') {
    return `Use caution: This switch may increase risk by ${riskChange}% but could be worth it for strategic reasons.`
  }

  if (recommendation === 'avoid') {
    return `Not recommended: Switching now would decrease completion probability by ${Math.abs(probabilityChange).toFixed(0)}%.`
  }

  return `Neutral switch: Similar strategic value with trade-offs in completion time vs. risk.`
}
