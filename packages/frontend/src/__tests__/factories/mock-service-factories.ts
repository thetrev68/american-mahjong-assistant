/**
 * Mock Service Factories
 * 
 * Provides consistent mocking patterns for all services used in testing
 * Reduces test setup duplication and ensures consistent mock behavior
 */

import { vi } from 'vitest'
import { PatternVariationLoader } from '../../features/intelligence-panel/services/pattern-variation-loader'
import { nmjlService } from '../../lib/services/nmjl-service'
import { createPatternSet, PatternPresets } from './pattern-factories'
import { createMultipleAnalysisFacts } from './analysis-factories'

/**
 * Mock PatternVariationLoader with consistent test data
 */
export function mockPatternVariationLoader(options: {
  patternCount?: number
  variationsPerPattern?: number
  shouldFail?: boolean
} = {}) {
  const { patterns, variations, index } = PatternPresets.withVariations(
    options.patternCount || 2,
    options.variationsPerPattern || 3
  )
  
  if (options.shouldFail) {
    vi.spyOn(PatternVariationLoader, 'loadVariations').mockRejectedValue(new Error('Failed to load variations'))
    vi.spyOn(PatternVariationLoader, 'getAllVariations').mockRejectedValue(new Error('Failed to load variations'))
    vi.spyOn(PatternVariationLoader, 'getPatternVariations').mockRejectedValue(new Error('Failed to load variations'))
    vi.spyOn(PatternVariationLoader, 'getSectionVariations').mockRejectedValue(new Error('Failed to load variations'))
  } else {
    vi.spyOn(PatternVariationLoader, 'loadVariations').mockResolvedValue(undefined)
    vi.spyOn(PatternVariationLoader, 'getAllVariations').mockResolvedValue(variations)
    vi.spyOn(PatternVariationLoader, 'getPatternVariations').mockImplementation(async (patternId: string) => {
      return index.byPattern[patternId] || []
    })
    vi.spyOn(PatternVariationLoader, 'getSectionVariations').mockImplementation(async (section: string) => {
      return index.bySection[section] || []
    })
  }
  
  vi.spyOn(PatternVariationLoader, 'getStatistics').mockReturnValue(index.statistics)
  vi.spyOn(PatternVariationLoader, 'isDataLoaded').mockReturnValue(!options.shouldFail)
  
  return { patterns, variations, index }
}

/**
 * Mock NMJL Service with consistent test data
 */
export function mockNMJLService(options: {
  patternCount?: number
  shouldFail?: boolean
  errorType?: 'network' | 'validation' | 'parse'
} = {}) {
  const patterns = createPatternSet(options.patternCount || 3)
  const rawPatterns = patterns.map(p => ({
    Year: 2025,
    Section: p.section,
    Line: p.line,
    'Pattern ID': p.patternId,
    Hands_Key: p.id,
    Hand_Pattern: p.pattern,
    Hand_Description: p.description,
    Hand_Points: p.points,
    Hand_Conceiled: p.concealed,
    Hand_Difficulty: p.difficulty,
    Hand_Notes: null,
    Groups: p.groups
  }))
  
  if (options.shouldFail) {
    const errorMessage = options.errorType === 'network' 
      ? 'Network error' 
      : options.errorType === 'validation' 
      ? 'Validation failed' 
      : 'Parse error'
    
    vi.spyOn(nmjlService, 'loadPatterns').mockRejectedValue(new Error(errorMessage))
    vi.spyOn(nmjlService, 'getSelectionOptions').mockRejectedValue(new Error(errorMessage))
  } else {
    vi.spyOn(nmjlService, 'loadPatterns').mockResolvedValue(rawPatterns)
    vi.spyOn(nmjlService, 'getSelectionOptions').mockResolvedValue(patterns)
  }
  
  return { patterns, rawPatterns }
}

/**
 * Mock Socket.io client for networking tests
 */
export function mockSocketIO() {
  const mockSocket = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    connected: true,
    id: 'mock-socket-id'
  }
  
  return mockSocket
}

/**
 * Mock localStorage for persistence tests
 */
export function mockLocalStorage() {
  const storage: { [key: string]: string } = {}
  
  const mockLocalStorage = {
    getItem: vi.fn((key: string) => storage[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      storage[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete storage[key]
    }),
    clear: vi.fn(() => {
      Object.keys(storage).forEach(key => delete storage[key])
    }),
    key: vi.fn((index: number) => Object.keys(storage)[index] || null),
    get length() {
      return Object.keys(storage).length
    }
  }
  
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true
  })
  
  return { mockLocalStorage, storage }
}

/**
 * Mock performance APIs for performance tests
 */
export function mockPerformanceAPIs() {
  const mockPerformance = {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByType: vi.fn(() => []),
    getEntriesByName: vi.fn(() => [])
  }
  
  Object.defineProperty(window, 'performance', {
    value: mockPerformance,
    writable: true
  })
  
  return mockPerformance
}

/**
 * Mock fetch API for HTTP tests
 */
