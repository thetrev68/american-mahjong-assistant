// Tile Input Page
// Complete interface for inputting and managing player tiles

import { useEffect, useState } from 'react'
import { Container } from '../../ui-components/layout/Container'
import { Button } from '../../ui-components/Button'
import { Card } from '../../ui-components/Card'
import { TileSelector } from './TileSelector'
import { HandDisplay } from './HandDisplay'
import { HandValidation } from './HandValidation'
import { useTileStore, usePatternStore } from '../../stores'

export const TileInputPage = () => {
  const [selectorMode, setSelectorMode] = useState<'full' | 'compact'>('full')
  const [showValidation, setShowValidation] = useState(true)
  // const animationsEnabled = useAnimationsEnabled()
  
  const {
    playerHand,
    dealerHand,
    validation,
    clearHand,
    setDealerHand,
    validateHand,
    exportTilesToString,
    importTilesFromString
  } = useTileStore()
  
  const { getSelectedPattern } = usePatternStore()
  const selectedPattern = getSelectedPattern()
  
  useEffect(() => {
    // Validate hand whenever it changes
    validateHand()
  }, [playerHand, validateHand])
  
  const handleQuickStart = () => {
    // Add a sample hand for testing
    const sampleTiles = dealerHand 
      ? '1D 2D 3D 1B 2B 3B 1C 2C 3C east south west north joker'
      : '1D 2D 3D 1B 2B 3B 1C 2C 3C east south west north'
    
    importTilesFromString(sampleTiles)
  }
  
  const handleImportExport = () => {
    if (playerHand.length > 0) {
      // Export current hand
      const tileString = exportTilesToString()
      navigator.clipboard.writeText(tileString).then(() => {
        alert('Hand copied to clipboard!')
      }).catch(() => {
        prompt('Copy this tile string:', tileString)
      })
    } else {
      // Import from clipboard or prompt
      const tileString = prompt('Paste tile string (e.g., "1D 2D 3B east joker"):')
      if (tileString) {
        importTilesFromString(tileString)
      }
    }
  }
  
  return (
    <Container size="full" padding="lg">
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
            Input your tiles privately and get AI-powered analysis and recommendations.
            {selectedPattern && ` Working toward: ${selectedPattern.displayName}`}
          </p>
        </div>
        
        {/* Game Controls */}
        <Card variant="default" className="p-4">
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
              
              {/* Validation Toggle */}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showValidation}
                  onChange={(e) => setShowValidation(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span>Show validation</span>
              </label>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectorMode(selectorMode === 'full' ? 'compact' : 'full')}
              >
                {selectorMode === 'full' ? '📱 Compact' : '🖥️ Full'}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleImportExport}
              >
                {playerHand.length > 0 ? '📤 Export' : '📥 Import'}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleQuickStart}
              >
                🎲 Sample Hand
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={clearHand}
                disabled={playerHand.length === 0}
                className="text-red-600 hover:bg-red-50"
              >
                🗑️ Clear All
              </Button>
            </div>
          </div>
        </Card>
        
        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tile Selector */}
          <div className={selectorMode === 'full' ? 'lg:col-span-2' : 'lg:col-span-1'}>
            <TileSelector compact={selectorMode === 'compact'} />
          </div>
          
          {/* Hand Validation */}
          {showValidation && (
            <div className={selectorMode === 'full' ? 'lg:col-span-1' : 'lg:col-span-2'}>
              <HandValidation />
            </div>
          )}
        </div>
        
        {/* Hand Display */}
        <HandDisplay 
          showRecommendations={true}
          allowReordering={true}
        />
        
        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={() => window.history.back()}
          >
            ← Back to Patterns
          </Button>
          
          <Button
            variant="primary"
            size="lg"
            disabled={!validation.isValid}
            onClick={() => {
              // Navigate to next step
              alert('Hand validated! Ready for analysis.')
            }}
          >
            Continue with Hand →
          </Button>
        </div>
        
        {/* Development Status */}
        <div className="mt-8 p-4 bg-accent/5 rounded-lg border border-accent/20">
          <div className="flex items-center gap-2 text-sm text-accent">
            <span className="w-2 h-2 bg-accent rounded-full animate-pulse"></span>
            <span className="font-medium">CHUNK 3 Active:</span>
            <span>Tile input system with animations and validation</span>
          </div>
        </div>
      </div>
    </Container>
  )
}