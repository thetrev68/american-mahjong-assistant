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
import type { Tile as TileType } from '../../types/tile-types'
import { Tile } from '../../ui-components/Tile'

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
  const intelligenceStore = useIntelligenceStore()
  const tileStore = useTileStore()
  const selectedPatterns = usePatternStore((state) => state.getTargetPatterns())

  // Local state
  const [isMyTurn, setIsMyTurn] = useState(false)
  const [lastDrawnTile, setLastDrawnTile] = useState<TileType | null>(null)
  const [selectedDiscardTile, setSelectedDiscardTile] = useState<TileType | null>(null)
  const [callOpportunities, setCallOpportunities] = useState<CallOpportunity[]>([])
  const [gameHistory, setGameHistory] = useState<GameTurn[]>([])
  const [showCallDialog, setShowCallDialog] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [gameEnded, setGameEnded] = useState(false)
  const [callTimeoutId, setCallTimeoutId] = useState<NodeJS.Timeout | null>(null)

  // Current hand with drawn tile
  const currentHand = useTileStore((state) => state.playerHand)
  const fullHand = lastDrawnTile ? [...currentHand, lastDrawnTile] : currentHand

  // Real-time analysis
  const currentAnalysis = useIntelligenceStore((state) => state.currentAnalysis)

  // Initialize demo hand for testing
  const initializeDemoHand = useCallback(() => {
    // Create sample tiles for a realistic starting hand
    const demoTiles = [
      { id: '1D', suit: 'dots' as const, value: '1' as const, displayName: '1 Dots' },
      { id: '2D', suit: 'dots' as const, value: '2' as const, displayName: '2 Dots' },
      { id: '3D', suit: 'dots' as const, value: '3' as const, displayName: '3 Dots' },
      { id: '1B', suit: 'bams' as const, value: '1' as const, displayName: '1 Bams' },
      { id: '2B', suit: 'bams' as const, value: '2' as const, displayName: '2 Bams' },
      { id: '3B', suit: 'bams' as const, value: '3' as const, displayName: '3 Bams' },
      { id: '1C', suit: 'cracks' as const, value: '1' as const, displayName: '1 Cracks' },
      { id: '2C', suit: 'cracks' as const, value: '2' as const, displayName: '2 Cracks' },
      { id: 'east', suit: 'winds' as const, value: 'east' as const, displayName: 'East Wind' },
      { id: 'south', suit: 'winds' as const, value: 'south' as const, displayName: 'South Wind' },
      { id: 'red', suit: 'dragons' as const, value: 'red' as const, displayName: 'Red Dragon' },
      { id: 'green', suit: 'dragons' as const, value: 'green' as const, displayName: 'Green Dragon' },
      { id: 'f1', suit: 'flowers' as const, value: 'f1' as const, displayName: 'Flower 1' }
    ]
    
    // Add tiles to the tile store one by one
    demoTiles.forEach(tile => {
      tileStore.addTile(tile.id)
    })
    
    // Trigger initial analysis
    setTimeout(() => analyzeCurrentHand(), 500)
  }, [tileStore])

  // Initialize game mode
  useEffect(() => {
    gameStore.setGamePhase('playing')
    setIsMyTurn(true) // Start with current player's turn
    
    // Initialize with sample tiles if hand is empty (for demo/testing)
    if (currentHand.length === 0) {
      initializeDemoHand()
    } else {
      analyzeCurrentHand()
    }
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
      // Convert TileType to PlayerTile for analysis
      const handForAnalysis = fullHand.map((tile, index) => {
        if ('instanceId' in tile) {
          // Already a PlayerTile
          return tile as any
        }
        // Convert TileType to PlayerTile
        return {
          ...tile,
          instanceId: `${tile.id}-${index}`,
          isSelected: false
        } as any
      })
      // Trigger intelligence analysis
      await intelligenceStore.analyzeHand(handForAnalysis, selectedPatterns)
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
    const value = (Math.floor(Math.random() * 9) + 1).toString() as any
    const newTile: TileType = {
      id: `drawn-${Date.now()}`,
      suit: 'dots',
      value,
      displayName: `${value} Dots`
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

    // Remove discarded tile from hand
    if (tile.id === lastDrawnTile?.id) {
      // Discarding the drawn tile
      setLastDrawnTile(null)
    } else {
      // Discarding from existing hand - find matching PlayerTile and remove it
      const playerTileToRemove = currentHand.find(h => h.id === tile.id)
      if (playerTileToRemove && 'instanceId' in playerTileToRemove) {
        tileStore.removeTile(playerTileToRemove.instanceId)
      }
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
    const updatedHand = currentHand.filter(h => h.id !== tile.id)
    if (checkWinCondition(updatedHand)) {
      handleGameWin(updatedHand)
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
    if (!selectedPatterns.length || !isMyTurn) return

    const opportunities: CallOpportunity[] = []

    // Check for pung opportunities (need 2+ matching tiles)
    const matchingTiles = currentHand.filter((tile: any) => 
      tile.suit === discardedTile.suit && tile.value === discardedTile.value
    )

    if (matchingTiles.length >= 2) {
      const exposedTiles = [discardedTile, ...matchingTiles.slice(0, 2)]
      
      // Calculate pattern benefit
      let patternBenefit = 0
      let reasoning = 'Forms a pung'
      
      // Check if this helps any target patterns
      selectedPatterns.forEach(pattern => {
        if (pattern.groups?.some((group: any) => 
          group.tiles?.some((groupTile: any) => 
            groupTile.suit === discardedTile.suit && groupTile.value === discardedTile.value
          )
        )) {
          patternBenefit += 25
          reasoning = `Completes pung needed for ${pattern.displayName}`
        }
      })

      const priority = patternBenefit > 0 ? 'high' : matchingTiles.length >= 3 ? 'medium' : 'low'

      opportunities.push({
        tile: discardedTile,
        callType: matchingTiles.length >= 3 ? 'kong' : 'pung',
        exposedTiles,
        priority,
        reasoning,
        patternProgress: Math.min(85, 45 + patternBenefit)
      })
    }

    // Check for kong opportunities (need 3+ matching tiles)
    if (matchingTiles.length >= 3) {
      const exposedTiles = [discardedTile, ...matchingTiles.slice(0, 3)]
      opportunities.push({
        tile: discardedTile,
        callType: 'kong',
        exposedTiles,
        priority: 'high',
        reasoning: 'Forms a kong - very strong for scoring',
        patternProgress: 90
      })
    }

    if (opportunities.length > 0) {
      setCallOpportunities(opportunities)
      setShowCallDialog(true)
      
      // Auto-close after 5 seconds if no decision is made
      const timeoutId = setTimeout(() => {
        console.log('⏰ Call opportunity timed out - automatically passing')
        handleCallDecision(false)
      }, 5000)
      setCallTimeoutId(timeoutId)
      
      // Add subtle notification sound/vibration (mock for now)
      console.log('🔔 Call opportunity detected:', opportunities[0].callType, discardedTile.displayName)
    }
  }, [currentHand, selectedPatterns, isMyTurn])

  // Handle call decision
  const handleCallDecision = useCallback((accept: boolean, opportunity?: CallOpportunity) => {
    // Clear the timeout
    if (callTimeoutId) {
      clearTimeout(callTimeoutId)
      setCallTimeoutId(null)
    }
    
    setShowCallDialog(false)
    setCallOpportunities([])

    if (accept && opportunity) {
      // Add called tiles to exposed tiles
      opportunity.exposedTiles.forEach(exposedTile => {
        const playerTileToRemove = currentHand.find(h => h.id === exposedTile.id)
        if (playerTileToRemove && 'instanceId' in playerTileToRemove) {
          tileStore.removeTile(playerTileToRemove.instanceId)
        }
      })
      
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
    const value = (Math.floor(Math.random() * 9) + 1).toString() as any
    const otherPlayerTile: TileType = {
      id: `other-discard-${Date.now()}`,
      suit: 'cracks',
      value,
      displayName: `${value} Cracks`
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
  const handleGameWin = useCallback((_winningHand: any[]) => {
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
    if (!discardRec?.tileId) return null

    return fullHand.find((tile: TileType) => 
      tile.id === discardRec.tileId
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
      {(currentAnalysis || isAnalyzing) && (
        <Card className="p-6 mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">🤖 Co-Pilot Recommendation</h3>
              {isAnalyzing ? (
                <p className="text-blue-600">Analyzing your hand and target patterns...</p>
              ) : currentAnalysis ? (
                <div className="space-y-2">
                  {isMyTurn && lastDrawnTile && recommendedDiscard ? (
                    <div className="bg-white/70 rounded-lg p-3 border border-blue-200">
                      <p className="text-blue-800 font-medium">💡 Recommended Discard</p>
                      <p className="text-blue-600">
                        <span className="font-semibold">{recommendedDiscard.displayName}</span>
                        {currentAnalysis.tileRecommendations?.find(r => r.tileId === recommendedDiscard.id)?.reasoning && (
                          <span className="text-sm block mt-1">
                            {currentAnalysis.tileRecommendations.find(r => r.tileId === recommendedDiscard.id)?.reasoning}
                          </span>
                        )}
                      </p>
                    </div>
                  ) : (
                    <p className="text-blue-600">
                      Hand analyzed • {currentAnalysis.bestPatterns?.length || 0} viable patterns found
                    </p>
                  )}
                  {currentAnalysis.strategicAdvice && currentAnalysis.strategicAdvice.length > 0 && (
                    <p className="text-sm text-blue-500 italic">
                      "{currentAnalysis.strategicAdvice[0]}"
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-blue-600">Ready to analyze your next move...</p>
              )}
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
                      tile={{
                        ...lastDrawnTile!,
                        instanceId: `drawn-${lastDrawnTile!.id}`,
                        isSelected: false
                      }}
                      size="lg"
                      animateOnMount
                      onClick={() => lastDrawnTile && handleDiscardTile(lastDrawnTile)}
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
            {selectedPatterns.map((pattern) => {
              const progress = currentAnalysis?.bestPatterns?.find(p => p.patternId === pattern.id)?.completionPercentage || 0
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
          {currentHand.map((tile: any) => (
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
              } ${
                recommendedDiscard?.id === tile.id 
                  ? 'ring-2 ring-blue-400 ring-opacity-60 bg-blue-50' 
                  : ''
              }`}
              context="gameplay"
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
                <Tile 
                  tile={{
                    ...turn.tile!,
                    instanceId: `discard-${turn.tile!.id}`,
                    isSelected: false
                  }} 
                  size="sm" 
                />
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
          <Card className="p-6 max-w-lg w-full mx-4 animate-slideUp">
            <div className="flex items-center mb-4">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse mr-3"></div>
              <h3 className="text-xl font-bold text-gray-900">🔔 Call Opportunity</h3>
            </div>
            
            {callOpportunities.map((opportunity, index) => (
              <div key={index} className="mb-6">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      opportunity.priority === 'high' ? 'bg-green-100 text-green-800' :
                      opportunity.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {opportunity.priority.toUpperCase()} PRIORITY
                    </span>
                    <span className="text-lg font-bold text-blue-600">
                      {opportunity.callType.toUpperCase()}
                    </span>
                  </div>
                  
                  <p className="text-gray-700 mb-3 font-medium">{opportunity.reasoning}</p>
                  
                  <div className="flex gap-2 justify-center mb-3 bg-white rounded-lg p-3">
                    {opportunity.exposedTiles.map((tile, tileIndex) => (
                      <Tile 
                        key={tileIndex} 
                        tile={{
                          ...tile,
                          instanceId: `call-${tile.id}-${tileIndex}`,
                          isSelected: false
                        }} 
                        size="md" 
                      />
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-600 font-medium">
                      Pattern Progress: {opportunity.patternProgress}%
                    </span>
                    <span className="text-gray-500">
                      Will expose these tiles
                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="flex space-x-3">
              <Button 
                onClick={() => handleCallDecision(true, callOpportunities[0])}
                className="flex-1 bg-green-600 hover:bg-green-700"
                size="lg"
              >
                ✅ Call It!
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleCallDecision(false)}
                className="flex-1 border-gray-300 hover:bg-gray-50"
                size="lg"
              >
                ❌ Pass
              </Button>
            </div>
            
            <p className="text-xs text-gray-500 text-center mt-3">
              You have 5 seconds to decide...
            </p>
          </Card>
        </div>
      )}
    </div>
  )
}