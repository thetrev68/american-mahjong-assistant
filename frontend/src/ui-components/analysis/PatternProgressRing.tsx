// Pattern Progress Ring Component
// Circular progress indicator for pattern completion with animated fills

import type { PatternAnalysis } from '../../stores/intelligence-store'
import { getColoredPatternParts, getColorClasses } from '../../utils/pattern-color-utils'

interface PatternProgressRingProps {
  pattern: PatternAnalysis
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showLabel?: boolean
  showPercentage?: boolean
  showDetails?: boolean
  animated?: boolean
  onClick?: () => void
}

export const PatternProgressRing = ({
  pattern,
  size = 'md',
  showLabel = true,
  showPercentage = true,
  showDetails = false,
  animated = true,
  onClick
}: PatternProgressRingProps) => {
  // Get sizing configuration
  const getSizeConfig = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'w-16 h-16',
          svg: 'w-16 h-16',
          radius: 24,
          strokeWidth: 3,
          text: 'text-xs',
          label: 'text-xs',
          detail: 'text-xs'
        }
      case 'lg':
        return {
          container: 'w-24 h-24',
          svg: 'w-24 h-24',
          radius: 40,
          strokeWidth: 4,
          text: 'text-lg font-bold',
          label: 'text-sm',
          detail: 'text-sm'
        }
      case 'xl':
        return {
          container: 'w-32 h-32',
          svg: 'w-32 h-32',
          radius: 56,
          strokeWidth: 5,
          text: 'text-xl font-bold',
          label: 'text-base',
          detail: 'text-sm'
        }
      default:
        return {
          container: 'w-20 h-20',
          svg: 'w-20 h-20',
          radius: 32,
          strokeWidth: 4,
          text: 'text-sm font-semibold',
          label: 'text-xs',
          detail: 'text-xs'
        }
    }
  }
  
  // Get difficulty and risk styling
  const getDifficultyStyle = () => {
    switch (pattern.difficulty) {
      case 'easy':
        return {
          color: '#10B981',
          bgColor: 'rgba(16, 185, 129, 0.1)',
          textColor: 'text-accent'
        }
      case 'medium':
        return {
          color: '#F97316',
          bgColor: 'rgba(249, 115, 22, 0.1)',
          textColor: 'text-warning'
        }
      case 'hard':
        return {
          color: '#EF4444',
          bgColor: 'rgba(239, 68, 68, 0.1)',
          textColor: 'text-red-500'
        }
    }
  }
  
  const sizeConfig = getSizeConfig()
  const difficultyStyle = getDifficultyStyle()
  
  // Calculate circle properties
  const circumference = 2 * Math.PI * sizeConfig.radius
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (pattern.completionPercentage / 100) * circumference
  
  // Center position for SVG
  const center = sizeConfig.radius + sizeConfig.strokeWidth + 2
  const viewBoxSize = center * 2
  
  return (
    <div 
      className={`
        flex flex-col items-center gap-2 
        ${onClick ? 'cursor-pointer group' : ''}
      `}
      onClick={onClick}
    >
      {/* Progress Ring */}
      <div className={`relative ${sizeConfig.container}`}>
        <svg
          className={`transform -rotate-90 ${sizeConfig.svg} ${
            onClick ? 'group-hover:scale-105 transition-transform' : ''
          }`}
          viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        >
          {/* Background Circle */}
          <circle
            cx={center}
            cy={center}
            r={sizeConfig.radius}
            stroke="currentColor"
            strokeWidth={sizeConfig.strokeWidth}
            fill="none"
            className="text-gray-200"
          />
          
          {/* Progress Circle */}
          <circle
            cx={center}
            cy={center}
            r={sizeConfig.radius}
            stroke={difficultyStyle.color}
            strokeWidth={sizeConfig.strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className={`transition-all duration-1000 ease-out ${
              animated ? 'animate-pulse' : ''
            }`}
            style={{
              filter: 'drop-shadow(0 0 4px rgba(0, 0, 0, 0.1))'
            }}
          />
          
          {/* Glow effect for high completion */}
          {pattern.completionPercentage >= 75 && animated && (
            <circle
              cx={center}
              cy={center}
              r={sizeConfig.radius + 2}
              stroke={difficultyStyle.color}
              strokeWidth="1"
              fill="none"
              opacity="0.3"
              className="animate-pulse"
            />
          )}
        </svg>
        
        {/* Center Content */}
        <div className="absolute inset-0 flex items-center justify-center">
          {showPercentage && (
            <span className={`font-mono ${sizeConfig.text} ${difficultyStyle.textColor}`}>
              {Math.round(pattern.completionPercentage)}%
            </span>
          )}
        </div>
        
        {/* Strategic Value Indicator */}
        {pattern.strategicValue >= 8 && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center animate-pulse">
            <span className="text-xs font-bold text-yellow-900">★</span>
          </div>
        )}
      </div>
      
      {/* Pattern Info */}
      {showLabel && (
        <div className="text-center max-w-32">
          <div className={`${sizeConfig.label} text-muted font-medium truncate`}>
            {pattern.section} #{pattern.line}
          </div>
          <div className={`${sizeConfig.label} ${difficultyStyle.textColor} font-semibold capitalize`}>
            {pattern.difficulty}
          </div>
        </div>
      )}
      
      {/* Detailed Info */}
      {showDetails && (
        <div className="text-center space-y-1">
          {/* Colorized Pattern */}
          <div className="flex flex-wrap justify-center gap-1 mb-2">
            {getColoredPatternParts(pattern.pattern, pattern.groups).map((part, index) => (
              <span 
                key={index}
                className={`font-mono text-xs ${getColorClasses(part.color, 'text')}`}
              >
                {part.text}
              </span>
            ))}
          </div>
          
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span>🎯 {pattern.tilesNeeded} tiles needed</span>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span>⏱️ ~{pattern.estimatedTurns} turns</span>
          </div>
          
          <div className={`text-xs font-medium ${
            pattern.riskLevel === 'low' ? 'text-accent' :
            pattern.riskLevel === 'medium' ? 'text-warning' : 'text-red-500'
          }`}>
            {pattern.riskLevel.charAt(0).toUpperCase() + pattern.riskLevel.slice(1)} Risk
          </div>
          
          {/* Missing Tiles Preview */}
          {pattern.missingTiles.length > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              Missing: {pattern.missingTiles.slice(0, 3).join(', ')}
              {pattern.missingTiles.length > 3 && '...'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}