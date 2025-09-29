// Strategy Mode Service - Mode-specific logic implementation
// Provides intelligent strategy recommendations adapted to different play styles

import type {
  StrategyMode,
  StrategyModeDefinitions,
  UrgencyLevel,
  GameContext,
  DisclosureContent,
  IntelligenceData,
  StrategyMessage
} from '../types/strategy-advisor.types'

// Complete strategy mode definitions with specific configurations
export const STRATEGY_MODE_DEFINITIONS: StrategyModeDefinitions = {
  flexible: {
    prioritizeAdaptability: true,
    showMultipleOptions: true,
    riskTolerance: 'medium',
    detailLevel: 'balanced',
    recommendationCount: 3
  },
  quickWin: {
    prioritizeSpeed: true,
    showFastestPath: true,
    riskTolerance: 'high',
    detailLevel: 'minimal',
    recommendationCount: 1
  },
  highScore: {
    prioritizePoints: true,
    showComplexPatterns: true,
    riskTolerance: 'low',
    detailLevel: 'comprehensive',
    recommendationCount: 2
  },
  defensive: {
    prioritizeBlocking: true,
    showOpponentThreats: true,
    riskTolerance: 'minimal',
    detailLevel: 'focused',
    recommendationCount: 1
  }
}

// Mode descriptions for UI display
export const STRATEGY_MODE_DESCRIPTIONS: Record<StrategyMode, string> = {
  flexible: 'Balanced approach with multiple backup options and adaptable strategy paths',
  quickWin: 'Fast-paced play focused on immediate wins with higher risk tolerance',
  highScore: 'Point-maximizing strategy emphasizing complex patterns and careful planning',
  defensive: 'Conservative play focused on blocking opponents and minimizing risk'
}

// Mode-specific message filtering
export const getModeMessageFilter = (
  mode: StrategyMode,
  messages: StrategyMessage[]
): StrategyMessage[] => {
  const _config = STRATEGY_MODE_DEFINITIONS[mode]

  let filtered = [...messages]

  // Apply recommendation count limit
  if (_config.recommendationCount > 0) {
    filtered = filtered
      .sort((a, b) => {
        // Sort by urgency first, then confidence
        const urgencyWeight = { critical: 4, high: 3, medium: 2, low: 1 }
        const aScore = (urgencyWeight[a.urgency] * 100) + a.confidence
        const bScore = (urgencyWeight[b.urgency] * 100) + b.confidence
        return bScore - aScore
      })
      .slice(0, _config.recommendationCount)
  }

  // Mode-specific filtering
  switch (mode) {
    case 'quickWin':
      // Prioritize fast, actionable messages
      filtered = filtered.filter(msg =>
        msg.isActionable &&
        (msg.category === 'opportunity' || msg.category === 'pattern-focus')
      )
      break

    case 'defensive':
      // Prioritize defensive and blocking messages
      filtered = filtered.filter(msg =>
        msg.category === 'defensive' ||
        msg.category === 'warning'
      )
      break

    case 'highScore':
      // Prioritize complex pattern and strategic messages
      filtered = filtered.filter(msg =>
        msg.category === 'pattern-switch' ||
        msg.category === 'insight' ||
        msg.category === 'opportunity'
      )
      break

    case 'flexible':
      // Keep all message types but prioritize adaptable options
      // No filtering - show variety
      break
  }

  return filtered
}

// Generate mode-specific disclosure content
export const generateModeDisclosureContent = (
  mode: StrategyMode,
  intelligenceData: IntelligenceData,
  _gameContext: GameContext
): DisclosureContent => {
  const primaryPattern = intelligenceData.recommendedPatterns[0]

  // Base content that all modes share
  const baseGlance = {
    title: primaryPattern?.pattern.displayName || 'Continue current strategy',
    message: getGlanceMessage(mode, intelligenceData, gameContext),
    confidence: primaryPattern?.confidence || intelligenceData.overallScore,
    emoji: getModeEmoji(mode)
  }

  // Generate mode-specific content
  switch (mode) {
    case 'quickWin':
      return generateQuickWinContent(baseGlance, intelligenceData, gameContext)

    case 'defensive':
      return generateDefensiveContent(baseGlance, intelligenceData, gameContext)

    case 'highScore':
      return generateHighScoreContent(baseGlance, intelligenceData, gameContext)

    case 'flexible':
    default:
      return generateFlexibleContent(baseGlance, intelligenceData, gameContext)
  }
}

