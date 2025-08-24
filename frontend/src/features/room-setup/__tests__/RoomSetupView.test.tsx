// RoomSetupView Component Test Suite

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { RoomSetupView } from '../RoomSetupView'
import { useRoomSetup } from '../../../hooks/useRoomSetup'
import { useRoomStore } from '../../../stores/room-store'
import { useMultiplayerStore } from '../../../stores/multiplayer-store'

// Mock dependencies
vi.mock('../../../hooks/useRoomSetup')
vi.mock('../../../stores/room-store')
vi.mock('../../../stores/multiplayer-store')

interface MockRoomSetup {
  coPilotMode: string
  roomCode: string | null
  isHost: boolean
  isCreatingRoom: boolean
  isJoiningRoom: boolean
  error: string | null
  setupProgress: {
    currentStep: string
    completedSteps: number
    totalSteps: number
  }
  setCoPilotMode: ReturnType<typeof vi.fn>
  createRoom: ReturnType<typeof vi.fn>
  joinRoom: ReturnType<typeof vi.fn>
  generateRoomCode: ReturnType<typeof vi.fn>
  clearError: ReturnType<typeof vi.fn>
}

const mockRoomSetup: MockRoomSetup = {
  coPilotMode: 'everyone',
  roomCode: null,
  isHost: false,
  isCreatingRoom: false,
  isJoiningRoom: false,
  error: null,
  setupProgress: {
    currentStep: 'mode-selection',
    completedSteps: 0,
    totalSteps: 3
  },
  setCoPilotMode: vi.fn(),
  createRoom: vi.fn(),
  joinRoom: vi.fn(),
  generateRoomCode: vi.fn(() => 'ABCD'),
  clearError: vi.fn()
}

const mockRoomStore = {
  playerPositions: {},
  setPlayerPosition: vi.fn(),
  isHost: vi.fn(() => false)
}

interface MockMultiplayerStore {
  currentRoom: {
    id: string
    code: string
    players: Array<{
      id: string
      name: string
      isHost: boolean
    }>
  } | null
  currentPlayerId: string
}

const mockMultiplayerStore: MockMultiplayerStore = {
  currentRoom: null,
  currentPlayerId: 'player-1'
}

