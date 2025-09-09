import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { Room, Player } from '../../../shared/multiplayer-types'

export type CoPilotMode = 'everyone' | 'solo'
export type PlayerPosition = 'north' | 'east' | 'south' | 'west'
export type RoomStatus = 'idle' | 'creating' | 'joining' | 'success' | 'error'

interface RoomSetupProgress {
  currentStep: 'mode-selection' | 'room-creation' | 'player-positioning' | 'ready'
  completedSteps: number
  totalSteps: number
}

interface HostPermissions {
  canKickPlayers: boolean
  canTransferHost: boolean
  canChangeSettings: boolean
  canStartGame: boolean
  canPauseGame: boolean
}

interface RoomSettings {
  maxPlayers: number
  isPrivate: boolean
  roomName?: string
  gameMode: 'nmjl-2025' | 'custom'
  allowSpectators: boolean
  spectatorMode: boolean
  autoAdvanceTurns: boolean
  turnTimeLimit: number
  allowReconnection: boolean
}

interface CrossPhasePlayerState {
  id: string
  name: string
  isHost: boolean
  isConnected: boolean
  lastSeen: Date
  roomReadiness: boolean
  charlestonReadiness: boolean
  gameplayReadiness: boolean
  position?: PlayerPosition
  isCurrentTurn?: boolean
}

interface ConnectionStatus {
  isConnected: boolean
  connectionId?: string
  lastPing?: Date
  reconnectionAttempts: number
}

interface RoomState {
  // Room state
  currentRoomCode: string | null
  hostPlayerId: string | null
  coPilotMode: CoPilotMode
  coPilotModeSelected: boolean // Track if mode was explicitly selected
  playerPositions: Record<string, PlayerPosition>
  otherPlayerNames: string[] // For solo mode - names of other players at the table
  
  // Enhanced multiplayer state
  room: Room | null
  players: CrossPhasePlayerState[]
  hostPermissions: HostPermissions
  roomSettings: RoomSettings
  connectionStatus: ConnectionStatus
  spectators: Player[]
  
  // Phase and readiness tracking
  currentPhase: 'waiting' | 'setup' | 'charleston' | 'playing' | 'scoring' | 'finished'
  phaseReadiness: Record<string, { room: boolean; charleston: boolean; gameplay: boolean }>
  allPlayersReady: Record<string, boolean> // phase -> ready status
  
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

  // Enhanced multiplayer actions
  updateRoom: (room: Room) => void
  updatePlayers: (players: CrossPhasePlayerState[]) => void
  updatePlayerState: (playerId: string, updates: Partial<CrossPhasePlayerState>) => void
  removePlayer: (playerId: string) => void
  
  // Host management
  updateHostPermissions: (permissions: HostPermissions) => void
  transferHost: (newHostId: string) => void
  kickPlayer: (playerId: string) => void
  
  // Room settings
  updateRoomSettings: (settings: Partial<RoomSettings>) => void
  
  // Phase management
  setCurrentPhase: (phase: 'waiting' | 'setup' | 'charleston' | 'playing' | 'scoring' | 'finished') => void
  setPlayerReadiness: (playerId: string, phase: 'room' | 'charleston' | 'gameplay', ready: boolean) => void
  setPhaseReadiness: (phase: string, ready: boolean) => void
  
  // Connection management
  updateConnectionStatus: (status: Partial<ConnectionStatus>) => void
  setPlayerConnection: (playerId: string, connected: boolean) => void
  
  // Spectator management
  addSpectator: (spectator: Player) => void
  removeSpectator: (spectatorId: string) => void

  // Computed properties
  isHost: (playerId: string) => boolean
  isRoomReadyForGame: () => boolean
  getRoomSetupProgress: () => RoomSetupProgress
  isCurrentPlayerHost: () => boolean
  getConnectedPlayers: () => CrossPhasePlayerState[]
  getDisconnectedPlayers: () => CrossPhasePlayerState[]
  getPlayerByPosition: (position: PlayerPosition) => CrossPhasePlayerState | null
  getReadinessSummary: (phase: 'room' | 'charleston' | 'gameplay') => { ready: string[]; notReady: string[]; total: number }
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

        // Enhanced multiplayer initial state
        room: null,
        players: [],
        hostPermissions: {
          canKickPlayers: false,
          canTransferHost: false,
          canChangeSettings: false,
          canStartGame: false,
          canPauseGame: false
        },
        roomSettings: {
          maxPlayers: 4,
          isPrivate: false,
          gameMode: 'nmjl-2025',
          allowSpectators: false,
          spectatorMode: false,
          autoAdvanceTurns: false,
          turnTimeLimit: 0,
          allowReconnection: true
        },
        connectionStatus: {
          isConnected: false,
          reconnectionAttempts: 0
        },
        spectators: [],
        currentPhase: 'waiting',
        phaseReadiness: {},
        allPlayersReady: {},

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
          
