// Intelligence Store - AI analysis and recommendations state
// Handles pattern analysis, tile recommendations, and What If scenarios

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { PatternSelectionOption, PatternGroup } from '../../../shared/nmjl-types'
import type { PlayerTile } from '../types/tile-types'
import { AnalysisEngine } from '../services/analysis-engine'
import { getTurnIntelligenceEngine } from '../services/turn-intelligence-engine'
import { getOpponentAnalysisEngine } from '../services/opponent-analysis-engine'
import { getCallOpportunityAnalyzer } from '../services/call-opportunity-analyzer'
import type { TurnRecommendations, DefensiveAnalysis, PatternSwitchSuggestion, GameState } from '../services/turn-intelligence-engine'
import type { OpponentProfile, DangerousTileAnalysis } from '../services/opponent-analysis-engine'
import type { CallRecommendation, CallOpportunity, CallAnalysisContext } from '../services/call-opportunity-analyzer'

export interface TileRecommendation {
  tileId: string
  action: 'keep' | 'pass' | 'discard' | 'neutral'
  confidence: number // 0-100
  reasoning: string
  priority: number // 1-10
  alternativeActions?: Array<{
    action: 'keep' | 'pass' | 'discard'
    confidence: number
    reasoning: string
  }>
}

export interface PatternAnalysis {
  patternId: string
  section: string | number
  line: number
  pattern: string
  groups: PatternGroup[]
  completionPercentage: number
  tilesNeeded: number
  missingTiles: string[]
  confidenceScore: number
  difficulty: 'easy' | 'medium' | 'hard'
  estimatedTurns: number
  riskLevel: 'low' | 'medium' | 'high'
  strategicValue: number // 1-10
}

export interface PatternRecommendation {
  pattern: PatternSelectionOption
  confidence: number
  completionPercentage: number
  reasoning: string
  difficulty: 'easy' | 'medium' | 'hard'
  isPrimary: boolean
  
  // Enhanced analysis breakdown
  analysis?: {
    currentTiles: {
      count: number
      percentage: number
      matchingGroups: string[]
    }
    missingTiles: {
      total: number
      byAvailability: {
        easy: string[]
        moderate: string[]
        difficult: string[]
        impossible: string[]
      }
    }
    jokerSituation: {
      available: number
      needed: number
      canComplete: boolean
      substitutionPlan: { [tileId: string]: boolean }
    }
    strategicValue: {
      tilePriorities: { [tileId: string]: number }
      groupPriorities: { [groupName: string]: number }
      overallPriority: number
      reasoning: string[]
    }
    gameState: {
      wallTilesRemaining: number
      turnsEstimated: number
      drawProbability: number
    }
  }
  
  // Score components for transparency
  scoreBreakdown?: {
    currentTileScore: number    // 0-40 points
    availabilityScore: number   // 0-30 points
    jokerScore: number         // 0-20 points
    priorityScore: number      // 0-10 points
  }
  
  // Strategic recommendations
  recommendations?: {
    shouldPursue: boolean
    alternativePatterns: string[]
    strategicNotes: string[]
    riskFactors: string[]
  }
}

export interface HandAnalysis {
  overallScore: number // 1-100
  recommendedPatterns: PatternRecommendation[] // AI's top 3 recommendations
  bestPatterns: PatternAnalysis[] // Detailed analysis of all viable patterns
  tileRecommendations: TileRecommendation[]
  strategicAdvice: string[]
  threats: {
    level: 'low' | 'medium' | 'high'
    description: string
    mitigation: string
  }[]
  lastUpdated: number
  analysisVersion: string
  engine1Facts?: Array<{ patternId: string; tileMatching?: { bestVariation?: { patternTiles: string[]; sequence: number } } }> // Engine 1 pattern analysis facts with tile arrays
  
