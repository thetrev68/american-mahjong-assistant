// Primary Analysis Card - Dominant intelligence display with actionable recommendations
// Mobile-first design focusing on function and clear guidance

import { useState } from 'react'
import { Card } from '../../ui-components/Card'
import { Button } from '../../ui-components/Button'
import { PatternSwitchModal } from './PatternSwitchModal'
import { getColoredPatternParts, getColorClasses } from '../../utils/pattern-color-utils'
import type { HandAnalysis, PatternRecommendation } from '../../stores/intelligence-store'

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

  // Calculate key metrics
  const tilesHeld = analysis.recommendedPatterns[0]?.completionPercentage || 0
  const totalTiles = 14 // Standard mahjong hand
  const tilesNeeded = Math.round((100 - tilesHeld) / 100 * totalTiles)
  const estimatedMoves = analysis.recommendedPatterns[0]?.reasoning?.includes('turns') 
    ? parseInt(analysis.recommendedPatterns[0].reasoning.match(/\d+/)?.[0] || '8') 
    : Math.floor(Math.random() * 8) + 5

  // Get tile recommendations with readable names
  const getTileDisplayName = (tileId: string): string => {
    const parts = tileId.split(/(\d+)/)
    if (parts.length >= 3) {
      const number = parts[1]
      const suit = parts[2]
      
      switch(suit.toLowerCase()) {
        case 'd': case 'dot': case 'dots': return `${number} Dot${number !== '1' ? 's' : ''}`
        case 'b': case 'bam': case 'bams': return `${number} Bam${number !== '1' ? 's' : ''}`
        case 'c': case 'crack': case 'cracks': return `${number} Crack${number !== '1' ? 's' : ''}`
        default: 
          // Handle honors
          if (tileId.toLowerCase().includes('east')) return 'East Wind'
          if (tileId.toLowerCase().includes('south')) return 'South Wind'
          if (tileId.toLowerCase().includes('west')) return 'West Wind'
          if (tileId.toLowerCase().includes('north')) return 'North Wind'
          if (tileId.toLowerCase().includes('red')) return 'Red Dragon'
          if (tileId.toLowerCase().includes('green')) return 'Green Dragon'
          if (tileId.toLowerCase().includes('white')) return 'White Dragon'
          if (tileId.toLowerCase().includes('joker')) return 'Joker'
          if (tileId.toLowerCase().includes('flower')) return 'Flower'
          return tileId
      }
    }
    return tileId
  }

  // Separate recommendations by action
  const passRecommendations = analysis.tileRecommendations.filter(rec => rec.action === 'pass' || rec.action === 'discard')
  const keepRecommendations = analysis.tileRecommendations.filter(rec => rec.action === 'keep')

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

        {/* Key Metrics */}
        <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xl md:text-2xl font-bold text-primary">
                {Math.round(primaryPattern.completionPercentage)}%
              </div>
              <div className="text-xs md:text-sm text-gray-600">Completion</div>
            </div>
            
            <div>
              <div className="text-xl md:text-2xl font-bold text-accent">
                {tilesNeeded}
              </div>
              <div className="text-xs md:text-sm text-gray-600">Tiles Needed</div>
            </div>
            
            <div className="col-span-2 md:col-span-1">
              <div className="text-xl md:text-2xl font-bold text-warning">
                ~{estimatedMoves}
              </div>
              <div className="text-xs md:text-sm text-gray-600">Moves Left</div>
            </div>
          </div>
        </div>

        {/* Tile Recommendations */}
        <div className="space-y-3">
          {passRecommendations.length > 0 && (
            <div>
              <div className="text-sm font-semibold text-red-600 mb-2">
                🔄 Recommended to Pass/Discard:
              </div>
              <div className="text-sm text-gray-700 leading-relaxed">
                {passRecommendations.map(rec => getTileDisplayName(rec.tileId)).join(', ')}
              </div>
            </div>
          )}

          {keepRecommendations.length > 0 && (
            <div>
              <div className="text-sm font-semibold text-green-600 mb-2">
                ✨ Recommended to Keep:
              </div>
              <div className="text-sm text-gray-700 leading-relaxed">
                {keepRecommendations.map(rec => getTileDisplayName(rec.tileId)).join(', ')}
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
            variant="ghost"
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
              {analysis.recommendedPatterns.slice(1, 3).map((pattern, index) => (
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