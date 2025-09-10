import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { GameAlert } from '../features/gameplay/AlertSystem'
import { getTurnMultiplayerService, destroyTurnMultiplayerService } from '../services/turn-multiplayer'
import { shouldGameEnd, getWallExhaustionWarning, type GameEndContext } from '../services/game-end-coordinator'
import { usePatternStore } from './pattern-store'
import { useTileStore } from './tile-store'

export interface Player {
  id: string
  name: string
  position: 'east' | 'south' | 'west' | 'north' | null
  isReady: boolean
  isConnected: boolean
}

export interface GameState {
  // Room & Player State
  roomCode: string | null
  players: Player[]
  currentPlayerId: string | null
  gamePhase: 'lobby' | 'tile-input' | 'charleston' | 'playing' | 'finished'
  
  // Game Configuration  
  coPilotMode: 'everyone' | 'solo' | null
  
  // Timer State
  turnStartTime: Date | null
  gameStartTime: Date | null
  
  // Wall & Game End State
  wallTilesRemaining: number
  passedOutPlayers: Set<string>
  gameEndResult: Record<string, unknown> | null
  
  // Game Statistics
  currentTurn: number
  gameStatistics: {
    totalActions: number
    turnTimings: number[]
    playerActionCounts: Record<string, number>
    callAttempts: Record<string, number>
    discardCount: number
  }
  
  // Alert System
  alerts: GameAlert[]
  
  // Actions
  setRoomCode: (code: string | null) => void
  addPlayer: (player: Player) => void
  updatePlayer: (playerId: string, updates: Partial<Player>) => void
  setCurrentPlayer: (playerId: string) => void
  setGamePhase: (phase: GameState['gamePhase']) => void
  setCoPilotMode: (mode: GameState['coPilotMode']) => void
  startTurn: () => void
  startGame: () => void
  resetGame: () => void
  addAlert: (alert: Omit<GameAlert, 'id' | 'createdAt'>) => void
  removeAlert: (alertId: string) => void
  
  // Wall & Game End Management
  updateWallTiles: (remaining: number) => void
  markPlayerPassedOut: (playerId: string) => void
  removePassedOutPlayer: (playerId: string) => void
  setGameEndResult: (result: Record<string, unknown> | null) => void
  checkForGameEnd: () => boolean
  
  // Game Statistics Management
  incrementTurn: () => void
  recordAction: (playerId: string, actionType: string) => void
  recordTurnTiming: (durationMs: number) => void
  recordCallAttempt: (playerId: string) => void
  recordDiscard: () => void
  resetStatistics: () => void
  
  // Turn management integration
  advanceGameTurn: () => void
  isCurrentPlayerTurn: (playerId: string) => boolean
  getCurrentTurnInfo: () => unknown
}

const initialState = {
  roomCode: null,
  players: [],
  currentPlayerId: null,
  gamePhase: 'lobby' as const,
  coPilotMode: null,
  turnStartTime: null,
  gameStartTime: null,
  wallTilesRemaining: 144, // Standard American Mahjong wall size
  passedOutPlayers: new Set<string>(),
  gameEndResult: null,
  currentTurn: 0,
  gameStatistics: {
    totalActions: 0,
    turnTimings: [],
    playerActionCounts: {},
    callAttempts: {},
    discardCount: 0
  },
  alerts: [],
}

