/**
 * Integration Test: Complete Solo Game Workflow
 * Tests the entire user journey from pattern selection through post-game analysis
 */

import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Import the main application components
import App from '../../App'
import { useGameStore } from '../../stores/useGameStore'
import { usePatternStore } from '../../stores/pattern-store'
import { useTileStore } from '../../stores/tile-store'
import { useCharlestonStore } from '../../stores/charleston-store'
import { useHistoryStore } from '../../stores/history-store'

// Mock test data
const mockSoloPatterns = [
  'CONSECUTIVE RUN-1',
  'LIKE NUMBERS-2'
]

const mockSoloHand = [
  { suit: 'bam', rank: '1' },
  { suit: 'bam', rank: '2' },
  { suit: 'bam', rank: '3' },
  { suit: 'bam', rank: '4' },
  { suit: 'crak', rank: '1' },
  { suit: 'crak', rank: '2' },
  { suit: 'crak', rank: '3' },
  { suit: 'crak', rank: '4' },
  { suit: 'dot', rank: '1' },
  { suit: 'dot', rank: '2' },
  { suit: 'dot', rank: '3' },
  { suit: 'flower', rank: 'flower' },
  { suit: 'flower', rank: 'flower' }
]

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('Solo Game Complete Workflow Integration', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    // Reset all stores to initial state
    useGameStore.getState().actions.resetGame()
    usePatternStore.getState().clearSelection()
    useTileStore.getState().clearHand()
    useCharlestonStore.getState().reset()
    useHistoryStore.getState().clearHistory()

    user = userEvent.setup()
  })

  it('should complete entire solo game flow from pattern selection to post-game', async () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    )

    // =====================================
    // PHASE 1: PATTERN SELECTION
    // =====================================
    
    // Should start on landing page
    expect(screen.getByText(/American Mahjong/i)).toBeInTheDocument()
    
    // Navigate to room setup
    const startButton = screen.getByText(/Start Game/i)
    await user.click(startButton)

    // Wait for room setup to load
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Room Setup/i })).toBeInTheDocument()
    })

    // Select Solo Co-Pilot Mode
    const soloModeButton = screen.getByText(/Solo Co-Pilot/i) || screen.getByLabelText(/solo/i)
    await user.click(soloModeButton)

    // Proceed to pattern selection
    const proceedButton = screen.getByText(/Continue/i) || screen.getByText(/Proceed/i)
    await user.click(proceedButton)

    // Wait for pattern selection to load
    await waitFor(() => {
      expect(screen.getByText(/Pattern Selection/i) || screen.getByText(/Choose Patterns/i)).toBeInTheDocument()
    })

    // Select multiple patterns for solo game
    for (const pattern of mockSoloPatterns) {
      const patternElement = screen.getByText(new RegExp(pattern, 'i')) || 
                            screen.getByTestId(`pattern-${pattern.toLowerCase().replace(/\s+/g, '-')}`)
      await user.click(patternElement)
    }

    // Verify pattern selection state
    await waitFor(() => {
      const selectedPatterns = usePatternStore.getState().getTargetPatterns()
      expect(selectedPatterns.length).toBeGreaterThan(0)
    })

    // Proceed to tile input
    const continueToTilesButton = screen.getByText(/Continue to Tile Input/i) || 
                                  screen.getByText(/Next/i)
    await user.click(continueToTilesButton)

    // =====================================
    // PHASE 2: TILE INPUT
    // =====================================

    await waitFor(() => {
      expect(screen.getByText(/Tile Input/i) || screen.getByText(/Enter Your Hand/i)).toBeInTheDocument()
    })

    // Use sample hand button for quick setup
    const sampleHandButton = screen.getByText(/Sample Hand/i) || screen.getByTestId('sample-hand-button')
    if (sampleHandButton) {
      await user.click(sampleHandButton)
    } else {
      // Manually enter tiles if sample button not available
      for (const tile of mockSoloHand) {
        const tileButton = screen.getByTestId(`tile-${tile.suit}-${tile.rank}`) ||
                          screen.getByLabelText(new RegExp(`${tile.suit}.*${tile.rank}`, 'i'))
        await user.click(tileButton)
      }
    }

    // Verify tile count
    await waitFor(() => {
      const tileCount = useTileStore.getState().handSize
      expect(tileCount).toBe(13)
    })

    // Proceed to Charleston
    const proceedToCharlestonButton = screen.getByText(/Continue to Charleston/i) ||
                                     screen.getByText(/Ready for Charleston/i)
    await user.click(proceedToCharlestonButton)

    // =====================================
    // PHASE 3: CHARLESTON
    // =====================================

    await waitFor(() => {
      expect(screen.getByText(/Charleston/i)).toBeInTheDocument()
    })

    // Complete 3 Charleston rounds
    for (let round = 1; round <= 3; round++) {
      // Wait for round to be active
      await waitFor(() => {
        expect(screen.getByText(new RegExp(`Round ${round}`, 'i')) || 
               screen.getByText(new RegExp(`Pass ${round}`, 'i'))).toBeInTheDocument()
      })

      // Select 3 tiles to pass
      const tileElements = screen.getAllByTestId(/^tile-.*/)
      for (let i = 0; i < 3 && i < tileElements.length; i++) {
        await user.click(tileElements[i])
      }

      // Confirm pass
      const passButton = screen.getByText(/Pass Tiles/i) || screen.getByText(/Send/i)
      await user.click(passButton)

      // For solo mode, also need to enter received tiles
      if (round < 3) {
        await waitFor(() => {
          expect(screen.getByText(/Enter received tiles/i) || 
                 screen.getByText(/Tiles you received/i)).toBeInTheDocument()
        })

        // Select 3 tiles as received (mock behavior)
        const receivableTiles = screen.getAllByTestId(/^receive-tile-.*/) ||
                                screen.getAllByTestId(/^tile-.*/)
        for (let i = 0; i < 3 && i < receivableTiles.length; i++) {
          await user.click(receivableTiles[i])
        }

        const confirmReceiveButton = screen.getByText(/Confirm Received/i) ||
                                    screen.getByText(/Continue/i)
        await user.click(confirmReceiveButton)
      }
    }

    // Verify Charleston completion
    await waitFor(() => {
      const charlestonState = useCharlestonStore.getState()
      expect(charlestonState.currentPhase).toBe('complete')
    })

    // Proceed to gameplay
    const proceedToGameplayButton = screen.getByText(/Start Game/i) ||
                                   screen.getByText(/Begin Gameplay/i)
    await user.click(proceedToGameplayButton)

    // =====================================
    // PHASE 4: GAMEPLAY
    // =====================================

    await waitFor(() => {
      expect(screen.getByText(/Game Mode/i) || screen.getByText(/Your Turn/i)).toBeInTheDocument()
    })

    // Simulate game actions
    for (let turn = 0; turn < 5; turn++) {
      // Draw tile (if available)
      const drawButton = screen.getByText(/Draw/i)
      if (drawButton && !(drawButton as HTMLButtonElement).disabled) {
        await user.click(drawButton)
      }

      await waitFor(() => {
        // Wait for turn processing
      }, { timeout: 1000 })

      // Discard a tile
      const tileElements = screen.getAllByTestId(/^hand-tile-.*/)
      if (tileElements.length > 0) {
        await user.click(tileElements[0])
        
        const discardButton = screen.getByText(/Discard/i)
        if (discardButton && !(discardButton as HTMLButtonElement).disabled) {
          await user.click(discardButton)
        }
      }

      await waitFor(() => {
        // Wait for discard processing
      }, { timeout: 1000 })
    }

    // End game manually for solo mode
    const gameEndButton = screen.getByText(/Other Player Won/i) ||
                         screen.getByText(/End Game/i)
    await user.click(gameEndButton)

    // =====================================
    // PHASE 5: POST-GAME ANALYSIS
    // =====================================

    await waitFor(() => {
      expect(screen.getByText(/Post-Game Analysis/i) || 
             screen.getByText(/Game Complete/i)).toBeInTheDocument()
    })

    // Verify post-game elements
    expect(screen.getByText(/Personal Performance/i) || 
           screen.getByText(/Your Performance/i)).toBeInTheDocument()
    
    expect(screen.getByText(/Learning Insights/i) ||
           screen.getByText(/Strategic Insights/i)).toBeInTheDocument()

    // Test export functionality
    const exportButton = screen.getByText(/Export/i)
    await user.click(exportButton)

    // Should not throw error
    await waitFor(() => {
      // Export should complete
    })

    // Test Play Again functionality
    const playAgainButton = screen.getByText(/Play Again/i)
    await user.click(playAgainButton)

    await waitFor(() => {
      // Should navigate back to setup with preserved settings
      expect(screen.getByText(/Room Setup/i) || 
             screen.getByText(/Pattern Selection/i)).toBeInTheDocument()
    })

    // =====================================
    // FINAL VERIFICATION
    // =====================================

    // Verify game was recorded in history
    const completedGames = useHistoryStore.getState().completedGames
    expect(completedGames.length).toBe(1)
    
    const completedGame = completedGames[0]
    expect(completedGame.coPilotMode).toBe('solo')
    expect(completedGame.selectedPatterns).toHaveLength(mockSoloPatterns.length)
    expect(completedGame.outcome).toBeDefined()
  }, { timeout: 30000 }) // 30 second timeout for full workflow

  it('should handle errors gracefully during solo workflow', async () => {
    // Mock a network error during pattern loading
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'))

    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    )

    // Should still render the app without crashing
    expect(screen.getByText(/American Mahjong/i)).toBeInTheDocument()

    // Error handling should be visible
    await waitFor(() => {
      expect(screen.getByText(/error/i) || screen.getByText(/try again/i)).toBeInTheDocument()
    })
  })

  it('should maintain state consistency throughout workflow', async () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    )

    // Navigate to room setup and select solo mode
    const startButton = screen.getByText(/Start Playing/i) || screen.getByText(/Get Started/i)
    await user.click(startButton)

    await waitFor(() => {
      expect(screen.getByText(/Room Setup/i) || screen.getByText(/Co-Pilot Mode/i)).toBeInTheDocument()
    })

    const soloModeButton = screen.getByText(/Solo Co-Pilot/i) || screen.getByLabelText(/solo/i)
    await user.click(soloModeButton)

    // Verify game store state
    const gameState = useGameStore.getState()
    expect(gameState.coPilotMode).toBe('solo')
    expect(gameState.gamePhase).toBeDefined()

    // State should be consistent across all stores
    expect(gameState.roomCode).toBeDefined()
    expect(gameState.currentPlayerId).toBeDefined()
  })
})
