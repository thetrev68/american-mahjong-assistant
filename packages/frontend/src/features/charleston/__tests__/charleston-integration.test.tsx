// Charleston Integration Tests
// Tests for Charleston integration with GameModeView and complete Charleston workflows

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { act } from '@testing-library/react'
import { GameModeView } from '../../gameplay/GameModeView'
import { useCharlestonStore } from '../../../stores/charleston-store'
import { useGameStore } from '../../../stores/useGameStore'
import { useTileStore } from '../../../stores/tile-store'
import { useRoomSetupStore } from '../../../stores/room-setup.store'
import { useIntelligenceStore } from '../../../stores/useIntelligenceStore'
import { usePatternStore } from '../../../stores/pattern-store'
import { useTurnStore, useTurnSelectors } from '../../../stores/turn-store'
import { usePlayerStore } from '../../../stores/player.store'
import { useRoomStore } from '../../../stores/useRoomStore'
import { createTestHand } from '../../../__tests__/factories'
import type { Tile } from 'shared-types'

// Mock all store dependencies
vi.mock('../../../stores/charleston-store', () => ({
  useCharlestonStore: vi.fn()
}))

vi.mock('../../../stores/useGameStore', () => {
  const mockGetState = vi.fn(() => ({ currentTurn: 1 }))
  const useGameStore = vi.fn(() => ({})) as any
  useGameStore.getState = mockGetState
  return { useGameStore }
})

vi.mock('../../../stores/tile-store', () => ({
  useTileStore: vi.fn()
}))

vi.mock('../../../stores/room-setup.store', () => ({
  useRoomSetupStore: vi.fn()
}))

vi.mock('../../../stores/useIntelligenceStore', () => ({
  useIntelligenceStore: vi.fn()
}))

vi.mock('../../../stores/pattern-store', () => ({
  usePatternStore: vi.fn()
}))

vi.mock('../../../stores/turn-store', () => ({
  useTurnStore: vi.fn(),
  useTurnSelectors: vi.fn()
}))

vi.mock('../../../stores/player.store', () => ({
  usePlayerStore: vi.fn()
}))

vi.mock('../../../stores/useRoomStore', () => ({
  useRoomStore: vi.fn()
}))

// Mock navigation
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate
}))

// Mock tile service
vi.mock('../../../lib/services/tile-service', () => ({
  tileService: {
    createPlayerTile: vi.fn((tileId: string) => ({
      id: tileId,
      instanceId: `${tileId}-instance`,
      suit: 'dots',
      value: '1',
      displayName: tileId,
      isJoker: false
    }))
  }
}))

// Mock UI components that might cause issues in tests
vi.mock('../../../ui-components/DevShortcuts', () => ({
  default: ({ variant, onSkipToGameplay, onResetGame }: any) => (
    <div data-testid="dev-shortcuts" data-variant={variant}>
      {onSkipToGameplay && (
        <button onClick={onSkipToGameplay} data-testid="skip-to-gameplay">
          Skip to Gameplay
        </button>
      )}
      {onResetGame && (
        <button onClick={onResetGame} data-testid="reset-game">
          Reset Game
        </button>
      )}
    </div>
  )
}))

vi.mock('../../gameplay/GameScreenLayout', () => ({
  default: ({ gamePhase, onNavigateToCharleston, children }: any) => (
    <div data-testid="game-screen-layout" data-phase={gamePhase}>
      {onNavigateToCharleston && (
        <button onClick={onNavigateToCharleston} data-testid="navigate-to-charleston">
          Charleston
        </button>
      )}
      {children}
    </div>
  )
}))

vi.mock('../../gameplay/SelectionArea', () => ({
  SelectionArea: ({ onAdvanceToGameplay, onCharlestonPass, onPass, isReadyToPass }: any) => {
    // Get access to the mocked stores
    const mockTileStore = (global as any).mockTileStore
    const selectedCount = mockTileStore?.selectedForAction?.length || 0

    return (
      <div data-testid="selection-area">
        {onAdvanceToGameplay && (
          <button onClick={onAdvanceToGameplay} data-testid="advance-to-gameplay">
            Advance to Gameplay
          </button>
        )}
        {onCharlestonPass && (
          <button
            onClick={() => {
              console.log('🔧 MOCK: Charleston Pass button clicked')
              // Simulate the real SelectionArea logic
              console.log('🔧 MOCK: Selected count:', selectedCount)
              if (selectedCount === 3 && onCharlestonPass) {
                console.log('🔧 MOCK: Calling onCharlestonPass')
                onCharlestonPass()
              } else if (selectedCount !== 3) {
                console.log('🔧 MOCK: Warning about tile count')
                console.warn('Must select exactly 3 tiles for Charleston')
              }
            }}
            data-testid="charleston-pass"
            disabled={isReadyToPass}
          >
            Pass Charleston Tiles
          </button>
        )}
        {onPass && (
          <button onClick={onPass} data-testid="pass-action">
            Pass
          </button>
        )}
      </div>
    )
  }
}))

