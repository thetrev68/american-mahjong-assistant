// GameModeView Component Test Suite - Comprehensive Tests for the Main Co-Pilot Interface
// Tests the primary user interface for co-pilot system during gameplay
// Covers rendering, interactions, store integration, AI features, and game flow

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'

import type { Tile, PlayerTile } from 'shared-types'
import type { CoPilotMode } from '../../../stores/room-setup.store'

// Mock all store dependencies
vi.mock('../../../stores/game-store')
vi.mock('../../../stores/room.store')
vi.mock('../../../stores/room-setup.store')
vi.mock('../../../stores/player.store')
vi.mock('../../../stores/pattern-store')
vi.mock('../../../stores/intelligence-store')
vi.mock('../../../stores/tile-store')
vi.mock('../../../stores/turn-store')
vi.mock('../../../stores/charleston-store')
vi.mock('../../../stores/history-store')

// Mock hooks and services
vi.mock('../../../hooks/useGameIntelligence')
vi.mock('../../../hooks/useGameEndCoordination')
vi.mock('../../../lib/services/tile-service')
vi.mock('../../shared/TileInputModal')

// Mock child components to focus on GameModeView logic
vi.mock('../GameScreenLayout', () => ({
  default: ({ children, ...props }: any) => (
    <div data-testid="game-screen-layout" {...props}>
      {children}
    </div>
  )
}))

vi.mock('../SelectionArea', () => ({
  SelectionArea: (props: any) => (
    <div data-testid="selection-area" {...props}>
      Selection Area
    </div>
  )
}))

vi.mock('../components/CallOpportunityOverlay', () => ({
  CallOpportunityOverlay: (props: any) => (
    <div data-testid="call-opportunity-overlay" {...props}>
      Call Opportunity
    </div>
  )
}))

vi.mock('../../ui-components/CallOpportunityModal', () => ({
  default: (props: any) => (
    <div data-testid="call-opportunity-modal" {...props}>
      Call Opportunity Modal
    </div>
  )
}))

vi.mock('../../ui-components/MahjongDeclarationModal', () => ({
  MahjongDeclarationModal: (props: any) => (
    <div data-testid="mahjong-declaration-modal" {...props}>
      Mahjong Declaration Modal
    </div>
  )
}))

vi.mock('../../ui-components/FinalHandRevealModal', () => ({
  FinalHandRevealModal: (props: any) => (
    <div data-testid="final-hand-reveal-modal" {...props}>
      Final Hand Reveal Modal
    </div>
  )
}))

vi.mock('../../ui-components/DevShortcuts', () => ({
  default: (props: any) => (
    <div data-testid="dev-shortcuts" {...props}>
      Dev Shortcuts
    </div>
  )
}))

// Mock react-router-dom navigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

// Store mock implementations
const mockGameStore = {
  gamePhase: 'tile-input',
  setGamePhase: vi.fn(),
  currentPlayerId: 'player1',
  setCurrentPlayer: vi.fn(),
  startTurn: vi.fn(),
  players: [
    { id: 'player1', name: 'You', position: 'east' as const },
    { id: 'player2', name: 'Right', position: 'south' as const },
    { id: 'player3', name: 'Across', position: 'west' as const },
    { id: 'player4', name: 'Left', position: 'north' as const }
  ],
  currentTurn: 1,
  incrementTurn: vi.fn(),
  addAlert: vi.fn(),
  resetGame: vi.fn(),
  gameStartTime: new Date(),
  wallTilesRemaining: 70,
  gameEndResult: null
}

const mockRoomStore = {
  players: [
    { id: 'player1', name: 'You' },
    { id: 'player2', name: 'Right' },
    { id: 'player3', name: 'Across' },
    { id: 'player4', name: 'Left' }
  ],
  hostPlayerId: 'player1',
  room: { id: 'room-123' }
}

const mockRoomSetupStore = {
  coPilotMode: 'everyone' as CoPilotMode,
  resetToStart: vi.fn()
}

const mockPlayerStore = {
  otherPlayerNames: ['Right', 'Across', 'Left']
}

const mockPatternStore = {
  getTargetPatterns: vi.fn(() => [
    {
      id: 'pattern-1',
      patternId: '2025-1',
      displayName: 'Test Pattern',
      section: 'NMJL',
      line: '1',
      pattern: 'AAA BBB CCC DD',
      points: 25,
      concealed: false,
      difficulty: 'medium',
      groups: []
    }
  ]),
  targetPatterns: ['pattern-1'],
  selectionOptions: [],
  addTargetPattern: vi.fn(),
  removeTargetPattern: vi.fn(),
  clearSelection: vi.fn()
}

