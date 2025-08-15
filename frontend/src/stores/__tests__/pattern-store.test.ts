import { describe, it, expect, beforeEach } from 'vitest'
import { usePatternStore } from '../pattern-store'
import type { PatternSelectionOption } from '../../../../shared/nmjl-types'

// Mock pattern data based on real NMJL 2025 patterns
const mockPatterns: PatternSelectionOption[] = [
  {
    id: '2025-2025-1-1',
    patternId: 1,
    displayName: '2025 #1: ANY 3 SUITS, LIKE PUNGS 2S OR 5S IN OPP. SUITS',
    pattern: 'FFFF 2025 222 222',
    points: 25,
    difficulty: 'medium',
    description: 'Any 3 Suits, Like Pungs 2s or 5s In Opp. Suits',
    section: 2025,
    line: 1,
    allowsJokers: true,
    concealed: false,
    groups: [
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
      }
    ]
  },
  {
    id: '2025-2025-2-1',
    patternId: 1, // Same Pattern ID as first but different line
    displayName: '2025 #2: ANY 2 SUITS',
    pattern: '222 0000 222 5555',
    points: 25,
    difficulty: 'medium',
    description: 'Any 2 Suits',
    section: '2025',
    line: 2,
    allowsJokers: true,
    concealed: false,
    groups: [
      {
        Group: '222_1',
        Suit_Role: 'any',
        Suit_Note: null,
        Constraint_Type: 'pung',
        Constraint_Values: '2',
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
      }
    ]
  }
]

