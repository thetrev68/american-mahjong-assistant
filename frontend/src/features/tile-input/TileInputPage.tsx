// Tile Input Page
// Complete interface for inputting and managing player tiles

import { useEffect, useState } from 'react'
import { Container } from '../../ui-components/layout/Container'
import { Button } from '../../ui-components/Button'
import { Card } from '../../ui-components/Card'
import { TileSelector } from './TileSelector'
import { HandDisplay } from './HandDisplay'
import { HandValidation } from './HandValidation'
import { LayerCakeUI } from '../intelligence-panel/LayerCakeUI'
import { useTileStore, usePatternStore, useIntelligenceStore } from '../../stores'

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
  
  const { getSelectedPattern, getTargetPatterns } = usePatternStore()
  const selectedPattern = getSelectedPattern()
  const targetPatterns = getTargetPatterns() // Array of selected pattern objects
  
  // Intelligence Panel Integration
  const { currentAnalysis, autoAnalyze, setAutoAnalyze } = useIntelligenceStore()
  
  // Check if we should show intelligence panel
  const showIntelligencePanel = playerHand.length >= 10 && targetPatterns.length > 0
  
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
        
        {/* Intelligence Panel */}
        {showIntelligencePanel && (
          <Card variant="elevated" className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  🧠 AI Intelligence Panel
                </h3>
                
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={autoAnalyze}
                      onChange={(e) => setAutoAnalyze(e.target.checked)}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span>Auto-analyze</span>
                  </label>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open('/intelligence', '_blank')}
                  >
                    🔗 Full Panel
                  </Button>
                </div>
              </div>
              
              {currentAnalysis ? (
                <LayerCakeUI />
              ) : (
                <div className="text-center p-8 text-gray-500">
                  <div className="text-2xl mb-2">🤔</div>
                  <p>Analyzing your hand and patterns...</p>
                  <p className="text-sm mt-1">
                    Select patterns and add tiles to see AI recommendations
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}
        
        {/* Intelligence Panel Hint */}
        {!showIntelligencePanel && (
          <Card variant="default" className="p-4 bg-gradient-to-r from-primary/5 to-secondary/5">
            <div className="text-center">
              <div className="text-lg mb-2">🧠✨</div>
              <h4 className="font-semibold text-gray-800 mb-1">
                AI Intelligence Panel Available
              </h4>
              <p className="text-sm text-gray-600">
                {playerHand.length < 10 
                  ? `Add ${10 - playerHand.length} more tiles to unlock AI analysis`
                  : targetPatterns.length === 0
                    ? "Go to Pattern Selection first to choose target patterns"
                    : "AI analysis will appear here"
                }
              </p>
              {playerHand.length < 10 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleQuickStart}
                  className="mt-2"
                >
                  🎲 Add Sample Hand
                </Button>
              )}
              {targetPatterns.length === 0 && playerHand.length >= 10 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = '/patterns'}
                  className="mt-2"
                >
                  🎯 Select Patterns
                </Button>
              )}
            </div>
          </Card>
        )}
        
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