// Tile Input Page
// Complete interface for inputting and managing player tiles

import { useEffect, useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Container } from '../../ui-components/layout/Container'
import { Button } from '../../ui-components/Button'
import { Card } from '../../ui-components/Card'
import { TileSelector } from './TileSelector'
import { HandDisplay } from './HandDisplay'
import { SelectionArea } from '../gameplay/SelectionArea'
import { useTileStore, useGameStore } from '../../stores'
import DevShortcuts from '../../ui-components/DevShortcuts'

export const TileInputPage = () => {
  const location = useLocation()
  const navigate = useNavigate()

  console.log('🎯 TileInputPage render called, location:', location.pathname)
  console.log('🎯 TileInputPage - URL in browser:', window.location.pathname)

  useEffect(() => {
    console.log('🎯 TileInputPage mounted (useEffect)')
    return () => {
      console.log('🎯 TileInputPage UNMOUNTING')
    }
  }, [])
  const [selectorMode] = useState<'full' | 'compact'>('full')
  const [showTileSelector, setShowTileSelector] = useState(false) // Start false for lazy loading
  const [isStartingGame, setIsStartingGame] = useState(false)
  
  const {
    playerHand,
    dealerHand,
    clearHand,
    setDealerHand,
    validateHand,
    importTilesFromString
  } = useTileStore()
  
  const { setGamePhase } = useGameStore()
  
  // Calculate hand completion status
  const requiredTiles = dealerHand ? 14 : 13
  const currentTiles = playerHand.length
  const missingTiles = Math.max(0, requiredTiles - currentTiles)
  const isHandComplete = currentTiles >= requiredTiles
  
  
  // Debug removed to prevent console spam
  
  const hasInitializedRef = useRef(false)
  
  // Set game phase for tile input
  useEffect(() => {
    setGamePhase('tile-input')
  }, [setGamePhase])

  // Lazy load TileSelector to improve initial render performance
  useEffect(() => {
    const timer = setTimeout(() => setShowTileSelector(true), 100)
    return () => clearTimeout(timer)
  }, [])
  
  useEffect(() => {
    // Only run once on initial mount to prevent clearing hand on subsequent navigation
    if (hasInitializedRef.current) return
    hasInitializedRef.current = true
    
    // Clear hand when starting fresh (check if we came from home)
    const referrer = document.referrer
    const isFromHome = referrer.includes('/') && !referrer.includes('/patterns') && !referrer.includes('/tiles')
    if (isFromHome && playerHand.length > 0) {
      clearHand()
    }
  }, [clearHand, playerHand.length])
  
  useEffect(() => {
    // Validate hand whenever it changes
    validateHand()
  }, [playerHand, validateHand])
  
  
  const handleAddSampleHand = () => {
    // Create a realistic mahjong tile pool (4 of each suit tile, 4 of each honor tile, etc.)
    const tilePool: string[] = []

    // Add suit tiles (4 of each: 1-9 in bams, cracks, dots)
    for (let value = 1; value <= 9; value++) {
      for (let count = 0; count < 4; count++) {
        tilePool.push(`${value}B`, `${value}C`, `${value}D`)
      }
    }

    // Add honor tiles (4 of each)
    const honors = ['east', 'south', 'west', 'north', 'red', 'green', 'white']
    honors.forEach(honor => {
      for (let count = 0; count < 4; count++) {
        tilePool.push(honor)
      }
    })

    // Add some flowers and jokers
    tilePool.push('f1', 'f2', 'f3', 'f4')
    tilePool.push('joker', 'joker', 'joker', 'joker', 'joker', 'joker', 'joker', 'joker')

    // Shuffle the pool
    const shuffledPool = tilePool.sort(() => Math.random() - 0.5)

    // Select the first 13 or 14 tiles
    const handSize = dealerHand ? 14 : 13
    const randomHand = shuffledPool.slice(0, handSize)

    // Import the new hand
    importTilesFromString(randomHand.join(' '))
  }

  const handleStartGame = () => {
    console.log('🚀 START GAME CLICKED - Beginning navigation...')
    console.time('⏱️ Navigate to game')
    setIsStartingGame(true)
    console.log('🚀 Set isStartingGame to true')
    // Set game phase to 'charleston' first - players must go through Charleston before gameplay
    setGamePhase('charleston')
    console.log('🚀 Set game phase to charleston')
    // Navigate immediately - analysis is now synchronous so no delay needed
    console.log('🚀 About to call navigate("/game")')
    navigate('/game')
    console.log('🚀 navigate() called, waiting for route change...')
    console.timeEnd('⏱️ Navigate to game')
  }

  const handleSkipToCharleston = () => {
    setGamePhase('charleston')
    navigate('/game')
  }

  const handleSkipToGameplay = () => {
    setGamePhase('playing')
    navigate('/game')
  }

  const handleResetGame = () => {
    clearHand()
    navigate('/')
  }
  

  console.log('🎯 TileInputPage RENDERING - isStartingGame:', isStartingGame, 'pathname:', location.pathname)

  return (
    <>
    <DevShortcuts
      variant="tile-input"
      onAddSampleHand={handleAddSampleHand}
      onSkipToCharleston={handleSkipToCharleston}
      onSkipToGameplay={handleSkipToGameplay}
      onResetGame={handleResetGame}
    />
    <Container size="full" padding="sm" center={true}>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-primary/10 to-secondary/10 px-6 py-3 rounded-full">
            <span className="text-3xl">🀄</span>
            <span className="text-lg font-semibold text-primary">Tile Input</span>
          </div>
          
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">
            Build Your
            <br />
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Starting Hand
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Input your tiles privately to begin your game setup. You need {requiredTiles} tiles total.
          </p>
        </div>
        
        {/* Game Controls */}
        <Card variant="default" className="p-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Dealer Toggle */}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={dealerHand}
                  onChange={(e) => setDealerHand(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span>I'm the dealer (14 tiles)</span>
              </label>
              
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearHand}
                disabled={playerHand.length === 0}
                className="text-red-600 hover:bg-red-50 border-red-200"
              >
                🗑️ Clear All
              </Button>
            </div>
          </div>
        </Card>
        
        {/* Tile Selector */}
        {showTileSelector ? (
          <TileSelector 
            compact={selectorMode === 'compact'} 
            onCollapse={() => setShowTileSelector(false)}
          />
        ) : (
          <Card variant="elevated" className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Tiles to Hand</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTileSelector(!showTileSelector)}
                className="text-sm"
              >
                ↓ Expand
              </Button>
            </div>
            <div className="text-center text-gray-500 py-4">
              <div className="text-sm">Tile selector collapsed</div>
              <div className="text-xs mt-1">Click expand to add more tiles</div>
            </div>
          </Card>
        )}

        {/* Hand Display */}
        <HandDisplay
          showRecommendations={true}
          allowReordering={true}
        />
        
        
        {/* Hand Status Indicator */}
        <Card variant="default" className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl">
                {isHandComplete ? '✅' : '🎯'}
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  Hand Progress: {currentTiles}/{requiredTiles} tiles
                </div>
                <div className="text-sm text-gray-600">
                  {isHandComplete 
                    ? 'Hand is complete and ready for analysis!' 
                    : `Add ${missingTiles} more tile${missingTiles !== 1 ? 's' : ''} to continue`
                  }
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                {Math.round((currentTiles / requiredTiles) * 100)}%
              </div>
              <div className="text-xs text-gray-500">Complete</div>
            </div>
          </div>
        </Card>
        
        {/* Action Buttons */}
        <div className="flex justify-center">
          {isHandComplete ? (
            <Button
              variant="primary"
              size="lg"
              onClick={handleStartGame}
              disabled={isStartingGame}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold w-full max-w-md"
            >
              {isStartingGame ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Loading AI Analysis...</span>
                </div>
              ) : (
                '🎯 Start Game'
              )}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="lg"
              disabled
              className="text-gray-400 border-gray-200 cursor-not-allowed w-full max-w-md"
            >
              Add {missingTiles} more tile{missingTiles !== 1 ? 's' : ''}
            </Button>
          )}
        </div>
      </div>
    </Container>

    {/* Selection Area - appears when tiles are selected */}
    <SelectionArea />
    </>
  )
}