import { describe, it, expect, beforeEach, vi } from 'vitest'
import { usePatternStore } from '../pattern-store'
import type { PatternSelectionOption, NMJL2025Pattern, PatternProgress } from 'shared-types'

// Mock NMJL service
vi.mock('../../lib/services/nmjl-service', () => ({
  nmjlService: {
    getAllPatterns: vi.fn(),
    getSelectionOptions: vi.fn()
  }
}))

// Mock pattern data based on real NMJL 2025 patterns
const mockPatterns: NMJL2025Pattern[] = [
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
    Groups: []
  },
  {
    Year: 2025,
    Section: 2025,
    Line: 2,
    'Pattern ID': 2,
    Hands_Key: '2025-2025-2-1',
    Hand_Pattern: '222 0000 222 5555',
    Hand_Description: 'Any 2 Suits',
    Hand_Points: 30,
    Hand_Conceiled: false,
    Hand_Difficulty: 'hard',
    Hand_Notes: null,
    Groups: []
  }
]

const mockSelectionOptions: PatternSelectionOption[] = [
  {
    id: '2025-2025-1-1',
    patternId: 1,
    displayName: '2025 #1: ANY 3 SUITS, LIKE PUNGS 2S OR 5S IN OPP. SUITS',
    pattern: 'FFFF 2025 222 222',
    points: 25,
    difficulty: 'medium',
    description: 'Any 3 Suits, Like Pungs 2s or 5s In Opp. Suits',
    section: '2025',
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
    patternId: 2,
    displayName: '2025 #2: ANY 2 SUITS',
    pattern: '222 0000 222 5555',
    points: 30,
    difficulty: 'hard',
    description: 'Any 2 Suits',
    section: '2025',
    line: 2,
    allowsJokers: false,
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

const { nmjlService } = await import('../../lib/services/nmjl-service')

describe('Pattern Store', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock service responses
    vi.mocked(nmjlService.getAllPatterns).mockResolvedValue(mockPatterns)
    vi.mocked(nmjlService.getSelectionOptions).mockResolvedValue(mockSelectionOptions)

    // Reset store state before each test
    usePatternStore.setState({
      patterns: [],
      selectionOptions: [],
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

  describe('Initial State', () => {
    it('should initialize with empty state', () => {
      const store = usePatternStore.getState()

      expect(store.patterns).toEqual([])
      expect(store.selectionOptions).toEqual([])
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
      expect(store.selectedPatternId).toBeNull()
      expect(store.targetPatterns).toEqual([])
      expect(store.searchQuery).toBe('')
      expect(store.difficultyFilter).toBe('all')
      expect(store.pointsFilter).toBe('all')
      expect(store.jokerFilter).toBe('all')
      expect(store.sectionFilter).toBe('all')
      expect(store.patternProgress).toEqual({})
    })
  })

  describe('Pattern Loading', () => {
    it('should load patterns successfully', async () => {
      const store = usePatternStore.getState()

      await store.loadPatterns()

      expect(nmjlService.getAllPatterns).toHaveBeenCalledOnce()
      expect(nmjlService.getSelectionOptions).toHaveBeenCalledOnce()

      const updatedState = usePatternStore.getState()
      expect(updatedState.patterns).toEqual(mockPatterns)
      expect(updatedState.selectionOptions).toEqual(mockSelectionOptions)
      expect(updatedState.isLoading).toBe(false)
      expect(updatedState.error).toBeNull()
    })

    it('should handle loading errors gracefully', async () => {
      const errorMessage = 'Failed to load patterns'
      vi.mocked(nmjlService.getAllPatterns).mockRejectedValue(new Error(errorMessage))

      const store = usePatternStore.getState()
      await store.loadPatterns()

      const updatedState = usePatternStore.getState()
      expect(updatedState.error).toBe(errorMessage)
      expect(updatedState.isLoading).toBe(false)
      expect(updatedState.patterns).toEqual([])
      expect(updatedState.selectionOptions).toEqual([])
    })

    it('should not reload patterns if already loaded', async () => {
      // First load
      const store = usePatternStore.getState()
      await store.loadPatterns()

      expect(nmjlService.getAllPatterns).toHaveBeenCalledOnce()

      // Second load should not call service again
      await store.loadPatterns()
      expect(nmjlService.getAllPatterns).toHaveBeenCalledOnce()
    })

    it('should set loading state during pattern loading', async () => {
      let resolveFn: ((value: any) => void) | null = null
      const promise = new Promise<any>(resolve => {
        resolveFn = resolve
      })

      vi.mocked(nmjlService.getAllPatterns).mockReturnValue(promise)
      vi.mocked(nmjlService.getSelectionOptions).mockReturnValue(promise)

      const store = usePatternStore.getState()
      const loadPromise = store.loadPatterns()

      // Should be loading
      expect(usePatternStore.getState().isLoading).toBe(true)

      // Resolve the promise
      resolveFn!(mockSelectionOptions)
      await loadPromise

      // Should no longer be loading
      expect(usePatternStore.getState().isLoading).toBe(false)
    })
  })

  describe('Pattern Selection', () => {
    beforeEach(() => {
      // Set up selection options for selection tests
      usePatternStore.setState({ selectionOptions: mockSelectionOptions })
    })

    it('should select a pattern', () => {
      const store = usePatternStore.getState()

      store.selectPattern('2025-2025-1-1')

      const updatedStore = usePatternStore.getState()
      expect(updatedStore.selectedPatternId).toBe('2025-2025-1-1')
      expect(updatedStore.getSelectedPattern()).toEqual(mockSelectionOptions[0])
    })

    it('should auto-add selected pattern to targets', () => {
      const store = usePatternStore.getState()

      store.selectPattern('2025-2025-1-1')

      const updatedStore = usePatternStore.getState()
      expect(updatedStore.targetPatterns).toContain('2025-2025-1-1')
    })

    it('should not duplicate patterns in targets when selecting already targeted pattern', () => {
      const store = usePatternStore.getState()

      store.addTargetPattern('2025-2025-1-1')
      expect(usePatternStore.getState().targetPatterns).toHaveLength(1)

      store.selectPattern('2025-2025-1-1')
      expect(usePatternStore.getState().targetPatterns).toHaveLength(1)
    })

    it('should add target pattern', () => {
      const store = usePatternStore.getState()
      
      store.addTargetPattern('2025-2025-1-1')
      const updatedStore1 = usePatternStore.getState()
      expect(updatedStore1.targetPatterns).toContain('2025-2025-1-1')
      expect(updatedStore1.targetPatterns).toHaveLength(1)

      store.addTargetPattern('2025-2025-2-1')
      const updatedStore2 = usePatternStore.getState()
      expect(updatedStore2.targetPatterns).toHaveLength(2)
      expect(updatedStore2.targetPatterns).toContain('2025-2025-2-1')
    })

    it('should not add duplicate target patterns', () => {
      const store = usePatternStore.getState()

      store.addTargetPattern('2025-2025-1-1')
      store.addTargetPattern('2025-2025-1-1')

      expect(usePatternStore.getState().targetPatterns).toHaveLength(1)
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
      expect(updatedStore2.targetPatterns).toHaveLength(1)
    })

    it('should clear selectedPatternId when removing selected pattern from targets', () => {
      const store = usePatternStore.getState()

      store.selectPattern('2025-2025-1-1') // This auto-adds to targets
      expect(usePatternStore.getState().selectedPatternId).toBe('2025-2025-1-1')

      store.removeTargetPattern('2025-2025-1-1')
      const updatedStore = usePatternStore.getState()
      expect(updatedStore.selectedPatternId).toBeNull()
      expect(updatedStore.targetPatterns).toHaveLength(0)
    })

    it('should preserve selectedPatternId when removing non-selected pattern from targets', () => {
      const store = usePatternStore.getState()

      store.selectPattern('2025-2025-1-1') // This auto-adds to targets
      store.addTargetPattern('2025-2025-2-1')
      expect(usePatternStore.getState().targetPatterns).toHaveLength(2)

      store.removeTargetPattern('2025-2025-2-1')
      const updatedStore = usePatternStore.getState()
      expect(updatedStore.selectedPatternId).toBe('2025-2025-1-1')
      expect(updatedStore.targetPatterns).toHaveLength(1)
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


  describe('Pattern Progress Tracking', () => {
    beforeEach(() => {
      usePatternStore.setState({ selectionOptions: mockSelectionOptions })
    })

    it('should update pattern progress', () => {
      const store = usePatternStore.getState()
      const progress: PatternProgress = {
        patternId: 1,
        completionPercentage: 75,
        tilesNeeded: 4,
        completingTiles: ['DOT1', 'DOT2'],
        canUseJokers: true,
        jokersNeeded: 1
      }

      store.updatePatternProgress('2025-2025-1-1', progress)

      const updatedStore = usePatternStore.getState()
      expect(updatedStore.patternProgress['2025-2025-1-1']).toEqual(progress)
    })
  })

  describe('Pattern Getters', () => {
    beforeEach(() => {
      usePatternStore.setState({ selectionOptions: mockSelectionOptions })
    })

    it('should get target patterns array', () => {
      const store = usePatternStore.getState()

      store.addTargetPattern('2025-2025-1-1')
      store.addTargetPattern('2025-2025-2-1')

      const targets = store.getTargetPatterns()
      expect(targets).toHaveLength(2)
      expect(targets[0]).toEqual(mockSelectionOptions[0])
      expect(targets[1]).toEqual(mockSelectionOptions[1])
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
      expect(selected).toEqual(mockSelectionOptions[1])
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle selection of non-existent pattern gracefully', () => {
      usePatternStore.setState({ selectionOptions: mockSelectionOptions })
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

    it('should handle removing non-existent target pattern gracefully', () => {
      const store = usePatternStore.getState()

      store.addTargetPattern('2025-2025-1-1')
      const initialLength = usePatternStore.getState().targetPatterns.length

      store.removeTargetPattern('non-existent')
      expect(usePatternStore.getState().targetPatterns).toHaveLength(initialLength)
    })

    it('should handle empty selection options gracefully', () => {
      usePatternStore.setState({ selectionOptions: [] })
      const store = usePatternStore.getState()

      expect(store.getFilteredPatterns()).toEqual([])
      expect(store.getTargetPatterns()).toEqual([])
      expect(store.getSelectedPattern()).toBeNull()
    })
  })
})