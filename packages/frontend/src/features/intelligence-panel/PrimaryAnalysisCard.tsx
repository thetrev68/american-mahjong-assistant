// Primary Analysis Card - Dominant intelligence display with actionable recommendations
// Mobile-first design focusing on function and clear guidance

import { Card } from '../../ui-components/Card'
import { getColoredPatternParts, getColorClasses } from '../../utils/pattern-color-utils'
import { renderPatternVariation, getTileCharClasses, getTileDisplayChar } from '../../utils/tile-display-utils'
import { tileService } from '../../lib/services/tile-service'
import { useTileStore } from '../../stores/tile-store'
import type { HandAnalysis, PatternRecommendation, TileRecommendation } from '../../stores/intelligence-store'

interface PrimaryAnalysisCardProps {
  analysis: HandAnalysis
  currentPattern: PatternRecommendation | null
  onPatternSwitch: (pattern: PatternRecommendation) => Promise<void>
  onBrowseAllPatterns: () => void
}

export const PrimaryAnalysisCard = ({
  analysis,
  currentPattern
}: PrimaryAnalysisCardProps) => {
  // Get player hand tiles for visualization
  const { playerHand = [] } = useTileStore()
  const playerTileIds = playerHand.map(tile => tile.id)

  // Get the primary pattern (first recommendation)
  const primaryPattern = currentPattern || analysis.recommendedPatterns[0]
  
  if (!primaryPattern) {
    return (
      <Card variant="elevated" className="p-3">
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

  // Separate recommendations by action and validate they're in player's hand
  const normalizeId = (id: string): string => String(id).toLowerCase().trim()
  const playerTileSet = new Set(playerTileIds.map(normalizeId))
  
  
  const passRecommendations = analysis.tileRecommendations.filter((rec: TileRecommendation) => {
    const isValidAction = rec.action === 'pass' || rec.action === 'discard'
    const isInHand = playerTileSet.has(normalizeId(rec.tileId))
    
    if (isValidAction && !isInHand) {
      console.warn('⚠️ Recommendation for tile not in hand:', rec.tileId, 'Action:', rec.action)
    }
    
    return isValidAction && isInHand
  })
  
  const keepRecommendations = analysis.tileRecommendations.filter((rec: TileRecommendation) => {
    const isValidAction = rec.action === 'keep'
    const isInHand = playerTileSet.has(normalizeId(rec.tileId))
    
    if (isValidAction && !isInHand) {
      console.warn('⚠️ Recommendation for tile not in hand:', rec.tileId, 'Action:', rec.action)
    }
    
    return isValidAction && isInHand
  })

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

  // Pattern tiles would be displayed here if available in pattern data
  const patternTiles: string[] = []
  
  // Sort hand tiles alphabetically: Jokers, Flowers, suits (1-9 B/C/D), dragons, winds
  const sortTilesAlphabetically = (tiles: string[]): string[] => {
    return [...tiles].sort((a, b) => {
      const getOrder = (tile: string): number => {
        const t = tile.toLowerCase()
        // Jokers first
        if (t.includes('joker') || t === 'j') return 0
        // Flowers second  
        if (t === 'f1' || t.includes('flower') || t === 'f') return 1
        // Numbers 1-9 for each suit (B, C, D)
        if (t.match(/^[1-9][bcd]$/)) {
          const num = parseInt(t[0])
          const suit = t[1]
          if (suit === 'b') return 2000 + num      // Bams: 2001-2009
          if (suit === 'c') return 3000 + num      // Cracks: 3001-3009  
          if (suit === 'd') return 4000 + num      // Dots: 4001-4009
        }
        // Dragons
        if (t === 'f2' || t.includes('green') || t === 'gd') return 5001
        if (t === 'f3' || t.includes('red') || t === 'rd') return 5002
        if (t === 'f4' || t.includes('white') || t === 'wd') return 5003
        // Winds  
        if (t === 'east' || t === 'e' || t === 'ew') return 6001
        if (t === 'south' || t === 's' || t === 'sw') return 6002
        if (t === 'west' || t === 'w' || t === 'ww') return 6003
        if (t === 'north' || t === 'n' || t === 'nw') return 6004
        // Unknown tiles last
        return 9999
      }
      return getOrder(a) - getOrder(b)
    })
  }
  
  // Render hand tiles visualization with sorting
  const sortedPlayerTileIds = sortTilesAlphabetically(playerTileIds)
  const handTileChars = sortedPlayerTileIds.map(tileId => ({
    ...getTileDisplayChar(tileId),
    isMatched: true // All hand tiles are "matched" for display purposes
  }))
  

  return (
    <Card variant="elevated" className="p-3">
      <div className="space-y-4">
        {/* Hand Tiles Visualization */}
        {playerTileIds.length > 0 && (
          <div className="text-center space-y-2">
            <div className="text-sm font-medium text-gray-600">Your Hand:</div>
            <div className="flex flex-wrap justify-center gap-1">
              {handTileChars.map((tileChar, index) => (
                <span
                  key={index}
                  className={getTileCharClasses(tileChar, true)}
                >
                  {tileChar.char}
                </span>
              ))}
            </div>
          </div>
        )}

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

          {/* Pattern Sequence Visualization */}
          {patternTiles.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Pattern Sequence:</div>
              <div className="flex flex-wrap justify-center gap-0">
                {renderPatternVariation(
                  patternTiles, 
                  playerTileIds, 
                  { 
                    showMatches: true, 
                    invertMatches: false, 
                    spacing: false,
                    patternGroups: undefined
                  }
                ).map((tileChar, index) => (
                  <span
                    key={index}
                    className={tileChar.char === ' ' ? 'w-2' : getTileCharClasses(tileChar, false)}
                  >
                    {tileChar.char === ' ' ? '' : tileChar.char}
                  </span>
                ))}
              </div>
            </div>
          )}

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

          {/* Improved Score Breakdown */}
          {scoreBreakdown && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-xs text-gray-600 mb-3">AI Score Breakdown:</div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">{Math.round(currentTileScore)} / 40 points from available tile matches</span>
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${(currentTileScore / 40) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">{Math.round(availabilityScore)} / 50 points for difficulty of remaining tiles</span>
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ width: `${(availabilityScore / 50) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">{Math.round(priorityScore)} / 10 points for strategic priority</span>
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-orange-500 h-2 rounded-full" 
                      style={{ width: `${(priorityScore / 10) * 100}%` }}
                    ></div>
                  </div>
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
              Focus on {primaryPattern.pattern.section} #{primaryPattern.pattern.line} ({primaryPattern.difficulty} difficulty)
            </div>
          </div>
        )}


      </div>
    </Card>
  )
}