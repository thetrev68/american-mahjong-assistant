import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nmjlService } from '../nmjl-service'

// Mock data that matches expected structure
const mockNMJLData = [
  {
    Year: 2025,
    Section: 2025,
    Line: 1,
    'Pattern ID': 1,
    Hands_Key: '2025-2025-1-1',
    Hand_Pattern: '1D 2D 3D 1B 2B 3B 1C 2C 3C EE SS',
    Hand_Description: 'CONSECUTIVE RUN - SAME SUIT',
    Hand_Points: 25,
    Hand_Conceiled: false,
    Hand_Difficulty: 'easy',
    Hand_Notes: null,
    Groups: [
      {
        Group: 'G1',
        Suit_Role: 'dots',
        Suit_Note: null,
        Constraint_Type: 'sequence',
        Constraint_Values: '1,2,3',
        Constraint_Must_Match: null,
        Constraint_Extra: null,
        Jokers_Allowed: false,
        display_color: 'blue'
      },
      {
        Group: 'G2',
        Suit_Role: 'winds',
        Suit_Note: null,
        Constraint_Type: 'pung',
        Constraint_Values: 'east',
        Constraint_Must_Match: null,
        Constraint_Extra: null,
        Jokers_Allowed: false,
        display_color: 'red'
      }
    ]
  },
  {
    Year: 2025,
    Section: 'ANY LIKE NUMBERS',
    Line: 2,
    'Pattern ID': 2,
    Hands_Key: '2025-ANY LIKE NUMBERS-2-2',
    Hand_Pattern: '1111 2222 3333 WW joker',
    Hand_Description: 'FOUR OF A KIND - LIKE NUMBERS',
    Hand_Points: 35,
    Hand_Conceiled: true,
    Hand_Difficulty: 'hard',
    Hand_Notes: 'Use jokers wisely',
    Groups: [
      {
        Group: 'G1',
        Suit_Role: 'any',
        Suit_Note: null,
        Constraint_Type: 'kong',
        Constraint_Values: '1',
        Constraint_Must_Match: null,
        Constraint_Extra: null,
        Jokers_Allowed: true,
        display_color: 'green'
      }
    ]
  }
]

