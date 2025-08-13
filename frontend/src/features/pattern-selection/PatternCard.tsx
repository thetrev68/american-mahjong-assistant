// Pattern Selection Card Component
// Displays individual NMJL patterns with modern design

import { Card } from '../../ui-components/Card'
import { useAnimationsEnabled } from '../../stores'
import type { PatternSelectionOption, PatternProgress } from '../../types/nmjl-types'

interface PatternCardProps {
  pattern: PatternSelectionOption
  isSelected: boolean
  isTarget: boolean
  progress?: PatternProgress
  onSelect: (patternId: number) => void
  onToggleTarget: (patternId: number) => void
}

export const PatternCard = ({
  pattern,
  isSelected,
  isTarget,
  progress,
  onSelect,
  onToggleTarget
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
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 truncate">
              {pattern.displayName}
            </h3>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {pattern.description}
            </p>
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
        
        {/* Pattern Display */}
        <div className="bg-surface rounded-lg p-3 border border-gray-200">
          <code className="text-sm font-mono text-gray-800 tracking-wider">
            {pattern.pattern}
          </code>
        </div>
        
        {/* Progress Bar (if available) */}
        {progress && (
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
        
        {/* Footer */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getDifficultyBadgeColor(pattern.difficulty)}`}>
              {pattern.difficulty.toUpperCase()}
            </span>
            
            {pattern.allowsJokers && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                Jokers OK
              </span>
            )}
          </div>
          
          <div className="text-right">
            <div className="text-lg font-bold text-primary">
              {pattern.points} pts
            </div>
          </div>
        </div>
        
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