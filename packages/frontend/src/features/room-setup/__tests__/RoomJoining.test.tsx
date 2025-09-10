// RoomJoining Component Test Suite

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { RoomJoining } from '../RoomJoining'

describe('RoomJoining Component', () => {
  const defaultProps = {
    roomCode: '',
    playerName: '',
    onRoomCodeChange: vi.fn(),
    onPlayerNameChange: vi.fn(),
    onJoinRoom: vi.fn(),
    isJoining: false,
    error: null,
    disabled: false
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render join form title', () => {
      render(<RoomJoining {...defaultProps} />)
      
      expect(screen.getByText('Join Existing Room')).toBeInTheDocument()
    })

    it('should render room code input', () => {
      render(<RoomJoining {...defaultProps} />)
      
      const input = screen.getByLabelText(/room code/i)
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('type', 'text')
    })

    it('should render player name input', () => {
      render(<RoomJoining {...defaultProps} />)
      
      const input = screen.getByLabelText(/your name/i)
      expect(input).toBeInTheDocument()
    })

    it('should render join room button', () => {
      render(<RoomJoining {...defaultProps} />)
      
      const button = screen.getByRole('button', { name: /join room/i })
      expect(button).toBeInTheDocument()
    })

    it('should show current values in inputs', () => {
      render(<RoomJoining {...defaultProps} roomCode="ABCD" playerName="Test Player" />)
      
      expect(screen.getByDisplayValue('ABCD')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test Player')).toBeInTheDocument()
    })
  })

  describe('Form Interaction', () => {
    it('should call onRoomCodeChange when typing in room code input', async () => {
      const user = userEvent.setup()
      const onRoomCodeChange = vi.fn()
      render(<RoomJoining {...defaultProps} onRoomCodeChange={onRoomCodeChange} />)
      
      const input = screen.getByLabelText(/room code/i)
      await user.type(input, 'ABCD')
      
      expect(onRoomCodeChange).toHaveBeenCalledTimes(4)
      expect(onRoomCodeChange).toHaveBeenLastCalledWith('ABCD')
    })

    it('should call onPlayerNameChange when typing in name input', async () => {
      const user = userEvent.setup()
      const onPlayerNameChange = vi.fn()
      render(<RoomJoining {...defaultProps} onPlayerNameChange={onPlayerNameChange} />)
      
      const input = screen.getByLabelText(/your name/i)
      await user.type(input, 'Test')
      
      expect(onPlayerNameChange).toHaveBeenCalledTimes(4)
      expect(onPlayerNameChange).toHaveBeenLastCalledWith('Test')
    })

    it('should uppercase room code input', async () => {
      const user = userEvent.setup()
      const onRoomCodeChange = vi.fn()
      render(<RoomJoining {...defaultProps} onRoomCodeChange={onRoomCodeChange} />)
      
      const input = screen.getByLabelText(/room code/i)
      await user.type(input, 'abcd')
      
      expect(onRoomCodeChange).toHaveBeenLastCalledWith('ABCD')
    })

    it('should limit room code to 4 characters', async () => {
      const user = userEvent.setup()
      const onRoomCodeChange = vi.fn()
      render(<RoomJoining {...defaultProps} onRoomCodeChange={onRoomCodeChange} />)
      
      const input = screen.getByLabelText(/room code/i)
      await user.type(input, 'ABCDEF')
      
      // Should only call for first 4 characters
      expect(onRoomCodeChange).toHaveBeenCalledTimes(4)
      expect(onRoomCodeChange).toHaveBeenLastCalledWith('ABCD')
    })

    it('should call onJoinRoom when form is submitted', () => {
      const onJoinRoom = vi.fn()
      render(<RoomJoining {...defaultProps} roomCode="ABCD" playerName="Test" onJoinRoom={onJoinRoom} />)
      
      const button = screen.getByRole('button', { name: /join room/i })
      fireEvent.click(button)
      
      expect(onJoinRoom).toHaveBeenCalledWith('ABCD', 'Test')
    })

    it('should not submit with empty fields', () => {
      const onJoinRoom = vi.fn()
      render(<RoomJoining {...defaultProps} onJoinRoom={onJoinRoom} />)
      
      const button = screen.getByRole('button', { name: /join room/i })
      fireEvent.click(button)
      
      expect(onJoinRoom).not.toHaveBeenCalled()
    })
  })

  describe('Validation', () => {
    it('should show validation error for empty room code', async () => {
      render(<RoomJoining {...defaultProps} roomCode="" playerName="Test" />)
      
      const button = screen.getByRole('button', { name: /join room/i })
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(screen.getByText(/please enter a room code/i)).toBeInTheDocument()
      })
    })

    it('should show validation error for empty player name', async () => {
      render(<RoomJoining {...defaultProps} roomCode="ABCD" playerName="" />)
      
      const button = screen.getByRole('button', { name: /join room/i })
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(screen.getByText(/please enter your name/i)).toBeInTheDocument()
      })
    })

    it('should show validation error for invalid room code format', async () => {
      render(<RoomJoining {...defaultProps} roomCode="ABC" playerName="Test" />)
      
      const button = screen.getByRole('button', { name: /join room/i })
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(screen.getByText(/room code must be exactly 4 characters/i)).toBeInTheDocument()
      })
    })

    it('should clear validation errors when user types', async () => {
      const user = userEvent.setup()
      render(<RoomJoining {...defaultProps} roomCode="" playerName="" />)
      
      // Trigger validation errors
      const button = screen.getByRole('button', { name: /join room/i })
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(screen.getByText(/please enter a room code/i)).toBeInTheDocument()
      })
      
      // Type in room code to clear error
      const roomCodeInput = screen.getByLabelText(/room code/i)
      await user.type(roomCodeInput, 'A')
      
      await waitFor(() => {
        expect(screen.queryByText(/please enter a room code/i)).not.toBeInTheDocument()
      })
    })

    it('should validate player name length', async () => {
      render(<RoomJoining {...defaultProps} roomCode="ABCD" playerName="A" />)
      
      const button = screen.getByRole('button', { name: /join room/i })
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(screen.getByText(/name must be at least 2 characters/i)).toBeInTheDocument()
      })
    })
  })

  describe('Loading State', () => {
    it('should show loading state when joining', () => {
      render(<RoomJoining {...defaultProps} isJoining={true} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveTextContent(/joining/i)
      expect(button).toBeDisabled()
    })

    it('should show loading spinner when joining', () => {
      render(<RoomJoining {...defaultProps} isJoining={true} />)
      
      const spinner = screen.getByRole('status', { name: /loading/i })
      expect(spinner).toBeInTheDocument()
    })

    it('should disable inputs when joining', () => {
      render(<RoomJoining {...defaultProps} isJoining={true} />)
      
      const roomCodeInput = screen.getByLabelText(/room code/i)
      const nameInput = screen.getByLabelText(/your name/i)
      
      expect(roomCodeInput).toBeDisabled()
      expect(nameInput).toBeDisabled()
    })
  })

  describe('Error Handling', () => {
    it('should display error message', () => {
      render(<RoomJoining {...defaultProps} error="Room not found" />)
      
      expect(screen.getByText('Room not found')).toBeInTheDocument()
    })

    it('should style error message appropriately', () => {
      render(<RoomJoining {...defaultProps} error="Test error" />)
      
      const errorElement = screen.getByText('Test error')
      expect(errorElement).toHaveClass('text-red-600')
    })

    it('should show error icon with message', () => {
      render(<RoomJoining {...defaultProps} error="Test error" />)
      
      const errorIcon = screen.getByText('⚠️')
      expect(errorIcon).toBeInTheDocument()
    })
  })

  describe('Disabled State', () => {
    it('should disable form when disabled prop is true', () => {
      render(<RoomJoining {...defaultProps} disabled={true} />)
      
      const roomCodeInput = screen.getByLabelText(/room code/i)
      const nameInput = screen.getByLabelText(/your name/i)
      const button = screen.getByRole('button', { name: /join room/i })
      
      expect(roomCodeInput).toBeDisabled()
      expect(nameInput).toBeDisabled()
      expect(button).toBeDisabled()
    })
  })

  describe('Room Code Formatting', () => {
    it('should format room code with proper spacing', () => {
      render(<RoomJoining {...defaultProps} roomCode="ABCD" />)
      
      const input = screen.getByLabelText(/room code/i)
      expect(input).toHaveClass('font-mono', 'tracking-wider')
    })

    it('should show room code placeholder in correct format', () => {
      render(<RoomJoining {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('ABCD')
      expect(input).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(<RoomJoining {...defaultProps} />)
      
      const roomCodeInput = screen.getByLabelText(/room code/i)
      const nameInput = screen.getByLabelText(/your name/i)
      
      expect(roomCodeInput).toHaveAttribute('id')
      expect(nameInput).toHaveAttribute('id')
    })

    it('should announce errors to screen readers', () => {
      render(<RoomJoining {...defaultProps} error="Test error" />)
      
      const errorElement = screen.getByRole('alert')
      expect(errorElement).toBeInTheDocument()
    })

    it('should indicate required fields', () => {
      render(<RoomJoining {...defaultProps} />)
      
      const roomCodeInput = screen.getByLabelText(/room code/i)
      const nameInput = screen.getByLabelText(/your name/i)
      
      expect(roomCodeInput).toHaveAttribute('required')
      expect(nameInput).toHaveAttribute('required')
    })
  })

  describe('Join Instructions', () => {
    it('should show joining instructions', () => {
      render(<RoomJoining {...defaultProps} />)
      
      expect(screen.getByText(/enter the 4-character room code/i)).toBeInTheDocument()
    })

    it('should display join tips', () => {
      render(<RoomJoining {...defaultProps} />)
      
      expect(screen.getByText(/room codes are case-insensitive/i)).toBeInTheDocument()
    })
  })
})