  // Phase 4C: Enhanced turn-aware intelligence
  turnIntelligence?: TurnRecommendations
  opponentAnalysis?: OpponentProfile[]
  defensiveAnalysis?: DefensiveAnalysis
  patternSwitchSuggestions?: PatternSwitchSuggestion[]
  dangerousTiles?: DangerousTileAnalysis[]
  currentCallRecommendation?: CallRecommendation
}

export interface WhatIfScenario {
  id: string
  name: string
  tileChanges: Array<{
    remove?: string
    add?: string
  }>
  analysis: HandAnalysis
  comparisonScore: number // vs current hand
}

export interface IntelligenceState {
  // Analysis State
  currentAnalysis: HandAnalysis | null
  isAnalyzing: boolean
  analysisError: string | null
  
  
  // What If Analysis
  whatIfMode: boolean
  whatIfScenarios: WhatIfScenario[]
  activeScenario: string | null
  
  // User Preferences
  showConfidenceScores: boolean
  autoAnalyze: boolean
  analysisDetailLevel: 'basic' | 'detailed' | 'expert'
  
  // Cache
  analysisCache: Record<string, HandAnalysis>
  cacheTimeout: number
  
  // Actions - Analysis
  analyzeHand: (tiles: PlayerTile[], patterns: PatternSelectionOption[]) => Promise<void>
  clearAnalysis: () => void
  refreshAnalysis: () => Promise<void>
  
  
  // Actions - What If Mode
  enableWhatIfMode: () => void
  disableWhatIfMode: () => void
  createWhatIfScenario: (name: string, changes: WhatIfScenario['tileChanges']) => Promise<string>
  removeWhatIfScenario: (id: string) => void
  setActiveScenario: (id: string | null) => void
  
  // Actions - Preferences
  setShowConfidenceScores: (show: boolean) => void
  setAutoAnalyze: (auto: boolean) => void
  setAnalysisDetailLevel: (level: 'basic' | 'detailed' | 'expert') => void
  
  // Actions - Cache
  getCachedAnalysis: (handHash: string) => HandAnalysis | null
  setCachedAnalysis: (handHash: string, analysis: HandAnalysis) => void
  clearCache: () => void
  
  // Phase 4C: Enhanced intelligence actions
  analyzeTurnSituation: (playerId: string, gameState: GameState) => Promise<void>
  analyzeOpponents: (gameState: GameState, excludePlayerId: string) => Promise<void>
  analyzeCallOpportunity: (opportunity: CallOpportunity, context: CallAnalysisContext) => Promise<void>
  updateDefensiveAnalysis: (gameState: GameState, playerId: string) => Promise<void>
  
  // Getters
  getTopRecommendations: (limit?: number) => TileRecommendation[]
  getBestPatterns: (limit?: number) => PatternAnalysis[]
  getConfidenceLevel: () => 'low' | 'medium' | 'high'
  getStrategicSummary: () => string
}