describe('RoomSetupView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRoomSetup).mockReturnValue(mockRoomSetup)
    vi.mocked(useRoomStore).mockReturnValue(mockRoomStore)
    vi.mocked(useMultiplayerStore).mockReturnValue(mockMultiplayerStore)
  })

  describe('Step 1: Co-Pilot Mode Selection', () => {
    it('should render co-pilot mode selector initially', () => {
      render(<RoomSetupView />)
      
      expect(screen.getByText('Choose Co-Pilot Mode')).toBeInTheDocument()
    })

    it('should show progress indicator for mode selection', () => {
      render(<RoomSetupView />)
      
      expect(screen.getByText('Step 1 of 3')).toBeInTheDocument()
      expect(screen.getByText('Co-Pilot Mode')).toBeInTheDocument()
    })

    it('should call setCoPilotMode when mode is changed', () => {
      render(<RoomSetupView />)
      
      const soloModeButton = screen.getByRole('button', { name: /solo ai mode/i })
      fireEvent.click(soloModeButton)
      
      expect(mockRoomSetup.setCoPilotMode).toHaveBeenCalledWith('solo')
    })
  })

  describe('Step 2: Room Creation/Joining', () => {
    beforeEach(() => {
      mockRoomSetup.setupProgress = {
        currentStep: 'room-creation',
        completedSteps: 1,
        totalSteps: 3
      }
    })

    it('should show room creation and joining options', () => {
      render(<RoomSetupView />)
      
      expect(screen.getByText('Create New Room')).toBeInTheDocument()
      expect(screen.getByText('Join Existing Room')).toBeInTheDocument()
    })

    it('should show progress indicator for room creation', () => {
      render(<RoomSetupView />)
      
      expect(screen.getByText('Step 2 of 3')).toBeInTheDocument()
      expect(screen.getByText('Room Setup')).toBeInTheDocument()
    })

    it('should toggle between create and join modes', () => {
      render(<RoomSetupView />)
      
      const joinTab = screen.getByRole('button', { name: /join room/i })
      fireEvent.click(joinTab)
      
      expect(screen.getByRole('button', { name: /join room/i })).toHaveClass('border-primary-500')
    })

    it('should call createRoom with host name', async () => {
      render(<RoomSetupView />)
      
      // Fill in host name
      const nameInput = screen.getByLabelText(/your name/i)
      fireEvent.change(nameInput, { target: { value: 'Test Host' } })
      
      // Click create room
      const createButton = screen.getByRole('button', { name: /create room/i })
      fireEvent.click(createButton)
      
      await waitFor(() => {
        expect(mockRoomSetup.createRoom).toHaveBeenCalledWith('Test Host')
      })
    })

    it('should call joinRoom with room code and player name', async () => {
      render(<RoomSetupView />)
      
      // Switch to join mode
      const joinTab = screen.getByRole('button', { name: /join room/i })
      fireEvent.click(joinTab)
      
      // Fill in room code and name
      const roomCodeInput = screen.getByLabelText(/room code/i)
      const nameInput = screen.getByLabelText(/your name/i)
      
      fireEvent.change(roomCodeInput, { target: { value: 'ABCD' } })
      fireEvent.change(nameInput, { target: { value: 'Test Player' } })
      
      // Click join room
      const joinButton = screen.getByRole('button', { name: /join room/i })
      fireEvent.click(joinButton)
      
      await waitFor(() => {
        expect(mockRoomSetup.joinRoom).toHaveBeenCalledWith('ABCD', 'Test Player')
      })
    })
  })

  describe('Step 3: Player Positioning', () => {
    beforeEach(() => {
      mockRoomSetup.setupProgress = {
        currentStep: 'player-positioning',
        completedSteps: 2,
        totalSteps: 3
      }
      mockRoomSetup.roomCode = 'ABCD'
      mockMultiplayerStore.currentRoom = {
        id: 'room-123',
        code: 'ABCD',
        players: [
          { id: 'player-1', name: 'Host', isHost: true },
          { id: 'player-2', name: 'Player 2', isHost: false }
        ]
      }
    })

    it('should show player positioning interface', () => {
      render(<RoomSetupView />)
      
      expect(screen.getByText('Choose Your Position')).toBeInTheDocument()
    })

    it('should show progress indicator for positioning', () => {
      render(<RoomSetupView />)
      
      expect(screen.getByText('Step 3 of 3')).toBeInTheDocument()
      expect(screen.getByText('Player Positions')).toBeInTheDocument()
    })

    it('should show room code', () => {
      render(<RoomSetupView />)
      
      expect(screen.getByText('Room Code: ABCD')).toBeInTheDocument()
    })

    it('should call setPlayerPosition when position is selected', () => {
      render(<RoomSetupView />)
      
      const northPosition = screen.getByRole('button', { name: /north.*available/i })
      fireEvent.click(northPosition)
      
      expect(mockRoomStore.setPlayerPosition).toHaveBeenCalledWith('player-1', 'north')
    })
  })

  describe('Ready State', () => {
    beforeEach(() => {
      mockRoomSetup.setupProgress = {
        currentStep: 'ready',
        completedSteps: 3,
        totalSteps: 3
      }
      mockRoomSetup.roomCode = 'ABCD'
      mockRoomSetup.isHost = true
      mockRoomStore.playerPositions = {
        'player-1': 'north',
        'player-2': 'east'
      }
    })

    it('should show ready state when setup is complete', () => {
      render(<RoomSetupView />)
      
      expect(screen.getByText(/setup complete/i)).toBeInTheDocument()
    })

    it('should show start game button for host', () => {
      render(<RoomSetupView />)
      
      expect(screen.getByRole('button', { name: /start game/i })).toBeInTheDocument()
    })

    it('should show waiting message for non-host', () => {
      mockRoomSetup.isHost = false
      render(<RoomSetupView />)
      
      expect(screen.getByText(/waiting for host to start/i)).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should display error messages', () => {
      mockRoomSetup.error = 'Failed to create room'
      render(<RoomSetupView />)
      
      expect(screen.getByText('Failed to create room')).toBeInTheDocument()
    })

    it('should show error dismiss button', () => {
      mockRoomSetup.error = 'Test error'
      render(<RoomSetupView />)
      
      const dismissButton = screen.getByRole('button', { name: /dismiss/i })
      fireEvent.click(dismissButton)
      
      expect(mockRoomSetup.clearError).toHaveBeenCalled()
    })
  })

  describe('Loading States', () => {
    it('should show loading state when creating room', () => {
      mockRoomSetup.isCreatingRoom = true
      render(<RoomSetupView />)
      
      expect(screen.getByText(/creating/i)).toBeInTheDocument()
    })

    it('should show loading state when joining room', () => {
      mockRoomSetup.isJoiningRoom = true
      render(<RoomSetupView />)
      
      expect(screen.getByText(/joining/i)).toBeInTheDocument()
    })

    it('should disable forms during loading', () => {
      mockRoomSetup.isCreatingRoom = true
      render(<RoomSetupView />)
      
      const nameInput = screen.getByLabelText(/your name/i)
      expect(nameInput).toBeDisabled()
    })
  })

  describe('Progress Indicator', () => {
    it('should show correct step numbers', () => {
      render(<RoomSetupView />)
      
      expect(screen.getByText('Step 1 of 3')).toBeInTheDocument()
    })

    it('should show step titles', () => {
      render(<RoomSetupView />)
      
      expect(screen.getByText('Co-Pilot Mode')).toBeInTheDocument()
    })

    it('should highlight current step', () => {
      render(<RoomSetupView />)
      
      const currentStepIndicator = screen.getByText('1')
      expect(currentStepIndicator).toHaveClass('bg-primary-500')
    })

    it('should show completed steps', () => {
      mockRoomSetup.setupProgress = {
        currentStep: 'room-creation',
        completedSteps: 1,
        totalSteps: 3
      }
      render(<RoomSetupView />)
      
      const completedStepIndicator = screen.getByText('✓')
      expect(completedStepIndicator).toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    it('should show back button on later steps', () => {
      mockRoomSetup.setupProgress = {
        currentStep: 'room-creation',
        completedSteps: 1,
        totalSteps: 3
      }
      render(<RoomSetupView />)
      
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
    })

    it('should not show back button on first step', () => {
      render(<RoomSetupView />)
      
      expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument()
    })

    it('should handle back navigation', () => {
      mockRoomSetup.setupProgress = {
        currentStep: 'room-creation',
        completedSteps: 1,
        totalSteps: 3
      }
      render(<RoomSetupView />)
      
      const backButton = screen.getByRole('button', { name: /back/i })
      fireEvent.click(backButton)
      
      // Should navigate back to previous step
      expect(screen.getByText('Choose Co-Pilot Mode')).toBeInTheDocument()
    })
  })
})