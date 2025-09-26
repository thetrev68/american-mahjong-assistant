/**
 * Analysis Test Data Factories
 * 
 * Creates consistent analysis engine results and intelligence data for testing
 */

import type { HandAnalysis, PatternRecommendation, TileRecommendation } from '../../stores/intelligence-store'
import type { PatternAnalysisFacts, TileContribution, GameContext } from '../../features/intelligence-panel/services/pattern-analysis-engine'
import type { RankedPatternResults } from '../../features/intelligence-panel/services/pattern-ranking-engine'
import type { PatternSelectionOption } from 'shared-types'
import { createPatternSelection } from './pattern-factories'

/**
 * Create Engine 1 analysis facts
 */
export function createAnalysisFacts(options: {
  patternId?: string
  tilesMatched?: number
  completionRatio?: number
  missingTiles?: string[]
  tileContributions?: TileContribution[]
} = {}): PatternAnalysisFacts {
  const patternId = options.patternId || '2025-TEST_PATTERN-1'
  const tilesMatched = options.tilesMatched || 7
  const completionRatio = options.completionRatio || 0.5 // 50% complete
  const missingTiles = options.missingTiles || ['4B', '5B', '6B', '7B', '8B', '9B', 'red']
  
  const tileContributions: TileContribution[] = options.tileContributions || [
    {
      tileId: '1B',
      positionsInPattern: [0, 1, 2],
      isRequired: true,
      isCritical: true,
      canBeReplaced: false
    },
    {
      tileId: '2B', 
      positionsInPattern: [4, 5, 6],
      isRequired: true,
      isCritical: false,
      canBeReplaced: true
    },
    {
      tileId: '3B',
      positionsInPattern: [8, 9],
      isRequired: true,
      isCritical: false,
      canBeReplaced: true
    }
  ]
  
  const bestVariation = {
    variationId: `${patternId}-var-1`,
    patternId,
    sequence: 1,
    tilesMatched,
    tilesNeeded: 14 - tilesMatched,
    completionRatio,
    missingTiles,
    tileContributions,
    patternTiles: ['f1', 'f2', 'f3', 'f4', '1B', '1B', '1B', '1B', '2B', '2B', '2B', '3B', '3B', 'red']
  }
  
  return {
    patternId,
    tileMatching: {
      totalVariations: 3,
      bestVariation,
      worstVariation: {
        ...bestVariation,
        tilesMatched: tilesMatched - 2,
        completionRatio: completionRatio - 0.15,
        missingTiles: [...missingTiles, '1C', '2C']
      },
      averageCompletion: completionRatio - 0.1,
      allResults: [bestVariation]
    },
    jokerAnalysis: {
      jokersAvailable: 2,
      substitutablePositions: [4, 5, 8, 10],
      maxJokersUseful: 4,
      withJokersCompletion: completionRatio + 0.2,
      jokersToComplete: Math.max(0, 14 - tilesMatched - 2)
    },
    tileAvailability: {
      missingTileCounts: missingTiles.map(tileId => ({
        tileId,
        inWall: 3,
        inDiscards: 1,
        exposedByOthers: 0,
        totalOriginal: 4,
        remainingAvailable: 2
      })),
      totalMissingInWall: missingTiles.length * 2,
      totalMissingNeeded: missingTiles.length,
      availabilityRatio: 0.67 // Generally optimistic for testing
    },
    progressMetrics: {
      tilesCollected: tilesMatched,
      tilesRemaining: 14 - tilesMatched,
      progressPercentage: completionRatio * 100,
      pairsFormed: Math.floor(tilesMatched / 2),
      setsFormed: Math.floor(tilesMatched / 3),
      sequenceProgress: {
        consecutiveTilesFound: 3,
        gapsInSequence: 2,
        longestRun: 3
      }
    }
  }
}

/**
 * Create multiple analysis facts for different patterns
 */
export function createMultipleAnalysisFacts(count: number = 3): PatternAnalysisFacts[] {
  return Array.from({ length: count }, (_, index) =>
    createAnalysisFacts({
      patternId: `2025-TEST_PATTERN-${index + 1}`,
      tilesMatched: 7 + index, // Vary completion
      completionRatio: 0.4 + (index * 0.1),
      missingTiles: [`${index + 4}B`, `${index + 5}B`, `${index + 6}B`]
    })
  )
}

/**
 * Create Engine 2 ranking results
 */
