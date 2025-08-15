// RoomCreation Component Test Suite

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RoomCreation } from '../RoomCreation'

describe('RoomCreation Component', () => {
  const defaultProps = {
    hostName: '',
    onHostNameChange: jest.fn(),
    onCreateRoom: jest.fn(),
    isCreating: false,
    error: null,
    disabled: false
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render creation form title', () => {
      render(<RoomCreation {...defaultProps} />)
      
      expect(screen.getByText('Create New Room')).toBeInTheDocument()
    })

    it('should render host name input', () => {
      render(<RoomCreation {...defaultProps} />)
      
      const input = screen.getByLabelText(/your name/i)
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('type', 'text')
    })

    it('should render create room button', () => {
      render(<RoomCreation {...defaultProps} />)
      
      const button = screen.getByRole('button', { name: /create room/i })
      expect(button).toBeInTheDocument()
    })

    it('should show host name value', () => {
      render(<RoomCreation {...defaultProps} hostName="Test Player" />)
      
      const input = screen.getByDisplayValue('Test Player')
      expect(input).toBeInTheDocument()
    })

    it('should show placeholder text', () => {
      render(<RoomCreation {...defaultProps} />)
      
      const input = screen.getByPlaceholderText(/enter your name/i)
      expect(input).toBeInTheDocument()
    })
  })

  describe('Form Interaction', () => {
    it('should call onHostNameChange when typing in input', async () => {
      const user = userEvent.setup()
      const onHostNameChange = jest.fn()
      render(<RoomCreation {...defaultProps} onHostNameChange={onHostNameChange} />)
      
      const input = screen.getByLabelText(/your name/i)
      await user.type(input, 'Test')
      
      expect(onHostNameChange).toHaveBeenCalledTimes(4) // One for each character
      expect(onHostNameChange).toHaveBeenLastCalledWith('Test')
    })

    it('should call onCreateRoom when form is submitted', async () => {
      const onCreateRoom = jest.fn()
      render(<RoomCreation {...defaultProps} hostName="Test Player" onCreateRoom={onCreateRoom} />)
      
      const button = screen.getByRole('button', { name: /create room/i })
      fireEvent.click(button)
      
      expect(onCreateRoom).toHaveBeenCalledWith('Test Player')
    })

    it('should call onCreateRoom when pressing Enter in input', async () => {
      const onCreateRoom = jest.fn()
      render(<RoomCreation {...defaultProps} hostName="Test Player" onCreateRoom={onCreateRoom} />)
      
      const input = screen.getByLabelText(/your name/i)
      fireEvent.keyDown(input, { key: 'Enter' })
      
      expect(onCreateRoom).toHaveBeenCalledWith('Test Player')
    })

    it('should not submit with empty name', () => {
      const onCreateRoom = jest.fn()
      render(<RoomCreation {...defaultProps} hostName="" onCreateRoom={onCreateRoom} />)
      
      const button = screen.getByRole('button', { name: /create room/i })
      fireEvent.click(button)
      
      expect(onCreateRoom).not.toHaveBeenCalled()
    })

    it('should trim whitespace from host name', () => {
      const onCreateRoom = jest.fn()
      render(<RoomCreation {...defaultProps} hostName="  Test Player  " onCreateRoom={onCreateRoom} />)
      
      const button = screen.getByRole('button', { name: /create room/i })
      fireEvent.click(button)
      
      expect(onCreateRoom).toHaveBeenCalledWith('Test Player')
    })
  })

  describe('Loading State', () => {
    it('should show loading state when creating', () => {
      render(<RoomCreation {...defaultProps} isCreating={true} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveTextContent(/creating/i)
      expect(button).toBeDisabled()
    })

    it('should show loading spinner when creating', () => {
      render(<RoomCreation {...defaultProps} isCreating={true} />)
      
      const spinner = screen.getByRole('status', { name: /loading/i })
      expect(spinner).toBeInTheDocument()
    })

    it('should disable input when creating', () => {
      render(<RoomCreation {...defaultProps} isCreating={true} />)
      
      const input = screen.getByLabelText(/your name/i)
      expect(input).toBeDisabled()
    })

    it('should not call onCreateRoom when creating', () => {
      const onCreateRoom = jest.fn()
      render(<RoomCreation {...defaultProps} isCreating={true} onCreateRoom={onCreateRoom} />)
      
      const button = screen.getByRole('button')
      fireEvent.click(button)
      
      expect(onCreateRoom).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should display error message', () => {
      render(<RoomCreation {...defaultProps} error="Failed to create room" />)
      
      expect(screen.getByText('Failed to create room')).toBeInTheDocument()
    })

    it('should style error message appropriately', () => {
      render(<RoomCreation {...defaultProps} error="Test error" />)
      
      const errorElement = screen.getByText('Test error')
      expect(errorElement).toHaveClass('text-red-600')
    })

    it('should show error icon with message', () => {
      render(<RoomCreation {...defaultProps} error="Test error" />)
      
      const errorIcon = screen.getByText('⚠️')
      expect(errorIcon).toBeInTheDocument()
    })

    it('should not show error when none provided', () => {
      render(<RoomCreation {...defaultProps} error={null} />)
      
      const errorElement = screen.queryByRole('alert')
      expect(errorElement).not.toBeInTheDocument()
    })
  })

  describe('Disabled State', () => {
    it('should disable form when disabled prop is true', () => {
      render(<RoomCreation {...defaultProps} disabled={true} />)
      
      const input = screen.getByLabelText(/your name/i)
      const button = screen.getByRole('button', { name: /create room/i })
      
      expect(input).toBeDisabled()
      expect(button).toBeDisabled()
    })

    it('should apply disabled styling', () => {
      render(<RoomCreation {...defaultProps} disabled={true} />)
      
      const button = screen.getByRole('button', { name: /create room/i })
      expect(button).toHaveClass('opacity-50')
    })
  })

  describe('Validation', () => {
    it('should show validation message for empty name', async () => {
      render(<RoomCreation {...defaultProps} hostName="" />)
      
      const button = screen.getByRole('button', { name: /create room/i })
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(screen.getByText(/please enter your name/i)).toBeInTheDocument()
      })
    })

    it('should clear validation error when typing', async () => {
      const user = userEvent.setup()
      render(<RoomCreation {...defaultProps} hostName="" />)
      
      // Trigger validation error
      const button = screen.getByRole('button', { name: /create room/i })
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(screen.getByText(/please enter your name/i)).toBeInTheDocument()
      })
      
      // Type in input to clear error
      const input = screen.getByLabelText(/your name/i)
      await user.type(input, 'Test')
      
      await waitFor(() => {
        expect(screen.queryByText(/please enter your name/i)).not.toBeInTheDocument()
      })
    })

    it('should validate name length', async () => {
      render(<RoomCreation {...defaultProps} hostName="A" />)
      
      const button = screen.getByRole('button', { name: /create room/i })
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(screen.getByText(/name must be at least 2 characters/i)).toBeInTheDocument()
      })
    })

    it('should limit name length', async () => {
      const longName = 'A'.repeat(51)
      render(<RoomCreation {...defaultProps} hostName={longName} />)
      
      const button = screen.getByRole('button', { name: /create room/i })
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(screen.getByText(/name must be 50 characters or less/i)).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(<RoomCreation {...defaultProps} />)
      
      const input = screen.getByLabelText(/your name/i)
      expect(input).toHaveAttribute('id')
      
      const label = screen.getByText(/your name/i)
      expect(label).toHaveAttribute('for', input.id)
    })

    it('should announce errors to screen readers', () => {
      render(<RoomCreation {...defaultProps} error="Test error" />)
      
      const errorElement = screen.getByRole('alert')
      expect(errorElement).toBeInTheDocument()
    })

    it('should have proper button labeling', () => {
      render(<RoomCreation {...defaultProps} />)
      
      const button = screen.getByRole('button', { name: /create room/i })
      expect(button).toHaveAttribute('aria-label')
    })

    it('should indicate required fields', () => {
      render(<RoomCreation {...defaultProps} />)
      
      const input = screen.getByLabelText(/your name/i)
      expect(input).toHaveAttribute('required')
    })
  })

  describe('Room Features Display', () => {
    it('should show room features list', () => {
      render(<RoomCreation {...defaultProps} />)
      
      expect(screen.getByText(/shareable room code/i)).toBeInTheDocument()
      expect(screen.getByText(/up to 4 players/i)).toBeInTheDocument()
      expect(screen.getByText(/ai co-pilot assistance/i)).toBeInTheDocument()
    })

    it('should display room creation info', () => {
      render(<RoomCreation {...defaultProps} />)
      
      expect(screen.getByText(/creating a room will generate/i)).toBeInTheDocument()
    })
  })
})