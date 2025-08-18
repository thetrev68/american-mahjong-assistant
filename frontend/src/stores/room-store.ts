import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export type CoPilotMode = 'everyone' | 'solo'
export type PlayerPosition = 'north' | 'east' | 'south' | 'west'
export type RoomStatus = 'idle' | 'creating' | 'joining' | 'success' | 'error'

interface RoomSetupProgress {
  currentStep: 'mode-selection' | 'room-creation' | 'player-positioning' | 'ready'
  completedSteps: number
  totalSteps: number
}

interface RoomState {
  // Room state
  currentRoomCode: string | null
  hostPlayerId: string | null
  coPilotMode: CoPilotMode
  coPilotModeSelected: boolean // Track if mode was explicitly selected
  playerPositions: Record<string, PlayerPosition>
  otherPlayerNames: string[] // For solo mode - names of other players at the table
  
  // Status tracking
  roomCreationStatus: RoomStatus
  joinRoomStatus: RoomStatus
  error: string | null

  // Actions - Co-pilot mode
  setCoPilotMode: (mode: CoPilotMode) => void
  resetCoPilotModeSelection: () => void
  getCoPilotModeDescription: (mode: CoPilotMode) => string

  // Actions - Room creation
  setRoomCreationStatus: (status: RoomStatus) => void
  handleRoomCreated: (roomCode: string, hostPlayerId: string, otherPlayerNames?: string[]) => void
  handleRoomCreationError: (error: string) => void

  // Actions - Room joining
  setJoinRoomStatus: (status: RoomStatus) => void
  handleRoomJoined: (roomCode: string) => void
  handleRoomJoinError: (error: string) => void

  // Actions - Player positioning
  setPlayerPosition: (playerId: string, position: PlayerPosition) => void
  clearPlayerPosition: (playerId: string) => void
  getAvailablePositions: () => PlayerPosition[]
  isPositionTaken: (position: PlayerPosition) => boolean

  // Actions - Validation
  isValidRoomCode: (code: string) => boolean

  // Actions - State management
  clearError: () => void
  clearAll: () => void
  resetToStart: () => void

  // Computed properties
  isHost: (playerId: string) => boolean
  isRoomReadyForGame: () => boolean
  getRoomSetupProgress: () => RoomSetupProgress
}

const ALL_POSITIONS: PlayerPosition[] = ['north', 'east', 'south', 'west']