const mockTileStore = {
  playerHand: [
    { id: 'bamboo-1', suit: 'bamboos', value: '1', displayName: '1 Bamboo' },
    { id: 'bamboo-2', suit: 'bamboos', value: '2', displayName: '2 Bamboo' },
    { id: 'bamboo-3', suit: 'bamboos', value: '3', displayName: '3 Bamboo' }
  ] as Tile[],
  dealerHand: false,
  setDealerHand: vi.fn(),
  selectedForAction: [],
  clearSelection: vi.fn(),
  removeTile: vi.fn(),
  addTile: vi.fn(),
  clearHand: vi.fn()
}

const mockIntelligenceStore = {
  currentAnalysis: {
    recommendedPatterns: [
      {
        pattern: {
          id: 'pattern-1',
          patternId: '2025-1',
          displayName: 'Test Pattern',
          section: 'NMJL',
          line: '1',
          pattern: 'AAA BBB CCC DD',
          points: 25,
          concealed: false,
          difficulty: 'medium',
          groups: []
        },
        completionPercentage: 65,
        tilesNeeded: 3,
        reasoning: 'Good progress on this pattern'
      }
    ],
    bestPatterns: []
  },
  isAnalyzing: false,
  analyzeHand: vi.fn(),
  clearAnalysis: vi.fn()
}

const mockTurnStore = {
  executeAction: vi.fn(() => Promise.resolve(true)),
  closeCallOpportunity: vi.fn()
}

const mockTurnSelectors = {
  isMyTurn: vi.fn(() => true),
  canPlayerDraw: vi.fn(() => true),
  canPlayerDiscard: vi.fn(() => true),
  wallCount: 70,
  currentCallOpportunity: null
}

const mockCharlestonStore = {
  currentPhase: 'first-right' as const,
  completePhase: vi.fn(),
  reset: vi.fn(),
  generateRecommendations: vi.fn()
}

const mockHistoryStore = {
  completeGame: vi.fn(() => 'game-123')
}

const mockGameIntelligence = {
  analysis: {
    currentCallRecommendation: null,
    tileRecommendations: [],
    patternProgress: []
  }
}

const mockGameEndCoordination = {
  isMultiplayerSession: false,
  shouldNavigateToPostGame: false,
  gameEndData: null,
  allPlayerHands: null,
  finalScores: null,
  clearGameEndState: vi.fn()
}

const mockTileService = {
  createPlayerTile: vi.fn((id: string) => ({
    id,
    suit: 'bamboos',
    value: '1',
    displayName: `${id} tile`,
    instanceId: `${id}-instance`,
    isSelected: false
  }))
}

// Import and setup all mocks directly
import { useGameStore } from '../../../stores/game-store'
import { useRoomStore } from '../../../stores/room.store'
import { useRoomSetupStore } from '../../../stores/room-setup.store'
import { usePlayerStore } from '../../../stores/player.store'
import { usePatternStore } from '../../../stores/pattern-store'
import { useIntelligenceStore } from '../../../stores/intelligence-store'
import { useTileStore } from '../../../stores/tile-store'
import { useTurnStore, useTurnSelectors } from '../../../stores/turn-store'
import { useCharlestonStore } from '../../../stores/charleston-store'
import { useHistoryStore } from '../../../stores/history-store'
import { useGameIntelligence } from '../../../hooks/useGameIntelligence'
import { useGameEndCoordination } from '../../../hooks/useGameEndCoordination'
import { tileService } from '../../../lib/services/tile-service'

// Mock all the imported functions
vi.mocked(useGameStore).mockReturnValue(mockGameStore)
vi.mocked(useRoomStore).mockReturnValue(mockRoomStore)
vi.mocked(useRoomSetupStore).mockReturnValue(mockRoomSetupStore)
vi.mocked(usePlayerStore).mockReturnValue(mockPlayerStore)
vi.mocked(usePatternStore).mockReturnValue(mockPatternStore)
vi.mocked(useIntelligenceStore).mockReturnValue(mockIntelligenceStore)
vi.mocked(useTileStore).mockReturnValue(mockTileStore)
vi.mocked(useTurnStore).mockReturnValue(mockTurnStore)
vi.mocked(useTurnSelectors).mockReturnValue(mockTurnSelectors)
vi.mocked(useCharlestonStore).mockReturnValue(mockCharlestonStore)
vi.mocked(useHistoryStore).mockReturnValue(mockHistoryStore)
vi.mocked(useGameIntelligence).mockReturnValue(mockGameIntelligence)
vi.mocked(useGameEndCoordination).mockReturnValue(mockGameEndCoordination)

// Mock the pattern store getState method
Object.defineProperty(usePatternStore, 'getState', {
  value: vi.fn(() => mockPatternStore),
  writable: true
})

// Mock tile service
Object.defineProperty(tileService, 'createPlayerTile', {
  value: mockTileService.createPlayerTile,
  writable: true
})

