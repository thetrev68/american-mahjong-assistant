// Lazy Loading Analysis Engine Wrapper
// Code-splits the heavy analysis engines to reduce initial bundle size

import type { PlayerTile, PatternSelectionOption } from 'shared-types'

let analysisEngineClass: typeof import('./analysis-engine').AnalysisEngine | null = null
let analysisEnginePromise: Promise<typeof import('./analysis-engine').AnalysisEngine> | null = null

/**
 * Lazy loads the AnalysisEngine class to reduce initial bundle size
 */
export const getAnalysisEngine = async () => {
  if (analysisEngineClass) {
    return analysisEngineClass
  }

  if (analysisEnginePromise) {
    return analysisEnginePromise
  }

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
  private enginePromise: Promise<typeof import('./analysis-engine').AnalysisEngine> | null = null

  private async getEngineClass() {
    if (!this.enginePromise) {
      this.enginePromise = getAnalysisEngine()
    }
    return this.enginePromise
  }

  async analyzeHand(hand: PlayerTile[], availablePatterns?: PatternSelectionOption[], gameContext?: Partial<import('../../features/intelligence-panel/services/pattern-analysis-engine').GameContext>, isPatternSwitching?: boolean) {
    const EngineClass = await this.getEngineClass()
    return EngineClass.analyzeHand(hand, availablePatterns, gameContext, isPatternSwitching)
  }

  async clearCacheForHandChange(oldTileIds: string[], newTileIds: string[]) {
    const EngineClass = await this.getEngineClass()
    return EngineClass.clearCacheForHandChange(oldTileIds, newTileIds)
  }
}

// Export a singleton instance
export const lazyAnalysisEngine = new LazyAnalysisEngine()