// Tile Input Page
// Complete interface for inputting and managing player tiles

import { useEffect, useState, useRef } from 'react'
import { Container } from '../../ui-components/layout/Container'
import { Button } from '../../ui-components/Button'
import { Card } from '../../ui-components/Card'
import { TileSelector } from './TileSelector'
import { HandDisplay } from './HandDisplay'
import { HandValidation } from './HandValidation'
import { PrimaryAnalysisCard } from '../intelligence-panel/PrimaryAnalysisCard'
import { useTileStore, usePatternStore, useIntelligenceStore } from '../../stores'

export const TileInputPage = () => {
  const [selectorMode] = useState<'full' | 'compact'>('full')
  const [showValidation, setShowValidation] = useState(true)
  const [showValidationDetails, setShowValidationDetails] = useState(true)
  const [showTileSelector, setShowTileSelector] = useState(true)
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
  const { currentAnalysis, autoAnalyze, setAutoAnalyze, analyzeHand, isAnalyzing } = useIntelligenceStore()
  
  // Check if we should show intelligence panel
  const showIntelligencePanel = playerHand.length >= 10
  
  // Track if we've already triggered analysis to prevent loops
  const analysisTriggeredRef = useRef(false)
  
  useEffect(() => {
    // Clear hand when starting fresh (check if we came from home)
    const referrer = document.referrer
    const isFromHome = referrer.includes('/') && !referrer.includes('/patterns') && !referrer.includes('/tiles')
    if (isFromHome && playerHand.length > 0) {
      clearHand()
    }
  }, [clearHand, playerHand.length]) // Run only on mount
  
  useEffect(() => {
    // Validate hand whenever it changes
    validateHand()
  }, [playerHand, validateHand])
  
  // Auto-analyze when conditions are met
  useEffect(() => {
    const shouldAnalyze = autoAnalyze && playerHand.length >= 10 && !isAnalyzing
    
    if (shouldAnalyze && !analysisTriggeredRef.current) {
      analysisTriggeredRef.current = true
      analyzeHand(playerHand, targetPatterns).finally(() => {
        // Reset flag after analysis completes
        analysisTriggeredRef.current = false
      })
    }
  }, [autoAnalyze, playerHand.length, analyzeHand, isAnalyzing, playerHand, targetPatterns]) // Only track hand length, patterns optional
  
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
          </div>
          
          {/* Hand Validation */}
          {showValidation && (
            <div className={selectorMode === 'full' ? 'lg:col-span-1' : 'lg:col-span-2'}>
              {showValidationDetails ? (
                <HandValidation onCollapse={() => setShowValidationDetails(false)} />
              ) : (
                <Card variant="elevated" className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        validation.isValid ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {validation.isValid ? '✓' : '✗'}
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        Hand Validation
                      </span>
                      {!validation.isValid && validation.errors.length > 0 && (
                        <span className="text-xs text-red-600">
                          {validation.errors.length} issue{validation.errors.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowValidationDetails(true)}
                      className="text-sm"
                    >
                      ↓ Expand
                    </Button>
                  </div>
                </Card>
              )}
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
          <div className="space-y-4">
            <div className="flex items-center justify-between px-4">
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
              <PrimaryAnalysisCard
                analysis={currentAnalysis}
                currentPattern={currentAnalysis.recommendedPatterns[0] || null}
                onPatternSwitch={(pattern) => {
                  // TODO: Update current pattern selection
                  console.log('Switched to pattern:', pattern.pattern.id)
                }}
                onBrowseAllPatterns={() => {
                  // TODO: Navigate to pattern selection page
                  window.location.href = '/patterns'
                }}
              />
            ) : (
              <Card variant="elevated" className="p-8">
                <div className="text-center text-gray-500">
                  <div className="text-2xl mb-2">🤔</div>
                  <p>Analyzing your hand and patterns...</p>
                  <p className="text-sm mt-1">
                    Select patterns and add tiles to see AI recommendations
                  </p>
                </div>
              </Card>
            )}
          </div>
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