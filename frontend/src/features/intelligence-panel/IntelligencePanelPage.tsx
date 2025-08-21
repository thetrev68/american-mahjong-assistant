// Intelligence Panel Page - Main interface for AI analysis and recommendations
// Simplified interface using PrimaryAnalysisCard

import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useIntelligenceStore } from '../../stores/intelligence-store'
import { usePatternStore } from '../../stores/pattern-store'
import { useTileStore } from '../../stores/tile-store'
import { PrimaryAnalysisCard } from './PrimaryAnalysisCard'
import { PatternRecommendations } from './PatternRecommendations'
import { AdvancedPatternAnalysis } from './AdvancedPatternAnalysis'

export const IntelligencePanelPage = () => {
  const {
    currentAnalysis,
    analyzeHand,
    clearAnalysis,
    autoAnalyze
  } = useIntelligenceStore()
  
  const { getTargetPatterns, clearSelection, addTargetPattern } = usePatternStore()
  const selectedPatterns = getTargetPatterns()
  const { playerHand = [], selectedTiles = [], handSize = 0 } = useTileStore()
  
  // Auto-analyze when tiles or patterns change
  useEffect(() => {
    if (!autoAnalyze) return
    
    const hasPatterns = selectedPatterns?.length > 0
    const hasTiles = playerHand?.length >= 10 // Minimum for meaningful analysis
    
    if (hasPatterns && hasTiles) {
      analyzeHand(playerHand, selectedPatterns)
    } else if (currentAnalysis) {
      clearAnalysis()
    }
  }, [playerHand, selectedPatterns, autoAnalyze, analyzeHand, clearAnalysis, currentAnalysis])
  
  const tileCount = handSize || 0
  const hasEnoughTiles = tileCount >= 10
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                🧠 AI Intelligence Panel
              </h1>
              <p className="text-gray-600 text-sm">
                Advanced pattern analysis and strategic recommendations
              </p>
            </div>
            
            {/* Navigation Links */}
            <div className="flex gap-3">
              <Link
                to="/patterns"
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Select Patterns
              </Link>
              <Link
                to="/tiles"
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Input Tiles
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Prerequisites Check */}
        {!hasEnoughTiles && (
          <div className="mb-8 p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="text-center">
              <div className="text-4xl mb-4">🤖</div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Input Your Tiles to Get AI Analysis
              </h2>
              
              <div className="space-y-3 max-w-md mx-auto">
                {/* Tile Input Status */}
                <div className={`
                  flex items-center gap-3 p-3 rounded-lg border
                  ${hasEnoughTiles 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-gray-50 border-gray-200'
                  }
                `}>
                  <div className={`
                    w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold
                    ${hasEnoughTiles 
                      ? 'bg-green-500 text-white' 
                      : 'bg-indigo-500 text-white'
                    }
                  `}>
                    {hasEnoughTiles ? '✓' : '1'}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-gray-900">
                      Input Your Hand Tiles
                    </div>
                    <div className="text-sm text-gray-600">
                      {hasEnoughTiles 
                        ? `${tileCount} tiles entered - ready for analysis!` 
                        : `${tileCount}/10 tiles minimum needed`
                      }
                    </div>
                  </div>
                  {!hasEnoughTiles && (
                    <Link
                      to="/tiles"
                      className="px-3 py-1 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/80 transition-colors"
                    >
                      Input Tiles
                    </Link>
                  )}
                </div>
                
                {hasEnoughTiles && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                    <h4 className="font-medium text-indigo-900 mb-1">✨ AI-Powered Flow</h4>
                    <p className="text-sm text-indigo-800">
                      AI will analyze your tiles and recommend the best patterns, 
                      then you can accept or override the recommendations.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Intelligence Panel */}
        {hasEnoughTiles && (
          <div className="space-y-6">
            {/* Context Summary */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Tiles:</span>
                  <span className="font-semibold text-primary">
                    {tileCount} entered
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Patterns:</span>
                  <span className="font-semibold text-primary">
                    {selectedPatterns?.length || 0} selected
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Selected:</span>
                  <span className="font-semibold text-accent">
                    {selectedTiles?.length || 0} tiles
                  </span>
                </div>
                
                {currentAnalysis && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Score:</span>
                    <span className="font-semibold text-secondary">
                      {currentAnalysis.overallScore}/100
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {/* AI Pattern Recommendations */}
            {currentAnalysis?.recommendedPatterns && currentAnalysis.recommendedPatterns.length > 0 && (
              <PatternRecommendations 
                recommendations={currentAnalysis.recommendedPatterns}
              />
            )}
            
            {/* Primary Analysis */}
            {currentAnalysis && (
              <PrimaryAnalysisCard 
                analysis={currentAnalysis}
                currentPattern={currentAnalysis.recommendedPatterns[0] || null}
                onPatternSwitch={(pattern) => {
                  // Handle pattern switch logic - update pattern store
                  clearSelection()
                  addTargetPattern(pattern.pattern.id)
                  console.log('Pattern switched to:', pattern.pattern.id)
                  // Trigger re-analysis with new pattern
                  analyzeHand(playerHand, [pattern.pattern])
                }}
                onBrowseAllPatterns={() => {
                  // Navigate to pattern selection
                  window.location.href = '/patterns'
                }}
              />
            )}
            
            {/* Advanced Pattern Analysis */}
            {currentAnalysis && (
              <AdvancedPatternAnalysis
                analysis={currentAnalysis}
                playerTiles={playerHand.map(t => t.id)}
                gamePhase="charleston" // TODO: Get actual game phase
                onPatternSelect={(patternId) => {
                  // Handle pattern selection from advanced analysis
                  clearSelection()
                  addTargetPattern(patternId)
                  console.log('Advanced pattern selected:', patternId)
                  // TODO: Trigger re-analysis
                }}
              />
            )}
          </div>
        )}
        
        {/* Debug Info (Development) */}
        {process.env.NODE_ENV === 'development' && currentAnalysis && (
          <div className="mt-8 p-4 bg-gray-100 rounded-lg text-xs font-mono">
            <div className="font-semibold mb-2">Debug Info:</div>
            <div>Analysis Version: {currentAnalysis.analysisVersion}</div>
            <div>Last Updated: {new Date(currentAnalysis.lastUpdated).toISOString()}</div>
            <div>Best Patterns: {currentAnalysis.bestPatterns.length}</div>
            <div>Recommendations: {currentAnalysis.tileRecommendations.length}</div>
            <div>Threats: {currentAnalysis.threats.length}</div>
          </div>
        )}
      </div>
    </div>
  )
}