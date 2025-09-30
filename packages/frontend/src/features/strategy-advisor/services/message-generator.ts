// Message Generator - Converts HandAnalysis to simple conversational messages
// Creates 1-3 focused messages for glance-mode strategy guidance

import type { HandAnalysis } from '../../../stores/intelligence-store'
import type { StrategyMessage } from '../types/strategy-advisor.types'

export function generateStrategyMessages(analysis: HandAnalysis | null): StrategyMessage[] {
  if (!analysis) return []

  const messages: StrategyMessage[] = []
  const timestamp = Date.now()

  // Message 1: Pattern Focus (always include if we have a top pattern)
  if (analysis.recommendedPatterns && analysis.recommendedPatterns.length > 0) {
    const topPattern = analysis.recommendedPatterns[0]
    const completion = topPattern.completionPercentage || 0
    const patternName = topPattern.pattern.displayName ||
                       `${topPattern.pattern.section} #${topPattern.pattern.line}`

    messages.push({
      id: `pattern-focus-${timestamp}`,
      type: 'encouragement',
      category: 'pattern-focus',
      urgency: completion > 80 ? 'high' : completion > 60 ? 'medium' : 'low',
      title: 'Pattern Focus',
      message: `Focus on ${patternName} - you have ${Math.round(completion)}% complete`,
      confidence: topPattern.confidence,
      timestamp,
      isActionable: true,
      details: {
        shortReason: `${topPattern.reasoning || 'Best pattern match'}`,
        fullReason: topPattern.reasoning || 'This pattern has the highest AI score based on your current tiles and availability.',
        alternativeActions: analysis.recommendedPatterns.slice(1, 3).map(p =>
          `Switch to ${p.pattern.displayName || `${p.pattern.section} #${p.pattern.line}`} (${Math.round(p.completionPercentage)}% complete)`
        )
      }
    })
  }

  // Message 2: Discard Suggestions
  const discardTiles = analysis.tileRecommendations?.filter(t => t.action === 'discard') || []
  if (discardTiles.length > 0) {
    const topDiscard = discardTiles.sort((a, b) => b.priority - a.priority)[0]

    messages.push({
      id: `discard-${timestamp}`,
      type: 'suggestion',
      category: 'pattern-focus',
      urgency: topDiscard.priority > 7 ? 'medium' : 'low',
      title: 'Discard Suggestion',
      message: `Consider discarding ${topDiscard.tileId} - ${topDiscard.reasoning}`,
      confidence: topDiscard.confidence,
      timestamp,
      isActionable: true,
      details: {
        shortReason: topDiscard.reasoning,
        fullReason: topDiscard.reasoning,
        alternativeActions: topDiscard.alternativeActions?.map(alt =>
          `${alt.action.toUpperCase()}: ${alt.reasoning}`
        )
      }
    })
  }

  // Message 3: Keep Suggestions (high priority tiles)
  const keepTiles = analysis.tileRecommendations?.filter(t =>
    t.action === 'keep' && t.priority >= 7
  ) || []

  if (keepTiles.length > 0) {
    const topKeep = keepTiles.sort((a, b) => b.priority - a.priority)[0]

    // Special handling for jokers
    const isJoker = topKeep.tileId === 'JK'
    const title = isJoker ? 'Joker Strategy' : 'Keep Priority'

    messages.push({
      id: `keep-${timestamp}`,
      type: 'insight',
      category: 'pattern-focus',
      urgency: topKeep.priority > 8 ? 'high' : 'medium',
      title,
      message: isJoker
        ? `Keep jokers - ${topKeep.reasoning}`
        : `Keep ${topKeep.tileId} - ${topKeep.reasoning}`,
      confidence: topKeep.confidence,
      timestamp,
      isActionable: true,
      details: {
        shortReason: topKeep.reasoning,
        fullReason: topKeep.reasoning,
        riskFactors: topKeep.alternativeActions?.map(alt =>
          `Alternative: ${alt.action} (${alt.confidence}% confidence)`
        )
      }
    })
  }

  // Message 4: Threats/Warnings (if any high-level threats exist)
  const highThreats = analysis.threats?.filter(t => t.level === 'high' || t.level === 'medium') || []
  if (highThreats.length > 0 && messages.length < 3) {
    const topThreat = highThreats[0]

    messages.push({
      id: `threat-${timestamp}`,
      type: 'warning',
      category: 'defensive',
      urgency: topThreat.level === 'high' ? 'high' : 'medium',
      title: 'Defensive Play',
      message: topThreat.description,
      confidence: 85,
      timestamp,
      isActionable: true,
      details: {
        shortReason: topThreat.mitigation,
        fullReason: `${topThreat.description} ${topThreat.mitigation}`,
        riskFactors: [topThreat.description]
      }
    })
  }

  // Limit to max 3 messages
  return messages.slice(0, 3)
}
