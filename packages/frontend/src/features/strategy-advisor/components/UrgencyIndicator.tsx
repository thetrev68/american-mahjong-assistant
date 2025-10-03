// Urgency Indicator Component - Visual display of game phase and urgency context
// Shows adaptive indicators with smooth transitions and accessibility support

import React, { useMemo } from 'react'
import { Card } from '../../../ui-components/Card'
import { useGamePhaseDetection } from '../hooks/useGamePhaseDetection'
import { useUrgencyDetection } from '../hooks/useUrgencyDetection'
import { getUrgencyClasses, prefersReducedMotion } from '../utils/urgency-themes'
import type { GamePhase, UrgencyLevel } from '../types/strategy-advisor.types'

// Component props
export interface UrgencyIndicatorProps {
  className?: string
  showPhaseDetails?: boolean
  showUrgencyScore?: boolean
  showFactors?: boolean
  compact?: boolean
  onPhaseClick?: (phase: GamePhase) => void
}

// Phase display configuration
interface PhaseDisplayConfig {
  emoji: string
  label: string
  description: string
  color: string
  bgColor: string
}

const PHASE_CONFIGS: Record<GamePhase, PhaseDisplayConfig> = {
  early: {
    emoji: '',
    label: 'Early Game',
    description: 'Pattern exploration and tile gathering',
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  mid: {
    emoji: '',
    label: 'Mid Game',
    description: 'Pattern commitment and strategic decisions',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  late: {
    emoji: '',
    label: 'Late Game',
    description: 'Pattern completion and risk management',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50'
  },
  defensive: {
    emoji: '',
    label: 'Defensive',
    description: 'Opponent threat - prioritizing blocking',
    color: 'text-red-600',
    bgColor: 'bg-red-50'
  },
  endgame: {
    emoji: '',
    label: 'Endgame',
    description: 'Final turns with limited options',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  }
}

const URGENCY_CONFIGS: Record<UrgencyLevel, { emoji: string; label: string; color: string }> = {
  low: {
    emoji: '',
    label: 'Relaxed',
    color: 'text-green-600'
  },
  medium: {
    emoji: '',
    label: 'Focused',
    color: 'text-blue-600'
  },
  high: {
    emoji: '',
    label: 'Urgent',
    color: 'text-orange-600'
  },
  critical: {
    emoji: '',
    label: 'Critical',
    color: 'text-red-600'
  }
}

export const UrgencyIndicator: React.FC<UrgencyIndicatorProps> = ({
  className = '',
  showPhaseDetails = true,
  showUrgencyScore = false,
  showFactors = false,
  compact = false,
  onPhaseClick
}) => {
  // Get phase and urgency data
  const { phase } = useGamePhaseDetection()
  const {
    urgencyLevel,
    urgencyScore,
    factors,
    isEmergencyMode,
    uiTreatment,
    isTransitioning
  } = useUrgencyDetection()

  // Respect user preferences
  const reduceMotion = prefersReducedMotion()

  // Get urgency-aware styling
  const urgencyClasses = useMemo(() => {
    return getUrgencyClasses(uiTreatment, {
      respectReducedMotion: reduceMotion,
      includeHover: true,
      includeAnimations: !reduceMotion
    })
  }, [uiTreatment, reduceMotion])

  // Phase configuration
  const phaseConfig = PHASE_CONFIGS[phase.currentPhase]
  const urgencyConfig = URGENCY_CONFIGS[urgencyLevel]

  // Emergency mode styling
  const emergencyClasses = isEmergencyMode
    ? 'ring-2 ring-red-500 ring-opacity-75 animate-pulse'
    : ''

  // Transition styling
  const transitionClasses = isTransitioning && !reduceMotion
    ? 'transform transition-all duration-500 ease-out'
    : ''

  // Handle phase click
  const handlePhaseClick = () => {
    if (onPhaseClick) {
      onPhaseClick(phase.currentPhase)
    }
  }

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {/* Compact phase indicator */}
        <div
          className={`
            flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium
            ${phaseConfig.bgColor} ${phaseConfig.color}
            ${emergencyClasses} ${transitionClasses}
            ${onPhaseClick ? 'cursor-pointer hover:opacity-80' : ''}
          `}
          onClick={handlePhaseClick}
        >
          <span>{phaseConfig.label}</span>
        </div>

        {/* Compact urgency indicator */}
        <div
          className={`
            flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium
            ${urgencyClasses.background} ${urgencyConfig.color}
            ${transitionClasses}
          `}
        >
          <span>{urgencyConfig.label}</span>
          {showUrgencyScore && <span>{urgencyScore}</span>}
        </div>

        {/* Emergency badge */}
        {isEmergencyMode && (
          <div className="px-1 py-0.5 bg-red-600 text-white text-xs font-bold rounded">
            EMERGENCY
          </div>
        )}
      </div>
    )
  }

  return (
    <Card
      variant="elevated"
      className={`
        ${urgencyClasses.container}
        ${emergencyClasses}
        ${transitionClasses}
        ${className}
      `}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h4 className={`text-sm font-semibold ${urgencyClasses.text}`}>
            Game Context
          </h4>
          {isEmergencyMode && (
            <div className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded">
              EMERGENCY
            </div>
          )}
        </div>

        {/* Phase Information */}
        <div
          className={`
            flex items-start p-3 rounded-lg
            ${phaseConfig.bgColor}
            ${onPhaseClick ? 'cursor-pointer hover:opacity-90' : ''}
            ${transitionClasses}
          `}
          onClick={handlePhaseClick}
        >
          <div className="flex-1 min-w-0">
            <div className={`font-medium text-sm ${phaseConfig.color}`}>
              {phaseConfig.label}
            </div>
            {showPhaseDetails && (
              <div className="text-xs text-gray-600 mt-1">
                {phase.phaseDescription}
              </div>
            )}
            {/* Phase progress */}
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Turn {phase.turnNumber}</span>
                <span>{Math.round(phase.phaseProgress * 100)}% complete</span>
              </div>
              <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`
                    h-full transition-all duration-500 ease-out
                    ${phaseConfig.color.replace('text-', 'bg-')}
                  `}
                  style={{ width: `${phase.phaseProgress * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Urgency Information */}
        <div className={`
          flex items-center justify-between p-3 rounded-lg
          ${urgencyClasses.background}
          ${transitionClasses}
        `}>
          <div className="flex items-center">
            <div>
              <div className={`font-medium text-sm ${urgencyConfig.color}`}>
                {urgencyConfig.label}
              </div>
              {showUrgencyScore && (
                <div className="text-xs text-gray-600">
                  Score: {urgencyScore}/100
                </div>
              )}
            </div>
          </div>

          {/* Urgency level indicator */}
          <div className="flex space-x-1">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className={`
                  w-2 h-6 rounded-full transition-all duration-300
                  ${index < getUrgencyBars(urgencyLevel)
                    ? urgencyConfig.color.replace('text-', 'bg-')
                    : 'bg-gray-200'
                  }
                `}
              />
            ))}
          </div>
        </div>

        {/* Urgency Factors (optional) */}
        {showFactors && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-700">Urgency Factors</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <FactorBar
                label="Turn Pressure"
                value={factors.turnPressure}
                color="blue"
              />
              <FactorBar
                label="Wall Pressure"
                value={factors.wallPressure}
                color="orange"
              />
              <FactorBar
                label="Opponent Threat"
                value={factors.opponentThreat}
                color="red"
              />
              <FactorBar
                label="Hand Progress"
                value={factors.handCompletion}
                color="green"
              />
            </div>
          </div>
        )}

        {/* Strategic Context */}
        {showPhaseDetails && phase.strategicContext.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-700">Strategic Context</div>
            <ul className="space-y-1">
              {phase.strategicContext.slice(0, 3).map((context, index) => (
                <li key={index} className="flex items-start text-xs text-gray-600">
                  <span className="text-blue-500 mr-1 flex-shrink-0">•</span>
                  <span>{context}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  )
}

// Helper component for factor visualization
interface FactorBarProps {
  label: string
  value: number
  color: 'blue' | 'orange' | 'red' | 'green'
}

const FactorBar: React.FC<FactorBarProps> = ({ label, value, color }) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
    green: 'bg-green-500'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="text-gray-500">{Math.round(value * 100)}%</span>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ease-out ${colorClasses[color]}`}
          style={{ width: `${value * 100}%` }}
        />
      </div>
    </div>
  )
}

// Helper function to convert urgency level to visual bars
function getUrgencyBars(urgencyLevel: UrgencyLevel): number {
  switch (urgencyLevel) {
    case 'low': return 1
    case 'medium': return 2
    case 'high': return 3
    case 'critical': return 4
    default: return 1
  }
}

// Types are exported above with their definitions