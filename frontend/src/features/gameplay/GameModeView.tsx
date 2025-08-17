// Game Mode View - Core gameplay interface with real-time co-pilot assistance
// Handles draw/discard mechanics, call evaluation, and continuous pattern analysis

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useGameStore } from '../../stores/game-store'
import { usePatternStore } from '../../stores/pattern-store'
import { useIntelligenceStore } from '../../stores/intelligence-store'
import { Card } from '../../ui-components/Card'
import { Button } from '../../ui-components/Button'
import { LoadingSpinner } from '../../ui-components/LoadingSpinner'
import { AnimatedTile } from '../../ui-components/tiles/AnimatedTile'
import type { Tile as TileType } from '../../types/tile-types'

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
  // Store state - simplified to avoid infinite loops
  const gameStore = useGameStore()
  const intelligenceStore = useIntelligenceStore()
  // const tileStore = useTileStore()
  
  // Temporarily hardcode empty array to avoid store selector issues
  const selectedPatterns = useMemo(() => [] as Array<{ 
    id: string; 
    displayName: string; 
    difficulty: string; 
    groups?: Array<{ tiles?: TileType[] }> 
  }>, [])

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
  const [playerNames] = useState(['You', 'Right', 'Across', 'Left'])
  const [gameRound] = useState(1)
  const [windRound] = useState<'east' | 'south' | 'west' | 'north'>('east')
  const [showPatternSwitcher, setShowPatternSwitcher] = useState(false)
  const [alternativePatterns, setAlternativePatterns] = useState<Array<{ 
    patternId: string; 
    completionPercentage: number; 
    difficulty: string; 
    tilesNeeded?: number; 
    strategicValue?: number 
  }>>([])

  // Current hand with drawn tile - simplified
  const currentHand = useMemo(() => [] as TileType[], [])
  const fullHand = useMemo(() => 
    lastDrawnTile ? [...currentHand, lastDrawnTile] : currentHand, 
    [currentHand, lastDrawnTile]
  )

  // Real-time analysis - simplified
  const currentAnalysis = null as {
    tileRecommendations?: Array<{ action: string; tileId?: string; reasoning?: string }>;
    bestPatterns?: Array<{ patternId: string; completionPercentage: number; difficulty: string; tilesNeeded?: number }>;
    strategicAdvice?: string[];
  } | null

  // Initialize game mode
  useEffect(() => {
    console.log('🎮 GameModeView initialized - basic demo mode')
    setIsMyTurn(true)
  }, [])

  // Real-time hand analysis
  const analyzeCurrentHand = useCallback(async () => {
    if (fullHand.length === 0) return

    setIsAnalyzing(true)
    try {
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
      
      console.log('🧠 Analyzing hand:', {
        concealedTiles: handForAnalysis.length,
        exposedSets: (exposedTiles || []).length,
        targetPatterns: (selectedPatterns || []).length
      })
      
      // Trigger intelligence analysis with enhanced context
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await intelligenceStore.analyzeHand(handForAnalysis, [] as any[])
    } catch (error) {
      console.error('Failed to analyze hand:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }, [fullHand, selectedPatterns, exposedTiles, intelligenceStore])

  // Draw tile action
  const handleDrawTile = useCallback(() => {
    if (!isMyTurn || lastDrawnTile) return

    const value = (Math.floor(Math.random() * 9) + 1).toString() as TileType['value']
    const newTile: TileType = {
      id: `drawn-${Date.now()}`,
      suit: 'dots',
      value,
      displayName: `${value} Dots`
    }

    setLastDrawnTile(newTile)
    
    const turn: GameTurn = {
      playerId: gameStore.currentPlayerId || 'player-1',
      action: 'draw',
      tile: newTile,
      timestamp: new Date()
    }
    setGameHistory(prev => [turn, ...prev])
  }, [isMyTurn, lastDrawnTile, gameStore.currentPlayerId])

  // Evaluate call opportunities (pung, kong, etc.)
  const evaluateCallOpportunities = useCallback((discardedTile: TileType) => {
    if (!currentHand || selectedPatterns.length === 0) return

    const opportunities: CallOpportunity[] = []
    
    selectedPatterns.forEach(pattern => {
      if (pattern.groups) {
        pattern.groups.forEach(group => {
          if (group.tiles && group.tiles.some(t => t.id === discardedTile.id)) {
            const tilesInHand = group.tiles.filter(t => 
              currentHand.some(h => h.id === t.id)
            )
            
            if (tilesInHand.length >= 2) {
              opportunities.push({
                tile: discardedTile,
                callType: tilesInHand.length === 2 ? 'pung' : 'kong',
                exposedTiles: [...tilesInHand, discardedTile],
                priority: tilesInHand.length === 3 ? 'high' : 'medium',
                reasoning: `Complete ${group.tiles.length}-tile group for ${pattern.displayName}`,
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
        console.log('⏰ Call timeout - automatically passing')
        handleCallDecision('pass')
      }, 5000)
      
      setCallTimeoutId(timeoutId)
    }

    console.log(`🎯 Found ${opportunities.length} call opportunities for ${discardedTile.displayName}`)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentHand, selectedPatterns])

  // Discard tile action
  const handleDiscardTile = useCallback((tile: TileType) => {
    if (!isMyTurn) return

    if (lastDrawnTile && tile.id === lastDrawnTile.id) {
      setLastDrawnTile(null)
    } else {
      // const updatedHand = currentHand.filter(h => h.id !== tile.id)
      // tileStore.setPlayerHand(updatedHand)
    }

    const turn: GameTurn = {
      playerId: gameStore.currentPlayerId || 'player-1',
      action: 'discard',
      tile,
      timestamp: new Date()
    }
    setGameHistory(prev => [turn, ...prev])

    // const updatedHand = currentHand.filter(h => h.id !== tile.id)
    // tileStore.setPlayerHand(updatedHand)

    setIsMyTurn(false)
    setSelectedDiscardTile(null)

    console.log(`🗑️ Discarded ${tile.displayName}`)

    setTimeout(() => {
      if (isMyTurn && currentHand.length > 0 && lastDrawnTile && gameStore.currentPlayerId && selectedPatterns.length > 0) {
        evaluateCallOpportunities(tile)
      }
    }, 500)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMyTurn, lastDrawnTile, gameStore.currentPlayerId, selectedPatterns])

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
      // const updatedHand = currentHand.filter(h => 
      //   !opportunity.exposedTiles.some(et => et.id === h.id)
      // )
      // tileStore.setPlayerHand(updatedHand)

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

      console.log(`✅ Called ${opportunity.callType} with ${opportunity.exposedTiles.map(t => t.displayName).join(', ')}`)
    } else {
      console.log(`❌ Passed on ${callOpportunities[0]?.callType} opportunity`)
    }
  }, [gameStore.currentPlayerId, callOpportunities, callTimeoutId])

  // Simulate other players' turns
  const simulateOtherPlayerTurn = useCallback(() => {
    const nextPlayerIndex = (currentPlayerIndex + 1) % 4
    const nextPlayerName = playerNames[nextPlayerIndex]

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
        console.log(`🔄 ${nextPlayerName}'s turn - simulating...`)

        setTimeout(() => {
          if (!gameEnded) {
            simulateOtherPlayerTurn()
          }
        }, 2000)
      } else if (isOurTurnNext) {
        console.log('🟢 Back to your turn!')
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

  // Mock functions for pattern analysis
  const recommendedDiscard = useCallback(() => {
    if (!currentAnalysis || !fullHand || fullHand.length === 0) return null
    
    return currentAnalysis.tileRecommendations?.find(rec => rec.action === 'discard')
  }, [currentAnalysis, fullHand])

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
    
    console.log('🔄 Switched to alternative pattern strategy')
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
    <div className="max-w-full mx-auto p-2 sm:p-4 md:p-6 md:max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">Game Mode</h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1">
              <p className="text-sm md:text-base text-gray-600">
                {isMyTurn ? '🟢 Your turn' : `🔄 ${playerNames[currentPlayerIndex]}'s turn`} • 
                Playing {selectedPatterns.length} pattern{selectedPatterns.length !== 1 ? 's' : ''}
              </p>
              <div className="text-xs md:text-sm text-gray-500">
                {windRound.charAt(0).toUpperCase() + windRound.slice(1)} Round #{gameRound}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 sm:gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={findAlternativePatterns}
              disabled={!currentAnalysis || selectedPatterns.length === 0}
              className="text-purple-600 border-purple-300 hover:bg-purple-50"
            >
              🔄 Switch Strategy
            </Button>
            <Button variant="outline" size="sm" onClick={onNavigateToCharleston}>
              Back to Charleston
            </Button>
            <Button variant="ghost" size="sm">
              Pause Game
            </Button>
          </div>
        </div>
      </div>

      {/* Player Order Display */}
      <Card className="p-3 sm:p-4 mb-4 sm:mb-6 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">Player Order</h3>
          <div className="text-xs text-gray-500">Turn {gameHistory.length + 1}</div>
        </div>
        <div className="flex items-center justify-center gap-2 sm:gap-4 mt-2 sm:mt-3">
          {playerNames.map((name, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                currentPlayerIndex === index ? 'bg-green-500 animate-pulse' : 
                index === 0 ? 'bg-blue-500' : 'bg-gray-300'
              }`} />
              <span className={`text-xs sm:text-sm font-medium ${
                currentPlayerIndex === index ? 'text-green-600' : 
                index === 0 ? 'text-blue-600' : 'text-gray-500'
              }`}>
                {name}
              </span>
              {playerExposedCount[`player-${index + 1}`] > 0 && (
                <span className="text-xs bg-purple-100 text-purple-600 px-1 rounded">
                  {playerExposedCount[`player-${index + 1}`]} sets
                </span>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Main Game Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {/* Current Hand */}
        <Card className="p-4 md:col-span-2 xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Your Hand</h3>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={handleDrawTile}
                disabled={!isMyTurn || !!lastDrawnTile}
                className="bg-green-600 hover:bg-green-700"
              >
                🎲 Draw Tile
              </Button>
              {isAnalyzing && <LoadingSpinner size="sm" />}
            </div>
          </div>
          
          <div className="space-y-4">
            {/* Concealed Hand */}
            <div>
              <div className="text-sm text-gray-600 mb-2">Concealed ({currentHand.length} tiles)</div>
              <div className="flex flex-wrap gap-1 sm:gap-2 p-3 bg-gray-50 rounded-lg min-h-16">
                {currentHand.length > 0 ? currentHand.map((tile) => (
                  <AnimatedTile
                    key={tile.id}
                    tile={{...tile, instanceId: tile.id, isSelected: selectedDiscardTile?.id === tile.id}}
                    size="sm"
                    onClick={() => isMyTurn && handleDiscardTile(tile)}
                    className={`cursor-pointer hover:scale-105 transition-transform ${
                      selectedDiscardTile?.id === tile.id ? 'ring-2 ring-red-400' : ''
                    }`}
                    context="gameplay"
                  />
                )) : (
                  <div className="text-gray-400 text-sm flex items-center justify-center w-full py-4">
                    No tiles in hand - click "Draw Tile" to start
                  </div>
                )}
              </div>
            </div>

            {/* Drawn Tile */}
            {lastDrawnTile && (
              <div>
                <div className="text-sm text-gray-600 mb-2">Just Drawn</div>
                <div className="flex gap-2 p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
                  <AnimatedTile
                    tile={{...lastDrawnTile, instanceId: lastDrawnTile.id, isSelected: false}}
                    size="sm"
                    onClick={() => isMyTurn && handleDiscardTile(lastDrawnTile)}
                    className="cursor-pointer hover:scale-105 transition-transform ring-2 ring-blue-400"
                    context="gameplay"
                  />
                  <div className="text-sm text-blue-600 flex items-center">
                    Click to discard or keep in hand
                  </div>
                </div>
              </div>
            )}

            {/* Exposed Sets */}
            {exposedTiles.length > 0 && (
              <div>
                <div className="text-sm text-gray-600 mb-2">Exposed Sets ({exposedTiles.length})</div>
                <div className="space-y-2">
                  {exposedTiles.map((set, index) => (
                    <div key={index} className="flex gap-1 p-2 bg-purple-50 rounded border-l-4 border-purple-400">
                      <span className="text-xs text-purple-600 font-medium mr-2">
                        {set.type.toUpperCase()}:
                      </span>
                      {set.tiles.map((tile, tileIndex) => (
                        <AnimatedTile
                          key={tileIndex}
                          tile={{...tile, instanceId: tile.id, isSelected: false}}
                          size="sm"
                          className="pointer-events-none"
                          context="gameplay"
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* AI Co-Pilot Panel */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">🧠 AI Co-Pilot</h3>
            {isAnalyzing && <LoadingSpinner size="sm" />}
          </div>
          
          <div className="space-y-4">
            {currentAnalysis ? (
              <>
                {/* Primary Recommendation */}
                <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                  <div className="text-sm font-medium text-blue-800 mb-2">💡 Recommendation</div>
                  <div className="text-sm text-gray-700">
                    {recommendedDiscard()?.reasoning || 'Analyzing your hand...'}
                  </div>
                </div>

                {/* Pattern Progress */}
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">🎯 Pattern Progress</div>
                  {selectedPatterns.slice(0, 2).map((pattern, index) => (
                    <div key={index} className="p-2 bg-gray-50 rounded">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium">{pattern.displayName}</span>
                        <span className="text-xs text-gray-500">75%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '75%' }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick Actions */}
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-purple-600 border-purple-300"
                    onClick={findAlternativePatterns}
                  >
                    🔄 Switch Pattern
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <div className="text-2xl mb-2">🤔</div>
                <p className="text-sm">Draw tiles to see AI recommendations</p>
              </div>
            )}
          </div>
        </Card>
      </div>

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
    </div>
  )
}