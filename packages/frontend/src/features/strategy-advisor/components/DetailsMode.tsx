// DetailsMode - Expanded technical information view for strategy advisor
// Shows pattern requirements, risk factors, and alternative paths

import React, { useCallback, useMemo } from 'react'
import type {
  DetailsModeProps
} from '../types/strategy-advisor.types'

// Flexibility level indicators
const FLEXIBILITY_CONFIG = {
  low: {
    label: 'Limited',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    icon: '⚠️',
    description: 'Few alternatives available'
  },
  medium: {
    label: 'Moderate',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    icon: '⚖️',
    description: 'Some backup options'
  },
  high: {
    label: 'Flexible',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    icon: '✨',
    description: 'Multiple viable paths'
  }
} as const

// Strategy mode specific styling
const STRATEGY_MODE_STYLES = {
  flexible: {
    accentColor: 'text-blue-600',
    borderColor: 'border-blue-200',
    bgColor: 'bg-blue-50'
  },
  quickWin: {
    accentColor: 'text-orange-600',
    borderColor: 'border-orange-200',
    bgColor: 'bg-orange-50'
  },
  defensive: {
    accentColor: 'text-green-600',
    borderColor: 'border-green-200',
    bgColor: 'bg-green-50'
  },
  highScore: {
    accentColor: 'text-purple-600',
    borderColor: 'border-purple-200',
    bgColor: 'bg-purple-50'
  }
} as const

/**
 * DetailsMode - Expanded view showing technical analysis and strategy details
 * Provides intermediate information between glance and advanced modes
 */
