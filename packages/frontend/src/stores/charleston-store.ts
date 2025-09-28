// Charleston Store - Simplified
// Zustand store for Charleston phase state management
// Charleston is just "pass 3 tiles instead of discard 1" with different turn rotation

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { Tile } from 'shared-types'
import type { PatternSelectionOption } from 'shared-types'

export type CharlestonPhase = 'right' | 'across' | 'left' | 'optional' | 'complete'

export interface SimpleCharlestonRecommendation {
  tilesToPass: Tile[]
  reasoning: string[]
  confidence: number
}

interface CharlestonState {
  // Current phase and settings
  currentPhase: CharlestonPhase
  playerCount: number
  isActive: boolean

  // Player tiles and selection
  playerTiles: Tile[]
  selectedTiles: Tile[]

  // Simple AI recommendations
  recommendations: SimpleCharlestonRecommendation | null
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

  // Multiplayer coordination
  isMultiplayerMode: boolean
  playerReadiness: Record<string, boolean> // playerId -> ready status
  waitingForPlayers: string[] // playerIds we're waiting for
  currentPlayerId: string | null
  roomId: string | null

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
  completePhase: () => void
  reset: () => void

  // Tile management
  setPlayerTiles: (tiles: Tile[]) => void
  setSelectedTiles: (tiles: Tile[]) => void
  selectTile: (tile: Tile) => void
  deselectTile: (tile: Tile) => void
  clearSelection: () => void

  // Pattern management
  setTargetPatterns: (patterns: PatternSelectionOption[]) => void

  // Analysis
  generateRecommendations: () => Promise<void>
  clearRecommendations: () => void

  // Multiplayer
  setMultiplayerMode: (enabled: boolean, roomId?: string) => void
  setPlayerReady: (playerId: string, ready: boolean) => void
  setCurrentPlayer: (playerId: string) => void

  // UI
  setShowStrategy: (show: boolean) => void
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
  isMultiplayerMode: false,
  playerReadiness: {},
  waitingForPlayers: [],
  currentPlayerId: null,
  roomId: null,
  showStrategy: false,
  analysisError: null,
}

export const useCharlestonStore = create<CharlestonStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Phase management
        setPhase: (phase) =>
          set({ currentPhase: phase }, false, 'charleston/setPhase'),

        setPlayerCount: (count) =>
          set({ playerCount: count }, false, 'charleston/setPlayerCount'),

        startCharleston: () =>
          set({
            isActive: true,
            currentPhase: 'right',
            phaseHistory: [],
            selectedTiles: [],
            recommendations: null
          }, false, 'charleston/start'),

        endCharleston: () =>
          set({
            isActive: false,
            currentPhase: 'complete',
            selectedTiles: [],
            recommendations: null
          }, false, 'charleston/end'),

        completePhase: () => {
          const state = get()

          // Record the phase history with selected tiles
          const phaseRecord = {
            phase: state.currentPhase,
            tilesPassed: [...state.selectedTiles],
            tilesReceived: [], // Will be populated when receiving tiles
            timestamp: Date.now()
          }

          // Note: In production, tile removal would be handled by the UI component
          // that coordinates between Charleston Store and Tile Store
          // This store focuses on Charleston phase logic only

          const nextPhase = getNextPhase(state.currentPhase, state.playerCount)
          if (nextPhase === 'complete') {
            get().endCharleston()
          } else {
            set({
              currentPhase: nextPhase,
              phaseHistory: [...state.phaseHistory, phaseRecord],
              selectedTiles: [] // Clear selection for next phase
            }, false, 'charleston/completePhase')
          }
        },

        reset: () =>
          set(initialState, false, 'charleston/reset'),

        // Tile management
        setPlayerTiles: (tiles) => {
          set({ playerTiles: tiles }, false, 'charleston/setPlayerTiles')
          // Auto-generate recommendations when tiles change
          if (get().isActive && tiles.length > 0) {
            get().generateRecommendations()
          }
        },

        setSelectedTiles: (tiles) =>
          set({ selectedTiles: tiles }, false, 'charleston/setSelectedTiles'),

        selectTile: (tile) => {
          const state = get()
          if (state.selectedTiles.length < 3 && !state.selectedTiles.some(t => t.id === tile.id)) {
            set({
              selectedTiles: [...state.selectedTiles, tile]
            }, false, 'charleston/selectTile')
          }
        },

        deselectTile: (tile) =>
          set((state) => ({
            selectedTiles: state.selectedTiles.filter(t => t.id !== tile.id)
          }), false, 'charleston/deselectTile'),

        clearSelection: () =>
          set({ selectedTiles: [] }, false, 'charleston/clearSelection'),

        // Pattern management
        setTargetPatterns: (patterns) => {
          set({ targetPatterns: patterns }, false, 'charleston/setTargetPatterns')
          // Regenerate recommendations when patterns change
          if (get().isActive && get().playerTiles.length > 0) {
            get().generateRecommendations()
          }
        },

        // Simplified Analysis - just find 3 least valuable tiles
        generateRecommendations: async () => {
          const state = get()

          if (state.playerTiles.length === 0 || !state.isActive) {
            return
          }

          set({ isAnalyzing: true, analysisError: null }, false, 'charleston/startAnalysis')

          try {
            // Simple logic: Pass tiles that are least useful
            const tilesToPass = findLeastUsefulTiles(state.playerTiles, state.targetPatterns)

            const recommendations: SimpleCharlestonRecommendation = {
              tilesToPass,
              confidence: 0.8, // Good confidence for simple logic
              reasoning: [
                `Passing ${tilesToPass.length} tiles that are least useful for your target patterns`,
                'Charleston strategy: Keep tiles that help your patterns, pass others',
                state.targetPatterns.length > 0
                  ? `Focusing on ${state.targetPatterns.length} selected pattern(s)`
                  : 'No specific patterns selected - passing generally less useful tiles'
              ]
            }

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

        // Multiplayer
        setMultiplayerMode: (enabled, roomId) =>
          set({
            isMultiplayerMode: enabled,
            roomId: roomId || null
          }, false, 'charleston/setMultiplayerMode'),

        setPlayerReady: (playerId, ready) =>
          set((state) => ({
            playerReadiness: { ...state.playerReadiness, [playerId]: ready }
          }), false, 'charleston/setPlayerReady'),

        setCurrentPlayer: (playerId) =>
          set({ currentPlayerId: playerId }, false, 'charleston/setCurrentPlayer'),

        // UI
        setShowStrategy: (show) =>
          set({ showStrategy: show }, false, 'charleston/setShowStrategy'),
      }),
      {
        name: 'charleston-store',
        version: 1,
        partialize: (state) => ({
          // Persist Charleston preferences to localStorage - survives browser restart
          // Active Charleston game state (tiles, phase) intentionally NOT persisted
          playerCount: state.playerCount,
          showStrategy: state.showStrategy,
          targetPatterns: state.targetPatterns
        })
      }
    ),
    { name: 'charleston-store' }
  )
)

