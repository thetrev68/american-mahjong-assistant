// Game History Store - Zustand state management for game history and analytics
// Tracks completed games, performance metrics, and learning insights

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { devtools } from 'zustand/middleware'
import type { Tile } from 'shared-utils'
import type { NMJL2025Pattern } from 'shared-types'

// Game outcome types
export type GameOutcome = 'won' | 'lost' | 'draw' | 'incomplete' | 'mahjong' | 'wall' | 'pass-out' | 'forfeit'
export type GameDifficulty = 'beginner' | 'intermediate' | 'expert'
export type DecisionType = 'keep' | 'pass' | 'discard' | 'joker-placement' | 'charleston'
export type DecisionQuality = 'excellent' | 'good' | 'fair' | 'poor'

// Performance metrics interfaces
export interface GameDecision {
  id: string
  timestamp: Date
  type: DecisionType
  tiles: Tile[]
  recommendedAction: string
  actualAction: string
  quality: DecisionQuality
  reasoning: string
  alternativeOptions?: string[]
}

export interface PatternAnalysis {
  patternId: string
  pattern: NMJL2025Pattern
  completionPercentage: number
  timeToCompletion?: number // in seconds
  missedOpportunities: string[]
  optimalMoves: string[]
}

export interface GamePerformance {
  totalDecisions: number
  excellentDecisions: number
  goodDecisions: number
  fairDecisions: number
  poorDecisions: number
  averageDecisionTime: number // in seconds
  patternEfficiency: number // 0-100%
  charlestonSuccess: number // 0-100%
}

export interface GameInsights {
  strengthAreas: string[]
  improvementAreas: string[]
  learningOpportunities: string[]
  recommendedPatterns: string[]
  skillProgression: string
  patternProgress?: Array<{
    patternId: string
    completionPercentage: number
    viability: string
  }>
}

export interface CompletedGame {
  id: string
  timestamp: Date
  createdAt: Date // Added for PostGameView compatibility
  duration: number // in minutes
  outcome: GameOutcome
  finalScore: number
  difficulty: GameDifficulty
  
  // Game state
  selectedPatterns: NMJL2025Pattern[]
  finalHand: Tile[]
  winningPattern?: NMJL2025Pattern
  
  // Game turns and actions
  turns?: Array<{
    action: string
    tiles?: Tile[]
    timestamp?: Date
  }>
  
  // Performance data
  decisions: GameDecision[]
  patternAnalyses: PatternAnalysis[]
  performance: GamePerformance
  insights: GameInsights
  
  // Social features
  shared: boolean
  votes: number
  comments: GameComment[]
  
  // Multiplayer data (if applicable)
  roomId?: string
  players?: Array<{ id: string; name: string }>
  playerCount?: number
  playerPosition?: 'north' | 'east' | 'south' | 'west'
  coPilotMode?: 'everyone' | 'solo'
}

export interface GameComment {
  id: string
  authorId: string
  authorName: string
  content: string
  timestamp: Date
  votes: number
}

export interface PerformanceStats {
  totalGames: number
  gamesWon: number
  winRate: number
  averageScore: number
  averageGameDuration: number
  
  // Decision quality over time
  decisionQualityTrend: Array<{
    date: Date
    excellentRate: number
    goodRate: number
  }>
  
  // Pattern performance
  patternStats: Record<string, {
    attempted: number
    completed: number
    successRate: number
    averageCompletion: number
  }>
  
  // Skill progression
  skillLevel: 'beginner' | 'intermediate' | 'expert'
  nextMilestone: string
  progressToNext: number // 0-100%
}

export interface LearningRecommendation {
  id: string
  type: 'pattern' | 'strategy' | 'charleston' | 'general'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  actionable: string
  relatedGames: string[] // Game IDs
  estimatedImpact: string
}

// Store state interface
interface HistoryState {
  // Game history
  completedGames: CompletedGame[]
  currentGameId: string | null
  
