// Pattern Variation Display Component
// Shows pattern variations with single-character notation and match highlighting

import { 
  renderPatternVariation, 
  getTileCharClasses, 
  getPatternCompletionSummary
} from '../../utils/tile-display-utils'

interface PatternVariationDisplayProps {
  patternTiles: string[]
  playerTiles?: string[]
  showMatches?: boolean
  invertMatches?: boolean
  showCompletion?: boolean
  spacing?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  patternGroups?: Array<{ Group: string | number; display_color?: string; [key: string]: unknown }>
}

export const PatternVariationDisplay = ({
  patternTiles,
  playerTiles = [],
  showMatches = true,
  invertMatches = true,
  showCompletion = true,
  spacing = true,
  size = 'md',
  className = '',
  patternGroups
}: PatternVariationDisplayProps) => {
  const displayChars = renderPatternVariation(patternTiles, playerTiles, {
    showMatches,
    invertMatches,
    spacing,
    patternGroups
  })
  
  const completion = showCompletion 
    ? getPatternCompletionSummary(patternTiles, playerTiles)
    : null
  
  const sizeClasses = {
    sm: 'text-xs gap-0.5',
    md: 'text-sm gap-1',
    lg: 'text-base gap-1.5'
  }
  
  return (
    <div className={`space-y-2 ${className}`}>
      {/* Pattern Display */}
      <div className={`flex flex-wrap items-center ${sizeClasses[size]}`}>
        {displayChars.map((char, index) => {
          if (char.char === ' ') {
            return <span key={index} className="mx-1" />
          }
          
          return (
            <span
              key={index}
              className={getTileCharClasses(char, invertMatches)}
              title={`${char.tileId}${char.isMatched ? ' (matched)' : ''}`}
            >
              {char.char}
            </span>
          )
        })}
      </div>
      
      {/* Completion Summary */}
      {completion && (
        <div className="flex items-center gap-3 text-xs text-gray-600">
          <span>
            <span className="font-semibold text-green-600">{completion.matchedTiles}</span>
            <span className="text-gray-400">/{completion.totalTiles}</span>
          </span>
          <span className="text-primary font-semibold">
            {completion.completionPercentage}% complete
          </span>
          <span className="text-gray-400">
            {completion.matchedPositions.length} positions matched
          </span>
        </div>
      )}
    </div>
  )
}

interface PatternVariationGridProps {
  patterns: Array<{
    id: string
    name: string
    tiles: string[]
    sequence?: number
    completionRatio?: number
  }>
  playerTiles?: string[]
  maxPatterns?: number
  onPatternClick?: (patternId: string) => void
  className?: string
}

export const PatternVariationGrid = ({
  patterns,
  playerTiles = [],
  maxPatterns = 8,
  onPatternClick,
  className = ''
}: PatternVariationGridProps) => {
  const displayPatterns = patterns.slice(0, maxPatterns)
  
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <span>🎯 Pattern Variations</span>
        {patterns.length > maxPatterns && (
          <span className="text-xs text-gray-500">
            (showing {maxPatterns} of {patterns.length})
          </span>
        )}
      </div>
      
      <div className="space-y-2">
        {displayPatterns.map((pattern, index) => {
          const isTopChoice = index === 0
          
          return (
            <div
              key={pattern.id}
              className={`border rounded-lg p-3 transition-all ${
                isTopChoice 
                  ? 'border-indigo-300 bg-indigo-50' 
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="space-y-2">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    {isTopChoice && <span className="text-indigo-600">👑</span>}
                    <span>{pattern.name}</span>
                    {pattern.sequence && (
                      <span className="text-xs text-gray-500">#{pattern.sequence}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-bold text-primary">
                      {Math.round((pattern.completionRatio || 0) * 100)}%
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation() // Prevent card click
                        onPatternClick?.(pattern.id)
                      }}
                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      🔄 Switch
                    </button>
                  </div>
                </div>
                
                {/* Pattern Tiles */}
                <PatternVariationDisplay
                  patternTiles={pattern.tiles}
                  playerTiles={playerTiles}
                  showCompletion={false}
                  size="sm"
                  spacing={false}
                />
                
                {/* Quick Stats */}
                <div className="text-xs text-gray-600">
                  {Math.round((pattern.completionRatio || 0) * 14)}/14 tiles • 
                  {14 - Math.round((pattern.completionRatio || 0) * 14)} needed
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface PatternComparisonProps {
  patterns: Array<{
    id: string
    name: string
    tiles: string[]
    completionRatio: number
  }>
  playerTiles: string[]
  className?: string
}

export const PatternComparison = ({
  patterns,
  playerTiles,
  className = ''
}: PatternComparisonProps) => {
  // Sort by completion ratio
  const sortedPatterns = [...patterns].sort((a, b) => b.completionRatio - a.completionRatio)
  
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="text-sm font-semibold text-gray-700">
        📊 Pattern Comparison
      </div>
      
      <div className="space-y-3">
        {sortedPatterns.map((pattern, index) => {
          const isFirst = index === 0
          
          return (
            <div
              key={pattern.id}
              className={`p-4 rounded-lg border-l-4 ${
                isFirst 
                  ? 'border-l-green-500 bg-green-50' 
                  : index === 1
                  ? 'border-l-yellow-500 bg-yellow-50'
                  : 'border-l-gray-300 bg-gray-50'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{pattern.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-primary">
                      {Math.round(pattern.completionRatio * 100)}%
                    </span>
                    {isFirst && <span className="text-green-600">🥇</span>}
                    {index === 1 && <span className="text-yellow-600">🥈</span>}
                    {index === 2 && <span className="text-orange-600">🥉</span>}
                  </div>
                </div>
                
                <PatternVariationDisplay
                  patternTiles={pattern.tiles}
                  playerTiles={playerTiles}
                  showCompletion={false}
                  size="sm"
                  spacing={false}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}