export const useGameStore = create<GameState>()(
  devtools(
    (set) => ({
      ...initialState,
      
      setRoomCode: (code) => 
        set({ roomCode: code }, false, 'setRoomCode'),
      
      addPlayer: (player) =>
        set(
          (state) => ({ players: [...state.players, player] }),
          false,
          'addPlayer'
        ),
      
      updatePlayer: (playerId, updates) =>
        set(
          (state) => ({
            players: state.players.map(p => 
              p.id === playerId ? { ...p, ...updates } : p
            )
          }),
          false,
          'updatePlayer'
        ),
      
      setCurrentPlayer: (playerId) =>
        set({ currentPlayerId: playerId }, false, 'setCurrentPlayer'),
      
      setGamePhase: (phase) =>
        set({ gamePhase: phase }, false, 'setGamePhase'),
        
      setCoPilotMode: (mode) =>
        set({ coPilotMode: mode }, false, 'setCoPilotMode'),

      startTurn: () =>
        set({ turnStartTime: new Date() }, false, 'startTurn'),
      
      startGame: () =>
        set({ 
          gameStartTime: new Date(),
          gamePhase: 'playing',
          wallTilesRemaining: 144,
          passedOutPlayers: new Set<string>()
        }, false, 'startGame'),
      
      resetGame: () => {
        // Clean up turn multiplayer service
        destroyTurnMultiplayerService()
        set(initialState, false, 'resetGame')
      },

      addAlert: (alertData) => 
        set(
          (state) => ({
            alerts: [...state.alerts, {
              ...alertData,
              id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              createdAt: new Date()
            }]
          }),
          false,
          'addAlert'
        ),

      removeAlert: (alertId) =>
        set(
          (state) => ({
            alerts: state.alerts.filter(alert => alert.id !== alertId)
          }),
          false,
          'removeAlert'
        ),

      // Wall & Game End Management
      updateWallTiles: (remaining) =>
        set((state) => {
          const newState = { wallTilesRemaining: remaining }
          
          // Add warning alerts if wall is getting low
          const warning = getWallExhaustionWarning(remaining)
          if (warning && !state.alerts.some(alert => alert.message.includes('tiles left'))) {
            return {
              ...newState,
              alerts: [...state.alerts, {
                id: `wall-warning-${Date.now()}`,
                type: 'warning' as const,
                title: 'Wall Running Low',
                message: warning,
                duration: 8000,
                createdAt: new Date()
              }]
            }
          }
          
          return newState
        }, false, 'updateWallTiles'),

      markPlayerPassedOut: (playerId) =>
        set((state) => ({
          passedOutPlayers: new Set([...state.passedOutPlayers, playerId])
        }), false, 'markPlayerPassedOut'),

      removePassedOutPlayer: (playerId) =>
        set((state) => {
          const newPassedOut = new Set(state.passedOutPlayers)
          newPassedOut.delete(playerId)
          return { passedOutPlayers: newPassedOut }
        }, false, 'removePassedOutPlayer'),

      setGameEndResult: (result) =>
        set({ gameEndResult: result }, false, 'setGameEndResult'),

      checkForGameEnd: () => {
        const state = useGameStore.getState()
        const selectedPatterns = usePatternStore.getState().getTargetPatterns()
        const tiles = useTileStore.getState().playerHand
        
        if (!state.gameStartTime) return false
        
        const context: GameEndContext = {
          gameId: state.roomCode || `game-${Date.now()}`,
          players: state.players,
          wallTilesRemaining: state.wallTilesRemaining,
          passedOutPlayers: state.passedOutPlayers,
          currentTurn: state.currentTurn,
          gameStartTime: state.gameStartTime,
          selectedPatterns: (selectedPatterns || []).map(option => ({
            Year: 2025,
            Section: option.section,
            Line: option.line,
            'Pattern ID': option.patternId,
            Hands_Key: option.id,
            Hand_Pattern: option.pattern,
            Hand_Description: option.description,
            Hand_Points: option.points,
            Hand_Conceiled: option.concealed,
            Hand_Difficulty: option.difficulty,
            Hand_Notes: null,
            Groups: option.groups
          })),
          playerHands: { [state.currentPlayerId || 'solo']: tiles },
          roomId: state.roomCode || undefined,
          coPilotMode: state.coPilotMode || undefined
        }
        
        return shouldGameEnd(context)
      },

      // Game Statistics Management
      incrementTurn: () =>
        set((state) => ({ currentTurn: state.currentTurn + 1 }), false, 'incrementTurn'),

      recordAction: (playerId: string) =>
        set((state) => {
          const newStats = { ...state.gameStatistics }
          newStats.totalActions += 1
          newStats.playerActionCounts[playerId] = (newStats.playerActionCounts[playerId] || 0) + 1
          return { gameStatistics: newStats }
        }, false, 'recordAction'),

      recordTurnTiming: (durationMs: number) =>
        set((state) => {
          const newStats = { ...state.gameStatistics }
          newStats.turnTimings.push(durationMs)
          return { gameStatistics: newStats }
        }, false, 'recordTurnTiming'),

      recordCallAttempt: (playerId: string) =>
        set((state) => {
          const newStats = { ...state.gameStatistics }
          newStats.callAttempts[playerId] = (newStats.callAttempts[playerId] || 0) + 1
          return { gameStatistics: newStats }
        }, false, 'recordCallAttempt'),

      recordDiscard: () =>
        set((state) => {
          const newStats = { ...state.gameStatistics }
          newStats.discardCount += 1
          return { gameStatistics: newStats }
        }, false, 'recordDiscard'),

      resetStatistics: () =>
        set({
          currentTurn: 0,
          gameStatistics: {
            totalActions: 0,
            turnTimings: [],
            playerActionCounts: {},
            callAttempts: {},
            discardCount: 0
          }
        }, false, 'resetStatistics'),

      // Turn management integration
      advanceGameTurn: () => {
        const turnService = getTurnMultiplayerService()
        if (turnService) {
          // Record turn timing if we have a start time
          const state = useGameStore.getState()
          if (state.turnStartTime) {
            const turnDuration = Date.now() - state.turnStartTime.getTime()
            state.recordTurnTiming(turnDuration)
          }
          
          // Increment turn counter and advance
          state.incrementTurn()
          turnService.advanceTurn()
          
          // Start timing for next turn
          state.startTurn()
        } else {
          console.warn('Turn service not initialized - cannot advance turn')
        }
      },

      isCurrentPlayerTurn: (playerId: string) => {
        const turnService = getTurnMultiplayerService()
        if (turnService) {
          return turnService.isMyTurn() && turnService.getCurrentTurnInfo().currentPlayer === playerId
        }
        return false
      },

      getCurrentTurnInfo: () => {
        const turnService = getTurnMultiplayerService()
        return turnService ? turnService.getCurrentTurnInfo() : null
      },
    }),
    {
      name: 'game-store', // DevTools name
    }
  )
)