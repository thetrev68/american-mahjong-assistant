// Charleston Store
// Zustand store for Charleston phase state management

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { CharlestonAdapter, type Tile, type CharlestonPhase, type CharlestonRecommendation } from '../utils/charleston-adapter'
import type { PatternSelectionOption } from '../../../shared/nmjl-types'

interface CharlestonState {
  // Current phase and settings
  currentPhase: CharlestonPhase
  playerCount: number
  isActive: boolean
  
  // Player tiles and selection
  playerTiles: Tile[]
  selectedTiles: Tile[]
  
  // AI recommendations
  recommendations: CharlestonRecommendation | null
  isAnalyzing: boolean
  
  // Target patterns (from pattern store)
  targetPatterns: PatternSelectionOption[]
  
  // Charleston history
  phaseHistory: Array<{
    phase: CharlestonPhase
    tilesPassed: Tile[]
    tilesReceived: Tile[]
    timestamp: number
  }>
  
  // UI state
  showStrategy: boolean
  analysisError: string | null
}

interface CharlestonActions {
  // Phase management
  setPhase: (phase: CharlestonPhase) => void
  setPlayerCount: (count: number) => void
  startCharleston: () => void
  endCharleston: () => void
  
  // Tile management
  setPlayerTiles: (tiles: Tile[]) => void
  addTile: (tile: Tile) => void
  removeTile: (tileId: string) => void
  
  // Selection management
  selectTile: (tile: Tile) => void
  deselectTile: (tile: Tile) => void
  clearSelection: () => void
  autoSelectRecommended: () => void
  
  // Target patterns
  setTargetPatterns: (patterns: PatternSelectionOption[]) => void
  
  // Analysis
  generateRecommendations: () => Promise<void>
  clearRecommendations: () => void
  
  // Phase completion
  completePhase: (tilesReceived?: Tile[]) => void
  
  // UI actions
  toggleStrategy: () => void
  clearError: () => void
  
  // Reset
  reset: () => void
}

type CharlestonStore = CharlestonState & CharlestonActions

const initialState: CharlestonState = {
  currentPhase: 'right',
  playerCount: 4,
  isActive: false,
  playerTiles: [],
  selectedTiles: [],
  recommendations: null,
  isAnalyzing: false,
  targetPatterns: [],
  phaseHistory: [],
  showStrategy: false,
  analysisError: null
}

export const useCharlestonStore = create<CharlestonStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        // Phase management
        setPhase: (phase) => {
          set({ currentPhase: phase }, false, 'charleston/setPhase')
          // Auto-generate recommendations when phase changes
          if (get().isActive && get().playerTiles.length > 0) {
            get().generateRecommendations()
          }
        },
        
        setPlayerCount: (count) => {
          set({ playerCount: count }, false, 'charleston/setPlayerCount')
        },
        
        startCharleston: () => {
          set({ 
            isActive: true, 
            currentPhase: 'right',
            phaseHistory: [],
            selectedTiles: []
          }, false, 'charleston/start')
          
          // Generate initial recommendations if we have tiles
          if (get().playerTiles.length > 0) {
            get().generateRecommendations()
          }
        },
        
        endCharleston: () => {
          set({ 
            isActive: false,
            currentPhase: 'complete',
            selectedTiles: [],
            recommendations: null
          }, false, 'charleston/end')
        },
        
        // Tile management
        setPlayerTiles: (tiles) => {
          set({ playerTiles: tiles }, false, 'charleston/setPlayerTiles')
          
          // Clear selection if selected tiles are no longer available
          const state = get()
          const availableIds = new Set(tiles.map(t => t.id))
          const validSelection = state.selectedTiles.filter(t => availableIds.has(t.id))
          
          if (validSelection.length !== state.selectedTiles.length) {
            set({ selectedTiles: validSelection }, false, 'charleston/cleanupSelection')
          }
          
          // Regenerate recommendations if Charleston is active
          if (state.isActive && tiles.length > 0) {
            get().generateRecommendations()
          }
        },
        
        addTile: (tile) => {
          const tiles = get().playerTiles
          if (!tiles.some(t => t.id === tile.id)) {
            get().setPlayerTiles([...tiles, tile])
          }
        },
        
        removeTile: (tileId) => {
          const tiles = get().playerTiles.filter(t => t.id !== tileId)
          get().setPlayerTiles(tiles)
        },
        
        // Selection management
        selectTile: (tile) => {
          const state = get()
          const isAlreadySelected = state.selectedTiles.some(t => t.id === tile.id)
          const canSelect = state.selectedTiles.length < 3
          
          if (!isAlreadySelected && canSelect) {
            set({ 
              selectedTiles: [...state.selectedTiles, tile] 
            }, false, 'charleston/selectTile')
          }
        },
        
        deselectTile: (tile) => {
          const selectedTiles = get().selectedTiles.filter(t => t.id !== tile.id)
          set({ selectedTiles }, false, 'charleston/deselectTile')
        },
        
        clearSelection: () => {
          set({ selectedTiles: [] }, false, 'charleston/clearSelection')
        },
        
        autoSelectRecommended: () => {
          const { recommendations } = get()
          if (recommendations?.tilesToPass) {
            const tilesToSelect = recommendations.tilesToPass.slice(0, 3)
            set({ selectedTiles: tilesToSelect }, false, 'charleston/autoSelect')
          }
        },
        
        // Target patterns
        setTargetPatterns: (patterns) => {
          set({ targetPatterns: patterns }, false, 'charleston/setTargetPatterns')
          
          // Regenerate recommendations with new target patterns
          if (get().isActive && get().playerTiles.length > 0) {
            get().generateRecommendations()
          }
        },
        
        // Analysis
        generateRecommendations: async () => {
          const state = get()
          
          if (state.playerTiles.length === 0 || !state.isActive) {
            return
          }
          
          set({ isAnalyzing: true, analysisError: null }, false, 'charleston/startAnalysis')
          
          try {
            const recommendations = CharlestonAdapter.generateRecommendations(
              state.playerTiles,
              state.targetPatterns,
              state.currentPhase,
              state.playerCount
            )
            
            set({ 
              recommendations,
              isAnalyzing: false 
            }, false, 'charleston/analysisComplete')
            
          } catch (error) {
            console.error('Charleston analysis error:', error)
            set({ 
              isAnalyzing: false,
              analysisError: error instanceof Error ? error.message : 'Analysis failed'
            }, false, 'charleston/analysisError')
          }
        },
        
        clearRecommendations: () => {
          set({ recommendations: null }, false, 'charleston/clearRecommendations')
        },
        
        // Phase completion
        completePhase: (tilesReceived = []) => {
          const state = get()
          
          // Record phase in history
          const phaseRecord = {
            phase: state.currentPhase,
            tilesPassed: [...state.selectedTiles],
            tilesReceived: [...tilesReceived],
            timestamp: Date.now()
          }
          
          // Update tiles: remove passed, add received
          const remainingTiles = state.playerTiles.filter(tile =>
            !state.selectedTiles.some(selected => selected.id === tile.id)
          )
          const newTiles = [...remainingTiles, ...tilesReceived]
          
          // Determine next phase
          const nextPhase = getNextPhase(state.currentPhase, state.playerCount)
          
          set({
            phaseHistory: [...state.phaseHistory, phaseRecord],
            playerTiles: newTiles,
            selectedTiles: [],
            currentPhase: nextPhase,
            recommendations: null
          }, false, 'charleston/completePhase')
          
          // Generate recommendations for next phase
          if (nextPhase !== 'complete') {
            setTimeout(() => get().generateRecommendations(), 100)
          } else {
            get().endCharleston()
          }
        },
        
        // UI actions
        toggleStrategy: () => {
          set(state => ({ showStrategy: !state.showStrategy }), false, 'charleston/toggleStrategy')
        },
        
        clearError: () => {
          set({ analysisError: null }, false, 'charleston/clearError')
        },
        
        // Reset
        reset: () => {
          set(initialState, false, 'charleston/reset')
        }
      }),
      {
        name: 'charleston-store',
        version: 1,
        partialize: (state) => ({
          // Persist settings but not active game state
          playerCount: state.playerCount,
          showStrategy: state.showStrategy,
          targetPatterns: state.targetPatterns
        })
      }
    ),
    { name: 'charleston-store' }
  )
)

