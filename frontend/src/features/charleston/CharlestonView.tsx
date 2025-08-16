// CharlestonView Component  
// Main Charleston intelligence interface with pattern integration

import { useEffect, useMemo } from 'react'
import { TargetPatternDisplay } from './TargetPatternDisplay'
import { PassingRecommendations } from './PassingRecommendations'
import { TilePassingArea } from './TilePassingArea'
import { StrategyExplanation } from './StrategyExplanation'
import { useCharlestonStore, useCharlestonSelectors } from '../../stores/charleston-store'
import { usePatternStore } from '../../stores/pattern-store'
import type { Tile } from '../../utils/charleston-adapter'

export function CharlestonView() {
  const charlestonStore = useCharlestonStore()
  const charlestonSelectors = useCharlestonSelectors()
  const patternStore = usePatternStore()
  
  // Sync target patterns from pattern selection (if any are selected)
  useEffect(() => {
    const targetPatterns = patternStore.getTargetPatterns()
    if (targetPatterns.length > 0) {
      if (targetPatterns.length !== charlestonStore.targetPatterns.length ||
          !targetPatterns.every(p => charlestonStore.targetPatterns.some(cp => cp.id === p.id))) {
        charlestonStore.setTargetPatterns(targetPatterns)
      }
    }
  }, [patternStore.targetPatterns, charlestonStore.targetPatterns, charlestonStore])
  
  // Mock tiles for development - replace with actual tile input integration
  const mockTiles: Tile[] = useMemo(() => [
    { id: '1dot', suit: 'dots', value: '1' },
    { id: '2dot', suit: 'dots', value: '2' },
    { id: '3dot', suit: 'dots', value: '3' },
    { id: '1bam', suit: 'bams', value: '1' },
    { id: '2bam', suit: 'bams', value: '2' },
    { id: '5bam', suit: 'bams', value: '5' },
    { id: '1crak', suit: 'cracks', value: '1' },
    { id: '9crak', suit: 'cracks', value: '9' },
    { id: 'eastwind', suit: 'winds', value: 'east' },
    { id: 'reddragon', suit: 'dragons', value: 'red' },
    { id: 'flower1', suit: 'flowers', value: '1' },
    { id: 'flower2', suit: 'flowers', value: '2' },
    { id: 'joker', suit: 'jokers', value: 'joker', isJoker: true }
  ], [])
  
  // Initialize tiles if Charleston is active but no tiles are set
  useEffect(() => {
    if (charlestonSelectors.isActive && charlestonStore.playerTiles.length === 0) {
      charlestonStore.setPlayerTiles(mockTiles)
    }
  }, [charlestonSelectors.isActive, charlestonStore.playerTiles.length, mockTiles, charlestonStore])
  
  const recommendedTiles = charlestonStore.recommendations?.tilesToPass || []
  const jokerCount = charlestonSelectors.jokerCount
  
  const handleStartCharleston = () => {
    charlestonStore.setPlayerTiles(mockTiles)
    charlestonStore.startCharleston()
  }
  
  const handleCompletePhase = () => {
    // Mock receiving tiles - in real app this would come from multiplayer system
    const mockReceivedTiles: Tile[] = [
      { id: '4dot', suit: 'dots', value: '4' },
      { id: '6bam', suit: 'bams', value: '6' },
      { id: 'westwind', suit: 'winds', value: 'west' }
    ]
    charlestonStore.completePhase(mockReceivedTiles)
  }
  
  if (!charlestonSelectors.isActive) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Charleston Intelligence</h1>
          <p className="text-gray-600 mb-8">Get AI-powered recommendations for strategic tile passing</p>
          
          {/* AI-Powered Flow Notice */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-indigo-900 mb-2">🤖 AI-Powered Charleston Strategy</h3>
            <p className="text-indigo-800 mb-3">
              Enter your tiles and AI will analyze your hand to recommend optimal Charleston passes.
            </p>
            {patternStore.targetPatterns.length > 0 ? (
              <p className="text-sm text-indigo-600">
                ✓ Using your {patternStore.targetPatterns.length} selected pattern{patternStore.targetPatterns.length > 1 ? 's' : ''} for focused strategy
              </p>
            ) : (
              <p className="text-sm text-indigo-600">
                💡 AI will recommend patterns based on your tiles, or you can select specific targets
              </p>
            )}
          </div>
          
          <div className="space-y-4">
            <button
              onClick={handleStartCharleston}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Start Charleston Analysis
            </button>
            
            <div className="grid md:grid-cols-2 gap-6 mt-8">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-2">🤖 AI Recommendations</h3>
                <p className="text-gray-600 text-sm">
                  Get intelligent suggestions for which tiles to pass based on your target patterns and Charleston phase.
                </p>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-2">📚 Strategy Education</h3>
                <p className="text-gray-600 text-sm">
                  Learn Charleston strategy with detailed explanations of why each recommendation works.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{charlestonSelectors.phaseDisplayName}</h1>
            <p className="text-gray-600">AI-powered Charleston assistance</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => charlestonStore.toggleStrategy()}
              className={`px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                charlestonStore.showStrategy
                  ? 'bg-indigo-100 border-indigo-300 text-indigo-800'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {charlestonStore.showStrategy ? 'Hide Strategy' : 'Show Strategy'}
            </button>
            
            {charlestonSelectors.canAdvancePhase && (
              <button
                onClick={handleCompletePhase}
                className="bg-green-600 text-white px-4 py-2 text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
              >
                Complete Phase
              </button>
            )}
            
            <button
              onClick={charlestonStore.endCharleston}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              End Charleston
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column: Target Patterns & Analysis */}
        <div className="space-y-6">
          <TargetPatternDisplay 
            targetPatterns={charlestonStore.targetPatterns}
          />
          
          <PassingRecommendations
            recommendations={charlestonStore.recommendations}
            isLoading={charlestonStore.isAnalyzing}
          />
          
          {charlestonStore.analysisError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <span className="text-red-600">⚠️</span>
                <div>
                  <p className="text-red-800 font-medium">Analysis Error</p>
                  <p className="text-red-600 text-sm">{charlestonStore.analysisError}</p>
                  <button
                    onClick={charlestonStore.clearError}
                    className="text-red-600 text-sm underline mt-1"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Center Column: Tile Selection */}
        <div className="lg:col-span-2 space-y-6">
          <TilePassingArea
            availableTiles={charlestonStore.playerTiles}
            selectedTiles={charlestonStore.selectedTiles}
            recommendedTiles={recommendedTiles}
            onTileSelect={charlestonStore.selectTile}
            onTileDeselect={charlestonStore.deselectTile}
            disabled={charlestonStore.isAnalyzing}
          />
          
          {/* Quick Actions */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Quick actions:</span>
              <button
                onClick={charlestonStore.autoSelectRecommended}
                disabled={!charlestonStore.recommendations || charlestonStore.isAnalyzing}
                className="text-sm text-indigo-600 hover:text-indigo-800 disabled:text-gray-400"
              >
                Auto-select recommended
              </button>
              <button
                onClick={charlestonStore.clearSelection}
                disabled={charlestonStore.selectedTiles.length === 0}
                className="text-sm text-gray-600 hover:text-gray-800 disabled:text-gray-400"
              >
                Clear selection
              </button>
            </div>
            
            <div className="text-sm text-gray-500">
              {charlestonStore.playerTiles.length} tiles • {jokerCount} joker{jokerCount !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>
      
      {/* Strategy Guide (Expandable) */}
      {charlestonStore.showStrategy && (
        <div className="mt-6">
          <StrategyExplanation
            phase={charlestonStore.currentPhase}
            targetPatterns={charlestonStore.targetPatterns}
            jokerCount={jokerCount}
          />
        </div>
      )}
    </div>
  )
}