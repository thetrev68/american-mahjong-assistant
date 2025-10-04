// Tile Store - Hand management and tile input state
// Handles private player tiles, validation, and animations

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { PlayerTile } from 'shared-types'
import { tileService } from '../lib/services/tile-service'
import { lazyAnalysisEngine } from '../lib/services/analysis-engine-lazy'
import { useDevPerspectiveStore } from './dev-perspective.store'
import { useMultiplayerStore } from './multiplayer-store'

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
  // Multiplayer Support - Store hands per player
  playerHands: Record<string, AnimatedPlayerTile[]> // playerId -> tiles
  handSizes: Record<string, number> // playerId -> hand size
  dealerHands: Record<string, boolean> // playerId -> is dealer

  // Exposed tiles from calls (pung, kong, etc.) - per player
  exposedTilesMap: Record<string, AnimatedPlayerTile[]> // playerId -> exposed tiles

  // Selection Area State - per player
  selectedForActionMap: Record<string, AnimatedPlayerTile[]> // playerId -> selected tiles
  tileStatesMap: Record<string, Record<string, string>> // playerId -> (instanceId -> state)

  // Legacy single-player accessors (computed from current effective player)
  playerHand: AnimatedPlayerTile[]
  handSize: number
  dealerHand: boolean
  exposedTiles: AnimatedPlayerTile[]
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

// Helper to get effective player ID (respects dev perspective)
const getEffectivePlayerId = (): string => {
  const multiplayerStore = useMultiplayerStore.getState()
  const devStore = useDevPerspectiveStore.getState()
  const effectiveId = devStore.getEffectivePlayerId(multiplayerStore.currentPlayerId)
  // Use a default fallback for single-player mode
  return effectiveId || 'single-player'
}

