import { describe, it, expect, beforeEach } from 'vitest'
import { usePatternStore } from '../pattern-store'
import type { PatternSelectionOption } from '../../../../shared/nmjl-types'

// Mock pattern data
const mockPatterns: PatternSelectionOption[] = [
  {
    id: 'test-1',
    patternId: 1,
    displayName: '2025 #1: TEST PATTERN ONE',
    pattern: '1D 2D 3D 1B 2B 3B 1C 2C 3C EE SS',
    points: 25,
    difficulty: 'easy',
    description: 'Test Pattern One',
    section: 2025,
    line: 1,
    allowsJokers: false,
    concealed: false,
    groups: []
  },
  {
    id: 'test-2',
    patternId: 2,
    displayName: '2025 #2: TEST PATTERN TWO',
    pattern: '1D 1D 1D 2B 2B 2B 3C 3C 3C WW joker',
    points: 30,
    difficulty: 'medium',
    description: 'Test Pattern Two',
    section: 2025,
    line: 2,
    allowsJokers: true,
    concealed: false,
    groups: []
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
      expect(store.selectionOptions[0].displayName).toBe('2025 #1: TEST PATTERN ONE')
      expect(store.selectionOptions[1].points).toBe(30)
    })
  })

  describe('Pattern Selection', () => {
    it('should select a pattern', () => {
      const store = usePatternStore.getState()
      
      store.selectPattern('test-1')
      
      // Need to get fresh state after mutation
      const updatedStore = usePatternStore.getState()
      expect(updatedStore.selectedPatternId).toBe('test-1')
      expect(updatedStore.getSelectedPattern()).toEqual(mockPatterns[0])
    })

    it('should add target pattern', () => {
      const store = usePatternStore.getState()
      
      store.addTargetPattern('test-1')
      const updatedStore1 = usePatternStore.getState()
      expect(updatedStore1.targetPatterns).toContain('test-1')
      
      store.addTargetPattern('test-2')
      const updatedStore2 = usePatternStore.getState()
      expect(updatedStore2.targetPatterns).toHaveLength(2)
    })

    it('should remove target pattern', () => {
      const store = usePatternStore.getState()
      
      store.addTargetPattern('test-1')
      store.addTargetPattern('test-2')
      const updatedStore1 = usePatternStore.getState()
      expect(updatedStore1.targetPatterns).toHaveLength(2)
      
      store.removeTargetPattern('test-1')
      const updatedStore2 = usePatternStore.getState()
      expect(updatedStore2.targetPatterns).not.toContain('test-1')
      expect(updatedStore2.targetPatterns).toContain('test-2')
    })

    it('should clear all selections', () => {
      const store = usePatternStore.getState()
      
      store.selectPattern('test-1')
      store.addTargetPattern('test-2')
      const updatedStore1 = usePatternStore.getState()
      expect(updatedStore1.selectedPatternId).toBe('test-1')
      expect(updatedStore1.targetPatterns).toHaveLength(2) // test-1 auto-added + test-2
      
      store.clearSelection()
      const updatedStore2 = usePatternStore.getState()
      expect(updatedStore2.selectedPatternId).toBeNull()
      expect(updatedStore2.targetPatterns).toHaveLength(0)
    })
  })

  describe('Filtering', () => {
    it('should filter by difficulty', () => {
      const store = usePatternStore.getState()
      
      store.setDifficultyFilter('easy')
      const filtered = store.getFilteredPatterns()
      
      expect(filtered).toHaveLength(1)
      expect(filtered[0].difficulty).toBe('easy')
    })

    it('should filter by points', () => {
      const store = usePatternStore.getState()
      
      store.setPointsFilter('30')
      const filtered = store.getFilteredPatterns()
      
      expect(filtered).toHaveLength(1)
      expect(filtered[0].points).toBe(30)
    })

    it('should filter by jokers allowed', () => {
      const store = usePatternStore.getState()
      
      store.setJokerFilter('allows')
      const filtered = store.getFilteredPatterns()
      
      expect(filtered).toHaveLength(1)
      expect(filtered[0].allowsJokers).toBe(true)
    })

    it('should search by pattern text', () => {
      const store = usePatternStore.getState()
      
      store.setSearchQuery('TEST PATTERN ONE')
      const filtered = store.getFilteredPatterns()
      
      expect(filtered).toHaveLength(1)
      expect(filtered[0].displayName).toContain('TEST PATTERN ONE')
    })

    it('should combine multiple filters', () => {
      const store = usePatternStore.getState()
      
      store.setDifficultyFilter('medium')
      store.setJokerFilter('allows')
      const filtered = store.getFilteredPatterns()
      
      expect(filtered).toHaveLength(1)
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
      
      store.addTargetPattern('test-1')
      store.addTargetPattern('test-2')
      
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
      
      store.selectPattern('test-2')
      
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