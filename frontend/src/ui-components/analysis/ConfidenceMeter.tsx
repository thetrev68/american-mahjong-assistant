// Confidence Meter Component
// Visual confidence display with animated progress ring and contextual colors

interface ConfidenceMeterProps {
  confidence: number // 0-100
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  showPercentage?: boolean
  animated?: boolean
  className?: string
}

export const ConfidenceMeter = ({
  confidence,
  size = 'md',
  showLabel = true,
  showPercentage = true,
  animated = true,
  className = ''
}: ConfidenceMeterProps) => {
  // Clamp confidence to 0-100 range
  const clampedConfidence = Math.max(0, Math.min(100, confidence))
  
  // Calculate stroke dash array for circular progress
  const radius = size === 'sm' ? 16 : size === 'lg' ? 28 : 22
  const circumference = 2 * Math.PI * radius
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (clampedConfidence / 100) * circumference
  
  // Get size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'w-12 h-12',
          svg: 'w-12 h-12',
          text: 'text-xs',
          label: 'text-xs'
        }
      case 'lg':
        return {
          container: 'w-20 h-20',
          svg: 'w-20 h-20',
          text: 'text-lg font-bold',
          label: 'text-sm'
        }
      default:
        return {
          container: 'w-16 h-16',
          svg: 'w-16 h-16',
          text: 'text-sm font-semibold',
          label: 'text-xs'
        }
    }
  }
  
  // Get confidence level and colors
  const getConfidenceLevel = () => {
    if (clampedConfidence >= 80) {
      return {
        level: 'high',
        color: 'text-accent',
        strokeColor: '#10B981',
        bgColor: 'rgba(16, 185, 129, 0.1)'
      }
    } else if (clampedConfidence >= 60) {
      return {
        level: 'medium',
        color: 'text-warning',
        strokeColor: '#F97316',
        bgColor: 'rgba(249, 115, 22, 0.1)'
      }
    } else {
      return {
        level: 'low',
        color: 'text-red-500',
        strokeColor: '#EF4444',
        bgColor: 'rgba(239, 68, 68, 0.1)'
      }
    }
  }
  
  const sizeClasses = getSizeClasses()
  const confidenceData = getConfidenceLevel()
  
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {/* Circular Progress Ring */}
      <div className={`relative ${sizeClasses.container}`}>
        <svg
          className={`transform -rotate-90 ${sizeClasses.svg}`}
          viewBox={`0 0 ${(radius + 6) * 2} ${(radius + 6) * 2}`}
        >
          {/* Background Circle */}
          <circle
            cx={radius + 6}
            cy={radius + 6}
            r={radius}
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            className="text-gray-200"
          />
          
          {/* Progress Circle */}
          <circle
            cx={radius + 6}
            cy={radius + 6}
            r={radius}
            stroke={confidenceData.strokeColor}
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className={`transition-all duration-1000 ease-out ${
              animated ? 'animate-pulse' : ''
            }`}
            style={{
              filter: 'drop-shadow(0 0 6px rgba(0, 0, 0, 0.1))'
            }}
          />
        </svg>
        
        {/* Center Content */}
        <div className="absolute inset-0 flex items-center justify-center">
          {showPercentage && (
            <span className={`font-mono ${sizeClasses.text} ${confidenceData.color}`}>
              {Math.round(clampedConfidence)}%
            </span>
          )}
        </div>
        
        {/* Glow Effect for High Confidence */}
        {clampedConfidence >= 80 && animated && (
          <div
            className="absolute inset-0 rounded-full animate-pulse"
            style={{
              background: `radial-gradient(circle, ${confidenceData.bgColor} 0%, transparent 70%)`,
              filter: 'blur(4px)'
            }}
          />
        )}
      </div>
      
      {/* Label */}
      {showLabel && (
        <div className="text-center">
          <div className={`${sizeClasses.label} text-muted font-medium`}>
            Confidence
          </div>
          <div className={`${sizeClasses.label} ${confidenceData.color} font-semibold capitalize`}>
            {confidenceData.level}
          </div>
        </div>
      )}
    </div>
  )
}