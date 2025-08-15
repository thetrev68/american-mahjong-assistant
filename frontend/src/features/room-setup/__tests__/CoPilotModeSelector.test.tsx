// CoPilotModeSelector Component Test Suite

import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { CoPilotModeSelector } from '../CoPilotModeSelector'

describe('CoPilotModeSelector Component', () => {
  const defaultProps = {
    selectedMode: 'everyone' as const,
    onModeChange: vi.fn(),
    disabled: false
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render mode selection title', () => {
      render(<CoPilotModeSelector {...defaultProps} />)
      
      expect(screen.getByText('Choose Co-Pilot Mode')).toBeInTheDocument()
    })

    it('should render both mode options', () => {
      render(<CoPilotModeSelector {...defaultProps} />)
      
      expect(screen.getByText('Everyone Gets AI Help')).toBeInTheDocument()
      expect(screen.getByText('Solo AI Mode')).toBeInTheDocument()
    })

    it('should show mode descriptions', () => {
      render(<CoPilotModeSelector {...defaultProps} />)
      
      expect(screen.getByText(/All players receive AI assistance/)).toBeInTheDocument()
      expect(screen.getByText(/Only you receive AI assistance/)).toBeInTheDocument()
    })

    it('should highlight selected mode', () => {
      render(<CoPilotModeSelector {...defaultProps} selectedMode="solo" />)
      
      const soloCard = screen.getByRole('button', { name: /solo ai mode/i })
      expect(soloCard).toHaveClass('border-primary-500')
    })

    it('should not highlight unselected mode', () => {
      render(<CoPilotModeSelector {...defaultProps} selectedMode="solo" />)
      
      const everyoneCard = screen.getByRole('button', { name: /everyone gets ai help/i })
      expect(everyoneCard).not.toHaveClass('border-primary-500')
    })
  })

  describe('Interaction', () => {
    it('should call onModeChange when everyone mode is selected', () => {
      const onModeChange = vi.fn()
      render(<CoPilotModeSelector {...defaultProps} selectedMode="solo" onModeChange={onModeChange} />)
      
      const everyoneCard = screen.getByRole('button', { name: /everyone gets ai help/i })
      fireEvent.click(everyoneCard)
      
      expect(onModeChange).toHaveBeenCalledWith('everyone')
    })

    it('should call onModeChange when solo mode is selected', () => {
      const onModeChange = vi.fn()
      render(<CoPilotModeSelector {...defaultProps} onModeChange={onModeChange} />)
      
      const soloCard = screen.getByRole('button', { name: /solo ai mode/i })
      fireEvent.click(soloCard)
      
      expect(onModeChange).toHaveBeenCalledWith('solo')
    })

    it('should not call onModeChange when clicking already selected mode', () => {
      const onModeChange = vi.fn()
      render(<CoPilotModeSelector {...defaultProps} selectedMode="everyone" onModeChange={onModeChange} />)
      
      const everyoneCard = screen.getByRole('button', { name: /everyone gets ai help/i })
      fireEvent.click(everyoneCard)
      
      expect(onModeChange).not.toHaveBeenCalled()
    })

    it('should handle keyboard navigation', () => {
      const onModeChange = vi.fn()
      render(<CoPilotModeSelector {...defaultProps} onModeChange={onModeChange} />)
      
      const soloCard = screen.getByRole('button', { name: /solo ai mode/i })
      soloCard.focus()
      fireEvent.keyDown(soloCard, { key: 'Enter' })
      
      expect(onModeChange).toHaveBeenCalledWith('solo')
    })

    it('should handle space key activation', () => {
      const onModeChange = vi.fn()
      render(<CoPilotModeSelector {...defaultProps} onModeChange={onModeChange} />)
      
      const soloCard = screen.getByRole('button', { name: /solo ai mode/i })
      fireEvent.keyDown(soloCard, { key: ' ' })
      
      expect(onModeChange).toHaveBeenCalledWith('solo')
    })
  })

  describe('Disabled State', () => {
    it('should disable all mode cards when disabled', () => {
      render(<CoPilotModeSelector {...defaultProps} disabled={true} />)
      
      const everyoneCard = screen.getByRole('button', { name: /everyone gets ai help/i })
      const soloCard = screen.getByRole('button', { name: /solo ai mode/i })
      
      expect(everyoneCard).toBeDisabled()
      expect(soloCard).toBeDisabled()
    })

    it('should not call onModeChange when disabled', () => {
      const onModeChange = vi.fn()
      render(<CoPilotModeSelector {...defaultProps} disabled={true} onModeChange={onModeChange} />)
      
      const soloCard = screen.getByRole('button', { name: /solo ai mode/i })
      fireEvent.click(soloCard)
      
      expect(onModeChange).not.toHaveBeenCalled()
    })

    it('should apply disabled styling', () => {
      render(<CoPilotModeSelector {...defaultProps} disabled={true} />)
      
      const everyoneCard = screen.getByRole('button', { name: /everyone gets ai help/i })
      expect(everyoneCard).toHaveClass('opacity-50')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<CoPilotModeSelector {...defaultProps} />)
      
      const everyoneCard = screen.getByRole('button', { name: /everyone gets ai help/i })
      const soloCard = screen.getByRole('button', { name: /solo ai mode/i })
      
      expect(everyoneCard).toHaveAttribute('aria-label')
      expect(soloCard).toHaveAttribute('aria-label')
    })

    it('should indicate selected state with aria-pressed', () => {
      render(<CoPilotModeSelector {...defaultProps} selectedMode="everyone" />)
      
      const everyoneCard = screen.getByRole('button', { name: /everyone gets ai help/i })
      const soloCard = screen.getByRole('button', { name: /solo ai mode/i })
      
      expect(everyoneCard).toHaveAttribute('aria-pressed', 'true')
      expect(soloCard).toHaveAttribute('aria-pressed', 'false')
    })

    it('should have proper heading structure', () => {
      render(<CoPilotModeSelector {...defaultProps} />)
      
      const heading = screen.getByRole('heading', { name: /choose co-pilot mode/i })
      expect(heading).toBeInTheDocument()
    })
  })

  describe('Visual Indicators', () => {
    it('should show robot icons for visual appeal', () => {
      render(<CoPilotModeSelector {...defaultProps} />)
      
      const robotIcons = screen.getAllByText('🤖')
      expect(robotIcons).toHaveLength(2) // One for each mode
    })

    it('should show checkmark for selected mode', () => {
      render(<CoPilotModeSelector {...defaultProps} selectedMode="everyone" />)
      
      const everyoneCard = screen.getByRole('button', { name: /everyone gets ai help/i })
      expect(everyoneCard).toHaveTextContent('✓')
    })

    it('should not show checkmark for unselected mode', () => {
      render(<CoPilotModeSelector {...defaultProps} selectedMode="everyone" />)
      
      const soloCard = screen.getByRole('button', { name: /solo ai mode/i })
      expect(soloCard).not.toHaveTextContent('✓')
    })
  })

  describe('Layout and Styling', () => {
    it('should arrange modes in a grid layout', () => {
      render(<CoPilotModeSelector {...defaultProps} />)
      
      const container = screen.getByRole('group', { name: /co-pilot mode selection/i })
      expect(container).toHaveClass('grid')
    })

    it('should use card-like styling for mode options', () => {
      render(<CoPilotModeSelector {...defaultProps} />)
      
      const everyoneCard = screen.getByRole('button', { name: /everyone gets ai help/i })
      expect(everyoneCard).toHaveClass('border-2', 'rounded-lg', 'p-6')
    })

    it('should apply hover effects', () => {
      render(<CoPilotModeSelector {...defaultProps} />)
      
      const everyoneCard = screen.getByRole('button', { name: /everyone gets ai help/i })
      expect(everyoneCard).toHaveClass('hover:shadow-md')
    })
  })
})