  // Analytics
  performanceStats: PerformanceStats
  learningRecommendations: LearningRecommendation[]
  
  // UI state
  selectedGameId: string | null
  viewMode: 'overview' | 'detailed' | 'comparison'
  sortBy: 'date' | 'score' | 'duration' | 'difficulty'
  sortOrder: 'asc' | 'desc'
  filterBy: {
    outcome?: GameOutcome
    difficulty?: GameDifficulty
    dateRange?: { start: Date; end: Date }
    minScore?: number
    coPilotMode?: 'everyone' | 'solo'
  }
  
  // Social features
  sharedGames: CompletedGame[]
  featuredGames: CompletedGame[]
  isLoading: boolean
  error: string | null
}

// Store actions interface
interface HistoryActions {
  // Game management
  startGame: (gameId: string, difficulty: GameDifficulty) => void
  completeGame: (gameData: Omit<CompletedGame, 'id'>) => string
  deleteGame: (gameId: string) => void
  
  // Decision tracking
  recordDecision: (decision: Omit<GameDecision, 'id'>) => void
  updateDecisionQuality: (decisionId: string, quality: DecisionQuality, reasoning: string) => void
  
  // Analytics
  calculatePerformanceStats: () => void
  generateLearningRecommendations: () => void
  updateSkillLevel: (level: 'beginner' | 'intermediate' | 'expert') => void
  
  // UI state management
  selectGame: (gameId: string | null) => void
  setViewMode: (mode: 'overview' | 'detailed' | 'comparison') => void
  setSorting: (sortBy: string, order: 'asc' | 'desc') => void
  setFilter: (filter: Partial<HistoryState['filterBy']>) => void
  clearFilters: () => void
  
  // Social features
  shareGame: (gameId: string) => Promise<boolean>
  voteOnGame: (gameId: string, vote: 'up' | 'down') => Promise<boolean>
  addComment: (gameId: string, comment: string) => Promise<boolean>
  
  // Data management
  exportHistory: () => string // JSON export
  importHistory: (data: string) => Promise<boolean>
  clearHistory: () => void
  
  // Error handling
  setError: (error: string | null) => void
  clearError: () => void
}

// Default state
const defaultPerformanceStats: PerformanceStats = {
  totalGames: 0,
  gamesWon: 0,
  winRate: 0,
  averageScore: 0,
  averageGameDuration: 0,
  decisionQualityTrend: [],
  patternStats: {},
  skillLevel: 'beginner',
  nextMilestone: 'Complete your first game',
  progressToNext: 0
}

