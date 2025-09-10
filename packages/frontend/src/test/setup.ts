import '@testing-library/jest-dom'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Global test setup
afterEach(() => {
  cleanup()
})

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(() => null),
    setItem: vi.fn(() => null),
    removeItem: vi.fn(() => null),
    clear: vi.fn(() => null),
  },
  writable: true,
})

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: vi.fn(() => null),
    setItem: vi.fn(() => null),
    removeItem: vi.fn(() => null),
    clear: vi.fn(() => null),
  },
  writable: true,
})

// Mock fetch globally with pattern data support
global.fetch = vi.fn((url: string) => {
  if (typeof url === 'string') {
    // Mock pattern variations and index files
    if (url.includes('/intelligence/nmjl-patterns/pattern-variations.json')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
          {
            "year": 2025,
            "section": "SINGLES_AND_PAIRS",
            "line": 3,
            "patternId": 3,
            "handKey": "2025-SINGLES_AND_PAIRS-3-1",
            "handPattern": "FF DDDD DDDD 33",
            "handCriteria": "Singles And Pairs",
            "handPoints": 25,
            "handConcealed": false,
            "sequence": 1,
            "tiles": ["flower", "flower", "6B", "6B", "6C", "6C", "1B", "1B", "1C", "1C", "2B", "2B", "2C", "2C"],
            "jokers": [false, false, false, false, false, false, true, true, true, true, true, true, true, true]
          }
        ]),
        text: () => Promise.resolve(''),
      })
    } else if (url.includes('/intelligence/nmjl-patterns/pattern-index.json')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          "byPattern": {
            "2025-SINGLES_AND_PAIRS-3-1": [{
              "year": 2025,
              "section": "SINGLES_AND_PAIRS",
              "line": 3,
              "patternId": 3,
              "handKey": "2025-SINGLES_AND_PAIRS-3-1",
              "handPattern": "FF DDDD DDDD 33",
              "handCriteria": "Singles And Pairs",
              "handPoints": 25,
              "handConcealed": false,
              "sequence": 1,
              "tiles": ["flower", "flower", "6B", "6B", "6C", "6C", "1B", "1B", "1C", "1C", "2B", "2B", "2C", "2C"],
              "jokers": [false, false, false, false, false, false, true, true, true, true, true, true, true, true]
            }],
            "2025-CONSECUTIVE_RUN-7-1": [{
              "year": 2025,
              "section": "CONSECUTIVE_RUN",
              "line": 7,
              "patternId": 7,
              "handKey": "2025-CONSECUTIVE_RUN-7-1",
              "handPattern": "1111 2222 3333 FF",
              "handCriteria": "Consecutive Run",
              "handPoints": 30,
              "handConcealed": false,
              "sequence": 1,
              "tiles": ["1B", "1B", "1B", "1B", "2B", "2B", "2B", "2B", "3B", "3B", "3B", "3B", "flower", "flower"],
              "jokers": [true, true, true, true, true, true, true, true, true, true, true, true, false, false]
            }],
            "2025-ANY_LIKE_NUMBERS-2-1": [{
              "year": 2025,
              "section": "ANY_LIKE_NUMBERS",
              "line": 2,
              "patternId": 2,
              "handKey": "2025-ANY_LIKE_NUMBERS-2-1",
              "handPattern": "111 222 333 DDDD",
              "handCriteria": "Any Like Numbers",
              "handPoints": 25,
              "handConcealed": false,
              "sequence": 1,
              "tiles": ["1B", "1C", "1D", "2B", "2C", "2D", "3B", "3C", "3D", "4B", "4B", "4C", "4C", "4D"],
              "jokers": [true, true, true, true, true, true, true, true, true, false, false, false, false, false]
            }],
            "2025-2025-1-1": [{
              "year": 2025,
              "section": "2025",
              "line": 1,
              "patternId": 1,
              "handKey": "2025-2025-1-1",
              "handPattern": "FFFF 2025 222 222",
              "handCriteria": "Any 3 Suits, Like Pungs 2s or 5s In Opp. Suits",
              "handPoints": 25,
              "handConcealed": false,
              "sequence": 1,
              "tiles": ["flower", "flower", "flower", "flower", "2B", "white", "2B", "5B", "2C", "2C", "2C", "2D", "2D", "2D"],
              "jokers": [false, false, false, false, false, false, false, false, true, true, true, true, true, true]
            }],
            "NONEXISTENT_PATTERN-999-1": []
          },
          "bySection": {},
          "statistics": {
            "totalVariations": 4,
            "uniquePatterns": 4,
            "uniqueSections": 4,
            "patternCounts": {},
            "sectionCounts": {}
          }
        }),
        text: () => Promise.resolve(''),
      })
    }
  }
  
  // Default mock for other URLs
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
}) as unknown as typeof fetch

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
})) as unknown as typeof IntersectionObserver

// Mock ResizeObserver
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
})) as unknown as typeof ResizeObserver