import React, { useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../ui-components/Button'
import { LoadingSpinner } from '../../ui-components/LoadingSpinner'
import { PatternVariationDisplay } from '../../ui-components/patterns/PatternVariationDisplay'
import { TurnRecommendationsSection } from './components/TurnRecommendationsSection'
import { CallOpportunitySection } from './components/CallOpportunitySection'
import { OpponentInsightsSection } from './components/OpponentInsightsSection'
import { DefensivePlaySection } from './components/DefensivePlaySection'
import { GlanceModePanel } from '../strategy-advisor/components/GlanceModePanel'
// import { useStrategyAdvisor } from '../strategy-advisor/hooks/useStrategyAdvisor' // Not needed - GlanceModePanel has its own hook
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
  onPatternSwitch?: (patternId: string) => void
  playingPatternIds?: string[]
  onPlayingPatternChange?: (patternId: string, isSelected: boolean) => void
  gamePhase?: 'charleston' | 'gameplay'
  isAnalyzing?: boolean
}

export const EnhancedIntelligencePanel: React.FC<EnhancedIntelligencePanelProps> = ({
  analysis,
  isCurrentTurn,
  callOpportunity,
  onClose,
  onActionRecommendation,
  onPatternSwitch,
  playingPatternIds = [],
  onPlayingPatternChange,
  gamePhase = 'gameplay',
  isAnalyzing = false
}) => {
  const { getTargetPatterns } = usePatternStore()
  const { playerHand } = useTileStore()
  const navigate = useNavigate()

  // Strategy Advisor integration - GlanceModePanel has its own useStrategyAdvisor hook
  // Removed duplicate hook call here to prevent cascading re-renders
  // Fixed: useStrategyAdvisor infinite loop (granular selectors)
  // Fixed: DisclosureManager infinite loop (dependency array)
  // Fixed: GlanceModePanel selector usage (direct property access)
  // const { expandMessage, collapseMessage } = useStrategyAdvisor()
  const expandMessage = () => {}
  const collapseMessage = () => {}

  // Feature flag for Strategy Advisor
  const useStrategyAdvisorInterface = true

  // Track the original engine recommendation ID
  const originalEngineRecommendationId = useRef<string | null>(null)

  // Set the original engine recommendation when analysis first loads
  useEffect(() => {
    if (analysis?.recommendedPatterns?.[0]?.pattern?.id && !originalEngineRecommendationId.current) {
      originalEngineRecommendationId.current = analysis.recommendedPatterns[0].pattern.id
    }
  }, [analysis?.recommendedPatterns])

  const selectedPatterns = getTargetPatterns()
  const hasPatternSelected = selectedPatterns.length > 0

  // Memoize primary pattern completion calculation to avoid expensive re-renders
  const primaryPatternCompletion = useMemo(() => {
    const pattern = analysis?.recommendedPatterns?.[0]?.pattern
    if (!pattern) return { matchedTiles: 0, totalTiles: 14, percentage: 0 }

    const expandedTiles = analysis.recommendedPatterns[0].expandedTiles
    let normalizedTiles: string[]

    if (expandedTiles && expandedTiles.length === 14) {
      normalizedTiles = expandedTiles
    } else {
      const patternTiles = pattern.pattern.split(' ')
      normalizedTiles = patternTiles.length < 14
        ? [...patternTiles, ...Array(14 - patternTiles.length).fill('?')]
        : patternTiles.slice(0, 14)
    }

    const completion = getPatternCompletionSummary(normalizedTiles, playerHand.map(t => t.id))
    return {
      matchedTiles: completion.matchedTiles,
      totalTiles: 14,
      percentage: (completion.matchedTiles / 14) * 100
    }
  }, [analysis?.recommendedPatterns, playerHand])

  return (
    <div className="enhanced-intelligence-panel bg-white/90 backdrop-blur-sm rounded-2xl p-3 sm:p-6 shadow-xl border border-purple-200/50 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-6">
        <h2 className="text-xl font-bold text-purple-800">
          {gamePhase === 'charleston' 
            ? (hasPatternSelected ? 'Charleston Strategy' : 'Choose Your Target Pattern')
            : 'AI Co-Pilot'
          }
        </h2>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        )}
        {isAnalyzing && <LoadingSpinner size="sm" />}
      </div>

      {/* Strategy Advisor - Glance Mode Interface */}
      {useStrategyAdvisorInterface && (
        <div className="mb-4 space-y-4">
          <GlanceModePanel
            className="strategy-advisor-panel"
            onMessageExpand={expandMessage}
            onMessageCollapse={collapseMessage}
          />

          {/* Defensive Analysis within AI Co-Pilot */}
          {analysis?.defensiveAnalysis && (
            <DefensivePlaySection
              defensiveAnalysis={analysis.defensiveAnalysis}
              patternSwitchSuggestions={analysis.patternSwitchSuggestions}
            />
          )}
        </div>
      )}

      {/* Turn-Aware Recommendations Section - Fallback when Strategy Advisor disabled */}
      {!useStrategyAdvisorInterface && isCurrentTurn && analysis?.turnIntelligence && onActionRecommendation && (
        <TurnRecommendationsSection
          recommendations={analysis.turnIntelligence}
          onAction={onActionRecommendation}
        />
      )}
      
      {/* Call Opportunity Section */}
      {callOpportunity && analysis?.currentCallRecommendation && onActionRecommendation && (
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

      {/* Enhanced Pattern Analysis */}
      {analysis ? (
        <div className="pattern-analysis space-y-4">
          {/* Charleston/Gameplay Recommendations */}
          {gamePhase === 'charleston' && (
            <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
              <div className="text-sm font-medium text-blue-800 mb-2">Charleston Strategy</div>
              <div className="text-sm text-gray-700">
                {analysis?.recommendedPatterns?.[0]?.pattern
                  ? `Focus on collecting tiles for ${analysis.recommendedPatterns[0].pattern.displayName || `${analysis.recommendedPatterns[0].pattern.section} #${analysis.recommendedPatterns[0].pattern.line}`}. Keep tiles that advance this pattern and pass tiles that don't contribute.`
                  : 'Analyzing your hand to determine the best Charleston passing strategy...'}
              </div>
            </div>
          )}
          
          {gamePhase === 'gameplay' && analysis.turnIntelligence?.discardRecommendations?.[0] && (
            <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
              <div className="text-sm font-medium text-blue-800 mb-2">💡 Gameplay Recommendation</div>
              <div className="text-sm text-gray-700">
                {analysis.turnIntelligence.discardRecommendations[0].reasoning}
              </div>
            </div>
          )}

          {/* PRIMARY PATTERN DETAILS */}
          {analysis.recommendedPatterns && analysis.recommendedPatterns.length > 0 && (
            <div className="p-2 sm:p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-2 border-purple-200">
              <div className="space-y-3">
                <div>
                  <h4 className="text-lg font-bold text-purple-800 mb-1">
                    {analysis.recommendedPatterns[0].pattern.id === originalEngineRecommendationId.current ? '👑 ' : ''}
                    PRIMARY PATTERN
                  </h4>
                  {/* Pattern name above visual representation - full width */}
                  {analysis.recommendedPatterns[0]?.pattern && (
                    <div className="text-base font-semibold text-gray-900 mb-2 w-full">
                      <span className="font-bold">{analysis.recommendedPatterns[0].pattern.section} #{analysis.recommendedPatterns[0].pattern.line}:</span>
                      {analysis.recommendedPatterns[0].pattern.displayName && (
                        <span className="font-normal"> ({(() => {
                          // Extract description part from displayName, removing redundant section/line prefix
                          const displayName = analysis.recommendedPatterns[0].pattern.displayName
                          const sectionLine = `${analysis.recommendedPatterns[0].pattern.section} #${analysis.recommendedPatterns[0].pattern.line}:`
                          return displayName.startsWith(sectionLine)
                            ? displayName.substring(sectionLine.length).trim()
                            : displayName
                        })()})</span>
                      )}
                    </div>
                  )}
                  {/* Pattern representation - ensure exactly 14 digits */}
                  <div className="text-xl font-bold text-gray-900 mb-2">
                    {analysis.recommendedPatterns[0]?.pattern ? (
                      <PatternVariationDisplay
                        size="sm"
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
                        patternGroups={analysis.recommendedPatterns[0].pattern.groups as unknown as Array<{ Group: string | number; display_color?: string; [key: string]: unknown }>}
                        handPattern={analysis.recommendedPatterns[0].pattern.pattern}
                      />
                    ) : (
                      'Selected Pattern'
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-bold text-green-600">
                      {primaryPatternCompletion.matchedTiles}/{primaryPatternCompletion.totalTiles}
                    </div>
                    <div className="text-sm text-gray-600">
                      tiles ({Math.round(primaryPatternCompletion.percentage)}% complete)
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
                      style={{ width: `${Math.min(primaryPatternCompletion.percentage, 100)}%` }}
                    />
                  </div>
                </div>
                
                {/* AI Score Breakdown */}
                <div className="text-sm text-gray-700 bg-white/80 p-3 rounded">
                  <div className="font-medium mb-2">AI Score Breakdown:</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>Current Tiles: {Math.round(analysis.recommendedPatterns[0]?.scoreBreakdown?.currentTileScore || 0)}/40</div>
                    <div>Tile Availability: {Math.round(analysis.recommendedPatterns[0]?.scoreBreakdown?.availabilityScore || 0)}/50</div>
                    <div>Strategic Priority: {Math.round(analysis.recommendedPatterns[0]?.scoreBreakdown?.priorityScore || 0)}/10</div>
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

          {/* TOP 5 ALTERNATE PATTERNS */}
          {analysis?.recommendedPatterns && analysis.recommendedPatterns.length > 1 && (
            <div className="alternate-patterns mt-6">
              <h4 className="text-lg font-bold text-purple-800 mb-3">Top 5 Alternate Patterns</h4>
              <div className="space-y-3">
                {analysis.recommendedPatterns.slice(1, 6).map((pattern, index) => {
                  const expandedTiles = pattern.expandedTiles
                  const patternTiles = expandedTiles && expandedTiles.length === 14 
                    ? expandedTiles 
                    : pattern.pattern.pattern.split(' ')

                  const completion = getPatternCompletionSummary(
                    patternTiles,
                    playerHand.map(t => t.id)
                  )

                  return (
                    <div key={index + 1} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      {/* Clickable area for pattern swapping */}
                      <div className="cursor-pointer hover:bg-gray-100 transition-colors -m-3 p-3 mb-3" onClick={() => {
                        if (onPatternSwitch) {
                          onPatternSwitch(pattern.pattern.id)
                        }
                      }}>
                        <div className="text-sm text-blue-600 font-medium mb-1">
                          Click to make this the Primary Pattern ↑
                        </div>
                        {/* Pattern name - full width on its own line */}
                        <div className="font-semibold text-gray-900 mb-2">
                          {pattern.pattern.id === originalEngineRecommendationId.current ? '👑 ' : ''}
                          #{index + 2}. {pattern.pattern.section} #{pattern.pattern.line}:
                          {pattern.pattern.displayName && (
                            <span className="font-normal text-gray-600"> ({(() => {
                              // Extract description part from displayName, removing redundant section/line prefix
                              const displayName = pattern.pattern.displayName
                              const sectionLine = `${pattern.pattern.section} #${pattern.pattern.line}:`
                              return displayName.startsWith(sectionLine)
                                ? displayName.substring(sectionLine.length).trim()
                                : displayName
                            })()})</span>
                          )}
                        </div>
                      </div>

                      {/* Completion info, AI score, and radio button - spread out horizontally */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm text-gray-600">
                          {completion.matchedTiles}/14 tiles ({Math.round((completion.matchedTiles / 14) * 100)}%)
                        </div>
                        <div className="text-sm text-blue-600 font-medium">
                          AI Score: {Math.round(pattern.totalScore || 0)}
                        </div>
                        {/* Only show checkbox for non-primary patterns */}
                        {pattern.pattern.id !== analysis.recommendedPatterns[0]?.pattern?.id && (
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={playingPatternIds.includes(pattern.pattern.id)}
                              onChange={(e) => onPlayingPatternChange?.(pattern.pattern.id, e.target.checked)}
                              className="w-4 h-4"
                            />
                            <span className="text-green-600 font-medium">Playing</span>
                          </label>
                        )}
                        {/* Show "Primary" label for the first pattern */}
                        {pattern.pattern.id === analysis.recommendedPatterns[0]?.pattern?.id && (
                          <div className="text-sm text-purple-600 font-medium">
                            Primary (Auto-Playing)
                          </div>
                        )}
                      </div>

                      {/* Pattern visualizer - larger size */}
                      <div className="text-base">
                        <PatternVariationDisplay
                          patternTiles={patternTiles}
                          playerTiles={playerHand.map(t => t.id)}
                          showMatches={true}
                          invertMatches={true}
                          showCompletion={false}
                          spacing={true}
                          size="md"
                          patternGroups={pattern.pattern.groups as unknown as Array<{ Group: string | number; display_color?: string; [key: string]: unknown }>}
                          handPattern={pattern.pattern.pattern}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* PATTERN EXPLORATION BUTTON */}
          {analysis?.recommendedPatterns && analysis.recommendedPatterns.length > 0 && (
            <div className="pattern-exploration mt-6 text-center">
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  navigate('/pattern-selection')
                }}
                className="text-purple-600 border-purple-300 hover:bg-purple-50"
              >
                View All Patterns (3+ tiles)
              </Button>
              <p className="text-xs text-gray-500 mt-1">
                Explore patterns with at least 3 matching tiles
              </p>
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