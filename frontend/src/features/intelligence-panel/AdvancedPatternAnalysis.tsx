// Advanced Pattern Analysis Component
// Shows detailed pattern analysis with variations, comparisons, and visual displays

import { useState } from 'react'
import { Card } from '../../ui-components/Card'
import { PatternVariationGrid } from '../../ui-components/patterns/PatternVariationDisplay'
import type { HandAnalysis } from '../../stores/intelligence-store'

interface AdvancedPatternAnalysisProps {
  analysis: HandAnalysis
  playerTiles: string[]
  gamePhase?: 'charleston' | 'gameplay'
  onPatternSelect?: (patternId: string) => void
  className?: string
}

export const AdvancedPatternAnalysis = ({
  analysis,
  playerTiles,
  gamePhase = 'gameplay',
  onPatternSelect,
  className = ''
}: AdvancedPatternAnalysisProps) => {
  const [expandedPattern, setExpandedPattern] = useState<string | null>(null)
  
  // Use recommended patterns from analysis (the ones mentioned in "Found X recommended patterns")
  const recommendedPatterns = analysis.recommendedPatterns || []
  const viablePatterns = recommendedPatterns.filter(p => p.completionPercentage >= 15)
  const topPatterns = viablePatterns.slice(1) // Skip first one as it's shown as primary
  
  // Get real pattern variations from Engine 1 analysis data
  const getPatternVariationsFromAnalysis = () => {
    try {
      // Use the recommended patterns to find their corresponding Engine 1 facts
      return topPatterns.map(patternRec => {
        // Find corresponding Engine 1 fact for this pattern
        const engine1Fact = analysis.engine1Facts?.find(fact => 
          fact.patternId === patternRec.pattern.id ||
          fact.patternId === patternRec.pattern.section + '-' + patternRec.pattern.line ||
          fact.patternId === (patternRec.pattern.section + patternRec.pattern.line)
        )
        
        const bestVariation = engine1Fact?.tileMatching?.bestVariation
        
        return {
          id: patternRec.pattern.id,
          name: `${patternRec.pattern.section} #${patternRec.pattern.line}`,
          tiles: bestVariation?.patternTiles || [],
          sequence: bestVariation?.sequence || 1,
          completionRatio: patternRec.completionPercentage / 100
        }
      }).filter(p => p.tiles.length > 0) // Only include patterns with tile data
    } catch (error) {
      console.warn('Failed to extract pattern variations from recommended patterns:', error)
      return []
    }
  }
  
  const patternVariations = getPatternVariationsFromAnalysis()
  
  const showAllPatterns = gamePhase === 'charleston' || topPatterns.length > 3
  const displayPatterns = showAllPatterns ? viablePatterns : topPatterns.slice(0, 3)
  
  return (
    <Card variant="elevated" className={`space-y-4 ${className}`}>
      <div className="p-3 pb-0">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            Advanced Pattern Analysis
          </h3>
          <p className="text-sm text-gray-600">
            {gamePhase === 'charleston' 
              ? 'All viable patterns (early game flexibility)'
              : `Top ${Math.min(displayPatterns.length, 3)} equivalent patterns`}
          </p>
        </div>
        
        {/* Single Tab - Combined Analysis */}
        <div className="border-b border-gray-200">
          <div className="px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 border-primary text-primary bg-primary/5">
            <span className="hidden sm:inline">🧠 Pattern Variations</span>
            <span className="sm:hidden">🧠 Patterns</span>
          </div>
        </div>
      </div>
      
      <div className="p-3 pt-0">
        {/* Combined Pattern Analysis */}
        <div>
          {patternVariations.length > 0 ? (
            <PatternVariationGrid
              patterns={patternVariations}
              playerTiles={playerTiles}
              maxPatterns={gamePhase === 'charleston' ? 8 : 4}
              onPatternClick={onPatternSelect}
            />
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-2xl mb-2">⚠️</div>
              <div className="text-sm font-semibold">Pattern Tile Data Unavailable</div>
              <div className="text-xs mt-1">Engine 1 facts needed for tile visualization</div>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}