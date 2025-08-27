// Advanced Pattern Analysis Component
// Shows detailed pattern analysis with variations, comparisons, and visual displays

// Removed unused useState import
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
  
  // Use recommended patterns from analysis (the ones mentioned in "Found X recommended patterns")
  const recommendedPatterns = analysis.recommendedPatterns || []
  const viablePatterns = recommendedPatterns.filter(p => p.completionPercentage >= 15)
  // Show patterns that are NOT marked as primary (so user can switch to them)
  const topPatterns = viablePatterns.filter(p => !p.isPrimary)
  
  // Get real pattern variations from Engine 1 analysis data
  const getPatternVariationsFromAnalysis = () => {
    try {
      // Use the recommended patterns to find their corresponding Engine 1 facts
      const patterns = topPatterns.map(patternRec => {
        // Find corresponding Engine 1 fact for this pattern
        const engine1Fact = analysis.engine1Facts?.find(fact => 
          fact.patternId === patternRec.pattern.id ||
          fact.patternId === patternRec.pattern.section + '-' + patternRec.pattern.line ||
          fact.patternId === (String(patternRec.pattern.section) + String(patternRec.pattern.line))
        )
        
        const bestVariation = engine1Fact?.tileMatching?.bestVariation
        
        // Calculate total AI score from breakdown
        const scoreBreakdown = patternRec.scoreBreakdown
        const totalAiScore = scoreBreakdown ? 
          scoreBreakdown.currentTileScore + scoreBreakdown.availabilityScore + 
          scoreBreakdown.jokerScore + scoreBreakdown.priorityScore : 0
        
        const pattern = {
          id: patternRec.pattern.id,
          name: `${patternRec.pattern.section} #${patternRec.pattern.line}`,
          tiles: bestVariation?.patternTiles || [],
          sequence: bestVariation?.sequence || 1,
          completionRatio: patternRec.completionPercentage / 100,
          aiScore: totalAiScore
        }
        
        
        return pattern
      }).filter(p => p.tiles.length > 0) // Only include patterns with tile data
      
      return patterns
    } catch (error) {
      console.warn('Failed to extract pattern variations from recommended patterns:', error)
      return []
    }
  }
  
  const patternVariations = getPatternVariationsFromAnalysis()
  
  const showAllPatterns = gamePhase === 'charleston' || topPatterns.length > 3
  const displayPatterns = showAllPatterns ? viablePatterns : topPatterns.slice(0, 3)
  
  return (
    <Card variant="elevated" className={`p-3 space-y-3 ${className}`}>
      {/* Header */}
      <div>
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
      
      {/* Pattern Analysis Content */}
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
    </Card>
  )
}