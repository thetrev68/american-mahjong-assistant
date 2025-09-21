// Turn Management Store
// Real turn rotation system for 4-player American Mahjong

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { useRoomStore } from './room.store'
import { useRoomSetupStore } from './room-setup.store'
import { useGameStore } from './game-store'
import type { GameAction, CallType } from '../features/gameplay/services/game-actions'
import type { Tile } from 'shared-types';
import type { NMJL2025Pattern } from 'shared-types'

export type PlayerPosition = 'east' | 'north' | 'west' | 'south'

export interface TurnPlayer {
  id: string
  name: string
  position: PlayerPosition
  isReady: boolean
}

export interface PlayerActionState {
  hasDrawn: boolean
  hasDiscarded: boolean
  availableActions: GameAction[]
  lastActionTime?: Date
}

export interface CallOpportunity {
  tile: Tile
  callType: CallType
  duration: number
  deadline: Date
  isActive: boolean
}

interface TurnState {
  // Core turn rotation - real state, no placeholders
  currentPlayer: string | null
  turnOrder: string[] // Actual player IDs in turn order
  turnNumber: number // 1-based turn counter
  roundNumber: number // 1-4 for wind rounds
  currentWind: PlayerPosition // 'east' | 'north' | 'west' | 'south'
  
  // Multiplayer coordination
  isMultiplayerMode: boolean
  roomId: string | null
  
  // Turn timing - real timestamps
  turnStartTime: Date | null
  turnDuration: number // seconds elapsed in current turn
  
  // Player management
  players: TurnPlayer[]
  
  // Turn state tracking
  isGameActive: boolean
  canAdvanceTurn: boolean
  
  // Action management - NEW
  playerActions: Record<string, PlayerActionState>
  
  // Call opportunities - NEW
  currentCallOpportunity: CallOpportunity | null
  
  // Discard pile management - NEW
  discardPile: Tile[]
  
  // Wall management - NEW
  wallCount: number
}

interface TurnActions {
  // Setup and initialization
  initializeTurns: (players: TurnPlayer[]) => void
  setMultiplayerMode: (enabled: boolean, roomId?: string) => void
  setPlayers: (players: TurnPlayer[]) => void
  
  // Turn management - real functionality only
  startGame: () => void
  advanceTurn: () => void
  setCurrentPlayer: (playerId: string) => void
  
  // Round management
  advanceRound: () => void
  
  // Utility
  resetTurns: () => void
  updateTurnDuration: () => void
  
  // Action management - NEW
  setAvailableActions: (playerId: string, actions: GameAction[]) => void
  executeAction: (playerId: string, action: GameAction, data?: unknown) => Promise<boolean>
  markPlayerAction: (playerId: string, actionType: 'hasDrawn' | 'hasDiscarded', value: boolean) => void
  
  // Turn timing - NEW  
  startTurnTimer: (duration?: number) => void
  pauseTurnTimer: () => void
  resumeTurnTimer: () => void
  
  // Call management - NEW
  openCallOpportunity: (tile: Tile, duration?: number) => void
  respondToCall: (response: 'call' | 'pass', callType?: CallType, tiles?: Tile[]) => void
  closeCallOpportunity: () => void
  
  // Game state management - NEW
  updateDiscardPile: (tile: Tile, playerId: string) => void
  updateWallCount: (count: number) => void
  
  // Getters - computed properties
  getCurrentPlayerData: () => TurnPlayer | null
  getNextPlayer: () => TurnPlayer | null
  isCurrentPlayerTurn: (playerId: string) => boolean
  getTurnOrderDisplay: () => { player: TurnPlayer; isCurrent: boolean; isNext: boolean }[]
  getPlayerActions: (playerId: string) => PlayerActionState | null
}

type TurnStore = TurnState & TurnActions

const initialState: TurnState = {
  currentPlayer: null,
  turnOrder: [],
  turnNumber: 1,
  roundNumber: 1,
  currentWind: 'east',
  isMultiplayerMode: false,
  roomId: null,
  turnStartTime: null,
  turnDuration: 0,
  players: [],
  isGameActive: false,
  canAdvanceTurn: false,
  playerActions: {},
  currentCallOpportunity: null,
  discardPile: [],
  wallCount: 144 // Standard mahjong wall size
}

