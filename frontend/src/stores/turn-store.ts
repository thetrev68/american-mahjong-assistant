// Turn Management Store
// Real turn rotation system for 4-player American Mahjong

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export type PlayerPosition = 'east' | 'north' | 'west' | 'south'

export interface TurnPlayer {
  id: string
  name: string
  position: PlayerPosition
  isReady: boolean
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
  
  // Getters - computed properties
  getCurrentPlayerData: () => TurnPlayer | null
  getNextPlayer: () => TurnPlayer | null
  isCurrentPlayerTurn: (playerId: string) => boolean
  getTurnOrderDisplay: () => { player: TurnPlayer; isCurrent: boolean; isNext: boolean }[]
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
  canAdvanceTurn: false
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
    isMultiplayer: store.isMultiplayerMode
  }
}