export function createRankedPatternResults(options: {
  patterns?: PatternSelectionOption[]
  topRecommendations?: Array<{
    patternId: string
    totalScore: number
    confidence: number
    recommendation: 'excellent' | 'good' | 'fair' | 'poor' | 'impossible'
    components?: {
      currentTileScore: number
      availabilityScore: number
      jokerScore: number
      priorityScore: number
    }
    riskFactors?: string[]
    strategicValue?: number
    isViable?: boolean
  }>
} = {}): RankedPatternResults {
  const patterns = options.patterns || [
    createPatternSelection({ id: 1 }),
    createPatternSelection({ id: 2 }),
    createPatternSelection({ id: 3 })
  ]

  const topRecommendations = options.topRecommendations ?
    options.topRecommendations.map((rec, index) => ({
      patternId: rec.patternId,
      totalScore: rec.totalScore,
      confidence: rec.confidence,
      recommendation: rec.recommendation as 'excellent' | 'good' | 'fair' | 'poor' | 'impossible',
      components: rec.components || {
        currentTileScore: Math.max(0, 32 - (index * 6)),
        availabilityScore: Math.max(0, 28 - (index * 5)),
        jokerScore: Math.max(0, 15 - (index * 3)),
        priorityScore: Math.max(0, 10 - (index * 1))
      },
      riskFactors: rec.riskFactors || (index === 0 ? [] : index === 1 ? ['Wall depletion risk'] : ['Limited tile availability', 'High joker dependency']),
      strategicValue: rec.strategicValue ?? (0.85 - (index * 0.13)),
      isViable: rec.isViable ?? (rec.totalScore > 40)
    })) :
    patterns.slice(0, 3).map((pattern, index) => ({
      patternId: pattern.id,
      totalScore: 85 - (index * 13),
      confidence: 0.9 - (index * 0.15),
      recommendation: (index === 0 ? 'excellent' : index === 1 ? 'good' : 'fair') as 'excellent' | 'good' | 'fair' | 'poor' | 'impossible',
      components: {
        currentTileScore: 32 - (index * 6),
        availabilityScore: 28 - (index * 5),
        jokerScore: 15 - (index * 3),
        priorityScore: 10 - (index * 1)
      },
      riskFactors: index === 0 ? [] : index === 1 ? ['Wall depletion risk'] : ['Limited tile availability', 'High joker dependency'],
      strategicValue: 0.85 - (index * 0.13),
      isViable: true
    }))
  
  return {
    topRecommendations,
    viablePatterns: topRecommendations,
    rankings: topRecommendations,
    gameStateFactors: {
      wallTileCount: 70,
      discardPileSize: 0,
      jokersRemaining: 8,
      estimatedTurnsLeft: 12
    },
    switchAnalysis: {
      shouldSuggestSwitch: false,
      currentFocus: 'pattern-1',
      recommendedPattern: '',
      improvementPercent: 0,
      improvementThreshold: 15,
      reasoning: []
    }
  }
}

/**
 * Create a single tile recommendation
 */
export function createTileRecommendation(options: {
  tileId?: string
  action?: 'keep' | 'pass' | 'discard' | 'neutral'
  confidence?: number
  reasoning?: string
  priority?: number
} = {}): TileRecommendation {
  return {
    tileId: options.tileId || '1B',
    action: options.action || 'keep',
    confidence: options.confidence || 85,
    reasoning: options.reasoning || 'Critical tile for primary pattern completion',
    priority: options.priority || 8,
    alternativeActions: [
      {
        action: 'discard',
        confidence: Math.max(0, (options.confidence || 85) - 20),
        reasoning: 'Alternative discard option'
      }
    ]
  }
}

/**
 * Create Engine 3 tile recommendations
 */
export function createTileRecommendations(tileIds: string[] = ['1B', '2B', '3B', '7C', '8D']): TileRecommendation[] {
  return tileIds.map((tileId, index) => createTileRecommendation({
    tileId,
    action: index < 3 ? 'keep' as const : index < 4 ? 'pass' as const : 'discard' as const,
    confidence: 85 - (index * 10),
    reasoning: index < 3 
      ? `Critical tile for primary pattern completion` 
      : index < 4 
      ? `Low strategic value, good Charleston candidate`
      : `Does not contribute to viable patterns`,
    priority: 10 - index
  }))
}

/**
 * Create a single pattern analysis
 */
