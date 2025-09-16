// Lazy Loading Intelligence Panel Engines
// Code-splits the heavy intelligence engines to reduce initial bundle size

import type { PatternAnalysisEngine as PatternAnalysisEngineType } from './pattern-analysis-engine'

let patternEngineInstance: PatternAnalysisEngineType | null = null
let patternEnginePromise: Promise<PatternAnalysisEngineType> | null = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let opponentEngineInstance: any | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let opponentEnginePromise: Promise<any> | null = null

/**
 * Lazy loads the PatternAnalysisEngine
 */
export const getPatternAnalysisEngine = async (): Promise<PatternAnalysisEngineType> => {
  if (patternEngineInstance) {
    return patternEngineInstance
  }

  if (patternEnginePromise) {
    return patternEnginePromise
  }

  patternEnginePromise = (async () => {
    const { PatternAnalysisEngine } = await import('./pattern-analysis-engine')
    patternEngineInstance = new PatternAnalysisEngine()
    return patternEngineInstance
  })()

  return patternEnginePromise
}

/**
 * Lazy loads the OpponentAnalysisEngine
 */
export const getOpponentAnalysisEngine = async () => {
  if (opponentEngineInstance) {
    return opponentEngineInstance
  }

  if (opponentEnginePromise) {
    return opponentEnginePromise
  }

  opponentEnginePromise = (async () => {
    const { getOpponentAnalysisEngine } = await import('./opponent-analysis-engine')
    opponentEngineInstance = getOpponentAnalysisEngine()
    return opponentEngineInstance
  })()

  return opponentEnginePromise
}

/**
 * Lazy loads the TileRecommendationEngine
 */
export const getTileRecommendationEngine = async () => {
  const { TileRecommendationEngine } = await import('./tile-recommendation-engine')
  return new TileRecommendationEngine()
}

/**
 * Lazy loads the PatternRankingEngine
 */
export const getPatternRankingEngine = async () => {
  const { PatternRankingEngine } = await import('./pattern-ranking-engine')
  return new PatternRankingEngine()
}