describe('Pattern Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = usePatternStore.getState()
    store.clearSelection()
    // Set the selection options directly for testing
    usePatternStore.setState({
      patterns: [], // Not used in current tests
      selectionOptions: mockPatterns,
      isLoading: false,
      error: null,
      selectedPatternId: null,
      targetPatterns: [],
      searchQuery: '',
      difficultyFilter: 'all',
      pointsFilter: 'all',
      jokerFilter: 'all',
      sectionFilter: 'all',
      patternProgress: {}
    })
  })

  describe('Pattern Loading', () => {
    it('should initialize with correct state', () => {
      const store = usePatternStore.getState()
      
      expect(store.selectionOptions).toHaveLength(2)
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('should have selection options set correctly', () => {
      const store = usePatternStore.getState()
      
      expect(store.selectionOptions).toHaveLength(2)
      expect(store.selectionOptions[0].displayName).toBe('2025 #1: ANY 3 SUITS, LIKE PUNGS 2S OR 5S IN OPP. SUITS')
      expect(store.selectionOptions[1].points).toBe(25)
    })
  })

  describe('Pattern Selection', () => {
    it('should select a pattern', () => {
      const store = usePatternStore.getState()
      
      store.selectPattern('2025-2025-1-1')
      
      // Need to get fresh state after mutation
      const updatedStore = usePatternStore.getState()
      expect(updatedStore.selectedPatternId).toBe('2025-2025-1-1')
      expect(updatedStore.getSelectedPattern()).toEqual(mockPatterns[0])
    })

    it('should add target pattern', () => {
      const store = usePatternStore.getState()
      
      store.addTargetPattern('2025-2025-1-1')
      const updatedStore1 = usePatternStore.getState()
      expect(updatedStore1.targetPatterns).toContain('2025-2025-1-1')
      
      store.addTargetPattern('2025-2025-2-1')
      const updatedStore2 = usePatternStore.getState()
      expect(updatedStore2.targetPatterns).toHaveLength(2)
    })

    it('should remove target pattern', () => {
      const store = usePatternStore.getState()
      
      store.addTargetPattern('2025-2025-1-1')
      store.addTargetPattern('2025-2025-2-1')
      const updatedStore1 = usePatternStore.getState()
      expect(updatedStore1.targetPatterns).toHaveLength(2)
      
      store.removeTargetPattern('2025-2025-1-1')
      const updatedStore2 = usePatternStore.getState()
      expect(updatedStore2.targetPatterns).not.toContain('2025-2025-1-1')
      expect(updatedStore2.targetPatterns).toContain('2025-2025-2-1')
    })

    it('should clear all selections', () => {
      const store = usePatternStore.getState()
      
      store.selectPattern('2025-2025-1-1')
      store.addTargetPattern('2025-2025-2-1')
      const updatedStore1 = usePatternStore.getState()
      expect(updatedStore1.selectedPatternId).toBe('2025-2025-1-1')
      expect(updatedStore1.targetPatterns).toHaveLength(2) // 2025-2025-1-1 auto-added + 2025-2025-2-1
      
      store.clearSelection()
      const updatedStore2 = usePatternStore.getState()
      expect(updatedStore2.selectedPatternId).toBeNull()
      expect(updatedStore2.targetPatterns).toHaveLength(0)
    })
  })

  describe('Filtering', () => {
    it('should filter by difficulty', () => {
      const store = usePatternStore.getState()
      
      store.setDifficultyFilter('medium')
      const filtered = store.getFilteredPatterns()
      
      expect(filtered).toHaveLength(2)
      expect(filtered[0].difficulty).toBe('medium')
    })

    it('should filter by points', () => {
      const store = usePatternStore.getState()
      
      store.setPointsFilter('25')
      const filtered = store.getFilteredPatterns()
      
      expect(filtered).toHaveLength(2)
      expect(filtered[0].points).toBe(25)
    })

    it('should filter by jokers allowed', () => {
      const store = usePatternStore.getState()
      
      store.setJokerFilter('allows')
      const filtered = store.getFilteredPatterns()
      
      expect(filtered).toHaveLength(2)
      expect(filtered[0].allowsJokers).toBe(true)
    })

    it('should search by pattern text', () => {
      const store = usePatternStore.getState()
      
      store.setSearchQuery('ANY 3 SUITS')
      const filtered = store.getFilteredPatterns()
      
      expect(filtered).toHaveLength(1)
      expect(filtered[0].displayName).toContain('ANY 3 SUITS')
    })

    it('should combine multiple filters', () => {
      const store = usePatternStore.getState()
      
      store.setDifficultyFilter('medium')
      store.setJokerFilter('allows')
      const filtered = store.getFilteredPatterns()
      
      expect(filtered).toHaveLength(2)
      expect(filtered[0].difficulty).toBe('medium')
      expect(filtered[0].allowsJokers).toBe(true)
    })

    it('should clear filters', () => {
      const store = usePatternStore.getState()
      
      store.setDifficultyFilter('easy')
      store.setSearchQuery('test')
      store.clearAllFilters()
      
      expect(store.difficultyFilter).toBe('all')
      expect(store.searchQuery).toBe('')
      expect(store.getFilteredPatterns()).toHaveLength(2)
    })
  })

  describe('Pattern Statistics', () => {
    it('should get target patterns array', () => {
      const store = usePatternStore.getState()
      
      store.addTargetPattern('2025-2025-1-1')
      store.addTargetPattern('2025-2025-2-1')
      
      const targets = store.getTargetPatterns()
      expect(targets).toHaveLength(2)
      expect(targets[0]).toEqual(mockPatterns[0])
      expect(targets[1]).toEqual(mockPatterns[1])
    })

    it('should return empty array when no patterns selected', () => {
      const store = usePatternStore.getState()
      
      const targets = store.getTargetPatterns()
      expect(targets).toEqual([])
    })

    it('should return selected pattern correctly', () => {
      const store = usePatternStore.getState()
      
      store.selectPattern('2025-2025-2-1')
      
      const selected = store.getSelectedPattern()
      expect(selected).toEqual(mockPatterns[1]) // test-2 pattern
    })
  })

  describe('Error Handling', () => {
    it('should handle selection of non-existent pattern gracefully', () => {
      const store = usePatternStore.getState()
      
      store.selectPattern('non-existent')
      
      const updatedStore = usePatternStore.getState()
      expect(updatedStore.selectedPatternId).toBe('non-existent') // It will set it, but getSelectedPattern returns null
      expect(updatedStore.getSelectedPattern()).toBeNull()
    })

    it('should handle getting selected pattern when none exist', () => {
      usePatternStore.setState({ selectionOptions: [] })
      const store = usePatternStore.getState()
      
      const selected = store.getSelectedPattern()
      expect(selected).toBeNull()
    })
  })
})