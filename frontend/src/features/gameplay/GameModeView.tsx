// Game Mode View - Core gameplay interface with real-time co-pilot assistance
// Handles draw/discard mechanics, call evaluation, and continuous pattern analysis

import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
  // Store state - simplified to avoid infinite loops
  const gameStore = useGameStore()
  const intelligenceStore = useIntelligenceStore()
  const tileStore = useTileStore()
  // Temporarily hardcode empty array to avoid store selector issues
  const selectedPatterns = useMemo(() => [] as Array<{ id: string; displayName: string; difficulty: string; groups?: Array<{ tiles?: TileType[] }> }>, [])

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
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0) // 0=you, 1=right, 2=across, 3=left
  const [playerNames] = useState(['You', 'Right', 'Across', 'Left'])
  const [gameRound] = useState(1)
  const [windRound] = useState<'east' | 'south' | 'west' | 'north'>('east')
  const [showPatternSwitcher, setShowPatternSwitcher] = useState(false)
  const [alternativePatterns, setAlternativePatterns] = useState<Array<{ patternId: string; completionPercentage: number; difficulty: string; tilesNeeded?: number; strategicValue?: number }>>([])
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showConfirmDiscard, setShowConfirmDiscard] = useState<TileType | null>(null)

  // Current hand with drawn tile - simplified
  const currentHand = useMemo(() => [] as TileType[], [])
  const fullHand = useMemo(() => lastDrawnTile ? [...currentHand, lastDrawnTile] : currentHand, [currentHand, lastDrawnTile])

  // Real-time analysis - simplified
  const currentAnalysis = null as {
    tileRecommendations?: Array<{ action: string; tileId?: string; reasoning?: string }>;
    bestPatterns?: Array<{ patternId: string; completionPercentage: number; difficulty: string; tilesNeeded?: number }>;
    strategicAdvice?: string[];
  } | null

  // Initialize random demo hand for testing (currently unused)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const initializeDemoHand = useCallback(() => {
    // Generate a random 13-tile hand using the tile service
    try {
      const allTileIds = [
        // Dots 1-9
        '1D', '2D', '3D', '4D', '5D', '6D', '7D', '8D', '9D',
        // Bams 1-9  
        '1B', '2B', '3B', '4B', '5B', '6B', '7B', '8B', '9B',
        // Cracks 1-9
        '1C', '2C', '3C', '4C', '5C', '6C', '7C', '8C', '9C',
        // Winds
        'east', 'south', 'west', 'north',
        // Dragons
        'red', 'green', 'white',
        // Flowers
        'f1', 'f2', 'f3', 'f4'
      ]
      
      // Shuffle and take first 13 tiles
      const shuffled = allTileIds.sort(() => Math.random() - 0.5)
      const randomHand = shuffled.slice(0, 13)
      
      // Add tiles to the tile store
      randomHand.forEach(tileId => {
        tileStore.addTile(tileId)
      })
      
      console.log('🎲 Generated random demo hand:', randomHand)
    } catch (error) {
      console.error('Failed to generate demo hand:', error)
    }
  }, [tileStore])

  // Initialize game mode
  useEffect(() => {
    console.log('🎮 GameModeView initialized - basic demo mode')
    setIsMyTurn(true) // Start with current player's turn
  }, [])

  // Analyze hand whenever it changes (with debouncing) - DISABLED FOR NOW
  // useEffect(() => {
  //   if (fullHand.length > 0) {
  //     // Debounce analysis to avoid excessive calls
  //     const timeoutId = setTimeout(() => {
  //       analyzeCurrentHand()
  //     }, 300)
      
  //     return () => clearTimeout(timeoutId)
  //   }
  // }, [fullHand.length, selectedPatterns?.length || 0, exposedTiles?.length || 0])

  // Real-time hand analysis
  const analyzeCurrentHand = useCallback(async () => {
    if (fullHand.length === 0) return

    setIsAnalyzing(true)
    try {
      // Convert TileType to PlayerTile for analysis
      const handForAnalysis = fullHand.map((tile, index) => {
        if ('instanceId' in tile) {
          // Already a PlayerTile
          return tile as TileType & { instanceId: string; isSelected: boolean }
        }
        // Convert TileType to PlayerTile
        return {
          ...tile,
          instanceId: `${tile.id}-${index}`,
          isSelected: false
        } as TileType & { instanceId: string; isSelected: boolean }
      })
      
      // Include exposed tiles in analysis context (currently unused)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const analysisContext = {
        concealed: handForAnalysis,
        exposed: exposedTiles || [],
        targetPatterns: selectedPatterns || [],
        gamePhase: 'playing' as const,
        lastAction: gameHistory[0]?.action || 'draw'
      }
      
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
  }, [fullHand, selectedPatterns, exposedTiles, gameHistory, intelligenceStore])

  // Draw tile action
  const handleDrawTile = useCallback(() => {
    if (!isMyTurn || lastDrawnTile) return

    // Simulate drawing a tile (in real app, this would come from game server)
    const value = (Math.floor(Math.random() * 9) + 1).toString() as TileType['value']
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
      if (playerTileToRemove) {
        tileStore.removeTile(`hand-${playerTileToRemove.id}`)
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
    const matchingTiles = currentHand.filter((tile: TileType) => 
      tile.suit === discardedTile.suit && tile.value === discardedTile.value
    )

    if (matchingTiles.length >= 2) {
      const exposedTiles = [discardedTile, ...matchingTiles.slice(0, 2)]
      
      // Calculate pattern benefit
      let patternBenefit = 0
      let reasoning = 'Forms a pung'
      
      // Check if this helps any target patterns
      selectedPatterns.forEach(pattern => {
        if (pattern.groups?.some((group: { tiles?: TileType[] }) => 
          group.tiles?.some((groupTile: TileType) => 
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
      // Remove called tiles from hand
      opportunity.exposedTiles.forEach(exposedTile => {
        if (exposedTile.id !== opportunity.tile.id) { // Don't remove the discarded tile from our hand
          const playerTileToRemove = currentHand.find(h => h.id === exposedTile.id)
          if (playerTileToRemove) {
            tileStore.removeTile(`hand-${playerTileToRemove.id}`)
          }
        }
      })
      
      // Add to exposed tiles display
      const newExposedGroup = {
        type: opportunity.callType,
        tiles: opportunity.exposedTiles,
        timestamp: new Date()
      }
      setExposedTiles(prev => [...prev, newExposedGroup])
      
      // Track exposure count for current player
      const currentPlayerId = gameStore.currentPlayerId || 'player-1'
      setPlayerExposedCount(prev => ({
        ...prev,
        [currentPlayerId]: prev[currentPlayerId] + opportunity.exposedTiles.length
      }))
      
      // Add to game history
      const turn: GameTurn = {
        playerId: currentPlayerId,
        action: 'call',
        tile: opportunity.tile,
        callType: opportunity.callType,
        exposedTiles: opportunity.exposedTiles,
        timestamp: new Date()
      }
      setGameHistory(prev => [turn, ...prev])

      // It's now our turn to discard (after calling)
      setIsMyTurn(true)
      
      console.log(`✅ Called ${opportunity.callType}:`, opportunity.exposedTiles.map(t => t.displayName).join(', '))
    } else {
      console.log(`❌ Passed on ${callOpportunities[0]?.callType} opportunity`)
    }
  }, [currentHand, tileStore, gameStore.currentPlayerId, callOpportunities, callTimeoutId])

  // Advance to next player (currently unused)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const advanceToNextPlayer = useCallback(() => {
    setCurrentPlayerIndex(prev => (prev + 1) % 4)
    setIsMyTurn(currentPlayerIndex === 3) // It will be our turn next if we're advancing from player 3
  }, [currentPlayerIndex])

  // Simulate other players' turns
  const simulateOtherPlayerTurn = useCallback(() => {
    const nextPlayerIndex = (currentPlayerIndex + 1) % 4
    const nextPlayerName = playerNames[nextPlayerIndex]
    const nextPlayerId = `player-${nextPlayerIndex + 1}`
    
    // Simulate other player drawing and discarding
    const suits = ['dots', 'bams', 'cracks', 'winds', 'dragons'] as const
    const randomSuit = suits[Math.floor(Math.random() * suits.length)]
    let value: string
    let displayName: string
    
    if (randomSuit === 'winds') {
      const winds = ['east', 'south', 'west', 'north']
      value = winds[Math.floor(Math.random() * winds.length)]
      displayName = `${value.charAt(0).toUpperCase() + value.slice(1)} Wind`
    } else if (randomSuit === 'dragons') {
      const dragons = ['red', 'green', 'white']
      value = dragons[Math.floor(Math.random() * dragons.length)]
      displayName = `${value.charAt(0).toUpperCase() + value.slice(1)} Dragon`
    } else {
      value = (Math.floor(Math.random() * 9) + 1).toString()
      displayName = `${value} ${randomSuit.charAt(0).toUpperCase() + randomSuit.slice(1)}`
    }

    const otherPlayerTile: TileType = {
      id: `discard-${nextPlayerId}-${Date.now()}`,
      suit: randomSuit,
      value: value as TileType['value'],
      displayName
    }

    const turn: GameTurn = {
      playerId: nextPlayerId,
      action: 'discard',
      tile: otherPlayerTile,
      timestamp: new Date()
    }
    setGameHistory(prev => [turn, ...prev])
    
    console.log(`🎮 ${nextPlayerName} discards ${otherPlayerTile.displayName}`)

    // Advance turn counter
    setCurrentPlayerIndex(nextPlayerIndex)

    // Check if we can call this tile (only if it's not our turn yet)
    if (nextPlayerIndex !== 0) {
      evaluateCallOpportunity(otherPlayerTile)
    }

    // Continue simulating other players or give turn to user
    setTimeout(() => {
      if (!showCallDialog) {
        if (nextPlayerIndex === 3) {
          // Last other player played, now it's our turn
          setIsMyTurn(true)
          setCurrentPlayerIndex(0)
        } else {
          // Continue with next player
          simulateOtherPlayerTurn()
        }
      }
    }, 1500)
  }, [currentPlayerIndex, playerNames, evaluateCallOpportunity, showCallDialog])

  // Check win condition
  const checkWinCondition = useCallback((hand: TileType[]): boolean => {
    // Simplified win check - in real implementation would check against selected patterns
    return hand.length === 14 && Math.random() > 0.8 // 20% chance of winning for demo
  }, [])

  // Handle game win
  const handleGameWin = useCallback((winningHand: TileType[]) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _winningHand = winningHand;
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
    if (!currentAnalysis || !currentAnalysis.tileRecommendations) return null
    
    const discardRec = currentAnalysis.tileRecommendations.find(rec => rec.action === 'discard')
    if (!discardRec?.tileId) return null

    return fullHand.find((tile: TileType) => 
      tile.id === discardRec.tileId
    ) || null
  }, [currentAnalysis, fullHand])

  const recommendedDiscard = getDiscardRecommendation()

  // Find alternative patterns based on current hand
  const findAlternativePatterns = useCallback(async () => {
    if (!currentAnalysis || !currentAnalysis.bestPatterns) return
    
    // Get patterns that are viable but not currently selected
    const availablePatterns = currentAnalysis.bestPatterns
      .filter(p => p.completionPercentage > 15) // Must be at least 15% viable
      .filter(p => !selectedPatterns.some(sp => sp.id === p.patternId))
      .slice(0, 5) // Top 5 alternatives
    
    setAlternativePatterns(availablePatterns)
    setShowPatternSwitcher(true)
  }, [currentAnalysis, selectedPatterns])

  // Handle pattern switch
  const handlePatternSwitch = useCallback((newPatternId: string) => {
    const patternStore = usePatternStore.getState()
    
    // Remove least viable current pattern and add new one
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
    
    // Trigger immediate re-analysis
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
                currentPlayerIndex === index ? 'text-green-700' :
                index === 0 ? 'text-blue-700' : 'text-gray-600'
              }`}>
                {name}
              </span>
              {index < 3 && <span className="text-gray-400 text-xs sm:text-sm">→</span>}
            </div>
          ))}
        </div>
      </Card>

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
                        {currentAnalysis?.tileRecommendations?.find(r => r.tileId === recommendedDiscard.id)?.reasoning && (
                          <span className="text-sm block mt-1">
                            {currentAnalysis.tileRecommendations.find(r => r.tileId === recommendedDiscard.id)?.reasoning}
                          </span>
                        )}
                      </p>
                    </div>
                  ) : (
                    <p className="text-blue-600">
                      Hand analyzed • {currentAnalysis?.bestPatterns?.length || 0} viable patterns found
                    </p>
                  )}
                  {currentAnalysis?.strategicAdvice && currentAnalysis.strategicAdvice.length > 0 && (
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {/* Turn Action */}
        <Card className="p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Turn Action</h3>
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
        <Card className="p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Pattern Progress</h3>
          <div className="space-y-4">
            {selectedPatterns.map((pattern) => {
              const analysisPattern = currentAnalysis?.bestPatterns?.find(p => p.patternId === pattern.id)
              const progress = analysisPattern?.completionPercentage || 0
              const difficulty = analysisPattern?.difficulty || pattern.difficulty
              const isViable = progress > 20 // Show as viable if >20% complete
              
              return (
                <div key={pattern.id} className={`p-3 rounded-lg border ${
                  isViable ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${isViable ? 'text-blue-800' : 'text-gray-600'} truncate`}>
                        {pattern.displayName}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                        difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {difficulty}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${isViable ? 'text-blue-600' : 'text-gray-500'}`}>
                        {progress.toFixed(0)}%
                      </span>
                      {isViable && <span className="text-green-500">🎯</span>}
                    </div>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ${
                        progress > 70 ? 'bg-green-500' :
                        progress > 40 ? 'bg-blue-500' :
                        progress > 20 ? 'bg-yellow-500' :
                        'bg-gray-400'
                      }`}
                      style={{ width: `${Math.max(progress, 5)}%` }}
                    />
                  </div>
                  
                  {analysisPattern && (
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Tiles needed:</span>
                        <span className="font-medium">{analysisPattern.tilesNeeded || '?'}</span>
                      </div>
                      {exposedTiles.length > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Uses exposed:</span>
                          <span className="font-medium text-green-600">
                            {exposedTiles.some(group => 
                              group.tiles.some(tile => 
                                pattern.groups?.some((pg: { tiles?: TileType[] }) => 
                                  pg.tiles?.some((pt: TileType) => pt.suit === tile.suit && pt.value === tile.value)
                                )
                              )
                            ) ? 'Yes' : 'No'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            
            {selectedPatterns.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                <p className="mb-2">No target patterns selected</p>
                <p className="text-sm">Go to Pattern Selection to choose your strategy</p>
              </div>
            )}
          </div>
        </Card>

        {/* Game Status */}
        <Card className="p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Game Status</h3>
          <div className="space-y-3">
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
            
            {/* Player Exposure Status */}
            <div className="border-t pt-3 mt-3">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Exposed Tiles</h4>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">You:</span>
                  <span className="font-medium">{playerExposedCount['player-1'] || 0} tiles</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Other players:</span>
                  <span className="font-medium">
                    {Object.entries(playerExposedCount).filter(([id]) => id !== 'player-1').reduce((sum, [, count]) => sum + count, 0)} tiles
                  </span>
                </div>
              </div>
            </div>
            
            {exposedTiles.length > 0 && (
              <div className="bg-green-50 rounded-lg p-2">
                <div className="text-xs text-green-700 font-medium">
                  {exposedTiles.length} set{exposedTiles.length !== 1 ? 's' : ''} exposed
                </div>
                <div className="text-xs text-green-600">
                  {exposedTiles.map(group => group.type).join(', ')}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Exposed Tiles */}
      {exposedTiles.length > 0 && (
        <Card className="p-4 sm:p-6 mb-4 sm:mb-6 bg-green-50 border-green-200">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-green-800">🏆 Your Exposed Tiles</h3>
          <div className="space-y-4">
            {exposedTiles.map((exposedGroup, groupIndex) => (
              <div key={groupIndex} className="bg-white rounded-lg p-3 sm:p-4 border border-green-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-green-700 capitalize">
                    {exposedGroup.type} • {exposedGroup.tiles.length} tiles
                  </span>
                  <span className="text-sm text-green-600">
                    Called {new Date(exposedGroup.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex gap-1 sm:gap-2 justify-center">
                  {exposedGroup.tiles.map((tile, tileIndex) => (
                    <Tile
                      key={tileIndex}
                      tile={{
                        ...tile,
                        instanceId: `exposed-${groupIndex}-${tileIndex}`,
                        isSelected: false
                      }}
                      size="sm"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Current Hand */}
      <Card className="p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base sm:text-lg font-semibold">Your Hand</h3>
          <div className="text-xs sm:text-sm text-gray-500">
            {currentHand.length} tiles • {exposedTiles.reduce((acc, group) => acc + group.tiles.length, 0)} exposed
          </div>
        </div>
        <div className="flex flex-wrap gap-1 sm:gap-2 justify-center">
          {currentHand.map((tile: TileType) => (
            <AnimatedTile
              key={tile.id}
              tile={{
                ...tile,
                instanceId: `hand-${tile.id}`,
                isSelected: selectedDiscardTile?.id === tile.id
              }}
              size="md"
              animateOnSelect
              onClick={() => {
                if (isMyTurn && lastDrawnTile) {
                  // Show confirmation for critical tiles
                  if (recommendedDiscard?.id !== tile.id && Math.random() > 0.7) {
                    setShowConfirmDiscard(tile)
                  } else {
                    setSelectedDiscardTile(tile)
                    handleDiscardTile(tile)
                  }
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
      <Card className="p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Recent Discards</h3>
        <div className="flex flex-wrap gap-1 sm:gap-2">
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

      {/* Pattern Strategy Switcher Dialog */}
      {showPatternSwitcher && alternativePatterns.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">🔄 Switch Pattern Strategy</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowPatternSwitcher(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </Button>
            </div>
            
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                💡 Based on your current hand and exposed tiles, these alternative patterns might be more viable. 
                Switching will replace your least promising current pattern.
              </p>
            </div>

            <div className="space-y-4">
              {alternativePatterns.map((altPattern, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-900">
                        Pattern #{altPattern.patternId}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        altPattern.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                        altPattern.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {altPattern.difficulty}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-blue-600">
                        {altPattern.completionPercentage?.toFixed(0) || 0}%
                      </span>
                      <Button
                        size="sm"
                        onClick={() => handlePatternSwitch(altPattern.patternId)}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        Switch to This
                      </Button>
                    </div>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(altPattern.completionPercentage || 0, 5)}%` }}
                    />
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Tiles needed:</span>
                      <span className="font-medium">{altPattern.tilesNeeded || '?'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Strategic value:</span>
                      <span className="font-medium">{altPattern.strategicValue || 5}/10</span>
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