// Helper function to determine next phase
function getNextPhase(currentPhase: CharlestonPhase, playerCount: number): CharlestonPhase {
  switch (currentPhase) {
    case 'right':
      return playerCount === 3 ? 'left' : 'across' // Skip across in 3-player games
    case 'across':
      return 'left'
    case 'left':
      return 'optional'
    case 'optional':
    default:
      return 'complete'
  }
}

// Selectors for common derived state
export type CharlestonSelectorState = {
  isActive: boolean;
  isComplete: boolean;
  canAdvancePhase: boolean;
  currentPhase: CharlestonPhase;
  phaseDisplayName: string;
  nextPhase: CharlestonPhase;
  tileCount: number;
  jokerCount: number;
  selectedCount: number;
  canSelectMore: boolean;
  hasRecommendations: boolean;
  isAnalyzing: boolean;
  hasError: boolean;
  hasTargets: boolean;
  targetCount: number;
};

export const useCharlestonSelectors = (): CharlestonSelectorState => {
  const store = useCharlestonStore()
  
  return {
    // Status checks
    isActive: store.isActive,
    isComplete: store.currentPhase === 'complete',
    canAdvancePhase: store.selectedTiles.length === 3,
    
    // Phase info
    currentPhase: store.currentPhase,
    phaseDisplayName: getPhaseDisplayName(store.currentPhase),
    nextPhase: getNextPhase(store.currentPhase, store.playerCount),
    
    // Tile info
    tileCount: store.playerTiles.length,
    jokerCount: store.playerTiles.filter(t => t.isJoker || t.suit === 'jokers').length,
    selectedCount: store.selectedTiles.length,
    canSelectMore: store.selectedTiles.length < 3,
    
    // Analysis status
    hasRecommendations: !!store.recommendations,
    isAnalyzing: store.isAnalyzing,
    hasError: !!store.analysisError,
    
    // Pattern info
    hasTargets: store.targetPatterns.length > 0,
    targetCount: store.targetPatterns.length
  }
}

function getPhaseDisplayName(phase: CharlestonPhase): string {
  switch (phase) {
    case 'right': return 'Phase 1: Right Pass'
    case 'across': return 'Phase 2: Across Pass'
    case 'left': return 'Phase 3: Left Pass'
    case 'optional': return 'Optional Phase'
    case 'complete': return 'Charleston Complete'
    default: return 'Charleston'
  }
}