export const useTurnStore = create<TurnStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Initialize turn order based on player positions
        initializeTurns: (players: TurnPlayer[]) => {
          if (players.length === 0) {
            console.warn('Cannot initialize turns with empty player array')
            return
          }

          // Sort players by mahjong position order: east, north, west, south
          const positionOrder: PlayerPosition[] = ['east', 'north', 'west', 'south']
          const sortedPlayers = [...players].sort((a, b) => {
            return positionOrder.indexOf(a.position) - positionOrder.indexOf(b.position)
          })

          const turnOrder = sortedPlayers.map(p => p.id)
          
          set({
            players: sortedPlayers,
            turnOrder,
            currentPlayer: null, // Will be set when game starts
            turnNumber: 1,
            roundNumber: 1,
            currentWind: 'east',
            isGameActive: false,
            canAdvanceTurn: false
          }, false, 'turn/initializeTurns')
        },

        setMultiplayerMode: (enabled: boolean, roomId?: string) => {
          set({
            isMultiplayerMode: enabled,
            roomId: roomId || null
          }, false, 'turn/setMultiplayerMode')
        },

        setPlayers: (players: TurnPlayer[]) => {
          const state = get()
          
          // Re-initialize turns if players change
          if (state.isGameActive) {
            // Game is active - preserve current state but update player data
            const updatedPlayers = state.players.map(existingPlayer => {
              const updatedPlayer = players.find(p => p.id === existingPlayer.id)
              return updatedPlayer || existingPlayer
            })
            
            set({ players: updatedPlayers }, false, 'turn/updatePlayers')
          } else {
            // Game not active - full re-initialization
            get().initializeTurns(players)
          }
        },

        startGame: () => {
          const state = get()
          if (state.turnOrder.length === 0) {
            console.warn('Cannot start game - no turn order established')
            return
          }

          const firstPlayer = state.turnOrder[0]
          set({
            isGameActive: true,
            currentPlayer: firstPlayer,
            turnStartTime: new Date(),
            turnDuration: 0,
            canAdvanceTurn: true
          }, false, 'turn/startGame')
        },

        advanceTurn: () => {
          const state = get()
          if (!state.isGameActive || !state.canAdvanceTurn) {
            console.warn('Cannot advance turn - game not active or turn advancement blocked')
            return
          }

          const currentIndex = state.turnOrder.indexOf(state.currentPlayer || '')
          if (currentIndex === -1) {
            console.warn('Current player not found in turn order')
            return
          }

          // Get next player (wrap around to beginning)
          const nextIndex = (currentIndex + 1) % state.turnOrder.length
          const nextPlayer = state.turnOrder[nextIndex]
          
          // Calculate new turn/round numbers
          let newTurnNumber = state.turnNumber
          let newRoundNumber = state.roundNumber
          let newCurrentWind = state.currentWind
          
          // Increment turn number
          newTurnNumber += 1
          
          // Every 4 turns = 1 round (all players have had a turn)
          if (newTurnNumber > 4 && (newTurnNumber - 1) % 4 === 0) {
            newRoundNumber += 1
            
            // Advance wind every round
            const windOrder: PlayerPosition[] = ['east', 'south', 'west', 'north']
            const currentWindIndex = windOrder.indexOf(newCurrentWind)
            newCurrentWind = windOrder[(currentWindIndex + 1) % windOrder.length]
          }

          set({
            currentPlayer: nextPlayer,
            turnNumber: newTurnNumber,
            roundNumber: newRoundNumber,
            currentWind: newCurrentWind,
            turnStartTime: new Date(),
            turnDuration: 0
          }, false, 'turn/advanceTurn')
        },

        setCurrentPlayer: (playerId: string) => {
          const state = get()
          if (!state.turnOrder.includes(playerId)) {
            console.warn(`Player ${playerId} not in turn order`)
            return
          }

          set({
            currentPlayer: playerId,
            turnStartTime: new Date(),
            turnDuration: 0
          }, false, 'turn/setCurrentPlayer')
        },

        advanceRound: () => {
          const state = get()
          const windOrder: PlayerPosition[] = ['east', 'south', 'west', 'north']
          const currentWindIndex = windOrder.indexOf(state.currentWind)
          const newWind = windOrder[(currentWindIndex + 1) % windOrder.length]
          
          set({
            roundNumber: state.roundNumber + 1,
            currentWind: newWind
          }, false, 'turn/advanceRound')
        },

        resetTurns: () => {
          set(initialState, false, 'turn/reset')
        },

        updateTurnDuration: () => {
          const state = get()
          if (state.turnStartTime) {
            const duration = Math.floor((Date.now() - state.turnStartTime.getTime()) / 1000)
            set({ turnDuration: duration }, false, 'turn/updateDuration')
          }
        },

        // Computed getters - real data only
        getCurrentPlayerData: () => {
          const state = get()
          if (!state.currentPlayer) return null
          return state.players.find(p => p.id === state.currentPlayer) || null
        },

        getNextPlayer: () => {
          const state = get()
          if (!state.currentPlayer || state.turnOrder.length === 0) return null
          
          const currentIndex = state.turnOrder.indexOf(state.currentPlayer)
          if (currentIndex === -1) return null
          
          const nextIndex = (currentIndex + 1) % state.turnOrder.length
          const nextPlayerId = state.turnOrder[nextIndex]
          return state.players.find(p => p.id === nextPlayerId) || null
        },

        isCurrentPlayerTurn: (playerId: string) => {
          return get().currentPlayer === playerId
        },

        getTurnOrderDisplay: () => {
          const state = get()
          return state.players.map(player => {
            const isCurrent = player.id === state.currentPlayer
            const nextPlayer = get().getNextPlayer()
            const isNext = player.id === nextPlayer?.id
            
            return { player, isCurrent, isNext }
          })
        },

        // Action management - NEW implementations

        setAvailableActions: (playerId: string, actions: GameAction[]) => {
          const state = get()
          const currentActions = state.playerActions[playerId] || {
            hasDrawn: false,
            hasDiscarded: false,
            availableActions: [],
            lastActionTime: undefined
          }

          set({
            playerActions: {
              ...state.playerActions,
              [playerId]: {
                ...currentActions,
                availableActions: actions
              }
            }
          }, false, 'turn/setAvailableActions')
        },

        executeAction: async (playerId: string, action: GameAction, data?: unknown) => {
          const { gameActions } = await import('../features/gameplay/services/game-actions')
          const { getTurnRealtime } = await import('../features/gameplay/services/turn-realtime')
          const turnRealtime = getTurnRealtime()
          const roomStore = useRoomStore.getState()
          const roomSetupStore = useRoomSetupStore.getState()
          
          try {
            // Phase 4B: Check if multiplayer mode - broadcast to server first
            if (roomSetupStore.coPilotMode === 'everyone' && roomStore.room?.id) {
              const broadcastSuccess = await turnRealtime.broadcastTurnAction({
                playerId,
                roomId: roomStore.room.id,
                action,
                data,
                timestamp: new Date(),
                turnNumber: get().turnNumber
              })

              if (!broadcastSuccess) {
                // Action was queued due to connection issues
                return false
              }

              // Server will handle the action and broadcast results
              // The handleTurnActionSuccess event will update local state
              return true
            }

            // Solo mode - execute locally
            let success = false

            switch (action) {
              case 'draw': {
                const drawnTile = await gameActions.drawTile(playerId)
                success = drawnTile !== null
                break
              }
              case 'discard':
                if (data && typeof data === 'object' && 'id' in data) {
                  success = await gameActions.discardTile(playerId, data as Tile)
                }
                break
              case 'call':
                if (data && typeof data === 'object' && 'callType' in data && 'tiles' in data) {
                  const callData = data as { callType: CallType; tiles: Tile[] }
                  success = await gameActions.makeCall(playerId, callData.callType, callData.tiles)
                }
                break
              case 'joker-swap':
                if (data && typeof data === 'object' && 'jokerLocation' in data && 'targetTile' in data) {
                  const swapData = data as { jokerLocation: 'own' | 'opponent'; targetTile: Tile }
                  success = await gameActions.swapJoker(playerId, swapData.jokerLocation, swapData.targetTile)
                }
                break
              case 'mahjong':
                if (data && typeof data === 'object' && 'hand' in data && 'pattern' in data) {
                  const mahjongData = data as { hand: Tile[]; pattern: NMJL2025Pattern }
                  success = await gameActions.declareMahjong(playerId, mahjongData.hand, mahjongData.pattern)
                }
                break
              case 'pass-out': {
                const reason = typeof data === 'string' ? data : 'Hand not viable'
                success = await gameActions.declarePassOut(playerId, reason)
                break
              }
              case 'other-player-mahjong': {
                const winnerName = typeof data === 'string' ? data : 'Other Player'
                success = await gameActions.declareOtherPlayerMahjong(playerId, winnerName)
                break
              }
              case 'game-drawn': {
                const reason = typeof data === 'string' ? data : 'Game drawn'
                success = await gameActions.declareGameDrawn(playerId, reason)
                break
              }
            }

            // Update action timestamp if successful
            if (success) {
              get().markPlayerAction(playerId, action === 'draw' ? 'hasDrawn' : 'hasDiscarded', true)
              
              // Record statistics in game store
              const { recordAction, recordCallAttempt, recordDiscard } = useGameStore.getState()
              recordAction(playerId, action)
              
              // Record specific action types
              if (action === 'call') {
                recordCallAttempt(playerId)
              } else if (action === 'discard') {
                recordDiscard()
              }
            }

            return success
          } catch (error) {
            console.error(`Error executing action ${action} for player ${playerId}:`, error)
            return false
          }
        },

        markPlayerAction: (playerId: string, actionType: 'hasDrawn' | 'hasDiscarded', value: boolean) => {
          const state = get()
          const currentActions = state.playerActions[playerId] || {
            hasDrawn: false,
            hasDiscarded: false,
            availableActions: [],
            lastActionTime: undefined
          }

          set({
            playerActions: {
              ...state.playerActions,
              [playerId]: {
                ...currentActions,
                [actionType]: value,
                lastActionTime: value ? new Date() : currentActions.lastActionTime
              }
            }
          }, false, 'turn/markPlayerAction')
        },

        // Turn timing - NEW implementations

        startTurnTimer: () => {
          set({
            turnStartTime: new Date(),
            turnDuration: 0
          }, false, 'turn/startTurnTimer')
        },

        pauseTurnTimer: () => {
          const state = get()
          if (state.turnStartTime) {
            const duration = Math.floor((Date.now() - state.turnStartTime.getTime()) / 1000)
            set({
              turnDuration: duration,
              turnStartTime: null
            }, false, 'turn/pauseTurnTimer')
          }
        },

        resumeTurnTimer: () => {
          const state = get()
          set({
            turnStartTime: new Date(Date.now() - (state.turnDuration * 1000))
          }, false, 'turn/resumeTurnTimer')
        },

        // Call management - NEW implementations

        openCallOpportunity: (tile: Tile, duration: number = 5000) => {
          const deadline = new Date(Date.now() + duration)
          
          set({
            currentCallOpportunity: {
              tile,
              callType: 'pung', // Default, will be determined by player response
              duration,
              deadline,
              isActive: true
            }
          }, false, 'turn/openCallOpportunity')

          // Auto-close after duration
          setTimeout(() => {
            get().closeCallOpportunity()
          }, duration)
        },

        respondToCall: async (response: 'call' | 'pass', callType?: CallType, tiles?: Tile[]) => {
          const { getTurnRealtime } = await import('../features/gameplay/services/turn-realtime')
          const turnRealtime = getTurnRealtime()
          
          try {
            await turnRealtime.respondToCall(response, callType, tiles)
            
            if (response === 'call') {
              // Close call opportunity and handle call
              get().closeCallOpportunity()
            }
          } catch (error) {
            console.error('Error responding to call:', error)
          }
        },

        closeCallOpportunity: () => {
          set({
            currentCallOpportunity: null
          }, false, 'turn/closeCallOpportunity')
        },

        // Game state management - NEW implementations

        updateDiscardPile: (tile: Tile, playerId: string) => {
          const state = get()
          set({
            discardPile: [...state.discardPile, tile]
          }, false, 'turn/updateDiscardPile')
          
          console.log(`Added to discard pile: ${tile.displayName} from ${playerId}`)
        },

        updateWallCount: (count: number) => {
          set({
            wallCount: Math.max(0, count)
          }, false, 'turn/updateWallCount')
        },

        getPlayerActions: (playerId: string) => {
          const state = get()
          return state.playerActions[playerId] || null
        }
      }),
      {
        name: 'turn-store',
        version: 1,
        partialize: (state) => ({
          // Persist game configuration but not active turn state
          isMultiplayerMode: state.isMultiplayerMode,
          roomId: state.roomId
        })
      }
    ),
    { name: 'turn-store' }
  )
)

