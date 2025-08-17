// Game Mode View - Core gameplay interface with real-time co-pilot assistance
// Handles draw/discard mechanics, call evaluation, and continuous pattern analysis

import React, { useState, useEffect, useCallback } from 'react'
import { useGameStore } from '../../stores/game-store'
import { usePatternStore } from '../../stores/pattern-store'
import { useIntelligenceStore } from '../../stores/intelligence-store'
import { useTileStore } from '../../stores/tile-store'
import { Card } from '../../ui-components/Card'
import { Button } from '../../ui-components/Button'
import { LoadingSpinner } from '../../ui-components/LoadingSpinner'
import { AnimatedTile } from '../../ui-components/tiles/AnimatedTile'
import type { Tile as TileType } from '../../../shared/tile-utils'

interface GameModeViewProps {
  onNavigateToCharleston?: () => void
  onNavigateToPostGame?: () => void
}

type GameAction = 'draw' | 'discard' | 'call' | 'pass'
type CallType = 'pung' | 'kong' | 'quint' | 'sextet'

interface GameTurn {
  playerId: string
  action: GameAction
  tile?: TileType
  callType?: CallType
  exposedTiles?: TileType[]
  timestamp: Date
}

interface CallOpportunity {
  tile: TileType
  callType: CallType
  exposedTiles: TileType[]
  priority: 'high' | 'medium' | 'low'
  reasoning: string
  patternProgress: number
}

