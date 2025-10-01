// Message Generator Service - Generates conversational strategy messages
// Transforms technical analysis into user-friendly, conversational guidance

import type * as StrategyAdvisorTypes from '../types/strategy-advisor.types'

export class MessageGeneratorService {
  private messageIdCounter = 0

  /**
   * Generate conversational strategy messages from intelligence data and game context
   */
  generateMessages(
    request: StrategyAdvisorTypes.StrategyGenerationRequest
  ): StrategyAdvisorTypes.StrategyGenerationResponse {
    try {
      const messages: StrategyAdvisorTypes.StrategyMessage[] = []

      // Generate different types of messages based on context
      const patternMessages = this.generatePatternGuidance(request)
      const tileMessages = this.generateTileGuidance(request)
      const situationalMessages = this.generateSituationalGuidance(request)

      messages.push(...patternMessages, ...tileMessages, ...situationalMessages)

      // Sort by urgency and limit messages
      const sortedMessages = this.prioritizeMessages(messages, request.urgencyThreshold)

      return {
        messages: sortedMessages,
        reasoning: `Generated ${sortedMessages.length} strategy messages based on current game state`,
        confidence: this.calculateOverallConfidence(sortedMessages),
        shouldReplace: true
      }
    } catch (error) {
      console.error('Message generation failed:', error)
      return {
        messages: [],
        reasoning: 'Failed to generate strategy messages',
        confidence: 0,
        shouldReplace: false
      }
    }
  }

  /**
   * Generate pattern-focused guidance messages
   */
  private generatePatternGuidance(
    request: StrategyAdvisorTypes.StrategyGenerationRequest
  ): StrategyAdvisorTypes.StrategyMessage[] {
    const { intelligenceData, gameContext } = request
    const messages: StrategyAdvisorTypes.StrategyMessage[] = []

    if (!intelligenceData.hasAnalysis || intelligenceData.recommendedPatterns.length === 0) {
      return messages
    }

    const primaryPattern = intelligenceData.recommendedPatterns[0]

    // Pattern focus encouragement
    if (primaryPattern.isPrimary && primaryPattern.completionPercentage > 50) {
      messages.push(this.createMessage({
        type: 'encouragement',
        category: 'pattern-focus',
        urgency: 'medium',
        title: 'Stay the Course',
        message: `Keep going with ${primaryPattern.pattern.displayName}! You're ${Math.round(primaryPattern.completionPercentage)}% complete.`,
        reasoning: primaryPattern.reasoning,
        confidence: primaryPattern.confidence,
        isActionable: false,
        details: {
          shortReason: `${Math.round(primaryPattern.completionPercentage)}% complete`,
          fullReason: `This pattern is ${primaryPattern.difficulty} difficulty and you have strong progress. ${primaryPattern.reasoning}`,
          alternativeActions: ['Continue with current strategy', 'Review alternative patterns']
        }
      }))
    }

    // Pattern switch suggestion
    if (intelligenceData.recommendedPatterns.length > 1) {
      const alternativePattern = intelligenceData.recommendedPatterns[1]
      const primaryCompletion = primaryPattern.completionPercentage
      const alternativeCompletion = alternativePattern.completionPercentage

      if (alternativeCompletion > primaryCompletion + 15) {
        messages.push(this.createMessage({
          type: 'suggestion',
          category: 'pattern-switch',
          urgency: 'high',
          title: 'Better Option Available',
          message: `Consider switching to ${alternativePattern.pattern.displayName} - it's ${Math.round(alternativeCompletion)}% complete vs your current ${Math.round(primaryCompletion)}%.`,
          reasoning: alternativePattern.reasoning,
          confidence: alternativePattern.confidence,
          isActionable: true,
          details: {
            shortReason: `${Math.round(alternativeCompletion - primaryCompletion)}% better completion`,
            fullReason: `${alternativePattern.pattern.displayName} offers better completion potential with ${alternativePattern.difficulty} difficulty. ${alternativePattern.reasoning}`,
            alternativeActions: ['Switch to alternative pattern', 'Compare patterns in detail', 'Continue with current pattern'],
            riskFactors: [`Current pattern progress: ${Math.round(primaryCompletion)}%`]
          }
        }))
      }
    }

    // Endgame pattern guidance
    if (gameContext.gamePhase === 'endgame' || gameContext.turnsRemaining < 10) {
      const completionScore = primaryPattern.completionPercentage

      if (completionScore > 80) {
        messages.push(this.createMessage({
          type: 'insight',
          category: 'endgame',
          urgency: 'high',
          title: 'Almost There!',
          message: `You're very close to completion! Focus on the essential tiles only.`,
          reasoning: 'Endgame strategy: prioritize certain tiles over possibilities',
          confidence: 90,
          isActionable: true,
          details: {
            shortReason: 'Endgame focus required',
            fullReason: 'With limited turns remaining, focus on guaranteed progress over speculative plays',
            alternativeActions: ['Focus on essential tiles', 'Consider defensive play']
          }
        }))
      } else if (completionScore < 50) {
        messages.push(this.createMessage({
          type: 'warning',
          category: 'endgame',
          urgency: 'critical',
          title: 'Time Running Out',
          message: `Pattern completion unlikely. Consider defensive play to avoid penalties.`,
          reasoning: 'Low completion percentage with limited turns remaining',
          confidence: 85,
          isActionable: true,
          details: {
            shortReason: 'Switch to defensive strategy',
            fullReason: 'With limited turns and low completion, focus on minimizing point losses rather than completing the pattern',
            alternativeActions: ['Play defensively', 'Pass out safely', 'Switch to simpler pattern']
          }
        }))
      }
    }

    return messages
  }