// Selectors for common derived state
export const useTurnSelectors = () => {
  const store = useTurnStore()
  const currentPlayerData = store.getCurrentPlayerData()
  const nextPlayerData = store.getNextPlayer()
  
  return {
    // Basic turn info
    isGameActive: store.isGameActive,
    currentPlayerName: currentPlayerData?.name || 'No player',
    nextPlayerName: nextPlayerData?.name || 'No player',
    turnNumber: store.turnNumber,
    roundNumber: store.roundNumber,
    currentWind: store.currentWind,
    
    // Turn state
    canAdvanceTurn: store.canAdvanceTurn,
    turnDuration: store.turnDuration,
    
    // Player info
    playerCount: store.players.length,
    turnOrderDisplay: store.getTurnOrderDisplay(),
    
    // Current player checks
    isMyTurn: (playerId: string) => store.isCurrentPlayerTurn(playerId),
    
    // Mode info
    isMultiplayer: store.isMultiplayerMode,
    
    // Action management - NEW
    getPlayerActions: store.getPlayerActions,
    currentCallOpportunity: store.currentCallOpportunity,
    discardPile: store.discardPile,
    wallCount: store.wallCount,
    
    // Action helpers
    canPlayerDraw: (playerId: string) => {
      const actions = store.getPlayerActions(playerId)
      return store.isCurrentPlayerTurn(playerId) && !actions?.hasDrawn && store.wallCount > 0
    },
    canPlayerDiscard: (playerId: string) => {
      const actions = store.getPlayerActions(playerId)
      return store.isCurrentPlayerTurn(playerId) && actions?.hasDrawn
    },
    hasCallOpportunity: () => {
      return store.currentCallOpportunity?.isActive || false
    }
  }
}