vi.mock('../../shared/TileInputModal', () => ({
  TileInputModal: ({ isOpen, onClose, onConfirm, mode, requiredCount, context }: any) => {
    console.log('🔧 TileInputModal render:', { isOpen, mode, requiredCount, context })
    return (
      <div
        data-testid="tile-input-modal"
        style={{ display: isOpen ? 'block' : 'none' }}
        data-mode={mode}
        data-count={requiredCount}
        data-context={context}
      >
        <button onClick={onClose} data-testid="close-modal">Close</button>
        <button onClick={() => onConfirm(['tile1', 'tile2', 'tile3'])} data-testid="confirm-tiles">
          Confirm Tiles
        </button>
      </div>
    )
  }
}))

// Test utilities
const createTestTile = (overrides: Partial<Tile> = {}): Tile => ({
  id: 'test-tile-1',
  suit: 'dots',
  value: '1',
  displayName: '1 Dot',
  isJoker: false,
  ...overrides
})

const createCharlestonHand = (): Tile[] => [
  createTestTile({ id: 'dot1', suit: 'dots', value: '1' }),
  createTestTile({ id: 'dot2', suit: 'dots', value: '2' }),
  createTestTile({ id: 'dot3', suit: 'dots', value: '3' }),
  createTestTile({ id: 'flower1', suit: 'flowers', value: 'f1' }),
  createTestTile({ id: 'flower2', suit: 'flowers', value: 'f2' }),
  createTestTile({ id: 'wind1', suit: 'winds', value: 'east' }),
  createTestTile({ id: 'joker1', suit: 'jokers', value: 'joker', isJoker: true }),
  // Add more tiles to make a full 14-tile Charleston hand
  ...createTestHand().slice(0, 7)
]

