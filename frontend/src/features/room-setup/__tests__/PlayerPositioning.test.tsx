// PlayerPositioning Component Test Suite

import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { PlayerPositioning } from '../PlayerPositioning'
import type { PlayerPosition } from '../../../stores/room-store'

describe('PlayerPositioning Component', () => {
  const mockPlayers = [
    { id: 'player-1', name: 'Host Player', isHost: true },
    { id: 'player-2', name: 'Player 2', isHost: false },
    { id: 'player-3', name: 'Player 3', isHost: false }
  ]

  const mockPositions: Record<string, PlayerPosition> = {
    'player-1': 'north',
    'player-2': 'east'
  }

  const defaultProps = {
    players: mockPlayers,
    playerPositions: mockPositions,
    currentPlayerId: 'player-1',
    onPositionChange: vi.fn(),
    disabled: false
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render positioning title', () => {
      render(<PlayerPositioning {...defaultProps} />)
      
      expect(screen.getByText('Choose Your Position')).toBeInTheDocument()
    })

    it('should render mahjong table layout', () => {
      render(<PlayerPositioning {...defaultProps} />)
      
      expect(screen.getByRole('region', { name: /mahjong table/i })).toBeInTheDocument()
    })

    it('should show all four table positions', () => {
      render(<PlayerPositioning {...defaultProps} />)
      
      expect(screen.getByText('North')).toBeInTheDocument()
      expect(screen.getByText('East')).toBeInTheDocument()
      expect(screen.getByText('South')).toBeInTheDocument()
      expect(screen.getByText('West')).toBeInTheDocument()
    })

    it('should display player list', () => {
      render(<PlayerPositioning {...defaultProps} />)
      
      expect(screen.getByText('Host Player')).toBeInTheDocument()
      expect(screen.getByText('Player 2')).toBeInTheDocument()
      expect(screen.getByText('Player 3')).toBeInTheDocument()
    })

    it('should show host indicator', () => {
      render(<PlayerPositioning {...defaultProps} />)
      
      const hostIndicator = screen.getByText('👑')
      expect(hostIndicator).toBeInTheDocument()
    })
  })

  describe('Position Assignment', () => {
    it('should show occupied positions with player names', () => {
      render(<PlayerPositioning {...defaultProps} />)
      
      const northPosition = screen.getByRole('button', { name: /north.*host player/i })
      const eastPosition = screen.getByRole('button', { name: /east.*player 2/i })
      
      expect(northPosition).toBeInTheDocument()
      expect(eastPosition).toBeInTheDocument()
    })

    it('should show available positions as selectable', () => {
      render(<PlayerPositioning {...defaultProps} />)
      
      const southPosition = screen.getByRole('button', { name: /south.*available/i })
      const westPosition = screen.getByRole('button', { name: /west.*available/i })
      
      expect(southPosition).toBeInTheDocument()
      expect(westPosition).toBeInTheDocument()
    })

    it('should call onPositionChange when selecting available position', () => {
      const onPositionChange = vi.fn()
      render(<PlayerPositioning {...defaultProps} onPositionChange={onPositionChange} />)
      
      const southPosition = screen.getByRole('button', { name: /south.*available/i })
      fireEvent.click(southPosition)
      
      expect(onPositionChange).toHaveBeenCalledWith('player-1', 'south')
    })

    it('should not allow selecting occupied positions', () => {
      const onPositionChange = jest.fn()
      render(<PlayerPositioning {...defaultProps} onPositionChange={onPositionChange} />)
      
      const northPosition = screen.getByRole('button', { name: /north.*host player/i })
      fireEvent.click(northPosition)
      
      expect(onPositionChange).not.toHaveBeenCalled()
    })

    it('should allow changing own position', () => {
      const onPositionChange = jest.fn()
      render(<PlayerPositioning {...defaultProps} onPositionChange={onPositionChange} />)
      
      const southPosition = screen.getByRole('button', { name: /south.*available/i })
      fireEvent.click(southPosition)
      
      expect(onPositionChange).toHaveBeenCalledWith('player-1', 'south')
    })
  })

  describe('Visual Styling', () => {
    it('should highlight current player position', () => {
      render(<PlayerPositioning {...defaultProps} />)
      
      const currentPlayerPosition = screen.getByRole('button', { name: /north.*host player/i })
      expect(currentPlayerPosition).toHaveClass('border-primary-500')
    })

    it('should style occupied positions differently', () => {
      render(<PlayerPositioning {...defaultProps} />)
      
      const occupiedPosition = screen.getByRole('button', { name: /east.*player 2/i })
      expect(occupiedPosition).toHaveClass('bg-gray-100')
    })

    it('should style available positions as selectable', () => {
      render(<PlayerPositioning {...defaultProps} />)
      
      const availablePosition = screen.getByRole('button', { name: /south.*available/i })
      expect(availablePosition).toHaveClass('hover:bg-primary-50')
    })

    it('should show position icons', () => {
      render(<PlayerPositioning {...defaultProps} />)
      
      // Should show wind direction indicators
      expect(screen.getByText('↑')).toBeInTheDocument() // North
      expect(screen.getByText('→')).toBeInTheDocument() // East
      expect(screen.getByText('↓')).toBeInTheDocument() // South
      expect(screen.getByText('←')).toBeInTheDocument() // West
    })
  })

  describe('Disabled State', () => {
    it('should disable all position buttons when disabled', () => {
      render(<PlayerPositioning {...defaultProps} disabled={true} />)
      
      const positions = screen.getAllByRole('button')
      positions.forEach(position => {
        expect(position).toBeDisabled()
      })
    })

    it('should not call onPositionChange when disabled', () => {
      const onPositionChange = jest.fn()
      render(<PlayerPositioning {...defaultProps} disabled={true} onPositionChange={onPositionChange} />)
      
      const southPosition = screen.getByRole('button', { name: /south.*available/i })
      fireEvent.click(southPosition)
      
      expect(onPositionChange).not.toHaveBeenCalled()
    })

    it('should apply disabled styling', () => {
      render(<PlayerPositioning {...defaultProps} disabled={true} />)
      
      const southPosition = screen.getByRole('button', { name: /south.*available/i })
      expect(southPosition).toHaveClass('opacity-50')
    })
  })

  describe('Player Without Position', () => {
    it('should show unpositioned players in waiting area', () => {
      render(<PlayerPositioning {...defaultProps} />)
      
      // Player 3 has no position assigned
      const waitingArea = screen.getByRole('region', { name: /waiting to join/i })
      expect(waitingArea).toBeInTheDocument()
      expect(waitingArea).toHaveTextContent('Player 3')
    })

    it('should allow unpositioned players to select seats', () => {
      const onPositionChange = jest.fn()
      const props = {
        ...defaultProps,
        currentPlayerId: 'player-3', // Unpositioned player
        onPositionChange
      }
      render(<PlayerPositioning {...props} />)
      
      const southPosition = screen.getByRole('button', { name: /south.*available/i })
      fireEvent.click(southPosition)
      
      expect(onPositionChange).toHaveBeenCalledWith('player-3', 'south')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels for positions', () => {
      render(<PlayerPositioning {...defaultProps} />)
      
      const northPosition = screen.getByRole('button', { name: /north/i })
      expect(northPosition).toHaveAttribute('aria-label')
    })

    it('should announce position status to screen readers', () => {
      render(<PlayerPositioning {...defaultProps} />)
      
      const occupiedPosition = screen.getByRole('button', { name: /north.*host player/i })
      const availablePosition = screen.getByRole('button', { name: /south.*available/i })
      
      expect(occupiedPosition).toHaveAttribute('aria-label')
      expect(availablePosition).toHaveAttribute('aria-label')
    })

    it('should support keyboard navigation', () => {
      const onPositionChange = jest.fn()
      render(<PlayerPositioning {...defaultProps} onPositionChange={onPositionChange} />)
      
      const southPosition = screen.getByRole('button', { name: /south.*available/i })
      southPosition.focus()
      fireEvent.keyDown(southPosition, { key: 'Enter' })
      
      expect(onPositionChange).toHaveBeenCalledWith('player-1', 'south')
    })
  })

  describe('Position Requirements', () => {
    it('should show minimum player requirement message', () => {
      const singlePlayerProps = {
        ...defaultProps,
        players: [mockPlayers[0]],
        playerPositions: { 'player-1': 'north' as PlayerPosition }
      }
      render(<PlayerPositioning {...singlePlayerProps} />)
      
      expect(screen.getByText(/waiting for more players/i)).toBeInTheDocument()
    })

    it('should show ready to start message with enough players', () => {
      const readyProps = {
        ...defaultProps,
        playerPositions: {
          'player-1': 'north' as PlayerPosition,
          'player-2': 'east' as PlayerPosition
        }
      }
      render(<PlayerPositioning {...readyProps} />)
      
      expect(screen.getByText(/ready to start/i)).toBeInTheDocument()
    })
  })

  describe('Layout and Table View', () => {
    it('should arrange positions in table layout', () => {
      render(<PlayerPositioning {...defaultProps} />)
      
      const tableLayout = screen.getByRole('region', { name: /mahjong table/i })
      expect(tableLayout).toHaveClass('grid')
    })

    it('should position north at top', () => {
      render(<PlayerPositioning {...defaultProps} />)
      
      const tableLayout = screen.getByRole('region', { name: /mahjong table/i })
      const northPosition = screen.getByRole('button', { name: /north/i })
      
      // North should be first in grid order (top position)
      expect(tableLayout.firstElementChild).toContain(northPosition)
    })
  })
})