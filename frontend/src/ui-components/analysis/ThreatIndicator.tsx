// Threat Indicator Component
// Shows opponent threat levels with visual warnings and mitigation advice

interface Threat {
  level: 'low' | 'medium' | 'high'
  description: string
  mitigation: string
}

interface ThreatIndicatorProps {
  threats: Threat[]
  size?: 'sm' | 'md' | 'lg'
  showMitigation?: boolean
  interactive?: boolean
  onThreatClick?: (threat: Threat) => void
}

export const ThreatIndicator = ({
  threats,
  size = 'md',
  showMitigation = true,
  interactive = false,
  onThreatClick
}: ThreatIndicatorProps) => {
  // Get the highest threat level
  const getHighestThreatLevel = () => {
    if (threats.length === 0) return 'low'
    
    const levelPriority: Record<string, number> = { high: 3, medium: 2, low: 1 }
    return threats.reduce((highest, threat) => 
      levelPriority[threat.level] > levelPriority[highest] ? threat.level : highest
    , 'low')
  }
  
  const highestThreat = getHighestThreatLevel()
  
  // Get threat styling
  const getThreatStyle = (level: string) => {
    switch (level) {
      case 'high':
        return {
          background: 'bg-red-500',
          text: 'text-red-700',
          border: 'border-red-300',
          icon: '🚨',
          pulse: 'animate-pulse'
        }
      case 'medium':
        return {
          background: 'bg-warning',
          text: 'text-orange-700',
          border: 'border-orange-300',
          icon: '⚠️',
          pulse: ''
        }
      default:
        return {
          background: 'bg-accent',
          text: 'text-green-700',
          border: 'border-green-300',
          icon: '✓',
          pulse: ''
        }
    }
  }
  
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'p-2',
          title: 'text-xs',
          icon: 'text-sm',
          description: 'text-xs',
          mitigation: 'text-xs'
        }
      case 'lg':
        return {
          container: 'p-4',
          title: 'text-base',
          icon: 'text-xl',
          description: 'text-sm',
          mitigation: 'text-sm'
        }
      default:
        return {
          container: 'p-3',
          title: 'text-sm',
          icon: 'text-lg',
          description: 'text-xs',
          mitigation: 'text-xs'
        }
    }
  }
  
  const mainThreatStyle = getThreatStyle(highestThreat)
  const sizeClasses = getSizeClasses()
  
  if (threats.length === 0) {
    return (
      <div className={`glass-card ${sizeClasses.container} border-green-200`}>
        <div className="flex items-center gap-2">
          <span className={sizeClasses.icon}>✅</span>
          <div>
            <div className={`${sizeClasses.title} font-semibold text-green-700`}>
              No Threats
            </div>
            <div className={`${sizeClasses.description} text-green-600`}>
              All clear for aggressive play
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-2">
      {/* Main Threat Summary */}
      <div 
        className={`
          glass-card ${sizeClasses.container} border-2
          ${mainThreatStyle.border} ${mainThreatStyle.pulse}
          ${interactive ? 'cursor-pointer hover:shadow-lg transition-all' : ''}
        `}
        onClick={() => interactive && threats[0] && onThreatClick?.(threats[0])}
      >
        <div className="flex items-start gap-3">
          <span className={`${sizeClasses.icon} ${mainThreatStyle.pulse}`}>
            {mainThreatStyle.icon}
          </span>
          
          <div className="flex-1 min-w-0">
            <div className={`${sizeClasses.title} font-semibold ${mainThreatStyle.text}`}>
              {threats.length > 1 ? `${threats.length} Threats` : `${highestThreat.charAt(0).toUpperCase() + highestThreat.slice(1)} Threat`}
            </div>
            
            <div className={`${sizeClasses.description} text-gray-600 mt-1 leading-tight`}>
              {threats[0]?.description || 'Multiple threat conditions detected'}
            </div>
            
            {/* Mitigation Advice */}
            {showMitigation && threats[0]?.mitigation && (
              <div className={`${sizeClasses.mitigation} mt-2 p-2 bg-gray-50 rounded-lg border-l-2 border-gray-300`}>
                <div className="font-medium text-gray-700 mb-1">💡 Mitigation:</div>
                <div className="text-gray-600">{threats[0].mitigation}</div>
              </div>
            )}
          </div>
          
          {/* Threat Level Badge */}
          <div className={`
            px-2 py-1 rounded-full text-xs font-bold
            ${mainThreatStyle.background} text-white
          `}>
            {highestThreat.toUpperCase()}
          </div>
        </div>
      </div>
      
      {/* Additional Threats (if multiple) */}
      {threats.length > 1 && (
        <div className="space-y-1">
          {threats.slice(1).map((threat, index) => {
            const threatStyle = getThreatStyle(threat.level)
            return (
              <div
                key={index}
                className={`
                  glass-card p-2 border ${threatStyle.border}
                  ${interactive ? 'cursor-pointer hover:shadow-md transition-all' : ''}
                `}
                onClick={() => interactive && onThreatClick?.(threat)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{threatStyle.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-medium ${threatStyle.text}`}>
                      {threat.description}
                    </div>
                  </div>
                  <div className={`
                    px-1.5 py-0.5 rounded text-xs font-bold
                    ${threatStyle.background} text-white
                  `}>
                    {threat.level.charAt(0).toUpperCase()}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}