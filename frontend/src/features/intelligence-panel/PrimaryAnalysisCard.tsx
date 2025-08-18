// Primary Analysis Card - Dominant intelligence display with actionable recommendations
// Mobile-first design focusing on function and clear guidance

import { useState } from 'react'
import { Card } from '../../ui-components/Card'
import { Button } from '../../ui-components/Button'
import { PatternSwitchModal } from './PatternSwitchModal'
import { getColoredPatternParts, getColorClasses } from '../../utils/pattern-color-utils'
import { tileService } from '../../services/tile-service' // Import tile service
import type { HandAnalysis, PatternRecommendation, TileRecommendation } from '../../stores/intelligence-store'

interface PrimaryAnalysisCardProps {
  analysis: HandAnalysis
  currentPattern: PatternRecommendation | null
  onPatternSwitch: (pattern: PatternRecommendation) => void
  onBrowseAllPatterns: () => void
}

export const PrimaryAnalysisCard = ({
  analysis,
  currentPattern,
  onPatternSwitch,
  onBrowseAllPatterns
}: PrimaryAnalysisCardProps) => {
  const [showExpanded, setShowExpanded] = useState(false)
  const [showPatternModal, setShowPatternModal] = useState(false)

  // Get the primary pattern (first recommendation)
  const primaryPattern = currentPattern || analysis.recommendedPatterns[0]
  
  if (!primaryPattern) {
    return (
      <Card variant="elevated" className="p-6">
        <div className="text-center text-gray-500">
          <div className="text-2xl mb-2">🤔</div>
          <p>Analyzing your hand...</p>
        </div>
      </Card>
    )
  }

  // Get tile recommendations with readable names
  const getTileDisplayName = (tileId: string): string => {
    return tileService.getTileById(tileId)?.displayName || 'Unknown Tile'
  }

  // Separate recommendations by action
  const passRecommendations = analysis.tileRecommendations.filter((rec: TileRecommendation) => rec.action === 'pass' || rec.action === 'discard')
  const keepRecommendations = analysis.tileRecommendations.filter((rec: TileRecommendation) => rec.action === 'keep')

  // Use the new mathematical analysis data
  const completionPercentage = primaryPattern.completionPercentage || 0
  const analysisData = primaryPattern.analysis
  const scoreBreakdown = primaryPattern.scoreBreakdown
  
  // Get detailed metrics from the new analysis
  const currentTiles = analysisData?.currentTiles?.count || 0
  const totalRequiredTiles = 14
  // const tilesNeeded = totalRequiredTiles - currentTiles
  // const estimatedTurns = analysisData?.gameState?.turnsEstimated || Math.ceil(tilesNeeded / 2)
  
  // Get score components
  const currentTileScore = scoreBreakdown?.currentTileScore || 0
  const availabilityScore = scoreBreakdown?.availabilityScore || 0
  const jokerScore = scoreBreakdown?.jokerScore || 0
  const priorityScore = scoreBreakdown?.priorityScore || 0
  const totalScore = currentTileScore + availabilityScore + jokerScore + priorityScore

  return (
    <Card variant="elevated" className="p-4 md:p-6">
      <div className="space-y-4">
        {/* Pattern Header */}
        <div className="text-center space-y-2">
          <div className="text-lg md:text-xl font-bold text-gray-900">
            {primaryPattern.pattern.section} #{primaryPattern.pattern.line}
          </div>
          
          {/* Colorized Pattern */}
          <div className="flex flex-wrap justify-center gap-1">
            {getColoredPatternParts(primaryPattern.pattern.pattern, primaryPattern.pattern.groups).map((part, index) => (
              <span 
                key={index}
                className={`font-mono text-base md:text-lg font-bold ${getColorClasses(part.color, 'text')}`}
              >
                {part.text}
              </span>
            ))}
          </div>
        </div>

        {/* Enhanced Mathematical Analysis */}
        <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xl md:text-2xl font-bold text-primary">
                {Math.round(completionPercentage)}%
              </div>
              <div className="text-xs md:text-sm text-gray-600">Completion</div>
            </div>
            
            <div>
              <div className="text-xl md:text-2xl font-bold text-accent">
                {currentTiles}/{totalRequiredTiles}
              </div>
              <div className="text-xs md:text-sm text-gray-600">Pattern Tiles</div>
            </div>

            <div>
              <div className="text-xl md:text-2xl font-bold text-purple-600">
                {Math.round(totalScore)}
              </div>
              <div className="text-xs md:text-sm text-gray-600">AI Score</div>
            </div>
          </div>

          {/* Score Breakdown */}
          {scoreBreakdown && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-xs text-gray-600 mb-2">Score Components:</div>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="text-center">
                  <div className="font-semibold">{Math.round(currentTileScore)}</div>
                  <div className="text-gray-500">Current</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold">{Math.round(availabilityScore)}</div>
                  <div className="text-gray-500">Available</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold">{Math.round(jokerScore)}</div>
                  <div className="text-gray-500">Jokers</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold">{Math.round(priorityScore)}</div>
                  <div className="text-gray-500">Priority</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tile Recommendations */}
        <div className="space-y-3">
          {passRecommendations.length > 0 && (
            <div>
              <div className="text-sm font-semibold text-red-600 mb-2">
                🔄 Recommended to Pass/Discard:
              </div>
              <div className="text-sm text-gray-700 leading-relaxed">
                {passRecommendations.map((rec) => getTileDisplayName(rec.tileId)).join(', ')}
              </div>
            </div>
          )}

          {keepRecommendations.length > 0 && (
            <div>
              <div className="text-sm font-semibold text-green-600 mb-2">
                ✨ Recommended to Keep:
              </div>
              <div className="text-sm text-gray-700 leading-relaxed">
                {keepRecommendations.map((rec) => getTileDisplayName(rec.tileId)).join(', ')}
              </div>
            </div>
          )}
        </div>

        {/* Strategic Advice */}
        {analysis.strategicAdvice.length > 0 && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
            <div className="text-sm font-semibold text-blue-800 mb-1">💡 Strategy:</div>
            <div className="text-sm text-blue-700 leading-relaxed">
              {analysis.strategicAdvice[0]}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setShowPatternModal(true)}
          >
            🔄 Switch Pattern
          </Button>
          
          <Button
            variant="ghost" // Changed from "link" to "ghost"
            className="flex-1"
            onClick={() => setShowExpanded(!showExpanded)}
          >
            {showExpanded ? '↑ Less Details' : '↓ More Details'}
          </Button>
        </div>

        {/* Expanded Details */}
        {showExpanded && (
          <div className="border-t pt-4 space-y-3 text-sm">
            <div>
              <div className="font-medium text-gray-700 mb-2">Alternative Patterns:</div>
              {analysis.recommendedPatterns.slice(1, 3).map((pattern) => (
                <div key={pattern.pattern.id} className="py-2 text-gray-600 border-l-2 border-gray-200 pl-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium">{pattern.pattern.section} #{pattern.pattern.line}</span>
                    <span className="text-xs font-bold text-primary">{Math.round(pattern.completionPercentage)}%</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {getColoredPatternParts(pattern.pattern.pattern, pattern.pattern.groups).map((part, partIndex) => (
                      <span 
                        key={partIndex}
                        className={`font-mono text-xs ${getColorClasses(part.color, 'text')}`}
                      >
                        {part.text}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {analysis.strategicAdvice.length > 1 && (
              <div>
                <div className="font-medium text-gray-700 mb-2">Additional Advice:</div>
                {analysis.strategicAdvice.slice(1).map((advice, index) => (
                  <div key={index} className="text-gray-600 py-1 leading-relaxed">
                    • {advice}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pattern Switch Modal */}
        <PatternSwitchModal
          isOpen={showPatternModal}
          onClose={() => setShowPatternModal(false)}
          currentPattern={primaryPattern}
          availablePatterns={analysis.recommendedPatterns}
          onPatternSelect={onPatternSwitch}
          onBrowseMore={onBrowseAllPatterns}
        />
      </div>
    </Card>
  )
}