describe('NMJL Service', () => {
  beforeEach(() => {
    // Reset the service state and mock fetch
    vi.resetAllMocks()
    
    // Mock successful fetch response
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockNMJLData),
      })
    ) as any
    
    // Reset the internal loaded state by creating a fresh instance
    // This is a bit hacky but necessary for testing the singleton
    ;(nmjlService as any).loaded = false
    ;(nmjlService as any).patterns = []
  })

  describe('Pattern Loading', () => {
    it('should load and normalize patterns correctly', async () => {
      const patterns = await nmjlService.getAllPatterns()
      
      expect(fetch).toHaveBeenCalledWith('/intelligence/nmjl-patterns/nmjl-card-2025.json')
      expect(patterns).toHaveLength(2)
      
      const pattern1 = patterns[0]
      expect(pattern1.Year).toBe(2025)
      expect(pattern1.Section).toBe(2025)
      expect(pattern1['Pattern ID']).toBe(1)
      expect(pattern1.Hand_Points).toBe(25)
      expect(pattern1.Groups).toHaveLength(2)
    })

    it('should handle fetch errors gracefully', async () => {
      global.fetch = vi.fn(() =>
        Promise.reject(new Error('Network error'))
      ) as any
      
      const patterns = await nmjlService.getAllPatterns()
      expect(patterns).toEqual([])
    })

    it('should handle invalid response status', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          statusText: 'Not Found',
        })
      ) as any
      
      const patterns = await nmjlService.getAllPatterns()
      expect(patterns).toEqual([])
    })

    it('should cache patterns after first load', async () => {
      // First call
      await nmjlService.getAllPatterns()
      expect(fetch).toHaveBeenCalledTimes(1)
      
      // Second call should use cache
      await nmjlService.getAllPatterns()
      expect(fetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('Pattern Queries', () => {
    beforeEach(async () => {
      await nmjlService.getAllPatterns() // Load patterns first
    })

    it('should get pattern by ID', async () => {
      const pattern = await nmjlService.getPatternById(1)
      
      expect(pattern).toBeDefined()
      expect(pattern?.['Pattern ID']).toBe(1)
      expect(pattern?.Hand_Description).toBe('CONSECUTIVE RUN - SAME SUIT')
    })

    it('should return undefined for non-existent pattern ID', async () => {
      const pattern = await nmjlService.getPatternById(999)
      expect(pattern).toBeUndefined()
    })

    it('should filter patterns by difficulty', async () => {
      const easyPatterns = await nmjlService.getPatternsByDifficulty('easy')
      const hardPatterns = await nmjlService.getPatternsByDifficulty('hard')
      
      expect(easyPatterns).toHaveLength(1)
      expect(easyPatterns[0].Hand_Difficulty).toBe('easy')
      
      expect(hardPatterns).toHaveLength(1)
      expect(hardPatterns[0].Hand_Difficulty).toBe('hard')
    })

    it('should filter patterns by points', async () => {
      const patterns25 = await nmjlService.getPatternsByPoints(25)
      const patterns35 = await nmjlService.getPatternsByPoints(35)
      
      expect(patterns25).toHaveLength(1)
      expect(patterns25[0].Hand_Points).toBe(25)
      
      expect(patterns35).toHaveLength(1)
      expect(patterns35[0].Hand_Points).toBe(35)
    })
  })

  describe('Selection Options', () => {
    beforeEach(async () => {
      await nmjlService.getAllPatterns() // Load patterns first
    })

    it('should generate correct selection options', async () => {
      const options = await nmjlService.getSelectionOptions()
      
      expect(options).toHaveLength(2)
      
      const option1 = options[0]
      expect(option1.id).toBe('2025-2025-1-1')
      expect(option1.patternId).toBe(1)
      expect(option1.displayName).toBe('2025 #1: CONSECUTIVE RUN - SAME SUIT')
      expect(option1.points).toBe(25)
      expect(option1.difficulty).toBe('easy')
      expect(option1.allowsJokers).toBe(false)
      expect(option1.concealed).toBe(false)
      expect(option1.section).toBe(2025)
      expect(option1.line).toBe(1)
      
      const option2 = options[1]
      expect(option2.allowsJokers).toBe(true)
      expect(option2.concealed).toBe(true)
      expect(option2.section).toBe('ANY LIKE NUMBERS')
    })

    it('should include groups in selection options', async () => {
      const options = await nmjlService.getSelectionOptions()
      
      expect(options[0].groups).toHaveLength(2)
      expect(options[1].groups).toHaveLength(1)
    })
  })

  describe('Statistics', () => {
    beforeEach(async () => {
      await nmjlService.getAllPatterns() // Load patterns first
    })

    it('should generate correct statistics', async () => {
      const stats = await nmjlService.getStats()
      
      expect(stats.totalPatterns).toBe(2)
      expect(stats.pointDistribution).toEqual({ '25': 1, '35': 1 })
      expect(stats.difficultyDistribution).toEqual({ 'easy': 1, 'hard': 1 })
      expect(stats.jokerPatterns).toBe(1)
      expect(stats.sectionsUsed).toBe(2)
    })
  })

  describe('Data Validation', () => {
    it('should filter out invalid patterns', async () => {
      const invalidData = [
        mockNMJLData[0], // Valid
        { invalid: 'pattern' }, // Invalid - missing required fields
        mockNMJLData[1], // Valid
        null, // Invalid - null
        { 'Pattern ID': 3 }, // Invalid - missing other required fields
      ]
      
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(invalidData),
        })
      ) as any
      
      const patterns = await nmjlService.getAllPatterns()
      expect(patterns).toHaveLength(2) // Only valid patterns should be included
    })

    it('should normalize difficulty values', async () => {
      const dataWithBadDifficulty = [{
        ...mockNMJLData[0],
        Hand_Difficulty: 'INVALID_DIFFICULTY'
      }]
      
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(dataWithBadDifficulty),
        })
      ) as any
      
      const patterns = await nmjlService.getAllPatterns()
      expect(patterns[0].Hand_Difficulty).toBe('medium') // Should default to medium
    })

    it('should handle missing group data gracefully', async () => {
      const dataWithBadGroups = [{
        ...mockNMJLData[0],
        Groups: [null, { invalid: 'group' }, mockNMJLData[0].Groups[0]]
      }]
      
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(dataWithBadGroups),
        })
      ) as any
      
      const patterns = await nmjlService.getAllPatterns()
      expect(patterns[0].Groups).toHaveLength(3) // Should normalize invalid groups
      expect(patterns[0].Groups[0].Group).toBe('') // Default values
      expect(patterns[0].Groups[2].Group).toBe('G1') // Valid group preserved
    })
  })
})