import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { GameAlert } from '../features/gameplay/AlertSystem'
import { getTurnMultiplayerService, destroyTurnMultiplayerService } from '../services/turn-multiplayer'

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
  resetGame: () => void
  addAlert: (alert: Omit<GameAlert, 'id' | 'createdAt'>) => void
  removeAlert: (alertId: string) => void
  
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

      // Turn management integration
      advanceGameTurn: () => {
        const turnService = getTurnMultiplayerService()
        if (turnService) {
          turnService.advanceTurn()
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