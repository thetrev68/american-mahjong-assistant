// Game Mode View - Core gameplay interface with real-time co-pilot assistance
// Handles draw/discard mechanics, call evaluation, and continuous pattern analysis

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useGameStore } from '../../stores/game-store'
import { useRoomStore } from '../../stores/room-store'
import { usePatternStore } from '../../stores/pattern-store'
import { useIntelligenceStore } from '../../stores/intelligence-store'
import { useTileStore } from '../../stores/tile-store'
import { useTurnStore, useTurnSelectors } from '../../stores/turn-store'
import { useGameActions } from '../../services/game-actions'
import { Card } from '../../ui-components/Card'
import { Button } from '../../ui-components/Button'
import { AnimatedTile } from '../../ui-components/tiles/AnimatedTile'
import GameActionsPanel from '../../ui-components/GameActionsPanel'
import CallOpportunityModal from '../../ui-components/CallOpportunityModal'
import type { Tile as TileType } from '../../types/tile-types'
import type { PatternGroup } from '../../../../shared/nmjl-types'
import type { GameAction, CallType } from '../../services/game-actions'
import GameScreenLayout from './GameScreenLayout'
import { SelectionArea } from './SelectionArea'

interface GameModeViewProps {
  onNavigateToCharleston?: () => void
  onNavigateToPostGame?: () => void
}

interface GameTurn {
  playerId: string
  action: GameAction
  tile?: TileType
  callType?: CallType
  exposedTiles?: TileType[]
  timestamp: Date
}

