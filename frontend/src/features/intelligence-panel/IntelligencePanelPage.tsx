// Intelligence Panel Page - Main interface for AI analysis and recommendations
// Simplified interface using PrimaryAnalysisCard

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useIntelligenceStore } from '../../stores/intelligence-store'
import { usePatternStore } from '../../stores/pattern-store'
import { useTileStore } from '../../stores/tile-store'
import type { PatternSelectionOption } from '../../../../shared/nmjl-types'
import { PrimaryAnalysisCard } from './PrimaryAnalysisCard'
import { AdvancedPatternAnalysis } from './AdvancedPatternAnalysis'
import { LoadingSpinner } from '../../ui-components/LoadingSpinner'
import { Container } from '../../ui-components/layout/Container'

export const IntelligencePanelPage = () => {
  const navigate = useNavigate()
  const {
    currentAnalysis,
    isAnalyzing,
    analysisError,
    analyzeHand,
    autoAnalyze
  } = useIntelligenceStore()
  
  const { getTargetPatterns, clearSelection, addTargetPattern } = usePatternStore()
  const selectedPatterns = getTargetPatterns()
  const { playerHand = [], handSize = 0 } = useTileStore()
  
  // Removed hasTriggeredInitialAnalysis as it's no longer needed
  
  // Pattern switching state - optimized for instant feedback
  const [isPatternSwitching, setIsPatternSwitching] = useState(false)
  const [patternSwitchStartTime, setPatternSwitchStartTime] = useState<number | null>(null)
  const [intendedPrimaryPatternId, setIntendedPrimaryPatternId] = useState<string | null>(null)
  
  // Auto-analyze when tiles or patterns change - single effect to prevent loops
  useEffect(() => {
    
    
    if (!autoAnalyze) return
    
    const hasPatterns = selectedPatterns?.length > 0
    const hasTiles = playerHand?.length >= 10 // Minimum for meaningful analysis
    
    // Only trigger analysis if we're not already analyzing and haven't analyzed yet
    // Don't re-analyze if we're in the middle of a pattern switch
    if (hasTiles && !isAnalyzing && !currentAnalysis && !isPatternSwitching) {
      
      if (hasPatterns) {
        analyzeHand(playerHand, selectedPatterns)
      } else {
        // If we have tiles but no patterns, analyze with empty patterns to get AI recommendations
        analyzeHand(playerHand, [])
      }
    }
  }, [playerHand, selectedPatterns, autoAnalyze, analyzeHand, isAnalyzing, currentAnalysis, isPatternSwitching])
  
  const tileCount = handSize || 0
  const hasEnoughTiles = tileCount >= 10
  
  return (
    <div className="min-h-screen bg-gray-50 w-full overflow-x-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <Container size="full" padding="sm" center={true}>
          <div className="w-full">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
              🧠 AI Intelligence Panel
            </h1>
            <p className="text-gray-600 text-xs sm:text-sm">
              Advanced pattern analysis and strategic recommendations
            </p>
          </div>
        </Container>
      </div>
      
      {/* Main Content */}
      <Container size="full" padding="sm" center={true}>
        <div className="space-y-6">
        {/* Pattern Switch Loading State - Optimized for instant feedback */}
        {hasEnoughTiles && isPatternSwitching && (
          <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
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
          <div className="mb-8 p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
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
          <div className="mb-8 p-3 bg-white rounded-xl border border-red-200 shadow-sm">
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
          <div className="mb-8 p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
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
                    Once you input your tiles, AI will analyze all 71 NMJL patterns 
                    and provide strategic recommendations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success State Transition - Show brief success message after loading */}
        {hasEnoughTiles && !isAnalyzing && currentAnalysis && !analysisError && (
          <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg">
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
                currentPattern={(() => {
                  // Use intended primary pattern if it exists in recommendations
                  if (intendedPrimaryPatternId) {
                    const intendedPattern = currentAnalysis.recommendedPatterns.find(rec => rec.pattern.id === intendedPrimaryPatternId)
                    if (intendedPattern) {
                      return intendedPattern
                    }
                  }
                  // Fallback to first pattern
                  return currentAnalysis.recommendedPatterns[0] || null
                })()}
                onPatternSwitch={async (pattern) => {
                  // Optimized pattern switching with performance monitoring
                  const switchStartTime = performance.now()
                  setIsPatternSwitching(true)
                  setPatternSwitchStartTime(switchStartTime)
                  
                  try {
                    // True pattern swap - preserve other patterns
                    const currentTargetPatterns = getTargetPatterns()
                    const currentPrimary = currentAnalysis.recommendedPatterns[0]?.pattern
                    
                    // Build new pattern list with swapped positions  
                    let newPatterns: PatternSelectionOption[] = []
                    
                    if (currentPrimary && currentTargetPatterns.some(pattern => pattern.id === currentPrimary.id)) {
                      // Replace primary with new pattern, keep others
                      newPatterns = [
                        pattern.pattern,
                        ...currentAnalysis.recommendedPatterns.slice(1).map(rec => rec.pattern)
                      ]
                    } else {
                      // Add new pattern as primary, keep existing
                      newPatterns = [
                        pattern.pattern,
                        ...currentAnalysis.recommendedPatterns.map(rec => rec.pattern).filter(p => p.id !== pattern.pattern.id)
                      ]
                    }
                    
                    // Set the intended primary pattern
                    setIntendedPrimaryPatternId(pattern.pattern.id)
                    
                    // Update pattern store
                    clearSelection()
                    newPatterns.forEach(pattern => addTargetPattern(pattern.id))
                    
                    // Trigger re-analysis with all patterns
                    await analyzeHand(playerHand, newPatterns)
                    
                    const switchEndTime = performance.now()
                    const switchDuration = switchEndTime - switchStartTime
                    // Track performance for development insights
                    if (process.env.NODE_ENV === 'development' && switchDuration < 200) {
                      console.log('Pattern switch cache hit:', switchDuration + 'ms')
                    }
                    
                    // Pattern switch completed
                    
                  } catch (error) {
                    console.error('Pattern switch error:', error)
                  } finally {
                    setIsPatternSwitching(false)
                    setPatternSwitchStartTime(null)
                    // Clear intended pattern after switch is complete - increased timeout to ensure stability
                    setTimeout(() => {
                      setIntendedPrimaryPatternId(null)
                    }, 1000)
                  }
                }}
                onBrowseAllPatterns={() => {
                  // Navigate to pattern selection
                  navigate('/patterns')
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
                    
                    
                    
                    
                    // Find the pattern recommendation - try multiple ID formats
                    let patternRec = currentAnalysis.recommendedPatterns?.find(rec => rec.pattern.id === patternId)
                    
                    // If not found, try finding by engine1Facts patternId
                    if (!patternRec && currentAnalysis.engine1Facts) {
                      const engine1Fact = currentAnalysis.engine1Facts.find(fact => fact.patternId === patternId)
                      if (engine1Fact) {
                        // Find corresponding recommendation by pattern matching
                        patternRec = currentAnalysis.recommendedPatterns?.find(rec => 
                          rec.pattern.id === engine1Fact.patternId ||
                          rec.pattern.section + '-' + rec.pattern.line === engine1Fact.patternId ||
                          (String(rec.pattern.section) + String(rec.pattern.line)) === engine1Fact.patternId
                        )
                      }
                    }
                    
                    if (!patternRec) {
                      
                      return
                    }
                    
                    
                    
                    // Check if this is already the primary pattern
                    const currentPrimary = currentAnalysis.recommendedPatterns[0]?.pattern
                    if (currentPrimary && currentPrimary.id === patternRec.pattern.id) {
                      
                      return
                    }
                    
                    // True pattern swap - preserve other patterns
                    const currentTargetPatterns = getTargetPatterns()
                    
                    
                    // Build new pattern list with swapped positions
                    let newPatterns: PatternSelectionOption[] = []
                    
                    if (currentPrimary && currentTargetPatterns.some(pattern => pattern.id === currentPrimary.id)) {
                      // Replace primary with new pattern, keep others
                      newPatterns = [
                        patternRec.pattern,
                        ...currentAnalysis.recommendedPatterns.slice(1).map(rec => rec.pattern)
                      ]
                    } else {
                      // Add new pattern as primary, keep existing
                      newPatterns = [
                        patternRec.pattern,
                        ...currentAnalysis.recommendedPatterns.map(rec => rec.pattern).filter(p => p.id !== patternRec.pattern.id)
                      ]
                    }
                    
                    
                    
                    // Set the intended primary pattern
                    setIntendedPrimaryPatternId(patternRec.pattern.id)
                    
                    // Update pattern store
                    clearSelection()
                    newPatterns.forEach(pattern => addTargetPattern(pattern.id))
                    
                    // Trigger re-analysis with all patterns
                    await analyzeHand(playerHand, newPatterns)
                    
                    const switchEndTime = performance.now()
                    const switchDuration = switchEndTime - switchStartTime
                    if (process.env.NODE_ENV === 'development' && switchDuration < 200) {
                      console.log('Pattern switch cache hit:', switchDuration + 'ms')
                    }
                    
                  
                    setIsPatternSwitching(false)
                    setPatternSwitchStartTime(null)
                    // Clear intended pattern after switch is complete - increased timeout to ensure stability
                    setTimeout(() => {
                      setIntendedPrimaryPatternId(null)
                    }, 1000)
                  } catch (error) {
                    console.error('Pattern switch error:', error)
                    setIsPatternSwitching(false)
                    setPatternSwitchStartTime(null)
                  }
                }}
              />
            )}
          </div>
        )}
        </div>
      </Container>
    </div>
  )
}