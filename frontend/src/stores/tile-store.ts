// Tile Store - Hand management and tile input state
// Handles private player tiles, validation, and animations

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { PlayerTile, TileInputState, HandValidation, TileInputMode, TileAnimation, TileRecommendation } from '../types/tile-types'
import { tileService } from '../services/tile-service'
import { AnalysisEngine } from '../services/analysis-engine'

interface TileState extends TileInputState {
  // Hand Management
  playerHand: PlayerTile[]
  handSize: number
  dealerHand: boolean // True if dealer (14 tiles), false if player (13)
  
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
  
  // Actions - Tile Selection
  toggleTileSelection: (instanceId: string) => void
  selectTile: (instanceId: string) => void
  deselectTile: (instanceId: string) => void
  selectAll: () => void
  deselectAll: () => void
  
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
  getSelectedTiles: () => PlayerTile[]
  getTileGroups: () => Record<string, PlayerTile[]>
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
          console.log('=== Tile Store addTile Debug ===')
          console.log('Adding tile ID:', tileId)
          
          const playerTile = tileService.createPlayerTile(tileId)
          console.log('Created player tile:', playerTile)
          
          if (!playerTile) {
            console.log('FAILED: Could not create player tile')
            return
          }
          
          set((state) => {
            console.log('Current state before update:', {
              handSize: state.playerHand.length,
              tiles: state.playerHand.map(t => t.id)
            })
            
            const oldTileIds = state.playerHand.map(tile => tile.id)
            const newHand = [...state.playerHand, playerTile]
            const newTileIds = newHand.map(tile => tile.id)
            
            // Clear Engine 1 cache when hand changes
            AnalysisEngine.clearCacheForHandChange(oldTileIds, newTileIds)
            
            const validation = tileService.validateHand(newHand, state.dealerHand ? 14 : 13)
            
            console.log('New hand after update:', {
              handSize: newHand.length,
              tiles: newHand.map(t => t.id)
            })
            console.log('=== End Tile Store Debug ===')
            
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
            
            // Clear Engine 1 cache when hand changes
            AnalysisEngine.clearCacheForHandChange(oldTileIds, newTileIds)
            
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
        
        clearHand: () => {
          set((state) => {
            const oldTileIds = state.playerHand.map(tile => tile.id)
            const newTileIds: string[] = []
            
            // Clear Engine 1 cache when hand cleared
            AnalysisEngine.clearCacheForHandChange(oldTileIds, newTileIds)
            
            return {
              playerHand: [],
              handSize: 0,
              selectedTiles: [],
              selectedCount: 0,
              recommendations: {},
              lastAnalysis: null, // Clear analysis timestamp
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
          set({ analysisInProgress: true })
          
          try {
            // This would integrate with pattern analysis from intelligence layer
            // For now, we'll simulate the analysis
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            set({
              analysisInProgress: false,
              lastAnalysis: Date.now()
            })
          } catch (error) {
            console.error('Hand analysis failed:', error)
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
          console.log('=== Import Tiles Debug ===')
          console.log('Input tile string:', tileString)
          
          // Parse tile string format like "1D 2D 3B 4B east south"
          const tileIds = tileString.trim().split(/\s+/)
          console.log('Parsed tile IDs:', tileIds)
          
          const validTiles: PlayerTile[] = []
          const invalidTiles: string[] = []
          
          tileIds.forEach(tileId => {
            const tile = tileService.createPlayerTile(tileId)
            if (tile) {
              validTiles.push(tile)
            } else {
              invalidTiles.push(tileId)
            }
          })
          
          console.log('Valid tiles created:', validTiles.length, validTiles.map(t => t.id))
          console.log('Invalid tile IDs:', invalidTiles)
          
          set((state) => {
            const validation = tileService.validateHand(validTiles, state.dealerHand ? 14 : 13)
            console.log('Setting new hand with', validTiles.length, 'tiles')
            console.log('=== End Import Tiles Debug ===')
            
            return {
              playerHand: validTiles,
              handSize: validTiles.length,
              validation,
              selectedTiles: [],
              selectedCount: 0
            }
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
                  if (recA.priority !== recB.priority) {
                    return recB.priority - recA.priority
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
        }
      }),
      {
        name: 'tile-store',
        partialize: (state) => ({
          // Persist all essential data but ensure proper syncing
          playerHand: state.playerHand,
          dealerHand: state.dealerHand,
          showRecommendations: state.showRecommendations,
          sortBy: state.sortBy
        })
      }
    )
  )
)