export const GameModeView: React.FC<GameModeViewProps> = ({
  onNavigateToCharleston,
  onNavigateToPostGame
}) => {
  // Store state
  const gameStore = useGameStore()
  const patternStore = usePatternStore()
  const intelligenceStore = useIntelligenceStore()
  const tileStore = useTileStore()

  // Local state
  const [isMyTurn, setIsMyTurn] = useState(false)
  const [lastDrawnTile, setLastDrawnTile] = useState<TileType | null>(null)
  const [selectedDiscardTile, setSelectedDiscardTile] = useState<TileType | null>(null)
  const [callOpportunities, setCallOpportunities] = useState<CallOpportunity[]>([])
  const [gameHistory, setGameHistory] = useState<GameTurn[]>([])
  const [showCallDialog, setShowCallDialog] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [gameEnded, setGameEnded] = useState(false)

  // Current hand with drawn tile
  const currentHand = useTileStore((state) => state.tiles)
  const fullHand = lastDrawnTile ? [...currentHand, lastDrawnTile] : currentHand
  const selectedPatterns = usePatternStore((state) => state.getTargetPatterns())

  // Real-time analysis
  const currentAnalysis = useIntelligenceStore((state) => state.currentAnalysis)

  // Initialize game mode
  useEffect(() => {
    gameStore.setGamePhase('playing')
    setIsMyTurn(true) // Start with current player's turn
    analyzeCurrentHand()
  }, [])

  // Analyze hand whenever it changes
  useEffect(() => {
    if (fullHand.length > 0) {
      analyzeCurrentHand()
    }
  }, [fullHand, selectedPatterns])

  // Real-time hand analysis
  const analyzeCurrentHand = useCallback(async () => {
    if (fullHand.length === 0) return

    setIsAnalyzing(true)
    try {
      // Trigger intelligence analysis
      await intelligenceStore.analyzeHand(fullHand, selectedPatterns)
    } catch (error) {
      console.error('Failed to analyze hand:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }, [fullHand, selectedPatterns, intelligenceStore])

  // Draw tile action
  const handleDrawTile = useCallback(() => {
    if (!isMyTurn || lastDrawnTile) return

    // Simulate drawing a tile (in real app, this would come from game server)
    const newTile: TileType = {
      id: `drawn-${Date.now()}`,
      suit: 'dots',
      value: Math.floor(Math.random() * 9) + 1,
      displayName: `${Math.floor(Math.random() * 9) + 1} Dots`,
      isJoker: false,
      isSelected: false,
      isRecommended: false
    }

    setLastDrawnTile(newTile)
    
    // Add to game history
    const turn: GameTurn = {
      playerId: gameStore.currentPlayerId || 'player-1',
      action: 'draw',
      tile: newTile,
      timestamp: new Date()
    }
    setGameHistory(prev => [turn, ...prev])
  }, [isMyTurn, lastDrawnTile, gameStore.currentPlayerId])

  // Discard tile action
  const handleDiscardTile = useCallback((tile: TileType) => {
    if (!isMyTurn) return

    let finalHand = [...currentHand]
    
    // Remove discarded tile from hand
    if (tile.id === lastDrawnTile?.id) {
      // Discarding the drawn tile
      setLastDrawnTile(null)
    } else {
      // Discarding from existing hand
      finalHand = finalHand.filter(t => t.id !== tile.id)
      tileStore.setTiles(finalHand)
    }

    // Add to game history
    const turn: GameTurn = {
      playerId: gameStore.currentPlayerId || 'player-1',
      action: 'discard',
      tile,
      timestamp: new Date()
    }
    setGameHistory(prev => [turn, ...prev])

    // Check for win condition
    if (checkWinCondition(finalHand)) {
      handleGameWin(finalHand)
      return
    }

    // End turn and simulate other players
    setIsMyTurn(false)
    setSelectedDiscardTile(null)
    
    // Check for call opportunities
    evaluateCallOpportunity(tile)
    
    // Simulate other players' turns
    setTimeout(() => {
      simulateOtherPlayerTurn()
    }, 2000)
  }, [isMyTurn, currentHand, lastDrawnTile, tileStore, gameStore.currentPlayerId])

  // Evaluate if discarded tile can be called
  const evaluateCallOpportunity = useCallback((discardedTile: TileType) => {
    if (!selectedPatterns.length) return

    const opportunities: CallOpportunity[] = []

    // Check for pung opportunities
    const matchingTiles = fullHand.filter(tile => 
      tile.suit === discardedTile.suit && tile.value === discardedTile.value
    )

    if (matchingTiles.length >= 2) {
      const exposedTiles = [discardedTile, ...matchingTiles.slice(0, 2)]
      opportunities.push({
        tile: discardedTile,
        callType: 'pung',
        exposedTiles,
        priority: 'medium',
        reasoning: 'Completes a pung for your target patterns',
        patternProgress: 75 // Mock calculation
      })
    }

    if (opportunities.length > 0) {
      setCallOpportunities(opportunities)
      setShowCallDialog(true)
    }
  }, [fullHand, selectedPatterns])

  // Handle call decision
  const handleCallDecision = useCallback((accept: boolean, opportunity?: CallOpportunity) => {
    setShowCallDialog(false)
    setCallOpportunities([])

    if (accept && opportunity) {
      // Add called tiles to exposed tiles
      const newHand = currentHand.filter(tile => 
        !opportunity.exposedTiles.some(exposed => exposed.id === tile.id)
      )
      tileStore.setTiles(newHand)
      
      // Add to exposed tiles (this would need exposed tiles state)
      const turn: GameTurn = {
        playerId: gameStore.currentPlayerId || 'player-1',
        action: 'call',
        tile: opportunity.tile,
        callType: opportunity.callType,
        exposedTiles: opportunity.exposedTiles,
        timestamp: new Date()
      }
      setGameHistory(prev => [turn, ...prev])

      // It's now our turn to discard
      setIsMyTurn(true)
    }
  }, [currentHand, tileStore, gameStore.currentPlayerId])

  // Simulate other players' turns
  const simulateOtherPlayerTurn = useCallback(() => {
    // Simulate other player drawing and discarding
    const otherPlayerTile: TileType = {
      id: `other-discard-${Date.now()}`,
      suit: 'characters',
      value: Math.floor(Math.random() * 9) + 1,
      displayName: `${Math.floor(Math.random() * 9) + 1} Characters`,
      isJoker: false,
      isSelected: false,
      isRecommended: false
    }

    const turn: GameTurn = {
      playerId: 'other-player',
      action: 'discard',
      tile: otherPlayerTile,
      timestamp: new Date()
    }
    setGameHistory(prev => [turn, ...prev])

    // Check if we can call this tile
    evaluateCallOpportunity(otherPlayerTile)

    // If no call, it becomes our turn
    setTimeout(() => {
      if (!showCallDialog) {
        setIsMyTurn(true)
      }
    }, 1000)
  }, [evaluateCallOpportunity, showCallDialog])

  // Check win condition
  const checkWinCondition = useCallback((hand: TileType[]): boolean => {
    // Simplified win check - in real implementation would check against selected patterns
    return hand.length === 14 && Math.random() > 0.8 // 20% chance of winning for demo
  }, [])

  // Handle game win
  const handleGameWin = useCallback((winningHand: TileType[]) => {
    setGameEnded(true)
    setIsMyTurn(false)
    
    // Could trigger post-game analysis here
    setTimeout(() => {
      if (onNavigateToPostGame) {
        onNavigateToPostGame()
      }
    }, 3000)
  }, [onNavigateToPostGame])

  // Get discard recommendation
  const getDiscardRecommendation = useCallback((): TileType | null => {
    if (!currentAnalysis?.tileRecommendations) return null
    
    const discardRec = currentAnalysis.tileRecommendations.find((rec: any) => rec.action === 'discard')
    if (!discardRec?.tiles?.[0]) return null

    return fullHand.find((tile: any) => 
      tile.suit === discardRec.tiles[0].suit && 
      tile.value === discardRec.tiles[0].value
    ) || null
  }, [currentAnalysis, fullHand])

  const recommendedDiscard = getDiscardRecommendation()

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
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Game Mode</h1>
          <p className="text-gray-600">
            {isMyTurn ? 'Your turn' : 'Waiting for other players'} • 
            Playing {selectedPatterns.length} pattern{selectedPatterns.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={onNavigateToCharleston}>
            Back to Charleston
          </Button>
          <Button variant="ghost">
            Pause Game
          </Button>
        </div>
      </div>

      {/* Current Analysis Card */}
      {currentAnalysis && (
        <Card className="p-6 mb-6 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-800">Co-Pilot Recommendation</h3>
              <p className="text-blue-600">
                {isMyTurn && lastDrawnTile 
                  ? `Recommended discard: ${recommendedDiscard?.displayName || 'Analyzing...'}`
                  : 'Analyzing hand for optimal strategy...'
                }
              </p>
            </div>
            {isAnalyzing && <LoadingSpinner size="sm" />}
          </div>
        </Card>
      )}

      {/* Game Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Turn Action */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Turn Action</h3>
          {isMyTurn ? (
            <div className="space-y-4">
              {!lastDrawnTile ? (
                <Button 
                  onClick={handleDrawTile}
                  className="w-full"
                  size="lg"
                >
                  Draw Tile
                </Button>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 mb-3">Drawn tile:</p>
                  <div className="flex justify-center mb-4">
                    <AnimatedTile
                      tile={lastDrawnTile}
                      size="lg"
                      animateOnMount
                      onClick={() => handleDiscardTile(lastDrawnTile)}
                      className="cursor-pointer hover:ring-2 hover:ring-red-400"
                    />
                  </div>
                  <Button 
                    onClick={() => lastDrawnTile && handleDiscardTile(lastDrawnTile)}
                    variant="outline"
                    className="w-full"
                  >
                    Discard Drawn Tile
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <LoadingSpinner size="sm" />
              <p className="text-gray-500 mt-2">Other players' turn</p>
            </div>
          )}
        </Card>

        {/* Pattern Progress */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Pattern Progress</h3>
          <div className="space-y-3">
            {selectedPatterns.map((pattern, index) => {
              const progress = currentAnalysis?.patternAnalysis?.find(p => p.pattern.id === pattern.id)?.completion || 0
              return (
                <div key={pattern.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 truncate">{pattern.displayName}</span>
                    <span className="font-medium">{progress.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Game Status */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Game Status</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Tiles in wall:</span>
              <span className="font-medium">52</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Turns played:</span>
              <span className="font-medium">{gameHistory.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Your tiles:</span>
              <span className="font-medium">{fullHand.length}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Current Hand */}
      <Card className="p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Your Hand</h3>
        <div className="flex flex-wrap gap-2 justify-center">
          {currentHand.map((tile, index) => (
            <AnimatedTile
              key={tile.id}
              tile={{
                ...tile,
                isRecommended: recommendedDiscard?.id === tile.id,
                isSelected: selectedDiscardTile?.id === tile.id
              }}
              size="md"
              animateOnSelect
              onClick={() => {
                if (isMyTurn && lastDrawnTile) {
                  setSelectedDiscardTile(tile)
                  handleDiscardTile(tile)
                }
              }}
              className={`cursor-pointer transition-all ${
                isMyTurn && lastDrawnTile 
                  ? 'hover:scale-105 hover:shadow-lg' 
                  : 'cursor-not-allowed opacity-75'
              }`}
              context="game"
            />
          ))}
        </div>
        {currentHand.length === 0 && (
          <p className="text-gray-500 text-center py-8">
            No tiles in hand. Start by going to Tile Input to enter your dealt tiles.
          </p>
        )}
      </Card>

      {/* Recent Discards */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Discards</h3>
        <div className="flex flex-wrap gap-2">
          {gameHistory
            .filter(turn => turn.action === 'discard')
            .slice(0, 8)
            .map((turn, index) => (
              <div key={index} className="text-center">
                <Tile tile={turn.tile!} size="sm" />
                <div className="text-xs text-gray-500 mt-1">
                  {turn.playerId === (gameStore.currentPlayerId || 'player-1') ? 'You' : 'Other'}
                </div>
              </div>
            ))}
        </div>
        {gameHistory.filter(turn => turn.action === 'discard').length === 0 && (
          <p className="text-gray-500 text-center py-4">No discards yet</p>
        )}
      </Card>

      {/* Call Opportunity Dialog */}
      {showCallDialog && callOpportunities.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Call Opportunity!</h3>
            {callOpportunities.map((opportunity, index) => (
              <div key={index} className="mb-4">
                <p className="text-gray-600 mb-2">{opportunity.reasoning}</p>
                <div className="flex gap-2 justify-center mb-3">
                  {opportunity.exposedTiles.map((tile, tileIndex) => (
                    <Tile key={tileIndex} tile={tile} size="sm" />
                  ))}
                </div>
                <p className="text-sm text-blue-600 mb-4">
                  {opportunity.callType.toUpperCase()} - {opportunity.patternProgress}% pattern completion
                </p>
              </div>
            ))}
            <div className="flex space-x-3">
              <Button 
                onClick={() => handleCallDecision(true, callOpportunities[0])}
                className="flex-1"
              >
                Call It!
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleCallDecision(false)}
                className="flex-1"
              >
                Pass
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}