// Intelligence Panel Page - Main interface for AI analysis and recommendations
// Simplified interface using PrimaryAnalysisCard

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useIntelligenceStore } from '../../stores/intelligence-store'
import { usePatternStore } from '../../stores/pattern-store'
import { useTileStore } from '../../stores/tile-store'
import { PrimaryAnalysisCard } from './PrimaryAnalysisCard'
import { AdvancedPatternAnalysis } from './AdvancedPatternAnalysis'
import { LoadingSpinner } from '../../ui-components/LoadingSpinner'

export const IntelligencePanelPage = () => {
  const {
    currentAnalysis,
    isAnalyzing,
    analysisError,
    analyzeHand,
    autoAnalyze
  } = useIntelligenceStore()
  
  const { getTargetPatterns, clearSelection, addTargetPattern, removeTargetPattern } = usePatternStore()
  const selectedPatterns = getTargetPatterns()
  const { playerHand = [], selectedTiles = [], handSize = 0 } = useTileStore()
  
  // Removed hasTriggeredInitialAnalysis as it's no longer needed
  
  // Pattern switching state - optimized for instant feedback
  const [isPatternSwitching, setIsPatternSwitching] = useState(false)
  const [patternSwitchStartTime, setPatternSwitchStartTime] = useState<number | null>(null)
  
  // Auto-analyze when tiles or patterns change - single effect to prevent loops
  useEffect(() => {
    if (!autoAnalyze) return
    
    const hasPatterns = selectedPatterns?.length > 0
    const hasTiles = playerHand?.length >= 10 // Minimum for meaningful analysis
    
    // Only trigger analysis if we're not already analyzing and haven't analyzed yet
    if (hasTiles && !isAnalyzing && !currentAnalysis) {
      if (hasPatterns) {
        analyzeHand(playerHand, selectedPatterns)
      } else {
        // If we have tiles but no patterns, analyze with empty patterns to get AI recommendations
        analyzeHand(playerHand, [])
      }
    }
  }, [playerHand, selectedPatterns, autoAnalyze, analyzeHand, isAnalyzing, currentAnalysis])
  
  const tileCount = handSize || 0
  const hasEnoughTiles = tileCount >= 10
  
  return (
    <div className="min-h-screen bg-gray-50 w-full overflow-x-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-full mx-auto px-2 sm:px-3 py-2 sm:py-4">
          <div className="w-full">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
              🧠 AI Intelligence Panel
            </h1>
            <p className="text-gray-600 text-xs sm:text-sm">
              Advanced pattern analysis and strategic recommendations
            </p>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-full mx-auto px-1 sm:px-2 py-2 sm:py-4">
        {/* Pattern Switch Loading State - Optimized for instant feedback */}
        {hasEnoughTiles && isPatternSwitching && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6">
                <LoadingSpinner size="sm" color="primary" />
              </div>
              <div>
                <div className="font-medium text-blue-900">
                  🔄 Switching Pattern...
                </div>
                <div className="text-sm text-blue-700">
                  Leveraging Engine 1 cache for instant analysis
                  {patternSwitchStartTime && (
                    <span className="ml-2 text-xs">
                      ({Math.round(performance.now() - patternSwitchStartTime)}ms)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State - Prominent when analysis is running */}
        {hasEnoughTiles && isAnalyzing && !isPatternSwitching && (
          <div className="mb-8 p-8 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="text-center">
              <div className="mb-6">
                <LoadingSpinner 
                  size="xl" 
                  color="primary" 
                  message="Analyzing all 71 NMJL patterns..."
                />
              </div>
              
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                🧠 AI Analysis in Progress
              </h2>
              
              <div className="max-w-lg mx-auto space-y-3">
                <p className="text-gray-600">
                  Running comprehensive pattern analysis on your {tileCount} tiles using our 
                  3-engine intelligence system.
                </p>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-blue-900">Engine Progress</span>
                  </div>
                  <div className="text-sm text-blue-800 space-y-1">
                    <div>🔍 Pattern Facts Engine - Mathematical tile matching</div>
                    <div>📊 Pattern Ranking Engine - 4-component scoring system</div>
                    <div>🎯 Tile Recommendation Engine - Strategic analysis</div>
                  </div>
                </div>
                
                <p className="text-xs text-gray-500">
                  Estimated completion: 2-5 seconds
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {hasEnoughTiles && analysisError && !isAnalyzing && (
          <div className="mb-8 p-6 bg-white rounded-xl border border-red-200 shadow-sm">
            <div className="text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <h2 className="text-lg font-semibold text-red-900 mb-3">
                Analysis Failed
              </h2>
              <p className="text-red-700 mb-4">{analysisError}</p>
              <button
                onClick={() => analyzeHand(playerHand, selectedPatterns || [])}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Retry Analysis
              </button>
            </div>
          </div>
        )}

        {/* Prerequisites Check - Only show when no tiles */}
        {!hasEnoughTiles && !isAnalyzing && (
          <div className="mb-8 p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="text-center">
              <div className="text-4xl mb-4">🤖</div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Input Your Tiles to Get AI Analysis
              </h2>
              
              <div className="space-y-3 max-w-md mx-auto">
                {/* Tile Input Status */}
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50 border-gray-200">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold bg-indigo-500 text-white">
                    1
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-gray-900">
                      Input Your Hand Tiles
                    </div>
                    <div className="text-sm text-gray-600">
                      {tileCount}/10 tiles minimum needed for analysis
                    </div>
                  </div>
                  <Link
                    to="/tiles"
                    className="px-3 py-1 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/80 transition-colors"
                  >
                    Input Tiles
                  </Link>
                </div>
                
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                  <h4 className="font-medium text-indigo-900 mb-1">✨ AI-Powered Flow</h4>
                  <p className="text-sm text-indigo-800">
                    Once you input your tiles, AI will instantly analyze all 71 NMJL patterns 
                    and provide strategic recommendations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success State Transition - Show brief success message after loading */}
        {hasEnoughTiles && !isAnalyzing && currentAnalysis && !analysisError && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">✓</span>
              </div>
              <div>
                <div className="font-medium text-green-900">
                  Analysis Complete! 
                </div>
                <div className="text-sm text-green-700">
                  Found {currentAnalysis.recommendedPatterns?.length || 0} recommended patterns 
                  with overall score: {Math.round(currentAnalysis.overallScore)}/100
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Intelligence Panel - Only show when analysis is complete */}
        {hasEnoughTiles && !isAnalyzing && currentAnalysis && !analysisError && (
          <div className="space-y-6">
            
            {/* Primary Analysis */}
            {currentAnalysis && (
              <PrimaryAnalysisCard 
                analysis={currentAnalysis}
                currentPattern={currentAnalysis.recommendedPatterns[0] || null}
                onPatternSwitch={async (pattern) => {
                  // Optimized pattern switching with performance monitoring
                  const switchStartTime = performance.now()
                  setIsPatternSwitching(true)
                  setPatternSwitchStartTime(switchStartTime)
                  
                  try {
                    // Pattern switch initiated - True swap logic
                    
                    // Get current primary pattern (first in target patterns)
                    const currentTargetPatterns = getTargetPatterns()
                    const currentPrimaryPattern = currentAnalysis.recommendedPatterns[0]?.pattern
                    
                    // Perform true swap instead of clearing all patterns
                    if (currentPrimaryPattern && currentTargetPatterns.includes(currentPrimaryPattern.id)) {
                      // Remove current primary pattern
                      removeTargetPattern(currentPrimaryPattern.id)
                    }
                    
                    // Add new pattern to primary position (start of array)
                    // Insert at beginning to make it primary
                    const newTargetPatterns = [pattern.pattern.id, ...currentTargetPatterns.filter(id => id !== pattern.pattern.id)]
                    
                    // Update pattern store with swapped patterns
                    clearSelection()
                    newTargetPatterns.forEach(patternId => addTargetPattern(patternId))
                    
                    // Trigger re-analysis with new primary pattern - Engine 1 cache should make this instant
                    await analyzeHand(playerHand, newTargetPatterns.map(id => 
                      pattern.pattern.id === id ? pattern.pattern : 
                      currentAnalysis.recommendedPatterns.find(rec => rec.pattern.id === id)?.pattern
                    ).filter(Boolean))
                    
                    const switchEndTime = performance.now()
                    const switchDuration = switchEndTime - switchStartTime
                    const wasCacheHit = switchDuration < 200 // Likely cache hit if under 200ms
                    
                    // Track performance for development insights (console only)
                    if (process.env.NODE_ENV === 'development') {
                      console.log(`Pattern switch: ${switchDuration}ms (${wasCacheHit ? 'cache hit' : 'cache miss'}) - ${pattern.pattern.section} #${pattern.pattern.line}`)
                    }
                    
                    // Pattern switch completed
                    
                  } catch (error) {
                    console.error('❌ Pattern switch failed:', error)
                  } finally {
                    setIsPatternSwitching(false)
                    setPatternSwitchStartTime(null)
                  }
                }}
                onBrowseAllPatterns={() => {
                  // Navigate to pattern selection
                  window.location.href = '/patterns'
                }}
              />
            )}
            
            {/* Advanced Pattern Analysis & AI Recommendations */}
            {currentAnalysis && (
              <AdvancedPatternAnalysis
                analysis={currentAnalysis}
                playerTiles={playerHand.map(t => t.id)}
                gamePhase="charleston" // TODO: Get actual game phase
                onPatternSelect={async (patternId) => {
                  // Handle pattern selection from advanced analysis with pattern switching
                  const switchStartTime = performance.now()
                  setIsPatternSwitching(true)
                  setPatternSwitchStartTime(switchStartTime)
                  
                  try {
                    // Find the pattern recommendation
                    const patternRec = currentAnalysis.recommendedPatterns?.find(rec => rec.pattern.id === patternId)
                    if (!patternRec) {
                      console.warn('Pattern not found in recommendations:', patternId)
                      return
                    }
                    
                    // Perform true swap instead of clearing all patterns
                    const currentTargetPatterns = getTargetPatterns()
                    const currentPrimaryPattern = currentAnalysis.recommendedPatterns[0]?.pattern
                    
                    if (currentPrimaryPattern && currentTargetPatterns.includes(currentPrimaryPattern.id)) {
                      // Remove current primary pattern
                      removeTargetPattern(currentPrimaryPattern.id)
                    }
                    
                    // Add new pattern to primary position
                    const newTargetPatterns = [patternId, ...currentTargetPatterns.filter(id => id !== patternId)]
                    
                    // Update pattern store with swapped patterns
                    clearSelection()
                    newTargetPatterns.forEach(patternId => addTargetPattern(patternId))
                    
                    // Trigger re-analysis with Engine 1 cache optimization
                    await analyzeHand(playerHand, newTargetPatterns.map(id => 
                      patternRec.pattern.id === id ? patternRec.pattern : 
                      currentAnalysis.recommendedPatterns.find(rec => rec.pattern.id === id)?.pattern
                    ).filter(Boolean))
                    
                    const switchEndTime = performance.now()
                    const switchDuration = switchEndTime - switchStartTime
                    const wasCacheHit = switchDuration < 200
                    
                    if (process.env.NODE_ENV === 'development') {
                      console.log(`Advanced pattern switch: ${switchDuration}ms (${wasCacheHit ? 'cache hit' : 'cache miss'}) - ${patternRec.pattern.section} #${patternRec.pattern.line}`)
                    }
                  } catch (error) {
                    console.error('❌ Pattern switch from advanced analysis failed:', error)
                  } finally {
                    setIsPatternSwitching(false)
                    setPatternSwitchStartTime(null)
                  }
                }}
              />
            )}
          </div>
        )}
        
      </div>
    </div>
  )
}