// Mode-specific glance messages
const getGlanceMessage = (
  mode: StrategyMode,
  intelligenceData: IntelligenceData,
  _gameContext: GameContext
): string => {
  const primaryPattern = intelligenceData.recommendedPatterns[0]
  const completionPercentage = primaryPattern?.completionPercentage || 0

  switch (mode) {
    case 'quickWin':
      if (completionPercentage > 80) {
        return 'Push for the win! You\'re almost there.'
      }
      return 'Focus on the fastest path to completion'

    case 'defensive':
      if (intelligenceData.threats.length > 0) {
        return 'Defensive play needed - watch for opponent threats'
      }
      return 'Maintain safe, defensive positioning'

    case 'highScore':
      return `Building towards ${primaryPattern?.pattern.displayName || 'high-value pattern'}`

    case 'flexible':
    default:
      return `Keep going with ${primaryPattern?.pattern.displayName || 'current pattern'}`
  }
}

// Mode emoji indicators
const getModeEmoji = (mode: StrategyMode): string => {
  switch (mode) {
    case 'quickWin':
      return '⚡'
    case 'defensive':
      return '🛡️'
    case 'highScore':
      return '💎'
    case 'flexible':
    default:
      return '🎯'
  }
}

// Quick Win mode content generation
const generateQuickWinContent = (
  baseGlance: DisclosureContent['glance'],
  intelligenceData: IntelligenceData,
  _gameContext: GameContext
): DisclosureContent => {
  const primaryPattern = intelligenceData.recommendedPatterns[0]

  return {
    glance: {
      ...baseGlance,
      actionNeeded: getTileAction(intelligenceData.tileRecommendations[0])
    },
    details: {
      technicalAnalysis: `Fast track to completion via ${primaryPattern?.pattern.displayName}`,
      patternRequirements: [`Need: ${getQuickestNeeds(intelligenceData)}`],
      riskFactors: ['Higher risk for faster completion'],
      estimatedTurns: Math.max(1, Math.floor((100 - (primaryPattern?.completionPercentage || 0)) / 20)),
      flexibility: 'low',
      alternativePaths: getAlternativeFastPaths(intelligenceData)
    },
    advanced: {
      probabilityAnalysis: `Quick win probability: ${Math.round((primaryPattern?.confidence || 0) * 0.8)}%`,
      completionProbability: (primaryPattern?.confidence || 0) * 0.8,
      expectedTurns: Math.max(1, Math.floor((100 - (primaryPattern?.completionPercentage || 0)) / 25)),
      turnVariance: 0.5,
      tileAvailability: getTileAvailabilityQuick(intelligenceData),
      alternativeStrategies: [
        {
          strategy: 'Defensive fallback',
          probability: 0.6,
          turnsToCompletion: 8,
          riskLevel: 'low'
        }
      ],
      wallDepletionRisk: gameContext.wallTilesRemaining < 40 ? 'High - Act quickly' : 'Moderate'
    }
  }
}

// Defensive mode content generation
const generateDefensiveContent = (
  baseGlance: DisclosureContent['glance'],
  intelligenceData: IntelligenceData,
  _gameContext: GameContext
): DisclosureContent => {
  const threats = intelligenceData.threats
  const primaryThreat = threats[0]

  return {
    glance: {
      ...baseGlance,
      actionNeeded: primaryThreat ? `Block: ${primaryThreat.mitigation}` : 'Maintain safe play'
    },
    details: {
      technicalAnalysis: `Defensive positioning${primaryThreat ? ` against ${primaryThreat.description}` : ''}`,
      patternRequirements: getDefensiveRequirements(intelligenceData),
      riskFactors: threats.map(t => t.description),
      estimatedTurns: 6,
      flexibility: 'high',
      alternativePaths: ['Safe completion path', 'Block and pivot', 'Wall play']
    },
    advanced: {
      probabilityAnalysis: 'Defensive play success: 85%',
      completionProbability: 0.75,
      expectedTurns: 7,
      turnVariance: 2.0,
      tileAvailability: getTileAvailabilityDefensive(intelligenceData),
      alternativeStrategies: [
        {
          strategy: 'Full defensive',
          probability: 0.85,
          turnsToCompletion: 10,
          riskLevel: 'minimal'
        },
        {
          strategy: 'Counter-attack',
          probability: 0.60,
          turnsToCompletion: 5,
          riskLevel: 'medium'
        }
      ],
      wallDepletionRisk: 'Low - Conservative play allows time',
      opponentThreatsAnalysis: generateThreatAnalysis(threats)
    }
  }
}