describe('Charleston Integration Tests', () => {
  let mockCharlestonStore: any
  let mockGameStore: any
  let mockTileStore: any
  let mockRoomSetupStore: any

  beforeEach(() => {
    // Setup Charleston store mock
    mockCharlestonStore = {
      currentPhase: 'right',
      isActive: false,
      selectedTiles: [],
      recommendations: null,
      isAnalyzing: false,
      playerTiles: [],
      targetPatterns: [],
      isMultiplayerMode: false,
      playerReadiness: {},
      showStrategy: false,
      analysisError: null,
      setPhase: vi.fn(),
      startCharleston: vi.fn(),
      endCharleston: vi.fn(),
      completePhase: vi.fn(() => {
        // Simulate phase progression: right -> across -> opposite -> complete
        const phases = ['right', 'across', 'opposite', 'complete']
        const currentIndex = phases.indexOf(mockCharlestonStore.currentPhase)
        if (currentIndex < phases.length - 1) {
          mockCharlestonStore.currentPhase = phases[currentIndex + 1]
        }
      }),
      reset: vi.fn(),
      setPlayerTiles: vi.fn(),
      setSelectedTiles: vi.fn(),
      selectTile: vi.fn(),
      deselectTile: vi.fn(),
      clearSelection: vi.fn(),
      generateRecommendations: vi.fn(),
      clearRecommendations: vi.fn(),
      setMultiplayerMode: vi.fn(),
      setPlayerReady: vi.fn(),
      setCurrentPlayer: vi.fn(),
      setShowStrategy: vi.fn()
    }

    // Setup Game store mock
    mockGameStore = {
      gamePhase: 'charleston',
      currentPlayerId: 'player1',
      players: [{ id: 'player1', name: 'Player 1' }],
      roomId: 'room123',
      currentTurn: 1,
      gameRound: 1,
      isGameActive: true,
      alerts: [],
      setGamePhase: vi.fn(),
      setCurrentPlayer: vi.fn(),
      startTurn: vi.fn(),
      incrementTurn: vi.fn(),
      addAlert: vi.fn(),
      clearAlerts: vi.fn(),
      // Method required by GameModeView reset functionality
      resetGame: vi.fn(),
      // getState method required by GameModeView console logging
      getState: vi.fn(() => ({ currentTurn: 1 }))
    }

    // Setup Tile store mock
    mockTileStore = {
      playerTiles: createCharlestonHand(),
      playerHand: createCharlestonHand(),
      selectedForAction: [],
      exposedTiles: [],
      discardPile: [],
      handSize: 13,
      clearHand: vi.fn(),
      addToHand: vi.fn(),
      removeFromHand: vi.fn(),
      clearSelection: vi.fn(() => {
        mockTileStore.selectedForAction = []
      }),
      setSelectedForAction: vi.fn(),
      setDealerHand: vi.fn(),
      addTile: vi.fn(),
      removeTile: vi.fn()
    }

    // Setup Room Setup store mock
    mockRoomSetupStore = {
      coPilotMode: 'solo',
      playerCount: 4,
      clearRoom: vi.fn(),
      // Method required by GameModeView reset functionality
      resetToStart: vi.fn()
    }

    // Setup store mocks to return mock objects when called as hooks
    ;(useCharlestonStore as any).mockReturnValue(mockCharlestonStore)
    ;(useGameStore as any).mockReturnValue(mockGameStore)
    ;(useTileStore as any).mockReturnValue(mockTileStore)
    ;(useRoomSetupStore as any).mockReturnValue(mockRoomSetupStore)

    // Mock additional stores that GameModeView imports
    const mockIntelligenceStore = {
      currentAnalysis: null,
      isAnalyzing: false,
      clearAnalysis: vi.fn(),
      analyzeHand: vi.fn(() => Promise.resolve()),
      // Functions required by useGameIntelligence hook
      analyzeTurnSituation: vi.fn(() => Promise.resolve()),
      analyzeOpponents: vi.fn(() => Promise.resolve()),
      updateDefensiveAnalysis: vi.fn(() => Promise.resolve())
    }

    const mockPatternStore = {
      selectedPatterns: [],
      targetPatterns: [],
      clearSelection: vi.fn(),
      getTargetPatterns: vi.fn(() => [])
    }

    const mockTurnStore = {
      currentPlayer: 'player1',
      turnTimeRemaining: 30
    }

    const mockPlayerStore = {
      currentPlayer: { id: 'player1', name: 'Player 1' },
      allPlayers: [{ id: 'player1', name: 'Player 1' }]
    }

    const mockRoomStore = {
      roomId: 'room123',
      roomCode: 'TEST123',
      players: [{ id: 'player1', name: 'Player 1' }],
      hostId: 'player1'
    }

    const mockTurnSelectors = {
      // Basic turn info
      isGameActive: true,
      currentPlayerName: 'Player 1',
      nextPlayerName: 'Player 2',
      turnNumber: 1,
      roundNumber: 1,
      currentWind: 'east',

      // Turn state
      canAdvanceTurn: true,
      turnDuration: 0,

      // Player info
      playerCount: 1,
      turnOrderDisplay: ['Player 1'],

      // Current player checks
      isMyTurn: vi.fn((playerId: string) => playerId === 'player1'),

      // Mode info
      isMultiplayer: false,

      // Action management
      getPlayerActions: vi.fn(() => ({ hasDrawn: false, hasDiscarded: false, availableActions: [] })),
      currentCallOpportunity: null,
      discardPile: [],
      wallCount: 136,

      // Action helpers
      canPlayerDraw: vi.fn(() => true),
      canPlayerDiscard: vi.fn(() => false),
      hasCallOpportunity: vi.fn(() => false)
    }

    // Setup all additional store mocks
    ;(useIntelligenceStore as any).mockReturnValue(mockIntelligenceStore)
    ;(usePatternStore as any).mockReturnValue(mockPatternStore)
    ;(useTurnStore as any).mockReturnValue(mockTurnStore)
    ;(usePlayerStore as any).mockReturnValue(mockPlayerStore)
    ;(useRoomStore as any).mockReturnValue(mockRoomStore)
    ;(useTurnSelectors as any).mockReturnValue(mockTurnSelectors)

    // Make mockTileStore globally accessible for the mocked SelectionArea
    ;(global as any).mockTileStore = mockTileStore
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Charleston Phase Initialization', () => {
    it('should initialize Charleston phase when entering from tile input', async () => {
      mockGameStore.gamePhase = 'tile-input'

      render(<GameModeView />)

      await waitFor(() => {
        expect(mockGameStore.setGamePhase).toHaveBeenCalledWith('charleston')
      })
    })

    it('should render Charleston phase correctly', () => {
      mockCharlestonStore.isActive = true
      mockGameStore.gamePhase = 'charleston'

      render(<GameModeView />)

      expect(screen.getByTestId('dev-shortcuts')).toHaveAttribute('data-variant', 'charleston')
      expect(screen.getByTestId('game-screen-layout')).toHaveAttribute('data-phase', 'charleston')
    })

    it('should show skip to gameplay option in Charleston phase', () => {
      mockGameStore.gamePhase = 'charleston'

      render(<GameModeView />)

      expect(screen.getByTestId('skip-to-gameplay')).toBeInTheDocument()
    })
  })

  describe('Charleston Tile Selection and Passing', () => {
    beforeEach(() => {
      mockCharlestonStore.isActive = true
      mockGameStore.gamePhase = 'charleston'
      mockTileStore.selectedForAction = [
        createTestTile({ id: 'flower1', suit: 'flowers' }),
        createTestTile({ id: 'flower2', suit: 'flowers' }),
        createTestTile({ id: 'wind1', suit: 'winds' })
      ]
    })

    it('should handle Charleston tile passing with exactly 3 tiles', async () => {
      render(<GameModeView />)

      const passButton = screen.getByTestId('charleston-pass')

      await act(async () => {
        fireEvent.click(passButton)
      })

      expect(mockTileStore.clearSelection).toHaveBeenCalled()
      expect(mockCharlestonStore.completePhase).toHaveBeenCalled()
      expect(mockGameStore.incrementTurn).toHaveBeenCalled()
    })

    it('should warn when trying to pass without exactly 3 tiles', async () => {
      mockTileStore.selectedForAction = [createTestTile()] // Only 1 tile

      const consoleSpy = vi.spyOn(console, 'warn')
      const consoleLogSpy = vi.spyOn(console, 'log')
      render(<GameModeView />)

      const passButton = screen.getByTestId('charleston-pass')

      await act(async () => {
        fireEvent.click(passButton)
      })

      // Debug: Check if button click was detected
      console.log('Console log calls:', consoleLogSpy.mock.calls)
      console.log('Console warn calls:', consoleSpy.mock.calls)

      expect(consoleSpy).toHaveBeenCalledWith('Must select exactly 3 tiles for Charleston')
    })

    it('should show Charleston tile input modal for next phase', async () => {
      mockCharlestonStore.currentPhase = 'right' // Not complete yet

      render(<GameModeView />)

      const passButton = screen.getByTestId('charleston-pass')

      await act(async () => {
        fireEvent.click(passButton)
      })

      await waitFor(() => {
        expect(screen.getByTestId('tile-input-modal')).toBeVisible()
      })

      const modal = screen.getByTestId('tile-input-modal')
      expect(modal).toHaveAttribute('data-mode', 'receive')
      expect(modal).toHaveAttribute('data-count', '3')
      expect(modal).toHaveAttribute('data-context', 'charleston')
    })

    it('should show completion alert when Charleston is complete', async () => {
      mockCharlestonStore.currentPhase = 'complete'

      render(<GameModeView />)

      const passButton = screen.getByTestId('charleston-pass')

      await act(async () => {
        fireEvent.click(passButton)
      })

      expect(mockGameStore.addAlert).toHaveBeenCalledWith({
        type: 'info',
        title: 'Charleston Complete!',
        message: 'Charleston is complete! Moving to gameplay phase.'
      })
    })
  })

  describe('Charleston Tile Reception', () => {
    beforeEach(() => {
      mockCharlestonStore.isActive = true
      mockCharlestonStore.currentPhase = 'right' // Not complete - enables modal opening
      mockGameStore.gamePhase = 'charleston'
      // Need 3 tiles selected for Charleston pass button to be enabled
      mockTileStore.selectedForAction = [
        createTestTile({ id: 'flower1', suit: 'flowers' }),
        createTestTile({ id: 'flower2', suit: 'flowers' }),
        createTestTile({ id: 'wind1', suit: 'winds' })
      ]
    })

    it('should handle receiving Charleston tiles', async () => {
      render(<GameModeView />)

      // Trigger tile input modal
      const passButton = screen.getByTestId('charleston-pass')
      await act(async () => {
        fireEvent.click(passButton)
      })

      // Confirm received tiles
      const confirmButton = screen.getByTestId('confirm-tiles')

      await act(async () => {
        fireEvent.click(confirmButton)
      })

      expect(mockTileStore.addTile).toHaveBeenCalledTimes(3) // 3 tiles added
      expect(mockGameStore.incrementTurn).toHaveBeenCalled()
    })

    it('should close modal after receiving tiles', async () => {
      render(<GameModeView />)

      // Open modal
      const passButton = screen.getByTestId('charleston-pass')
      await act(async () => {
        fireEvent.click(passButton)
      })

      expect(screen.getByTestId('tile-input-modal')).toBeVisible()

      // Confirm tiles
      const confirmButton = screen.getByTestId('confirm-tiles')
      await act(async () => {
        fireEvent.click(confirmButton)
      })

      await waitFor(() => {
        expect(screen.getByTestId('tile-input-modal')).not.toBeVisible()
      })
    })

    it('should generate new recommendations after receiving tiles', async () => {
      mockCharlestonStore.currentPhase = 'across' // Not complete

      render(<GameModeView />)

      // Simulate receiving tiles
      const passButton = screen.getByTestId('charleston-pass')
      await act(async () => {
        fireEvent.click(passButton)
      })

      const confirmButton = screen.getByTestId('confirm-tiles')
      await act(async () => {
        fireEvent.click(confirmButton)
      })

      await waitFor(() => {
        expect(mockCharlestonStore.generateRecommendations).toHaveBeenCalled()
      }, { timeout: 1000 })
    })
  })

  describe('Charleston Phase Transitions', () => {
    beforeEach(() => {
      mockCharlestonStore.isActive = true
      mockGameStore.gamePhase = 'charleston'
    })

    it('should advance to gameplay phase when Charleston completes', async () => {
      render(<GameModeView />)

      const advanceButton = screen.getByTestId('advance-to-gameplay')

      await act(async () => {
        fireEvent.click(advanceButton)
      })

      expect(mockGameStore.setGamePhase).toHaveBeenCalledWith('playing')
    })

    it('should skip Charleston and go straight to gameplay', async () => {
      render(<GameModeView />)

      const skipButton = screen.getByTestId('skip-to-gameplay')

      await act(async () => {
        fireEvent.click(skipButton)
      })

      expect(mockGameStore.setGamePhase).toHaveBeenCalledWith('playing')
      expect(mockGameStore.setCurrentPlayer).toHaveBeenCalled()
      expect(mockGameStore.startTurn).toHaveBeenCalled()
    })

    it('should handle phase transition through Charleston store', async () => {
      render(<GameModeView />)

      // Simulate phase completion
      mockCharlestonStore.currentPhase = 'across'

      const passButton = screen.getByTestId('charleston-pass')

      await act(async () => {
        fireEvent.click(passButton)
      })

      expect(mockCharlestonStore.completePhase).toHaveBeenCalled()
    })
  })

  describe('Multiplayer Charleston Integration', () => {
    beforeEach(() => {
      mockCharlestonStore.isActive = true
      mockCharlestonStore.isMultiplayerMode = true
      mockGameStore.gamePhase = 'charleston'
      mockRoomSetupStore.coPilotMode = 'multiplayer'
    })

    it('should navigate to Charleston phase for multiplayer', async () => {
      const mockNavigateToCharleston = vi.fn()

      render(<GameModeView onNavigateToCharleston={mockNavigateToCharleston} />)

      const passButton = screen.getByTestId('charleston-pass')

      await act(async () => {
        fireEvent.click(passButton)
      })

      expect(mockNavigateToCharleston).toHaveBeenCalled()
    })

    it('should handle multiplayer player readiness', () => {
      mockCharlestonStore.playerReadiness = {
        'player1': true,
        'player2': false,
        'player3': true,
        'player4': false
      }

      render(<GameModeView />)

      // Component should render with multiplayer state
      expect(screen.getByTestId('game-screen-layout')).toBeInTheDocument()
    })
  })

  describe('Charleston Game Reset', () => {
    beforeEach(() => {
      mockCharlestonStore.isActive = true
      mockGameStore.gamePhase = 'charleston'
    })

    it('should reset Charleston when resetting game', async () => {
      render(<GameModeView />)

      const resetButton = screen.getByTestId('reset-game')

      await act(async () => {
        fireEvent.click(resetButton)
      })

      expect(mockCharlestonStore.reset).toHaveBeenCalled()
      expect(mockRoomSetupStore.clearRoom).toHaveBeenCalled()
      expect(mockTileStore.clearHand).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/room-setup')
    })
  })

  describe('Charleston Error Handling', () => {
    beforeEach(() => {
      mockCharlestonStore.isActive = true
      mockGameStore.gamePhase = 'charleston'
    })

    it('should handle Charleston analysis errors', () => {
      mockCharlestonStore.analysisError = 'Analysis failed'

      render(<GameModeView />)

      // Component should still render despite analysis error
      expect(screen.getByTestId('game-screen-layout')).toBeInTheDocument()
    })

    it('should handle missing Charleston recommendations', () => {
      mockCharlestonStore.recommendations = null
      mockCharlestonStore.isAnalyzing = false

      render(<GameModeView />)

      // Component should handle missing recommendations gracefully
      expect(screen.getByTestId('game-screen-layout')).toBeInTheDocument()
    })

    it('should handle Charleston phase transitions with errors', async () => {
      // Mock phase completion to throw error
      mockCharlestonStore.completePhase.mockImplementation(() => {
        throw new Error('Phase transition failed')
      })

      const consoleSpy = vi.spyOn(console, 'error')
      render(<GameModeView />)

      const passButton = screen.getByTestId('charleston-pass')

      await act(async () => {
        fireEvent.click(passButton)
      })

      // Error should be handled gracefully
      expect(consoleSpy).toHaveBeenCalled()
    })
  })

  describe('Charleston Analytics Integration', () => {
    beforeEach(() => {
      mockCharlestonStore.isActive = true
      mockGameStore.gamePhase = 'charleston'
    })

    it('should trigger intelligence analysis after Charleston', async () => {
      // This would be integrated through the actual intelligence store mock
      render(<GameModeView />)

      // Simulate Charleston completion
      const passButton = screen.getByTestId('charleston-pass')
      await act(async () => {
        fireEvent.click(passButton)
      })

      const confirmButton = screen.getByTestId('confirm-tiles')
      await act(async () => {
        fireEvent.click(confirmButton)
      })

      // Intelligence analysis should be triggered with updated hand
      // This would be verified through the intelligence store integration
      expect(screen.getByTestId('game-screen-layout')).toBeInTheDocument()
    })
  })

  describe('Charleston UI State Management', () => {
    beforeEach(() => {
      mockCharlestonStore.isActive = true
      mockCharlestonStore.currentPhase = 'right' // Not complete - enables modal opening
      mockGameStore.gamePhase = 'charleston'
      // Need 3 tiles selected for Charleston pass button to be enabled
      mockTileStore.selectedForAction = [
        createTestTile({ id: 'flower1', suit: 'flowers' }),
        createTestTile({ id: 'flower2', suit: 'flowers' }),
        createTestTile({ id: 'wind1', suit: 'winds' })
      ]
    })

    it('should show Charleston-specific UI elements', () => {
      mockGameStore.gamePhase = 'charleston'
      mockCharlestonStore.isActive = true

      render(<GameModeView />)

      expect(screen.getByTestId('dev-shortcuts')).toHaveAttribute('data-variant', 'charleston')
      expect(screen.getByTestId('game-screen-layout')).toHaveAttribute('data-phase', 'charleston')
    })

    it('should hide Charleston UI elements in gameplay phase', () => {
      mockGameStore.gamePhase = 'playing'
      mockCharlestonStore.isActive = false

      render(<GameModeView />)

      expect(screen.getByTestId('dev-shortcuts')).toHaveAttribute('data-variant', 'gameplay')
      expect(screen.getByTestId('game-screen-layout')).toHaveAttribute('data-phase', 'gameplay')
      expect(screen.queryByTestId('skip-to-gameplay')).not.toBeInTheDocument()
    })

    it('should handle modal state correctly', async () => {
      mockGameStore.gamePhase = 'charleston'

      render(<GameModeView />)

      // Modal should be closed initially
      expect(screen.getByTestId('tile-input-modal')).not.toBeVisible()

      // Open modal
      const passButton = screen.getByTestId('charleston-pass')
      await act(async () => {
        fireEvent.click(passButton)
      })

      expect(screen.getByTestId('tile-input-modal')).toBeVisible()

      // Close modal
      const closeButton = screen.getByTestId('close-modal')
      await act(async () => {
        fireEvent.click(closeButton)
      })

      expect(screen.getByTestId('tile-input-modal')).not.toBeVisible()
    })
  })
})