// Create the store
export const useHistoryStore = create<HistoryState & HistoryActions>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        completedGames: [],
        currentGameId: null,
        performanceStats: defaultPerformanceStats,
        learningRecommendations: [],
        selectedGameId: null,
        viewMode: 'overview',
        sortBy: 'date',
        sortOrder: 'desc',
        filterBy: {},
        sharedGames: [],
        featuredGames: [],
        isLoading: false,
        error: null,

        // Game management actions
        startGame: (gameId: string) => {
          set({ currentGameId: gameId })
        },

        completeGame: (gameData: Omit<CompletedGame, 'id'>) => {
          const gameId = get().currentGameId || `game-${Date.now()}`
          const completedGame: CompletedGame = {
            ...gameData,
            id: gameId
          }

          set((state) => ({
            completedGames: [completedGame, ...state.completedGames],
            currentGameId: null
          }))

          // Recalculate stats after adding game
          get().calculatePerformanceStats()
          get().generateLearningRecommendations()
          
          return gameId
        },

        deleteGame: (gameId: string) => {
          set((state) => ({
            completedGames: state.completedGames.filter(game => game.id !== gameId),
            selectedGameId: state.selectedGameId === gameId ? null : state.selectedGameId
          }))
          get().calculatePerformanceStats()
        },

        // Decision tracking
        recordDecision: () => {
          // Decision recorded for game history
          // This would be implemented to track decisions during active gameplay
          // For now, decisions are added when the game is completed
        },

        updateDecisionQuality: (decisionId: string, quality: DecisionQuality, reasoning: string) => {
          set((state) => ({
            completedGames: state.completedGames.map(game => ({
              ...game,
              decisions: game.decisions.map(decision => 
                decision.id === decisionId 
                  ? { ...decision, quality, reasoning }
                  : decision
              )
            }))
          }))
        },

        // Analytics calculations
        calculatePerformanceStats: () => {
          const games = get().completedGames
          if (games.length === 0) {
            set({ performanceStats: defaultPerformanceStats })
            return
          }

          const totalGames = games.length
          const gamesWon = games.filter(g => g.outcome === 'won').length
          const winRate = (gamesWon / totalGames) * 100
          
          const totalScore = games.reduce((sum, g) => sum + g.finalScore, 0)
          const averageScore = totalScore / totalGames
          
          const totalDuration = games.reduce((sum, g) => sum + g.duration, 0)
          const averageGameDuration = totalDuration / totalGames

          // Calculate decision quality trend (last 10 games)
          const recentGames = games.slice(0, 10)
          const decisionQualityTrend = recentGames.map(game => {
            const totalDecisions = game.performance.totalDecisions
            return {
              date: game.timestamp,
              excellentRate: totalDecisions > 0 ? (game.performance.excellentDecisions / totalDecisions) * 100 : 0,
              goodRate: totalDecisions > 0 ? (game.performance.goodDecisions / totalDecisions) * 100 : 0
            }
          })

          // Calculate pattern statistics
          const patternStats: Record<string, { attempted: number; completed: number; successRate: number; averageCompletion: number }> = {}
          games.forEach(game => {
            game.selectedPatterns.forEach(pattern => {
              const patternId = pattern.Hands_Key
              if (!patternStats[patternId]) {
                patternStats[patternId] = { attempted: 0, completed: 0, successRate: 0, averageCompletion: 0 }
              }
              patternStats[patternId].attempted++
              if (game.winningPattern?.Hands_Key === patternId) {
                patternStats[patternId].completed++
              }
            })
          })

          // Calculate success rates
          Object.keys(patternStats).forEach(patternId => {
            const stats = patternStats[patternId]
            stats.successRate = (stats.completed / stats.attempted) * 100
          })

          // Determine skill level progression
          let skillLevel: 'beginner' | 'intermediate' | 'expert' = 'beginner'
          let nextMilestone = 'Complete 5 games'
          let progressToNext = 0

          if (totalGames >= 5 && winRate >= 20) {
            skillLevel = 'intermediate'
            nextMilestone = 'Win 10 games with 40% win rate'
            progressToNext = Math.min(100, (gamesWon / 10) * 100)
          }
          if (gamesWon >= 10 && winRate >= 40) {
            skillLevel = 'expert'
            nextMilestone = 'Master of American Mahjong'
            progressToNext = 100
          }

          const performanceStats: PerformanceStats = {
            totalGames,
            gamesWon,
            winRate,
            averageScore,
            averageGameDuration,
            decisionQualityTrend,
            patternStats,
            skillLevel,
            nextMilestone,
            progressToNext
          }

          set({ performanceStats })
        },

        generateLearningRecommendations: () => {
          const { completedGames, performanceStats } = get()
          const recommendations: LearningRecommendation[] = []

          // Analyze recent performance for recommendations
          if (completedGames.length >= 3) {
            const recentGames = completedGames.slice(0, 3)
            const avgDecisionQuality = recentGames.reduce((sum, game) => 
              sum + (game.performance.excellentDecisions + game.performance.goodDecisions) / game.performance.totalDecisions, 0
            ) / recentGames.length

            if (avgDecisionQuality < 0.6) {
              recommendations.push({
                id: 'improve-decisions',
                type: 'strategy',
                priority: 'high',
                title: 'Improve Decision Making',
                description: 'Your recent decision quality could be improved',
                actionable: 'Focus on following co-pilot recommendations more closely',
                relatedGames: recentGames.map(g => g.id),
                estimatedImpact: 'Could improve win rate by 15-20%'
              })
            }

            // Pattern-specific recommendations
            const strugglingPatterns = Object.entries(performanceStats.patternStats)
              .filter(([, stats]) => stats.attempted >= 2 && stats.successRate < 30)
              .slice(0, 2)

            strugglingPatterns.forEach(([patternId, stats]) => {
              recommendations.push({
                id: `pattern-${patternId}`,
                type: 'pattern',
                priority: 'medium',
                title: `Master Pattern: ${patternId}`,
                description: `Success rate: ${stats.successRate.toFixed(1)}% - needs improvement`,
                actionable: 'Practice this pattern in tutorial mode',
                relatedGames: completedGames.filter(g => 
                  g.selectedPatterns.some(p => p.Hands_Key === patternId)
                ).map(g => g.id),
                estimatedImpact: 'Focused practice could double success rate'
              })
            })
          }

          set({ learningRecommendations: recommendations })
        },

        updateSkillLevel: (level: 'beginner' | 'intermediate' | 'expert') => {
          set((state) => ({
            performanceStats: {
              ...state.performanceStats,
              skillLevel: level
            }
          }))
        },

        // UI state management
        selectGame: (gameId: string | null) => {
          set({ selectedGameId: gameId })
        },

        setViewMode: (mode: 'overview' | 'detailed' | 'comparison') => {
          set({ viewMode: mode })
        },

        setSorting: (sortBy: string, order: 'asc' | 'desc') => {
          set({ 
            sortBy: sortBy as HistoryState['sortBy'], 
            sortOrder: order 
          })
        },

        setFilter: (filter: Partial<HistoryState['filterBy']>) => {
          set((state) => ({
            filterBy: { ...state.filterBy, ...filter }
          }))
        },

        clearFilters: () => {
          set({ filterBy: {} })
        },

        // Social features
        shareGame: async (gameId: string) => {
          // Implementation would integrate with backend/social platform
          const game = get().completedGames.find(g => g.id === gameId)
          if (game) {
            set((state) => ({
              completedGames: state.completedGames.map(g => 
                g.id === gameId ? { ...g, shared: true } : g
              )
            }))
            return true
          }
          return false
        },

        voteOnGame: async () => {
          // Implementation would integrate with backend voting system
          return true
        },

        addComment: async () => {
          // Implementation would integrate with backend comment system
          return true
        },

        // Data management
        exportHistory: () => {
          const { completedGames, performanceStats } = get()
          return JSON.stringify({ completedGames, performanceStats }, null, 2)
        },

        importHistory: async (data: string) => {
          try {
            const parsed = JSON.parse(data)
            if (parsed.completedGames && Array.isArray(parsed.completedGames)) {
              set({
                completedGames: parsed.completedGames,
                performanceStats: parsed.performanceStats || defaultPerformanceStats
              })
              return true
            }
            return false
          } catch {
            return false
          }
        },

        clearHistory: () => {
          set({
            completedGames: [],
            performanceStats: defaultPerformanceStats,
            learningRecommendations: [],
            selectedGameId: null
          })
        },

        // Error handling
        setError: (error: string | null) => {
          set({ error })
        },

        clearError: () => {
          set({ error: null })
        }
      }),
      {
        name: 'mahjong-history-storage',
        partialize: (state) => ({
          completedGames: state.completedGames,
          performanceStats: state.performanceStats,
          learningRecommendations: state.learningRecommendations
        })
      }
    ),
    {
      name: 'history-store'
    }
  )
)

// Selectors for common use cases
export const useGameHistory = () => useHistoryStore((state) => state.completedGames)
export const usePerformanceStats = () => useHistoryStore((state) => state.performanceStats)
export const useLearningRecommendations = () => useHistoryStore((state) => state.learningRecommendations)
export const useSelectedGame = () => useHistoryStore((state) => 
  state.completedGames.find(g => g.id === state.selectedGameId)
)