export const useIntelligenceStore = create<IntelligenceState>()(
  devtools(
    (set, get) => ({
      // Initial State
      currentAnalysis: null,
      isAnalyzing: false,
      analysisError: null,
      
      
      whatIfMode: false,
      whatIfScenarios: [],
      activeScenario: null,
      
      showConfidenceScores: true,
      autoAnalyze: true,
      analysisDetailLevel: 'detailed',
      
      analysisCache: {},
      cacheTimeout: 5 * 60 * 1000, // 5 minutes
      
      // Analysis Actions  
      analyzeHand: async (tiles, patterns = []) => {
        set({ isAnalyzing: true, analysisError: null })
        
        try {
          // Create a hash of the current hand state
          const handHash = createHandHash(tiles, patterns)
          
          // Check if this is a pattern switch (same tiles, different patterns)
          const { currentAnalysis } = get()
          const isPatternSwitch = currentAnalysis && 
            tiles.length > 0 && 
            patterns.length === 1 && 
            currentAnalysis.recommendedPatterns.some(p => p.pattern.id !== patterns[0].id)
          
          if (!isPatternSwitch) {
            // Clear cache only for full re-analysis (not pattern switches)
            get().clearCache()
          }
          
          // Use real analysis engine
          const analysis = await AnalysisEngine.analyzeHand(tiles, patterns)
          
          // Cache the analysis
          get().setCachedAnalysis(handHash, analysis)
          
          set({ 
            currentAnalysis: analysis,
            isAnalyzing: false 
          })
          
        } catch (error) {
          set({ 
            analysisError: error instanceof Error ? error.message : 'Analysis failed',
            isAnalyzing: false 
          })
        }
      },
      
      clearAnalysis: () => {
        set({ 
          currentAnalysis: null, 
          analysisError: null,
          whatIfScenarios: [],
          activeScenario: null
        })
      },
      
      refreshAnalysis: async () => {
        const { currentAnalysis } = get()
        if (currentAnalysis) {
          // Force re-analysis by clearing cache entry
          // This would need tiles and patterns from current state
          await get().analyzeHand([], []) // Placeholder
        }
      },
      
      
      // What If Actions
      enableWhatIfMode: () => {
        set({ whatIfMode: true })
      },
      
      disableWhatIfMode: () => {
        set({ 
          whatIfMode: false,
          whatIfScenarios: [],
          activeScenario: null
        })
      },
      
      createWhatIfScenario: async (name, changes) => {
        const id = `scenario_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        // Mock scenario analysis
        const mockAnalysis: HandAnalysis = {
          overallScore: Math.floor(Math.random() * 40) + 60,
          recommendedPatterns: [],
          bestPatterns: [],
          tileRecommendations: [],
          strategicAdvice: [`What if analysis: ${name}`],
          threats: [],
          lastUpdated: Date.now(),
          analysisVersion: '1.0.0'
        }
        
        const scenario: WhatIfScenario = {
          id,
          name,
          tileChanges: changes,
          analysis: mockAnalysis,
          comparisonScore: Math.floor(Math.random() * 20) - 10 // -10 to +10
        }
        
        set((state) => ({
          whatIfScenarios: [...state.whatIfScenarios, scenario]
        }))
        
        return id
      },
      
      removeWhatIfScenario: (id) => {
        set((state) => ({
          whatIfScenarios: state.whatIfScenarios.filter(s => s.id !== id),
          activeScenario: state.activeScenario === id ? null : state.activeScenario
        }))
      },
      
      setActiveScenario: (id) => {
        set({ activeScenario: id })
      },
      
      // Preference Actions
      setShowConfidenceScores: (show) => {
        set({ showConfidenceScores: show })
      },
      
      setAutoAnalyze: (auto) => {
        set({ autoAnalyze: auto })
      },
      
      setAnalysisDetailLevel: (level) => {
        set({ analysisDetailLevel: level })
      },
      
      // Cache Actions
      getCachedAnalysis: (handHash) => {
        const { analysisCache, cacheTimeout } = get()
        const cached = analysisCache[handHash]
        
        if (cached && Date.now() - cached.lastUpdated < cacheTimeout) {
          return cached
        }
        
        return null
      },
      
      setCachedAnalysis: (handHash, analysis) => {
        set((state) => ({
          analysisCache: {
            ...state.analysisCache,
            [handHash]: analysis
          }
        }))
      },
      
      clearCache: () => {
        set({ analysisCache: {} })
      },
      
      // Phase 4C: Enhanced intelligence implementations
      analyzeTurnSituation: async (playerId: string, gameState: GameState) => {
        try {
          const turnIntelligenceEngine = getTurnIntelligenceEngine()
          const turnRecommendations = await turnIntelligenceEngine.analyzeCurrentTurn(gameState, playerId)
          
          set(state => ({
            currentAnalysis: state.currentAnalysis ? {
              ...state.currentAnalysis,
              turnIntelligence: turnRecommendations,
              analysisVersion: '4C-turn-aware'
            } : null
          }))
        } catch (error) {
          console.error('Turn situation analysis failed:', error)
        }
      },

      analyzeOpponents: async (gameState: GameState, excludePlayerId: string) => {
        try {
          const opponentAnalysisEngine = getOpponentAnalysisEngine()
          const opponentProfiles = opponentAnalysisEngine.analyzeAllOpponents(gameState, excludePlayerId)
          const dangerousTiles = opponentAnalysisEngine.identifyDangerousTilesForAll(gameState, excludePlayerId)
          
          set(state => ({
            currentAnalysis: state.currentAnalysis ? {
              ...state.currentAnalysis,
              opponentAnalysis: opponentProfiles,
              dangerousTiles: dangerousTiles
            } : null
          }))
        } catch (error) {
          console.error('Opponent analysis failed:', error)
        }
      },

      analyzeCallOpportunity: async (opportunity: CallOpportunity, context: CallAnalysisContext) => {
        try {
          const callOpportunityAnalyzer = getCallOpportunityAnalyzer()
          const callRecommendation = await callOpportunityAnalyzer.analyzeCallOpportunity(opportunity, context)
          
          set(state => ({
            currentAnalysis: state.currentAnalysis ? {
              ...state.currentAnalysis,
              currentCallRecommendation: callRecommendation
            } : null
          }))
        } catch (error) {
          console.error('Call opportunity analysis failed:', error)
        }
      },

      updateDefensiveAnalysis: async (gameState: GameState, playerId: string) => {
        try {
          const turnIntelligenceEngine = getTurnIntelligenceEngine()
          
          // This would be part of a larger turn analysis, but we can call it separately
          const mockTurnRecommendations = await turnIntelligenceEngine.analyzeCurrentTurn(gameState, playerId)
          
          set(state => ({
            currentAnalysis: state.currentAnalysis ? {
              ...state.currentAnalysis,
              defensiveAnalysis: mockTurnRecommendations.defensiveAnalysis,
              patternSwitchSuggestions: mockTurnRecommendations.patternSwitchSuggestions
            } : null
          }))
        } catch (error) {
          console.error('Defensive analysis failed:', error)
        }
      },
      
      // Getters
      getTopRecommendations: (limit = 5) => {
        const { currentAnalysis } = get()
        if (!currentAnalysis) return []
        
        return currentAnalysis.tileRecommendations
          .sort((a, b) => b.priority - a.priority)
          .slice(0, limit)
      },
      
      getBestPatterns: (limit = 3) => {
        const { currentAnalysis } = get()
        if (!currentAnalysis) return []
        
        return currentAnalysis.bestPatterns
          .sort((a, b) => b.strategicValue - a.strategicValue)
          .slice(0, limit)
      },
      
      getConfidenceLevel: () => {
        const { currentAnalysis } = get()
        if (!currentAnalysis) return 'low'
        
        const avgConfidence = currentAnalysis.tileRecommendations.reduce(
          (acc, rec) => acc + rec.confidence, 0
        ) / currentAnalysis.tileRecommendations.length
        
        if (avgConfidence >= 80) return 'high'
        if (avgConfidence >= 60) return 'medium'
        return 'low'
      },
      
      getStrategicSummary: () => {
        const { currentAnalysis } = get()
        if (!currentAnalysis) return 'No analysis available'
        
        const bestPattern = currentAnalysis.bestPatterns[0]
        if (!bestPattern) return 'Analyzing patterns...'
        
        return `Focus on pattern completion (${bestPattern.completionPercentage}% complete). ${bestPattern.tilesNeeded} tiles needed.`
      }
    })
  )
)

// Utility function to create a hash of hand state
function createHandHash(tiles: PlayerTile[], patterns: PatternSelectionOption[]): string {
  const tileIds = tiles.map(t => t.id).sort().join(',')
  const patternIds = patterns.map(p => p.id).sort().join(',')
  return `${tileIds}|${patternIds}`
}