export const useTileStore = create<TileState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial State - Multiplayer maps
        playerHands: {},
        handSizes: {},
        dealerHands: {},
        exposedTilesMap: {},
        selectedForActionMap: {},
        tileStatesMap: {},

        // Legacy computed properties (dynamically computed from effective player)
        get playerHand() {
          const playerId = getEffectivePlayerId()
          return get().playerHands[playerId] || []
        },
        get handSize() {
          const playerId = getEffectivePlayerId()
          return get().handSizes[playerId] || 0
        },
        get dealerHand() {
          const playerId = getEffectivePlayerId()
          return get().dealerHands[playerId] || false
        },
        get exposedTiles() {
          const playerId = getEffectivePlayerId()
          return get().exposedTilesMap[playerId] || []
        },
        get selectedForAction() {
          const playerId = getEffectivePlayerId()
          return get().selectedForActionMap[playerId] || []
        },
        get tileStates() {
          const playerId = getEffectivePlayerId()
          return get().tileStatesMap[playerId] || {}
        },

        // Shared state (not player-specific)
        selectedTiles: [],
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
        
        // Hand Management Actions
        addTile: (tileId: string) => {
          const playerTile = tileService.createPlayerTile(tileId)

          if (!playerTile) {
            return
          }

          const playerId = getEffectivePlayerId()

          set((state) => {
            const currentHand = state.playerHands[playerId] || []
            const currentDealer = state.dealerHands[playerId] || false

            const oldTileIds = currentHand.map(tile => tile.id)
            const newHand = [...currentHand, playerTile]
            const newTileIds = newHand.map(tile => tile.id)

            // Clear Engine 1 cache when hand changes (async, don't block)
            lazyAnalysisEngine.clearCacheForHandChange(oldTileIds, newTileIds)

            const validation = tileService.validateHand(newHand, currentDealer ? 14 : 13)

            return {
              playerHands: {
                ...state.playerHands,
                [playerId]: newHand
              },
              handSizes: {
                ...state.handSizes,
                [playerId]: newHand.length
              },
              validation,
              lastAnalysis: null // Clear analysis timestamp when hand changes
            }
          })
        },
        
        removeTile: (instanceId: string) => {
          const playerId = getEffectivePlayerId()

          set((state) => {
            const currentHand = state.playerHands[playerId] || []
            const currentDealer = state.dealerHands[playerId] || false

            const oldTileIds = currentHand.map(tile => tile.id)
            const newHand = currentHand.filter(tile => tile.instanceId !== instanceId)
            const newTileIds = newHand.map(tile => tile.id)

            // Clear Engine 1 cache when hand changes (async, don't block)
            lazyAnalysisEngine.clearCacheForHandChange(oldTileIds, newTileIds)

            const validation = tileService.validateHand(newHand, currentDealer ? 14 : 13)

            // Remove from recommendations
            const newRecommendations = { ...state.recommendations }
            delete newRecommendations[instanceId]

            return {
              playerHands: {
                ...state.playerHands,
                [playerId]: newHand
              },
              handSizes: {
                ...state.handSizes,
                [playerId]: newHand.length
              },
              validation,
              recommendations: newRecommendations,
              lastAnalysis: null // Clear analysis timestamp when hand changes
            }
          })
        },
        
        // Exposed Tiles Management Actions
        addExposedTiles: (tiles: PlayerTile[], callType: string) => {
          const playerId = getEffectivePlayerId()
          set((state) => {
            const currentExposed = state.exposedTilesMap[playerId] || []
            return {
              exposedTilesMap: {
                ...state.exposedTilesMap,
                [playerId]: [...currentExposed, ...tiles]
              }
            }
          })
          console.log(`Added exposed tiles for ${callType}:`, tiles.map(t => t.displayName))
        },

        setExposedTiles: (tiles: PlayerTile[]) => {
          const playerId = getEffectivePlayerId()
          set((state) => ({
            exposedTilesMap: {
              ...state.exposedTilesMap,
              [playerId]: tiles
            }
          }))
        },

        clearExposedTiles: () => {
          const playerId = getEffectivePlayerId()
          set((state) => ({
            exposedTilesMap: {
              ...state.exposedTilesMap,
              [playerId]: []
            }
          }))
        },
        
        clearHand: () => {
          const playerId = getEffectivePlayerId()
          console.log('🧹 clearHand called - stack trace:', new Error().stack)
          set((state) => {
            const currentHand = state.playerHands[playerId] || []
            const currentDealer = state.dealerHands[playerId] || false
            const oldTileIds = currentHand.map(tile => tile.id)
            const newTileIds: string[] = []

            // Clear Engine 1 cache when hand cleared (async, don't block)
            lazyAnalysisEngine.clearCacheForHandChange(oldTileIds, newTileIds)

            return {
              playerHands: {
                ...state.playerHands,
                [playerId]: []
              },
              handSizes: {
                ...state.handSizes,
                [playerId]: 0
              },
              dealerHands: {
                ...state.dealerHands,
                [playerId]: currentDealer
              },
              exposedTilesMap: {
                ...state.exposedTilesMap,
                [playerId]: []
              },
              selectedForActionMap: {
                ...state.selectedForActionMap,
                [playerId]: []
              },
              tileStatesMap: {
                ...state.tileStatesMap,
                [playerId]: {}
              },
              selectedTiles: [],
              selectedCount: 0,
              recommendations: {},
              lastAnalysis: null,
              validation: {
                isValid: false,
                errors: [],
                warnings: [],
                tileCount: 0,
                expectedCount: currentDealer ? 14 : 13,
                duplicateErrors: []
              }
            }
          })
        },
        
        setDealerHand: (isDealer: boolean) => {
          const playerId = getEffectivePlayerId()
          set((state) => {
            const currentHand = state.playerHands[playerId] || []
            const expectedCount = isDealer ? 14 : 13
            const validation = tileService.validateHand(currentHand, expectedCount)

            return {
              dealerHands: {
                ...state.dealerHands,
                [playerId]: isDealer
              },
              validation: {
                ...validation,
                expectedCount
              }
            }
          })
        },
        
        // Selection Actions
        toggleTileSelection: (instanceId: string) => {
          const playerId = getEffectivePlayerId()
          set((state) => {
            const currentHand = state.playerHands[playerId] || []
            const newHand = currentHand.map(tile => {
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
              playerHands: {
                ...state.playerHands,
                [playerId]: newHand
              },
              selectedTiles,
              selectedCount: selectedTiles.length
            }
          })
        },
        
        selectTile: (instanceId: string) => {
          const playerId = getEffectivePlayerId()
          const currentHand = get().playerHands[playerId] || []
          const tile = currentHand.find(t => t.instanceId === instanceId)
          if (tile && !tile.isSelected) {
            get().toggleTileSelection(instanceId)
          }
        },

        deselectTile: (instanceId: string) => {
          const playerId = getEffectivePlayerId()
          const currentHand = get().playerHands[playerId] || []
          const tile = currentHand.find(t => t.instanceId === instanceId)
          if (tile && tile.isSelected) {
            get().toggleTileSelection(instanceId)
          }
        },
        
        selectAll: () => {
          const playerId = getEffectivePlayerId()
          set((state) => {
            const currentHand = state.playerHands[playerId] || []
            const newHand = currentHand.map(tile => ({ ...tile, isSelected: true }))
            return {
              playerHands: {
                ...state.playerHands,
                [playerId]: newHand
              },
              selectedTiles: newHand,
              selectedCount: newHand.length
            }
          })
        },

        deselectAll: () => {
          const playerId = getEffectivePlayerId()
          set((state) => {
            const currentHand = state.playerHands[playerId] || []
            const newHand = currentHand.map(tile => ({ ...tile, isSelected: false }))
            return {
              playerHands: {
                ...state.playerHands,
                [playerId]: newHand
              },
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
          const playerId = getEffectivePlayerId()
          set((state) => {
            const currentHand = state.playerHands[playerId] || []
            return {
              playerHands: {
                ...state.playerHands,
                [playerId]: currentHand.map(tile =>
                  tile.instanceId === instanceId
                    ? { ...tile, animation }
                    : tile
                )
              }
            }
          })

          // Clear animation after duration
          setTimeout(() => {
            const playerId = getEffectivePlayerId()
            set((state) => {
              const currentHand = state.playerHands[playerId] || []
              return {
                playerHands: {
                  ...state.playerHands,
                  [playerId]: currentHand.map(tile =>
                    tile.instanceId === instanceId
                      ? { ...tile, animation: undefined }
                      : tile
                  )
                }
              }
            })
          }, animation.duration + (animation.delay || 0))
        },

        clearAnimations: () => {
          const playerId = getEffectivePlayerId()
          set((state) => {
            const currentHand = state.playerHands[playerId] || []
            return {
              playerHands: {
                ...state.playerHands,
                [playerId]: currentHand.map(tile => ({ ...tile, animation: undefined }))
              }
            }
          })
        },

        // Validation & Analysis
        validateHand: () => {
          const playerId = getEffectivePlayerId()
          const state = get()
          const currentHand = state.playerHands[playerId] || []
          const currentDealer = state.dealerHands[playerId] || false
          const validation = tileService.validateHand(currentHand, currentDealer ? 14 : 13)

          set({ validation })
          return validation
        },
        
        analyzeHand: async () => {
          const playerId = getEffectivePlayerId()
          const state = get()
          const currentHand = state.playerHands[playerId] || []
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
              currentHand,
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
              currentHand.forEach(tile => {
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
          const playerId = getEffectivePlayerId()
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
            const currentHand = state.playerHands[playerId] || []
            const currentDealer = state.dealerHands[playerId] || false
            const oldTileIds = currentHand.map(tile => tile.id)
            const newTileIds = validTiles.map(tile => tile.id)

            // Clear Engine 1 cache when hand changes (async, don't block)
            lazyAnalysisEngine.clearCacheForHandChange(oldTileIds, newTileIds)

            const validation = tileService.validateHand(validTiles, currentDealer ? 14 : 13)

            const newState = {
              playerHands: {
                ...state.playerHands,
                [playerId]: validTiles
              },
              handSizes: {
                ...state.handSizes,
                [playerId]: validTiles.length
              },
              dealerHands: {
                ...state.dealerHands,
                [playerId]: currentDealer
              },
              selectedForActionMap: {
                ...state.selectedForActionMap,
                [playerId]: []
              },
              tileStatesMap: {
                ...state.tileStatesMap,
                [playerId]: {}
              },
              validation,
              selectedTiles: [],
              selectedCount: 0,
              lastAnalysis: null
            }

            console.log('🔧 importTilesFromString: New hand size:', newState.handSizes[playerId])
            return newState
          })
        },
        
        exportTilesToString: () => {
          const playerId = getEffectivePlayerId()
          const state = get()
          const currentHand = state.playerHands[playerId] || []
          return currentHand.map(tile => tile.id).join(' ')
        },
        
        sortHand: () => {
          const playerId = getEffectivePlayerId()
          set((state) => {
            const currentHand = state.playerHands[playerId] || []
            let sortedHand: PlayerTile[]

            switch (state.sortBy) {
              case 'suit':
                sortedHand = tileService.sortTiles(currentHand)
                break

              case 'recommendation':
                sortedHand = [...currentHand].sort((a, b) => {
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
                sortedHand = currentHand
                break

              default:
                sortedHand = tileService.sortTiles(currentHand)
            }

            return {
              playerHands: {
                ...state.playerHands,
                [playerId]: sortedHand
              }
            }
          })
        },
        
        // Getters
        getSelectedTiles: () => {
          const playerId = getEffectivePlayerId()
          const state = get()
          const currentHand = state.playerHands[playerId] || []
          return currentHand.filter(tile => tile.isSelected)
        },

        getTileGroups: () => {
          const playerId = getEffectivePlayerId()
          const state = get()
          const currentHand = state.playerHands[playerId] || []
          return tileService.getTilesGroupedBySuit(currentHand)
        },

        getHandSummary: () => {
          const playerId = getEffectivePlayerId()
          const state = get()
          const currentHand = state.playerHands[playerId] || []
          return {
            total: currentHand.length,
            selected: state.selectedCount,
            valid: state.validation.isValid
          }
        },
        
        // Selection Area Actions
        moveToSelection: (instanceId: string) => {
          const playerId = getEffectivePlayerId()
          set((state) => {
            const currentHand = state.playerHands[playerId] || []
            const currentSelected = state.selectedForActionMap[playerId] || []
            const currentTileStates = state.tileStatesMap[playerId] || {}

            const tile = currentHand.find(t => t.instanceId === instanceId)
            if (!tile) return state

            // Preserve locked state when moving to selection
            const currentState = currentTileStates[instanceId]
            const newTileStates = {
              ...currentTileStates,
              [instanceId]: currentState === 'locked' ? 'locked-placeholder' : 'placeholder'
            }

            // Add to selection area if not already there
            const isAlreadyInSelection = currentSelected.some(t => t.instanceId === instanceId)
            const newSelectedForAction = isAlreadyInSelection
              ? currentSelected
              : [...currentSelected, tile]

            return {
              selectedForActionMap: {
                ...state.selectedForActionMap,
                [playerId]: newSelectedForAction
              },
              tileStatesMap: {
                ...state.tileStatesMap,
                [playerId]: newTileStates
              }
            }
          })
        },

        returnFromSelection: (instanceId: string) => {
          const playerId = getEffectivePlayerId()
          set((state) => {
            const currentSelected = state.selectedForActionMap[playerId] || []
            const currentTileStates = state.tileStatesMap[playerId] || {}

            const newSelectedForAction = currentSelected.filter(t => t.instanceId !== instanceId)
            const newTileStates = { ...currentTileStates }

            // Handle different placeholder states
            const currentState = newTileStates[instanceId]
            if (currentState === 'placeholder') {
              delete newTileStates[instanceId]
            } else if (currentState === 'locked-placeholder') {
              newTileStates[instanceId] = 'locked'
            }

            return {
              selectedForActionMap: {
                ...state.selectedForActionMap,
                [playerId]: newSelectedForAction
              },
              tileStatesMap: {
                ...state.tileStatesMap,
                [playerId]: newTileStates
              }
            }
          })
        },

        lockTile: (instanceId: string) => {
          const playerId = getEffectivePlayerId()
          set((state) => {
            const currentTileStates = state.tileStatesMap[playerId] || {}
            return {
              tileStatesMap: {
                ...state.tileStatesMap,
                [playerId]: {
                  ...currentTileStates,
                  [instanceId]: 'locked'
                }
              }
            }
          })
        },

        unlockTile: (instanceId: string) => {
          const playerId = getEffectivePlayerId()
          set((state) => {
            const currentTileStates = state.tileStatesMap[playerId] || {}
            const newTileStates = { ...currentTileStates }
            delete newTileStates[instanceId]
            return {
              tileStatesMap: {
                ...state.tileStatesMap,
                [playerId]: newTileStates
              }
            }
          })
        },

        toggleTileLock: (instanceId: string) => {
          const playerId = getEffectivePlayerId()
          const state = get()
          const currentTileStates = state.tileStatesMap[playerId] || {}
          const isLocked = currentTileStates[instanceId] === 'locked'
          if (isLocked) {
            state.unlockTile(instanceId)
          } else {
            state.lockTile(instanceId)
          }
        },

        clearSelection: () => {
          const playerId = getEffectivePlayerId()
          set((state) => {
            const currentTileStates = state.tileStatesMap[playerId] || {}
            // Preserve locked states and placeholder states, clear only selection-related states
            const preservedStates: Record<string, string> = {}
            for (const [instanceId, tileState] of Object.entries(currentTileStates)) {
              if (tileState === 'locked') {
                preservedStates[instanceId] = tileState
              }
            }

            return {
              ...state,
              selectedForActionMap: {
                ...state.selectedForActionMap,
                [playerId]: []
              },
              tileStatesMap: {
                ...state.tileStatesMap,
                [playerId]: preservedStates
              }
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
          console.log('🔄 Tile store rehydrated from localStorage:', state?.playerHand?.length || 0, 'tiles')
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