  /**
   * Generate tile-specific guidance messages
   */
  private generateTileGuidance(
    request: StrategyAdvisorTypes.StrategyGenerationRequest
  ): StrategyAdvisorTypes.StrategyMessage[] {
    const { intelligenceData } = request
    const messages: StrategyAdvisorTypes.StrategyMessage[] = []

    if (intelligenceData.tileRecommendations.length === 0) {
      return messages
    }

    // High priority discard recommendations
    const discardRecommendations = intelligenceData.tileRecommendations
      .filter(rec => rec.action === 'discard' || rec.action === 'pass')
      .filter(rec => rec.priority >= 8)

    if (discardRecommendations.length > 0) {
      const topDiscard = discardRecommendations[0]
      messages.push(this.createMessage({
        type: 'suggestion',
        category: 'pattern-focus',
        urgency: 'medium',
        title: 'Discard Recommendation',
        message: `Consider discarding tiles that don't support your pattern.`,
        reasoning: topDiscard.reasoning,
        confidence: topDiscard.confidence,
        isActionable: true,
        details: {
          shortReason: 'Optimize hand efficiency',
          fullReason: topDiscard.reasoning,
          alternativeActions: ['Follow discard recommendation', 'Keep for flexibility']
        }
      }))
    }

    // High priority keep recommendations
    const keepRecommendations = intelligenceData.tileRecommendations
      .filter(rec => rec.action === 'keep')
      .filter(rec => rec.priority >= 8)

    if (keepRecommendations.length > 0) {
      const topKeep = keepRecommendations[0]
      messages.push(this.createMessage({
        type: 'insight',
        category: 'pattern-focus',
        urgency: 'low',
        title: 'Key Tiles Identified',
        message: `You have essential tiles for your pattern - protect them!`,
        reasoning: topKeep.reasoning,
        confidence: topKeep.confidence,
        isActionable: false,
        details: {
          shortReason: 'Essential for pattern completion',
          fullReason: topKeep.reasoning
        }
      }))
    }

    return messages
  }

