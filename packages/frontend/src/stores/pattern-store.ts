import { create } from 'zustand'
import type { NMJL2025Pattern, PatternSelectionOption, PatternProgress } from 'shared-types'
import { nmjlService } from '../lib/services/nmjl-service'

type DifficultyFilter = 'all' | 'easy' | 'medium' | 'hard'
type PointsFilter = 'all' | number
type JokerFilter = 'all' | 'allows' | 'forbids'

interface PatternStoreState {
  patterns: NMJL2025Pattern[]
  selectionOptions: PatternSelectionOption[]
  isLoading: boolean
  error: string | null
  selectedPatternId: string | null
  targetPatterns: string[]
  searchQuery: string
  difficultyFilter: DifficultyFilter
  pointsFilter: PointsFilter
  jokerFilter: JokerFilter
  sectionFilter: string | 'all'
  patternProgress: Record<string, PatternProgress>

  // actions
  loadPatterns: () => Promise<void>
  selectPattern: (id: string) => void
  addTargetPattern: (id: string) => void
  removeTargetPattern: (id: string) => void
  clearSelection: () => void
  updatePatternProgress: (id: string, progress: PatternProgress) => void

  // getters
  getTargetPatterns: () => PatternSelectionOption[]
  getSelectedPattern: () => PatternSelectionOption | null
  getFilteredPatterns: () => PatternSelectionOption[]
}

const initialState: Omit<PatternStoreState,
  'loadPatterns' | 'selectPattern' | 'addTargetPattern' | 'removeTargetPattern' | 'clearSelection' | 'updatePatternProgress' | 'getTargetPatterns' | 'getSelectedPattern' | 'getFilteredPatterns'
> = {
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
}

export const usePatternStore = create<PatternStoreState>((set, get) => ({
  ...initialState,

  loadPatterns: async () => {
    const state = get()
    if (state.isLoading) return
    if (state.patterns.length > 0 && state.selectionOptions.length > 0) return
    set({ isLoading: true, error: null })
    try {
      // Load both datasets
      const [patterns, options] = await Promise.all([
        nmjlService.getAllPatterns(),
        Promise.resolve(nmjlService.getSelectionOptions()).then((res) => Array.isArray(res) ? res : res)
      ])
      set({ patterns, selectionOptions: options as PatternSelectionOption[], isLoading: false, error: null })
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load patterns'
      set({ isLoading: false, error: message, patterns: [], selectionOptions: [] })
    }
  },

  selectPattern: (id) => {
    set((state) => {
      const nextTargets = state.targetPatterns.includes(id)
        ? state.targetPatterns
        : [...state.targetPatterns, id]
      return { selectedPatternId: id, targetPatterns: nextTargets }
    })
  },

  addTargetPattern: (id) => set((state) => ({
    targetPatterns: state.targetPatterns.includes(id)
      ? state.targetPatterns
      : [...state.targetPatterns, id]
  })),

  removeTargetPattern: (id) => set((state) => {
    const next = state.targetPatterns.filter(p => p !== id)
    const selectedPatternId = state.selectedPatternId === id ? null : state.selectedPatternId
    return { targetPatterns: next, selectedPatternId }
  }),

  clearSelection: () => set({ selectedPatternId: null, targetPatterns: [] }),

  updatePatternProgress: (id, progress) => set((state) => ({
    patternProgress: { ...state.patternProgress, [id]: progress }
  })),

  getTargetPatterns: () => {
    const { targetPatterns, selectionOptions } = get()
    const map = new Map(selectionOptions.map(p => [p.id, p]))
    return targetPatterns.map(id => map.get(id)).filter((p): p is PatternSelectionOption => !!p)
  },

  getSelectedPattern: () => {
    const { selectedPatternId, selectionOptions } = get()
    if (!selectedPatternId) return null
    return selectionOptions.find(p => p.id === selectedPatternId) || null
  },

  getFilteredPatterns: () => {
    const { selectionOptions, searchQuery, difficultyFilter, pointsFilter, jokerFilter, sectionFilter } = get()
    return selectionOptions.filter((opt) => {
      if (difficultyFilter !== 'all' && opt.difficulty !== difficultyFilter) return false
      if (pointsFilter !== 'all' && opt.points !== pointsFilter) return false
      if (jokerFilter === 'allows' && !opt.allowsJokers) return false
      if (jokerFilter === 'forbids' && opt.allowsJokers) return false
      if (sectionFilter !== 'all' && String(opt.section) !== String(sectionFilter)) return false
      if (searchQuery && !opt.displayName.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
  },
}))