export const GameModeView: React.FC<GameModeViewProps> = ({
  onNavigateToCharleston,
  onNavigateToPostGame
}) => {
  // Store state
  const gameStore = useGameStore()
  const roomStore = useRoomStore()
  const intelligenceStore = useIntelligenceStore()
  const patternStore = usePatternStore()
  const tileStore = useTileStore()
  const turnStore = useTurnStore()
  const turnSelectors = useTurnSelectors()
  const gameActions = useGameActions()
  
  // Initialize game phase - start with Charleston when first entering from tile input
  useEffect(() => {
    if (gameStore.gamePhase === 'tile-input') {
      gameStore.setGamePhase('charleston')
    }
  }, [gameStore.gamePhase, gameStore.setGamePhase])

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

  // Helper function to check if a tile matches a pattern group
  const checkTileMatchesPatternGroup = useCallback((tileId: string, group: PatternGroup) => {
    const constraintValues = group.Constraint_Values || ''

    // Basic matching logic based on constraint values
    if (constraintValues === 'flower' && tileId.startsWith('f')) return true
    if (constraintValues === 'joker' && tileId === 'joker') return true
    
    // For numeric constraints, check if tile matches
    const values: string[] = constraintValues.split(',').map((v: string) => v.trim())
    for (const value of values) {
      if (value === '0') continue // Skip neutral positions
      if (tileId.startsWith(value)) return true
      if (['east', 'south', 'west', 'north', 'red', 'green', 'white'].includes(value.toLowerCase()) && 
          tileId === value.toLowerCase()) return true
    }
    
    return false
  }, [])

  // Local state - integrated with turn management
  const currentPlayerId = roomStore.currentPlayerId || 'current-player'
  const isMyTurn = turnSelectors.isMyTurn(currentPlayerId)
  const [lastDrawnTile, setLastDrawnTile] = useState<TileType | null>(null)
  const [selectedDiscardTile, setSelectedDiscardTile] = useState<TileType | null>(null)
  const [gameHistory, setGameHistory] = useState<GameTurn[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [gameEnded, setGameEnded] = useState(false)
  const [exposedTiles, setExposedTiles] = useState<Array<{
    type: 'pung' | 'kong' | 'quint' | 'sextet'
    tiles: TileType[]
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
    if (roomStore.coPilotMode === 'solo' && roomStore.otherPlayerNames.length > 0) {
      return ['You', ...roomStore.otherPlayerNames]
    }
    
    // Fallback to generic names
    return ['You', 'Right', 'Across', 'Left']
  }, [gameStore.players, roomStore.coPilotMode, roomStore.otherPlayerNames])

  // Get current player info from game store
  const currentPlayer = useMemo(() => {
    const currentPlayerId = gameStore.currentPlayerId
    if (currentPlayerId && gameStore.players.length > 0) {
      const player = gameStore.players.find(p => p.id === currentPlayerId)
      return player?.name || 'You'
    }
    return playerNames[currentPlayerIndex]
  }, [gameStore.currentPlayerId, gameStore.players, currentPlayerIndex, playerNames])
  const [gameRound] = useState(1)
  const [windRound] = useState<'east' | 'south' | 'west' | 'north'>('east')
  const [discardPile, setDiscardPile] = useState<Array<{
    tile: TileType
    playerId: string
    timestamp: Date
  }>>([])
  const [gameStartTime] = useState(new Date())
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [showPatternSwitcher, setShowPatternSwitcher] = useState(false)
  // const [showTileModal, setShowTileModal] = useState(false) // Unused for now
  const [alternativePatterns, setAlternativePatterns] = useState<Array<{ 
    patternId: string; 
    completionPercentage: number; 
    difficulty: string; 
    tilesNeeded?: number; 
    strategicValue?: number 
  }>>([])

  // Current hand with drawn tile - get real player hand from tile store
  const currentHand = useMemo(() => tileStore.playerHand || [], [tileStore.playerHand])
  const fullHand = useMemo(() => 
    lastDrawnTile ? [...currentHand, lastDrawnTile] : currentHand, 
    [currentHand, lastDrawnTile]
  )

  // Real-time analysis - get actual analysis from intelligence store
  const currentAnalysis = intelligenceStore.currentAnalysis

  // Real-time hand analysis
  const analyzeCurrentHand = useCallback(async () => {
    if (fullHand.length === 0) return

    setIsAnalyzing(true)
    
    const handForAnalysis = fullHand.map((tile, index) => {
      if ('instanceId' in tile) {
        return tile as TileType & { instanceId: string; isSelected: boolean }
      }
      return {
        ...tile,
        instanceId: `${tile.id}-${index}`,
        isSelected: false
      } as TileType & { instanceId: string; isSelected: boolean }
    })
    
    // Hand analysis initiated
    
    // Trigger intelligence analysis - errors are handled by intelligence store
    await intelligenceStore.analyzeHand(handForAnalysis, selectedPatterns)
    setIsAnalyzing(false)
  }, [fullHand, selectedPatterns, exposedTiles, intelligenceStore])

  // Initialize game mode
  useEffect(() => {
    // GameModeView initialized
    setIsMyTurn(true)
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

  // Draw tile action
  // Enhanced action handlers using game actions service
  const handlePlayerAction = useCallback(async (action: GameAction, data?: unknown) => {
    if (!isMyTurn && action !== 'call' && action !== 'joker-swap') {
      gameStore.addAlert({
        type: 'error',
        title: 'Not Your Turn',
        message: 'Wait for your turn to take actions'
      })
      return
    }

    try {
      const success = await turnStore.executeAction(currentPlayerId, action, data)
      
      if (success) {
        // Add to game history
        const turn: GameTurn = {
          playerId: currentPlayerId,
          action,
          tile: data && typeof data === 'object' && 'id' in data ? data as TileType : undefined,
          timestamp: new Date()
        }
        setGameHistory(prev => [turn, ...prev])

        // Auto-analyze hand after actions
        const currentHand = tileStore.playerHand
        if (currentHand.length >= 10) {
          intelligenceStore.analyzeHand(currentHand, tileStore.exposedTiles)
        }

        // Handle specific action results
        if (action === 'draw') {
          setLastDrawnTile(data as TileType)
        } else if (action === 'discard') {
          setLastDrawnTile(null)
          setSelectedDiscardTile(null)
        }
      }
    } catch (error) {
      console.error('Action execution error:', error)
      gameStore.addAlert({
        type: 'error',
        title: 'Action Failed',
        message: 'Failed to execute action. Please try again.'
      })
    }
  }, [currentPlayerId, isMyTurn, turnStore, gameStore, tileStore, intelligenceStore])

  // Handle tile discard
  const handleDiscardTile = useCallback(async (tile: TileType) => {
    if (!turnSelectors.canPlayerDiscard(currentPlayerId)) {
      gameStore.addAlert({
        type: 'error',
        title: 'Cannot Discard',
        message: 'Must draw a tile before discarding'
      })
      return
    }

    await handlePlayerAction('discard', tile)
  }, [currentPlayerId, handlePlayerAction, turnSelectors, gameStore])

  // Handle call opportunity responses
  const handleCallOpportunityResponse = useCallback((response: 'call' | 'pass', callType?: CallType) => {
    if (response === 'call' && callType) {
      // TODO: This would need to get the appropriate tiles from hand
      // For now, we'll use placeholder logic
      const callTiles: TileType[] = [] // This needs to be populated based on hand analysis
      
      handlePlayerAction('call', { callType, tiles: callTiles })
    }
    
    // Close call opportunity
    turnStore.closeCallOpportunity()
  }, [handlePlayerAction, turnStore])

  // Get available actions for current player
  const currentPlayerActions = useMemo(() => {
    const playerActions = turnSelectors.getPlayerActions(currentPlayerId)
    if (!playerActions) return []

    const actions: GameAction[] = []
    
    if (isMyTurn && !playerActions.hasDrawn) {
      actions.push('draw')
    }
    if (isMyTurn && playerActions.hasDrawn) {
      actions.push('discard', 'mahjong')  
    }
    if (!isMyTurn && turnSelectors.hasCallOpportunity()) {
      actions.push('call')
    }
    
    // Always available actions
    actions.push('joker-swap', 'pass-out')
    
    return actions
  }, [currentPlayerId, isMyTurn, turnSelectors])

  // Prepare call opportunity data for modal
  const callOpportunityData = useMemo(() => {
    const opportunity = turnSelectors.currentCallOpportunity
    if (!opportunity || !opportunity.isActive) return null

    return {
      tile: opportunity.tile,
      discardingPlayer: 'Other Player', // TODO: Get actual discarding player name
      duration: opportunity.duration,
      deadline: opportunity.deadline.getTime()
    }
  }, [turnSelectors.currentCallOpportunity])

  // Evaluate call opportunities (pung, kong, etc.)
  const evaluateCallOpportunities = useCallback((discardedTile: TileType) => {
    if (!currentHand || selectedPatterns.length === 0) return

    const opportunities: CallOpportunity[] = []
    
    selectedPatterns.forEach(pattern => {
      if (pattern.groups) {
        pattern.groups.forEach(group => {
          // Check if discarded tile matches this group's constraints
          const tileMatchesGroup = checkTileMatchesPatternGroup(discardedTile.id, group)
          if (tileMatchesGroup) {
            // Count how many tiles we have that match this group
            const matchingTilesInHand = currentHand.filter(tile => 
              checkTileMatchesPatternGroup(tile.id, group)
            )
            
            if (matchingTilesInHand.length >= 2) {
              opportunities.push({
                tile: discardedTile,
                callType: matchingTilesInHand.length === 2 ? 'pung' : 'kong',
                exposedTiles: [...matchingTilesInHand, discardedTile],
                priority: matchingTilesInHand.length === 3 ? 'high' : 'medium',
                reasoning: `Complete ${group.Constraint_Type} group for ${pattern.displayName}`,
                patternProgress: 75
              })
            }
          }
        })
      }
    })

    if (opportunities.length > 0) {
      setCallOpportunities(opportunities)
      setShowCallDialog(true)
      
      const timeoutId = setTimeout(() => {
        // Call timeout - automatically passing
        setShowCallDialog(false)
        setCallOpportunities([])
      }, 5000)
      
      setCallTimeoutId(timeoutId)
    }

    // Call opportunities evaluated
  }, [currentHand, selectedPatterns, checkTileMatchesPatternGroup])

  // Discard tile action
  const handleDiscardTile = useCallback((tile: TileType) => {
    if (!isMyTurn) return

    if (lastDrawnTile && tile.id === lastDrawnTile.id) {
      setLastDrawnTile(null)
    }

    const turn: GameTurn = {
      playerId: gameStore.currentPlayerId || 'player-1',
      action: 'discard',
      tile,
      timestamp: new Date()
    }
    setGameHistory(prev => [turn, ...prev])
    setDiscardPile(prev => [...prev, {
      tile,
      playerId: gameStore.currentPlayerId || 'player-1',
      timestamp: new Date()
    }])

    setIsMyTurn(false)
    setSelectedDiscardTile(null)

    // Tile discarded

    setTimeout(() => {
      if (isMyTurn && currentHand.length > 0 && lastDrawnTile && gameStore.currentPlayerId && selectedPatterns.length > 0) {
        evaluateCallOpportunities(tile)
      }
    }, 500)
  }, [isMyTurn, lastDrawnTile, gameStore.currentPlayerId, selectedPatterns, currentHand, evaluateCallOpportunities])

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

      const currentPlayerId = gameStore.currentPlayerId || 'player-1'
      setPlayerExposedCount(prev => ({
        ...prev,
        [currentPlayerId]: prev[currentPlayerId] + 1
      }))

      setGameHistory(prev => [
        {
          playerId: currentPlayerId,
          action: 'call',
          callType: opportunity.callType,
          exposedTiles: opportunity.exposedTiles,
          timestamp: new Date()
        },
        ...prev
      ])

      setIsMyTurn(true)

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
          value: (Math.floor(Math.random() * 9) + 1).toString() as TileType['value'],
          displayName: `Simulated Tile`
        },
        timestamp: new Date()
      },
      ...prev
    ])

    setCurrentPlayerIndex(nextPlayerIndex)

    setTimeout(() => {
      if (showCallDialog) {
        setIsMyTurn(false)
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
        setIsMyTurn(false)

        if (onNavigateToPostGame) {
          setTimeout(() => {
            onNavigateToPostGame()
          }, 1000)
        }
      }
    }, 1500)
  }, [currentPlayerIndex, playerNames, showCallDialog, gameEnded, onNavigateToPostGame])


  const handlePauseGame = useCallback(() => {
    setIsPaused(!isPaused)
  }, [isPaused])

  // Handle Charleston pass - show tile modal for receiving tiles
  const handleCharlestonPass = useCallback(() => {
    // setShowTileModal(true) // Commented out - unused for now
  }, [])
  
  // Advance from Charleston to Gameplay phase
  const handleAdvanceToGameplay = useCallback(() => {
    gameStore.setGamePhase('playing')
  }, [gameStore])

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
            <Button onClick={onNavigateToPostGame}>
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
        currentHand={currentHand}
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
                  tile={{...tile, instanceId: tile.id, isSelected: false}}
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
      
      {/* Game Actions Panel */}
      <div className="fixed bottom-4 left-4 right-4 z-30">
        <GameActionsPanel
          availableActions={currentPlayerActions}
          onAction={handlePlayerAction}
          isMyTurn={isMyTurn}
          currentPlayer={turnSelectors.currentPlayerName}
          wallCount={turnSelectors.wallCount}
          turnDuration={turnSelectors.turnDuration}
        />
      </div>

      {/* Call Opportunity Modal */}
      {callOpportunityData && (
        <CallOpportunityModal
          opportunity={callOpportunityData}
          onRespond={handleCallOpportunityResponse}
        />
      )}

      {/* Selection Area - Fixed overlay for tile actions */}
      <SelectionArea onAdvanceToGameplay={handleAdvanceToGameplay} onCharlestonPass={handleCharlestonPass} />
    </>
  )
}