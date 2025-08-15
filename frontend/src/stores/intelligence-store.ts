// Intelligence Store - AI analysis and recommendations state
// Handles pattern analysis, tile recommendations, and Layer Cake UI state

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { PatternSelectionOption } from '../types/nmjl-types'
import type { PlayerTile } from '../types/tile-types'
import { AnalysisEngine } from '../services/analysis-engine'

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
  groups: any[]
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
  
  // Layer Cake UI State
  currentLayer: 1 | 2 | 3
  layersExpanded: Record<1 | 2 | 3, boolean>
  animationsEnabled: boolean
  
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
  
  // Actions - Layer Cake UI
  setCurrentLayer: (layer: 1 | 2 | 3) => void
  toggleLayer: (layer: 1 | 2 | 3) => void
  expandLayer: (layer: 1 | 2 | 3) => void
  collapseLayer: (layer: 1 | 2 | 3) => void
  expandAllLayers: () => void
  collapseAllLayers: () => void
  
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
      
      currentLayer: 1,
      layersExpanded: { 1: true, 2: false, 3: false },
      animationsEnabled: true,
      
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
          
          // Check cache first
          const cached = get().getCachedAnalysis(handHash)
          if (cached) {
            set({ 
              currentAnalysis: cached, 
              isAnalyzing: false 
            })
            return
          }
          
          // Use real analysis engine
          console.log('Running real analysis engine...')
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
      
      // Layer Cake UI Actions
      setCurrentLayer: (layer) => {
        set({ currentLayer: layer })
      },
      
      toggleLayer: (layer) => {
        set((state) => ({
          layersExpanded: {
            ...state.layersExpanded,
            [layer]: !state.layersExpanded[layer]
          }
        }))
      },
      
      expandLayer: (layer) => {
        set((state) => ({
          layersExpanded: {
            ...state.layersExpanded,
            [layer]: true
          }
        }))
      },
      
      collapseLayer: (layer) => {
        set((state) => ({
          layersExpanded: {
            ...state.layersExpanded,
            [layer]: false
          }
        }))
      },
      
      expandAllLayers: () => {
        set({ layersExpanded: { 1: true, 2: true, 3: true } })
      },
      
      collapseAllLayers: () => {
        set({ layersExpanded: { 1: true, 2: false, 3: false } })
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