// Game Mode View - Core gameplay interface with real-time co-pilot assistance
// Handles draw/discard mechanics, call evaluation, and continuous pattern analysis

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useGameStore } from '../../stores/game-store'
import { useRoomStore } from '../../stores/room.store'
import { useRoomSetupStore } from '../../stores/room-setup.store'
import { usePlayerStore } from '../../stores/player.store'
import { usePatternStore } from '../../stores/pattern-store'
import { useIntelligenceStore } from '../../stores/intelligence-store'
import { useTileStore } from '../../stores/tile-store'
import { useTurnStore, useTurnSelectors } from '../../stores/turn-store'
import { useCharlestonStore } from '../../stores/charleston-store'
import { Card } from '../../ui-components/Card'
import { Button } from '../../ui-components/Button'
import { AnimatedTile } from '../../ui-components/tiles/AnimatedTile'
import CallOpportunityModal from '../../ui-components/CallOpportunityModal'
import { MahjongDeclarationModal } from '../../ui-components/MahjongDeclarationModal'
import { FinalHandRevealModal, type FinalHandRevealData } from '../../ui-components/FinalHandRevealModal'
import { TileInputModal } from '../shared/TileInputModal'
import type { PlayerTile } from 'shared-types'
import type { Tile } from 'shared-types'
import type { GameAction, CallType } from '../gameplay/services/game-actions'
import GameScreenLayout from './GameScreenLayout'
import { SelectionArea } from './SelectionArea'
import { EnhancedIntelligencePanel } from './EnhancedIntelligencePanel'
import { CallOpportunityOverlay } from './components/CallOpportunityOverlay'
import { useGameIntelligence } from '../../hooks/useGameIntelligence'
import { useGameEndCoordination } from '../../hooks/useGameEndCoordination'
import type { GameState } from '../intelligence-panel/services/turn-intelligence-engine'
import type { CallOpportunity as CallOpportunityType } from '../intelligence-panel/services/call-opportunity-analyzer'
import type { MahjongValidationResult } from '../../lib/services/mahjong-validator'
import type { GameContext } from '../intelligence-panel/services/pattern-analysis-engine'
import { GameEndCoordinator, type GameEndContext, getWallExhaustionWarning } from '../gameplay/services/game-end-coordinator'
import { createMultiplayerGameEndService, isMultiplayerSession } from '../gameplay/services/multiplayer-game-end'
import { useHistoryStore } from '../../stores/history-store'
import { tileService } from '../../lib/services/tile-service'
import DevShortcuts from '../../ui-components/DevShortcuts'
import { useNavigate } from 'react-router-dom'

interface GameModeViewProps {
  onNavigateToCharleston?: () => void
  onNavigateToPostGame?: (gameId?: string) => void
}

interface GameTurn {
  playerId: string
  action: GameAction
  tile?: Tile
  callType?: CallType
  exposedTiles?: Tile[]
  timestamp: Date
}

interface CallOpportunity {
  tile: Tile
  callType: 'pung' | 'kong'
  exposedTiles: Tile[]
  priority: 'high' | 'medium' | 'low'
  reasoning: string
  patternProgress: number
}