// High Score mode content generation
const generateHighScoreContent = (
  baseGlance: DisclosureContent['glance'],
  intelligenceData: IntelligenceData,
  _gameContext: GameContext
): DisclosureContent => {
  const highValuePatterns = intelligenceData.recommendedPatterns.filter(p => p.isPrimary)

  return {
    glance: {
      ...baseGlance,
      actionNeeded: `Build complex: ${highValuePatterns[0]?.pattern.displayName || 'high-value pattern'}`
    },
    details: {
      technicalAnalysis: 'Complex pattern development for maximum points',
      patternRequirements: getHighScoreRequirements(intelligenceData),
      riskFactors: [
        'Longer completion time',
        'More tiles required',
        'Pattern complexity'
      ],
      estimatedTurns: 8,
      flexibility: 'medium',
      alternativePaths: highValuePatterns.slice(1, 3).map(p => p.pattern.displayName)
    },
    advanced: {
      probabilityAnalysis: 'High-score pattern completion analysis',
      completionProbability: 0.65,
      expectedTurns: 9.2,
      turnVariance: 3.5,
      tileAvailability: getTileAvailabilityComplex(intelligenceData),
      alternativeStrategies: highValuePatterns.slice(0, 2).map(p => ({
        strategy: p.pattern.displayName,
        probability: p.confidence / 100,
        turnsToCompletion: Math.floor(10 - (p.completionPercentage / 10)),
        riskLevel: p.difficulty
      })),
      wallDepletionRisk: 'Moderate - Complex patterns need time'
    }
  }
}

// Flexible mode content generation
const generateFlexibleContent = (
  baseGlance: DisclosureContent['glance'],
  intelligenceData: IntelligenceData,
  _gameContext: GameContext
): DisclosureContent => {
  const patterns = intelligenceData.recommendedPatterns.slice(0, 3)

  return {
    glance: baseGlance,
    details: {
      technicalAnalysis: 'Balanced approach with multiple viable paths',
      patternRequirements: getFlexibleRequirements(intelligenceData),
      riskFactors: ['Multiple options may cause decision paralysis'],
      estimatedTurns: 6,
      flexibility: 'high',
      alternativePaths: patterns.map(p => p.pattern.displayName)
    },
    advanced: {
      probabilityAnalysis: 'Multi-path analysis with adaptive strategy',
      completionProbability: 0.78,
      expectedTurns: 6.5,
      turnVariance: 2.2,
      tileAvailability: getTileAvailabilityBalanced(intelligenceData),
      alternativeStrategies: patterns.map(p => ({
        strategy: p.pattern.displayName,
        probability: p.confidence / 100,
        turnsToCompletion: Math.floor(8 - (p.completionPercentage / 12.5)),
        riskLevel: p.difficulty
      })),
      wallDepletionRisk: 'Balanced - Multiple options provide security'
    }
  }
}

// Utility functions for content generation
const getTileAction = (tileRecommendation?: IntelligenceData['tileRecommendations'][0]): string => {
  if (!tileRecommendation) return 'Analyze hand'

  switch (tileRecommendation.action) {
    case 'keep':
      return `Keep ${tileRecommendation.tileId}`
    case 'discard':
      return `Discard ${tileRecommendation.tileId}`
    case 'pass':
      return `Pass ${tileRecommendation.tileId}`
    default:
      return 'Consider options'
  }
}

const getQuickestNeeds = (data: IntelligenceData): string => {
  const keepTiles = data.tileRecommendations
    .filter(r => r.action === 'keep')
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 2)

  return keepTiles.map(t => t.tileId).join(', ') || 'Any completing tiles'
}

const getAlternativeFastPaths = (data: IntelligenceData): string[] => {
  return data.recommendedPatterns
    .slice(1, 3)
    .map(p => `${p.pattern.displayName} (${Math.round(p.completionPercentage)}%)`)
}

const getTileAvailabilityQuick = (data: IntelligenceData) => {
  const keepTiles = data.tileRecommendations.filter(r => r.action === 'keep').slice(0, 3)

  return keepTiles.map(tile => ({
    tile: tile.tileId,
    available: Math.floor(Math.random() * 3) + 1, // Simulated availability
    probability: tile.confidence / 100
  }))
}

