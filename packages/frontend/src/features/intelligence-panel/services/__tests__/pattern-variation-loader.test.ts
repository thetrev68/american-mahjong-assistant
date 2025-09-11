import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PatternVariationLoader, type PatternVariation, type PatternIndex } from '../pattern-variation-loader'

// Mock fetch globally for all tests
const mockFetch = vi.fn()
global.fetch = mockFetch

// Sample test data matching the expected structure
const mockVariations: PatternVariation[] = [
  {
    year: 2025,
    section: 'SINGLES_AND_PAIRS',
    line: 1,
    patternId: 1,
    handKey: '2025-SINGLES_AND_PAIRS-1',
    handPattern: 'FF 11 22 33 44 55 66',
    handCriteria: '2 flowers, pairs',
    handPoints: 25,
    handConcealed: true,
    sequence: 1,
    tiles: ['f1', 'f2', '1B', '1B', '2B', '2B', '3B', '3B', '4B', '4B', '5B', '5B', '6B', '6B'],
    jokers: new Array(14).fill(false)
  },
  {
    year: 2025,
    section: 'SINGLES_AND_PAIRS',
    line: 1,
    patternId: 1,
    handKey: '2025-SINGLES_AND_PAIRS-1',
    handPattern: 'FF 11 22 33 44 55 66',
    handCriteria: '2 flowers, pairs',
    handPoints: 25,
    handConcealed: true,
    sequence: 2,
    tiles: ['f3', 'f4', '1C', '1C', '2C', '2C', '3C', '3C', '4C', '4C', '5C', '5C', '6C', '6C'],
    jokers: new Array(14).fill(false)
  },
  {
    year: 2025,
    section: 'CONSECUTIVE_RUN',
    line: 2,
    patternId: 2,
    handKey: '2025-CONSECUTIVE_RUN-2',
    handPattern: 'FFFF 1234567',
    handCriteria: '4 flowers, consecutive run',
    handPoints: 30,
    handConcealed: false,
    sequence: 1,
    tiles: ['f1', 'f2', 'f3', 'f4', '1B', '2B', '3B', '4B', '5B', '6B', '7B', 'joker', 'joker', 'joker'],
    jokers: [false, false, false, false, false, false, false, false, false, false, false, true, true, true]
  }
]

const mockIndex: PatternIndex = {
  byPattern: {
    '2025-SINGLES_AND_PAIRS-1': [mockVariations[0], mockVariations[1]],
    '2025-CONSECUTIVE_RUN-2': [mockVariations[2]]
  },
  bySection: {
    'SINGLES_AND_PAIRS': [mockVariations[0], mockVariations[1]],
    'CONSECUTIVE_RUN': [mockVariations[2]]
  },
  statistics: {
    totalVariations: 3,
    uniquePatterns: 2,
    uniqueSections: 2,
    patternCounts: {
      '2025-SINGLES_AND_PAIRS-1': 2,
      '2025-CONSECUTIVE_RUN-2': 1
    },
    sectionCounts: {
      'SINGLES_AND_PAIRS': 2,
      'CONSECUTIVE_RUN': 1
    }
  }
}

