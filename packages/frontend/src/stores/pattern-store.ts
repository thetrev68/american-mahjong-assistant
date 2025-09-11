// Pattern Selection Store
// Handles NMJL pattern data and user selection state

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { PatternSelectionOption, PatternProgress, NMJL2025Pattern } from 'shared-types'
import { nmjlService } from '../lib/services/nmjl-service'

interface PatternState {
  // Data
  patterns: NMJL2025Pattern[]
  selectionOptions: PatternSelectionOption[]
  isLoading: boolean
  error: string | null
  
  // User Selection
  selectedPatternId: string | null
  targetPatterns: string[] // Multiple patterns user is considering
  
  // Search & Filtering
  searchQuery: string
  difficultyFilter: 'all' | 'easy' | 'medium' | 'hard'
  pointsFilter: 'all' | '25' | '30' | '35' | '40' | '50'
  jokerFilter: 'all' | 'allows' | 'no-jokers'
  sectionFilter: 'all' | string
  
  // Progress Tracking
  patternProgress: Record<string, PatternProgress>
  
  // Actions
  loadPatterns: () => Promise<void>
  selectPattern: (patternId: string) => void
  addTargetPattern: (patternId: string) => void
  removeTargetPattern: (patternId: string) => void
  clearSelection: () => void
  
  // Search & Filtering Actions
  setSearchQuery: (query: string) => void
  setDifficultyFilter: (difficulty: 'all' | 'easy' | 'medium' | 'hard') => void
  setPointsFilter: (points: 'all' | '25' | '30' | '35' | '40' | '50') => void
  setJokerFilter: (jokers: 'all' | 'allows' | 'no-jokers') => void
  setSectionFilter: (section: 'all' | string) => void
  clearAllFilters: () => void
  
  // Progress Actions
  updatePatternProgress: (patternId: string, progress: PatternProgress) => void
  
  // Computed
  getFilteredPatterns: () => PatternSelectionOption[]
  getSelectedPattern: () => PatternSelectionOption | null
  getTargetPatterns: () => PatternSelectionOption[]
}

export const usePatternStore = create<PatternState>()(
  devtools(
    (set, get) => ({
      // Initial State
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
      
      patternProgress: {},
      
      // Actions
      loadPatterns: async () => {
        if (get().patterns.length > 0) return // Already loaded
        
        set({ isLoading: true, error: null })
        
        try {
          const [patterns, selectionOptions] = await Promise.all([
            nmjlService.getAllPatterns(),
            nmjlService.getSelectionOptions()
          ])
          
          set({
            patterns,
            selectionOptions,
            isLoading: false
          })
          
          // Pattern store loaded patterns successfully
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load patterns',
            isLoading: false
          })
        }
      },
      
      selectPattern: (patternId: string) => {
        set({ selectedPatternId: patternId })
        
        // Auto-add to target patterns if not already there
        const { targetPatterns, addTargetPattern } = get()
        if (!targetPatterns.includes(patternId)) {
          addTargetPattern(patternId)
        }
      },
      
      addTargetPattern: (patternId: string) => {
        const { targetPatterns } = get()
        if (!targetPatterns.includes(patternId)) {
          set({ targetPatterns: [...targetPatterns, patternId] })
        }
      },
      
      removeTargetPattern: (patternId: string) => {
        const { targetPatterns, selectedPatternId } = get()
        const newTargets = targetPatterns.filter(id => id !== patternId)
        set({ 
          targetPatterns: newTargets,
          selectedPatternId: selectedPatternId === patternId ? null : selectedPatternId
        })
      },
      
      clearSelection: () => {
        set({
          selectedPatternId: null,
          targetPatterns: []
        })
      },
      
      // Search & Filtering
      setSearchQuery: (query: string) => {
        set({ searchQuery: query })
      },
      
      setDifficultyFilter: (difficulty) => {
        set({ difficultyFilter: difficulty })
      },
      
      setPointsFilter: (points) => {
        set({ pointsFilter: points })
      },
      
      setJokerFilter: (jokers) => {
        set({ jokerFilter: jokers })
      },
      
      setSectionFilter: (section) => {
        set({ sectionFilter: section })
      },
      
      clearAllFilters: () => {
        set({
          searchQuery: '',
          difficultyFilter: 'all',
          pointsFilter: 'all',
          jokerFilter: 'all',
          sectionFilter: 'all'
        })
      },
      
      // Progress
      updatePatternProgress: (patternId: string, progress: PatternProgress) => {
        set({
          patternProgress: {
            ...get().patternProgress,
            [patternId]: progress
          }
        })
      },
      
      // Computed getters
      getFilteredPatterns: () => {
        const {
          selectionOptions,
          searchQuery,
          difficultyFilter,
          pointsFilter,
          jokerFilter,
          sectionFilter
        } = get()
        
        return selectionOptions.filter(option => {
          // Search query filter
          if (searchQuery) {
            const query = searchQuery.toLowerCase()
            if (
              !option.displayName.toLowerCase().includes(query) &&
              !option.description.toLowerCase().includes(query) &&
              !option.pattern.toLowerCase().includes(query)
            ) {
              return false
            }
          }
          
          // Difficulty filter
          if (difficultyFilter !== 'all' && option.difficulty !== difficultyFilter) {
            return false
          }
          
          // Points filter
          if (pointsFilter !== 'all' && option.points !== parseInt(pointsFilter)) {
            return false
          }
          
          // Joker filter
          if (jokerFilter === 'allows' && !option.allowsJokers) {
            return false
          }
          if (jokerFilter === 'no-jokers' && option.allowsJokers) {
            return false
          }
          
          // Section filter
          if (sectionFilter !== 'all' && option.section !== sectionFilter) {
            return false
          }
          
          return true
        })
      },
      
      getSelectedPattern: () => {
        const { selectedPatternId, selectionOptions } = get()
        if (!selectedPatternId) return null
        return selectionOptions.find(option => option.id === selectedPatternId) || null
      },
      
      getTargetPatterns: () => {
        const { targetPatterns, selectionOptions } = get()
        return targetPatterns
          .map(id => selectionOptions.find(option => option.id === id))
          .filter(Boolean) as PatternSelectionOption[]
      }
    })
  )
)