const getDefensiveRequirements = (data: IntelligenceData): string[] => {
  const threats = data.threats
  return threats.length > 0
    ? [`Block ${threats[0].description}`, 'Maintain safe tiles']
    : ['Keep safe tiles', 'Avoid dangerous discards']
}

const getTileAvailabilityDefensive = (data: IntelligenceData) => {
  return data.tileRecommendations
    .filter(r => r.action === 'keep')
    .slice(0, 3)
    .map(tile => ({
      tile: tile.tileId,
      available: Math.floor(Math.random() * 4) + 2, // More conservative availability
      probability: Math.min(tile.confidence / 100, 0.8) // Cap at 80% for defensive
    }))
}

const generateThreatAnalysis = (threats: IntelligenceData['threats']): string => {
  if (threats.length === 0) {
    return 'No immediate threats detected. Continue with current strategy.'
  }

  const highThreats = threats.filter(t => t.level === 'high')
  const mediumThreats = threats.filter(t => t.level === 'medium')

  return `${highThreats.length} high-priority threats${
    mediumThreats.length > 0 ? `, ${mediumThreats.length} medium threats` : ''
  }. ${threats[0].mitigation}`
}

const getHighScoreRequirements = (data: IntelligenceData): string[] => {
  const complex = data.recommendedPatterns.filter(p => p.difficulty === 'hard')[0]
  return complex
    ? [`Complete ${complex.pattern.displayName}`, `Need ${5 - Math.floor(complex.completionPercentage / 20)} more groups`]
    : ['Focus on high-value patterns', 'Build complete groups']
}

const getTileAvailabilityComplex = (data: IntelligenceData) => {
  return data.recommendedPatterns[0] ? [
    { tile: 'Complex tiles', available: 3, probability: 0.6 },
    { tile: 'Support tiles', available: 5, probability: 0.8 },
    { tile: 'Bonus tiles', available: 2, probability: 0.4 }
  ] : []
}

const getFlexibleRequirements = (data: IntelligenceData): string[] => {
  const patterns = data.recommendedPatterns.slice(0, 2)
  return patterns.length > 0
    ? patterns.map(p => `Option: ${p.pattern.displayName} (${Math.round(p.completionPercentage)}%)`)
    : ['Multiple viable paths available']
}

const getTileAvailabilityBalanced = (data: IntelligenceData) => {
  return data.tileRecommendations
    .filter(r => r.action === 'keep')
    .slice(0, 4)
    .map(tile => ({
      tile: tile.tileId,
      available: Math.floor(Math.random() * 3) + 2,
      probability: tile.confidence / 100
    }))
}

// Mode recommendation engine
export const suggestOptimalMode = (
  _gameContext: GameContext,
  urgencyLevel: UrgencyLevel,
  intelligenceData: IntelligenceData
): StrategyMode => {
  // High urgency situations favor quick or defensive play
  if (urgencyLevel === 'critical' || urgencyLevel === 'high') {
    const hasThreats = intelligenceData.threats.some(t => t.level === 'high')
    return hasThreats ? 'defensive' : 'quickWin'
  }

  // Late game considerations
  if (gameContext.gamePhase === 'endgame' || gameContext.wallTilesRemaining < 30) {
    const completionPercentage = intelligenceData.recommendedPatterns[0]?.completionPercentage || 0
    return completionPercentage > 70 ? 'quickWin' : 'defensive'
  }

  // Early game with good patterns
  if (gameContext.gamePhase === 'charleston' || gameContext.turnsRemaining > 15) {
    const hasComplexPatterns = intelligenceData.recommendedPatterns.some(p => p.difficulty === 'hard')
    return hasComplexPatterns ? 'highScore' : 'flexible'
  }

  // Default to flexible for balanced play
  return 'flexible'
}

// Service interface
export const strategyModeService = {
  getModeDefinitions: () => STRATEGY_MODE_DEFINITIONS,
  getModeConfig: (mode: StrategyMode) => STRATEGY_MODE_DEFINITIONS[mode],
  getModeDescription: (mode: StrategyMode) => STRATEGY_MODE_DESCRIPTIONS[mode],
  filterMessagesByMode: getModeMessageFilter,
  generateDisclosureContent: generateModeDisclosureContent,
  suggestOptimalMode,
  getAllModes: (): StrategyMode[] => Object.keys(STRATEGY_MODE_DEFINITIONS) as StrategyMode[]
}