  /**
   * Generate situational guidance based on threats and game state
   */
  private generateSituationalGuidance(
    request: StrategyAdvisorTypes.StrategyGenerationRequest
  ): StrategyAdvisorTypes.StrategyMessage[] {
    const { intelligenceData, gameContext } = request
    const messages: StrategyAdvisorTypes.StrategyMessage[] = []

    // Threat-based warnings
    const highThreats = intelligenceData.threats.filter(threat => threat.level === 'high')
    if (highThreats.length > 0) {
      const threat = highThreats[0]
      messages.push(this.createMessage({
        type: 'warning',
        category: 'defensive',
        urgency: 'high',
        title: 'Defensive Alert',
        message: `Watch out: ${threat.description}`,
        reasoning: threat.mitigation,
        confidence: 85,
        isActionable: true,
        details: {
          shortReason: threat.description,
          fullReason: `${threat.description}. Recommended action: ${threat.mitigation}`,
          alternativeActions: [threat.mitigation, 'Monitor situation', 'Continue current strategy']
        }
      }))
    }

    // Charleston-specific guidance
    if (gameContext.gamePhase === 'charleston') {
      messages.push(this.createMessage({
        type: 'suggestion',
        category: 'charleston',
        urgency: 'medium',
        title: 'Charleston Strategy',
        message: 'Pass tiles that don\'t fit your target patterns. Keep flexible tiles.',
        reasoning: 'Charleston phase optimization for pattern development',
        confidence: 80,
        isActionable: true,
        details: {
          shortReason: 'Optimize for target patterns',
          fullReason: 'Use Charleston to remove unhelpful tiles and potentially gain useful ones for your selected patterns',
          alternativeActions: ['Follow pass recommendations', 'Keep flexibility tiles', 'Focus on one pattern']
        }
      }))
    }

    // Wall depletion warning
    if (gameContext.wallTilesRemaining < 20) {
      messages.push(this.createMessage({
        type: 'warning',
        category: 'endgame',
        urgency: 'critical',
        title: 'Wall Almost Empty',
        message: `Only ${gameContext.wallTilesRemaining} tiles left! Game may end soon.`,
        reasoning: 'Wall depletion forces endgame considerations',
        confidence: 100,
        isActionable: true,
        details: {
          shortReason: 'Game ending soon',
          fullReason: 'With few tiles remaining, prioritize safe play and pattern completion over risky moves',
          alternativeActions: ['Play conservatively', 'Complete current pattern', 'Prepare for dead hand']
        }
      }))
    }

    return messages
  }

  /**
   * Create a strategy message with proper ID and timestamp
   */
  private createMessage(
    params: Omit<StrategyAdvisorTypes.StrategyMessage, 'id' | 'timestamp'>
  ): StrategyAdvisorTypes.StrategyMessage {
    return {
      ...params,
      id: `msg_${++this.messageIdCounter}_${Date.now()}`,
      timestamp: Date.now()
    }
  }

  /**
   * Prioritize messages by urgency and confidence
   */
  private prioritizeMessages(
    messages: StrategyAdvisorTypes.StrategyMessage[],
    urgencyThreshold: StrategyAdvisorTypes.UrgencyLevel
  ): StrategyAdvisorTypes.StrategyMessage[] {
    const urgencyOrder: Record<StrategyAdvisorTypes.UrgencyLevel, number> = {
      'critical': 4,
      'high': 3,
      'medium': 2,
      'low': 1
    }

    const thresholdValue = urgencyOrder[urgencyThreshold]

    return messages
      .filter(msg => urgencyOrder[msg.urgency] >= thresholdValue)
      .sort((a, b) => {
        // Sort by urgency first
        const urgencyDiff = urgencyOrder[b.urgency] - urgencyOrder[a.urgency]
        if (urgencyDiff !== 0) return urgencyDiff

        // Then by confidence
        return b.confidence - a.confidence
      })
      .slice(0, 3) // Limit to top 3 messages
  }

  /**
   * Calculate overall confidence across all messages
   */
  private calculateOverallConfidence(messages: StrategyAdvisorTypes.StrategyMessage[]): number {
    if (messages.length === 0) return 0

    const totalConfidence = messages.reduce((sum, msg) => sum + msg.confidence, 0)
    return Math.round(totalConfidence / messages.length)
  }
}