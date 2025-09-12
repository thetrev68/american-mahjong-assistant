import React, { useState, useEffect } from 'react'
import { Button } from '../../ui-components/Button'
import { Card } from '../../ui-components/Card'
import { LoadingSpinner } from '../../ui-components/LoadingSpinner'
import { PatternVariationDisplay } from '../../ui-components/patterns/PatternVariationDisplay'
import { useIntelligenceStore } from '../../stores/intelligence-store'
import { usePatternStore } from '../../stores/pattern-store'
import { useTileStore } from '../../stores/tile-store'
import { getPatternCompletionSummary } from '../../utils/tile-display-utils'
import type { PatternSelectionOption } from 'shared-types'

interface IntelligencePanelProps {
  isAnalyzing: boolean
  currentAnalysis: {
    recommendations?: {
      discard?: {
        reasoning: string
      }
    }
    recommendedPatterns?: Array<{
      pattern: PatternSelectionOption
      completionPercentage: number
      isPrimary: boolean
      confidence: number
      reasoning: string
      difficulty: 'easy' | 'medium' | 'hard'
    }>
    overallScore?: number
  } | null
  gamePhase: 'charleston' | 'gameplay'
}

const IntelligencePanel: React.FC<IntelligencePanelProps> = ({
  isAnalyzing,
  currentAnalysis,
  gamePhase
}) => {
  const [showAllPatterns, setShowAllPatterns] = useState(false)
  const { analyzeHand } = useIntelligenceStore()
  const { getTargetPatterns, addTargetPattern, clearSelection } = usePatternStore()
  const { playerHand } = useTileStore()
  
  const selectedPatterns = getTargetPatterns()
  const hasPatternSelected = selectedPatterns.length > 0
  
  // Auto-select the top recommended pattern if none is selected
  useEffect(() => {
    if (!hasPatternSelected && currentAnalysis?.recommendedPatterns && currentAnalysis.recommendedPatterns.length > 0) {
      const topPattern = currentAnalysis.recommendedPatterns[0]
      // Add as primary pattern without clearing existing patterns
      addTargetPattern(topPattern.pattern.id)
    }
  }, [hasPatternSelected, currentAnalysis]) // Removed clearSelection and addTargetPattern from deps
  

  const handlePatternSelect = async (patternId: string) => {
    if (selectedPatterns.some(p => p.id === patternId)) return // Already selected
    
    // Add pattern to existing selection (don't clear other patterns)
    addTargetPattern(patternId)
    
    // Re-analyze with all selected patterns
    const allSelectedPatterns = getTargetPatterns()
    const newPattern = currentAnalysis?.recommendedPatterns?.find(rec => rec.pattern.id === patternId)?.pattern
    
    if (newPattern) {
      // Include the new pattern along with existing ones
      const patternsToAnalyze = allSelectedPatterns.some(p => p.id === patternId) 
        ? allSelectedPatterns 
        : [...allSelectedPatterns, newPattern]
      
      await analyzeHand(playerHand, patternsToAnalyze)
    }
  }

  const getPhaseTitle = () => {
    if (gamePhase === 'charleston') {
      return hasPatternSelected ? '🎯 Charleston Strategy' : '🤔 Choose Your Target Pattern'
    }
    return '🧠 AI Co-Pilot'
  }

  const getPhaseInstructions = () => {
    if (gamePhase === 'charleston' && !hasPatternSelected) {
      return 'Select your primary pattern to get strategic Charleston recommendations'
    }
    return null
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{getPhaseTitle()}</h3>
        {isAnalyzing && <LoadingSpinner size="sm" />}
      </div>
      
      <div className="space-y-4">
        {/* Phase Instructions */}
        {getPhaseInstructions() && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="text-sm text-yellow-800">{getPhaseInstructions()}</div>
          </div>
        )}

        {/* Analysis Loading */}
        {isAnalyzing && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <LoadingSpinner size="sm" />
              <div className="text-sm text-blue-800">Analyzing all 71 NMJL patterns...</div>
            </div>
          </div>
        )}

        {currentAnalysis ? (
          <>
            {/* PRIMARY PATTERN DETAILS - Zone 4 from design */}
            {currentAnalysis.recommendedPatterns && currentAnalysis.recommendedPatterns.length > 0 && (
              <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-2 border-purple-200">
                <div className="space-y-3">
                  <div>
                    <h4 className="text-lg font-bold text-purple-800 mb-1">PRIMARY PATTERN</h4>
                    <div className="text-xl font-bold text-gray-900 mb-2">
                      {currentAnalysis.recommendedPatterns[0]?.pattern ? (
                        <PatternVariationDisplay
                          patternTiles={currentAnalysis.recommendedPatterns[0].pattern.pattern.split(' ')}
                          playerTiles={playerHand.map(t => t.id)}
                          showMatches={true}
                          invertMatches={true}
                          showCompletion={false}
                          spacing={true}
                          size="lg"
                          patternGroups={currentAnalysis.recommendedPatterns[0].pattern.groups as unknown as Array<{ Group: string | number; display_color?: string; [key: string]: unknown }>}
                        />
                      ) : (
                        'Selected Pattern'
                      )}
                    </div>
                    {currentAnalysis.recommendedPatterns[0]?.pattern && (
                      <div className="text-sm text-gray-600 font-medium mt-1">
                        {currentAnalysis.recommendedPatterns[0].pattern.section} - {currentAnalysis.recommendedPatterns[0].pattern.line}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="text-2xl font-bold text-green-600">
                        {Math.round(currentAnalysis.recommendedPatterns[0]?.completionPercentage || 0)}%
                      </div>
                      <div className="text-sm text-gray-600">
                        {(() => {
                          const pattern = currentAnalysis.recommendedPatterns[0]?.pattern
                          if (pattern) {
                            const completion = getPatternCompletionSummary(
                              pattern.pattern.split(' '), 
                              playerHand.map(t => t.id)
                            )
                            return `complete (${completion.matchedTiles}/${completion.totalTiles})`
                          }
                          return 'complete'
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-lg font-bold text-blue-600">
                        AI Score: {Math.round(currentAnalysis.overallScore || 0)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Progress:</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-green-500 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(currentAnalysis.recommendedPatterns[0]?.completionPercentage || 0, 100)}%` }}
                      />
                    </div>
                  </div>
                  
                  {currentAnalysis.recommendedPatterns[0]?.reasoning && (
                    <div className="text-sm text-gray-700 bg-white/80 p-2 rounded">
                      <span className="font-medium">Strategy:</span> {currentAnalysis.recommendedPatterns[0].reasoning}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Overall Analysis Score - when no primary pattern */}
            {!hasPatternSelected && currentAnalysis.overallScore && (
              <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-green-800">Overall Hand Score</div>
                  <div className="text-xl font-bold text-green-600">
                    {Math.round(currentAnalysis.overallScore)}/100
                  </div>
                </div>
              </div>
            )}

            {/* Primary Recommendation */}
            {currentAnalysis.recommendations?.discard && (
              <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                <div className="text-sm font-medium text-blue-800 mb-2">💡 AI Recommendation</div>
                <div className="text-sm text-gray-700">
                  {currentAnalysis.recommendations.discard.reasoning}
                </div>
              </div>
            )}

            {/* Pattern Selection & Progress */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-700">
                  {hasPatternSelected ? '🎯 Your Patterns' : '📋 Recommended Patterns'}
                </div>
                {currentAnalysis.recommendedPatterns && currentAnalysis.recommendedPatterns.length > 5 && (
                  <Button
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowAllPatterns(!showAllPatterns)}
                    className="text-xs"
                  >
                    {showAllPatterns ? 'Show Less' : `+${currentAnalysis.recommendedPatterns.length - 5} More`}
                  </Button>
                )}
              </div>
              
              {currentAnalysis.recommendedPatterns?.slice(0, showAllPatterns ? undefined : 5).map((patternRec, index) => {
                const completionPercentage = patternRec.completionPercentage || 0
                const isSelected = selectedPatterns.some(p => p.id === patternRec.pattern.id)
                const isPrimary = patternRec.isPrimary || index === 0
                
                return (
                  <div 
                    key={patternRec.pattern.id} 
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-purple-50 border-purple-300' 
                        : 'bg-gray-50 border-gray-200 hover:bg-blue-50 hover:border-blue-300'
                    }`}
                    onClick={() => handlePatternSelect(patternRec.pattern.id)}
                  >
                    <div className="space-y-2">
                      {/* Pattern display gets full width */}
                      <div className="w-full">
                        <div className="flex items-center gap-2 mb-1">
                          <PatternVariationDisplay
                            patternTiles={patternRec.pattern.pattern.split(' ')}
                            playerTiles={playerHand.map(t => t.id)}
                            showMatches={true}
                            invertMatches={true}
                            showCompletion={false}
                            spacing={true}
                            size="sm"
                            patternGroups={patternRec.pattern.groups as unknown as Array<{ Group: string | number; display_color?: string; [key: string]: unknown }>}
                          />
                          {isPrimary && isSelected && (
                            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                              Primary
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Pattern info and select button on separate line */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 font-medium">
                            {patternRec.pattern.section} - {patternRec.pattern.line}
                          </span>
                          <span className="text-xs text-gray-500">
                            {patternRec.pattern.points || 0} pts
                          </span>
                          <span className="text-xs text-gray-500">
                            {patternRec.difficulty}
                          </span>
                          <span className="text-xs text-gray-500">
                            {(() => {
                              const completion = getPatternCompletionSummary(
                                patternRec.pattern.pattern.split(' '), 
                                playerHand.map(t => t.id)
                              )
                              return `${Math.round(completionPercentage)}% complete (${completion.matchedTiles}/${completion.totalTiles})`
                            })()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isSelected ? (
                            <div className="flex items-center gap-1">
                              <div className="text-purple-600">✓</div>
                              <span className="text-xs text-purple-600">Selected</span>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-blue-600 border-blue-300 hover:bg-blue-50 text-xs px-2 py-1"
                              onClick={(e) => {
                                e.stopPropagation()
                                handlePatternSelect(patternRec.pattern.id)
                              }}
                            >
                              Select
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          isSelected ? 'bg-purple-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(completionPercentage, 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              
              {/* Link to see more matching patterns */}
              <div className="mt-4 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 hover:text-blue-800 text-sm"
                  onClick={() => {
                    // TODO: Navigate to full pattern browser or analysis page
                    console.log('Navigate to more patterns')
                  }}
                >
                  🔍 Browse All Matching Patterns →
                </Button>
              </div>
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
  )
}

export default IntelligencePanel