          if (state.coPilotMode === 'solo') {
            // Solo mode: all players (1 + other players) must be positioned
            const totalPlayers = 1 + state.otherPlayerNames.filter(name => name.trim().length > 0).length
            return positionedPlayers >= totalPlayers
          } else {
            // Everyone mode: minimum 2 players for game
            return positionedPlayers >= 2
          }
        },

        // Enhanced multiplayer actions
        updateRoom: (room) => {
          set({ 
            room, 
            currentRoomCode: room.id,
            hostPlayerId: room.hostId 
          }, false, 'updateRoom')
        },

        updatePlayers: (players) => {
          set({ players }, false, 'updatePlayers')
        },

        updatePlayerState: (playerId, updates) => {
          set((state) => ({
            players: state.players.map(p => 
              p.id === playerId ? { ...p, ...updates } : p
            )
          }), false, 'updatePlayerState')
        },

        removePlayer: (playerId) => {
          set((state) => ({
            players: state.players.filter(p => p.id !== playerId)
          }), false, 'removePlayer')
        },

        // Host management
        updateHostPermissions: (permissions) => {
          set({ hostPermissions: permissions }, false, 'updateHostPermissions')
        },

        transferHost: (newHostId) => {
          set((state) => ({
            hostPlayerId: newHostId,
            players: state.players.map(p => ({
              ...p,
              isHost: p.id === newHostId
            }))
          }), false, 'transferHost')
        },

        kickPlayer: (playerId) => {
          const state = get()
          state.removePlayer(playerId)
        },

        // Room settings
        updateRoomSettings: (settings) => {
          set((state) => ({
            roomSettings: { ...state.roomSettings, ...settings }
          }), false, 'updateRoomSettings')
        },

        // Phase management
        setCurrentPhase: (phase) => {
          set({ currentPhase: phase }, false, 'setCurrentPhase')
        },

        setPlayerReadiness: (playerId, phase, ready) => {
          set((state) => {
            const newReadiness = { ...state.phaseReadiness }
            if (!newReadiness[playerId]) {
              newReadiness[playerId] = { room: false, charleston: false, gameplay: false }
            }
            newReadiness[playerId][phase] = ready
            return { phaseReadiness: newReadiness }
          }, false, 'setPlayerReadiness')
        },

        setPhaseReadiness: (phase, ready) => {
          set((state) => ({
            allPlayersReady: { ...state.allPlayersReady, [phase]: ready }
          }), false, 'setPhaseReadiness')
        },

        // Connection management
        updateConnectionStatus: (status) => {
          set((state) => ({
            connectionStatus: { ...state.connectionStatus, ...status }
          }), false, 'updateConnectionStatus')
        },

        setPlayerConnection: (playerId, connected) => {
          const state = get()
          state.updatePlayerState(playerId, { isConnected: connected, lastSeen: new Date() })
        },

        // Spectator management
        addSpectator: (spectator) => {
          set((state) => ({
            spectators: [...state.spectators, spectator]
          }), false, 'addSpectator')
        },

        removeSpectator: (spectatorId) => {
          set((state) => ({
            spectators: state.spectators.filter(s => s.id !== spectatorId)
          }), false, 'removeSpectator')
        },

        // Enhanced computed properties
        isCurrentPlayerHost: () => {
          const state = get()
          return state.hostPlayerId === state.connectionStatus.connectionId
        },

        getConnectedPlayers: () => {
          const state = get()
          return state.players.filter(p => p.isConnected)
        },

        getDisconnectedPlayers: () => {
          const state = get()
          return state.players.filter(p => !p.isConnected)
        },

        getPlayerByPosition: (position) => {
          const state = get()
          return state.players.find(p => p.position === position) || null
        },

        getReadinessSummary: (phase) => {
          const state = get()
          const connectedPlayers = state.players.filter(p => p.isConnected)
          const ready: string[] = []
          const notReady: string[] = []

          connectedPlayers.forEach(player => {
            const playerReadiness = state.phaseReadiness[player.id]
            const isReady = playerReadiness ? playerReadiness[phase] : false
            
            if (isReady) {
              ready.push(player.name)
            } else {
              notReady.push(player.name)
            }
          })

          return { ready, notReady, total: connectedPlayers.length }
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
          let isReadyForGame = false
          
          if (state.coPilotMode === 'solo') {
            // Solo mode: all players must be positioned
            const totalPlayers = 1 + state.otherPlayerNames.filter(name => name.trim().length > 0).length
            isReadyForGame = positionedPlayersCount >= totalPlayers
          } else {
            // Everyone mode: need at least 2 players
            isReadyForGame = positionedPlayersCount >= 2
          }
          
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