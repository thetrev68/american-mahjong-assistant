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
  
  // Get patterns with meaningful completion (15% or higher)
  const viablePatterns = analysis.bestPatterns.filter(p => p.completionPercentage >= 15)
  const equivalentPatterns = viablePatterns.filter(p => p.completionPercentage >= 35) // Top tier patterns
  
  // Get real pattern variations from Engine 1 analysis data
  const getPatternVariationsFromAnalysis = () => {
    try {
      if (!analysis.engine1Facts || analysis.engine1Facts.length === 0) {
        // No Engine 1 facts available
        return []
      }
      
      // Extract pattern variations from Engine 1 facts
      return analysis.engine1Facts.map(fact => {
        const bestVariation = fact.tileMatching.bestVariation
        
        return {
          id: fact.patternId,
          name: fact.patternId, // Use pattern ID as name for now
          tiles: bestVariation.patternTiles || [], // Real tile array from Engine 1!
          sequence: bestVariation.sequence || 1,
          completionRatio: bestVariation.completionRatio || 0
        }
      })
    } catch (error) {
      console.warn('Failed to extract pattern variations from Engine 1 facts:', error)
      return []
    }
  }
  
  const patternVariations = getPatternVariationsFromAnalysis()
  
  const showAllPatterns = gamePhase === 'charleston' || equivalentPatterns.length > 3
  const displayPatterns = showAllPatterns ? viablePatterns : equivalentPatterns.slice(0, 3)
  
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