export function mockFetch(responses: { url: string; response: unknown; shouldFail?: boolean }[] = []) {
  const mockFetch = vi.fn()
  
  responses.forEach(({ url, response, shouldFail }) => {
    if (shouldFail) {
      mockFetch.mockImplementationOnce(() => Promise.reject(new Error(`Failed to fetch ${url}`)))
    } else {
      mockFetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(response),
          text: () => Promise.resolve(JSON.stringify(response))
        })
      )
    }
  })
  
  global.fetch = mockFetch
  return mockFetch
}

/**
 * Complete test environment setup
 */
export function setupTestEnvironment(options: {
  mockPatternLoader?: boolean
  mockNMJL?: boolean
  mockStorage?: boolean
  mockPerformance?: boolean
  patternCount?: number
  shouldFailServices?: boolean
} = {}) {
  const mocks: Record<string, unknown> = {}
  
  if (options.mockPatternLoader || options.mockPatternLoader === undefined) {
    mocks.patternLoader = mockPatternVariationLoader({
      patternCount: options.patternCount,
      shouldFail: options.shouldFailServices
    })
  }
  
  if (options.mockNMJL || options.mockNMJL === undefined) {
    mocks.nmjl = mockNMJLService({
      patternCount: options.patternCount,
      shouldFail: options.shouldFailServices
    })
  }
  
  if (options.mockStorage) {
    mocks.storage = mockLocalStorage()
  }
  
  if (options.mockPerformance) {
    mocks.performance = mockPerformanceAPIs()
  }
  
  return mocks
}

/**
 * Cleanup all mocks (call in afterEach)
 */
export function cleanupMocks() {
  vi.clearAllMocks()
  vi.restoreAllMocks()
}

/**
 * Mock Analysis Engines for intelligence system tests
 */
export function mockAnalysisEngines(options: {
  shouldFailEngine1?: boolean
  shouldFailEngine2?: boolean  
  shouldFailEngine3?: boolean
  patternCount?: number
} = {}) {
  const analysisFacts = options.shouldFailEngine1 ? [] : createMultipleAnalysisFacts(options.patternCount || 2)
  
  // Mock Engine 1 (Pattern Analysis Engine) 
  const PatternAnalysisEngine = {
    analyzePatterns: vi.fn().mockImplementation(async () => {
      if (options.shouldFailEngine1) {
        throw new Error('Engine 1 analysis failed')
      }
      return analysisFacts
    })
  }
  
  // Mock Engine 2 (Pattern Ranking Engine)
  const PatternRankingEngine = {
    rankPatterns: vi.fn().mockImplementation(async () => {
      if (options.shouldFailEngine2) {
        throw new Error('Engine 2 ranking failed')
      }
      return {
        topRecommendations: [
          {
            patternId: '2025-TEST_PATTERN-1',
            totalScore: 85,
            confidence: 0.9,
            recommendation: 'excellent',
            components: { currentTileScore: 32, availabilityScore: 28, jokerScore: 15, priorityScore: 10 },
            riskFactors: [],
            strategicValue: 0.85
          }
        ],
        viablePatterns: [],
        switchAnalysis: { shouldSuggestSwitch: false, switchTarget: null, switchReason: '', improvementPercentage: 0 }
      }
    })
  }
  
  // Mock Engine 3 (Tile Recommendation Engine)
  const TileRecommendationEngine = {
    generateRecommendations: vi.fn().mockImplementation(async () => {
      if (options.shouldFailEngine3) {
        throw new Error('Engine 3 recommendations failed')
      }
      return {
        tileActions: [
          { tileId: '1B', primaryAction: 'keep', confidence: 90, reasoning: 'Critical tile', priority: 9 },
          { tileId: '7C', primaryAction: 'pass', confidence: 70, reasoning: 'Low value', priority: 3 }
        ],
        strategicAdvice: ['Focus on primary pattern']
      }
    })
  }
  
  return {
    PatternAnalysisEngine,
    PatternRankingEngine, 
    TileRecommendationEngine,
    analysisFacts
  }
}

/**
 * Common mock configurations for different test scenarios
 */
export const MockPresets = {
  // Basic working mocks for most tests
  basic: () => setupTestEnvironment({
    patternCount: 2,
    shouldFailServices: false
  }),
  
  // Error scenario mocks for error handling tests
  errorScenario: () => setupTestEnvironment({
    patternCount: 0,
    shouldFailServices: true
  }),
  
  // Performance testing mocks
  performance: () => setupTestEnvironment({
    mockPerformance: true,
    patternCount: 10,
    shouldFailServices: false
  }),
  
  // Storage testing mocks
  storage: () => setupTestEnvironment({
    mockStorage: true,
    patternCount: 3,
    shouldFailServices: false
  }),
  
  // Comprehensive mocks for integration tests
  integration: () => {
    const mocks = setupTestEnvironment({
      mockPatternLoader: true,
      mockNMJL: true,
      mockStorage: true,
      patternCount: 3,
      shouldFailServices: false
    })
    
    return {
      ...mocks,
      engines: mockAnalysisEngines({ patternCount: 3 })
    }
  }
}