export const GameModeView: React.FC<GameModeViewProps> = ({
  onNavigateToCharleston,
  onNavigateToPostGame
}) => {
  // Store state
  const navigate = useNavigate()
  const gameStore = useGameStore()
  const roomStore = useRoomStore()
  const roomSetupStore = useRoomSetupStore()
  const playerStore = usePlayerStore()
  const intelligenceStore = useIntelligenceStore()
  const patternStore = usePatternStore()
  const tileStore = useTileStore()
  const turnStore = useTurnStore()
  const charlestonStore = useCharlestonStore()
  const turnSelectors = useTurnSelectors()
  const historyStore = useHistoryStore()
  
  // Initialize game phase - start with Charleston when first entering from tile input
  useEffect(() => {
    if (gameStore.gamePhase === 'tile-input') {
      gameStore.setGamePhase('charleston')
    }
  }, [gameStore.gamePhase, gameStore.setGamePhase])

  // Get current player ID - use host or first player as fallback (moved up to avoid hoisting issues)
  const currentPlayerId = useMemo(() => {
    if (roomStore.players.length > 0) {
      return roomStore.players[0]?.id || 'player1'
    }
    return roomStore.hostPlayerId || 'player1'
  }, [roomStore.players, roomStore.hostPlayerId])

  // Initialize current player to the user when starting gameplay
  useEffect(() => {
    if (gameStore.gamePhase === 'playing' && !gameStore.currentPlayerId) {
      // Set the current player to the user (first player)
      const userPlayerId = currentPlayerId
      gameStore.setCurrentPlayer(userPlayerId)
      setCurrentPlayerIndex(0) // Ensure user starts

      // Initialize turn system to start with the user
      gameStore.startTurn()
    }
  }, [gameStore.gamePhase, gameStore.currentPlayerId, currentPlayerId, gameStore.setCurrentPlayer, gameStore.startTurn])

  // Set dealer hand based on East player position
  useEffect(() => {
    const currentPlayer = gameStore.players.find(p => p.id === currentPlayerId)
    const isDealer = currentPlayer?.position === 'east'

    // Update tile store if dealer status has changed
    if (tileStore.dealerHand !== isDealer) {
      tileStore.setDealerHand(isDealer)
    }
  }, [currentPlayerId, gameStore.players, tileStore])

  // Auto-analyze hand when entering the game for pattern recommendations
  useEffect(() => {
    const playerHand = tileStore.playerHand
    const hasEnoughTiles = playerHand.length >= 10
    const hasNoAnalysis = !intelligenceStore.currentAnalysis

    if (hasEnoughTiles && hasNoAnalysis && !intelligenceStore.isAnalyzing) {
      intelligenceStore.analyzeHand(playerHand, [])
    }
  }, [tileStore.playerHand, intelligenceStore])

  // Get selected patterns properly
  const selectedPatterns = useMemo(() => {
    return patternStore.getTargetPatterns()
  }, [patternStore])


  // Helper function to extract tiles from hand for call (pung/kong)
  const extractCallTiles = useCallback((hand: Tile[], callType: CallType, targetTile?: Tile): Tile[] => {
    if (!targetTile) return []

    const targetId = targetTile.id
    const tilesNeeded = callType === 'pung' ? 2 : 3 // pung needs 2 from hand, kong needs 3

    // Find matching tiles in hand (including jokers)
    const matchingTiles: Tile[] = []
    const jokerTiles: Tile[] = []

    for (const tile of hand) {
      if (tile.id === targetId && matchingTiles.length < tilesNeeded) {
        matchingTiles.push(tile)
      } else if (tile.id === 'joker' && jokerTiles.length < (tilesNeeded - matchingTiles.length)) {
        jokerTiles.push(tile)
      }
    }

    // Combine matching tiles and jokers as needed
    const callTiles = [...matchingTiles, ...jokerTiles.slice(0, tilesNeeded - matchingTiles.length)]

    return callTiles.slice(0, tilesNeeded)
  }, [])

  // Local state - integrated with turn management
  const isMyTurn = turnSelectors.isMyTurn(currentPlayerId)

  const [lastDrawnTile, setLastDrawnTile] = useState<Tile | null>(null)
  const [callOpportunities, setCallOpportunities] = useState<CallOpportunity[]>([])
  const [showCallDialog, setShowCallDialog] = useState(false)
  const [callTimeoutId, setCallTimeoutId] = useState<NodeJS.Timeout | null>(null)
  const [selectedDiscardTile, setSelectedDiscardTile] = useState<Tile | null>(null)
  const [gameHistory, setGameHistory] = useState<GameTurn[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [gameEnded, setGameEnded] = useState(false)
  const [exposedTiles, setExposedTiles] = useState<Array<{
    type: 'pung' | 'kong' | 'quint' | 'sextet'
    tiles: Tile[]
    timestamp: Date
  }>>([])
  const [playerExposedCount, setPlayerExposedCount] = useState<Record<string, number>>({
    'player-1': 0,
    'player-2': 0,
    'player-3': 0,
    'player-4': 0
  })
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0)
  // Get player names from game store, fallback to positions if not available
  const playerNames = useMemo(() => {
    // For multiplayer games, use game store players
    if (gameStore.players.length > 0) {
      return gameStore.players.map(p => p.name)
    }
    
    // For solo games, use room store other player names with "You" as the first player
    if (roomSetupStore.coPilotMode === 'solo' && playerStore.otherPlayerNames.length > 0) {
      return ['You', ...playerStore.otherPlayerNames]
    }
    
    // Fallback to generic names
    return ['You', 'Right', 'Across', 'Left']
  }, [gameStore.players, roomSetupStore.coPilotMode, playerStore.otherPlayerNames])

  // Get current player info from game store
  const currentPlayer = useMemo(() => {
    const currentPlayerId = gameStore.currentPlayerId
    if (currentPlayerId && gameStore.players.length > 0) {
      const player = gameStore.players.find(p => p.id === currentPlayerId)
      return player?.name || playerNames[0]
    }
    
    // In solo mode, if we're using fallback names that start with "You", 
    // try to use the actual entered player names instead
    if (roomSetupStore.coPilotMode === 'solo' && playerStore.otherPlayerNames.length > 0) {
      // Use the first actual player name instead of "You" 
      const allRealNames = [playerStore.otherPlayerNames[0], ...playerStore.otherPlayerNames.slice(1)]
      return allRealNames[currentPlayerIndex % allRealNames.length] || playerNames[currentPlayerIndex]
    }
    
    return playerNames[currentPlayerIndex]
  }, [gameStore.currentPlayerId, gameStore.players, currentPlayerIndex, playerNames, roomSetupStore.coPilotMode, playerStore.otherPlayerNames])
  const gameRound = gameStore.currentTurn || 1
  const [windRound] = useState<'east' | 'south' | 'west' | 'north'>('east')
  const [discardPile] = useState<Array<{
    tile: Tile
    playerId: string
    timestamp: Date
  }>>([])
  const [gameStartTime] = useState(new Date())
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [showPatternSwitcher, setShowPatternSwitcher] = useState(false)
  const [showMahjongModal, setShowMahjongModal] = useState(false)
  const [showCharlestonModal, setShowCharlestonModal] = useState(false)
  const [gameEndCoordinator, setGameEndCoordinator] = useState<GameEndCoordinator | null>(null)
  const [passedOutPlayers] = useState<Set<string>>(new Set())
  const [showFinalHandReveal, setShowFinalHandReveal] = useState(false)
  const [finalHandRevealData, setFinalHandRevealData] = useState<FinalHandRevealData | null>(null)
  const [completedGameId, setCompletedGameId] = useState<string | null>(null)
  const [alternativePatterns, setAlternativePatterns] = useState<Array<{ 
    patternId: string; 
    completionPercentage: number; 
    difficulty: string; 
    tilesNeeded?: number; 
    strategicValue?: number 
  }>>([])

  // Enhanced Intelligence Panel state
  const [showEnhancedIntelligence, setShowEnhancedIntelligence] = useState(false)
  const [callOpportunityEnhanced, setCallOpportunityEnhanced] = useState<CallOpportunityType | null>(null)

  // Current hand with drawn tile - get real player hand from tile store
  const currentHand = useMemo(() => (tileStore.playerHand || []) as Tile[], [tileStore.playerHand])
  const fullHand = useMemo(() => 
    lastDrawnTile ? [...currentHand, lastDrawnTile] : currentHand, 
    [currentHand, lastDrawnTile]
  )

  // Real-time analysis - get actual analysis from intelligence store
  const currentAnalysis = intelligenceStore.currentAnalysis

  // Enhanced Intelligence Integration - Use real game state
  const gameState: GameState = useMemo(() => ({
    currentPlayer: currentPlayer,
    turnNumber: gameRound,
    roundNumber: gameRound,
    playerHands: {
      [currentPlayerId]: fullHand.map(tile => ({
        ...tile,
        instanceId: ('instanceId' in tile ? tile.instanceId : `${tile.id}-${Date.now()}-${Math.random()}`) as string,
        isSelected: false
      })),
    },
    playerActions: {
      [currentPlayerId]: {
        hasDrawn: !!lastDrawnTile,
        hasDiscarded: false,
        lastAction: lastDrawnTile ? 'draw' : null,
        actionCount: gameRound
      }
    },
    discardPile: discardPile.map(d => d.tile),
    exposedTiles: {
      [currentPlayerId]: exposedTiles
    },
    wallCount: turnSelectors.wallCount,
    actionHistory: gameHistory.map(h => ({
      playerId: h.playerId,
      action: h.action,
      tile: h.tile,
      timestamp: h.timestamp,
      isVisible: true,
      turnNumber: gameRound
    }))
  }), [currentPlayer, gameRound, currentPlayerId, fullHand, lastDrawnTile, discardPile, exposedTiles, gameHistory, turnSelectors.wallCount])

  // Use enhanced intelligence hook with real game state
  const { analysis: enhancedAnalysis } = useGameIntelligence(gameState, currentPlayerId)
  
  // Use game end coordination hook for multiplayer synchronization
  const gameEndCoordination = useGameEndCoordination()

  // Action recommendation handler
  const handleActionRecommendation = useCallback((
    action: string,
    data: { tile?: PlayerTile; type?: string; [key: string]: unknown }
  ) => {
    switch (action) {
      case 'discard-suggestion': {
        // Highlight suggested discard tile
        const tileToHighlight = data.tile
        if (tileToHighlight) {
          // Find and select the suggested tile
          setSelectedDiscardTile(tileToHighlight)
        }
        break
      }
      case 'call':
        // Execute call action via turn store
        turnStore.executeAction(currentPlayerId, 'call', {
          callType: data.type,
          tile: data.tile
        })
        setCallOpportunityEnhanced(null)
        break
      case 'pass':
        // Pass on call opportunity
        setCallOpportunityEnhanced(null)
        break
    }
  }, [turnStore, setSelectedDiscardTile])

  // Call opportunity detection
  useEffect(() => {
    const detectCallOpportunity = () => {
      if (gameState?.discardPile.length > 0 && gameState.currentPlayer !== currentPlayerId) {
        const lastDiscard = gameState.discardPile[gameState.discardPile.length - 1]
        
        // Simple call type detection - check if player has matching tiles
        const matchingTiles = currentHand.filter(t => t.id === lastDiscard.id)
        const availableCallTypes: ('pung' | 'kong' | 'quint' | 'sextet')[] = []
        
        if (matchingTiles.length >= 2) availableCallTypes.push('pung')
        if (matchingTiles.length >= 3) availableCallTypes.push('kong')
        if (matchingTiles.length >= 4) availableCallTypes.push('quint')
        if (matchingTiles.length >= 5) availableCallTypes.push('sextet')
        
        if (availableCallTypes.length > 0) {
          const opportunity: CallOpportunityType = {
            tile: lastDiscard,
            discardingPlayer: gameState.currentPlayer || 'opponent',
            availableCallTypes,
            timeRemaining: 5000, // 5 second window
            deadline: Date.now() + 5000
          }
          
          setCallOpportunityEnhanced(opportunity)
        }
      } else {
        setCallOpportunityEnhanced(null)
      }
    }
    
    detectCallOpportunity()
  }, [gameState?.discardPile, gameState?.currentPlayer, currentPlayerId, currentHand])

  // Real-time hand analysis
  const analyzeCurrentHand = useCallback(async () => {
    if (fullHand.length === 0) return

    setIsAnalyzing(true)
    
    const handForAnalysis = fullHand.map((tile, index) => {
      if ('instanceId' in tile) {
        return tile as Tile & { instanceId: string; isSelected: boolean }
      }
      return {
        ...tile,
        instanceId: `${tile.id}-${index}`,
        isSelected: false
      } as Tile & { instanceId: string; isSelected: boolean }
    })
    
    // Hand analysis initiated - using real tiles from store
    
    // Trigger intelligence analysis - errors are handled by intelligence store
    await intelligenceStore.analyzeHand(handForAnalysis, [])
    setIsAnalyzing(false)
  }, [fullHand, selectedPatterns, exposedTiles, intelligenceStore])

  // Initialize game mode
  useEffect(() => {
    // GameModeView initialized
    console.log('GameModeView initialized')
  }, [])

  // Timer effect
  useEffect(() => {
    if (isPaused) return

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - gameStartTime.getTime()) / 1000)
      setElapsedTime(elapsed)
    }, 1000)

    return () => clearInterval(interval)
  }, [gameStartTime, isPaused])

  // Auto-analyze hand when it changes
  useEffect(() => {
    if (fullHand.length > 0 && selectedPatterns.length > 0) {
      // Hand changed - triggering analysis
      analyzeCurrentHand()
    }
  }, [fullHand, selectedPatterns, analyzeCurrentHand])

  // Initialize game end coordinator
  useEffect(() => {
    if (!gameEndCoordinator && selectedPatterns.length > 0 && gameStore.players.length > 0) {
      const gameEndContext: GameEndContext = {
        gameId: roomStore.room?.id || `game-${Date.now()}`,
        players: gameStore.players.map(p => ({ id: p.id, name: p.name })),
        wallTilesRemaining: turnSelectors.wallCount,
        passedOutPlayers,
        currentTurn: gameRound,
        gameStartTime,
        selectedPatterns: selectedPatterns.map(pattern => ({
          Year: 2025,
          Section: pattern.section,
          Line: pattern.line,
          'Pattern ID': pattern.patternId,
          Hands_Key: pattern.id,
          Hand_Pattern: pattern.pattern,
          Hand_Description: pattern.displayName,
          Hand_Points: pattern.points,
          Hand_Conceiled: pattern.concealed,
          Hand_Difficulty: pattern.difficulty,
          Hand_Notes: null,
          Groups: pattern.groups || []
        })),
        playerHands: {
          [currentPlayerId]: currentHand.map((tile, index) => ({
            ...tile,
            instanceId: ('instanceId' in tile ? tile.instanceId : `${tile.id || 'tile'}-${index}`) as string,
            isSelected: false
          } as PlayerTile))
        },
        roomId: roomStore.room?.id || undefined,
        coPilotMode: roomSetupStore.coPilotMode || undefined
      }
      
      setGameEndCoordinator(new GameEndCoordinator(gameEndContext))
    }
  }, [gameEndCoordinator, selectedPatterns, gameStore.players, turnSelectors.wallCount, 
      passedOutPlayers, gameRound, gameStartTime, currentHand, currentPlayerId, 
      roomStore.room?.id, roomSetupStore.coPilotMode])

  // Check for automatic game end conditions
  useEffect(() => {
    if (gameEndCoordinator && !gameEnded) {
      const gameEndResult = gameEndCoordinator.checkForGameEnd()
      
      if (gameEndResult) {
        setGameEnded(true)
        
        // Add game to history and capture the ID
        const gameId = historyStore.completeGame(gameEndResult.completedGameData)
        setCompletedGameId(gameId)
        
        // Show appropriate alert
        gameStore.addAlert({
          type: gameEndResult.scenario.type === 'mahjong' ? 'success' : 'info',
          title: 'Game Ended',
          message: gameEndResult.scenario.reason
        })
        
        // Prepare final hand revelation data
        const revelationData = gameEndCoordinator.createHandRevelationData()
        const playerNames = gameStore.players.reduce((names, player) => {
          names[player.id] = player.name
          return names
        }, {} as Record<string, string>)
        
        const finalHandData: FinalHandRevealData = {
          allPlayerHands: revelationData.allPlayerHands,
          playerNames,
          winnerDetails: gameEndResult.scenario.winner ? {
            playerId: gameEndResult.scenario.winner,
            winningPattern: gameEndResult.scenario.winningPattern,
            score: gameEndResult.scenario.winningPattern?.Hand_Points || 0
          } : undefined,
          gameStatistics: {
            totalTurns: gameStore.currentTurn,
            gameDuration: gameStore.gameStartTime ? 
              Math.round((Date.now() - gameStore.gameStartTime.getTime()) / 1000 / 60) + ' min' : 
              'Unknown',
            wallTilesRemaining: gameStore.wallTilesRemaining
          }
        }
        
        setFinalHandRevealData(finalHandData)
        setShowFinalHandReveal(true)
      }
    }
  }, [gameEndCoordinator, gameEnded, historyStore, gameStore, onNavigateToPostGame])

  // Handle multiplayer game end coordination
  useEffect(() => {
    if (gameEndCoordination.isMultiplayerSession && gameEndCoordination.shouldNavigateToPostGame) {
      // In multiplayer, wait for all hands to be collected before showing final reveal
      if (gameEndCoordination.gameEndData && gameEndCoordination.allPlayerHands) {
        // Create final hand reveal data with multiplayer data
        const playerNames = gameStore.players.reduce((names, player) => {
          names[player.id] = player.name
          return names
        }, {} as Record<string, string>)

        const finalHandData: FinalHandRevealData = {
          allPlayerHands: gameEndCoordination.allPlayerHands,
          playerNames,
          winnerDetails: gameEndCoordination.gameEndData?.winner ? {
            playerId: String(gameEndCoordination.gameEndData.winner),
            winningPattern: undefined, // Will be filled from game end data
            score: gameEndCoordination.finalScores?.find(s => s.playerId === String(gameEndCoordination.gameEndData?.winner))?.score || 0
          } : undefined,
          gameStatistics: {
            totalTurns: gameStore.currentTurn,
            gameDuration: gameStore.gameStartTime ? 
              Math.round((Date.now() - gameStore.gameStartTime.getTime()) / 1000 / 60) + ' min' : 
              'Unknown',
            wallTilesRemaining: gameStore.wallTilesRemaining
          }
        }

        setFinalHandRevealData(finalHandData)
        setShowFinalHandReveal(true)
        gameEndCoordination.clearGameEndState()
      }
    }
  }, [gameEndCoordination, gameStore])

  // Solo game end enhancements
  useEffect(() => {
    if (roomSetupStore.coPilotMode === 'solo' && gameEnded && finalHandRevealData) {
      // For solo games, add context about the real-world game result
      const gameEndResult = gameStore.gameEndResult
      let message = 'Review your co-pilot analysis from this game'
      
      if (gameEndResult?.endReason === 'mahjong') {
        message = 'Congratulations on your mahjong! Review your winning strategy.'
      } else if (gameEndResult?.endReason === 'other-player-mahjong') {
        message = `${gameEndResult.winner} won. Review your hand progress and strategy.`
      } else if (gameEndResult?.endReason === 'drawn') {
        message = `Game drawn: ${gameEndResult.drawReason}. Review your hand development.`
      }
      
      gameStore.addAlert({
        type: 'info',
        title: 'Game Tracking Complete',
        message,
        duration: 5000
      })
    }
  }, [roomSetupStore.coPilotMode, gameEnded, finalHandRevealData, gameStore])

  // Wall exhaustion warning
  const wallExhaustionWarning = useMemo(() => {
    return getWallExhaustionWarning(turnSelectors.wallCount)
  }, [turnSelectors.wallCount])

  // Draw tile action
  // Enhanced action handlers using game actions service
  const handlePlayerAction = useCallback(async (action: GameAction, data?: unknown) => {
    if (!isMyTurn && action !== 'call' && action !== 'joker-swap') {
      gameStore.addAlert({
        type: 'warning',
        title: 'Not Your Turn',
        message: 'Wait for your turn to take actions'
      })
      return
    }

    // Handle mahjong declaration
    if (action === 'declare-mahjong') {
      setShowMahjongModal(true)
      return
    }

    try {
      const success = await turnStore.executeAction(currentPlayerId, action, data)
      
      if (success) {
        // Add to game history
        const turn: GameTurn = {
          playerId: currentPlayerId,
          action,
          tile: data && typeof data === 'object' && 'id' in data ? data as Tile : undefined,
          timestamp: new Date()
        }
        setGameHistory(prev => [turn, ...prev])

        // Auto-analyze hand after actions
        const currentHand = tileStore.playerHand
        if (currentHand.length >= 10) {
          intelligenceStore.analyzeHand(currentHand, [])
        }

        // Handle specific action results
        if (action === 'draw') {
          setLastDrawnTile(data as Tile)
        } else if (action === 'discard') {
          setLastDrawnTile(null)
          setSelectedDiscardTile(null)
        }
      }
    } catch (error) {
      console.error('Action execution error:', error)
      gameStore.addAlert({
        type: 'warning',
        title: 'Action Failed',
        message: 'Failed to execute action. Please try again.'
      })
    }
  }, [currentPlayerId, isMyTurn, turnStore, gameStore, tileStore, intelligenceStore])

  // Handle tile discard
  const handleDiscardTile = useCallback(async (tile: Tile) => {
    if (!turnSelectors.canPlayerDiscard(currentPlayerId)) {
      gameStore.addAlert({
        type: 'warning',
        title: 'Cannot Discard',
        message: 'Must draw a tile before discarding'
      })
      return
    }

    await handlePlayerAction('discard', tile)
  }, [currentPlayerId, handlePlayerAction, turnSelectors, gameStore])

  // Handle draw tile
  const handleDrawTile = useCallback(async () => {
    if (!turnSelectors.canPlayerDraw(currentPlayerId)) {
      gameStore.addAlert({
        type: 'warning',
        title: 'Cannot Draw',
        message: 'Not your turn to draw'
      })
      return
    }

    await handlePlayerAction('draw')
  }, [currentPlayerId, handlePlayerAction, turnSelectors, gameStore])

  // Handle call opportunity responses
  const handleCallOpportunityResponse = useCallback((response: 'call' | 'pass', callType?: CallType) => {
    if (response === 'call' && callType) {
      // Get the current call opportunity from turn store
      const currentOpportunity = turnSelectors.currentCallOpportunity
      const callTiles = extractCallTiles(currentHand, callType, currentOpportunity?.tile)
      
      handlePlayerAction('call', { callType, tiles: callTiles })
    }
    
    // Close call opportunity
    turnStore.closeCallOpportunity()
  }, [handlePlayerAction, turnStore, turnSelectors, currentHand, extractCallTiles])

  // Handle joker swap action
  const handleSwapJoker = useCallback(() => {
    handlePlayerAction('joker-swap')
  }, [handlePlayerAction])

  // Handle dead hand action
  const handleDeadHand = useCallback(() => {
    handlePlayerAction('pass-out')
  }, [handlePlayerAction])

  // Handle mahjong confirmation
  const handleMahjongConfirmation = useCallback(async (validationResult: MahjongValidationResult) => {
    if (validationResult.isValid && gameEndCoordinator && validationResult.validPattern) {
      setGameEnded(true)
      
      const winningHand = currentHand.map((tile, index) => ({
        ...tile,
        instanceId: ('instanceId' in tile ? tile.instanceId : `${tile.id || 'tile'}-${index}`) as string,
        isSelected: false
      } as PlayerTile))

      // Check if this is a multiplayer session
      const gameEndContext: GameEndContext = {
        gameId: roomStore.room?.id || `game-${Date.now()}`,
        players: gameStore.players.map(p => ({ id: p.id, name: p.name })),
        wallTilesRemaining: turnSelectors.wallCount,
        passedOutPlayers,
        currentTurn: gameRound,
        gameStartTime,
        selectedPatterns: selectedPatterns.map(pattern => ({
          Year: 2025,
          Section: pattern.section,
          Line: pattern.line,
          'Pattern ID': pattern.patternId,
          Hands_Key: pattern.id,
          Hand_Pattern: pattern.pattern,
          Hand_Description: pattern.displayName,
          Hand_Points: pattern.points,
          Hand_Conceiled: pattern.concealed,
          Hand_Difficulty: pattern.difficulty,
          Hand_Notes: null,
          Groups: pattern.groups || []
        })),
        playerHands: {
          [currentPlayerId]: winningHand
        },
        roomId: roomStore.room?.id || undefined,
        coPilotMode: roomSetupStore.coPilotMode || undefined
      }

      if (isMultiplayerSession(gameEndContext)) {
        // Use multiplayer coordination
        const multiplayerService = createMultiplayerGameEndService(gameEndContext)
        
        try {
          const multiplayerData = await multiplayerService.declareMahjong(
            currentPlayerId,
            validationResult.validPattern,
            winningHand
          )

          // Add game to history using multiplayer data
          historyStore.completeGame(multiplayerData.gameEndResult.completedGameData)

          // Add success alert with multiplayer context
          gameStore.addAlert({
            type: 'success',
            title: 'Mahjong! 🏆',
            message: `Won with ${validationResult.validPattern.Hand_Description} for ${validationResult.score} points! All players will see the results.`
          })

          // Coordinate synchronized transition to post-game
          await multiplayerService.coordinatePostGameTransition(multiplayerData)

        } catch (error) {
          console.error('Multiplayer game end failed:', error)
          // Fallback to single-player handling
          const gameEndResult = gameEndCoordinator.endGameByMahjong(
            currentPlayerId,
            validationResult.validPattern,
            winningHand
          )
          historyStore.completeGame(gameEndResult.completedGameData)
        }
      } else {
        // Single-player or solo mode
        const gameEndResult = gameEndCoordinator.endGameByMahjong(
          currentPlayerId,
          validationResult.validPattern,
          winningHand
        )
        
        historyStore.completeGame(gameEndResult.completedGameData)

        gameStore.addAlert({
          type: 'success',
          title: 'Mahjong!',
          message: `Won with ${validationResult.validPattern.Hand_Description} for ${validationResult.score} points!`
        })
      }
      
      // Create game history entry
      const mahjongTurn: GameTurn = {
        playerId: currentPlayerId,
        action: 'declare-mahjong',
        tile: undefined,
        callType: undefined,
        exposedTiles: undefined,
        timestamp: new Date()
      }
      setGameHistory(prev => [mahjongTurn, ...prev])

      // Navigate to post-game after a delay
      setTimeout(() => {
        onNavigateToPostGame?.()
      }, 3000)
    }
  }, [currentPlayerId, gameEndCoordinator, currentHand, selectedPatterns, roomStore, gameStore, 
      turnSelectors.wallCount, passedOutPlayers, gameRound, gameStartTime, historyStore, onNavigateToPostGame])

  // Create game context for mahjong validation
  const gameContext = useMemo((): GameContext => ({
    jokersInHand: fullHand.filter(tile => tile.id === 'joker' || tile.value === 'joker').length,
    wallTilesRemaining: Math.max(0, 144 - (fullHand.length * 4) - discardPile.length),
    discardPile: discardPile.map(d => d.tile.id),
    exposedTiles: {
      [currentPlayerId]: exposedTiles.flatMap(group => group.tiles.map(tile => tile.id))
    },
    currentPhase: 'gameplay'
  }), [fullHand, discardPile, currentPlayerId, exposedTiles])


  // Prepare call opportunity data for modal
  const callOpportunityData = useMemo(() => {
    const opportunity = turnSelectors.currentCallOpportunity
    if (!opportunity || !opportunity.isActive) return null

    // Get the discarding player name (assuming it's from the previous player in turn order)
    const players = roomStore.players
    const currentIndex = players.findIndex(p => p.id === currentPlayerId)
    const previousIndex = currentIndex > 0 ? currentIndex - 1 : players.length - 1
    const discardingPlayer = players[previousIndex]?.name || 'Previous Player'

    return {
      tile: opportunity.tile,
      discardingPlayer,
      duration: opportunity.duration,
      deadline: opportunity.deadline.getTime()
    }
  }, [turnSelectors.currentCallOpportunity])



  // Handle call decision
  const handleCallDecision = useCallback((decision: 'call' | 'pass') => {
    if (callTimeoutId) {
      clearTimeout(callTimeoutId)
      setCallTimeoutId(null)
    }

    setShowCallDialog(false)
    setCallOpportunities([])

    if (decision === 'call' && callOpportunities.length > 0) {
      const opportunity = callOpportunities[0]

      setExposedTiles(prev => [...prev, {
        type: opportunity.callType,
        tiles: opportunity.exposedTiles,
        timestamp: new Date()
      }])

      const callPlayerId = gameStore.currentPlayerId || 'player-1'
      setPlayerExposedCount(prev => ({
        ...prev,
        [callPlayerId]: prev[callPlayerId] + 1
      }))

      setGameHistory(prev => [
        {
          playerId: callPlayerId,
          action: 'call',
          callType: opportunity.callType,
          exposedTiles: opportunity.exposedTiles,
          timestamp: new Date()
        },
        ...prev
      ])

      // Call accepted
    } else {
      // Call passed
    }
  }, [gameStore.currentPlayerId, callOpportunities, callTimeoutId])

  // Simulate other players' turns
  const simulateOtherPlayerTurn = useCallback(() => {
    const nextPlayerIndex = (currentPlayerIndex + 1) % 4
    // const nextPlayerName = playerNames[nextPlayerIndex] // Not used

    setGameHistory(prev => [
      {
        playerId: `player-${nextPlayerIndex + 1}`,
        action: Math.random() > 0.7 ? 'call' : 'discard',
        tile: {
          id: `simulated-${Date.now()}`,
          suit: 'dots',
          value: (Math.floor(Math.random() * 9) + 1).toString() as Tile['value'],
          displayName: `Simulated Tile`
        },
        timestamp: new Date()
      },
      ...prev
    ])

    setCurrentPlayerIndex(nextPlayerIndex)

    setTimeout(() => {
      if (showCallDialog) {
        setCurrentPlayerIndex((currentPlayerIndex + 1) % 4)
      }

      const isOurTurnNext = currentPlayerIndex === 3
      if (currentPlayerIndex < 3 && playerNames[currentPlayerIndex + 1] && !showCallDialog) {
        // Next player's turn

        setTimeout(() => {
          if (!gameEnded) {
            simulateOtherPlayerTurn()
          }
        }, 2000)
      } else if (isOurTurnNext) {
        // Back to your turn
        setGameEnded(true)

        if (onNavigateToPostGame) {
          setTimeout(() => {
            onNavigateToPostGame()
          }, 1000)
        }
      }
    }, 1500)
  }, [currentPlayerIndex, playerNames, showCallDialog, gameEnded, onNavigateToPostGame])

  // Final Hand Reveal handlers
  const handleCloseFinalHandReveal = useCallback(() => {
    setShowFinalHandReveal(false)
  }, [])

  const handleContinueToPostGame = useCallback(() => {
    setShowFinalHandReveal(false)
    
    // Pass the completed game ID for seamless navigation
    if (completedGameId && onNavigateToPostGame) {
      // If we have the game ID, pass it to the navigation handler
      if (typeof onNavigateToPostGame === 'function') {
        onNavigateToPostGame(completedGameId)
      }
    } else {
      onNavigateToPostGame?.()
    }
  }, [onNavigateToPostGame, completedGameId])


  const handlePauseGame = useCallback(() => {
    setIsPaused(!isPaused)
  }, [isPaused])

  // Dev shortcut functions
  const handleSkipToGameplay = useCallback(() => {
    // Set game phase to playing
    gameStore.setGamePhase('playing')

    // Initialize turn system when skipping Charleston
    if (!gameStore.currentPlayerId) {
      gameStore.setCurrentPlayer(currentPlayerId)
      gameStore.startTurn()
    }
  }, [gameStore, currentPlayerId])

  const handleResetGame = useCallback(() => {
    // Reset all stores and navigate back to setup
    roomSetupStore.resetToStart()
    gameStore.resetGame()
    tileStore.clearHand()
    patternStore.clearSelection()
    intelligenceStore.clearAnalysis()
    charlestonStore.reset()
    navigate('/room-setup')
  }, [roomSetupStore, gameStore, tileStore, patternStore, intelligenceStore, charlestonStore, navigate])

  // Advance from Charleston to Gameplay phase
  const handleAdvanceToGameplay = useCallback(() => {
    gameStore.setGamePhase('playing')
  }, [gameStore])

  // Handle Charleston tile passing
  const handleCharlestonPass = useCallback(() => {
    const selectedTiles = tileStore.selectedForAction
    if (selectedTiles.length !== 3) {
      console.warn('Must select exactly 3 tiles for Charleston')
      return
    }
    
    // In solo mode, remove passed tiles and prompt user to input received tiles
    if (roomSetupStore.coPilotMode === 'solo') {
      // Remove selected tiles from hand (tiles passed out)
      selectedTiles.forEach(tile => {
        tileStore.removeTile(tile.instanceId)
      })
      
      // Clear selection
      tileStore.clearSelection()
      
      // Complete the current Charleston phase
      charlestonStore.completePhase()

      // Advance the turn counter for Charleston progression
      gameStore.incrementTurn()

      // Show alert prompting user to input the tiles they received
      const currentPhase = charlestonStore.currentPhase
      const isCharlestonComplete = currentPhase === 'complete'

      if (isCharlestonComplete) {
        gameStore.addAlert({
          type: 'info',
          title: 'Charleston Complete!',
          message: 'Charleston is complete! Moving to gameplay phase.'
        })
      } else {
        // Show tile input modal for receiving tiles
        setShowCharlestonModal(true)
      }
      
      // If Charleston is complete, advance to gameplay phase
      if (isCharlestonComplete) {
        setTimeout(() => {
          handleAdvanceToGameplay()
        }, 1500) // Give user time to read the completion message
      }
      
    } else {
      // Navigate to Charleston phase for multiplayer
      if (onNavigateToCharleston) {
        onNavigateToCharleston()
      }
    }
  }, [tileStore, roomSetupStore.coPilotMode, gameStore, onNavigateToCharleston, charlestonStore, handleAdvanceToGameplay])

  // Handle receiving tiles in Charleston
  const handleCharlestonTilesReceived = useCallback((tileIds: string[]) => {
    // Add received tiles to hand
    tileIds.forEach(tileId => {
      const playerTile = tileService.createPlayerTile(tileId)
      if (playerTile) {
        tileStore.addTile(playerTile.id)
      }
    })

    // Close modal
    setShowCharlestonModal(false)

    // Trigger analysis with the new hand
    const playerHand = tileStore.playerHand
    if (playerHand.length >= 10) {
      intelligenceStore.analyzeHand(playerHand, selectedPatterns)
    }

    // Continue to next Charleston phase or complete Charleston
    const currentPhase = charlestonStore.currentPhase
    if (currentPhase === 'complete') {
      // Charleston is complete, advance to gameplay
      setTimeout(() => {
        handleAdvanceToGameplay()
      }, 1000)
    } else {
      // Generate new recommendations for the next Charleston phase
      setTimeout(() => {
        charlestonStore.generateRecommendations()
      }, 500)
    }
  }, [tileStore, charlestonStore, handleAdvanceToGameplay, intelligenceStore, selectedPatterns])

  const findAlternativePatterns = useCallback(() => {
    if (!currentAnalysis || !currentAnalysis.bestPatterns) return

    const availablePatterns = currentAnalysis.bestPatterns
      .filter(p => p.completionPercentage > 15)
      .filter(p => !selectedPatterns.some(sp => sp.id === p.patternId))
      .slice(0, 5)
    
    setAlternativePatterns(availablePatterns)
    setShowPatternSwitcher(true)
  }, [currentAnalysis, selectedPatterns])

  const handlePatternSwitch = useCallback((newPatternId: string) => {
    const patternStore = usePatternStore.getState()
    
    if (selectedPatterns.length > 0 && currentAnalysis && currentAnalysis.bestPatterns) {
      const leastViable = selectedPatterns.reduce((min, pattern) => {
        const currentProgress = currentAnalysis.bestPatterns?.find(p => p.patternId === pattern.id)?.completionPercentage || 0
        const minProgress = currentAnalysis.bestPatterns?.find(p => p.patternId === min.id)?.completionPercentage || 0
        return currentProgress < minProgress ? pattern : min
      })
      
      patternStore.removeTargetPattern(leastViable.id)
    }
    
    patternStore.addTargetPattern(newPatternId)
    setShowPatternSwitcher(false)
    
    setTimeout(() => analyzeCurrentHand(), 100)
    
    // Switched to alternative pattern
  }, [selectedPatterns, currentAnalysis, analyzeCurrentHand])

  if (gameEnded) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="p-8 text-center bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="text-6xl mb-4">🏆</div>
          <h1 className="text-3xl font-bold text-green-600 mb-2">Mahjong!</h1>
          <p className="text-lg text-gray-600 mb-6">Congratulations! You've won the game!</p>
          <div className="space-x-4">
            <Button onClick={() => onNavigateToPostGame?.()}>
              View Analysis
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Play Again
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <>
      <DevShortcuts
        variant={gameStore.gamePhase === 'charleston' ? 'charleston' : 'gameplay'}
        onSkipToGameplay={gameStore.gamePhase === 'charleston' ? handleSkipToGameplay : undefined}
        onResetGame={handleResetGame}
      />
      <GameScreenLayout
        gamePhase={gameStore.gamePhase === 'charleston' ? 'charleston' : 'gameplay'}
        currentPlayer={currentPlayer}
        timeElapsed={elapsedTime}
        playerNames={playerNames}
        windRound={windRound}
        gameRound={gameRound}
        selectedPatternsCount={selectedPatterns.length}
        findAlternativePatterns={findAlternativePatterns}
        onNavigateToCharleston={onNavigateToCharleston}
        onPauseGame={handlePauseGame}
        isPaused={isPaused}
        currentHand={currentHand.map((tile, index) => ({
          ...tile,
          instanceId: ('instanceId' in tile ? tile.instanceId : `${tile.id || 'tile'}-${index}`) as string,
          isSelected: false
        } as PlayerTile))}
        lastDrawnTile={lastDrawnTile}
        exposedTiles={exposedTiles}
        selectedDiscardTile={selectedDiscardTile}
        isMyTurn={isMyTurn}
        isAnalyzing={isAnalyzing}
        handleDrawTile={handleDrawTile}
        handleDiscardTile={handleDiscardTile}
        onAdvanceToGameplay={handleAdvanceToGameplay}
        discardPile={discardPile}
        currentPlayerIndex={currentPlayerIndex}
        playerExposedCount={playerExposedCount}
        gameHistory={gameHistory}
        currentAnalysis={currentAnalysis}
        wallCount={turnSelectors.wallCount}
        onSwapJoker={handleSwapJoker}
        onDeadHand={handleDeadHand}
      />

      {/* Call Dialog */}
      {showCallDialog && callOpportunities.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="p-6 max-w-md w-full">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-gray-800 mb-2">Call Opportunity!</h3>
              <p className="text-sm text-gray-600">
                {callOpportunities[0].reasoning}
              </p>
            </div>
            
            <div className="flex gap-2 mb-4 justify-center">
              {callOpportunities[0].exposedTiles.map((tile, index) => (
                <AnimatedTile
                  key={index}
                  tile={{...tile, instanceId: `${tile.id}-${index}`, isSelected: false}}
                  size="sm"
                  className="pointer-events-none"
                  context="gameplay"
                />
              ))}
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => handleCallDecision('pass')}
              >
                Pass
              </Button>
              <Button 
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => handleCallDecision('call')}
              >
                Call {callOpportunities[0].callType}!
              </Button>
            </div>
            
            <div className="text-xs text-gray-500 text-center mt-2">
              Auto-pass in 5 seconds...
            </div>
          </Card>
        </div>
      )}

      {/* Enhanced Intelligence Panel - Compact Bottom Sheet */}
      {showEnhancedIntelligence && gameStore.gamePhase !== 'charleston' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-purple-200 max-h-[60vh] overflow-y-auto z-40 shadow-xl">
          <div className="max-w-4xl mx-auto">
            <EnhancedIntelligencePanel
              analysis={enhancedAnalysis || currentAnalysis}
              gameState={gameState}
              playerId={currentPlayerId}
              isCurrentTurn={isMyTurn}
              callOpportunity={callOpportunityEnhanced}
              onClose={() => setShowEnhancedIntelligence(false)}
              onActionRecommendation={handleActionRecommendation}
            />
          </div>
        </div>
      )}

      {/* Call Opportunity Overlay */}
      {callOpportunityEnhanced && enhancedAnalysis?.currentCallRecommendation && (
        <CallOpportunityOverlay
          opportunity={callOpportunityEnhanced}
          recommendation={enhancedAnalysis.currentCallRecommendation}
          onAction={handleActionRecommendation}
        />
      )}

      {/* Intelligence Toggle Button - Hidden during Charleston */}
      {gameStore.gamePhase !== 'charleston' && (
        <button 
          className="fixed bottom-4 right-4 bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg z-30 transition-all"
          onClick={() => setShowEnhancedIntelligence(!showEnhancedIntelligence)}
          title="AI Assistant"
        >
          <span className="text-xl">🧠</span>
        </button>
      )}

      {/* Pattern Switcher Modal */}
      {showPatternSwitcher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="p-6 max-w-2xl w-full max-h-96 overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-800 mb-4">🔄 Alternative Patterns</h3>
            
            <div className="space-y-3 mb-6">
              {alternativePatterns.map((pattern, index) => (
                <div 
                  key={index}
                  className="p-3 border rounded-lg cursor-pointer hover:bg-blue-50 transition-colors"
                  onClick={() => handlePatternSwitch(pattern.patternId)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{pattern.patternId}</div>
                      <div className="text-sm text-gray-600">{pattern.difficulty} difficulty</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-blue-600">
                        {pattern.completionPercentage}% complete
                      </div>
                      <div className="text-xs text-gray-500">
                        {pattern.tilesNeeded || 0} tiles needed
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <p className="text-sm text-gray-500">
                Current patterns: {selectedPatterns.map(p => p.displayName).join(', ')}
              </p>
              <Button 
                variant="outline"
                onClick={() => setShowPatternSwitcher(false)}
              >
                Keep Current Strategy
              </Button>
            </div>
          </Card>
        </div>
      )}
      

      {/* Wall Exhaustion Warning */}
      {wallExhaustionWarning && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-40">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded-lg shadow-lg">
            <div className="flex items-center space-x-2">
              <span className="text-lg">⚠️</span>
              <span className="font-medium">{wallExhaustionWarning}</span>
            </div>
          </div>
        </div>
      )}

      {/* Call Opportunity Modal */}
      {callOpportunityData && (
        <CallOpportunityModal
          opportunity={callOpportunityData}
          onRespond={handleCallOpportunityResponse}
        />
      )}

      {/* Mahjong Declaration Modal */}
      <MahjongDeclarationModal
        isOpen={showMahjongModal}
        onClose={() => setShowMahjongModal(false)}
        onConfirm={handleMahjongConfirmation}
        playerHand={currentHand.map((tile, index) => ({
          ...tile,
          instanceId: ('instanceId' in tile ? tile.instanceId : `${tile.id || 'unknown'}-${index}-${Date.now()}`) as string,
          isSelected: false
        } as PlayerTile))}
        exposedTiles={exposedTiles.flatMap(group => group.tiles.map((tile, index) => ({
          ...tile,
          instanceId: ('instanceId' in tile ? tile.instanceId : `${tile.id || 'exposed'}-${index}-${Date.now()}`) as string,
          isSelected: false
        } as PlayerTile)))}
        selectedPatterns={selectedPatterns.map(pattern => ({
          Year: 2025,
          Section: pattern.section,
          Line: pattern.line,
          'Pattern ID': pattern.patternId,
          Hands_Key: pattern.id,
          Hand_Pattern: pattern.pattern,
          Hand_Description: pattern.displayName,
          Hand_Points: pattern.points,
          Hand_Conceiled: pattern.concealed,
          Hand_Difficulty: pattern.difficulty,
          Hand_Notes: null,
          Groups: pattern.groups || []
        }))}
        playerId={currentPlayerId}
        gameContext={gameContext}
      />

      {/* Final Hand Reveal Modal */}
      {finalHandRevealData && (
        <FinalHandRevealModal
          isOpen={showFinalHandReveal}
          onClose={handleCloseFinalHandReveal}
          data={finalHandRevealData}
          onContinueToPostGame={handleContinueToPostGame}
        />
      )}

      {/* Charleston Tile Input Modal */}
      <TileInputModal
        isOpen={showCharlestonModal}
        onClose={() => setShowCharlestonModal(false)}
        onConfirm={handleCharlestonTilesReceived}
        mode="receive"
        requiredCount={3}
        context="charleston"
      />

      {/* Selection Area - Fixed overlay for tile actions */}
      <SelectionArea 
        onAdvanceToGameplay={handleAdvanceToGameplay} 
        onCharlestonPass={handleCharlestonPass}
        onPass={gameStore.gamePhase === 'charleston' ? handleCharlestonPass : undefined}
        isReadyToPass={gameStore.gamePhase === 'charleston' ? false : undefined}
        allPlayersReady={gameStore.gamePhase === 'charleston' ? false : undefined}
      />
    </>
  )
}