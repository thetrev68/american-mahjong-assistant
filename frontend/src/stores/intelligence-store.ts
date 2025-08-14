// Intelligence Store - AI analysis and recommendations state
// Handles pattern analysis, tile recommendations, and Layer Cake UI state

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { PatternSelectionOption } from '../types/nmjl-types'
import type { PlayerTile } from '../types/tile-types'

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
  patternId: number
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
          
          // Simulate AI analysis (in real implementation, this would call the intelligence layer)
          await new Promise(resolve => setTimeout(resolve, 1500))
          
          // Get all available patterns for AI recommendation (mock)
          const { nmjlService } = await import('../services/nmjl-service')
          const allPatterns = await nmjlService.getSelectionOptions()
          
          // Mock AI pattern selection - pick 3 random patterns as recommendations
          const shuffledPatterns = [...allPatterns].sort(() => Math.random() - 0.5)
          const topRecommendations = shuffledPatterns.slice(0, 3)
          
          // Mock analysis results
          const analysis: HandAnalysis = {
            overallScore: Math.floor(Math.random() * 40) + 60, // 60-100
            
            // AI pattern recommendations (primary + 2 alternates)
            recommendedPatterns: topRecommendations.map((pattern, index) => ({
              pattern,
              confidence: Math.floor(Math.random() * 30) + 70 - (index * 10), // Primary has highest confidence
              completionPercentage: Math.floor(Math.random() * 60) + 20 + (index === 0 ? 20 : 0), // Primary gets bonus
              reasoning: index === 0 
                ? `Best match for your current tiles - highest completion probability`
                : `Strong alternative option with good strategic value`,
              difficulty: pattern.difficulty,
              isPrimary: index === 0
            })),
            
            // Detailed analysis of recommended patterns
            bestPatterns: topRecommendations.map((pattern, index) => ({
              patternId: parseInt(pattern.id) || index,
              completionPercentage: Math.floor(Math.random() * 60) + 20, // 20-80
              tilesNeeded: Math.floor(Math.random() * 8) + 2, // 2-10
              missingTiles: ['1D', '2B', '3C'].slice(0, Math.floor(Math.random() * 3) + 1),
              confidenceScore: Math.floor(Math.random() * 30) + 70, // 70-100
              difficulty: pattern.difficulty,
              estimatedTurns: Math.floor(Math.random() * 10) + 3, // 3-13
              riskLevel: ['low', 'medium', 'high'][index % 3] as 'low' | 'medium' | 'high',
              strategicValue: Math.floor(Math.random() * 4) + 6 // 6-10
            })),
            tileRecommendations: tiles.slice(0, 5).map(tile => ({
              tileId: tile.id,
              action: ['keep', 'pass', 'discard'][Math.floor(Math.random() * 3)] as 'keep' | 'pass' | 'discard',
              confidence: Math.floor(Math.random() * 40) + 60, // 60-100
              reasoning: `Strategic ${tile.displayName} recommendation based on pattern analysis`,
              priority: Math.floor(Math.random() * 5) + 5 // 5-10
            })),
            strategicAdvice: [
              'Focus on completing the highest probability pattern',
              'Consider defensive play against potential threats',
              'Optimize tile efficiency for maximum flexibility'
            ],
            threats: [
              {
                level: 'medium' as const,
                description: 'Opponent may be close to mahjong',
                mitigation: 'Hold defensive tiles and avoid dangerous discards'
              }
            ],
            lastUpdated: Date.now(),
            analysisVersion: '1.0.0'
          }
          
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