export const useRoomStore = create<RoomState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        currentRoomCode: null,
        hostPlayerId: null,
        coPilotMode: 'everyone',
        coPilotModeSelected: false,
        playerPositions: {},
        otherPlayerNames: [],
        roomCreationStatus: 'idle',
        joinRoomStatus: 'idle',
        error: null,

        // Co-pilot mode actions
        setCoPilotMode: (mode) => {
          set({ coPilotMode: mode, coPilotModeSelected: true }, false, 'setCoPilotMode')
        },

        resetCoPilotModeSelection: () => {
          set({ coPilotModeSelected: false }, false, 'resetCoPilotModeSelection')
        },

        getCoPilotModeDescription: (mode) => {
          const descriptions = {
            everyone: 'All players receive AI assistance and pattern recommendations',
            solo: 'Only you receive AI assistance - others play manually'
          }
          return descriptions[mode]
        },

        // Room creation actions
        setRoomCreationStatus: (status) => {
          set({ roomCreationStatus: status }, false, 'setRoomCreationStatus')
        },

        handleRoomCreated: (roomCode, hostPlayerId, otherPlayerNames) => {
          set({
            currentRoomCode: roomCode,
            hostPlayerId: hostPlayerId,
            roomCreationStatus: 'success',
            error: null,
            otherPlayerNames: otherPlayerNames || []
          }, false, 'handleRoomCreated')
        },

        handleRoomCreationError: (error) => {
          set({
            roomCreationStatus: 'error',
            error: error,
            currentRoomCode: null
          }, false, 'handleRoomCreationError')
        },

        // Room joining actions
        setJoinRoomStatus: (status) => {
          set({ joinRoomStatus: status }, false, 'setJoinRoomStatus')
        },

        handleRoomJoined: (roomCode) => {
          set({
            currentRoomCode: roomCode,
            joinRoomStatus: 'success',
            error: null
          }, false, 'handleRoomJoined')
        },

        handleRoomJoinError: (error) => {
          set({
            joinRoomStatus: 'error',
            error: error,
            currentRoomCode: null
          }, false, 'handleRoomJoinError')
        },

        // Player positioning actions
        setPlayerPosition: (playerId, position) => {
          set((state) => ({
            playerPositions: {
              ...state.playerPositions,
              [playerId]: position
            }
          }), false, 'setPlayerPosition')
        },

        clearPlayerPosition: (playerId) => {
          set((state) => {
            const newPositions = { ...state.playerPositions }
            delete newPositions[playerId]
            return { playerPositions: newPositions }
          }, false, 'clearPlayerPosition')
        },

        getAvailablePositions: () => {
          const state = get()
          const takenPositions = Object.values(state.playerPositions)
          return ALL_POSITIONS.filter(pos => !takenPositions.includes(pos))
        },

        isPositionTaken: (position) => {
          const state = get()
          return Object.values(state.playerPositions).includes(position)
        },

        // Validation actions
        isValidRoomCode: (code) => {
          // Room codes should be exactly 4 characters, alphanumeric
          const roomCodeRegex = /^[A-Z0-9]{4}$/
          return roomCodeRegex.test(code.toUpperCase())
        },

        // State management actions
        clearError: () => {
          set({ error: null }, false, 'clearError')
        },

        clearAll: () => {
          set({
            currentRoomCode: null,
            hostPlayerId: null,
            coPilotMode: 'everyone',
            coPilotModeSelected: false,
            playerPositions: {},
            otherPlayerNames: [],
            roomCreationStatus: 'idle',
            joinRoomStatus: 'idle',
            error: null
          }, false, 'clearAll')
        },

        resetToStart: () => {
          set({
            currentRoomCode: null,
            hostPlayerId: null,
            coPilotMode: 'everyone',
            coPilotModeSelected: false,
            playerPositions: {},
            otherPlayerNames: [],
            roomCreationStatus: 'idle',
            joinRoomStatus: 'idle',
            error: null
          }, false, 'resetToStart')
        },

        // Computed properties
        isHost: (playerId) => {
          const state = get()
          return state.hostPlayerId === playerId
        },

        isRoomReadyForGame: () => {
          const state = get()
          if (!state.currentRoomCode) return false
          
          const positionedPlayers = Object.keys(state.playerPositions).length
          return state.coPilotMode === 'solo' 
            ? positionedPlayers >= 1 // Solo mode: just need host positioned
            : positionedPlayers >= 2 // Everyone mode: minimum players for game
        },

        getRoomSetupProgress: () => {
          const state = get()
          let currentStep: RoomSetupProgress['currentStep'] = 'mode-selection'
          let completedSteps = 0

          // Step 1: Co-pilot mode explicitly selected
          if (state.coPilotModeSelected) {
            completedSteps = 1
            currentStep = 'room-creation'
          }

          // Step 2: Room created/joined
          if (state.currentRoomCode) {
            completedSteps = 2
            currentStep = 'player-positioning'
          }

          // Step 3: Players positioned
          const positionedPlayersCount = Object.keys(state.playerPositions).length
          const isReadyForGame = state.coPilotMode === 'solo' 
            ? positionedPlayersCount >= 1 // Solo mode: just need host positioned
            : positionedPlayersCount >= 2 // Everyone mode: need at least 2 players
          
          if (state.currentRoomCode && isReadyForGame) {
            completedSteps = 3
            currentStep = 'ready'
          }

          return {
            currentStep,
            completedSteps,
            totalSteps: 3
          }
        }
      }),
      {
        name: 'room-store',
        partialize: (state) => ({
          currentRoomCode: state.currentRoomCode,
          hostPlayerId: state.hostPlayerId,
          coPilotMode: state.coPilotMode,
          coPilotModeSelected: state.coPilotModeSelected,
          playerPositions: state.playerPositions,
          otherPlayerNames: state.otherPlayerNames
        })
      }
    ),
    { name: 'room-store' }
  )
)