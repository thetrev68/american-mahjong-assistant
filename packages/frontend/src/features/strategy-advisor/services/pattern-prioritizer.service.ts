// Pattern Prioritizer Service - Traffic light priority calculation engine
// Transforms pattern analysis into action-first priority system

import type {
  PatternPriority,
  PatternPriorityInfo,
  UrgencyLevel,
  ActionPatternData
} from '../types/strategy-advisor.types'
import type { PatternRecommendation } from '../../../stores/intelligence-store'
import type { PatternSelectionOption } from 'shared-types'

// Priority calculation weights for different factors
interface PriorityWeights {
  completion: number
  confidence: number
  difficulty: number
  tilesRemaining: number
  wallPressure: number
  opponentThreat: number
}

// Default weights optimized for action-first decision making
const DEFAULT_WEIGHTS: PriorityWeights = {
  completion: 0.4,      // Most important: how close to completion
  confidence: 0.25,     // AI confidence in this pattern
  difficulty: 0.15,     // Pattern difficulty (easier = better)
  tilesRemaining: 0.1,  // Tiles needed to complete
  wallPressure: 0.05,   // Wall tiles remaining
  opponentThreat: 0.05  // Opponent proximity to winning
}

// Completion percentage thresholds for priority levels
const PRIORITY_THRESHOLDS = {
  pursue: 80,    // 80%+ completion: "Almost there, keep going!"
  backup: 50,    // 50-79% completion: "Ready if needed"
  risky: 25,     // 25-49% completion: "High risk, consider alternatives"
  dead: 0        // <25% completion: "Not viable"
} as const

// Context-aware priority adjustments
interface PriorityContext {
  urgencyLevel: UrgencyLevel
  wallTilesRemaining: number
  opponentThreat: boolean
  turnsRemaining: number
  gamePhase: 'early' | 'mid' | 'late' | 'endgame'
}

class PatternPrioritizerService {
  /**
   * Calculate pattern priority using traffic light system
   */
  calculatePatternPriority(
    pattern: PatternSelectionOption,
    recommendation: PatternRecommendation,
    context: PriorityContext,
    weights: PriorityWeights = DEFAULT_WEIGHTS
  ): PatternPriorityInfo {
    const completion = recommendation.completionPercentage

    // Base priority calculation
    const baseScore = this.calculateBaseScore(pattern, recommendation, weights)

    // Apply context adjustments
    const adjustedScore = this.applyContextAdjustments(baseScore, context)

    // Determine priority level
    const priority = this.scoreToPriority(adjustedScore, completion)

    // Generate action-first messaging
    const actionMessage = this.generateActionMessage(priority, pattern, recommendation, context)

    // Calculate needs list
    const needsList = this.calculateNeedsList(pattern, recommendation)

    // Identify risk factors
    const riskFactors = this.identifyRiskFactors(pattern, recommendation, context)

    return {
      priority,
      urgencyLevel: this.priorityToUrgencyLevel(priority, context),
      completionPercentage: completion,
      actionMessage,
      needsList,
      riskFactors,
      confidence: Math.round(adjustedScore)
    }
  }

  /**
   * Transform pattern recommendations into action-first data
   */
  transformToActionPatterns(
    recommendations: PatternRecommendation[],
    patterns: PatternSelectionOption[],
    context: PriorityContext
  ): ActionPatternData[] {
    const mappedPatterns = recommendations.map(rec => {
      const pattern = patterns.find(p => p.id === rec.pattern.id)
      if (!pattern) return null

      const priorityInfo = this.calculatePatternPriority(pattern, rec, context)

      return {
        id: pattern.id,
        patternId: pattern.patternId,
        name: pattern.displayName,
        section: pattern.section,
        line: pattern.line,
        pattern: pattern.pattern,
        points: pattern.points,
        difficulty: pattern.difficulty,

        priorityInfo,

        actionNeeded: this.getActionNeeded(priorityInfo.priority, rec),
        tilesNeeded: this.extractTilesNeeded(rec.reasoning),
        estimatedTurns: this.estimateTurnsToCompletion(rec, context),

        displayGroups: this.createDisplayGroups(pattern, rec)
      } as ActionPatternData
    })

    const filteredPatterns = mappedPatterns.filter(Boolean) as ActionPatternData[]

    const sortedPatterns = filteredPatterns.sort((a, b) => {
      return this.comparePriorities(a.priorityInfo, b.priorityInfo)
    })

    return sortedPatterns
  }

