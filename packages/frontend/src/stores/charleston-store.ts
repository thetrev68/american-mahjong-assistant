import type { Tile, PatternSelectionOption } from 'shared-types'
import { useGameStore } from './useGameStore'

export type CharlestonPhase = 'right' | 'across' | 'left' | 'optional' | 'complete'

type Recommendations = {
  tilesToPass: Tile[]
  reasoning: string[]
  confidence: number
}

interface CharlestonAdapterState {
  // Phase and lifecycle
  currentPhase: CharlestonPhase
  isActive: boolean
  phaseHistory: CharlestonPhase[]
  playerCount: number

  // Tiles and selection
  playerTiles: Tile[]
  selectedTiles: Tile[]

  // Intelligence / patterns
  targetPatterns: PatternSelectionOption[]
  recommendations: Recommendations | null
  isAnalyzing?: boolean
  analysisError?: string | null
  showStrategy: boolean

  // Multiplayer helpers
  isMultiplayerMode: boolean
  roomId: string | null
  playerReadiness: Record<string, boolean>
  currentPlayerId: string | null

  // Actions
  reset: () => void
  startCharleston: () => void
  endCharleston: () => void
  completePhase: () => void
  setPhase: (phase: CharlestonPhase) => void
  setPlayerCount: (count: number) => void

  selectTile: (tile: Tile) => void
  deselectTile: (tile: Tile) => void
  clearSelection: () => void
  setPlayerTiles: (tiles: Tile[]) => void
  setSelectedTiles: (tiles: Tile[]) => void

  generateRecommendations: () => Promise<void>
  clearRecommendations: () => void
  setTargetPatterns: (patterns: PatternSelectionOption[]) => void

  setMultiplayerMode: (enabled: boolean, roomId?: string) => void
  setPlayerReady: (playerId: string, ready: boolean) => void
  setCurrentPlayer: (playerId: string) => void
  setShowStrategy: (show: boolean) => void
}

const initial: CharlestonAdapterState = {
  currentPhase: 'right',
  isActive: false,
  phaseHistory: [],
  playerCount: 4,

  playerTiles: [],
  selectedTiles: [],

  targetPatterns: [],
  recommendations: null,
  isAnalyzing: false,
  analysisError: null,
  showStrategy: false,

  isMultiplayerMode: false,
  roomId: null,
  playerReadiness: {},
  currentPlayerId: null,

  reset: () => {
    Object.assign(state, { ...initial, // keep function identities
      reset: state.reset,
      startCharleston: state.startCharleston,
      endCharleston: state.endCharleston,
      completePhase: state.completePhase,
      setPhase: state.setPhase,
      setPlayerCount: state.setPlayerCount,
      selectTile: state.selectTile,
      deselectTile: state.deselectTile,
      clearSelection: state.clearSelection,
      setPlayerTiles: state.setPlayerTiles,
      setSelectedTiles: state.setSelectedTiles,
      generateRecommendations: state.generateRecommendations,
      clearRecommendations: state.clearRecommendations,
      setTargetPatterns: state.setTargetPatterns,
      setMultiplayerMode: state.setMultiplayerMode,
      setPlayerReady: state.setPlayerReady,
      setCurrentPlayer: state.setCurrentPlayer,
      setShowStrategy: state.setShowStrategy,
    })
  },

  startCharleston: () => {
    state.isActive = true
    state.currentPhase = 'right'
    state.phaseHistory = []
    state.selectedTiles = []
    state.recommendations = null
    state.isAnalyzing = false
    state.analysisError = null
    // Reflect in consolidated game store
    useGameStore.getState().actions.startCharleston?.()
  },

  endCharleston: () => {
    state.isActive = false
    state.currentPhase = 'complete'
    state.selectedTiles = []
    state.recommendations = null
    state.isAnalyzing = false
    state.analysisError = null
    // Reflect in consolidated game store
    useGameStore.getState().actions.setPhase?.('playing' as GamePhase)
  },

  completePhase: () => {
    const next = getNextPhase(state.currentPhase, state.playerCount)
    state.phaseHistory = [...state.phaseHistory, state.currentPhase]
    if (next === 'complete') {
      state.endCharleston()
    } else {
      state.setPhase(next)
    }
  },

  setPhase: (phase) => {
    state.currentPhase = phase
  },

  setPlayerCount: (count) => {
    state.playerCount = count
  },

  selectTile: (tile) => {
    if (state.selectedTiles.length >= 3) return
    if (state.selectedTiles.some(t => t.id === tile.id)) return
    state.selectedTiles = [...state.selectedTiles, tile]
  },

  deselectTile: (tile) => {
    state.selectedTiles = state.selectedTiles.filter(t => t.id !== tile.id)
  },

  clearSelection: () => {
    state.selectedTiles = []
  },

  setPlayerTiles: (tiles) => {
    state.playerTiles = [...tiles]
    if (state.isActive) {
      // async trigger
      queueMicrotask(() => { state.generateRecommendations() })
    }
  },

  setSelectedTiles: (tiles) => {
    const unique: Tile[] = []
    for (const t of tiles) {
      if (!unique.some(u => u.id === t.id)) unique.push(t)
    }
    state.selectedTiles = unique
  },

  generateRecommendations: async () => {
    state.isAnalyzing = true
    state.analysisError = null
    try {
      if (!state.isActive) return
      const nonJokers = state.playerTiles.filter(t => !t.isJoker)
      const tilesToPass = nonJokers.slice(0, 3)
      if (tilesToPass.length === 0) return
      state.recommendations = {
        tilesToPass,
        reasoning: ['Avoid passing jokers', 'Balance suits', 'Preserve flexibility'],
        confidence: 0.7,
      }
    } catch (e) {
      state.analysisError = e instanceof Error ? e.message : 'Unknown analysis error'
    } finally {
      state.isAnalyzing = false
    }
  },

  clearRecommendations: () => {
    state.recommendations = null
  },

  setTargetPatterns: (patterns) => {
    state.targetPatterns = [...patterns]
    if (state.isActive && state.playerTiles.length > 0) {
      queueMicrotask(() => { state.generateRecommendations() })
    }
  },

  setMultiplayerMode: (enabled, roomId) => {
    state.isMultiplayerMode = enabled
    state.roomId = enabled ? (roomId ?? null) : null
  },

  setPlayerReady: (playerId, ready) => {
    state.playerReadiness = { ...state.playerReadiness, [playerId]: !!ready }
  },

  setCurrentPlayer: (playerId) => {
    state.currentPlayerId = playerId
  },

  setShowStrategy: (show) => {
    state.showStrategy = !!show
  },
}

function getNextPhase(current: CharlestonPhase, players: number): CharlestonPhase {
  const seq4: CharlestonPhase[] = ['right', 'across', 'left', 'optional', 'complete']
  const seq3: CharlestonPhase[] = ['right', 'left', 'optional', 'complete']
  const seq = players === 3 ? seq3 : seq4
  const idx = seq.indexOf(current)
  return idx >= 0 && idx + 1 < seq.length ? seq[idx + 1] as CharlestonPhase : 'complete'
}

const state: CharlestonAdapterState = { ...initial }

export const useCharlestonStore = Object.assign(
  ((selector?: (s: CharlestonAdapterState) => unknown) => (selector ? selector(state) : state)) as <T>(selector?: (s: CharlestonAdapterState) => T) => T | CharlestonAdapterState,
  { getState: () => state }
)
