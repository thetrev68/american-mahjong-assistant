// Tile Store - Hand management and tile input state
// Handles private player tiles, validation, and animations

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { PlayerTile } from 'shared-types'
import { tileService } from '../lib/services/tile-service'
import { lazyAnalysisEngine } from '../lib/services/analysis-engine-lazy'

// Local type definitions for tile store functionality
type TileInputMode = 'select' | 'input' | 'edit'

interface HandValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
  tileCount: number
  expectedCount: number
  duplicateErrors: string[]
}

interface TileAnimation {
  type: 'select' | 'deselect' | 'move' | 'highlight'
  duration: number
  delay?: number
}

interface TileRecommendation {
  action: 'keep' | 'pass' | 'discard' | 'neutral'
  confidence: number
  reasoning: string
  priority?: number
}

// Extended PlayerTile with animation support
interface AnimatedPlayerTile extends PlayerTile {
  animation?: TileAnimation
}

interface TileInputState {
  inputMode: TileInputMode
  isValidating: boolean
  validation: HandValidation
  showRecommendations: boolean
  selectedTiles: AnimatedPlayerTile[]
}

interface TileState extends TileInputState {
  // Hand Management
  playerHand: AnimatedPlayerTile[]
  handSize: number
  dealerHand: boolean // True if dealer (14 tiles), false if player (13)
  
  // Exposed tiles from calls (pung, kong, etc.)
  exposedTiles: AnimatedPlayerTile[]

  // Selection Area State
  selectedForAction: AnimatedPlayerTile[]
  tileStates: Record<string, string>
  
  // UI State
  selectedCount: number
  showAnimations: boolean
  sortBy: 'suit' | 'recommendation' | 'manual'
  
  // Analysis & Recommendations
  recommendations: Record<string, TileRecommendation>
  analysisInProgress: boolean
  lastAnalysis: number | null
  
  // Actions - Hand Management
  addTile: (tileId: string) => void
  removeTile: (instanceId: string) => void
  clearHand: () => void
  setDealerHand: (isDealer: boolean) => void
  
  // Actions - Exposed Tiles Management
  addExposedTiles: (tiles: AnimatedPlayerTile[], callType: string) => void
  setExposedTiles: (tiles: AnimatedPlayerTile[]) => void
  clearExposedTiles: () => void
  
  // Actions - Tile Selection
  toggleTileSelection: (instanceId: string) => void
  selectTile: (instanceId: string) => void
  deselectTile: (instanceId: string) => void
  selectAll: () => void
  deselectAll: () => void
  
  // Actions - Selection Area
  moveToSelection: (instanceId: string) => void
  returnFromSelection: (instanceId: string) => void
  lockTile: (instanceId: string) => void
  unlockTile: (instanceId: string) => void
  toggleTileLock: (instanceId: string) => void
  clearSelection: () => void
  
  // Actions - UI Controls
  setInputMode: (mode: TileInputMode) => void
  setSortBy: (sort: 'suit' | 'recommendation' | 'manual') => void
  setShowAnimations: (show: boolean) => void
  setShowRecommendations: (show: boolean) => void
  
  // Actions - Animations
  triggerTileAnimation: (instanceId: string, animation: TileAnimation) => void
  clearAnimations: () => void
  
  // Actions - Validation & Analysis
  validateHand: () => HandValidation
  analyzeHand: () => Promise<void>
  setRecommendation: (instanceId: string, recommendation: TileRecommendation) => void
  clearRecommendations: () => void
  
  // Actions - Bulk Operations
  importTilesFromString: (tileString: string) => void
  exportTilesToString: () => string
  sortHand: () => void
  
  // Getters
  getSelectedTiles: () => AnimatedPlayerTile[]
  getTileGroups: () => Record<string, AnimatedPlayerTile[]>
  getHandSummary: () => { total: number, selected: number, valid: boolean }
}

