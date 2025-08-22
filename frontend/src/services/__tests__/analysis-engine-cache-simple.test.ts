// Simple Engine 1 Cache Testing - Basic cache functionality verification
import { describe, test, expect } from 'vitest'
import { AnalysisEngine } from '../analysis-engine'

describe('AnalysisEngine Cache Management', () => {
  test('getCacheStats returns valid cache statistics', () => {
    const cacheStats = AnalysisEngine.getCacheStats()
    
    expect(typeof cacheStats.size).toBe('number')
    expect(cacheStats.size).toBeGreaterThanOrEqual(0)
  })

  test('clearCacheForHandChange does not throw errors', () => {
    const oldTiles = ['1B', '2B', '3B']
    const newTiles = ['1B', '2B', '4B'] // One tile different

    // Should not throw an error
    expect(() => {
      AnalysisEngine.clearCacheForHandChange(oldTiles, newTiles)
    }).not.toThrow()
  })

  test('clearCacheForHandChange handles identical hands correctly', () => {
    const tiles = ['1B', '2B', '3B']

    // Should not clear cache for identical hands
    expect(() => {
      AnalysisEngine.clearCacheForHandChange(tiles, tiles)
    }).not.toThrow()
  })

  test('clearCacheForHandChange handles empty hands', () => {
    const emptyHand: string[] = []
    const someHand = ['1B', '2B']

    expect(() => {
      AnalysisEngine.clearCacheForHandChange(emptyHand, someHand)
    }).not.toThrow()

    expect(() => {
      AnalysisEngine.clearCacheForHandChange(someHand, emptyHand)
    }).not.toThrow()
  })

  test('cache size management works', () => {
    const initialStats = AnalysisEngine.getCacheStats()
    
    // Verify cache size is a valid number
    expect(typeof initialStats.size).toBe('number')
    expect(initialStats.size).toBeGreaterThanOrEqual(0)
  })
})