export const DetailsMode: React.FC<DetailsModeProps> = ({
  content,
  isVisible,
  onExpandToAdvanced,
  onCollapseToGlance,
  strategyMode,
  className = ''
}) => {
  // Get strategy mode styling
  const modeStyles = STRATEGY_MODE_STYLES[strategyMode]
  const flexibilityConfig = FLEXIBILITY_CONFIG[content.flexibility]

  // Format estimated turns display
  const formatEstimatedTurns = useCallback((turns: number): string => {
    if (turns === 1) return '1 turn'
    if (turns <= 3) return `${turns} turns`
    if (turns <= 5) return `${turns}-${turns + 1} turns`
    return `${turns}+ turns`
  }, [])

  // Get priority indicators for requirements
  const getRequirementPriority = useCallback((requirement: string): 'high' | 'medium' | 'low' => {
    if (requirement.toLowerCase().includes('need') || requirement.toLowerCase().includes('required')) {
      return 'high'
    }
    if (requirement.toLowerCase().includes('option') || requirement.toLowerCase().includes('consider')) {
      return 'medium'
    }
    return 'low'
  }, [])

  // Get risk level styling
  const getRiskStyling = useCallback((risk: string) => {
    if (risk.toLowerCase().includes('high') || risk.toLowerCase().includes('dangerous')) {
      return { color: 'text-red-600', icon: '🚨' }
    }
    if (risk.toLowerCase().includes('moderate') || risk.toLowerCase().includes('medium')) {
      return { color: 'text-yellow-600', icon: '⚠️' }
    }
    return { color: 'text-blue-600', icon: 'ℹ️' }
  }, [])

  // Generate mode-specific insights
  const getModeSpecificInsights = useMemo(() => {
    switch (strategyMode) {
      case 'quickWin':
        return {
          focus: 'Speed',
          advice: 'Prioritize immediate completion over long-term safety',
          actionType: 'aggressive'
        }
      case 'defensive':
        return {
          focus: 'Safety',
          advice: 'Maintain defensive positioning while building',
          actionType: 'conservative'
        }
      case 'highScore':
        return {
          focus: 'Points',
          advice: 'Complex patterns require patience and precision',
          actionType: 'strategic'
        }
      case 'flexible':
      default:
        return {
          focus: 'Balance',
          advice: 'Keep multiple options open for adaptation',
          actionType: 'balanced'
        }
    }
  }, [strategyMode])

  if (!isVisible) return null

  return (
    <div className={`p-4 space-y-4 ${className}`}>
      {/* Technical Analysis Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className={`font-semibold text-sm ${modeStyles.accentColor}`}>
            Technical Analysis
          </h4>
          <div className={`px-2 py-1 rounded text-xs font-medium ${flexibilityConfig.bgColor} ${flexibilityConfig.color}`}>
            {flexibilityConfig.icon} {flexibilityConfig.label}
          </div>
        </div>

        <p className="text-sm text-gray-700 leading-relaxed">
          {content.technicalAnalysis}
        </p>

        {/* Strategy Mode Insight */}
        <div className={`p-2 rounded-md ${modeStyles.bgColor} ${modeStyles.borderColor} border`}>
          <div className="flex items-center space-x-2 text-xs">
            <span className={`font-medium ${modeStyles.accentColor}`}>
              {getModeSpecificInsights.focus} Focus:
            </span>
            <span className="text-gray-700">
              {getModeSpecificInsights.advice}
            </span>
          </div>
        </div>
      </div>

      {/* Pattern Requirements */}
      {content.patternRequirements.length > 0 && (
        <div className="space-y-2">
          <h5 className="font-medium text-sm text-gray-800 flex items-center">
            <span className="mr-2">📋</span>
            Pattern Requirements
          </h5>
          <div className="space-y-1">
            {content.patternRequirements.map((requirement, index) => {
              const priority = getRequirementPriority(requirement)
              const priorityStyles = {
                high: 'border-l-red-400 bg-red-50',
                medium: 'border-l-yellow-400 bg-yellow-50',
                low: 'border-l-gray-400 bg-gray-50'
              }

              return (
                <div
                  key={index}
                  className={`pl-3 py-2 border-l-4 rounded-r ${priorityStyles[priority]}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{requirement}</span>
                    {priority === 'high' && (
                      <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded">
                        Critical
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Timing Information */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <span className="text-gray-500">⏱️</span>
          <span className="text-sm font-medium text-gray-700">Estimated completion:</span>
        </div>
        <div className="text-sm font-semibold text-gray-900">
          {formatEstimatedTurns(content.estimatedTurns)}
        </div>
      </div>

      {/* Flexibility Assessment */}
      <div className={`p-3 rounded-lg ${flexibilityConfig.bgColor} border border-gray-200`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-800">
            Strategic Flexibility
          </span>
          <span className={`text-xs font-semibold ${flexibilityConfig.color}`}>
            {flexibilityConfig.label}
          </span>
        </div>
        <p className="text-xs text-gray-600">
          {flexibilityConfig.description}
        </p>
      </div>

      {/* Alternative Paths */}
      {content.alternativePaths && content.alternativePaths.length > 0 && (
        <div className="space-y-2">
          <h5 className="font-medium text-sm text-gray-800 flex items-center">
            <span className="mr-2">🔄</span>
            Alternative Paths
          </h5>
          <div className="grid grid-cols-1 gap-2">
            {content.alternativePaths.map((path, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded text-sm"
              >
                <span className="text-gray-700">{path}</span>
                <button
                  className="text-blue-600 hover:text-blue-800 text-xs font-medium transition-colors"
                  onClick={() => console.log(`Switch to: ${path}`)}
                >
                  Switch →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Factors */}
      {content.riskFactors.length > 0 && (
        <div className="space-y-2">
          <h5 className="font-medium text-sm text-gray-800 flex items-center">
            <span className="mr-2">⚠️</span>
            Risk Factors
          </h5>
          <div className="space-y-1">
            {content.riskFactors.map((risk, index) => {
              const riskStyling = getRiskStyling(risk)
              return (
                <div
                  key={index}
                  className="flex items-start space-x-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm"
                >
                  <span>{riskStyling.icon}</span>
                  <span className={`flex-1 ${riskStyling.color}`}>{risk}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Navigation Controls */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
        <button
          onClick={onCollapseToGlance}
          className="text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors flex items-center space-x-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to Glance</span>
        </button>

        <div className="flex items-center space-x-3">
          <div className="text-xs text-gray-500">
            Details View
          </div>
          <button
            onClick={onExpandToAdvanced}
            className={`text-sm font-medium transition-colors flex items-center space-x-1 ${modeStyles.accentColor} hover:opacity-75`}
          >
            <span>Advanced Analysis</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Keyboard navigation hint */}
      <div className="text-xs text-gray-400 text-center">
        <span className="hidden sm:inline">Press Ctrl+↑ for Advanced, Ctrl+↓ for Glance</span>
      </div>
    </div>
  )
}

// Simplified details view for high urgency situations
export const SimplifiedDetailsMode: React.FC<{
  analysis: string
  requirements: string[]
  turns: number
  onCollapse: () => void
  className?: string
}> = ({ analysis, requirements, turns, onCollapse, className = '' }) => {
  return (
    <div className={`p-3 space-y-3 ${className}`}>
      {/* Simplified Analysis */}
      <div>
        <p className="text-sm text-gray-700 leading-relaxed">{analysis}</p>
      </div>

      {/* Key Requirements */}
      {requirements.length > 0 && (
        <div className="space-y-1">
          <h5 className="font-medium text-xs text-gray-600 uppercase tracking-wide">
            Key Requirements
          </h5>
          {requirements.slice(0, 2).map((req, index) => (
            <div key={index} className="text-sm text-gray-700 flex items-center space-x-2">
              <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
              <span>{req}</span>
            </div>
          ))}
        </div>
      )}

      {/* Timing */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">Estimated:</span>
        <span className="font-medium text-gray-900">
          {turns === 1 ? '1 turn' : `${turns} turns`}
        </span>
      </div>

      {/* Collapse Control */}
      <button
        onClick={onCollapse}
        className="w-full text-xs text-gray-500 hover:text-gray-700 transition-colors"
      >
        ↑ Hide details
      </button>
    </div>
  )
}

// Mode-specific details variants
export const QuickWinDetailsMode: React.FC<DetailsModeProps> = (props) => {
  return (
    <DetailsMode
      {...props}
      className={`${props.className} border-l-4 border-orange-400`}
    />
  )
}

export const DefensiveDetailsMode: React.FC<DetailsModeProps> = (props) => {
  return (
    <DetailsMode
      {...props}
      className={`${props.className} border-l-4 border-green-400`}
    />
  )
}

export const HighScoreDetailsMode: React.FC<DetailsModeProps> = (props) => {
  return (
    <DetailsMode
      {...props}
      className={`${props.className} border-l-4 border-purple-400`}
    />
  )
}