export const useTileStore = create<TileState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial State
        selectedTiles: [],
        playerHand: [],
        handSize: 0,
        dealerHand: false,
        exposedTiles: [],
        inputMode: 'select',
        isValidating: false,
        validation: {
          isValid: false,
          errors: [],
          warnings: [],
          tileCount: 0,
          expectedCount: 13,
          duplicateErrors: []
        },
        showRecommendations: true,
        selectedCount: 0,
        showAnimations: true,
        sortBy: 'suit',
        recommendations: {},
        analysisInProgress: false,
        lastAnalysis: null,
        
        // Selection Area State
        selectedForAction: [],
        tileStates: {},
        
        // Hand Management Actions
        addTile: (tileId: string) => {
          const playerTile = tileService.createPlayerTile(tileId)
          
          if (!playerTile) {
            return
          }
          
          set((state) => {
            const oldTileIds = state.playerHand.map(tile => tile.id)
            const newHand = [...state.playerHand, playerTile]
            const newTileIds = newHand.map(tile => tile.id)
            
            // Clear Engine 1 cache when hand changes (async, don't block)
            lazyAnalysisEngine.clearCacheForHandChange(oldTileIds, newTileIds)
            
            const validation = tileService.validateHand(newHand, state.dealerHand ? 14 : 13)
            
            return {
              playerHand: newHand,
              handSize: newHand.length,
              validation,
              lastAnalysis: null // Clear analysis timestamp when hand changes
            }
          })
        },
        
        removeTile: (instanceId: string) => {
          set((state) => {
            const oldTileIds = state.playerHand.map(tile => tile.id)
            const newHand = state.playerHand.filter(tile => tile.instanceId !== instanceId)
            const newTileIds = newHand.map(tile => tile.id)
            
            // Clear Engine 1 cache when hand changes (async, don't block)
            lazyAnalysisEngine.clearCacheForHandChange(oldTileIds, newTileIds)
            
            const validation = tileService.validateHand(newHand, state.dealerHand ? 14 : 13)
            
            // Remove from recommendations
            const newRecommendations = { ...state.recommendations }
            delete newRecommendations[instanceId]
            
            return {
              playerHand: newHand,
              handSize: newHand.length,
              validation,
              recommendations: newRecommendations,
              lastAnalysis: null // Clear analysis timestamp when hand changes
            }
          })
        },
        
        // Exposed Tiles Management Actions
        addExposedTiles: (tiles: PlayerTile[], callType: string) => {
          set((state) => ({
            exposedTiles: [...state.exposedTiles, ...tiles]
          }))
          console.log(`Added exposed tiles for ${callType}:`, tiles.map(t => t.displayName))
        },
        
        setExposedTiles: (tiles: PlayerTile[]) => {
          set({ exposedTiles: tiles })
        },
        
        clearExposedTiles: () => {
          set({ exposedTiles: [] })
        },
        
        clearHand: () => {
          console.log('🧹 clearHand called - stack trace:', new Error().stack)
          set((state) => {
            const oldTileIds = state.playerHand.map(tile => tile.id)
            const newTileIds: string[] = []

            // Clear Engine 1 cache when hand cleared (async, don't block)
            lazyAnalysisEngine.clearCacheForHandChange(oldTileIds, newTileIds)

            return {
              playerHand: [],
              handSize: 0,
              selectedTiles: [],
              selectedCount: 0,
              recommendations: {},
              lastAnalysis: null, // Clear analysis timestamp
              selectedForAction: [],
              tileStates: {},
              exposedTiles: [],
              validation: {
                isValid: false,
                errors: [],
                warnings: [],
                tileCount: 0,
                expectedCount: state.dealerHand ? 14 : 13,
                duplicateErrors: []
              }
            }
          })
        },
        
        setDealerHand: (isDealer: boolean) => {
          set((state) => {
            const expectedCount = isDealer ? 14 : 13
            const validation = tileService.validateHand(state.playerHand, expectedCount)
            
            return {
              dealerHand: isDealer,
              validation: {
                ...validation,
                expectedCount
              }
            }
          })
        },
        
        // Selection Actions
        toggleTileSelection: (instanceId: string) => {
          set((state) => {
            const newHand = state.playerHand.map(tile => {
              if (tile.instanceId === instanceId) {
                const newSelected = !tile.isSelected
                
                // Trigger animation
                if (get().showAnimations) {
                  tile.animation = {
                    type: newSelected ? 'select' : 'deselect',
                    duration: 200
                  }
                }
                
                return { ...tile, isSelected: newSelected }
              }
              return tile
            })
            
            const selectedTiles = newHand.filter(tile => tile.isSelected)
            
            return {
              playerHand: newHand,
              selectedTiles,
              selectedCount: selectedTiles.length
            }
          })
        },
        
        selectTile: (instanceId: string) => {
          const tile = get().playerHand.find(t => t.instanceId === instanceId)
          if (tile && !tile.isSelected) {
            get().toggleTileSelection(instanceId)
          }
        },
        
        deselectTile: (instanceId: string) => {
          const tile = get().playerHand.find(t => t.instanceId === instanceId)
          if (tile && tile.isSelected) {
            get().toggleTileSelection(instanceId)
          }
        },
        
        selectAll: () => {
          set((state) => {
            const newHand = state.playerHand.map(tile => ({ ...tile, isSelected: true }))
            return {
              playerHand: newHand,
              selectedTiles: newHand,
              selectedCount: newHand.length
            }
          })
        },
        
        deselectAll: () => {
          set((state) => {
            const newHand = state.playerHand.map(tile => ({ ...tile, isSelected: false }))
            return {
              playerHand: newHand,
              selectedTiles: [],
              selectedCount: 0
            }
          })
        },
        
        // UI Control Actions
        setInputMode: (mode: TileInputMode) => {
          set({ inputMode: mode })
        },
        
        setSortBy: (sortBy) => {
          set({ sortBy })
          get().sortHand()
        },
        
        setShowAnimations: (show: boolean) => {
          set({ showAnimations: show })
        },
        
        setShowRecommendations: (show: boolean) => {
          set({ showRecommendations: show })
        },
        
        // Animation Actions
        triggerTileAnimation: (instanceId: string, animation: TileAnimation) => {
          set((state) => ({
            playerHand: state.playerHand.map(tile =>
              tile.instanceId === instanceId
                ? { ...tile, animation }
                : tile
            )
          }))
          
          // Clear animation after duration
          setTimeout(() => {
            set((state) => ({
              playerHand: state.playerHand.map(tile =>
                tile.instanceId === instanceId
                  ? { ...tile, animation: undefined }
                  : tile
              )
            }))
          }, animation.duration + (animation.delay || 0))
        },
        
        clearAnimations: () => {
          set((state) => ({
            playerHand: state.playerHand.map(tile => ({ ...tile, animation: undefined }))
          }))
        },
        
        // Validation & Analysis
        validateHand: () => {
          const { playerHand, dealerHand } = get()
          const validation = tileService.validateHand(playerHand, dealerHand ? 14 : 13)
          
          set({ validation })
          return validation
        },
        
        analyzeHand: async () => {
          const state = get()
          set({ analysisInProgress: true })
          
          try {
            // Import real-time analysis service
            const { RealTimeAnalysisService } = await import('../features/intelligence-panel/services/real-time-analysis-service')
            const { nmjlService } = await import('../lib/services/nmjl-service')
            
            // Get available patterns
            const patterns = await nmjlService.loadPatterns()
            
            // Create analysis context
            const context = {
              playerId: 'current-player',
              gamePhase: 'charleston' as const,
              selectedPatterns: [], // Would come from pattern store
              wallTilesRemaining: 100, // Would come from game state
              discardPile: [],
              exposedTiles: {},
              currentRound: 1
            }
            
            // Perform real-time analysis
            const analysisResult = await RealTimeAnalysisService.analyzeAllPatterns(
              state.playerHand,
              patterns,
              context
            )
            
            // Log performance metrics
            const perfMetrics = RealTimeAnalysisService.getPerformanceMetrics(analysisResult)
            console.log(`🧠 Pattern Analysis Complete: ${analysisResult.performanceMs}ms (Grade: ${perfMetrics.performanceGrade})`)
            
            // Update recommendations
            const newRecommendations: { [instanceId: string]: TileRecommendation } = {}
            analysisResult.topRecommendations.forEach((rec) => {
              const displayText = RealTimeAnalysisService.formatRecommendationDisplay(rec)
              console.log(displayText)
              
              // Create recommendations for relevant tiles
              state.playerHand.forEach(tile => {
                if (rec.tilesNeeded > 0) {
                  newRecommendations[tile.instanceId] = {
                    action: rec.completionPercentage > 50 ? 'keep' : 'neutral',
                    confidence: rec.aiScore / 100,
                    reasoning: `${rec.badge} ${rec.pattern.Hand_Description} (${rec.completionPercentage}%)`,
                    priority: rec.rank
                  }
                }
              })
            })
            
            set({
              analysisInProgress: false,
              lastAnalysis: Date.now(),
              recommendations: newRecommendations
            })
          } catch (error) {
            console.error('Real-time pattern analysis failed:', error)
            // Analysis failed - continue silently but log error
            set({ analysisInProgress: false })
          }
        },
        
        setRecommendation: (instanceId: string, recommendation: TileRecommendation) => {
          set((state) => ({
            recommendations: {
              ...state.recommendations,
              [instanceId]: recommendation
            }
          }))
        },
        
        clearRecommendations: () => {
          set({ recommendations: {} })
        },
        
        // Bulk Operations
        importTilesFromString: (tileString: string) => {
          console.log('🔧 importTilesFromString called with:', tileString)
          const tileIds = tileString.trim().split(/\s+/)
          console.log('🔧 Parsed tile IDs:', tileIds)
          
          const validTiles: PlayerTile[] = []
          
          tileIds.forEach(tileId => {
            const tile = tileService.createPlayerTile(tileId)
            if (tile) {
              validTiles.push(tile)
            } else {
              console.log('🔧 Failed to create tile for ID:', tileId)
            }
          })
          
          console.log('🔧 Valid tiles created:', validTiles.length)
          
          set((state) => {
            const oldTileIds = state.playerHand.map(tile => tile.id)
            const newTileIds = validTiles.map(tile => tile.id)
            
            // Clear Engine 1 cache when hand changes (async, don't block)
            lazyAnalysisEngine.clearCacheForHandChange(oldTileIds, newTileIds)
            
            const validation = tileService.validateHand(validTiles, state.dealerHand ? 14 : 13)
            
            const newState = {
              playerHand: validTiles,
              handSize: validTiles.length,
              validation,
              selectedTiles: [],
              selectedCount: 0,
              lastAnalysis: null,
              selectedForAction: [],
              tileStates: {}
            }
            
            console.log('🔧 importTilesFromString: New hand size:', newState.handSize)
            return newState
          })
        },
        
        exportTilesToString: () => {
          const { playerHand } = get()
          return playerHand.map(tile => tile.id).join(' ')
        },
        
        sortHand: () => {
          set((state) => {
            let sortedHand: PlayerTile[]
            
            switch (state.sortBy) {
              case 'suit':
                sortedHand = tileService.sortTiles(state.playerHand)
                break
                
              case 'recommendation':
                sortedHand = [...state.playerHand].sort((a, b) => {
                  const recA = state.recommendations[a.instanceId]
                  const recB = state.recommendations[b.instanceId]
                  
                  if (!recA && !recB) return 0
                  if (!recA) return 1
                  if (!recB) return -1
                  
                  // Sort by priority, then by confidence
                  if ((recA.priority || 0) !== (recB.priority || 0)) {
                    return (recB.priority || 0) - (recA.priority || 0)
                  }
                  return recB.confidence - recA.confidence
                })
                break
                
              case 'manual':
                // Keep current order
                sortedHand = state.playerHand
                break
                
              default:
                sortedHand = tileService.sortTiles(state.playerHand)
            }
            
            return { playerHand: sortedHand }
          })
        },
        
        // Getters
        getSelectedTiles: () => {
          return get().playerHand.filter(tile => tile.isSelected)
        },
        
        getTileGroups: () => {
          const { playerHand } = get()
          return tileService.getTilesGroupedBySuit(playerHand)
        },
        
        getHandSummary: () => {
          const { playerHand, validation, selectedCount } = get()
          return {
            total: playerHand.length,
            selected: selectedCount,
            valid: validation.isValid
          }
        },
        
        // Selection Area Actions
        moveToSelection: (instanceId: string) => {
          set((state) => {
            const tile = state.playerHand.find(t => t.instanceId === instanceId)
            if (!tile) return state

            // Preserve locked state when moving to selection
            const currentState = state.tileStates[instanceId]
            const newTileStates = {
              ...state.tileStates,
              [instanceId]: currentState === 'locked' ? 'locked-placeholder' : 'placeholder'
            }

            // Add to selection area if not already there
            const isAlreadyInSelection = state.selectedForAction.some(t => t.instanceId === instanceId)
            const newSelectedForAction = isAlreadyInSelection
              ? state.selectedForAction
              : [...state.selectedForAction, tile]

            return {
              selectedForAction: newSelectedForAction,
              tileStates: newTileStates
            }
          })
        },
        
        returnFromSelection: (instanceId: string) => {
          set((state) => {
            const newSelectedForAction = state.selectedForAction.filter(t => t.instanceId !== instanceId)
            const newTileStates = { ...state.tileStates }

            // Handle different placeholder states
            const currentState = newTileStates[instanceId]
            if (currentState === 'placeholder') {
              delete newTileStates[instanceId]
            } else if (currentState === 'locked-placeholder') {
              newTileStates[instanceId] = 'locked'
            }

            return {
              selectedForAction: newSelectedForAction,
              tileStates: newTileStates
            }
          })
        },
        
        lockTile: (instanceId: string) => {
          set((state) => ({
            tileStates: {
              ...state.tileStates,
              [instanceId]: 'locked'
            }
          }))
        },

        unlockTile: (instanceId: string) => {
          set((state) => {
            const newTileStates = { ...state.tileStates }
            delete newTileStates[instanceId]
            return {
              tileStates: newTileStates
            }
          })
        },

        toggleTileLock: (instanceId: string) => {
          const state = get()
          const isLocked = state.tileStates[instanceId] === 'locked'
          if (isLocked) {
            state.unlockTile(instanceId)
          } else {
            state.lockTile(instanceId)
          }
        },
        
        clearSelection: () => {
          set((state) => {
            // Preserve locked states and placeholder states, clear only selection-related states
            const preservedStates: Record<string, string> = {}
            for (const [instanceId, tileState] of Object.entries(state.tileStates)) {
              if (tileState === 'locked') {
                preservedStates[instanceId] = tileState
              }
            }

            return {
              ...state,
              selectedForAction: [],
              tileStates: preservedStates
            }
          })
        }
      }),
      {
        name: 'tile-store',
        partialize: (state) => ({
          // Persist game progress to localStorage - survives browser restart
          // Essential for maintaining player hand state during gameplay sessions
          playerHand: state.playerHand,
          dealerHand: state.dealerHand,
          showRecommendations: state.showRecommendations,
          sortBy: state.sortBy,
          handSize: state.playerHand.length, // Ensure handSize matches playerHand length
          selectedCount: state.playerHand.filter(tile => tile.isSelected).length
        }),
        onRehydrateStorage: () => (state) => {
          // Fix any state inconsistencies after rehydration
          if (state) {
            console.log('🔧 Rehydrating tile store with:', state.playerHand?.length || 0, 'tiles')
            state.handSize = state.playerHand?.length || 0
            state.selectedCount = state.playerHand?.filter(tile => tile.isSelected).length || 0
            state.selectedTiles = state.playerHand?.filter(tile => tile.isSelected) || []
            
            // Defer expensive validation to avoid blocking UI render
            if (state.playerHand && state.playerHand.length > 0) {
              // Use next tick to avoid blocking store hydration
              Promise.resolve().then(() => {
                const validation = tileService.validateHand(state.playerHand, state.dealerHand ? 14 : 13)
                // Update validation asynchronously
                useTileStore.setState({ validation })
              })
            }
          }
        }
      }
    )
  )
)