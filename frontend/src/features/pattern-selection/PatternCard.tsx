// Pattern Selection Card Component
// Displays individual NMJL patterns with modern design

import { Card } from '../../ui-components/Card'
import { Button } from '../../ui-components/Button'
import { useAnimationsEnabled } from '../../stores'
import type { PatternSelectionOption, PatternProgress } from '../../../../shared/nmjl-types'
import type { PatternRecommendation } from '../../stores/intelligence-store'
import { getColoredPatternParts, getColorClasses } from '../../utils/pattern-color-utils'

interface PatternCardProps {
  pattern: PatternSelectionOption
  isSelected: boolean
  isTarget: boolean
  progress?: PatternProgress
  intelligenceScore?: PatternRecommendation
  onSelect: (patternId: string) => void
  onToggleTarget: (patternId: string) => void
  onAnalyze?: (patternId: string) => void
}

export const PatternCard = ({
  pattern,
  isSelected,
  isTarget,
  progress,
  intelligenceScore,
  onSelect,
  onToggleTarget,
  onAnalyze
}: PatternCardProps) => {
  const animationsEnabled = useAnimationsEnabled()
  
  const getDifficultyBadgeColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-accent/10 text-accent'
      case 'medium': return 'bg-yellow-100 text-yellow-700'
      case 'hard': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 65) return 'text-blue-600'
    if (score >= 45) return 'text-yellow-600'
    if (score >= 25) return 'text-orange-600'
    return 'text-red-600'
  }
  
  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'excellent': return 'bg-green-100 text-green-800 border-green-200'
      case 'good': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'fair': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'poor': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'impossible': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }
  
  return (
    <Card
      variant="elevated"
      interactive
      className={`relative overflow-hidden transition-all duration-300 ${
        isSelected 
          ? 'ring-4 ring-primary/30 shadow-2xl scale-105' 
          : isTarget
          ? 'ring-2 ring-secondary/20 shadow-lg'
          : 'hover:shadow-lg hover:scale-102'
      } ${animationsEnabled ? 'transform' : ''}`}
      onClick={() => onSelect(pattern.id)}
    >
      <div className="p-3 space-y-2 md:p-5 md:space-y-4">
        {/* Header with Target Star */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Section #Line: Pattern (colorized) */}
            <div className="mb-1 md:mb-2">
              <span className="text-base md:text-lg font-bold text-gray-900">
                {pattern.section} #{pattern.line}: 
              </span>
              <div className="inline-flex flex-wrap gap-1 ml-2">
                {getColoredPatternParts(pattern.pattern, pattern.groups).map((part, index) => (
                  <span 
                    key={index}
                    className={`font-mono font-semibold text-sm md:text-base ${getColorClasses(part.color, 'text')}`}
                  >
                    {part.text}
                  </span>
                ))}
              </div>
            </div>
            
            {/* Hand Description */}
            <p className="text-xs md:text-sm text-gray-700 mb-1 md:mb-2">
              {pattern.description}
            </p>
            
            {/* Difficulty, Concealed, Points */}
            <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm">
              <span className={`px-1 py-0.5 md:px-2 md:py-1 rounded-full text-xs font-semibold ${getDifficultyBadgeColor(pattern.difficulty)}`}>
                {pattern.difficulty.toUpperCase()}
              </span>
              
              {pattern.concealed && (
                <span className="text-purple-600 font-medium">
                  CONCEALED
                </span>
              )}
              
              <span className="font-bold text-primary">
                {pattern.points} pts
              </span>
            </div>
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleTarget(pattern.id)
            }}
            className={`flex-shrink-0 p-2 rounded-full transition-all duration-200 ${
              isTarget
                ? 'bg-secondary text-white shadow-md'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
            }`}
            aria-label={isTarget ? 'Remove from targets' : 'Add to targets'}
          >
            <span className="text-lg">{isTarget ? '⭐' : '☆'}</span>
          </button>
        </div>
        
        {/* Intelligence Score (if available) */}
        {intelligenceScore && (
          <div className="space-y-3 border-t pt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Completion Score</span>
                <span className={`text-lg font-bold ${getScoreColor(intelligenceScore.completionPercentage)}`}>
                  {intelligenceScore.completionPercentage.toFixed(0)}
                </span>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRecommendationColor(intelligenceScore.difficulty)}`}>
                {intelligenceScore.difficulty.toUpperCase()}
              </span>
            </div>
            
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      intelligenceScore.completionPercentage >= 80 ? 'bg-green-500' :
                      intelligenceScore.completionPercentage >= 65 ? 'bg-blue-500' :
                      intelligenceScore.completionPercentage >= 45 ? 'bg-yellow-500' :
                      intelligenceScore.completionPercentage >= 25 ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${intelligenceScore.completionPercentage}%` }}
                  />
                </div>
              </div>
              
              {onAnalyze && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onAnalyze(pattern.id)
                  }}
                  className="text-xs px-2 py-1 h-auto"
                >
                  Analyze
                </Button>
              )}
            </div>
            
            {/* Quick stats */}
            {intelligenceScore.analysis && (
              <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                <div className="text-center">
                  <div className="font-semibold text-blue-600">
                    {intelligenceScore.analysis.currentTiles?.count || 0}
                  </div>
                  <div>Current</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-orange-600">
                    {intelligenceScore.analysis.missingTiles?.total || 0}
                  </div>
                  <div>Missing</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-purple-600">
                    {intelligenceScore.analysis.jokerSituation?.available || 0}
                  </div>
                  <div>Jokers</div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Progress Bar (if available and no intelligence score) */}
        {progress && !intelligenceScore && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Progress</span>
              <span className="font-semibold text-primary">
                {progress.completionPercentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress.completionPercentage}%` }}
              />
            </div>
          </div>
        )}
        
        
        {/* Selection Indicator */}
        {isSelected && (
          <div className="absolute top-3 left-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-lg">
            <span className="text-white text-sm font-bold">✓</span>
          </div>
        )}
      </div>
    </Card>
  )
}