export function createPatternAnalysis(options: {
  patternId?: string
  section?: string | number
  line?: number
  pattern?: string
  completionPercentage?: number
  tilesNeeded?: number
  strategicValue?: number
  difficulty?: 'easy' | 'medium' | 'hard'
  missingTiles?: string[]
  confidenceScore?: number
  estimatedTurns?: number
  riskLevel?: 'low' | 'medium' | 'high'
} = {}): PatternAnalysisFacts {
  return {
    patternId: options.patternId || '2025-TEST-1',
    section: options.section || '2025',
    line: options.line || 1,
    pattern: options.pattern || 'FFFF 2025 222 222',
    groups: [],
    completionPercentage: options.completionPercentage || 60,
    tilesNeeded: options.tilesNeeded || 7,
    missingTiles: options.missingTiles || ['4B', '5B', '6B'],
    confidenceScore: options.confidenceScore || 0.8,
    difficulty: options.difficulty || 'medium',
    estimatedTurns: options.estimatedTurns || 8,
    riskLevel: options.riskLevel || 'low',
    strategicValue: options.strategicValue || 7
  }
}

/**
 * Create complete HandAnalysis result
 */
export function createHandAnalysis(options: {
  patterns?: PatternSelectionOption[]
  analysisFacts?: PatternAnalysisFacts[]
  overallScore?: number
  tileIds?: string[]
} = {}): HandAnalysis {
  const patterns = options.patterns || [
    createPatternSelection({ id: 1 }),
    createPatternSelection({ id: 2 })
  ]
  
  const analysisFacts = options.analysisFacts || createMultipleAnalysisFacts(2)
  const rankingResults = createRankedPatternResults({ patterns })
  const tileRecommendations = createTileRecommendations(options.tileIds)
  
  const recommendedPatterns: PatternRecommendation[] = patterns.map((pattern, index) => ({
    pattern,
    confidence: 0.85 - (index * 0.1),
    totalScore: 85 - (index * 10),
    completionPercentage: 60 - (index * 10),
    reasoning: `Pattern ${index + 1} analysis`,
    difficulty: pattern.difficulty,
    isPrimary: index === 0,
    scoreBreakdown: {
      currentTileScore: 32 - (index * 4),
      availabilityScore: 28 - (index * 4),
      jokerScore: 15 - (index * 3),
      priorityScore: 10 - (index * 1)
    },
    analysis: {
      currentTiles: {
        count: 7 - index,
        percentage: 60 - (index * 10),
        matchingGroups: [`Group ${index + 1}A`, `Group ${index + 1}B`]
      },
      missingTiles: {
        total: 7 + index,
        byAvailability: {
          easy: [`${index + 1}B`, `${index + 2}C`],
          moderate: [`${index + 3}D`],
          difficult: [`${index + 4}B`],
          impossible: []
        }
      },
      jokerSituation: {
        available: 2,
        needed: Math.max(0, 3 - index),
        canComplete: true,
        substitutionPlan: {}
      },
      strategicValue: {
        tilePriorities: { [`${index + 1}B`]: 9 - index, [`${index + 2}C`]: 8 - index },
        groupPriorities: { [`Group${index + 1}`]: 8 - index },
        overallPriority: 0.8 - (index * 0.1),
        reasoning: [`High completion potential for pattern ${index + 1}`]
      },
      gameState: {
        wallTilesRemaining: 85,
        turnsEstimated: 8 + (index * 2),
        drawProbability: 0.6 - (index * 0.1)
      }
    },
    recommendations: {
      shouldPursue: index < 2,
      alternativePatterns: [],
      strategicNotes: [`Focus on pattern ${index + 1}`],
      riskFactors: index > 0 ? [`Risk factor ${index}`] : []
    }
  }))
  
  const bestPatterns = patterns.map(pattern => ({
    patternId: pattern.id,
    section: pattern.section,
    line: pattern.line,
    pattern: pattern.pattern,
    groups: pattern.groups,
    completionPercentage: 60,
    tilesNeeded: 7,
    missingTiles: [],
    confidenceScore: 0.8,
    difficulty: pattern.difficulty,
    estimatedTurns: 8,
    riskLevel: 'low' as const,
    strategicValue: 0.75
  }))
  
  return {
    overallScore: options.overallScore || rankingResults.topRecommendations[0]?.totalScore || 85,
    recommendedPatterns,
    bestPatterns,
    tileRecommendations,
    strategicAdvice: [
      'Focus on primary pattern completion',
      'Consider Charleston tile passing strategy',
      'Monitor opponent discards for opportunities'
    ],
    threats: [],
    lastUpdated: Date.now(),
    analysisVersion: 'AV3-ThreeEngine',
    engine1Facts: analysisFacts
  }
}