  /**
   * Filter patterns based on urgency level
   */
  filterPatternsByUrgency(
    patterns: ActionPatternData[],
    urgencyLevel: UrgencyLevel
  ): ActionPatternData[] {
    switch (urgencyLevel) {
      case 'critical':
        // Emergency: Show only pursue patterns
        return patterns.filter(p => p.priorityInfo.priority === 'pursue')

      case 'high':
        // High urgency: Show pursue and backup patterns
        return patterns.filter(p =>
          p.priorityInfo.priority === 'pursue' ||
          p.priorityInfo.priority === 'backup'
        )

      case 'medium':
        // Medium urgency: Show all except dead patterns
        return patterns.filter(p => p.priorityInfo.priority !== 'dead')

      case 'low':
      default:
        // Low urgency: Show all patterns for learning
        return patterns
    }
  }

  /**
   * Get pattern switch recommendation
   */
  getPatternSwitchRecommendation(
    fromPattern: ActionPatternData,
    toPattern: ActionPatternData,
    context: PriorityContext
  ): 'strongly_recommend' | 'recommend' | 'neutral' | 'caution' | 'avoid' {
    const fromPriority = fromPattern.priorityInfo.priority
    const toPriority = toPattern.priorityInfo.priority

    // Priority upgrade matrix
    if (fromPriority === 'dead' && toPriority !== 'dead') {
      return 'strongly_recommend'
    }

    if (fromPriority === 'risky' && (toPriority === 'pursue' || toPriority === 'backup')) {
      return 'recommend'
    }

    if (fromPriority === 'backup' && toPriority === 'pursue') {
      return 'recommend'
    }

    if (fromPriority === 'pursue' && toPriority === 'backup') {
      return context.urgencyLevel === 'critical' ? 'avoid' : 'caution'
    }

    if (fromPriority === 'pursue' && (toPriority === 'risky' || toPriority === 'dead')) {
      return 'avoid'
    }

    return 'neutral'
  }

  // Private helper methods

  private calculateBaseScore(
    pattern: PatternSelectionOption,
    recommendation: PatternRecommendation,
    weights: PriorityWeights
  ): number {
    const completion = recommendation.completionPercentage / 100
    const confidence = recommendation.confidence / 100
    const difficulty = this.difficultyToScore(pattern.difficulty)
    const tilesNeeded = this.estimateTilesNeeded(recommendation)

    return Math.min(100, Math.max(0,
      (completion * weights.completion * 100) +
      (confidence * weights.confidence * 100) +
      (difficulty * weights.difficulty * 100) +
      (tilesNeeded * weights.tilesRemaining * 100)
    ))
  }

  private applyContextAdjustments(
    baseScore: number,
    context: PriorityContext
  ): number {
    let adjustedScore = baseScore

    // Urgency adjustments
    if (context.urgencyLevel === 'critical') {
      // In crisis, heavily favor high-completion patterns
      if (baseScore > 80) adjustedScore *= 1.2
      else if (baseScore < 50) adjustedScore *= 0.7
    }

    // Wall pressure adjustments
    if (context.wallTilesRemaining < 30) {
      // Late game: favor completion over experimentation
      if (baseScore > 70) adjustedScore *= 1.1
      else adjustedScore *= 0.9
    }

    // Opponent threat adjustments
    if (context.opponentThreat) {
      // When threatened, favor defensive patterns
      if (baseScore > 75) adjustedScore *= 1.15
    }

    return Math.min(100, Math.max(0, adjustedScore))
  }

  private scoreToPriority(score: number, completion: number): PatternPriority {
    // Primary factor is completion percentage
    if (completion >= PRIORITY_THRESHOLDS.pursue) return 'pursue'
    if (completion >= PRIORITY_THRESHOLDS.backup) return 'backup'
    if (completion >= PRIORITY_THRESHOLDS.risky) return 'risky'
    return 'dead'
  }

  private priorityToUrgencyLevel(priority: PatternPriority, context: PriorityContext): UrgencyLevel {
    if (priority === 'pursue' && context.urgencyLevel === 'critical') return 'critical'
    if (priority === 'pursue') return 'high'
    if (priority === 'backup') return 'medium'
    if (priority === 'risky') return 'low'
    return 'low' // dead patterns
  }

  private generateActionMessage(
    priority: PatternPriority,
    pattern: PatternSelectionOption,
    recommendation: PatternRecommendation,
    context: PriorityContext
  ): string {
    const completion = Math.round(recommendation.completionPercentage)

    switch (priority) {
      case 'pursue':
        if (completion >= 90) return `Almost there! ${100 - completion}% to go`
        if (completion >= 85) return `Keep going! You're very close`
        return `Strong progress - stick with this`

      case 'backup':
        return `Good backup option (${completion}% ready)`

      case 'risky':
        if (context.urgencyLevel === 'critical') return `Too risky right now`
        return `High risk, low completion (${completion}%)`

      case 'dead':
        return `Not viable - consider switching`

      default:
        return `${completion}% complete`
    }
  }

