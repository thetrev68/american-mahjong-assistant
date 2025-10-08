// Recommendation Badge Component
// Shows keep/pass/discard recommendations with confidence indicators

import type { TileRecommendation } from '../../stores/useIntelligenceStore'

interface RecommendationBadgeProps {
  recommendation: TileRecommendation
  size?: 'sm' | 'md' | 'lg'
  showConfidence?: boolean
  interactive?: boolean
  onClick?: () => void
}

export const RecommendationBadge = ({
  recommendation,
  size = 'md',
  showConfidence = true,
  interactive = false,
  onClick
}: RecommendationBadgeProps) => {
  const getActionStyle = (action: string) => {
    switch (action) {
      case 'keep':
        return 'bg-accent text-white border-accent/30'
      case 'pass':
        return 'bg-warning text-white border-warning/30'
      case 'discard':
        return 'bg-red-500 text-white border-red-400'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }
  
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'keep': return '👍'
      case 'pass': return '➡️'
      case 'discard': return '🗑️'
      default: return '❓'
    }
  }
  
  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm': return 'px-2 py-1 text-xs'
      case 'lg': return 'px-4 py-2 text-base'
      default: return 'px-3 py-1.5 text-sm'
    }
  }
  
  const getConfidenceBar = (confidence: number) => {
    const width = Math.max(confidence, 10) // Minimum 10% for visibility
    let color = 'bg-red-400'
    
    if (confidence >= 80) color = 'bg-accent'
    else if (confidence >= 60) color = 'bg-yellow-400'
    
    return (
      <div className="w-full h-1 bg-gray-200 rounded-full mt-1 overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${width}%` }}
        />
      </div>
    )
  }
  
  return (
    <div
      className={`
        inline-flex flex-col items-center gap-1 rounded-lg border-2 font-semibold
        transition-all duration-200 relative overflow-hidden
        ${getSizeClasses(size)}
        ${getActionStyle(recommendation.action)}
        ${interactive ? 'cursor-pointer hover:scale-105 hover:shadow-lg' : ''}
      `}
      onClick={interactive ? onClick : undefined}
      role={interactive ? 'button' : 'presentation'}
      tabIndex={interactive ? 0 : -1}
    >
      {/* Main Content */}
      <div className="flex items-center gap-2">
        <span className="text-lg leading-none">
          {getActionIcon(recommendation.action)}
        </span>
        <div className="flex flex-col items-center">
          <span className="font-bold text-xs">
            {recommendation.tileId}
          </span>
          <span className="capitalize font-bold text-xs">
            {recommendation.action}
          </span>
        </div>
      </div>
      
      {/* Confidence Display */}
      {showConfidence && (
        <div className="flex flex-col items-center w-full min-w-16">
          <span className="text-xs opacity-90 font-mono">
            {recommendation.confidence}%
          </span>
          {getConfidenceBar(recommendation.confidence)}
        </div>
      )}
      
      {/* Priority Indicator */}
      {recommendation.priority >= 8 && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
          <span className="text-xs font-bold text-yellow-900">!</span>
        </div>
      )}
    </div>
  )
}
