import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nmjlService } from '../nmjl-service'

// Mock data based on real NMJL 2025 patterns
const mockNMJLData = [
  {
    Year: 2025,
    Section: 2025,
    Line: 1,
    'Pattern ID': 1,
    Hands_Key: '2025-2025-1-1',
    Hand_Pattern: 'FFFF 2025 222 222',
    Hand_Description: 'Any 3 Suits, Like Pungs 2s or 5s In Opp. Suits',
    Hand_Points: 25,
    Hand_Conceiled: false,
    Hand_Difficulty: 'medium',
    Hand_Notes: null,
    Groups: [
      {
        Group: 'FFFF',
        Suit_Role: 'none',
        Suit_Note: null,
        Constraint_Type: 'kong',
        Constraint_Values: 'flower',
        Constraint_Must_Match: null,
        Constraint_Extra: null,
        Jokers_Allowed: true,
        display_color: 'blue'
      },
      {
        Group: '2025',
        Suit_Role: 'any',
        Suit_Note: null,
        Constraint_Type: 'sequence',
        Constraint_Values: '2,0,2,5',
        Constraint_Must_Match: null,
        Constraint_Extra: null,
        Jokers_Allowed: true,
        display_color: 'green'
      },
      {
        Group: '222_1',
        Suit_Role: 'second',
        Suit_Note: null,
        Constraint_Type: 'pung',
        Constraint_Values: '2,5',
        Constraint_Must_Match: '222_2',
        Constraint_Extra: null,
        Jokers_Allowed: true,
        display_color: 'blue'
      },
      {
        Group: '222_2',
        Suit_Role: 'third',
        Suit_Note: null,
        Constraint_Type: 'pung',
        Constraint_Values: '2,5',
        Constraint_Must_Match: '222_1',
        Constraint_Extra: null,
        Jokers_Allowed: true,
        display_color: 'blue'
      }
    ]
  },
  {
    Year: 2025,
    Section: '2025',
    Line: 2,
    'Pattern ID': 1,
    Hands_Key: '2025-2025-2-1',
    Hand_Pattern: '222 0000 222 5555',
    Hand_Description: 'Any 2 Suits',
    Hand_Points: 25,
    Hand_Conceiled: false,
    Hand_Difficulty: 'medium',
    Hand_Notes: null,
    Groups: [
      {
        Group: '222_1',
        Suit_Role: 'any',
        Suit_Note: null,
        Constraint_Type: 'pung',
        Constraint_Values: 2,
        Constraint_Must_Match: null,
        Constraint_Extra: null,
        Jokers_Allowed: true,
        display_color: 'green'
      },
      {
        Group: '0000',
        Suit_Role: 'none',
        Suit_Note: null,
        Constraint_Type: 'kong',
        Constraint_Values: 'dragon',
        Constraint_Must_Match: null,
        Constraint_Extra: null,
        Jokers_Allowed: true,
        display_color: 'blue'
      },
      {
        Group: '222_2',
        Suit_Role: 'second',
        Suit_Note: null,
        Constraint_Type: 'pung',
        Constraint_Values: 2,
        Constraint_Must_Match: '222_1',
        Constraint_Extra: null,
        Jokers_Allowed: true,
        display_color: 'green'
      },
      {
        Group: '5555',
        Suit_Role: 'second',
        Suit_Note: null,
        Constraint_Type: 'kong',
        Constraint_Values: 5,
        Constraint_Must_Match: '222_1',
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
    ) as unknown as typeof fetch
    
    // Reset the internal loaded state by creating a fresh instance
    // This is a bit hacky but necessary for testing the singleton
    // @ts-expect-error - accessing private properties for testing
    nmjlService.loaded = false
    // @ts-expect-error - accessing private properties for testing
    nmjlService.patterns = []
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
      expect(pattern1.Groups).toHaveLength(4)
    })

    it('should handle fetch errors gracefully', async () => {
      global.fetch = vi.fn(() =>
        Promise.reject(new Error('Network error'))
      ) as unknown as typeof fetch
      
      const patterns = await nmjlService.getAllPatterns()
      expect(patterns).toEqual([])
    })

    it('should handle invalid response status', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          statusText: 'Not Found',
        })
      ) as unknown as typeof fetch
      
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
      expect(pattern?.Hand_Description).toBe('Any 3 Suits, Like Pungs 2s or 5s In Opp. Suits')
    })

    it('should return undefined for non-existent pattern ID', async () => {
      const pattern = await nmjlService.getPatternById(999)
      expect(pattern).toBeUndefined()
    })

    it('should filter patterns by difficulty', async () => {
      const mediumPatterns = await nmjlService.getPatternsByDifficulty('medium')
      const hardPatterns = await nmjlService.getPatternsByDifficulty('hard')
      
      expect(mediumPatterns).toHaveLength(2)
      expect(mediumPatterns[0].Hand_Difficulty).toBe('medium')
      
      expect(hardPatterns).toHaveLength(0)
    })

    it('should filter patterns by points', async () => {
      const patterns25 = await nmjlService.getPatternsByPoints(25)
      const patterns30 = await nmjlService.getPatternsByPoints(30)
      
      expect(patterns25).toHaveLength(2)
      expect(patterns25[0].Hand_Points).toBe(25)
      
      expect(patterns30).toHaveLength(0)
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
      expect(option1.displayName).toBe('2025 #1: ANY 3 SUITS, LIKE PUNGS 2S OR 5S IN OPP. SUITS')
      expect(option1.points).toBe(25)
      expect(option1.difficulty).toBe('medium')
      expect(option1.allowsJokers).toBe(true)
      expect(option1.concealed).toBe(false)
      expect(option1.section).toBe('2025')
      expect(option1.line).toBe(1)
      
      const option2 = options[1]
      expect(option2.allowsJokers).toBe(true)
      expect(option2.concealed).toBe(false)
      expect(option2.section).toBe('2025')
    })

    it('should include groups in selection options', async () => {
      const options = await nmjlService.getSelectionOptions()
      
      expect(options[0].groups).toHaveLength(4)
      expect(options[1].groups).toHaveLength(4)
    })
  })

  describe('Statistics', () => {
    beforeEach(async () => {
      await nmjlService.getAllPatterns() // Load patterns first
    })

    it('should generate correct statistics', async () => {
      const stats = await nmjlService.getStats()
      
      expect(stats.totalPatterns).toBe(2)
      expect(stats.pointDistribution).toEqual({ '25': 2 })
      expect(stats.difficultyDistribution).toEqual({ 'medium': 2 })
      expect(stats.jokerPatterns).toBe(2)
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
      ) as unknown as typeof fetch
      
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
      ) as unknown as typeof fetch
      
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
      ) as unknown as typeof fetch
      
      const patterns = await nmjlService.getAllPatterns()
      expect(patterns[0].Groups).toHaveLength(3) // Should normalize invalid groups
      expect(patterns[0].Groups[0].Group).toBe('') // Default values
      expect(patterns[0].Groups[2].Group).toBe('FFFF') // Valid group preserved
    })
  })
})