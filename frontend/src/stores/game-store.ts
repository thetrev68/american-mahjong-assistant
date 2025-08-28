import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

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
  
  // Actions
  setRoomCode: (code: string | null) => void
  addPlayer: (player: Player) => void
  updatePlayer: (playerId: string, updates: Partial<Player>) => void
  setCurrentPlayer: (playerId: string) => void
  setGamePhase: (phase: GameState['gamePhase']) => void
  setCoPilotMode: (mode: GameState['coPilotMode']) => void
  startTurn: () => void
  resetGame: () => void
}

const initialState = {
  roomCode: null,
  players: [],
  currentPlayerId: null,
  gamePhase: 'lobby' as const,
  coPilotMode: null,
  turnStartTime: null,
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
      
      resetGame: () =>
        set(initialState, false, 'resetGame'),
    }),
    {
      name: 'game-store', // DevTools name
    }
  )
)