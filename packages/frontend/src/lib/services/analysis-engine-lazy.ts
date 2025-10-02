// Lazy Loading Analysis Engine Wrapper
// Code-splits the heavy analysis engines to reduce initial bundle size

import type { PlayerTile, PatternSelectionOption } from 'shared-types'

let analysisEngineClass: typeof import('./analysis-engine').AnalysisEngine | null = null
let analysisEnginePromise: Promise<typeof import('./analysis-engine').AnalysisEngine> | null = null

/**
 * Lazy loads the AnalysisEngine class to reduce initial bundle size
 */
export const getAnalysisEngine = async () => {
  // Return cached class if available
  if (analysisEngineClass) {
    return analysisEngineClass
  }

  // If already loading, wait for that promise
  if (analysisEnginePromise) {
    return analysisEnginePromise
  }

  // Start new load
  analysisEnginePromise = (async () => {
    const { AnalysisEngine } = await import('./analysis-engine')
    analysisEngineClass = AnalysisEngine
    return AnalysisEngine
  })()

  return analysisEnginePromise
}

/**
 * Lightweight wrapper that provides the same interface but loads the engine lazily
 */
export class LazyAnalysisEngine {
  analyzeHand(hand: PlayerTile[], availablePatterns?: PatternSelectionOption[], gameContext?: Partial<import('../../features/intelligence-panel/services/pattern-analysis-engine').GameContext>, isPatternSwitching?: boolean) {
    // Engine is preloaded in main.tsx, so it's always cached - use synchronously to avoid async deadlock
    if (!analysisEngineClass) {
      throw new Error('Analysis engine not preloaded - this should never happen')
    }

    console.log('🔄 LazyAnalysisEngine: Using cached engine class')
    const result = analysisEngineClass.analyzeHand(hand, availablePatterns, gameContext, isPatternSwitching)
    console.log('🔄 LazyAnalysisEngine: Result from cached engine:', typeof result, 'isPromise:', result instanceof Promise)
    return result
  }

  async clearCacheForHandChange(oldTileIds: string[], newTileIds: string[]) {
    // Check if already cached - if so, use synchronously
    if (analysisEngineClass) {
      return analysisEngineClass.clearCacheForHandChange(oldTileIds, newTileIds)
    }

    // Not cached, need to load asynchronously
    const EngineClass = await getAnalysisEngine()
    return EngineClass.clearCacheForHandChange(oldTileIds, newTileIds)
  }
}

// Export a singleton instance
export const lazyAnalysisEngine = new LazyAnalysisEngine()