describe('PatternVariationLoader', () => {
  beforeEach(() => {
    // Reset the loader state before each test
    PatternVariationLoader['variations'] = []
    PatternVariationLoader['index'] = null
    PatternVariationLoader['isLoaded'] = false
    PatternVariationLoader['loadPromise'] = null
    
    // Reset mocks
    vi.clearAllMocks()
    
    // Set up successful mock responses by default
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('pattern-variations.json')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockVariations)
        })
      } else if (url.includes('pattern-index.json')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockIndex)
        })
      }
      return Promise.reject(new Error('Unknown URL'))
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Data Loading', () => {
    it('should load variations and index successfully', async () => {
      await PatternVariationLoader.loadVariations()

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(mockFetch).toHaveBeenCalledWith('/intelligence/nmjl-patterns/pattern-variations.json')
      expect(mockFetch).toHaveBeenCalledWith('/intelligence/nmjl-patterns/pattern-index.json')
      expect(PatternVariationLoader.isDataLoaded()).toBe(true)
    })

    it('should return cached data on subsequent loads', async () => {
      // First load
      await PatternVariationLoader.loadVariations()
      expect(mockFetch).toHaveBeenCalledTimes(2)

      // Second load should use cache
      await PatternVariationLoader.loadVariations()
      expect(mockFetch).toHaveBeenCalledTimes(2) // No additional calls
    })

    it('should handle concurrent load requests', async () => {
      // Start multiple concurrent loads
      const promises = [
        PatternVariationLoader.loadVariations(),
        PatternVariationLoader.loadVariations(),
        PatternVariationLoader.loadVariations()
      ]

      await Promise.all(promises)

      // Should only make one set of fetch calls despite multiple requests
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(PatternVariationLoader.isDataLoaded()).toBe(true)
    })

    it('should handle variations fetch failure', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('pattern-variations.json')) {
          return Promise.resolve({
            ok: false,
            status: 404
          })
        } else if (url.includes('pattern-index.json')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockIndex)
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      await expect(PatternVariationLoader.loadVariations())
        .rejects.toThrow('Could not load pattern variation data')
      
      expect(PatternVariationLoader.isDataLoaded()).toBe(false)
    })

    it('should handle index fetch failure', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('pattern-variations.json')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockVariations)
          })
        } else if (url.includes('pattern-index.json')) {
          return Promise.resolve({
            ok: false,
            status: 500
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      await expect(PatternVariationLoader.loadVariations())
        .rejects.toThrow('Could not load pattern variation data')
      
      expect(PatternVariationLoader.isDataLoaded()).toBe(false)
    })

    it('should handle JSON parsing errors', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('pattern-variations.json')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.reject(new Error('Invalid JSON'))
          })
        } else if (url.includes('pattern-index.json')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockIndex)
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      await expect(PatternVariationLoader.loadVariations())
        .rejects.toThrow('Could not load pattern variation data')
      
      expect(PatternVariationLoader.isDataLoaded()).toBe(false)
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      await expect(PatternVariationLoader.loadVariations())
        .rejects.toThrow('Could not load pattern variation data')
      
      expect(PatternVariationLoader.isDataLoaded()).toBe(false)
    })
  })

  describe('Data Retrieval', () => {
    beforeEach(async () => {
      // Ensure data is loaded for retrieval tests
      await PatternVariationLoader.loadVariations()
    })

    it('should get all variations', async () => {
      const variations = await PatternVariationLoader.getAllVariations()
      
      expect(variations).toHaveLength(3)
      expect(variations).toEqual(mockVariations)
    })

    it('should get variations by pattern ID', async () => {
      const variations = await PatternVariationLoader.getPatternVariations('2025-SINGLES_AND_PAIRS-1')
      
      expect(variations).toHaveLength(2)
      expect(variations.every(v => v.handKey === '2025-SINGLES_AND_PAIRS-1')).toBe(true)
    })

    it('should return empty array for non-existent pattern', async () => {
      const variations = await PatternVariationLoader.getPatternVariations('non-existent-pattern')
      
      expect(variations).toHaveLength(0)
    })

    it('should get variations by section', async () => {
      const variations = await PatternVariationLoader.getSectionVariations('SINGLES_AND_PAIRS')
      
      expect(variations).toHaveLength(2)
      expect(variations.every(v => v.section === 'SINGLES_AND_PAIRS')).toBe(true)
    })

    it('should return empty array for non-existent section', async () => {
      const variations = await PatternVariationLoader.getSectionVariations('NON_EXISTENT')
      
      expect(variations).toHaveLength(0)
    })

    it('should get specific variation by handKey and sequence', async () => {
      const variation = await PatternVariationLoader.getVariation('2025-SINGLES_AND_PAIRS-1', 2)
      
      expect(variation).toBeDefined()
      expect(variation?.handKey).toBe('2025-SINGLES_AND_PAIRS-1')
      expect(variation?.sequence).toBe(2)
      expect(variation?.tiles).toEqual(['f3', 'f4', '1C', '1C', '2C', '2C', '3C', '3C', '4C', '4C', '5C', '5C', '6C', '6C'])
    })

    it('should return null for non-existent variation', async () => {
      const variation = await PatternVariationLoader.getVariation('non-existent', 1)
      
      expect(variation).toBeNull()
    })

    it('should return null for invalid sequence number', async () => {
      const variation = await PatternVariationLoader.getVariation('2025-SINGLES_AND_PAIRS-1', 999)
      
      expect(variation).toBeNull()
    })
  })

  describe('Data Filtering', () => {
    beforeEach(async () => {
      await PatternVariationLoader.loadVariations()
    })

    it('should filter by sections', async () => {
      const variations = await PatternVariationLoader.filterVariations({
        sections: ['CONSECUTIVE_RUN']
      })
      
      expect(variations).toHaveLength(1)
      expect(variations[0].section).toBe('CONSECUTIVE_RUN')
    })

    it('should filter by patterns', async () => {
      const variations = await PatternVariationLoader.filterVariations({
        patterns: ['2025-SINGLES_AND_PAIRS-1']
      })
      
      expect(variations).toHaveLength(2)
      expect(variations.every(v => v.handKey === '2025-SINGLES_AND_PAIRS-1')).toBe(true)
    })

    it('should filter by minimum points', async () => {
      const variations = await PatternVariationLoader.filterVariations({
        minPoints: 30
      })
      
      expect(variations).toHaveLength(1)
      expect(variations[0].handPoints).toBe(30)
    })

    it('should filter by maximum points', async () => {
      const variations = await PatternVariationLoader.filterVariations({
        maxPoints: 25
      })
      
      expect(variations).toHaveLength(2)
      expect(variations.every(v => v.handPoints <= 25)).toBe(true)
    })

    it('should filter by concealed status', async () => {
      const concealedVariations = await PatternVariationLoader.filterVariations({
        concealed: true
      })
      
      expect(concealedVariations).toHaveLength(2)
      expect(concealedVariations.every(v => v.handConcealed === true)).toBe(true)

      const exposedVariations = await PatternVariationLoader.filterVariations({
        concealed: false
      })
      
      expect(exposedVariations).toHaveLength(1)
      expect(exposedVariations[0].handConcealed).toBe(false)
    })

    it('should combine multiple filter criteria', async () => {
      const variations = await PatternVariationLoader.filterVariations({
        sections: ['SINGLES_AND_PAIRS'],
        minPoints: 20,
        maxPoints: 30,
        concealed: true
      })
      
      expect(variations).toHaveLength(2)
      expect(variations.every(v => 
        v.section === 'SINGLES_AND_PAIRS' &&
        v.handPoints >= 20 &&
        v.handPoints <= 30 &&
        v.handConcealed === true
      )).toBe(true)
    })

    it('should return empty array when no variations match criteria', async () => {
      const variations = await PatternVariationLoader.filterVariations({
        sections: ['NON_EXISTENT'],
        minPoints: 1000
      })
      
      expect(variations).toHaveLength(0)
    })

    it('should handle empty filter criteria', async () => {
      const variations = await PatternVariationLoader.filterVariations({})
      
      expect(variations).toHaveLength(3) // All variations
    })
  })

  describe('Statistics and Utilities', () => {
    beforeEach(async () => {
      await PatternVariationLoader.loadVariations()
    })

    it('should provide loading statistics', () => {
      const stats = PatternVariationLoader.getStatistics()
      
      expect(stats).toBeDefined()
      expect(stats?.totalVariations).toBe(3)
      expect(stats?.uniquePatterns).toBe(2)
      expect(stats?.uniqueSections).toBe(2)
      expect(stats?.patternCounts['2025-SINGLES_AND_PAIRS-1']).toBe(2)
      expect(stats?.patternCounts['2025-CONSECUTIVE_RUN-2']).toBe(1)
      expect(stats?.sectionCounts['SINGLES_AND_PAIRS']).toBe(2)
      expect(stats?.sectionCounts['CONSECUTIVE_RUN']).toBe(1)
    })

    it('should return null statistics when not loaded', () => {
      // Reset loader state
      PatternVariationLoader['isLoaded'] = false
      PatternVariationLoader['index'] = null
      
      const stats = PatternVariationLoader.getStatistics()
      expect(stats).toBeNull()
    })

    it('should count tiles correctly', () => {
      const tiles = ['1B', '1B', '2B', '3C', '3C', '3C', 'joker']
      const counts = PatternVariationLoader.countTiles(tiles)
      
      expect(counts).toEqual({
        '1B': 2,
        '2B': 1,
        '3C': 3,
        'joker': 1
      })
    })

    it('should handle empty tile array', () => {
      const counts = PatternVariationLoader.countTiles([])
      expect(counts).toEqual({})
    })

    it('should get unique tile IDs', async () => {
      const uniqueTiles = await PatternVariationLoader.getUniqueTileIds()
      
      expect(uniqueTiles).toContain('1B')
      expect(uniqueTiles).toContain('f1')
      expect(uniqueTiles).toContain('joker')
      expect(uniqueTiles.every((tile, index) => 
        index === 0 || tile >= uniqueTiles[index - 1]
      )).toBe(true) // Should be sorted
      
      // No duplicates
      const uniqueSet = new Set(uniqueTiles)
      expect(uniqueSet.size).toBe(uniqueTiles.length)
    })
  })

  describe('Reload and State Management', () => {
    it('should report correct loading state', async () => {
      expect(PatternVariationLoader.isDataLoaded()).toBe(false)
      
      await PatternVariationLoader.loadVariations()
      expect(PatternVariationLoader.isDataLoaded()).toBe(true)
    })

    it('should reload data when requested', async () => {
      // Initial load
      await PatternVariationLoader.loadVariations()
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(PatternVariationLoader.isDataLoaded()).toBe(true)
      
      // Reload
      await PatternVariationLoader.reload()
      expect(mockFetch).toHaveBeenCalledTimes(4) // Additional 2 calls
      expect(PatternVariationLoader.isDataLoaded()).toBe(true)
    })

    it('should reset state correctly during reload', async () => {
      await PatternVariationLoader.loadVariations()
      
      // Verify data is loaded
      const variationsBefore = await PatternVariationLoader.getAllVariations()
      expect(variationsBefore).toHaveLength(3)
      
      // Change mock data for reload
      const newMockVariations = [mockVariations[0]] // Only one variation
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('pattern-variations.json')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(newMockVariations)
          })
        } else if (url.includes('pattern-index.json')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              ...mockIndex,
              statistics: { ...mockIndex.statistics, totalVariations: 1 }
            })
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })
      
      await PatternVariationLoader.reload()
      
      const variationsAfter = await PatternVariationLoader.getAllVariations()
      expect(variationsAfter).toHaveLength(1)
    })

    it('should handle reload failures gracefully', async () => {
      // Initial successful load
      await PatternVariationLoader.loadVariations()
      expect(PatternVariationLoader.isDataLoaded()).toBe(true)
      
      // Make subsequent fetches fail
      mockFetch.mockRejectedValue(new Error('Network error'))
      
      // Reload should fail but not crash
      await expect(PatternVariationLoader.reload()).rejects.toThrow('Could not load pattern variation data')
      expect(PatternVariationLoader.isDataLoaded()).toBe(false)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle methods called before loading gracefully', async () => {
      // Don't pre-load data for this test
      
      // Methods should trigger loading automatically
      const variations = await PatternVariationLoader.getAllVariations()
      expect(variations).toEqual(mockVariations)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should handle methods called during loading', async () => {
      // Start loading but don't await
      const loadPromise = PatternVariationLoader.loadVariations()
      
      // Call other methods while loading is in progress
      const promises = [
        loadPromise,
        PatternVariationLoader.getAllVariations(),
        PatternVariationLoader.getPatternVariations('test'),
        PatternVariationLoader.getSectionVariations('test')
      ]
      
      await Promise.all(promises)
      
      // Should only make one set of fetch calls
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should handle malformed variations data', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('pattern-variations.json')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve('invalid-data') // Not an array
          })
        } else if (url.includes('pattern-index.json')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockIndex)
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      // Should load without throwing, but with invalid data
      await PatternVariationLoader.loadVariations()
      expect(PatternVariationLoader.isDataLoaded()).toBe(true)
      
      // Subsequent operations should handle the invalid data gracefully
      const variations = await PatternVariationLoader.getAllVariations()
      expect(variations).toBe('invalid-data')
    })

    it('should handle malformed index data', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('pattern-variations.json')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockVariations)
          })
        } else if (url.includes('pattern-index.json')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ invalid: 'index' }) // Invalid structure
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      await PatternVariationLoader.loadVariations()
      
      // Should handle gracefully by returning empty arrays/null
      const patternVariations = await PatternVariationLoader.getPatternVariations('test')
      expect(patternVariations).toEqual([])
      
      const sectionVariations = await PatternVariationLoader.getSectionVariations('test')
      expect(sectionVariations).toEqual([])
      
      const stats = PatternVariationLoader.getStatistics()
      // With invalid index, stats should be null or have undefined properties
      expect(stats === null || stats.patternCounts === undefined).toBe(true)
    })

    it('should handle large number of concurrent requests', async () => {
      const requestCount = 100
      const promises = []
      
      for (let i = 0; i < requestCount; i++) {
        promises.push(PatternVariationLoader.loadVariations())
      }
      
      await Promise.all(promises)
      
      // Should still only make 2 fetch calls despite many concurrent requests
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(PatternVariationLoader.isDataLoaded()).toBe(true)
    })
  })

  describe('Performance and Memory', () => {
    it('should cache data in memory after loading', async () => {
      const start = performance.now()
      await PatternVariationLoader.loadVariations()
      const firstLoadTime = performance.now() - start
      
      // Clear fetch mock calls but keep data cached
      vi.clearAllMocks()
      
      const start2 = performance.now()
      const variations = await PatternVariationLoader.getAllVariations()
      const cachedAccessTime = performance.now() - start2
      
      expect(variations).toHaveLength(3)
      expect(mockFetch).not.toHaveBeenCalled() // No network calls for cached access
      expect(cachedAccessTime).toBeLessThan(firstLoadTime) // Should be much faster
    })

    it('should handle filtering large datasets efficiently', async () => {
      // Create a larger mock dataset
      const largeVariations = []
      for (let i = 0; i < 1000; i++) {
        largeVariations.push({
          ...mockVariations[0],
          sequence: i + 1,
          handKey: `test-pattern-${i % 10}`,
          section: `SECTION_${i % 5}`,
          handPoints: 20 + (i % 10)
        })
      }
      
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('pattern-variations.json')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(largeVariations)
          })
        } else if (url.includes('pattern-index.json')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockIndex)
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      await PatternVariationLoader.loadVariations()
      
      const start = performance.now()
      const filtered = await PatternVariationLoader.filterVariations({
        minPoints: 25,
        sections: ['SECTION_1', 'SECTION_3']
      })
      const filterTime = performance.now() - start
      
      expect(filtered.length).toBeGreaterThan(0)
      expect(filterTime).toBeLessThan(100) // Should filter 1000 items quickly (< 100ms)
    })
  })
})