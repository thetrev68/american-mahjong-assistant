import React from 'react'
import { Button } from '../../ui-components/Button'
import { LoadingSpinner } from '../../ui-components/LoadingSpinner'
import { PatternVariationDisplay } from '../../ui-components/patterns/PatternVariationDisplay'
import { TurnRecommendationsSection } from './components/TurnRecommendationsSection'
import { CallOpportunitySection } from './components/CallOpportunitySection'
import { OpponentInsightsSection } from './components/OpponentInsightsSection'
import { DefensivePlaySection } from './components/DefensivePlaySection'
import { usePatternStore } from '../../stores/pattern-store'
import { useTileStore } from '../../stores/tile-store'
import { getPatternCompletionSummary } from '../../utils/tile-display-utils'
import type { HandAnalysis } from '../../stores/intelligence-store'
import type { GameState } from '../intelligence-panel/services/turn-intelligence-engine'
import type { CallOpportunity } from '../intelligence-panel/services/call-opportunity-analyzer'

interface EnhancedIntelligencePanelProps {
  analysis: HandAnalysis | null
  gameState: GameState
  playerId: string
  isCurrentTurn: boolean
  callOpportunity: CallOpportunity | null
  onClose?: () => void
  onActionRecommendation?: (action: string, data: Record<string, unknown>) => void
  gamePhase?: 'charleston' | 'gameplay'
  isAnalyzing?: boolean
}