// Helper function to determine next Charleston phase
function getNextPhase(currentPhase: CharlestonPhase, playerCount: number): CharlestonPhase {
  switch (currentPhase) {
    case 'right':
      return playerCount === 3 ? 'left' : 'across' // Skip 'across' for 3-player games
    case 'across':
      return 'left'
    case 'left':
      return 'optional'
    case 'optional':
      return 'complete'
    default:
      return 'complete'
  }
}

// Simplified tile evaluation - find 3 least useful tiles to pass
function findLeastUsefulTiles(playerTiles: Tile[], targetPatterns: PatternSelectionOption[]): Tile[] {
  // Never pass jokers
  const nonJokers = playerTiles.filter(tile => !tile.isJoker && tile.suit !== 'jokers')

  if (nonJokers.length <= 3) {
    return nonJokers.slice(0, 3)
  }

  // Score tiles by usefulness (higher = keep, lower = pass)
  const scoredTiles = nonJokers.map(tile => ({
    tile,
    score: calculateTileValue(tile, playerTiles, targetPatterns)
  }))

  // Sort by score (ascending) and take the 3 lowest-scoring tiles
  scoredTiles.sort((a, b) => a.score - b.score)

  return scoredTiles.slice(0, 3).map(item => item.tile)
}

// Simple tile value calculation
function calculateTileValue(tile: Tile, playerTiles: Tile[], targetPatterns: PatternSelectionOption[]): number {
  let score = 0

  // Base scores by tile type
  if (tile.suit === 'flowers') {
    score += 1 // Flowers are often less useful
  } else if (tile.suit === 'winds' || tile.suit === 'dragons') {
    // Count how many of this honor tile we have
    const count = playerTiles.filter(t => t.suit === tile.suit && t.value === tile.value).length
    score += count * 2 // More copies = more valuable
  } else if (['dots', 'bams', 'cracks'].includes(tile.suit)) {
    // Check for sequence potential
    const hasAdjacent = playerTiles.some(t => {
      if (t.suit !== tile.suit) return false
      const tileNum = parseInt(tile.value)
      const otherNum = parseInt(t.value)
      return !isNaN(tileNum) && !isNaN(otherNum) && Math.abs(tileNum - otherNum) === 1
    })
    if (hasAdjacent) score += 3

    // Check for same-number potential (like numbers)
    const sameNumberCount = playerTiles.filter(t =>
      t.value === tile.value && ['dots', 'bams', 'cracks'].includes(t.suit)
    ).length
    score += sameNumberCount * 2
  }

  // Pattern-specific bonuses
  if (targetPatterns.length > 0) {
    const isNeededByPattern = targetPatterns.some(pattern =>
      isNeededForPattern(tile, pattern)
    )
    if (isNeededByPattern) score += 5
  }

  return score
}

// Simple pattern matching heuristic
function isNeededForPattern(tile: Tile, pattern: PatternSelectionOption): boolean {
  const patternText = pattern.pattern.toLowerCase()

  // Basic pattern matching
  if (tile.suit === 'dots' && patternText.includes('dot')) return true
  if (tile.suit === 'bams' && patternText.includes('bam')) return true
  if (tile.suit === 'cracks' && patternText.includes('crak')) return true
  if (tile.suit === 'winds' && patternText.includes('wind')) return true
  if (tile.suit === 'dragons' && patternText.includes('dragon')) return true
  if (tile.suit === 'flowers' && patternText.includes('flower')) return true

  // Number patterns
  if (['dots', 'bams', 'cracks'].includes(tile.suit)) {
    if (patternText.includes(tile.value)) return true
    if (patternText.includes('2025') && ['2', '0', '5'].includes(tile.value)) return true
    if (patternText.includes('like') && patternText.includes('number')) return true
  }

  return false
}

// Selectors for easier consumption
export const useCharlestonSelectors = () => {
  const store = useCharlestonStore()

  return {
    isCharlestonActive: store.isActive,
    currentPhase: store.currentPhase,
    selectedTiles: store.selectedTiles,
    recommendations: store.recommendations,
    isAnalyzing: store.isAnalyzing,
    canSelectMore: store.selectedTiles.length < 3,
    isReadyToPass: store.selectedTiles.length === 3,
  }
}