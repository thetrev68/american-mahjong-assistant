// Glance Mode Panel - Main Strategy Advisor UI component
// Shows conversational guidance with progressive disclosure

import React from 'react'
import { Card } from '../../../ui-components/Card'
import type { StrategyAdvisorTypes } from '../types/strategy-advisor.types'

interface StrategyMessageCardProps {
  message: StrategyAdvisorTypes.StrategyMessage
  isExpanded: boolean
  onExpand: () => void
  onCollapse: () => void
  onDismiss: () => void
  showConfidence: boolean
}

const StrategyMessageCard: React.FC<StrategyMessageCardProps> = ({
  message,
  isExpanded,
  onExpand,
  onCollapse,
  onDismiss,
  showConfidence
}) => {
  // Get urgency styling
  const getUrgencyStyles = (urgency: StrategyAdvisorTypes.UrgencyLevel) => {
    switch (urgency) {
      case 'critical':
        return 'border-red-500 bg-red-50'
      case 'high':
        return 'border-orange-500 bg-orange-50'
      case 'medium':
        return 'border-blue-500 bg-blue-50'
      case 'low':
        return 'border-gray-300 bg-gray-50'
      default:
        return 'border-gray-300 bg-gray-50'
    }
  }

  // Get message type emoji
  const getMessageEmoji = (type: StrategyAdvisorTypes.MessageType) => {
    switch (type) {
      case 'encouragement':
        return '💪'
      case 'warning':
        return '⚠️'
      case 'suggestion':
        return '💡'
      case 'insight':
        return '🔍'
      case 'celebration':
        return '🎉'
      default:
        return '📋'
    }
  }

  return (
    <Card
      variant="elevated"
      className={`p-3 border-l-4 ${getUrgencyStyles(message.urgency)} transition-all duration-200`}
    >
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getMessageEmoji(message.type)}</span>
            <div>
              <h4 className="font-semibold text-gray-900 text-sm">
                {message.title}
              </h4>
              {showConfidence && (
                <div className="text-xs text-gray-500">
                  {message.confidence}% confidence
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 text-sm"
            aria-label="Dismiss message"
          >
            ✕
          </button>
        </div>

        {/* Main Message */}
        <p className="text-sm text-gray-700 leading-relaxed">
          {message.message}
        </p>

        {/* Progressive Disclosure */}
        {message.details && (
          <div className="space-y-2">
            {!isExpanded && (
              <button
                onClick={onExpand}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Why? • {message.details.shortReason}
              </button>
            )}

            {isExpanded && (
              <div className="space-y-3 pt-2 border-t border-gray-200">
                <button
                  onClick={onCollapse}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Hide details ↑
                </button>

                {/* Full reasoning */}
                <div className="bg-white rounded p-2 text-xs">
                  <div className="font-medium text-gray-700 mb-1">Detailed Analysis:</div>
                  <p className="text-gray-600 leading-relaxed">
                    {message.details.fullReason}
                  </p>
                </div>

                {/* Alternative actions */}
                {message.details.alternativeActions && message.details.alternativeActions.length > 0 && (
                  <div className="bg-white rounded p-2 text-xs">
                    <div className="font-medium text-gray-700 mb-1">Options:</div>
                    <ul className="text-gray-600 space-y-1">
                      {message.details.alternativeActions.map((action, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-blue-500 mr-1">•</span>
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Risk factors */}
                {message.details.riskFactors && message.details.riskFactors.length > 0 && (
                  <div className="bg-yellow-50 rounded p-2 text-xs">
                    <div className="font-medium text-yellow-800 mb-1">Consider:</div>
                    <ul className="text-yellow-700 space-y-1">
                      {message.details.riskFactors.map((risk, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-yellow-600 mr-1">⚠</span>
                          {risk}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actionable indicator */}
        {message.isActionable && (
          <div className="flex items-center space-x-1 pt-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-xs text-green-600 font-medium">Actionable</span>
          </div>
        )}
      </div>
    </Card>
  )
}

interface GlanceModePanelProps {
  className?: string
  onMessageExpand?: (messageId: string) => void
  onConfigChange?: (config: Partial<StrategyAdvisorTypes.GlanceModeConfig>) => void
}

export const GlanceModePanel: React.FC<GlanceModePanelProps> = ({
  className = '',
  onMessageExpand,
  onConfigChange
}) => {
  // This will be connected via the hook in the next phase
  // For now, show a placeholder structure

  const mockMessages: StrategyAdvisorTypes.StrategyMessage[] = []
  const isLoading = false
  const error = null
  const expandedMessageId = null
  const config: StrategyAdvisorTypes.GlanceModeConfig = {
    showConfidence: true,
    showDetails: true,
    autoRefresh: true,
    refreshInterval: 5000,
    maxMessages: 3,
    prioritizeUrgent: true
  }

  const handleExpand = (messageId: string) => {
    onMessageExpand?.(messageId)
  }

  const handleCollapse = () => {
    onMessageExpand?.(null)
  }

  const handleDismiss = (messageId: string) => {
    // Will be connected via hook
    console.log('Dismiss message:', messageId)
  }

  const handleConfigChange = (configUpdate: Partial<StrategyAdvisorTypes.GlanceModeConfig>) => {
    onConfigChange?.(configUpdate)
  }

  if (error) {
    return (
      <Card variant="elevated" className={`p-4 ${className}`}>
        <div className="text-center text-red-600">
          <div className="text-lg mb-2">⚠️</div>
          <p className="text-sm">Strategy guidance unavailable</p>
          <p className="text-xs text-gray-500 mt-1">{error}</p>
        </div>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card variant="elevated" className={`p-4 ${className}`}>
        <div className="text-center text-gray-500">
          <div className="text-lg mb-2">🤔</div>
          <p className="text-sm">Analyzing strategy...</p>
          <div className="mt-2">
            <div className="animate-pulse bg-gray-200 h-2 rounded w-3/4 mx-auto"></div>
          </div>
        </div>
      </Card>
    )
  }

  if (mockMessages.length === 0) {
    return (
      <Card variant="elevated" className={`p-4 ${className}`}>
        <div className="text-center text-gray-500">
          <div className="text-lg mb-2">🧭</div>
          <p className="text-sm font-medium">Strategy Advisor</p>
          <p className="text-xs mt-1">
            AI guidance will appear here during gameplay
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center">
          <span className="mr-2">🧭</span>
          Strategy Advisor
        </h3>

        {/* Quick settings */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleConfigChange({ showConfidence: !config.showConfidence })}
            className={`text-xs px-2 py-1 rounded ${
              config.showConfidence
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            Confidence
          </button>
          <button
            onClick={() => handleConfigChange({ autoRefresh: !config.autoRefresh })}
            className={`text-xs px-2 py-1 rounded ${
              config.autoRefresh
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            Auto
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-2">
        {mockMessages.map((message) => (
          <StrategyMessageCard
            key={message.id}
            message={message}
            isExpanded={expandedMessageId === message.id}
            onExpand={() => handleExpand(message.id)}
            onCollapse={handleCollapse}
            onDismiss={() => handleDismiss(message.id)}
            showConfidence={config.showConfidence}
          />
        ))}
      </div>

      {/* Footer */}
      {mockMessages.length > 0 && (
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-200">
          <span>{mockMessages.length} insight{mockMessages.length !== 1 ? 's' : ''}</span>
          <span>Updated just now</span>
        </div>
      )}
    </div>
  )
}