export const EnhancedIntelligencePanel: React.FC<EnhancedIntelligencePanelProps> = ({
  analysis,
  isCurrentTurn,
  callOpportunity,
  onClose,
  onActionRecommendation,
  gamePhase = 'gameplay',
  isAnalyzing = false
}) => {
  const { getTargetPatterns } = usePatternStore()
  const { playerHand } = useTileStore()
  
  const selectedPatterns = getTargetPatterns()
  const hasPatternSelected = selectedPatterns.length > 0
  return (
    <div className="enhanced-intelligence-panel bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-purple-200/50 max-h-[80vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-purple-800">
          {gamePhase === 'charleston' 
            ? (hasPatternSelected ? '🎯 Charleston Strategy' : '🤔 Choose Your Target Pattern')
            : '🧠 AI Co-Pilot'
          }
        </h2>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        )}
        {isAnalyzing && <LoadingSpinner size="sm" />}
      </div>

      {/* Turn-Aware Recommendations Section */}
      {isCurrentTurn && analysis?.turnIntelligence && (
        <TurnRecommendationsSection 
          recommendations={analysis.turnIntelligence}
          onAction={onActionRecommendation}
        />
      )}
      
      {/* Call Opportunity Section */}
      {callOpportunity && analysis?.currentCallRecommendation && (
        <CallOpportunitySection
          opportunity={callOpportunity}
          recommendation={analysis.currentCallRecommendation}
          onCallAction={onActionRecommendation}
        />
      )}
      
      {/* Opponent Analysis Section */}
      {analysis?.opponentAnalysis && analysis.opponentAnalysis.length > 0 && (
        <OpponentInsightsSection
          opponents={analysis.opponentAnalysis}
          dangerousTiles={analysis.dangerousTiles}
        />
      )}
      
      {/* Defensive Analysis Section */}
      {analysis?.defensiveAnalysis && (
        <DefensivePlaySection
          defensiveAnalysis={analysis.defensiveAnalysis}
          patternSwitchSuggestions={analysis.patternSwitchSuggestions}
        />
      )}
      
      {/* Enhanced Pattern Analysis */}
      {analysis ? (
        <div className="pattern-analysis space-y-4">
          {/* Charleston/Gameplay Recommendations */}
          {gamePhase === 'charleston' && (
            <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
              <div className="text-sm font-medium text-blue-800 mb-2">🎯 Charleston Strategy</div>
              <div className="text-sm text-gray-700">
                {hasPatternSelected
                  ? `Focus on collecting tiles for ${selectedPatterns[0]?.displayName}. Keep tiles that advance this pattern and pass tiles that don't contribute.`
                  : 'Select a target pattern to get specific Charleston passing recommendations.'}
              </div>
            </div>
          )}
          
          {gamePhase === 'gameplay' && analysis.recommendations?.discard && (
            <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
              <div className="text-sm font-medium text-blue-800 mb-2">💡 Gameplay Recommendation</div>
              <div className="text-sm text-gray-700">
                {analysis.recommendations.discard.reasoning}
              </div>
            </div>
          )}

          {/* PRIMARY PATTERN DETAILS */}
          {analysis.recommendedPatterns && analysis.recommendedPatterns.length > 0 && (
            <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-2 border-purple-200">
              <div className="space-y-3">
                <div>
                  <h4 className="text-lg font-bold text-purple-800 mb-1">PRIMARY PATTERN</h4>
                  {/* Pattern name above visual representation - full width */}
                  {analysis.recommendedPatterns[0]?.pattern && (
                    <div className="text-base font-semibold text-gray-900 mb-2 w-full">
                      <span className="font-bold">{analysis.recommendedPatterns[0].pattern.section} #{analysis.recommendedPatterns[0].pattern.line}</span>
                      {analysis.recommendedPatterns[0].pattern.displayName && (
                        <span className="font-normal"> ({analysis.recommendedPatterns[0].pattern.displayName})</span>
                      )}
                    </div>
                  )}
                  {/* Pattern representation - ensure exactly 14 digits */}
                  <div className="text-xl font-bold text-gray-900 mb-2">
                    {analysis.recommendedPatterns[0]?.pattern ? (
                      <PatternVariationDisplay
                        patternTiles={(() => {
                          // Use expanded tiles if available, otherwise fall back to generic pattern
                          const expandedTiles = analysis.recommendedPatterns[0].expandedTiles
                          if (expandedTiles && expandedTiles.length === 14) {
                            return expandedTiles
                          }
                          
                          // Fallback to generic pattern parsing (should be rare now)
                          const tiles = analysis.recommendedPatterns[0].pattern.pattern.split(' ')
                          if (tiles.length < 14) {
                            return [...tiles, ...Array(14 - tiles.length).fill('?')]
                          }
                          return tiles.slice(0, 14)
                        })()}
                        playerTiles={playerHand.map(t => t.id)}
                        showMatches={true}
                        invertMatches={true}
                        showCompletion={false}
                        spacing={true}
                        size="lg"
                        patternGroups={analysis.recommendedPatterns[0].pattern.groups as unknown as Array<{ Group: string | number; display_color?: string; [key: string]: unknown }>}
                      />
                    ) : (
                      'Selected Pattern'
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-bold text-green-600">
                      {(() => {
                        const pattern = analysis.recommendedPatterns[0]?.pattern
                        if (pattern) {
                          // Use expanded tiles if available, otherwise fall back to generic pattern
                          const expandedTiles = analysis.recommendedPatterns[0].expandedTiles
                          let normalizedTiles: string[]
                          
                          if (expandedTiles && expandedTiles.length === 14) {
                            normalizedTiles = expandedTiles
                          } else {
                            // Fallback to generic pattern parsing
                            const patternTiles = pattern.pattern.split(' ')
                            normalizedTiles = patternTiles.length < 14 
                              ? [...patternTiles, ...Array(14 - patternTiles.length).fill('?')] 
                              : patternTiles.slice(0, 14)
                          }
                          
                          const completion = getPatternCompletionSummary(
                            normalizedTiles, 
                            playerHand.map(t => t.id)
                          )
                          return `${completion.matchedTiles}/14`
                        }
                        return '0/14'
                      })()}
                    </div>
                    <div className="text-sm text-gray-600">
                      tiles ({Math.round((() => {
                        const pattern = analysis.recommendedPatterns[0]?.pattern
                        if (pattern) {
                          // Use expanded tiles if available, otherwise fall back to generic pattern
                          const expandedTiles = analysis.recommendedPatterns[0].expandedTiles
                          let normalizedTiles: string[]
                          
                          if (expandedTiles && expandedTiles.length === 14) {
                            normalizedTiles = expandedTiles
                          } else {
                            // Fallback to generic pattern parsing
                            const patternTiles = pattern.pattern.split(' ')
                            normalizedTiles = patternTiles.length < 14 
                              ? [...patternTiles, ...Array(14 - patternTiles.length).fill('?')] 
                              : patternTiles.slice(0, 14)
                          }
                          
                          const completion = getPatternCompletionSummary(
                            normalizedTiles, 
                            playerHand.map(t => t.id)
                          )
                          return (completion.matchedTiles / 14) * 100
                        }
                        return 0
                      })() || 0)}% complete)
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-bold text-blue-600">
                      AI Score: {Math.round(analysis.overallScore || 0)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Progress:</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-green-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((() => {
                        const pattern = analysis.recommendedPatterns[0]?.pattern
                        if (pattern) {
                          // Use expanded tiles if available, otherwise fall back to generic pattern
                          const expandedTiles = analysis.recommendedPatterns[0].expandedTiles
                          let normalizedTiles: string[]
                          
                          if (expandedTiles && expandedTiles.length === 14) {
                            normalizedTiles = expandedTiles
                          } else {
                            // Fallback to generic pattern parsing
                            const patternTiles = pattern.pattern.split(' ')
                            normalizedTiles = patternTiles.length < 14 
                              ? [...patternTiles, ...Array(14 - patternTiles.length).fill('?')] 
                              : patternTiles.slice(0, 14)
                          }
                          
                          const completion = getPatternCompletionSummary(
                            normalizedTiles, 
                            playerHand.map(t => t.id)
                          )
                          return (completion.matchedTiles / 14) * 100
                        }
                        return 0
                      })() || 0, 100)}%` }}
                    />
                  </div>
                </div>
                
                {/* AI Score Breakdown */}
                <div className="text-sm text-gray-700 bg-white/80 p-3 rounded">
                  <div className="font-medium mb-2">AI Score Breakdown:</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>Pattern Completion: {Math.round((() => {
                      const pattern = analysis.recommendedPatterns[0]?.pattern
                      if (pattern) {
                        // Use expanded tiles if available, otherwise fall back to generic pattern
                        const expandedTiles = analysis.recommendedPatterns[0].expandedTiles
                        let normalizedTiles: string[]
                        
                        if (expandedTiles && expandedTiles.length === 14) {
                          normalizedTiles = expandedTiles
                        } else {
                          // Fallback to generic pattern parsing
                          const patternTiles = pattern.pattern.split(' ')
                          normalizedTiles = patternTiles.length < 14 
                            ? [...patternTiles, ...Array(14 - patternTiles.length).fill('?')] 
                            : patternTiles.slice(0, 14)
                        }
                        
                        const completion = getPatternCompletionSummary(
                          normalizedTiles, 
                          playerHand.map(t => t.id)
                        )
                        return (completion.matchedTiles / 14) * 60 // 60 pts max for completion
                      }
                      return 0
                    })())}/60</div>
                    <div>Pattern Difficulty: {Math.round((analysis.recommendedPatterns[0]?.difficulty === 'easy' ? 20 : analysis.recommendedPatterns[0]?.difficulty === 'medium' ? 15 : 10))}/20</div>
                    <div>Strategic Value: {Math.round((analysis.overallScore || 0) * 0.2)}/20</div>
                    <div className="col-span-2 font-medium">Total Score: {Math.round(analysis.overallScore || 0)}/100</div>
                  </div>
                </div>
                
                {analysis.recommendedPatterns[0]?.reasoning && (
                  <div className="text-sm text-gray-700 bg-white/80 p-2 rounded">
                    <span className="font-medium">Strategy:</span> {analysis.recommendedPatterns[0].reasoning}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-8">
          <div className="text-2xl mb-2">🤔</div>
          <p className="text-sm">Draw tiles to see AI recommendations</p>
        </div>
      )}

    </div>
  )
}