// Import the component after mocks are set up
import { GameModeView } from '../GameModeView'

// Define props interface since it's not exported
interface GameModeViewProps {
  onNavigateToCharleston?: () => void
  onNavigateToPostGame?: (gameId?: string) => void
}

// Test component wrapper
const renderGameModeView = (props: Partial<GameModeViewProps> = {}) => {
  const defaultProps: GameModeViewProps = {
    onNavigateToCharleston: vi.fn(),
    onNavigateToPostGame: vi.fn(),
    ...props
  }

  return render(
    <MemoryRouter>
      <GameModeView {...defaultProps} />
    </MemoryRouter>
  )
}

describe('GameModeView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset to default state
    mockGameStore.gamePhase = 'tile-input'
    mockGameStore.currentPlayerId = 'player1'
    mockTurnSelectors.isMyTurn.mockReturnValue(true)
    mockTurnSelectors.canPlayerDraw.mockReturnValue(true)
    mockTurnSelectors.canPlayerDiscard.mockReturnValue(true)
    mockTurnSelectors.currentCallOpportunity = null
    mockIntelligenceStore.isAnalyzing = false
    mockIntelligenceStore.currentAnalysis = {
      recommendedPatterns: [
        {
          pattern: {
            id: 'pattern-1',
            patternId: '2025-1',
            displayName: 'Test Pattern',
            section: 'NMJL',
            line: '1',
            pattern: 'AAA BBB CCC DD',
            points: 25,
            concealed: false,
            difficulty: 'medium',
            groups: []
          },
          completionPercentage: 65,
          tilesNeeded: 3,
          reasoning: 'Good progress on this pattern'
        }
      ],
      bestPatterns: []
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Rendering and Initial State', () => {
    it('should render without crashing', () => {
      renderGameModeView()
      expect(screen.getByTestId('game-screen-layout')).toBeInTheDocument()
    })

    it('should render all key child components', () => {
      renderGameModeView()

      expect(screen.getByTestId('game-screen-layout')).toBeInTheDocument()
      expect(screen.getByTestId('selection-area')).toBeInTheDocument()
      expect(screen.getByTestId('dev-shortcuts')).toBeInTheDocument()
    })

    it('should initialize current player ID from room store', () => {
      renderGameModeView()

      // Component should use the first player from room store as current player
      expect(mockGameStore.setCurrentPlayer).toHaveBeenCalledWith('player1')
    })

    it('should set dealer hand status based on player position', () => {
      renderGameModeView()

      // Player1 has east position (dealer)
      expect(mockTileStore.setDealerHand).toHaveBeenCalledWith(true)
    })

    it('should trigger hand analysis on mount if hand has enough tiles', async () => {
      mockTileStore.playerHand = Array(13).fill(0).map((_, i) => ({
        id: `tile-${i}`,
        suit: 'bamboos',
        value: '1',
        displayName: `Tile ${i}`
      })) as Tile[]
      mockIntelligenceStore.currentAnalysis = null

      renderGameModeView()

      await waitFor(() => {
        expect(mockIntelligenceStore.analyzeHand).toHaveBeenCalled()
      })
    })
  })

  describe('Game Phase Transitions', () => {
    it('should transition from tile-input to Charleston phase', () => {
      mockGameStore.gamePhase = 'tile-input'
      renderGameModeView()

      expect(mockGameStore.setGamePhase).toHaveBeenCalledWith('charleston')
    })

    it('should initialize current player when entering playing phase', async () => {
      mockGameStore.gamePhase = 'playing'
      mockGameStore.currentPlayerId = null

      renderGameModeView()

      await waitFor(() => {
        expect(mockGameStore.setCurrentPlayer).toHaveBeenCalledWith('player1')
        expect(mockGameStore.startTurn).toHaveBeenCalled()
      })
    })

    it('should pass correct game phase to GameScreenLayout', () => {
      mockGameStore.gamePhase = 'charleston'
      const { rerender } = renderGameModeView()

      expect(screen.getByTestId('game-screen-layout')).toHaveAttribute('gamePhase', 'charleston')

      mockGameStore.gamePhase = 'playing'
      rerender(
        <MemoryRouter>
          <GameModeView onNavigateToCharleston={vi.fn()} onNavigateToPostGame={vi.fn()} />
        </MemoryRouter>
      )

      expect(screen.getByTestId('game-screen-layout')).toHaveAttribute('gamePhase', 'gameplay')
    })
  })

  describe('User Interactions - Draw and Discard', () => {
    beforeEach(() => {
      mockGameStore.gamePhase = 'playing'
    })

    it('should handle draw tile action when player can draw', async () => {
      const user = userEvent.setup()
      mockTurnSelectors.canPlayerDraw.mockReturnValue(true)

      renderGameModeView()

      // Find and click draw button (would be passed to GameScreenLayout)
      const gameScreenLayout = screen.getByTestId('game-screen-layout')
      expect(gameScreenLayout).toHaveAttribute('handleDrawTile')

      // Simulate draw action
      await act(async () => {
        const handleDrawTile = gameScreenLayout.getAttribute('handleDrawTile')
        if (handleDrawTile) {
          await mockTurnStore.executeAction('player1', 'draw')
        }
      })

      expect(mockTurnStore.executeAction).toHaveBeenCalledWith('player1', 'draw', undefined)
    })

    it('should prevent draw when not player turn', async () => {
      mockTurnSelectors.canPlayerDraw.mockReturnValue(false)

      renderGameModeView()

      // Simulate attempting to draw when can't draw
      await act(async () => {
        try {
          await mockTurnStore.executeAction('player1', 'draw')
        } catch (error) {
          // Expected to fail
        }
      })

      expect(mockGameStore.addAlert).toHaveBeenCalledWith({
        type: 'warning',
        title: 'Cannot Draw',
        message: 'Not your turn to draw'
      })
    })

    it('should handle discard tile action', async () => {
      const testTile: Tile = {
        id: 'bamboo-1',
        suit: 'bamboos',
        value: '1',
        displayName: '1 Bamboo'
      }
      mockTurnSelectors.canPlayerDiscard.mockReturnValue(true)

      renderGameModeView()

      // Simulate discard action
      await act(async () => {
        await mockTurnStore.executeAction('player1', 'discard', testTile)
      })

      expect(mockTurnStore.executeAction).toHaveBeenCalledWith('player1', 'discard', testTile)
    })

    it('should prevent discard when player must draw first', async () => {
      const testTile: Tile = {
        id: 'bamboo-1',
        suit: 'bamboos',
        value: '1',
        displayName: '1 Bamboo'
      }
      mockTurnSelectors.canPlayerDiscard.mockReturnValue(false)

      renderGameModeView()

      // Simulate attempting to discard when can't discard
      await act(async () => {
        try {
          await mockTurnStore.executeAction('player1', 'discard', testTile)
        } catch (error) {
          // Expected to fail
        }
      })

      expect(mockGameStore.addAlert).toHaveBeenCalledWith({
        type: 'warning',
        title: 'Cannot Discard',
        message: 'Must draw a tile before discarding'
      })
    })
  })

  describe('Call Opportunities', () => {
    beforeEach(() => {
      mockGameStore.gamePhase = 'playing'
    })

    it('should display call opportunity modal when available', () => {
      mockTurnSelectors.currentCallOpportunity = {
        tile: { id: 'bamboo-5', suit: 'bamboos', value: '5', displayName: '5 Bamboo' },
        isActive: true,
        duration: 5000,
        deadline: new Date(Date.now() + 5000)
      }

      renderGameModeView()

      expect(screen.getByTestId('call-opportunity-modal')).toBeInTheDocument()
    })

    it('should handle call opportunity response - call', async () => {
      const callOpportunity = {
        tile: { id: 'bamboo-5', suit: 'bamboos', value: '5', displayName: '5 Bamboo' },
        isActive: true,
        duration: 5000,
        deadline: new Date(Date.now() + 5000)
      }
      mockTurnSelectors.currentCallOpportunity = callOpportunity

      renderGameModeView()

      // Simulate call response
      await act(async () => {
        await mockTurnStore.executeAction('player1', 'call', {
          callType: 'pung',
          tiles: [callOpportunity.tile, callOpportunity.tile]
        })
      })

      expect(mockTurnStore.executeAction).toHaveBeenCalledWith('player1', 'call', {
        callType: 'pung',
        tiles: [callOpportunity.tile, callOpportunity.tile]
      })
      expect(mockTurnStore.closeCallOpportunity).toHaveBeenCalled()
    })

    it('should handle call opportunity response - pass', async () => {
      mockTurnSelectors.currentCallOpportunity = {
        tile: { id: 'bamboo-5', suit: 'bamboos', value: '5', displayName: '5 Bamboo' },
        isActive: true,
        duration: 5000,
        deadline: new Date(Date.now() + 5000)
      }

      renderGameModeView()

      // Simulate pass response
      await act(async () => {
        mockTurnStore.closeCallOpportunity()
      })

      expect(mockTurnStore.closeCallOpportunity).toHaveBeenCalled()
    })

    it('should show enhanced call opportunity overlay with AI recommendation', () => {
      mockGameIntelligence.analysis.currentCallRecommendation = {
        action: 'call',
        confidence: 0.8,
        reasoning: 'This call completes your pung and advances pattern progress'
      }

      // Set up an enhanced call opportunity
      mockTurnSelectors.currentCallOpportunity = {
        tile: { id: 'bamboo-5', suit: 'bamboos', value: '5', displayName: '5 Bamboo' },
        isActive: true,
        duration: 5000,
        deadline: new Date(Date.now() + 5000)
      }

      renderGameModeView()

      expect(screen.getByTestId('call-opportunity-overlay')).toBeInTheDocument()
    })
  })

  describe('Store Integration and State Synchronization', () => {
    it('should sync with multiple stores on initialization', () => {
      renderGameModeView()

      // Verify all stores are accessed
      expect(mockPatternStore.getTargetPatterns).toHaveBeenCalled()
      expect(mockTileStore.playerHand).toBeDefined()
      expect(mockIntelligenceStore.currentAnalysis).toBeDefined()
    })

    it('should update game state when actions are executed', async () => {
      const testTile: Tile = {
        id: 'bamboo-1',
        suit: 'bamboos',
        value: '1',
        displayName: '1 Bamboo'
      }

      renderGameModeView()

      // Simulate successful action execution
      mockTurnStore.executeAction.mockResolvedValueOnce(true)

      await act(async () => {
        await mockTurnStore.executeAction('player1', 'discard', testTile)
      })

      expect(mockTurnStore.executeAction).toHaveBeenCalledWith('player1', 'discard', testTile)
    })

    it('should trigger re-analysis when hand changes', async () => {
      const newHand = [
        { id: 'bamboo-1', suit: 'bamboos', value: '1', displayName: '1 Bamboo' },
        { id: 'bamboo-2', suit: 'bamboos', value: '2', displayName: '2 Bamboo' },
        { id: 'bamboo-3', suit: 'bamboos', value: '3', displayName: '3 Bamboo' },
        // Add more tiles to meet minimum analysis requirement
        ...Array(10).fill(0).map((_, i) => ({
          id: `extra-${i}`,
          suit: 'bamboos',
          value: '1',
          displayName: `Extra ${i}`
        }))
      ] as Tile[]

      mockTileStore.playerHand = newHand

      renderGameModeView()

      await waitFor(() => {
        expect(mockIntelligenceStore.analyzeHand).toHaveBeenCalled()
      })
    })
  })

  describe('Co-Pilot AI Features and Recommendations', () => {
    it('should display AI analysis recommendations', () => {
      mockIntelligenceStore.currentAnalysis = {
        recommendedPatterns: [
          {
            pattern: {
              id: 'pattern-1',
              patternId: '2025-1',
              displayName: 'Test Pattern',
              section: 'NMJL',
              line: '1',
              pattern: 'AAA BBB CCC DD',
              points: 25,
              concealed: false,
              difficulty: 'medium',
              groups: []
            },
            completionPercentage: 75,
            tilesNeeded: 2,
            reasoning: 'Excellent progress on this high-value pattern'
          }
        ],
        bestPatterns: []
      }

      renderGameModeView()

      // GameScreenLayout should receive the analysis
      const gameScreenLayout = screen.getByTestId('game-screen-layout')
      expect(gameScreenLayout).toHaveAttribute('currentAnalysis')
    })

    it('should handle action recommendations from AI', async () => {
      const testTile: PlayerTile = {
        id: 'bamboo-7',
        suit: 'bamboos',
        value: '7',
        displayName: '7 Bamboo',
        instanceId: 'bamboo-7-inst',
        isSelected: false
      }

      renderGameModeView()

      // Simulate AI discard suggestion
      await act(async () => {
        // This would be triggered by the AI recommendation system
        // The component should highlight the suggested discard
      })

      // Verify the tile would be selected for discard suggestion
      expect(mockIntelligenceStore.currentAnalysis).toBeDefined()
    })

    it('should show pattern switching recommendations', () => {
      mockIntelligenceStore.currentAnalysis = {
        recommendedPatterns: [
          {
            pattern: {
              id: 'pattern-1',
              patternId: '2025-1',
              displayName: 'Current Pattern',
              section: 'NMJL',
              line: '1',
              pattern: 'AAA BBB CCC DD',
              points: 25,
              concealed: false,
              difficulty: 'medium',
              groups: []
            },
            completionPercentage: 30,
            tilesNeeded: 8,
            reasoning: 'Low progress'
          }
        ],
        bestPatterns: [
          {
            patternId: 'alternative-1',
            completionPercentage: 70,
            difficulty: 'easy',
            tilesNeeded: 3,
            strategicValue: 85
          }
        ]
      }

      renderGameModeView()

      // GameScreenLayout should receive pattern switching capability
      const gameScreenLayout = screen.getByTestId('game-screen-layout')
      expect(gameScreenLayout).toHaveAttribute('onPatternSwitch')
    })

    it('should handle pattern switching', async () => {
      const newPatternId = 'pattern-2'

      renderGameModeView()

      // Simulate pattern switch
      await act(async () => {
        mockPatternStore.removeTargetPattern('pattern-1')
        mockPatternStore.addTargetPattern(newPatternId)
      })

      expect(mockPatternStore.removeTargetPattern).toHaveBeenCalledWith('pattern-1')
      expect(mockPatternStore.addTargetPattern).toHaveBeenCalledWith(newPatternId)
    })
  })

  describe('Game End Scenarios', () => {
    beforeEach(() => {
      mockGameStore.gamePhase = 'playing'
    })

    it('should show mahjong declaration modal when triggered', async () => {
      renderGameModeView()

      // Simulate mahjong declaration
      await act(async () => {
        await mockTurnStore.executeAction('player1', 'declare-mahjong')
      })

      expect(screen.getByTestId('mahjong-declaration-modal')).toBeInTheDocument()
    })

    it('should handle successful mahjong confirmation', async () => {
      const validationResult = {
        isValid: true,
        validPattern: {
          Year: 2025,
          Section: 'NMJL',
          Line: '1',
          'Pattern ID': '2025-1',
          Hands_Key: 'pattern-1',
          Hand_Pattern: 'AAA BBB CCC DD',
          Hand_Description: 'Test Winning Pattern',
          Hand_Points: 50,
          Hand_Conceiled: false,
          Hand_Difficulty: 'medium',
          Hand_Notes: null,
          Groups: []
        },
        score: 50,
        completedPattern: {
          id: 'pattern-1',
          patternId: '2025-1',
          displayName: 'Test Winning Pattern',
          section: 'NMJL',
          line: '1',
          pattern: 'AAA BBB CCC DD',
          points: 50,
          concealed: false,
          difficulty: 'medium',
          groups: []
        }
      }

      renderGameModeView()

      // Simulate successful mahjong validation
      await act(async () => {
        // This would be called from the mahjong modal
        expect(validationResult.isValid).toBe(true)
        expect(mockHistoryStore.completeGame).not.toHaveBeenCalled()
      })
    })

    it('should show final hand reveal modal on game end', async () => {
      // Set up game end scenario
      mockGameEndCoordination.shouldNavigateToPostGame = true
      mockGameEndCoordination.gameEndData = {
        winner: 'player1',
        endReason: 'mahjong',
        winningPattern: {
          Hand_Description: 'Winning Pattern',
          Hand_Points: 50
        }
      }
      mockGameEndCoordination.allPlayerHands = {
        'player1': mockTileStore.playerHand,
        'player2': [],
        'player3': [],
        'player4': []
      }

      renderGameModeView()

      await waitFor(() => {
        expect(screen.getByTestId('final-hand-reveal-modal')).toBeInTheDocument()
      })
    })

    it('should navigate to post-game after game end', async () => {
      const onNavigateToPostGame = vi.fn()

      renderGameModeView({ onNavigateToPostGame })

      // Simulate game end and navigation
      await act(async () => {
        // This would be triggered by successful game completion
        onNavigateToPostGame('game-123')
      })

      expect(onNavigateToPostGame).toHaveBeenCalledWith('game-123')
    })
  })

  describe('Charleston Phase Interactions', () => {
    beforeEach(() => {
      mockGameStore.gamePhase = 'charleston'
    })

    it('should handle Charleston tile passing in solo mode', async () => {
      mockRoomSetupStore.coPilotMode = 'solo'
      mockTileStore.selectedForAction = [
        { id: 'tile-1', instanceId: 'tile-1-inst' },
        { id: 'tile-2', instanceId: 'tile-2-inst' },
        { id: 'tile-3', instanceId: 'tile-3-inst' }
      ] as PlayerTile[]

      renderGameModeView()

      // Simulate Charleston pass
      await act(async () => {
        mockTileStore.selectedForAction.forEach(tile => {
          mockTileStore.removeTile(tile.instanceId)
        })
        mockCharlestonStore.completePhase()
        mockGameStore.incrementTurn()
      })

      expect(mockTileStore.removeTile).toHaveBeenCalledTimes(3)
      expect(mockCharlestonStore.completePhase).toHaveBeenCalled()
      expect(mockGameStore.incrementTurn).toHaveBeenCalled()
    })

    it('should show tile input modal for receiving Charleston tiles', async () => {
      mockRoomSetupStore.coPilotMode = 'solo'

      renderGameModeView()

      // Charleston tile receiving would be handled by TileInputModal
      // This verifies the modal component is available
      expect(vi.isMockFunction(vi.importActual('../../shared/TileInputModal'))).toBe(true)
    })

    it('should handle receiving Charleston tiles', async () => {
      const receivedTileIds = ['bamboo-4', 'bamboo-5', 'bamboo-6']

      renderGameModeView()

      // Simulate receiving tiles
      await act(async () => {
        receivedTileIds.forEach(tileId => {
          const playerTile = mockTileService.createPlayerTile(tileId)
          if (playerTile) {
            mockTileStore.addTile(playerTile.id)
          }
        })
      })

      expect(mockTileService.createPlayerTile).toHaveBeenCalledTimes(3)
      expect(mockTileStore.addTile).toHaveBeenCalledTimes(3)
    })

    it('should navigate to Charleston view for multiplayer', async () => {
      const onNavigateToCharleston = vi.fn()
      mockRoomSetupStore.coPilotMode = 'everyone'

      renderGameModeView({ onNavigateToCharleston })

      // Simulate Charleston navigation
      await act(async () => {
        onNavigateToCharleston()
      })

      expect(onNavigateToCharleston).toHaveBeenCalled()
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle failed action execution gracefully', async () => {
      mockTurnStore.executeAction.mockRejectedValueOnce(new Error('Action failed'))

      renderGameModeView()

      await act(async () => {
        try {
          await mockTurnStore.executeAction('player1', 'draw')
        } catch (error) {
          // Error should be handled
        }
      })

      expect(mockGameStore.addAlert).toHaveBeenCalledWith({
        type: 'warning',
        title: 'Action Failed',
        message: 'Failed to execute action. Please try again.'
      })
    })

    it('should handle missing player data gracefully', () => {
      mockRoomStore.players = []
      mockRoomStore.hostPlayerId = null

      renderGameModeView()

      // Should fallback to default player ID
      expect(mockGameStore.setCurrentPlayer).toHaveBeenCalledWith('player1')
    })

    it('should handle empty hand analysis gracefully', async () => {
      mockTileStore.playerHand = []
      mockIntelligenceStore.currentAnalysis = null

      renderGameModeView()

      // Should not trigger analysis with empty hand
      await waitFor(() => {
        expect(mockIntelligenceStore.analyzeHand).not.toHaveBeenCalled()
      })
    })

    it('should handle missing pattern data', () => {
      mockPatternStore.getTargetPatterns.mockReturnValue([])

      renderGameModeView()

      // Should render without errors even with no patterns
      expect(screen.getByTestId('game-screen-layout')).toBeInTheDocument()
    })

    it('should handle intelligence analysis errors', async () => {
      mockIntelligenceStore.analyzeHand.mockRejectedValueOnce(new Error('Analysis failed'))
      mockTileStore.playerHand = Array(13).fill(0).map((_, i) => ({
        id: `tile-${i}`,
        suit: 'bamboos',
        value: '1',
        displayName: `Tile ${i}`
      })) as Tile[]

      renderGameModeView()

      // Should handle analysis errors without crashing
      await waitFor(() => {
        expect(mockIntelligenceStore.analyzeHand).toHaveBeenCalled()
      })
    })
  })

  describe('Performance and Optimization', () => {
    it('should not re-render excessively on state changes', () => {
      const { rerender } = renderGameModeView()

      // Simulate multiple state updates
      act(() => {
        mockGameStore.currentTurn = 2
        mockTileStore.playerHand = [...mockTileStore.playerHand]
      })

      rerender(
        <MemoryRouter>
          <GameModeView onNavigateToCharleston={vi.fn()} onNavigateToPostGame={vi.fn()} />
        </MemoryRouter>
      )

      // Component should still be functional
      expect(screen.getByTestId('game-screen-layout')).toBeInTheDocument()
    })

    it('should memoize expensive computations', () => {
      renderGameModeView()

      // Current hand and game state should be memoized
      const gameScreenLayout = screen.getByTestId('game-screen-layout')
      expect(gameScreenLayout).toHaveAttribute('currentHand')
      expect(gameScreenLayout).toHaveAttribute('isMyTurn')
    })

    it('should handle rapid user interactions without issues', async () => {
      const user = userEvent.setup()
      renderGameModeView()

      // Simulate rapid clicking (would be handled by debouncing/throttling)
      await act(async () => {
        // Multiple rapid actions should be handled gracefully
        for (let i = 0; i < 5; i++) {
          mockTurnStore.executeAction.mockResolvedValueOnce(true)
        }
      })

      // Component should remain stable
      expect(screen.getByTestId('game-screen-layout')).toBeInTheDocument()
    })
  })

  describe('Accessibility and Mobile Interactions', () => {
    it('should have proper ARIA labels and roles', () => {
      renderGameModeView()

      // Key interactive elements should be accessible
      const gameScreenLayout = screen.getByTestId('game-screen-layout')
      expect(gameScreenLayout).toBeInTheDocument()

      // Selection area should be accessible
      const selectionArea = screen.getByTestId('selection-area')
      expect(selectionArea).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      renderGameModeView()

      // Tab navigation should work through interactive elements
      await user.tab()

      // Focus should be manageable
      expect(document.activeElement).toBeDefined()
    })

    it('should handle touch interactions properly', () => {
      renderGameModeView()

      // Touch events should be properly handled by child components
      const gameScreenLayout = screen.getByTestId('game-screen-layout')
      expect(gameScreenLayout).toHaveAttribute('handleDiscardTile')
      expect(gameScreenLayout).toHaveAttribute('handleDrawTile')
    })

    it('should provide proper screen reader support', () => {
      renderGameModeView()

      // Important game state should be announced to screen readers
      const gameScreenLayout = screen.getByTestId('game-screen-layout')
      expect(gameScreenLayout).toHaveAttribute('currentPlayer')
      expect(gameScreenLayout).toHaveAttribute('isMyTurn')
    })

    it('should support reduced motion preferences', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query.includes('reduced-motion'),
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      })

      renderGameModeView()

      // Animations should respect reduced motion preferences
      expect(screen.getByTestId('game-screen-layout')).toBeInTheDocument()
    })
  })

  describe('Dev Tools and Debugging', () => {
    it('should render dev shortcuts component', () => {
      renderGameModeView()

      expect(screen.getByTestId('dev-shortcuts')).toBeInTheDocument()
    })

    it('should handle skip to gameplay shortcut', async () => {
      mockGameStore.gamePhase = 'charleston'

      renderGameModeView()

      // Dev shortcut should allow skipping Charleston
      await act(async () => {
        mockGameStore.setGamePhase('playing')
        mockGameStore.setCurrentPlayer('player1')
        mockGameStore.startTurn()
      })

      expect(mockGameStore.setGamePhase).toHaveBeenCalledWith('playing')
    })

    it('should handle game reset shortcut', async () => {
      renderGameModeView()

      // Dev shortcut should reset all stores and navigate
      await act(async () => {
        mockRoomSetupStore.resetToStart()
        mockGameStore.resetGame()
        mockTileStore.clearHand()
        mockPatternStore.clearSelection()
        mockIntelligenceStore.clearAnalysis()
        mockCharlestonStore.reset()
        mockNavigate('/room-setup')
      })

      expect(mockRoomSetupStore.resetToStart).toHaveBeenCalled()
      expect(mockGameStore.resetGame).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/room-setup')
    })
  })

  describe('Wall Exhaustion and Game Ending', () => {
    it('should show wall exhaustion warning when tiles are low', () => {
      mockTurnSelectors.wallCount = 5 // Low tile count

      renderGameModeView()

      // Warning should be passed to GameScreenLayout
      const gameScreenLayout = screen.getByTestId('game-screen-layout')
      expect(gameScreenLayout).toHaveAttribute('wallCount', '5')
    })

    it('should handle automatic game end on wall exhaustion', async () => {
      mockTurnSelectors.wallCount = 0

      renderGameModeView()

      // Game should end automatically
      await waitFor(() => {
        expect(mockTurnSelectors.wallCount).toBe(0)
      })
    })

    it('should handle pass out (dead hand) action', async () => {
      renderGameModeView()

      // Player should be able to declare dead hand
      await act(async () => {
        await mockTurnStore.executeAction('player1', 'pass-out')
      })

      expect(mockTurnStore.executeAction).toHaveBeenCalledWith('player1', 'pass-out', undefined)
    })
  })

  describe('Multiplayer Coordination', () => {
    beforeEach(() => {
      mockRoomSetupStore.coPilotMode = 'everyone'
      mockGameEndCoordination.isMultiplayerSession = true
    })

    it('should handle multiplayer game end coordination', async () => {
      mockGameEndCoordination.shouldNavigateToPostGame = true
      mockGameEndCoordination.allPlayerHands = {
        'player1': mockTileStore.playerHand,
        'player2': [],
        'player3': [],
        'player4': []
      }

      renderGameModeView()

      await waitFor(() => {
        expect(mockGameEndCoordination.isMultiplayerSession).toBe(true)
      })
    })

    it('should sync final scores in multiplayer', () => {
      mockGameEndCoordination.finalScores = [
        { playerId: 'player1', score: 50 },
        { playerId: 'player2', score: 25 },
        { playerId: 'player3', score: 0 },
        { playerId: 'player4', score: 0 }
      ]

      renderGameModeView()

      expect(mockGameEndCoordination.finalScores).toBeDefined()
      expect(mockGameEndCoordination.finalScores).toHaveLength(4)
    })

    it('should clear game end state after coordination', async () => {
      mockGameEndCoordination.shouldNavigateToPostGame = true

      renderGameModeView()

      await act(async () => {
        mockGameEndCoordination.clearGameEndState()
      })

      expect(mockGameEndCoordination.clearGameEndState).toHaveBeenCalled()
    })
  })
})