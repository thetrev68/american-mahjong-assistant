// Lazy Loading Analysis Engine Wrapper
// Code-splits the heavy analysis engines to reduce initial bundle size

import type { PlayerTile, PatternSelectionOption } from 'shared-types'

let analysisEngineClass: typeof import('./analysis-engine').AnalysisEngine | null = null
let analysisEnginePromise: Promise<typeof import('./analysis-engine').AnalysisEngine> | null = null

/**
 * Lazy loads the AnalysisEngine class to reduce initial bundle size
 */
export const getAnalysisEngine = () => {
  console.log('🎯 getAnalysisEngine called - analysisEngineClass:', !!analysisEngineClass, 'analysisEnginePromise:', !!analysisEnginePromise)

  if (analysisEngineClass) {
    console.log('✅ Returning cached AnalysisEngine class synchronously')
    // Return synchronously to avoid microtask delay that can be interrupted by React Strict Mode
    return Promise.resolve(analysisEngineClass)
  }

  if (analysisEnginePromise) {
    console.log('⏳ Waiting for existing import promise...')
    // Add timeout to existing promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        console.error('⏰ Module-level import timeout - resetting')
        analysisEnginePromise = null
        reject(new Error('Module import timeout'))
      }, 3000)
    })
    return Promise.race([analysisEnginePromise, timeoutPromise])
  }

  console.log('🆕 Creating new import promise...')
  analysisEnginePromise = (async () => {
    console.log('🔄 Starting dynamic import of analysis-engine...')
    const module = await import('./analysis-engine')
    console.log('✅ Dynamic import completed, extracting AnalysisEngine class...')
    const { AnalysisEngine } = module
    analysisEngineClass = AnalysisEngine
    console.log('✅ AnalysisEngine class cached successfully')
    return AnalysisEngine
  })().catch(error => {
    console.error('❌ Dynamic import failed, resetting promise:', error)
    // Reset on failure so next call can retry
    analysisEnginePromise = null
    throw error
  })

  return analysisEnginePromise
}

/**
 * Lightweight wrapper that provides the same interface but loads the engine lazily
 */
export class LazyAnalysisEngine {
  private enginePromise: Promise<typeof import('./analysis-engine').AnalysisEngine> | null = null

  private getEngineClassSync() {
    // Check if already cached at module level - return synchronously if so
    if (analysisEngineClass) {
      console.log('✅ Got cached AnalysisEngine class synchronously')
      return analysisEngineClass
    }
    console.log('⚠️ AnalysisEngine not cached - need async load')
    return null
  }

  private getEngineClass() {
    console.log('🔄 Getting engine class (async)...')
    return getAnalysisEngine()
  }

  async analyzeHand(hand: PlayerTile[], availablePatterns?: PatternSelectionOption[], gameContext?: Partial<import('../../features/intelligence-panel/services/pattern-analysis-engine').GameContext>, isPatternSwitching?: boolean) {
    console.log('🔄 LazyAnalysisEngine.analyzeHand: Getting engine class...')

    // Try synchronous path first to avoid microtask delay
    let EngineClass = this.getEngineClassSync()
    if (!EngineClass) {
      console.log('🔄 Falling back to async engine load...')
      EngineClass = await this.getEngineClass()
    }

    console.log('✅ LazyAnalysisEngine.analyzeHand: Engine class loaded, calling analyzeHand...')
    const result = await EngineClass.analyzeHand(hand, availablePatterns, gameContext, isPatternSwitching)
    console.log('✅ LazyAnalysisEngine.analyzeHand: AnalysisEngine.analyzeHand completed')
    return result
  }

  async clearCacheForHandChange(oldTileIds: string[], newTileIds: string[]) {
    const EngineClass = await this.getEngineClass()
    return EngineClass.clearCacheForHandChange(oldTileIds, newTileIds)
  }
}

// Export a singleton instance
export const lazyAnalysisEngine = new LazyAnalysisEngine()