/**
 * Create GameContext for Engine 1
 */
export function createGameContext(options: {
  jokersInHand?: number
  wallTilesRemaining?: number
  discardPile?: string[]
  exposedTiles?: { [playerId: string]: string[] }
  currentPhase?: 'charleston' | 'gameplay'
} = {}): GameContext {
  return {
    jokersInHand: options.jokersInHand || 1,
    wallTilesRemaining: options.wallTilesRemaining || 85,
    discardPile: options.discardPile || ['7B', '8C', '9D'],
    exposedTiles: options.exposedTiles || {
      'player-2': ['1B', '1B', '1B'],
      'player-3': ['red', 'red', 'red', 'red']
    },
    currentPhase: options.currentPhase || 'gameplay'
  }
}

/**
 * Predefined analysis presets for common test scenarios
 */
export const AnalysisPresets = {
  // High-scoring analysis (excellent patterns)
  excellent: () => createHandAnalysis({
    analysisFacts: [
      createAnalysisFacts({ tilesMatched: 10, completionRatio: 0.75 }),
      createAnalysisFacts({ tilesMatched: 8, completionRatio: 0.6 })
    ],
    overallScore: 92
  }),
  
  // Medium-scoring analysis (good patterns)
  good: () => createHandAnalysis({
    analysisFacts: [
      createAnalysisFacts({ tilesMatched: 7, completionRatio: 0.5 }),
      createAnalysisFacts({ tilesMatched: 5, completionRatio: 0.35 })
    ],
    overallScore: 75
  }),
  
  // Low-scoring analysis (poor patterns)
  poor: () => createHandAnalysis({
    analysisFacts: [
      createAnalysisFacts({ tilesMatched: 3, completionRatio: 0.2 }),
      createAnalysisFacts({ tilesMatched: 2, completionRatio: 0.15 })
    ],
    overallScore: 45
  }),
  
  // Empty analysis (no viable patterns)
  empty: () => ({
    overallScore: 0,
    recommendedPatterns: [],
    bestPatterns: [],
    tileRecommendations: [],
    strategicAdvice: ['No viable patterns detected'],
    threats: [],
    lastUpdated: Date.now(),
    analysisVersion: 'AV3-ThreeEngine',
    engine1Facts: []
  }) as HandAnalysis,
  
  // Charleston-focused analysis
  charleston: () => createHandAnalysis({
    tileIds: ['7B', '8C', '9D', '1B', '2C'], // Mix of keep/pass tiles
    analysisFacts: [
      createAnalysisFacts({ 
        patternId: '2025-CHARLESTON_TEST-1',
        tilesMatched: 5,
        completionRatio: 0.35
      })
    ]
  }),
  
  // Basic analysis (default/middle-ground)
  basic: () => createHandAnalysis({
    analysisFacts: [
      createAnalysisFacts({ tilesMatched: 6, completionRatio: 0.4 }),
      createAnalysisFacts({ tilesMatched: 4, completionRatio: 0.28 })
    ],
    overallScore: 68
  }),
  
  // Comprehensive analysis (detailed breakdown)
  comprehensive: () => createHandAnalysis({
    analysisFacts: [
      createAnalysisFacts({ tilesMatched: 9, completionRatio: 0.65 }),
      createAnalysisFacts({ tilesMatched: 7, completionRatio: 0.5 }),
      createAnalysisFacts({ tilesMatched: 5, completionRatio: 0.35 })
    ],
    overallScore: 88,
    patterns: [
      createPatternSelection({ id: 1, points: 30 }),
      createPatternSelection({ id: 2, points: 25 }),
      createPatternSelection({ id: 3, points: 20 })
    ]
  })
}

/**
 * Helper functions for analysis data manipulation in tests
 */
export const AnalysisHelpers = {
  // Create analysis facts with specific completion ratios
  withCompletion: (patternId: string, completionRatio: number) => 
    createAnalysisFacts({
      patternId,
      tilesMatched: Math.floor(14 * completionRatio),
      completionRatio
    }),
  
  // Create tile contributions for specific tiles
  withTileContributions: (tileIds: string[]) => 
    tileIds.map(tileId => ({
      tileId,
      positionsInPattern: [0],
      isRequired: true,
      isCritical: Math.random() > 0.5,
      canBeReplaced: Math.random() > 0.7
    })),
  
  // Create analysis with specific strategic advice
  withAdvice: (advice: string[]) => ({
    ...createHandAnalysis(),
    strategicAdvice: advice
  })
}