  private calculateNeedsList(
    pattern: PatternSelectionOption,
    recommendation: PatternRecommendation
  ): string[] {
    // Extract needed tiles from reasoning or pattern analysis
    const needs: string[] = []

    // Parse reasoning for tile mentions
    const reasoning = recommendation.reasoning.toLowerCase()
    const tilePattern = /(\d+[-.\s]?(?:dot|bam|crak|crack|dragon|wind|flower|joker)s?)/gi
    const matches = reasoning.match(tilePattern)

    if (matches) {
      needs.push(...matches.slice(0, 5)) // Limit to 5 most important
    } else {
      // Fallback: generic message based on completion
      const completion = recommendation.completionPercentage
      if (completion < 50) {
        needs.push("Multiple tiles needed")
      } else if (completion < 80) {
        needs.push("2-3 specific tiles")
      } else {
        needs.push("1-2 tiles to complete")
      }
    }

    return needs
  }

  private identifyRiskFactors(
    pattern: PatternSelectionOption,
    recommendation: PatternRecommendation,
    context: PriorityContext
  ): string[] {
    const risks: string[] = []

    if (pattern.difficulty === 'hard') {
      risks.push("Complex pattern structure")
    }

    if (recommendation.completionPercentage < 30) {
      risks.push("Low completion percentage")
    }

    if (recommendation.confidence < 60) {
      risks.push("AI confidence below 60%")
    }

    if (context.wallTilesRemaining < 40) {
      risks.push("Limited tiles remaining")
    }

    if (context.opponentThreat) {
      risks.push("Opponent close to winning")
    }

    return risks
  }

  private getActionNeeded(priority: PatternPriority, _recommendation: PatternRecommendation): string {
    switch (priority) {
      case 'pursue':
        return "Continue with this pattern"
      case 'backup':
        return "Keep as backup option"
      case 'risky':
        return "Consider alternatives"
      case 'dead':
        return "Switch to different pattern"
      default:
        return "Analyze further"
    }
  }

  private extractTilesNeeded(reasoning: string): string[] {
    // Simple extraction logic - could be enhanced
    const tilePattern = /(\d+[-.\s]?(?:dot|bam|crak|crack|dragon|wind)s?)/gi
    const matches = reasoning.match(tilePattern) || []
    return matches.slice(0, 3) // Top 3 needed tiles
  }

  private estimateTurnsToCompletion(
    recommendation: PatternRecommendation,
    context: PriorityContext
  ): number {
    const completion = recommendation.completionPercentage
    const tilesInWall = context.wallTilesRemaining

    if (completion >= 90) return 1
    if (completion >= 75) return 2
    if (completion >= 50) return 3
    if (completion >= 25) return Math.min(5, Math.floor(tilesInWall / 20))
    return Math.min(8, Math.floor(tilesInWall / 15))
  }

  private createDisplayGroups(
    pattern: PatternSelectionOption,
    recommendation: PatternRecommendation
  ): Array<{ tiles: string; color: string; completed: boolean }> {
    // This would need to integrate with existing pattern color utilities
    // For now, return a simplified structure
    return [
      {
        tiles: pattern.pattern,
        color: 'blue',
        completed: recommendation.completionPercentage > 80
      }
    ]
  }

  private comparePriorities(a: PatternPriorityInfo, b: PatternPriorityInfo): number {
    // Priority order: pursue > backup > risky > dead
    const priorityOrder = { pursue: 3, backup: 2, risky: 1, dead: 0 }

    const aPriority = priorityOrder[a.priority]
    const bPriority = priorityOrder[b.priority]

    if (aPriority !== bPriority) {
      return bPriority - aPriority // Higher priority first
    }

    // Same priority: sort by completion percentage
    return b.completionPercentage - a.completionPercentage
  }

  private difficultyToScore(difficulty: 'easy' | 'medium' | 'hard'): number {
    switch (difficulty) {
      case 'easy': return 1.0
      case 'medium': return 0.8
      case 'hard': return 0.6
      default: return 0.8
    }
  }

  private estimateTilesNeeded(recommendation: PatternRecommendation): number {
    // Inverse of completion percentage normalized to 0-1 scale
    return Math.max(0, (100 - recommendation.completionPercentage) / 100)
  }
}

// Export singleton instance
export const patternPrioritizerService = new PatternPrioritizerService()

// Export class for testing
export { PatternPrioritizerService }